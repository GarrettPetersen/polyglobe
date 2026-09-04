const STANDARD_BROADSIDE_TUNING = Object.freeze({
  idealRangeRatio: 0.7,
  turnInRangeRatio: 2.1,
  fullTurnRangeRatio: 1.1,
  radialCorrectionRangeRatio: 0.65,
  maximumClosingComponent: 0.85,
  maximumWithdrawingComponent: 1.6
});
const ATTACK_RUN_BROADSIDE_TUNING = Object.freeze({
  idealRangeRatio: 0.62,
  turnInRangeRatio: 1.55,
  fullTurnRangeRatio: 0.88,
  radialCorrectionRangeRatio: 0.54,
  maximumClosingComponent: 0.96,
  maximumWithdrawingComponent: 1.6
});

export const NPC_COMBAT_TACTIC_PURSUIT_ID = "pursuit";
export const NPC_COMBAT_TACTIC_BROADSIDE_ID = "broadside";
export const NPC_COMBAT_TACTIC_ATTACK_RUN_ID = "attack-run";
export const NPC_COMBAT_TACTIC_INTERCEPT_ID = "intercept-broadside";
export const NPC_COMBAT_TACTIC_IDS = Object.freeze([
  NPC_COMBAT_TACTIC_PURSUIT_ID,
  NPC_COMBAT_TACTIC_BROADSIDE_ID,
  NPC_COMBAT_TACTIC_ATTACK_RUN_ID,
  NPC_COMBAT_TACTIC_INTERCEPT_ID
]);
export const NPC_COMBAT_CURRENT_TACTIC_ID = NPC_COMBAT_TACTIC_INTERCEPT_ID;

const NPC_COMBAT_TACTICS = new Map([
  [NPC_COMBAT_TACTIC_PURSUIT_ID, Object.freeze({ navigation: "late-orbit", aim: "current" })],
  [NPC_COMBAT_TACTIC_BROADSIDE_ID, Object.freeze({
    navigation: "broadside",
    navigationTuning: STANDARD_BROADSIDE_TUNING,
    aim: "current"
  })],
  [NPC_COMBAT_TACTIC_ATTACK_RUN_ID, Object.freeze({
    navigation: "broadside",
    navigationTuning: ATTACK_RUN_BROADSIDE_TUNING,
    aim: "current"
  })],
  [NPC_COMBAT_TACTIC_INTERCEPT_ID, Object.freeze({
    navigation: "broadside",
    navigationTuning: STANDARD_BROADSIDE_TUNING,
    aim: "intercept",
    interceptLeadRatio: 0.45
  })]
]);

export function npcCombatNavigationForTactic(tacticId, options) {
  const tactic = npcCombatTactic(tacticId);
  if (tactic.navigation === "broadside") {
    return npcBroadsideNavigationWithTuning(options, tactic.navigationTuning);
  }
  if (tactic.navigation === "late-orbit") return npcLateOrbitNavigation(options);
  throw new Error(`Unknown NPC combat navigation policy: ${tactic.navigation}`);
}

export function validateNpcCombatTacticId(tacticId) {
  npcCombatTactic(tacticId);
  return tacticId;
}

export function npcCombatAimPointForTactic(tacticId, {
  origin,
  target,
  targetVelocity,
  projectileSpeedPx
}) {
  const tactic = npcCombatTactic(tacticId);
  requirePoint(origin, "aim origin");
  requirePoint(target, "aim target");
  requirePoint(targetVelocity, "target velocity");
  requirePositiveFinite(projectileSpeedPx, "projectile speed");
  if (tactic.aim === "current") return Object.freeze({ ...target });
  if (tactic.aim !== "intercept") throw new Error(`Unknown NPC combat aim policy: ${tactic.aim}`);
  const intercept = npcProjectileInterceptPoint({
    origin,
    target,
    targetVelocity,
    projectileSpeedPx
  });
  if (!intercept) return null;
  return Object.freeze({
    x: target.x + (intercept.x - target.x) * tactic.interceptLeadRatio,
    y: target.y + (intercept.y - target.y) * tactic.interceptLeadRatio
  });
}

export function npcProjectileInterceptPoint({
  origin,
  target,
  targetVelocity,
  projectileSpeedPx
}) {
  requirePoint(origin, "intercept origin");
  requirePoint(target, "intercept target");
  requirePoint(targetVelocity, "intercept target velocity");
  requirePositiveFinite(projectileSpeedPx, "projectile speed");
  const relativeX = target.x - origin.x;
  const relativeY = target.y - origin.y;
  const a = targetVelocity.x ** 2 + targetVelocity.y ** 2 - projectileSpeedPx ** 2;
  const b = 2 * (relativeX * targetVelocity.x + relativeY * targetVelocity.y);
  const c = relativeX ** 2 + relativeY ** 2;
  const time = earliestPositiveInterceptSeconds(a, b, c);
  if (time === null) return null;
  return Object.freeze({
    x: target.x + targetVelocity.x * time,
    y: target.y + targetVelocity.y * time
  });
}

export function npcBroadsideNavigation({
  identity,
  origin,
  target,
  heading,
  weaponRangePx,
  routeDistancePx
}) {
  return npcBroadsideNavigationWithTuning({
    identity,
    origin,
    target,
    heading,
    weaponRangePx,
    routeDistancePx
  }, STANDARD_BROADSIDE_TUNING);
}

function npcBroadsideNavigationWithTuning({
  identity,
  origin,
  target,
  heading,
  weaponRangePx,
  routeDistancePx
}, tuning) {
  requireIdentity(identity);
  requirePoint(origin, "origin");
  requirePoint(target, "target");
  const currentHeading = normalized(heading, "heading");
  requirePositiveFinite(weaponRangePx, "weapon range");
  requirePositiveFinite(routeDistancePx, "route distance");

  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1e-6) return null;
  const direct = { x: dx / distance, y: dy / distance };
  const portHeading = { x: -direct.y, y: direct.x };
  const starboardHeading = { x: direct.y, y: -direct.x };
  const broadsideSide = preferredBroadsideSide(
    identity,
    currentHeading,
    portHeading,
    starboardHeading
  );
  const tangent = broadsideSide === "port" ? portHeading : starboardHeading;

  const idealRange = weaponRangePx * tuning.idealRangeRatio;
  let radialComponent = clamp(
    (distance - idealRange) /
      (weaponRangePx * tuning.radialCorrectionRangeRatio),
    -tuning.maximumWithdrawingComponent,
    tuning.maximumClosingComponent
  );
  if (distance < weaponRangePx * 0.38) {
    const danger = 1 - distance / (weaponRangePx * 0.38);
    radialComponent = Math.max(
      -tuning.maximumWithdrawingComponent,
      radialComponent - danger * 0.9
    );
  }
  const broadsideCourse = normalized({
    x: tangent.x + direct.x * radialComponent,
    y: tangent.y + direct.y * radialComponent
  }, "broadside course");
  const turnBlend = clamp(
    (weaponRangePx * tuning.turnInRangeRatio - distance) /
      (weaponRangePx * (
        tuning.turnInRangeRatio - tuning.fullTurnRangeRatio
      )),
    0,
    1
  );
  const course = normalized({
    x: direct.x * (1 - turnBlend) + broadsideCourse.x * turnBlend,
    y: direct.y * (1 - turnBlend) + broadsideCourse.y * turnBlend
  }, "attack course");

  return Object.freeze({
    broadsideSide,
    distance,
    course: Object.freeze(course),
    routePoint: Object.freeze({
      x: origin.x + course.x * routeDistancePx,
      y: origin.y + course.y * routeDistancePx
    })
  });
}

function npcLateOrbitNavigation({
  identity,
  origin,
  target,
  heading,
  weaponRangePx,
  routeDistancePx
}) {
  requireIdentity(identity);
  requirePoint(origin, "origin");
  requirePoint(target, "target");
  const currentHeading = normalized(heading, "heading");
  requirePositiveFinite(weaponRangePx, "weapon range");
  requirePositiveFinite(routeDistancePx, "route distance");
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1e-6) return null;
  const direct = { x: dx / distance, y: dy / distance };
  const orbitSide = (identityHash(identity) & 1) === 0 ? -1 : 1;
  const course = distance > Math.min(68, weaponRangePx * 0.86)
    ? direct
    : rotate(direct, orbitSide * Math.PI / 2);
  return Object.freeze({
    broadsideSide: null,
    distance,
    course: Object.freeze(course),
    routePoint: Object.freeze({
      x: origin.x + course.x * routeDistancePx,
      y: origin.y + course.y * routeDistancePx
    })
  });
}

function npcCombatTactic(tacticId) {
  const tactic = NPC_COMBAT_TACTICS.get(tacticId);
  if (!tactic) throw new Error(`Unknown NPC combat tactic: ${tacticId}`);
  return tactic;
}

function earliestPositiveInterceptSeconds(a, b, c) {
  if (c <= 1e-12) return 0;
  if (Math.abs(a) <= 1e-12) {
    if (Math.abs(b) <= 1e-12) return null;
    const time = -c / b;
    return time >= 0 ? time : null;
  }
  const discriminant = b ** 2 - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const times = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
    .filter((time) => Number.isFinite(time) && time >= 0)
    .sort((left, right) => left - right);
  return times[0] ?? null;
}

function preferredBroadsideSide(identity, heading, portHeading, starboardHeading) {
  const portAlignment = dot(heading, portHeading);
  const starboardAlignment = dot(heading, starboardHeading);
  if (Math.abs(portAlignment - starboardAlignment) > 1e-9) {
    return portAlignment > starboardAlignment ? "port" : "starboard";
  }
  return (identityHash(identity) & 1) === 0 ? "port" : "starboard";
}

function identityHash(identity) {
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index++) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalized(direction, label) {
  requirePoint(direction, label);
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 1e-9) throw new Error(`NPC combat ${label} has zero length`);
  return { x: direction.x / length, y: direction.y / length };
}

function requireIdentity(identity) {
  if (typeof identity !== "string" || identity.length === 0) {
    throw new Error("NPC combat navigation requires a ship identity");
  }
}

function requirePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`NPC combat navigation has invalid ${label}`);
  }
}

function requirePositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`NPC combat navigation has invalid ${label}: ${value}`);
  }
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function rotate(direction, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: direction.x * cosine - direction.y * sine,
    y: direction.x * sine + direction.y * cosine
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
