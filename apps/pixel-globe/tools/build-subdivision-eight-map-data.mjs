import { minorCoastalIslandCandidates } from "../src/worldGeographyAudit.js";
import { REVIEWED_COASTAL_WATER_CORRIDORS } from "../src/reviewedCoastalWaterCorridors.js";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { decodeGeodesicGraphBake } from "../src/geodesicBake.js";
import {
  buildGeodesicGraph,
  createDirectionIndex,
  findNearestTileId,
  graphCenter
} from "../src/geodesic.js";
import { loadCityCatalogFromCsv, CITY_DATA_YEAR } from "../src/cityCatalogData.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";
import { reviewedSettlementLandmassId } from "../src/settlementGeography.js";
import { MANUAL_CITY_RECORDS_1522 } from "../src/cityCatalogSelection.js";
import {
  applyTerrainCorrections,
  MANUAL_LAKE_TILE_OVERRIDES_BY_SUBDIVISIONS,
  MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS
} from "../src/manualTerrainOverrides.js";
import {
  MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS,
  MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS
} from "../src/manualRiverHexChains.js";

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const sharedRoot = resolve(appRoot, "../../examples/globe-demo/public");
const outputPath = resolve(appRoot, "src/subdivisionEightMapData.js");
const coarseGraph = buildGeodesicGraph(7);
const fineGraphBytes = await readFile(resolve(sharedRoot, "geodesic-graph-8.bin"));
const fineGraph = decodeGeodesicGraphBake(
  fineGraphBytes.buffer.slice(
    fineGraphBytes.byteOffset,
    fineGraphBytes.byteOffset + fineGraphBytes.byteLength
  ),
  8
);
const fineDirectionIndex = createDirectionIndex(fineGraph);
const earth = JSON.parse(await readFile(resolve(sharedRoot, "earth-globe-cache-8.json"), "utf8"));

// These tidal rivers need their actual bends at this resolution. Refining the
// old straight corridors sends the James through the York peninsula and the
// Potomac east across Maryland instead of downstream around its southern bend.
// Reference: https://www.nps.gov/cajo/planyourvisit/maps.htm
const jamesRiverRoute = routeThroughCoordinates([
  { lat: 37.53, lon: -77.43 },
  { lat: 37.30, lon: -77.25 },
  { lat: 37.20, lon: -77.02 },
  { lat: 37.15, lon: -76.72 },
  { lat: 36.98, lon: -76.40 },
  { lat: 37.10, lon: -76.15 }
]);
const potomacRiverRoute = routeThroughCoordinates([
  { lat: 38.90, lon: -77.05 },
  { lat: 38.67, lon: -77.14 },
  { lat: 38.42, lon: -77.02 },
  { lat: 38.28, lon: -76.85 },
  { lat: 38.25, lon: -76.55 },
  { lat: 38.10, lon: -76.25 }
]);
// Reviewed against the checked-in Natural Earth 1:10m river centerlines and
// coast mask. The bake drops these mouths where its river trace meets coastal
// "beach" water; several entire drainage networks consequently lose sea access.
// Keep individual delta outlets: another working branch does not repair them.
const riverOutlets = [
  { name: "Niger central outlet", tileIds: [641566, 641561] },
  { name: "Niger western outlet", tileIds: [640433, 640436] },
  { name: "Niger eastern outlet", tileIds: [641563, 160439] },
  { name: "Ob outlet", tileIds: [234409, 58711] },
  { name: "Amur outlet", tileIds: [240757, 240763, 240760] },
  { name: "Zambezi delta outlet", tileIds: [502564, 502566] },
  { name: "Orinoco western outlet", tileIds: [554732, 138895] },
  { name: "Mackenzie delta outlet", tileIds: [193912, 12171] },
  { name: "Irrawaddy western outlet", tileIds: [372134, 372135] },
  { name: "Irrawaddy central outlet", tileIds: [23377, 372125] },
  { name: "Irrawaddy eastern outlet", tileIds: [372156, 93196] },
  { name: "Parana delta outlet", tileIds: [426715, 426716, 106926] }
];
for (const { name, tileIds } of riverOutlets) {
  if (!earth.riverEdges[tileIds[0]]?.length || !isWaterSurface(earth.tiles[tileIds.at(-1)])) {
    throw new Error(`${name} must connect a baked river to surface water`);
  }
  for (const [a, b] of adjacentPairs(tileIds)) {
    if (!fineGraph.neighbors[a].includes(b)) throw new Error(`${name} contains a nonadjacent edge ${a}/${b}`);
  }
}

const shallowWaterGroups = [
  [38891],
  [38903],
  [98867, 24803, 98890],
  [88775],
  [31618, 125890, 125896]
];
const manualMouthChains = MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[7]
  .filter(({ tile }) => tile !== 73670 && tile !== 73669)
  .map(({ tile, edge }) => (
  refineChain([tile, requiredCoarseEdgeNeighbor(tile, edge)])
));
const saveRiverApproach = routeThroughCoordinates([
  { lat: -20.95, lon: 35.55 },
  { lat: -20.75, lon: 34.6 },
  { lat: -20.45, lon: 33.6 },
  { lat: -20.2, lon: 32.35 }
]);
const delhiYamunaApproach = routeThroughCoordinates([
  { lat: 28.65381, lon: 77.22897 },
  { lat: 27.85, lon: 77.55 },
  { lat: 27.18, lon: 78.02 }
]);
const nigerRiverRoute = routeThroughCoordinates([
  { lat: 3.8, lon: 6.2 },
  { lat: 5.25, lon: 6.45 },
  { lat: 8.1, lon: 6.65 },
  { lat: 13.5, lon: 2.15 },
  { lat: 16.25, lon: -0.05 },
  { lat: 16.45, lon: -1.65 },
  { lat: 14.55, lon: -3.8 },
  { lat: 16.77, lon: -3.0 }
]);
const rhoneRiverRoute = routeThroughCoordinates([
  { lat: 45.764, lon: 4.8357 },
  { lat: 44.9, lon: 4.82 },
  { lat: 43.8, lon: 4.72 },
  { lat: 42.75, lon: 4.65 }
]);
const panganiRiverApproach = routeThroughCoordinates([
  { lat: -5.5, lon: 39.3 },
  { lat: -5.35, lon: 38.95 },
  { lat: -4.6, lon: 38.4 },
  { lat: -3.6, lon: 37.5 }
]);
const sanJoaquinRiverApproach = routeThroughCoordinates([
  { lat: 37.7, lon: -123.0 },
  { lat: 37.75, lon: -122.5 },
  { lat: 38.0, lon: -121.5 },
  { lat: 37.3, lon: -121.0 },
  { lat: 36.7, lon: -120.4 },
  { lat: 36.5, lon: -119.8 }
]);
const chorokhiRiverApproach = routeThroughCoordinates([
  { lat: 41.8, lon: 41.2 },
  { lat: 41.65, lon: 41.55 },
  { lat: 41.5, lon: 41.72 },
  { lat: 41.18, lon: 41.82 },
  { lat: 40.82, lon: 41.55 },
  { lat: 40.8, lon: 41.38 },
  { lat: 40.4, lon: 40.8 }
]);
// At subdivision seven, one graph ring covered enough ground for these cities
// to touch their authored or baked river. Subdivision eight halves that physical
// tolerance, so give each historic river port an explicit route instead of
// globally widening port access and accidentally making nearby inland cities
// into seaports.
const cuttackMahanadiRoute = routeThroughCoordinates([
  { lat: 20.46497, lon: 85.87927 },
  { lat: 20.35, lon: 86.35 },
  { lat: 20.15, lon: 87.0 }
]);
const nanchangGanRoute = routeThroughCoordinates([
  { lat: 28.68333, lon: 115.88333 },
  { lat: 29.2, lon: 116.2 },
  { lat: 29.75, lon: 116.25 },
  { lat: 30.5, lon: 117.2 },
  { lat: 31.0, lon: 119.0 },
  { lat: 31.3, lon: 121.8 }
]);
const chengduMinYangtzeRoute = routeThroughCoordinates([
  { lat: 30.66667, lon: 104.06667 },
  { lat: 29.4, lon: 104.2 },
  { lat: 29.55, lon: 106.55 },
  { lat: 30.5, lon: 111.3 },
  { lat: 30.6, lon: 114.3 },
  { lat: 31.0, lon: 119.0 },
  { lat: 31.3, lon: 121.8 }
]);
const xianWeiYellowRoute = routeThroughCoordinates([
  { lat: 34.341485, lon: 108.940404 },
  { lat: 34.6, lon: 110.0 },
  { lat: 35.5, lon: 110.7 },
  { lat: 34.8, lon: 112.6 },
  { lat: 34.9, lon: 114.5 },
  { lat: 36.0, lon: 117.0 },
  { lat: 37.0, lon: 118.5 },
  { lat: 37.5, lon: 119.5 }
]);
const peguBagoRoute = routeThroughCoordinates([
  { lat: 17.333333, lon: 96.483333 },
  { lat: 16.8, lon: 96.4 },
  { lat: 16.0, lon: 96.3 },
  { lat: 15.7, lon: 96.2 }
]);
const jaunpurGomtiGangesRoute = routeThroughCoordinates([
  { lat: 25.75506, lon: 82.68361 },
  { lat: 25.3, lon: 83.0 },
  { lat: 25.3, lon: 85.0 },
  { lat: 25.4, lon: 87.0 },
  { lat: 24.5, lon: 89.0 },
  { lat: 22.3, lon: 90.0 },
  { lat: 21.3, lon: 90.5 }
]);
const cremonaPoRoute = routeThroughCoordinates([
  { lat: 45.13617, lon: 10.02797 },
  { lat: 45.0, lon: 11.5 },
  { lat: 44.9, lon: 12.3 },
  { lat: 44.75, lon: 12.9 }
]);
const toursLoireRoute = routeThroughCoordinates([
  { lat: 47.38333, lon: 0.68333 },
  { lat: 47.46667, lon: -0.55 },
  { lat: 47.22, lon: -1.55 },
  { lat: 47.27, lon: -2.25 },
  { lat: 47.2, lon: -2.7 }
]);
const angersLoireRoute = routeThroughCoordinates([
  { lat: 47.46667, lon: -0.55 },
  { lat: 47.22, lon: -1.55 },
  { lat: 47.27, lon: -2.25 },
  { lat: 47.2, lon: -2.7 }
]);
const coimbraMondegoRoute = routeThroughCoordinates([
  { lat: 40.20564, lon: -8.41955 },
  { lat: 40.18, lon: -8.8 },
  { lat: 40.1, lon: -9.05 }
]);
// Resolve stable Natural Earth source feature IDs, then follow their actual
// centerlines. These replace straight legacy spurs that crossed watersheds.
const sourceRivers = JSON.parse(await readFile(resolve(sharedRoot,
  "ne_10m_rivers_lake_centerlines.json"), "utf8")).features;
const sourceRiverRepairs = [
  // The checked-in river source omits this short inter-lake channel. A
  // drainage's ocean outlet does not prove that its upstream lakes connect.
  // St Marys connects Superior to Huron (NOAA Coast Pilot 6, chapter 12).
  // This is the natural river route; no modern lock/canal shortcut is added.
  routeThroughCoordinates([
    {lat:46.6,lon:-84.8},{lat:46.47,lon:-84.6},{lat:46.51,lon:-84.36},
    {lat:46.49,lon:-84.2},{lat:46.35,lon:-84.13},{lat:46.2,lon:-84.1},
    {lat:46.08,lon:-83.9},{lat:45.98,lon:-83.9},{lat:45.9,lon:-83.8}
  ]),
  // Replace the coarse St Lawrence chain instead of subdividing its bank
  // detour; refining old tile IDs preserves cartographic errors at finer scales.
  routeThroughCoordinates([
    {lat:44.1,lon:-76.5},{lat:44.3,lon:-76.2},{lat:44.5,lon:-75.79}
  ]),
  ...sourceRiverRoutes("23River"),
  // Natural Earth ends its named river at Lake Saint Francis; retain the
  // continuation through the lake and Montreal channels as one drainage.
  routeThroughCoordinates([
    {lat:45.0,lon:-74.73},{lat:45.08,lon:-74.55},{lat:45.15,lon:-74.4},
    {lat:45.25,lon:-74.15},{lat:45.32,lon:-73.98},{lat:45.43,lon:-73.72},
    {lat:45.5,lon:-73.5},{lat:45.65,lon:-73.45},{lat:45.85,lon:-73.25},
    {lat:46.05,lon:-73.08},{lat:46.2,lon:-72.9},{lat:46.35,lon:-72.55},
    {lat:46.5,lon:-72.24},{lat:46.6,lon:-71.9},{lat:46.67,lon:-71.65},
    {lat:46.74,lon:-71.45},{lat:46.81,lon:-71.21},{lat:46.92,lon:-70.96},
    {lat:47.05,lon:-70.8}
  ]),

  // Ninglick tidal channel connects Baird Inlet to the Bering Sea. The
  // coastline raster cannot resolve its narrow outlet (USACE Newtok EA, 2008).
  routeThroughCoordinates([
    {lat: 60.84, lon: -164.35}, {lat: 60.84, lon: -164.72},
    {lat: 60.90, lon: -164.94}, {lat: 60.88, lon: -165.30},
    {lat: 60.85, lon: -165.85}
  ]),
  // Actual city river approaches. Their coordinates locate rivers and mouths;
  // they never serve as alternative coordinates for the capital itself.
  ...[
    [[35.02,135.77],[34.97,135.77],[34.91,135.75],[34.886,135.683],[34.8,135.63],[34.73,135.54],[34.68,135.41],[34.63,135.32],[34.57,135.23],[34.45,135.05]],
    [[37.57,126.98],[37.53,126.85],[37.64,126.77],[37.79,126.65],[37.85,126.5],[37.79,126.3]],
    [[51.05,3.73],[51.00,3.84],[51.015,4.1],[51.12,4.18],[51.24,4.35],[51.40,4.16],[51.42,3.65],[51.48,3.36],[51.5,3.15]],
    [[49.45,11.08],[49.476,10.994],[49.60,10.97],[49.75,11.04],[49.9,10.89],[49.95,10.88]],
    // The Vaartse Rijn joined Utrecht to the Lek by the Middle Ages.
    // Keep that junction explicit: it previously depended on a bucket-edge
    // error pulling a point of the Lek north to the Utrecht tile.
    // https://www.hdsr.nl/werk/watererfgoed/digitale/watererfgoedverhalen/lurken-lek-kranen-hollandse-waterlinies/
    [[51.96,5.10],[52.03,5.10],[52.09,5.12]],
    [[52.09,5.12],[52.15,5.02],[52.21,5.02],[52.32,5.08],[52.43,5.12]],
    [[52.52,13.40],[52.53,13.21],[52.45,13.16],[52.40,13.07],[52.38,12.91],[52.42,12.57],[52.62,12.39],[52.91,11.90],[53.02,11.71]],
    [[53.96,-1.08],[53.85,-1.11],[53.78,-1.07],[53.74,-0.98],[53.69,-0.97],[53.70,-0.83],[53.72,-0.70],[53.66,-0.43],[53.58,-0.13],[53.53,0.05],[53.56,0.25]],
    [[53.87,10.69],[53.91,10.79],[53.96,10.87],[53.98,11.03],[54.1,11.0],[54.20,11.2],[54.30,11.3]],
    [[58.48,16.32],[58.48,16.48],[58.46,16.65],[58.42,16.79],[58.42,17.07]],
    [[60.675,17.14],[60.68,17.24],[60.68,17.42],[60.68,17.60],[60.70,17.80]],
    [[35.69,139.75],[35.66,139.79],[35.60,139.80],[35.50,139.86],[35.33,139.77],[35.2,139.78],[35.0,139.75]],
    [[17.01,81.78],[16.83,81.76],[16.73,81.72],[16.45,81.69],[16.25,81.77],[16.15,81.87]]
  ].map((points) => routeThroughCoordinates(points.map(([lat, lon]) => ({lat, lon})))),
  ...sourceRiverRoutes("103River", [46, 46.4, -119.3, -118.8]),
  ...sourceRiverRoutes("28Lake Centerline"), ...sourceRiverRoutes("28River"),
  ...sourceRiverRoutes("32Lake Centerline"), ...sourceRiverRoutes("32River"),
  ...sourceRiverRoutes("113River"),
  ...sourceRiverRoutes("15River", [26.5, 28.2, 99.3, 101.5]),
  ...sourceRiverRoutes("873River"), ...sourceRiverRoutes("1070River"),
  ...sourceRiverRoutes("150River", [49.6, 52.2, 4, 9]),
  ...sourceRiverRoutes("534River"), ...sourceRiverRoutes("970River"),
  ...sourceRiverRoutes("724River", [49, 52, 3, 7], 2),
  ...sourceRiverRoutes("142River"), ...sourceRiverRoutes("1147River"),
  ...sourceRiverRoutes("721River"), ...sourceRiverRoutes("563River"),
  ...sourceRiverRoutes("626River"),
  ...sourceRiverRoutes("274River"), ...sourceRiverRoutes("274Lake Centerline"),
  ...sourceRiverRoutes("12River", [69.8, 72.4, 125.5, 129.0]),
  ...sourceRiverRoutes("422River"), ...sourceRiverRoutes("422Lake Centerline"),
  ...sourceRiverRoutes("609River"),
  ...sourceRiverRoutes("136River", [63.5, 65, 39, 43]),
  routeThroughCoordinates([
    { lat: 64.55, lon: 40.53 }, { lat: 64.65, lon: 40.30 }, { lat: 64.85, lon: 40.0 }
  ]),
  // The Leine reaches the Aller and Weser; Hanover is not on the Elbe.
  routeThroughCoordinates([
    { lat: 52.37, lon: 9.73 }, { lat: 52.5, lon: 9.45 },
    { lat: 52.72, lon: 9.58 }, { lat: 52.92, lon: 9.17 }, { lat: 53.05, lon: 8.84 }
  ]),
  // Tidal Delaware, including the Philadelphia waterfront.
  routeThroughCoordinates([
    { lat: 40.016, lon: -75.023 }, { lat: 39.95, lon: -75.14 },
    { lat: 39.87, lon: -75.19 }, { lat: 39.68, lon: -75.50 },
    { lat: 39.48, lon: -75.56 }, { lat: 39.15, lon: -75.40 }, { lat: 38.97, lon: -75.18 }
  ])
];
// Wensum/Yare: Norwich reaches the North Sea through Great Yarmouth.
// The Exe approach ends at Topsham, below the medieval obstruction at Exeter.
const norwichYareRoute = routeThroughCoordinates([
  { lat: 52.63, lon: 1.30 }, { lat: 52.62, lon: 1.35 },
  { lat: 52.57, lon: 1.45 }, { lat: 52.56, lon: 1.57 },
  { lat: 52.61, lon: 1.72 }, { lat: 52.57, lon: 1.73 }, { lat: 52.57, lon: 1.90 }
]);
const topshamExeRoute = routeThroughCoordinates([
  // Adjacent bank hex reserved for Topsham because Exeter occupies its nearest hex.
  { lat: 50.60, lon: -3.55 }, { lat: 50.62, lon: -3.43 },
  { lat: 50.62, lon: -3.43 }, { lat: 50.59, lon: -3.43 }, { lat: 50.50, lon: -3.42 }
]);
const riverChains = [
  norwichYareRoute,
  topshamExeRoute,
  ...MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[7]
    .filter((chain) => ![74294, 73682, 18467, 62166, 62627, 62610, 62346, 160887, 161095].includes(chain[0]))
    .map(refineChain),
  jamesRiverRoute,
  potomacRiverRoute,
  ...sourceRiverRepairs,
  ...riverOutlets.map(({ tileIds }) => tileIds),
  ...manualMouthChains,
  saveRiverApproach,
  delhiYamunaApproach,
  nigerRiverRoute,
  rhoneRiverRoute,
  panganiRiverApproach,
  sanJoaquinRiverApproach,
  chorokhiRiverApproach,
  cuttackMahanadiRoute,
  nanchangGanRoute,
  chengduMinYangtzeRoute,
  xianWeiYellowRoute,
  peguBagoRoute,
  jaunpurGomtiGangesRoute,
  cremonaPoRoute,
  toursLoireRoute,
  angersLoireRoute,
  coimbraMondegoRoute
];
const cityRiverChains = Object.fromEntries(Object.entries(
  MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[7]
).map(([cityId, chain]) => [cityId, refineChain(chain)]));
cityRiverChains["norwich|united kingdom"] = norwichYareRoute;
cityRiverChains["topsham|united kingdom"] = topshamExeRoute;
cityRiverChains["delhi|india"] = delhiYamunaApproach;
cityRiverChains["gao|mali"] = nigerRiverRoute;
cityRiverChains["tombouctou|mali"] = nigerRiverRoute;
cityRiverChains["lyon|france"] = rhoneRiverRoute;
cityRiverChains["cuttack|india"] = cuttackMahanadiRoute;
cityRiverChains["nanchang|china"] = nanchangGanRoute;
cityRiverChains["chengdu|china"] = chengduMinYangtzeRoute;
cityRiverChains["xian|china"] = xianWeiYellowRoute;
cityRiverChains["pegu|myanmar"] = peguBagoRoute;
cityRiverChains["jaunpur|india"] = jaunpurGomtiGangesRoute;
cityRiverChains["cremona|italy"] = cremonaPoRoute;
cityRiverChains["tours|france"] = toursLoireRoute;
cityRiverChains["angers|france"] = angersLoireRoute;
cityRiverChains["coimbra|portugal"] = coimbraMondegoRoute;
const shallowWaterTileIdSet = new Set(shallowWaterGroups.flatMap(refineChain));
for (const { name, tileIds } of REVIEWED_COASTAL_WATER_CORRIDORS) {
  for (const tileId of tileIds) {
    if (!earth.tiles[tileId]) throw new Error(`Invalid coastal correction ${name}: ${tileId}`);
    shallowWaterTileIdSet.add(tileId);
  }
}
// The fine globe's land mask exaggerates the small island at the Loire mouth
// into a blocking coastal hex. Keep the authored river route but restore this
// estuary tile to navigable shallows.
shallowWaterTileIdSet.add(160967);
// Open the upper Chesapeake's false cross-bay land bridge. Keep Delmarva
// attached at its northern end; this is an estuary, not an island channel.
shallowWaterTileIdSet.add(73665);
// The river and marine rasters must overlap at the fluvial estuary. At this
// scale Orleans cannot occupy a whole land hex without closing the south
// channel and pushing the mouth far downstream. General waterway contracts
// independently check the river approach and the surface-water continuation.
// https://www.canada.ca/en/environment-climate-change/services/environmental-indicators/nutrients-st-lawrence-river.html
for (const tileId of [297001, 297000]) shallowWaterTileIdSet.add(tileId);

// Preserve Long Island Sound and its western outlet at hex resolution.
// The narrow East River occupies a full water hex here so ships can sail it.
// Reference: https://gnome.orr.noaa.gov/doc/location_files/central_long_island_sound_tech.html
for (const tileId of [298999, 298720, 74786, 299005]) shallowWaterTileIdSet.add(tileId);
// Reviewed tidal water: Dvina Bay, Delaware Bay, Gulf of Suez and Roskilde
// Fjord. Widening a sub-hex estuary is explicit terrain authoring, not an
// automatic "nearest coast" shortcut through an unrelated drainage basin.
for (const [lat, lon] of [
  [64.85,40.0], [65.0,39.6],
  [39.15,-75.30], [39.0,-75.20], [38.9,-75.08],
  [29.80,32.55], [29.7,32.65],
  [35.50,139.86], [34.57,135.23], [54.1,11.0],
  [55.80,12.03], [55.90,12.02], [56.05,11.95]
]) shallowWaterTileIdSet.add(findNearestTileId(fineGraph, fineDirectionIndex, latLonToDirection(lat, lon)));
const lakeMalawiCorridor = routeThroughCoordinates([
  { lat: -9.5, lon: 34.3 },
  { lat: -10.5, lon: 34.35 },
  { lat: -11.5, lon: 34.45 },
  { lat: -12.5, lon: 34.55 },
  { lat: -13.5, lon: 34.75 },
  { lat: -14.4, lon: 35.2 }
]);
const lakeOverrides = unique([
  ...MANUAL_LAKE_TILE_OVERRIDES_BY_SUBDIVISIONS[7].map(({ tileId }) => tileId),
  ...lakeMalawiCorridor
]).map((tileId) => ({
  tileId,
  sourceTerrain: earth.tiles[tileId].t,
  lakeId: 11, elevation: -0.0369949146978479
}));
// The marine polygon is present in the sources, but the raster bake omitted
// the whole Caspian. It is a closed basin, never an ocean-navigation seed.
const marineFeatures = JSON.parse(await readFile(resolve(sharedRoot,
  "ne_110m_geography_marine_polys.json"), "utf8")).features;
const caspianFeatures = marineFeatures.filter((feature) => feature.properties.name === "Caspian Sea");
if (caspianFeatures.length !== 1 || caspianFeatures[0].geometry.type !== "Polygon") {
  throw new Error("Caspian reference polygon must resolve uniquely");
}
for (let tileId = 0; tileId < fineGraph.tileCount; tileId++) {
  const lat = fineGraph.latDeg[tileId], lon = fineGraph.lonDeg[tileId];
  if (lat < 36 || lat > 48 || lon < 46 || lon > 55) continue;
  if (!pointInPolygon(lon, lat, caspianFeatures[0].geometry.coordinates)) continue;
  lakeOverrides.push({ tileId, sourceTerrain: earth.tiles[tileId].t,
    lakeId: 39, elevation: -0.057 });
}
// Lake Taupo is absent from the 1:110m lake input. Its sub-hex width is
// represented by the tile at the checked-in Waikato lake centerline.
const taupoTileId = findNearestTileId(fineGraph, fineDirectionIndex, latLonToDirection(-38.8, 175.9));
lakeOverrides.push({tileId: taupoTileId, sourceTerrain: earth.tiles[taupoTileId].t,
  lakeId: 47, elevation: -0.02});
// This isolated Greenland water body is component 12 in the source water
// raster, separated from the surrounding marine component. The bake labeled
// it ocean beach; preserve the closed water body instead of carving a fjord.
lakeOverrides.push({tileId: 205851, sourceTerrain: earth.tiles[205851].t,
  lakeId: 48, elevation: earth.tiles[205851].e});
const inheritedLandOverrides = MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS[7].map((override) => ({
  ...override, sourceTerrain: earth.tiles[override.tileId].t
}));
const northMalukuIslandCities = new Set(["Ternate", "Tidore", "Makian Village"]);
const islandCities = MANUAL_CITY_RECORDS_1522.filter((record) => (
  record.islandSettlement ||
  (record.country === "Indonesia" && northMalukuIslandCities.has(record.city))
));
// These shore tiles belong to existing landmasses, or to real islands omitted
// by the coarse raster. Restoring the tile must preserve that identity.
const additionalRestorationIds = new Set([
  "copenhagen|denmark", "kalmar|sweden", "gresik|indonesia", "hormuz|iran",
  "kilwa|tanzania", "diu|india", "roanoke|united states of america",
  "new amsterdam|united states of america", "ville-marie|canada"
]);
const cityCatalog = loadCityCatalogFromCsv(await readFile(resolve(sharedRoot,
  "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"), "utf8"), CITY_DATA_YEAR);
const additionalRestorations = [...cityCatalog, ...COLONIZATION_TARGETS]
  .filter((city) => additionalRestorationIds.has(city.cityId));
if (additionalRestorations.length !== additionalRestorationIds.size) {
  throw new Error("Reviewed coast restoration is missing a unique settlement");
}
islandCities.push(...additionalRestorations);
const islandDirections = islandCities.map(cityPlacementDirection);
const mozambique = MANUAL_CITY_RECORDS_1522.find((record) => (
  record.city === "Mozambique" && record.country === "Mozambique"
));
if (!mozambique) throw new Error("Mozambique is missing from the manual city catalog");
const mozambiqueDirection = latLonToDirection(mozambique.lat, mozambique.lon);
const landOverrideByTileId = new Map(inheritedLandOverrides
  .filter((override) => {
    const center = graphCenter(fineGraph, override.tileId);
    const settlementDistance = Math.min(
      ...islandDirections.map((direction) => greatCircleDistanceKm(center, direction)),
      greatCircleDistanceKm(center, mozambiqueDirection)
    );
    return settlementDistance > 100 && isWaterSurface(earth.tiles[override.tileId]);
  })
  .map((override) => [override.tileId, override]));
for (const city of islandCities) {
  const tileId = findNearestTileId(
    fineGraph,
    fineDirectionIndex,
    cityPlacementDirection(city)
  );
  const source = earth.tiles[tileId];
  const landmassId = reviewedSettlementLandmassId(city);
  if ((!isWaterSurface(source) && source.m === landmassId) || landOverrideByTileId.has(tileId)) continue;
  const template = additionalRestorationIds.has(city.cityId)
    ? nearbyLandClimateTemplate(tileId)
    : nearestInheritedLandOverride(tileId, inheritedLandOverrides);
  landOverrideByTileId.set(tileId, {
    ...template,
    tileId,
    sourceTerrain: source.t,
    landmassId
  });
}
const mozambiqueTileId = findNearestTileId(
  fineGraph,
  fineDirectionIndex,
  mozambiqueDirection
);
if (!landOverrideByTileId.has(mozambiqueTileId)) {
  const source = earth.tiles[mozambiqueTileId];
  const template = nearestInheritedLandOverride(mozambiqueTileId, inheritedLandOverrides);
  landOverrideByTileId.set(mozambiqueTileId, {
    ...template,
    tileId: mozambiqueTileId,
    sourceTerrain: source.t,
    terrainType: "tropical_savanna",
    landmassId: 3999
  });
}
for (const neighborId of fineGraph.neighbors[mozambiqueTileId]) {
  if (!isWaterSurface(earth.tiles[neighborId])) shallowWaterTileIdSet.add(neighborId);
}
const rapaVillage = islandCities.find((record) => record.city === "Rapa Nui Village");
if (!rapaVillage) throw new Error("Rapa Nui Village is missing from the manual city catalog");
const rapaVillageTileId = findNearestTileId(
  fineGraph,
  fineDirectionIndex,
  latLonToDirection(rapaVillage.lat, rapaVillage.lon)
);
const moaiDirection = latLonToDirection(-27.1258, -109.2767);
const moaiTileId = [...fineGraph.neighbors[rapaVillageTileId]].sort((a, b) => (
  directionDot(b, moaiDirection) - directionDot(a, moaiDirection)
))[0];
if (!landOverrideByTileId.has(moaiTileId)) {
  const source = earth.tiles[moaiTileId];
  const template = nearestInheritedLandOverride(moaiTileId, inheritedLandOverrides);
  landOverrideByTileId.set(moaiTileId, {
    ...template,
    tileId: moaiTileId,
    sourceTerrain: source.t,
    terrainType: "tropical_savanna",
    landmassId: reviewedSettlementLandmassId(rapaVillage)
  });
}
// Long Island is a separate landmass even though the raster bake merged it
// with North America. These tile IDs describe this authored spatial correction.
for (const tileId of [299000, 299003, 74856, 299014]) {
  const source = earth.tiles[tileId];
  if (isWaterSurface(source)) throw new Error(`Long Island land tile ${tileId} is submerged`);
  landOverrideByTileId.set(tileId, {
    tileId,
    sourceTerrain: source.t,
    terrainType: source.t,
    elevation: source.e,
    landmassId: 4000
  });
}
const landOverrides = [...landOverrideByTileId.values()].sort((a, b) => a.tileId - b.tileId);
// Review candidates using the same significance/isolation rule everywhere.
// Explicit omissions stay reviewable; the rule can never erase a new city or
// quest site, nor consume a substantial island or an isolated resupply landfall.
const islandCandidates = minorCoastalIslandCandidates({ graph: fineGraph,
  earthRows: applyTerrainCorrections(earth.tiles, {
    shallowWaterTileIds: [...shallowWaterTileIdSet], lakeOverrides, landOverrides
  }),
  gameplaySites: [...cityCatalog, ...COLONIZATION_TARGETS].map((city) => ({
    id: city.cityId, tileId: findNearestTileId(fineGraph, fineDirectionIndex, cityPlacementDirection(city))
  }))
});
// Iki is squeezed against Tsushima by the raster; Dawson is reduced to one
// empty fragment beside Tierra del Fuego after opening Almirantazgo Sound.
for (const tileId of [261225, 444587]) {
  if (!islandCandidates.some(({ tileIds }) => tileIds.includes(tileId))) {
    throw new Error(`Coastal island omission violates retention policy: ${tileId}`);
  }
  shallowWaterTileIdSet.add(tileId);
}
const shallowWaterTileIds = [...shallowWaterTileIdSet].sort((a, b) => a - b);

const blockedRiverEdges = MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS[7]
  .flatMap(([a, b]) => adjacentPairs(refineChain([a, b])))
  .filter(([a, b]) => baseRiverEdgeIsSet(a, b) && baseRiverEdgeIsSet(b, a));
// A baked Moawhango spur crosses the divide into Tongariro/Taupo. Keep the
// real Waikato route above and remove the false southern connection.
blockedRiverEdges.push([354666, 354653], [88824, 354666]);
const blockedRiverMouths = MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[7]
  .flatMap(({ tile, edge }) => blockedMouthsAlong(
    refineChain([tile, requiredCoarseEdgeNeighbor(tile, edge)])
  ));
// Refining old blocked edges does not cover new hexes touching Baikal.
// These are the three actual subdivision-eight Lena-to-Baikal half-edges.
for (const [tile, waterTileId] of [[228481, 228460], [228470, 227346], [228470, 228460]]) {
  const edge = fineGraph.edgeNeighbors[tile].indexOf(waterTileId);
  if (edge < 0 || earth.tiles[waterTileId].l !== 1) throw new Error("Invalid reviewed Lena divide");
  blockedRiverMouths.push({ tile, edge });
}
const saltwaterPassageTileIds = unique([
  ...refineChain([98820, 98676, 98678, 24757]),
  ...refineChain([98682, 6233, 98694, 98704])
]);

const output = {
  shallowWaterTileIds,
  lakeOverrides,
  landOverrides,
  cityRiverChains,
  riverChains,
  blockedRiverEdges,
  blockedRiverMouths,
  riverMouths: [],
  saltwaterPassageTileIds
};
const source = `// Generated by tools/build-subdivision-eight-map-data.mjs.\n` +
  `// Authored subdivision-seven routes are split at their exact subdivision-eight edge midpoints.\n` +
  `function freezeDeep(value) {\n` +
  `  if (value && typeof value === "object" && !Object.isFrozen(value)) {\n` +
  `    for (const child of Object.values(value)) freezeDeep(child);\n` +
  `    Object.freeze(value);\n` +
  `  }\n` +
  `  return value;\n` +
  `}\n\n` +
  `export const SUBDIVISION_EIGHT_MAP_DATA = freezeDeep(${JSON.stringify(output, null, 2)});\n`;
await writeFile(outputPath, source);
console.info(
  `Wrote ${outputPath}: ${riverChains.length} river chains, ` +
  `${shallowWaterTileIds.length} shallow-water tiles, ${landOverrides.length} island corrections`
);

function refineChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) throw new Error("Cannot refine an empty hex chain");
  const refined = [chain[0]];
  for (let index = 1; index < chain.length; index++) {
    const a = chain[index - 1];
    const b = chain[index];
    if (!coarseGraph.neighbors[a]?.includes(b)) {
      throw new Error(`Subdivision-seven correction contains nonadjacent tiles ${a}/${b}`);
    }
    const neighborsOfA = new Set(fineGraph.neighbors[a]);
    const midpoints = [...fineGraph.neighbors[b]].filter((tileId) => neighborsOfA.has(tileId));
    if (midpoints.length !== 1) {
      throw new Error(`Expected one subdivision-eight midpoint for ${a}/${b}; got ${midpoints}`);
    }
    refined.push(midpoints[0], b);
  }
  return refined;
}

function routeThroughCoordinates(coordinates) {
  const tileIds = coordinates.map(({ lat, lon }) => findNearestTileId(
    fineGraph,
    fineDirectionIndex,
    latLonToDirection(lat, lon)
  ));
  const route = [tileIds[0]];
  for (let index = 1; index < tileIds.length; index++) {
    route.push(...shortestFinePath(route.at(-1), tileIds[index]).slice(1));
  }
  return route;
}

function shortestFinePath(startTileId, destinationTileId) {
  if (startTileId === destinationTileId) return [startTileId];
  const previous = new Map([[startTileId, -1]]);
  const queue = [startTileId];
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of fineGraph.neighbors[tileId]) {
      if (previous.has(neighborId)) continue;
      previous.set(neighborId, tileId);
      if (neighborId === destinationTileId) {
        const path = [neighborId];
        for (let current = tileId; current !== -1; current = previous.get(current)) {
          path.push(current);
        }
        return path.reverse();
      }
      queue.push(neighborId);
    }
  }
  throw new Error(`No subdivision-eight path between ${startTileId}/${destinationTileId}`);
}

function requiredCoarseEdgeNeighbor(tileId, edge) {
  const neighborId = coarseGraph.edgeNeighbors[tileId]?.[edge];
  if (!Number.isInteger(neighborId)) {
    throw new Error(`Subdivision-seven tile ${tileId} has no edge ${edge}`);
  }
  return neighborId;
}

function blockedMouthsAlong(chain) {
  const mouths = [];
  for (const [a, b] of adjacentPairs(chain)) {
    const aWater = isWaterSurface(earth.tiles[a]);
    const bWater = isWaterSurface(earth.tiles[b]);
    if (aWater === bWater) continue;
    const landTileId = aWater ? b : a;
    const waterTileId = aWater ? a : b;
    if (!baseRiverEdgeIsSet(landTileId, waterTileId)) continue;
    mouths.push({
      tile: landTileId,
      edge: fineGraph.edgeNeighbors[landTileId].indexOf(waterTileId)
    });
  }
  return mouths;
}

function baseRiverEdgeIsSet(fromTileId, toTileId) {
  const edge = fineGraph.edgeNeighbors[fromTileId].indexOf(toTileId);
  return edge >= 0 && earth.riverEdges[fromTileId]?.includes(edge);
}

function isWaterSurface(row) {
  return row?.t === "water" || row?.t === "lake" || row?.t === "beach";
}

function adjacentPairs(chain) {
  return chain.slice(1).map((tileId, index) => [chain[index], tileId]);
}

function unique(values) {
  return [...new Set(values)];
}

function nearestInheritedLandOverride(tileId, overrides) {
  const target = graphCenter(fineGraph, tileId);
  let best = null;
  let bestDot = -Infinity;
  for (const override of overrides) {
    const candidate = graphCenter(fineGraph, override.tileId);
    const dot = target[0] * candidate[0] + target[1] * candidate[1] + target[2] * candidate[2];
    if (dot <= bestDot) continue;
    best = override;
    bestDot = dot;
  }
  if (!best) throw new Error(`No island terrain template is available for tile ${tileId}`);
  return best;
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}

function cityPlacementDirection(city) {
  const hasPlacementLat = city.placementLat !== undefined;
  const hasPlacementLon = city.placementLon !== undefined;
  if (hasPlacementLat !== hasPlacementLon) {
    throw new Error(`Island placement requires both authored coordinates: ${city.city}`);
  }
  return latLonToDirection(
    hasPlacementLat ? city.placementLat : city.lat,
    hasPlacementLon ? city.placementLon : city.lon
  );
}

function directionDot(tileId, direction) {
  const center = graphCenter(fineGraph, tileId);
  return center[0] * direction[0] + center[1] * direction[1] + center[2] * direction[2];
}

function greatCircleDistanceKm(a, b) {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(dot) * 6371.0088;
}

function nearbyLandClimateTemplate(tileId) {
  const direction = graphCenter(fineGraph, tileId);
  const queue = [tileId];
  const seen = new Set(queue);
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    if (greatCircleDistanceKm(graphCenter(fineGraph, id), direction) > 60) continue;
    const row = earth.tiles[id];
    if (!isWaterSurface(row)) return { terrainType: row.t, elevation: Math.max(-0.03, row.e) };
    for (const neighborId of fineGraph.neighbors[id]) {
      if (!seen.has(neighborId)) { seen.add(neighborId); queue.push(neighborId); }
    }
  }
  throw new Error(`No local land climate for reviewed shore tile ${tileId}`);
}

function sourceRiverRoutes(sourceId, bounds = [-90, 90, -180, 180], expectedFeatureCount = 1) {
  const matches = sourceRivers.filter((feature) => feature.properties.dissolve === sourceId);
  if (matches.length !== expectedFeatureCount || matches.some((feature) => !feature.geometry)) {
    throw new Error(`Source river ${sourceId} must have ${expectedFeatureCount} reviewed features`);
  }
  const lines = matches.flatMap(({geometry}) => geometry.type === "MultiLineString" ? geometry.coordinates : [geometry.coordinates]);
  const result = [];
  for (const line of lines) {
    let segment = [];
    const flush = () => { if (segment.length > 1) result.push(routeThroughCoordinates(segment)); segment = []; };
    for (const [lon, lat] of line) {
      if (lat < bounds[0] || lat > bounds[1] || lon < bounds[2] || lon > bounds[3]) { flush(); continue; }
      segment.push({ lat, lon });
    }
    flush();
  }
  if (result.length === 0) throw new Error(`Source river ${sourceId} has no segment in its reviewed bounds`);
  return result;
}

function pointInPolygon(lon, lat, rings) {
  const contains = (ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  return contains(rings[0]) && !rings.slice(1).some(contains);
}
