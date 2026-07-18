import {
  addWorldShipyardPort,
  advanceWorldShipyards,
  createWorldShipyards,
  restoreWorldShipyards,
  snapshotWorldShipyards
} from "./shipyards.js";
import { beaverSettlementProductionRate } from "./beaverEcology.js";

const MINUTES_PER_DAY = 24 * 60;
const ECONOMY_STEP_MINUTES = 6 * 60;
const ECONOMY_STEP_DAYS = ECONOMY_STEP_MINUTES / MINUTES_PER_DAY;
const PORT_MARKUP = 1.08;
const PORT_MARKDOWN = 0.9;
const MIN_PRICE_MULTIPLIER = 0.38;
const MIN_INTEGRATED_PRICE_MULTIPLIER = 0.1;
const MAX_PRICE_MULTIPLIER = 5;
const NPC_SPECIE_RESERVE_RATIO = 0.15;
const NPC_CARGO_LINE_LIMIT = 4;
const VILLAGE_MARKET_GOOD_LIMIT = 3;
const VILLAGE_PRODUCTION_MULTIPLIER = 0.58;
const VILLAGE_CONSUMPTION_MULTIPLIER = 0.62;
const NEARBY_PORT_MARKET_RADIUS_KM = 2500;
const NEARBY_PORT_MARKET_INTEGRATION_STRENGTH = 0.65;
const SOURCE_SPICE_ABUNDANCE_PRICE_MULTIPLIER = 0.22;
const SOURCE_SPICE_MINIMUM_TARGET_STOCK = 80;

export const HARDTACK_GOOD_ID = "hardtack";
export const FRESH_WATER_GOOD_ID = "fresh-water";
export const FORAGED_FOOD_GOOD_ID = "foraged-food";
export const WHALE_BLUBBER_GOOD_ID = "whale-blubber";
export const BEAVER_PELTS_GOOD_ID = "beaver-pelts";
export const CINNAMON_GOOD_ID = "cinnamon";
export const CLOVE_GOOD_ID = "cloves";
export const NUTMEG_GOOD_ID = "nutmeg";

export const TRADE_GOODS = Object.freeze([
  good(HARDTACK_GOOD_ID, "Hardtack", 2, "food", {
    alwaysAvailable: true,
    fixedBuyPrice: 2,
    npcTrade: false,
    sellable: false
  }),
  good(FRESH_WATER_GOOD_ID, "Fresh Water", 1, "supply", {
    alwaysAvailable: true,
    fixedBuyPrice: 1,
    npcTrade: false,
    sellable: false
  }),
  good(FORAGED_FOOD_GOOD_ID, "Foraged Food", 1, "food", {
    npcTrade: false,
    sellable: false
  }),
  good("grain", "Grain", 8, "food"),
  good("fish", "Fish", 10, "food"),
  good(WHALE_BLUBBER_GOOD_ID, "Whale Blubber", 240, "material", { npcTrade: false }),
  good(BEAVER_PELTS_GOOD_ID, "Beaver Pelts", 120, "luxury"),
  good("cheese", "Cheese", 14, "food"),
  good("wine", "Wine", 18, "food"),
  good("olive-oil", "Olive Oil", 16, "food"),
  good("salt", "Salt", 12, "staple", { unitSize: 2 }),
  good("sugar", "Sugar", 20, "food"),
  good("timber", "Timber", 14, "material", { unitSize: 4 }),
  good("wool", "Wool", 18, "material", { unitSize: 3 }),
  good("cotton", "Cotton", 20, "material", { unitSize: 3 }),
  good("flax", "Flax", 14, "material", { unitSize: 3 }),
  good("iron", "Iron", 26, "material", { unitSize: 3 }),
  good("copper", "Copper", 30, "material", { unitSize: 3 }),
  good("tin", "Tin", 32, "material", { unitSize: 3 }),
  good("arms", "Arms", 50, "manufactured", { unitSize: 2 }),
  good("linen-cloth", "Linen Cloth", 34, "textile", { unitSize: 2 }),
  good("wool-cloth", "Wool Cloth", 38, "textile", { unitSize: 2 }),
  good("cotton-cloth", "Cotton Cloth", 40, "textile", { unitSize: 2 }),
  good("silk", "Silk", 60, "luxury"),
  good("silk-cloth", "Silk Cloth", 85, "luxury"),
  good("pepper", "Pepper", 55, "spice"),
  good(CINNAMON_GOOD_ID, "Cinnamon", 80, "spice"),
  good(CLOVE_GOOD_ID, "Cloves", 90, "spice"),
  good(NUTMEG_GOOD_ID, "Nutmeg", 100, "spice"),
  good("tea", "Tea", 60, "luxury"),
  good("coffee", "Coffee", 40, "luxury"),
  good("cacao", "Cacao", 35, "luxury"),
  good("dyes", "Dyes", 42, "manufactured"),
  good("porcelain", "Porcelain", 70, "luxury", { unitSize: 2 }),
  good("glassware", "Glassware", 62, "luxury", { unitSize: 2 }),
  good("carpets", "Carpets", 65, "luxury", { unitSize: 3 }),
  good("artwork", "Artwork", 90, "luxury", { unitSize: 2 }),
  good("perfume", "Perfume", 58, "luxury"),
  good("ivory", "Ivory", 95, "luxury", { unitSize: 2 }),
  good("silver", "Silver", 110, "precious"),
  good("gold", "Gold", 180, "precious")
]);

const TRADE_GOODS_BY_ID = new Map(TRADE_GOODS.map((item) => [item.id, item]));
if (TRADE_GOODS_BY_ID.size !== TRADE_GOODS.length) throw new Error("Trade goods contain duplicate ids");

const REGION_PRODUCTION = Object.freeze({
  "northern-european": rates({ hardtack: 0.75, fish: 1.1, timber: 1.1, wool: 1.2, flax: 0.8, iron: 0.55, "wool-cloth": 0.5, "linen-cloth": 0.45, arms: 0.22 }),
  mediterranean: rates({ hardtack: 0.7, grain: 0.65, fish: 0.7, wine: 1.2, "olive-oil": 1.1, salt: 0.75, "wool-cloth": 0.4, glassware: 0.25, artwork: 0.12 }),
  "islamic-desert": rates({ hardtack: 0.55, cotton: 1.0, "cotton-cloth": 0.65, carpets: 0.65, perfume: 0.35, coffee: 0.25, artwork: 0.12 }),
  "east-asian": rates({ hardtack: 0.55, grain: 0.7, tea: 1.1, silk: 0.9, "silk-cloth": 0.6, porcelain: 0.8, copper: 0.22 }),
  "south-asian": rates({ hardtack: 0.6, grain: 0.65, cotton: 1.15, "cotton-cloth": 0.7, dyes: 0.55, sugar: 0.35 }),
  "southeast-asian": rates({ hardtack: 0.55, fish: 0.65, timber: 0.55, sugar: 0.65, dyes: 0.25 }),
  polynesian: rates({ hardtack: 0.35, fish: 1.4, timber: 0.75, sugar: 0.55, dyes: 0.25, artwork: 0.3 }),
  mesoamerican: rates({ hardtack: 0.45, grain: 0.8, cacao: 1.1, sugar: 0.25, dyes: 0.55, silver: 0.3, gold: 0.12 }),
  andean: rates({ hardtack: 0.4, grain: 0.45, wool: 0.6, copper: 0.55, silver: 0.8, gold: 0.22, dyes: 0.2 }),
  "sub-saharan": rates({ hardtack: 0.45, grain: 0.45, timber: 0.45, ivory: 0.8, gold: 0.5, dyes: 0.35, salt: 0.3 })
});

const REGION_DEMAND = Object.freeze({
  "northern-european": rates({ wine: 0.65, "olive-oil": 0.5, "beaver-pelts": 0.6, pepper: 0.55, cinnamon: 0.5, cloves: 0.65, nutmeg: 0.7, tea: 0.45, porcelain: 0.4, silk: 0.35 }),
  mediterranean: rates({ timber: 0.55, iron: 0.35, "beaver-pelts": 0.38, pepper: 0.35, cinnamon: 0.3, cloves: 0.4, nutmeg: 0.42, silk: 0.3, ivory: 0.18 }),
  "islamic-desert": rates({ timber: 0.65, iron: 0.3, wool: 0.25, "beaver-pelts": 0.18, pepper: 0.12, cinnamon: 0.12, cloves: 0.14, nutmeg: 0.16, tea: 0.2, porcelain: 0.22, ivory: 0.15 }),
  "east-asian": rates({ "beaver-pelts": 0.3, pepper: 0.25, cinnamon: 0.12, cloves: 0.22, nutmeg: 0.18, silver: 0.55, glassware: 0.25, wool: 0.2 }),
  "south-asian": rates({ cloves: 0.12, nutmeg: 0.12, silver: 0.4, gold: 0.15, porcelain: 0.2, silk: 0.2, arms: 0.18 }),
  "southeast-asian": rates({ pepper: 0.12, cinnamon: 0.16, cotton: 0.35, "cotton-cloth": 0.3, silver: 0.4, porcelain: 0.2, arms: 0.16 }),
  polynesian: rates({ iron: 0.65, arms: 0.45, "cotton-cloth": 0.45, glassware: 0.35, salt: 0.25 }),
  mesoamerican: rates({ iron: 0.7, arms: 0.55, "cotton-cloth": 0.3, glassware: 0.3, wine: 0.2 }),
  andean: rates({ iron: 0.55, arms: 0.5, "cotton-cloth": 0.3, wine: 0.2, salt: 0.2 }),
  "sub-saharan": rates({ "cotton-cloth": 0.5, iron: 0.45, arms: 0.35, salt: 0.35, glassware: 0.3 })
});

const REGION_TRADE_PRICE_MULTIPLIER = Object.freeze({
  "northern-european": rates({
    "beaver-pelts": 2.6,
    pepper: 2.35,
    cinnamon: 4.2,
    cloves: 3.5,
    nutmeg: 3.8,
    tea: 2.7,
    coffee: 1.35,
    cacao: 1.4,
    sugar: 1.25,
    silk: 1.5,
    "silk-cloth": 1.55,
    porcelain: 1.55,
    ivory: 1.35
  }),
  mediterranean: rates({
    "beaver-pelts": 2.05,
    pepper: 2.05,
    cinnamon: 3.9,
    cloves: 3.15,
    nutmeg: 3.45,
    tea: 2.3,
    coffee: 1.25,
    cacao: 1.25,
    silk: 1.4,
    "silk-cloth": 1.45,
    porcelain: 1.35,
    ivory: 1.25
  }),
  "islamic-desert": rates({
    "beaver-pelts": 1.3,
    pepper: 1.9,
    cinnamon: 3.65,
    cloves: 2.9,
    nutmeg: 3.15,
    tea: 1.2,
    porcelain: 1.25,
    silver: 1.2,
    glassware: 1.15
  }),
  "east-asian": rates({ "beaver-pelts": 1.5, pepper: 0.75, cinnamon: 0.75, cloves: 0.7, nutmeg: 0.7, silver: 1.55, gold: 1.15, arms: 1.2, glassware: 1.35, "wool-cloth": 1.2 }),
  "south-asian": rates({ pepper: 0.52, cinnamon: 0.3, silver: 1.45, gold: 1.15, arms: 1.2, glassware: 1.25, porcelain: 1.15 }),
  "southeast-asian": rates({ pepper: 0.5, cinnamon: 0.65, cloves: 0.48, nutmeg: 0.48, silver: 1.5, gold: 1.15, arms: 1.25, glassware: 1.25, "cotton-cloth": 1.15 }),
  polynesian: rates({ iron: 1.4, arms: 1.35, glassware: 1.35, "cotton-cloth": 1.3, salt: 1.2 }),
  mesoamerican: rates({ arms: 1.35, iron: 1.25, glassware: 1.25, "cotton-cloth": 1.2, wine: 1.15 }),
  andean: rates({ arms: 1.35, iron: 1.25, glassware: 1.2, "cotton-cloth": 1.2, wine: 1.15 }),
  "sub-saharan": rates({ arms: 1.25, iron: 1.2, glassware: 1.2, "cotton-cloth": 1.2, salt: 1.15 })
});

const CITY_SPECIALTIES = uniqueMap([
  specialty("Lisbon", ["salt"]),
  specialty("London", ["wool", "wool-cloth"]),
  specialty("Venice", ["glassware"]),
  specialty("Genova", ["silver"]),
  specialty("Genoa", ["silver"]),
  specialty("Alexandria", ["cotton-cloth"]),
  specialty("Istanbul", ["carpets"]),
  specialty("Cairo", ["artwork"]),
  specialty("Goa", ["pepper"]),
  specialty("Colombo", [CINNAMON_GOOD_ID]),
  specialty("Aden", ["coffee"]),
  specialty("Jeddah", ["coffee"]),
  specialty("Calicut", ["pepper"]),
  specialty("Cochin", ["pepper"]),
  specialty("Diu", ["cotton-cloth"]),
  specialty("Surat", ["cotton-cloth"]),
  specialty("Aceh", ["pepper"]),
  specialty("Quilon", ["pepper"]),
  specialty("Patani", ["pepper"]),
  specialty("Ternate", [CLOVE_GOOD_ID]),
  specialty("Banda Village", [NUTMEG_GOOD_ID]),
  specialty("Makian Village", [CLOVE_GOOD_ID]),
  specialty("Sofala", ["gold"]),
  specialty("Mozambique Island", ["gold", "ivory"]),
  specialty("Mombasa", ["ivory"]),
  specialty("Mogadishu", ["cotton-cloth", "ivory"]),
  specialty("Santo Domingo", ["sugar"]),
  specialty("Havana", ["sugar"]),
  specialty("Veracruz", ["cacao", "gold"]),
  specialty("Nombre de Dios", ["gold"]),
  specialty("Panama City", ["gold"]),
  specialty("Beijing", ["porcelain"]),
  specialty("Hangzhou", ["silk", "silk-cloth"]),
  specialty("Guangzhou", ["porcelain", "tea"]),
  specialty("Nanjing", ["silk-cloth", "porcelain"]),
  specialty("Kyoto", ["silk-cloth"]),
  specialty("Nagasaki", ["silver"]),
  specialty("Mexico City", ["cacao", "gold"]),
  specialty("Cuzco", ["silver", "gold"]),
  specialty("Gao", ["gold", "salt"]),
  specialty("Tombouctou", ["gold", "salt"]),
  specialty("Fez", ["carpets", "dyes"]),
  specialty("Bordeaux", ["wine"]),
  specialty("Marseille", ["perfume"]),
  specialty("Florence", ["wool-cloth", "artwork"]),
  specialty("Seville", ["olive-oil", "wine"])
], "city specialties");

const PRODUCTION_INPUTS = Object.freeze({
  arms: rates({ iron: 0.8, timber: 0.25 }),
  "linen-cloth": rates({ flax: 0.8 }),
  "wool-cloth": rates({ wool: 0.8 }),
  "cotton-cloth": rates({ cotton: 0.8 }),
  "silk-cloth": rates({ silk: 0.75, dyes: 0.1 }),
  carpets: rates({ wool: 0.4, cotton: 0.3, dyes: 0.1 })
});

export function tradeGoodById(goodId) {
  const good = TRADE_GOODS_BY_ID.get(goodId);
  if (!good) throw new Error(`Unknown trade good: ${goodId}`);
  return good;
}

export function createWorldEconomy({ ports, shipyardPorts = ports, startMinute }) {
  if (!Array.isArray(ports) || ports.length === 0) throw new Error("World economy requires ports");
  if (!Array.isArray(shipyardPorts)) throw new Error("World economy shipyard ports must be an array");
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid economy start minute: ${startMinute}`);
  const portStates = new Map();
  for (const port of ports) {
    const portId = requiredPortId(port);
    if (portStates.has(portId)) throw new Error(`Duplicate economy port tile: ${portId}`);
    portStates.set(portId, createPortState(port));
  }
  for (const shipyardPort of shipyardPorts) {
    const portId = requiredPortId(shipyardPort);
    if (!portStates.has(portId)) throw new Error(`Shipyard city is missing from the economy: ${portId}`);
  }
  return {
    version: 1,
    lastMinute: startMinute,
    portStates,
    shipyards: createWorldShipyards({ ports: shipyardPorts, startMinute })
  };
}

export function connectNearbyPortMarkets(economy, ports, sailingDistanceKm) {
  assertEconomy(economy);
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error("Nearby market integration requires ports");
  }
  if (typeof sailingDistanceKm !== "function") {
    throw new Error("Nearby market integration requires sailing distances");
  }
  const entries = ports.map((record) => ({
    record,
    state: requiredPortState(economy, record)
  }));
  if (new Set(entries.map((entry) => entry.state.id)).size !== entries.length) {
    throw new Error("Nearby market integration contains duplicate ports");
  }
  const structuralMultipliers = new Map(entries.map(({ state }) => [
    state.id,
    new Map(TRADE_GOODS.map((good) => [
      good.id,
      rawMarketMultiplier(state, good, state.goods.get(good.id).targetStock)
    ]))
  ]));

  for (const origin of entries) {
    const weightedNeighbors = [];
    for (const destination of entries) {
      if (destination.state.id === origin.state.id) continue;
      const distanceKm = sailingDistanceKm(origin.record, destination.record);
      if (distanceKm === null || distanceKm > NEARBY_PORT_MARKET_RADIUS_KM) continue;
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
        throw new Error(
          `Invalid sailing distance between ${origin.state.name} and ${destination.state.name}: ${distanceKm}`
        );
      }
      weightedNeighbors.push({
        state: destination.state,
        weight: 1 - distanceKm / NEARBY_PORT_MARKET_RADIUS_KM
      });
    }

    for (const good of TRADE_GOODS) {
      const localMultiplier = structuralMultipliers.get(origin.state.id).get(good.id);
      let weightedMultiplier = 0;
      let totalWeight = 0;
      for (const neighbor of weightedNeighbors) {
        weightedMultiplier += structuralMultipliers.get(neighbor.state.id).get(good.id) * neighbor.weight;
        totalWeight += neighbor.weight;
      }
      const integrationWeight = NEARBY_PORT_MARKET_INTEGRATION_STRENGTH * Math.min(1, totalWeight);
      const integratedMultiplier = totalWeight > 0
        ? localMultiplier + (weightedMultiplier / totalWeight - localMultiplier) * integrationWeight
        : localMultiplier;
      origin.state.marketIntegrationOffsets.set(
        good.id,
        integratedMultiplier - localMultiplier
      );
    }
  }
  return economy;
}

export function addWorldEconomyPort(economy, port, startMinute = economy?.lastMinute) {
  assertEconomy(economy);
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid economy port start minute: ${startMinute}`);
  const portId = requiredPortId(port);
  if (economy.portStates.has(portId)) throw new Error(`Economy port already exists: ${portId}`);
  const state = createPortState(port);
  const yard = addWorldShipyardPort(economy.shipyards, port, startMinute);
  economy.portStates.set(portId, state);
  return { port: state, shipyard: yard };
}

export function worldEconomyHasPort(economy, port) {
  assertEconomy(economy);
  return economy.portStates.has(requiredPortId(port));
}

export function snapshotWorldEconomy(economy) {
  assertEconomy(economy);
  return {
    version: 1,
    lastMinute: economy.lastMinute,
    ports: [...economy.portStates.values()].map((port) => ({
      id: port.id,
      specie: port.specie,
      stocks: [...port.goods.entries()].map(([goodId, state]) => [goodId, state.stock])
    })),
    shipyards: snapshotWorldShipyards(economy.shipyards)
  };
}

export function restoreWorldEconomy(economy, snapshot) {
  assertEconomy(economy);
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.ports)) {
    throw new Error("Unsupported world economy save data");
  }
  if (!Number.isFinite(snapshot.lastMinute)) throw new Error("Invalid saved economy minute");
  for (const saved of snapshot.ports) {
    const port = economy.portStates.get(saved.id);
    if (!port) throw new Error(`Saved economy port is missing: ${saved.id}`);
    if (!Number.isFinite(saved.specie) || saved.specie < 0 || !Array.isArray(saved.stocks)) {
      throw new Error(`Invalid saved economy state for port: ${saved.id}`);
    }
    if (saved.stocks.length !== port.goods.size) {
      throw new Error(`Saved economy goods do not match port: ${saved.id}`);
    }
    for (const [goodId, stock] of saved.stocks) {
      const good = port.goods.get(goodId);
      if (!good) throw new Error(`Saved economy good is missing: ${saved.id}/${goodId}`);
      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error(`Invalid saved stock: ${saved.id}/${goodId}=${stock}`);
      }
    }
  }
  restoreWorldShipyards(economy.shipyards, snapshot.shipyards);
  for (const saved of snapshot.ports) {
    const port = economy.portStates.get(saved.id);
    for (const [goodId, stock] of saved.stocks) port.goods.get(goodId).stock = stock;
    port.specie = saved.specie;
  }
  economy.lastMinute = snapshot.lastMinute;
  return economy;
}

export function advanceWorldEconomy(economy, clockMinute) {
  assertEconomy(economy);
  if (!Number.isFinite(clockMinute)) throw new Error(`Invalid economy clock minute: ${clockMinute}`);
  if (clockMinute < economy.lastMinute) {
    economy.lastMinute = clockMinute;
    return false;
  }
  const steps = Math.floor((clockMinute - economy.lastMinute) / ECONOMY_STEP_MINUTES);
  if (steps <= 0) return false;
  for (let step = 0; step < steps; step++) {
    for (const port of economy.portStates.values()) advancePortEconomy(port, ECONOMY_STEP_DAYS);
  }
  economy.lastMinute += steps * ECONOMY_STEP_MINUTES;
  advanceWorldShipyards(economy.shipyards, economy.lastMinute);
  return true;
}

export function portMarket(economy, city) {
  const port = requiredPortState(economy, city);
  return TRADE_GOODS.map((good) => marketRow(port, good));
}

export function portEconomySummary(economy, city) {
  const port = requiredPortState(economy, city);
  return {
    specie: Math.floor(port.specie),
    targetSpecie: port.targetSpecie,
    populationScale: port.populationScale
  };
}

export function worldMarketPriceComparison(economy, city, goodId, side) {
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  const priceKey = side === "buy" ? "buyPrice" : side === "sell" ? "sellPrice" : null;
  if (!priceKey) throw new Error(`Unknown market comparison side: ${side}`);
  if (side === "sell" && good.sellable === false) {
    throw new Error(`${good.label} cannot be compared on the sell market`);
  }

  const localPrice = marketPrice(port, good, port.goods.get(goodId).stock)[priceKey];
  const worldPrices = [...economy.portStates.values()]
    .map((worldPort) => marketPrice(
      worldPort,
      good,
      worldPort.goods.get(goodId).stock
    )[priceKey])
    .sort((a, b) => a - b);
  const worldPrice = median(worldPrices);
  const percent = Math.round((localPrice / worldPrice - 1) * 100);
  return {
    side,
    localPrice,
    worldPrice,
    percent,
    direction: percent >= 8 ? "high" : percent <= -8 ? "low" : "fair"
  };
}

export function executePortSale(economy, city, goodId, quantity, priceMultiplier = 1) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  assertPortOffersGood(port, good);
  const state = port.goods.get(goodId);
  const available = good.alwaysAvailable ? Number.POSITIVE_INFINITY : Math.floor(state.stock);
  if (available < quantity) {
    throw new Error(`${port.name} has only ${available} ${good.label} in stock`);
  }
  const total = applySalePriceMultiplier(
    quoteTransaction(port, good, quantity, -1, "buyPrice"),
    priceMultiplier
  );
  if (!good.alwaysAvailable) state.stock -= quantity;
  port.specie += total;
  return { good, quantity, total, unitPrice: Math.max(1, Math.round(total / quantity)) };
}

export function quotePortSale(economy, city, goodId, quantity, priceMultiplier = 1) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  assertPortOffersGood(port, good);
  return applySalePriceMultiplier(
    quoteTransaction(port, good, quantity, -1, "buyPrice"),
    priceMultiplier
  );
}

export function maximumPortSaleQuantity(economy, city, goodId, requestedQuantity, traderSpecie) {
  assertTradeQuantity(requestedQuantity);
  if (!Number.isFinite(traderSpecie) || traderSpecie < 0) throw new Error(`Invalid trader specie: ${traderSpecie}`);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (!portOffersGood(port, good)) return 0;
  let low = 0;
  let high = good.alwaysAvailable ? requestedQuantity : Math.min(requestedQuantity, Math.floor(port.goods.get(goodId).stock));
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const total = quoteTransaction(port, good, middle, -1, "buyPrice");
    if (total <= traderSpecie + 1e-6) low = middle;
    else high = middle - 1;
  }
  return low;
}

export function executePortPurchase(economy, city, goodId, quantity) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) throw new Error(`${port.name} does not buy ${good.label}`);
  const total = quoteTransaction(port, good, quantity, 1, "sellPrice");
  if (port.specie + 1e-6 < total) {
    throw new Error(`${port.name} market has insufficient specie for ${quantity} ${good.label}`);
  }
  port.goods.get(goodId).stock += quantity;
  port.specie -= total;
  return { good, quantity, total, unitPrice: Math.max(1, Math.round(total / quantity)) };
}

export function quotePortPurchase(economy, city, goodId, quantity) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) throw new Error(`${port.name} does not buy ${good.label}`);
  return quoteTransaction(port, good, quantity, 1, "sellPrice");
}

export function maximumPortPurchaseQuantity(economy, city, goodId, requestedQuantity) {
  assertTradeQuantity(requestedQuantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) return 0;
  return maximumAffordablePortPurchaseQuantity(port, good, requestedQuantity, port.specie);
}

export function planNpcTrade(economy, origin, destination, { cargoCapacity, specie }) {
  assertCargoCapacity(cargoCapacity);
  if (!Number.isFinite(specie) || specie < 0) throw new Error(`Invalid NPC specie: ${specie}`);
  const originPort = requiredPortState(economy, origin);
  const destinationPort = requiredPortState(economy, destination);
  let capacityLeft = cargoCapacity;
  let specieLeft = Math.floor(specie * (1 - NPC_SPECIE_RESERVE_RATIO));
  let destinationSpecieLeft = Math.floor(destinationPort.specie * 0.9);
  const candidates = [];

  for (const good of TRADE_GOODS) {
    if (good.npcTrade === false || good.sellable === false) continue;
    if (!portOffersGood(originPort, good)) continue;
    const originState = originPort.goods.get(good.id);
    const reserve = Math.max(2, originState.targetStock * 0.12);
    const available = Math.max(0, Math.floor(originState.stock - reserve));
    if (available <= 0) continue;
    const originPrice = marketPrice(originPort, good, originState.stock).buyPrice;
    const destinationPrice = marketPrice(destinationPort, good, destinationPort.goods.get(good.id).stock).sellPrice;
    const margin = destinationPrice - originPrice;
    if (margin <= Math.max(1, good.basePrice * 0.04)) continue;
    candidates.push({ good, originPrice, destinationPrice, margin, available });
  }

  candidates.sort((a, b) => (
    (b.margin / b.good.unitSize) - (a.margin / a.good.unitSize) ||
    (b.margin / b.originPrice) - (a.margin / a.originPrice) ||
    b.margin - a.margin ||
    a.good.id.localeCompare(b.good.id)
  ));

  const lines = [];
  for (const candidate of candidates.slice(0, NPC_CARGO_LINE_LIMIT)) {
    if (capacityLeft <= 0 || specieLeft < candidate.originPrice) break;
    const quantityCapacity = Math.floor(capacityLeft / candidate.good.unitSize);
    if (quantityCapacity <= 0) continue;
    const lineCapacity = Math.max(
      1,
      Math.floor(cargoCapacity * 0.55 / candidate.good.unitSize)
    );
    let quantity = Math.min(
      candidate.available,
      quantityCapacity,
      lineCapacity,
      Math.floor(specieLeft / candidate.originPrice),
      Math.floor(destinationSpecieLeft / candidate.destinationPrice)
    );
    if (quantity > 0) {
      quantity = maximumPortSaleQuantity(economy, origin, candidate.good.id, quantity, specieLeft);
    }
    if (quantity > 0) {
      quantity = maximumAffordablePortPurchaseQuantity(
        destinationPort,
        candidate.good,
        quantity,
        destinationSpecieLeft
      );
    }
    if (quantity <= 0) continue;
    const tradeLine = mostProfitableTradeLine(originPort, destinationPort, candidate.good, quantity);
    if (!tradeLine) continue;
    quantity = tradeLine.quantity;
    const { purchaseTotal, saleTotal, expectedProfit } = tradeLine;
    lines.push({
      goodId: candidate.good.id,
      quantity,
      expectedUnitProfit: Math.max(1, Math.floor(expectedProfit / quantity)),
      expectedProfit
    });
    capacityLeft -= quantity * candidate.good.unitSize;
    specieLeft -= purchaseTotal;
    destinationSpecieLeft -= saleTotal;
  }

  return {
    lines,
    expectedProfit: lines.reduce((sum, line) => sum + line.expectedProfit, 0),
    cargoUnits: lines.reduce((sum, line) => (
      sum + line.quantity * tradeGoodById(line.goodId).unitSize
    ), 0)
  };
}

export function cargoSaleValue(economy, city, cargo) {
  const port = requiredPortState(economy, city);
  let value = 0;
  for (const [goodId, quantity] of Object.entries(cargo || {})) {
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid NPC cargo quantity: ${goodId}=${quantity}`);
    if (quantity === 0) continue;
    const good = tradeGoodById(goodId);
    if (good.sellable === false) continue;
    const affordable = maximumPortPurchaseQuantity(economy, city, goodId, quantity);
    if (affordable > 0) value += quoteTransaction(port, good, affordable, 1, "sellPrice");
  }
  return value;
}

function createPortState(port) {
  const populationScale = clamp(Math.sqrt(Math.max(1000, port.population || 10000) / 30000), 0.45, 4.2);
  const settlementType = port.settlementType === "village" ? "village" : "city";
  const productionMultiplier = settlementType === "village" ? VILLAGE_PRODUCTION_MULTIPLIER : 1;
  const consumptionMultiplier = settlementType === "village" ? VILLAGE_CONSUMPTION_MULTIPLIER : 1;
  const declaredMarketGoodIds = Array.isArray(port.marketGoods)
    ? declaredPortMarketGoodIds(port.marketGoods, port.displayCity || port.city)
    : null;
  const productionProfile = REGION_PRODUCTION[port.cityType];
  const demandProfile = REGION_DEMAND[port.cityType];
  if (!productionProfile || !demandProfile) throw new Error(`No economy profile for city type: ${port.cityType}`);
  const specialties = CITY_SPECIALTIES.get(normalizeName(port.city)) || [];
  const localSpiceSourceIds = new Set(specialties.filter(
    (goodId) => tradeGoodById(goodId).category === "spice"
  ));
  const beaverPeltProduction = beaverSettlementProductionRate(port);
  const goods = new Map();

  for (const good of TRADE_GOODS) {
    const stapleDemand = stapleDemandRate(good.category);
    const regionalProduction = productionProfile[good.id] || 0;
    const villageLocalProduction = declaredMarketGoodIds?.has(good.id) ? 0.45 : 0;
    const localWildProduction = good.id === BEAVER_PELTS_GOOD_ID ? beaverPeltProduction : 0;
    const productionRate = populationScale * productionMultiplier *
      (Math.max(regionalProduction, villageLocalProduction, localWildProduction) +
        (specialties.includes(good.id) ? 1.35 : 0));
    const householdConsumptionPerDay = populationScale * consumptionMultiplier *
      (stapleDemand + (demandProfile[good.id] || 0));
    goods.set(good.id, {
      productionPerDay: productionRate,
      householdConsumptionPerDay,
      consumptionPerDay: householdConsumptionPerDay,
      targetStock: 0,
      stock: 0,
      localAbundancePriceMultiplier: localSpiceSourceIds.has(good.id)
        ? SOURCE_SPICE_ABUNDANCE_PRICE_MULTIPLIER
        : 1
    });
  }

  for (const [outputGoodId, inputs] of Object.entries(PRODUCTION_INPUTS)) {
    const outputRate = goods.get(outputGoodId).productionPerDay;
    for (const [inputGoodId, unitsPerOutput] of Object.entries(inputs)) {
      goods.get(inputGoodId).consumptionPerDay += outputRate * unitsPerOutput;
    }
  }

  for (const good of TRADE_GOODS) {
    const state = goods.get(good.id);
    const ordinaryTargetStock = Math.max(3, state.productionPerDay * 28 + state.consumptionPerDay * 22);
    state.targetStock = state.localAbundancePriceMultiplier < 1
      ? Math.max(SOURCE_SPICE_MINIMUM_TARGET_STOCK, ordinaryTargetStock)
      : ordinaryTargetStock;
    const stockVariance = 0.82 + hashUnit(`${port.tileId}|${good.id}|stock`) * 0.36;
    state.stock = state.targetStock * stockVariance;
  }

  const marketGoodIds = declaredMarketGoodIds || (settlementType === "village"
    ? new Set([...goods.entries()]
      .filter(([goodId, state]) =>
        goodId !== HARDTACK_GOOD_ID &&
        goodId !== FRESH_WATER_GOOD_ID &&
        state.productionPerDay > 0
      )
      .sort((a, b) => b[1].productionPerDay - a[1].productionPerDay || a[0].localeCompare(b[0]))
      .slice(0, VILLAGE_MARKET_GOOD_LIMIT)
      .map(([goodId]) => goodId))
    : null);
  const targetSpecie = settlementType === "village"
    ? Math.round(250 + populationScale * 900)
    : Math.round(1200 + populationScale * 4200);
  return {
    id: requiredPortId(port),
    name: port.displayCity || port.city,
    cityType: port.cityType,
    settlementType,
    populationScale,
    targetSpecie,
    specie: targetSpecie * (0.85 + hashUnit(`${port.tileId}|specie`) * 0.3),
    marketGoodIds,
    marketIntegrationOffsets: new Map(TRADE_GOODS.map((good) => [good.id, 0])),
    goods
  };
}

function advancePortEconomy(port, elapsedDays) {
  let localCashFlow = 0;
  for (const good of TRADE_GOODS) {
    if (good.alwaysAvailable) continue;
    const state = port.goods.get(good.id);
    const desiredProduction = state.productionPerDay * elapsedDays;
    const inputs = PRODUCTION_INPUTS[good.id];
    let produced = desiredProduction;
    if (inputs) {
      for (const [inputGoodId, unitsPerOutput] of Object.entries(inputs)) {
        produced = Math.min(produced, port.goods.get(inputGoodId).stock / unitsPerOutput);
      }
      for (const [inputGoodId, unitsPerOutput] of Object.entries(inputs)) {
        port.goods.get(inputGoodId).stock -= produced * unitsPerOutput;
      }
    }
    state.stock += produced;
    const consumed = Math.min(state.stock, state.householdConsumptionPerDay * elapsedDays);
    state.stock -= consumed;
    const price = marketPrice(port, good, state.stock).midPrice;
    localCashFlow += consumed * price * 0.38;
    localCashFlow -= produced * price * 0.32;
  }
  const circulation = (port.targetSpecie - port.specie) * 0.012 * elapsedDays;
  port.specie = Math.max(0, port.specie + localCashFlow + circulation);
}

function assertPortOffersGood(port, good) {
  if (!portOffersGood(port, good)) {
    throw new Error(`${port.name} does not offer ${good.label}`);
  }
}

function portOffersGood(port, good) {
  return good.alwaysAvailable || !port.marketGoodIds || port.marketGoodIds.has(good.id);
}

function declaredPortMarketGoodIds(goodIds, portName) {
  if (goodIds.length !== VILLAGE_MARKET_GOOD_LIMIT) {
    throw new Error(`${portName} market must declare exactly ${VILLAGE_MARKET_GOOD_LIMIT} goods`);
  }
  const ids = new Set();
  for (const goodId of goodIds) {
    const good = tradeGoodById(goodId);
    if (good.alwaysAvailable) throw new Error(`${portName} cannot list ship supplies as trade goods`);
    ids.add(goodId);
  }
  if (ids.size !== goodIds.length) throw new Error(`${portName} market contains duplicate goods`);
  return ids;
}

function marketRow(port, good) {
  const state = port.goods.get(good.id);
  const prices = marketPrice(port, good, state.stock);
  return {
    good,
    buyPrice: prices.buyPrice,
    sellPrice: prices.sellPrice,
    stock: good.alwaysAvailable ? 999 : Math.max(0, Math.floor(state.stock)),
    productionPerDay: state.productionPerDay,
    consumptionPerDay: state.consumptionPerDay,
    listedForSale: good.alwaysAvailable || (portOffersGood(port, good) && (
      state.productionPerDay > 0 || state.stock >= Math.max(3, state.targetStock * 0.16)
    )),
    sellable: good.sellable !== false,
    portSpecie: Math.max(0, Math.floor(port.specie))
  };
}

function marketPrice(port, good, stock) {
  if (Number.isFinite(good.fixedBuyPrice)) {
    return {
      midPrice: good.fixedBuyPrice,
      buyPrice: good.fixedBuyPrice,
      sellPrice: good.sellable === false ? 0 : Math.max(1, Math.floor(good.fixedBuyPrice * PORT_MARKDOWN))
    };
  }
  const rawMultiplier = rawMarketMultiplier(port, good, stock);
  if (!port.marketIntegrationOffsets.has(good.id)) {
    throw new Error(`${port.name} market has no integration value for ${good.label}`);
  }
  const integratedMultiplier = clamp(
    rawMultiplier + port.marketIntegrationOffsets.get(good.id),
    MIN_INTEGRATED_PRICE_MULTIPLIER,
    MAX_PRICE_MULTIPLIER
  );
  const state = port.goods.get(good.id);
  const multiplier = clamp(
    integratedMultiplier * state.localAbundancePriceMultiplier,
    MIN_INTEGRATED_PRICE_MULTIPLIER * state.localAbundancePriceMultiplier,
    MAX_PRICE_MULTIPLIER
  );
  const midPrice = Math.max(1, good.basePrice * multiplier);
  return {
    midPrice,
    buyPrice: Math.max(1, Math.round(midPrice * PORT_MARKUP)),
    sellPrice: Math.max(1, Math.floor(midPrice * PORT_MARKDOWN))
  };
}

function rawMarketMultiplier(port, good, stock) {
  const state = port.goods.get(good.id);
  const balance = (state.consumptionPerDay - state.productionPerDay) /
    (state.consumptionPerDay + state.productionPerDay + 0.2);
  const comparativeAdvantage = Math.exp(balance * 0.52);
  const scarcity = Math.pow((state.targetStock + 3) / (Math.max(0, stock) + 3), 0.72);
  const localVariation = 0.94 + hashUnit(`${port.id}|${good.id}|price`) * 0.12;
  const regionalTradePriceMultiplier = REGION_TRADE_PRICE_MULTIPLIER[port.cityType]?.[good.id] || 1;
  return clamp(
    comparativeAdvantage * scarcity * localVariation * regionalTradePriceMultiplier,
    MIN_PRICE_MULTIPLIER * Math.min(1, regionalTradePriceMultiplier),
    MAX_PRICE_MULTIPLIER
  );
}

function quoteTransaction(port, good, quantity, stockDirection, priceKey) {
  if (quantity <= 0) return 0;
  if (priceKey === "buyPrice" && Number.isFinite(good.fixedBuyPrice)) {
    return good.fixedBuyPrice * quantity;
  }
  if (priceKey === "sellPrice" && good.sellable === false) {
    throw new Error(`${port.name} does not buy ${good.label}`);
  }
  const state = port.goods.get(good.id);
  const startPrice = marketPrice(port, good, state.stock)[priceKey];
  const endStock = Math.max(0, state.stock + stockDirection * quantity);
  const endPrice = marketPrice(port, good, endStock)[priceKey];
  return Math.max(quantity, Math.round((startPrice + endPrice) * 0.5 * quantity));
}

function maximumAffordablePortPurchaseQuantity(port, good, requestedQuantity, specieBudget) {
  let low = 0;
  let high = requestedQuantity;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const total = quoteTransaction(port, good, middle, 1, "sellPrice");
    if (total <= specieBudget + 1e-6) low = middle;
    else high = middle - 1;
  }
  return low;
}

function mostProfitableTradeLine(originPort, destinationPort, good, maximumQuantity) {
  let low = 1;
  let high = maximumQuantity;
  while (high - low > 6) {
    const left = Math.floor((low * 2 + high) / 3);
    const right = Math.ceil((low + high * 2) / 3);
    if (tradeProfit(originPort, destinationPort, good, left) < tradeProfit(originPort, destinationPort, good, right)) {
      low = left + 1;
    } else {
      high = right - 1;
    }
  }

  let best = null;
  for (let quantity = low; quantity <= high; quantity++) {
    const purchaseTotal = quoteTransaction(originPort, good, quantity, -1, "buyPrice");
    const saleTotal = quoteTransaction(destinationPort, good, quantity, 1, "sellPrice");
    const expectedProfit = saleTotal - purchaseTotal;
    if (!best || expectedProfit > best.expectedProfit) {
      best = { quantity, purchaseTotal, saleTotal, expectedProfit };
    }
  }
  return best?.expectedProfit > 0 ? best : null;
}

function tradeProfit(originPort, destinationPort, good, quantity) {
  return quoteTransaction(destinationPort, good, quantity, 1, "sellPrice") -
    quoteTransaction(originPort, good, quantity, -1, "buyPrice");
}

function requiredPortState(economy, city) {
  assertEconomy(economy);
  const portId = requiredPortId(city);
  const port = economy.portStates.get(portId);
  if (!port) throw new Error(`No economy exists for port tile: ${portId}`);
  return port;
}

function median(sortedValues) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    throw new Error("Cannot calculate a world market median without prices");
  }
  const middle = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 1) return sortedValues[middle];
  return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

function requiredPortId(port) {
  if (!Number.isInteger(port?.tileId) || port.tileId < 0) throw new Error("Economy port requires a tileId");
  return port.tileId;
}

function assertEconomy(economy) {
  if (!economy || economy.version !== 1 || !(economy.portStates instanceof Map) || !economy.shipyards) {
    throw new Error("Invalid world economy");
  }
}

function assertTradeQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Invalid trade quantity: ${quantity}`);
}

function applySalePriceMultiplier(total, multiplier) {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1) {
    throw new Error(`Invalid port sale price multiplier: ${multiplier}`);
  }
  return Math.max(1, Math.round(total * multiplier));
}

function assertCargoCapacity(cargoCapacity) {
  if (!Number.isInteger(cargoCapacity) || cargoCapacity < 0) throw new Error(`Invalid cargo capacity: ${cargoCapacity}`);
}

function stapleDemandRate(category) {
  if (category === "food") return 0.42;
  if (category === "supply") return 0;
  if (category === "staple") return 0.25;
  if (category === "material") return 0.13;
  if (category === "manufactured" || category === "textile") return 0.09;
  if (category === "luxury" || category === "spice") return 0.045;
  if (category === "precious") return 0.018;
  throw new Error(`Unknown trade category: ${category}`);
}

function good(id, label, basePrice, category, options = {}) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid trade good id: ${id}`);
  if (!Number.isInteger(basePrice) || basePrice <= 0) throw new Error(`Invalid base price for ${id}`);
  const unitSize = options.unitSize ?? 1;
  if (!Number.isInteger(unitSize) || unitSize <= 0) throw new Error(`Invalid unit size for ${id}`);
  return Object.freeze({
    id,
    label,
    basePrice,
    category,
    unitSize,
    alwaysAvailable: options.alwaysAvailable === true,
    fixedBuyPrice: Number.isFinite(options.fixedBuyPrice) ? options.fixedBuyPrice : null,
    npcTrade: options.npcTrade !== false,
    sellable: options.sellable !== false
  });
}

function rates(values) {
  for (const [goodId, value] of Object.entries(values)) {
    tradeGoodById(goodId);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid economy rate: ${goodId}=${value}`);
  }
  return Object.freeze(values);
}

function specialty(city, goodIds) {
  for (const goodId of goodIds) tradeGoodById(goodId);
  return [normalizeName(city), Object.freeze(goodIds.slice())];
}

function uniqueMap(entries, label) {
  const map = new Map(entries);
  if (map.size !== entries.length) throw new Error(`${label} contain duplicate keys`);
  return map;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function hashUnit(value) {
  return (hashString32(value) & 0xffff) / 0xffff;
}

function hashString32(value) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
