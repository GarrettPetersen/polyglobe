import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIPYARD_INVESTMENT_CAPITAL,
  SHIPYARD_INVESTMENT_MATERIALS,
  SHIPYARD_INVESTMENT_REOFFER_MINUTES,
  beginShipyardInvestment,
  completeShipyardInvestment,
  createShipyardInvestmentMemory,
  migrateShipyardInvestmentMemory,
  shipyardInvestmentComplete,
  shipyardInvestmentOfferAvailable,
  validateShipyardInvestmentMemory
} from "./shipyardInvestment.js";
import {
  createGameState,
  deliverPlayerShipyardMaterials,
  finishPlayerShipyardInvestment,
  payPlayerShipyardInvestment,
  startPlayerShipyardInvestment
} from "./gameState.js";

const LISBON = Object.freeze({
  tileId: 1,
  city: "Lisbon",
  settlementType: "city",
  isPirateHideout: false
});

test("a wealthy captain can begin one major-port shipyard investment", () => {
  const state = {
    doubloons: 75000,
    memory: { shipyardInvestment: createShipyardInvestmentMemory() }
  };
  const yard = { famous: true, playerBacking: null };
  assert.equal(shipyardInvestmentOfferAvailable(state, LISBON, yard), true);
  const project = beginShipyardInvestment(state, LISBON, yard, 1000);
  assert.equal(project.portTileId, LISBON.tileId);
  assert.equal(project.capitalPaid, false);
  assert.deepEqual(project.materialsDelivered, { timber: 0, iron: 0, "naval-stores": 0 });
  assert.equal(shipyardInvestmentOfferAvailable(state, LISBON, yard), false);
});

test("a shipyard cannot open until capital and every material are delivered", () => {
  const state = {
    doubloons: SHIPYARD_INVESTMENT_CAPITAL,
    memory: { shipyardInvestment: createShipyardInvestmentMemory() }
  };
  const project = beginShipyardInvestment(state, LISBON, { famous: true, playerBacking: null }, 0);
  assert.equal(shipyardInvestmentComplete(project), false);
  assert.throws(() => completeShipyardInvestment(
    state.memory.shipyardInvestment,
    project,
    1
  ), /fully funded/);
  project.capitalPaid = true;
  project.materialsDelivered = { ...SHIPYARD_INVESTMENT_MATERIALS };
  assert.equal(shipyardInvestmentComplete(project), true);
  const completed = completeShipyardInvestment(state.memory.shipyardInvestment, project, 1);
  assert.equal(completed.portTileId, LISBON.tileId);
  assert.equal(state.memory.shipyardInvestment.project, null);
  assert.deepEqual(state.memory.shipyardInvestment.backedPortTileIds, [LISBON.tileId]);
  validateShipyardInvestmentMemory(state.memory.shipyardInvestment);
});

test("the player can fund the project with partial cargo deliveries", () => {
  const state = createGameState({ cargoCapacity: 200 });
  state.doubloons = 120000;
  state.cargo = { timber: 12, iron: 12, "naval-stores": 10 };
  state.accounts.cargoCostBasis = { timber: 120, iron: 120, "naval-stores": 100 };
  const yard = { famous: true, playerBacking: null };
  startPlayerShipyardInvestment(state, LISBON, yard, { simMinute: 10 });
  payPlayerShipyardInvestment(state, LISBON, { simMinute: 10 });
  assert.equal(state.doubloons, 20000);
  const firstTimber = deliverPlayerShipyardMaterials(state, LISBON, "timber");
  assert.equal(firstTimber.delivered, 12);
  assert.equal(firstTimber.remaining, 8);
  state.cargo.timber = 8;
  state.accounts.cargoCostBasis.timber = 80;
  deliverPlayerShipyardMaterials(state, LISBON, "timber");
  deliverPlayerShipyardMaterials(state, LISBON, "iron");
  deliverPlayerShipyardMaterials(state, LISBON, "naval-stores");
  const completed = finishPlayerShipyardInvestment(state, LISBON, { simMinute: 100 });
  assert.equal(completed.portTileId, LISBON.tileId);
  assert.equal(state.memory.shipyardInvestment.project, null);
});

test("another major-port yard can be backed after the investment cooldown", () => {
  const state = {
    doubloons: 200000,
    memory: { shipyardInvestment: createShipyardInvestmentMemory() }
  };
  const yard = { famous: true, playerBacking: null };
  const project = beginShipyardInvestment(state, LISBON, yard, 1000);
  project.capitalPaid = true;
  project.materialsDelivered = { ...SHIPYARD_INVESTMENT_MATERIALS };
  completeShipyardInvestment(state.memory.shipyardInvestment, project, 2000);
  const porto = { ...LISBON, tileId: 2, city: "Porto" };
  assert.equal(shipyardInvestmentOfferAvailable(state, porto, yard, 2001), false);
  assert.equal(shipyardInvestmentOfferAvailable(
    state,
    porto,
    yard,
    2000 + SHIPYARD_INVESTMENT_REOFFER_MINUTES
  ), true);
  assert.equal(shipyardInvestmentOfferAvailable(
    state,
    LISBON,
    yard,
    2000 + SHIPYARD_INVESTMENT_REOFFER_MINUTES
  ), false);
});

test("a later investment can fund a famous Ottoman-controlled yard", () => {
  const state = {
    doubloons: 200000,
    memory: {
      shipyardInvestment: {
        ...createShipyardInvestmentMemory(),
        backedPortTileIds: [LISBON.tileId],
        lastCompletedMinute: 1000
      }
    }
  };
  const ottomanPort = {
    ...LISBON,
    tileId: 3,
    city: "Constantinople",
    factionId: "ottoman"
  };
  assert.equal(shipyardInvestmentOfferAvailable(
    state,
    ottomanPort,
    { famous: true, playerBacking: null },
    1000 + SHIPYARD_INVESTMENT_REOFFER_MINUTES
  ), true);
});

test("legacy operating projects migrate into the backed-yard portfolio", () => {
  const memory = migrateShipyardInvestmentMemory({
    version: 1,
    project: {
      portTileId: LISBON.tileId,
      portName: "Lisbon",
      stage: "operating",
      offeredMinute: 100,
      capitalPaid: true,
      materialsDelivered: { ...SHIPYARD_INVESTMENT_MATERIALS }
    }
  });
  assert.equal(memory.project, null);
  assert.deepEqual(memory.backedPortTileIds, [LISBON.tileId]);
});
