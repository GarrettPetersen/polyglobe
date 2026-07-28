import assert from "node:assert/strict";
import test from "node:test";

import { COLONIZATION_TARGETS, colonizationTargetForCity } from "./colonialCities.js";
import {
  COLONIZATION_FETCH_STAGES,
  COLONIZATION_RESUPPLY,
  COLONIZATION_RESUPPLY_EXTENSION_DAYS_PER_UNIT,
  COLONIZATION_STAGE_DEFEND,
  COLONIZATION_STAGE_ESTABLISHED,
  COLONIZATION_STAGE_REPORT_DEFENSE,
  advanceColonizationQuest,
  assignColonizationQuest,
  beginColonizationExpedition,
  colonizationObjective,
  colonizationOrganizerShouldApproach,
  colonizationQuestView,
  colonizationWorldRecord,
  completeColonizationDefense,
  completeColonizationFetchStage,
  defeatColonizationAttacker,
  establishColony,
  grantColonizationApproval,
  landColonists
} from "./colonizationQuest.js";
import {
  createPortArrivalDialogueSession,
  createPortDialogueSession,
  portDialogueView,
  selectPortDialogueOption
} from "./dialogueSystem.js";
import { createWorldEconomy } from "./economy.js";
import {
  cargoReservationUnits,
  createGameState,
  diplomacyBetweenForState,
  shipTravelerManifest
} from "./gameState.js";
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
const PORT_ROYAL = Object.freeze({
  ...colonizationTargetForCity({ city: "Port Royal", country: "Canada" }),
  tileId: 99
});
const LISBON = Object.freeze({
  ...BORDEAUX,
  tileId: 20,
  portId: "city-20",
  city: "Lisbon",
  displayCity: "Lisbon",
  country: "Portugal",
  factionId: "portugal",
  lat: 38.72,
  lon: -9.14
});
const KYOTO = Object.freeze({
  ...BORDEAUX,
  tileId: 21,
  portId: "city-21",
  city: "Kyoto",
  displayCity: "Kyoto",
  country: "Japan",
  factionId: "japan",
  capitalOfFactionId: "japan",
  lat: 35.01,
  lon: 135.77
});
const NAGASAKI = Object.freeze({
  ...colonizationTargetForCity({ city: "Nagasaki", country: "Japan" }),
  tileId: 100
});
const RIO_DE_JANEIRO = Object.freeze({
  ...colonizationTargetForCity({ city: "Rio de Janeiro", country: "Brazil" }),
  tileId: 101
});

test("the colonial organizer approaches before first-port business", () => {
  const shipStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  assignColonizationQuest(gameState.memory.colonization, { target: PORT_ROYAL, origin: BORDEAUX });
  const economy = createWorldEconomy({ ports: [BORDEAUX], startMinute: 0 });
  const session = createPortArrivalDialogueSession(BORDEAUX, {
    colonizationApproach: true,
    needsLoadout: true
  });

  assert.equal(session.nodeId, "colonization");
  assert.equal(session.colonizationArrival, true);
  assert.equal(session.nextPortNodeId, "loadout");
  const view = portDialogueView(session, BORDEAUX, gameState, economy, [BORDEAUX], {
    simMinute: 1000,
    shipStats
  });
  assert.match(view.text, /Captain, a word before you see the factor/);
  const notNowIndex = view.options.findIndex((option) => option.label === "Not now");
  assert.notEqual(notNowIndex, -1);
  selectPortDialogueOption(
    session,
    BORDEAUX,
    gameState,
    economy,
    [BORDEAUX],
    notNowIndex,
    { simMinute: 1000, shipStats }
  );
  assert.equal(session.nodeId, "loadout");
  assert.equal(session.colonizationArrival, false);
  assert.equal(colonizationOrganizerShouldApproach(gameState, BORDEAUX), true);
});

test("the colonial organizer runs the paid expedition through a permanent founded port", () => {
  const shipStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  assignColonizationQuest(gameState.memory.colonization, { target: PORT_ROYAL, origin: BORDEAUX });
  const economy = createWorldEconomy({ ports: [BORDEAUX], startMinute: 0 });
  const ports = [BORDEAUX];
  const context = { simMinute: 1000, shipStats };
  const originSession = createPortDialogueSession(BORDEAUX, { initialNodeId: "colonization" });

  for (const [stageIndex, stage] of COLONIZATION_FETCH_STAGES.entries()) {
    if (stageIndex === 0) {
      gameState.cargo[stage.goodId] = 1;
      gameState.accounts.cargoCostBasis[stage.goodId] = 0;
      const partial = chooseAction(
        originSession,
        BORDEAUX,
        gameState,
        economy,
        ports,
        context,
        "deliver-colonization-material"
      );
      assert.equal(partial.colonizationDelivery.complete, false);
      assert.equal(partial.colonizationDelivery.remainingQuantity, stage.quantity - 1);
      assert.equal(partial.colonizationPayment, null);
      assert.equal(gameState.memory.colonization.fetchStageIndex, 0);
      gameState.cargo[stage.goodId] = stage.quantity - 1;
    } else {
      gameState.cargo[stage.goodId] = stage.quantity;
    }
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
  const originalDeadline = gameState.memory.colonization.resupplyDeadlineMinute;
  gameState.cargo[COLONIZATION_RESUPPLY.goodId] = 1;
  gameState.accounts.cargoCostBasis[COLONIZATION_RESUPPLY.goodId] = 0;
  const partialResupply = chooseAction(
    siteSession,
    site,
    gameState,
    economy,
    ports,
    { ...context, simMinute: originalDeadline - 1 },
    "deliver-colony-resupply"
  );
  assert.equal(partialResupply.colonyEstablished, false);
  assert.equal(partialResupply.colonizationDelivery.remainingQuantity, COLONIZATION_RESUPPLY.quantity - 1);
  assert.equal(
    gameState.memory.colonization.resupplyDeadlineMinute,
    originalDeadline + COLONIZATION_RESUPPLY_EXTENSION_DAYS_PER_UNIT * 24 * 60
  );
  assert.match(
    portDialogueView(siteSession, site, gameState, economy, ports, {
      ...context,
      simMinute: originalDeadline + 1
    }).text,
    new RegExp(`already delivered 1 of ${COLONIZATION_RESUPPLY.quantity}`, "i")
  );
  advanceColonizationQuest(gameState.memory.colonization, originalDeadline + 1, {
    awayFromColony: true
  });
  assert.equal(gameState.memory.colonization.stage, "awaiting-resupply");

  gameState.cargo[COLONIZATION_RESUPPLY.goodId] = COLONIZATION_RESUPPLY.quantity - 1;
  gameState.accounts.cargoCostBasis[COLONIZATION_RESUPPLY.goodId] = 0;
  const result = chooseAction(
    siteSession,
    site,
    gameState,
    economy,
    ports,
    { ...context, simMinute: originalDeadline + 1 },
    "deliver-colony-resupply"
  );

  assert.equal(result.colonyEstablished, true);
  assert.equal(colonizationWorldRecord(gameState.memory.colonization).settlementType, "city");
  assert.equal(gameState.doubloons, 360 + 760 + COLONIZATION_RESUPPLY.reward);
  assert.ok(gameState.accounts.ledger.some((entry) => entry.description === "Port Royal first-year resupply"));
});

test("Portuguese emissaries secure Japanese permission in Kyoto before founding Nagasaki", () => {
  const shipStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  assignColonizationQuest(gameState.memory.colonization, {
    target: NAGASAKI,
    origin: LISBON,
    approvalPort: KYOTO
  });
  for (const stage of colonizationQuestView(gameState).history.fetchStages) {
    completeColonizationFetchStage(gameState.memory.colonization, stage.id);
  }

  const ports = [LISBON, KYOTO];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const context = { simMinute: 1000, shipStats };
  const originSession = createPortDialogueSession(LISBON, { initialNodeId: "colonization" });
  const departureView = portDialogueView(originSession, LISBON, gameState, economy, ports, context);
  const embarkOption = departureView.options.find((option) => option.action.type === "embark-colonists");
  assert.equal(embarkOption.disabled, true);
  assert.match(embarkOption.disabledReason, /4 matchlocks and 3 gunpowder/);

  gameState.cargo.matchlocks = 4;
  gameState.cargo.gunpowder = 3;
  gameState.accounts.cargoCostBasis.matchlocks = 240;
  gameState.accounts.cargoCostBasis.gunpowder = 90;
  chooseAction(originSession, LISBON, gameState, economy, ports, context, "embark-colonists");
  assert.deepEqual(shipTravelerManifest(gameState), [{ kind: "settler", count: 12 }]);
  assert.equal(cargoReservationUnits(gameState, "port-royal-colonists"), 24);

  const session = createPortDialogueSession(KYOTO, { initialNodeId: "colonization" });
  const opening = portDialogueView(session, KYOTO, gameState, economy, ports, context);

  assert.match(opening.text, /Portuguese seal/);
  assert.match(opening.text, /permanent trading harbor at Nagasaki/);
  assert.match(opening.text, /Omura Sumitada/);
  chooseAction(
    session,
    KYOTO,
    gameState,
    economy,
    ports,
    context,
    "advance-colony-negotiation"
  );
  const reply = portDialogueView(session, KYOTO, gameState, economy, ports, context);
  assert.match(reply.text, /Portuguese emissaries/);
  assert.match(reply.text, /Japan already knows gunpowder/);
  assert.match(reply.text, /Omura Sumitada/);
  assert.equal(diplomacyBetweenForState(gameState, "japan", "portugal"), "neutral");
  const result = chooseAction(
    session,
    KYOTO,
    gameState,
    economy,
    ports,
    context,
    "grant-colony-permission"
  );
  assert.equal(gameState.memory.colonization.approvalGranted, true);
  assert.equal(diplomacyBetweenForState(gameState, "japan", "portugal"), "friendly");
  assert.equal(result.colonizationDiplomacyEvents.length, 1);
  assert.equal(result.colonizationDiplomacyEvents[0].reason, "colony-nagasaki-japan-agreement");
  assert.match(session.feedback, /improve relations/);
  const closing = portDialogueView(session, KYOTO, gameState, economy, ports, context);
  assert.match(closing.text, /Japanese port/);
  assert.match(closing.text, /Omura anchorage/);
  chooseAction(
    session,
    KYOTO,
    gameState,
    economy,
    ports,
    context,
    "finish-colony-negotiation"
  );
  assert.equal(session.nodeId, "greeting");
  assert.equal(gameState.cargo.matchlocks, undefined);
  assert.equal(gameState.cargo.gunpowder, undefined);
  assert.equal(cargoReservationUnits(gameState, "port-royal-colonists"), 24);
  assert.deepEqual(colonizationObjective(gameState.memory.colonization), {
    tileId: NAGASAKI.tileId,
    kind: "found-colony"
  });
  assert.ok(gameState.accounts.ledger.some((entry) => entry.description === "Deliver Matchlocks x4"));
  assert.ok(gameState.accounts.ledger.some((entry) => entry.description === "Deliver Gunpowder x3"));
});

test("a resupplied attacked colony pays a second reward only after the canoe defense is reported", () => {
  const shipStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  assignColonizationQuest(gameState.memory.colonization, {
    target: RIO_DE_JANEIRO,
    origin: LISBON
  });
  const history = colonizationQuestView(gameState).history;
  for (const stage of history.fetchStages) completeColonizationFetchStage(gameState.memory.colonization, stage.id);
  beginColonizationExpedition(gameState.memory.colonization);
  landColonists(gameState.memory.colonization, 1000);
  advanceColonizationQuest(gameState.memory.colonization, 1001, { awayFromColony: true });

  gameState.cargo[history.resupply.goodId] = history.resupply.quantity;
  gameState.accounts.cargoCostBasis[history.resupply.goodId] = 0;
  const site = { ...colonizationWorldRecord(gameState.memory.colonization), character: CHARACTER };
  const session = createPortDialogueSession(site, { initialNodeId: "colonization" });
  const economy = createWorldEconomy({ ports: [LISBON], startMinute: 0 });
  const resupplyResult = chooseAction(
    session,
    site,
    gameState,
    economy,
    [LISBON],
    { simMinute: 1100, shipStats },
    "deliver-colony-resupply"
  );

  assert.equal(resupplyResult.colonizationDefenseStarted, true);
  assert.equal(gameState.memory.colonization.stage, COLONIZATION_STAGE_DEFEND);
  assert.equal(colonizationWorldRecord(gameState.memory.colonization).settlementType, "city");
  const afterResupply = gameState.doubloons;
  for (const shipId of gameState.memory.colonization.defenseShipIds) {
    defeatColonizationAttacker(gameState.memory.colonization, shipId, 1110);
  }
  assert.equal(gameState.memory.colonization.stage, COLONIZATION_STAGE_REPORT_DEFENSE);

  const reportResult = chooseAction(
    session,
    site,
    gameState,
    economy,
    [LISBON],
    { simMinute: 1120, shipStats },
    "report-colony-defense"
  );
  assert.equal(gameState.memory.colonization.stage, COLONIZATION_STAGE_ESTABLISHED);
  assert.equal(gameState.doubloons, afterResupply + history.defense.reward);
  assert.equal(reportResult.colonizationDefenseReward.amount, history.defense.reward);
  assert.ok(gameState.accounts.ledger.some((entry) => entry.description === "Rio de Janeiro defense reward"));
});

test("every sailing colony renders its own history through the complete dialogue arc", () => {
  const shipStats = shipStatsForSlug("brigantine");
  const targets = COLONIZATION_TARGETS.filter((target) => target.waterAccess !== "inland");

  for (const [index, canonicalTarget] of targets.entries()) {
    const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
    const target = { ...canonicalTarget, tileId: 1000 + index };
    const origin = {
      ...BORDEAUX,
      tileId: 2000 + index,
      portId: `origin-${index}`,
      city: `Sponsor Port ${index}`,
      displayCity: `Sponsor Port ${index}`,
      country: target.originCountry || `Sponsor Realm ${index}`,
      factionId: target.originFactionId,
      lat: -target.lat,
      lon: target.lon > 0 ? target.lon - 160 : target.lon + 160
    };
    const approval = target.approvalFactionId
      ? {
          ...KYOTO,
          tileId: 3000 + index,
          portId: `approval-${index}`,
          factionId: target.approvalFactionId
        }
      : null;
    assignColonizationQuest(gameState.memory.colonization, {
      target,
      origin,
      approvalPort: approval
    });
    const quest = colonizationQuestView(gameState);
    const history = quest.history;
    const ports = approval ? [origin, approval] : [origin];
    const economy = createWorldEconomy({ ports, startMinute: 0 });
    const context = { simMinute: 1000, shipStats };
    const originSession = createPortDialogueSession(origin, { initialNodeId: "colonization" });

    for (const stage of history.fetchStages) {
      const fetchView = portDialogueView(originSession, origin, gameState, economy, ports, context);
      assert.ok(fetchView.text.includes(stage.lead), `${target.city}: ${stage.id}`);
      assert.ok(fetchView.text.includes(stage.purpose), `${target.city}: ${stage.id} purpose`);
      completeColonizationFetchStage(gameState.memory.colonization, stage.id);
    }
    const readyView = portDialogueView(originSession, origin, gameState, economy, ports, context);
    assert.ok(readyView.text.includes(history.ready), `${target.city}: ready`);

    beginColonizationExpedition(gameState.memory.colonization);
    const underwayView = portDialogueView(originSession, origin, gameState, economy, ports, context);
    assert.ok(underwayView.text.includes(history.departed), `${target.city}: departed`);
    if (approval) grantColonizationApproval(gameState.memory.colonization, { approvalCargoDelivered: true });

    const site = { ...colonizationWorldRecord(gameState.memory.colonization), character: CHARACTER };
    const siteSession = createPortDialogueSession(site, { initialNodeId: "colonization" });
    const landingView = portDialogueView(siteSession, site, gameState, economy, ports, context);
    assert.ok(landingView.text.includes(history.landing), `${target.city}: landing`);
    assert.ok(landingView.options.some((entry) => entry.label === history.landingAction), `${target.city}: action`);

    landColonists(gameState.memory.colonization, 1000);
    const waitingView = portDialogueView(siteSession, site, gameState, economy, ports, context);
    assert.ok(waitingView.text.includes(history.resupply.waiting), `${target.city}: waiting`);
    advanceColonizationQuest(gameState.memory.colonization, 1001, { awayFromColony: true });
    const returnedView = portDialogueView(siteSession, site, gameState, economy, ports, {
      ...context,
      simMinute: 1001
    });
    assert.ok(returnedView.text.includes(history.resupply.returned), `${target.city}: returned`);

    establishColony(gameState.memory.colonization, 1001);
    if (history.defense) {
      const defenseView = portDialogueView(siteSession, site, gameState, economy, ports, {
        ...context,
        simMinute: 1001
      });
      assert.ok(defenseView.text.includes(history.defense.alert), `${target.city}: defense alert`);
      for (const shipId of gameState.memory.colonization.defenseShipIds) {
        defeatColonizationAttacker(gameState.memory.colonization, shipId, 1002);
      }
      const reportView = portDialogueView(siteSession, site, gameState, economy, ports, {
        ...context,
        simMinute: 1002
      });
      assert.ok(reportView.text.includes(history.defense.report), `${target.city}: defense report`);
      assert.ok(reportView.options.some((entry) => entry.action.type === "report-colony-defense"));
      completeColonizationDefense(gameState.memory.colonization, 1002);
    }
    const establishedView = portDialogueView(siteSession, site, gameState, economy, ports, {
      ...context,
      simMinute: 1001
    });
    assert.ok(establishedView.text.includes(history.established), `${target.city}: established`);
  }
});

function chooseAction(session, city, gameState, economy, ports, context, actionType) {
  const view = portDialogueView(session, city, gameState, economy, ports, context);
  const optionIndex = view.options.findIndex((entry) => entry.action.type === actionType);
  assert.notEqual(optionIndex, -1, `${actionType} option`);
  assert.equal(view.options[optionIndex].disabled, false);
  return selectPortDialogueOption(session, city, gameState, economy, ports, optionIndex, context);
}
