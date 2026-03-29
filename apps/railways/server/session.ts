import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { Globe } from "../../../src/index.js";
import type {
  AssignVehiclesToRouteCommand,
  CityEconomyState,
  CitySummary,
  ClientRole,
  CreateRouteCommand,
  EconomyEvent,
  GoodId,
  PlayerRouteState,
  PlayerVehicleState,
  PurchaseVehicleCommand,
  ProductionBuildingType,
  RailwaysAuthoritativeState,
  RailwaysCommand,
  RailwaysPlayerState,
  RouteMode,
  SessionDeterminismConfig,
  ShipmentState,
  SimClockState,
  TrackSegmentState,
  VehicleKind,
} from "../src/network/protocol.js";

interface SessionPlayer {
  clientId: string;
  playerName: string;
  role: ClientRole;
}

interface CommodityNode {
  id: string;
  kind: "production" | "demand";
  goodId: GoodId;
  lat: number;
  lon: number;
  weight: number;
  spreadKm: number;
  startYear: number;
  endYear?: number;
}

export interface CommandApplyContext {
  clientId: string;
  role: ClientRole;
}

export interface CommandApplyResult {
  ok: boolean;
  reason?: string;
}

function clampSimSpeed(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.max(0, Math.min(2048, v));
}

function normalizedSegment(
  fromTileId: number,
  toTileId: number,
): { fromTileId: number; toTileId: number } {
  if (fromTileId <= toTileId) return { fromTileId, toTileId };
  return { fromTileId: toTileId, toTileId: fromTileId };
}

const MAX_CITY_COUNT = 420;
const SIM_HOUR_MS = 60 * 60 * 1000;
const COMMODITY_SPAWN_INTERVAL_SIM_HOURS = 8;
const MAIL_SPAWN_INTERVAL_SIM_HOURS = 3;
const MAX_PENDING_SHIPMENTS = 420;
const MAX_BUILDING_SHIPMENTS_PER_CYCLE = 24;
const BUILD_WEEKS_PER_HEX = 2;
const BUILD_DURATION_MS = BUILD_WEEKS_PER_HEX * 7 * 24 * SIM_HOUR_MS;

const DEFAULT_STARTING_FUNDS_POUNDS = 1000;
const PLAYER_COLORS = [
  "#f94144",
  "#277da1",
  "#f9c74f",
  "#43aa8b",
  "#9b5de5",
  "#f3722c",
  "#577590",
  "#90be6d",
];
const TRAIN_CORE_CAP = 5;
const SHIP_CAP = 5;
const VEHICLE_MOVE_INTERVAL_SIM_HOURS: Record<VehicleKind, number> = {
  locomotive_front: 8,
  passenger_carriage: 8,
  wagon: 8,
  sail_ship: 18,
};

const VEHICLE_BASE_PRICE: Record<VehicleKind, number> = {
  locomotive_front: 260,
  passenger_carriage: 110,
  wagon: 85,
  sail_ship: 320,
};

interface VehicleRuntimeState {
  routeIndex: number;
  direction: 1 | -1;
  currentTileId: number;
  nextTileId: number;
  lastMoveAtMs: number;
  nextMoveAtMs: number;
}

const GOOD_BASE_VALUE: Record<GoodId, number> = {
  wool: 30,
  cotton: 34,
  opium: 72,
  cod: 24,
  salmon: 26,
  whale_oil: 44,
  corn: 18,
  potatoes: 18,
  iron: 38,
  coal: 32,
  timber: 26,
  lumber: 35,
  textiles: 52,
  refined_oil: 65,
  canned_fish: 48,
  mail: 16,
  passengers: 24,
};

const BUILDING_RECIPES: Record<
  ProductionBuildingType,
  { inputs: GoodId[]; outputs: GoodId[]; minLevel: number }
> = {
  sawmill: { inputs: ["timber"], outputs: ["lumber"], minLevel: 2 },
  textile_mill: { inputs: ["cotton", "wool"], outputs: ["textiles"], minLevel: 2 },
  opium_factory: { inputs: ["opium"], outputs: ["opium"], minLevel: 3 },
  fish_cannery: { inputs: ["cod", "salmon"], outputs: ["canned_fish"], minLevel: 2 },
  refinery: { inputs: ["whale_oil", "coal"], outputs: ["refined_oil"], minLevel: 3 },
};

const ECONOMY_NODES: CommodityNode[] = [
  // Fibers
  { id: "wool-scotland", kind: "production", goodId: "wool", lat: 56.3, lon: -4.2, weight: 1.0, spreadKm: 900, startYear: 1825 },
  { id: "wool-australia", kind: "production", goodId: "wool", lat: -33.9, lon: 151.2, weight: 0.7, spreadKm: 1200, startYear: 1840 },
  { id: "cotton-us-south", kind: "production", goodId: "cotton", lat: 32.5, lon: -90.2, weight: 1.2, spreadKm: 1200, startYear: 1825 },
  { id: "cotton-egypt", kind: "production", goodId: "cotton", lat: 30.0, lon: 31.2, weight: 0.9, spreadKm: 800, startYear: 1860 },
  // Opium and demand
  { id: "opium-bengal", kind: "production", goodId: "opium", lat: 25.2, lon: 88.3, weight: 1.1, spreadKm: 900, startYear: 1825 },
  { id: "opium-anatolia", kind: "production", goodId: "opium", lat: 38.7, lon: 30.5, weight: 0.5, spreadKm: 700, startYear: 1825 },
  { id: "opium-afghanistan", kind: "production", goodId: "opium", lat: 34.5, lon: 66.0, weight: 0.25, spreadKm: 650, startYear: 1880 },
  { id: "opium-demand-china", kind: "demand", goodId: "opium", lat: 31.2, lon: 121.5, weight: 1.4, spreadKm: 1200, startYear: 1825, endYear: 1914 },
  // Fisheries and whale oil
  { id: "cod-newfoundland", kind: "production", goodId: "cod", lat: 48.5, lon: -53.0, weight: 1.4, spreadKm: 750, startYear: 1825 },
  { id: "salmon-pnw", kind: "production", goodId: "salmon", lat: 47.6, lon: -123.0, weight: 1.0, spreadKm: 850, startYear: 1825 },
  { id: "whale-north-atlantic", kind: "production", goodId: "whale_oil", lat: 44.0, lon: -48.0, weight: 0.9, spreadKm: 1700, startYear: 1825 },
  { id: "whale-south-pacific", kind: "production", goodId: "whale_oil", lat: -38.0, lon: -125.0, weight: 0.7, spreadKm: 2300, startYear: 1825 },
  // Crops and resources
  { id: "corn-us-midwest", kind: "production", goodId: "corn", lat: 41.9, lon: -93.5, weight: 1.2, spreadKm: 1200, startYear: 1825 },
  { id: "potato-ireland", kind: "production", goodId: "potatoes", lat: 53.3, lon: -8.2, weight: 0.85, spreadKm: 700, startYear: 1825 },
  { id: "iron-uk-midlands", kind: "production", goodId: "iron", lat: 52.5, lon: -1.9, weight: 1.0, spreadKm: 650, startYear: 1825 },
  { id: "coal-britain", kind: "production", goodId: "coal", lat: 54.9, lon: -1.6, weight: 1.1, spreadKm: 650, startYear: 1825 },
  { id: "coal-ruhr", kind: "production", goodId: "coal", lat: 51.5, lon: 7.2, weight: 1.0, spreadKm: 600, startYear: 1825 },
  { id: "timber-scandinavia", kind: "production", goodId: "timber", lat: 61.0, lon: 15.0, weight: 1.0, spreadKm: 1100, startYear: 1825 },
  { id: "timber-canada", kind: "production", goodId: "timber", lat: 47.6, lon: -71.5, weight: 1.1, spreadKm: 1500, startYear: 1825 },
];

function hashString(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat * 0.5) * Math.sin(dLat * 0.5) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon * 0.5) * Math.sin(dLon * 0.5);
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function latLonDegToDirection(latDeg: number, lonDeg: number): THREE.Vector3 {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return new THREE.Vector3(
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    -cosLat * Math.sin(lonRad),
  ).normalize();
}

function influenceWeight(distKm: number, spreadKm: number): number {
  const d = Math.max(0, distKm);
  const s = Math.max(1, spreadKm);
  return Math.exp(-d / s);
}

function weightedPick<T>(
  items: readonly T[],
  weightFn: (item: T, idx: number) => number,
  rnd: () => number,
): T | null {
  let total = 0;
  const weights = new Array<number>(items.length);
  for (let i = 0; i < items.length; i++) {
    const w = Math.max(0, weightFn(items[i]!, i));
    weights[i] = w;
    total += w;
  }
  if (total <= 1e-12) return null;
  let t = rnd() * total;
  for (let i = 0; i < items.length; i++) {
    t -= weights[i]!;
    if (t <= 0) return items[i]!;
  }
  return items[items.length - 1] ?? null;
}

function normalizeCityKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

function loadCityCatalogForYear(targetYear: number): CitySummary[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.resolve(
    here,
    "../../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv",
  );
  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const bestByCity = new Map<
    string,
    { city: string; country: string; lat: number; lon: number; year: number; population: number }
  >();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line) continue;
    const cols = line.split(",");
    if (cols.length < 7) continue;
    const city = cols[0]!;
    const country = cols[1]!;
    const lat = Number.parseFloat(cols[2]!);
    const lon = Number.parseFloat(cols[3]!);
    const year = Number.parseInt(cols[4]!, 10);
    const population = Number.parseFloat(cols[5]!);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (!Number.isFinite(year) || !Number.isFinite(population)) continue;
    if (population <= 0 || year > targetYear) continue;
    const key = normalizeCityKey(city, country);
    const prev = bestByCity.get(key);
    if (!prev || year > prev.year || (year === prev.year && population > prev.population)) {
      bestByCity.set(key, { city, country, lat, lon, year, population });
    }
  }
  return [...bestByCity.values()]
    .sort((a, b) => b.population - a.population)
    .slice(0, MAX_CITY_COUNT)
    .map((c) => ({
      cityId: normalizeCityKey(c.city, c.country),
      city: c.city,
      country: c.country,
      lat: c.lat,
      lon: c.lon,
      population: Math.max(1, Math.round(c.population)),
    }));
}

export class RailwaysSessionState {
  readonly sessionId: string;
  readonly config: SessionDeterminismConfig;
  readonly players = new Map<string, SessionPlayer>();
  private readonly trackKeys = new Set<string>();
  private readonly cityById = new Map<string, CitySummary>();
  private readonly cityProgressById = new Map<string, CityEconomyState>();
  private readonly pendingShipmentById = new Map<string, ShipmentState>();
  private readonly playerByClientId = new Map<string, RailwaysPlayerState>();
  private readonly trackByEdgeKey = new Map<string, TrackSegmentState>();
  private readonly routeById = new Map<string, PlayerRouteState>();
  private readonly vehicleById = new Map<string, PlayerVehicleState>();
  private readonly vehicleRuntimeById = new Map<string, VehicleRuntimeState>();
  private readonly cityTileIdByCityId = new Map<string, number>();
  private readonly globe = new Globe({ radius: 1, subdivisions: 7 });
  private readonly events: EconomyEvent[] = [];
  private readonly rnd: () => number;
  private shipmentSeq = 0;
  private routeSeq = 0;
  private vehicleSeq = 0;
  private nextCommoditySpawnSimMs = 0;
  private nextMailSpawnSimMs = 0;
  private nextTransportStepSimMs = 0;
  readonly state: RailwaysAuthoritativeState;
  private lastAdvanceAtMs: number;

  constructor(sessionId: string, config: SessionDeterminismConfig) {
    this.sessionId = sessionId;
    this.config = config;
    this.rnd = mulberry32(hashString(`${config.worldSeed}|${sessionId}`));
    const startYear = 1825;
    const cities = loadCityCatalogForYear(startYear);
    for (const c of cities) {
      this.cityById.set(c.cityId, c);
      const tid = this.globe.getTileIdAtDirection(latLonDegToDirection(c.lat, c.lon));
      this.cityTileIdByCityId.set(c.cityId, tid);
      this.cityProgressById.set(c.cityId, {
        cityId: c.cityId,
        xp: 0,
        level: 1,
        buildings: [],
      });
    }
    this.state = {
      stateVersion: 1,
      clock: {
        dateTimeUtc: "1825-01-01T00:00:00.000Z",
        simSpeed: 1,
        paused: false,
      },
      players: [],
      tracks: [],
      routes: [],
      playerRoutes: [],
      playerVehicles: [],
      economy: {
        cities,
        cityProgress: [...this.cityProgressById.values()],
        shipments: [],
      },
    };
    this.lastAdvanceAtMs = Date.now();
    const t0 = Date.parse(this.state.clock.dateTimeUtc);
    this.nextCommoditySpawnSimMs = t0 + COMMODITY_SPAWN_INTERVAL_SIM_HOURS * SIM_HOUR_MS;
    this.nextMailSpawnSimMs = t0 + MAIL_SPAWN_INTERVAL_SIM_HOURS * SIM_HOUR_MS;
    this.nextTransportStepSimMs = t0 + 2 * SIM_HOUR_MS;
  }

  addPlayer(clientId: string, playerName: string, role: ClientRole): void {
    this.players.set(clientId, { clientId, playerName, role });
    const playerState: RailwaysPlayerState = {
      clientId,
      playerName,
      role,
      colorHex:
        PLAYER_COLORS[(this.state.players.length + hashString(clientId)) % PLAYER_COLORS.length]!,
      startCityId: null,
      fundsPounds: DEFAULT_STARTING_FUNDS_POUNDS,
    };
    this.playerByClientId.set(clientId, playerState);
    this.state.players.push(playerState);
    this.state.stateVersion++;
  }

  addBotPlayers(count: number): void {
    const n = Math.max(0, Math.min(15, Math.floor(count)));
    for (let i = 0; i < n; i++) {
      const clientId = `bot-${i + 1}`;
      if (this.playerByClientId.has(clientId)) continue;
      const p: RailwaysPlayerState = {
        clientId,
        playerName: `Bot ${i + 1}`,
        role: "client",
        colorHex: PLAYER_COLORS[(this.state.players.length + i) % PLAYER_COLORS.length]!,
        startCityId: null,
        fundsPounds: DEFAULT_STARTING_FUNDS_POUNDS,
      };
      this.playerByClientId.set(clientId, p);
      this.state.players.push(p);
      this.state.stateVersion++;
    }
  }

  removePlayer(clientId: string): void {
    this.players.delete(clientId);
    this.playerByClientId.delete(clientId);
    this.state.players = this.state.players.filter((p) => p.clientId !== clientId);
    this.state.playerRoutes = this.state.playerRoutes.filter((r) => r.ownerClientId !== clientId);
    this.state.playerVehicles = this.state.playerVehicles.filter(
      (v) => v.ownerClientId !== clientId,
    );
    for (const [rid, r] of this.routeById) {
      if (r.ownerClientId === clientId) this.routeById.delete(rid);
    }
    for (const [vid, v] of this.vehicleById) {
      if (v.ownerClientId === clientId) this.vehicleById.delete(vid);
    }
    this.state.stateVersion++;
  }

  tick(nowMs: number): void {
    const dtMs = Math.max(0, nowMs - this.lastAdvanceAtMs);
    this.lastAdvanceAtMs = nowMs;
    if (this.state.clock.paused || this.state.clock.simSpeed <= 0 || dtMs <= 0) return;
    const simAdvanceMs = dtMs * this.state.clock.simSpeed;
    const prev = Date.parse(this.state.clock.dateTimeUtc);
    if (!Number.isFinite(prev)) return;
    const next = prev + simAdvanceMs;
    this.state.clock.dateTimeUtc = new Date(next).toISOString();
    while (next >= this.nextCommoditySpawnSimMs) {
      this.spawnCommodityCycle(this.nextCommoditySpawnSimMs);
      this.nextCommoditySpawnSimMs += COMMODITY_SPAWN_INTERVAL_SIM_HOURS * SIM_HOUR_MS;
    }
    while (next >= this.nextMailSpawnSimMs) {
      this.spawnMailAndPassengerCycle(this.nextMailSpawnSimMs);
      this.nextMailSpawnSimMs += MAIL_SPAWN_INTERVAL_SIM_HOURS * SIM_HOUR_MS;
    }
    while (next >= this.nextTransportStepSimMs) {
      this.processTransportStep(this.nextTransportStepSimMs);
      this.nextTransportStepSimMs += 2 * SIM_HOUR_MS;
    }
    let changedTrack = false;
    for (const tr of this.state.tracks) {
      if (tr.status === "building" && next >= tr.buildCompleteAtMs) {
        tr.status = "active";
        changedTrack = true;
      }
    }
    if (changedTrack) this.state.stateVersion++;
  }

  applyCommand(ctx: CommandApplyContext, command: RailwaysCommand): CommandApplyResult {
    switch (command.kind) {
      case "buildTrack": {
        if (
          !Number.isInteger(command.fromTileId) ||
          !Number.isInteger(command.toTileId) ||
          command.fromTileId < 0 ||
          command.toTileId < 0
        ) {
          return { ok: false, reason: "invalid_tile_ids" };
        }
        if (command.fromTileId === command.toTileId) {
          return { ok: false, reason: "track_requires_two_distinct_tiles" };
        }
        return this.queueTrackPathBuild(
          ctx.clientId,
          [command.fromTileId, command.toTileId],
          undefined,
          undefined,
        );
      }
      case "queueTrackBuild": {
        return this.queueTrackPathBuild(
          ctx.clientId,
          command.pathTileIds,
          command.estimatedStepCosts,
          command.terrainFlagsByStep,
        );
      }
      case "setTrainRoute": {
        if (!command.trainId || command.stopTileIds.length < 2) {
          return { ok: false, reason: "route_requires_at_least_two_stops" };
        }
        const validStops = command.stopTileIds.every(
          (v) => Number.isInteger(v) && v >= 0,
        );
        if (!validStops) return { ok: false, reason: "invalid_stop_tile_ids" };
        const existingIdx = this.state.routes.findIndex((r) => r.trainId === command.trainId);
        if (existingIdx >= 0) {
          this.state.routes[existingIdx] = {
            trainId: command.trainId,
            stopTileIds: [...command.stopTileIds],
          };
        } else {
          this.state.routes.push({
            trainId: command.trainId,
            stopTileIds: [...command.stopTileIds],
          });
        }
        this.state.stateVersion++;
        return { ok: true };
      }
      case "setSimSpeed": {
        if (ctx.role !== "host") return { ok: false, reason: "host_only_command" };
        this.state.clock.paused = !!command.paused;
        this.state.clock.simSpeed = clampSimSpeed(command.simSpeed);
        this.state.stateVersion++;
        return { ok: true };
      }
      case "chooseStartingCity": {
        const player = this.playerByClientId.get(ctx.clientId);
        if (!player) return { ok: false, reason: "unknown_player" };
        if (!this.cityById.has(command.cityId)) return { ok: false, reason: "unknown_city" };
        const taken = this.state.players.some(
          (p) => p.clientId !== ctx.clientId && p.startCityId === command.cityId,
        );
        if (taken) return { ok: false, reason: "city_already_taken" };
        player.startCityId = command.cityId;
        if (/^#[0-9a-fA-F]{6}$/.test(command.colorHex)) {
          player.colorHex = command.colorHex;
        }
        this.state.stateVersion++;
        return { ok: true };
      }
      case "createRoute": {
        return this.createRoute(ctx.clientId, command);
      }
      case "purchaseVehicle": {
        return this.purchaseVehicle(ctx.clientId, command);
      }
      case "assignVehiclesToRoute": {
        return this.assignVehiclesToRoute(ctx.clientId, command);
      }
      case "buildProductionBuilding": {
        if (ctx.role !== "host") return { ok: false, reason: "host_only_command" };
        const city = this.cityProgressById.get(command.cityId);
        if (!city) return { ok: false, reason: "unknown_city" };
        const recipe = BUILDING_RECIPES[command.buildingType];
        if (!recipe) return { ok: false, reason: "unknown_building_type" };
        if (city.level < recipe.minLevel) return { ok: false, reason: "city_level_too_low" };
        if (city.buildings.includes(command.buildingType)) {
          return { ok: false, reason: "building_already_exists" };
        }
        city.buildings.push(command.buildingType);
        this.events.push({
          kind: "buildingConstructed",
          cityId: city.cityId,
          buildingType: command.buildingType,
        });
        this.spawnFromBuilding(city.cityId, command.buildingType, this.currentSimMs());
        this.syncCityProgressArray();
        this.state.stateVersion++;
        return { ok: true };
      }
      case "resolveShipmentDelivery": {
        const shipment = this.pendingShipmentById.get(command.shipmentId);
        if (!shipment) return { ok: false, reason: "unknown_shipment" };
        if (shipment.status !== "pending") return { ok: false, reason: "shipment_not_pending" };
        if (shipment.destinationCityId !== command.deliveredAtCityId) {
          return { ok: false, reason: "wrong_destination" };
        }
        shipment.status = "delivered";
        this.pendingShipmentById.delete(shipment.shipmentId);
        this.state.economy.shipments = this.state.economy.shipments.filter(
          (s) => s.shipmentId !== shipment.shipmentId,
        );
        const carriers = [...new Set(command.carrierClientIds.filter(Boolean))];
        if (carriers.length === 0) carriers.push(ctx.clientId);
        const payoutEach = Math.max(
          1,
          Math.floor((shipment.baseValue * shipment.units) / carriers.length),
        );
        for (const clientId of carriers) {
          const p = this.playerByClientId.get(clientId);
          if (p) p.fundsPounds += payoutEach;
        }
        this.events.push({
          kind: "shipmentDelivered",
          shipmentId: shipment.shipmentId,
          payoutByClient: carriers.map((clientId) => ({ clientId, payout: payoutEach })),
        });
        this.grantCityXp(shipment.originCityId, 1);
        this.grantCityXp(shipment.destinationCityId, 1);
        this.syncCityProgressArray();
        this.state.stateVersion++;
        return { ok: true };
      }
      default: {
        const exhaustive: never = command;
        return { ok: false, reason: `unknown_command_${String(exhaustive)}` };
      }
    }
  }

  getClock(): SimClockState {
    return this.state.clock;
  }

  drainEconomyEvents(): EconomyEvent[] {
    if (this.events.length === 0) return [];
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }

  private syncCityProgressArray(): void {
    this.state.economy.cityProgress = [...this.cityProgressById.values()];
  }

  private grantCityXp(cityId: string, amount: number): void {
    const city = this.cityProgressById.get(cityId);
    if (!city) return;
    city.xp += Math.max(0, amount);
    let leveled = false;
    while (city.xp >= city.level * 4) {
      city.xp -= city.level * 4;
      city.level++;
      leveled = true;
      this.events.push({
        kind: "cityLeveled",
        cityId: city.cityId,
        level: city.level,
      });
    }
    if (leveled) this.syncCityProgressArray();
  }

  private activeNodes(year: number, kind: "production" | "demand", goodId: GoodId): CommodityNode[] {
    return ECONOMY_NODES.filter((n) => {
      if (n.kind !== kind || n.goodId !== goodId) return false;
      if (year < n.startYear) return false;
      if (n.endYear != null && year > n.endYear) return false;
      return true;
    });
  }

  private spawnCommodityCycle(simMs: number): void {
    if (this.pendingShipmentById.size >= MAX_PENDING_SHIPMENTS) return;
    const year = new Date(simMs).getUTCFullYear();
    const productionNodes = ECONOMY_NODES.filter(
      (n) =>
        n.kind === "production" &&
        year >= n.startYear &&
        (n.endYear == null || year <= n.endYear),
    );
    if (productionNodes.length === 0) return;
    const node = weightedPick(productionNodes, (n) => n.weight, this.rnd);
    if (!node) return;
    this.spawnShipmentForGood(node.goodId, simMs, {
      preferredSourceNode: node,
      preferNearbyDemandInEarlyGame: true,
    });
    let buildingSpawnBudget = MAX_BUILDING_SHIPMENTS_PER_CYCLE;
    for (const city of this.state.economy.cityProgress) {
      for (const b of city.buildings) {
        if (buildingSpawnBudget <= 0) break;
        this.spawnFromBuilding(city.cityId, b, simMs);
        buildingSpawnBudget--;
      }
      if (buildingSpawnBudget <= 0) break;
    }
  }

  private spawnMailAndPassengerCycle(simMs: number): void {
    if (this.pendingShipmentById.size >= MAX_PENDING_SHIPMENTS) return;
    this.spawnShipmentForGood("mail", simMs, {
      preferPopulationDemand: true,
    });
    if (this.pendingShipmentById.size >= MAX_PENDING_SHIPMENTS) return;
    this.spawnShipmentForGood("passengers", simMs, {
      preferPopulationDemand: true,
    });
  }

  private spawnFromBuilding(
    cityId: string,
    buildingType: ProductionBuildingType,
    simMs: number,
  ): void {
    const recipe = BUILDING_RECIPES[buildingType];
    if (!recipe) return;
    for (const input of recipe.inputs) {
      if (this.pendingShipmentById.size >= MAX_PENDING_SHIPMENTS) break;
      this.spawnShipmentForGood(input, simMs, {
        fixedDestinationCityId: cityId,
      });
    }
    for (const output of recipe.outputs) {
      if (this.pendingShipmentById.size >= MAX_PENDING_SHIPMENTS) break;
      this.spawnShipmentForGood(output, simMs, {
        fixedOriginCityId: cityId,
      });
    }
  }

  private spawnShipmentForGood(
    goodId: GoodId,
    simMs: number,
    opts: {
      preferredSourceNode?: CommodityNode;
      fixedOriginCityId?: string;
      fixedDestinationCityId?: string;
      preferNearbyDemandInEarlyGame?: boolean;
      preferPopulationDemand?: boolean;
    } = {},
  ): void {
    const year = new Date(simMs).getUTCFullYear();
    const cities = this.state.economy.cities;
    if (cities.length < 2) return;

    let sourceNode = opts.preferredSourceNode;
    if (!sourceNode && !opts.fixedOriginCityId && goodId !== "mail" && goodId !== "passengers") {
      const prodNodes = this.activeNodes(year, "production", goodId);
      sourceNode = weightedPick(prodNodes, (n) => n.weight, this.rnd) ?? undefined;
    }
    const originCity =
      (opts.fixedOriginCityId ? this.cityById.get(opts.fixedOriginCityId) : null) ??
      this.pickOriginCityForGood(goodId, sourceNode, year);
    if (!originCity) return;

    let demandNode: CommodityNode | undefined;
    if (!opts.fixedDestinationCityId && !opts.preferPopulationDemand) {
      const dNodes = this.activeNodes(year, "demand", goodId);
      if (dNodes.length > 0) {
        demandNode = weightedPick(dNodes, (n) => n.weight, this.rnd) ?? undefined;
      }
    }
    const destinationCity =
      (opts.fixedDestinationCityId ? this.cityById.get(opts.fixedDestinationCityId) : null) ??
      this.pickDestinationCityForGood(goodId, originCity, demandNode, year, {
        preferPopulationDemand: !!opts.preferPopulationDemand,
        preferNearby: !!opts.preferNearbyDemandInEarlyGame,
      });
    if (!destinationCity) return;
    if (originCity.cityId === destinationCity.cityId) return;

    const distKm = haversineKm(
      originCity.lat,
      originCity.lon,
      destinationCity.lat,
      destinationCity.lon,
    );
    const shipmentId = `sh-${++this.shipmentSeq}`;
    const shipment: ShipmentState = {
      shipmentId,
      goodId,
      originCityId: originCity.cityId,
      destinationCityId: destinationCity.cityId,
      units: 1,
      baseValue: Math.max(1, Math.round(GOOD_BASE_VALUE[goodId] * (1 + distKm / 3000))),
      createdAtMs: simMs,
      sourceNodeId: sourceNode?.id,
      demandNodeId: demandNode?.id,
      status: "pending",
      originTileId: this.cityTileIdByCityId.get(originCity.cityId),
      destinationTileId: this.cityTileIdByCityId.get(destinationCity.cityId),
      currentTileId: this.cityTileIdByCityId.get(originCity.cityId),
      plannedTilePath: undefined,
      plannedPathCursor: 0,
      onboardVehicleId: null,
      journeyVehicleIds: [],
      journeyRailEdgeKeys: [],
    };
    this.pendingShipmentById.set(shipmentId, shipment);
    this.state.economy.shipments.push(shipment);
    this.events.push({
      kind: "shipmentSpawned",
      shipment,
    });
    this.state.stateVersion++;
    if (this.state.economy.shipments.length > MAX_PENDING_SHIPMENTS) {
      const overflow = this.state.economy.shipments.length - MAX_PENDING_SHIPMENTS;
      this.state.economy.shipments.splice(0, overflow);
    }
  }

  private pickOriginCityForGood(
    goodId: GoodId,
    sourceNode: CommodityNode | undefined,
    year: number,
  ): CitySummary | null {
    const cities = this.state.economy.cities;
    if (cities.length === 0) return null;
    if (goodId === "mail" || goodId === "passengers") {
      return weightedPick(cities, (c) => Math.pow(c.population, 0.85), this.rnd);
    }
    const prodNodes = sourceNode ? [sourceNode] : this.activeNodes(year, "production", goodId);
    if (prodNodes.length === 0) {
      return weightedPick(cities, (c) => Math.pow(c.population, 0.65), this.rnd);
    }
    return weightedPick(
      cities,
      (c) => {
        let influence = 0;
        for (const n of prodNodes) {
          const d = haversineKm(c.lat, c.lon, n.lat, n.lon);
          influence += n.weight * influenceWeight(d, n.spreadKm);
        }
        return Math.pow(c.population, 0.58) * Math.max(1e-6, influence);
      },
      this.rnd,
    );
  }

  private pickDestinationCityForGood(
    goodId: GoodId,
    origin: CitySummary,
    demandNode: CommodityNode | undefined,
    year: number,
    opts: { preferPopulationDemand: boolean; preferNearby: boolean },
  ): CitySummary | null {
    const cities = this.state.economy.cities.filter((c) => c.cityId !== origin.cityId);
    if (cities.length === 0) return null;
    if (opts.preferPopulationDemand) {
      return weightedPick(
        cities,
        (c) => {
          const d = haversineKm(origin.lat, origin.lon, c.lat, c.lon);
          const longBias = 0.4 + Math.min(1.6, d / 2200);
          return Math.pow(c.population, 0.9) * longBias;
        },
        this.rnd,
      );
    }
    if (demandNode) {
      return weightedPick(
        cities,
        (c) => {
          const dNode = haversineKm(c.lat, c.lon, demandNode.lat, demandNode.lon);
          const dOrigin = haversineKm(origin.lat, origin.lon, c.lat, c.lon);
          const nearNode = influenceWeight(dNode, demandNode.spreadKm);
          const routeBias = opts.preferNearby && year <= 1840 ? influenceWeight(dOrigin, 2200) + 0.2 : 1;
          return Math.pow(c.population, 0.8) * demandNode.weight * nearNode * routeBias;
        },
        this.rnd,
      );
    }
    const prodNodes = this.activeNodes(year, "production", goodId);
    let maxProd = 1e-6;
    const prodScore = new Map<string, number>();
    for (const c of cities) {
      let s = 0;
      for (const n of prodNodes) {
        const d = haversineKm(c.lat, c.lon, n.lat, n.lon);
        s += n.weight * influenceWeight(d, n.spreadKm);
      }
      prodScore.set(c.cityId, s);
      if (s > maxProd) maxProd = s;
    }
    return weightedPick(
      cities,
      (c) => {
        const p = (prodScore.get(c.cityId) ?? 0) / maxProd;
        const scarcity = 0.15 + (1 - Math.min(1, p));
        const dOrigin = haversineKm(origin.lat, origin.lon, c.lat, c.lon);
        const routeBias = opts.preferNearby && year <= 1840 ? influenceWeight(dOrigin, 2600) + 0.2 : 1;
        return Math.pow(c.population, 0.8) * scarcity * routeBias;
      },
      this.rnd,
    );
  }

  private serviceVehicleMoveIntervalMs(kind: VehicleKind): number {
    return VEHICLE_MOVE_INTERVAL_SIM_HOURS[kind] * SIM_HOUR_MS;
  }

  private ensureVehicleRuntime(v: PlayerVehicleState, route: PlayerRouteState): VehicleRuntimeState | null {
    if (route.tileIds.length < 2) return null;
    const existing = this.vehicleRuntimeById.get(v.vehicleId);
    if (existing) return existing;
    const currentTileId = route.tileIds[0]!;
    const nextTileId = route.tileIds[1]!;
    const runtime: VehicleRuntimeState = {
      routeIndex: 0,
      direction: 1,
      currentTileId,
      nextTileId,
      lastMoveAtMs: this.currentSimMs(),
      nextMoveAtMs: this.currentSimMs() + this.serviceVehicleMoveIntervalMs(v.kind),
    };
    this.vehicleRuntimeById.set(v.vehicleId, runtime);
    v.currentTileId = currentTileId;
    v.nextTileId = nextTileId;
    v.direction = 1;
    v.lastMoveAtMs = runtime.lastMoveAtMs;
    v.nextMoveAtMs = runtime.nextMoveAtMs;
    return runtime;
  }

  private updateRuntimeForPingPong(
    runtime: VehicleRuntimeState,
    route: PlayerRouteState,
  ): { fromTileId: number; toTileId: number } | null {
    const n = route.tileIds.length;
    if (n < 2) return null;
    const from = runtime.currentTileId;
    let idx = runtime.routeIndex;
    let dir = runtime.direction;
    if (route.isLoop) {
      idx = (idx + 1) % n;
      dir = 1;
    } else {
      const end = n - 1;
      if (idx <= 0) dir = 1;
      else if (idx >= end) dir = -1;
      idx = idx + dir;
      if (idx < 0) idx = 0;
      if (idx > end) idx = end;
      if (idx === 0) dir = 1;
      if (idx === end) dir = -1;
    }
    runtime.routeIndex = idx;
    runtime.direction = dir;
    runtime.currentTileId = route.tileIds[idx]!;
    const lookAheadIdx = route.isLoop
      ? (idx + 1) % n
      : Math.max(0, Math.min(n - 1, idx + (dir > 0 ? 1 : -1)));
    runtime.nextTileId = route.tileIds[lookAheadIdx]!;
    return { fromTileId: from, toTileId: runtime.currentTileId };
  }

  private buildActiveServiceEdgeAdjacency(): Map<number, Set<number>> {
    const out = new Map<number, Set<number>>();
    for (const route of this.state.playerRoutes) {
      if (route.vehicleIds.length === 0 || route.tileIds.length < 2) continue;
      for (let i = 1; i < route.tileIds.length; i++) {
        const a = route.tileIds[i - 1]!;
        const b = route.tileIds[i]!;
        let sa = out.get(a);
        if (!sa) {
          sa = new Set<number>();
          out.set(a, sa);
        }
        let sb = out.get(b);
        if (!sb) {
          sb = new Set<number>();
          out.set(b, sb);
        }
        sa.add(b);
        sb.add(a);
      }
      if (route.isLoop && route.tileIds.length >= 3) {
        const a = route.tileIds[route.tileIds.length - 1]!;
        const b = route.tileIds[0]!;
        let sa = out.get(a);
        if (!sa) {
          sa = new Set<number>();
          out.set(a, sa);
        }
        let sb = out.get(b);
        if (!sb) {
          sb = new Set<number>();
          out.set(b, sb);
        }
        sa.add(b);
        sb.add(a);
      }
    }
    return out;
  }

  private bfsTilePath(start: number, goal: number, adj: Map<number, Set<number>>): number[] | null {
    if (start === goal) return [start];
    const q: number[] = [start];
    const prev = new Map<number, number>([[start, -1]]);
    let qi = 0;
    while (qi < q.length && q.length < 200000) {
      const cur = q[qi++]!;
      const ns = adj.get(cur);
      if (!ns) continue;
      for (const n of ns) {
        if (prev.has(n)) continue;
        prev.set(n, cur);
        if (n === goal) {
          const path: number[] = [n];
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

  private ensureShipmentTilePath(shipment: ShipmentState, adj: Map<number, Set<number>>): void {
    if (shipment.originTileId == null) {
      shipment.originTileId = this.cityTileIdByCityId.get(shipment.originCityId);
    }
    if (shipment.destinationTileId == null) {
      shipment.destinationTileId = this.cityTileIdByCityId.get(shipment.destinationCityId);
    }
    if (shipment.currentTileId == null) shipment.currentTileId = shipment.originTileId;
    if (
      shipment.currentTileId == null ||
      shipment.destinationTileId == null ||
      shipment.currentTileId < 0 ||
      shipment.destinationTileId < 0
    ) {
      return;
    }
    if (
      shipment.plannedTilePath &&
      shipment.plannedTilePath.length >= 2 &&
      shipment.plannedTilePath[shipment.plannedPathCursor ?? 0] === shipment.currentTileId &&
      shipment.plannedTilePath[shipment.plannedTilePath.length - 1] === shipment.destinationTileId
    ) {
      return;
    }
    const path = this.bfsTilePath(shipment.currentTileId, shipment.destinationTileId, adj);
    if (!path || path.length < 2) return;
    shipment.plannedTilePath = path;
    shipment.plannedPathCursor = 0;
  }

  private payoutShipment(shipment: ShipmentState, fallbackClientId: string): void {
    const totalValue = Math.max(1, Math.round(shipment.baseValue * shipment.units));
    const vehicleOwners = new Map<string, number>();
    const railOwners = new Map<string, number>();
    for (const vid of shipment.journeyVehicleIds ?? []) {
      const v = this.vehicleById.get(vid);
      if (!v) continue;
      vehicleOwners.set(v.ownerClientId, (vehicleOwners.get(v.ownerClientId) ?? 0) + 1);
    }
    for (const edge of shipment.journeyRailEdgeKeys ?? []) {
      const tr = this.trackByEdgeKey.get(edge);
      if (!tr) continue;
      railOwners.set(tr.ownerClientId, (railOwners.get(tr.ownerClientId) ?? 0) + 1);
    }
    const payoutByClient = new Map<string, number>();
    const splitByWeights = (target: Map<string, number>, budget: number): void => {
      const totalW = [...target.values()].reduce((s, v) => s + v, 0);
      if (totalW <= 0 || budget <= 0) return;
      let assigned = 0;
      const entries = [...target.entries()];
      for (let i = 0; i < entries.length; i++) {
        const [clientId, w] = entries[i]!;
        const raw = i === entries.length - 1 ? budget - assigned : Math.floor((budget * w) / totalW);
        const val = Math.max(0, raw);
        assigned += val;
        payoutByClient.set(clientId, (payoutByClient.get(clientId) ?? 0) + val);
      }
    };
    const railBudget = Math.floor(totalValue * 0.5);
    const vehicleBudget = totalValue - railBudget;
    splitByWeights(railOwners, railBudget);
    splitByWeights(vehicleOwners, vehicleBudget);
    if (payoutByClient.size === 0) {
      payoutByClient.set(fallbackClientId, totalValue);
    }
    for (const [clientId, payout] of payoutByClient) {
      const p = this.playerByClientId.get(clientId);
      if (p) p.fundsPounds += payout;
    }
    this.events.push({
      kind: "shipmentDelivered",
      shipmentId: shipment.shipmentId,
      payoutByClient: [...payoutByClient.entries()].map(([clientId, payout]) => ({
        clientId,
        payout,
      })),
    });
  }

  private processTransportStep(simMs: number): void {
    const adj = this.buildActiveServiceEdgeAdjacency();
    if (adj.size === 0) return;
    for (const shipment of this.state.economy.shipments) {
      if (shipment.status === "delivered") continue;
      this.ensureShipmentTilePath(shipment, adj);
    }

    for (const vehicle of this.state.playerVehicles) {
      if (!vehicle.assignedRouteId) continue;
      const route = this.routeById.get(vehicle.assignedRouteId);
      if (!route || route.tileIds.length < 2) continue;
      const runtime = this.ensureVehicleRuntime(vehicle, route);
      if (!runtime) continue;
      const interval = this.serviceVehicleMoveIntervalMs(vehicle.kind);
      if (runtime.nextMoveAtMs > simMs) continue;
      const move = this.updateRuntimeForPingPong(runtime, route);
      if (!move) continue;
      runtime.lastMoveAtMs = simMs;
      runtime.nextMoveAtMs = simMs + interval;
      vehicle.currentTileId = runtime.currentTileId;
      vehicle.nextTileId = runtime.nextTileId;
      vehicle.direction = runtime.direction;
      vehicle.lastMoveAtMs = runtime.lastMoveAtMs;
      vehicle.nextMoveAtMs = runtime.nextMoveAtMs;
      const from = move.fromTileId;
      const to = move.toTileId;
      const edgeKey = this.trackEdgeKey(from, to);

      for (const shipment of this.state.economy.shipments) {
        if (shipment.status === "delivered") continue;
        if (shipment.currentTileId == null) continue;
        if (shipment.destinationTileId == null) continue;
        if (!shipment.plannedTilePath || shipment.plannedTilePath.length < 2) continue;
        if (shipment.currentTileId !== from) continue;
        const cursor = shipment.plannedPathCursor ?? 0;
        if (cursor < 0 || cursor + 1 >= shipment.plannedTilePath.length) continue;
        const nextReq = shipment.plannedTilePath[cursor + 1]!;
        if (nextReq !== to) continue;

        shipment.status = "in_transit";
        shipment.onboardVehicleId = vehicle.vehicleId;
        shipment.currentTileId = to;
        shipment.plannedPathCursor = cursor + 1;
        if (!shipment.journeyVehicleIds) shipment.journeyVehicleIds = [];
        if (!shipment.journeyRailEdgeKeys) shipment.journeyRailEdgeKeys = [];
        shipment.journeyVehicleIds.push(vehicle.vehicleId);
        shipment.journeyRailEdgeKeys.push(edgeKey);
        shipment.onboardVehicleId = null;

        if (to === shipment.destinationTileId) {
          shipment.status = "delivered";
          this.pendingShipmentById.delete(shipment.shipmentId);
          this.payoutShipment(shipment, vehicle.ownerClientId);
          this.grantCityXp(shipment.originCityId, 1);
          this.grantCityXp(shipment.destinationCityId, 1);
        } else {
          shipment.status = "pending";
        }
        this.state.stateVersion++;
      }
    }
    this.state.economy.shipments = this.state.economy.shipments.filter(
      (s) => s.status !== "delivered",
    );
  }

  private trackEdgeKey(fromTileId: number, toTileId: number): string {
    const n = normalizedSegment(fromTileId, toTileId);
    return `${n.fromTileId}:${n.toTileId}`;
  }

  private perStepBuildCost(
    estimated: number | undefined,
    flags: { hilly?: boolean; river?: boolean; mountain?: boolean } | undefined,
  ): number {
    const allowed = new Set([10, 30, 70, 100]);
    if (estimated != null && allowed.has(Math.round(estimated))) return Math.round(estimated);
    if (flags?.mountain) return 100;
    if (flags?.river) return 70;
    if (flags?.hilly) return 30;
    return 10;
  }

  private queueTrackPathBuild(
    clientId: string,
    pathTileIds: number[],
    estimatedStepCosts?: number[],
    terrainFlagsByStep?: Array<{ hilly?: boolean; river?: boolean; mountain?: boolean }>,
  ): CommandApplyResult {
    const player = this.playerByClientId.get(clientId);
    if (!player) return { ok: false, reason: "unknown_player" };
    if (!player.startCityId) return { ok: false, reason: "must_pick_start_city_first" };
    if (pathTileIds.length < 2) return { ok: false, reason: "path_requires_two_or_more_tiles" };
    const edgePairs: Array<{ a: number; b: number }> = [];
    for (let i = 1; i < pathTileIds.length; i++) {
      const a = pathTileIds[i - 1]!;
      const b = pathTileIds[i]!;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b) {
        return { ok: false, reason: "invalid_path_tiles" };
      }
      edgePairs.push({ a, b });
    }
    for (const e of edgePairs) {
      const key = this.trackEdgeKey(e.a, e.b);
      if (this.trackKeys.has(key)) return { ok: false, reason: "path_contains_existing_track" };
    }
    const perStepCosts = edgePairs.map((_, idx) =>
      this.perStepBuildCost(estimatedStepCosts?.[idx], terrainFlagsByStep?.[idx]),
    );
    const totalCost = perStepCosts.reduce((s, v) => s + v, 0);
    if (player.fundsPounds < totalCost) return { ok: false, reason: "insufficient_funds" };
    player.fundsPounds -= totalCost;
    const simNow = Date.parse(this.state.clock.dateTimeUtc);
    let startAt = Number.isFinite(simNow) ? simNow : Date.now();
    for (let i = 0; i < edgePairs.length; i++) {
      const e = edgePairs[i]!;
      const key = this.trackEdgeKey(e.a, e.b);
      this.trackKeys.add(key);
      const buildCost = perStepCosts[i]!;
      const seg: TrackSegmentState = {
        fromTileId: Math.min(e.a, e.b),
        toTileId: Math.max(e.a, e.b),
        ownerClientId: player.clientId,
        ownerColorHex: player.colorHex,
        status: "building",
        buildStartedAtMs: startAt,
        buildCompleteAtMs: startAt + BUILD_DURATION_MS,
        buildCostPounds: buildCost,
      };
      startAt += BUILD_DURATION_MS;
      this.trackByEdgeKey.set(key, seg);
      this.state.tracks.push(seg);
    }
    this.state.stateVersion++;
    return { ok: true };
  }

  private createRoute(clientId: string, cmd: CreateRouteCommand): CommandApplyResult {
    const player = this.playerByClientId.get(clientId);
    if (!player) return { ok: false, reason: "unknown_player" };
    if (cmd.tileIds.length < 2) return { ok: false, reason: "route_requires_two_or_more_tiles" };
    for (const id of cmd.tileIds) {
      if (!Number.isInteger(id) || id < 0) return { ok: false, reason: "invalid_route_tile" };
    }
    for (let i = 1; i < cmd.tileIds.length; i++) {
      const a = cmd.tileIds[i - 1]!;
      const b = cmd.tileIds[i]!;
      if (a === b) return { ok: false, reason: "duplicate_adjacent_tile" };
      if (cmd.mode === "rail") {
        const tr = this.trackByEdgeKey.get(this.trackEdgeKey(a, b));
        if (!tr || tr.status !== "active") {
          return { ok: false, reason: "rail_route_requires_active_track_edges" };
        }
      }
    }
    const routeId = `r-${++this.routeSeq}`;
    const route: PlayerRouteState = {
      routeId,
      ownerClientId: clientId,
      mode: cmd.mode,
      name: (cmd.name?.trim() || `${cmd.mode === "rail" ? "Rail" : "Sea"} Route ${this.routeSeq}`).slice(0, 48),
      tileIds: [...cmd.tileIds],
      isLoop: !!cmd.isLoop,
      vehicleIds: [],
    };
    this.routeById.set(routeId, route);
    this.state.playerRoutes.push(route);
    this.state.stateVersion++;
    return { ok: true };
  }

  private capForVehicleKind(kind: VehicleKind): number {
    if (kind === "sail_ship") return SHIP_CAP;
    if (kind === "locomotive_front") return TRAIN_CORE_CAP;
    return 20;
  }

  private purchaseVehicle(clientId: string, cmd: PurchaseVehicleCommand): CommandApplyResult {
    const player = this.playerByClientId.get(clientId);
    if (!player) return { ok: false, reason: "unknown_player" };
    const qty = Math.max(1, Math.min(10, Math.floor(cmd.quantity ?? 1)));
    let ownedKind = this.state.playerVehicles.filter(
      (v) => v.ownerClientId === clientId && v.kind === cmd.vehicleKind,
    ).length;
    const cap = this.capForVehicleKind(cmd.vehicleKind);
    if (ownedKind >= cap) return { ok: false, reason: "vehicle_cap_reached" };
    let bought = 0;
    const simNow = this.currentSimMs();
    for (let i = 0; i < qty; i++) {
      if (ownedKind >= cap) break;
      const price = Math.round(VEHICLE_BASE_PRICE[cmd.vehicleKind] * (1 + ownedKind * 0.08));
      if (player.fundsPounds < price) break;
      player.fundsPounds -= price;
      const vehicleId = `v-${++this.vehicleSeq}`;
      const v: PlayerVehicleState = {
        vehicleId,
        ownerClientId: clientId,
        kind: cmd.vehicleKind,
        purchasedAtMs: simNow,
        assignedRouteId: null,
      };
      this.vehicleById.set(vehicleId, v);
      this.state.playerVehicles.push(v);
      ownedKind++;
      bought++;
    }
    if (bought <= 0) return { ok: false, reason: "insufficient_funds_or_cap" };
    this.state.stateVersion++;
    return { ok: true };
  }

  private assignVehiclesToRoute(
    clientId: string,
    cmd: AssignVehiclesToRouteCommand,
  ): CommandApplyResult {
    const route = this.routeById.get(cmd.routeId);
    if (!route) return { ok: false, reason: "unknown_route" };
    if (route.ownerClientId !== clientId) return { ok: false, reason: "not_route_owner" };
    const uniqueVehicleIds = [...new Set(cmd.vehicleIds)].slice(0, 12);
    const vehicles: PlayerVehicleState[] = [];
    for (const vid of uniqueVehicleIds) {
      const v = this.vehicleById.get(vid);
      if (!v) return { ok: false, reason: "unknown_vehicle" };
      if (v.ownerClientId !== clientId) return { ok: false, reason: "not_vehicle_owner" };
      vehicles.push(v);
    }
    if (route.mode === "water") {
      const nonShip = vehicles.find((v) => v.kind !== "sail_ship");
      if (nonShip) return { ok: false, reason: "water_route_requires_ship_only" };
    } else {
      const hasLoco = vehicles.some((v) => v.kind === "locomotive_front");
      if (!hasLoco && vehicles.length > 0) return { ok: false, reason: "rail_route_requires_locomotive" };
      const hasShip = vehicles.some((v) => v.kind === "sail_ship");
      if (hasShip) return { ok: false, reason: "rail_route_cannot_use_ship" };
    }
    for (const v of this.state.playerVehicles) {
      if (v.ownerClientId !== clientId) continue;
      if (v.assignedRouteId === route.routeId) {
        v.assignedRouteId = null;
        this.vehicleRuntimeById.delete(v.vehicleId);
      }
    }
    route.vehicleIds = [];
    for (const v of vehicles) {
      v.assignedRouteId = route.routeId;
      route.vehicleIds.push(v.vehicleId);
      this.vehicleRuntimeById.delete(v.vehicleId);
    }
    this.state.stateVersion++;
    return { ok: true };
  }

  private currentSimMs(): number {
    const t = Date.parse(this.state.clock.dateTimeUtc);
    return Number.isFinite(t) ? t : Date.now();
  }
}
