import { colonistSexes, createColonistTravelerPeople } from "../src/expeditionTravelers.js";
import { CITY_PERSON_ARCHETYPES } from "./cityPeopleCatalog.js";
import { cityCivilianAppearanceIds } from "./cityPeople.js";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CITY_COLONIST_COUNT, CITY_COLONIST_LANDING_DURATION_MS,
  createCityColonistRoster, cityColonistLandingFrame, cityColonistScreenPoint
} from "./cityColonistLanding.js";

const catalog = JSON.parse(await readFile(new URL("./data/cities.json", import.meta.url)));
const people = JSON.parse(await readFile(new URL("./assets/minifolks/manifest.json", import.meta.url)));
const appearanceById = new Map(people.appearances.map((entry) => [entry.id, entry]));

function embarkedParty(city, sex = "male") {
  const expeditionId = "colonization:test-target";
  const sexes = colonistSexes(CITY_COLONIST_COUNT - 1, expeditionId);
  return {
    settlers: createColonistTravelerPeople({
      count: CITY_COLONIST_COUNT - 1, expeditionId, originCityId: city.id,
      appearanceIds: cityCivilianAppearanceIds(city, sexes, expeditionId),
      identityForPerson: ({ id, sex }) => ({ givenName: id, sex })
    }),
    leader: { id: "test-colony-leader", sex }
  };
}

test("all city cultures have deterministic civilian landing rosters with real jump, walk and idle frames", () => {
  for (const city of catalog.cities) {
    const roster = createCityColonistRoster(city, embarkedParty(city));
    assert.deepEqual(roster, createCityColonistRoster(city, embarkedParty(city)));
    assert.equal(new Set(roster.map(({ id }) => id)).size, CITY_COLONIST_COUNT);
    for (const { appearanceId } of roster) {
      const appearance = appearanceById.get(appearanceId);
      for (const animation of ["jump", "walk", "idle"]) {
        assert.ok(appearance.animations[animation].length > 0, `${city.id}:${appearanceId}:${animation}`);
      }
    }
  }
});

test("colonists jump and splash, wade as a group, then all reach land before dialogue completion", () => {
  const roster = createCityColonistRoster(catalog.cities[0], embarkedParty(catalog.cities[0]));
  const phases = new Set();
  const splashed = new Set();
  let maximumWaders = 0;
  for (let elapsedMs = 0; elapsedMs <= CITY_COLONIST_LANDING_DURATION_MS + 100; elapsedMs += 10) {
    const frame = cityColonistLandingFrame(roster, elapsedMs);
    maximumWaders = Math.max(maximumWaders, frame.units.filter(({ inWater }) => inWater).length);
    for (const unit of frame.units) {
      phases.add(unit.phase);
      if (unit.splashAgeMs !== null) splashed.add(unit.id);
      assert.equal(unit.inWater, unit.phase === "wade");
      assert.ok(unit.animationStartedAtMs <= elapsedMs);
      if (frame.complete) assert.equal(unit.phase, "ashore");
    }
  }
  assert.deepEqual(phases, new Set(["jump", "aboard", "wade", "walk", "ashore"]));
  assert.equal(splashed.size, CITY_COLONIST_COUNT);
  assert.ok(maximumWaders >= 6, "the expedition wades together instead of one person at a time");
  assert.equal(cityColonistLandingFrame(roster, CITY_COLONIST_LANDING_DURATION_MS - 1).complete, false);
  assert.equal(cityColonistLandingFrame(roster, CITY_COLONIST_LANDING_DURATION_MS).complete, true);
  assert.equal(cityColonistLandingFrame(roster, 60_000).complete, true, "delayed frames finish safely");
  assert.throws(() => cityColonistLandingFrame(roster, NaN), /time/);
  assert.throws(() => cityColonistLandingFrame(roster, -1), /time/);
  assert.throws(() => cityColonistLandingFrame(roster.map((actor) => ({ ...actor, departureMs: NaN })), 0),
    /landing actor/);
});

test("landing motion is continuous through jump, wade and shore transitions", () => {
  const roster = createCityColonistRoster(catalog.cities[0], embarkedParty(catalog.cities[0]));
  const geometry = { deck: { x: 100, y: 120 }, water: { x: 145, y: 150 },
    beach: { x: 181, y: 150 }, assembly: { x: 245, y: 150 } };
  const previous = new Map();
  for (let elapsedMs = 0; elapsedMs <= CITY_COLONIST_LANDING_DURATION_MS; elapsedMs += 10) {
    for (const unit of cityColonistLandingFrame(roster, elapsedMs).units) {
      const point = cityColonistScreenPoint(unit, geometry);
      const prior = previous.get(unit.id);
      if (prior) assert.ok(Math.hypot(point.x - prior.x, point.y - prior.y) <= 3, unit.id);
      previous.set(unit.id, point);
    }
  }
  for (const point of previous.values()) assert.deepEqual(point, geometry.assembly);
});

test("the entire embarked colony party reaches shore, including its organizer", async () => {
  const { COLONIZATION_SETTLER_COUNT } = await import("../src/colonizationParty.js");
  const roster = createCityColonistRoster(catalog.cities[0], embarkedParty(catalog.cities[0]));
  assert.equal(roster.length, COLONIZATION_SETTLER_COUNT);
  assert.equal(roster.length, 12);
  const frame = cityColonistLandingFrame(roster, CITY_COLONIST_LANDING_DURATION_MS);
  assert.equal(frame.units.filter(unit => unit.phase === "ashore").length, COLONIZATION_SETTLER_COUNT);
});


test("landing preserves aboard settler identities and sprites, with a regional sprite for either leader sex", () => {
  const archetypes = new Map(CITY_PERSON_ARCHETYPES.map(entry => [entry.id, entry]));
  for (const city of catalog.cities) {
    for (const sex of ["male", "female"]) {
      const party = embarkedParty(city, sex);
      const roster = createCityColonistRoster(city, party);
      assert.deepEqual(roster.slice(0, -1).map(({ id, appearanceId }) => ({ id, appearanceId })),
        party.settlers.map(({ id, appearanceId }) => ({ id, appearanceId })));
      const leader = roster.at(-1);
      assert.equal(leader.id, party.leader.id);
      assert.equal(leader.appearanceId, cityCivilianAppearanceIds(city, [sex], party.leader.id)[0]);
      assert.equal(archetypes.get(appearanceById.get(leader.appearanceId).archetypeId).sex, sex);
    }
  }
});

test("landing rejects missing settlers, duplicate identities, and an invalid leader", () => {
  const city = catalog.cities[0];
  const party = embarkedParty(city);
  assert.throws(() => createCityColonistRoster(city, { ...party, settlers: [] }), /embarked settlers/);
  assert.throws(() => createCityColonistRoster(city, { ...party, leader: null }), /named leader/);
  assert.throws(() => createCityColonistRoster(city, { ...party, leader: { ...party.leader, sex: "unknown" } }), /named leader/);
  assert.throws(() => createCityColonistRoster(city, { ...party,
    leader: { ...party.leader, id: party.settlers[0].id } }), /duplicate/);
  assert.throws(() => createCityColonistRoster(city, { ...party,
    settlers: party.settlers.map(person => ({ ...person, appearanceId: "" })) }), /Invalid/);
});
