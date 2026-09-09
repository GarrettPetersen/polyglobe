/** Test pilot routing over the production navigability graph. Steering still
 * goes through normal hull movement and collision; this never moves the ship. */
export function planPlaytestRoute({ startId, neighbors, isNavigable, canTraverseEdge, isDestination, maxTiles = 100000 }) {
  if (typeof canTraverseEdge !== "function") throw new Error("Test pilot requires navigation edge eligibility");
  const queue = [startId];
  const previous = new Map([[startId, null]]);
  for (let index = 0; index < queue.length && index < maxTiles; index++) {
    const id = queue[index];
    if (isDestination(id)) {
      const path = [];
      for (let cursor = id; cursor !== null; cursor = previous.get(cursor)) path.push(cursor);
      return path.reverse();
    }
    for (const next of neighbors(id)) {
      if (previous.has(next) || !isNavigable(next) || !canTraverseEdge(id, next)) continue;
      previous.set(next, id);
      queue.push(next);
    }
  }
  throw new Error(`Test pilot found no navigable route from tile ${startId} within ${maxTiles} tiles`);
}

/** Tile entry advances a river waypoint; channel motion can also return to an
 * earlier tile. Never retain a later leg that is disconnected from that tile. */
export function playtestRouteIndexForTile(tiles, index, tileId) {
  const current = tiles.indexOf(tileId);
  return current < 0 ? index : Math.min(current + 1, tiles.length - 1);
}
