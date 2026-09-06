import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { advanceGamePolitics, createGameState, migrateGameState,
  reconcileQuestWorldAssumptions, validateGameState } from "./gameState.js";
import { markFactionSeaCapitalsOnPorts } from "./factions.js";
import { applyPortConquestOwnership } from "./portConquest.js";
import { createPoliticsView } from "./politics.js";
import { gameMinuteForDate } from "./rulers.js";
import { MUGHAL_SUCCESSION_FLAG } from "./historicalSovereignty.js";

const catalog = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url))).cities;

for (const restricted of [false, true]) {
  test(`politics lifecycle through 1540 with ${restricted ? "restricted Mediterranean" : "worldwide"} player ports`, () => {
    const cities = structuredClone(catalog);
    markFactionSeaCapitalsOnPorts(cities);
    // A deliberately restricted sailing catalog exercises the demo contract:
    // worldwide governments continue to exist outside the player's boundaries.
    const ports = restricted ? cities.filter(({ lat, lon }) => lat >= 30 && lat <= 46 && lon >= -5 && lon <= 36) : cities;
    assert.ok(ports.length > 0);
    let state = createGameState({ cargoCapacity: 20 });
    let mostActiveEmbargoes = 0;
    for (let year = 1522; year <= 1540; year++) {
      for (const month of [1, 4, 7, 10]) {
        const minute = gameMinuteForDate(year, month, 1);
        advanceGamePolitics(state, minute, { portCities: ports, cities });
        mostActiveEmbargoes = Math.max(mostActiveEmbargoes,
          state.relations.tradeEmbargoes.orders.filter(({ liftedMinute }) => liftedMinute === null).length);
        applyPortConquestOwnership(state.memory.conquest, cities);
        reconcileQuestWorldAssumptions(state, ports, { identityCities: cities });
        validateGameState(state);
        const view = createPoliticsView(state, minute, cities);
        assert.ok(view.cards.length > 0);
        const serialized = JSON.stringify(state);
        state = migrateGameState(JSON.parse(serialized));
        reconcileQuestWorldAssumptions(state, ports, { identityCities: cities });
        assert.deepEqual(createPoliticsView(state, minute, cities), view,
          `politics changed after restoration at ${year}-${month}`);
      }
    }
    assert.equal(state.memory.flags[MUGHAL_SUCCESSION_FLAG], "completed");
    assert.equal(state.relations.papacy.englishReformationApplied, true);
    assert.ok(mostActiveEmbargoes > 48, "exercise active policy beyond the former history limit");
  });
}
