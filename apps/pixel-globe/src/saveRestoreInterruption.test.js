import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { canonicalGameStateFixtures } from "./gameStateSchema.js";
import { migrateGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { savedVoyageCrashContext } from "./gameTelemetry.js";
import {
  createSovereignWarLoanMemory, createSovereignWarLoanOffer,
  deferSovereignWarLoanOffer, migrateSovereignWarLoanMemory,
  sovereignWarLoanOfferNeedsPresentation
} from "./sovereignWarLoan.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function liveFunctions(names, context) {
  const code = names.map(name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name).getText(source)).join("\n");
  return runInNewContext(`${code}\n({ ${names.join(", ")} })`, context);
}

test("a failed restore reports the attempted ship and quest without overwriting the saved voyage", async () => {
  const payload = { playerShip: { typeSlug: "galleon" }, gameState: {
    playerCharacter: { name: "Private Captain" }, memory: { campaignGoal: { type: "explorer" } }
  } };
  const before = JSON.stringify(payload);
  const failure = new Error("Saved discovery is missing from the runtime catalog: mountain-mount-ararat");
  const captured = [];
  const runtime = {
    startMenu: {}, localSaveResult: { status: "ready", save: { payload } },
    // An unrelated ship can already exist when restoration fails.
    ship: { typeSlug: "fishing-lugger" }, gameState: { ship: { slug: "fishing-lugger" } },
    dirty: false, savedVoyageCrashContext,
    restoreSavedVoyage: async () => { throw failure; },
    isTransientStaticAssetError: () => false,
    console: { warn() {} },
    gameTelemetry: { captureCrash: (error, context) => captured.push({ error, context }) },
    drawFatalError: (error, heading, context) => captured.push({ error, context, heading })
  };
  await liveFunctions(["continueSavedVoyage"], runtime).continueSavedVoyage();
  assert.equal(captured.length, 2);
  for (const { error, context } of captured) {
    assert.equal(error, failure);
    assert.deepEqual(context, { screen: "save-restore", mainQuest: "explorer", ship: "galleon", redact: ["Private Captain"] });
  }
  assert.equal(JSON.stringify(payload), before);
  assert.equal(runtime.localSaveResult.status, "invalid");
});

test("incomplete save diagnostics explicitly identify unknown metadata", () => {
  assert.deepEqual(savedVoyageCrashContext(null), {
    screen: "save-restore", mainQuest: "unknown", ship: "unknown", redact: []
  });
});

const capital = { cityId: "seville|spain", tileId: 1, factionId: "spain", isFactionCapital: true, capitalOfFactionId: "spain" };
function offeredMemory(doubloons) {
  const memory = createSovereignWarLoanMemory();
  createSovereignWarLoanOffer(memory, { borrowerFactionId: "spain", enemyFactionId: "portugal",
    capital, simMinute: 10, doubloons });
  return memory;
}

for (const doubloons of [900_000, 1_000_000]) {
  test(`interrupting any loan request step preserves an unanswered offer with ${doubloons} doubloons`, () => {
    const memory = offeredMemory(doubloons);
    let sequence, complete, choices;
    const runtime = {
      gameState: { playerCharacter: {}, doubloons, memory: { quests: { sovereignWarLoan: memory } } },
      weatherClockMinutes: 10, SOVEREIGN_WAR_LOAN_PRINCIPAL: 1_000_000,
      rulerAtMinute: () => ({ displayName: "Charles" }), factionById: () => ({ name: "Portugal" }),
      pairedCharacterAlertStep: value => value,
      startCharacterAlertSequence: (steps, callback) => { sequence = steps; complete = callback; return true; },
      openCharacterChoiceAlertModal: (_official, _message, options) => { choices = options; return true; },
      deferSovereignWarLoanOffer, saveVoyageNow() {}
    };
    const functions = liveFunctions(["openSovereignWarLoanOfferDialogue", "openSovereignWarLoanChoice", "deferSovereignWarLoan"], runtime);
    functions.openSovereignWarLoanOfferDialogue({ character: {} });
    assert.equal(sequence.length, 2);
    for (const step of sequence) {
      assert.ok(step.message.length > 0);
      const loaded = migrateSovereignWarLoanMemory(JSON.parse(JSON.stringify(memory)));
      assert.equal(sovereignWarLoanOfferNeedsPresentation(loaded, capital, doubloons), true);
    }
    complete();
    assert.equal(choices.length, 2);
    assert.equal(memory.offer.presentationTier, 0);
    if (doubloons < 1_000_000) {
      choices[0].onSelect();
      const loaded = migrateSovereignWarLoanMemory(JSON.parse(JSON.stringify(memory)));
      assert.equal(sovereignWarLoanOfferNeedsPresentation(loaded, capital, doubloons), false);
      assert.equal(sovereignWarLoanOfferNeedsPresentation(loaded, capital, 1_000_000), true);
    }
    assert.equal(runtime.gameState.doubloons, doubloons);
    assert.equal(memory.contract, null);
  });
}

test("old prematurely acknowledged offers resume idempotently without changing financial history", () => {
  for (const version of [1, 2]) {
    const memory = { ...offeredMemory(1_000_000), version };
    memory.offer.presentationTier = 2;
    const original = structuredClone(memory);
    const restored = migrateSovereignWarLoanMemory(memory);
    assert.equal(sovereignWarLoanOfferNeedsPresentation(restored, capital, 1_000_000), true);
    assert.deepEqual(migrateSovereignWarLoanMemory(restored), restored);
    assert.deepEqual(memory, original);
    assert.deepEqual(restored.history, original.history);
    assert.deepEqual(restored.lastOfferMinuteByFactionId, original.lastOfferMinuteByFactionId);
    assert.equal(restored.contract, null);
  }
});


test("current-version save loading also resumes prematurely acknowledged loan requests", () => {
  const state = canonicalGameStateFixtures()[0].state;
  const memory = offeredMemory(1_000_000);
  memory.offer.presentationTier = 2;
  state.memory.quests.sovereignWarLoan = memory;
  state.doubloons = 1_000_000;
  const restored = migrateGameState(state, shipStatsForSlug(state.ship.slug));
  assert.equal(restored.memory.quests.sovereignWarLoan.offer.presentationTier, 0);
  assert.equal(restored.memory.quests.sovereignWarLoan.contract, null);
  assert.equal(restored.doubloons, 1_000_000);
});

test("deferral rejects a funded purse and an absent offer", () => {
  assert.throws(() => deferSovereignWarLoanOffer(offeredMemory(1_000_000), 1_000_000), /assembling the full million/);
  assert.throws(() => deferSovereignWarLoanOffer(createSovereignWarLoanMemory(), 900_000), /No sovereign war-loan offer/);
});
