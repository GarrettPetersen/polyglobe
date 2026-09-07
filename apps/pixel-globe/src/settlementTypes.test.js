import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { loadCityCatalogFromCsv, cityArtKeyForCity } from "./cityCatalogData.js";
import { settlementTypeForCity } from "./settlementTypes.js";
import { portCityStaffTitle, portCityStaffGreetingStyle } from "./portCityStaffPresentation.js";
import { PORT_CITY_STAFF_ROLE } from "./characterPortraits.js";
import { PORT_CITY_STAFF_GREETING_STYLE } from "./portGreetingStyle.js";
import { portCityAuthorityLabel } from "./portCityNavigation.js";
import { portArrivalPresentation } from "./portArrivalFlavor.js";
import { deriveCityArchitectureProfile, deriveCityServiceProfile } from "../city-visualizer/cityArchitecture.js";

const csv = readFileSync(new URL("../../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", import.meta.url), "utf8");
const cities = loadCityCatalogFromCsv(csv);

test("Topsham is a small English port town with regional buildings and ordinary maritime offices", () => {
  const city = cities.find(c => c.cityId === "topsham|united kingdom");
  assert.equal(settlementTypeForCity(city), "town");
  assert.equal(city.population, 1500);
  assert.equal(cityArtKeyForCity(city), cityArtKeyForCity({ ...city, settlementType: "city" }));
  assert.equal(deriveCityArchitectureProfile(city).housingStyle, "northern-european");
  assert.equal(deriveCityServiceProfile(city).smith, true);
  assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.HARBOUR_MASTER), "harbour master");
  assert.equal(portCityStaffGreetingStyle(city), PORT_CITY_STAFF_GREETING_STYLE.PORT_OFFICIAL);
  assert.equal(portCityAuthorityLabel(city.settlementType), "Port authority");
  const options = { city, playerShipSlug: "galleon", playerShipLabel: "galleon" };
  assert.deepEqual(portArrivalPresentation(options),
    portArrivalPresentation({ ...options, city: { ...city, settlementType: "city" } }));
});

test("town institutions do not depend on a European art style or population threshold", () => {
  for (const cityType of ["northern-european", "east-asian", "sub-saharan", "south-asian", "polynesian"]) {
    const town = { settlementType: "town", cityType, population: 1000 };
    assert.equal(portCityStaffTitle(town, PORT_CITY_STAFF_ROLE.HARBOUR_MASTER), "harbour master");
    assert.equal(deriveCityArchitectureProfile(town).housingStyle, cityType);
    const village = { ...town, settlementType: "village" };
    assert.equal(portCityStaffTitle(village, PORT_CITY_STAFF_ROLE.HARBOUR_MASTER), cityType === "polynesian" ? "island chief" : "village headman");
    assert.equal(deriveCityArchitectureProfile(village).housingStyle, "earthen-village");
  }
  assert.throws(() => settlementTypeForCity({ settlementType: "typo" }), /Unknown settlement type/);
});
