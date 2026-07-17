import { EARTH_RADIUS_KM } from "./worldDistance.js";

export class MinDistanceHeap {
  constructor() {
    this.tileIds = [];
    this.distances = [];
  }

  get size() {
    return this.tileIds.length;
  }

  push(tileId, distance) {
    if (!Number.isInteger(tileId) || tileId < 0 || !Number.isFinite(distance) || distance < 0) {
      throw new Error(`Invalid graph heap entry: ${tileId} at ${distance}`);
    }
    let index = this.tileIds.length;
    this.tileIds.push(tileId);
    this.distances.push(distance);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.distances[parent] <= distance) break;
      this.tileIds[index] = this.tileIds[parent];
      this.distances[index] = this.distances[parent];
      index = parent;
    }
    this.tileIds[index] = tileId;
    this.distances[index] = distance;
  }

  pop() {
    if (this.tileIds.length === 0) throw new Error("Cannot pop an empty graph heap");
    const tileId = this.tileIds[0];
    const distance = this.distances[0];
    const lastTileId = this.tileIds.pop();
    const lastDistance = this.distances.pop();
    if (this.tileIds.length > 0) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        if (left >= this.tileIds.length) break;
        const right = left + 1;
        const child = right < this.tileIds.length && this.distances[right] < this.distances[left]
          ? right
          : left;
        if (this.distances[child] >= lastDistance) break;
        this.tileIds[index] = this.tileIds[child];
        this.distances[index] = this.distances[child];
        index = child;
      }
      this.tileIds[index] = lastTileId;
      this.distances[index] = lastDistance;
    }
    return { tileId, distance };
  }
}

export function graphEdgeDistanceKm(graph, a, b) {
  if (!graph?.centers || !Number.isInteger(a) || !Number.isInteger(b) ||
      a < 0 || b < 0 || a >= graph.tileCount || b >= graph.tileCount) {
    throw new Error(`Invalid graph edge distance: ${a} to ${b}`);
  }
  const aOffset = a * 3;
  const bOffset = b * 3;
  const dot = Math.max(-1, Math.min(1,
    graph.centers[aOffset] * graph.centers[bOffset] +
    graph.centers[aOffset + 1] * graph.centers[bOffset + 1] +
    graph.centers[aOffset + 2] * graph.centers[bOffset + 2]
  ));
  return Math.acos(dot) * EARTH_RADIUS_KM;
}
