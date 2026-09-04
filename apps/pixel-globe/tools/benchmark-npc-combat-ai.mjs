import { readFileSync } from "node:fs";

import {
  LAKE_BATTLE_SHIP_SLUGS,
  createLakeBattle
} from "../src/lakeBattle.js";
import { evaluateLakeBattleAiDuel } from "../src/lakeBattleAiEvaluation.js";
import {
  NPC_COMBAT_CURRENT_TACTIC_ID,
  NPC_COMBAT_TACTIC_IDS
} from "../src/npcCombatTactics.js";
import { validateShipFootprintBake } from "../src/shipFootprint.js";
import {
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS
} from "../src/shipSpriteLayout.js";

const ARENA = Object.freeze({ width: 455, height: 256 });
const DUEL_SECONDS = 180;
const SEEDS = Object.freeze([
  0x41492d01,
  0x41492d02,
  0x41492d03,
  0x41492d04,
  0x41492d05,
  0x41492d06
]);
const MATCHUPS = Object.freeze([
  Object.freeze(["brigantine", "caravel"]),
  Object.freeze(["caravel", "brigantine"])
]);
const PRODUCTION_STRESS_MATCHUPS = Object.freeze([
  Object.freeze(["brigantine", "caravel"]),
  Object.freeze(["small-cog", "fusta"]),
  Object.freeze(["portuguese-carrack", "xebec"]),
  Object.freeze(["galleon", "large-junk"]),
  Object.freeze(["joseon-turtle-ship", "japanese-atakebune"])
]);
const MINIMUM_PRODUCTION_HIT_RELIABILITY = 0.9;

const shipFootprints = validateShipFootprintBake(
  JSON.parse(readFileSync(
    new URL("../public/assets/vehicles/unity-ships/hull-footprints.json", import.meta.url),
    "utf8"
  )),
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS,
  LAKE_BATTLE_SHIP_SLUGS
);

const totals = new Map(NPC_COMBAT_TACTIC_IDS.map((id) => [id, blankTotals()]));
for (let leftIndex = 0; leftIndex < NPC_COMBAT_TACTIC_IDS.length; leftIndex++) {
  for (let rightIndex = leftIndex + 1; rightIndex < NPC_COMBAT_TACTIC_IDS.length; rightIndex++) {
    const left = NPC_COMBAT_TACTIC_IDS[leftIndex];
    const right = NPC_COMBAT_TACTIC_IDS[rightIndex];
    for (const seed of SEEDS) {
      for (const [playerSlug, enemySlug] of MATCHUPS) {
        recordDuel({ playerTacticId: left, enemyTacticId: right, playerSlug, enemySlug, seed });
        recordDuel({ playerTacticId: right, enemyTacticId: left, playerSlug, enemySlug, seed });
      }
    }
  }
}

console.log("NPC naval combat AI tournament");
console.log(`Production tactic: ${NPC_COMBAT_CURRENT_TACTIC_ID}`);
console.table(NPC_COMBAT_TACTIC_IDS.map((id) => {
  const total = totals.get(id);
  return {
    tactic: id,
    duels: total.duels,
    wins: total.wins,
    losses: total.losses,
    draws: total.draws,
    "duels with hit": total.duelsWithHit,
    "hit reliability": percent(total.duelsWithHit / total.duels),
    "cannon hit rate": percent(total.cannonHits / Math.max(1, total.cannonballsFired)),
    "volleys / duel": (total.broadsideVolleys / total.duels).toFixed(2),
    "first hit sec": total.duelsWithHit > 0
      ? (total.firstCannonHitSeconds / total.duelsWithHit).toFixed(1)
      : "—",
    "damage / duel": (total.hullDamageInflicted / total.duels).toFixed(2)
  };
}));

const productionTotals = blankTotals();
for (const seed of SEEDS) {
  for (const [playerSlug, enemySlug] of PRODUCTION_STRESS_MATCHUPS) {
    const battle = createLakeBattle({
      ...ARENA,
      playerSlug,
      enemySlug,
      shipFootprints,
      seed
    });
    const result = evaluateLakeBattleAiDuel(battle, {
      playerTacticId: NPC_COMBAT_CURRENT_TACTIC_ID,
      enemyTacticId: NPC_COMBAT_CURRENT_TACTIC_ID,
      durationSeconds: DUEL_SECONDS
    });
    addResult(productionTotals, result.player, result.outcome, "player");
    addResult(productionTotals, result.enemy, result.outcome, "enemy");
  }
}
const productionReliability = productionTotals.duelsWithHit / productionTotals.duels;
console.log("Production tactic stress matrix");
console.table([{
  tactic: NPC_COMBAT_CURRENT_TACTIC_ID,
  combatants: productionTotals.duels,
  "combatants with hit": productionTotals.duelsWithHit,
  "hit reliability": percent(productionReliability),
  "cannon hit rate": percent(
    productionTotals.cannonHits / Math.max(1, productionTotals.cannonballsFired)
  ),
  "first hit sec": productionTotals.duelsWithHit > 0
    ? (productionTotals.firstCannonHitSeconds / productionTotals.duelsWithHit).toFixed(1)
    : "—"
}]);
if (productionReliability < MINIMUM_PRODUCTION_HIT_RELIABILITY) {
  throw new Error(
    `Production NPC combat hit reliability ${percent(productionReliability)} is below ` +
    `${percent(MINIMUM_PRODUCTION_HIT_RELIABILITY)}`
  );
}

function recordDuel({ playerTacticId, enemyTacticId, playerSlug, enemySlug, seed }) {
  const battle = createLakeBattle({
    ...ARENA,
    playerSlug,
    enemySlug,
    shipFootprints,
    seed
  });
  const result = evaluateLakeBattleAiDuel(battle, {
    playerTacticId,
    enemyTacticId,
    durationSeconds: DUEL_SECONDS
  });
  addResult(totals.get(playerTacticId), result.player, result.outcome, "player");
  addResult(totals.get(enemyTacticId), result.enemy, result.outcome, "enemy");
}

function addResult(total, metrics, outcome, role) {
  total.duels += 1;
  total.cannonballsFired += metrics.cannonballsFired;
  total.broadsideVolleys += metrics.broadsideVolleys;
  total.cannonHits += metrics.cannonHits;
  total.hullDamageInflicted += metrics.hullDamageInflicted;
  if (metrics.cannonHits > 0) {
    total.duelsWithHit += 1;
    total.firstCannonHitSeconds += metrics.firstCannonHitSeconds;
  }
  const won = (role === "player" && outcome === "victory") ||
    (role === "enemy" && outcome === "defeat");
  const lost = (role === "player" && outcome === "defeat") ||
    (role === "enemy" && outcome === "victory");
  if (won) total.wins += 1;
  else if (lost) total.losses += 1;
  else total.draws += 1;
}

function blankTotals() {
  return {
    duels: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    duelsWithHit: 0,
    broadsideVolleys: 0,
    cannonballsFired: 0,
    cannonHits: 0,
    hullDamageInflicted: 0,
    firstCannonHitSeconds: 0
  };
}

function percent(ratio) {
  return `${(ratio * 100).toFixed(1)}%`;
}
