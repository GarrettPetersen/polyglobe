import assert from "node:assert/strict";
import test from "node:test";

import {
  MUGHAL_EXPANSION_WARSHIP_TARGET,
  factionConquestCommissionChance,
  factionDiplomaticAggressionMultiplier,
  factionExpansionTargetPriority,
  factionExpansionWarshipTarget
} from "./factionExpansion.js";
import { gameMinuteForDate } from "./rulers.js";

test("Mughal strategy is more aggressive than Delhi and prioritizes historical fronts", () => {
  const baburMinute = gameMinuteForDate(1527, 1, 1);
  const humayunMinute = gameMinuteForDate(1535, 1, 1);

  assert.equal(factionDiplomaticAggressionMultiplier("delhi", "bengal", baburMinute), 1);
  assert.equal(factionExpansionTargetPriority("mughal", "bengal", baburMinute), 4);
  assert.equal(factionExpansionTargetPriority("mughal", "gujarat", baburMinute), 0);
  assert.equal(factionExpansionTargetPriority("mughal", "gujarat", humayunMinute), 2.5);
  assert.ok(factionDiplomaticAggressionMultiplier("mughal", "bengal", baburMinute) > 8);
});

test("Mughals receive more conquest offers and a dedicated war flotilla", () => {
  assert.equal(factionConquestCommissionChance("delhi", 0.35), 0.35);
  assert.equal(factionConquestCommissionChance("mughal", 0.35), 0.72);
  assert.equal(factionExpansionWarshipTarget("delhi"), 0);
  assert.equal(factionExpansionWarshipTarget("mughal"), MUGHAL_EXPANSION_WARSHIP_TARGET);
});
