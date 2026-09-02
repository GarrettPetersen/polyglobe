import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CITY_DATA_YEAR, loadCityCatalogFromCsv } from "./cityCatalogData.js";
import { drinkForCity, portInnDialogue } from "./portInnDialogue.js";

const repoRoot = new URL("../../../", import.meta.url);

test("a local captain remembers the region's drink fondly", () => {
  const city = { cityId: "venice|italy", cityType: "mediterranean", country: "Italy", factionId: "venice" };
  const view = portInnDialogue({ city, homeCity: city, speakerName: "Isabella", variantSeed: 1 });
  assert.equal(view.familiar, true);
  assert.match(view.text, /local wine/i);
});

test("a foreign captain compares the local drink with home", () => {
  const view = portInnDialogue({
    city: { cityId: "goa|india", cityType: "south-asian", country: "India", factionId: "portugal" },
    homeCity: { cityId: "london|united kingdom", cityType: "northern-european", country: "England", factionId: "england" },
    speakerName: "Joan",
    variantSeed: 0
  });
  assert.equal(view.familiar, false);
  assert.match(view.text, /palm toddy/i);
  assert.match(view.text, /ale/i);
});

test("Polynesian ports describe kava without calling it alcohol", () => {
  const view = portInnDialogue({
    city: { cityId: "apia|samoa", cityType: "polynesian", country: "Samoa", factionId: "neutral" },
    homeCity: { cityId: "lisbon|portugal", cityType: "mediterranean", country: "Portugal", factionId: "portugal" },
    speakerName: "Diogo"
  });
  assert.match(view.text, /kava/i);
  assert.match(view.text, /no ale|no wine|carries no/i);
});

test("port drinks follow canonical local culture rather than the country display label", () => {
  const japaneseCity = {
    cityId: "kyoto|japan",
    cityType: "east-asian",
    country: "Renamed country label",
    factionId: "japan"
  };
  const view = portInnDialogue({
    city: japaneseCity,
    homeCity: japaneseCity,
    speakerName: "Akiko"
  });
  assert.equal(view.drinkLabel, "sake");
  assert.equal(view.familiar, true);
});

test("every canonical city has a drink profile", async () => {
  const cityCsv = await readFile(new URL(
    "examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv",
    repoRoot
  ), "utf8");
  const cities = loadCityCatalogFromCsv(cityCsv, CITY_DATA_YEAR);
  for (const city of cities) {
    assert.doesNotThrow(() => drinkForCity(city), city.cityId);
  }
});

test("Central Asian cities using East Asian art retain the regional drink fallback", () => {
  assert.equal(drinkForCity({
    cityId: "kashi|china",
    cityType: "east-asian",
    factionId: "ming"
  }).label, "rice wine");
});
