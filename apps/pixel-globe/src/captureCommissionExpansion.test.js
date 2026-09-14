import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGameState, capturePortMissionOfferForCity, captureCommissionPetitionOptionsForCity } from "./gameState.js";
import { parsePortSailingDistances, portSailingDistanceKm } from "./portSailingDistances.js";

const catalog = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url))).cities;
const distances = parsePortSailingDistances(JSON.parse(readFileSync(new URL("../public/assets/data/port-sailing-distances.json", import.meta.url))));
const sailingDistanceKm = (a, b) => portSailingDistanceKm(distances, a, b);
const reportedExtraPorts = new Set(["malacca|malaysia", "binh dinh|vietnam", "maynila|philippines", "babeldaob village|palau"]);
function scenario(expanded) {
  const ports = catalog.filter(c => !c.cityId.startsWith("pirate-haven-") && (
    c.factionId === "portugal" || c.factionId === "tidore" ||
    (c.country === "Indonesia" && c.factionId !== "ternate") ||
    reportedExtraPorts.has(c.cityId) || c.cityId === "mactan village|philippines"
  )).map(c => ({ ...c, foundingFactionId: c.factionId,
    isFactionCapital: c.capital, capitalOfFactionId: c.capital ? c.factionId : null,
    factionId: expanded && ((c.country === "Indonesia" && c.factionId !== "ternate") || reportedExtraPorts.has(c.cityId)) ? "tidore" : c.factionId
  }));
  const origin = ports.find(c => c.cityId === "tidore|indonesia");
  const state = createGameState({ cargoCapacity: 100, playerCharacter: {
    id: "tidore-expansion-test", name: "Test Captain", nationalityId: "tidore",
    homePortCityId: origin.cityId, homePortTileId: origin.tileId, homePortName: origin.city, expressions: ["neutral"]
  } });
  state.relations.lettersOfMarque.tidore = { factionId: "tidore", simMinute: 0 };
  state.relations.diplomacy.overrides["portugal|tidore"] = "war";
  state.relations.diplomacy.pairLastChangedMinute["portugal|tidore"] = 0;
  return { state, ports, origin };
}

for (const expanded of [false, true]) {
  test(`Mactan remains an eligible Tidore frontier target (expanded: ${expanded})`, () => {
    const { state, ports, origin } = scenario(expanded);
    const target = ports.find(c => c.cityId === "mactan village|philippines");
    assert.ok(sailingDistanceKm(origin, target) < 2500);
    const owned = ports.filter(c => c.factionId === "tidore");
    if (expanded) assert.ok(owned.length > 8);
    const offer = capturePortMissionOfferForCity(state, origin, [...owned, target], {
      simMinute: 0, spawnChance: 1, sailingDistanceKm
    });
    assert.equal(offer.targetCityId, target.cityId);
  });
}

test("Lisbon is outside Tidore's sailing range even when Portugal has lost its other ports", () => {
  const { state, ports, origin } = scenario(true);
  const lisbon = ports.find(c => c.cityId === "lisbon|portugal");
  assert.ok(sailingDistanceKm(origin, lisbon) > 20000);
  const isolated = [...ports.filter(c => c.factionId === "tidore"), lisbon];
  const options = captureCommissionPetitionOptionsForCity(state, origin, isolated, { simMinute: 0, sailingDistanceKm });
  assert.equal(options.some(o => o.targetFactionId === "portugal"), false);
});
