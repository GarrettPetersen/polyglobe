import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";
import {
  FACTION_CAPITALS_1522,
  factionCapitalCityRecords1522,
  factionCapitalForCity,
  factionIdForCity1522
} from "./factions.js";
import {
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS
} from "./manualRiverHexChains.js";
import {
  cityCatalogSelectionScore,
  selectCityCatalogRecords
} from "./cityCatalogSelection.js";

const SUBDIVISIONS = 7;
const CITY_CATALOG_MAX_COUNT = 480;
const CITY_PORT_ACCESS_RING_DISTANCE = 2;
const repoRoot = new URL("../../../", import.meta.url);

test("water-access intent gives small gameplay ports selection weight", () => {
  const inland = { city: "Large Inland", population: 40000 };
  const port = { city: "Small Port", population: 5000, coastalIntent: true };

  assert.ok(cityCatalogSelectionScore(port) > cityCatalogSelectionScore(inland));
  assert.deepEqual(
    selectCityCatalogRecords([inland, port], 1).map((city) => city.city),
    ["Small Port"]
  );
});

test("1522 city selection keeps enough British Isles ports and Inca access", async () => {
  const [earth, csv] = await Promise.all([
    readJson(new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot)),
    readFile(
      new URL("examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", repoRoot),
      "utf8"
    )
  ]);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const directionIndex = createDirectionIndex(graph);
  const { masks, toWaterMasks } = buildRiverMasks(graph, earth);
  const reachable = buildOceanReachableNavigationMask(graph, earth.tiles, masks, toWaterMasks);
  const cityRecords = buildCityRecords1522(csv);
  const selected = ensureFactionCapitals(
    selectCityCatalogRecords(cityRecords.values(), CITY_CATALOG_MAX_COUNT),
    cityRecords
  );
  const placed = placeCityRecords(graph, directionIndex, earth.tiles, reachable, masks, selected);
  const ports = placed.filter((city) => city.dockable);
  const britishIslesPorts = ports.filter((city) =>
    city.country === "United Kingdom" || city.country === "Ireland"
  );
  const incaPorts = ports.filter((city) => city.factionId === "inca");

  assert.ok(
    britishIslesPorts.length >= 5,
    `expected at least five British Isles ports, got ${britishIslesPorts.map(cityLabel).join(", ")}`
  );
  assert.ok(
    incaPorts.length >= 1,
    `expected at least one Inca port, got ${incaPorts.map(cityLabel).join(", ")}`
  );
  assert.ok(britishIslesPorts.some((city) => city.city === "Exeter"));
  assert.ok(incaPorts.some((city) => city.city === "Chanchan" || city.city === "Pachacamac"));
});

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function buildCityRecords1522(csv) {
  const rows = parseCsvRows(csv);
  const header = rows[0];
  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));
  const bestByCity = new Map();
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 1 && row[0] === "") continue;
    const city = row[indexes.city]?.trim();
    const country = row[indexes.country]?.trim();
    const lat = Number(row[indexes.latitude]);
    const lon = Number(row[indexes.longitude]);
    const year = Number.parseInt(row[indexes.year], 10);
    const population = Number(row[indexes.population]);
    if (!city || !country || population <= 0 || year > 1522) continue;

    const cityId = cityKey(city, country);
    const prev = bestByCity.get(cityId);
    if (prev && (year < prev.year || (year === prev.year && population <= prev.population))) continue;
    const cityRecord = {
      cityId,
      city,
      displayCity: displayName(city, country),
      country,
      lat,
      lon,
      year,
      population: Math.round(population),
      coastalIntent: truthyCsv(row[indexes.coastal_intent]),
      lakeIntent: truthyCsv(row[indexes.lake_intent])
    };
    const capitalSpec = factionCapitalForCity(cityRecord);
    bestByCity.set(cityId, {
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec?.factionId || null
    });
  }

  for (const capitalSpec of factionCapitalCityRecords1522()) {
    const cityId = cityKey(capitalSpec.city, capitalSpec.country);
    if (bestByCity.has(cityId)) continue;
    const cityRecord = {
      cityId,
      city: capitalSpec.city,
      displayCity: displayName(capitalSpec.city, capitalSpec.country),
      country: capitalSpec.country,
      lat: capitalSpec.lat,
      lon: capitalSpec.lon,
      year: 1522,
      population: capitalSpec.population,
      coastalIntent: true,
      lakeIntent: false
    };
    bestByCity.set(cityId, {
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec.factionId
    });
  }
  return bestByCity;
}

function ensureFactionCapitals(cities, cityRecords) {
  const included = new Set(cities.map((city) => city.cityId));
  const out = [...cities];
  for (const capitalSpec of FACTION_CAPITALS_1522) {
    const cityId = cityKey(capitalSpec.city, capitalSpec.country);
    if (included.has(cityId)) continue;
    const city = cityRecords.get(cityId);
    assert.ok(city, `missing capital record: ${capitalSpec.city}, ${capitalSpec.country}`);
    out.push(city);
    included.add(cityId);
  }
  return out;
}

function placeCityRecords(graph, directionIndex, earthRows, reachable, riverMasks, cities) {
  const placed = [];
  const byTile = new Map();
  for (const city of cities) {
    const startId = findNearestTileId(graph, directionIndex, latLonToDirection(city.lat, city.lon));
    const predicate = city.declaredCapitalFactionId
      ? (tileId) => isCityDrawableTile(earthRows, tileId) &&
        cityHasPortAccess(graph, earthRows, reachable, riverMasks, tileId)
      : (tileId) => isCityDrawableTile(earthRows, tileId);
    let tileId = predicate(startId) ? startId : nearestTileMatching(graph, startId, predicate);
    if (tileId === undefined) continue;
    if (byTile.has(tileId)) {
      if (!city.declaredCapitalFactionId) continue;
      const alternateTileId = nearestTileMatching(graph, tileId, (id) => predicate(id) && !byTile.has(id));
      assert.notEqual(alternateTileId, undefined, `capital cannot be placed: ${cityLabel(city)}`);
      tileId = alternateTileId;
    }
    const placedCity = {
      ...city,
      tileId,
      dockable: cityHasPortAccess(graph, earthRows, reachable, riverMasks, tileId)
    };
    byTile.set(tileId, placedCity);
    placed.push(placedCity);
  }
  return placed;
}

function buildRiverMasks(graph, earth) {
  const masks = new Uint8Array(graph.tileCount);
  const toWaterMasks = new Uint8Array(graph.tileCount);
  for (const [rawId, edges] of Object.entries(earth.riverEdges)) {
    for (const edge of edges) addRiverEdgeMask(graph, masks, Number(rawId), edge);
  }
  for (const [rawId, edges] of Object.entries(earth.riverEdgeToWater || {})) {
    for (const edge of edges) addRiverEdgeMask(graph, toWaterMasks, Number(rawId), edge);
  }
  for (const chain of MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS] || []) {
    for (let i = 0; i < chain.length - 1; i++) addRiverEdgeBetween(graph, masks, chain[i], chain[i + 1]);
  }
  for (const { tile, edge } of MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || []) {
    addRiverEdgeMask(graph, masks, tile, edge);
    addRiverEdgeMask(graph, toWaterMasks, tile, edge);
  }
  markRiverEdgesOpeningToWater(graph, earth.tiles, masks, toWaterMasks);
  return { masks, toWaterMasks };
}

function buildOceanReachableNavigationMask(graph, earthRows, riverMasks, riverToWaterMasks) {
  const reachable = new Uint8Array(graph.tileCount);
  const queue = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (!isOceanNavigationSeedTile(earthRows[tileId])) continue;
    reachable[tileId] = 1;
    queue.push(tileId);
  }

  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (reachable[neighborId]) continue;
      if (!canTraverseOceanReachability(graph, earthRows, riverMasks, riverToWaterMasks, tileId, neighborId)) continue;
      reachable[neighborId] = 1;
      queue.push(neighborId);
    }
  }
  return reachable;
}

function cityHasPortAccess(graph, earthRows, reachable, riverMasks, tileId) {
  const visited = new Set([tileId]);
  const queue = [{ tileId, distance: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (isCityPortAccessTile(earthRows, reachable, riverMasks, current.tileId)) return true;
    if (current.distance >= CITY_PORT_ACCESS_RING_DISTANCE) continue;

    for (const neighborId of graph.neighbors[current.tileId] || []) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ tileId: neighborId, distance: current.distance + 1 });
    }
  }
  return false;
}

function canTraverseOceanReachability(graph, earthRows, riverMasks, riverToWaterMasks, fromTileId, toTileId) {
  const fromWater = isWaterSurfaceRow(earthRows[fromTileId]);
  const toWater = isWaterSurfaceRow(earthRows[toTileId]);
  if (fromWater && toWater) return true;

  const edgeA = edgeIndexTowardNeighbor(graph, fromTileId, toTileId);
  const edgeB = edgeIndexTowardNeighbor(graph, toTileId, fromTileId);
  if (edgeA === undefined || edgeB === undefined) return false;

  const fromRiver = (riverMasks[fromTileId] || 0) !== 0;
  const toRiver = (riverMasks[toTileId] || 0) !== 0;
  if (fromWater && toRiver) return riverEdgeSet(riverMasks, toTileId, edgeB) ||
    riverEdgeSet(riverToWaterMasks, toTileId, edgeB);
  if (fromRiver && toWater) return riverEdgeSet(riverMasks, fromTileId, edgeA) ||
    riverEdgeSet(riverToWaterMasks, fromTileId, edgeA);
  if (fromRiver && toRiver) return riverEdgeSet(riverMasks, fromTileId, edgeA) &&
    riverEdgeSet(riverMasks, toTileId, edgeB);
  return false;
}

function markRiverEdgesOpeningToWater(graph, earthRows, masks, toWaterMasks) {
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const mask = masks[tileId];
    if (mask === 0 || isWaterSurfaceRow(earthRows[tileId])) continue;
    for (let edge = 0; edge < graph.edgeCount[tileId]; edge++) {
      if ((mask & (1 << edge)) === 0) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (isWaterSurfaceRow(earthRows[neighborId])) addRiverEdgeMask(graph, toWaterMasks, tileId, edge);
    }
  }
}

function addRiverEdgeBetween(graph, masks, a, b) {
  const edgeA = edgeIndexTowardNeighbor(graph, a, b);
  const edgeB = edgeIndexTowardNeighbor(graph, b, a);
  assert.notEqual(edgeA, undefined, `manual river tiles ${a} and ${b} are not adjacent`);
  assert.notEqual(edgeB, undefined, `manual river tiles ${b} and ${a} are not adjacent`);
  addRiverEdgeMask(graph, masks, a, edgeA);
  addRiverEdgeMask(graph, masks, b, edgeB);
}

function addRiverEdgeMask(graph, masks, tileId, edge) {
  assert.ok(Number.isInteger(edge) && edge >= 0 && edge < graph.edgeCount[tileId]);
  masks[tileId] |= 1 << edge;
}

function nearestTileMatching(graph, startId, predicate) {
  const seen = new Set([startId]);
  const queue = [startId];
  for (let head = 0; head < queue.length; head++) {
    for (const neighborId of graph.neighbors[queue[head]]) {
      if (seen.has(neighborId)) continue;
      if (predicate(neighborId)) return neighborId;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  return undefined;
}

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === "\"" && csv[i + 1] === "\"") {
        cell += "\"";
        i++;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === "\"") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon)];
}

function edgeIndexTowardNeighbor(graph, tileId, neighborId) {
  const edge = graph.edgeNeighbors[tileId]?.indexOf(neighborId);
  return edge >= 0 ? edge : undefined;
}

function riverEdgeSet(masks, tileId, edge) {
  return ((masks?.[tileId] || 0) & (1 << edge)) !== 0;
}

function isCityPortAccessTile(earthRows, reachable, riverMasks, tileId) {
  if (!reachable[tileId]) return false;
  return isWaterSurfaceRow(earthRows[tileId]) || (riverMasks[tileId] || 0) !== 0;
}

function isCityDrawableTile(earthRows, tileId) {
  return !isWaterSurfaceRow(earthRows[tileId]);
}

function isOceanNavigationSeedTile(row) {
  const t = row?.t || "";
  return t === "water" || t === "beach";
}

function isWaterSurfaceRow(row) {
  const t = row?.t || "";
  return t === "water" || t === "lake" || t === "beach";
}

function cityKey(city, country) {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

function cityLabel(city) {
  return `${city.displayCity || city.city}, ${city.country}`;
}

function displayName(city, country) {
  if (city === "Mexico City" && country === "Mexico") return "Tenochtitlan";
  if (city === "Texcoco" && country === "Mexico") return "Tezcoco";
  if (city === "Zempoala" && country === "Mexico") return "Cempoala";
  return city;
}

function truthyCsv(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}
