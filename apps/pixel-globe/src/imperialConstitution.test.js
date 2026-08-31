import assert from "node:assert/strict";
import test from "node:test";

import {
  adoptDietResolution,
  adjustElectorSupport,
  createImperialConstitution,
  holdImperialElection,
  imperialDefensePartners,
  imperialPoliticsView,
  imperialTargetIsAuthorized,
  recordImperialReligiousCirculation,
  recordImperialReformationOutcome
} from "./imperialConstitution.js";
import {
  IMPERIAL_CIRCLES_1512,
  IMPERIAL_CITY_REFERENCES,
  imperialEstateForCity,
  imperialEstateForFaction,
  isImperialMemberFaction
} from "./imperialEstates.js";
import {
  IMPERIAL_CAPTAIN_AUTHORITY_LIMITS,
  IMPERIAL_MISSION_KINDS
} from "./imperialMissions.js";
import {
  createWorldDiplomacy,
  declareDiplomaticWar
} from "./worldDiplomacy.js";

const DIET_SUPPORTERS = Object.freeze([
  "mainz", "cologne-electorate", "trier", "palatinate", "bohemia", "electoral-saxony"
]);

test("Imperial membership is independent of sovereignty, suzerainty, and city display names", () => {
  const estate = imperialEstateForFaction("augsburg");
  assert.equal(estate.factionId, "augsburg");
  assert.equal(estate.estateType, "free-imperial-city");
  assert.equal(isImperialMemberFaction("habsburg"), true);
  assert.equal(isImperialMemberFaction("burgundian-netherlands"), true);
  assert.equal(isImperialMemberFaction("france"), false);
  assert.equal(
    imperialEstateForCity({ cityId: IMPERIAL_CITY_REFERENCES.AUGSBURG.id }).factionId,
    "augsburg"
  );
  assert.equal(
    imperialEstateForCity({
      cityId: IMPERIAL_CITY_REFERENCES.AUGSBURG.id,
      city: "Renamed Augsburg",
      country: "Renamed Territory"
    }).factionId,
    "augsburg"
  );
  assert.equal(imperialEstateForCity({ cityId: "unknown-city|germany" }), null);
  assert.equal(IMPERIAL_CIRCLES_1512.length, 10);
});

test("the seven electors can replace the incumbent in a later Imperial election", () => {
  const imperial = createImperialConstitution();
  for (const electorId of ["mainz", "cologne-electorate", "trier", "palatinate"]) {
    adjustElectorSupport(imperial, electorId, "france", 100, { simMinute: 10 });
    adjustElectorSupport(imperial, electorId, "habsburg", -100, { simMinute: 10 });
  }
  const election = holdImperialElection(imperial, {
    candidateFactionIds: ["habsburg", "france"],
    simMinute: 20
  });
  assert.equal(election.emperorFactionId, "france");
  assert.equal(election.tally.france, 4);
  assert.equal(imperial.emperorFactionId, "france");
});

test("Diet support and Imperial authority gate bans, war, taxation, and defence", () => {
  const imperial = createImperialConstitution();
  assert.throws(() => adoptDietResolution(imperial, {
    kind: "imperial-ban",
    sponsorFactionId: "habsburg",
    targetFactionId: "france",
    supportingFactionIds: ["mainz"],
    simMinute: 100
  }), /requires support/);
  const ban = adoptDietResolution(imperial, {
    kind: "imperial-ban",
    sponsorFactionId: "habsburg",
    targetFactionId: "france",
    supportingFactionIds: DIET_SUPPORTERS,
    simMinute: 100
  });
  assert.equal(ban.kind, "imperial-ban");
  assert.equal(imperialTargetIsAuthorized(imperial, "france", 100), true);
  assert.equal(imperial.authority, 38);
});

test("the Emperor's personal war does not call the Empire without a Diet defence", () => {
  const ordinary = createWorldDiplomacy({ seedKey: "personal-imperial-war" });
  const ordinaryEvents = declareDiplomaticWar(ordinary, "habsburg", "augsburg", 1);
  assert.equal(ordinaryEvents.some((event) => event.reason === "imperial-defence"), false);

  const imperial = createImperialConstitution();
  adoptDietResolution(imperial, {
    kind: "imperial-defence",
    sponsorFactionId: "habsburg",
    targetFactionId: "augsburg",
    supportingFactionIds: DIET_SUPPORTERS,
    simMinute: 2
  });
  assert.deepEqual(
    imperialDefensePartners(imperial, "augsburg", "morocco", 2),
    ["burgundian-netherlands"]
  );
  const authorized = createWorldDiplomacy({ seedKey: "authorized-imperial-defence" });
  const authorizedEvents = declareDiplomaticWar(authorized, "morocco", "augsburg", 2, {
    imperialConstitution: imperial
  });
  assert.ok(authorizedEvents.some((event) => (
    event.reason === "imperial-defence" && event.factionAId === "burgundian-netherlands"
  )));
});

test("Reformation outcomes change city faith, elector support, blocs, and Imperial authority", () => {
  const imperial = createImperialConstitution();
  const supportBefore = imperial.electors["electoral-saxony"]
    .supportByCandidateId["burgundian-netherlands"];
  const event = recordImperialReformationOutcome(imperial, {
    cityId: IMPERIAL_CITY_REFERENCES.WITTENBERG.id,
    religionId: "lutheran",
    simMinute: 50,
    source: "testament-delivery"
  });
  assert.equal(event.factionId, "electoral-saxony");
  assert.equal(imperial.cityReligions[IMPERIAL_CITY_REFERENCES.WITTENBERG.id], "lutheran");
  assert.equal(imperial.religiousBlocByFactionId["electoral-saxony"], "lutheran");
  assert.equal(imperial.authority, 43);
  assert.ok(
    imperial.electors["electoral-saxony"].supportByCandidateId["burgundian-netherlands"] <
      supportBefore
  );
  assert.equal(imperialPoliticsView(imperial).religiousBalance.lutheran, 1);
});

test("a captain carrying reform texts creates local dispute but cannot convert an Imperial city", () => {
  const imperial = createImperialConstitution();
  const supportBefore = imperial.electors.mainz.supportByCandidateId["burgundian-netherlands"];
  const event = recordImperialReligiousCirculation(imperial, {
    cityId: IMPERIAL_CITY_REFERENCES.MAINZ.id,
    simMinute: 40,
    source: "september-testament-circuit"
  });

  assert.equal(event.religionId, "mixed");
  assert.equal(imperial.cityReligions[IMPERIAL_CITY_REFERENCES.MAINZ.id], "mixed");
  assert.equal(imperial.religiousBlocByFactionId.mainz, "mixed");
  assert.equal(imperial.authority, 45);
  assert.equal(
    imperial.electors.mainz.supportByCandidateId["burgundian-netherlands"],
    supportBefore - 6
  );
  assert.equal(recordImperialReligiousCirculation(imperial, {
    cityId: IMPERIAL_CITY_REFERENCES.MAINZ.id,
    simMinute: 41
  }), null);
});

test("Imperial captain missions cover Diets, decrees, elections, contributions, disputes, defence, and bans", () => {
  assert.deepEqual(
    IMPERIAL_MISSION_KINDS.map((item) => item.kind),
    [
      "diet-convocation", "decree-delivery", "election-instructions", "mediation",
      "troop-delivery", "tax-delivery", "imperial-defence", "religious-dispute",
      "ban-enforcement"
    ]
  );
  for (const mission of IMPERIAL_MISSION_KINDS) {
    assert.equal(mission.captainAuthority, IMPERIAL_CAPTAIN_AUTHORITY_LIMITS);
    assert.deepEqual(mission.captainAuthority, {
      mayDeterminePolicy: false,
      mayCastEstateVote: false,
      mayIssueImperialAct: false,
      mayNegotiateForPrincipal: false
    });
    assert.doesNotMatch(mission.decisionAuthority, /captain|player/i);
    assert.doesNotMatch(mission.title, /in later years|will become|modern|nation-state/i);
  }
  assert.deepEqual(
    IMPERIAL_MISSION_KINDS
      .filter((mission) => mission.carriesEmissaries)
      .map((mission) => mission.kind),
    ["mediation", "religious-dispute"]
  );
});
