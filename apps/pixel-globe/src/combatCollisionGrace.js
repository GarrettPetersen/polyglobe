export function combatEntryCollisionGraceForPair(
  overlapGracePairs,
  pairId,
  { entryGrace, distanceSquared, touchingRange }
) {
  if (!(overlapGracePairs instanceof Set)) throw new Error("Combat overlap grace requires a pair set");
  if (typeof pairId !== "string" || pairId === "") throw new Error("Combat overlap grace requires a pair ID");
  if (typeof entryGrace !== "boolean" || !Number.isFinite(distanceSquared) || distanceSquared < 0 ||
      !Number.isFinite(touchingRange) || touchingRange <= 0) {
    throw new Error(`Invalid combat overlap grace geometry: ${pairId}`);
  }
  let overlapGrace = overlapGracePairs.has(pairId);
  const touching = distanceSquared <= touchingRange * touchingRange;
  if (overlapGrace && !touching) {
    overlapGracePairs.delete(pairId);
    overlapGrace = false;
  }
  if (entryGrace && touching) {
    overlapGracePairs.add(pairId);
    overlapGrace = true;
  }
  return entryGrace || overlapGrace;
}
