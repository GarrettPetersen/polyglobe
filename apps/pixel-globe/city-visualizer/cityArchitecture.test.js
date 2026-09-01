import assert from "node:assert/strict";
import test from "node:test";

import {
  EARTHEN_VILLAGE_BUILDING_STYLE,
  JAPANESE_BUILDING_STYLE,
  cityArchitectureProfile,
  cityArchitectureStyleForLayer,
  cityServiceProfile,
  deriveCityArchitectureProfile,
  deriveCityServiceProfile
} from "./cityArchitecture.js";

test("every catalog village uses the sparse earthen settlement form instead of regional fallbacks", () => {
  for (const cityType of [
    "andean",
    "east-asian",
    "islamic-desert",
    "mediterranean",
    "mesoamerican",
    "northern-european",
    "polynesian",
    "south-asian",
    "southeast-asian",
    "sub-saharan"
  ]) {
    const city = cityRecord({ cityType, settlementType: "village", population: 1800 });
    const architecture = deriveCityArchitectureProfile(city);
    assert.equal(architecture.housingStyle, EARTHEN_VILLAGE_BUILDING_STYLE);
    assert.equal(architecture.settlementForm, "sparse-village");
    assert.deepEqual(deriveCityServiceProfile(city), {
      inn: false,
      smith: false,
      market: true,
      shipyard: false
    });
  }
});

test("larger earthen villages can show a boatbuilding beach without gaining urban services", () => {
  const city = cityRecord({ cityType: "polynesian", settlementType: "village", population: 3000 });
  assert.deepEqual(deriveCityServiceProfile(city), {
    inn: false,
    smith: false,
    market: true,
    shipyard: true
  });
});

test("city type alone does not collapse major indigenous cities into the sparse village form", () => {
  const city = cityRecord({ cityType: "mesoamerican", settlementType: "city", population: 100000 });
  const architecture = deriveCityArchitectureProfile(city);
  assert.equal(architecture.housingStyle, "mesoamerican");
  assert.equal(architecture.settlementForm, "urban");
  assert.deepEqual(deriveCityServiceProfile(city), {
    inn: true,
    smith: true,
    market: true,
    shipyard: true
  });
});

test("Japanese ports use their distinct building kit while Ming and Joseon share east Asian art", () => {
  const japanese = deriveCityArchitectureProfile(cityRecord({
    cityType: "east-asian",
    country: "Japan"
  }));
  assert.deepEqual(japanese, {
    housingStyle: JAPANESE_BUILDING_STYLE,
    serviceStyle: JAPANESE_BUILDING_STYLE,
    fortificationStyle: JAPANESE_BUILDING_STYLE,
    settlementForm: "urban"
  });

  for (const country of ["China", "Republic of Korea", "Dem. People's Republic of Korea"]) {
    const shared = deriveCityArchitectureProfile(cityRecord({ cityType: "east-asian", country }));
    assert.equal(shared.housingStyle, "east-asian");
    assert.equal(shared.serviceStyle, "east-asian");
  }
});

test("Swahili ports separate earthen housing from Islamic service and fortification art", () => {
  const city = cityRecord({
    cityType: "sub-saharan",
    settlementType: "city",
    population: 30000,
    manualRegion: "swahili-coast"
  });
  const architecture = deriveCityArchitectureProfile(city);
  assert.deepEqual(architecture, {
    housingStyle: EARTHEN_VILLAGE_BUILDING_STYLE,
    serviceStyle: "islamic-desert",
    fortificationStyle: "islamic-desert",
    settlementForm: "urban"
  });
  const catalogCity = { ...city, architecture };
  assert.equal(cityArchitectureStyleForLayer(catalogCity, "Home"), EARTHEN_VILLAGE_BUILDING_STYLE);
  assert.equal(cityArchitectureStyleForLayer(catalogCity, "Inn"), "islamic-desert");
  assert.equal(cityArchitectureStyleForLayer(catalogCity, "Gate"), "islamic-desert");
});

test("catalog architecture and service profiles are validated at the scene boundary", () => {
  const city = cityRecord({ cityType: "polynesian", settlementType: "village", population: 1000 });
  assert.throws(() => cityArchitectureProfile({ ...city, architecture: {} }), /housing architecture/);
  assert.throws(() => cityServiceProfile({ ...city, services: { market: true } }), /inn service/);
});

function cityRecord(overrides) {
  return Object.freeze({
    cityType: "northern-european",
    country: "United Kingdom",
    settlementType: "city",
    population: 10000,
    ...overrides
  });
}
