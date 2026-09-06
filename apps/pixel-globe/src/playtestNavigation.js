/** Test pilot routing over the production navigability graph. Steering still
 * goes through normal hull movement and collision; this never moves the ship. */
export function planPlaytestRoute({ startId, neighbors, isNavigable, isDestination, maxTiles = 100000 }) {
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
      if (previous.has(next) || !isNavigable(next)) continue;
      previous.set(next, id);
      queue.push(next);
    }
  }
  throw new Error(`Test pilot found no navigable route from tile ${startId} within ${maxTiles} tiles`);
}
