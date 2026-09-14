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

test("Tidore can commission Lisbon beyond the former range limit", () => {
  const { state, ports, origin } = scenario(true);
  const lisbon = ports.find(c => c.cityId === "lisbon|portugal");
  assert.ok(sailingDistanceKm(origin, lisbon) > 20000);
  const isolated = [...ports.filter(c => c.factionId === "tidore"), lisbon];
  const options = captureCommissionPetitionOptionsForCity(state, origin, isolated, { simMinute: 0, sailingDistanceKm });
  assert.equal(options.some(o => o.targetFactionId === "portugal"), true);
});

test("an intact rival's capital remains eligible and disconnected ports do not", () => {
  const { state, ports, origin } = scenario(false);
  const enemyPorts = ports.filter(c => c.factionId === "portugal");
  assert.ok(enemyPorts.length > 2);
  const lisbon = enemyPorts.find(c => c.cityId === "lisbon|portugal");
  const owned = ports.filter(c => c.factionId === "tidore");
  const distance = (_a, b) => b.cityId === lisbon.cityId ? 30000 : null;
  const offer = capturePortMissionOfferForCity(state, origin, [...owned, ...enemyPorts], {
    simMinute: 0, spawnChance: 1, sailingDistanceKm: distance
  });
  assert.equal(offer.targetCityId, lisbon.cityId);
  assert.equal(offer.kind, "capture-capital");
  assert.equal(offer.remainingEnemyPortCount, enemyPorts.length);
  assert.equal(offer.enemyPortsLost, 0);
  const fresh = scenario(false);
  assert.equal(capturePortMissionOfferForCity(fresh.state, fresh.origin, [...owned, ...enemyPorts], {
    simMinute: 0, spawnChance: 1, sailingDistanceKm: () => null
  }), null);
});

test("Portugal's live selector prefers distant Malacca over a nearby Moroccan target", () => {
  const origin = { ...catalog.find(c => c.cityId === "lisbon|portugal"), isFactionCapital: true, capitalOfFactionId: "portugal" };
  const malacca = { ...catalog.find(c => c.cityId === "malacca|malaysia"), factionId: "neutral", foundingFactionId: "neutral" };
  const morocco = { ...catalog.find(c => c.cityId === "ceuta|morocco"), factionId: "neutral", foundingFactionId: "neutral", population: malacca.population };
  for (const seed of [1, 2, 3, 4, 5]) {
    const state = createGameState({ cargoCapacity: 100, playerCharacter: {
      id: `portuguese-strategy-${seed}`, name: "Test Captain", nationalityId: "portugal",
      homePortCityId: origin.cityId, homePortTileId: origin.tileId, homePortName: origin.city, expressions: ["neutral"]
    } });
    state.relations.lettersOfMarque.portugal = { factionId: "portugal", simMinute: 0 };
    const offer = capturePortMissionOfferForCity(state, origin, [origin, malacca, morocco], {
      simMinute: 0, spawnChance: 1, sailingDistanceKm: (_a, b) => b.cityId === malacca.cityId ? 22000 : 100
    });
    assert.equal(offer.targetCityId, malacca.cityId);
  }
});

test("an Old World power can choose a New World port without an Atlantic foothold", () => {
  const origin = { ...catalog.find(c => c.cityId === "lisbon|portugal"), isFactionCapital: true, capitalOfFactionId: "portugal" };
  const target = catalog.find(c => c.cityId === "coroa vermelha village|brazil");
  assert.equal(target.factionId, "neutral");
  assert.ok(sailingDistanceKm(origin, target) > 2500);
  const state = createGameState({ cargoCapacity: 100, playerCharacter: {
    id: "atlantic-expansion-test", name: "Test Captain", nationalityId: "portugal",
    homePortCityId: origin.cityId, homePortTileId: origin.tileId, homePortName: origin.city, expressions: ["neutral"]
  } });
  state.relations.lettersOfMarque.portugal = { factionId: "portugal", simMinute: 0 };
  const offer = capturePortMissionOfferForCity(state, origin, [origin, target], {
    simMinute: 0, spawnChance: 1, sailingDistanceKm
  });
  assert.equal(offer.targetCityId, target.cityId);
  assert.equal(offer.priorityKind, "strategic", "no scripted ambition is needed for the remaining target");
  assert.equal(offer.distanceKm, Math.round(sailingDistanceKm(origin, target)));
});

test("a new foothold changes the chosen frontier without shortening the commission voyage", () => {
  const { state, origin, ports } = scenario(false);
  const nearby = { ...ports.find(c => c.cityId === "mactan village|philippines"), population: 5000 };
  const distant = { ...catalog.find(c => c.cityId === "coroa vermelha village|brazil"), population: 5000 };
  const foothold = { ...catalog.find(c => c.cityId === "malacca|malaysia"), factionId: "tidore" };
  const distance = (a, b) => b.cityId === nearby.cityId ? 4000 : a.cityId === foothold.cityId ? 10 : 20000;
  const context = { simMinute: 0, spawnChance: 1, sailingDistanceKm: distance };
  const before = capturePortMissionOfferForCity(state, origin, [origin, nearby, distant], context);
  assert.equal(before.targetCityId, nearby.cityId);
  const expanded = scenario(false).state;
  const after = capturePortMissionOfferForCity(expanded, origin, [distant, foothold, nearby, origin], context);
  assert.equal(after.targetCityId, distant.cityId);
  assert.equal(after.distanceKm, 20000, "the reward still measures the voyage from Tidore");
  const reordered = scenario(false).state;
  assert.equal(capturePortMissionOfferForCity(reordered, origin, [origin, nearby, foothold, distant], context).targetCityId, after.targetCityId);
});
