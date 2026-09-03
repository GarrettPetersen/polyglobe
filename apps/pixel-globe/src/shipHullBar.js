import { shipCombatAllegianceColor } from "./shipCombatPresentation.js";

export function shipHullIsDamaged(hitPoints, maxHitPoints) {
  validateHull(hitPoints, maxHitPoints);
  return hitPoints < maxHitPoints - 1e-8;
}

export function npcShipHullBarColor(combatAllegiance) {
  return shipCombatAllegianceColor(combatAllegiance);
}

export function shipHullBarLayout({ x, y, frameSize, hitPoints, maxHitPoints, width = 20 }) {
  for (const [label, value] of Object.entries({ x, y, frameSize, width })) {
    if (!Number.isFinite(value)) throw new Error(`Ship hull bar ${label} must be finite: ${value}`);
  }
  if (frameSize <= 0 || width < 3 || width > frameSize) {
    throw new Error(`Ship hull bar dimensions are invalid: ${width}/${frameSize}`);
  }
  return shipHullBarLayoutBelowRect({
    x,
    y,
    width: frameSize,
    height: frameSize - 2,
    hitPoints,
    maxHitPoints,
    barWidth: width
  });
}

export function shipHullBarLayoutBelowRect({
  x,
  y,
  width,
  height,
  hitPoints,
  maxHitPoints,
  barWidth = 20,
  gap = 0
}) {
  validateHull(hitPoints, maxHitPoints);
  for (const [label, value] of Object.entries({ x, y, width, height, barWidth, gap })) {
    if (!Number.isFinite(value)) throw new Error(`Ship hull bar ${label} must be finite: ${value}`);
  }
  if (width <= 0 || height <= 0 || barWidth < 3 || barWidth > width || gap < 0) {
    throw new Error(`Ship hull bar rectangle is invalid: ${width}x${height}/${barWidth}+${gap}`);
  }
  return Object.freeze({
    x: Math.round(x + (width - barWidth) / 2),
    y: Math.round(y + height + gap),
    width: Math.round(barWidth),
    height: 3,
    fillWidth: Math.round((barWidth - 2) * hitPoints / maxHitPoints)
  });
}

function validateHull(hitPoints, maxHitPoints) {
  if (!Number.isFinite(hitPoints) || !Number.isFinite(maxHitPoints) ||
      maxHitPoints <= 0 || hitPoints < 0 || hitPoints > maxHitPoints) {
    throw new Error(`Invalid ship hull strength: ${hitPoints}/${maxHitPoints}`);
  }
}
