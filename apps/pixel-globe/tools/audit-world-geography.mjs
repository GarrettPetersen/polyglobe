import { readFile } from "node:fs/promises";
import { CITY_DATA_YEAR, loadCityCatalogFromCsv } from "../src/cityCatalogData.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";
import { createDirectionIndex } from "../src/geodesic.js";
import { decodeGeodesicGraphBake } from "../src/geodesicBake.js";
import { applyManualTerrainOverrides } from "../src/manualTerrainOverrides.js";
import { WORLD_WATERWAY_INVARIANTS, boundedNavigablePathExists } from "../src/worldMapInvariants.js";
import { isolatedCoastalWaterRegions, riverOpeningAudit, settlementPlacementDisplacements } from "../src/worldGeographyAudit.js";
import { buildWorldNavigationTopology } from "../src/worldNavigationTopology.js";
import { placeCityCatalogOnWorld, placeColonizationTargetsOnWorld } from "../src/worldPortPlacement.js";
import { WORLD_GLOBE_SUBDIVISIONS } from "../src/worldScale.js";

const sharedRoot = new URL("../../../examples/globe-demo/public/", import.meta.url);
const subdivisions = WORLD_GLOBE_SUBDIVISIONS;
const [earthSource, graphBytes, cityCsv] = await Promise.all([
  readFile(new URL(`earth-globe-cache-${subdivisions}.json`, sharedRoot), "utf8"),
  readFile(new URL(`geodesic-graph-${subdivisions}.bin`, sharedRoot)),
  readFile(new URL("datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", sharedRoot), "utf8")
]);
const earthCache = JSON.parse(earthSource);
const graph = decodeGeodesicGraphBake(
  graphBytes.buffer.slice(graphBytes.byteOffset, graphBytes.byteOffset + graphBytes.byteLength), subdivisions
);
const earthRows = applyManualTerrainOverrides(earthCache.tiles, subdivisions);
const directionIndex = createDirectionIndex(graph);
const navigation = buildWorldNavigationTopology({ graph, earthRows, earthCache, subdivisions });
const failures = [];
for (const invariant of WORLD_WATERWAY_INVARIANTS) {
  try {
    const connected = boundedNavigablePathExists({ graph, earthRows, directionIndex, navigation, ...invariant });
    if (connected !== invariant.connected) failures.push(`${invariant.name}: expected ${invariant.connected ? "open waterway" : "closed barrier"}`);
  } catch (error) {
    // Collect every failed geography contract in this offline report; exit
    // unsuccessfully after reporting them all, rather than hiding any failure.
    failures.push(`${invariant.name}: ${error.message}`);
  }
}
const placementOptions = { graph, earthRows, directionIndex, ...navigation };
const cities = placeCityCatalogOnWorld({ ...placementOptions, cities: loadCityCatalogFromCsv(cityCsv, CITY_DATA_YEAR) });
const colonies = placeColonizationTargetsOnWorld({ ...placementOptions, targets: COLONIZATION_TARGETS, occupiedCities: [...cities.values()] });
const report = {
  verifiedWaterwaysAndBarriers: WORLD_WATERWAY_INVARIANTS.length - failures.length,
  failures,
  riverOpenings: riverOpeningAudit({ graph, earthRows, navigation }),
  // Candidate lists require map review: lagoons and explicit harbor choices
  // must not become automatic terrain edits or silently relocated settlements.
  isolatedCoastalWaterCandidates: isolatedCoastalWaterRegions({ graph, earthRows }),
  displacedSettlementCandidates: settlementPlacementDisplacements({ graph, settlements: [...cities.values(), ...colonies] })
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
