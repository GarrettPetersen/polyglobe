import { WEATHER_DAYS, fillIceMaskForDay } from "../src/weather.js";
import { canTraverseWorldNavigationEdge } from "../src/worldNavigationTopology.js";

// Find a path to the permanently open ocean component, not merely an unfrozen
// neighbor: a downstream frozen strait can cut off an otherwise clear harbor.
export function bakeSeasonalColonyAccess({ graph, earthRows, navigation, seaIceCycle,
  freshwaterIceCycle, fineToCoarseTileId, oceanSeedTileId, colonies }) {
  if (!seaIceCycle || !freshwaterIceCycle) throw new Error("Seasonal access requires both runtime ice cycles");
  const sea = new Uint8Array(seaIceCycle.tileCount);
  const fresh = new Uint8Array(freshwaterIceCycle.tileCount);
  const annualIce = new Uint8Array(sea.length);
  for (let day = 0; day < WEATHER_DAYS; day++) {
    fillIceMaskForDay(seaIceCycle, day, sea);
    fillIceMaskForDay(freshwaterIceCycle, day, fresh);
    for (let tile = 0; tile < annualIce.length; tile++) annualIce[tile] |= sea[tile] | fresh[tile];
  }
  const neighbors = Array.from({ length: graph.tileCount }, (_, tile) => {
    if (navigation.reachableNavigationMask[tile] !== 1) return [];
    return [...graph.neighbors[tile]].filter(next => navigation.reachableNavigationMask[next] === 1 &&
      canTraverseWorldNavigationEdge({ graph, earthRows, riverMasks: navigation.riverMasks,
        riverToWaterMasks: navigation.riverToWaterMasks, fromTileId: tile, toTileId: next }));
  });
  if (!neighbors[oceanSeedTileId]?.length || annualIce[fineToCoarseTileId[oceanSeedTileId]]) {
    throw new Error("Seasonal access ocean seed must remain ice-free all year");
  }
  const permanent = new Uint8Array(graph.tileCount);
  const queue = new Uint32Array(graph.tileCount);
  let head = 0, tail = 1;
  queue[0] = oceanSeedTileId; permanent[oceanSeedTileId] = 1;
  while (head < tail) {
    for (const next of neighbors[queue[head++]]) {
      if (permanent[next] || annualIce[fineToCoarseTileId[next]]) continue;
      permanent[next] = 1; queue[tail++] = next;
    }
  }
  const seen = new Uint32Array(graph.tileCount);
  let searchId = 0;
  function canReachOcean(accessTileIds) {
    searchId++; head = 0; tail = 0;
    for (const tile of accessTileIds) {
      const climate = fineToCoarseTileId[tile];
      if (navigation.reachableNavigationMask[tile] !== 1 || sea[climate] || fresh[climate] || seen[tile] === searchId) continue;
      if (permanent[tile]) return true;
      seen[tile] = searchId; queue[tail++] = tile;
    }
    while (head < tail) {
      for (const next of neighbors[queue[head++]]) {
        const climate = fineToCoarseTileId[next];
        if (seen[next] === searchId || sea[climate] || fresh[climate]) continue;
        if (permanent[next]) return true;
        seen[next] = searchId; queue[tail++] = next;
      }
    }
    return false;
  }
  const result = {};
  for (const colony of colonies) {
    if (!colony.cityId || Object.hasOwn(result, colony.cityId) || !colony.accessTileIds.length) {
      throw new Error(`Invalid or duplicate colony approach: ${colony.cityId}`);
    }
    result[colony.cityId] = { blockedDays: [] };
  }
  // No-ice reachability distinguishes a map defect from a seasonal closure.
  sea.fill(0); fresh.fill(0);
  for (const colony of colonies) if (!canReachOcean(colony.accessTileIds)) {
    throw new Error(`Colony has no ocean approach even without ice: ${colony.cityId}`);
  }
  for (let day = 0; day < WEATHER_DAYS; day++) {
    fillIceMaskForDay(seaIceCycle, day, sea);
    fillIceMaskForDay(freshwaterIceCycle, day, fresh);
    for (const colony of colonies) if (!canReachOcean(colony.accessTileIds)) result[colony.cityId].blockedDays.push(day);
  }
  for (const [cityId, record] of Object.entries(result)) {
    if (record.blockedDays.length === WEATHER_DAYS) throw new Error(`Colony is icebound all year: ${cityId}`);
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
