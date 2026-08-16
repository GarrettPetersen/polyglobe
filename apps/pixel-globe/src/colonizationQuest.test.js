import assert from "node:assert/strict";
import test from "node:test";

import { COLONIZATION_TARGETS, colonizationTargetForCity } from "./colonialCities.js";
import {
  COLONIZATION_EXPEDITION_CARGO_UNITS,
  COLONIZATION_FETCH_STAGES,
  COLONIZATION_AFTERMATH_COMPLETE,
  COLONIZATION_AFTERMATH_INVESTIGATING,
  COLONIZATION_AFTERMATH_MISSING,
  COLONIZATION_AFTERMATH_REPORTING,
  COLONIZATION_AFTERMATH_WAITING,
  COLONIZATION_RESUPPLY,
  COLONIZATION_RESUPPLY_DAYS,
  COLONIZATION_STAGE_AWAITING_RESUPPLY,
  COLONIZATION_STAGE_DEFEND,
  COLONIZATION_STAGE_ESTABLISHED,
  COLONIZATION_STAGE_FAILED,
  COLONIZATION_STAGE_OUTBOUND,
  COLONIZATION_STAGE_REPORT_DEFENSE,
  COLONIZATION_STAGE_READY,
  ROANOKE_CLUES_ITEM_ID,
  ROANOKE_DISAPPEARANCE_DAYS,
  ROANOKE_SPONTANEOUS_DISCOVERY_RADIUS_PX,
  advanceColonizationAftermaths,
  advanceColonizationQuest,
  assignColonizationQuest,
  assertColonizationResupplyDelivery,
  beginColonizationExpedition,
  colonizationFetchRequirementId,
  colonizationAftermathAtSite,
  colonizationAftermathForPort,
  colonizationAftermathReportPort,
  colonizationAftermathView,
  colonizationGovernmentInExileFactionId,
  colonizationObjective,
  colonizationOfferForCity,
  colonizationOriginCanHostExiledSponsor,
  colonizationOriginCanSponsorTarget,
  colonizationOrganizerShouldApproach,
  colonizationNavigationObjective,
  colonizationQuestView,
  colonizationShipEligibility,
  colonizationWorldRecord,
  colonizationWorldRecords,
  commissionColonizationAftermath,
  completeColonizationAftermath,
  completeColonizationDefense,
  completeColonizationFetchStage,
  createColonizationQuestMemory,
  defeatColonizationAttacker,
  discoverableColonizationAftermath,
  discoverColonizationAftermath,
  eligibleColonizationTargetsForOrigin,
  establishColony,
  grantColonizationApproval,
  landColonists,
  markColonizationOrganizerApproached,
  reconcileColonizationQuestOriginAfterConquest,
  relocateColonizationQuestOrigin,
  inspectColonizationAftermath,
  roanokeCluesAboard,
  validateColonizationQuestMemory
} from "./colonizationQuest.js";
import { createGameState, shipItemRows } from "./gameState.js";
import {
  applyPortConquestOwnership,
  createPortConquestMemory,
  restoreCollapsedFactionAtCities
} from "./portConquest.js";
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
const ROANOKE = Object.freeze({
  ...colonizationTargetForCity({ city: "Roanoke", country: "United States of America" }),
  tileId: 124
});
const LONDON = Object.freeze({
  tileId: 11,
  city: "London",
  country: "United Kingdom",
  factionId: "england",
  lat: 51.51,
  lon: -0.13
});
const SPONSOR_COUNTRY_BY_FACTION = Object.freeze({
  england: "United Kingdom",
  france: "France",
  habsburg: "Netherlands",
  portugal: "Portugal",
  spain: "Spain"
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

  assert.equal(COLONIZATION_TARGETS.length, 36);
  assert.equal(sailingTargets.length, 30);
  assert.equal(inlandTargets.length, 6);
  for (const target of sailingTargets) {
    const origin = {
      tileId: 9000,
      city: "Sponsor Port",
      country: target.originCountry || SPONSOR_COUNTRY_BY_FACTION[target.originFactionId],
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

test("an overseas colony cannot sponsor another colonial expedition", () => {
  const stJohns = {
    ...colonizationTargetForCity({ city: "St. John's", country: "Canada" }),
    tileId: 124
  };
  const jamestown = {
    tileId: 125,
    city: "Jamestown",
    country: "United States of America",
    factionId: "england",
    foundingFactionId: "england",
    lat: 37.21,
    lon: -76.78
  };
  const london = {
    tileId: 126,
    city: "London",
    country: "United Kingdom",
    factionId: "england",
    foundingFactionId: "england",
    lat: 51.51,
    lon: -0.13
  };
  const state = {
    playerCharacter: { identityKey: "metropolitan-colony-origin" },
    memory: {
      colonization: createColonizationQuestMemory(),
      flags: {},
      quests: { cargoDeliveries: {} }
    }
  };

  assert.equal(colonizationOriginCanSponsorTarget(jamestown, stJohns), false);
  assert.equal(colonizationOfferForCity(
    state,
    jamestown,
    [jamestown, london],
    [stJohns],
    { simMinute: 14 * DAY, spawnChance: 1 }
  ), null);
  assert.notEqual(colonizationOfferForCity(
    state,
    london,
    [jamestown, london],
    [stJohns],
    { simMinute: 14 * DAY, spawnChance: 1, targetTileId: stJohns.tileId }
  ), null);
  assert.equal(state.memory.colonization.originCity, "London");
});

test("old overseas-origin saves relocate to Europe and overseas territory does not block exile sponsorship", () => {
  const stJohns = {
    ...colonizationTargetForCity({ city: "St. John's", country: "Canada" }),
    tileId: 124
  };
  const jamestown = {
    tileId: 125,
    city: "Jamestown",
    country: "United States of America",
    factionId: "england",
    foundingFactionId: "england",
    lat: 37.21,
    lon: -76.78
  };
  const london = {
    tileId: 126,
    city: "London",
    country: "United Kingdom",
    factionId: "england",
    foundingFactionId: "england",
    lat: 51.51,
    lon: -0.13
  };
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, { target: stJohns, origin: london });
  memory.originTileId = jamestown.tileId;
  memory.originCity = jamestown.city;
  memory.originCountry = jamestown.country;

  const relocated = reconcileColonizationQuestOriginAfterConquest(
    questViewState(memory),
    [jamestown, london]
  );
  assert.equal(relocated.kind, "relocated");
  assert.equal(memory.originCity, "London");

  const exileState = {
    playerCharacter: { identityKey: "overseas-only-england" },
    memory: {
      colonization: createColonizationQuestMemory(),
      flags: {},
      quests: { cargoDeliveries: {} }
    }
  };
  const capturedLondon = { ...london, factionId: "france" };
  assert.notEqual(colonizationOfferForCity(
    exileState,
    capturedLondon,
    [jamestown, capturedLondon],
    [stJohns],
    { simMinute: 14 * DAY, spawnChance: 1, targetTileId: stJohns.tileId }
  ), null);
  assert.equal(exileState.memory.colonization.originCity, "London");
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

test("a pre-departure expedition office follows its sponsor after the origin is conquered", () => {
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, { target: PORT_ROYAL, origin: BORDEAUX });
  const state = questViewState(memory);
  state.memory.flags = { colonizationOrganizerApproached: true };
  const firstStage = colonizationQuestView(state).history.fetchStages[0];
  state.memory.quests.cargoDeliveries[
    colonizationFetchRequirementId(PORT_ROYAL, firstStage)
  ] = firstStage.quantity;
  completeColonizationFetchStage(memory, firstStage.id);
  const capturedBordeaux = { ...BORDEAUX, factionId: "england", foundingFactionId: "france" };
  const marseille = {
    tileId: 11,
    city: "Marseille",
    country: "France",
    factionId: "france",
    capitalOfFactionId: "france",
    lat: 43.3,
    lon: 5.37
  };

  const result = reconcileColonizationQuestOriginAfterConquest(
    state,
    [capturedBordeaux, marseille]
  );

  assert.equal(result.kind, "relocated");
  assert.equal(result.previousOrigin.city, "Bordeaux");
  assert.equal(result.origin.city, "Marseille");
  assert.equal(memory.originCity, "Marseille");
  assert.equal(memory.fetchStageIndex, 1);
  assert.equal(
    state.memory.quests.cargoDeliveries[colonizationFetchRequirementId(PORT_ROYAL, firstStage)],
    firstStage.quantity
  );
});

test("a pre-departure expedition becomes a government-in-exile project when its sponsor has no port left", () => {
  const memory = readyMemory();
  const state = questViewState(memory);
  state.memory.flags = { colonizationOrganizerApproached: true };
  for (const stage of COLONIZATION_FETCH_STAGES) {
    state.memory.quests.cargoDeliveries[
      colonizationFetchRequirementId(PORT_ROYAL, stage)
    ] = stage.quantity;
  }

  const result = reconcileColonizationQuestOriginAfterConquest(
    state,
    [{ ...BORDEAUX, factionId: "england", foundingFactionId: "france" }]
  );

  assert.equal(result, null);
  assert.equal(memory.targetCity, "Port Royal");
  assert.equal(memory.originCity, "Bordeaux");
  assert.equal(memory.stage, COLONIZATION_STAGE_READY);
  assert.equal(state.memory.flags.colonizationOrganizerApproached, true);
  for (const stage of COLONIZATION_FETCH_STAGES) {
    assert.equal(
      state.memory.quests.cargoDeliveries[colonizationFetchRequirementId(PORT_ROYAL, stage)],
      stage.quantity
    );
  }
});

test("an old expedition without founding-faction metadata remains at its captured office", () => {
  const memory = readyMemory();
  const capturedBordeaux = { ...BORDEAUX, factionId: "england" };
  delete capturedBordeaux.foundingFactionId;

  const result = reconcileColonizationQuestOriginAfterConquest(
    questViewState(memory),
    [capturedBordeaux]
  );

  assert.equal(result.kind, "government-in-exile");
  assert.equal(result.origin.tileId, BORDEAUX.tileId);
  assert.equal(memory.stage, COLONIZATION_STAGE_READY);
});

test("capturing the origin cannot recall an expedition that is already at sea", () => {
  const memory = readyMemory();
  beginColonizationExpedition(memory);
  const state = questViewState(memory);

  assert.equal(
    reconcileColonizationQuestOriginAfterConquest(
      state,
      [{ ...BORDEAUX, factionId: "england", foundingFactionId: "france" }]
    ),
    null
  );
  assert.equal(memory.stage, COLONIZATION_STAGE_OUTBOUND);
  assert.equal(memory.originCity, "Bordeaux");
  assert.doesNotThrow(() => (
    assignColonizationQuest(memory, {
      target: PORT_ROYAL,
      origin: { ...BORDEAUX, factionId: "england", foundingFactionId: "france" }
    })
  ));
  landColonists(memory, 1000);
  establishColony(memory, 1001);
  assert.equal(memory.stage, COLONIZATION_STAGE_ESTABLISHED);
  assert.equal(colonizationWorldRecord(memory).factionId, "france");
  assert.equal(colonizationGovernmentInExileFactionId(memory, ["france"]), "france");
  assert.equal(colonizationGovernmentInExileFactionId(memory, []), null);
  assert.equal(
    reconcileColonizationQuestOriginAfterConquest(
      state,
      [{ ...BORDEAUX, factionId: "england", foundingFactionId: "france" }]
    ),
    null
  );
});

test("an established exile colony restores its sponsor without returning the annexed homeland", () => {
  const memory = readyMemory();
  beginColonizationExpedition(memory);
  landColonists(memory, 1000);
  establishColony(memory, 1001);
  const colony = colonizationWorldRecord(memory);
  const capturedBordeaux = {
    ...BORDEAUX,
    factionId: "england",
    foundingFactionId: "france"
  };
  const conquest = createPortConquestMemory();
  conquest.collapsedFactionIds.push("france");
  conquest.portFactionOverrides["city-10"] = "england";

  const restoredFactionId = colonizationGovernmentInExileFactionId(
    memory,
    conquest.collapsedFactionIds
  );
  restoreCollapsedFactionAtCities(conquest, [colony], {
    factionId: restoredFactionId,
    capitalCity: colony,
    simMinute: 1001,
    source: "colonial-government-in-exile"
  });
  applyPortConquestOwnership(conquest, [capturedBordeaux, colony]);

  assert.equal(capturedBordeaux.factionId, "england");
  assert.equal(colony.factionId, "france");
  assert.equal(colony.capitalOfFactionId, "france");
  assert.deepEqual(conquest.collapsedFactionIds, ["mughal"]);
});

test("a conquered founding port can offer its former ruler's colony expedition in exile", () => {
  const state = {
    playerCharacter: { identityKey: "conquered-colony-origin" },
    memory: {
      colonization: createColonizationQuestMemory(),
      flags: {},
      quests: { cargoDeliveries: {} }
    }
  };
  const capturedBordeaux = { ...BORDEAUX, factionId: "england", foundingFactionId: "france" };

  assert.equal(colonizationOriginCanHostExiledSponsor(capturedBordeaux, PORT_ROYAL), true);
  assert.notEqual(colonizationOfferForCity(
    state,
    capturedBordeaux,
    [capturedBordeaux],
    [PORT_ROYAL],
    { simMinute: 14 * DAY, spawnChance: 1 }
  ), null);
  assert.equal(state.memory.colonization.originCity, "Bordeaux");
  assert.equal(state.memory.colonization.targetCity, "Port Royal");
});

test("a conquered founding port defers to any surviving sponsor port", () => {
  const state = {
    playerCharacter: { identityKey: "surviving-colony-sponsor" },
    memory: {
      colonization: createColonizationQuestMemory(),
      flags: {},
      quests: { cargoDeliveries: {} }
    }
  };
  const capturedBordeaux = { ...BORDEAUX, factionId: "england", foundingFactionId: "france" };
  const marseille = {
    tileId: 11,
    city: "Marseille",
    country: "France",
    factionId: "france",
    foundingFactionId: "france",
    lat: 43.3,
    lon: 5.37
  };

  assert.equal(colonizationOfferForCity(
    state,
    capturedBordeaux,
    [capturedBordeaux, marseille],
    [PORT_ROYAL],
    { simMinute: 14 * DAY, spawnChance: 1 }
  ), null);
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

test("landing creates a village and an immediate one-year resupply objective", () => {
  const memory = readyMemory();
  beginColonizationExpedition(memory);
  assert.equal(memory.stage, COLONIZATION_STAGE_OUTBOUND);
  assert.equal(colonizationWorldRecord(memory).hiddenSettlement, true);
  assert.equal(colonizationObjective(memory).kind, "found-colony");

  landColonists(memory, 1000);
  assert.equal(memory.stage, COLONIZATION_STAGE_AWAITING_RESUPPLY);
  assert.equal(memory.resupplyDeadlineMinute, 1000 + COLONIZATION_RESUPPLY_DAYS * DAY);
  assert.equal(colonizationWorldRecord(memory).settlementType, "village");
  assert.equal(colonizationObjective(memory).kind, "resupply-colony");
  assert.equal(assertColonizationResupplyDelivery(memory, 1001), COLONIZATION_RESUPPLY);

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
  assert.equal(city.colonialFoundingType, PORT_ROYAL.type);
  assert.equal(city.economyRegion, "temperate-american-colony");
  assert.equal(city.playerFoundedColony, true);
  assert.ok(city.purchaseDiscountMultiplier < 1);
  assert.equal(colonizationObjective(memory), null);
});

test("Roanoke is available from 1522 and becomes a lost-colony investigation two years after founding", () => {
  const state = {
    playerCharacter: { identityKey: "roanoke-1522" },
    memory: {
      colonization: createColonizationQuestMemory(),
      flags: {},
      quests: { cargoDeliveries: {} }
    }
  };
  const offer = colonizationOfferForCity(state, LONDON, [LONDON], [ROANOKE], {
    simMinute: 14 * DAY,
    spawnChance: 1,
    targetTileId: ROANOKE.tileId
  });
  assert.equal(offer.targetCity, "Roanoke");

  for (const stage of colonizationQuestView(state).history.fetchStages) {
    completeColonizationFetchStage(offer, stage.id);
  }
  beginColonizationExpedition(offer);
  landColonists(offer, 1000);
  advanceColonizationQuest(offer, 1100, { awayFromColony: true });
  establishColony(offer, 1200);
  assert.equal(offer.aftermath.stage, COLONIZATION_AFTERMATH_WAITING);
  assert.equal(
    offer.aftermath.dueMinute,
    1200 + ROANOKE_DISAPPEARANCE_DAYS * DAY
  );

  assert.deepEqual(advanceColonizationAftermaths(offer, offer.aftermath.dueMinute, {
    isTileVisible: () => true
  }), []);
  assert.equal(offer.aftermath.stage, COLONIZATION_AFTERMATH_WAITING);

  const disappearance = advanceColonizationAftermaths(offer, offer.aftermath.dueMinute + 1, {
    isTileVisible: () => false
  });
  assert.equal(disappearance.length, 1);
  assert.equal(offer.aftermath.stage, COLONIZATION_AFTERMATH_MISSING);
  assert.equal(colonizationWorldRecord(offer).hiddenSettlement, true);
  assert.equal(colonizationAftermathForPort(offer, {
    tileId: 12,
    city: "Jamestown",
    country: "United States of America",
    factionId: "england",
    lat: 37.21,
    lon: -76.78
  }), null, "an overseas English port cannot commission the search");
  assert.equal(colonizationAftermathForPort(offer, LONDON).stage, COLONIZATION_AFTERMATH_MISSING);

  commissionColonizationAftermath(offer, LONDON, offer.aftermath.dueMinute + 2);
  assert.equal(offer.aftermath.stage, COLONIZATION_AFTERMATH_INVESTIGATING);
  assert.deepEqual(colonizationObjective(offer), {
    tileId: ROANOKE.tileId,
    kind: "investigate-lost-colony"
  });
  const abandoned = colonizationWorldRecord(offer);
  assert.equal(abandoned.hiddenSettlement, false);
  assert.equal(abandoned.colonyAbandoned, true);
  assert.equal(abandoned.requiredTradePort, false);
  assert.equal(abandoned.factionId, "neutral");
  assert.equal(colonizationAftermathAtSite(offer, abandoned).stage, COLONIZATION_AFTERMATH_INVESTIGATING);

  inspectColonizationAftermath(offer, abandoned, offer.aftermath.dueMinute + 3);
  assert.equal(offer.aftermath.stage, COLONIZATION_AFTERMATH_REPORTING);
  assert.equal(roanokeCluesAboard(offer), true);
  assert.deepEqual(colonizationObjective(offer), {
    tileId: LONDON.tileId,
    kind: "report-lost-colony"
  });
  assert.equal(colonizationAftermathView(offer).reportCity, "London");

  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Test Captain", nationalityId: "england", expressions: ["neutral"] }
  });
  gameState.memory.colonization = offer;
  const clue = shipItemRows(gameState).find((row) => row.id === ROANOKE_CLUES_ITEM_ID);
  assert.equal(clue.label, "Roanoke Clues");
  assert.equal(clue.questItem, true);
  assert.equal(clue.discardable, false);

  completeColonizationAftermath(offer, LONDON, offer.aftermath.dueMinute + 4);
  assert.equal(offer.aftermath.stage, COLONIZATION_AFTERMATH_COMPLETE);
  assert.equal(roanokeCluesAboard(offer), false);
  assert.equal(colonizationObjective(offer), null);
  assert.equal(shipItemRows(gameState).some((row) => row.id === ROANOKE_CLUES_ITEM_ID), false);
});

test("approaching missing Roanoke commissions the existing investigation without a port visit", () => {
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, { target: ROANOKE, origin: LONDON });
  for (const stage of colonizationQuestView(questViewState(memory)).history.fetchStages) {
    completeColonizationFetchStage(memory, stage.id);
  }
  beginColonizationExpedition(memory);
  landColonists(memory, 1000);
  advanceColonizationQuest(memory, 1100, { awayFromColony: true });
  establishColony(memory, 1200);
  advanceColonizationAftermaths(memory, memory.aftermath.dueMinute + 1, {
    isTileVisible: () => false
  });

  assert.equal(
    discoverableColonizationAftermath(memory, ROANOKE_SPONTANEOUS_DISCOVERY_RADIUS_PX + 0.1),
    null
  );
  const nearby = discoverableColonizationAftermath(
    memory,
    ROANOKE_SPONTANEOUS_DISCOVERY_RADIUS_PX
  );
  assert.equal(nearby.stage, COLONIZATION_AFTERMATH_MISSING);

  const jamestown = {
    tileId: 125,
    city: "Jamestown",
    country: "United States of America",
    factionId: "england",
    lat: 37.21,
    lon: -76.78
  };
  const reportPort = colonizationAftermathReportPort(memory, [jamestown, LONDON]);
  assert.equal(reportPort, LONDON, "an overseas English colony cannot receive the report");

  const investigation = discoverColonizationAftermath(
    memory,
    nearby.target,
    reportPort,
    memory.aftermath.dueMinute + 2
  );
  assert.equal(investigation.stage, COLONIZATION_AFTERMATH_INVESTIGATING);
  assert.equal(investigation.reportCity, "London");
  assert.deepEqual(colonizationObjective(memory), {
    tileId: ROANOKE.tileId,
    kind: "investigate-lost-colony"
  });
});

test("an established colony is archived before a later expedition is offered", () => {
  const memory = awaitingResupplyMemory();
  establishColony(memory, 1200);
  const quebec = {
    ...colonizationTargetForCity({ city: "Quebec", country: "Canada" }),
    tileId: 124
  };
  const state = {
    playerCharacter: { name: "Test Captain", identityKey: "repeat-colonization-test" },
    memory: { colonization: memory, flags: { colonizationOrganizerApproached: true } }
  };

  const offer = colonizationOfferForCity(state, BORDEAUX, [BORDEAUX], [PORT_ROYAL, quebec], {
    simMinute: 14 * DAY,
    spawnChance: 1,
    targetTileId: quebec.tileId
  });

  assert.equal(offer.targetCity, "Quebec");
  assert.equal(memory.pastSettlements.length, 1);
  assert.equal(memory.pastSettlements[0].targetCity, "Port Royal");
  assert.equal(state.memory.flags.colonizationOrganizerApproached, undefined);
  assert.deepEqual(
    colonizationWorldRecords(memory).map((record) => record.city),
    ["Port Royal"]
  );
  assert.equal(colonizationOrganizerShouldApproach(state, BORDEAUX), true);
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
