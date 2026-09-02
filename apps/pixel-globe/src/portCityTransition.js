export const PORT_CITY_TRANSITION_DURATION_MS = 420;

export function portCityCircleWipeFrame({
  direction,
  startedAtMs,
  nowMs,
  centerX,
  centerY,
  viewportWidth,
  viewportHeight,
  reducedMotion = false
}) {
  if (!['enter', 'exit'].includes(direction)) {
    throw new Error(`Unknown port city transition direction: ${direction}`);
  }
  for (const [label, value] of Object.entries({
    startedAtMs,
    nowMs,
    centerX,
    centerY,
    viewportWidth,
    viewportHeight
  })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid port city transition ${label}: ${value}`);
  }
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    throw new Error(`Invalid port city transition viewport: ${viewportWidth}x${viewportHeight}`);
  }
  const durationMs = reducedMotion ? 1 : PORT_CITY_TRANSITION_DURATION_MS;
  const progress = clamp((nowMs - startedAtMs) / durationMs, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  const maximumRadius = Math.max(
    Math.hypot(centerX, centerY),
    Math.hypot(viewportWidth - centerX, centerY),
    Math.hypot(centerX, viewportHeight - centerY),
    Math.hypot(viewportWidth - centerX, viewportHeight - centerY)
  ) + 2;
  return Object.freeze({
    direction,
    centerX,
    centerY,
    radius: maximumRadius * (direction === "enter" ? eased : 1 - eased),
    progress,
    complete: progress >= 1
  });
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
