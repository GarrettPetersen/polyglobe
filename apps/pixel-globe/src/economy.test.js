import assert from "node:assert/strict";
import test from "node:test";

import {
  FRESH_WATER_GOOD_ID,
  HARDTACK_GOOD_ID,
  TRADE_GOODS,
  advanceWorldEconomy,
  createWorldEconomy,
  executePortPurchase,
  executePortSale,
  maximumPortPurchaseQuantity,
  maximumPortSaleQuantity,
  planNpcTrade,
  portEconomySummary,
  portMarket,
  restoreWorldEconomy,
  snapshotWorldEconomy,
  worldMarketPriceComparison
} from "./economy.js";
import {
  buyGood,
  cargoCostBasis,
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
const BANDA = port(8, "Banda Village", "Indonesia", "southeast-asian", 3500, "village", ["spices", "fish", "timber"]);

test("trade catalog covers staples, manufactures, luxuries, spices, and specie metals", () => {
  const ids = new Set(TRADE_GOODS.map((good) => good.id));
  for (const goodId of [
    "hardtack", "grain", "fish", "timber", "arms", "wool-cloth", "silk-cloth", "pepper",
    "fresh-water", "tea", "porcelain", "ivory", "silver", "gold"
  ]) {
    assert.ok(ids.has(goodId), goodId);
  }
  assert.equal(ids.size, TRADE_GOODS.length);
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
  assert.ok(plan.lines.some((line) => line.goodId === "wool"));
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

test("small spice-island villages offer narrow but valuable local markets", () => {
  const economy = createWorldEconomy({ ports: [BANDA, TERNATE, LONDON], startMinute: 0 });
  const market = [...marketByGood(economy, BANDA).values()];
  const listedTradeGoods = market.filter((row) =>
    row.listedForSale && row.good.id !== HARDTACK_GOOD_ID && row.good.id !== FRESH_WATER_GOOD_ID
  );

  assert.deepEqual(listedTradeGoods.map((row) => row.good.id).sort(), ["fish", "spices", "timber"]);
  assert.ok(marketByGood(economy, BANDA).get("spices").stock > 0);
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

test("spice-island cargo commands transformative prices in Europe", () => {
  const economy = createWorldEconomy({ ports: [LONDON, TERNATE], startMinute: 0 });
  const london = marketByGood(economy, LONDON);
  const ternate = marketByGood(economy, TERNATE);

  assert.ok(london.get("spices").sellPrice >= ternate.get("spices").buyPrice * 3);
  assert.ok(london.get("pepper").sellPrice >= ternate.get("pepper").buyPrice * 3);

  const tradePlan = planNpcTrade(economy, TERNATE, LONDON, { cargoCapacity: 20, specie: 10000 });
  assert.ok(tradePlan.expectedProfit >= 2000);
  assert.ok(tradePlan.lines.some((line) => line.goodId === "spices"));

  const quantity = Math.min(10, ternate.get("spices").stock);
  const purchase = executePortSale(economy, TERNATE, "spices", quantity);
  const sale = executePortPurchase(economy, LONDON, "spices", quantity);
  assert.ok(sale.total >= purchase.total * 2.5);
  assert.ok(sale.total - purchase.total >= 1000);
});

test("market comparisons describe local prices against the live world median", () => {
  const economy = createWorldEconomy({ ports: [LONDON, TERNATE, GOA], startMinute: 0 });
  const islandBuy = worldMarketPriceComparison(economy, TERNATE, "spices", "buy");
  const europeanSale = worldMarketPriceComparison(economy, LONDON, "spices", "sell");

  assert.equal(islandBuy.direction, "low");
  assert.ok(islandBuy.percent < 0);
  assert.equal(europeanSale.direction, "high");
  assert.ok(europeanSale.percent > 0);
  assert.throws(
    () => worldMarketPriceComparison(economy, LONDON, "spices", "barter"),
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
  assert.equal(player.doubloons, 360 - purchase.price);
  assert.equal(cargoCostBasis(player, "wool").total, purchase.price);
  assert.equal(cargoCostBasis(player, "wool").average, purchase.price / 2);
  assert.equal(marketByGood(economy, LONDON).get("wool").stock, londonBefore.stock - 2);
  assert.ok(portEconomySummary(economy, LONDON).specie >= londonSpecieBefore + purchase.price - 1);

  const goaSpecieBefore = portEconomySummary(economy, GOA).specie;
  const sale = sellGood(player, economy, GOA, "wool", 1, { simMinute: 84 * 1440 });
  assert.equal(player.cargo.wool, 1);
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

function port(tileId, city, country, cityType, population, settlementType = "city", marketGoods = null) {
  return { tileId, city, displayCity: city, country, cityType, population, settlementType, marketGoods, lat: 0, lon: 0 };
}
