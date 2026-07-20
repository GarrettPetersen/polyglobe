import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { loadCityCatalogFromCsv } from "./cityCatalogData.js";
import {
  BEAVER_PELTS_GOOD_ID,
  CINNAMON_GOOD_ID,
  CLOVE_GOOD_ID,
  FRESH_WATER_GOOD_ID,
  GUNPOWDER_GOOD_ID,
  HARDTACK_GOOD_ID,
  MATCHLOCKS_GOOD_ID,
  NUTMEG_GOOD_ID,
  TRADE_GOODS,
  WINE_GOOD_ID,
  addWorldEconomyPort,
  advanceWorldEconomy,
  connectNearbyPortMarkets,
  createWorldEconomy,
  executePortPurchase,
  executePortSale,
  maximumPortPurchaseQuantity,
  maximumPortSaleQuantity,
  planNpcTrade,
  portEconomySummary,
  portMarket,
  quotePortPurchase,
  quotePortSale,
  restoreWorldEconomy,
  snapshotWorldEconomy,
  tradeGoodById,
  worldMarketPriceComparison
} from "./economy.js";
import {
  parsePortSailingDistances,
  portSailingDistanceKm
} from "./portSailingDistances.js";
import {
  buyGood,
  cargoCostBasis,
  cargoUsed,
  createGameState,
  ledgerEntries,
  realizedTradePnl,
  sellGood
} from "./gameState.js";

const LONDON = port(1, "London", "United Kingdom", "northern-european", 80000);
const GOA = port(2, "Goa", "India", "south-asian", 60000);
const TERNATE = port(3, "Ternate", "Spice Islands", "southeast-asian", 45000);
const GUANGZHOU = port(4, "Guangzhou", "Ming", "east-asian", 100000);
const VERACRUZ = port(5, "Veracruz", "New Spain", "mesoamerican", 50000);
const FIJI = port(6, "Fiji Village", "Fiji", "polynesian", 3500, "village", ["fish", "timber", "sugar"]);
const BANDA = port(8, "Banda Village", "Indonesia", "southeast-asian", 3500, "village", [NUTMEG_GOOD_ID, "fish", "timber"]);
const COLOMBO = port(9, "Colombo", "Sri Lanka", "south-asian", 12000);
const MALACCA = port(10, "Malacca", "Malaysia", "southeast-asian", 90000);
const CITY_CATALOG = loadCityCatalogFromCsv(readFileSync(
  new URL(
    "../../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv",
    import.meta.url
  ),
  "utf8"
));
const PORT_SAILING_DISTANCES = parsePortSailingDistances(JSON.parse(readFileSync(
  new URL("../public/assets/data/port-sailing-distances.json", import.meta.url),
  "utf8"
)));

test("trade catalog covers staples, manufactures, luxuries, spices, and specie metals", () => {
  const ids = new Set(TRADE_GOODS.map((good) => good.id));
  for (const goodId of [
    "hardtack", "grain", "fish", "timber", "arms", "wool-cloth", "silk-cloth", "pepper",
    BEAVER_PELTS_GOOD_ID, CINNAMON_GOOD_ID, CLOVE_GOOD_ID, NUTMEG_GOOD_ID,
    GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID, "fresh-water", "tea", "porcelain", "ivory", "silver", "gold"
  ]) {
    assert.ok(ids.has(goodId), goodId);
  }
  assert.equal(ids.has("spices"), false);
  assert.equal(ids.size, TRADE_GOODS.length);
});

test("wine is a drink rather than edible cargo", () => {
  assert.equal(tradeGoodById(WINE_GOOD_ID).category, "drink");
  assert.notEqual(tradeGoodById(WINE_GOOD_ID).category, "food");
});

test("European matchlocks and Eurasian gunpowder support a valuable Japan trade", () => {
  const lisbon = port(70, "Lisbon", "Portugal", "mediterranean", 65000);
  const kyoto = port(71, "Kyoto", "Japan", "east-asian", 100000);
  const economy = createWorldEconomy({ ports: [lisbon, kyoto], startMinute: 0 });
  const lisbonMarket = marketByGood(economy, lisbon);
  const kyotoMarket = marketByGood(economy, kyoto);

  assert.ok(lisbonMarket.get(GUNPOWDER_GOOD_ID).productionPerDay > 0);
  assert.ok(kyotoMarket.get(GUNPOWDER_GOOD_ID).productionPerDay > 0);
  assert.ok(lisbonMarket.get(MATCHLOCKS_GOOD_ID).productionPerDay > 0);
  assert.equal(kyotoMarket.get(MATCHLOCKS_GOOD_ID).productionPerDay, 0);
  assert.ok(lisbonMarket.get(MATCHLOCKS_GOOD_ID).buyPrice < kyotoMarket.get(MATCHLOCKS_GOOD_ID).sellPrice);
});

test("cargo lots create a clear value-per-hold hierarchy without inflating nominal prices", () => {
  const timber = tradeGoodById("timber");
  const cotton = tradeGoodById("cotton");
  const beaverPelts = tradeGoodById(BEAVER_PELTS_GOOD_ID);
  const nutmeg = tradeGoodById(NUTMEG_GOOD_ID);
  const gold = tradeGoodById("gold");

  assert.equal(timber.unitSize, 4);
  assert.equal(cotton.unitSize, 3);
  assert.equal(beaverPelts.unitSize, 1);
  assert.equal(nutmeg.unitSize, 1);
  assert.equal(gold.unitSize, 1);
  const valuePerHold = (good) => good.basePrice / good.unitSize;
  assert.ok(valuePerHold(cotton) > valuePerHold(timber));
  assert.ok(valuePerHold(beaverPelts) > valuePerHold(cotton) * 10);
  assert.ok(valuePerHold(nutmeg) >= valuePerHold(cotton) * 10);
  assert.ok(valuePerHold(gold) > valuePerHold(nutmeg));
});

test("a founded port joins the economy and its save snapshot", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const colony = port(99, "Port Royal", "Canada", "northern-european", 2400);
  const added = addWorldEconomyPort(economy, colony, 500);

  assert.equal(added.port.name, "Port Royal");
  assert.ok(portMarket(economy, colony).some((row) => row.listedForSale));
  assert.ok(snapshotWorldEconomy(economy).ports.some((entry) => entry.id === colony.tileId));
  assert.throws(() => addWorldEconomyPort(economy, colony, 500), /already exists/);
});

test("a founder discount changes both the quoted and executed market price", () => {
  const colony = { ...LONDON, tileId: 98, city: "Port Royal", displayCity: "Port Royal", purchaseDiscountMultiplier: 0.85 };
  const economy = createWorldEconomy({ ports: [LONDON, colony], startMinute: 0 });
  const base = quotePortSale(economy, colony, "wool", 1);
  const quoted = quotePortSale(economy, colony, "wool", 1, colony.purchaseDiscountMultiplier);
  const discounted = executePortSale(economy, colony, "wool", 1, colony.purchaseDiscountMultiplier).total;

  assert.equal(quoted, Math.round(base * 0.85));
  assert.equal(discounted, quoted);
});

test("ship supplies are cheap, available everywhere, and not bought back", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  for (const city of [LONDON, GOA]) {
    const market = marketByGood(economy, city);
    assert.equal(market.get(HARDTACK_GOOD_ID).buyPrice, 2);
    assert.equal(market.get(FRESH_WATER_GOOD_ID).buyPrice, 1);
    assert.equal(market.get(HARDTACK_GOOD_ID).listedForSale, true);
    assert.equal(market.get(FRESH_WATER_GOOD_ID).listedForSale, true);
    assert.equal(maximumPortPurchaseQuantity(economy, city, HARDTACK_GOOD_ID, 10), 0);
    assert.equal(maximumPortPurchaseQuantity(economy, city, FRESH_WATER_GOOD_ID, 10), 0);
    assert.throws(() => executePortPurchase(economy, city, HARDTACK_GOOD_ID, 1), /does not buy Hardtack/);
    assert.throws(() => executePortPurchase(economy, city, FRESH_WATER_GOOD_ID, 1), /does not buy Fresh Water/);
  }

  const plan = planNpcTrade(economy, LONDON, GOA, { cargoCapacity: 100, specie: 5000 });
  assert.ok(plan.lines.every((line) => line.goodId !== HARDTACK_GOOD_ID && line.goodId !== FRESH_WATER_GOOD_ID));
});

test("regional production creates comparative advantage and profitable merchant cargo", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  const london = marketByGood(economy, LONDON);
  const goa = marketByGood(economy, GOA);

  assert.ok(london.get("wool").productionPerDay > goa.get("wool").productionPerDay);
  assert.ok(london.get("wool").buyPrice < goa.get("wool").sellPrice);
  assert.ok(goa.get("pepper").productionPerDay > london.get("pepper").productionPerDay);
  assert.ok(goa.get("pepper").buyPrice < london.get("pepper").sellPrice);

  const plan = planNpcTrade(economy, LONDON, GOA, { cargoCapacity: 100, specie: 5000 });
  assert.ok(plan.expectedProfit > 0);
  assert.ok(plan.lines.some((line) => line.goodId === "wool-cloth"));
  assert.ok(plan.cargoUnits <= 100);
});

test("Polynesian villages support a fish-rich island economy", () => {
  const islandCity = port(7, "Island City", "Fiji", "polynesian", 3500);
  const economy = createWorldEconomy({ ports: [FIJI, islandCity, GOA], startMinute: 0 });
  const fiji = marketByGood(economy, FIJI);
  const city = marketByGood(economy, islandCity);
  const villageTradeRows = [...fiji.values()].filter((row) =>
    row.listedForSale &&
    row.good.id !== HARDTACK_GOOD_ID &&
    row.good.id !== FRESH_WATER_GOOD_ID
  );
  assert.ok(fiji.get("fish").productionPerDay > fiji.get("iron").productionPerDay);
  assert.ok(fiji.get("fish").stock > 0);
  assert.ok(fiji.get("iron").buyPrice > 0);
  assert.equal(villageTradeRows.length, 3);
  assert.deepEqual(villageTradeRows.map((row) => row.good.id).sort(), ["fish", "sugar", "timber"]);
  assert.ok(fiji.get("fish").productionPerDay < city.get("fish").productionPerDay);
  assert.ok(portEconomySummary(economy, FIJI).targetSpecie < portEconomySummary(economy, islandCity).targetSpecie / 3);
  assert.equal(maximumPortSaleQuantity(economy, FIJI, "artwork", 1, 1000), 0);
});

test("beaver-country villages and player-founded colonies supply valuable pelts", () => {
  const yuquot = {
    ...port(70, "Yuquot Village", "Nuu-chah-nulth", "mesoamerican", 1500, "village", [BEAVER_PELTS_GOOD_ID, "fish", "timber"]),
    lat: 49.5926,
    lon: -126.6174
  };
  const portRoyal = {
    ...port(71, "Port Royal", "Canada", "northern-european", 2400),
    lat: 44.741944,
    lon: -65.515556,
    playerFoundedColony: true
  };
  const ordinaryPort = { ...portRoyal, tileId: 72, playerFoundedColony: false };
  const economy = createWorldEconomy({ ports: [LONDON, yuquot, portRoyal, ordinaryPort], startMinute: 0 });
  const yuquotMarket = marketByGood(economy, yuquot);
  const londonPelts = marketByGood(economy, LONDON).get(BEAVER_PELTS_GOOD_ID);
  const yuquotPelts = yuquotMarket.get(BEAVER_PELTS_GOOD_ID);

  assert.deepEqual(
    [...yuquotMarket.values()]
      .filter((row) => row.listedForSale && row.good.sellable !== false)
      .map((row) => row.good.id)
      .sort(),
    [BEAVER_PELTS_GOOD_ID, "fish", "timber"].sort()
  );
  assert.ok(yuquotPelts.productionPerDay > 0);
  assert.ok(marketByGood(economy, portRoyal).get(BEAVER_PELTS_GOOD_ID).productionPerDay > 0);
  assert.equal(marketByGood(economy, ordinaryPort).get(BEAVER_PELTS_GOOD_ID).productionPerDay, 0);
  assert.ok(londonPelts.sellPrice >= yuquotPelts.buyPrice * 2);
});

test("small spice-island villages offer narrow but valuable local markets", () => {
  const economy = createWorldEconomy({ ports: [BANDA, TERNATE, LONDON], startMinute: 0 });
  const market = [...marketByGood(economy, BANDA).values()];
  const listedTradeGoods = market.filter((row) =>
    row.listedForSale && row.good.id !== HARDTACK_GOOD_ID && row.good.id !== FRESH_WATER_GOOD_ID
  );

  assert.deepEqual(listedTradeGoods.map((row) => row.good.id).sort(), ["fish", "nutmeg", "timber"]);
  assert.ok(marketByGood(economy, BANDA).get(NUTMEG_GOOD_ID).stock > 0);
  assert.ok(portEconomySummary(economy, BANDA).targetSpecie < portEconomySummary(economy, TERNATE).targetSpecie / 3);
  assert.equal(maximumPortSaleQuantity(economy, BANDA, "pepper", 1, 1000), 0);
});

test("a city can declare a narrow market for a fetch-quest port", () => {
  const hafnarfjordur = port(
    64,
    "Hafnarfjordur",
    "Iceland",
    "northern-european",
    1500,
    "city",
    ["fish", "salt", "cheese"]
  );
  const economy = createWorldEconomy({ ports: [hafnarfjordur], startMinute: 0 });
  const listed = portMarket(economy, hafnarfjordur)
    .filter((row) => row.listedForSale && row.good.sellable !== false)
    .map((row) => row.good.id)
    .sort();

  assert.deepEqual(listed, ["cheese", "fish", "salt"]);
  assert.ok(portMarket(economy, hafnarfjordur).every((row) => (
    !["wool", "timber", "iron"].includes(row.good.id) || row.listedForSale === false
  )));
});

test("historical spice origins are local while their cargo commands transformative prices in Europe", () => {
  const economy = createWorldEconomy({ ports: [LONDON, TERNATE, BANDA, COLOMBO, MALACCA], startMinute: 0 });
  const london = marketByGood(economy, LONDON);
  const ternate = marketByGood(economy, TERNATE);
  const banda = marketByGood(economy, BANDA);
  const colombo = marketByGood(economy, COLOMBO);
  const malacca = marketByGood(economy, MALACCA);

  assert.ok(ternate.get(CLOVE_GOOD_ID).productionPerDay > malacca.get(CLOVE_GOOD_ID).productionPerDay);
  assert.ok(banda.get(NUTMEG_GOOD_ID).productionPerDay > malacca.get(NUTMEG_GOOD_ID).productionPerDay);
  assert.ok(colombo.get(CINNAMON_GOOD_ID).productionPerDay > malacca.get(CINNAMON_GOOD_ID).productionPerDay);
  assert.equal(malacca.get(CLOVE_GOOD_ID).productionPerDay, 0);
  assert.equal(malacca.get(NUTMEG_GOOD_ID).productionPerDay, 0);
  assert.equal(malacca.get(CINNAMON_GOOD_ID).productionPerDay, 0);
  assert.ok(ternate.get(CLOVE_GOOD_ID).stock >= 65);
  assert.ok(banda.get(NUTMEG_GOOD_ID).stock >= 65);
  assert.ok(colombo.get(CINNAMON_GOOD_ID).stock >= 65);
  assert.ok(london.get(CLOVE_GOOD_ID).sellPrice >= ternate.get(CLOVE_GOOD_ID).buyPrice * 10);
  assert.ok(london.get(NUTMEG_GOOD_ID).sellPrice >= banda.get(NUTMEG_GOOD_ID).buyPrice * 10);
  assert.ok(london.get(CINNAMON_GOOD_ID).sellPrice >= colombo.get(CINNAMON_GOOD_ID).buyPrice * 10);

  const tradePlan = planNpcTrade(economy, TERNATE, LONDON, { cargoCapacity: 20, specie: 10000 });
  assert.ok(tradePlan.expectedProfit >= 3000);
  assert.ok(tradePlan.cargoUnits >= 18);
  assert.ok(tradePlan.lines.some((line) => line.goodId === CLOVE_GOOD_ID));

  const quantity = Math.min(10, ternate.get(CLOVE_GOOD_ID).stock);
  const purchase = executePortSale(economy, TERNATE, CLOVE_GOOD_ID, quantity);
  const sale = executePortPurchase(economy, LONDON, CLOVE_GOOD_ID, quantity);
  assert.ok(sale.total >= purchase.total * 10);
  assert.ok(sale.total - purchase.total >= 2000);
});

test("real Asia-Europe sailing routes pay several strong coastal voyages", () => {
  const ports = matrixEconomyPorts();
  const portByName = new Map(ports.map((candidate) => [candidate.displayCity, candidate]));
  const london = portByName.get("London");
  const lisbon = portByName.get("Lisbon");
  const guangzhou = portByName.get("Guangzhou");
  const banda = portByName.get("Banda Village");
  const colombo = portByName.get("Colombo");
  const ternate = portByName.get("Ternate");
  const istanbul = portByName.get("Istanbul");
  const athens = portByName.get("Athens");
  const economy = createWorldEconomy({
    ports,
    startMinute: 0
  });
  connectNearbyPortMarkets(
    economy,
    ports,
    (origin, destination) => portSailingDistanceKm(PORT_SAILING_DISTANCES, origin, destination)
  );

  const spiceIslandsVoyage = planNpcTrade(economy, ternate, london, {
    cargoCapacity: 20,
    specie: 10000
  });
  const coastalVoyage = planNpcTrade(economy, istanbul, athens, {
    cargoCapacity: 20,
    specie: 10000
  });
  const teaProfit = quotePortPurchase(economy, london, "tea", 20) -
    quotePortSale(economy, guangzhou, "tea", 20);
  const clovePurchase = quotePortSale(economy, ternate, CLOVE_GOOD_ID, 20);
  const cloveSale = quotePortPurchase(economy, lisbon, CLOVE_GOOD_ID, 20);
  const nutmegProfit = quotePortPurchase(economy, lisbon, NUTMEG_GOOD_ID, 20) -
    quotePortSale(economy, banda, NUTMEG_GOOD_ID, 20);
  const cinnamonProfit = quotePortPurchase(economy, lisbon, CINNAMON_GOOD_ID, 20) -
    quotePortSale(economy, colombo, CINNAMON_GOOD_ID, 20);
  const strongestShortVoyage = strongestTradeVoyageWithin(economy, ports, 1500);

  assert.ok(portSailingDistanceKm(PORT_SAILING_DISTANCES, ternate, london) > 24000);
  assert.ok(portSailingDistanceKm(PORT_SAILING_DISTANCES, banda, lisbon) > 20000);
  assert.ok(portSailingDistanceKm(PORT_SAILING_DISTANCES, colombo, lisbon) > 15000);
  assert.ok(portSailingDistanceKm(PORT_SAILING_DISTANCES, guangzhou, london) > 25000);
  assert.ok(portSailingDistanceKm(PORT_SAILING_DISTANCES, istanbul, athens) < 600);
  assert.ok(coastalVoyage.expectedProfit <= 100, `Istanbul-Athens profit was ${coastalVoyage.expectedProfit}`);
  assert.ok(strongestShortVoyage.expectedProfit <= 400, JSON.stringify(strongestShortVoyage));
  assert.ok(clovePurchase <= 700, `A Ternate shipload of cloves cost ${clovePurchase}`);
  assert.ok(cloveSale >= clovePurchase * 7, `Lisbon paid ${cloveSale} for cloves costing ${clovePurchase}`);
  assert.ok(spiceIslandsVoyage.expectedProfit >= 4000);
  assert.ok(spiceIslandsVoyage.expectedProfit >= strongestShortVoyage.expectedProfit * 10);
  assert.ok(teaProfit >= 2200, `Guangzhou-London tea profit was only ${teaProfit}`);
  assert.ok(nutmegProfit >= 3000, `Banda-Lisbon nutmeg profit was only ${nutmegProfit}`);
  assert.ok(cinnamonProfit >= 2500, `Colombo-Lisbon cinnamon profit was only ${cinnamonProfit}`);
});

test("market comparisons describe local prices against the live world median", () => {
  const economy = createWorldEconomy({ ports: [LONDON, TERNATE, GOA], startMinute: 0 });
  const islandBuy = worldMarketPriceComparison(economy, TERNATE, CLOVE_GOOD_ID, "buy");
  const europeanSale = worldMarketPriceComparison(economy, LONDON, CLOVE_GOOD_ID, "sell");

  assert.equal(islandBuy.direction, "low");
  assert.ok(islandBuy.percent < 0);
  assert.equal(europeanSale.direction, "high");
  assert.ok(europeanSale.percent > 0);
  assert.throws(
    () => worldMarketPriceComparison(economy, LONDON, CLOVE_GOOD_ID, "barter"),
    /Unknown market comparison side/
  );
});

test("other long-haul prestige goods support profitable world-spanning routes", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GUANGZHOU, VERACRUZ], startMinute: 0 });
  const london = marketByGood(economy, LONDON);
  const guangzhou = marketByGood(economy, GUANGZHOU);
  const veracruz = marketByGood(economy, VERACRUZ);

  assert.ok(london.get("porcelain").sellPrice >= guangzhou.get("porcelain").buyPrice * 2.5);
  assert.ok(london.get("silk").sellPrice >= guangzhou.get("silk").buyPrice * 2);
  assert.ok(veracruz.get("arms").sellPrice >= london.get("arms").buyPrice * 1.5);
});

test("every market preserves a spread against same-port arbitrage", () => {
  const ports = [LONDON, GOA, TERNATE, GUANGZHOU, VERACRUZ];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  for (const city of ports) {
    for (const row of portMarket(economy, city)) {
      if (!row.sellable) continue;
      assert.ok(row.sellPrice < row.buyPrice, `${city.city} ${row.good.label}`);
    }
  }
});

test("player trades transfer finite stock and specie between the player and ports", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  const player = createGameState({ cargoCapacity: 10 });
  const londonBefore = marketByGood(economy, LONDON).get("wool");
  const londonSpecieBefore = portEconomySummary(economy, LONDON).specie;

  const purchase = buyGood(player, economy, LONDON, "wool", 2, { simMinute: 80 * 1440 });
  assert.equal(player.cargo.wool, 2);
  assert.equal(cargoUsed(player), 6);
  assert.equal(player.doubloons, 360 - purchase.price);
  assert.equal(cargoCostBasis(player, "wool").total, purchase.price);
  assert.equal(cargoCostBasis(player, "wool").average, purchase.price / 2);
  assert.equal(marketByGood(economy, LONDON).get("wool").stock, londonBefore.stock - 2);
  assert.ok(portEconomySummary(economy, LONDON).specie >= londonSpecieBefore + purchase.price - 1);

  const goaSpecieBefore = portEconomySummary(economy, GOA).specie;
  const sale = sellGood(player, economy, GOA, "wool", 1, { simMinute: 84 * 1440 });
  assert.equal(player.cargo.wool, 1);
  assert.equal(cargoUsed(player), 3);
  assert.equal(player.doubloons, 360 - purchase.price + sale.price);
  assert.equal(sale.costBasis, purchase.price / 2);
  assert.equal(sale.pnl, sale.price - purchase.price / 2);
  assert.equal(cargoCostBasis(player, "wool").total, purchase.price / 2);
  assert.equal(realizedTradePnl(player), sale.pnl);
  assert.deepEqual(ledgerEntries(player).map(({ kind, location }) => [kind, location]), [
    ["opening", "Aboard"],
    ["buy", "London"],
    ["sell", "Goa"]
  ]);
  assert.ok(portEconomySummary(economy, GOA).specie <= goaSpecieBefore - sale.price + 1);
});

test("bulk trading moves prices and cannot exceed market inventory or specie", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  const before = marketByGood(economy, LONDON).get("wool");
  executePortSale(economy, LONDON, "wool", 30);
  const after = marketByGood(economy, LONDON).get("wool");
  assert.ok(after.buyPrice > before.buyPrice);
  assert.throws(() => executePortSale(economy, LONDON, "wool", after.stock + 1), /only .* in stock/);

  const goaSpecie = portEconomySummary(economy, GOA).specie;
  const affordable = maximumPortPurchaseQuantity(economy, GOA, "gold", 1000);
  assert.ok(affordable < 1000);
  if (affordable > 0) executePortPurchase(economy, GOA, "gold", affordable);
  assert.ok(portEconomySummary(economy, GOA).specie <= goaSpecie);
});

test("major city markets absorb an ordinary shipload without collapsing its price", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  const londonClovesBefore = marketByGood(economy, LONDON).get(CLOVE_GOOD_ID).sellPrice;
  const goaClothBefore = marketByGood(economy, GOA).get("wool-cloth").sellPrice;

  const cloveRevenue = sellToPortOneLotAtATime(economy, LONDON, CLOVE_GOOD_ID, 100);
  const clothRevenue = sellToPortOneLotAtATime(economy, GOA, "wool-cloth", 100);
  const londonClovesAfter = marketByGood(economy, LONDON).get(CLOVE_GOOD_ID).sellPrice;
  const goaClothAfter = marketByGood(economy, GOA).get("wool-cloth").sellPrice;

  assert.ok(cloveRevenue / 100 >= londonClovesBefore * 0.8, `London paid ${cloveRevenue}`);
  assert.ok(clothRevenue / 100 >= goaClothBefore * 0.8, `Goa paid ${clothRevenue}`);
  assert.ok(londonClovesAfter >= londonClovesBefore * 0.7,
    `London cloves fell from ${londonClovesBefore} to ${londonClovesAfter}`);
  assert.ok(goaClothAfter >= goaClothBefore * 0.7,
    `Goa cloth fell from ${goaClothBefore} to ${goaClothAfter}`);
});

test("very large deliveries still create a glut in a major city", () => {
  const economy = createWorldEconomy({ ports: [GOA], startMinute: 0 });
  const before = marketByGood(economy, GOA).get("wool-cloth").sellPrice;

  executePortPurchase(economy, GOA, "wool-cloth", 500);
  const after = marketByGood(economy, GOA).get("wool-cloth").sellPrice;

  assert.ok(after <= before * 0.65, `Goa cloth only fell from ${before} to ${after}`);
});

test("local price levels fall with specie scarcity and rise with specie abundance", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const londonState = [...economy.portStates.values()][0];
  const targetSpecie = londonState.targetSpecie;

  londonState.specie = targetSpecie;
  const balanced = marketByGood(economy, LONDON);
  londonState.specie = targetSpecie * 0.1;
  const scarce = marketByGood(economy, LONDON);
  londonState.specie = targetSpecie * 4;
  const abundant = marketByGood(economy, LONDON);

  assert.ok(scarce.get("wool").buyPrice < balanced.get("wool").buyPrice);
  assert.ok(scarce.get("wool").sellPrice < balanced.get("wool").sellPrice);
  assert.ok(abundant.get("wool").buyPrice > balanced.get("wool").buyPrice);
  assert.ok(abundant.get("wool").sellPrice > balanced.get("wool").sellPrice);
  assert.ok(scarce.get(HARDTACK_GOOD_ID).buyPrice < abundant.get(HARDTACK_GOOD_ID).buyPrice);
});

test("specie price pressure gives NPC merchants a balancing trade direction", () => {
  const lowCashPort = { ...LONDON, tileId: 41, city: "Low Cash", displayCity: "Low Cash" };
  const highCashPort = { ...LONDON, tileId: 42, city: "High Cash", displayCity: "High Cash" };
  const economy = createWorldEconomy({ ports: [lowCashPort, highCashPort], startMinute: 0 });
  const [lowState, highState] = [...economy.portStates.values()];
  for (const good of TRADE_GOODS) {
    highState.goods.get(good.id).stock = lowState.goods.get(good.id).stock;
  }
  lowState.specie = lowState.targetSpecie * 0.1;
  highState.specie = highState.targetSpecie * 4;

  const towardRichPort = planNpcTrade(economy, lowCashPort, highCashPort, {
    cargoCapacity: 20,
    specie: 10000
  });
  const towardPoorPort = planNpcTrade(economy, highCashPort, lowCashPort, {
    cargoCapacity: 20,
    specie: 10000
  });

  assert.ok(towardRichPort.expectedProfit > 0);
  assert.ok(towardRichPort.expectedProfit > towardPoorPort.expectedProfit);
});

test("production and consumption advance in coarse simulation steps", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  const pepperBefore = marketByGood(economy, GOA).get("pepper").stock;
  assert.equal(advanceWorldEconomy(economy, 10 * 24 * 60), true);
  const pepperAfter = marketByGood(economy, GOA).get("pepper").stock;
  assert.ok(pepperAfter > pepperBefore);
  assert.equal(advanceWorldEconomy(economy, 10 * 24 * 60), false);
});

test("economy snapshots restore stocks, specie, clocks, and shipyards", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  executePortSale(economy, LONDON, "wool", 3);
  advanceWorldEconomy(economy, 12 * 24 * 60);
  const snapshot = snapshotWorldEconomy(economy);
  const expectedLondon = portEconomySummary(economy, LONDON);
  const expectedWool = marketByGood(economy, LONDON).get("wool").stock;

  executePortSale(economy, LONDON, "wool", 5);
  advanceWorldEconomy(economy, 20 * 24 * 60);
  restoreWorldEconomy(economy, snapshot);

  assert.deepEqual(portEconomySummary(economy, LONDON), expectedLondon);
  assert.equal(marketByGood(economy, LONDON).get("wool").stock, expectedWool);
  assert.equal(economy.lastMinute, snapshot.lastMinute);
  assert.equal(economy.shipyards.lastMinute, snapshot.shipyards.lastMinute);
});

test("legacy economy saves preserve each port's relative cash health", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const snapshot = snapshotWorldEconomy(economy);
  const savedLondon = snapshot.ports[0];
  const currentTarget = portEconomySummary(economy, LONDON).targetSpecie;
  const legacyTarget = Math.round(1200 + Math.sqrt(80000 / 30000) * 4200);
  savedLondon.specie = legacyTarget * 0.5;
  delete savedLondon.targetSpecie;

  restoreWorldEconomy(economy, snapshot);

  assert.ok(Math.abs(portEconomySummary(economy, LONDON).specie - currentTarget * 0.5) <= 1);
});

test("older economy snapshots leave newly added ports at current defaults", () => {
  const oldEconomy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  executePortSale(oldEconomy, LONDON, "wool", 3);
  const snapshot = snapshotWorldEconomy(oldEconomy);
  const expanded = createWorldEconomy({ ports: [LONDON, GOA, FIJI], startMinute: 0 });
  const fijiBefore = portEconomySummary(expanded, FIJI);

  restoreWorldEconomy(expanded, snapshot);

  assert.deepEqual(portEconomySummary(expanded, FIJI), fijiBefore);
  assert.ok(expanded.shipyards.yards.has(FIJI.tileId));
});

function marketByGood(economy, city) {
  return new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
}

function sellToPortOneLotAtATime(economy, city, goodId, quantity) {
  let total = 0;
  for (let index = 0; index < quantity; index += 1) {
    total += executePortPurchase(economy, city, goodId, 1).total;
  }
  return total;
}

function port(tileId, city, country, cityType, population, settlementType = "city", marketGoods = null) {
  return { tileId, city, displayCity: city, country, cityType, population, settlementType, marketGoods, lat: 0, lon: 0 };
}

function matrixEconomyPorts() {
  const catalogByName = new Map();
  for (const city of CITY_CATALOG) {
    for (const name of [city.city, city.displayCity, city.portAlias]) {
      if (name && !catalogByName.has(normalizeName(name))) catalogByName.set(normalizeName(name), city);
    }
  }
  return PORT_SAILING_DISTANCES.endpoints
    .filter((endpoint) => endpoint.kind === "port")
    .map((endpoint) => {
      const city = catalogByName.get(normalizeName(endpoint.name));
      if (!city) throw new Error(`Sailing endpoint has no 1522 city: ${endpoint.name}`);
      return { ...city, tileId: endpoint.tileId, displayCity: endpoint.name };
    });
}

function strongestTradeVoyageWithin(economy, ports, maximumDistanceKm) {
  let strongest = null;
  for (const origin of ports) {
    for (const destination of ports) {
      if (origin.tileId === destination.tileId) continue;
      const distanceKm = portSailingDistanceKm(PORT_SAILING_DISTANCES, origin, destination);
      if (distanceKm <= 0 || distanceKm > maximumDistanceKm) continue;
      const plan = planNpcTrade(economy, origin, destination, { cargoCapacity: 20, specie: 10000 });
      if (!strongest || plan.expectedProfit > strongest.expectedProfit) {
        strongest = {
          origin: origin.displayCity,
          destination: destination.displayCity,
          distanceKm,
          expectedProfit: plan.expectedProfit
        };
      }
    }
  }
  if (!strongest) throw new Error(`No trade voyage within ${maximumDistanceKm} km`);
  return strongest;
}

function normalizeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}
