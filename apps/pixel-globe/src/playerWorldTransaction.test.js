import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createDistantWorldWorkerClient } from "./distantWorldWorkerClient.js";
import { createGameState, startPlayerShipyardInvestment } from "./gameState.js";
import { createWorldEconomy, restoreWorldEconomy, snapshotWorldEconomy,
  createWorldEconomyRestorePlan, advanceWorldEconomyRestorePlan, advanceWorldEconomy } from "./economy.js";
import { createPortDialogueSession, portDialogueView, selectPortDialogueAction } from "./dialogueSystem.js";
import { assertPlayerShipyardInvestmentWorldConsistency, SHIPYARD_INVESTMENT_MATERIALS } from "./shipyardInvestment.js";
import { shipyardAtPort } from "./shipyards.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const transactionSource = ["invalidateDistantWorldWorkerState", "applyDialogueOption",
  "advanceDistantWorldSimulationApply", "advanceDistantWorldPartRestore", "finishDistantWorldSimulationApply"].map((name) => {
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name.text === name);
  assert.ok(declaration, name);
  return declaration.getText(source);
}).join("\n");
const { cities } = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url), "utf8"));
const city = cities.find(({ cityId }) => cityId === "malacca|malaysia");
const otherPort = cities.find(({ cityId }) => cityId === "lisbon|portugal");

for (const phase of ["in-flight", "queued", "compare", "restore"]) {
  test(`funding Malacca during worker ${phase} preserves its backing and save contract`, () => {
    const economy = createWorldEconomy({ ports: [city, otherPort], startMinute: 0 });
    const oldSnapshot = snapshotWorldEconomy(economy);
    const simulated = structuredClone(economy);
    advanceWorldEconomy(simulated, 360);
    const simulatedSnapshot = snapshotWorldEconomy(simulated);
    const state = createGameState({ cargoCapacity: 200 });
    state.doubloons = 120000;
    startPlayerShipyardInvestment(state, city, shipyardAtPort(economy.shipyards, city), { simMinute: 0 });
    state.memory.shipyardInvestment.project.capitalPaid = true;
    state.memory.shipyardInvestment.project.materialsDelivered = { ...SHIPYARD_INVESTMENT_MATERIALS };
    const dialogueState = createPortDialogueSession(city, { initialNodeId: "shipyard-investment" });
    const context = { simMinute: 400, shipyard: shipyardAtPort(economy.shipyards, city) };
    const option = portDialogueView(dialogueState, city, state, economy, [city], context)
      .options.find(({ action }) => action.type === "open-player-shipyard");
    assert.ok(option && !option.disabled);
    const pending = [];
    let worker;
    class Worker {
      constructor() { worker = this; this.listeners = new Map(); this.messages = []; }
      addEventListener(type, listener) { this.listeners.set(type, listener); }
      postMessage(message) { this.messages.push(message); }
      emit(data) { this.listeners.get("message")({ data }); }
    }
    const client = createDistantWorldWorkerClient({ workerUrl: new URL("https://test.invalid/worker.js"),
      onDue: (result) => pending.push(result), onError: (error) => { throw error; }, WorkerClass: Worker });
    client.reset({}, 0, { systems: {} });
    const generation = worker.messages[0].generation;
    worker.emit({ type: "ready", generation, nextMinute: 1 });
    client.requestAdvance(1, () => ({}));
    const stale = { due: true, economy: true, maintenance: false, shipIds: [], cartIds: [], nextMinute: 200,
      simulation: { before: { economy: oldSnapshot }, after: { economy: simulatedSnapshot },
        changedParts: ["economy"], foreignPortCalls: [], protectedNpcShipIds: [] } };
    if (phase === "queued") pending.push(stale);
    const completed = new Error("Transaction completed; stop before unrelated audiovisual effects");
    const runtime = {
      dialogueState, gameState: state, worldEconomy: economy, distantWorldWorkerClient: client,
      pendingDistantWorldEvents: pending, distantWorldWorkerResetPending: false,
      distantWorldApplyState: ["compare", "restore"].includes(phase)
        ? { phase, result: stale.simulation, partIndex: 0, partRestorePlan: null } : null,
      createWorldEconomyRestorePlan, advanceWorldEconomyRestorePlan,
      measurePerformanceBenchmarkStage: (_label, callback) => callback(),
      currentDistantWorldProtectedNpcShipIds: () => [],
      invalidateDialogueOptionGeometry() {}, dialogueOptionIconOrigin: () => null,
      currentDialogueCity: () => city, playerAccessiblePortCities: () => [city], portDialogueContext: () => context,
      selectPortDialogueAction: (...args) => {
        if (phase === "restore") assert.equal(economy.lastMinute, 360,
          "a partially applied simulation must finish before the player's transaction");
        const result = selectPortDialogueAction(...args);
        assert.equal(result.playerShipyardFunded.portCityId, city.cityId);
        throw completed;
      }
    };
    if (phase === "restore") {
      const plan = createWorldEconomyRestorePlan(economy, simulatedSnapshot);
      while (plan.phase !== "apply-ports") advanceWorldEconomyRestorePlan(plan, { maxPorts: 1 });
      assert.equal(advanceWorldEconomyRestorePlan(plan, { maxPorts: 1 }), false);
      runtime.distantWorldApplyState.partRestorePlan = plan;
    }
    const apply = runInNewContext(`${transactionSource}\napplyDialogueOption`, runtime);
    assert.throws(() => apply(0, option), (error) => error === completed);
    worker.emit({ type: "due", generation, result: stale });
    // Reproduce what the next frame would apply if the transaction did not own
    // both the queued-result and in-flight-message lifecycle.
    if (runtime.distantWorldApplyState || pending.length > 0) restoreWorldEconomy(economy, oldSnapshot);
    assert.equal(assertPlayerShipyardInvestmentWorldConsistency(state.memory.shipyardInvestment,
      economy, new Map([[city.cityId, city]])), true);
    assert.equal(runtime.distantWorldApplyState, null);
    assert.equal(pending.length, 0);
    assert.equal(runtime.distantWorldWorkerResetPending, true);
    assert.equal(worker.messages.length, 2, "menu actions must not clone the world immediately");
    assert.equal(client.requestAdvance(200, () => ({})), false);
    const saved = snapshotWorldEconomy(economy);
    const restored = createWorldEconomy({ ports: [city, otherPort], startMinute: 400 });
    restoreWorldEconomy(restored, saved);
    assertPlayerShipyardInvestmentWorldConsistency(state.memory.shipyardInvestment,
      restored, new Map([[city.cityId, city]]));
    client.reset({}, 100, { systems: { economy } });
    const nextGeneration = worker.messages.at(-1).generation;
    worker.emit({ type: "ready", generation: nextGeneration, nextMinute: 101 });
    assert.equal(client.requestAdvance(101, () => ({})), true, "fresh simulation resumes after the menu");
  });
}
