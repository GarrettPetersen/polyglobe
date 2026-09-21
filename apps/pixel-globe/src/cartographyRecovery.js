export function advanceCartographyRecovery(tileIds, startIndex, {
  maxTiles,
  revealTile,
  shouldYield
}) {
  if (!Array.isArray(tileIds) || tileIds.some((tileId) => !Number.isInteger(tileId) || tileId < 0)) {
    throw new Error("Cartography recovery requires nonnegative tile IDs");
  }
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex > tileIds.length) {
    throw new Error(`Invalid cartography recovery index: ${startIndex}`);
  }
  if (!Number.isInteger(maxTiles) || maxTiles <= 0 ||
      typeof revealTile !== "function" || typeof shouldYield !== "function") {
    throw new Error("Cartography recovery requires a positive chunk and callbacks");
  }
  let nextIndex = startIndex;
  let processed = 0;
  while (nextIndex < tileIds.length && processed < maxTiles) {
    if (processed > 0 && shouldYield()) break;
    revealTile(tileIds[nextIndex]);
    nextIndex += 1;
    processed += 1;
  }
  return Object.freeze({
    nextIndex,
    processed,
    complete: nextIndex === tileIds.length
  });
}
