import assert from "node:assert/strict";
import test from "node:test";

import {
  IMPERIAL_ELECTION_CONVENED_MINUTE,
  IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE,
  advanceImperialConstitution,
  adjustElectorSupport,
  createImperialConstitution,
  holdImperialElection
} from "./imperialConstitution.js";
import { IMPERIAL_CITY_REFERENCES } from "./imperialEstates.js";
import { diplomacyBetween } from "./factions.js";
import {
  acceptQuest,
  completeQuest,
  createGameState,
  factionReputation,
  negotiateEnvoyQuest
} from "./gameState.js";
import { travelMissionOffersForCity } from "./passengerMissions.js";
import { createPoliticsView } from "./politics.js";
import { gameMinuteForDate } from "./rulers.js";

const PRAGUE = port(1, IMPERIAL_CITY_REFERENCES.PRAGUE, "bohemia", 50.08, 14.44, true);
const COLOGNE = port(2, IMPERIAL_CITY_REFERENCES.COLOGNE, "cologne", 50.94, 6.96, false);

test("the 1530 canvass produces a live 1531 runoff and elects Ferdinand as King of the Romans", () => {
  const imperial = createImperialConstitution();
  const convened = advanceImperialConstitution(imperial, IMPERIAL_ELECTION_CONVENED_MINUTE);
  assert.equal(convened[0].kind, "election-convened");
  assert.equal(imperial.pendingElection.electionMinute, IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE);

  const events = advanceImperialConstitution(imperial, IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE);
  const election = events.find((event) => event.kind === "election");
  assert.deepEqual(election.runoffCandidateFactionIds.length, 2);
  assert.equal(election.winnerFactionId, "bohemia");
  assert.equal(election.winnerRulerName, "Ferdinand I");
  assert.equal(election.office, "king-of-romans");
  assert.equal(imperial.emperorFactionId, "burgundian-netherlands");
  assert.equal(imperial.emperorRulerName, "Charles V");
  assert.equal(imperial.kingOfRomans.rulerName, "Ferdinand I");
});

test("elector support, ruler authority, diplomacy, and confession all enter the runoff score", () => {
  const imperial = createImperialConstitution();
  for (const electorId of Object.keys(imperial.electors)) {
    adjustElectorSupport(imperial, electorId, "france", 100, { simMinute: 1 });
    adjustElectorSupport(imperial, electorId, "bohemia", -100, { simMinute: 1 });
  }
  const election = holdImperialElection(imperial, {
    candidateFactionIds: ["bohemia", "france", "electoral-saxony"],
    simMinute: IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE,
    office: "king-of-romans",
    authorityForCandidate: (factionId) => factionId === "france" ? 100 : 20,
    relationBetween: (_electorId, candidateId) => candidateId === "france" ? "ally" : "hostile"
  });
  assert.equal(election.winnerFactionId, "france");
  assert.ok(election.runoffCandidateFactionIds.includes("france"));
  const score = election.scores.mainz.france;
  assert.equal(score.authority, 100);
  assert.equal(score.relation, "ally");
  assert.equal(typeof score.confessionalScore, "number");
  assert.ok(score.total > election.scores.mainz.bohemia.total);
});

test("the elected King of the Romans succeeds Charles, then a later Emperor's death opens an election", () => {
  const imperial = createImperialConstitution();
  advanceImperialConstitution(imperial, IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE);
  const succession = advanceImperialConstitution(imperial, gameMinuteForDate(1556, 8, 27));
  assert.equal(succession[0].kind, "king-of-romans-succeeds");
  assert.equal(imperial.emperorFactionId, "bohemia");
  assert.equal(imperial.emperorRulerName, "Ferdinand I");

  const vacancyMinute = gameMinuteForDate(1564, 7, 25);
  const vacancy = advanceImperialConstitution(imperial, vacancyMinute);
  assert.equal(vacancy[0].kind, "imperial-vacancy");
  assert.equal(imperial.emperorOfficeVacant, true);
  assert.equal(imperial.pendingElection.office, "emperor");
  assert.ok(imperial.pendingElection.electionMinute > vacancyMinute);

  advanceImperialConstitution(imperial, imperial.pendingElection.electionMinute);
  assert.equal(imperial.emperorOfficeVacant, false);
  assert.equal(imperial.emperorRulerName, "Maximilian II");
});

test("an election creates an elector's transport commission without granting the captain a vote", () => {
  const state = createGameState({ cargoCapacity: 20 });
  advanceImperialConstitution(state.relations.imperial, IMPERIAL_ELECTION_CONVENED_MINUTE);
  const offers = travelMissionOffersForCity(state, PRAGUE, [PRAGUE, COLOGNE], {
    simMinute: IMPERIAL_ELECTION_CONVENED_MINUTE,
    spawnChance: 0,
    envoySpawnChance: 0,
    relationBetween: diplomacyBetween,
    createCharacter: () => ({ id: "envoy:jiri-of-sternberg", name: "Jiri of Sternberg" })
  });
  const offer = offers.find((quest) => quest.kind === "imperial-election-envoy");
  assert.ok(offer);
  assert.equal(offer.targetTileId, COLOGNE.tileId);
  assert.equal(offer.passengerRoleLabel, "electoral envoy");
  assert.match(offer.dialogue.offer, /my prince alone chooses; your duty is only our passage/i);
  assert.match(offer.dialogue.negotiationOpening, /has no voice in this council/i);
  for (const line of Object.values(offer.dialogue)) {
    assert.doesNotMatch(line, /in later years|will become|modern|historically|player/i);
  }

  const emperorStanding = factionReputation(state, "burgundian-netherlands");
  const electorStanding = factionReputation(state, "bohemia");
  acceptQuest(state, offer);
  const negotiation = negotiateEnvoyQuest(state, COLOGNE, {
    simMinute: IMPERIAL_ELECTION_CONVENED_MINUTE + 60,
    portCities: [PRAGUE, COLOGNE]
  });
  assert.deepEqual(negotiation.events, []);
  assert.equal(state.relations.imperial.kingOfRomans, null);
  completeQuest(state, PRAGUE, { simMinute: IMPERIAL_ELECTION_CONVENED_MINUTE + 120 });
  assert.equal(factionReputation(state, "bohemia"), electorStanding + 8);
  assert.equal(factionReputation(state, "burgundian-netherlands"), emperorStanding + 5);
  assert.equal(state.relations.imperial.kingOfRomans, null);
});

test("politics exposes the successor, pending election, and the captain's standing with the Emperor", () => {
  const state = createGameState({ cargoCapacity: 20 });
  advanceImperialConstitution(state.relations.imperial, IMPERIAL_ELECTION_CONVENED_MINUTE);
  let view = createPoliticsView(state, IMPERIAL_ELECTION_CONVENED_MINUTE);
  assert.equal(view.imperial.pendingElection.office, "king-of-romans");
  assert.equal(
    view.imperial.imperialFavor,
    factionReputation(state, "burgundian-netherlands")
  );

  advanceImperialConstitution(state.relations.imperial, IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE);
  view = createPoliticsView(state, IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE);
  assert.equal(view.imperial.kingOfRomansRuler.name, "Ferdinand I");
  assert.equal(view.imperial.emperorRuler.name, "Charles V");
});

function port(tileId, reference, factionId, lat, lon, isFactionCapital) {
  return {
    tileId,
    cityId: reference.id,
    city: reference.city,
    displayCity: reference.city,
    country: reference.country,
    factionId,
    capitalOfFactionId: isFactionCapital ? factionId : null,
    isFactionCapital,
    population: 60000,
    lat,
    lon
  };
}
