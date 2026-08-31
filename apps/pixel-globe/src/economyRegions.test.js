import assert from "node:assert/strict";
import test from "node:test";

import { economyRegionForCity } from "./economyRegions.js";

test("economy regions follow geography independently of city artwork", () => {
  assert.equal(
    economyRegionForCity({
      cityId: "yuquot village|nuu-chah-nulth",
      city: "Yuquot Village",
      country: "Nuu-chah-nulth",
      cityType: "mesoamerican"
    }),
    "native-north-american"
  );
  assert.equal(
    economyRegionForCity({
      cityId: "chillicothe|united states of america",
      city: "Chillicothe",
      country: "United States of America",
      cityType: "mesoamerican"
    }),
    "native-north-american"
  );
  assert.equal(
    economyRegionForCity({
      cityId: "guanahani village|bahamas",
      city: "Guanahani Village",
      country: "Bahamas",
      cityType: "mesoamerican"
    }),
    "caribbean-indigenous"
  );
  assert.equal(
    economyRegionForCity({
      cityId: "havana|cuba",
      city: "Havana",
      country: "Cuba",
      cityType: "mediterranean"
    }),
    "caribbean"
  );
  assert.equal(
    economyRegionForCity({
      cityId: "coroa vermelha village|brazil",
      city: "Coroa Vermelha Village",
      country: "Brazil",
      cityType: "mesoamerican"
    }),
    "brazilian-coast"
  );
  assert.equal(
    economyRegionForCity({
      cityId: "chanchan|peru",
      city: "Chanchan",
      country: "Peru",
      cityType: "andean",
      manualRegion: "inca-coast"
    }),
    "andean-coast"
  );
  assert.equal(
    economyRegionForCity({
      cityId: "mexico city|mexico",
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
      cityId: "test port|test country",
      city: "Test Port",
      country: "Test Country",
      cityType: "mediterranean",
      economyRegion: "caribbean"
    }),
    "caribbean"
  );
  assert.throws(
    () => economyRegionForCity({
      cityId: "test port|test country",
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
        cityId: "test colony|test country",
        city: "Test Colony",
        country: "Test Country",
        cityType: "mediterranean",
        economyRegion
      }),
      economyRegion
    );
  }
});
