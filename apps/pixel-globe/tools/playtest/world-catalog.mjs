import { readFileSync } from "node:fs";
import { decodeGeodesicGraphBake } from "../../src/geodesicBake.js";
import { createDirectionIndex } from "../../src/geodesic.js";
import { applyManualTerrainOverrides } from "../../src/manualTerrainOverrides.js";
import { buildWorldNavigationTopology } from "../../src/worldNavigationTopology.js";
import { loadCityCatalogFromCsv, CITY_DATA_YEAR } from "../../src/cityCatalogData.js";
import { placeCityCatalogOnWorld, portCitiesOnWorld } from "../../src/worldPortPlacement.js";

// Scene assets also contain future colonies and projects. They are not active
// ports: build the same initial placements and navigation gates as a voyage.
export function initialCampaignCities() {
  const bytes = readFileSync(new URL("../../../../examples/globe-demo/public/geodesic-graph-8.bin", import.meta.url));
  const graph = decodeGeodesicGraphBake(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 8);
  const earthCache = JSON.parse(readFileSync(new URL("../../../../examples/globe-demo/public/earth-globe-cache-8.json", import.meta.url)));
  const earthRows = applyManualTerrainOverrides(earthCache.tiles, 8);
  const navigation = buildWorldNavigationTopology({ graph, earthRows, earthCache, subdivisions: 8 });
  const options = { graph, earthRows, ...navigation, directionIndex: createDirectionIndex(graph) };
  const csv = readFileSync(new URL("../../../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", import.meta.url), "utf8");
  const placed = placeCityCatalogOnWorld({ ...options, cities: loadCityCatalogFromCsv(csv, CITY_DATA_YEAR) });
  return { cities: [...placed.values()], ports: portCitiesOnWorld(placed, options) };
}
