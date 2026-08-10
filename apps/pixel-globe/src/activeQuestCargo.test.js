import assert from "node:assert/strict";
import test from "node:test";

import {
  QUEST_CARGO_PROMPT_CHEF,
  QUEST_CARGO_PROMPT_COLONIZATION,
  QUEST_CARGO_PROMPT_VIKING,
  activeQuestCargoRequirements,
  activeQuestCargoReservedQuantities,
  questCargoDeliveryPromptsAtPort
} from "./activeQuestCargo.js";
import { maybeSpawnChefQuest } from "./chefQuest.js";
import { colonizationTargetForCity } from "./colonialCities.js";
import {
  COLONIZATION_FETCH_STAGES,
  COLONIZATION_RESUPPLY,
  advanceColonizationQuest,
  assignColonizationQuest,
  beginColonizationExpedition,
  completeColonizationFetchStage,
  landColonists
} from "./colonizationQuest.js";
import { createGameState } from "./gameState.js";
import {
  PAPAL_COMMISSION_ALMS,
  acceptPapalCommission,
  advancePapalPolitics,
  createPapalPolitics
} from "./papalPolitics.js";
import { shipStatsForSlug } from "./shipStats.js";
import { createWorldDiplomacy } from "./worldDiplomacy.js";
import {
  VIKING_LONGSHIP_PORT_CITY,
  deliverVikingLongshipQuestCargo,
  maybeSpawnVikingLongshipQuest
} from "./vikingLongshipQuest.js";

const HAFNARFJORDUR = Object.freeze({
  tileId: 64,
  portId: "city-64",
  city: VIKING_LONGSHIP_PORT_CITY,
  country: "Iceland"
});
const ISTANBUL = Object.freeze({
  tileId: 44,
  city: "Istanbul",
  country: "Ottoman Empire",
  cityType: "islamic-desert"
});
const BORDEAUX = Object.freeze({
  tileId: 10,
  city: "Bordeaux",
  country: "France",
  factionId: "france",
  lat: 44.84,
  lon: -0.58
});
const PORT_ROYAL = Object.freeze({
  ...colonizationTargetForCity({ city: "Port Royal", country: "Canada" }),
  tileId: 123
});

function game() {
  const stats = shipStatsForSlug("brigantine");
  return createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
}

test("active cargo quests reserve their outstanding goods across quest systems", () => {
  const state = game();
  maybeSpawnVikingLongshipQuest(state, HAFNARFJORDUR, { spawnChance: 1, simMinute: 0 });
  maybeSpawnChefQuest(state, ISTANBUL, {
    spawnChance: 1,
    simMinute: 0,
    availableIngredientGoodIds: new Set(["grain", "pepper", "wine", "olive-oil"])
  });

  assert.deepEqual(activeQuestCargoReservedQuantities(state), {
    wool: 8,
    grain: 1,
    pepper: 1,
    wine: 1,
    "olive-oil": 1
  });
  assert.equal(activeQuestCargoRequirements(state).length, 5);

  state.cargo.wool = 3;
  deliverVikingLongshipQuestCargo(state, HAFNARFJORDUR, "wool-sail");
  assert.equal(activeQuestCargoReservedQuantities(state).wool, 5);
});

test("ports identify every quest giver who can accept cargo aboard", () => {
  const state = game();
  maybeSpawnVikingLongshipQuest(state, HAFNARFJORDUR, { spawnChance: 1, simMinute: 0 });
  maybeSpawnChefQuest(state, ISTANBUL, {
    spawnChance: 1,
    simMinute: 0,
    availableIngredientGoodIds: new Set(["grain", "pepper", "wine", "olive-oil"])
  });
  state.cargo.wool = 1;
  state.cargo.grain = 1;

  assert.deepEqual(
    questCargoDeliveryPromptsAtPort(state, HAFNARFJORDUR).map((prompt) => prompt.id),
    [QUEST_CARGO_PROMPT_VIKING]
  );
  assert.deepEqual(
    questCargoDeliveryPromptsAtPort(state, ISTANBUL).map((prompt) => prompt.id),
    [QUEST_CARGO_PROMPT_CHEF]
  );

  delete state.cargo.wool;
  assert.deepEqual(questCargoDeliveryPromptsAtPort(state, HAFNARFJORDUR), []);
});

test("colony resupply cargo is protected and offered immediately on return", () => {
  const state = game();
  assignColonizationQuest(state.memory.colonization, { target: PORT_ROYAL, origin: BORDEAUX });
  for (const stage of COLONIZATION_FETCH_STAGES) {
    completeColonizationFetchStage(state.memory.colonization, stage.id);
  }
  beginColonizationExpedition(state.memory.colonization);
  landColonists(state.memory.colonization, 1000);
  advanceColonizationQuest(state.memory.colonization, 1100, { awayFromColony: true });
  state.cargo[COLONIZATION_RESUPPLY.goodId] = 1;

  assert.equal(
    activeQuestCargoReservedQuantities(state, { currentMinute: 1100 })[COLONIZATION_RESUPPLY.goodId],
    COLONIZATION_RESUPPLY.quantity
  );
  assert.deepEqual(
    questCargoDeliveryPromptsAtPort(state, PORT_ROYAL, { currentMinute: 1100 })
      .map((prompt) => prompt.id),
    [QUEST_CARGO_PROMPT_COLONIZATION]
  );
});

test("accepted Papal transport cargo is protected with other quest provisions", () => {
  const state = game();
  const { papacy, diplomacy } = pendingPapalAlms();
  state.relations.papacy = papacy;
  state.relations.diplomacy = diplomacy;
  acceptPapalCommission(papacy, diplomacy, {
    playerFactionId: "spain",
    playerReligionId: "roman-catholic",
    papalReputation: 20,
    simMinute: papacy.lastUpdateMinute,
    originTileId: 1,
    itinerary: [{
      tileId: 2,
      portName: "Relief Port",
      factionId: papacy.pendingMatter.targetFactionId,
      purpose: "deliver-alms"
    }],
    rewardDoubloons: 500,
    nuncio: { id: "nuncio-cargo", name: "Monsignor Cargo" }
  });

  assert.deepEqual(activeQuestCargoReservedQuantities(state), { grain: 10 });
});

function pendingPapalAlms() {
  for (let index = 0; index < 500; index += 1) {
    const seedKey = `active-cargo-papal-alms-${index}`;
    const papacy = createPapalPolitics({ seedKey });
    const diplomacy = createWorldDiplomacy({ seedKey });
    advancePapalPolitics(papacy, diplomacy, papacy.nextActionMinute);
    if (papacy.pendingMatter?.commissionKind === PAPAL_COMMISSION_ALMS) {
      return { papacy, diplomacy };
    }
  }
  throw new Error("Could not generate a Papal alms matter for cargo test");
}
