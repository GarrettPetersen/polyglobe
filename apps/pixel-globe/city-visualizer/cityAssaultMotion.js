export const CITY_ASSAULT_TRACK_SPAN_PX = 640;
export const CITY_ASSAULT_GROUND_DEPTH_SCALE = 0.5;
export const CITY_ASSAULT_JUMP_ARC_HEIGHT_PX = 18;
export const CITY_ASSAULT_MIN_FORWARD_JUMP_PX = 12;
export const CITY_ASSAULT_MELEE_LUNGE_DURATION_MS = 280;
export const CITY_ASSAULT_KNOCKBACK_DURATION_MS = 360;

export function cityAssaultJumpPoint({
  start,
  end,
  elapsedMs,
  durationMs,
  arcHeightPx = CITY_ASSAULT_JUMP_ARC_HEIGHT_PX
}) {
  requirePoint(start, "jump start");
  requirePoint(end, "jump end");
  requireMotionTiming(elapsedMs, durationMs, "jump");
  if (!Number.isFinite(arcHeightPx) || arcHeightPx <= 0) {
    throw new Error(`Invalid city assault jump height: ${arcHeightPx}`);
  }
  const progress = clamp01(elapsedMs / durationMs);
  const arc = 4 * progress * (1 - progress);
  return Object.freeze({
    x: Math.round(start.x + (end.x - start.x) * progress),
    y: Math.round(start.y + (end.y - start.y) * progress - arcHeightPx * arc)
  });
}

export function cityAssaultForwardEntryShift({ baselineEntryX, deckStartX }) {
  if (!Number.isFinite(baselineEntryX) || !Number.isFinite(deckStartX)) {
    throw new Error(`Invalid city assault entry geometry: ${baselineEntryX}/${deckStartX}`);
  }
  return Math.max(
    0,
    Math.ceil(deckStartX + CITY_ASSAULT_MIN_FORWARD_JUMP_PX - baselineEntryX)
  );
}

export function cityAssaultLaneX({ baselineX, position, entryPosition, entryShiftX }) {
  if (!Number.isFinite(baselineX) || !Number.isFinite(position) ||
      !Number.isFinite(entryPosition) || !Number.isFinite(entryShiftX) || entryShiftX < 0) {
    throw new Error(
      `Invalid city assault lane geometry: ${baselineX}/${position}/${entryPosition}/${entryShiftX}`
    );
  }
  if (position < 0 || position > 1 || entryPosition <= 0 || entryPosition >= 1) {
    throw new Error(`Invalid city assault lane position: ${position}/${entryPosition}`);
  }
  const shiftWeight = position <= entryPosition
    ? 1
    : (1 - position) / (1 - entryPosition);
  return Math.round(baselineX + entryShiftX * shiftWeight);
}

export function cityAssaultMeleeLungeOffset(side, elapsedMs) {
  requireSide(side);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error(`Invalid city assault melee-lunge time: ${elapsedMs}`);
  }
  if (elapsedMs >= CITY_ASSAULT_MELEE_LUNGE_DURATION_MS) return Object.freeze({ x: 0, y: 0 });
  const progress = elapsedMs / CITY_ASSAULT_MELEE_LUNGE_DURATION_MS;
  const arc = 4 * progress * (1 - progress);
  const direction = side === "attacker" ? 1 : -1;
  return Object.freeze({
    x: Math.round(direction * 5 * arc),
    y: arc === 0 ? 0 : Math.round(-2 * arc)
  });
}

export function cityAssaultKnockbackOffset({ knockbackPx, elapsedMs }) {
  if (!Number.isFinite(knockbackPx) || knockbackPx === 0) {
    throw new Error(`Invalid city assault knockback distance: ${knockbackPx}`);
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error(`Invalid city assault knockback time: ${elapsedMs}`);
  }
  if (elapsedMs >= CITY_ASSAULT_KNOCKBACK_DURATION_MS) return Object.freeze({ x: 0, y: 0 });
  const progress = elapsedMs / CITY_ASSAULT_KNOCKBACK_DURATION_MS;
  const arc = 4 * progress * (1 - progress);
  return Object.freeze({
    x: Math.round(-knockbackPx * (1 - progress)),
    y: arc === 0 ? 0 : Math.round(-5 * arc)
  });
}

function requirePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`Invalid city assault ${label}`);
  }
}

function requireMotionTiming(elapsedMs, durationMs, label) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 ||
      !Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`Invalid city assault ${label} timing: ${elapsedMs}/${durationMs}`);
  }
}

function requireSide(side) {
  if (side !== "attacker" && side !== "defender") {
    throw new Error(`Invalid city assault side: ${side}`);
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
