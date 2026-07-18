export const WHALE_TARGET_CLICK_PADDING_PX = 4;

export function selectWhaleTargetAtPoint(calls, point, frameSize) {
  if (!Array.isArray(calls)) throw new Error("Whale targeting requires visible calls");
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    throw new Error("Whale targeting requires a finite pointer position");
  }
  if (!Number.isFinite(frameSize) || frameSize <= 0) {
    throw new Error(`Whale targeting requires a positive frame size: ${frameSize}`);
  }
  let best = null;
  let bestDistanceSquared = Infinity;
  for (const call of calls) {
    validateWhaleCall(call);
    const halfSize = frameSize * call.scale / 2 + WHALE_TARGET_CLICK_PADDING_PX;
    if (Math.abs(point.x - call.x) > halfSize || Math.abs(point.y - call.y) > halfSize) continue;
    const distanceSquared = (point.x - call.x) ** 2 + (point.y - call.y) ** 2;
    if (distanceSquared >= bestDistanceSquared) continue;
    best = call;
    bestDistanceSquared = distanceSquared;
  }
  return best;
}

function validateWhaleCall(call) {
  if (!call || typeof call.id !== "string" || call.id === "" ||
      !Number.isFinite(call.x) || !Number.isFinite(call.y) ||
      !Number.isFinite(call.scale) || call.scale <= 0) {
    throw new Error("Whale targeting received an invalid interaction call");
  }
}
