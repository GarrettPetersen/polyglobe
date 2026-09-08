import { PORT_ASSAULT_LANE_SPACING, portAssaultBodyRadius, portAssaultGroundDistance } from "./portAssaultFormation.js";

const LOCAL_RADIUS = 0.24;
const PROTECTION_DISTANCE = 0.09;
const SCREEN_GAP = 0.055;
const ready = unit => unit.alive && unit.spawned && unit.landed;
const ranged = unit => unit.stats.attackType !== "melee";

// A shot is a ground-space segment: every friendly body along it must be clear.
export function portAssaultShotIsClear(shooter, target, allies) {
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

// Decisions depend on nearby soldiers and individual reload clocks, never a
// battle-wide phase. Cavalry bypasses the infantry screen and closes immediately.
export function portAssaultTacticalDecision(unit, allies, opponents, timeMs, rangedAllies = allies.filter(ranged)) {
  const enemies = opponents;
  const target = nearest(unit, enemies);
  if (!target) return null;
  const direction = Math.sign(target.position - unit.position) || (unit.side === "attacker" ? 1 : -1);
  const distance = portAssaultGroundDistance(unit, target);
  if (!ranged(unit) || unit.stats.mounted) {
    if (!unit.stats.mounted && distance > unit.stats.range) {
      const localScreen = rangedAllies.filter(ally => portAssaultGroundDistance(unit, ally) <= LOCAL_RADIUS);
      const screen = localScreen.filter(ready);
      const fallenScreen = localScreen.filter(ally => !ally.alive && ally.spawned);
      const threatened = screen.some(ally => enemies.some(enemy => ready(enemy) && !ranged(enemy) &&
        portAssaultGroundDistance(ally, enemy) < PROTECTION_DISTANCE));
      if (screen.length > fallenScreen.length && !threatened) {
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
  const threatened = threat && portAssaultGroundDistance(unit, threat) < PROTECTION_DISTANCE;
  const reloading = timeMs < unit.nextPrimaryAttackAtMs;
  const rearDirection = unit.side === "attacker" ? -1 : 1;
  if (threatened) {
    // Retreat from immediate danger without needing to select a protector.
    const retreat = move("withdraw", unit.position + rearDirection * SCREEN_GAP, unit.lane);
    if (Math.abs(retreat.destination.position - unit.position) > 1e-9) return retreat;
  } else if (reloading && unit.stats.attackType === "firearm") {
    // Reload behind the firing position, not an additional step back every tick.
    // Never advance during this retreat if an enemy already drove us farther back.
    const coverPosition = unit.lastRangedAttackPosition === null
      ? unit.position : unit.lastRangedAttackPosition + rearDirection * SCREEN_GAP;
    return move("reload", rearDirection < 0 ? Math.min(unit.position, coverPosition)
      : Math.max(unit.position, coverPosition), unit.lane);
  }
  // A skirmisher pressed against the rear boundary must still defend itself.
  if (threatened && distance <= unit.stats.meleeFallback.range) return { mode: "fight", target };
  const clearTarget = nearest(unit, enemies.filter(enemy => ready(enemy) &&
    portAssaultGroundDistance(unit, enemy) <= unit.stats.range && portAssaultShotIsClear(unit, enemy, allies)));
  if (clearTarget && !reloading) return { mode: "fire", target: clearTarget };
  if (reloading) return move("reload", unit.position, unit.lane);
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
