import assert from "node:assert/strict";
import test from "node:test";

import {
  COLONIZATION_FETCH_STAGES,
  COLONIZATION_RESUPPLY,
  advanceColonizationQuest,
  assignColonizationTargetTile,
  colonizationWorldRecord
} from "./colonizationQuest.js";
import {
  createPortDialogueSession,
  portDialogueView,
  selectPortDialogueOption
} from "./dialogueSystem.js";
import { createWorldEconomy } from "./economy.js";
import { cargoReservationUnits, createGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";

const CHARACTER = Object.freeze({ name: "Martin Belloc", expressions: ["neutral"] });
const BORDEAUX = Object.freeze({
  tileId: 10,
  portId: "city-10",
  city: "Bordeaux",
  displayCity: "Bordeaux",
  country: "France",
  cityType: "northern-european",
  population: 20000,
  factionId: "france",
  lat: 44.84,
  lon: -0.58,
  character: CHARACTER
});

test("the colonial organizer runs the paid expedition through a permanent founded port", () => {
  const shipStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  assignColonizationTargetTile(gameState.memory.colonization, 99);
  const economy = createWorldEconomy({ ports: [BORDEAUX], startMinute: 0 });
  const ports = [BORDEAUX];
  const context = { simMinute: 1000, shipStats };
  const originSession = createPortDialogueSession(BORDEAUX, { initialNodeId: "colonization" });

  for (const stage of COLONIZATION_FETCH_STAGES) {
    gameState.cargo[stage.goodId] = stage.quantity;
    gameState.accounts.cargoCostBasis[stage.goodId] = 0;
    chooseAction(originSession, BORDEAUX, gameState, economy, ports, context, "deliver-colonization-material");
  }
  assert.equal(gameState.doubloons, 360 + COLONIZATION_FETCH_STAGES.reduce((sum, stage) => sum + stage.reward, 0));

  chooseAction(originSession, BORDEAUX, gameState, economy, ports, context, "embark-colonists");
  assert.equal(cargoReservationUnits(gameState, "port-royal-colonists"), 24);

  const site = { ...colonizationWorldRecord(gameState.memory.colonization), character: CHARACTER };
  const siteSession = createPortDialogueSession(site, { initialNodeId: "colonization" });
  chooseAction(siteSession, site, gameState, economy, ports, context, "land-colonists");
  assert.equal(cargoReservationUnits(gameState, "port-royal-colonists"), 0);

  advanceColonizationQuest(gameState.memory.colonization, 1001, { awayFromColony: true });
  gameState.cargo[COLONIZATION_RESUPPLY.goodId] = COLONIZATION_RESUPPLY.quantity;
  gameState.accounts.cargoCostBasis[COLONIZATION_RESUPPLY.goodId] = 0;
  const result = chooseAction(
    siteSession,
    site,
    gameState,
    economy,
    ports,
    { ...context, simMinute: 1100 },
    "deliver-colony-resupply"
  );

  assert.equal(result.colonyEstablished, true);
  assert.equal(colonizationWorldRecord(gameState.memory.colonization).settlementType, "city");
  assert.equal(gameState.doubloons, 360 + 760 + COLONIZATION_RESUPPLY.reward);
  assert.ok(gameState.accounts.ledger.some((entry) => entry.description === "Port Royal first-year resupply"));
});

function chooseAction(session, city, gameState, economy, ports, context, actionType) {
  const view = portDialogueView(session, city, gameState, economy, ports, context);
  const optionIndex = view.options.findIndex((entry) => entry.action.type === actionType);
  assert.notEqual(optionIndex, -1, `${actionType} option`);
  assert.equal(view.options[optionIndex].disabled, false);
  return selectPortDialogueOption(session, city, gameState, economy, ports, optionIndex, context);
}
