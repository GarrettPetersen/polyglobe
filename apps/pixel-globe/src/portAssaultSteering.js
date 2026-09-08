import {
  PORT_ASSAULT_LANE_COUNT, PORT_ASSAULT_LANE_SPACING,
  portAssaultFormationSpacing, portAssaultFormationStep, portAssaultGroundDistance
} from "./portAssaultFormation.js";

const FORMATION_LANE_RECONSIDER_MS = 200;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

// Updates the soldier's local lane goal; returns its collision-safe next position.
export function portAssaultMoveInFormation(unit, destination, movement, occupancy, range, timeMs) {
  if (unit.laneGoal !== null && Math.abs(unit.laneGoal - unit.lane) < 1e-9) unit.laneGoal = null;
  const lateralDistance = Math.abs(destination.lane - unit.lane) * PORT_ASSAULT_LANE_SPACING;
  const lane = unit.laneGoal ?? (lateralDistance < range * 0.95 ? unit.lane : destination.lane);
  const direction = Math.sign(destination.position - unit.position);
  const standOff = Math.sqrt(Math.max(0, (range * 0.95) ** 2 -
    ((destination.lane - lane) * PORT_ASSAULT_LANE_SPACING) ** 2));
  const goal = { position: clamp(destination.position - direction * standOff, 0, 1), lane };
  const goalDistance = portAssaultGroundDistance(unit, goal);
  const attractionScale = goalDistance > 0 ? Math.min(1, movement / goalDistance) : 0;
  const spacing = portAssaultFormationSpacing(unit, occupancy.nearby(unit, unit, 0, 3));
  const spacingLength = Math.hypot(spacing.positionOffset, spacing.laneOffset * PORT_ASSAULT_LANE_SPACING);
  const spacingScale = spacingLength > 0.65 ? 0.65 / spacingLength : 1;
  goal.position = clamp(unit.position + (goal.position - unit.position) * attractionScale +
    spacing.positionOffset * movement * spacingScale, 0, 1);
  // A support/reload order to hold this position can spread sideways, but
  // personal-space forces must not invent an unordered retreat toward the ship.
  if (direction === 0) goal.position = unit.side === "attacker"
    ? Math.max(unit.position, goal.position) : Math.min(unit.position, goal.position);
  goal.lane = clamp(unit.lane + (goal.lane - unit.lane) * attractionScale +
    spacing.laneOffset * movement * spacingScale, 0, PORT_ASSAULT_LANE_COUNT - 1);
  let next = portAssaultFormationStep(unit, goal, movement, occupancy.nearby(unit, goal, movement));
  const progress = goalDistance - portAssaultGroundDistance(next, {
    position: clamp(destination.position - direction * standOff, 0, 1), lane
  });
  if (progress > movement * 0.25 || goalDistance < movement) return next;

  // Probe fractional lanes: the passages are BETWEEN the standing files.
  // Sideways/backward jitter is not progress toward the requested destination.
  if (timeMs < unit.nextLaneChangeAtMs) return next;
  unit.nextLaneChangeAtMs = timeMs + FORMATION_LANE_RECONSIDER_MS;
  unit.laneGoal = null;
  const alternatives = [Math.floor(unit.lane * 2 - 1) / 2, Math.ceil(unit.lane * 2 + 1) / 2]
    .filter(candidate => candidate >= 0 && candidate <= PORT_ASSAULT_LANE_COUNT - 1)
    .sort((left, right) => Math.abs(left - destination.lane) - Math.abs(right - destination.lane) || left - right);
  for (const candidate of alternatives) {
    const sideGoal = { position: unit.position, lane: candidate };
    const sideStep = portAssaultFormationStep(unit, sideGoal, movement,
      occupancy.nearby(unit, sideGoal, movement));
    if (portAssaultGroundDistance(unit, sideStep) < movement * 0.5) continue;
    unit.laneGoal = candidate;
    next = sideStep;
    break;
  }
  return next;
}
