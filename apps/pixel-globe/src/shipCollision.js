export const SHIP_COLLISION_RESTITUTION = 0.48;
export const SHIP_COLLISION_MIN_DAMAGE_SPEED_PX = 1.5;

export function shipCollisionRadius(mass) {
  if (!Number.isFinite(mass) || mass <= 0) throw new Error(`Invalid ship mass: ${mass}`);
  return clamp(5 + Math.sqrt(mass) / 5, 6, 10);
}

export function resolveShipCollision(a, b) {
  validateBody(a);
  validateBody(b);
  if (a.id === b.id) throw new Error(`Cannot collide ship ${a.id} with itself`);

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minimumDistance = a.radius + b.radius;
  if (distance >= minimumDistance) return null;

  const normal = collisionNormal(a, b, dx, dy, distance);
  const penetration = minimumDistance - distance;
  const inverseMassA = 1 / a.mass;
  const inverseMassB = 1 / b.mass;
  const inverseMassSum = inverseMassA + inverseMassB;
  const relativeNormalSpeed = (b.vx - a.vx) * normal.x + (b.vy - a.vy) * normal.y;
  const closingSpeed = Math.max(0, -relativeNormalSpeed);
  let impulse = 0;
  if (closingSpeed > 0) {
    impulse = (1 + SHIP_COLLISION_RESTITUTION) * closingSpeed / inverseMassSum;
  }

  return {
    a: {
      vx: a.vx - normal.x * impulse * inverseMassA,
      vy: a.vy - normal.y * impulse * inverseMassA,
      correctionX: -normal.x * penetration * inverseMassA / inverseMassSum,
      correctionY: -normal.y * penetration * inverseMassA / inverseMassSum,
      damage: collisionDamage(a, b, normal, closingSpeed)
    },
    b: {
      vx: b.vx + normal.x * impulse * inverseMassB,
      vy: b.vy + normal.y * impulse * inverseMassB,
      correctionX: normal.x * penetration * inverseMassB / inverseMassSum,
      correctionY: normal.y * penetration * inverseMassB / inverseMassSum,
      damage: collisionDamage(b, a, normal, closingSpeed)
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

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minimumDistance = a.radius + b.radius + padding;
  if (distance >= minimumDistance) return null;

  const normal = collisionNormal(a, b, dx, dy, distance);
  const penetration = minimumDistance - distance;
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

function collisionDamage(body, other, normal, closingSpeed) {
  if (closingSpeed < SHIP_COLLISION_MIN_DAMAGE_SPEED_PX) return 0;
  const headingLength = Math.hypot(body.headingX, body.headingY);
  const headingDot = Math.abs((body.headingX * normal.x + body.headingY * normal.y) / headingLength);
  const sideExposure = 1 - clamp(headingDot, 0, 1);
  const massDisadvantage = clamp(Math.sqrt(other.mass / body.mass), 0.45, 2.6);
  const rawDamage = closingSpeed / 4.5 * massDisadvantage * (0.55 + sideExposure * 0.9);
  return rawDamage >= 0.65 ? Math.max(1, Math.round(rawDamage)) : 0;
}

function collisionNormal(a, b, dx, dy, distance) {
  if (distance > 1e-6) return { x: dx / distance, y: dy / distance };
  const relativeX = a.vx - b.vx;
  const relativeY = a.vy - b.vy;
  const relativeLength = Math.hypot(relativeX, relativeY);
  if (relativeLength > 1e-6) return { x: relativeX / relativeLength, y: relativeY / relativeLength };
  return a.id < b.id ? { x: 1, y: 0 } : { x: -1, y: 0 };
}

function validateBody(body) {
  if (!body || typeof body.id !== "string" || body.id === "") throw new Error("Ship collision body needs an id");
  for (const field of ["x", "y", "vx", "vy", "headingX", "headingY", "mass", "radius"]) {
    if (!Number.isFinite(body[field])) throw new Error(`Invalid ${field} for collision ship ${body.id}`);
  }
  if (body.mass <= 0 || body.radius <= 0) throw new Error(`Invalid dimensions for collision ship ${body.id}`);
  if (Math.hypot(body.headingX, body.headingY) <= 1e-6) throw new Error(`Invalid heading for collision ship ${body.id}`);
  return body;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
