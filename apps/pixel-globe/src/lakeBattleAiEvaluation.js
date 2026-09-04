import {
  LAKE_BATTLE_ENEMY_ID,
  LAKE_BATTLE_PHASE_ACTIVE,
  LAKE_BATTLE_PLAYER_ID,
  drainLakeBattleEvents,
  updateLakeBattleAiDuel
} from "./lakeBattle.js";

const AI_DUEL_COMBATANT_IDS = Object.freeze([
  LAKE_BATTLE_PLAYER_ID,
  LAKE_BATTLE_ENEMY_ID
]);

export function evaluateLakeBattleAiDuel(battle, {
  playerTacticId,
  enemyTacticId,
  durationSeconds = 180,
  timestepSeconds = 0.1
}) {
  if (!battle || typeof battle !== "object") throw new Error("AI duel evaluation requires a lake battle");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`Invalid AI duel duration: ${durationSeconds}`);
  }
  if (!Number.isFinite(timestepSeconds) || timestepSeconds <= 0 || timestepSeconds > 0.1) {
    throw new Error(`Invalid AI duel timestep: ${timestepSeconds}`);
  }
  const metricsById = new Map(AI_DUEL_COMBATANT_IDS.map((id) => [id, {
    broadsideVolleys: 0,
    cannonballsFired: 0,
    cannonHits: 0,
    hullDamageInflicted: 0,
    firstCannonHitSeconds: null
  }]));
  let elapsedSeconds = 0;
  while (battle.phase === LAKE_BATTLE_PHASE_ACTIVE && elapsedSeconds < durationSeconds) {
    const dt = Math.min(timestepSeconds, durationSeconds - elapsedSeconds);
    updateLakeBattleAiDuel(battle, dt, { playerTacticId, enemyTacticId });
    elapsedSeconds += dt;
    collectAiDuelEvents(drainLakeBattleEvents(battle), metricsById, elapsedSeconds);
  }
  collectAiDuelEvents(drainLakeBattleEvents(battle), metricsById, elapsedSeconds);
  return Object.freeze({
    elapsedSeconds,
    outcome: battle.outcome || "timeout",
    player: Object.freeze({ ...metricsById.get(LAKE_BATTLE_PLAYER_ID) }),
    enemy: Object.freeze({ ...metricsById.get(LAKE_BATTLE_ENEMY_ID) })
  });
}

function collectAiDuelEvents(events, metricsById, elapsedSeconds) {
  for (const event of events) {
    if (event.type === "fire" && event.weaponKind === "cannon" && event.weaponId === null) {
      const metrics = requiredCombatantMetrics(metricsById, event.shipId);
      metrics.broadsideVolleys += 1;
      metrics.cannonballsFired += event.count;
      continue;
    }
    if (event.type !== "hit" || event.weaponKind !== "cannon" || event.weaponId !== null) continue;
    const attackerId = opposingCombatantId(event.shipId);
    const metrics = requiredCombatantMetrics(metricsById, attackerId);
    metrics.cannonHits += 1;
    metrics.hullDamageInflicted += event.damage;
    if (metrics.firstCannonHitSeconds === null) metrics.firstCannonHitSeconds = elapsedSeconds;
  }
}

function requiredCombatantMetrics(metricsById, combatantId) {
  const metrics = metricsById.get(combatantId);
  if (!metrics) throw new Error(`AI duel event names an unknown combatant: ${combatantId}`);
  return metrics;
}

function opposingCombatantId(combatantId) {
  if (combatantId === LAKE_BATTLE_PLAYER_ID) return LAKE_BATTLE_ENEMY_ID;
  if (combatantId === LAKE_BATTLE_ENEMY_ID) return LAKE_BATTLE_PLAYER_ID;
  throw new Error(`AI duel hit names an unknown target: ${combatantId}`);
}
