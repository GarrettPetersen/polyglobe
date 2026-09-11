import { PORT_ASSAULT_CHARGE_FLIGHT_MS, PORT_ASSAULT_CHARGE_BOUNCE_MS, PORT_ASSAULT_CHARGE_MOTION_MS } from "../src/portAssaultCharge.js";
export { PORT_ASSAULT_TRACK_SPAN_PX as CITY_ASSAULT_TRACK_SPAN_PX,
  PORT_ASSAULT_GROUND_DEPTH_SCALE as CITY_ASSAULT_GROUND_DEPTH_SCALE } from "../src/portAssaultGround.js";
export const CITY_ASSAULT_JUMP_ARC_HEIGHT_PX = 18;
export const CITY_ASSAULT_MIN_FORWARD_JUMP_PX = 12;
export const CITY_ASSAULT_MELEE_LUNGE_DURATION_MS = 120;
export const CITY_ASSAULT_KNOCKBACK_DURATION_MS = 240;

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

// The simulation has already moved the body. Ease from its previous position
// into that retained displacement; never spring back to the old formation slot.
export function cityAssaultMeleeLungeOffset({ deltaX, deltaY, elapsedMs }) {
  return displacementOffset(deltaX, deltaY, elapsedMs, CITY_ASSAULT_MELEE_LUNGE_DURATION_MS, 2);
}

export function cityAssaultKnockbackOffset({ deltaX, deltaY, elapsedMs }) {
  return displacementOffset(deltaX, deltaY, elapsedMs, CITY_ASSAULT_KNOCKBACK_DURATION_MS, 4);
}

function displacementOffset(deltaX, deltaY, elapsedMs, durationMs, hopPx) {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) throw new Error("Invalid assault displacement");
  requireMotionTiming(elapsedMs, durationMs, "displacement");
  if (elapsedMs >= durationMs || (deltaX === 0 && deltaY === 0)) return Object.freeze({ x: 0, y: 0 });
  const progress = elapsedMs / durationMs;
  const remaining = (1 - progress) ** 2;
  return Object.freeze({
    x: Math.round(-deltaX * remaining) || 0,
    y: Math.round(-deltaY * remaining - hopPx * 4 * progress * (1 - progress)) || 0
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

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}


export function cityAssaultChargeOffset({deltaX,deltaY,elapsedMs}) {
  requireMotionTiming(elapsedMs,PORT_ASSAULT_CHARGE_MOTION_MS,"charge");
  if (![deltaX,deltaY].every(Number.isFinite)) throw new Error("Invalid charge displacement");
  const progress = Math.min(1,elapsedMs / PORT_ASSAULT_CHARGE_FLIGHT_MS);
  const groundY = -deltaY * (1-progress);
  const bounce = Math.max(0,Math.min(1,(elapsedMs-PORT_ASSAULT_CHARGE_FLIGHT_MS)/PORT_ASSAULT_CHARGE_BOUNCE_MS));
  const height = elapsedMs < PORT_ASSAULT_CHARGE_FLIGHT_MS
    ? 28 * 4 * progress * (1-progress) : 6 * 4 * bounce * (1-bounce);
  return {x:Math.round(-deltaX*(1-progress)) || 0,y:Math.round(groundY-height) || 0,groundY:Math.round(groundY) || 0};
}
