import assert from "node:assert/strict";
import test from "node:test";

import {
  CONQUISTADOR_CAMPAIGN_DAYS,
  CONQUISTADOR_FETCH_STAGES,
  CONQUISTADOR_REWARD_DOUBLOONS,
  CONQUISTADOR_STAGE_CAMPAIGN,
  CONQUISTADOR_STAGE_CAPTURE,
  CONQUISTADOR_STAGE_COMPLETE,
  CONQUISTADOR_STAGE_FETCH,
  CONQUISTADOR_STAGE_READY,
  CONQUISTADOR_STAGE_REWARD_READY,
  acceptConquistadorQuest,
  advanceConquistadorCampaign,
  beginConquistadorExpedition,
  completeConquistadorFetchStage,
  completeConquistadorQuest,
  conquistadorCommissionedCaptureFactionId,
  conquistadorFetchRequirementId,
  conquistadorQuestAvailable,
  createConquistadorQuestMemory,
  recordConquistadorTargetCapture
} from "./conquistadorQuest.js";
import {
  GAME_STATE_VERSION,
  commissionedPortCaptureFactionId,
  createGameState,
  deliverQuestCargoRequirement,
  migrateGameState
} from "./gameState.js";
import {
  applyPortConquestOwnership,
  createPortConquestMemory,
  effectivePortFactionId,
  recordPortCapture
} from "./portConquest.js";

const DAY = 24 * 60;

test("the Spanish expedition gathers partially delivered supplies before commissioning Chan Chan", () => {
  const ports = questPorts();
  const memory = createConquistadorQuestMemory();
  assert.equal(conquistadorQuestAvailable(memory, ports), true);
  acceptConquistadorQuest(memory, ports);
  assert.equal(memory.stage, CONQUISTADOR_STAGE_FETCH);

  const state = createGameState({ cargoCapacity: 100 });
  const stage = CONQUISTADOR_FETCH_STAGES[0];
  const origin = ports[0];
  state.cargo[stage.goodId] = 6;
  const first = deliverQuestCargoRequirement(
    state,
    origin,
    stage.goodId,
    stage.quantity,
    conquistadorFetchRequirementId(stage),
    { simMinute: 100 }
  );
  assert.equal(first.complete, false);
  assert.equal(first.deliveredQuantity, 6);
  state.cargo[stage.goodId] = 6;
  const second = deliverQuestCargoRequirement(
    state,
    origin,
    stage.goodId,
    stage.quantity,
    conquistadorFetchRequirementId(stage),
    { simMinute: 200 }
  );
  assert.equal(second.complete, true);
  completeConquistadorFetchStage(memory, stage.id);

  for (const remaining of CONQUISTADOR_FETCH_STAGES.slice(1)) {
    completeConquistadorFetchStage(memory, remaining.id);
  }
  assert.equal(memory.stage, CONQUISTADOR_STAGE_READY);
  assert.throws(
    () => beginConquistadorExpedition(memory, { eligible: false }),
    /conquest-capable ship/
  );
  beginConquistadorExpedition(memory, { eligible: true });
  assert.equal(memory.stage, CONQUISTADOR_STAGE_CAPTURE);
  assert.equal(conquistadorCommissionedCaptureFactionId(memory, ports[1]), "spain");

  state.memory.quests.conquistador = structuredClone(memory);
  assert.equal(commissionedPortCaptureFactionId(state, ports[1]), "spain");
});

test("capturing Chan Chan renames Trujillo and advances inland conquest over one year", () => {
  const ports = questPorts();
  const [origin, target, cuzco] = ports;
  const quest = createConquistadorQuestMemory();
  acceptConquistadorQuest(quest, ports);
  for (const stage of CONQUISTADOR_FETCH_STAGES) completeConquistadorFetchStage(quest, stage.id);
  beginConquistadorExpedition(quest, { eligible: true });

  const conquest = createPortConquestMemory();
  const captureMinute = 1000;
  const event = recordPortCapture(conquest, target, "spain", captureMinute, "player");
  recordConquistadorTargetCapture(quest, conquest, ports, event, captureMinute);
  assert.equal(quest.stage, CONQUISTADOR_STAGE_CAMPAIGN);
  assert.equal(quest.rewardReadyMinute, captureMinute + CONQUISTADOR_CAMPAIGN_DAYS * DAY);
  applyPortConquestOwnership(conquest, ports);
  assert.equal(target.displayCity, "Trujillo");
  assert.equal(effectivePortFactionId(conquest, cuzco), "inca");

  const transferMinute = quest.transferSchedule[0].simMinute;
  const transition = advanceConquistadorCampaign(quest, conquest, ports, transferMinute);
  assert.equal(transition.transfers.length, 1);
  assert.equal(effectivePortFactionId(conquest, cuzco), "spain");
  assert.equal(quest.stage, CONQUISTADOR_STAGE_CAMPAIGN);

  const final = advanceConquistadorCampaign(quest, conquest, ports, quest.rewardReadyMinute);
  assert.equal(final.rewardReady, true);
  assert.equal(quest.stage, CONQUISTADOR_STAGE_REWARD_READY);
  assert.ok(conquest.collapsedFactionIds.includes("inca"));
  assert.equal(conquest.factionSuccessors.inca, "spain");
  completeConquistadorQuest(quest, quest.rewardReadyMinute);
  assert.equal(quest.stage, CONQUISTADOR_STAGE_COMPLETE);
  assert.equal(CONQUISTADOR_REWARD_DOUBLOONS, 20000);
  assert.equal(origin.factionId, "spain");
});

test("version 72 voyages gain a dormant conquistador campaign and city-name overrides", () => {
  const saved = createGameState({ cargoCapacity: 20 });
  saved.version = 72;
  delete saved.memory.quests.conquistador;
  delete saved.memory.conquest.cityDisplayNameOverrides;

  const restored = migrateGameState(saved, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.memory.quests.conquistador, createConquistadorQuestMemory());
  assert.deepEqual(restored.memory.conquest.cityDisplayNameOverrides, {});
});

function questPorts() {
  return [
    city(137225, "Panama City", "Panama", 8.9824, -79.5199, "spain"),
    city(134664, "Chanchan", "Peru", -8.106, -79.0745, "inca"),
    city(134185, "Cuzco", "Peru", -13.5319, -71.9675, "inca", {
      isFactionCapital: true,
      capitalOfFactionId: "inca"
    })
  ];
}

function city(tileId, cityName, country, lat, lon, factionId, extra = {}) {
  return {
    tileId,
    city: cityName,
    displayCity: cityName,
    country,
    lat,
    lon,
    factionId,
    isFactionCapital: false,
    capitalOfFactionId: null,
    ...extra
  };
}
