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
  planNpcTrade,
  portEconomySummary,
  portMarket
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

function marketByGood(economy, city) {
  return new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
}

function port(tileId, city, country, cityType, population) {
  return { tileId, city, displayCity: city, country, cityType, population, lat: 0, lon: 0 };
}
