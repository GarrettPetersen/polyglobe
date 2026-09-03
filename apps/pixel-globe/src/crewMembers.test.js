import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceCrewSailingExperience,
  createCrewRecruitmentMemory,
  createCrewRecruitmentOffer,
  createCrewRoster,
  createMigratedCrewRoster,
  crewExperienceSummary,
  crewMemberExperienceStars,
  dismissCrewMember,
  hireCrewCandidate,
  migrateCrewRosterOriginTraits,
  removeCrewCasualties,
  removeCrewMembersById,
  restoreDismissedCrew,
  validateCrewAggregate,
  validateCrewRecruitmentMemory,
  validateCrewRoster
} from "./crewMembers.js";

const PORT = Object.freeze({
  cityId: "edo|japan",
  tileId: 11,
  city: "Edo",
  country: "Japan",
  cityType: "east-asian",
  factionId: "japan",
  population: 120_000,
  isFactionCapital: true
});
const APPEARANCES = Object.freeze([
  Object.freeze({ appearanceId: "samurai-sword", crewTypeId: "ronin" }),
  Object.freeze({ appearanceId: "ashigaru-bow", crewTypeId: "archer" })
]);

function crewIdentityFactory(nameForKey = (identityKey) => identityKey) {
  return (identityKey) => ({
    name: nameForKey(identityKey),
    nameCulture: "japanese",
    religionId: "kami-buddhist",
    nationalityId: "japan"
  });
}

test("legacy crew migration creates stable individual identities and a mixed experienced roster", () => {
  const options = {
    count: 24,
    voyageSeed: "crew-migration-test",
    homePort: PORT,
    currentMinute: 200 * 24 * 60,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory((identity) => `Name-${identity.split("|").at(-1)}`)
  };
  const first = createMigratedCrewRoster(options);
  const second = createMigratedCrewRoster(options);
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map(({ id }) => id)).size, first.length);
  assert.ok(new Set(first.map(crewMemberExperienceStars)).size > 1);
  assert.ok(first.every((member) => member.homePortCityId === PORT.cityId));
  validateCrewRoster(first);
});

test("legacy crew migration normalizes a fractional simulation clock to whole recruitment minutes", () => {
  const roster = createMigratedCrewRoster({
    count: 4,
    voyageSeed: "fractional-clock-crew-migration",
    homePort: PORT,
    currentMinute: 114297.80124,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory()
  });
  assert.ok(roster.every(({ recruitedAtMinute }) => Number.isInteger(recruitedAtMinute)));
  assert.ok(roster.every(({ recruitedAtMinute }) => recruitedAtMinute <= 114297));
  validateCrewRoster(roster);
});

test("versioned crew origin migration preserves history while adding durable regional traits", () => {
  const [current] = createMigratedCrewRoster({
    count: 1,
    voyageSeed: "crew-origin-trait-migration",
    homePort: PORT,
    currentMinute: 90,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory(() => "Generated Replacement")
  });
  const {
    nameCulture: _removedNameCulture,
    religionId: _removedReligionId,
    nationalityId: _removedNationalityId,
    ...legacy
  } = current;
  legacy.name = "Preserved Name";

  const [migrated] = migrateCrewRosterOriginTraits([legacy], () => ({
    homePort: PORT,
    identityForKey: crewIdentityFactory(() => "Generated Replacement")
  }));

  assert.equal(migrated.name, "Preserved Name");
  assert.equal(migrated.nameCulture, "japanese");
  assert.equal(migrated.religionId, "kami-buddhist");
  assert.equal(migrated.nationalityId, "japan");
  assert.equal(migrated.recruitedAtMinute, legacy.recruitedAtMinute);
  assert.equal(migrated.sailingMinutes, legacy.sailingMinutes);
});

test("experience advances only with explicit sailing time and changes effective crew", () => {
  const crewRoster = createMigratedCrewRoster({
    count: 4,
    voyageSeed: "experience-test",
    homePort: PORT,
    currentMinute: 300 * 24 * 60,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory()
  }).map((member) => ({ ...member, sailingMinutes: 0 }));
  const state = crewState(crewRoster);
  const novice = crewExperienceSummary(state);
  assert.equal(novice.effectiveCrew, 1.8);
  const levelUps = advanceCrewSailingExperience(state, 14 * 24 * 60);
  assert.equal(levelUps.length, crewRoster.length);
  assert.ok(crewExperienceSummary(state).effectiveCrew > novice.effectiveCrew);
});

test("recruitment offers are persistent, respect bunks, and record the actual hiring time", () => {
  const state = crewState([]);
  state.ship.crewCapacity = 5;
  state.ship.loadoutTargets = { crew: 5 };
  const memory = createCrewRecruitmentMemory();
  const offer = createCrewRecruitmentOffer({
    memory,
    state,
    city: PORT,
    simMinute: 40,
    targetCrew: 5,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory(),
    baseHireCost: 2
  });
  assert.equal(createCrewRecruitmentOffer({
    memory,
    state,
    city: PORT,
    simMinute: 41,
    targetCrew: 5,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory(),
    baseHireCost: 2
  }), offer);
  const candidate = offer.candidates[0];
  assert.equal(candidate.member.recruitedAtMinute, 0);
  const hired = hireCrewCandidate(state, memory, PORT, candidate.member.id, 53);
  assert.equal(hired.member.recruitedAtMinute, 53);
  assert.equal(state.ship.crew, 2);
  assert.equal(state.crewRoster[0].id, candidate.member.id);
  assert.equal(state.doubloons, 100 - candidate.cost);
  validateCrewRecruitmentMemory(memory);
});

test("an inn can show replacement candidates while every bunk is occupied", () => {
  const roster = createMigratedCrewRoster({
    count: 3,
    voyageSeed: "full-ship-replacements",
    homePort: PORT,
    currentMinute: 100,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory()
  });
  const state = crewState(roster);
  assert.equal(state.ship.crew, state.ship.crewCapacity);
  const offer = createCrewRecruitmentOffer({
    memory: createCrewRecruitmentMemory(),
    state,
    city: PORT,
    simMinute: 100,
    targetCrew: state.ship.crewCapacity,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory(),
    baseHireCost: 2,
    includeReplacementCandidates: true
  });

  assert.ok(offer.candidates.length > 0);
});

test("dismissal undo restores roster order and aggregate count", () => {
  const roster = createMigratedCrewRoster({
    count: 4,
    voyageSeed: "dismissal-test",
    homePort: PORT,
    currentMinute: 200 * 24 * 60,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory()
  });
  const state = crewState([...roster]);
  const dismissed = [dismissCrewMember(state, roster[1].id), dismissCrewMember(state, roster[3].id)];
  restoreDismissedCrew(state, dismissed);
  assert.deepEqual(state.crewRoster.map(({ id }) => id), roster.map(({ id }) => id));
  assert.equal(state.ship.crew, 5);
});

test("dismissal undo restores adjacent sailors dismissed in reverse roster order", () => {
  const roster = createMigratedCrewRoster({
    count: 4,
    voyageSeed: "reverse-dismissal-test",
    homePort: PORT,
    currentMinute: 200 * 24 * 60,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory()
  });
  const state = crewState([...roster]);
  const dismissed = [dismissCrewMember(state, roster[2].id), dismissCrewMember(state, roster[1].id)];
  restoreDismissedCrew(state, dismissed);
  assert.deepEqual(state.crewRoster.map(({ id }) => id), roster.map(({ id }) => id));
});

test("casualty selection weights inexperienced sailors more heavily", () => {
  const roster = createMigratedCrewRoster({
    count: 4,
    voyageSeed: "casualty-test",
    homePort: PORT,
    currentMinute: 200 * 24 * 60,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory()
  }).map((member, index) => ({
    ...member,
    sailingMinutes: index === 0 ? 0 : 120 * 24 * 60
  }));
  const state = crewState(roster);
  const inexperiencedId = roster[0].id;
  const [casualty] = removeCrewCasualties(state, 1, () => 0.1);
  assert.equal(casualty.member.id, inexperiencedId);
  assert.equal(state.ship.crew, 4);
});

test("battle casualties remove the exact simulated people by canonical ID", () => {
  const roster = createMigratedCrewRoster({
    count: 4,
    voyageSeed: "exact-casualty-test",
    homePort: PORT,
    currentMinute: 200 * 24 * 60,
    appearances: APPEARANCES,
    identityForKey: crewIdentityFactory()
  });
  const state = crewState([...roster]);
  const casualties = removeCrewMembersById(state, [roster[3].id, roster[1].id]);
  assert.deepEqual(casualties.map(({ member }) => member.id), [roster[1].id, roster[3].id]);
  assert.deepEqual(state.crewRoster.map(({ id }) => id), [roster[0].id, roster[2].id]);
  assert.equal(state.ship.crew, 3);
  assert.throws(() => removeCrewMembersById(state, [roster[1].id]), /missing crew casualty/);
  assert.throws(() => removeCrewMembersById(state, [roster[0].id, roster[0].id]), /duplicate IDs/);
});

test("aggregate validation rejects orphaned crew and count drift", () => {
  const state = crewState([]);
  state.crewRoster.push({
    id: "crew-orphan",
    name: "Orphan",
    homePortCityId: PORT.cityId,
    homePortTileId: PORT.tileId,
    homePortName: PORT.city,
    appearanceId: "samurai-sword",
    crewTypeId: "ronin",
    recruitedAtMinute: 0,
    sailingMinutes: 0
  });
  assert.throws(() => validateCrewAggregate(state), /does not match/);
  state.ship.crew = 0;
  assert.throws(() => validateCrewAggregate(state), /cannot retain/);
});

function crewState(crewRoster) {
  const state = {
    voyageSeed: "state-seed",
    doubloons: 100,
    namedCrew: [],
    crewRoster,
    ship: {
      crew: crewRoster.length + 1,
      crewCapacity: Math.max(crewRoster.length + 1, 2)
    }
  };
  validateCrewAggregate(state);
  return state;
}
