import { findNearestTileId } from "./geodesic.js";
import { cityRequiresPortAccess } from "./cityCatalogSelection.js";
import {
  CITY_PORT_ACCESS_RING_DISTANCE,
  cityHasPortAccess,
  isCityPortAccessTile
} from "./cityPortAccess.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

export function placeCityCatalogOnWorld(options) {
  const { cities } = options;
  if (!Array.isArray(cities)) throw new Error("City placement requires a city catalog array");
  const placed = new Map();
  for (const city of cities) {
    const placement = cityPlacementCoordinates(city);
    const startId = findNearestTileId(
      options.graph,
      options.directionIndex,
      latLonToDirection(placement.lat, placement.lon)
    );
    const predicate = cityPlacementPredicate(options, city);
    if (city.islandSettlement && !predicate(startId)) {
      throw new Error(
        `Island settlement has no dockable land at its real coordinates: ${city.city}, ${city.country}`
      );
    }
    let tileId = predicate(startId) ? startId : nearestTileMatching(options.graph, startId, predicate);
    if (tileId === undefined) throw new Error(`Could not place city on drawable land tile: ${city.city}, ${city.country}`);
    if (placed.has(tileId)) {
      if (city.islandSettlement) {
        throw new Error(
          `Island settlement tile is already occupied at its real coordinates: ${city.city}, ${city.country}`
        );
      }
      if (!cityRequiresPortAccess(city)) continue;
      tileId = nearestTileMatching(options.graph, tileId, (id) => predicate(id) && !placed.has(id));
      if (tileId === undefined) {
        throw new Error(`Could not place required port city on an unoccupied land tile: ${city.city}, ${city.country}`);
      }
    }
    placed.set(tileId, placedSettlement(city, tileId, options.earthRows));
  }
  return placed;
}

function cityPlacementCoordinates(city) {
  const hasLat = city?.placementLat !== undefined;
  const hasLon = city?.placementLon !== undefined;
  if (hasLat !== hasLon) {
    throw new Error(`City placement override requires both latitude and longitude: ${city?.city || "unknown"}`);
  }
  const placement = hasLat
    ? { lat: city.placementLat, lon: city.placementLon }
    : city;
  validateCoordinates(placement, `city ${city?.city || "unknown"}`);
  return placement;
}

export function placeColonizationTargetsOnWorld({
  targets,
  occupiedTileIds = [],
  occupiedCities = [],
  ...options
}) {
  if (!Array.isArray(targets)) throw new Error("Colony placement requires a target array");
  const occupied = new Set(occupiedTileIds);
  const existingSettlements = new Map();
  for (const city of occupiedCities) {
    if (!Number.isInteger(city?.tileId) || city.tileId < 0) {
      throw new Error("Existing colony-target settlement requires a tile id");
    }
    occupied.add(city.tileId);
    const key = settlementKey(city);
    if (existingSettlements.has(key)) {
      throw new Error(`Duplicate existing colony-target settlement: ${city.city}, ${city.country}`);
    }
    existingSettlements.set(key, city);
  }
  const placed = [];
  for (const target of targets) {
    if (target.waterAccess === "inland") continue;
    validateCoordinates(target, `colony ${target?.city || "unknown"}`);
    if (target.preexistingSettlement) {
      const settlement = existingSettlements.get(settlementKey(target));
      if (!settlement) {
        throw new Error(`Existing colony target is absent from the city catalog: ${target.city}, ${target.country}`);
      }
      if (settlement.settlementType !== "village") {
        throw new Error(`Existing colony target is not a village: ${target.city}, ${target.country}`);
      }
      placed.push(Object.freeze(placedSettlement(target, settlement.tileId, options.earthRows)));
      continue;
    }
    const startId = findNearestTileId(
      options.graph,
      options.directionIndex,
      latLonToDirection(target.lat, target.lon)
    );
    const tileId = nearestTileMatching(options.graph, startId, (id) => (
      isCityDrawableTile(options.earthRows, id) &&
      !occupied.has(id) &&
      cityHasPortAccess(portAccessOptions(options, id))
    ));
    if (tileId === undefined) {
      throw new Error(`Could not place water-accessible colony on an empty port tile: ${target.city}, ${target.country}`);
    }
    occupied.add(tileId);
    placed.push(Object.freeze(placedSettlement(target, tileId, options.earthRows)));
  }
  return Object.freeze(placed);
}

function settlementKey(record) {
  if (typeof record?.city !== "string" || record.city.trim() === "" ||
      typeof record?.country !== "string" || record.country.trim() === "") {
    throw new Error("Colony-target settlement requires a city and country");
  }
  return `${record.city.trim().toLowerCase()}|${record.country.trim().toLowerCase()}`;
}

export function portCitiesOnWorld(cityByTileId, options) {
  if (!(cityByTileId instanceof Map)) throw new Error("Port city selection requires a placed city map");
  const ports = [...cityByTileId.values()].filter((city) => cityHasPortAccess(portAccessOptions(options, city.tileId)));
  if (ports.length === 0) throw new Error("No water-accessible ports were placed on the world");
  return ports;
}

export function portAccessTileIds(options, cityTileId) {
  const { graph } = options;
  if (!Number.isInteger(cityTileId) || cityTileId < 0 || cityTileId >= graph.tileCount) {
    throw new Error(`Invalid port city tile: ${cityTileId}`);
  }
  const result = [];
  const visited = new Set([cityTileId]);
  const queue = [{ tileId: cityTileId, distance: 0 }];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (isCityPortAccessTile({
      earthRows: options.earthRows,
      reachableNavigationMask: options.reachableNavigationMask,
      riverMasks: options.riverMasks,
      tileId: current.tileId
    })) result.push(current.tileId);
    if (current.distance >= CITY_PORT_ACCESS_RING_DISTANCE) continue;
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ tileId: neighborId, distance: current.distance + 1 });
    }
  }
  if (result.length === 0) throw new Error(`Port city tile ${cityTileId} has no ocean-reachable access tile`);
  return Object.freeze(result.sort((a, b) => a - b));
}

export function nearestTileMatching(graph, startId, predicate) {
  if (!graph?.neighbors || !Number.isInteger(startId) || startId < 0 || startId >= graph.tileCount) {
    throw new Error(`Invalid nearest-tile search origin: ${startId}`);
  }
  if (typeof predicate !== "function") throw new Error("Nearest-tile search requires a predicate");
  const seen = new Set([startId]);
  const queue = [startId];
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    if (predicate(tileId)) return tileId;
    for (const neighborId of graph.neighbors[tileId]) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  return undefined;
}

function cityPlacementPredicate(options, city) {
  if (!cityRequiresPortAccess(city)) return (tileId) => isCityDrawableTile(options.earthRows, tileId);
  return (tileId) => (
    isCityDrawableTile(options.earthRows, tileId) &&
    cityHasPortAccess(portAccessOptions(options, tileId))
  );
}

function portAccessOptions(options, tileId) {
  return {
    graph: options.graph,
    earthRows: options.earthRows,
    reachableNavigationMask: options.reachableNavigationMask,
    riverMasks: options.riverMasks,
    tileId
  };
}

function isCityDrawableTile(earthRows, tileId) {
  return !isWaterSurfaceRow(earthRows[tileId]);
}

function placedSettlement(settlement, tileId, earthRows) {
  const landmassId = earthRows?.[tileId]?.m;
  if (!Number.isInteger(landmassId) || landmassId < 0) {
    throw new Error(`Placed settlement has no landmass id: ${settlement?.city || "unknown"} at ${tileId}`);
  }
  return { ...settlement, tileId, landmassId };
}

function validateCoordinates(record, label) {
  if (!Number.isFinite(record?.lat) || !Number.isFinite(record?.lon)) {
    throw new Error(`Invalid coordinates for ${label}`);
  }
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}
