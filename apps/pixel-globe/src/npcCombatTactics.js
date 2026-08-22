const BROADSIDE_IDEAL_RANGE_RATIO = 0.7;
const BROADSIDE_TURN_IN_RANGE_RATIO = 2.1;
const BROADSIDE_FULL_TURN_RANGE_RATIO = 1.1;
const BROADSIDE_RADIAL_CORRECTION_RANGE_RATIO = 0.65;
const BROADSIDE_MAX_CLOSING_COMPONENT = 0.85;
const BROADSIDE_MAX_WITHDRAWING_COMPONENT = 1.6;

export function npcBroadsideNavigation({
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
  const portHeading = { x: -direct.y, y: direct.x };
  const starboardHeading = { x: direct.y, y: -direct.x };
  const broadsideSide = preferredBroadsideSide(
    identity,
    currentHeading,
    portHeading,
    starboardHeading
  );
  const tangent = broadsideSide === "port" ? portHeading : starboardHeading;

  const idealRange = weaponRangePx * BROADSIDE_IDEAL_RANGE_RATIO;
  let radialComponent = clamp(
    (distance - idealRange) /
      (weaponRangePx * BROADSIDE_RADIAL_CORRECTION_RANGE_RATIO),
    -BROADSIDE_MAX_WITHDRAWING_COMPONENT,
    BROADSIDE_MAX_CLOSING_COMPONENT
  );
  if (distance < weaponRangePx * 0.38) {
    const danger = 1 - distance / (weaponRangePx * 0.38);
    radialComponent = Math.max(
      -BROADSIDE_MAX_WITHDRAWING_COMPONENT,
      radialComponent - danger * 0.9
    );
  }
  const broadsideCourse = normalized({
    x: tangent.x + direct.x * radialComponent,
    y: tangent.y + direct.y * radialComponent
  }, "broadside course");
  const turnBlend = clamp(
    (weaponRangePx * BROADSIDE_TURN_IN_RANGE_RATIO - distance) /
      (weaponRangePx * (
        BROADSIDE_TURN_IN_RANGE_RATIO - BROADSIDE_FULL_TURN_RANGE_RATIO
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

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
