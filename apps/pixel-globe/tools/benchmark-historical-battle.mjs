import { performance } from "node:perf_hooks";

import {
  HISTORICAL_BATTLE_FIXED_STEP_SECONDS,
  HISTORICAL_BATTLE_PHASE_ACTIVE,
  createHistoricalBattle,
  updateHistoricalBattle
} from "../src/historicalBattle.js";
import {
  HOLY_LEAGUE_SIDE_ID,
  LEPANTO_SCENARIO_ID
} from "../src/historicalBattleScenarios.js";

const SIMULATED_SECONDS = 180;
const STEP_COUNT = Math.round(SIMULATED_SECONDS / HISTORICAL_BATTLE_FIXED_STEP_SECONDS);
const battle = createHistoricalBattle({
  scenarioId: LEPANTO_SCENARIO_ID,
  playerSideId: HOLY_LEAGUE_SIDE_ID,
  playerSquadronId: "league-center",
  seed: 0x42454e43
});

const startedAt = performance.now();
for (let step = 0; step < STEP_COUNT && battle.phase === HISTORICAL_BATTLE_PHASE_ACTIVE; step++) {
  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    desiredHeadingRad: 0,
    rowingRequested: true,
    firePort: step % 120 === 0,
    fireStarboard: step % 120 === 60
  });
}
const elapsedMs = performance.now() - startedAt;
const sideSummary = battle.sides.map((side) => (
  `${side.name}: ${side.remainingShips}/${side.startingShips}`
)).join(" | ");

console.log("Historical battle benchmark: Lepanto, 1571");
console.log(`Ships: ${battle.ships.length}`);
console.log(`Simulated: ${battle.elapsedSeconds.toFixed(1)}s in ${elapsedMs.toFixed(1)}ms`);
console.log(`Cost: ${(elapsedMs / battle.metrics.fixedSteps).toFixed(3)}ms/fixed step`);
console.log(`Target queries: ${battle.metrics.targetQueries.toLocaleString()}`);
console.log(`Spatial candidates: ${battle.metrics.spatialCandidates.toLocaleString()}`);
console.log(sideSummary);

if (battle.ships.length !== 586) throw new Error(`Lepanto benchmark lost its fleet scale: ${battle.ships.length}`);
if (battle.metrics.fixedSteps === 0) throw new Error("Lepanto benchmark did not advance");
