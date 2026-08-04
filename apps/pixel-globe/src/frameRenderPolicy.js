export function shouldRenderFrame({
  forceRender,
  dirty,
  continuousAnimation,
  simulationPaused,
  nowMs,
  lastStatusMs,
  statusIntervalMs
}) {
  const flags = [forceRender, dirty, continuousAnimation, simulationPaused];
  if (flags.some((value) => typeof value !== "boolean")) {
    throw new Error("Frame render policy requires boolean flags");
  }
  if (![nowMs, lastStatusMs, statusIntervalMs].every(Number.isFinite) || statusIntervalMs <= 0) {
    throw new Error("Frame render policy requires finite timing values");
  }
  return forceRender || dirty || continuousAnimation ||
    (!simulationPaused && nowMs - lastStatusMs > statusIntervalMs);
}
