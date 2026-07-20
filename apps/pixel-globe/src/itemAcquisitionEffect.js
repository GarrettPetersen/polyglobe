export const ITEM_ACQUISITION_EFFECT_DURATION_MS = 700;

const ITEM_ACQUISITION_ARC_HEIGHT_PX = 14;
const ITEM_ACQUISITION_EDGE_MARGIN_PX = 2;
const ITEM_ACQUISITION_BURST_SPREAD_PX = 9;
const ITEM_ACQUISITION_BURST_TOTAL_STAGGER_MS = 2600;
const ITEM_ACQUISITION_BURST_MIN_STAGGER_MS = 18;
const ITEM_ACQUISITION_BURST_MAX_STAGGER_MS = 90;
const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5));

export function createItemAcquisitionEffect({
  iconId,
  startX,
  startY,
  startedAtMs,
  iconSize,
  targetX = -iconSize - ITEM_ACQUISITION_EDGE_MARGIN_PX,
  targetY = -iconSize - ITEM_ACQUISITION_EDGE_MARGIN_PX,
  arrivalSoundId = null
}) {
  if (typeof iconId !== "string" || iconId.length === 0) {
    throw new Error("Item acquisition effect requires an icon id");
  }
  for (const [label, value] of Object.entries({ startX, startY, startedAtMs, iconSize, targetX, targetY })) {
    if (!Number.isFinite(value)) {
      throw new Error(`Item acquisition effect has invalid ${label}: ${value}`);
    }
  }
  if (!Number.isInteger(iconSize) || iconSize <= 0) {
    throw new Error(`Item acquisition effect requires a positive integer icon size: ${iconSize}`);
  }
  if (arrivalSoundId !== null && (typeof arrivalSoundId !== "string" || arrivalSoundId.length === 0)) {
    throw new Error("Item acquisition effect has an invalid arrival sound id");
  }
  return Object.freeze({
    iconId,
    startX: Math.round(startX),
    startY: Math.round(startY),
    targetX: Math.round(targetX),
    targetY: Math.round(targetY),
    startedAtMs,
    arrivalSoundId
  });
}

export function createItemAcquisitionBurst({
  iconId,
  count,
  startCenterX,
  startCenterY,
  targetCenterX,
  targetCenterY,
  startedAtMs,
  iconSize,
  arrivalSoundId = null
}) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`Item acquisition burst requires a positive integer count: ${count}`);
  }
  for (const [label, value] of Object.entries({
    startCenterX,
    startCenterY,
    targetCenterX,
    targetCenterY,
    startedAtMs,
    iconSize
  })) {
    if (!Number.isFinite(value)) throw new Error(`Item acquisition burst has invalid ${label}: ${value}`);
  }
  const staggerMs = count <= 1
    ? 0
    : clamp(
      Math.floor(ITEM_ACQUISITION_BURST_TOTAL_STAGGER_MS / (count - 1)),
      ITEM_ACQUISITION_BURST_MIN_STAGGER_MS,
      ITEM_ACQUISITION_BURST_MAX_STAGGER_MS
    );
  const halfIcon = iconSize / 2;
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const distance = ITEM_ACQUISITION_BURST_SPREAD_PX * Math.sqrt((index + 0.5) / count);
    const angle = index * GOLDEN_ANGLE_RADIANS;
    return createItemAcquisitionEffect({
      iconId,
      startX: startCenterX - halfIcon + Math.cos(angle) * distance,
      startY: startCenterY - halfIcon + Math.sin(angle) * distance,
      targetX: targetCenterX - halfIcon,
      targetY: targetCenterY - halfIcon,
      startedAtMs: startedAtMs + index * staggerMs,
      iconSize,
      arrivalSoundId
    });
  }));
}

export function itemAcquisitionEffectFrame(effect, nowMs) {
  validateEffect(effect);
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid item acquisition frame time: ${nowMs}`);
  if (nowMs < effect.startedAtMs) {
    return Object.freeze({ pending: true, complete: false, x: effect.startX, y: effect.startY });
  }
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

export function itemAcquisitionEffectEndMs(effect) {
  validateEffect(effect);
  return effect.startedAtMs + ITEM_ACQUISITION_EFFECT_DURATION_MS;
}

function validateEffect(effect) {
  if (!effect || typeof effect !== "object") throw new Error("Invalid item acquisition effect");
  if (typeof effect.iconId !== "string" || effect.iconId.length === 0) {
    throw new Error("Invalid item acquisition effect icon id");
  }
  for (const key of ["startX", "startY", "targetX", "targetY", "startedAtMs"]) {
    if (!Number.isFinite(effect[key])) throw new Error(`Invalid item acquisition effect ${key}`);
  }
  if (effect.arrivalSoundId !== null &&
      (typeof effect.arrivalSoundId !== "string" || effect.arrivalSoundId.length === 0)) {
    throw new Error("Invalid item acquisition effect arrival sound id");
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
