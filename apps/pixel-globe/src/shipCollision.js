import { shipFootprintCollision } from "./shipFootprint.js";

export const SHIP_COLLISION_RESTITUTION = 0.48;
export const SHIP_COLLISION_MIN_DAMAGE_SPEED_PX = 1.5;

export function advanceCollisionMomentum(
  velocity,
  dt,
  { dampingPerSecond, minimumSpeed }
) {
  validateMomentumVector(velocity);
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid collision momentum dt: ${dt}`);
  if (!Number.isFinite(dampingPerSecond) || dampingPerSecond < 0) {
    throw new Error(`Invalid collision momentum damping: ${dampingPerSecond}`);
  }
  if (!Number.isFinite(minimumSpeed) || minimumSpeed < 0) {
    throw new Error(`Invalid collision momentum minimum speed: ${minimumSpeed}`);
  }

  const speed = Math.hypot(...velocity);
  if (speed < minimumSpeed) {
    return {
      active: false,
      displacement: velocity.map(() => 0),
      velocity: velocity.map(() => 0)
    };
  }

  const damping = Math.exp(-dampingPerSecond * dt);
  const displacementScale = dampingPerSecond > 0
    ? (1 - damping) / dampingPerSecond
    : dt;
  const nextVelocity = velocity.map((value) => value * damping);
  if (Math.hypot(...nextVelocity) < minimumSpeed) nextVelocity.fill(0);
  return {
    active: true,
    displacement: velocity.map((value) => value * displacementScale),
    velocity: nextVelocity
  };
}

const BOW_HIT_VULNERABILITY = 0.55;
const SIDE_HIT_VULNERABILITY = 1.55;
const STERN_HIT_VULNERABILITY = 1.1;
const BASE_COLLISION_DAMAGE = 0.65;
const BOW_RAM_DAMAGE_BONUS = 1.75;
const BOW_RAM_SELF_PROTECTION = 0.5;

export function resolveShipCollision(a, b) {
  validateBody(a);
  validateBody(b);
  if (a.id === b.id) throw new Error(`Cannot collide ship ${a.id} with itself`);

  const overlap = shipFootprintCollision(a.footprint, b.footprint);
  if (!overlap) return null;
  const normal = overlap.normal;
  const penetration = overlap.penetration;
  const inverseMassA = 1 / a.mass;
  const inverseMassB = 1 / b.mass;
  const inverseMassSum = inverseMassA + inverseMassB;
  const relativeNormalSpeed = (b.vx - a.vx) * normal.x + (b.vy - a.vy) * normal.y;
  const closingSpeed = Math.max(0, -relativeNormalSpeed);
  let impulse = 0;
  if (closingSpeed > 0) {
    impulse = (1 + SHIP_COLLISION_RESTITUTION) * closingSpeed / inverseMassSum;
  }

  const impactA = collisionImpact(a, b, normal, closingSpeed);
  const impactB = collisionImpact(b, a, opposite(normal), closingSpeed);
  return {
    a: {
      vx: a.vx - normal.x * impulse * inverseMassA,
      vy: a.vy - normal.y * impulse * inverseMassA,
      correctionX: -normal.x * penetration * inverseMassA / inverseMassSum,
      correctionY: -normal.y * penetration * inverseMassA / inverseMassSum,
      damage: impactA.damage,
      impact: impactA.geometry
    },
    b: {
      vx: b.vx + normal.x * impulse * inverseMassB,
      vy: b.vy + normal.y * impulse * inverseMassB,
      correctionX: normal.x * penetration * inverseMassB / inverseMassSum,
      correctionY: normal.y * penetration * inverseMassB / inverseMassSum,
      damage: impactB.damage,
      impact: impactB.geometry
    },
    closingSpeed,
    penetration
  };
}

export function separateTouchingShips(a, b, padding = 2) {
  validateBody(a);
  validateBody(b);
  if (a.id === b.id) throw new Error(`Cannot separate ship ${a.id} from itself`);
  if (!Number.isFinite(padding) || padding < 0) throw new Error(`Invalid ship separation padding: ${padding}`);

  const overlap = shipFootprintCollision(a.footprint, b.footprint, padding);
  if (!overlap) return null;
  const normal = overlap.normal;
  const penetration = overlap.penetration;
  const inverseMassA = 1 / a.mass;
  const inverseMassB = 1 / b.mass;
  const inverseMassSum = inverseMassA + inverseMassB;
  return {
    a: {
      correctionX: -normal.x * penetration * inverseMassA / inverseMassSum,
      correctionY: -normal.y * penetration * inverseMassA / inverseMassSum
    },
    b: {
      correctionX: normal.x * penetration * inverseMassB / inverseMassSum,
      correctionY: normal.y * penetration * inverseMassB / inverseMassSum
    },
    penetration
  };
}

function collisionImpact(body, other, directionToOther, closingSpeed) {
  const bodyHeading = normalizedHeading(body);
  const otherHeading = normalizedHeading(other);
  const contactProjection = dot(bodyHeading, directionToOther);
  const bowExposure = Math.max(0, contactProjection);
  const sternExposure = Math.max(0, -contactProjection);
  const sideExposure = 1 - Math.abs(contactProjection);
  const incomingBow = bowRammingStrength(other, body, opposite(directionToOther), otherHeading, closingSpeed);
  const outgoingBow = bowRammingStrength(body, other, directionToOther, bodyHeading, closingSpeed);
  const geometry = {
    bowExposure,
    sideExposure,
    sternExposure,
    incomingBow,
    outgoingBow
  };
  if (closingSpeed < SHIP_COLLISION_MIN_DAMAGE_SPEED_PX) return { damage: 0, geometry };

  const hitVulnerability =
    bowExposure * BOW_HIT_VULNERABILITY +
    sideExposure * SIDE_HIT_VULNERABILITY +
    sternExposure * STERN_HIT_VULNERABILITY;
  const massFactor = clamp(Math.pow(other.mass / body.mass, 0.25), 0.7, 1.55);
  const ramFactor = BASE_COLLISION_DAMAGE + incomingBow * BOW_RAM_DAMAGE_BONUS;
  const selfProtection = 1 - outgoingBow * BOW_RAM_SELF_PROTECTION;
  const rawDamage = closingSpeed / 4.5 * massFactor * hitVulnerability * ramFactor * selfProtection;
  return {
    damage: rawDamage >= 0.65 ? Math.max(1, Math.round(rawDamage)) : 0,
    geometry
  };
}

function bowRammingStrength(rammer, target, directionToTarget, heading, closingSpeed) {
  if (closingSpeed <= 0) return 0;
  const bowAlignment = clamp(dot(heading, directionToTarget), 0, 1);
  if (bowAlignment <= 0) return 0;
  const forwardSpeed = Math.max(0, rammer.vx * heading.x + rammer.vy * heading.y);
  const relativeApproach = Math.max(
    0,
    (rammer.vx - target.vx) * directionToTarget.x + (rammer.vy - target.vy) * directionToTarget.y
  );
  const drivenShare = clamp(Math.min(forwardSpeed * bowAlignment, relativeApproach) / closingSpeed, 0, 1);
  return bowAlignment * bowAlignment * drivenShare;
}

function normalizedHeading(body) {
  const length = Math.hypot(body.headingX, body.headingY);
  return { x: body.headingX / length, y: body.headingY / length };
}

function opposite(vector) {
  return { x: -vector.x, y: -vector.y };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function validateBody(body) {
  if (!body || typeof body.id !== "string" || body.id === "") throw new Error("Ship collision body needs an id");
  for (const field of ["x", "y", "vx", "vy", "headingX", "headingY", "mass"]) {
    if (!Number.isFinite(body[field])) throw new Error(`Invalid ${field} for collision ship ${body.id}`);
  }
  if (body.mass <= 0) throw new Error(`Invalid dimensions for collision ship ${body.id}`);
  if (!Array.isArray(body.footprint) || body.footprint.length < 3) {
    throw new Error(`Collision ship ${body.id} needs a hull footprint`);
  }
  if (Math.hypot(body.headingX, body.headingY) <= 1e-6) throw new Error(`Invalid heading for collision ship ${body.id}`);
  return body;
}

function validateMomentumVector(velocity) {
  if (!Array.isArray(velocity) || velocity.length < 2 || !velocity.every(Number.isFinite)) {
    throw new Error("Collision momentum requires a finite vector with at least two dimensions");
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
