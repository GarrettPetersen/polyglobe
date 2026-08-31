import assert from "node:assert/strict";
import test from "node:test";

import {
  ILLICIT_TRADE_ENFORCEMENT_DURATION_MINUTES,
  activeIllicitTradeCombatFactionIds,
  activeIllicitTradeIncidents,
  beginIllicitTradeEnforcementCombat,
  createIllicitTradeEnforcementMemory,
  illicitCargoAvailable,
  illicitTradeIncidentForInspection,
  recordIllicitTradeDeparture,
  resolveIllicitTradeIncident,
  resolveIllicitTradeInspection,
  validateIllicitTradeEnforcementMemory
} from "./illicitTradeEnforcement.js";
import {
  createGameState,
  payIllicitTradeFine,
  surrenderIllicitTradeCargo
} from "./gameState.js";

const GUANGZHOU = Object.freeze({
  cityId: "guangzhou|china",
  tileId: 41,
  portId: "port-guangzhou",
  displayCity: "Guangzhou"
});

function illicitVisit(overrides = {}) {
  return {
    policyId: "ming-maritime-prohibition",
    enforcementFactionId: "ming",
    reputationPenalty: 8,
    transactionCount: 2,
    transactionValue: 900,
    purchasedCargo: { silk: 3, tea: 2 },
    ...overrides
  };
}

test("illicit port trade leaves a bounded, expiring enforcement incident", () => {
  const memory = createIllicitTradeEnforcementMemory();
  const incident = recordIllicitTradeDeparture(memory, illicitVisit(), GUANGZHOU, 100);

  assert.equal(incident.enforcementFactionId, "ming");
  assert.equal(incident.originCityId, GUANGZHOU.cityId);
  assert.equal(incident.originName, "Guangzhou");
  assert.equal(incident.expiresMinute, 100 + ILLICIT_TRADE_ENFORCEMENT_DURATION_MINUTES);
  assert.deepEqual(incident.purchasedCargo, { silk: 3, tea: 2 });
  assert.equal(activeIllicitTradeIncidents(memory, incident.expiresMinute - 1).length, 1);
  assert.equal(activeIllicitTradeIncidents(memory, incident.expiresMinute).length, 0);
  validateIllicitTradeEnforcementMemory(memory);
});

test("only the enforcing faction's warship can inspect an illicit trade incident", () => {
  const memory = createIllicitTradeEnforcementMemory();
  recordIllicitTradeDeparture(memory, illicitVisit(), GUANGZHOU, 100);

  assert.equal(illicitTradeIncidentForInspection(memory, "spain", "spanish-warship", 101), null);
  assert.equal(
    illicitTradeIncidentForInspection(memory, "ming", "ming-warship", 101)?.originName,
    "Guangzhou"
  );
});

test("a missed inspection is not repeated by the same patrol", () => {
  const memory = createIllicitTradeEnforcementMemory();
  const incident = recordIllicitTradeDeparture(memory, illicitVisit(), GUANGZHOU, 100);
  const result = resolveIllicitTradeInspection(memory, incident.id, "ming-warship", 0.999);

  assert.equal(result.detected, false);
  assert.equal(result.newlyDetected, false);
  assert.equal(illicitTradeIncidentForInspection(memory, "ming", "ming-warship", 101), null);
  assert.ok(illicitTradeIncidentForInspection(memory, "ming", "second-warship", 101));
});

test("a detected inspection persists without applying a second detection", () => {
  const memory = createIllicitTradeEnforcementMemory();
  const incident = recordIllicitTradeDeparture(memory, illicitVisit(), GUANGZHOU, 100);
  const first = resolveIllicitTradeInspection(memory, incident.id, "ming-warship", 0);
  const restored = resolveIllicitTradeInspection(memory, incident.id, "ming-warship", 0.999);

  assert.equal(first.detected, true);
  assert.equal(first.newlyDetected, true);
  assert.equal(restored.detected, true);
  assert.equal(restored.newlyDetected, false);
  assert.equal(illicitTradeIncidentForInspection(memory, "ming", "second-warship", 101), null);
});

test("fleeing an inspection alerts the enforcing faction instead of starting more inspections", () => {
  const memory = createIllicitTradeEnforcementMemory();
  const incident = recordIllicitTradeDeparture(memory, illicitVisit(), GUANGZHOU, 100);
  resolveIllicitTradeInspection(memory, incident.id, "ming-warship", 0);
  beginIllicitTradeEnforcementCombat(memory, incident.id);

  assert.deepEqual(activeIllicitTradeCombatFactionIds(memory, 101), ["ming"]);
  assert.equal(illicitTradeIncidentForInspection(memory, "ming", "second-warship", 101), null);
});

test("cargo seizure is limited to illicit purchases still aboard", () => {
  const memory = createIllicitTradeEnforcementMemory();
  const incident = recordIllicitTradeDeparture(memory, illicitVisit(), GUANGZHOU, 100);

  assert.deepEqual(illicitCargoAvailable(incident, { silk: 1, tea: 5, grain: 4 }), {
    silk: 1,
    tea: 2
  });
  assert.equal(resolveIllicitTradeIncident(memory, incident.id).id, incident.id);
  assert.equal(memory.incidents.length, 0);
});

test("paying the fine resolves the incident for every patrol", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const incident = recordIllicitTradeDeparture(
    state.memory.illicitTradeEnforcement,
    illicitVisit({ transactionValue: 400 }),
    GUANGZHOU,
    100
  );
  state.doubloons = 500;

  const result = payIllicitTradeFine(state, incident.id);

  assert.equal(result.fine, 120);
  assert.equal(state.doubloons, 380);
  assert.equal(state.memory.illicitTradeEnforcement.incidents.length, 0);
});

test("surrendering the remaining illicit cargo resolves the incident for every patrol", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const incident = recordIllicitTradeDeparture(
    state.memory.illicitTradeEnforcement,
    illicitVisit(),
    GUANGZHOU,
    100
  );
  state.cargo.silk = 1;
  state.cargo.tea = 4;

  const removed = surrenderIllicitTradeCargo(state, incident.id);

  assert.deepEqual(removed, [
    { goodId: "silk", quantity: 1 },
    { goodId: "tea", quantity: 2 }
  ]);
  assert.equal(state.cargo.silk, undefined);
  assert.equal(state.cargo.tea, 2);
  assert.equal(state.memory.illicitTradeEnforcement.incidents.length, 0);
});
