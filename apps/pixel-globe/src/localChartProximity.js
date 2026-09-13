// A settled chart displaces tiles from their ideal globe projection. Nearby
// interactions must measure the same local points that draw their targets.
// Null means the target is outside the local chart, not a zero distance.
export function localChartDistancePx(targetPoint, playerPoint) {
  if (targetPoint === null) return null;
  for (const point of [targetPoint, playerPoint]) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
      throw new Error("Local chart proximity requires finite local chart coordinates");
    }
  }
  return Math.hypot(targetPoint.x - playerPoint.x, targetPoint.y - playerPoint.y);
}
