import assert from "node:assert/strict";
import { assertTradeConservation } from "./oracles.mjs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createScenario, reachableCity, renderScenario, validateDialogueView,
  transitionScenario, cityForSession, contextForScenario, validateDisabledAction } from "../reachability/port-dialogue-reachability.mjs";
import { createPortDialogueSession, portCityNavigationView, enterPortCityLocation,
  selectPortDialogueOption, deliveryMissionShouldOpenOnArrival } from "../../src/dialogueSystem.js";
import { createWorldEconomy, snapshotWorldEconomy, restoreWorldEconomy,
  advanceWorldEconomy, createWorldEconomySnapshotPlan, advanceWorldEconomySnapshotPlan } from "../../src/economy.js";
import { completeQuest, advanceGamePolitics, reconcileQuestWorldAssumptions, validateGameState, migrateGameState } from "../../src/gameState.js";
import { applyPortConquestOwnership } from "../../src/portConquest.js";
import { createPoliticsView } from "../../src/politics.js";
import { DEFAULT_TEST_PLAYER_CHARACTER } from "../../src/test-fixtures/createTestGameState.js";
import { shipStatsForSlug } from "../../src/shipStats.js";

// These actions hand control to browser-owned systems. They are reported as
// boundaries, never counted as executed by this domain adapter.
const HOST_BOUNDARIES = new Set([
  "open-crew-management", "open-passenger", "attempt-disguise", "land-marines", "attack-city",
  "purchase-ship", "set-port-heading", "wait-in-port"
]);
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const catalog = JSON.parse(readFileSync(new URL("../../city-visualizer/data/cities.json", import.meta.url))).cities;
const cities = catalog.map(reachableCity);
const byId = new Map(cities.map((city) => [city.cityId, city]));
function economy(seedKey) {
  return createWorldEconomy({ ports: cities, shipyardPorts: cities.filter(({ services }) => services.shipyard), startMinute: 0, seedKey });
}
function runtimeCities(gameState) {
  const ports = structuredClone(cities);
  applyPortConquestOwnership(gameState.memory.conquest, ports);
  return ports;
}
export function portActionId(action) {
  const canonical = (value, nested = false) => {
    if (value === null || typeof value !== "object") return value;
    if (nested && typeof value.id === "string") return { id: value.id };
    if (Array.isArray(value)) return value.map((entry) => canonical(entry, true));
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .filter(([key]) => !/^(name|label|text|country)$|(?:Name|Label|Text|Country)$/.test(key))
      .map(([key, entry]) => [key, canonical(entry, true)]));
  };
  return `choose:${JSON.stringify(canonical(action))}`;
}
function nextDestination(state) {
  const index = state.portCities.findIndex((city) => city.cityId === state.city.cityId);
  assert.ok(index >= 0, `Current city missing from journey catalog: ${state.city.cityId}`);
  return state.portCities[(index + 1) % state.portCities.length];
}
function arrive(state, city) {
  state.city = city;
  state.session = createPortDialogueSession(city, {
    initialNodeId: deliveryMissionShouldOpenOnArrival(state.gameState, city, state.portCities) ? "quest" : "root",
    admittedToPort: true
  });
  if (!state.visited.includes(city.cityId)) state.visited.push(city.cityId);
}
function navigation(state) {
  return portCityNavigationView(state.session, cityForSession(state), state.gameState,
    state.economy, state.portCities, contextForScenario(state));
}
function record(state) {
  return { gameState: state.gameState, economy: snapshotWorldEconomy(state.economy),
    cityId: state.city.cityId, shipSlug: state.shipStats.slug, session: state.session,
    simMinute: state.simMinute ?? 0, seedKey: state.economy.seedKey,
    visited: state.visited, excluded: state.excluded };
}
export function createPortJourneyAdapter({ startCityId = "london|united kingdom" } = {}) {
  return {
    initial(seed) {
      const city = byId.get(startCityId);
      assert.ok(city, `Unknown starting city: ${startCityId}`);
      const home = byId.get("london|united kingdom");
      const state = createScenario(city, { cities, economy: economy(`journey:${seed}`) }, {
        playerCharacter: { ...DEFAULT_TEST_PLAYER_CHARACTER, nameCulture: "english",
          homePortCityId: home.cityId, homePortTileId: home.tileId,
          homePortName: home.city, homePortCountry: home.country }
      });
      state.visited = [city.cityId];
      state.excluded = [];
      return record(state);
    },
    snapshot: record,
    restore(saved) {
      assert.ok(Number.isFinite(saved.simMinute) && saved.simMinute >= 0, "Invalid journey clock");
      assert.ok(Array.isArray(saved.visited) && saved.visited.every((id) => byId.has(id)), "Invalid visited city IDs");
      assert.equal(new Set(saved.visited).size, saved.visited.length, "Duplicate visited city IDs");
      assert.ok(Array.isArray(saved.excluded) && saved.excluded.every((id) => typeof id === "string"), "Invalid journey boundaries");
      const city = byId.get(saved.cityId);
      assert.ok(city, `Unknown saved journey city: ${saved.cityId}`);
      const shipStats = shipStatsForSlug(saved.shipSlug);
      const gameState = migrateGameState(structuredClone(saved.gameState), shipStats);
      const portCities = runtimeCities(gameState);
      return { ...saved, city: portCities.find((port) => port.cityId === city.cityId), shipStats, portCities,
        gameState,
        economy: restoreWorldEconomy(economy(saved.seedKey), saved.economy) };
    },
    actions(state) {
      const view = renderScenario(state);
      validateDialogueView(view, state);
      const actions = [];
      for (const [index, option] of view.options.entries()) {
        if (option.disabled) continue;
        const kind = option.action.type;
        if (HOST_BOUNDARIES.has(kind)) {
          const boundary = `${state.session.nodeId}:${kind}`;
          if (!state.excluded.includes(boundary)) state.excluded.push(boundary);
          continue;
        }
        actions.push({ id: portActionId(option.action), kind, index,
          coverage: `${state.session.nodeId}:${kind}:${option.action.nodeId ?? ""}` });
      }
      if (state.session.nodeId === "root") {
        actions.push({ id: "advance-world-month", ageWorld: true, coverage: "politics:economy:age-world" });
        const quest = state.gameState.memory.quests.active;
        if (quest?.destinationCityId && quest.destinationCityId !== state.city.cityId) {
          const destination = state.portCities.find((city) => city.cityId === quest.destinationCityId);
          assert.ok(destination, `Quest destination missing: ${quest.destinationCityId}`);
          actions.push({ id: `deliver-at:${destination.cityId}`, destination, coverage: "visit-quest-destination" });
        }
        for (const location of navigation(state).locations) {
          actions.push({ id: `enter:${location.id}`, location: location.id, coverage: `location:${location.id}` });
        }
        // Travel is an explicit scenario seam, not simulated sailing. State and
        // every market persist. Rotate destinations to cover the whole catalog.
        const destination = nextDestination(state);
        actions.push({ id: `visit:${destination.cityId}`, destination, coverage: "visit-port" });
      }
      return actions;
    },
    execute(state, action) {
      let closed = false;
      if (action.ageWorld) {
        // Scenario seam: age the world's policies and markets around the existing
        // player history. This deliberately does not simulate sailing or hunger.
        state.simMinute = (state.simMinute ?? 0) + 30 * 1440;
        advanceGamePolitics(state.gameState, state.simMinute, { portCities: state.portCities, cities: state.portCities });
        advanceWorldEconomy(state.economy, state.simMinute);
        const cityId = state.city.cityId;
        state.portCities = runtimeCities(state.gameState);
        state.city = state.portCities.find((city) => city.cityId === cityId);
        reconcileQuestWorldAssumptions(state.gameState, state.portCities, { identityCities: state.portCities });
      } else if (action.destination) {
        arrive(state, action.destination);
      } else if (action.location) {
        const entry = enterPortCityLocation(state.session, cityForSession(state), state.gameState,
          state.economy, state.portCities, action.location, contextForScenario(state));
        if (entry.rootOptionIndex !== null) {
          const result = selectPortDialogueOption(state.session, cityForSession(state), state.gameState,
            state.economy, state.portCities, entry.rootOptionIndex, contextForScenario(state));
          assert.ok(!result.action, `Unhandled location host effect: ${result.action?.type}`);
          closed = result.closed === true;
        }
      } else {
        const before = structuredClone(state.gameState);
        state = transitionScenario(state, action, { executeHostEffects: true, preserveTerminal: true });
        assertTradeConservation(before, state.gameState, state.transitionResult);
        if (state.transitionResult.completedQuest) {
          const copy = structuredClone(state.gameState);
          assert.throws(() => completeQuest(copy, state.city, { ...contextForScenario(state),
            questId: state.transitionResult.completedQuest.id }), /No active quest to complete/);
          assert.deepEqual(copy, state.gameState, "Repeated quest completion changed state");
        }
        closed = state.transitionResult.closed === true;
      }
      if (closed) arrive(state, nextDestination(state));
      // Exercise incremental serialization with single-port batches and compare
      // against the synchronous save. This is not a simulated browser shutdown.
      const plan = createWorldEconomySnapshotPlan(state.economy);
      while (!advanceWorldEconomySnapshotPlan(plan, { maxPorts: 1 })) {}
      assert.deepEqual(plan.snapshot, snapshotWorldEconomy(state.economy));
      const saved = record(state);
      const restored = this.restore(JSON.parse(JSON.stringify(saved)));
      const expected = JSON.parse(JSON.stringify(saved.gameState));
      expected.ship.loadoutTargets = restored.gameState.ship.loadoutTargets;
      assert.deepEqual(restored.gameState, expected, "Journey save lost player consequences");
      assert.deepEqual(snapshotWorldEconomy(restored.economy), saved.economy, "Journey save lost market consequences");
      return restored;
    },
    check(state) {
      validateGameState(state.gameState);
      assert.ok(createPoliticsView(state.gameState, state.simMinute ?? 0, state.portCities).cards.length > 0);
      const view = renderScenario(state);
      validateDialogueView(view, state);
      for (const [index, option] of view.options.entries()) {
        if (option.disabled) validateDisabledAction(state, { index, kind: option.action.type, disabled: true });
      }
    },
    key(state) { return digest({ cityId: state.city.cityId, session: state.session, gameState: state.gameState,
      economy: snapshotWorldEconomy(state.economy) }); },
    boundaries(state) { return state.excluded.sort(); }
  };
}
export const portJourneyStarts = ["london|united kingdom", "lisbon|portugal", "istanbul|turkey", "hafnarfjordur|iceland"];
