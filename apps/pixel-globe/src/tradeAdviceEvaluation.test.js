import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  playerTradeAdviceByCity, playerTradeAccess, playerTradeTerms, portEntryStatus,
  validateGameState
} from "./gameState.js";
import { bestPurchasedTradeRoute } from "./dialogueSystem.js";
import { createWorldEconomy } from "./economy.js";

const ports = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url))).cities;
function voyage() {
  return JSON.parse(readFileSync(new URL("./test-fixtures/saves/dense-local-save-v2-game-state-v104.json", import.meta.url))).payload.gameState;
}

test("batched advice preserves admission, trade restrictions and prices at every port", () => {
  const state = voyage();
  const before = structuredClone(state);
  const goodIds = ["cloves", "fish", "silver"];
  const simMinute = 234567;
  const result = playerTradeAdviceByCity(state, ports, { goodIds, simMinute });
  for (const city of ports) {
    const expectedAccess = portEntryStatus(state, city, simMinute).allowed &&
      playerTradeAccess(state, city, { simMinute }).allowed;
    const advice = result.get(city.cityId);
    assert.equal(advice.allowed, expectedAccess, city.cityId);
    if (expectedAccess) for (const goodId of goodIds) {
      assert.deepEqual(advice.termsByGoodId.get(goodId), playerTradeTerms(state, city, goodId, { simMinute }));
    }
    else assert.equal(advice.termsByGoodId.size, 0);
  }
  assert.deepEqual(state, before, "advice and admission checks must not create visits or change the saved voyage");
});

test("merchant exit advice does not revalidate voyage history for each destination", () => {
  const state = voyage();
  state.cargo.cloves = 20;
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const originCity = ports.find(({ cityId }) => cityId === "ternate|indonesia");
  const destination = ports.find(({ cityId }) => cityId === "london|united kingdom");
  const notices = state.memory.namedCrewDeathNotices;
  let validationReads = 0;
  Object.defineProperty(state.memory, "namedCrewDeathNotices", { enumerable: true, get() { validationReads++; return notices; } });
  const input = { purchases: { cloves: { goodId: "cloves", quantity: 20, cost: 20 } },
    originCity, gameState: state, economy, simMinute: 0, sailingDistanceKm: () => 1000 };
  const single = bestPurchasedTradeRoute({ ...input, portCities: [destination] });
  const singleReads = validationReads;
  validationReads = 0;
  const worldwide = bestPurchasedTradeRoute({ ...input, portCities: ports });
  assert.ok(single && worldwide);
  assert.equal(validationReads, singleReads, "validation work must be independent of the number of candidate ports");
  assert.ok(validationReads > 0, "the query must still validate its boundary");
});

test("advice snapshots cannot bypass later validation or retain stale trade terms", () => {
  const state = voyage();
  const city = ports.find(({ cityId }) => cityId === "london|united kingdom");
  playerTradeAdviceByCity(state, [city], { goodIds: ["fish"] });
  state.relations.factionReputation.england = -100;
  const updated = playerTradeAdviceByCity(state, [city], { goodIds: ["fish"] });
  assert.equal(updated.get(city.cityId).allowed, false);
  state.cargo.fish = -1;
  assert.throws(() => playerTradeAdviceByCity(state, [city]), /cargo/i);
  assert.throws(() => playerTradeTerms(state, city, "fish"), /cargo/i);
  assert.throws(() => validateGameState(state), /cargo/i);
  const valid = voyage();
  assert.throws(() => playerTradeAdviceByCity(valid, [city, city]), /Duplicate trade advice city/);
  assert.throws(() => playerTradeAdviceByCity(valid, [city], { goodIds: ["missing-good"] }), /good/i);
});
