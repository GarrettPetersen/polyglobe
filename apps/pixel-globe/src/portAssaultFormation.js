// Both axes use fractions of the battlefield's length. The city view projects
// depth at half scale. Lane centers leave room for infantry to pass between
// two standing comrades rather than forming an impenetrable shoulder-to-shoulder wall.
import { PORT_ASSAULT_LANE_COUNT, PORT_ASSAULT_LANE_SPACING, portAssaultGroundStepFraction } from "./portAssaultGround.js";
export { PORT_ASSAULT_LANE_COUNT, PORT_ASSAULT_LANE_SPACING } from "./portAssaultGround.js";
// Enough continuous ground depth for a full crew and its retreat corridors.

export const PORT_ASSAULT_INFANTRY_RADIUS = 0.009;
export const PORT_ASSAULT_MOUNTED_RADIUS = 0.013;
const CONTACT_EPSILON = 1e-9;
const OCCUPANCY_COLUMNS = 16;

// Derived spatial index for the synchronous simulation. Only nearby ranks can
// block a step; scanning the whole reserve roster made large forecasts costly.
export class PortAssaultOccupancy {
  constructor() {
    this.columns = Array.from({ length: OCCUPANCY_COLUMNS }, () => new Set());
    this.columnById = new Map();
  }

  add(unit) {
    if (this.columnById.has(unit.id)) throw new Error(`Duplicate deployed assault unit: ${unit.id}`);
    const column = this.columnAt(unit.position);
    this.columnById.set(unit.id, column);
    this.columns[column].add(unit);
  }

  remove(unit) {
    const column = this.columnById.get(unit.id);
    if (column === undefined || !this.columns[column].delete(unit)) {
      throw new Error(`Missing deployed assault unit: ${unit.id}`);
    }
    this.columnById.delete(unit.id);
  }

  update(unit) {
    if (this.columnById.get(unit.id) === this.columnAt(unit.position)) return;
    this.remove(unit);
    this.add(unit);
  }

  nearby(unit, destination = unit, distance = 0, paddingScale = 1) {
    const length = portAssaultGroundDistance(unit, destination);
    const endPosition = length === 0 ? unit.position : unit.position +
      (destination.position - unit.position) * Math.min(1, distance / length);
    const padding = (portAssaultBodyRadius(unit) + PORT_ASSAULT_MOUNTED_RADIUS) * paddingScale;
    const first = this.columnAt(Math.max(0, Math.min(unit.position, endPosition) - padding));
    const last = this.columnAt(Math.min(1, Math.max(unit.position, endPosition) + padding));
    const candidates = [];
    for (let column = first; column <= last; column += 1) {
      for (const candidate of this.columns[column]) candidates.push(candidate);
    }
    return candidates;
  }

  columnAt(position) {
    if (!Number.isFinite(position) || position < 0 || position > 1) {
      throw new Error(`Invalid deployed assault position: ${position}`);
    }
    return Math.min(OCCUPANCY_COLUMNS - 1, Math.floor(position * OCCUPANCY_COLUMNS));
  }
}

export function portAssaultGroundDistance(left, right) {
  const dx = right.position - left.position;
  const dy = (right.lane - left.lane) * PORT_ASSAULT_LANE_SPACING;
  return Math.sqrt(dx * dx + dy * dy);
}

export function portAssaultBodyRadius(unit) {
  return unit.stats.mounted ? PORT_ASSAULT_MOUNTED_RADIUS : PORT_ASSAULT_INFANTRY_RADIUS;
}

export function portAssaultPositionIsFree(unit, occupants) {
  return occupants.every((other) => other.id === unit.id ||
    portAssaultGroundDistance(unit, other) + CONTACT_EPSILON >=
      portAssaultBodyRadius(unit) + portAssaultBodyRadius(other));
}

// A soft repulsion keeps a formation from compressing into a single pixel
// before hard collision resolution has to stop movement.
export function portAssaultFormationSpacing(unit, occupants, { advancing = false } = {}) {
  let positionOffset = 0;
  let laneOffset = 0;
  for (const other of occupants) {
    if (other.id === unit.id || other.side !== unit.side || other.alive === false) continue;
    const distance = portAssaultGroundDistance(unit, other);
    const desired = (portAssaultBodyRadius(unit) + portAssaultBodyRadius(other)) * 3;
    if (distance >= desired) continue;
    const dx = unit.position - other.position;
    const dy = (unit.lane - other.lane) * PORT_ASSAULT_LANE_SPACING;
    // Repulsion is a ground-space vector, not an offset to a distant target.
    const withdrawingPast = other.retreating &&
      (other.position - unit.position) * (unit.side === "attacker" ? 1 : -1) > 0;
    const strength = (desired - distance) / desired * (withdrawingPast ? 3 : 1);
    const directionX = distance > CONTACT_EPSILON ? dx / distance : (unit.id < other.id ? -1 : 1);
    const directionY = distance > CONTACT_EPSILON ? dy / distance : 0;
    // Advancing ranks must not transmit pressure from the back of the army
    // into the front. They can still move sideways to clear personal space.
    const forward = unit.side === "attacker" ? 1 : -1;
    if (!advancing || directionX * forward < 0) positionOffset += directionX * strength;
    laneOffset += directionY * strength / PORT_ASSAULT_LANE_SPACING;
  }
  return Object.freeze({ positionOffset, laneOffset });
}

// Sweep the whole movement segment, so a charge or knockback cannot tunnel
// through another body. Fallen soldiers no longer occupy formation space;
// callers pass only the living, deployed occupants (including landing troops).
export function portAssaultFormationStep(unit, destination, distance, occupants) {
  if (!Number.isFinite(distance) || distance < 0 ||
      !Number.isFinite(destination.position) || destination.position < 0 || destination.position > 1 ||
      !Number.isFinite(destination.lane) || destination.lane < 0 ||
      destination.lane > PORT_ASSAULT_LANE_COUNT - 1) {
    throw new Error(`Invalid port assault movement for ${unit.id}: ${destination.position}/${destination.lane}, distance ${distance}`);
  }
  const totalDistance = portAssaultGroundDistance(unit, destination);
  if (totalDistance === 0 || distance === 0) return { position: unit.position, lane: unit.lane };
  const scale = Math.min(1, distance / totalDistance);
  const dx = (destination.position - unit.position) * scale;
  const dy = (destination.lane - unit.lane) * PORT_ASSAULT_LANE_SPACING * scale;
  const lengthSquared = dx * dx + dy * dy;
  const minimumX = Math.min(0, dx);
  const maximumX = Math.max(0, dx);
  const minimumY = Math.min(0, dy);
  const maximumY = Math.max(0, dy);
  let fraction = portAssaultGroundStepFraction(unit, {
    position: unit.position + dx, lane: unit.lane + dy / PORT_ASSAULT_LANE_SPACING
  });
  for (const other of occupants) {
    if (other.id === unit.id) continue;
    const separationX = unit.position - other.position;
    const separationY = (unit.lane - other.lane) * PORT_ASSAULT_LANE_SPACING;
    const radius = portAssaultBodyRadius(unit) + portAssaultBodyRadius(other);
    if (-separationX < minimumX - radius || -separationX > maximumX + radius ||
        -separationY < minimumY - radius || -separationY > maximumY + radius) continue;
    const separationSquared = separationX * separationX + separationY * separationY;
    if (separationSquared < (radius - CONTACT_EPSILON) ** 2) {
      throw new Error(`Overlapping port assault bodies: ${unit.id}/${other.id}`);
    }
    const approach = separationX * dx + separationY * dy;
    if (approach >= 0) continue;
    const discriminant = approach * approach - lengthSquared * (separationSquared - radius * radius);
    if (discriminant <= 0) continue;
    const contact = (-approach - Math.sqrt(discriminant)) / lengthSquared;
    fraction = Math.min(fraction, Math.max(0, contact));
  }
  // Roundoff at an exact lane/road boundary must stay inside the closed field.
  return {
    position: Math.max(0, Math.min(1, unit.position + dx * fraction)),
    lane: Math.max(0, Math.min(PORT_ASSAULT_LANE_COUNT - 1, unit.lane + dy * fraction / PORT_ASSAULT_LANE_SPACING))
  };
}
