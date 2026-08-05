import assert from "node:assert/strict";
import test from "node:test";

import {
  captureVoyageStartProfile,
  validateVoyageStartProfile
} from "./voyageStartProfile.js";

test("the voyage opening profile remains fixed when the captain later changes ships", () => {
  const state = voyageState();
  const profile = captureVoyageStartProfile(state);

  state.ship.slug = "spanish-nao";
  state.ship.crew = 30;
  state.ship.cannons = 12;
  state.cargoCapacity = 160;
  state.doubloons = 40_000;

  assert.equal(state.voyageStartProfile, profile);
  assert.equal(profile.ship, "fishing-lugger");
  assert.equal(profile.startingCrew, 3);
  assert.equal(profile.startingCannons, 0);
  assert.equal(profile.cargoCapacity, 20);
  assert.equal(profile.startingDoubloons, 360);
});

test("an opening profile can be captured only once", () => {
  const state = voyageState();
  captureVoyageStartProfile(state);
  assert.throws(() => captureVoyageStartProfile(state), /already been captured/);
});

test("legacy voyages may explicitly lack an opening profile", () => {
  assert.equal(validateVoyageStartProfile(null), null);
  assert.throws(
    () => validateVoyageStartProfile({ version: 1, ship: "spanish-nao" }),
    /Invalid voyage start main quest/
  );
});

function voyageState() {
  return {
    voyageStartProfile: null,
    doubloons: 360,
    cargoCapacity: 20,
    playerCharacter: {
      nationalityId: "england",
      homePortName: "London",
      startRegion: "europe",
      religionId: "roman-catholic",
      sex: "female",
      age: 29,
      skillIds: ["master-navigator"]
    },
    ship: {
      slug: "fishing-lugger",
      loadoutId: null,
      loadoutTargets: { foodDays: 20, waterDays: 20 },
      crew: 3,
      cannons: 0
    },
    memory: {
      campaignGoal: { type: "explorer" }
    }
  };
}
