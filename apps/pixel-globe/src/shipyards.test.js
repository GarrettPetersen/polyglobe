import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorldShipyards,
  claimShipyardListing,
  createWorldShipyards,
  generateShipyardListing,
  restoreWorldShipyards,
  shipConstructionPrice,
  shipyardAtPort,
  shipyardQualityBudget,
  shipyardRumorForPort,
  snapshotWorldShipyards
} from "./shipyards.js";

const LISBON = port(1, "Lisbon", "mediterranean", 100000, 38.72, -9.14, "portugal");
const PORTO = port(2, "Porto", "northern-european", 65000, 41.15, -8.61);
const SMALL_PORT = port(3, "Quiet Haven", "northern-european", 2500, 42, -9);
const FIJI = port(4, "Fiji Village", "polynesian", 3500, -18.14, 178.44);
const GUANAHANI = port(5, "Guanahani Village", "mesoamerican", 1200, 24.06, -74.47);
const SEOUL = port(6, "Seoul", "east-asian", 120000, 37.57, 126.98, "joseon");
const NANJING = port(7, "Nanjing", "east-asian", 160000, 32.06, 118.79, "ming");
const NAGASAKI = port(8, "Nagasaki", "east-asian", 120000, 32.75, 129.88, "japan");
const SEVILLE = port(9, "Seville", "mediterranean", 120000, 37.39, -5.99, "spain");
const VENICE = port(10, "Venice", "mediterranean", 120000, 45.44, 12.32, "venice");
const ISTANBUL = port(11, "Istanbul", "islamic-desert", 180000, 41.01, 28.98, "ottoman");
const MALACCA = port(12, "Malacca", "southeast-asian", 45000, 2.19, 102.25, "neutral");

test("every port has a shipyard but active new-build listings remain rare", () => {
  const ports = Array.from({ length: 240 }, (_, index) => (
    port(index + 10, `Port ${index}`, index % 2 ? "northern-european" : "mediterranean", 8000 + index * 310, 20 + index * 0.1, -40 + index * 0.2)
  ));
  const system = createWorldShipyards({ ports, startMinute: 0 });
  const active = [...system.yards.values()].filter((yard) => yard.listing);

  assert.equal(system.yards.size, ports.length);
  assert.ok(active.length > 0);
  assert.ok(active.length < ports.length * 0.1, `${active.length} active listings`);
});

test("rich famous yards can build better ships than poor ordinary ports", () => {
  const system = createWorldShipyards({ ports: [LISBON, SMALL_PORT], startMinute: 0 });
  const rich = shipyardAtPort(system, LISBON);
  const poor = shipyardAtPort(system, SMALL_PORT);
  assert.equal(rich.famous, true);
  assert.ok(shipyardQualityBudget(rich) > shipyardQualityBudget(poor) * 2);

  const richPrices = [];
  const poorPrices = [];
  for (let build = 1; build <= 120; build++) {
    richPrices.push(shipConstructionPrice(generateShipyardListing(rich, build, build * 1000).shipSlug));
    poorPrices.push(shipConstructionPrice(generateShipyardListing(poor, build, build * 1000).shipSlug));
  }
  assert.ok(average(richPrices) > average(poorPrices) * 1.6);
  assert.ok(Math.max(...richPrices) > Math.max(...poorPrices));
});

test("native villages build their own modest regional hulls", () => {
  const system = createWorldShipyards({ ports: [FIJI], startMinute: 0 });
  const yard = shipyardAtPort(system, FIJI);
  for (let build = 0; build < 40; build++) {
    const listing = generateShipyardListing(yard, build, build * 1000);
    assert.equal(listing.shipSlug, "polynesian-voyaging-canoe");
  }

  const mesoamericanSystem = createWorldShipyards({ ports: [GUANAHANI], startMinute: 0 });
  const mesoamericanYard = shipyardAtPort(mesoamericanSystem, GUANAHANI);
  for (let build = 0; build < 40; build++) {
    const listing = generateShipyardListing(mesoamericanYard, build, build * 1000);
    assert.equal(listing.shipSlug, "mesoamerican-dugout-canoe");
  }
});

test("East Asian national warships stay exclusive to their own shipyards", () => {
  const system = createWorldShipyards({ ports: [SEOUL, NANJING, NAGASAKI], startMinute: 0 });
  const seoulYard = shipyardAtPort(system, SEOUL);
  const nanjingYard = shipyardAtPort(system, NANJING);
  const nagasakiYard = shipyardAtPort(system, NAGASAKI);
  const seoulHulls = new Set();
  const nanjingHulls = new Set();
  const nagasakiHulls = new Set();
  for (let build = 0; build < 400; build++) {
    seoulHulls.add(generateShipyardListing(seoulYard, build, build * 1000).shipSlug);
    nanjingHulls.add(generateShipyardListing(nanjingYard, build, build * 1000).shipSlug);
    nagasakiHulls.add(generateShipyardListing(nagasakiYard, build, build * 1000).shipSlug);
  }

  assert.equal(seoulHulls.has("joseon-turtle-ship"), true);
  assert.equal(seoulHulls.has("joseon-panokseon"), true);
  assert.equal(seoulHulls.has("japanese-atakebune"), false);
  assert.equal(nanjingHulls.has("joseon-turtle-ship"), false);
  assert.equal(nanjingHulls.has("japanese-atakebune"), false);
  assert.equal(nagasakiHulls.has("joseon-turtle-ship"), false);
  assert.equal(nagasakiHulls.has("japanese-atakebune"), true);
});

test("Spanish shipyards exclusively build the Spanish Nao", () => {
  const system = createWorldShipyards({ ports: [SEVILLE, VENICE], startMinute: 0 });
  const sevilleYard = shipyardAtPort(system, SEVILLE);
  const veniceYard = shipyardAtPort(system, VENICE);
  const spanishHulls = new Set();
  const venetianHulls = new Set();
  for (let build = 0; build < 800; build++) {
    spanishHulls.add(generateShipyardListing(sevilleYard, build, build * 1000).shipSlug);
    venetianHulls.add(generateShipyardListing(veniceYard, build, build * 1000).shipSlug);
  }
  assert.equal(spanishHulls.has("spanish-nao"), true);
  assert.equal(venetianHulls.has("spanish-nao"), false);
});

test("Portuguese shipyards exclusively build the Portuguese Carrack", () => {
  const system = createWorldShipyards({ ports: [LISBON, VENICE], startMinute: 0 });
  const lisbonYard = shipyardAtPort(system, LISBON);
  const veniceYard = shipyardAtPort(system, VENICE);
  const portugueseHulls = new Set();
  const venetianHulls = new Set();
  for (let build = 0; build < 800; build++) {
    portugueseHulls.add(generateShipyardListing(lisbonYard, build, build * 1000).shipSlug);
    venetianHulls.add(generateShipyardListing(veniceYard, build, build * 1000).shipSlug);
  }
  assert.equal(portugueseHulls.has("portuguese-carrack"), true);
  assert.equal(venetianHulls.has("portuguese-carrack"), false);
});

test("Ottoman shipyards exclusively build the Ottoman coastal trader", () => {
  const system = createWorldShipyards({ ports: [ISTANBUL, VENICE], startMinute: 0 });
  const ottomanHulls = generatedHulls(shipyardAtPort(system, ISTANBUL), 800);
  const venetianHulls = generatedHulls(shipyardAtPort(system, VENICE), 800);

  assert.equal(ottomanHulls.has("ottoman-coastal-trader"), true);
  assert.equal(venetianHulls.has("ottoman-coastal-trader"), false);
});

test("Southeast Asian shipyards build Nusantaran outriggers", () => {
  const system = createWorldShipyards({ ports: [MALACCA], startMinute: 0 });
  const hulls = generatedHulls(shipyardAtPort(system, MALACCA), 800);

  assert.equal(hulls.has("nusantaran-outrigger"), true);
});

test("ship prices put major hulls far beyond casual fishing income", () => {
  const brigantine = shipConstructionPrice("brigantine");
  const galleon = shipConstructionPrice("galleon");
  const greatCarrack = shipConstructionPrice("ship-of-the-line");

  assert.ok(brigantine >= 30000);
  assert.ok(galleon >= 70000);
  assert.ok(greatCarrack >= 100000);
  assert.ok(greatCarrack > galleon && galleon > brigantine);
});

test("nearby factors can gossip about an active shipyard listing", () => {
  const system = createWorldShipyards({ ports: [LISBON, PORTO], startMinute: 0 });
  const lisbonYard = shipyardAtPort(system, LISBON);
  lisbonYard.listing = generateShipyardListing(lisbonYard, 99, 0);
  const rumor = shipyardRumorForPort(system, PORTO);

  assert.equal(rumor.portName, "Lisbon");
  assert.equal(rumor.shipSlug, lisbonYard.listing.shipSlug);
  assert.ok(rumor.distanceKm < 400);
});

test("new listings spawn over time and purchased listings disappear", () => {
  const system = createWorldShipyards({ ports: [SMALL_PORT], startMinute: 0 });
  const yard = shipyardAtPort(system, SMALL_PORT);
  yard.listing = null;
  const buildMinute = yard.nextBuildMinute;
  assert.equal(advanceWorldShipyards(system, buildMinute), true);
  assert.ok(yard.listing);
  const claimed = claimShipyardListing(system, SMALL_PORT, yard.listing.id);
  assert.equal(claimed.portId, SMALL_PORT.tileId);
  assert.equal(yard.listing, null);
});

test("shipyard snapshots restore listings and construction clocks", () => {
  const system = createWorldShipyards({ ports: [LISBON, PORTO], startMinute: 0 });
  const lisbon = shipyardAtPort(system, LISBON);
  lisbon.buildNumber = 14;
  lisbon.listing = generateShipyardListing(lisbon, 14, 9000);
  lisbon.nextBuildMinute = 123456;
  system.lastMinute = 120000;
  const snapshot = snapshotWorldShipyards(system);

  lisbon.buildNumber = 99;
  lisbon.listing = null;
  lisbon.nextBuildMinute = 999999;
  restoreWorldShipyards(system, snapshot);

  assert.equal(system.lastMinute, 120000);
  assert.equal(lisbon.buildNumber, 14);
  assert.equal(lisbon.listing.id, snapshot.yards.find((yard) => yard.portId === LISBON.tileId).listing.id);
  assert.equal(lisbon.nextBuildMinute, 123456);
});

function port(tileId, city, cityType, population, lat, lon, factionId = "neutral") {
  return { tileId, city, displayCity: city, cityType, population, lat, lon, factionId };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function generatedHulls(yard, count) {
  const hulls = new Set();
  for (let build = 0; build < count; build++) {
    hulls.add(generateShipyardListing(yard, build, build * 1000).shipSlug);
  }
  return hulls;
}
