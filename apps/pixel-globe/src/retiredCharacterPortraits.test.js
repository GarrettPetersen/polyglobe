import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  reconcileCharacterPortraitMetadata,
  assignNpcShipCaptains,
  validateCharacterPortraitManifest,
  characterExpression
} from "./characterPortraits.js";
import { RETIRED_CHARACTER_PORTRAITS } from "./retiredCharacterPortraits.js";

const manifest = JSON.parse(readFileSync(new URL(
  "../public/assets/characters/generated/character-portraits.json", import.meta.url), "utf8"));
// Frozen production sources from asset version 22, including every old expression.
const oldSources = JSON.parse(readFileSync(new URL(
  "./test-fixtures/retired-character-portraits-v22.json", import.meta.url), "utf8"));
const sourceById = new Map(manifest.sourceCharacters.map(source => [source.id, source]));

function savedCharacter(source, age) {
  return {
    id: `crew:${source.id}`, name: "Existing Sailor", sex: source.sex,
    sourceId: source.id, sourceLabel: source.label,
    sourceRoles: source.roles, sourceRegions: source.regions,
    minAge: source.minAge, maxAge: source.maxAge, age,
    expressions: source.expressions,
    birthDate: { year: 1522 - age, month: 2, day: 3 },
    birthDateLabel: `3 February ${1522 - age}`,
    nationalityId: "portugal", nameCulture: "portuguese", religionId: "sunni-islam",
    homePortCityId: "sao-tome|sao-tome-and-principe", skills: ["navigation"],
    relationship: { captainOpinion: 70 }, questRole: "rescued-traveler"
  };
}

function personalHistory(character) {
  const { sourceId, sourceLabel, sourceRoles, sourceRegions, minAge, maxAge,
    expressions, requiredReligionFamily, ...history } = character;
  return history;
}

test("every retired source has a same-sex, unrestricted, live replacement", () => {
  assert.deepEqual(oldSources.map(source => source.id).sort(), Object.keys(RETIRED_CHARACTER_PORTRAITS).sort());
  for (const old of oldSources) {
    const retirement = RETIRED_CHARACTER_PORTRAITS[old.id];
    assert.equal(sourceById.has(old.id), false, old.id);
    const replacement = sourceById.get(retirement.replacementSourceId);
    assert.ok(replacement, `Missing retirement target for ${old.id}`);
    assert.equal(replacement.sex, old.sex);
    assert.equal(retirement.sex, old.sex);
    assert.equal(replacement.requiredReligionFamily ?? null, null);
    assert.ok(retirement.reason.length > 0);
    assert.throws(() => validateCharacterPortraitManifest({ sourceCharacters: [old] }), /Retired portrait/);
  }
});

for (const source of oldSources) {
  test(`portrait retirement preserves existing history across repeated loads: ${source.id}`, () => {
    for (const age of [source.minAge, source.maxAge, 72]) {
      const character = savedCharacter(source, age);
      const history = structuredClone(personalHistory(character));
      // Shared and nested references occur in crew, family and quest memories.
      const state = { playerCharacter: character, namedCrew: [character],
        memory: { quests: { castaway: { family: [structuredClone(character)] } } } };
      state.memory.self = state;
      assert.equal(reconcileCharacterPortraitMetadata(state, manifest), 2);
      for (const person of [state.playerCharacter, state.memory.quests.castaway.family[0]]) {
        assert.deepEqual(personalHistory(person), history);
        const replacement = sourceById.get(RETIRED_CHARACTER_PORTRAITS[source.id].replacementSourceId);
        assert.equal(person.sourceId, replacement.id);
        assert.equal(person.sourceLabel, replacement.label);
        assert.equal(characterExpression(person).src, characterExpression(replacement).src);
        for (const expression of person.expressions) {
          assert.ok(replacement.expressions.some(candidate => candidate.src === expression.src));
        }
      }
      delete state.memory.self;
      const loaded = JSON.parse(JSON.stringify(state));
      assert.equal(reconcileCharacterPortraitMetadata(loaded, manifest), 0);
      assert.deepEqual(personalHistory(loaded.playerCharacter), history);
    }
  });
}

test("retirement rejects broken mappings and frozen characters rather than concealing them", () => {
  const source = oldSources[0];
  const replacementId = RETIRED_CHARACTER_PORTRAITS[source.id].replacementSourceId;
  const incomplete = { sourceCharacters: manifest.sourceCharacters.filter(source => source.id !== replacementId) };
  assert.throws(() => reconcileCharacterPortraitMetadata(savedCharacter(source, 30), incomplete), /unknown portrait source/);
  assert.throws(() => reconcileCharacterPortraitMetadata(Object.freeze(savedCharacter(source, 30)), manifest), /frozen character/);
});


test("compact stored captain IDs retain identity when their encoded portrait is retired", () => {
  const ship = { id: "existing-northern-captain", slug: "cog", role: "merchant", profileId: "atlantic-coast",
    currentPort: { cityId: "london|united kingdom", routeRegion: "europe", city: "London",
      country: "United Kingdom", factionId: "england", lat: 51.5, lon: -0.1 } };
  const initial = assignNpcShipCaptains([ship], manifest, new Set()).get(ship.id);
  const sourceId = "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-3";
  const stored = { id: sourceId + initial.id.slice(-9), name: "Saved Captain" };
  const captain = assignNpcShipCaptains([ship], manifest, new Set(), {
    captainIdentitiesByShipId: new Map([[ship.id, stored]])
  }).get(ship.id);
  assert.equal(captain.id, stored.id);
  assert.equal(captain.name, stored.name);
  assert.equal(captain.sourceId, RETIRED_CHARACTER_PORTRAITS[sourceId].replacementSourceId);
});
