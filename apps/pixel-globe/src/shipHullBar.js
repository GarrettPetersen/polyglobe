export function shipHullIsDamaged(hitPoints, maxHitPoints) {
  validateHull(hitPoints, maxHitPoints);
  return hitPoints < maxHitPoints - 1e-8;
}

export function shipHullBarLayout({ x, y, frameSize, hitPoints, maxHitPoints, width = 20 }) {
  validateHull(hitPoints, maxHitPoints);
  for (const [label, value] of Object.entries({ x, y, frameSize, width })) {
    if (!Number.isFinite(value)) throw new Error(`Ship hull bar ${label} must be finite: ${value}`);
  }
  if (frameSize <= 0 || width < 3 || width > frameSize) {
    throw new Error(`Ship hull bar dimensions are invalid: ${width}/${frameSize}`);
  }
  return Object.freeze({
    x: Math.round(x + (frameSize - width) / 2),
    y: Math.round(y + frameSize - 2),
    width: Math.round(width),
    height: 3,
    fillWidth: Math.round((width - 2) * hitPoints / maxHitPoints)
  });
}

function validateHull(hitPoints, maxHitPoints) {
  if (!Number.isFinite(hitPoints) || !Number.isFinite(maxHitPoints) ||
      maxHitPoints <= 0 || hitPoints < 0 || hitPoints > maxHitPoints) {
    throw new Error(`Invalid ship hull strength: ${hitPoints}/${maxHitPoints}`);
  }
}
