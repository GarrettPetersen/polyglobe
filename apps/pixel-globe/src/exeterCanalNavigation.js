import { EXETER_CITY_ID, TOPSHAM_CITY_ID, EXETER_CANAL_STAGE_COUNT } from "./exeterCanal.js";
import { edgeIndexTowardNeighbor } from "./worldNavigationTopology.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

// Spatial observations for the subdivision-eight chart, not settlement identity.
// A schematic west-bank bypass uses two visible river segments at this scale.
// The final month fits the locks and opens the quay; it does not add another cut.
export const EXETER_CANAL_TILE_CHAIN = Object.freeze([644451, 644453, 161147]);

export function exeterCanalNavigation(base, graph, earthRows, stage) {
  if (graph.subdivisions !== 8) throw new Error("Exeter canal geometry requires subdivision eight");
  if (!Number.isInteger(stage) || stage < 0 || stage > EXETER_CANAL_STAGE_COUNT) {
    throw new Error(`Invalid Exeter canal construction stage: ${stage}`);
  }
  if (stage === 0) return base;
  const riverMasks = base.riverMasks.slice();
  const reachableNavigationMask = base.reachableNavigationMask.slice();
  for (let index = 0; index < Math.min(stage, 2); index++) {
    const a = EXETER_CANAL_TILE_CHAIN[index];
    const b = EXETER_CANAL_TILE_CHAIN[index + 1];
    const edgeA = edgeIndexTowardNeighbor(graph, a, b);
    const edgeB = edgeIndexTowardNeighbor(graph, b, a);
    if (edgeA === undefined || edgeB === undefined || isWaterSurfaceRow(earthRows[a]) || isWaterSurfaceRow(earthRows[b])) {
      throw new Error(`Exeter canal bypass is no longer an adjacent land corridor: ${a}/${b}`);
    }
    if (!reachableNavigationMask[a]) throw new Error(`Exeter canal has no navigable seaward connection: ${a}`);
    riverMasks[a] |= 1 << edgeA;
    riverMasks[b] |= 1 << edgeB;
    reachableNavigationMask[b] = 1;
  }
  return { ...base, riverMasks, reachableNavigationMask };
}

export function exeterCanalPort(placedCities) {
  const byId = new Map([...placedCities].map((city) => [city.cityId, city]));
  const city = byId.get(EXETER_CITY_ID);
  const gateway = byId.get(TOPSHAM_CITY_ID);
  if (city?.tileId !== EXETER_CANAL_TILE_CHAIN.at(-1) || gateway?.tileId !== EXETER_CANAL_TILE_CHAIN[0]) {
    throw new Error("Exeter canal geometry no longer matches its canonical city and outport");
  }
  return city;
}
