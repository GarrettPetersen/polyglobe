export const SHIP_MINIMUM_RUDDER_AUTHORITY = 0.25;
export const SHIP_MINIMUM_FORWARD_PROGRESS_ALIGNMENT = 0.01;
export const OAR_PIVOT_BASE_TURN_RATIO = 0.72;
export const OAR_PIVOT_REFERENCE_MASS = 90;
export const OAR_PIVOT_MINIMUM_MASS_SCALE = 0.4;

export function shipTurnRate({
  turnRateRad,
  speedRad,
  topSpeedRad,
  assistedPivot = false,
  assistedMultiplier = 1,
  minimumRudderAuthority = SHIP_MINIMUM_RUDDER_AUTHORITY
}) {
  assertFinitePositive("Ship turn rate", turnRateRad);
  assertFiniteNonNegative("Ship speed", speedRad);
  assertFinitePositive("Ship top speed", topSpeedRad);
  assertFinitePositive("Ship assisted turn multiplier", assistedMultiplier);
  if (!Number.isFinite(minimumRudderAuthority) || minimumRudderAuthority < 0 || minimumRudderAuthority > 1) {
    throw new Error("Ship minimum rudder authority must be between zero and one");
  }

  if (assistedPivot) return turnRateRad * assistedMultiplier;
  return turnRateRad * Math.max(minimumRudderAuthority, Math.min(speedRad / topSpeedRad, 1));
}

export function oarPivotTurnRate({ turnRateRad, mass, rowerRatio }) {
  assertFinitePositive("Oar pivot turn rate", turnRateRad);
  assertFinitePositive("Oar pivot ship mass", mass);
  if (!Number.isFinite(rowerRatio) || rowerRatio < 0 || rowerRatio > 1) {
    throw new Error("Oar pivot rower ratio must be between zero and one");
  }
  const massScale = Math.max(
    OAR_PIVOT_MINIMUM_MASS_SCALE,
    Math.min(1, Math.sqrt(OAR_PIVOT_REFERENCE_MASS / mass))
  );
  return turnRateRad * OAR_PIVOT_BASE_TURN_RATIO * massScale * Math.sqrt(rowerRatio);
}

export function updateBoundaryContactLatch({
  latchedContact,
  probedContact,
  collisionNormal,
  collided,
  movedPx,
  releaseDistancePx
}) {
  assertFiniteNonNegative("Ship boundary movement", movedPx);
  assertFinitePositive("Ship boundary release distance", releaseDistancePx);
  assertOptionalContact("Latched ship boundary contact", latchedContact);
  assertOptionalContact("Probed ship boundary contact", probedContact);
  if (collisionNormal !== null) assertUnitVector3("Ship collision normal", collisionNormal);

  if (collided) {
    return {
      normal: collisionNormal || probedContact?.normal || latchedContact?.normal || null,
      clearTravelPx: 0
    };
  }
  if (probedContact) return { normal: probedContact.normal, clearTravelPx: 0 };
  if (!latchedContact) return null;

  const clearTravelPx = latchedContact.clearTravelPx + movedPx;
  return clearTravelPx >= releaseDistancePx
    ? null
    : { normal: latchedContact.normal, clearTravelPx };
}

export function contactPushOffVelocity({
  velocity,
  desiredDirection,
  obstacleNormal,
  minimumEscapeSpeedRad
}) {
  assertVector3("Ship velocity", velocity);
  assertUnitVector3("Ship desired direction", desiredDirection);
  assertUnitVector3("Ship obstacle normal", obstacleNormal);
  assertFinitePositive("Ship minimum escape speed", minimumEscapeSpeedRad);

  if (dot3(desiredDirection, obstacleNormal) >= -0.05) return velocity.slice();

  const intoBankSpeed = Math.max(0, dot3(velocity, obstacleNormal));
  const withoutBankwardVelocity = [
    velocity[0] - obstacleNormal[0] * intoBankSpeed,
    velocity[1] - obstacleNormal[1] * intoBankSpeed,
    velocity[2] - obstacleNormal[2] * intoBankSpeed
  ];
  const desiredSpeed = dot3(withoutBankwardVelocity, desiredDirection);
  const addedSpeed = Math.max(0, minimumEscapeSpeedRad - desiredSpeed);
  return [
    withoutBankwardVelocity[0] + desiredDirection[0] * addedSpeed,
    withoutBankwardVelocity[1] + desiredDirection[1] * addedSpeed,
    withoutBankwardVelocity[2] + desiredDirection[2] * addedSpeed
  ];
}

export function shipDirectionMakesForwardProgress({
  direction,
  desiredDirection,
  minimumAlignment = SHIP_MINIMUM_FORWARD_PROGRESS_ALIGNMENT
}) {
  assertUnitVector3("Ship navigation direction", direction);
  assertUnitVector3("Ship desired navigation direction", desiredDirection);
  if (!Number.isFinite(minimumAlignment) || minimumAlignment < 0 || minimumAlignment > 1) {
    throw new Error("Ship minimum forward alignment must be between zero and one");
  }
  return dot3(direction, desiredDirection) >= minimumAlignment;
}

function assertFinitePositive(label, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a finite positive number`);
}

function assertFiniteNonNegative(label, value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number`);
}

function assertVector3(label, value) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((component) => !Number.isFinite(component))) {
    throw new Error(`${label} must be a finite three-component vector`);
  }
}

function assertUnitVector3(label, value) {
  assertVector3(label, value);
  const length = Math.hypot(value[0], value[1], value[2]);
  if (Math.abs(length - 1) > 1e-4) throw new Error(`${label} must be normalized`);
}

function assertOptionalContact(label, contact) {
  if (contact === null) return;
  if (!contact || !Number.isFinite(contact.clearTravelPx) || contact.clearTravelPx < 0) {
    throw new Error(`${label} must contain finite non-negative clear travel`);
  }
  if (contact.normal !== null) assertUnitVector3(`${label} normal`, contact.normal);
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
