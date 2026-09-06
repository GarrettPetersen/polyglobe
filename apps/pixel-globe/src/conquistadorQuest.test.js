import assert from "node:assert/strict";
import test from "node:test";

import {
  CONQUISTADOR_CAMPAIGN_DAYS,
  CONQUISTADOR_COMPANY_MAX_STRENGTH,
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
  conquistadorCompanyAssaultStatus,
  conquistadorCompanyReplenishmentPolicy,
  conquistadorCommissionedCaptureFactionId,
  conquistadorEmbarkationShouldApproach,
  conquistadorFetchRequirementId,
  conquistadorQuestAvailable,
  conquistadorQuestDestination,
  conquistadorQuestOfferShouldApproach,
  createConquistadorQuestMemory,
  isConquistadorCompanyReplenishmentPort,
  migrateConquistadorQuestMemory,
  recordConquistadorAssaultFailure,
  reconcileConquistadorSovereignty,
  replenishConquistadorCompany,
  recordConquistadorTargetCapture
} from "./conquistadorQuest.js";
import {
  GAME_STATE_VERSION,
  commissionedPortCaptureFactionId,
  createGameState,
  deliverQuestCargoRequirement,
  reconcileQuestWorldAssumptions,
  migrateGameState
} from "./gameState.js";
import {
  applyPortConquestOwnership,
  createPortConquestMemory,
  effectivePortFactionId,
  recordPortCapture
} from "./portConquest.js";
import { FACTION_SEA_CAPITALS_1522 } from "./factions.js";
import { createPoliticsView } from "./politics.js";

const DAY = 24 * 60;

test("a dormant conquistador quest has no destination and does not scan the port catalog", () => {
  assert.equal(conquistadorQuestDestination(createConquistadorQuestMemory(), [], 0), null);
});

test("the unseen Panama conquistador offer approaches the captain once", () => {
  const ports = questPorts();
  const memory = createConquistadorQuestMemory();
  assert.equal(conquistadorQuestOfferShouldApproach(memory, ports[0], ports), true);
  assert.equal(conquistadorQuestOfferShouldApproach(memory, ports[1], ports), false);
  memory.offerSeen = true;
  assert.equal(conquistadorQuestOfferShouldApproach(memory, ports[0], ports), false);
});

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
  assert.equal(conquistadorEmbarkationShouldApproach(memory, origin, true), true);
  assert.equal(conquistadorEmbarkationShouldApproach(memory, origin, false), false);
  assert.equal(conquistadorEmbarkationShouldApproach(memory, ports[1], true), false);
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
  assert.equal(conquistadorQuestDestination(quest, ports, captureMinute), null);
  assert.equal(conquistadorQuestDestination(quest, ports, quest.rewardReadyMinute - 1), null);
  assert.equal(conquistadorQuestDestination(quest, ports, quest.rewardReadyMinute), target);
  applyPortConquestOwnership(conquest, ports);
  assert.equal(target.displayCity, "Trujillo");
  assert.equal(effectivePortFactionId(conquest, cuzco), "inca");

  const transferMinute = quest.transferSchedule[0].simMinute;
  assert.throws(() => advanceConquistadorCampaign(quest, conquest, ports, transferMinute), /requires the functional port catalog/);
  const transition = advanceConquistadorCampaign(quest, conquest, ports, transferMinute, { ports });
  assert.equal(transition.transfers.length, 1);
  assert.equal(effectivePortFactionId(conquest, cuzco), "spain");
  assert.equal(quest.stage, CONQUISTADOR_STAGE_CAMPAIGN);
  assert.ok(conquest.collapsedFactionIds.includes("inca"), "the government ends when its final capital falls, before the reward date");

  const final = advanceConquistadorCampaign(quest, conquest, ports, quest.rewardReadyMinute, { ports });
  assert.equal(final.rewardReady, true);
  assert.equal(quest.stage, CONQUISTADOR_STAGE_REWARD_READY);
  assert.ok(conquest.collapsedFactionIds.includes("inca"));
  assert.equal(conquest.factionSuccessors.inca, "spain");
  completeConquistadorQuest(quest, quest.rewardReadyMinute);
  assert.equal(quest.stage, CONQUISTADOR_STAGE_COMPLETE);
  assert.equal(CONQUISTADOR_REWARD_DOUBLOONS, 20000);
  assert.equal(origin.factionId, "spain");
});

for (const retreatPortSurvives of [false, true]) {
  test(`every conquistador campaign phase has valid politics and functional capitals; retreat port=${retreatPortSurvives}`, () => {
    const state = createGameState({ cargoCapacity: 20 });
    const citiesById = new Map(FACTION_SEA_CAPITALS_1522.map((capital, index) => [capital.cityId,
      city(5000 + index, capital.city, capital.country, capital.lat || 0, capital.lon || 0, capital.factionId,
        { cityId: capital.cityId, isFactionCapital: true, capitalOfFactionId: capital.factionId })]));
    for (const port of questPorts()) citiesById.set(port.cityId, port);
    const arequipa = city(6000, "Arequipa", "Peru", -16.4, -71.5, "inca");
    citiesById.set(arequipa.cityId, arequipa);
    if (retreatPortSurvives) {
      const bristol = city(6001, "Bristol", "United Kingdom", 51.45, -2.6, "england");
      citiesById.set(bristol.cityId, bristol);
    }
    const cities = [...citiesById.values()];
    const ports = cities.filter((entry) => entry !== arequipa);
    const quest = state.memory.quests.conquistador;
    const conquest = state.memory.conquest;
    acceptConquistadorQuest(quest, ports);
    for (const stage of CONQUISTADOR_FETCH_STAGES) completeConquistadorFetchStage(quest, stage.id);
    beginConquistadorExpedition(quest, { eligible: true });
    const target = citiesById.get("chanchan|peru");
    const event = recordPortCapture(conquest, target, "spain", 1000, "player");
    recordConquistadorTargetCapture(quest, conquest, cities, event, 1000);
    // Another conquest after the columns' schedule was set gives the government
    // somewhere to retreat; its ownership must survive the scripted campaign.
    if (retreatPortSurvives) recordPortCapture(conquest, citiesById.get("bristol|united kingdom"), "inca", 1001, "npc:test");
    const snapshots = [];
    const checkPolitics = (minute) => {
      applyPortConquestOwnership(conquest, cities);
      const priorConquest = structuredClone(conquest);
      reconcileQuestWorldAssumptions(state, ports, { identityCities: cities });
      assert.deepEqual(conquest, priorConquest, "world reconciliation must preserve inland conquest history");
      const view = createPoliticsView(state, minute, cities);
      for (const card of view.cards.filter(({faction}) => faction.id !== "pirate")) {
        assert.ok(ports.some((port) => port.cityId === card.capital.portId && port.factionId === card.faction.id),
          `${card.faction.id} needs a functioning capital at minute ${minute}`);
      }
      snapshots.push(structuredClone({ quest, conquest }));
    };
    checkPolitics(1000);
    for (const transfer of quest.transferSchedule) {
      advanceConquistadorCampaign(quest, conquest, cities, transfer.simMinute, { ports });
      checkPolitics(transfer.simMinute);
    }
    advanceConquistadorCampaign(quest, conquest, cities, quest.rewardReadyMinute, { ports });
    checkPolitics(quest.rewardReadyMinute);
    completeConquistadorQuest(quest, quest.rewardReadyMinute);
    checkPolitics(quest.rewardReadyMinute);
    assert.equal(conquest.collapsedFactionIds.includes("inca"), !retreatPortSurvives);
    if (retreatPortSurvives) assert.equal(conquest.factionCapitalOverrides.inca, "bristol|united kingdom");
    assert.equal(effectivePortFactionId(conquest, arequipa), "spain");

    // Reproduce a released save after Cuzco fell but before sovereignty was
    // reconciled. Repair must precede opening Politics and preserve the clock.
    Object.assign(quest, snapshots[1].quest);
    Object.assign(conquest, snapshots[1].conquest);
    conquest.collapsedFactionIds = conquest.collapsedFactionIds.filter((id) => id !== "inca");
    delete conquest.factionCapitalOverrides.inca;
    delete conquest.factionSuccessors.inca;
    conquest.events = conquest.events.filter(({kind}) => kind !== "faction-collapse");
    const schedule = structuredClone(quest.transferSchedule);
    const rewardMinute = quest.rewardReadyMinute;
    reconcileConquistadorSovereignty(quest, conquest, cities, { ports });
    checkPolitics(quest.transferSchedule[0].simMinute);
    const repaired = structuredClone(conquest);
    reconcileConquistadorSovereignty(quest, conquest, cities, { ports });
    assert.deepEqual(conquest, repaired);
    assert.deepEqual(quest.transferSchedule, schedule);
    assert.equal(quest.rewardReadyMinute, rewardMinute);
  });
}

test("Pizarro's company starts favored, learns from defeats, and reforms at Spanish ports", () => {
  const ports = questPorts();
  const memory = createConquistadorQuestMemory();
  acceptConquistadorQuest(memory, ports);
  for (const stage of CONQUISTADOR_FETCH_STAGES) completeConquistadorFetchStage(memory, stage.id);
  beginConquistadorExpedition(memory, { eligible: true });

  const first = conquistadorCompanyAssaultStatus(memory, ports[1]);
  assert.equal(first.strength, CONQUISTADOR_COMPANY_MAX_STRENGTH);
  assert.equal(first.attemptNumber, 1);
  assert.equal(first.combatStrengthMultiplierBonus, 0.3);
  assert.equal(first.guaranteedSuccess, false);
  assert.equal(first.ready, true);

  const defeat = recordConquistadorAssaultFailure(memory, 18);
  assert.equal(defeat.remaining, 6);
  const waiting = conquistadorCompanyAssaultStatus(memory, ports[1]);
  assert.equal(waiting.ready, false);
  assert.equal(waiting.attemptNumber, 2);
  assert.equal(waiting.combatStrengthMultiplierBonus, 0.38);
  assert.throws(
    () => replenishConquistadorCompany(memory, ports[1], ports),
    /Spanish port or its exile base/
  );

  const panama = ports[0];
  const replenishment = replenishConquistadorCompany(memory, panama, ports);
  assert.equal(replenishment.added, 18);
  assert.equal(conquistadorCompanyAssaultStatus(memory, ports[1]).ready, true);

  recordConquistadorAssaultFailure(memory, 20);
  replenishConquistadorCompany(memory, panama, ports);
  const third = conquistadorCompanyAssaultStatus(memory, ports[1]);
  assert.equal(third.attemptNumber, 3);
  assert.equal(third.guaranteedSuccess, true);
  assert.ok(Math.abs(third.combatStrengthMultiplierBonus - 0.46) < 0.000001);
});

test("version 1 active expeditions migrate with a full company", () => {
  const ports = questPorts();
  const memory = createConquistadorQuestMemory();
  acceptConquistadorQuest(memory, ports);
  for (const stage of CONQUISTADOR_FETCH_STAGES) completeConquistadorFetchStage(memory, stage.id);
  beginConquistadorExpedition(memory, { eligible: true });
  const legacy = structuredClone(memory);
  legacy.version = 1;
  delete legacy.companyStrength;
  delete legacy.companyNeedsReplenishment;
  delete legacy.failedAssaults;

  const migrated = migrateConquistadorQuestMemory(legacy);
  assert.equal(migrated.companyStrength, CONQUISTADOR_COMPANY_MAX_STRENGTH);
  assert.equal(migrated.companyNeedsReplenishment, false);
  assert.equal(migrated.failedAssaults, 0);
});

test("an annexed Spain leaves Panama as the expedition's exile replenishment base", () => {
  const ports = questPorts();
  const memory = createConquistadorQuestMemory();
  acceptConquistadorQuest(memory, ports);
  for (const stage of CONQUISTADOR_FETCH_STAGES) completeConquistadorFetchStage(memory, stage.id);
  beginConquistadorExpedition(memory, { eligible: true });
  recordConquistadorAssaultFailure(memory, 12);
  ports[0].factionId = "portugal";

  const policy = conquistadorCompanyReplenishmentPolicy(memory, ports);
  assert.equal(policy.spanishPortsRemain, false);
  assert.equal(policy.exileBaseCityId, ports[0].cityId);
  assert.equal(isConquistadorCompanyReplenishmentPort(memory, ports[0], ports), true);
  assert.equal(isConquistadorCompanyReplenishmentPort(memory, ports[1], ports), false);
  assert.equal(replenishConquistadorCompany(memory, ports[0], ports).added, 12);
});

test("version 73 voyages gain conquistador company state", () => {
  const saved = createGameState({ cargoCapacity: 20 });
  saved.version = 73;
  saved.memory.quests.conquistador.version = 1;
  delete saved.memory.quests.conquistador.companyStrength;
  delete saved.memory.quests.conquistador.companyNeedsReplenishment;
  delete saved.memory.quests.conquistador.failedAssaults;

  const restored = migrateGameState(saved, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.memory.quests.conquistador, createConquistadorQuestMemory());
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
    cityId: `${cityName.toLocaleLowerCase("en-US")}|${country.toLocaleLowerCase("en-US")}`,
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
