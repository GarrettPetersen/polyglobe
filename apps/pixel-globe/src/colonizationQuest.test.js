import assert from "node:assert/strict";
import test from "node:test";

import { COLONIZATION_TARGETS, colonizationTargetForCity } from "./colonialCities.js";
import {
  COLONIZATION_EXPEDITION_CARGO_UNITS,
  COLONIZATION_FETCH_STAGES,
  COLONIZATION_RESUPPLY,
  COLONIZATION_RESUPPLY_DAYS,
  COLONIZATION_STAGE_AWAITING_RESUPPLY,
  COLONIZATION_STAGE_DEFEND,
  COLONIZATION_STAGE_ESTABLISHED,
  COLONIZATION_STAGE_FAILED,
  COLONIZATION_STAGE_OUTBOUND,
  COLONIZATION_STAGE_REPORT_DEFENSE,
  COLONIZATION_STAGE_READY,
  advanceColonizationQuest,
  assignColonizationQuest,
  assertColonizationResupplyDelivery,
  beginColonizationExpedition,
  colonizationObjective,
  colonizationOfferForCity,
  colonizationOriginCanSponsorTarget,
  colonizationOrganizerShouldApproach,
  colonizationNavigationObjective,
  colonizationQuestView,
  colonizationShipEligibility,
  colonizationWorldRecord,
  completeColonizationDefense,
  completeColonizationFetchStage,
  createColonizationQuestMemory,
  defeatColonizationAttacker,
  eligibleColonizationTargetsForOrigin,
  establishColony,
  grantColonizationApproval,
  landColonists,
  markColonizationOrganizerApproached,
  relocateColonizationQuestOrigin,
  validateColonizationQuestMemory
} from "./colonizationQuest.js";
import { shipStatsForSlug } from "./shipStats.js";

const DAY = 24 * 60;
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

test("an unspawned colonization quest has no target-specific cargo progress", () => {
  const view = colonizationQuestView(questViewState(createColonizationQuestMemory()));

  assert.equal(view.target, null);
  assert.equal(view.history, null);
  assert.equal(view.fetchStage, null);
  assert.equal(view.fetchDelivered, 0);
  assert.equal(view.fetchRemaining, 0);
  assert.equal(view.fetchDeliverable, 0);
  assert.equal(view.canDeliverFetch, false);
});

test("a colonization expedition requires three ordered paid material stages", () => {
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, { target: PORT_ROYAL, origin: BORDEAUX });

  assert.throws(
    () => completeColonizationFetchStage(memory, COLONIZATION_FETCH_STAGES[1].id),
    /Unexpected colonization material stage/
  );
  for (const stage of COLONIZATION_FETCH_STAGES) completeColonizationFetchStage(memory, stage.id);

  assert.equal(memory.stage, COLONIZATION_STAGE_READY);
  assert.equal(memory.fetchStageIndex, COLONIZATION_FETCH_STAGES.length);
  assert.equal(validateColonizationQuestMemory(memory), memory);
});

test("a spawned organizer approaches once before waiting in the port menu", () => {
  const state = {
    memory: {
      colonization: createColonizationQuestMemory(),
      flags: {}
    }
  };
  assignColonizationQuest(state.memory.colonization, { target: PORT_ROYAL, origin: BORDEAUX });

  assert.equal(colonizationOrganizerShouldApproach(state, BORDEAUX), true);
  assert.equal(colonizationOrganizerShouldApproach(state, { city: "Lisbon", country: "Portugal" }), false);
  assert.equal(markColonizationOrganizerApproached(state), true);
  assert.equal(colonizationOrganizerShouldApproach(state, BORDEAUX), false);
});

test("all water-accessible colony sites can enter a constrained sailing offer pool", () => {
  const sailingTargets = COLONIZATION_TARGETS
    .filter((target) => target.waterAccess !== "inland")
    .map((target, index) => ({ ...target, tileId: 1000 + index }));
  const inlandTargets = COLONIZATION_TARGETS.filter((target) => target.waterAccess === "inland");

  assert.equal(COLONIZATION_TARGETS.length, 35);
  assert.equal(sailingTargets.length, 29);
  assert.equal(inlandTargets.length, 6);
  for (const target of sailingTargets) {
    const origin = {
      tileId: 9000,
      city: "Sponsor Port",
      country: target.originCountry || "Sponsor Realm",
      factionId: target.originFactionId,
      lat: -target.lat,
      lon: ((target.lon + 540) % 360) - 180
    };
    assert.ok(
      eligibleColonizationTargetsForOrigin(origin, sailingTargets).some((candidate) => candidate.tileId === target.tileId),
      target.city
    );
  }
  const inlandWithTiles = inlandTargets.map((target, index) => ({ ...target, tileId: 2000 + index }));
  assert.ok(inlandWithTiles.every((target) => (
    eligibleColonizationTargetsForOrigin(
      { ...BORDEAUX, factionId: target.originFactionId, lat: 45, lon: 170 },
      inlandWithTiles
    ).every((candidate) => candidate.tileId !== target.tileId)
  )));
});

test("colonization offers roll infrequently, persist after being seen, and select a requested eligible site", () => {
  const state = {
    playerCharacter: { name: "Test Captain", identityKey: "colonization-roll-test" },
    memory: { colonization: createColonizationQuestMemory(), flags: {} }
  };
  const target = PORT_ROYAL;
  const periodMinutes = 14 * DAY;

  assert.equal(colonizationOfferForCity(state, BORDEAUX, [BORDEAUX], [target], {
    simMinute: 0,
    spawnChance: 0
  }), null);
  assert.equal(colonizationOfferForCity(state, BORDEAUX, [BORDEAUX], [target], {
    simMinute: 0,
    spawnChance: 1,
    targetTileId: target.tileId
  }), null);
  const offer = colonizationOfferForCity(state, BORDEAUX, [BORDEAUX], [target], {
    simMinute: periodMinutes,
    spawnChance: 1,
    targetTileId: target.tileId
  });

  assert.equal(offer.targetCity, "Port Royal");
  assert.equal(offer.originCity, "Bordeaux");
  markColonizationOrganizerApproached(state);
  assert.equal(colonizationOfferForCity(state, BORDEAUX, [BORDEAUX], [target], {
    simMinute: periodMinutes * 2,
    spawnChance: 1
  }), offer);
  assert.equal(colonizationOrganizerShouldApproach(state, BORDEAUX), false);
});

test("existing Port Royal quest saves bind to the generalized quest model", () => {
  const legacy = createColonizationQuestMemory();
  for (const key of [
    "targetCity",
    "targetCountry",
    "originTileId",
    "originCity",
    "originCountry",
    "approvalTileId",
    "approvalCity",
    "approvalCountry",
    "approvalGranted",
    "distanceKm",
    "offerSeen",
    "spawnRolls"
  ]) delete legacy[key];
  legacy.targetTileId = PORT_ROYAL.tileId;

  assert.equal(validateColonizationQuestMemory(legacy), legacy);
  assignColonizationQuest(legacy, { target: PORT_ROYAL, origin: BORDEAUX });
  assert.equal(legacy.targetCity, "Port Royal");
  assert.equal(legacy.originCity, "Bordeaux");
});

test("Nagasaki sails from Portugal, stops in Kyoto for permission, then continues to Japan", () => {
  const nagasaki = {
    ...colonizationTargetForCity({ city: "Nagasaki", country: "Japan" }),
    tileId: 777
  };
  const kyoto = {
    tileId: 20,
    city: "Kyoto",
    country: "Japan",
    factionId: "japan",
    capitalOfFactionId: "japan",
    lat: 35.01,
    lon: 135.77
  };
  const lisbon = {
    tileId: 21,
    city: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    lat: 38.72,
    lon: -9.14
  };

  assert.equal(nagasaki.originFactionId, "portugal");
  assert.equal(nagasaki.originCountry, "Portugal");
  assert.equal(nagasaki.approvalFactionId, "japan");
  assert.deepEqual(nagasaki.approvalCargo, [
    { goodId: "matchlocks", quantity: 4 },
    { goodId: "gunpowder", quantity: 3 }
  ]);
  assert.deepEqual(nagasaki.initialImports, [
    { goodId: "matchlocks", quantity: 8 }
  ]);
  assert.deepEqual(eligibleColonizationTargetsForOrigin(lisbon, [nagasaki]).map((target) => target.city), ["Nagasaki"]);
  assert.deepEqual(eligibleColonizationTargetsForOrigin(kyoto, [nagasaki]), []);

  const state = {
    playerCharacter: { identityKey: "nagasaki-route-test" },
    memory: {
      colonization: createColonizationQuestMemory(),
      flags: {},
      quests: { cargoDeliveries: {} }
    }
  };
  const offer = colonizationOfferForCity(state, lisbon, [lisbon, kyoto], [nagasaki], {
    simMinute: 14 * DAY,
    spawnChance: 1,
    targetTileId: nagasaki.tileId,
    approvalTileId: kyoto.tileId
  });
  assert.equal(offer.originCity, "Lisbon");
  assert.equal(offer.approvalCity, "Kyoto");

  for (const stage of colonizationQuestView(state).history.fetchStages) {
    completeColonizationFetchStage(offer, stage.id);
  }
  beginColonizationExpedition(offer);
  assert.equal(colonizationQuestView(state).approvalCargoReady, false);
  assert.throws(() => grantColonizationApproval(offer), /requires its trade demonstration cargo/);
  state.cargo = { matchlocks: 4, gunpowder: 3 };
  assert.equal(colonizationQuestView(state).approvalCargoReady, true);
  assert.deepEqual(colonizationObjective(offer), { tileId: kyoto.tileId, kind: "negotiate-colony" });
  assert.throws(() => landColonists(offer, 1000), /requires government approval in Kyoto/);
  grantColonizationApproval(offer, { approvalCargoDelivered: true });
  assert.deepEqual(colonizationObjective(offer), { tileId: nagasaki.tileId, kind: "develop-port" });
  landColonists(offer, 1000);
  assert.equal(offer.stage, COLONIZATION_STAGE_AWAITING_RESUPPLY);
});

test("Dutch West India Company expeditions originate in the Netherlands, not Lubeck", () => {
  const newAmsterdam = {
    ...colonizationTargetForCity({ city: "New Amsterdam", country: "United States of America" }),
    tileId: 778
  };
  const fortOrange = {
    ...colonizationTargetForCity({ city: "Fort Orange", country: "United States of America" }),
    tileId: 779
  };
  const utrecht = {
    tileId: 22,
    city: "Utrecht",
    country: "Netherlands",
    factionId: "habsburg",
    lat: 52.09,
    lon: 5.12
  };
  const lubeck = {
    tileId: 23,
    city: "Lubeck",
    country: "Germany",
    factionId: "habsburg",
    lat: 53.87,
    lon: 10.69
  };

  assert.equal(newAmsterdam.originCountry, "Netherlands");
  assert.equal(fortOrange.originCountry, "Netherlands");
  assert.deepEqual(
    eligibleColonizationTargetsForOrigin(utrecht, [newAmsterdam, fortOrange]).map((target) => target.city),
    ["Fort Orange", "New Amsterdam"]
  );
  assert.deepEqual(eligibleColonizationTargetsForOrigin(lubeck, [newAmsterdam, fortOrange]), []);
  assert.equal(colonizationOriginCanSponsorTarget(lubeck, newAmsterdam), false);

  const savedQuest = createColonizationQuestMemory();
  assignColonizationQuest(savedQuest, { target: newAmsterdam, origin: utrecht });
  savedQuest.originTileId = lubeck.tileId;
  savedQuest.originCity = lubeck.city;
  savedQuest.originCountry = lubeck.country;
  completeColonizationFetchStage(
    savedQuest,
    colonizationQuestView(questViewState(savedQuest)).history.fetchStages[0].id
  );

  relocateColonizationQuestOrigin(savedQuest, { target: newAmsterdam, origin: utrecht });
  assert.equal(savedQuest.originCity, "Utrecht");
  assert.equal(savedQuest.fetchStageIndex, 1);
});

test("only capacious ocean-going ships can carry the colonists", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const fishingBarque = shipStatsForSlug("fishing-lugger");

  assert.equal(
    colonizationShipEligibility(brigantine, COLONIZATION_EXPEDITION_CARGO_UNITS).eligible,
    true
  );
  assert.equal(colonizationShipEligibility(brigantine, COLONIZATION_EXPEDITION_CARGO_UNITS - 1).eligible, false);
  assert.equal(colonizationShipEligibility(fishingBarque, fishingBarque.cargoCapacity).eligible, false);
  assert.doesNotThrow(() => colonizationShipEligibility(brigantine, 1.3333333333333357));
  assert.equal(colonizationShipEligibility(brigantine, 1.3333333333333357).freeCargoUnits, 4 / 3);
  assert.equal(
    colonizationShipEligibility(brigantine, COLONIZATION_EXPEDITION_CARGO_UNITS + 1e-12).eligible,
    true
  );
});

test("landing creates a village and a one-year resupply objective after departure", () => {
  const memory = readyMemory();
  beginColonizationExpedition(memory);
  assert.equal(memory.stage, COLONIZATION_STAGE_OUTBOUND);
  assert.equal(colonizationWorldRecord(memory).hiddenSettlement, true);
  assert.equal(colonizationObjective(memory).kind, "found-colony");

  landColonists(memory, 1000);
  assert.equal(memory.stage, COLONIZATION_STAGE_AWAITING_RESUPPLY);
  assert.equal(memory.resupplyDeadlineMinute, 1000 + COLONIZATION_RESUPPLY_DAYS * DAY);
  assert.equal(colonizationWorldRecord(memory).settlementType, "village");
  assert.equal(colonizationObjective(memory), null);
  assert.throws(() => assertColonizationResupplyDelivery(memory, 1001), /must leave/);

  assert.equal(advanceColonizationQuest(memory, 1001, { awayFromColony: true }), true);
  assert.equal(colonizationObjective(memory).kind, "resupply-colony");
  assert.equal(assertColonizationResupplyDelivery(memory, 1001), COLONIZATION_RESUPPLY);
});

test("timely resupply creates a discounted French city", () => {
  const memory = awaitingResupplyMemory();
  establishColony(memory, 1200);
  const city = colonizationWorldRecord(memory);

  assert.equal(memory.stage, COLONIZATION_STAGE_ESTABLISHED);
  assert.equal(city.displayCity, "Port Royal");
  assert.equal(city.settlementType, "city");
  assert.equal(city.factionId, "france");
  assert.equal(city.playerFoundedColony, true);
  assert.ok(city.purchaseDiscountMultiplier < 1);
  assert.equal(colonizationObjective(memory), null);
});

test("the colony remains a navigation destination with only fractional resupply cargo", () => {
  const memory = awaitingResupplyMemory();
  const state = questViewState(memory, {
    [COLONIZATION_RESUPPLY.goodId]: 0.75
  });

  assert.equal(colonizationQuestView(state).resupply.deliverable, 0);
  assert.deepEqual(colonizationNavigationObjective(state), {
    tileId: PORT_ROYAL.tileId,
    kind: "resupply-colony"
  });
});

test("establishing Nagasaki upgrades its Japanese village with a Portuguese settlement", () => {
  const target = {
    ...colonizationTargetForCity({ city: "Nagasaki", country: "Japan" }),
    tileId: 789
  };
  const origin = {
    tileId: 790,
    city: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    lat: 38.72,
    lon: -9.14
  };
  const approvalPort = {
    tileId: 791,
    city: "Kyoto",
    country: "Japan",
    factionId: "japan",
    lat: 35.01,
    lon: 135.77
  };
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, { target, origin, approvalPort });
  for (const stage of colonizationQuestView(questViewState(memory)).history.fetchStages) {
    completeColonizationFetchStage(memory, stage.id);
  }
  beginColonizationExpedition(memory);
  grantColonizationApproval(memory, { approvalCargoDelivered: true });
  assert.equal(colonizationWorldRecord(memory), null);
  landColonists(memory, 1000);
  const village = colonizationWorldRecord(memory);
  assert.equal(village.city, "Nagasaki");
  assert.equal(village.settlementType, "village");
  assert.equal(village.population, 600);
  assert.equal(village.factionId, "japan");
  advanceColonizationQuest(memory, 1100, { awayFromColony: true });
  establishColony(memory, 1200);

  const city = colonizationWorldRecord(memory);
  assert.equal(city.settlementType, "city");
  assert.equal(city.factionId, "japan");
  assert.equal(city.playerFoundedColony, false);
  assert.equal(city.playerDevelopedPort, true);
  assert.deepEqual(city.foreignSettlements.map((entry) => entry.id), ["portuguese-nagasaki"]);
});

test("historically attacked colonies upgrade, survive a canoe defense, and await a victory report", () => {
  const target = {
    ...colonizationTargetForCity({ city: "Jamestown", country: "United States of America" }),
    tileId: 456
  };
  const origin = {
    ...BORDEAUX,
    city: "London",
    country: "United Kingdom",
    factionId: "england",
    lat: 51.5,
    lon: -0.12
  };
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, { target, origin });
  for (const stage of colonizationQuestView(questViewState(memory)).history.fetchStages) {
    completeColonizationFetchStage(memory, stage.id);
  }
  beginColonizationExpedition(memory);
  landColonists(memory, 1000);
  advanceColonizationQuest(memory, 1100, { awayFromColony: true });
  establishColony(memory, 1200);

  assert.equal(memory.stage, COLONIZATION_STAGE_DEFEND);
  assert.ok(memory.defenseShipIds.length >= 2 && memory.defenseShipIds.length <= 4);
  assert.equal(new Set(memory.defenseShipIds).size, memory.defenseShipIds.length);
  assert.equal(colonizationWorldRecord(memory).settlementType, "city");
  assert.deepEqual(colonizationObjective(memory), {
    tileId: target.tileId,
    kind: "defend-colony",
    attackerName: "Powhatan"
  });

  for (const [index, shipId] of memory.defenseShipIds.entries()) {
    assert.equal(defeatColonizationAttacker(memory, shipId, 1210 + index), true);
  }
  assert.equal(memory.stage, COLONIZATION_STAGE_REPORT_DEFENSE);
  assert.deepEqual(colonizationObjective(memory), {
    tileId: target.tileId,
    kind: "report-colony-defense"
  });

  completeColonizationDefense(memory, 1300);
  assert.equal(memory.stage, COLONIZATION_STAGE_ESTABLISHED);
  assert.equal(colonizationObjective(memory), null);
});

function questViewState(memory, cargo = {}) {
  return {
    memory: {
      colonization: memory,
      quests: { cargoDeliveries: {} }
    },
    cargo
  };
}

test("late resupply leaves a burning dead village", () => {
  const memory = awaitingResupplyMemory();
  const lateMinute = memory.resupplyDeadlineMinute + 1;
  assert.equal(advanceColonizationQuest(memory, lateMinute, { awayFromColony: true }), true);
  const ruins = colonizationWorldRecord(memory);

  assert.equal(memory.stage, COLONIZATION_STAGE_FAILED);
  assert.equal(ruins.displayCity, "Port Royal Ruins");
  assert.equal(ruins.settlementType, "village");
  assert.equal(ruins.colonyBurning, true);
  assert.equal(ruins.factionId, "neutral");
  assert.throws(() => establishColony(memory, lateMinute), /during failed/);
});

function readyMemory() {
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, { target: PORT_ROYAL, origin: BORDEAUX });
  for (const stage of COLONIZATION_FETCH_STAGES) completeColonizationFetchStage(memory, stage.id);
  return memory;
}

function awaitingResupplyMemory() {
  const memory = readyMemory();
  beginColonizationExpedition(memory);
  landColonists(memory, 1000);
  advanceColonizationQuest(memory, 1100, { awayFromColony: true });
  return memory;
}
