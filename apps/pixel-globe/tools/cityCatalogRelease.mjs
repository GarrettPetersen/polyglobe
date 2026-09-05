import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { CITY_DATA_YEAR, cityLabelText, loadCityCatalogFromCsv } from "../src/cityCatalogData.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";
import { sailingGatewayCityIdForInlandCity } from "../src/cityPortAccessPolicy.js";
import { createDirectionIndex } from "../src/geodesic.js";
import { decodeGeodesicGraphBake } from "../src/geodesicBake.js";
import { applyManualTerrainOverrides } from "../src/manualTerrainOverrides.js";
import { PORT_CATALOG_VERSION, portReferenceMigrationForSavedVoyage } from "../src/portCatalogMigration.js";
import { buildWorldNavigationTopology } from "../src/worldNavigationTopology.js";
import { placeCityCatalogOnWorld, placeColonizationTargetsOnWorld, portCitiesOnWorld, validateCityPortAccessCatalog } from "../src/worldPortPlacement.js";
import { WORLD_GLOBE_SUBDIVISIONS } from "../src/worldScale.js";

export const APP_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const CATALOG_MANIFEST_PATH = "public/assets/data/city-catalog-release.json";
export const CATALOG_HISTORY_PATH = "src/test-fixtures/city-catalog-releases";
export const CATALOG_BUILD_TOOLS = Object.freeze([
  "tools/build-port-sailing-distances.mjs",
  "tools/build-land-roads.mjs",
  "tools/build-city-visualizer-catalog.mjs"
]);
export const CATALOG_ARTIFACT_PATHS = Object.freeze([
  "public/assets/data/port-sailing-distances.json",
  "public/assets/data/land-roads.json",
  "city-visualizer/data/cities.json"
]);
const SHARED_ROOT = "../../examples/globe-demo/public";
const CATALOG_DATA_INPUTS = Object.freeze([
  "earth-globe-cache-7.json", "earth-globe-cache-8.json", "geodesic-graph-8.bin",
  "globe-runtime-bake-7.bin", "mountains.json",
  "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"
]);

export async function catalogReleaseHashes(appRoot = APP_ROOT) {
  // Follow actual producer imports: adding a new geography policy automatically
  // makes it part of the gate instead of relying on a handwritten source list.
  const result = await build({
    absWorkingDir: appRoot, entryPoints: CATALOG_BUILD_TOOLS,
    outdir: "catalog-dependency-scan", bundle: true, platform: "node", format: "esm",
    packages: "external", write: false, metafile: true, logLevel: "silent"
  });
  const history = await readdir(resolve(appRoot, CATALOG_HISTORY_PATH));
  const inputPaths = [...new Set([
    ...Object.keys(result.metafile.inputs),
    ...CATALOG_DATA_INPUTS.map((path) => `${SHARED_ROOT}/${path}`),
    "src/portCatalogMigration.js", "src/subdivisionSevenPortMigration.js",
    ...history.filter((name) => name.endsWith(".json")).map((name) => `${CATALOG_HISTORY_PATH}/${name}`)
  ])].sort();
  const hashes = async (paths) => Object.fromEntries(await Promise.all(paths.map(async (path) => [
    path, createHash("sha256").update(await readFile(resolve(appRoot, path))).digest("hex")
  ])));
  return { inputs: await hashes(inputPaths), artifacts: await hashes(CATALOG_ARTIFACT_PATHS) };
}

export function validateCatalogReleaseHashes(manifest, actual) {
  if (manifest?.format !== "pixel-globe-city-catalog-release" || manifest.version !== 1) {
    throw new Error("Missing city catalog release manifest. Run npm run catalog:update.");
  }
  for (const kind of ["inputs", "artifacts"]) {
    const expected = manifest[kind];
    if (!expected || typeof expected !== "object") throw new Error(`Catalog manifest has no ${kind}`);
    const changed = [...new Set([...Object.keys(expected), ...Object.keys(actual[kind])])]
      .filter((path) => expected[path] !== actual[kind][path]);
    if (changed.length) {
      throw new Error(`City catalog ${kind} changed: ${changed.slice(0, 8).join(", ")}. ` +
        "Run npm run catalog:update to regenerate and validate the complete release.");
    }
  }
}

export async function currentCatalogSnapshot(appRoot = APP_ROOT) {
  const sharedRoot = resolve(appRoot, SHARED_ROOT);
  const [earthText, bytes, csv, ...artifacts] = await Promise.all([
    readFile(resolve(sharedRoot, `earth-globe-cache-${WORLD_GLOBE_SUBDIVISIONS}.json`), "utf8"),
    readFile(resolve(sharedRoot, `geodesic-graph-${WORLD_GLOBE_SUBDIVISIONS}.bin`)),
    readFile(resolve(sharedRoot, "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"), "utf8"),
    ...CATALOG_ARTIFACT_PATHS.map((path) => readFile(resolve(appRoot, path), "utf8"))
  ]);
  const [sailing, roads, scenes] = artifacts.map((text) => JSON.parse(text));
  const earth = JSON.parse(earthText);
  const graph = decodeGeodesicGraphBake(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), WORLD_GLOBE_SUBDIVISIONS);
  const earthRows = applyManualTerrainOverrides(earth.tiles, WORLD_GLOBE_SUBDIVISIONS);
  const navigation = buildWorldNavigationTopology({ graph, earthRows, earthCache: earth, subdivisions: WORLD_GLOBE_SUBDIVISIONS });
  const options = { graph, directionIndex: createDirectionIndex(graph), earthRows,
    reachableNavigationMask: navigation.reachableNavigationMask, riverMasks: navigation.riverMasks };
  const placed = placeCityCatalogOnWorld({ ...options, cities: loadCityCatalogFromCsv(csv, CITY_DATA_YEAR) });
  const ports = portCitiesOnWorld(placed, options);
  validateCityPortAccessCatalog(placed, ports, options);
  const colonies = placeColonizationTargetsOnWorld({ ...options, targets: COLONIZATION_TARGETS, occupiedCities: placed.values() });
  const portTiles = new Set(ports.map(({ tileId }) => tileId));
  const endpoints = [...ports, ...colonies.filter(({ tileId }) => !portTiles.has(tileId))];
  const roadRecord = (city) => ({ tileId: city.tileId, name: cityLabelText(city), country: city.country });
  const byTile = (a, b) => a.tileId - b.tileId;
  assert.deepEqual(roads.cities, [...placed.values()].map(roadRecord).sort(byTile), "Regenerate land roads for the current city catalog");
  assert.deepEqual(sailing.endpoints, [
    ...ports.map((city) => ({ ...roadRecord(city), kind: "port" })),
    ...colonies.filter(({ tileId }) => !portTiles.has(tileId)).map((city) => ({ ...roadRecord(city), kind: "colony" }))
  ].sort(byTile), "Regenerate sailing distances for the current city catalog");
  assert.deepEqual(scenes.cities.map(({ id, tileId }) => ({ cityId: id, tileId })).sort(byTile),
    endpoints.map(({ cityId, tileId }) => ({ cityId, tileId })).sort(byTile), "Regenerate city scenes for the current city catalog");
  const byId = new Map();
  for (const { cityId, tileId } of [...ports, ...colonies]) {
    if (byId.has(cityId) && byId.get(cityId) !== tileId) throw new Error(`Conflicting catalog placement for ${cityId}`);
    byId.set(cityId, tileId);
  }
  return { version: PORT_CATALOG_VERSION, subdivisions: WORLD_GLOBE_SUBDIVISIONS,
    ports: [...byId].sort(([a], [b]) => a.localeCompare(b)).map(([cityId, tileId]) => ({ cityId, tileId })) };
}

export function validateReleasedCatalogMigration(released, current, migration, gatewayForCity = sailingGatewayCityIdForInlandCity) {
  const byId = new Map(current.ports.map((port) => [port.cityId, port]));
  if (byId.size !== current.ports.length) throw new Error("Current catalog contains duplicate canonical IDs");
  if (released.version === current.version) {
    assert.deepEqual(current, released, "City endpoints changed without a PORT_CATALOG_VERSION bump; preserve the frozen release and author migrations");
  }
  for (const oldPort of released.ports) {
    const targetId = gatewayForCity(oldPort.cityId) || oldPort.cityId;
    const target = byId.get(targetId);
    if (!target) throw new Error(`Released city ${oldPort.cityId} has no canonical successor`);
    const tileId = migration?.get(oldPort.tileId) ?? oldPort.tileId;
    if (tileId !== target.tileId) {
      throw new Error(`Missing catalog migration v${released.version} for ${oldPort.cityId}: ${oldPort.tileId} -> ${target.tileId}`);
    }
  }
}

export async function validateCatalogHistory(current, appRoot = APP_ROOT) {
  const directory = resolve(appRoot, CATALOG_HISTORY_PATH);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  if (!files.length) throw new Error("City catalog release history is missing; restore its frozen fixtures");
  const versions = new Set();
  for (const file of files) {
    const released = JSON.parse(await readFile(resolve(directory, file), "utf8"));
    if (!Number.isInteger(released.version) || versions.has(released.version) || released.version > current.version) {
      throw new Error(`Invalid frozen city catalog release: ${file}`);
    }
    versions.add(released.version);
    const migration = portReferenceMigrationForSavedVoyage({ portCatalogVersion: released.version }, {
      savedSubdivisions: released.subdivisions, currentSubdivisions: current.subdivisions
    }, current.ports);
    validateReleasedCatalogMigration(released, current, migration);
  }
  const latest = Math.max(...versions);
  if (current.version > latest + 1) throw new Error(`Catalog version jumped from ${latest} to ${current.version}`);
  return versions.has(current.version);
}

export async function verifyCityCatalogRelease(appRoot = APP_ROOT) {
  const manifest = JSON.parse(await readFile(resolve(appRoot, CATALOG_MANIFEST_PATH), "utf8"));
  validateCatalogReleaseHashes(manifest, await catalogReleaseHashes(appRoot));
  const snapshot = await currentCatalogSnapshot(appRoot);
  if (!await validateCatalogHistory(snapshot, appRoot)) throw new Error("Current catalog release has no frozen fixture; run npm run catalog:update");
  return snapshot;
}
