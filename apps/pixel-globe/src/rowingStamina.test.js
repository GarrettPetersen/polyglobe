import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  ROWING_STAMINA_BAR_COLOR,
  ROWING_STAMINA_BASE_SECONDS,
  ROWING_STAMINA_EXHAUSTION_LOCKOUT_SECONDS,
  ROWING_STAMINA_SECONDS_PER_CREW,
  ROWING_STAMINA_SECONDS_PER_EXPERIENCE_STAR,
  advanceRowingStamina,
  applyRowingStaminaAdvance,
  createRowingStaminaState,
  rowingStaminaAllowsExertion,
  rowingStaminaBarLayout,
  rowingStaminaBarShouldDraw,
  rowingStaminaCapacitySeconds,
  rowingStaminaFraction
} from "./rowingStamina.js";

test("crew size, experience, and perks each lengthen a generous rowing stamina pool", () => {
  const lone = rowingStaminaCapacitySeconds({ activeCrew: 1, averageExperienceStars: 0 });
  assert.equal(lone, ROWING_STAMINA_BASE_SECONDS + ROWING_STAMINA_SECONDS_PER_CREW);
  assert.ok(lone >= 48);
  const worked = rowingStaminaCapacitySeconds({
    activeCrew: 8,
    averageExperienceStars: 2,
    staminaDurationMultiplier: 1.35,
    staminaSecondsFlat: 24
  });
  assert.equal(
    worked,
    (ROWING_STAMINA_BASE_SECONDS + 8 * ROWING_STAMINA_SECONDS_PER_CREW +
      2 * ROWING_STAMINA_SECONDS_PER_EXPERIENCE_STAR) * 1.35 + 24
  );
  assert.ok(worked > lone);
});

test("rowing and hauling drain stamina, rest refills it, and an empty bar locks exertion", () => {
  const state = createRowingStaminaState();
  const capacity = 10;
  assert.equal(rowingStaminaAllowsExertion(state), true);
  assert.equal(rowingStaminaFraction(state, capacity), 1);
  applyRowingStaminaAdvance(state, { dt: 4, exerting: true, capacitySeconds: capacity });
  assert.equal(state.seconds, 6);
  assert.equal(rowingStaminaAllowsExertion(state), true);
  applyRowingStaminaAdvance(state, { dt: 6, exerting: true, capacitySeconds: capacity });
  assert.equal(state.seconds, 0);
  assert.equal(state.lockoutSeconds, ROWING_STAMINA_EXHAUSTION_LOCKOUT_SECONDS);
  assert.equal(rowingStaminaAllowsExertion(state), false);
  applyRowingStaminaAdvance(state, { dt: 2, exerting: true, capacitySeconds: capacity });
  assert.equal(state.lockoutSeconds, 2);
  assert.equal(state.seconds, 2);
  assert.equal(rowingStaminaAllowsExertion(state), false);
  applyRowingStaminaAdvance(state, { dt: 2, exerting: false, capacitySeconds: capacity });
  assert.equal(state.lockoutSeconds, 0);
  assert.equal(state.seconds, 4);
  assert.equal(rowingStaminaAllowsExertion(state), true);
  applyRowingStaminaAdvance(state, { dt: 100, exerting: false, capacitySeconds: capacity });
  assert.equal(state.seconds, capacity);
  assert.equal(advanceRowingStamina(state, { dt: 1, exerting: false, capacitySeconds: capacity }).seconds, capacity);
});

test("the stamina bar hides when full, sits under a visible hull bar, and blinks during lockout", () => {
  const state = createRowingStaminaState();
  assert.equal(rowingStaminaBarShouldDraw(state, 10, 0), false);
  state.seconds = 5;
  assert.equal(rowingStaminaBarShouldDraw(state, 10, 0), true);
  const below = rowingStaminaBarLayout({
    hullX: 4, hullY: 8, hullWidth: 20, hullHeight: 3, hullVisible: true, fraction: 0.5
  });
  assert.deepEqual(below, { x: 4, y: 12, width: 20, height: 3, fillWidth: 9 });
  const instead = rowingStaminaBarLayout({
    hullX: 4, hullY: 8, hullWidth: 20, hullHeight: 3, hullVisible: false, fraction: 0.5
  });
  assert.equal(instead.y, 8);
  state.seconds = 0;
  state.lockoutSeconds = 4;
  assert.equal(rowingStaminaBarShouldDraw(state, 10, 0), true);
  assert.equal(rowingStaminaBarShouldDraw(state, 10, 180), false);
  assert.equal(rowingStaminaBarShouldDraw(state, 10, 360), true);
  assert.notEqual(ROWING_STAMINA_BAR_COLOR.toLowerCase(), "#f9c22b");
  assert.notEqual(ROWING_STAMINA_BAR_COLOR.toLowerCase(), "#91db69");
});

test("world sailing, the lake battle, and the historical battle use the same stamina gate", () => {
  const root = new URL(".", import.meta.url);
  const main = readFileSync(new URL("main.js", root), "utf8");
  const lake = readFileSync(new URL("lakeBattle.js", root), "utf8");
  const historical = readFileSync(new URL("historicalBattle.js", root), "utf8");
  assert.match(main, /applyRowingStaminaAdvance\(playerRowingStamina,/);
  assert.match(main, /updateLakeBattle\(battle, dt, lakeBattleInputCommand\(\), playerRowingStaminaContext\(\)\)/);
  assert.match(main, /updateHistoricalBattle\(battle, dt, historicalBattleInputCommand\(\), playerRowingStaminaContext\(\)\)/);
  assert.match(lake, /applyRowingStaminaAdvance\(stamina,/);
  assert.match(historical, /ship\.playerControlled && exertion/);
  assert.match(historical, /applyRowingStaminaAdvance\(exertion\.state,/);
  assert.equal(lake.includes("applyRowingStaminaAdvance(stamina,"), true);
  assert.equal((lake.match(/applyRowingStaminaAdvance\(/g) || []).length, 1);
});
