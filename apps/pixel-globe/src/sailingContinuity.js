// Movement integration and chart reconciliation are separate operations. A
// large correction during ordinary movement is not low FPS and needs its own diagnostic.
export function sailingCorrectionDistancePx(integratedPosition, reconciledPosition, pixelsPerRadian) {
  if (!Number.isFinite(pixelsPerRadian) || pixelsPerRadian <= 0 ||
      [integratedPosition, reconciledPosition].some(position => !Array.isArray(position) ||
        position.length !== 3 || position.some(value => !Number.isFinite(value)))) {
    throw new Error("Sailing continuity requires finite globe vectors and a positive projection scale");
  }
  return Math.hypot(...integratedPosition.map((value, index) => value - reconciledPosition[index])) * pixelsPerRadian;
}

// Concealed chart settlement (including wave motion) can move the coordinate
// frame beneath the ship between physics steps. Measure the new step against
// that same frame, so its existing displacement is not reported as a new jump.
export function sailingStepCorrectionDistancePx({ integratedPosition, reconciledPosition,
  previousPosition, previousChartPosition, pixelsPerRadian }) {
  sailingCorrectionDistancePx(previousPosition, previousChartPosition, pixelsPerRadian);
  const expected = integratedPosition.map((value, index) =>
    value + previousChartPosition[index] - previousPosition[index]);
  return sailingCorrectionDistancePx(expected, reconciledPosition, pixelsPerRadian);
}
