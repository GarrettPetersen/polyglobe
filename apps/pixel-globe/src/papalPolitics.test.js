import assert from "node:assert/strict";
import test from "node:test";

import { createWorldDiplomacy, worldDiplomacyBetween } from "./worldDiplomacy.js";
import {
  PAPAL_ACTION_EXCOMMUNICATION,
  PAPAL_MATTER_AVAILABLE,
  PAPAL_MATTER_COMMISSIONED,
  acceptPapalCommission,
  advancePapalCommissionAtPort,
  advancePapalPolitics,
  completePapalCommission,
  createPapalPolitics,
  imposePapalAction,
  migratePapalPolitics,
  papalCommissionEligibility,
  papalCommissionObjective
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
    originTileId: 1,
    itinerary: [{ tileId: 2, portName: "Test Port", factionId: "habsburg", purpose: "test" }],
    rewardDoubloons: 500,
    nuncio: { id: "nuncio-test", name: "Monsignor Test" }
  });
  assert.equal(papacy.pendingMatter.status, PAPAL_MATTER_COMMISSIONED);
  assert.equal(papalCommissionObjective(papacy).destination.tileId, 2);
  advancePapalCommissionAtPort(papacy, {
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
    originTileId: 1,
    itinerary: [{ tileId: 2, portName: "Test Port", factionId: "habsburg", purpose: "test" }],
    rewardDoubloons: 500,
    nuncio: { id: "nuncio-revoked", name: "Monsignor Test" }
  });
  const result = advancePapalPolitics(papacy, diplomacy, papacy.lastUpdateMinute + 1, {
    playerCommissionContext: { ...context, papalReputation: -20 }
  });
  assert.equal(result.actions.length, 0);
  assert.equal(result.commissionRevoked.reason, "insufficient-papal-standing");
  assert.equal(papacy.pendingMatter.status, PAPAL_MATTER_AVAILABLE);
});

test("version 1 Papal memory migrates with no invented pending matter", () => {
  const legacy = createPapalPolitics({ seedKey: "legacy-papacy" });
  legacy.version = 1;
  delete legacy.pendingMatter;
  const migrated = migratePapalPolitics(legacy);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.pendingMatter, null);
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

test("the 1534 settlement converts English Catholics aboard to Anglicanism once", () => {
  const player = {
    name: "Anne Wade",
    nationalityId: "england",
    religionId: "roman-catholic",
    expressions: ["neutral"]
  };
  const state = createGameState({
    cargoCapacity: 10,
    playerCharacter: player,
    voyageSeed: "english-reformation"
  });
  const result = advanceGamePolitics(state, ENGLISH_REFORMATION_MINUTE);
  assert.equal(result.englishReformation, true);
  assert.equal(state.playerCharacter.religionId, "anglican");
  const repeated = advanceGamePolitics(state, ENGLISH_REFORMATION_MINUTE + 1);
  assert.equal(repeated.englishReformation, false);
});
