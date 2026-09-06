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
