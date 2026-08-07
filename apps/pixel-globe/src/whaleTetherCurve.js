export const WHALE_TETHER_CURVE_SEGMENTS = 8;

export function drawWhaleTetherCurve(
  startX,
  startY,
  endX,
  endY,
  bendPx,
  painter,
  color
) {
  assertFinitePoint(startX, startY, "start");
  assertFinitePoint(endX, endY, "end");
  if (!Number.isFinite(bendPx) || bendPx < 0) {
    throw new Error(`Whale tether bend must be a non-negative finite number: ${bendPx}`);
  }
  if (!painter || typeof painter.line !== "function") {
    throw new Error("Whale tether curve requires a line painter");
  }
  if (typeof color !== "string" || color.length === 0) {
    throw new Error("Whale tether curve requires a color");
  }

  const roundedStartX = Math.round(startX);
  const roundedStartY = Math.round(startY);
  const roundedEndX = Math.round(endX);
  const roundedEndY = Math.round(endY);
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  if (bendPx === 0 || length < 1e-6) {
    painter.line(roundedStartX, roundedStartY, roundedEndX, roundedEndY, color);
    return 1;
  }

  const controlX = (startX + endX) / 2 - (dy / length) * bendPx * 2;
  const controlY = (startY + endY) / 2 + (dx / length) * bendPx * 2;
  let previousX = roundedStartX;
  let previousY = roundedStartY;
  let drawnSegments = 0;
  for (let index = 1; index <= WHALE_TETHER_CURVE_SEGMENTS; index++) {
    const t = index / WHALE_TETHER_CURVE_SEGMENTS;
    const inverseT = 1 - t;
    const x = Math.round(
      inverseT * inverseT * startX +
      2 * inverseT * t * controlX +
      t * t * endX
    );
    const y = Math.round(
      inverseT * inverseT * startY +
      2 * inverseT * t * controlY +
      t * t * endY
    );
    if (x === previousX && y === previousY) continue;
    painter.line(previousX, previousY, x, y, color);
    previousX = x;
    previousY = y;
    drawnSegments += 1;
  }
  return drawnSegments;
}

function assertFinitePoint(x, y, label) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Whale tether ${label} must be finite: ${x},${y}`);
  }
}
