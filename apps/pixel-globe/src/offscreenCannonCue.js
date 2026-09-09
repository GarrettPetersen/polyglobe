export const CANNON_CUE_DURATION_MS = 5000;

// Intersect the ray toward the firing position with the actual viewport edge.
export function offscreenCannonCue(point, width, height, elapsedMs) {
  if (![point.x, point.y, width, height, elapsedMs].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error("Cannon direction cue requires finite screen coordinates and a positive viewport");
  }
  if (elapsedMs < 0 || elapsedMs >= CANNON_CUE_DURATION_MS ||
      (point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height)) return null;
  const dx = point.x - width / 2;
  const dy = point.y - height / 2;
  const scale = Math.min(width / 2 / Math.abs(dx), height / 2 / Math.abs(dy));
  return { x: width / 2 + dx * scale, y: height / 2 + dy * scale,
    opacity: 0.65 * (1 - elapsedMs / CANNON_CUE_DURATION_MS) };
}
