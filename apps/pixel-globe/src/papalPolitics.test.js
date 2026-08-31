import assert from "node:assert/strict";
import test from "node:test";

import { createWorldDiplomacy, worldDiplomacyBetween } from "./worldDiplomacy.js";
import {
  PAPAL_COMMISSION_ALMS,
  PAPAL_COMMISSION_RELIEF,
  PAPAL_ACTION_EXCOMMUNICATION,
  PAPAL_ACTION_CONDEMNATION,
  PAPAL_ACTION_CRUSADE,
  PAPAL_ACTION_FAVOUR,
  PAPAL_ACTION_REVOCATION,
  PAPAL_MATTER_AVAILABLE,
  PAPAL_MATTER_COMMISSIONED,
  acceptPapalCommission,
  activePapalDecrees,
  advancePapalCommissionAtPort,
  advancePapalPolitics,
  completePapalCommission,
  createPapalPolitics,
  declinePapalCommission,
  imposePapalAction,
  migratePapalPolitics,
  papalCommissionEligibility,
  papalCommissionObjective,
  papalActionNotice,
  papalMatterNotice,
  revokePapalAction
} from "./papalPolitics.js";
import { ENGLISH_REFORMATION_MINUTE } from "./rulers.js";
import { advanceGamePolitics, createGameState } from "./gameState.js";

test("scheduled papal policy waits for player intervention before resolving autonomously", () => {
  const papacy = createPapalPolitics({ seedKey: "cadence" });
  const diplomacy = createWorldDiplomacy({ seedKey: "cadence" });
  const before = advancePapalPolitics(papacy, diplomacy, papacy.nextActionMinute - 1);
  assert.equal(before.actions.length, 0);
  const due = advancePapalPolitics(papacy, diplomacy, papacy.nextActionMinute);
  assert.equal(due.actions.length, 0);
  assert.equal(due.mattersOpened.length, 1);
  assert.equal(papacy.pendingMatter.status, PAPAL_MATTER_AVAILABLE);
  const resolved = advancePapalPolitics(
    papacy,
    diplomacy,
    papacy.pendingMatter.autonomousDecisionMinute
  );
  assert.equal(resolved.actions.length, 1);
  assert.equal(papacy.pendingMatter, null);
  assert.ok(papacy.nextActionMinute > resolved.actions[0].simMinute);
});

test("an eligible Catholic captain can carry a pending matter as a Papal commission", () => {
  const papacy = createPapalPolitics({ seedKey: "commission" });
  const diplomacy = createWorldDiplomacy({ seedKey: "commission" });
  advancePapalPolitics(papacy, diplomacy, papacy.nextActionMinute);
  const context = {
    playerFactionId: "spain",
    playerReligionId: "roman-catholic",
    papalReputation: 20
  };
  assert.equal(papalCommissionEligibility(papacy, diplomacy, context).eligible, true);
  acceptPapalCommission(papacy, diplomacy, {
    ...context,
    simMinute: papacy.lastUpdateMinute,
    originCityId: "rome|italy",
    originTileId: 1,
    itinerary: [{ cityId: "test port|test", tileId: 2, portName: "Test Port", factionId: "habsburg", purpose: "test" }],
    rewardDoubloons: 500,
    nuncio: { id: "nuncio-test", name: "Monsignor Test" }
  });
  assert.equal(papacy.pendingMatter.status, PAPAL_MATTER_COMMISSIONED);
  assert.equal(papalCommissionObjective(papacy).destination.tileId, 2);
  advancePapalCommissionAtPort(papacy, {
    cityId: "test port|test",
    tileId: 2,
    simMinute: papacy.lastUpdateMinute + 1,
    recommendation: "firm"
  });
  assert.equal(papalCommissionObjective(papacy).kind, "return-to-rome");
  const completion = completePapalCommission(papacy, diplomacy, {
    simMinute: papacy.lastUpdateMinute + 2
  });
  assert.equal(completion.rewardDoubloons, 500);
  assert.equal(papacy.pendingMatter, null);
});

test("an accepted commission blocks autonomous policy and is revoked if Papal standing collapses", () => {
  const papacy = createPapalPolitics({ seedKey: "revoked-commission" });
  const diplomacy = createWorldDiplomacy({ seedKey: "revoked-commission" });
  advancePapalPolitics(papacy, diplomacy, papacy.nextActionMinute);
  const context = {
    playerFactionId: "spain",
    playerReligionId: "roman-catholic",
    papalReputation: 20
  };
  acceptPapalCommission(papacy, diplomacy, {
    ...context,
    simMinute: papacy.lastUpdateMinute,
    originCityId: "rome|italy",
    originTileId: 1,
    itinerary: [{ cityId: "test port|test", tileId: 2, portName: "Test Port", factionId: "habsburg", purpose: "test" }],
    rewardDoubloons: 500,
    nuncio: { id: "nuncio-revoked", name: "Monsignor Test" }
  });
  const result = advancePapalPolitics(papacy, diplomacy, papacy.lastUpdateMinute + 1, {
    playerCommissionContext: { ...context, papalReputation: -20 }
  });
  assert.equal(result.actions.length, 0);
  assert.equal(result.commissionRevoked.reason, "insufficient-papal-standing");
  assert.equal(papacy.pendingMatter.status, PAPAL_MATTER_AVAILABLE);
  assert.deepEqual(papacy.pendingMatter.revocation, {
    reason: "insufficient-papal-standing",
    simMinute: papacy.lastUpdateMinute
  });
  assert.equal(papalMatterNotice(papacy.pendingMatter), "PAPAL LEGATION REVOKED");
});

test("version 1 Papal memory migrates with no invented pending matter", () => {
  const legacy = createPapalPolitics({ seedKey: "legacy-papacy" });
  legacy.version = 1;
  delete legacy.pendingMatter;
  const migrated = migratePapalPolitics(legacy);
  assert.equal(migrated.version, 5);
  assert.equal(migrated.pendingMatter, null);
});

test("Papal alms and war relief enter the same optional autonomous queue", () => {
  const alms = pendingMatterForKind(PAPAL_COMMISSION_ALMS);
  assert.deepEqual(
    alms.papacy.pendingMatter.cargoRequirements.map(({ goodId, quantity }) => [goodId, quantity]),
    [["grain", 10]]
  );
  assert.equal(declinePapalCommission(alms.papacy), true);
  const almsResolution = advancePapalPolitics(
    alms.papacy,
    alms.diplomacy,
    alms.papacy.pendingMatter.autonomousDecisionMinute
  );
  assert.equal(almsResolution.actions[0].logistics.kind, PAPAL_COMMISSION_ALMS);
  assert.match(papalActionNotice(almsResolution.actions[0]), /sends grain alms to/i);

  const relief = pendingMatterForKind(PAPAL_COMMISSION_RELIEF);
  assert.ok(relief.papacy.pendingMatter.beneficiaryFactionId);
  assert.deepEqual(
    relief.papacy.pendingMatter.cargoRequirements.map(({ goodId, quantity }) => [goodId, quantity]),
    [["grain", 8], ["gunpowder", 3]]
  );
  assert.equal(declinePapalCommission(relief.papacy), true);
  const reliefResolution = advancePapalPolitics(
    relief.papacy,
    relief.diplomacy,
    relief.papacy.pendingMatter.autonomousDecisionMinute
  );
  assert.equal(reliefResolution.actions[0].logistics.kind, PAPAL_COMMISSION_RELIEF);
  assert.match(papalActionNotice(reliefResolution.actions[0]), /relief reaches .* against/i);
});

test("Papal transport commissions cannot advance before their cargo arrives", () => {
  const { papacy, diplomacy } = pendingMatterForKind(PAPAL_COMMISSION_ALMS);
  const matter = papacy.pendingMatter;
  const context = {
    playerFactionId: "spain",
    playerReligionId: "roman-catholic",
    papalReputation: 20
  };
  acceptPapalCommission(papacy, diplomacy, {
    ...context,
    simMinute: papacy.lastUpdateMinute,
    originCityId: "rome|italy",
    originTileId: 1,
    itinerary: [{
      cityId: "relief port|test",
      tileId: 2,
      portName: "Relief Port",
      factionId: matter.targetFactionId,
      purpose: "deliver-alms"
    }],
    rewardDoubloons: 500,
    nuncio: { id: "nuncio-alms", name: "Monsignor Alms" }
  });

  assert.throws(
    () => advancePapalCommissionAtPort(papacy, {
      cityId: "relief port|test",
      tileId: 2,
      simMinute: papacy.lastUpdateMinute + 1
    }),
    /cargo is incomplete/
  );
  advancePapalCommissionAtPort(papacy, {
    cityId: "relief port|test",
    tileId: 2,
    simMinute: papacy.lastUpdateMinute + 1,
    cargoComplete: true
  });
  assert.equal(papalCommissionObjective(papacy).kind, "return-to-rome");
});

test("version 2 Papal transport matters gain cargo without losing their queue position", () => {
  const { papacy } = pendingMatterForKind(PAPAL_COMMISSION_RELIEF);
  const legacy = structuredClone(papacy);
  legacy.version = 2;
  delete legacy.pendingMatter.cargoRequirements;

  const migrated = migratePapalPolitics(legacy);
  assert.equal(migrated.version, 5);
  assert.equal(migrated.pendingMatter.id, papacy.pendingMatter.id);
  assert.deepEqual(
    migrated.pendingMatter.cargoRequirements.map(({ goodId, quantity }) => [goodId, quantity]),
    [["grain", 8], ["gunpowder", 3]]
  );
});

test("an excommunication changes papal relations and records the targeted ruler", () => {
  const papacy = createPapalPolitics({ seedKey: "excommunication" });
  const diplomacy = createWorldDiplomacy({ seedKey: "excommunication" });
  const result = imposePapalAction(papacy, diplomacy, {
    kind: PAPAL_ACTION_EXCOMMUNICATION,
    targetFactionId: "england",
    simMinute: 100,
    source: "test"
  });
  assert.equal(result.action.targetFactionId, "england");
  assert.equal(papacy.excommunications.england.rulerName, "King Henry VIII");
  assert.equal(worldDiplomacyBetween(diplomacy, "papal-states", "england"), "hostile");
});

test("every durable Papal decree can be rescinded without erasing its history", () => {
  const kindsAndTargets = [
    [PAPAL_ACTION_FAVOUR, "spain"],
    [PAPAL_ACTION_EXCOMMUNICATION, "england"],
    [PAPAL_ACTION_CONDEMNATION, "electoral-saxony"],
    [PAPAL_ACTION_CRUSADE, "ottoman"]
  ];
  for (const [index, [kind, targetFactionId]] of kindsAndTargets.entries()) {
    const papacy = createPapalPolitics({ seedKey: `rescission-${kind}` });
    const diplomacy = createWorldDiplomacy({ seedKey: `rescission-${kind}` });
    const enacted = imposePapalAction(papacy, diplomacy, {
      kind,
      targetFactionId,
      simMinute: 100 + index,
      source: "test"
    }).action;
    assert.deepEqual(activePapalDecrees(papacy).map(({ id }) => id), [enacted.id]);
    const revoked = revokePapalAction(papacy, {
      actionId: enacted.id,
      simMinute: 200 + index,
      source: "test-rescission"
    });
    assert.equal(revoked.kind, PAPAL_ACTION_REVOCATION);
    assert.equal(revoked.revokedActionKind, kind);
    assert.equal(activePapalDecrees(papacy).length, 0);
    assert.ok(papacy.history.some(({ id }) => id === enacted.id));
    assert.ok(papacy.history.some(({ id }) => id === revoked.id));
    if (kind === PAPAL_ACTION_EXCOMMUNICATION) {
      assert.equal(papacy.excommunications[targetFactionId], undefined);
    }
  }
});

test("Papal authority multiplies pious rulers' response to a pronouncement", () => {
  const weakPapacy = createPapalPolitics({ seedKey: "authority-response" });
  const strongPapacy = createPapalPolitics({ seedKey: "authority-response" });
  const weakDiplomacy = createWorldDiplomacy({ seedKey: "authority-response-weak" });
  const strongDiplomacy = createWorldDiplomacy({ seedKey: "authority-response-strong" });
  const weak = imposePapalAction(weakPapacy, weakDiplomacy, {
    kind: PAPAL_ACTION_EXCOMMUNICATION,
    targetFactionId: "france",
    simMinute: 10,
    papalAuthorityMultiplier: 0.01
  });
  const strong = imposePapalAction(strongPapacy, strongDiplomacy, {
    kind: PAPAL_ACTION_EXCOMMUNICATION,
    targetFactionId: "france",
    simMinute: 10,
    papalAuthorityMultiplier: 2
  });

  assert.ok(strong.action.respondingFactionIds.length > weak.action.respondingFactionIds.length);
});

test("the 1534 settlement converts English Catholics aboard to Anglicanism once", () => {
  const player = {
    id: "player:anne-wade",
    name: "Anne Wade",
    nationalityId: "england",
    religionId: "roman-catholic",
    homePortCityId: "agra|india",
    homePortTileId: 1,
    homePortName: "Agra",
    homePortCountry: "India",
    expressions: ["neutral"]
  };
  const state = createGameState({
    cargoCapacity: 10,
    playerCharacter: player,
    voyageSeed: "english-reformation"
  });
  const portCities = [{
    tileId: 1,
    portId: "agra",
    cityId: "agra|india",
    city: "Agra",
    country: "India",
    lat: 27.18,
    lon: 78.02,
    factionId: "delhi",
    isFactionCapital: true,
    capitalOfFactionId: "delhi"
  }];
  const result = advanceGamePolitics(state, ENGLISH_REFORMATION_MINUTE, { portCities });
  assert.equal(result.englishReformation, true);
  assert.equal(state.playerCharacter.religionId, "anglican");
  const repeated = advanceGamePolitics(state, ENGLISH_REFORMATION_MINUTE + 1, { portCities });
  assert.equal(repeated.englishReformation, false);
});

function pendingMatterForKind(commissionKind) {
  for (let index = 0; index < 500; index += 1) {
    const seedKey = `papal-${commissionKind}-${index}`;
    const papacy = createPapalPolitics({ seedKey });
    const diplomacy = createWorldDiplomacy({ seedKey });
    advancePapalPolitics(papacy, diplomacy, papacy.nextActionMinute);
    if (papacy.pendingMatter?.commissionKind === commissionKind) return { papacy, diplomacy };
  }
  throw new Error(`Could not generate Papal commission kind: ${commissionKind}`);
}
