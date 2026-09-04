import assert from "node:assert/strict";
import test from "node:test";

import {
  colonistSexes,
  createColonistTravelerPeople,
  createConquistadorTravelerPeople
} from "./expeditionTravelers.js";

function identityForPerson({ id, sex }) {
  return {
    givenName: `${sex}-${id.split(":").at(-1)}`,
    name: `${sex}-${id}`,
    nameCulture: "test",
    religionId: "catholicism"
  };
}

test("colonist manifests are stable and balance men and women", () => {
  const sexes = colonistSexes(11, "colony:one");
  assert.deepEqual(sexes, colonistSexes(11, "colony:one"));
  assert.ok(Math.abs(
    sexes.filter((sex) => sex === "female").length -
    sexes.filter((sex) => sex === "male").length
  ) <= 1);

  const people = createColonistTravelerPeople({
    count: sexes.length,
    expeditionId: "colony:one",
    originCityId: "seville|spain",
    appearanceIds: sexes.map((sex) => `${sex}-villager`),
    identityForPerson
  });
  assert.equal(new Set(people.map(({ id }) => id)).size, people.length);
  assert.ok(people.every(({ kind, name, appearanceId, crewTypeId }) => (
    kind === "settler" && name && appearanceId && crewTypeId === undefined
  )));
});

test("conquistadors lead with a small mounted contingent and remain auxiliary soldiers", () => {
  const people = createConquistadorTravelerPeople({
    count: 24,
    expeditionId: "conquistador:chan-chan",
    originCityId: "panama|spain",
    identityForPerson
  });
  assert.equal(people.length, 24);
  assert.equal(people.filter(({ appearanceId }) => appearanceId === "cavalier-covered").length, 4);
  assert.ok(people.slice(0, 4).every(({ appearanceId }) => appearanceId === "cavalier-covered"));
  assert.ok(people.some(({ appearanceId }) => appearanceId === "gunner-light"));
  assert.ok(people.some(({ appearanceId }) => appearanceId === "spearman-light"));
  assert.ok(people.every(({ kind, auxiliary, experienceStars }) => (
    kind === "soldier" && auxiliary === true && experienceStars === 2
  )));
});
