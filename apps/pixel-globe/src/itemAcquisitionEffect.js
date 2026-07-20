export const ITEM_ACQUISITION_EFFECT_DURATION_MS = 700;

const ITEM_ACQUISITION_ARC_HEIGHT_PX = 14;
const ITEM_ACQUISITION_EDGE_MARGIN_PX = 2;

export function createItemAcquisitionEffect({
  iconId,
  startX,
  startY,
  startedAtMs,
  iconSize
}) {
  if (typeof iconId !== "string" || iconId.length === 0) {
    throw new Error("Item acquisition effect requires an icon id");
  }
  for (const [label, value] of Object.entries({ startX, startY, startedAtMs, iconSize })) {
    if (!Number.isFinite(value)) {
      throw new Error(`Item acquisition effect has invalid ${label}: ${value}`);
    }
  }
  if (!Number.isInteger(iconSize) || iconSize <= 0) {
    throw new Error(`Item acquisition effect requires a positive integer icon size: ${iconSize}`);
  }
  return Object.freeze({
    iconId,
    startX: Math.round(startX),
    startY: Math.round(startY),
    targetX: -iconSize - ITEM_ACQUISITION_EDGE_MARGIN_PX,
    targetY: -iconSize - ITEM_ACQUISITION_EDGE_MARGIN_PX,
    startedAtMs
  });
}

export function itemAcquisitionEffectFrame(effect, nowMs) {
  validateEffect(effect);
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid item acquisition frame time: ${nowMs}`);
  const elapsedMs = Math.max(0, nowMs - effect.startedAtMs);
  if (elapsedMs >= ITEM_ACQUISITION_EFFECT_DURATION_MS) {
    return Object.freeze({ complete: true, x: effect.targetX, y: effect.targetY });
  }
  const progress = clamp(elapsedMs / ITEM_ACQUISITION_EFFECT_DURATION_MS, 0, 1);
  const flight = smootherstep(progress);
  const arc = Math.sin(Math.PI * progress) * ITEM_ACQUISITION_ARC_HEIGHT_PX;
  return Object.freeze({
    complete: false,
    x: Math.round(lerp(effect.startX, effect.targetX, flight)),
    y: Math.round(lerp(effect.startY, effect.targetY, flight) - arc)
  });
}

export function itemAcquisitionEffectComplete(effect, nowMs) {
  validateEffect(effect);
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid item acquisition completion time: ${nowMs}`);
  return nowMs - effect.startedAtMs >= ITEM_ACQUISITION_EFFECT_DURATION_MS;
}

function validateEffect(effect) {
  if (!effect || typeof effect !== "object") throw new Error("Invalid item acquisition effect");
  if (typeof effect.iconId !== "string" || effect.iconId.length === 0) {
    throw new Error("Invalid item acquisition effect icon id");
  }
  for (const key of ["startX", "startY", "targetX", "targetY", "startedAtMs"]) {
    if (!Number.isFinite(effect[key])) throw new Error(`Invalid item acquisition effect ${key}`);
  }
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function smootherstep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
