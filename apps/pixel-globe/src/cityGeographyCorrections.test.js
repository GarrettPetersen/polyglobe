import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cityLabelText, loadCityCatalogFromCsv } from "./cityCatalogData.js";
import { cityRequiresPortAccess } from "./cityCatalogSelection.js";
import { cityMustRemainInland } from "./cityPortAccessPolicy.js";
import { cityTerritoryId } from "./entityIds.js";
import { factionIdForCity1522 } from "./factions.js";
import { pixelFontCompatibleText } from "./pixelText.js";

const cities = loadCityCatalogFromCsv(readFileSync(new URL(
  "../../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv",
  import.meta.url
), "utf8"));

test("the released Dienne identity resolves to Djenne in Mali before geography policies run", () => {
  const city = cities.find(({ cityId }) => cityId === "dienne|senegal");
  assert.equal(cityLabelText(city), "Djenne");
  assert.equal(city.country, "Mali");
  assert.equal(city.lat, 13.90556);
  assert.equal(city.lon, -4.555);
  assert.equal(city.population, 20000, "keep the source population observation");
  assert.equal(city.factionId, "songhai");
  assert.equal(cityMustRemainInland(city), false);
  assert.equal(cityRequiresPortAccess(city), true);
  const renamed = { ...city, city: "Changed label", country: "Changed country label" };
  assert.equal(cityTerritoryId(renamed), "mali");
  assert.equal(factionIdForCity1522(renamed), "songhai");
  assert.equal(cityTerritoryId({ cityId: "rufisque|senegal" }), "senegal");
});

test("Rufisque is a required small coastal village with a distinct canonical identity", () => {
  const city = cities.find(({ cityId }) => cityId === "rufisque|senegal");
  assert.equal(cityLabelText(city), "Rufisque");
  assert.equal(city.country, "Senegal");
  assert.equal(city.settlementType, "village");
  assert.equal(city.population, 1500);
  assert.equal(city.coastalIntent, true);
  assert.equal(cityRequiresPortAccess(city), true);
  assert.equal(city.factionId, "neutral", "a trading visit must not confer Portuguese sovereignty");
  assert.ok(city.lat > 14.6 && city.lat < 14.8 && city.lon > -17.3 && city.lon < -17.1);
});

test("the new settlement labels print unchanged in every game font and case", () => {
  for (const id of ["dienne|senegal", "rufisque|senegal"]) {
    const city = cities.find(({ cityId }) => cityId === id);
    for (const label of [cityLabelText(city), cityLabelText(city).toUpperCase(), city.country]) {
      assert.match(label, /^[A-Za-z ]+$/);
      for (const font of ["Silkscreen", "Dogica", "Pixel Pirate", "zpix", "Galmuri11", "Pirata One"]) {
        assert.equal(pixelFontCompatibleText(label, `8px "${font}"`), label);
      }
    }
  }
});

test("Exeter remains inland and Topsham is its distinct English outport", () => {
  const exeter = cities.find(({ cityId }) => cityId === "exeter|united kingdom");
  const topsham = cities.find(({ cityId }) => cityId === "topsham|united kingdom");
  assert.equal(cityMustRemainInland(exeter), true);
  assert.equal(cityRequiresPortAccess(exeter), false);
  assert.equal(cityMustRemainInland(topsham), false);
  assert.equal(cityRequiresPortAccess(topsham), true);
  assert.equal(topsham.factionId, "england");
  assert.equal(topsham.settlementType, "village");
  assert.equal(topsham.marketGoods.length, 3);
  assert.ok(topsham.lat < exeter.lat && exeter.lat - topsham.lat < 0.1);
});

test("the English river ports use river scenes and Exeter is absent from sailing scenes", () => {
  const sceneCatalog = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url)));
  assert.equal(sceneCatalog.cities.some(({ id }) => id === "exeter|united kingdom"), false);
  for (const id of ["norwich|united kingdom", "topsham|united kingdom"]) {
    const city = sceneCatalog.cities.find((entry) => entry.id === id);
    assert.equal(city.approach, "river");
    assert.equal(city.factionId, "england");
  }
});
