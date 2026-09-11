import assert from "node:assert/strict";
import test from "node:test";
import { createPlayerTestGameState } from "./test-fixtures/createTestGameState.js";
import { adjustFactionReputation, recordAttackAgainstFaction, recordTradeWithFaction, migrateGameState } from "./gameState.js";
import { recentReputationChange, validateReputationChanges, REPUTATION_CHANGE_WINDOW_MINUTES } from "./reputationHistory.js";
import { createPoliticsView } from "./politics.js";

test("standing explanations record the actual attack clamp, persist, and expire after thirty days", () => {
  const state = createPlayerTestGameState({ cargoCapacity: 30 });
  state.survival.lastMinute = 100;
  adjustFactionReputation(state, "spain", 100);
  const before = state.relations.factionReputation.spain;
  recordAttackAgainstFaction(state, "spain", { lawfulWartimeAction: true });
  const saved = migrateGameState(JSON.parse(JSON.stringify(state)));
  const change = recentReputationChange(saved.relations.factionReputationChanges, "spain", 100);
  assert.equal(change.reason, "attack");
  assert.equal(change.delta, saved.relations.factionReputation.spain - before);
  assert.ok(change.delta < 0);
  assert.ok(recentReputationChange(saved.relations.factionReputationChanges, "spain", 100 + REPUTATION_CHANGE_WINDOW_MINUTES));
  assert.equal(recentReputationChange(saved.relations.factionReputationChanges, "spain", 101 + REPUTATION_CHANGE_WINDOW_MINUTES), null);
  const card = createPoliticsView(saved, 100).cards.find(card => card.faction.id === "spain");
  assert.equal(card.player.recentChange.reason, "attack");
});

test("tiny trade changes remain visible and unchanged clamped values do not invent a new event", () => {
  const state = createPlayerTestGameState({ cargoCapacity: 30 });
  state.survival.lastMinute = 100;
  recordTradeWithFaction(state, "spain");
  const change = recentReputationChange(state.relations.factionReputationChanges, "spain", 100);
  assert.equal(change.reason, "trade");
  assert.ok(change.delta > 0);
  adjustFactionReputation(state, "spain", 200);
  const last = structuredClone(state.relations.factionReputationChanges.spain);
  state.survival.lastMinute = 200;
  adjustFactionReputation(state, "spain", 1);
  assert.deepEqual(state.relations.factionReputationChanges.spain, last);
  assert.throws(() => validateReputationChanges({ spain: { ...last, reason: "invented" } }), /Invalid/);
});

test("older saves gain empty standing history without inventing old reasons or resetting their canal", () => {
  const state = createPlayerTestGameState({ cargoCapacity: 30 });
  state.version = 105;
  state.memory.quests.exeterCanal.accepted = true;
  delete state.relations.factionReputationChanges;
  const restored = migrateGameState(state);
  assert.deepEqual(restored.relations.factionReputationChanges, {});
  assert.equal(restored.memory.quests.exeterCanal.accepted, true);
});

test("production reputation mutations supply an explanation instead of silently losing their cause", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const offenders = [];
  for (const name of readdirSync(new URL("./", import.meta.url)).filter(name => name.endsWith(".js") && !name.endsWith(".test.js"))) {
    const source = ts.createSourceFile(name, readFileSync(new URL(name, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isCallExpression(node) && /(?:^|\.)adjustFactionReputation$/.test(node.expression.getText(source))) {
        const options = node.arguments[3];
        if (!options || !ts.isObjectLiteralExpression(options) || !options.properties.some(property => property.name?.getText(source) === "reason")) {
          offenders.push(`${name}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(offenders, []);
});

test("upgrading a released save preserves its recorded last reputation action", () => {
  const state = createPlayerTestGameState({ cargoCapacity: 30 });
  state.survival.lastMinute = 120;
  recordTradeWithFaction(state, "spain");
  const before = structuredClone(state.relations.factionReputationChanges);
  state.version = 109;
  const restored = migrateGameState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.relations.factionReputationChanges, before);
  assert.notEqual(restored.relations.factionReputationChanges, state.relations.factionReputationChanges);
});
test("trade reputation is independent of transaction batching", () => {
  const bulk = createPlayerTestGameState({ cargoCapacity: 30 });
  const singles = structuredClone(bulk);
  recordTradeWithFaction(bulk, "spain", 8);
  for (let i = 0; i < 8; i++) recordTradeWithFaction(singles, "spain");
  assert.ok(Math.abs(bulk.relations.factionReputation.spain - singles.relations.factionReputation.spain) < 1e-8);
});
