import { PORT_ASSAULT_LANE_COUNT, PORT_ASSAULT_LANE_SPACING, portAssaultBodyRadius, portAssaultFormationStep, portAssaultGroundDistance } from "./portAssaultFormation.js";

const LOCAL_RADIUS = 0.24;
const PROTECTION_DISTANCE = 0.09;
const SCREEN_GAP = 0.055;
const ready = unit => unit.alive && unit.spawned && unit.landed && unit.surface !== "deck";
const ranged = unit => unit.stats.attackType !== "melee";

// A shot is a ground-space segment: every friendly body along it must be clear.
export function portAssaultShotIsClear(shooter, target, allies) {
  // The elevated deck fires over shore comrades. Deck stations have separate
  // physical occupancy from the quay below them.
  if (shooter.surface === "deck") return true;
  const dx = target.position - shooter.position;
  const dy = (target.lane - shooter.lane) * PORT_ASSAULT_LANE_SPACING;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return true;
  return !allies.some(ally => {
    if (ally.id === shooter.id || ally.side !== shooter.side || !ready(ally)) return false;
    const ax = ally.position - shooter.position;
    const ay = (ally.lane - shooter.lane) * PORT_ASSAULT_LANE_SPACING;
    const t = (ax * dx + ay * dy) / lengthSquared;
    if (t <= 0 || t >= 1) return false;
    return Math.hypot(ax - t * dx, ay - t * dy) < portAssaultBodyRadius(ally) + 0.002;
  });
}

function nearest(unit, candidates) {
  let selected = null;
  let best = Infinity;
  for (const candidate of candidates) {
    if (!ready(candidate)) continue;
    const distance = portAssaultGroundDistance(unit, candidate);
    if (distance < best || (distance === best && candidate.id < selected.id)) {
      best = distance;
      selected = candidate;
    }
  }
  return selected;
}

function move(mode, position, lane, range = 0) {
  return { mode, destination: { position: Math.max(0, Math.min(1, position)), lane }, range };
}

function withdrawingComradeInPath(unit, allies, timeMs) {
  if (unit.landedAtMs !== null && timeMs <= unit.landedAtMs + 1000) return null;
  const forward = unit.side === "attacker" ? 1 : -1;
  return nearest(unit, allies.filter(ally => ally.id !== unit.id && ready(ally) && ally.retreating &&
    (ally.position - unit.position) * forward > 0 && portAssaultGroundDistance(unit, ally) < SCREEN_GAP &&
    Math.abs(ally.lane - unit.lane) * PORT_ASSAULT_LANE_SPACING <
      portAssaultBodyRadius(unit) + portAssaultBodyRadius(ally) + .003));
}

function yieldToWithdrawingComrade(unit, comrade, allies, enemies) {
  const rearDirection = unit.side === "attacker" ? -1 : 1;
  // Open the retreat corridor sideways instead of joining a backward queue.
  const clearance = (portAssaultBodyRadius(unit) + portAssaultBodyRadius(comrade) + .003) / PORT_ASSAULT_LANE_SPACING;
  const candidates = [comrade.lane - clearance, comrade.lane + clearance]
    .filter(lane => lane >= 0 && lane <= PORT_ASSAULT_LANE_COUNT - 1)
    .sort((a, b) => Math.abs(a - unit.lane) - Math.abs(b - unit.lane) || a - b);
  const occupants = [...allies, ...enemies].filter(ready);
  let best = null;
  let bestProgress = -1;
  const destinations = candidates.map(lane => ({ position: unit.position + rearDirection * .01, lane }));
  destinations.push({ position: unit.position + rearDirection * .035, lane: unit.lane });
  for (const destination of destinations) {
    const decision = move("yield", destination.position, destination.lane);
    const distance = portAssaultGroundDistance(unit, decision.destination);
    const step = portAssaultFormationStep(unit, decision.destination, distance, occupants);
    const progress = portAssaultGroundDistance(unit, step) / distance;
    if (progress > bestProgress) { best = decision; bestProgress = progress; }
  }
  if (!best) throw new Error(`No retreat clearance within the battlefield for ${unit.id}`);
  return best;
}

// Decisions depend on nearby soldiers and individual reload clocks, never a
// battle-wide phase. Cavalry bypasses the infantry screen and closes immediately.
export function portAssaultTacticalDecision(unit, allies, opponents, timeMs, rangedAllies = allies.filter(ranged)) {
  const enemies = opponents;
  const target = nearest(unit, enemies);
  if (unit.surface === "deck") {
    if (unit.side !== "attacker") throw new Error(`Defender boarded player ship: ${unit.id}`);
    if (unit.firearmReload !== null) return move("reload", unit.position, unit.lane);
    if (target && ranged(unit) && portAssaultGroundDistance(unit, target) <= unit.stats.range) {
      return { mode: "fire", target };
    }
    return { mode: "disembark" };
  }
  if (!target && unit.side === "attacker" && !unit.clearedQuay && ["wood", "stone"].includes(unit.dockKind) && unit.position < .36) {
    return move("clear-quay", .38, unit.deploymentLane);
  }
  if (!target) return null;
  const direction = Math.sign(target.position - unit.position) || (unit.side === "attacker" ? 1 : -1);
  const distance = portAssaultGroundDistance(unit, target);
  // Cross the narrow quay before forming a firing line. Stopping on the
  // gangway traps both incoming infantry and comrades withdrawing from shore.
  if (unit.side === "attacker" && !unit.clearedQuay && ["wood", "stone"].includes(unit.dockKind) &&
      unit.position < .36 && distance > PROTECTION_DISTANCE) {
    return move("clear-quay", .38, unit.deploymentLane);
  }
  if (!ranged(unit) || unit.stats.mounted) {
    if (!unit.stats.mounted && distance > unit.stats.range) {
      const localScreen = rangedAllies.filter(ally => portAssaultGroundDistance(unit, ally) <= LOCAL_RADIUS);
      const screen = localScreen.filter(ready);
      const fallenScreen = localScreen.filter(ally => !ally.alive && ally.spawned);
      // Send the closest available infantry to relieve a wounded skirmisher;
      // the remaining reserves keep their spacing behind the firing line.
      const relieving = screen.some(gunner => gunner.hitPoints < gunner.stats.hitPoints * .65 &&
        nearest(gunner, allies.filter(ally => ready(ally) && !ranged(ally) && !ally.stats.mounted))?.id === unit.id);
      const threatened = screen.some(ally => enemies.some(enemy => ready(enemy) && !ranged(enemy) &&
        portAssaultGroundDistance(ally, enemy) < PROTECTION_DISTANCE));
      const withdrawing = withdrawingComradeInPath(unit, allies, timeMs);
      if (withdrawing) {
        return yieldToWithdrawingComrade(unit, withdrawing, allies, enemies);
      }
      if (screen.length > fallenScreen.length && !relieving && !threatened) {
        const skirmisher = nearest(unit, screen);
        const screenPosition = skirmisher.position - direction * SCREEN_GAP;
        const supportPosition = direction > 0 ? Math.max(unit.position, screenPosition) : Math.min(unit.position, screenPosition);
        return move("support", supportPosition, unit.lane);
      }
    }
    return { mode: "charge", target };
  }
  const friends = allies.filter(ally => ally.id !== unit.id && ready(ally) &&
    portAssaultGroundDistance(unit, ally) <= LOCAL_RADIUS);
  const threat = nearest(unit, enemies.filter(enemy => ready(enemy) && !ranged(enemy)));
  // Prefer nearby infantry protection so mixed formations retain their screen.
  // Without infantry, other ranged troops must cover the rear ranks instead
  // of making an all-ranged crew flee as one mass.
  const infantry = friends.filter(ally => !ranged(ally));
  const screen = infantry.length > 0 ? infantry : friends;
  const screenedFromThreat = threat && !portAssaultShotIsClear(unit, threat, screen);
  const threatened = threat && portAssaultGroundDistance(unit, threat) < PROTECTION_DISTANCE && !screenedFromThreat;
  const reloading = unit.stats.attackType === "firearm"
    ? unit.firearmReload !== null : timeMs < unit.nextPrimaryAttackAtMs;
  const rearDirection = unit.side === "attacker" ? -1 : 1;
  const withdrawing = withdrawingComradeInPath(unit, friends, timeMs);
  if (!threatened && withdrawing) {
    return yieldToWithdrawingComrade(unit, withdrawing, allies, enemies);
  }
  if (threatened) {
    if (unit.side === "attacker" && unit.position <= .055) return { mode: "board" };
    // Retreat from immediate danger without needing to select a protector.
    const retreat = move("withdraw", unit.position + rearDirection * SCREEN_GAP, unit.lane);
    // At the field edge there is no room to withdraw behind another rank.
    // Stand and defend instead of endlessly trying to retreat into the wall.
    if (unit.side === "attacker" || Math.abs(retreat.destination.position - unit.position) >= SCREEN_GAP * .9) return retreat;
  } else if (reloading && unit.lastRangedAttackPosition !== null && unit.stats.attackType === "firearm") {
    // Reload behind the firing position, not an additional step back every tick.
    // Never advance during this retreat if an enemy already drove us farther back.
    const coverPosition = unit.lastRangedAttackPosition + rearDirection * SCREEN_GAP;
    const destination = Math.max(0, Math.min(1, coverPosition));
    const reachedCover = (unit.position - destination) * rearDirection >= -0.003 ||
      (destination === (rearDirection > 0 ? 1 : 0) && Math.abs(destination - unit.position) < SCREEN_GAP);
    const protectedByComrade = screen.some(ally =>
      (ally.position - unit.position) * -rearDirection >= portAssaultBodyRadius(unit) + portAssaultBodyRadius(ally));
    // Personal-space preferences cannot postpone loading indefinitely. The
    // retreat-corridor check above still makes a covered gunner yield.
    if (reachedCover || protectedByComrade) return move("reload", unit.position, unit.lane);
    return move("seek-cover", destination, unit.lane);
  }
  // A skirmisher pressed against the rear boundary must still defend itself.
  if (threatened && distance <= unit.stats.meleeFallback.range) return { mode: "fight", target };
  const clearTarget = nearest(unit, enemies.filter(enemy => ready(enemy) &&
    portAssaultGroundDistance(unit, enemy) <= unit.stats.range && portAssaultShotIsClear(unit, enemy, allies)));
  if (clearTarget && !reloading) return { mode: "fire", target: clearTarget };
  // The initial readiness delay is not a reload: newly landed troops must
  // still advance into firing position before their first shot.
  if (reloading && unit.lastRangedAttackPosition !== null) return move("reload", unit.position, unit.lane);
  // Advance beyond the local screen to open a firing lane. The collision solver
  // still requires an actual route around bodies; this is only a steering goal.
  const ahead = friends.filter(ally => (ally.position - unit.position) * direction > 0 &&
    (target.position - ally.position) * direction > 0);
  const blocker = nearest(unit, ahead);
  if (!portAssaultShotIsClear(unit, target, allies) && blocker) {
    return move("find-shot", blocker.position + direction * SCREEN_GAP, unit.lane);
  }
  return { mode: "skirmish", target };
}
