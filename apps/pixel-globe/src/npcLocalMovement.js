import {
  SHIP_MINIMUM_POWERED_SPEED_RAD,
  shipPropulsionPerformance
} from "./shipPropulsion.js";

export function npcLocalResponseSpeedPx(stats, {
  windStrength,
  sailEfficiency,
  rowerRatio,
  nominalSpeedPx
}) {
  if (!Number.isFinite(nominalSpeedPx) || nominalSpeedPx <= 0) {
    throw new Error(`Invalid NPC local response speed: ${nominalSpeedPx}`);
  }
  const propulsion = shipPropulsionPerformance(stats, {
    windStrength,
    sailEfficiency,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD,
    rowerRatio
  });
  if (propulsion.stalled) return 0;
  const attainableRatio = clamp(propulsion.maxSpeedRad / stats.topSpeedRad, 0, 1);
  return nominalSpeedPx * attainableRatio;
}

export function npcVisualMovementStepPx({
  distancePx,
  maxStepPx,
  routeAdvancePx,
  catchupPx,
  stormResponsePx,
  localResponsePx,
  riverRailPx,
  localNavigationActive
}) {
  for (const [label, value] of Object.entries({
    distancePx,
    maxStepPx,
    routeAdvancePx,
    catchupPx,
    stormResponsePx,
    localResponsePx,
    riverRailPx
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid NPC visual movement ${label}: ${value}`);
    }
  }
  if (maxStepPx <= 0) throw new Error(`NPC visual movement needs a positive step cap: ${maxStepPx}`);
  if (typeof localNavigationActive !== "boolean") {
    throw new Error(`Invalid NPC local navigation state: ${localNavigationActive}`);
  }
  const strategicProgressPx = localNavigationActive ? 0 : routeAdvancePx + catchupPx;
  return Math.min(
    distancePx,
    maxStepPx,
    Math.max(strategicProgressPx, stormResponsePx, localResponsePx, riverRailPx)
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
