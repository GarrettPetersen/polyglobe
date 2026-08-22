export function shouldRenderFrame({
  forceRender,
  dirty,
  continuousAnimation,
  simulationPaused,
  nowMs,
  lastRenderCompletedAtMs,
  renderCooldownMs,
  lastStatusMs,
  statusIntervalMs
}) {
  const flags = [forceRender, dirty, continuousAnimation, simulationPaused];
  if (flags.some((value) => typeof value !== "boolean")) {
    throw new Error("Frame render policy requires boolean flags");
  }
  if (![nowMs, lastRenderCompletedAtMs, renderCooldownMs, lastStatusMs, statusIntervalMs]
    .every(Number.isFinite) || renderCooldownMs < 0 || statusIntervalMs <= 0) {
    throw new Error("Frame render policy requires finite timing values");
  }
  if (forceRender || (simulationPaused && (dirty || continuousAnimation))) return true;
  const renderRequested = dirty || continuousAnimation ||
    (!simulationPaused && nowMs - lastStatusMs > statusIntervalMs);
  return renderRequested && nowMs - lastRenderCompletedAtMs >= renderCooldownMs;
}

export const ADAPTIVE_RENDER_COOLDOWN_MAX_MS = 1000 / 30;
export const ADAPTIVE_RENDER_FULL_DENSITY = 1;
export const ADAPTIVE_RENDER_MIN_DENSITY = 0.3;

export function adaptiveRenderCooldownMs(visualDensity) {
  if (!Number.isFinite(visualDensity) || visualDensity < 0 || visualDensity > 1) {
    throw new Error(`Adaptive render cooldown requires a unit visual density: ${visualDensity}`);
  }
  const normalizedDensity = Math.max(0, Math.min(
    1,
    (visualDensity - ADAPTIVE_RENDER_MIN_DENSITY) /
      (ADAPTIVE_RENDER_FULL_DENSITY - ADAPTIVE_RENDER_MIN_DENSITY)
  ));
  return ADAPTIVE_RENDER_COOLDOWN_MAX_MS * (1 - normalizedDensity);
}
