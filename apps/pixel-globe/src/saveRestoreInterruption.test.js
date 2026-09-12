import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { canonicalGameStateFixtures } from "./gameStateSchema.js";
import { migrateGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { savedVoyageCrashContext } from "./gameTelemetry.js";
import { createWhaleMemory, seedWhalePopulation, beginWhaleAdvance } from "./whaleSystem.js";
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

test("restored whale initialization uses the saved clock and position, independent of the previous mode", () => {
  const restore = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "restoreSavedVoyage");
  const initialize = restore.body.statements.find(node => node.getText(source).startsWith("ensureWhalePopulation(restoredGameState"));
  assert.ok(initialize, "exercise the production restore call as well as its initializer");
  const waters = Array.from({ length: 20 }, (_, tileId) => {
    const lat = tileId % 2 ? 42 : -44;
    const lon = tileId * 18 - 180;
    const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
    return { tileId, lat, lon, position: [Math.cos(a) * Math.cos(b), Math.sin(a), -Math.cos(a) * Math.sin(b)] };
  });
  for (const previousMinute of [100, 630829.1815998117]) {
    const minute = 114245.035868;
    const state = { voyageSeed: "whale-restore", memory: { whales: createWhaleMemory() } };
    const playerPosition = [0, 0, 1];
    const context = {
      restoredGameState: state, restoredWorldClock: { currentMinute: minute },
      savedShip: { position: playerPosition }, weatherClockMinutes: previousMinute, ship: { position: [1, 0, 0] },
      geodesicTileCount: () => waters.length, WORLD_DISCRETE_WEATHER_SUBDIVISIONS: 1,
      weatherBake: { tileCount: waters.length }, graph: { tileCount: waters.length, neighbors: [],
        latDeg: waters.map(w => w.lat), lonDeg: waters.map(w => w.lon) },
      earthById: waters.map(() => ({ t: "water" })), oceanReachableNavigationMask: waters.map(() => 1),
      whaleTileHasCoastClearance: () => true, tileCenterVector: id => waters[id].position,
      reconcileWhaleCoastClearance() {}, console: { info() {} },
      seedWhalePopulation: (memory, candidates, _count, options) => {
        assert.equal(options.startMinute, minute);
        assert.equal(options.avoidPosition, playerPosition);
        return seedWhalePopulation(memory, candidates, 20, options);
      }
    };
    const initializer = liveFunctions(["ensureWhalePopulation"], context).ensureWhalePopulation;
    runInNewContext(initialize.getText(source), { ...context, ensureWhalePopulation: initializer });
    assert.equal(state.memory.whales.lastEcologyMinute, minute);
    assert.doesNotThrow(() => beginWhaleAdvance(state.memory.whales, 0, () => ({ ok: true, tileId: 0 }), minute));
    const populated = structuredClone(state.memory.whales);
    runInNewContext(initialize.getText(source), { ...context, ensureWhalePopulation: initializer });
    assert.deepEqual(state.memory.whales, populated, "existing whale history must not be reset on restore");
  }
});

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
  await liveFunctions(["prepareSavedVoyageForMenu", "continueSavedVoyage"], runtime).continueSavedVoyage();
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
  createSovereignWarLoanOffer(memory, { offerRoll: 0, borrowerFactionId: "spain", enemyFactionId: "portugal",
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

test("restoring a building canal publishes the saved clock before rebuilding quest readiness", async () => {
  const { exeterCanalQuestView, TOPSHAM_CITY_ID, EXETER_CANAL_STAGE_MINUTES } = await import("./exeterCanal.js");
  const restore = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "restoreSavedVoyage");
  const statements = restore.body.statements;
  const stateIndex = statements.findIndex(node => node.getText(source) === "gameState = restoredGameState;");
  const readinessIndex = statements.findIndex(node => node.getText(source) === "initializeFetchQuestReadiness();");
  // Execute the production activation sequence, including clock publication
  // immediately preceding it. Unrelated asset/economy services are boundary fakes.
  const clockIndex = statements.findIndex(node => node.getText(source) === "weatherClockMinutes = restoredWorldClock.currentMinute;");
  const code = statements.slice(Math.min(stateIndex, clockIndex), readinessIndex + 1).map(node => node.getText(source)).join("\n");
  for (const elapsed of [0, EXETER_CANAL_STAGE_MINUTES, 3 * EXETER_CANAL_STAGE_MINUTES]) {
    const startMinute = 8_000_000;
    const state = { cargo: {}, memory: { quests: { cargoDeliveries: {}, exeterCanal: {
      version: 1, accepted: true, startedMinute: startMinute
    } } } };
    let observed;
    const runtime = {
      gameState: null, restoredGameState: state, weatherClockMinutes: 0, voyageStartClockMinutes: 0,
      recoveredWhaleClockMinutes: 0,
      restoredWorldClock: { currentMinute: startMinute + elapsed, voyageStartMinute: 10 },
      weatherClockParts: minute => ({ minute }), savedShip: { typeSlug: "galleon" },
      payload: {}, savedWorldTopology: {}, legacyCityIdForPortReference() {}, migratedDiscoveryReferenceCount: 0,
      syncExeterCanalWorldState() {}, syncColonizationWorldState() {}, applyCurrentPortConquestOwnership() {},
      candidateCatalog: { cities: new Map(), ports: [] }, candidateWorld: { recoveredDerivedSystems: [] },
      ensureColonizationDefenseEncounter() {}, ensureTreasureCampaignEncounters() {},
      pendingWineCaptainDialogues: [], pendingFetchQuestCaptainDialogues: [],
      initializeFetchQuestReadiness() {
        observed = exeterCanalQuestView(runtime.gameState, { cityId: TOPSHAM_CITY_ID }, runtime.weatherClockMinutes);
      }
    };
    await runInNewContext(`(async () => { ${code} })()`, runtime);
    assert.equal(observed.stage, elapsed / EXETER_CANAL_STAGE_MINUTES);
    assert.equal(runtime.voyageStartClockMinutes, 10);
    assert.equal(runtime.weatherParts.minute, startMinute + elapsed);
  }
});
