import { isGraphRowCollection } from "./geodesicBake.js";
import { geodesicTileCount } from "./worldScale.js";

export function reconcileCartographyTileMask(packedMask, seenTileCount, graph, {
  savedSubdivisions,
  currentSubdivisions
}) {
  if (!(packedMask instanceof Uint8Array)) {
    throw new Error("Cartography migration requires a packed byte mask");
  }
  if (!Number.isInteger(seenTileCount) || seenTileCount < 0) {
    throw new Error(`Invalid saved cartography count: ${seenTileCount}`);
  }
  if (!graph || graph.subdivisions !== currentSubdivisions ||
      graph.tileCount !== geodesicTileCount(currentSubdivisions) ||
      !isGraphRowCollection(graph.neighbors) || graph.neighbors.length !== graph.tileCount) {
    throw new Error("Cartography migration requires the current geodesic graph");
  }
  const savedTileCount = geodesicTileCount(savedSubdivisions);
  const expectedSavedBytes = Math.ceil(savedTileCount / 8);
  if (packedMask.length !== expectedSavedBytes) {
    throw new Error(
      `Saved cartography mask has ${packedMask.length} bytes; expected ${expectedSavedBytes}`
    );
  }
  assertPackedMaskTailIsClear(packedMask, savedTileCount);
  const countedSavedTiles = countPackedTiles(packedMask, savedTileCount);
  if (countedSavedTiles !== seenTileCount) {
    throw new Error(
      `Saved cartography count mismatch: mask=${countedSavedTiles} state=${seenTileCount}`
    );
  }
  if (savedSubdivisions === currentSubdivisions) {
    return Object.freeze({
      packedMask,
      seenTileCount,
      migrated: false
    });
  }
  if (savedSubdivisions + 1 !== currentSubdivisions) {
    throw new Error(
      `No cartography migration exists for subdivision ` +
        `${savedSubdivisions} to ${currentSubdivisions}`
    );
  }

  const migratedMask = new Uint8Array(Math.ceil(graph.tileCount / 8));
  let migratedSeenTileCount = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    let revealed = tileId < savedTileCount && packedTileIsSet(packedMask, tileId);
    if (tileId >= savedTileCount) {
      let coarseParentCount = 0;
      for (const neighborId of graph.neighbors[tileId]) {
        if (neighborId >= savedTileCount) continue;
        coarseParentCount += 1;
        if (packedTileIsSet(packedMask, neighborId)) revealed = true;
      }
      if (coarseParentCount !== 2) {
        throw new Error(
          `Subdivision ${currentSubdivisions} cartography tile ${tileId} has ` +
            `${coarseParentCount} subdivision-${savedSubdivisions} parents`
        );
      }
    }
    if (!revealed) continue;
    setPackedTile(migratedMask, tileId);
    migratedSeenTileCount += 1;
  }
  return Object.freeze({
    packedMask: migratedMask,
    seenTileCount: migratedSeenTileCount,
    migrated: true
  });
}

function packedTileIsSet(packedMask, tileId) {
  return (packedMask[tileId >> 3] & (1 << (tileId & 7))) !== 0;
}

function setPackedTile(packedMask, tileId) {
  packedMask[tileId >> 3] |= 1 << (tileId & 7);
}

function countPackedTiles(packedMask, tileCount) {
  let count = 0;
  for (let tileId = 0; tileId < tileCount; tileId++) {
    if (packedTileIsSet(packedMask, tileId)) count += 1;
  }
  return count;
}

function assertPackedMaskTailIsClear(packedMask, tileCount) {
  const remainder = tileCount & 7;
  if (remainder === 0 || packedMask.length === 0) return;
  const allowed = (1 << remainder) - 1;
  const tail = packedMask[packedMask.length - 1];
  if ((tail & ~allowed) !== 0) {
    throw new Error("Saved cartography mask has revealed bits beyond its world tile count");
  }
}
