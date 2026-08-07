import assert from "node:assert/strict";
import test from "node:test";

import { economyRegionForCity } from "./economyRegions.js";

test("economy regions follow geography independently of city artwork", () => {
  assert.equal(
    economyRegionForCity({
      city: "Yuquot Village",
      country: "Nuu-chah-nulth",
      cityType: "mesoamerican"
    }),
    "native-north-american"
  );
  assert.equal(
    economyRegionForCity({
      city: "Chillicothe",
      country: "United States of America",
      cityType: "mesoamerican"
    }),
    "native-north-american"
  );
  assert.equal(
    economyRegionForCity({
      city: "Guanahani Village",
      country: "Bahamas",
      cityType: "mesoamerican"
    }),
    "caribbean-indigenous"
  );
  assert.equal(
    economyRegionForCity({
      city: "Havana",
      country: "Cuba",
      cityType: "mediterranean"
    }),
    "caribbean"
  );
  assert.equal(
    economyRegionForCity({
      city: "Coroa Vermelha Village",
      country: "Brazil",
      cityType: "mesoamerican"
    }),
    "brazilian-coast"
  );
  assert.equal(
    economyRegionForCity({
      city: "Chanchan",
      country: "Peru",
      cityType: "andean",
      manualRegion: "inca-coast"
    }),
    "andean-coast"
  );
  assert.equal(
    economyRegionForCity({
      city: "Mexico City",
      country: "Mexico",
      cityType: "mesoamerican"
    }),
    "mesoamerican"
  );
});

test("explicit economy regions are validated", () => {
  assert.equal(
    economyRegionForCity({
      city: "Test Port",
      country: "Test Country",
      cityType: "mediterranean",
      economyRegion: "caribbean"
    }),
    "caribbean"
  );
  assert.throws(
    () => economyRegionForCity({
      city: "Test Port",
      country: "Test Country",
      cityType: "mediterranean",
      economyRegion: "unknown"
    }),
    /Unknown economy region/
  );
});

test("colonial economy regions are valid independent profiles", () => {
  for (const economyRegion of [
    "rio-de-la-plata",
    "temperate-american-colony",
    "tropical-american-colony",
    "atlantic-island-colony"
  ]) {
    assert.equal(
      economyRegionForCity({
        city: "Test Colony",
        country: "Test Country",
        cityType: "mediterranean",
        economyRegion
      }),
      economyRegion
    );
  }
});
