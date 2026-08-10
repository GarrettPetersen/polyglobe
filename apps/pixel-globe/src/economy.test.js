import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { loadCityCatalogFromCsv } from "./cityCatalogData.js";
import { colonizationTargetForCity } from "./colonialCities.js";
import {
  AMBER_GOOD_ID,
  BEAVER_PELTS_GOOD_ID,
  BEESWAX_GOOD_ID,
  CINNAMON_GOOD_ID,
  CLOVE_GOOD_ID,
  COAL_GOOD_ID,
  FRESH_WATER_GOOD_ID,
  FURS_GOOD_ID,
  GINSENG_GOOD_ID,
  GINGER_GOOD_ID,
  GUNPOWDER_GOOD_ID,
  HARDTACK_GOOD_ID,
  HIDES_GOOD_ID,
  LACQUERWARE_GOOD_ID,
  MATCHLOCKS_GOOD_ID,
  NAVAL_STORES_GOOD_ID,
  NUTMEG_GOOD_ID,
  INDIGO_GOOD_ID,
  PAPER_GOOD_ID,
  PRINTED_BOOKS_GOOD_ID,
  RICE_GOOD_ID,
  SULFUR_GOOD_ID,
  TRADE_GOODS,
  WINE_GOOD_ID,
  addPortGoodStock,
  addWorldEconomyPort,
  advanceWorldEconomy,
  connectNearbyPortMarkets,
  consumePortGoodStock,
  createWorldEconomy,
  destroyPortGoodStock,
  establishPortIndustry,
  executePortPurchase,
  executePortSale,
  maximumPortPurchaseQuantity,
  maximumPortSaleQuantity,
  planNpcTrade,
  portEconomySummary,
  portMarket,
  quotePortPurchase,
  quotePortSale,
  replaceWorldEconomyPort,
  restoreWorldEconomy,
  snapshotPortTradeState,
  snapshotWorldEconomy,
  tradeGoodById,
  worldEconomyPortSettlementType,
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
const KYOTO = port(11, "Kyoto", "Japan", "east-asian", 100000);
const AYUTTHAYA = port(14, "Ayutthaya", "Thailand", "southeast-asian", 90000);
const HAVANA = port(12, "Havana", "Cuba", "mediterranean", 8000);
const SANTO_DOMINGO = port(13, "Santo Domingo", "Dominican Republic", "mediterranean", 20000);
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

test("city catalog presents period city names without changing stable source identities", () => {
  const expectedNames = [
    ["Augsberg", "Germany", "Augsburg"],
    ["Bakhchiserai", "Ukraine", "Salachik"],
    ["Bandar Seri Begawan", "Brunei", "Kota Batu"],
    ["Bogota", "Columbia", "Bacatá"],
    ["Budapest", "Hungary", "Buda"],
    ["Chanchan", "Peru", "Chan Chan"],
    ["Diyarbakir", "Turkey", "Amid"],
    ["Feodosia", "Russian Federation", "Kefe"],
    ["Guatemala City", "Guatemala", "Iximché"],
    ["Iraklion", "Greece", "Candia"],
    ["Kashi", "China", "Kashgar"],
    ["Nkazargamu", "Nigeria", "Ngazargamu"],
    ["Riobamba", "Ecuador", "Liribamba"],
    ["Seoul", "Republic of Korea", "Hanseong"],
    ["Tombouctou", "Mali", "Timbuktu"],
    ["Tsinkiang", "China", "Jinjiang"],
    ["Wroclaw", "Germany", "Breslau"],
    ["Wuhan", "China", "Wuchang"],
    ["Bay of Islands Village", "Aotearoa", "Pēwhairangi Village"],
    ["Mossel Bay Village", "South Africa", "São Brás Village"]
  ];
  for (const [sourceName, country, displayName] of expectedNames) {
    const city = CITY_CATALOG.find((candidate) => candidate.city === sourceName && candidate.country === country);
    assert.ok(city, `${sourceName} should remain in the city catalog`);
    assert.equal(city.displayCity, displayName);
    assert.equal(city.cityId, `${sourceName.toLowerCase()}|${country.toLowerCase()}`);
  }

  const iximche = CITY_CATALOG.find((city) => city.city === "Guatemala City" && city.country === "Guatemala");
  assert.deepEqual(
    { lat: iximche.placementLat, lon: iximche.placementLon },
    { lat: 14.735, lon: -90.9967 }
  );
});

test("city catalog presents historical Hakata without changing its stable source identity", () => {
  const hakata = CITY_CATALOG.find((city) => city.city === "Fukuoka" && city.country === "Japan");
  assert.ok(hakata);
  assert.equal(hakata.displayCity, "Hakata");
  assert.equal(hakata.cityId, "fukuoka|japan");
  assert.deepEqual(
    { lat: hakata.placementLat, lon: hakata.placementLon },
    { lat: 33.58, lon: 130.81 }
  );
});

test("voyage seeds vary initial markets while remaining deterministic", () => {
  const first = createWorldEconomy({
    ports: [LONDON, GOA, TERNATE],
    startMinute: 0,
    seedKey: "voyage-one"
  });
  const repeated = createWorldEconomy({
    ports: [LONDON, GOA, TERNATE],
    startMinute: 0,
    seedKey: "voyage-one"
  });
  const second = createWorldEconomy({
    ports: [LONDON, GOA, TERNATE],
    startMinute: 0,
    seedKey: "voyage-two"
  });

  assert.deepEqual(snapshotWorldEconomy(first), snapshotWorldEconomy(repeated));
  assert.notDeepEqual(snapshotWorldEconomy(first), snapshotWorldEconomy(second));
});

test("trade catalog covers staples, manufactures, luxuries, spices, and specie metals", () => {
  const ids = new Set(TRADE_GOODS.map((good) => good.id));
  for (const goodId of [
    "hardtack", "grain", RICE_GOOD_ID, "fish", "timber", COAL_GOOD_ID, "arms", "wool-cloth", "silk-cloth", "pepper",
    BEAVER_PELTS_GOOD_ID, HIDES_GOOD_ID, CINNAMON_GOOD_ID, CLOVE_GOOD_ID, NUTMEG_GOOD_ID,
    GINGER_GOOD_ID, INDIGO_GOOD_ID,
    AMBER_GOOD_ID, FURS_GOOD_ID, BEESWAX_GOOD_ID, NAVAL_STORES_GOOD_ID,
    PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID, LACQUERWARE_GOOD_ID, GINSENG_GOOD_ID,
    SULFUR_GOOD_ID,
    GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID, "fresh-water", "tea", "porcelain", "ivory", "silver", "gold"
  ]) {
    assert.ok(ids.has(goodId), goodId);
  }
  const coal = tradeGoodById(COAL_GOOD_ID);
  assert.equal(coal.basePrice, 8);
  assert.equal(coal.unitSize, 4);
  assert.equal(coal.category, "material");
  assert.equal(coal.initialImportStockRatio, 0.08);
  assert.equal(ids.has("spices"), false);
  assert.equal(ids.size, TRADE_GOODS.length);
});

test("rice is an edible Asian staple with especially strong production at rice ports", () => {
  const economy = createWorldEconomy({
    ports: [LONDON, GOA, MALACCA, GUANGZHOU, AYUTTHAYA],
    startMinute: 0
  });
  const rice = tradeGoodById(RICE_GOOD_ID);

  assert.equal(rice.category, "food");
  assert.equal(rice.unitSize, 1);
  assert.equal(marketByGood(economy, LONDON).get(RICE_GOOD_ID).productionPerDay, 0);
  for (const city of [GOA, MALACCA, GUANGZHOU, AYUTTHAYA]) {
    const market = marketByGood(economy, city).get(RICE_GOOD_ID);
    assert.ok(market.productionPerDay > 0, city.city);
    assert.equal(market.listedForSale, true, city.city);
  }
  assert.ok(
    marketByGood(economy, AYUTTHAYA).get(RICE_GOOD_ID).productionPerDay >
      marketByGood(economy, MALACCA).get(RICE_GOOD_ID).productionPerDay
  );
});

test("Southeast Asia exports ginger while Caribbean colonies begin with sugar and indigo", () => {
  const economy = createWorldEconomy({
    ports: [MALACCA, TERNATE, HAVANA, SANTO_DOMINGO, LONDON],
    startMinute: 0
  });
  const malacca = marketByGood(economy, MALACCA);
  const ternate = marketByGood(economy, TERNATE);
  const havana = marketByGood(economy, HAVANA);
  const santoDomingo = marketByGood(economy, SANTO_DOMINGO);
  const london = marketByGood(economy, LONDON);

  assert.ok(malacca.get(GINGER_GOOD_ID).productionPerDay > 0);
  assert.ok(ternate.get(GINGER_GOOD_ID).productionPerDay > 0);
  assert.ok(malacca.get(GINGER_GOOD_ID).buyPrice < london.get(GINGER_GOOD_ID).sellPrice);
  assert.ok(havana.get(INDIGO_GOOD_ID).productionPerDay > 0);
  assert.ok(santoDomingo.get(INDIGO_GOOD_ID).productionPerDay > 0);
  assert.ok(havana.get("sugar").productionPerDay > 0);
  assert.ok(santoDomingo.get("sugar").productionPerDay > 0);
  assert.ok(havana.get(HIDES_GOOD_ID).productionPerDay > 0);
  assert.ok(santoDomingo.get(HIDES_GOOD_ID).productionPerDay > 0);
  assert.equal(havana.get(GINGER_GOOD_ID).productionPerDay, 0);
  assert.equal(santoDomingo.get(GINGER_GOOD_ID).productionPerDay, 0);
  assert.ok(havana.get(INDIGO_GOOD_ID).listedForSale);
});

test("New World production follows geography instead of city sprite style", () => {
  const cityNames = [
    "Yuquot Village",
    "Ozette Village",
    "Wendat Village",
    "Chillicothe",
    "Guanahani Village",
    "Havana",
    "Santo Domingo",
    "Coroa Vermelha Village",
    "Chanchan",
    "Mexico City"
  ];
  const ports = cityNames.map((cityName, index) => {
    const city = CITY_CATALOG.find((candidate) =>
      candidate.city === cityName || candidate.displayCity === cityName
    );
    assert.ok(city, `missing city catalog record for ${cityName}`);
    return { ...city, tileId: 15000 + index };
  });
  const byName = new Map(ports.map((city) => [city.city, city]));
  const economy = createWorldEconomy({ ports, startMinute: 0 });

  for (const cityName of ["Yuquot Village", "Ozette Village", "Wendat Village", "Chillicothe"]) {
    const market = marketByGood(economy, byName.get(cityName));
    assert.equal(byName.get(cityName).economyRegion, "native-north-american");
    assert.equal(market.get("cacao").productionPerDay, 0, cityName);
    assert.equal(market.get("sugar").productionPerDay, 0, cityName);
    assert.equal(market.get(INDIGO_GOOD_ID).productionPerDay, 0, cityName);
    assert.ok(market.get("fish").productionPerDay > 0, cityName);
    assert.ok(market.get("timber").productionPerDay > 0, cityName);
  }

  const guanahani = marketByGood(economy, byName.get("Guanahani Village"));
  assert.equal(byName.get("Guanahani Village").economyRegion, "caribbean-indigenous");
  assert.ok(guanahani.get("fish").productionPerDay > 0);
  assert.ok(guanahani.get("cotton").productionPerDay > 0);
  assert.equal(guanahani.get("sugar").productionPerDay, 0);
  assert.equal(guanahani.get(INDIGO_GOOD_ID).productionPerDay, 0);

  for (const cityName of ["Havana", "Santo Domingo"]) {
    const market = marketByGood(economy, byName.get(cityName));
    assert.equal(byName.get(cityName).economyRegion, "caribbean");
    assert.ok(market.get("sugar").productionPerDay > 0, cityName);
    assert.ok(market.get(INDIGO_GOOD_ID).productionPerDay > 0, cityName);
    assert.equal(market.get(GINGER_GOOD_ID).productionPerDay, 0, cityName);
    assert.equal(market.get("wine").productionPerDay, 0, cityName);
    assert.equal(market.get("olive-oil").productionPerDay, 0, cityName);
  }

  const brazil = marketByGood(economy, byName.get("Coroa Vermelha Village"));
  assert.equal(byName.get("Coroa Vermelha Village").economyRegion, "brazilian-coast");
  assert.ok(brazil.get("fish").productionPerDay > 0);
  assert.ok(brazil.get("timber").productionPerDay > 0);
  assert.ok(brazil.get("dyes").productionPerDay > 0);
  assert.equal(brazil.get("cacao").productionPerDay, 0);
  assert.equal(brazil.get("sugar").productionPerDay, 0);

  const chanchan = marketByGood(economy, byName.get("Chanchan"));
  assert.equal(byName.get("Chanchan").economyRegion, "andean-coast");
  assert.ok(chanchan.get("fish").productionPerDay > 0);
  assert.ok(chanchan.get("cotton").productionPerDay > 0);

  const mexicoCity = marketByGood(economy, byName.get("Mexico City"));
  assert.equal(byName.get("Mexico City").economyRegion, "mesoamerican");
  assert.ok(mexicoCity.get("cacao").productionPerDay > 0);
  assert.equal(mexicoCity.get("sugar").productionPerDay, 0);
});

test("player-founded colonies use local economies instead of their founders' city artwork", () => {
  const ports = [
    ["Buenos Aires", "Argentina"],
    ["Asuncion", "Paraguay"],
    ["Caracas", "Venezuela"],
    ["St. George's", "Bermuda"],
    ["Recife", "Brazil"],
    ["Potosi", "Bolivia"],
    ["Zacatecas", "Mexico"],
    ["Lima", "Peru"]
  ].map(([city, country], index) => {
    const target = colonizationTargetForCity({ city, country });
    assert.ok(target, `missing colonization target for ${city}`);
    return {
      ...target,
      tileId: 18000 + index,
      population: 2400,
      settlementType: "city"
    };
  });
  const byName = new Map(ports.map((port) => [port.city, port]));
  const economy = createWorldEconomy({ ports, startMinute: 0 });

  const buenosAires = marketByGood(economy, byName.get("Buenos Aires"));
  assert.equal(byName.get("Buenos Aires").economyRegion, "rio-de-la-plata");
  assert.ok(buenosAires.get(HIDES_GOOD_ID).productionPerDay > 0);
  assert.ok(buenosAires.get("grain").productionPerDay > 0);
  assert.equal(buenosAires.get("wine").productionPerDay, 0);
  assert.equal(buenosAires.get("olive-oil").productionPerDay, 0);

  const asuncion = marketByGood(economy, byName.get("Asuncion"));
  assert.equal(byName.get("Asuncion").economyRegion, "rio-de-la-plata");
  assert.ok(asuncion.get(HIDES_GOOD_ID).productionPerDay > 0);
  assert.equal(asuncion.get("olive-oil").productionPerDay, 0);

  const caracas = marketByGood(economy, byName.get("Caracas"));
  assert.equal(byName.get("Caracas").economyRegion, "tropical-american-colony");
  assert.ok(caracas.get(HIDES_GOOD_ID).productionPerDay > 0);
  assert.ok(caracas.get("grain").productionPerDay > 0);
  assert.equal(caracas.get("wine").productionPerDay, 0);
  assert.equal(caracas.get("olive-oil").productionPerDay, 0);

  const bermuda = marketByGood(economy, byName.get("St. George's"));
  assert.equal(byName.get("St. George's").economyRegion, "atlantic-island-colony");
  assert.ok(bermuda.get("timber").productionPerDay > 0);
  assert.ok(bermuda.get("salt").productionPerDay > 0);
  assert.equal(bermuda.get("sugar").productionPerDay, 0);
  assert.equal(bermuda.get(INDIGO_GOOD_ID).productionPerDay, 0);

  assert.ok(marketByGood(economy, byName.get("Recife")).get("sugar").productionPerDay > 0);
  assert.ok(marketByGood(economy, byName.get("Potosi")).get("silver").productionPerDay > 0);
  assert.ok(marketByGood(economy, byName.get("Zacatecas")).get("silver").productionPerDay > 0);

  const lima = marketByGood(economy, byName.get("Lima"));
  assert.equal(byName.get("Lima").economyRegion, "andean-coast");
  assert.ok(lima.get("fish").productionPerDay > 0);
  assert.ok(lima.get("cotton").productionPerDay > 0);
});

test("Chinese ports do not begin a voyage with Mediterranean olive oil imports", () => {
  const ports = ["Guangzhou", "Wuhan", "Nanjing"].map((cityName, index) => {
    const city = CITY_CATALOG.find((candidate) => candidate.city === cityName);
    assert.ok(city, `missing city catalog record for ${cityName}`);
    return { ...city, tileId: 17000 + index };
  });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  for (const port of ports) {
    const oliveOil = marketByGood(economy, port).get("olive-oil");
    assert.equal(oliveOil.productionPerDay, 0, port.city);
    assert.equal(oliveOil.stock, 0, port.city);
    assert.equal(oliveOil.listedForSale, false, port.city);
  }
});

test("1522 bullion exports come from named American and African gateways", () => {
  const mexicoCity = port(80, "Mexico City", "Mexico", "mesoamerican", 100000);
  const tezcoco = port(81, "Tezcoco", "Mexico", "mesoamerican", 30000);
  const cuzco = port(82, "Cuzco", "Peru", "andean", 90000);
  const chanchan = port(83, "Chanchan", "Peru", "andean", 25000);
  const sofala = port(84, "Sofala", "Mozambique", "sub-saharan", 12000);
  const mombasa = port(85, "Mombasa", "Kenya", "sub-saharan", 20000);
  const gao = port(86, "Gao", "Mali", "sub-saharan", 50000);
  const economy = createWorldEconomy({
    ports: [
      SANTO_DOMINGO,
      HAVANA,
      VERACRUZ,
      mexicoCity,
      tezcoco,
      cuzco,
      chanchan,
      sofala,
      mombasa,
      gao
    ],
    startMinute: 0
  });

  for (const city of [SANTO_DOMINGO, HAVANA, VERACRUZ, mexicoCity, cuzco, sofala, gao]) {
    assert.ok(marketByGood(economy, city).get("gold").productionPerDay > 0, city.city);
  }
  assert.ok(marketByGood(economy, cuzco).get("silver").productionPerDay > 0);
  for (const city of [tezcoco, chanchan, mombasa]) {
    assert.equal(marketByGood(economy, city).get("gold").productionPerDay, 0, city.city);
    assert.equal(marketByGood(economy, city).get("silver").productionPerDay, 0, city.city);
  }
});

test("1522 mints turn delivered bullion into specie without needing port cash", () => {
  const lisbon = port(87, "Lisbon", "Portugal", "mediterranean", 65000);
  const economy = createWorldEconomy({ ports: [lisbon, SANTO_DOMINGO], startMinute: 0 });
  const lisbonState = economy.portStates.get(lisbon.tileId);
  const santoDomingoState = economy.portStates.get(SANTO_DOMINGO.tileId);
  const lisbonGoldBefore = lisbonState.goods.get("gold").stock;
  const santoDomingoGoldBefore = santoDomingoState.goods.get("gold").stock;
  lisbonState.specie = 0;
  santoDomingoState.specie = 0;

  assert.equal(portEconomySummary(economy, lisbon).hasMint, true);
  assert.equal(portEconomySummary(economy, SANTO_DOMINGO).hasMint, false);
  assert.equal(maximumPortPurchaseQuantity(economy, lisbon, "gold", 4), 4);
  assert.equal(maximumPortPurchaseQuantity(economy, SANTO_DOMINGO, "gold", 4), 0);

  const transaction = executePortPurchase(economy, lisbon, "gold", 4);
  assert.equal(transaction.mintingFee, Math.round(transaction.total * 0.05));
  assert.equal(transaction.mintedSpecie, transaction.total + transaction.mintingFee);
  assert.equal(lisbonState.specie, transaction.mintingFee);
  assert.equal(lisbonState.goods.get("gold").stock, lisbonGoldBefore);
  assert.equal(santoDomingoState.goods.get("gold").stock, santoDomingoGoldBefore);

  const player = createGameState({ cargoCapacity: 20 });
  player.cargo.gold = 1;
  player.accounts.cargoCostBasis.gold = 100;
  lisbonState.specie = 0;
  const playerDoubloonsBefore = player.doubloons;
  const playerSale = sellGood(player, economy, lisbon, "gold", 1);
  assert.equal(player.doubloons, playerDoubloonsBefore + playerSale.price);
  assert.equal(player.cargo.gold, undefined);
  assert.equal(lisbonState.specie, Math.max(1, Math.round(playerSale.price * 0.05)));

  assert.throws(
    () => executePortPurchase(economy, SANTO_DOMINGO, "gold", 1),
    /insufficient specie/
  );
});

test("wine is a drink rather than edible cargo", () => {
  assert.equal(tradeGoodById(WINE_GOOD_ID).category, "drink");
  assert.notEqual(tradeGoodById(WINE_GOOD_ID).category, "food");
});

test("1522 arms markets separate domestic gunpowder from imported matchlocks", () => {
  const lisbon = port(70, "Lisbon", "Portugal", "mediterranean", 65000);
  const kyoto = port(71, "Kyoto", "Japan", "east-asian", 100000);
  const guangzhou = port(72, "Guangzhou", "Ming", "east-asian", 100000);
  const istanbul = port(73, "Istanbul", "Ottoman Empire", "mediterranean", 140000);
  const goa = port(74, "Goa", "Portugal", "south-asian", 65000);
  const economy = createWorldEconomy({
    ports: [lisbon, kyoto, guangzhou, istanbul, goa],
    startMinute: 0
  });
  const lisbonMarket = marketByGood(economy, lisbon);
  const kyotoMarket = marketByGood(economy, kyoto);
  const guangzhouMarket = marketByGood(economy, guangzhou);
  const istanbulMarket = marketByGood(economy, istanbul);
  const goaMarket = marketByGood(economy, goa);

  assert.ok(lisbonMarket.get(GUNPOWDER_GOOD_ID).productionPerDay > 0);
  assert.ok(kyotoMarket.get(GUNPOWDER_GOOD_ID).productionPerDay > 0);
  assert.ok(guangzhouMarket.get(GUNPOWDER_GOOD_ID).productionPerDay > 0);
  assert.equal(guangzhouMarket.get(GUNPOWDER_GOOD_ID).listedForSale, true);
  assert.ok(lisbonMarket.get(MATCHLOCKS_GOOD_ID).productionPerDay > 0);
  assert.ok(istanbulMarket.get(MATCHLOCKS_GOOD_ID).productionPerDay > 0);
  assert.ok(goaMarket.get(MATCHLOCKS_GOOD_ID).productionPerDay > 0);
  assert.equal(kyotoMarket.get(MATCHLOCKS_GOOD_ID).productionPerDay, 0);
  assert.equal(guangzhouMarket.get(MATCHLOCKS_GOOD_ID).productionPerDay, 0);
  assert.equal(kyotoMarket.get(MATCHLOCKS_GOOD_ID).listedForSale, false);
  assert.equal(guangzhouMarket.get(MATCHLOCKS_GOOD_ID).listedForSale, false);
  assert.ok(lisbonMarket.get(MATCHLOCKS_GOOD_ID).buyPrice < kyotoMarket.get(MATCHLOCKS_GOOD_ID).sellPrice);
  assert.ok(lisbonMarket.get(MATCHLOCKS_GOOD_ID).buyPrice < guangzhouMarket.get(MATCHLOCKS_GOOD_ID).sellPrice);

  executePortPurchase(economy, guangzhou, MATCHLOCKS_GOOD_ID, 10);
  assert.equal(marketByGood(economy, guangzhou).get(MATCHLOCKS_GOOD_ID).listedForSale, true);
});

test("shore battery volleys deplete gunpowder and a disabled battery creates maximum scarcity", () => {
  const batteryPort = port(75, "Alexandria", "Egypt", "mediterranean", 80000);
  const economy = createWorldEconomy({ ports: [batteryPort], startMinute: 0 });
  const portState = economy.portStates.get(batteryPort.tileId);
  portState.specie = portState.targetSpecie;
  const before = marketByGood(economy, batteryPort).get(GUNPOWDER_GOOD_ID);

  const volley = consumePortGoodStock(economy, batteryPort, GUNPOWDER_GOOD_ID, 2);
  const afterVolley = marketByGood(economy, batteryPort).get(GUNPOWDER_GOOD_ID);
  assert.equal(volley.consumedQuantity, Math.min(2, before.stock));
  assert.equal(afterVolley.stock, Math.max(0, before.stock - 2));
  assert.ok(afterVolley.buyPrice > before.buyPrice);

  const destroyed = destroyPortGoodStock(economy, batteryPort, GUNPOWDER_GOOD_ID);
  const depleted = marketByGood(economy, batteryPort).get(GUNPOWDER_GOOD_ID);
  assert.equal(destroyed.remainingStock, 0);
  assert.equal(depleted.stock, 0);
  assert.equal(depleted.buyPrice, Math.round(tradeGoodById(GUNPOWDER_GOOD_ID).basePrice * 5 * 1.08));

  const reserveVolley = consumePortGoodStock(economy, batteryPort, GUNPOWDER_GOOD_ID, 2);
  assert.equal(reserveVolley.consumedQuantity, 0);
  assert.equal(reserveVolley.remainingStock, 0);
});

test("a depleted gunpowder market stays integrated with a nearby producing city", () => {
  const nanjing = port(76, "Nanjing", "China", "east-asian", 160000);
  const changzhou = port(77, "Changzhou", "China", "east-asian", 90000);
  const economy = createWorldEconomy({ ports: [nanjing, changzhou], startMinute: 0 });
  connectNearbyPortMarkets(economy, [nanjing, changzhou], () => 50);

  destroyPortGoodStock(economy, changzhou, GUNPOWDER_GOOD_ID);

  const nanjingGunpowder = marketByGood(economy, nanjing).get(GUNPOWDER_GOOD_ID);
  const changzhouGunpowder = marketByGood(economy, changzhou).get(GUNPOWDER_GOOD_ID);
  assert.ok(nanjingGunpowder.productionPerDay > 0);
  assert.ok(
    changzhouGunpowder.sellPrice <= nanjingGunpowder.buyPrice,
    `nearby gunpowder arbitrage remained ${nanjingGunpowder.buyPrice} -> ${changzhouGunpowder.sellPrice}`
  );
});

test("a completed Kyoto workshop creates persistent matchlock production and input demand", () => {
  const economy = createWorldEconomy({ ports: [KYOTO], startMinute: 0 });
  const before = marketByGood(economy, KYOTO);
  const result = establishPortIndustry(economy, KYOTO, MATCHLOCKS_GOOD_ID, 1.5, {
    initialStock: 6
  });
  const after = marketByGood(economy, KYOTO);

  assert.equal(result.created, true);
  assert.equal(after.get(MATCHLOCKS_GOOD_ID).productionPerDay, 1.5);
  assert.ok(after.get(MATCHLOCKS_GOOD_ID).stock >= before.get(MATCHLOCKS_GOOD_ID).stock + 6);
  assert.ok(after.get("iron").consumptionPerDay > before.get("iron").consumptionPerDay);
  assert.ok(after.get("timber").consumptionPerDay > before.get("timber").consumptionPerDay);
  assert.ok(after.get(GUNPOWDER_GOOD_ID).consumptionPerDay > before.get(GUNPOWDER_GOOD_ID).consumptionPerDay);

  const snapshot = snapshotWorldEconomy(economy);
  const restored = createWorldEconomy({ ports: [KYOTO], startMinute: 0 });
  restoreWorldEconomy(restored, snapshot);
  assert.equal(marketByGood(restored, KYOTO).get(MATCHLOCKS_GOOD_ID).productionPerDay, 1.5);
  assert.equal(establishPortIndustry(restored, KYOTO, MATCHLOCKS_GOOD_ID, 1.5).created, false);
});

test("cargo lots make spices and precious metal exceptionally valuable per hold", () => {
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
  assert.equal(tradeGoodById("pepper").basePrice, 100);
  assert.equal(tradeGoodById(CINNAMON_GOOD_ID).basePrice, 150);
  assert.equal(tradeGoodById(CLOVE_GOOD_ID).basePrice, 180);
  assert.equal(tradeGoodById(NUTMEG_GOOD_ID).basePrice, 200);
  assert.equal(tradeGoodById(GINGER_GOOD_ID).basePrice, 40);
  assert.equal(gold.basePrice, 750);

  const londonEconomy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  assert.ok(quotePortPurchase(londonEconomy, LONDON, CLOVE_GOOD_ID, 60) >= 40000);
  assert.ok(quotePortPurchase(londonEconomy, LONDON, "gold", 60) >= 35000);
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

test("developing a village replaces its economy without discarding local stock", () => {
  const village = {
    ...port(97, "Nagasaki", "Japan", "east-asian", 600, "village", ["fish", "timber", "salt"]),
    factionId: "japan"
  };
  const city = {
    ...village,
    population: 2400,
    settlementType: "city",
    marketGoods: null,
    initialImports: [{ goodId: MATCHLOCKS_GOOD_ID, quantity: 8 }],
    playerDevelopedPort: true
  };
  const economy = createWorldEconomy({ ports: [village], startMinute: 0 });
  const fishBefore = portMarket(economy, village).find((row) => row.good.id === "fish").stock;
  const targetSpecieBefore = portEconomySummary(economy, village).targetSpecie;

  replaceWorldEconomyPort(economy, city, 100);

  assert.equal(worldEconomyPortSettlementType(economy, city), "city");
  assert.ok(portMarket(economy, city).find((row) => row.good.id === "fish").stock >= fishBefore);
  assert.ok(portMarket(economy, city).find((row) => row.good.id === MATCHLOCKS_GOOD_ID).stock >= 8);
  assert.ok(portEconomySummary(economy, city).targetSpecie > targetSpecieBefore);
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

test("every 1522 city has a sustainable native export without merchant traffic", () => {
  const cities = CITY_CATALOG.map((city, index) => ({ ...city, tileId: index + 1000 }));
  const economy = createWorldEconomy({
    ports: cities,
    shipyardPorts: [cities[0]],
    startMinute: 0,
    seedKey: "native-export-audit"
  });

  for (const city of cities) {
    const sustainable = portMarket(economy, city).filter((row) => (
      row.good.sellable !== false &&
      row.listedForSale &&
      row.productionPerDay > row.consumptionPerDay
    ));
    assert.ok(
      sustainable.length > 0,
      `${city.displayCity || city.city} has no sustainable native export`
    );
  }
});

test("an isolated Mediterranean city replenishes native grain after its market is emptied", () => {
  const thessaloniki = port(119, "Thessaloniki", "Greece", "mediterranean", 50000);
  const economy = createWorldEconomy({ ports: [thessaloniki], startMinute: 0 });
  for (const good of TRADE_GOODS) {
    if (!good.alwaysAvailable) destroyPortGoodStock(economy, thessaloniki, good.id);
  }

  advanceWorldEconomy(economy, 30 * 24 * 60);

  const grain = marketByGood(economy, thessaloniki).get("grain");
  assert.ok(grain.productionPerDay > grain.consumptionPerDay);
  assert.ok(grain.stock > 0);
  assert.equal(grain.listedForSale, true);
});

test("an isolated Mediterranean city replenishes wine and olive oil after depletion", () => {
  const naples = port(120, "Naples", "Kingdom of Naples", "mediterranean", 50000);
  const economy = createWorldEconomy({ ports: [naples], startMinute: 0 });
  destroyPortGoodStock(economy, naples, WINE_GOOD_ID);
  destroyPortGoodStock(economy, naples, "olive-oil");

  advanceWorldEconomy(economy, 10 * 24 * 60);

  const market = marketByGood(economy, naples);
  for (const goodId of [WINE_GOOD_ID, "olive-oil"]) {
    const row = market.get(goodId);
    assert.ok(row.productionPerDay > row.consumptionPerDay, goodId);
    assert.ok(row.stock > 0, goodId);
  }
});

test("English ports distinguish native specialties from imported market goods", () => {
  const names = [
    "Bristol",
    "Southampton",
    "York",
    "Hull",
    "Newcastle upon Tyne",
    "Norwich",
    "Exeter"
  ];
  const cities = names.map((name, index) => {
    const city = CITY_CATALOG.find((candidate) => candidate.city === name);
    assert.ok(city, `missing English market city: ${name}`);
    assert.equal(city.marketGoods ?? null, null, `${name} should not use a restricted market roster`);
    return { ...city, tileId: 200 + index };
  });
  const economy = createWorldEconomy({
    ports: cities,
    shipyardPorts: [cities[0]],
    startMinute: 0,
    seedKey: "english-port-specialties"
  });
  const market = Object.fromEntries(cities.map((city) => [city.city, marketByGood(economy, city)]));

  assert.ok(market.Bristol.get("wool-cloth").productionPerDay > 0);
  assert.ok(market.Southampton.get("wool").productionPerDay > 0);
  assert.ok(market.Southampton.get("wool-cloth").productionPerDay > 0);
  assert.ok(market.York.get("grain").productionPerDay > 0);
  assert.ok(market.York.get("wool").productionPerDay > 0);
  assert.ok(market.Hull.get("wool-cloth").productionPerDay > 0);
  assert.ok(market["Newcastle upon Tyne"].get("salt").productionPerDay > 0);
  assert.ok(market["Newcastle upon Tyne"].get("timber").productionPerDay > 0);
  assert.ok(market["Newcastle upon Tyne"].get(COAL_GOOD_ID).productionPerDay > 0);
  assert.ok(market.Norwich.get("wool-cloth").productionPerDay > 0);
  assert.ok(market.Exeter.get("tin").productionPerDay > 0);
  assert.ok(market.Exeter.get("wool-cloth").productionPerDay > 0);

  for (const city of [market.Bristol, market.Southampton]) {
    assert.equal(city.get(WINE_GOOD_ID).productionPerDay, 0);
    assert.equal(city.get(WINE_GOOD_ID).listedForSale, true);
  }
});

test("1522 coal markets connect medieval producers to established fuel consumers", () => {
  const names = [
    "Newcastle upon Tyne",
    "Edinburgh",
    "Liege",
    "Taiyuan",
    "Beijing",
    "London",
    "Hull",
    "Brugge",
    "Gent",
    "Southampton",
    "Nanjing"
  ];
  const ports = Object.fromEntries(names.map((name, index) => {
    const city = CITY_CATALOG.find((candidate) => candidate.city === name);
    assert.ok(city, `missing coal market city: ${name}`);
    return [name, { ...city, population: 30000, tileId: 400 + index }];
  }));
  const economy = createWorldEconomy({
    ports: Object.values(ports),
    shipyardPorts: [ports.London],
    startMinute: 0,
    seedKey: "coal-markets-1522"
  });
  const market = Object.fromEntries(names.map((name) => [name, marketByGood(economy, ports[name])]));

  for (const name of ["Newcastle upon Tyne", "Edinburgh", "Liege", "Taiyuan", "Beijing"]) {
    const coal = market[name].get(COAL_GOOD_ID);
    assert.ok(coal.productionPerDay > coal.consumptionPerDay, `${name} should export coal`);
    assert.equal(coal.listedForSale, true, `${name} should list coal`);
  }
  for (const name of ["London", "Hull", "Brugge", "Gent", "Southampton", "Nanjing"]) {
    assert.equal(market[name].get(COAL_GOOD_ID).productionPerDay, 0, name);
  }

  const ordinaryEuropeanDemand = market.Southampton.get(COAL_GOOD_ID).consumptionPerDay;
  for (const name of ["London", "Hull", "Brugge", "Gent"]) {
    assert.ok(
      market[name].get(COAL_GOOD_ID).consumptionPerDay > ordinaryEuropeanDemand,
      `${name} should have elevated coal demand`
    );
  }
  assert.ok(
    market.Beijing.get(COAL_GOOD_ID).consumptionPerDay > market.Nanjing.get(COAL_GOOD_ID).consumptionPerDay
  );

  for (const [origin, destination] of [
    ["Newcastle upon Tyne", "London"],
    ["Liege", "Gent"],
    ["Taiyuan", "Nanjing"]
  ]) {
    const route = planNpcTrade(economy, ports[origin], ports[destination], {
      cargoCapacity: 80,
      specie: 5000
    });
    assert.ok(
      route.lines.some((line) => line.goodId === COAL_GOOD_ID),
      `${origin} -> ${destination} should carry coal`
    );
  }
});

test("Baltic ports offer distinct, moderate-value regional trade loops", () => {
  const gdansk = port(120, "Gdansk", "Poland", "northern-european", 50000);
  const lubeck = port(121, "Lubeck", "Germany", "northern-european", 50000);
  const stockholm = port(122, "Stockholm", "Sweden", "northern-european", 50000);
  const novgorod = port(123, "Novgorod", "Russia", "northern-european", 50000);
  const economy = createWorldEconomy({
    ports: [gdansk, lubeck, stockholm, novgorod],
    startMinute: 0,
    seedKey: "baltic-specialties"
  });
  const gdanskMarket = marketByGood(economy, gdansk);
  const lubeckMarket = marketByGood(economy, lubeck);
  const stockholmMarket = marketByGood(economy, stockholm);
  const novgorodMarket = marketByGood(economy, novgorod);

  assert.ok(gdanskMarket.get(AMBER_GOOD_ID).productionPerDay > 1);
  assert.equal(lubeckMarket.get(AMBER_GOOD_ID).productionPerDay, 0);
  assert.ok(stockholmMarket.get("iron").productionPerDay > gdanskMarket.get("iron").productionPerDay);
  assert.ok(stockholmMarket.get(NAVAL_STORES_GOOD_ID).productionPerDay > 1);
  assert.ok(novgorodMarket.get(FURS_GOOD_ID).productionPerDay > 1);
  assert.ok(novgorodMarket.get(BEESWAX_GOOD_ID).productionPerDay > 1);
  assert.equal(gdanskMarket.get(FURS_GOOD_ID).listedForSale, false);
  assert.equal(stockholmMarket.get(AMBER_GOOD_ID).listedForSale, false);

  const amberRun = planNpcTrade(economy, gdansk, lubeck, { cargoCapacity: 20, specie: 5000 });
  const furRun = planNpcTrade(economy, novgorod, lubeck, { cargoCapacity: 20, specie: 5000 });
  assert.ok(amberRun.expectedProfit >= 100 && amberRun.expectedProfit <= 700);
  assert.ok(amberRun.lines.some((line) => line.goodId === AMBER_GOOD_ID));
  assert.ok(furRun.expectedProfit >= 75 && furRun.expectedProfit <= 700);
  assert.ok(furRun.lines.some((line) => line.goodId === FURS_GOOD_ID));
});

test("Chinese, Korean, and Japanese ports have complementary specialties", () => {
  const jingdezhen = port(130, "Jingdezhen", "Ming", "east-asian", 50000);
  const hangzhou = port(131, "Hangzhou", "Ming", "east-asian", 50000);
  const kaesong = port(132, "Kaesong", "Joseon", "east-asian", 50000);
  const kyoto = port(133, "Kyoto", "Japan", "east-asian", 50000);
  const kagoshima = port(134, "Kagoshima", "Japan", "east-asian", 50000);
  const economy = createWorldEconomy({
    ports: [jingdezhen, hangzhou, kaesong, kyoto, kagoshima],
    startMinute: 0,
    seedKey: "east-asian-specialties"
  });
  const jingdezhenMarket = marketByGood(economy, jingdezhen);
  const hangzhouMarket = marketByGood(economy, hangzhou);
  const kaesongMarket = marketByGood(economy, kaesong);
  const kyotoMarket = marketByGood(economy, kyoto);
  const kagoshimaMarket = marketByGood(economy, kagoshima);

  assert.ok(jingdezhenMarket.get("porcelain").productionPerDay > 1);
  assert.ok(hangzhouMarket.get("silk").productionPerDay > 1);
  assert.ok(kaesongMarket.get(GINSENG_GOOD_ID).productionPerDay > 1);
  assert.ok(kaesongMarket.get(PAPER_GOOD_ID).productionPerDay > 1);
  assert.ok(kyotoMarket.get(LACQUERWARE_GOOD_ID).productionPerDay > 1);
  assert.ok(kagoshimaMarket.get(SULFUR_GOOD_ID).productionPerDay > 1);
  assert.equal(jingdezhenMarket.get(GINSENG_GOOD_ID).listedForSale, false);
  assert.equal(kaesongMarket.get("porcelain").listedForSale, false);
  assert.equal(kyotoMarket.get(GINSENG_GOOD_ID).listedForSale, false);

  const porcelainRun = planNpcTrade(economy, jingdezhen, kyoto, {
    cargoCapacity: 20,
    specie: 5000
  });
  const ginsengRun = planNpcTrade(economy, kaesong, kyoto, {
    cargoCapacity: 20,
    specie: 5000
  });
  const lacquerRun = planNpcTrade(economy, kyoto, kaesong, {
    cargoCapacity: 20,
    specie: 5000
  });
  assert.ok(porcelainRun.expectedProfit >= 75 && porcelainRun.expectedProfit <= 1000);
  assert.ok(porcelainRun.lines.some((line) => line.goodId === "porcelain"));
  assert.ok(ginsengRun.expectedProfit >= 100 && ginsengRun.expectedProfit <= 1000);
  assert.ok(ginsengRun.lines.some((line) => line.goodId === GINSENG_GOOD_ID));
  assert.ok(lacquerRun.expectedProfit >= 100 && lacquerRun.expectedProfit <= 1000);
  assert.ok(lacquerRun.lines.some((line) => line.goodId === LACQUERWARE_GOOD_ID));
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
  assert.ok(coastalVoyage.expectedProfit <= 200, `Istanbul-Athens profit was ${coastalVoyage.expectedProfit}`);
  assert.ok(strongestShortVoyage.expectedProfit <= 1100, JSON.stringify(strongestShortVoyage));
  assert.ok(clovePurchase <= 700, `A Ternate shipload of cloves cost ${clovePurchase}`);
  assert.ok(cloveSale >= clovePurchase * 7, `Lisbon paid ${cloveSale} for cloves costing ${clovePurchase}`);
  assert.ok(spiceIslandsVoyage.expectedProfit >= 4000);
  assert.ok(spiceIslandsVoyage.expectedProfit >= strongestShortVoyage.expectedProfit * 8);
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

test("world market median cache invalidates when a port market changes", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const before = worldMarketPriceComparison(economy, LONDON, "grain", "buy");

  destroyPortGoodStock(economy, LONDON, "grain");

  const after = worldMarketPriceComparison(economy, LONDON, "grain", "buy");
  assert.notEqual(after.worldPrice, before.worldPrice);
  assert.equal(after.worldPrice, after.localPrice);
});

test("mission cargo delivered to a port joins its live market stock", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const before = snapshotPortTradeState(economy, LONDON).stocks.grain;

  const addition = addPortGoodStock(economy, LONDON, "grain", 8);

  assert.equal(addition.quantity, 8);
  assert.equal(snapshotPortTradeState(economy, LONDON).stocks.grain, before + 8);
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
  const economy = createWorldEconomy({ ports: [LONDON, GOA, TERNATE], startMinute: 0 });
  const before = marketByGood(economy, LONDON).get("wool");
  executePortSale(economy, LONDON, "wool", 30);
  const after = marketByGood(economy, LONDON).get("wool");
  assert.ok(after.buyPrice > before.buyPrice);
  assert.throws(() => executePortSale(economy, LONDON, "wool", after.stock + 1), /only .* in stock/);

  const ternateSpecie = portEconomySummary(economy, TERNATE).specie;
  const affordable = maximumPortPurchaseQuantity(economy, TERNATE, "gold", 1000);
  assert.ok(affordable < 1000);
  if (affordable > 0) executePortPurchase(economy, TERNATE, "gold", affordable);
  assert.ok(portEconomySummary(economy, TERNATE).specie <= ternateSpecie);
});

test("major city markets absorb an ordinary shipload without collapsing its price", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  const ordinaryShipload = 60;
  const londonClovesBefore = marketByGood(economy, LONDON).get(CLOVE_GOOD_ID).sellPrice;
  const goaClothBefore = marketByGood(economy, GOA).get("wool-cloth").sellPrice;

  const cloveRevenue = sellToPortOneLotAtATime(economy, LONDON, CLOVE_GOOD_ID, ordinaryShipload);
  const clothRevenue = sellToPortOneLotAtATime(economy, GOA, "wool-cloth", ordinaryShipload);
  const londonClovesAfter = marketByGood(economy, LONDON).get(CLOVE_GOOD_ID).sellPrice;
  const goaClothAfter = marketByGood(economy, GOA).get("wool-cloth").sellPrice;

  assert.ok(cloveRevenue / ordinaryShipload >= londonClovesBefore * 0.8, `London paid ${cloveRevenue}`);
  assert.ok(clothRevenue / ordinaryShipload >= goaClothBefore * 0.8, `Goa paid ${clothRevenue}`);
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

test("economy restore clamps floating-point stock residue but rejects real deficits", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const snapshot = snapshotWorldEconomy(economy);
  const savedLondon = snapshot.ports[0];
  const paperStock = savedLondon.stocks.find(([goodId]) => goodId === PAPER_GOOD_ID);
  assert.ok(paperStock);

  paperStock[1] = -Number.EPSILON;
  restoreWorldEconomy(economy, snapshot);
  assert.equal(marketByGood(economy, LONDON).get(PAPER_GOOD_ID).stock, 0);

  paperStock[1] = -0.01;
  assert.throws(
    () => restoreWorldEconomy(economy, snapshot),
    /Invalid saved stock/
  );
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

test("older economy snapshots initialize newly added trade goods without changing saved stocks", () => {
  const economy = createWorldEconomy({ ports: [LONDON, GOA], startMinute: 0 });
  executePortSale(economy, LONDON, "wool", 2);
  const snapshot = snapshotWorldEconomy(economy);
  const newGoodIds = new Set([
    HIDES_GOOD_ID,
    AMBER_GOOD_ID,
    FURS_GOOD_ID,
    BEESWAX_GOOD_ID,
    NAVAL_STORES_GOOD_ID,
    PAPER_GOOD_ID,
    PRINTED_BOOKS_GOOD_ID,
    LACQUERWARE_GOOD_ID,
    GINSENG_GOOD_ID,
    RICE_GOOD_ID,
    SULFUR_GOOD_ID,
    COAL_GOOD_ID
  ]);
  for (const savedPort of snapshot.ports) {
    savedPort.stocks = savedPort.stocks.filter(([goodId]) => !newGoodIds.has(goodId));
  }
  const savedWool = snapshot.ports
    .find((savedPort) => savedPort.id === LONDON.tileId)
    .stocks.find(([goodId]) => goodId === "wool")[1];
  const freshNewGoodStocks = new Map(
    [...economy.portStates.get(LONDON.tileId).goods.entries()]
      .filter(([goodId]) => newGoodIds.has(goodId))
      .map(([goodId, state]) => [goodId, state.stock])
  );

  restoreWorldEconomy(economy, snapshot);

  assert.equal(economy.portStates.get(LONDON.tileId).goods.get("wool").stock, savedWool);
  for (const [goodId, stock] of freshNewGoodStocks) {
    assert.equal(economy.portStates.get(LONDON.tileId).goods.get(goodId).stock, stock);
  }
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
