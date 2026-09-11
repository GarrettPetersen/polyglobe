import { portAssaultGroundLaneBounds } from "./portAssaultGround.js";
import {
  PORT_ASSAULT_LANE_COUNT, PORT_ASSAULT_LANE_SPACING,
  portAssaultBodyRadius, portAssaultFormationSpacing, portAssaultFormationStep, portAssaultGroundDistance
} from "./portAssaultFormation.js";

const FORMATION_LANE_RECONSIDER_MS = 200;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

// Updates the soldier's local lane goal; returns its collision-safe next position.
export function portAssaultMoveInFormation(unit, destination, movement, occupancy, range, timeMs, { clearingLanding = false, holdingScreen = false, holdingFront = false, leaveRetreatGaps = false } = {}) {
  if (unit.laneGoal !== null) {
    const directDistance = portAssaultGroundDistance(unit, destination);
    const direct = portAssaultFormationStep(unit, destination, directDistance,
      occupancy.nearby(unit, destination, directDistance));
    if (portAssaultGroundDistance(direct, destination) < 1e-9) {
      unit.laneGoal = null;
    } else if (Math.abs(unit.laneGoal - unit.lane) > 1e-9) {
      // Finish the chosen sidestep before trying forward again. Reconsidering
      // halfway across a gap made soldiers oscillate against the same comrade.
      const sideGoal = { position: unit.position, lane: unit.laneGoal };
      const sideStep = portAssaultFormationStep(unit, sideGoal, movement,
        occupancy.nearby(unit, sideGoal, movement));
      if (portAssaultGroundDistance(unit, sideStep) > 1e-9) return sideStep;
      unit.laneGoal = null;
    }
  }
  const lateralDistance = Math.abs(destination.lane - unit.lane) * PORT_ASSAULT_LANE_SPACING;
  const lane = unit.laneGoal ?? (lateralDistance < range * 0.95 ? unit.lane : destination.lane);
  const direction = Math.sign(destination.position - unit.position);
  const standOff = Math.sqrt(Math.max(0, (range * 0.95) ** 2 -
    ((destination.lane - lane) * PORT_ASSAULT_LANE_SPACING) ** 2));
  const goal = { position: clamp(destination.position - direction * standOff, 0, 1), lane };
  if (unit.dockKind !== undefined) {
    const bounds = portAssaultGroundLaneBounds(clamp(unit.position + direction * movement, 0, 1), unit.dockKind);
    goal.lane = clamp(goal.lane, bounds.minimum, bounds.maximum);
  }
  const requestedGoal = { ...goal };
  const goalDistance = portAssaultGroundDistance(unit, goal);
  let attractionScale = goalDistance > 0 ? Math.min(1, movement / goalDistance) : 0;
  const retreating = direction === (unit.side === "attacker" ? -1 : 1);
  const neighbors = occupancy.nearby(unit, unit, 0, 3);
  // Ignore comfort pressure from the ranks we are withdrawing into. Comrades
  // ahead can still push us back or sideways so they too have room to retreat.
  const passingScreen = direction !== 0 && !retreating;
  const spacingNeighbors = passingScreen || unit.stats.attackType === "melee"
    ? neighbors.filter(other => (other.stats.attackType === "melee") === (unit.stats.attackType === "melee") && !other.retreating)
    : neighbors;
  const spacing = portAssaultFormationSpacing(unit, retreating
    ? neighbors.filter(other => (other.position - unit.position) * direction <= 0)
    : spacingNeighbors, { advancing: leaveRetreatGaps && !retreating && direction !== 0 && unit.stats.attackType === "melee" && !clearingLanding });
  const spacingLength = Math.hypot(spacing.positionOffset, spacing.laneOffset * PORT_ASSAULT_LANE_SPACING);
  // Passing the other arm of the formation needs only physical clearance;
  // soldiers still keep personal space among their own firing line or ranks.
  const keepingFormation = !unit.stats.mounted && !retreating && !clearingLanding;
  const maximumSpacingForce = holdingScreen || keepingFormation ? 1.5 : 0.65;
  const spacingScale = spacingLength > maximumSpacingForce ? maximumSpacingForce / spacingLength : 1;
  // Walking toward an enemy is not permission to collapse the ranks ahead.
  // Equal attraction and repulsion settled at half the desired separation,
  // leaving gaps too small for a body. Brake before that gap collapses.
  if ((holdingScreen || keepingFormation) && !retreating && !clearingLanding) {
    attractionScale *= Math.max(0, 1 - Math.max(0, -spacing.positionOffset * direction) * 4);
  }
  goal.position = clamp(unit.position + (goal.position - unit.position) * attractionScale +
    spacing.positionOffset * movement * spacingScale, 0, 1);
  // A threatened protector clears a corridor sideways without being pushed
  // into a retreat by the troops it is covering. Rear ranks still spread out.
  if (holdingFront || (clearingLanding && (direction === 0 || direction === (unit.side === "attacker" ? 1 : -1)))) goal.position = unit.side === "attacker"
    ? Math.max(unit.position, goal.position) : Math.min(unit.position, goal.position);
  goal.lane = clamp(unit.lane + (goal.lane - unit.lane) * attractionScale +
    spacing.laneOffset * movement * spacingScale, 0, PORT_ASSAULT_LANE_COUNT - 1);
  let next = portAssaultFormationStep(unit, goal, movement, occupancy.nearby(unit, goal, movement));
  // Slide around contacting bodies along a diagonal, rather than requiring
  // a purely sideways gap while already pressed against a comrade.
  const stepLength = portAssaultGroundDistance(unit, next);
  if (stepLength < movement * .5 && portAssaultGroundDistance(unit, goal) > movement * .5) {
    const heading = Math.atan2((goal.lane - unit.lane) * PORT_ASSAULT_LANE_SPACING, goal.position - unit.position);
    let bestScore = stepLength;
    for (const angle of [-Math.PI / 6, Math.PI / 6, -Math.PI / 3, Math.PI / 3]) {
      const probeGoal = {
        position: clamp(unit.position + Math.cos(heading + angle) * movement, 0, 1),
        lane: clamp(unit.lane + Math.sin(heading + angle) * movement / PORT_ASSAULT_LANE_SPACING, 0, PORT_ASSAULT_LANE_COUNT - 1)
      };
      if ((clearingLanding || holdingFront) && (probeGoal.position - unit.position) * (unit.side === "attacker" ? 1 : -1) < 0) continue;
      const probe = portAssaultFormationStep(unit, probeGoal, movement, occupancy.nearby(unit, probeGoal, movement));
      const score = portAssaultGroundDistance(unit, probe) * Math.cos(angle);
      if (score > bestScore + 1e-9) { next = probe; bestScore = score; }
    }
  }
  const progress = goalDistance - portAssaultGroundDistance(next, requestedGoal);
  if (progress > movement * 0.25 || goalDistance < movement) return next;

  // Probe relative depth offsets, independent of the original landing lanes.
  // Sideways/backward jitter is not progress toward the requested destination.
  if (timeMs < unit.nextLaneChangeAtMs) return next;
  unit.nextLaneChangeAtMs = timeMs + FORMATION_LANE_RECONSIDER_MS;
  unit.laneGoal = null;
  const nearbyBodies = occupancy.nearby(unit, unit, 0, 3)
    .filter(other => other.id !== unit.id && portAssaultGroundDistance(unit, other) < 0.08);
  const alternatives = [...new Set(nearbyBodies.flatMap(other => {
    const clearance = (portAssaultBodyRadius(unit) + portAssaultBodyRadius(other) + 0.001) /
      PORT_ASSAULT_LANE_SPACING;
    return [other.lane - clearance, other.lane + clearance];
  }))]
    .filter(candidate => candidate >= 0 && candidate <= PORT_ASSAULT_LANE_COUNT - 1)
    .sort((left, right) => Math.abs(left - destination.lane) - Math.abs(right - destination.lane) || left - right);
  for (const candidate of alternatives) {
    const sideGoal = { position: unit.position, lane: candidate };
    if (retreating) {
      const sideDistance = portAssaultGroundDistance(unit, sideGoal);
      const end = portAssaultFormationStep(unit, sideGoal, sideDistance,
        occupancy.nearby(unit, sideGoal, sideDistance));
      if (portAssaultGroundDistance(end, sideGoal) > 1e-9) continue;
      const onward = { position: clamp(unit.position + direction * .02, 0, 1), lane: candidate };
      const probe = { ...unit, ...end };
      const forwardStep = portAssaultFormationStep(probe, onward, movement,
        occupancy.nearby(probe, onward, movement));
      if ((forwardStep.position - probe.position) * direction < movement * .5) continue;
    }
    const sideStep = portAssaultFormationStep(unit, sideGoal, movement,
      occupancy.nearby(unit, sideGoal, movement));
    if (portAssaultGroundDistance(unit, sideStep) < movement * 0.5) continue;
    unit.laneGoal = candidate;
    next = sideStep;
    break;
  }
  return next;
}
