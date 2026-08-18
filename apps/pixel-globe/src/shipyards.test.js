import assert from "node:assert/strict";
import test from "node:test";

import {
  addWorldShipyardPort,
  advanceWorldShipyards,
  claimNpcShipyardSale,
  claimPlayerShipyardPayout,
  claimShipyardListing,
  createWorldShipyards,
  generateShipyardListing,
  fundPlayerShipyard,
  nearestShipyardListingForPort,
  restoreWorldShipyards,
  shipConstructionPrice,
  shipReplacementTermsWithoutTradeIn,
  shipbuildingMaterialRequirements,
  shipTradeInValue,
  shipyardAtPort,
  shipyardPurchaseTerms,
  shipyardQualityBudget,
  shipyardRumorForPort,
  snapshotWorldShipyards
} from "./shipyards.js";
import { JAPANESE_SHIP_SLUGS, shipLabelForProse } from "./shipStats.js";

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
const GOA = port(13, "Goa", "south-asian", 75000, 15.49, 73.83, "portugal");
const CHANCHAN = port(14, "Chanchan", "andean", 25000, -8.106, -79.075, "inca");
const LAHORE = port(15, "Lahore", "south-asian", 80000, 31.55, 74.34, "delhi");

test("new-build listings are uncommon but available across a useful share of ports", () => {
  const ports = Array.from({ length: 240 }, (_, index) => (
    port(index + 10, `Port ${index}`, index % 2 ? "northern-european" : "mediterranean", 8000 + index * 310, 20 + index * 0.1, -40 + index * 0.2)
  ));
  const system = createWorldShipyards({ ports, startMinute: 0 });
  const active = [...system.yards.values()].filter((yard) => yard.listing);

  assert.equal(system.yards.size, ports.length);
  assert.ok(active.length >= ports.length * 0.06, `${active.length} active listings`);
  assert.ok(active.length < ports.length * 0.3, `${active.length} active listings`);
});

test("shipyard purchase terms apply half the standard value of the current hull", () => {
  assert.equal(shipTradeInValue("fishing-lugger"), 900);
  assert.deepEqual(shipyardPurchaseTerms(35000, "fishing-lugger"), {
    listingPrice: 35000,
    tradeInValue: 900,
    netPrice: 34100
  });
});

test("special replacement ships can explicitly omit trade-in value", () => {
  assert.deepEqual(shipReplacementTermsWithoutTradeIn(0), {
    listingPrice: 0,
    tradeInValue: 0,
    netPrice: 0
  });
  assert.deepEqual(shipReplacementTermsWithoutTradeIn(42000), {
    listingPrice: 42000,
    tradeInValue: 0,
    netPrice: 42000
  });
  assert.throws(
    () => shipReplacementTermsWithoutTradeIn(-1),
    /Invalid replacement ship price/
  );
});

test("a newly founded port receives a normal regional shipyard", () => {
  const system = createWorldShipyards({ ports: [LISBON], startMinute: 0 });
  const yard = addWorldShipyardPort(system, SMALL_PORT, 500);

  assert.equal(shipyardAtPort(system, SMALL_PORT), yard);
  assert.equal(yard.cityType, "northern-european");
  assert.throws(() => addWorldShipyardPort(system, SMALL_PORT, 500), /already exists/);
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

  const andeanSystem = createWorldShipyards({ ports: [CHANCHAN], startMinute: 0 });
  const andeanYard = shipyardAtPort(andeanSystem, CHANCHAN);
  for (let build = 0; build < 40; build++) {
    const listing = generateShipyardListing(andeanYard, build, build * 1000);
    assert.equal(listing.shipSlug, "mesoamerican-dugout-canoe");
  }
});

test("restoring an Inca voyage replaces an incompatible European ship listing", () => {
  const system = createWorldShipyards({ ports: [CHANCHAN], startMinute: 0 });
  const yard = shipyardAtPort(system, CHANCHAN);
  yard.buildNumber = 7;
  yard.listing = {
    ...generateShipyardListing(yard, yard.buildNumber, 1000),
    shipSlug: "fishing-lugger",
    shipLabel: "Fishing Barque",
    price: 1800
  };
  const snapshot = snapshotWorldShipyards(system);

  restoreWorldShipyards(system, snapshot);

  assert.equal(yard.listing.shipSlug, "mesoamerican-dugout-canoe");
  assert.equal(yard.listing.shipLabel, "Dugout Canoe");
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
  assert.equal(seoulHulls.has("joseon-hyeopseon"), true);
  assert.equal(seoulHulls.has("joseon-panokseon"), true);
  assert.equal(seoulHulls.has("japanese-atakebune"), false);
  assert.equal(nanjingHulls.has("joseon-turtle-ship"), false);
  assert.equal(nanjingHulls.has("japanese-atakebune"), false);
  assert.equal(nagasakiHulls.has("joseon-turtle-ship"), false);
  assert.equal(nagasakiHulls.has("japanese-kuribune"), true);
  assert.equal(nagasakiHulls.has("japanese-kobaya"), true);
  assert.equal(nagasakiHulls.has("japanese-sekibune"), true);
  assert.equal(nagasakiHulls.has("japanese-atakebune"), true);
  assert.deepEqual([...nagasakiHulls].sort(), [...JAPANESE_SHIP_SLUGS].sort());
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
  assert.equal(venetianHulls.has("galleass"), true);
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

test("Ottoman shipyards exclusively build the Kancabash", () => {
  const system = createWorldShipyards({ ports: [ISTANBUL, VENICE], startMinute: 0 });
  const ottomanHulls = generatedHulls(shipyardAtPort(system, ISTANBUL), 800);
  const venetianHulls = generatedHulls(shipyardAtPort(system, VENICE), 800);

  assert.equal(ottomanHulls.has("ottoman-coastal-trader"), true);
  assert.equal(venetianHulls.has("ottoman-coastal-trader"), false);
});

test("Southeast Asian shipyards build the complete regional Malay fleet", () => {
  const system = createWorldShipyards({ ports: [MALACCA], startMinute: 0 });
  const hulls = generatedHulls(shipyardAtPort(system, MALACCA), 800);

  for (const slug of [
    "nusantaran-outrigger",
    "kelulus",
    "penjajap",
    "lancaran",
    "royal-lancaran"
  ]) {
    assert.equal(hulls.has(slug), true, `Southeast Asian pool includes ${slug}`);
  }
  assert.equal(shipConstructionPrice("kelulus"), 4200);
  assert.equal(shipConstructionPrice("penjajap"), 7000);
  assert.equal(shipConstructionPrice("lancaran"), 18000);
  assert.equal(shipConstructionPrice("royal-lancaran"), 42000);
});

test("South Asian shipyards build Indian Ocean vessels rather than Chinese junks", () => {
  const system = createWorldShipyards({ ports: [LAHORE], startMinute: 0 });
  const yard = shipyardAtPort(system, LAHORE);
  const hulls = generatedHulls(yard, 800);

  assert.equal([...hulls].some((slug) => slug.includes("junk")), false);
  assert.equal(hulls.has("dhow"), true);
  assert.equal(hulls.has("ocean-dhow"), true);

  yard.buildNumber = 12;
  yard.listing = {
    ...generateShipyardListing(yard, yard.buildNumber, 0),
    shipSlug: "large-junk",
    shipLabel: "Large Junk"
  };
  restoreWorldShipyards(system, snapshotWorldShipyards(system));
  assert.equal(shipyardAtPort(system, LAHORE).listing.shipSlug.includes("junk"), false);
});

test("every player start region offers an affordable second ship", () => {
  const system = createWorldShipyards({ ports: [PORTO, ISTANBUL, NANJING, GOA], startMinute: 0 });
  for (const port of [PORTO, ISTANBUL, NANJING, GOA]) {
    const affordableUpgrades = [...generatedHulls(shipyardAtPort(system, port), 800)]
      .filter((slug) => {
        const price = shipConstructionPrice(slug);
        return price >= 3000 && price <= 4000;
      });
    assert.ok(affordableUpgrades.length > 0, `${port.city} affordable upgrades`);
  }
});

test("starter replacements and first upgrades form an accessible price ladder", () => {
  const starterPrices = ["dhow", "fishing-lugger", "felucca", "sampan"]
    .map(shipConstructionPrice);
  const upgradePrices = ["cutter", "small-cog", "ketch", "small-junk"]
    .map(shipConstructionPrice);

  assert.ok(Math.max(...starterPrices) < Math.min(...upgradePrices));
  assert.deepEqual(upgradePrices, [3000, 3400, 3600, 3800]);
  assert.equal(shipConstructionPrice("square-rigged-caravel"), 4000);
  assert.equal(shipConstructionPrice("nusantaran-outrigger"), 4000);
  assert.equal(shipConstructionPrice("kelulus"), 4200);
  assert.equal(shipConstructionPrice("ocean-dhow"), 4800);
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
  const rumor = shipyardRumorForPort(system, PORTO, testSailingDistanceKm);

  assert.equal(rumor.portName, "Lisbon");
  assert.equal(rumor.shipSlug, lisbonYard.listing.shipSlug);
  assert.equal(rumor.local, false);
  assert.ok(rumor.distanceKm < 400);
});

test("factors advertise their own active listing before another port's", () => {
  const system = createWorldShipyards({ ports: [LISBON, PORTO], startMinute: 0 });
  const lisbonYard = shipyardAtPort(system, LISBON);
  const portoYard = shipyardAtPort(system, PORTO);
  lisbonYard.listing = generateShipyardListing(lisbonYard, 99, 0);
  portoYard.listing = generateShipyardListing(portoYard, 101, 0);

  const rumor = shipyardRumorForPort(system, LISBON, testSailingDistanceKm);

  assert.equal(rumor.portId, LISBON.tileId);
  assert.equal(rumor.shipSlug, lisbonYard.listing.shipSlug);
  assert.equal(rumor.distanceKm, 0);
  assert.equal(rumor.local, true);
});

test("empty shipyards can name the nearest active vessel sale worldwide", () => {
  const system = createWorldShipyards({ ports: [LISBON, PORTO, FIJI], startMinute: 0 });
  const lisbonYard = shipyardAtPort(system, LISBON);
  const portoYard = shipyardAtPort(system, PORTO);
  const fijiYard = shipyardAtPort(system, FIJI);
  lisbonYard.listing = null;
  portoYard.listing = generateShipyardListing(portoYard, 99, 0);
  fijiYard.listing = generateShipyardListing(fijiYard, 99, 0);

  const listing = nearestShipyardListingForPort(system, LISBON, testSailingDistanceKm);

  assert.equal(listing.portName, "Porto");
  assert.equal(listing.shipSlug, portoYard.listing.shipSlug);
  assert.equal(listing.shipProseLabel, shipLabelForProse(listing.shipSlug));
  assert.ok(listing.distanceKm < 400);
});

test("demo shipyard hints ignore listings outside the accessible ports", () => {
  const system = createWorldShipyards({ ports: [LISBON, PORTO, FIJI], startMinute: 0 });
  const lisbonYard = shipyardAtPort(system, LISBON);
  const portoYard = shipyardAtPort(system, PORTO);
  const fijiYard = shipyardAtPort(system, FIJI);
  lisbonYard.listing = null;
  portoYard.listing = generateShipyardListing(portoYard, 99, 0);
  fijiYard.listing = generateShipyardListing(fijiYard, 99, 0);

  const listing = nearestShipyardListingForPort(
    system,
    LISBON,
    testSailingDistanceKm,
    new Set([LISBON.tileId, FIJI.tileId])
  );

  assert.equal(listing.portName, "Fiji Village");
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

test("famous yards put advanced hulls on the market within an ordinary five-year voyage", () => {
  const system = createWorldShipyards({ ports: [LISBON], startMinute: 0, seedKey: "five-year-yard" });
  const yard = shipyardAtPort(system, LISBON);
  const advanced = new Set(["carrack", "galleass", "galleon", "ship-of-the-line"]);
  const observed = new Set();
  for (let day = 30; day <= 5 * 365; day += 30) {
    advanceWorldShipyards(system, day * 24 * 60);
    if (yard.listing) observed.add(yard.listing.shipSlug);
    for (const sale of system.npcSales) observed.add(sale.shipSlug);
  }
  assert.ok(yard.buildNumber >= 4, `expected at least four Lisbon builds, got ${yard.buildNumber}`);
  assert.ok([...observed].some((slug) => advanced.has(slug)), `observed ${[...observed].join(", ")}`);
});

test("an unsold shipyard listing becomes an NPC hull purchase", () => {
  const system = createWorldShipyards({ ports: [LISBON], startMinute: 0 });
  const yard = shipyardAtPort(system, LISBON);
  yard.listing = generateShipyardListing(yard, 22, 0);
  const listing = yard.listing;
  advanceWorldShipyards(system, listing.expiresMinute + 1);
  const sale = claimNpcShipyardSale(system, {
    portId: LISBON.tileId,
    factionId: LISBON.factionId,
    allowedSlugs: [listing.shipSlug],
    mode: "regional"
  });
  assert.equal(sale.shipSlug, listing.shipSlug);
  assert.equal(system.npcSales.length, 0);
});

test("completed hulls consume timber, iron, and naval stores from the port economy", () => {
  const system = createWorldShipyards({ ports: [SMALL_PORT], startMinute: 0, seedKey: "materials" });
  const yard = shipyardAtPort(system, SMALL_PORT);
  yard.listing = null;
  yard.nextBuildMinute = 1;
  const stocks = { timber: 100, iron: 100, "naval-stores": 100 };
  advanceWorldShipyards(system, 2, {
    available: (_portId, goodId) => stocks[goodId],
    consume: (_portId, goodId, quantity) => { stocks[goodId] -= quantity; }
  });
  const requirements = shipbuildingMaterialRequirements(yard.listing.shipSlug);
  for (const [goodId, quantity] of Object.entries(requirements)) {
    assert.equal(stocks[goodId], 100 - quantity, goodId);
  }
});

test("player-backed yards favor major hulls and return a sale share", () => {
  const system = createWorldShipyards({ ports: [LISBON], startMinute: 0, seedKey: "backed-yard" });
  const yard = fundPlayerShipyard(system, LISBON, {
    investedMinute: 0,
    seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 }
  });
  const prices = Array.from({ length: 20 }, (_, index) => (
    shipConstructionPrice(generateShipyardListing(yard, index + 1, index * 1000).shipSlug)
  ));
  assert.ok(prices.filter((price) => price >= 76000).length >= 8, prices.join(", "));

  yard.listing = generateShipyardListing(yard, 40, 0);
  const listing = yard.listing;
  advanceWorldShipyards(system, listing.expiresMinute + 1);
  assert.ok(yard.playerDividendBalance >= listing.price * 0.2);
  const restored = createWorldShipyards({ ports: [LISBON], startMinute: 0, seedKey: "backed-yard" });
  restoreWorldShipyards(restored, snapshotWorldShipyards(system));
  const restoredYard = shipyardAtPort(restored, LISBON);
  const payout = claimPlayerShipyardPayout(restored, LISBON);
  assert.equal(payout.amount, restoredYard.lifetimePlayerDividends);
  assert.ok(payout.sales.some((sale) => sale.shipSlug === listing.shipSlug));
  assert.equal(
    payout.sales.reduce((sum, sale) => sum + sale.dividend, 0),
    payout.amount
  );
  assert.equal(restoredYard.playerDividendBalance, 0);
  assert.deepEqual(restoredYard.playerPendingSales, []);
});

test("restoring a voyage applies the current ship prices and construction cadence", () => {
  const system = createWorldShipyards({ ports: [SMALL_PORT], startMinute: 0 });
  const yard = shipyardAtPort(system, SMALL_PORT);
  yard.buildNumber = 12;
  yard.listing = {
    ...generateShipyardListing(yard, yard.buildNumber, 0),
    shipSlug: "small-cog",
    shipLabel: "Small Cog",
    price: 16800
  };
  yard.nextBuildMinute = 5200 * 1440;
  const snapshot = snapshotWorldShipyards(system);
  snapshot.version = 1;

  restoreWorldShipyards(system, snapshot);

  assert.ok(yard.listing.price >= 3200 && yard.listing.price <= 3700, yard.listing.price);
  assert.equal(yard.nextBuildMinute, 3900 * 1440);
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

function testSailingDistanceKm(a, b) {
  const aTileId = Number.isInteger(a) ? a : a.tileId;
  const bTileId = Number.isInteger(b) ? b : b.tileId;
  if (aTileId === bTileId) return 0;
  const pair = new Set([aTileId, bTileId]);
  if (pair.has(LISBON.tileId) && pair.has(PORTO.tileId)) return 280;
  if (pair.has(LISBON.tileId) && pair.has(FIJI.tileId)) return 19200;
  throw new Error(`Missing test sailing distance: ${aTileId} to ${bTileId}`);
}
