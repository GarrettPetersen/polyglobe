import assert from "node:assert/strict";
import test from "node:test";

import {
  DIPLOMACY_FRIENDLY,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID
} from "./factions.js";
import { gameMinuteForDate } from "./rulers.js";
import {
  advanceSovereignAuthority,
  createSovereignAuthority,
  papalAuthorityResponseMultiplier,
  recordEnglishReformationAuthority,
  recordNavalAuthorityOutcome,
  sovereignAuthorityScore,
  validateSovereignAuthority
} from "./sovereignAuthority.js";
import {
  createWorldDiplomacy,
  rawWorldDiplomacyBetween
} from "./worldDiplomacy.js";

test("authority starts with one historically calibrated score per sovereign power", () => {
  const authority = createSovereignAuthority({ seedKey: "initial-authority" });
  const sovereignIds = FACTIONS
    .map(({ id }) => id)
    .filter((id) => id !== NEUTRAL_FACTION_ID && id !== PIRATE_FACTION_ID)
    .sort();

  assert.deepEqual(Object.keys(authority.scores).sort(), sovereignIds);
  assert.equal(sovereignAuthorityScore(authority, "japan"), 22);
  assert.equal(sovereignAuthorityScore(authority, "ottoman"), 88);
  assert.equal(sovereignAuthorityScore(authority, "ming"), 68);
  assert.ok(papalAuthorityResponseMultiplier(authority) < 1);
});

test("weak shogunal authority causes nominal daimyo ties to loosen", () => {
  const authority = createSovereignAuthority({ seedKey: "weak-shogun" });
  const diplomacy = createWorldDiplomacy({ seedKey: "weak-shogun" });
  const before = Object.values(diplomacy.suzerainties.byVassalId)
    .filter(({ suzerainFactionId }) => suzerainFactionId === "japan")
    .map(({ kind }) => kind);
  const result = advanceSovereignAuthority(
    authority,
    diplomacy,
    authority.nextSubjectReviewMinute
  );
  const after = Object.values(diplomacy.suzerainties.byVassalId)
    .filter(({ suzerainFactionId }) => suzerainFactionId === "japan")
    .map(({ kind }) => kind);

  assert.ok(result.authorityEvents.length > 0);
  assert.notDeepEqual(after, before);
});

test("strong authority and friendly relations can consolidate subject ties", () => {
  const authority = createSovereignAuthority({ seedKey: "strong-shogun" });
  const diplomacy = createWorldDiplomacy({ seedKey: "strong-shogun" });
  authority.scores.japan = 100;
  for (const id of ["hosokawa", "ouchi", "shimazu", "so", "shoni", "nagao", "ando"]) {
    authority.scores[id] = 0;
    assert.equal(rawWorldDiplomacyBetween(diplomacy, "japan", id), DIPLOMACY_FRIENDLY);
  }
  advanceSovereignAuthority(authority, diplomacy, authority.nextSubjectReviewMinute);
  assert.ok(Object.values(diplomacy.suzerainties.byVassalId).some(({ suzerainFactionId, kind }) => (
    suzerainFactionId === "japan" && kind === "vassal"
  )));
});

test("the English Reformation weakens Rome and strengthens the English crown once", () => {
  const authority = createSovereignAuthority({ seedKey: "english-reformation" });
  const beforePapal = authority.papal;
  const beforeEnglish = authority.scores.england;
  const minute = gameMinuteForDate(1534, 11, 3);

  assert.equal(recordEnglishReformationAuthority(authority, minute).length, 2);
  assert.equal(authority.papal, beforePapal - 12);
  assert.equal(authority.scores.england, beforeEnglish + 10);
  assert.equal(recordEnglishReformationAuthority(authority, minute + 1).length, 0);
});

test("individual naval outcomes have cumulative but deliberately tiny effects", () => {
  const authority = createSovereignAuthority({ seedKey: "naval-authority" });
  const beforeEngland = authority.scores.england;
  const beforeFrance = authority.scores.france;
  recordNavalAuthorityOutcome(authority, {
    winnerFactionId: "england",
    loserFactionId: "france",
    simMinute: 10,
    sunk: true
  });

  assert.equal(authority.scores.england, beforeEngland + 0.08);
  assert.equal(authority.scores.france, beforeFrance - 0.12);
  validateSovereignAuthority(authority);
});
