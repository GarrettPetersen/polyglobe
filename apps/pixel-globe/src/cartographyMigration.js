import { isGraphRowCollection } from "./geodesicBake.js";
import { geodesicTileCount } from "./worldScale.js";

const PACKED_BYTE_POPCOUNT = Uint8Array.from(
  { length: 256 },
  (_, byte) => byte.toString(2).replaceAll("0", "").length
);

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

export function assertCartographyMaskProgression(
  previousPackedMask,
  previousSeenTileCount,
  nextPackedMask,
  nextSeenTileCount
) {
  const merge = mergeCartographyMaskProgression(
    previousPackedMask,
    previousSeenTileCount,
    nextPackedMask,
    nextSeenTileCount
  );
  if (merge.restoredTileIds.length > 0) {
    throw new Error(
      `Cartography update would discard ${merge.restoredTileIds.length} mapped tiles`
    );
  }
}

export function mergeCartographyMaskProgression(
  previousPackedMask,
  previousSeenTileCount,
  nextPackedMask,
  nextSeenTileCount
) {
  if (!(previousPackedMask instanceof Uint8Array) || !(nextPackedMask instanceof Uint8Array)) {
    throw new Error("Cartography progression requires packed byte masks");
  }
  if (!Number.isInteger(previousSeenTileCount) || previousSeenTileCount < 0 ||
      !Number.isInteger(nextSeenTileCount) || nextSeenTileCount < 0) {
    throw new Error("Cartography progression requires nonnegative mapped tile counts");
  }
  if (nextPackedMask.length < previousPackedMask.length) {
    throw new Error(
      `Cartography update cannot shrink its tile mask: ` +
        `${previousPackedMask.length} -> ${nextPackedMask.length} bytes`
    );
  }
  const countedPreviousTiles = countPackedTiles(previousPackedMask, previousPackedMask.length * 8);
  const countedNextTiles = countPackedTiles(nextPackedMask, nextPackedMask.length * 8);
  if (countedPreviousTiles !== previousSeenTileCount || countedNextTiles !== nextSeenTileCount) {
    throw new Error(
      `Cartography progression count mismatch: ` +
        `${countedPreviousTiles}/${previousSeenTileCount} -> ${countedNextTiles}/${nextSeenTileCount}`
    );
  }
  let packedMask = nextPackedMask;
  const restoredTileIds = [];
  for (let byteIndex = 0; byteIndex < previousPackedMask.length; byteIndex++) {
    const missingBits = previousPackedMask[byteIndex] & ~nextPackedMask[byteIndex];
    if (missingBits === 0) continue;
    if (packedMask === nextPackedMask) packedMask = nextPackedMask.slice();
    packedMask[byteIndex] |= previousPackedMask[byteIndex];
    for (let bit = 0; bit < 8; bit++) {
      if ((missingBits & (1 << bit)) !== 0) restoredTileIds.push(byteIndex * 8 + bit);
    }
  }
  return Object.freeze({
    packedMask,
    seenTileCount: nextSeenTileCount + restoredTileIds.length,
    restoredTileIds: Object.freeze(restoredTileIds),
    changed: restoredTileIds.length > 0
  });
}

export function forEachPackedCartographyTile(packedMask, tileCount, visitTile) {
  if (!(packedMask instanceof Uint8Array) ||
      !Number.isInteger(tileCount) || tileCount < 0 ||
      packedMask.length !== Math.ceil(tileCount / 8) ||
      typeof visitTile !== "function") {
    throw new Error("Packed cartography iteration requires a complete mask, tile count, and callback");
  }
  assertPackedMaskTailIsClear(packedMask, tileCount);
  let visitedTileCount = 0;
  for (let byteIndex = 0; byteIndex < packedMask.length; byteIndex++) {
    let bits = packedMask[byteIndex];
    while (bits !== 0) {
      const lowestBit = bits & -bits;
      const bitIndex = 31 - Math.clz32(lowestBit);
      visitTile(byteIndex * 8 + bitIndex);
      visitedTileCount += 1;
      bits &= bits - 1;
    }
  }
  return visitedTileCount;
}

function packedTileIsSet(packedMask, tileId) {
  return (packedMask[tileId >> 3] & (1 << (tileId & 7))) !== 0;
}

function setPackedTile(packedMask, tileId) {
  packedMask[tileId >> 3] |= 1 << (tileId & 7);
}

function countPackedTiles(packedMask, tileCount) {
  let count = 0;
  const completeBytes = Math.floor(tileCount / 8);
  for (let byteIndex = 0; byteIndex < completeBytes; byteIndex++) {
    count += PACKED_BYTE_POPCOUNT[packedMask[byteIndex]];
  }
  const remainingBits = tileCount & 7;
  if (remainingBits > 0) {
    count += PACKED_BYTE_POPCOUNT[
      packedMask[completeBytes] & ((1 << remainingBits) - 1)
    ];
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
