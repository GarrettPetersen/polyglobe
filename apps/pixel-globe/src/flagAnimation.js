export function flagWaveColumnOffsets(width, phaseRad, amplitudePx = 1) {
  if (!Number.isInteger(width) || width < 1) throw new Error(`Invalid flag width: ${width}`);
  if (!Number.isFinite(phaseRad)) throw new Error(`Invalid flag wave phase: ${phaseRad}`);
  if (!Number.isFinite(amplitudePx) || amplitudePx < 0) {
    throw new Error(`Invalid flag wave amplitude: ${amplitudePx}`);
  }

  return Array.from({ length: width }, (_, column) => {
    if (column === 0 || amplitudePx === 0) return 0;
    const columnPhase = column * Math.PI / width;
    const attachment = Math.min(1, column / Math.max(5, width * 0.45));
    return Math.round(Math.sin(phaseRad + columnPhase) * amplitudePx * 0.7 * attachment);
  });
}
