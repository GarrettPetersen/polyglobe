export function flagWaveColumnOffsets(width, phaseRad, amplitudePx = 1) {
  if (!Number.isInteger(width) || width < 1) throw new Error(`Invalid flag width: ${width}`);
  if (!Number.isFinite(phaseRad)) throw new Error(`Invalid flag wave phase: ${phaseRad}`);
  if (!Number.isInteger(amplitudePx) || amplitudePx < 0) {
    throw new Error(`Invalid flag wave amplitude: ${amplitudePx}`);
  }

  return Array.from({ length: width }, (_, column) => {
    if (column === 0 || amplitudePx === 0) return 0;
    const attachment = Math.min(1, column / 3);
    return Math.round(Math.sin(phaseRad + column * 0.9) * amplitudePx * attachment);
  });
}
