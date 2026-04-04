import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Globe } from "../../../src/index.js";
import {
  DEFAULT_WORLD_SEED,
  RAILWAYS_GAME_VERSION,
  RAILWAYS_RULESET_VERSION,
  type CitySummary,
  type RailwaysAuthoritativeState,
  type SessionDeterminismConfig,
} from "../src/network/protocol.js";
import { RailwaysSessionState } from "../server/session.js";

type TerrainCacheRow = { id: number; t: string; o?: number };
type TerrainCache = { tileCount: number; tiles: TerrainCacheRow[] };

function fail(message: string): never {
  throw new Error(message);
}

function normalizedEdgeKey(a: number, b: number): string {
  return a <= b ? `${a}:${b}` : `${b}:${a}`;
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat * 0.5) * Math.sin(dLat * 0.5) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon * 0.5) * Math.sin(dLon * 0.5);
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isWaterType(type: string | undefined): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return t === "water" || t === "ocean" || t === "sea" || t === "lake" || t === "beach" || t === "ice";
}

function isLandBuildable(type: string | undefined): boolean {
  return !isWaterType(type);
}

function loadTerrainCache(): { tileTypeById: Map<number, string>; oceanTiles: Set<number> } {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cachePath = path.resolve(here, "../../../examples/globe-demo/public/earth-globe-cache-7.json");
  const cache = JSON.parse(fs.readFileSync(cachePath, "utf8")) as TerrainCache;
  const tileTypeById = new Map<number, string>();
  const oceanTiles = new Set<number>();
  for (const row of cache.tiles) {
    tileTypeById.set(row.id, row.t);
    if (row.o != null) oceanTiles.add(row.id);
  }
  return { tileTypeById, oceanTiles };
}

function isCoastalCityTile(
  globe: Globe,
  tileId: number,
  tileTypeById: Map<number, string>,
  oceanTiles: Set<number>,
): boolean {
  const tile = globe.getTile(tileId);
  if (!tile) return false;
  for (const n of tile.neighbors) {
    if (!oceanTiles.has(n)) continue;
    if (isWaterType(tileTypeById.get(n))) return true;
  }
  return false;
}

function bfsPath(
  globe: Globe,
  start: number,
  goal: number,
  canTraverse: (tileId: number, goalTileId: number) => boolean,
  maxVisited = 350000,
): number[] | null {
  if (start === goal) return [start];
  const prev = new Map<number, number>();
  const q: number[] = [start];
  prev.set(start, -1);
  let qi = 0;
  while (qi < q.length && prev.size <= maxVisited) {
    const cur = q[qi++]!;
    const tile = globe.getTile(cur);
    if (!tile) continue;
    for (const n of tile.neighbors) {
      if (prev.has(n)) continue;
      if (!canTraverse(n, goal)) continue;
      prev.set(n, cur);
      if (n === goal) {
        const path: number[] = [goal];
        let p = cur;
        while (p !== -1) {
          path.push(p);
          p = prev.get(p) ?? -1;
        }
        path.reverse();
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

function chooseRailPair(
  globe: Globe,
  cities: CitySummary[],
  tileTypeById: Map<number, string>,
  oceanTiles: Set<number>,
): { coastalCity: CitySummary; inlandOrNearbyCity: CitySummary; path: number[] } {
  const cityByTile = new Map<number, CitySummary>();
  for (const c of cities) {
    if (!cityByTile.has(c.tileId)) cityByTile.set(c.tileId, c);
  }
  const coastalCities = cities
    .filter((c) => isCoastalCityTile(globe, c.tileId, tileTypeById, oceanTiles))
    .sort((a, b) => b.population - a.population);
  if (coastalCities.length === 0) fail("No coastal cities found for rail scenario");

  for (const coastal of coastalCities) {
    const pathToNearestCity = new Map<number, number[]>();
    const prev = new Map<number, number>();
    const q: number[] = [coastal.tileId];
    prev.set(coastal.tileId, -1);
    let qi = 0;
    while (qi < q.length && prev.size < 250000) {
      const cur = q[qi++]!;
      const tile = globe.getTile(cur);
      if (!tile) continue;
      for (const n of tile.neighbors) {
        if (prev.has(n)) continue;
        if (!isLandBuildable(tileTypeById.get(n))) continue;
        prev.set(n, cur);
        q.push(n);
        const city = cityByTile.get(n);
        if (!city || city.cityId === coastal.cityId) continue;
        const p: number[] = [n];
        let back = cur;
        while (back !== -1) {
          p.push(back);
          back = prev.get(back) ?? -1;
        }
        p.reverse();
        pathToNearestCity.set(n, p);
      }
    }
    const candidates = [...pathToNearestCity.entries()]
      .map(([tileId, p]) => ({ city: cityByTile.get(tileId)!, path: p }))
      .filter((c) => c.path.length >= 3 && c.path.length <= 20)
      .sort((a, b) => a.path.length - b.path.length);
    if (candidates.length > 0) {
      return {
        coastalCity: coastal,
        inlandOrNearbyCity: candidates[0]!.city,
        path: candidates[0]!.path,
      };
    }
  }
  fail("Unable to find nearby rail pair on landmass");
}

function chooseSeaPath(
  globe: Globe,
  fromCity: CitySummary,
  cities: CitySummary[],
  tileTypeById: Map<number, string>,
  oceanTiles: Set<number>,
): { toCity: CitySummary; path: number[] } {
  const coastalTargets = cities
    .filter((c) => c.cityId !== fromCity.cityId)
    .filter((c) => isCoastalCityTile(globe, c.tileId, tileTypeById, oceanTiles))
    .sort(
      (a, b) =>
        haversineKm(fromCity.lat, fromCity.lon, a.lat, a.lon) -
        haversineKm(fromCity.lat, fromCity.lon, b.lat, b.lon),
    );
  for (const target of coastalTargets) {
    const path = bfsPath(
      globe,
      fromCity.tileId,
      target.tileId,
      (n, goal) => n === goal || isWaterType(tileTypeById.get(n)),
      400000,
    );
    if (path && path.length >= 3 && path.length <= 220) {
      return { toCity: target, path };
    }
  }
  fail(`Unable to find sea path from ${fromCity.city}`);
}

function applyCommand(
  session: RailwaysSessionState,
  clientId: string,
  command: Parameters<RailwaysSessionState["applyCommand"]>[1],
  label: string,
): void {
  const result = session.applyCommand({ clientId, role: "host" }, command);
  if (!result.ok) fail(`${label} failed: ${result.reason ?? "unknown_reason"}`);
}

function findOwnedRouteByName(
  snap: RailwaysAuthoritativeState,
  clientId: string,
  name: string,
): string {
  const route = snap.playerRoutes.find((r) => r.ownerClientId === clientId && r.name === name);
  if (!route) fail(`Route "${name}" not found`);
  return route.routeId;
}

function findOwnedVehicleByKind(
  snap: RailwaysAuthoritativeState,
  clientId: string,
  kind: "locomotive_front" | "passenger_carriage" | "wagon" | "sail_ship",
): string {
  const vehicle = snap.playerVehicles.find(
    (v) => v.ownerClientId === clientId && v.kind === kind && !v.assignedRouteId,
  );
  if (!vehicle) fail(`No available ${kind} in inventory`);
  return vehicle.vehicleId;
}

function main(): void {
  const clientId = "headless-host";
  const config: SessionDeterminismConfig = {
    gameVersion: RAILWAYS_GAME_VERSION,
    rulesetVersion: RAILWAYS_RULESET_VERSION,
    climateBakeId: "discrete-weather-bake-7",
    terrainBakeId: "earth-globe-cache-7",
    worldSeed: DEFAULT_WORLD_SEED,
  };
  const session = new RailwaysSessionState("headless-smoke", config);
  session.addPlayer(clientId, "Headless Host", "host");

  const { tileTypeById, oceanTiles } = loadTerrainCache();
  const globe = new Globe({ radius: 1, subdivisions: 7 });
  const cities = session.state.economy.cities;

  const railPick = chooseRailPair(globe, cities, tileTypeById, oceanTiles);
  const seaPick = chooseSeaPath(globe, railPick.coastalCity, cities, tileTypeById, oceanTiles);

  console.log("[headless-smoke] rail pair", {
    from: railPick.coastalCity.cityId,
    to: railPick.inlandOrNearbyCity.cityId,
    edges: railPick.path.length - 1,
  });
  console.log("[headless-smoke] sea pair", {
    from: railPick.coastalCity.cityId,
    to: seaPick.toCity.cityId,
    edges: seaPick.path.length - 1,
  });

  applyCommand(
    session,
    clientId,
    { kind: "setSimSpeed", simSpeed: 200000, paused: false },
    "set fastest speed",
  );
  applyCommand(
    session,
    clientId,
    { kind: "queueTrackBuild", pathTileIds: railPick.path },
    "queue rail build",
  );

  applyCommand(
    session,
    clientId,
    {
      kind: "createRoute",
      mode: "water",
      tileIds: seaPick.path,
      isLoop: false,
      name: "headless-sea-route",
    },
    "create sea route",
  );
  const seaRouteId = findOwnedRouteByName(session.state, clientId, "headless-sea-route");
  const shipId = findOwnedVehicleByKind(session.state, clientId, "sail_ship");
  applyCommand(
    session,
    clientId,
    {
      kind: "assignVehiclesToRoute",
      routeId: seaRouteId,
      vehicleIds: [shipId],
      startTileId: seaPick.path[0],
      nextTileId: seaPick.path[1],
    },
    "assign ship to sea route",
  );

  const railEdgeKeys = new Set<string>();
  for (let i = 1; i < railPick.path.length; i++) {
    railEdgeKeys.add(normalizedEdgeKey(railPick.path[i - 1]!, railPick.path[i]!));
  }

  let nowMs = Date.now();
  let seaSeenEnd = false;
  let seaSeenReturn = false;
  const seaStart = seaPick.path[0]!;
  const seaEnd = seaPick.path[seaPick.path.length - 1]!;
  const pump = (): void => {
    const ship = session.state.playerVehicles.find((v) => v.vehicleId === shipId);
    const cur = ship?.currentTileId;
    if (cur == null) return;
    if (cur === seaEnd) seaSeenEnd = true;
    if (seaSeenEnd && cur === seaStart) seaSeenReturn = true;
  };

  let elapsedRealMs = 0;
  while (elapsedRealMs < 90000) {
    nowMs += 250;
    session.tick(nowMs);
    elapsedRealMs += 250;
    pump();
    const activeEdges = new Set(
      session.state.tracks
        .filter((t) => t.ownerClientId === clientId && t.status === "active")
        .map((t) => normalizedEdgeKey(t.fromTileId, t.toTileId)),
    );
    let allActive = true;
    for (const key of railEdgeKeys) {
      if (!activeEdges.has(key)) {
        allActive = false;
        break;
      }
    }
    if (allActive) break;
  }
  if (elapsedRealMs >= 90000) fail("Timed out waiting for rail track to complete");
  console.log("[headless-smoke] rail build complete", { waitedRealMs: elapsedRealMs });

  applyCommand(
    session,
    clientId,
    {
      kind: "createRoute",
      mode: "rail",
      tileIds: railPick.path,
      isLoop: false,
      name: "headless-rail-route",
    },
    "create rail route",
  );
  const railRouteId = findOwnedRouteByName(session.state, clientId, "headless-rail-route");

  const locomotiveId = findOwnedVehicleByKind(session.state, clientId, "locomotive_front");
  const passengerCarId = findOwnedVehicleByKind(session.state, clientId, "passenger_carriage");
  const cargoCarId = findOwnedVehicleByKind(session.state, clientId, "wagon");
  applyCommand(
    session,
    clientId,
    { kind: "assignCarsToLocomotive", locomotiveId, carIds: [passengerCarId, cargoCarId] },
    "attach passenger+cargo cars",
  );
  applyCommand(
    session,
    clientId,
    {
      kind: "assignVehiclesToRoute",
      routeId: railRouteId,
      vehicleIds: [locomotiveId],
      startTileId: railPick.path[0],
      nextTileId: railPick.path[1],
    },
    "assign locomotive to rail route",
  );

  let railSeenEnd = false;
  let railSeenReturn = false;
  const railStart = railPick.path[0]!;
  const railEnd = railPick.path[railPick.path.length - 1]!;

  let observeElapsedRealMs = 0;
  while (observeElapsedRealMs < 120000) {
    nowMs += 250;
    session.tick(nowMs);
    observeElapsedRealMs += 250;

    const loco = session.state.playerVehicles.find((v) => v.vehicleId === locomotiveId);
    const railCur = loco?.currentTileId;
    if (railCur != null) {
      if (railCur === railEnd) railSeenEnd = true;
      if (railSeenEnd && railCur === railStart) railSeenReturn = true;
    }
    pump();
    if (railSeenReturn && seaSeenReturn) break;
  }
  if (!railSeenReturn) fail("Timed out waiting for train there-and-back run");
  if (!seaSeenReturn) fail("Timed out waiting for ship there-and-back run");

  console.log("[headless-smoke] PASS", {
    railRouteId,
    seaRouteId,
    locomotiveId,
    shipId,
    seaObservedDuringTrackBuild: seaSeenEnd,
    finalClock: session.state.clock,
    stateVersion: session.state.stateVersion,
  });
}

try {
  main();
} catch (err) {
  console.error("[headless-smoke] FAIL", err);
  process.exitCode = 1;
}
