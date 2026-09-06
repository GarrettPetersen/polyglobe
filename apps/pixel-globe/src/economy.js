import {
  SHIPBUILDING_MATERIAL_GOOD_IDS,
  addWorldShipyardPort,
  advanceWorldShipyards,
  createWorldShipyards,
  fundPlayerShipyard,
  procureShipyardMaterials,
  replaceWorldShipyardPort,
  restoreWorldShipyards,
  shipyardDailyMaterialDemand,
  shipyardAtPort,
  snapshotWorldShipyards,
  worldShipyardHasPort
} from "./shipyards.js";
import { beaverSettlementProductionRate } from "./beaverEcology.js";
import { economyRegionForCity } from "./economyRegions.js";
import { requireCityId } from "./entityIds.js";

const MINUTES_PER_DAY = 24 * 60;
const ECONOMY_STEP_MINUTES = 6 * 60;
const ECONOMY_STEP_DAYS = ECONOMY_STEP_MINUTES / MINUTES_PER_DAY;
export const IWAMI_SILVER_PRODUCTION_START_MINUTE = 4 * 365 * MINUTES_PER_DAY;
export const IWAMI_SILVER_PRODUCTION_PER_DAY = 1.4;
const HISTORICAL_PORT_INDUSTRIES = Object.freeze([
  Object.freeze({
    cityId: "tomogaura|japan",
    goodId: "silver",
    startMinute: IWAMI_SILVER_PRODUCTION_START_MINUTE,
    productionPerDay: IWAMI_SILVER_PRODUCTION_PER_DAY,
    initialStock: 8
  })
]);
const PORT_MARKUP = 1.08;
const PORT_MARKDOWN = 0.9;
const MIN_PRICE_MULTIPLIER = 0.38;
const MIN_INTEGRATED_PRICE_MULTIPLIER = 0.1;
const MAX_PRICE_MULTIPLIER = 5;
const MIN_SPECIE_PRICE_MULTIPLIER = 0.5;
const MAX_SPECIE_PRICE_MULTIPLIER = 1.75;
const SPECIE_PRICE_ELASTICITY = 0.16;
const CITY_MARKET_PRICE_DEPTH_PER_POPULATION_SCALE = 180;
const VILLAGE_MARKET_PRICE_DEPTH_PER_POPULATION_SCALE = 18;
const LEGACY_CITY_TARGET_SPECIE_BASE = 1200;
const LEGACY_CITY_TARGET_SPECIE_PER_POPULATION_SCALE = 4200;
const LEGACY_VILLAGE_TARGET_SPECIE_BASE = 250;
const LEGACY_VILLAGE_TARGET_SPECIE_PER_POPULATION_SCALE = 900;
const NPC_SPECIE_RESERVE_RATIO = 0.15;
const NPC_CARGO_LINE_LIMIT = 4;
const VILLAGE_MARKET_GOOD_LIMIT = 3;
const VILLAGE_PRODUCTION_MULTIPLIER = 0.58;
const VILLAGE_CONSUMPTION_MULTIPLIER = 0.62;
const NEARBY_PORT_MARKET_RADIUS_KM = 2500;
// Nearby markets temper extreme shortages, but local production must retain
// enough price identity to support short- and medium-haul coastal trade.
const NEARBY_PORT_MARKET_INTEGRATION_STRENGTH = 0.42;
const NEARBY_CRITICAL_STOCK_MARKET_INTEGRATION_STRENGTH = 0.9;
const SOURCE_SPICE_ABUNDANCE_PRICE_MULTIPLIER = 0.22;
const SOURCE_GINGER_ABUNDANCE_PRICE_MULTIPLIER = 0.4;
const SOURCE_SPICE_MINIMUM_TARGET_STOCK = 80;
const CRITICAL_STOCK_PRICE_THRESHOLD_RATIO = 0.75;
const CRITICAL_STOCK_PRICE_EXPONENT = 1.25;
const STOCK_FLOAT_EPSILON = 1e-9;
const MINT_FEE_RATE = 0.05;
const SPECIE_METAL_GOOD_IDS = new Set(["gold", "silver"]);
const WORLD_MARKET_MEDIAN_CACHE = new WeakMap();

export const HARDTACK_GOOD_ID = "hardtack";
export const FRESH_WATER_GOOD_ID = "fresh-water";
export const FORAGED_FOOD_GOOD_ID = "foraged-food";
export const RICE_GOOD_ID = "rice";
export const WINE_GOOD_ID = "wine";
export const WHALE_BLUBBER_GOOD_ID = "whale-blubber";
export const BEAVER_PELTS_GOOD_ID = "beaver-pelts";
export const HIDES_GOOD_ID = "hides";
export const CINNAMON_GOOD_ID = "cinnamon";
export const CLOVE_GOOD_ID = "cloves";
export const NUTMEG_GOOD_ID = "nutmeg";
export const GINGER_GOOD_ID = "ginger";
export const INDIGO_GOOD_ID = "indigo";
export const GUNPOWDER_GOOD_ID = "gunpowder";
export const MATCHLOCKS_GOOD_ID = "matchlocks";
export const AMBER_GOOD_ID = "amber";
export const FURS_GOOD_ID = "furs";
export const BEESWAX_GOOD_ID = "beeswax";
export const NAVAL_STORES_GOOD_ID = "naval-stores";
// This stable save key predates the broader shipbuilding abstraction. Player-facing
// text calls it sailcloth so flax canvas, Indian cotton, and Asian bast cloth can
// supply the same yard requirement without rewriting existing cargo and yard saves.
export const SAILCLOTH_GOOD_ID = "linen-cloth";
export const PAPER_GOOD_ID = "paper";
export const LACQUERWARE_GOOD_ID = "lacquerware";
export const GINSENG_GOOD_ID = "ginseng";
export const SULFUR_GOOD_ID = "sulfur";
export const COAL_GOOD_ID = "coal";
export const PRINTED_BOOKS_GOOD_ID = "printed-books";
export const TEA_GOOD_ID = "tea";

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
  good(RICE_GOOD_ID, "Rice", 9, "food", { initialImportStockRatio: 0.08 }),
  good("fish", "Fish", 10, "food"),
  good(WHALE_BLUBBER_GOOD_ID, "Whale Blubber", 240, "material", { npcTrade: false }),
  good(BEAVER_PELTS_GOOD_ID, "Beaver Pelts", 120, "luxury"),
  good(HIDES_GOOD_ID, "Hides", 24, "material", { unitSize: 3 }),
  good("cheese", "Cheese", 14, "food"),
  good(WINE_GOOD_ID, "Wine", 18, "drink"),
  good("olive-oil", "Olive Oil", 16, "food", { initialImportStockRatio: 0 }),
  good("salt", "Salt", 12, "staple", { unitSize: 2 }),
  good("sugar", "Sugar", 20, "food"),
  good("timber", "Timber", 14, "material", { unitSize: 4 }),
  good(COAL_GOOD_ID, "Coal", 8, "material", { unitSize: 4, initialImportStockRatio: 0.08 }),
  good("wool", "Wool", 18, "material", { unitSize: 3 }),
  good("cotton", "Cotton", 20, "material", { unitSize: 3 }),
  good("flax", "Flax", 14, "material", { unitSize: 3 }),
  good("iron", "Iron", 26, "material", { unitSize: 3 }),
  good("copper", "Copper", 30, "material", { unitSize: 3 }),
  good("tin", "Tin", 32, "material", { unitSize: 3 }),
  good(AMBER_GOOD_ID, "Amber", 52, "luxury", { initialImportStockRatio: 0.08 }),
  good(FURS_GOOD_ID, "Furs", 46, "luxury", { unitSize: 2, initialImportStockRatio: 0.08 }),
  good(BEESWAX_GOOD_ID, "Beeswax", 22, "material", { unitSize: 2, initialImportStockRatio: 0.08 }),
  good(NAVAL_STORES_GOOD_ID, "Naval Stores", 18, "material", {
    unitSize: 3,
    initialImportStockRatio: 0.08
  }),
  good(SULFUR_GOOD_ID, "Sulfur", 30, "material", { unitSize: 2, initialImportStockRatio: 0.08 }),
  // Keep the stable id for saves and route bakes; the good is non-firearm weaponry.
  good("arms", "Pikes & Blades", 65, "manufactured", {
    unitSize: 2,
    initialImportStockRatio: 1
  }),
  good(GUNPOWDER_GOOD_ID, "Gunpowder", 44, "manufactured", {
    unitSize: 2,
    initialImportStockRatio: 0.08,
    criticalStockPricing: true
  }),
  good(MATCHLOCKS_GOOD_ID, "Matchlocks", 900, "manufactured", {
    unitSize: 2,
    initialImportStockRatio: 0.08
  }),
  good(SAILCLOTH_GOOD_ID, "Sailcloth", 34, "textile", { unitSize: 2 }),
  good("wool-cloth", "Wool Cloth", 38, "textile", { unitSize: 2 }),
  good("cotton-cloth", "Cotton Cloth", 40, "textile", { unitSize: 2 }),
  good(PAPER_GOOD_ID, "Paper", 28, "manufactured", { unitSize: 2, initialImportStockRatio: 0.08 }),
  good(PRINTED_BOOKS_GOOD_ID, "Printed Books", 52, "manufactured", {
    unitSize: 2,
    initialImportStockRatio: 0.08
  }),
  good("silk", "Silk", 60, "luxury"),
  good("silk-cloth", "Silk Cloth", 85, "luxury"),
  good(LACQUERWARE_GOOD_ID, "Lacquerware", 60, "luxury", {
    unitSize: 2,
    initialImportStockRatio: 0.08
  }),
  good(GINSENG_GOOD_ID, "Ginseng", 72, "luxury", { initialImportStockRatio: 0.08 }),
  good("pepper", "Pepper", 100, "spice"),
  good(CINNAMON_GOOD_ID, "Cinnamon", 150, "spice"),
  good(CLOVE_GOOD_ID, "Cloves", 180, "spice"),
  good(NUTMEG_GOOD_ID, "Nutmeg", 200, "spice"),
  good(GINGER_GOOD_ID, "Ginger", 40, "spice"),
  good(TEA_GOOD_ID, "Tea", 90, "luxury"),
  good("coffee", "Coffee", 40, "luxury"),
  good("cacao", "Cacao", 35, "luxury"),
  good("dyes", "Dyes", 42, "manufactured"),
  good(INDIGO_GOOD_ID, "Indigo", 58, "luxury"),
  good("porcelain", "Porcelain", 70, "luxury", { unitSize: 2 }),
  good("glassware", "Glassware", 62, "luxury", { unitSize: 2 }),
  good("carpets", "Carpets", 65, "luxury", { unitSize: 3 }),
  good("artwork", "Artwork", 90, "luxury", { unitSize: 2 }),
  good("perfume", "Perfume", 58, "luxury"),
  good("ivory", "Ivory", 95, "luxury", { unitSize: 2 }),
  good("silver", "Silver", 110, "precious"),
  good("gold", "Gold", 750, "precious")
]);

const TRADE_GOODS_BY_ID = new Map(TRADE_GOODS.map((item) => [item.id, item]));
if (TRADE_GOODS_BY_ID.size !== TRADE_GOODS.length) throw new Error("Trade goods contain duplicate ids");

const REGION_PRODUCTION = Object.freeze({
  "northern-european": rates({ hardtack: 0.75, fish: 0.38, timber: 0.42, wool: 0.3, flax: 0.22, iron: 0.12, gunpowder: 0.04 }),
  // Grain is the common basin staple. Wine and olive oil come from named
  // producing districts so they create trade routes instead of appearing as
  // interchangeable native cargo in every Mediterranean market.
  mediterranean: rates({ hardtack: 0.7, grain: 0.52, fish: 0.32, salt: 0.12, gunpowder: 0.06 }),
  "islamic-desert": rates({ hardtack: 0.55, cotton: 0.38, "cotton-cloth": 0.16, carpets: 0.14, perfume: 0.1, gunpowder: 0.05 }),
  "east-asian": rates({ hardtack: 0.55, grain: 0.2, rice: 0.72 }),
  "south-asian": rates({ hardtack: 0.6, grain: 0.3, rice: 0.52, cotton: 0.48, "cotton-cloth": 0.2, ginger: 0.12, dyes: 0.16, sugar: 0.12, gunpowder: 0.03 }),
  "southeast-asian": rates({ hardtack: 0.55, rice: 0.68, fish: 0.5, timber: 0.4, sugar: 0.22, ginger: 0.18, dyes: 0.1, indigo: 0.08, gunpowder: 0.02 }),
  polynesian: rates({ hardtack: 0.35, fish: 1.4, timber: 0.75, sugar: 0.55, dyes: 0.25, artwork: 0.3 }),
  mesoamerican: rates({
    hardtack: 0.45,
    grain: 0.85,
    fish: 0.22,
    salt: 0.16,
    cotton: 0.42,
    dyes: 0.38
  }),
  "native-north-american": rates({
    hardtack: 0.38,
    grain: 0.72,
    fish: 0.68,
    timber: 0.72,
    furs: 0.34
  }),
  "caribbean-indigenous": rates({
    hardtack: 0.4,
    grain: 0.62,
    fish: 0.86,
    salt: 0.3,
    timber: 0.28,
    cotton: 0.52,
    artwork: 0.18
  }),
  caribbean: rates({
    hardtack: 0.5,
    grain: 0.58,
    fish: 0.58,
    salt: 0.18,
    sugar: 0.48,
    timber: 0.24,
    cotton: 0.32,
    indigo: 0.28,
    hides: 0.38
  }),
  "brazilian-coast": rates({
    hardtack: 0.42,
    grain: 0.5,
    fish: 0.7,
    timber: 0.9,
    cotton: 0.18,
    dyes: 0.72
  }),
  "rio-de-la-plata": rates({
    hardtack: 0.5,
    grain: 0.76,
    fish: 0.44,
    salt: 0.14,
    wool: 0.24,
    hides: 0.82
  }),
  "temperate-american-colony": rates({
    hardtack: 0.52,
    grain: 0.7,
    fish: 0.68,
    timber: 0.72,
    flax: 0.16,
    furs: 0.2
  }),
  "tropical-american-colony": rates({
    hardtack: 0.46,
    grain: 0.64,
    fish: 0.6,
    timber: 0.34,
    cotton: 0.28,
    hides: 0.42,
    dyes: 0.12
  }),
  "atlantic-island-colony": rates({
    hardtack: 0.44,
    grain: 0.38,
    fish: 0.88,
    salt: 0.34,
    timber: 0.64
  }),
  andean: rates({ hardtack: 0.4, grain: 0.45, wool: 0.6, copper: 0.55, dyes: 0.2 }),
  "andean-coast": rates({
    hardtack: 0.42,
    grain: 0.5,
    fish: 0.88,
    salt: 0.16,
    cotton: 0.68,
    copper: 0.24,
    dyes: 0.24
  }),
  "sub-saharan": rates({ hardtack: 0.45, grain: 0.45, timber: 0.45, ivory: 0.8, dyes: 0.35, salt: 0.3 })
});

const REGION_DEMAND = Object.freeze({
  "northern-european": rates({ arms: 0.12, wine: 0.65, "olive-oil": 0.5, "beaver-pelts": 0.6, hides: 0.4, pepper: 0.55, cinnamon: 0.5, cloves: 0.65, nutmeg: 0.7, ginger: 0.38, indigo: 0.34, tea: 0.45, porcelain: 0.4, silk: 0.35 }),
  mediterranean: rates({ arms: 0.12, timber: 0.55, iron: 0.35, "beaver-pelts": 0.38, hides: 0.32, pepper: 0.35, cinnamon: 0.3, cloves: 0.4, nutmeg: 0.42, ginger: 0.24, indigo: 0.2, silk: 0.3, ivory: 0.18 }),
  "islamic-desert": rates({ arms: 0.12, timber: 0.65, iron: 0.3, wool: 0.25, "beaver-pelts": 0.18, pepper: 0.12, cinnamon: 0.12, cloves: 0.14, nutmeg: 0.16, ginger: 0.08, tea: 0.2, porcelain: 0.22, ivory: 0.15 }),
  "east-asian": rates({ arms: 0.12, "beaver-pelts": 0.3, pepper: 0.25, cinnamon: 0.12, cloves: 0.22, nutmeg: 0.18, silver: 0.55, glassware: 0.25, wool: 0.2, gunpowder: 0.12, matchlocks: 0.42 }),
  "south-asian": rates({ cloves: 0.12, nutmeg: 0.12, silver: 0.4, gold: 0.15, porcelain: 0.2, silk: 0.2, arms: 0.18, gunpowder: 0.1, matchlocks: 0.18 }),
  "southeast-asian": rates({ pepper: 0.12, cinnamon: 0.16, cotton: 0.35, "cotton-cloth": 0.3, silver: 0.4, porcelain: 0.2, arms: 0.16, gunpowder: 0.12, matchlocks: 0.22 }),
  polynesian: rates({ iron: 0.65, arms: 0.45, matchlocks: 0.4, gunpowder: 0.35, "cotton-cloth": 0.45, glassware: 0.35, salt: 0.25 }),
  mesoamerican: rates({ iron: 0.7, arms: 0.55, matchlocks: 0.5, gunpowder: 0.4, "cotton-cloth": 0.3, glassware: 0.3, wine: 0.2 }),
  "native-north-american": rates({
    iron: 0.7,
    arms: 0.52,
    matchlocks: 0.42,
    gunpowder: 0.34,
    "wool-cloth": 0.34,
    "cotton-cloth": 0.34,
    glassware: 0.3,
    salt: 0.22
  }),
  "caribbean-indigenous": rates({
    iron: 0.7,
    arms: 0.48,
    matchlocks: 0.42,
    gunpowder: 0.34,
    "cotton-cloth": 0.3,
    glassware: 0.32,
    wine: 0.2
  }),
  caribbean: rates({
    iron: 0.42,
    arms: 0.3,
    "linen-cloth": 0.28,
    "wool-cloth": 0.24,
    wine: 0.24,
    "olive-oil": 0.2,
    timber: 0.18
  }),
  "brazilian-coast": rates({
    iron: 0.62,
    arms: 0.4,
    "linen-cloth": 0.35,
    "cotton-cloth": 0.34,
    glassware: 0.28,
    salt: 0.3
  }),
  "rio-de-la-plata": rates({
    iron: 0.5,
    arms: 0.42,
    matchlocks: 0.38,
    gunpowder: 0.34,
    "linen-cloth": 0.32,
    "wool-cloth": 0.3,
    wine: 0.22,
    "olive-oil": 0.18,
    glassware: 0.26
  }),
  "temperate-american-colony": rates({
    iron: 0.46,
    arms: 0.38,
    matchlocks: 0.34,
    gunpowder: 0.3,
    "linen-cloth": 0.32,
    "wool-cloth": 0.3,
    wine: 0.28,
    "olive-oil": 0.2,
    salt: 0.18,
    glassware: 0.24
  }),
  "tropical-american-colony": rates({
    iron: 0.5,
    arms: 0.42,
    matchlocks: 0.36,
    gunpowder: 0.32,
    "linen-cloth": 0.34,
    "wool-cloth": 0.28,
    wine: 0.22,
    "olive-oil": 0.18,
    salt: 0.22,
    glassware: 0.28
  }),
  "atlantic-island-colony": rates({
    grain: 0.24,
    iron: 0.56,
    arms: 0.38,
    matchlocks: 0.34,
    gunpowder: 0.3,
    "linen-cloth": 0.34,
    "wool-cloth": 0.32,
    wine: 0.26,
    "olive-oil": 0.2,
    glassware: 0.26
  }),
  andean: rates({ iron: 0.55, arms: 0.5, matchlocks: 0.45, gunpowder: 0.4, "cotton-cloth": 0.3, wine: 0.2, salt: 0.2 }),
  "andean-coast": rates({
    iron: 0.55,
    arms: 0.5,
    matchlocks: 0.45,
    gunpowder: 0.4,
    "wool-cloth": 0.26,
    glassware: 0.24,
    wine: 0.18
  }),
  "sub-saharan": rates({ "cotton-cloth": 0.5, iron: 0.45, arms: 0.35, matchlocks: 0.3, gunpowder: 0.25, salt: 0.35, glassware: 0.3 })
});

const REGION_TRADE_PRICE_MULTIPLIER = Object.freeze({
  "northern-european": rates({
    "beaver-pelts": 2.6,
    hides: 1.45,
    pepper: 2.35,
    cinnamon: 4.2,
    cloves: 3.5,
    nutmeg: 3.8,
    ginger: 2.35,
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
    hides: 1.3,
    pepper: 2.05,
    cinnamon: 3.9,
    cloves: 3.15,
    nutmeg: 3.45,
    ginger: 2.05,
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
    ginger: 0.3,
    tea: 1.2,
    porcelain: 1.25,
    silver: 1.2,
    glassware: 1.15
  }),
  "east-asian": rates({ "beaver-pelts": 1.5, pepper: 0.75, cinnamon: 0.75, cloves: 0.7, nutmeg: 0.7, silver: 1.55, gold: 1.15, arms: 1.2, gunpowder: 1.15, matchlocks: 1.75, glassware: 1.35, "wool-cloth": 1.2 }),
  "south-asian": rates({ pepper: 0.52, cinnamon: 0.3, silver: 1.45, gold: 1.15, arms: 1.2, gunpowder: 1.15, matchlocks: 1.35, glassware: 1.25, porcelain: 1.15 }),
  "southeast-asian": rates({ pepper: 0.5, cinnamon: 0.65, cloves: 0.48, nutmeg: 0.48, ginger: 0.42, silver: 1.5, gold: 1.15, arms: 1.25, gunpowder: 1.2, matchlocks: 1.45, glassware: 1.25, "cotton-cloth": 1.15 }),
  polynesian: rates({ iron: 1.4, arms: 1.35, gunpowder: 1.4, matchlocks: 1.65, glassware: 1.35, "cotton-cloth": 1.3, salt: 1.2 }),
  mesoamerican: rates({ arms: 1.35, gunpowder: 1.45, matchlocks: 1.7, iron: 1.25, glassware: 1.25, "cotton-cloth": 1.2, wine: 1.15 }),
  "native-north-american": rates({
    "beaver-pelts": 0.55,
    furs: 0.68,
    fish: 0.72,
    timber: 0.76,
    arms: 1.4,
    gunpowder: 1.48,
    matchlocks: 1.7,
    iron: 1.32,
    glassware: 1.3,
    "wool-cloth": 1.25,
    "cotton-cloth": 1.25,
    salt: 1.16
  }),
  "caribbean-indigenous": rates({
    fish: 0.7,
    salt: 0.74,
    cotton: 0.7,
    artwork: 0.78,
    arms: 1.42,
    gunpowder: 1.48,
    matchlocks: 1.72,
    iron: 1.34,
    glassware: 1.3,
    wine: 1.2
  }),
  caribbean: rates({
    sugar: 0.7,
    indigo: 0.72,
    cotton: 0.82,
    arms: 1.2,
    iron: 1.18,
    wine: 1.16,
    "olive-oil": 1.14,
    "linen-cloth": 1.14,
    "wool-cloth": 1.16
  }),
  "brazilian-coast": rates({
    timber: 0.68,
    dyes: 0.62,
    cotton: 0.84,
    arms: 1.32,
    iron: 1.28,
    glassware: 1.24,
    "linen-cloth": 1.22,
    "cotton-cloth": 1.2,
    salt: 1.18
  }),
  "rio-de-la-plata": rates({
    hides: 0.58,
    grain: 0.78,
    wool: 0.86,
    arms: 1.3,
    gunpowder: 1.38,
    matchlocks: 1.58,
    iron: 1.24,
    glassware: 1.2,
    "linen-cloth": 1.18,
    "wool-cloth": 1.2,
    wine: 1.12,
    "olive-oil": 1.12
  }),
  "temperate-american-colony": rates({
    fish: 0.76,
    timber: 0.74,
    furs: 0.68,
    flax: 0.82,
    arms: 1.3,
    gunpowder: 1.38,
    matchlocks: 1.58,
    iron: 1.24,
    glassware: 1.2,
    "linen-cloth": 1.16,
    "wool-cloth": 1.18,
    wine: 1.12,
    "olive-oil": 1.1
  }),
  "tropical-american-colony": rates({
    hides: 0.72,
    cotton: 0.8,
    timber: 0.84,
    arms: 1.3,
    gunpowder: 1.38,
    matchlocks: 1.58,
    iron: 1.24,
    glassware: 1.2,
    "linen-cloth": 1.16,
    "wool-cloth": 1.18,
    wine: 1.12,
    "olive-oil": 1.1
  }),
  "atlantic-island-colony": rates({
    fish: 0.72,
    timber: 0.68,
    salt: 0.72,
    arms: 1.32,
    gunpowder: 1.4,
    matchlocks: 1.6,
    iron: 1.28,
    glassware: 1.22,
    "linen-cloth": 1.18,
    "wool-cloth": 1.2,
    wine: 1.14,
    "olive-oil": 1.12
  }),
  andean: rates({ arms: 1.35, gunpowder: 1.4, matchlocks: 1.65, iron: 1.25, glassware: 1.2, "cotton-cloth": 1.2, wine: 1.15 }),
  "andean-coast": rates({
    fish: 0.72,
    cotton: 0.68,
    arms: 1.35,
    gunpowder: 1.4,
    matchlocks: 1.65,
    iron: 1.25,
    glassware: 1.2,
    "wool-cloth": 1.18,
    wine: 1.15
  }),
  "sub-saharan": rates({ arms: 1.25, gunpowder: 1.3, matchlocks: 1.5, iron: 1.2, glassware: 1.2, "cotton-cloth": 1.2, salt: 1.15 })
});

const CITY_SPECIALTIES = uniqueMap([
  specialty("lisbon|portugal", ["salt", GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID]),
  specialty("london|united kingdom", ["wool", "wool-cloth", "arms"]),
  // Established medieval coalfields; later industrial basins are intentionally absent in 1522.
  specialty("edinburgh|united kingdom", [COAL_GOOD_ID]),
  specialty("brugge|belgium", ["wool-cloth"]),
  specialty("gent|belgium", ["wool-cloth", "linen-cloth"]),
  specialty("liege|belgium", [COAL_GOOD_ID]),
  specialty("norwich|united kingdom", ["wool-cloth"]),
  specialty("exeter|united kingdom", ["tin", "wool-cloth"]),
  specialty("topsham|united kingdom", ["tin", "wool-cloth"]),
  specialty("bristol|united kingdom", ["wool-cloth"]),
  specialty("southampton|united kingdom", ["wool", "wool-cloth"]),
  specialty("york|united kingdom", ["grain", "wool"]),
  specialty("hull|united kingdom", ["wool-cloth"]),
  specialty("newcastle upon tyne|united kingdom", [COAL_GOOD_ID, "wool", "salt", "timber"]),
  specialty("gdansk|poland", ["grain", AMBER_GOOD_ID]),
  specialty("szczecin|poland", ["grain", "timber", NAVAL_STORES_GOOD_ID]),
  specialty("riga|russian federation", ["flax", BEESWAX_GOOD_ID, NAVAL_STORES_GOOD_ID]),
  specialty("stockholm|sweden", ["iron", "copper", NAVAL_STORES_GOOD_ID]),
  specialty("gavle|sweden", ["fish", "timber", NAVAL_STORES_GOOD_ID]),
  specialty("nykoping|sweden", ["iron", "timber", NAVAL_STORES_GOOD_ID]),
  specialty("soderkoping|sweden", ["iron", "copper", NAVAL_STORES_GOOD_ID]),
  specialty("kalmar|sweden", ["grain", "fish", NAVAL_STORES_GOOD_ID]),
  specialty("visby|sweden", ["grain", "wool", "fish"]),
  specialty("turku|finland", ["fish", "timber", FURS_GOOD_ID]),
  specialty("novgorod|russian federation", [FURS_GOOD_ID, BEESWAX_GOOD_ID]),
  specialty("pskov|russian federation", [FURS_GOOD_ID, BEESWAX_GOOD_ID]),
  specialty("kholmogory|russian federation", ["fish", FURS_GOOD_ID, BEESWAX_GOOD_ID]),
  specialty("lubeck|germany", ["salt", "fish"]),
  specialty("copenhagen|denmark", ["fish", "salt"]),
  specialty("krakow|poland", ["salt"]),
  specialty("venice|italy", ["glassware", PRINTED_BOOKS_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("genova|italy", [WINE_GOOD_ID, "wool-cloth", "arms"]),
  specialty("bologna|italy", [PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID]),
  specialty("milan|italy", ["arms", "silk-cloth"]),
  specialty("rome|italy", ["artwork", PRINTED_BOOKS_GOOD_ID]),
  specialty("nurnberg|germany", ["arms", PRINTED_BOOKS_GOOD_ID]),
  specialty("mainz|germany", [PRINTED_BOOKS_GOOD_ID]),
  specialty("leipzig|germany", [PRINTED_BOOKS_GOOD_ID]),
  specialty("paris|france", [PRINTED_BOOKS_GOOD_ID, "artwork"]),
  specialty("alexandria|egypt", ["flax", "cotton-cloth"]),
  specialty("istanbul|turkey", ["carpets", GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID]),
  specialty("tabriz|iran", ["carpets", GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID]),
  specialty("baghdad|iraq", ["grain", "cotton-cloth", "carpets"]),
  specialty("cairo|egypt", ["carpets", PAPER_GOOD_ID, "artwork"]),
  specialty("goa|india", ["pepper", GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID]),
  specialty("colombo|sri lanka", [CINNAMON_GOOD_ID]),
  specialty("aden|yemen", ["coffee"]),
  specialty("jeddah|saudi arabia", ["coffee"]),
  specialty("calicut|india", ["pepper"]),
  specialty("cochin|india", ["pepper"]),
  specialty("diu|india", ["cotton-cloth"]),
  specialty("surat|india", ["cotton-cloth"]),
  specialty("ahmedabad|india", [INDIGO_GOOD_ID]),
  specialty("malacca|malaysia", ["pepper", GINGER_GOOD_ID]),
  specialty("aceh|indonesia", ["pepper", GINGER_GOOD_ID]),
  specialty("quilon|india", ["pepper"]),
  specialty("patani|thailand", ["pepper", GINGER_GOOD_ID]),
  specialty("ternate|indonesia", [CLOVE_GOOD_ID]),
  specialty("tidore|indonesia", [CLOVE_GOOD_ID]),
  specialty("banda village|indonesia", [NUTMEG_GOOD_ID]),
  specialty("makian village|indonesia", [CLOVE_GOOD_ID]),
  specialty("gane village|indonesia", ["fish", "timber", NAVAL_STORES_GOOD_ID]),
  specialty("buru village|indonesia", ["fish", "timber", BEESWAX_GOOD_ID]),
  specialty("sofala|mozambique", ["gold"]),
  specialty("mozambique|mozambique", ["gold", "ivory"]),
  specialty("mombasa|kenya", ["ivory"]),
  specialty("mogadishu|somalia", ["cotton-cloth", "ivory"]),
  specialty("santo domingo|dominican republic", ["sugar", INDIGO_GOOD_ID, "gold", HIDES_GOOD_ID]),
  specialty("havana|cuba", ["sugar", INDIGO_GOOD_ID, "gold", HIDES_GOOD_ID]),
  specialty("veracruz|mexico", ["cacao", "gold"]),
  specialty("nombre de dios|panama", ["gold"]),
  specialty("panama city|panama", ["gold"]),
  specialty("beijing|china", [COAL_GOOD_ID, PRINTED_BOOKS_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("taiyuan|china", [COAL_GOOD_ID]),
  specialty("hangzhou|china", [RICE_GOOD_ID, "silk", "silk-cloth"]),
  specialty("suzhou|china", ["silk", "silk-cloth"]),
  specialty("jingdezhen|china", ["porcelain"]),
  specialty("guangzhou|china", ["porcelain", "silk", "tea", GINGER_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("fuzhou|china", ["tea", PAPER_GOOD_ID, "porcelain"]),
  specialty("tsinkiang|china", ["tea", "porcelain"]),
  specialty("nanjing|china", [RICE_GOOD_ID, "silk-cloth", PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("chengdu|china", ["silk", PAPER_GOOD_ID]),
  specialty("kaifeng|china", [PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID]),
  specialty("xian|china", [PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID]),
  specialty("changsha|china", [RICE_GOOD_ID, "tea"]),
  specialty("ayutthaya|thailand", [RICE_GOOD_ID]),
  specialty("pegu|myanmar", [RICE_GOOD_ID]),
  specialty("kaesong|dem. people's republic of korea", [GINSENG_GOOD_ID, PAPER_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("seoul|republic of korea", [GINSENG_GOOD_ID, PAPER_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("gyeongju|republic of korea", [PAPER_GOOD_ID, LACQUERWARE_GOOD_ID]),
  specialty("kyoto|japan", ["silk-cloth", LACQUERWARE_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("sakai|japan", ["arms", LACQUERWARE_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("yamaguchi|japan", ["silver", SULFUR_GOOD_ID]),
  specialty("fukuoka|japan", [SULFUR_GOOD_ID]),
  specialty("kagoshima|japan", [SULFUR_GOOD_ID]),
  specialty("nagasaki|japan", ["silver"]),
  specialty("lima|peru", ["fish", "cotton"]),
  specialty("recife|brazil", ["sugar"]),
  specialty("salvador|brazil", ["sugar"]),
  specialty("asuncion|paraguay", ["grain", HIDES_GOOD_ID, "cotton"]),
  specialty("santiago|chile", ["grain", "wool", "copper"]),
  specialty("concepcion|chile", ["grain", "fish", "timber"]),
  specialty("potosi|bolivia", ["silver"]),
  specialty("zacatecas|mexico", ["silver"]),
  specialty("caracas|venezuela", ["grain", HIDES_GOOD_ID, "cotton"]),
  specialty("buenos aires|argentina", [HIDES_GOOD_ID, "grain"]),
  specialty("st. john's|canada", ["fish"]),
  specialty("st. george's|bermuda", ["timber", "salt"]),
  specialty("mexico city|mexico", ["cacao", "gold"]),
  specialty("texcoco|mexico", ["grain", "salt"]),
  specialty("cholula|mexico", ["cotton", "dyes"]),
  specialty("tzintzuntzan|mexico", ["copper"]),
  specialty("merida|mexico", ["cotton", "salt"]),
  specialty("zempoala|mexico", ["cotton"]),
  specialty("guatemala city|guatemala", ["cacao", "cotton", "dyes"]),
  specialty("gumarcaj|guatemala", ["cacao", "cotton", "dyes"]),
  specialty("bogota|columbia", ["gold", "salt", "cotton"]),
  specialty("quito|ecuador", ["cotton", "dyes"]),
  specialty("riobamba|ecuador", ["grain", "wool"]),
  specialty("chanchan|peru", ["fish", "cotton"]),
  specialty("arequipa|peru", ["wool", "copper"]),
  specialty("cuzco|peru", ["wool", "silver", "gold"]),
  specialty("gao|mali", ["gold", "salt"]),
  specialty("tombouctou|mali", ["gold", "salt"]),
  specialty("fez|morocco", ["carpets", "dyes"]),
  specialty("naples|italy", ["cheese", WINE_GOOD_ID]),
  specialty("edirne|turkey", ["grain", HIDES_GOOD_ID]),
  specialty("tunis|tunisia", ["grain", "olive-oil", HIDES_GOOD_ID]),
  specialty("palermo|italy", ["grain", "sugar"]),
  specialty("valencia|spain", [RICE_GOOD_ID, "silk-cloth"]),
  specialty("thessaloniki|greece", ["grain", "wool"]),
  specialty("bejaia|algeria", [BEESWAX_GOOD_ID, "timber", HIDES_GOOD_ID]),
  specialty("athens|greece", [WINE_GOOD_ID, "olive-oil"]),
  specialty("feodosia|russian federation", ["grain", HIDES_GOOD_ID, "salt"]),
  specialty("barcelona|spain", ["wool-cloth", "arms"]),
  specialty("trabzon|turkey", ["silk", "copper"]),
  specialty("granada|spain", ["silk", "sugar"]),
  specialty("algiers|algeria", ["grain", HIDES_GOOD_ID]),
  specialty("nicosia|cyprus", [WINE_GOOD_ID, "sugar", "copper"]),
  specialty("palma|spain", ["salt", "wool"]),
  specialty("tripoli|libya", ["salt", HIDES_GOOD_ID, "carpets"]),
  specialty("syracuse|italy", ["grain", "salt"]),
  specialty("cagliari|italy", ["salt", "wool"]),
  specialty("ragusa|croatia", ["grain", "salt", "wool"]),
  specialty("rhodes|greece", [WINE_GOOD_ID, "sugar"]),
  specialty("iraklion|greece", [WINE_GOOD_ID, "olive-oil"]),
  specialty("pisa|italy", [SAILCLOTH_GOOD_ID, "wool-cloth"]),
  specialty("kerkira|greece", ["olive-oil"]),
  specialty("salerno|italy", ["cheese", WINE_GOOD_ID]),
  specialty("gelibolu|turkey", ["timber", NAVAL_STORES_GOOD_ID]),
  specialty("braila|romania", ["grain", "timber"]),
  specialty("ceuta|morocco", [HIDES_GOOD_ID, "ivory"]),
  specialty("montpellier|france", ["wool-cloth", WINE_GOOD_ID]),
  specialty("bursa|turkey", ["silk", "silk-cloth"]),
  specialty("smolensk|russian federation", ["timber", FURS_GOOD_ID, BEESWAX_GOOD_ID]),
  specialty("birgu|malta", ["salt", "arms"]),
  specialty("galati|romania", ["grain", "timber"]),
  specialty("suez|egypt", ["salt"]),
  specialty("bastia|italy", ["timber", WINE_GOOD_ID]),
  specialty("mudanya|turkey", ["silk"]),
  specialty("lyon|france", [PRINTED_BOOKS_GOOD_ID, "wool-cloth"]),
  specialty("jaffa|israel", ["cotton", "dyes"]),
  specialty("verona|italy", ["wool-cloth"]),
  specialty("cremona|italy", ["wool-cloth", "arms"]),
  specialty("vienna|austria", ["iron", "arms"]),
  specialty("augsberg|germany", ["copper", "silver"]),
  specialty("belgrade|serbia", ["grain", "timber"]),
  specialty("messina|italy", ["silk", "sugar"]),
  specialty("plovdiv|bulgaria", ["grain", "dyes"]),
  specialty("bakhchiserai|ukraine", ["grain", HIDES_GOOD_ID]),
  specialty("budapest|hungary", ["grain", "copper"]),
  specialty("shkoder|albania", ["timber", "wool"]),
  specialty("zaragoza|spain", ["wool", "arms"]),
  specialty("dongola|sudan", ["gold", "ivory"]),
  specialty("almeria|spain", ["silk"]),
  specialty("avignon|france", [PAPER_GOOD_ID, "artwork"]),
  specialty("kazan|russian federation", [FURS_GOOD_ID, HIDES_GOOD_ID]),
  specialty("regensburg|germany", ["salt", "arms"]),
  specialty("kiev|ukraine", ["grain", FURS_GOOD_ID, BEESWAX_GOOD_ID]),
  specialty("jerusalem|israel", ["artwork", "perfume"]),
  specialty("ohrid|bulgaria", ["wool"]),
  specialty("antioch|syria/turkey", ["cotton", "silk", "dyes"]),
  specialty("bordeaux|france", ["wine"]),
  specialty("marseille|france", ["perfume"]),
  specialty("florence|italy", ["wool-cloth", "artwork"]),
  specialty("seville|spain", ["olive-oil", "wine"])
], "city specialties");

const SHIPBUILDING_CITY_SPECIALTIES = uniqueMap([
  canonicalSpecialty("gent|belgium", [SAILCLOTH_GOOD_ID]),
  canonicalSpecialty("rouen|france", [SAILCLOTH_GOOD_ID]),
  canonicalSpecialty("riga|russian federation", [SAILCLOTH_GOOD_ID, NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("venice|italy", [SAILCLOTH_GOOD_ID, NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("ragusa|croatia", ["timber", NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("gelibolu|turkey", ["timber", NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("lisbon|portugal", ["timber", SAILCLOTH_GOOD_ID, NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("bristol|united kingdom", ["timber", "iron"]),
  canonicalSpecialty("alexandria|egypt", [SAILCLOTH_GOOD_ID]),
  canonicalSpecialty("cambay|india", ["timber", "iron", SAILCLOTH_GOOD_ID, NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("cochin|india", ["timber", NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("calicut|india", ["timber", SAILCLOTH_GOOD_ID, NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("kilwa|tanzania", ["timber", NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("nanjing|china", ["timber", "iron", SAILCLOTH_GOOD_ID, NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("fuzhou|china", ["timber", NAVAL_STORES_GOOD_ID]),
  canonicalSpecialty("yamaguchi|japan", ["iron"]),
  canonicalSpecialty("malacca|malaysia", [SAILCLOTH_GOOD_ID, NAVAL_STORES_GOOD_ID])
], "canonical shipbuilding city specialties");

const CITY_DEMANDS = uniqueMap([
  // Urban fuel, salt boiling, brewing, and other heat-intensive trades—not later coke smelting.
  cityRates("london|united kingdom", {
    grain: 0.35,
    timber: 0.24,
    [COAL_GOOD_ID]: 0.34,
    [AMBER_GOOD_ID]: 0.16,
    [FURS_GOOD_ID]: 0.16
  }),
  cityRates("edinburgh|united kingdom", { [COAL_GOOD_ID]: 0.28 }),
  cityRates("bristol|united kingdom", { wine: 0.28, iron: 0.16, "olive-oil": 0.12, [NAVAL_STORES_GOOD_ID]: 0.12 }),
  cityRates("southampton|united kingdom", { wine: 0.28, dyes: 0.18, "olive-oil": 0.12 }),
  cityRates("hull|united kingdom", { timber: 0.2, flax: 0.18, wine: 0.14, [COAL_GOOD_ID]: 0.2 }),
  cityRates("newcastle upon tyne|united kingdom", { [COAL_GOOD_ID]: 0.18 }),
  cityRates("brugge|belgium", {
    grain: 0.3,
    [COAL_GOOD_ID]: 0.22,
    [AMBER_GOOD_ID]: 0.14,
    [BEESWAX_GOOD_ID]: 0.14
  }),
  cityRates("gent|belgium", { grain: 0.28, flax: 0.22, [COAL_GOOD_ID]: 0.24, [BEESWAX_GOOD_ID]: 0.12 }),
  cityRates("liege|belgium", { [COAL_GOOD_ID]: 0.22 }),
  cityRates("lubeck|germany", { grain: 0.28, timber: 0.22, [AMBER_GOOD_ID]: 0.16, [FURS_GOOD_ID]: 0.14, [BEESWAX_GOOD_ID]: 0.14 }),
  cityRates("hamburg|germany", { grain: 0.28, timber: 0.2, [NAVAL_STORES_GOOD_ID]: 0.16, [FURS_GOOD_ID]: 0.12 }),
  cityRates("bremen|germany", { grain: 0.24, timber: 0.2, [NAVAL_STORES_GOOD_ID]: 0.16 }),
  cityRates("gdansk|poland", { "wool-cloth": 0.24, salt: 0.2, wine: 0.16, [PRINTED_BOOKS_GOOD_ID]: 0.1 }),
  cityRates("riga|russian federation", { "wool-cloth": 0.22, salt: 0.2, wine: 0.14, arms: 0.12 }),
  cityRates("stockholm|sweden", { grain: 0.26, "wool-cloth": 0.2, salt: 0.16, wine: 0.14 }),
  cityRates("gavle|sweden", { grain: 0.24, "wool-cloth": 0.2, salt: 0.2, wine: 0.12 }),
  cityRates("nykoping|sweden", { grain: 0.22, "wool-cloth": 0.2, salt: 0.18, wine: 0.14 }),
  cityRates("soderkoping|sweden", { grain: 0.26, "wool-cloth": 0.22, salt: 0.2, wine: 0.14 }),
  cityRates("kalmar|sweden", { iron: 0.2, copper: 0.16, "wool-cloth": 0.18, wine: 0.14 }),
  cityRates("visby|sweden", { iron: 0.18, timber: 0.18, salt: 0.16, wine: 0.14 }),
  cityRates("turku|finland", { grain: 0.24, "wool-cloth": 0.22, salt: 0.2, wine: 0.14 }),
  cityRates("novgorod|russian federation", { "wool-cloth": 0.25, salt: 0.22, wine: 0.15, [AMBER_GOOD_ID]: 0.1 }),
  cityRates("pskov|russian federation", { "wool-cloth": 0.22, salt: 0.2, wine: 0.14 }),
  cityRates("venice|italy", {
    grain: 0.3,
    timber: 0.22,
    cotton: 0.2,
    silk: 0.22,
    hides: 0.14
  }),
  cityRates("genova|italy", { grain: 0.24, silk: 0.18, sugar: 0.14 }),
  cityRates("marseille|france", { [BEESWAX_GOOD_ID]: 0.2, silk: 0.14, "olive-oil": 0.12 }),
  cityRates("istanbul|turkey", { grain: 0.26, glassware: 0.2, [PAPER_GOOD_ID]: 0.16 }),
  cityRates("alexandria|egypt", { timber: 0.22, glassware: 0.16 }),
  cityRates("cairo|egypt", { timber: 0.18, glassware: 0.14 }),
  cityRates("barcelona|spain", { silk: 0.16, sugar: 0.12 }),
  cityRates("beijing|china", {
    silver: 0.24,
    [COAL_GOOD_ID]: 0.32,
    [GINSENG_GOOD_ID]: 0.18,
    [LACQUERWARE_GOOD_ID]: 0.12
  }),
  cityRates("taiyuan|china", { [COAL_GOOD_ID]: 0.14 }),
  cityRates("nanjing|china", { silver: 0.22, [GINSENG_GOOD_ID]: 0.14, [LACQUERWARE_GOOD_ID]: 0.12 }),
  cityRates("hangzhou|china", { silver: 0.22, [GINSENG_GOOD_ID]: 0.13, [LACQUERWARE_GOOD_ID]: 0.12 }),
  cityRates("guangzhou|china", { silver: 0.24, [GINSENG_GOOD_ID]: 0.12, [LACQUERWARE_GOOD_ID]: 0.1 }),
  cityRates("kaesong|dem. people's republic of korea", {
    silk: 0.2,
    porcelain: 0.2,
    [LACQUERWARE_GOOD_ID]: 0.22,
    [SULFUR_GOOD_ID]: 0.12
  }),
  cityRates("seoul|republic of korea", {
    silk: 0.2,
    porcelain: 0.2,
    [LACQUERWARE_GOOD_ID]: 0.22,
    [SULFUR_GOOD_ID]: 0.12
  }),
  cityRates("kyoto|japan", { silk: 0.22, porcelain: 0.18, [GINSENG_GOOD_ID]: 0.18, [SULFUR_GOOD_ID]: 0.1 }),
  cityRates("sakai|japan", { silk: 0.18, porcelain: 0.18, [GINSENG_GOOD_ID]: 0.14, [SULFUR_GOOD_ID]: 0.12 }),
  cityRates("kagoshima|japan", { silk: 0.16, porcelain: 0.16, [GINSENG_GOOD_ID]: 0.12 })
], "city demands");

// Major commercial mints operating in 1522. Later colonial mints are intentionally excluded.
const MINT_CITY_IDS_1522 = new Set([
  "cairo|egypt",
  "fez|morocco",
  "genova|italy",
  "goa|india",
  "istanbul|turkey",
  "lisbon|portugal",
  "london|united kingdom",
  "seville|spain",
  "venice|italy"
]);

const PRODUCTION_INPUTS = Object.freeze({
  arms: rates({ iron: 0.8, timber: 0.25 }),
  matchlocks: rates({ iron: 0.75, timber: 0.2, gunpowder: 0.05 }),
  "linen-cloth": rates({ flax: 0.8 }),
  "wool-cloth": rates({ wool: 0.8 }),
  "cotton-cloth": rates({ cotton: 0.8 }),
  "silk-cloth": rates({ silk: 0.75, dyes: 0.1 }),
  "printed-books": rates({ paper: 0.8 }),
  lacquerware: rates({ timber: 0.2, dyes: 0.08 }),
  carpets: rates({ wool: 0.4, cotton: 0.3, dyes: 0.1 })
});

export function tradeGoodById(goodId) {
  const good = TRADE_GOODS_BY_ID.get(goodId);
  if (!good) throw new Error(`Unknown trade good: ${goodId}`);
  return good;
}

export function createWorldEconomy({ ports, shipyardPorts = ports, startMinute, seedKey = null }) {
  if (!Array.isArray(ports) || ports.length === 0) throw new Error("World economy requires ports");
  if (!Array.isArray(shipyardPorts)) throw new Error("World economy shipyard ports must be an array");
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid economy start minute: ${startMinute}`);
  validateOptionalSeedKey(seedKey, "economy");
  const portStates = new Map();
  for (const port of ports) {
    const portId = requiredPortId(port);
    if (portStates.has(portId)) throw new Error(`Duplicate economy city id: ${portId}`);
    portStates.set(portId, createPortState(port, seedKey));
  }
  for (const shipyardPort of shipyardPorts) {
    const portId = requiredPortId(shipyardPort);
    if (!portStates.has(portId)) throw new Error(`Shipyard city is missing from the economy: ${portId}`);
  }
  const economy = {
    version: 1,
    seedKey,
    lastMinute: startMinute,
    portStates,
    shipyards: null
  };
  activateHistoricalPortIndustries(economy, startMinute);
  const shipyards = createWorldShipyards({ ports: shipyardPorts, startMinute, seedKey });
  economy.shipyards = shipyards;
  for (const yard of shipyards.yards.values()) {
    applyShipyardMaterialDemand(portStates.get(yard.portId), yard, { seedInitialStock: true });
  }
  return economy;
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
    origin.state.marketIntegrationNeighbors = weightedNeighbors
      .filter((neighbor) => neighbor.weight > 0)
      .map((neighbor) => ({
        state: neighbor.state,
        weight: neighbor.weight
      }));
  }
  invalidateWorldMarketMedianCache(economy);
  return economy;
}

export function addWorldEconomyPort(economy, port, startMinute = economy?.lastMinute) {
  assertEconomy(economy);
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid economy port start minute: ${startMinute}`);
  const portId = requiredPortId(port);
  if (economy.portStates.has(portId)) throw new Error(`Economy port already exists: ${portId}`);
  const state = createPortState(port, economy.seedKey);
  const yard = addWorldShipyardPort(economy.shipyards, port, startMinute);
  applyShipyardMaterialDemand(state, yard, { seedInitialStock: true });
  economy.portStates.set(portId, state);
  activateHistoricalPortIndustries(economy, startMinute);
  invalidateWorldMarketMedianCache(economy);
  return { port: state, shipyard: yard };
}

export function worldEconomyHasShipyardPort(economy, port) {
  assertEconomy(economy);
  return worldShipyardHasPort(economy.shipyards, port);
}

export function addWorldEconomyShipyardPort(economy, port, startMinute = economy?.lastMinute) {
  assertEconomy(economy);
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid economy shipyard start minute: ${startMinute}`);
  const portId = requiredPortId(port);
  if (!economy.portStates.has(portId)) {
    throw new Error(`Cannot add a shipyard without an economy port: ${portId}`);
  }
  const yard = addWorldShipyardPort(economy.shipyards, port, startMinute);
  applyShipyardMaterialDemand(economy.portStates.get(portId), yard, { seedInitialStock: true });
  return yard;
}

export function replaceWorldEconomyPort(economy, port, startMinute = economy?.lastMinute) {
  assertEconomy(economy);
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid replacement economy minute: ${startMinute}`);
  const portId = requiredPortId(port);
  const previous = economy.portStates.get(portId);
  if (!previous) throw new Error(`Replacement economy port does not exist: ${portId}`);
  const replacement = createPortState(port, economy.seedKey);
  replacement.specie = previous.specie + Math.max(0, replacement.targetSpecie - previous.targetSpecie);
  for (const [goodId, state] of replacement.goods) {
    const oldState = previous.goods.get(goodId);
    if (!oldState) continue;
    state.stock = Math.max(state.stock, oldState.stock);
    state.industryProductionPerDay = oldState.industryProductionPerDay;
  }
  const yard = replaceWorldShipyardPort(economy.shipyards, port, startMinute);
  applyShipyardMaterialDemand(replacement, yard, { seedInitialStock: false });
  economy.portStates.set(portId, replacement);
  activateHistoricalPortIndustries(economy, startMinute);
  invalidateWorldMarketMedianCache(economy);
  return replacement;
}

export function fundWorldEconomyShipyard(economy, port, backing) {
  assertEconomy(economy);
  const yard = shipyardAtPort(economy.shipyards, port);
  const previousDemand = shipyardDailyMaterialDemand(yard);
  fundPlayerShipyard(economy.shipyards, port, backing);
  const nextDemand = shipyardDailyMaterialDemand(yard);
  const portState = economy.portStates.get(requiredPortId(port));
  applyShipyardMaterialDemandChange(portState, previousDemand, nextDemand);
  invalidateWorldMarketMedianCache(economy);
  return yard;
}

export function ensureWorldEconomyPlayerShipyardBacking(economy, port, backing) {
  assertEconomy(economy);
  const yard = shipyardAtPort(economy.shipyards, port);
  if (yard.playerBacking) return Object.freeze({ yard, repaired: false });
  return Object.freeze({
    yard: fundWorldEconomyShipyard(economy, port, backing),
    repaired: true
  });
}

export function worldEconomyPortSettlementType(economy, port) {
  assertEconomy(economy);
  return requiredPortState(economy, port).settlementType;
}

export function establishPortIndustry(
  economy,
  city,
  goodId,
  productionPerDay,
  { initialStock = 0 } = {}
) {
  assertEconomy(economy);
  if (!Number.isFinite(productionPerDay) || productionPerDay <= 0) {
    throw new Error(`Invalid port industry production: ${goodId}=${productionPerDay}`);
  }
  if (!Number.isInteger(initialStock) || initialStock < 0) {
    throw new Error(`Invalid port industry initial stock: ${goodId}=${initialStock}`);
  }
  const port = requiredPortState(economy, city);
  const result = establishIndustryAtPort(port, goodId, productionPerDay, initialStock);
  if (result.created) invalidateWorldMarketMedianCache(economy);
  return result;
}

export function worldEconomyHasPort(economy, port) {
  assertEconomy(economy);
  return economy.portStates.has(requiredPortId(port));
}

export function snapshotWorldEconomy(economy) {
  const plan = createWorldEconomySnapshotPlan(economy);
  while (!advanceWorldEconomySnapshotPlan(plan, { maxPorts: Number.MAX_SAFE_INTEGER })) {
    // Explicit synchronous callers require a complete economy snapshot.
  }
  return plan.snapshot;
}

export function createWorldEconomySnapshotPlan(economy) {
  assertEconomy(economy);
  return {
    version: 1,
    economy,
    ports: [...economy.portStates.values()],
    portIndex: 0,
    snapshot: {
      version: 2,
      lastMinute: economy.lastMinute,
      ports: [],
      shipyards: snapshotWorldShipyards(economy.shipyards)
    }
  };
}

export function advanceWorldEconomySnapshotPlan(plan, { maxPorts = 12 } = {}) {
  assertWorldEconomySnapshotPlan(plan);
  if (!Number.isInteger(maxPorts) || maxPorts <= 0) {
    throw new Error(`Invalid world economy snapshot batch size: ${maxPorts}`);
  }
  const end = Math.min(plan.ports.length, plan.portIndex + maxPorts);
  for (; plan.portIndex < end; plan.portIndex++) {
    const port = plan.ports[plan.portIndex];
    plan.snapshot.ports.push({
      id: port.id,
      specie: port.specie,
      targetSpecie: port.targetSpecie,
      industries: [...port.goods.entries()]
        .filter(([, state]) => state.industryProductionPerDay > 0)
        .map(([goodId, state]) => [goodId, state.industryProductionPerDay]),
      stocks: [...port.goods.entries()].map(([goodId, state]) => [goodId, state.stock])
    });
  }
  return plan.portIndex === plan.ports.length;
}

function assertWorldEconomySnapshotPlan(plan) {
  if (!plan || plan.version !== 1 || !plan.economy || !Array.isArray(plan.ports) ||
      !Number.isInteger(plan.portIndex) || plan.portIndex < 0 || !plan.snapshot ||
      !Array.isArray(plan.snapshot.ports)) {
    throw new Error("Invalid world economy snapshot plan");
  }
}

export function restoreWorldEconomy(economy, snapshot, { seedKey = economy?.seedKey } = {}) {
  const plan = createWorldEconomyRestorePlan(economy, snapshot, { seedKey });
  while (!advanceWorldEconomyRestorePlan(plan, { maxPorts: Number.MAX_SAFE_INTEGER })) {
    // Synchronous save restoration intentionally completes every phase before returning.
  }
  return economy;
}

export function createWorldEconomyRestorePlan(
  economy,
  snapshot,
  { seedKey = economy?.seedKey } = {}
) {
  assertEconomy(economy);
  validateOptionalSeedKey(seedKey, "restored economy");
  if (!snapshot || ![1, 2].includes(snapshot.version) || !Array.isArray(snapshot.ports)) {
    throw new Error("Unsupported world economy save data");
  }
  if (!Number.isFinite(snapshot.lastMinute)) throw new Error("Invalid saved economy minute");
  return {
    version: 1,
    economy,
    snapshot: normalizeWorldEconomySnapshot(economy, snapshot),
    seedKey,
    phase: "validate-ports",
    portIndex: 0,
    savedPortIds: new Set()
  };
}

function normalizeWorldEconomySnapshot(economy, snapshot) {
  if (snapshot.version === 2) return snapshot;
  const portsByLegacyTileId = new Map();
  for (const port of economy.portStates.values()) {
    if (portsByLegacyTileId.has(port.tileId)) {
      throw new Error(`Economy contains duplicate legacy port tile: ${port.tileId}`);
    }
    portsByLegacyTileId.set(port.tileId, port);
  }
  return {
    ...snapshot,
    version: 2,
    ports: snapshot.ports.map((saved) => {
      if (!Number.isInteger(saved?.id) || saved.id < 0) {
        throw new Error(`Legacy saved economy port requires a tile id: ${saved?.id}`);
      }
      const port = portsByLegacyTileId.get(saved.id);
      if (!port) throw new Error(`Legacy saved economy port is missing: ${saved.id}`);
      return { ...saved, id: port.cityId };
    })
  };
}

export function advanceWorldEconomyRestorePlan(plan, { maxPorts = 24 } = {}) {
  assertWorldEconomyRestorePlan(plan);
  if (!Number.isInteger(maxPorts) || maxPorts <= 0) {
    throw new Error(`Invalid world economy restore batch size: ${maxPorts}`);
  }

  const { economy, snapshot, seedKey } = plan;
  if (plan.phase === "validate-ports") {
    const end = Math.min(snapshot.ports.length, plan.portIndex + maxPorts);
    for (; plan.portIndex < end; plan.portIndex++) {
      validateSavedPortEconomyState(
        economy,
        snapshot.ports[plan.portIndex],
        plan.savedPortIds
      );
    }
    if (plan.portIndex < snapshot.ports.length) return false;
    plan.phase = "restore-shipyards";
    plan.portIndex = 0;
    return false;
  }

  if (plan.phase === "restore-shipyards") {
    economy.seedKey = seedKey;
    restoreWorldShipyards(economy.shipyards, snapshot.shipyards, { seedKey });
    plan.phase = "apply-ports";
    return false;
  }

  if (plan.phase === "apply-ports") {
    const end = Math.min(snapshot.ports.length, plan.portIndex + maxPorts);
    for (; plan.portIndex < end; plan.portIndex++) {
      applySavedPortEconomyState(economy, snapshot.ports[plan.portIndex]);
    }
    if (plan.portIndex < snapshot.ports.length) return false;
    economy.lastMinute = snapshot.lastMinute;
    activateHistoricalPortIndustries(economy, snapshot.lastMinute);
    invalidateWorldMarketMedianCache(economy);
    plan.phase = "complete";
    return true;
  }

  if (plan.phase === "complete") return true;
  throw new Error(`Unknown world economy restore phase: ${plan.phase}`);
}

function validateSavedPortEconomyState(economy, saved, savedPortIds) {
  const port = economy.portStates.get(saved?.id);
  if (!port) throw new Error(`Saved economy port is missing: ${saved?.id}`);
  if (savedPortIds.has(saved.id)) throw new Error(`Duplicate saved economy port: ${saved.id}`);
  savedPortIds.add(saved.id);
  if (!Number.isFinite(saved.specie) || saved.specie < 0 || !Array.isArray(saved.stocks)) {
    throw new Error(`Invalid saved economy state for port: ${saved.id}`);
  }
  if (saved.targetSpecie !== undefined &&
      (!Number.isFinite(saved.targetSpecie) || saved.targetSpecie <= 0)) {
    throw new Error(`Invalid saved target specie for port: ${saved.id}`);
  }
  validateSavedIndustries(saved.industries, saved.id);
  const savedGoodIds = new Set();
  for (const [goodId, stock] of saved.stocks) {
    const good = port.goods.get(goodId);
    if (!good) throw new Error(`Saved economy good is missing: ${saved.id}/${goodId}`);
    if (savedGoodIds.has(goodId)) throw new Error(`Duplicate saved stock: ${saved.id}/${goodId}`);
    savedGoodIds.add(goodId);
    normalizedEconomyStock(stock, `saved stock: ${saved.id}/${goodId}`);
  }
}

function applySavedPortEconomyState(economy, saved) {
  const port = economy.portStates.get(saved.id);
  for (const [goodId, productionPerDay] of saved.industries || []) {
    establishIndustryAtPort(port, goodId, productionPerDay, 0);
  }
  for (const [goodId, stock] of saved.stocks) {
    port.goods.get(goodId).stock = normalizedEconomyStock(
      stock,
      `saved stock: ${saved.id}/${goodId}`
    );
  }
  const savedTargetSpecie = saved.targetSpecie ?? legacyTargetSpecie(port);
  port.specie = saved.specie * port.targetSpecie / savedTargetSpecie;
}

function assertWorldEconomyRestorePlan(plan) {
  if (!plan || plan.version !== 1 || !plan.economy || !plan.snapshot ||
      !(plan.savedPortIds instanceof Set) || !Number.isInteger(plan.portIndex) ||
      typeof plan.phase !== "string") {
    throw new Error("Invalid world economy restore plan");
  }
}

function legacyTargetSpecie(port) {
  return port.settlementType === "village"
    ? Math.round(
      LEGACY_VILLAGE_TARGET_SPECIE_BASE +
        port.populationScale * LEGACY_VILLAGE_TARGET_SPECIE_PER_POPULATION_SCALE
    )
    : Math.round(
      LEGACY_CITY_TARGET_SPECIE_BASE +
        port.populationScale * LEGACY_CITY_TARGET_SPECIE_PER_POPULATION_SCALE
    );
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
    activateHistoricalPortIndustries(
      economy,
      economy.lastMinute + (step + 1) * ECONOMY_STEP_MINUTES
    );
  }
  economy.lastMinute += steps * ECONOMY_STEP_MINUTES;
  advanceWorldShipyards(economy.shipyards, economy.lastMinute, shipyardMaterialMarket(economy));
  invalidateWorldMarketMedianCache(economy);
  return true;
}

export function procureWorldEconomyShipyardMaterials(economy, port) {
  assertEconomy(economy);
  const yard = shipyardAtPort(economy.shipyards, port);
  const result = procureShipyardMaterials(yard, shipyardMaterialMarket(economy));
  invalidateWorldMarketMedianCache(economy);
  return result;
}

function shipyardMaterialMarket(economy) {
  return {
    available: (portId, goodId) => economy.portStates.get(portId)?.goods.get(goodId)?.stock ?? 0,
    consume: (portId, goodId, quantity) => {
      const port = economy.portStates.get(portId);
      if (!port) throw new Error(`Shipyard material port is missing: ${portId}`);
      const state = port.goods.get(goodId);
      if (!state) throw new Error(`${port.name} has no shipyard material stock for ${goodId}`);
      state.stock = normalizedEconomyStock(
        state.stock - quantity,
        `shipyard material stock for ${port.name}: ${goodId}`
      );
    }
  };
}

export function nextWorldEconomyEventMinute(economy) {
  assertEconomy(economy);
  return economy.lastMinute + ECONOMY_STEP_MINUTES;
}

export function portMarket(economy, city) {
  const port = requiredPortState(economy, city);
  return TRADE_GOODS.map((good) => marketRow(port, good));
}

export function portMarketGood(economy, city, goodId) {
  const port = requiredPortState(economy, city);
  return marketRow(port, tradeGoodById(goodId));
}

export function portGoodSupply(economy, city, goodId) {
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  const state = port.goods.get(good.id);
  return Object.freeze({
    stock: good.alwaysAvailable ? 999 : Math.max(0, Math.floor(state.stock)),
    productionPerDay: state.productionPerDay,
    listedForSale: portGoodIsListedForSale(port, good, state)
  });
}

export function portEconomySummary(economy, city) {
  const port = requiredPortState(economy, city);
  return {
    specie: Math.floor(port.specie),
    targetSpecie: port.targetSpecie,
    populationScale: port.populationScale,
    hasMint: port.hasMint
  };
}

export function plunderPortSpecie(economy, city, amount) {
  const port = requiredPortState(economy, city);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Invalid specie plunder for ${port.name}: ${amount}`);
  }
  const availableSpecie = Math.floor(port.specie);
  if (amount > availableSpecie) {
    throw new Error(
      `${port.name} has only ${availableSpecie} specie available for ${amount} in plunder`
    );
  }
  port.specie -= amount;
  invalidateWorldMarketMedianCache(economy);
  return Object.freeze({
    amount,
    availableSpecie,
    remainingSpecie: Math.floor(port.specie)
  });
}

export function snapshotPortTradeState(economy, city) {
  const port = requiredPortState(economy, city);
  return Object.freeze({
    portId: port.id,
    specie: port.specie,
    stocks: Object.freeze(Object.fromEntries(
      [...port.goods.entries()].map(([goodId, state]) => [goodId, state.stock])
    ))
  });
}

export function restorePortTradeState(economy, city, snapshot) {
  const port = requiredPortState(economy, city);
  if (!snapshot || snapshot.portId !== port.id || !Number.isFinite(snapshot.specie) ||
      snapshot.specie < 0 || !snapshot.stocks || typeof snapshot.stocks !== "object") {
    throw new Error(`Invalid market undo state for ${port.name}`);
  }
  for (const [goodId, state] of port.goods.entries()) {
    const stock = snapshot.stocks[goodId];
    state.stock = normalizedEconomyStock(stock, `market undo stock for ${port.name}: ${goodId}`);
  }
  port.specie = snapshot.specie;
  invalidateWorldMarketMedianCache(economy);
  return portMarket(economy, city);
}

export function consumePortGoodStock(economy, city, goodId, quantity) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`Invalid port stock consumption: ${goodId}=${quantity}`);
  }
  return removePortGoodStock(economy, city, goodId, quantity);
}

export function addPortGoodStock(economy, city, goodId, quantity) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`Invalid port stock addition: ${goodId}=${quantity}`);
  }
  const port = requiredPortState(economy, city);
  const state = port.goods.get(tradeGoodById(goodId).id);
  if (!state) throw new Error(`${port.name} has no stock record for ${goodId}`);
  state.stock += quantity;
  invalidateWorldMarketMedianCache(economy);
  return Object.freeze({
    goodId,
    quantity,
    stock: Math.floor(state.stock)
  });
}

export function destroyPortGoodStock(economy, city, goodId) {
  return removePortGoodStock(economy, city, goodId, null);
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
  const worldPrice = cachedWorldMarketMedian(economy, good, priceKey);
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
  const total = applyTransactionPriceMultiplier(
    quoteTransaction(port, good, quantity, -1, "buyPrice"),
    priceMultiplier
  );
  if (!good.alwaysAvailable) state.stock -= quantity;
  port.specie += total;
  invalidateWorldMarketMedianCache(economy);
  return { good, quantity, total, unitPrice: Math.max(1, Math.round(total / quantity)) };
}

export function quotePortSale(economy, city, goodId, quantity, priceMultiplier = 1) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  assertPortOffersGood(port, good);
  return applyTransactionPriceMultiplier(
    quoteTransaction(port, good, quantity, -1, "buyPrice"),
    priceMultiplier
  );
}

export function maximumPortSaleQuantity(
  economy,
  city,
  goodId,
  requestedQuantity,
  traderSpecie,
  priceMultiplier = 1
) {
  assertTradeQuantity(requestedQuantity);
  if (!Number.isFinite(traderSpecie) || traderSpecie < 0) throw new Error(`Invalid trader specie: ${traderSpecie}`);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (!portOffersGood(port, good)) return 0;
  let low = 0;
  let high = good.alwaysAvailable ? requestedQuantity : Math.min(requestedQuantity, Math.floor(port.goods.get(goodId).stock));
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const total = applyTransactionPriceMultiplier(
      quoteTransaction(port, good, middle, -1, "buyPrice"),
      priceMultiplier
    );
    if (total <= traderSpecie + 1e-6) low = middle;
    else high = middle - 1;
  }
  return low;
}

export function executePortPurchase(economy, city, goodId, quantity, priceMultiplier = 1) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) throw new Error(`${port.name} does not buy ${good.label}`);
  const grossTotal = quoteTransaction(port, good, quantity, 1, "sellPrice");
  const total = applyTransactionPriceMultiplier(grossTotal, priceMultiplier);
  const minted = portMintsGood(port, good);
  if (!minted && port.specie + 1e-6 < total) {
    throw new Error(`${port.name} market has insufficient specie for ${quantity} ${good.label}`);
  }
  if (!minted) {
    port.goods.get(goodId).stock += quantity;
    port.specie -= total;
  }
  const mintingFee = minted ? Math.max(1, Math.round(total * MINT_FEE_RATE)) : 0;
  const retainedDuty = minted ? grossTotal - total : 0;
  port.specie += mintingFee;
  invalidateWorldMarketMedianCache(economy);
  return {
    good,
    quantity,
    total,
    unitPrice: Math.max(1, Math.round(total / quantity)),
    mintedSpecie: minted ? total + mintingFee : 0,
    mintingFee,
    retainedDuty
  };
}

export function quotePortPurchase(economy, city, goodId, quantity, priceMultiplier = 1) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) throw new Error(`${port.name} does not buy ${good.label}`);
  return applyTransactionPriceMultiplier(
    quoteTransaction(port, good, quantity, 1, "sellPrice"),
    priceMultiplier
  );
}

export function maximumPortPurchaseQuantity(economy, city, goodId, requestedQuantity, priceMultiplier = 1) {
  assertTradeQuantity(requestedQuantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) return 0;
  if (portMintsGood(port, good)) return requestedQuantity;
  return maximumAffordablePortPurchaseQuantity(port, good, requestedQuantity, port.specie, priceMultiplier);
}

export function quoteRepeatedPortPurchase(
  economy,
  city,
  goodId,
  quantity,
  priceMultiplier = 1
) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) throw new Error(`${port.name} does not buy ${good.label}`);
  return repeatedPortPurchaseTotals(port, good, quantity, priceMultiplier).total;
}

export function maximumRepeatedPortPurchaseQuantity(
  economy,
  city,
  goodId,
  requestedQuantity,
  priceMultiplier = 1
) {
  assertTradeQuantity(requestedQuantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) return 0;
  if (portMintsGood(port, good)) return requestedQuantity;
  let low = 0;
  let high = requestedQuantity;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const total = repeatedPortPurchaseTotals(port, good, middle, priceMultiplier).total;
    if (total <= port.specie + 1e-6) low = middle;
    else high = middle - 1;
  }
  return low;
}

export function executeRepeatedPortPurchase(
  economy,
  city,
  goodId,
  quantity,
  priceMultiplier = 1
) {
  assertTradeQuantity(quantity);
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.sellable === false) throw new Error(`${port.name} does not buy ${good.label}`);
  const totals = repeatedPortPurchaseTotals(port, good, quantity, priceMultiplier);
  const minted = portMintsGood(port, good);
  if (!minted && port.specie + 1e-6 < totals.total) {
    throw new Error(`${port.name} market has insufficient specie for ${quantity} ${good.label}`);
  }
  if (!minted) {
    port.goods.get(goodId).stock += quantity;
    port.specie -= totals.total;
  }
  const mintingFee = minted ? totals.mintingFee : 0;
  const retainedDuty = minted ? totals.grossTotal - totals.total : 0;
  port.specie += mintingFee;
  invalidateWorldMarketMedianCache(economy);
  return {
    good,
    quantity,
    total: totals.total,
    unitPrice: Math.max(1, Math.round(totals.total / quantity)),
    mintedSpecie: minted ? totals.total + mintingFee : 0,
    mintingFee,
    retainedDuty
  };
}

export function planNpcTrade(
  economy,
  origin,
  destination,
  {
    cargoCapacity,
    specie,
    purchasePriceMultiplier = (_goodId) => 1,
    salePriceMultiplier = (_goodId) => 1
  }
) {
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
    const originMultiplier = purchasePriceMultiplier(good.id);
    const destinationMultiplier = salePriceMultiplier(good.id);
    const originPrice = applyTransactionPriceMultiplier(
      marketPrice(originPort, good, originState.stock).buyPrice,
      originMultiplier
    );
    const destinationPrice = applyTransactionPriceMultiplier(
      marketPrice(destinationPort, good, destinationPort.goods.get(good.id).stock).sellPrice,
      destinationMultiplier
    );
    const margin = destinationPrice - originPrice;
    if (margin <= Math.max(1, good.basePrice * 0.04)) continue;
    candidates.push({
      good,
      originPrice,
      destinationPrice,
      margin,
      available,
      originMultiplier,
      destinationMultiplier
    });
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
      portMintsGood(destinationPort, candidate.good)
        ? candidate.available
        : Math.floor(destinationSpecieLeft / candidate.destinationPrice)
    );
    if (quantity > 0) {
      quantity = maximumPortSaleQuantity(
        economy,
        origin,
        candidate.good.id,
        quantity,
        specieLeft,
        candidate.originMultiplier
      );
    }
    if (quantity > 0 && !portMintsGood(destinationPort, candidate.good)) {
      quantity = maximumAffordablePortPurchaseQuantity(
        destinationPort,
        candidate.good,
        quantity,
        destinationSpecieLeft,
        candidate.destinationMultiplier
      );
    }
    if (quantity <= 0) continue;
    const tradeLine = mostProfitableTradeLine(
      originPort,
      destinationPort,
      candidate.good,
      quantity,
      candidate.originMultiplier,
      candidate.destinationMultiplier
    );
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
    if (!portMintsGood(destinationPort, candidate.good)) {
      destinationSpecieLeft -= saleTotal;
    }
  }

  return {
    lines,
    expectedProfit: lines.reduce((sum, line) => sum + line.expectedProfit, 0),
    cargoUnits: lines.reduce((sum, line) => (
      sum + line.quantity * tradeGoodById(line.goodId).unitSize
    ), 0)
  };
}

export function cargoSaleValue(economy, city, cargo, salePriceMultiplier = (_goodId) => 1) {
  const port = requiredPortState(economy, city);
  let value = 0;
  for (const [goodId, quantity] of Object.entries(cargo || {})) {
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid NPC cargo quantity: ${goodId}=${quantity}`);
    if (quantity === 0) continue;
    const good = tradeGoodById(goodId);
    if (good.sellable === false) continue;
    const multiplier = salePriceMultiplier(goodId);
    const affordable = maximumPortPurchaseQuantity(economy, city, goodId, quantity, multiplier);
    if (affordable > 0) {
      value += applyTransactionPriceMultiplier(
        quoteTransaction(port, good, affordable, 1, "sellPrice"),
        multiplier
      );
    }
  }
  return value;
}

function createPortState(port, seedKey) {
  const populationScale = clamp(Math.sqrt(Math.max(1000, port.population || 10000) / 30000), 0.45, 4.2);
  const settlementType = port.settlementType === "village" ? "village" : "city";
  const productionMultiplier = settlementType === "village" ? VILLAGE_PRODUCTION_MULTIPLIER : 1;
  const consumptionMultiplier = settlementType === "village" ? VILLAGE_CONSUMPTION_MULTIPLIER : 1;
  const declaredMarketGoodIds = Array.isArray(port.marketGoods)
    ? declaredPortMarketGoodIds(port.marketGoods, port.displayCity || port.city)
    : null;
  const economyRegion = economyRegionForCity(port);
  const productionProfile = REGION_PRODUCTION[economyRegion];
  const demandProfile = REGION_DEMAND[economyRegion];
  if (!productionProfile || !demandProfile) {
    throw new Error(`No economy profile for region: ${economyRegion}`);
  }
  const canonicalCityId = requireCityId(port, "Economy port");
  const specialties = [...new Set([
    ...(CITY_SPECIALTIES.get(canonicalCityId) || []),
    ...(SHIPBUILDING_CITY_SPECIALTIES.get(canonicalCityId) || [])
  ])];
  const cityDemandProfile = CITY_DEMANDS.get(canonicalCityId) || {};
  const localSpiceSourceIds = new Set(TRADE_GOODS
    .filter((good) => good.category === "spice" && (
      specialties.includes(good.id) ||
      (good.id === GINGER_GOOD_ID && ["south-asian", "southeast-asian"].includes(economyRegion))
    ))
    .map((good) => good.id));
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
      (stapleDemand + (demandProfile[good.id] || 0) + (cityDemandProfile[good.id] || 0));
    goods.set(good.id, {
      productionPerDay: productionRate,
      industryProductionPerDay: 0,
      householdConsumptionPerDay,
      consumptionPerDay: householdConsumptionPerDay,
      targetStock: 0,
      stock: 0,
      localAbundancePriceMultiplier: localSpiceSourceIds.has(good.id)
        ? good.id === GINGER_GOOD_ID
          ? SOURCE_GINGER_ABUNDANCE_PRICE_MULTIPLIER
          : SOURCE_SPICE_ABUNDANCE_PRICE_MULTIPLIER
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
    state.targetStock = targetStockForState(state);
    const stockVariance = 0.82 + hashUnit(
      economySeedKey(seedKey, `${canonicalCityId}|${good.id}|stock`)
    ) * 0.36;
    const initialStockRatio = state.productionPerDay > 0 ? 1 : good.initialImportStockRatio;
    state.stock = state.targetStock * stockVariance * initialStockRatio;
  }
  applyInitialPortImports(goods, port.initialImports, port.displayCity || port.city);

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
  assertSustainableNativeExport(port, goods, marketGoodIds);
  const targetSpecie = settlementType === "village"
    ? Math.round(700 + populationScale * 1800)
    : Math.round(8000 + populationScale * 38000);
  const marketPriceDepth = populationScale * (settlementType === "village"
    ? VILLAGE_MARKET_PRICE_DEPTH_PER_POPULATION_SCALE
    : CITY_MARKET_PRICE_DEPTH_PER_POPULATION_SCALE);
  const portState = {
    id: requiredPortId(port),
    cityId: canonicalCityId,
    tileId: requiredPortTileId(port),
    name: port.displayCity || port.city,
    cityType: port.cityType,
    economyRegion,
    settlementType,
    populationScale,
    marketPriceDepth,
    targetSpecie,
    specie: targetSpecie * (0.85 + hashUnit(economySeedKey(seedKey, `${canonicalCityId}|specie`)) * 0.3),
    hasMint: MINT_CITY_IDS_1522.has(canonicalCityId),
    marketGoodIds,
    marketIntegrationOffsets: new Map(TRADE_GOODS.map((good) => [good.id, 0])),
    marketIntegrationNeighbors: [],
    goods
  };
  for (const good of TRADE_GOODS) refreshPortGoodPriceFactors(portState, good);
  return portState;
}

function assertSustainableNativeExport(port, goods, marketGoodIds) {
  const sustainable = TRADE_GOODS.some((good) => {
    if (good.alwaysAvailable || good.sellable === false || PRODUCTION_INPUTS[good.id]) return false;
    if (marketGoodIds && !marketGoodIds.has(good.id)) return false;
    const state = goods.get(good.id);
    return state.productionPerDay > state.consumptionPerDay;
  });
  if (!sustainable) {
    throw new Error(
      `${port.displayCity || port.city} has no sustainable native market good`
    );
  }
}

function advancePortEconomy(port, elapsedDays) {
  let localCashFlow = 0;
  const currentSpeciePriceMultiplier = speciePriceMultiplier(port);
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
        const inputState = port.goods.get(inputGoodId);
        inputState.stock = normalizedEconomyStock(
          inputState.stock - produced * unitsPerOutput,
          `industrial input stock for ${port.name}: ${inputGoodId}`
        );
      }
    }
    state.stock += produced;
    const consumed = Math.min(state.stock, state.householdConsumptionPerDay * elapsedDays);
    state.stock = normalizedEconomyStock(
      state.stock - consumed,
      `household stock for ${port.name}: ${good.id}`
    );
    const price = marketPrice(port, good, state.stock, currentSpeciePriceMultiplier).midPrice;
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

function portMintsGood(port, good) {
  return port.hasMint === true && SPECIE_METAL_GOOD_IDS.has(good.id);
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
    listedForSale: portGoodIsListedForSale(port, good, state),
    sellable: good.sellable !== false,
    portSpecie: Math.max(0, Math.floor(port.specie))
  };
}

function portGoodIsListedForSale(port, good, state) {
  return good.alwaysAvailable || (portOffersGood(port, good) && (
    state.productionPerDay > 0 || state.stock >= Math.max(3, state.targetStock * 0.16)
  ));
}

function marketPrice(port, good, stock, specieMultiplier = speciePriceMultiplier(port)) {
  if (Number.isFinite(good.fixedBuyPrice)) {
    const midPrice = Math.max(1, good.fixedBuyPrice * specieMultiplier);
    return {
      midPrice,
      buyPrice: Math.max(1, Math.round(midPrice)),
      sellPrice: good.sellable === false ? 0 : Math.max(1, Math.floor(midPrice * PORT_MARKDOWN))
    };
  }
  const rawMultiplier = rawMarketMultiplier(port, good, stock);
  if (!port.marketIntegrationOffsets.has(good.id)) {
    throw new Error(`${port.name} market has no integration value for ${good.label}`);
  }
  const integratedMultiplier = good.criticalStockPricing
    ? criticalStockIntegratedMultiplier(port, good, stock, rawMultiplier)
    : clamp(
        rawMultiplier + port.marketIntegrationOffsets.get(good.id),
        MIN_INTEGRATED_PRICE_MULTIPLIER,
        MAX_PRICE_MULTIPLIER
      );
  const state = port.goods.get(good.id);
  const multiplier = clamp(
    integratedMultiplier * state.localAbundancePriceMultiplier * specieMultiplier,
    MIN_INTEGRATED_PRICE_MULTIPLIER * state.localAbundancePriceMultiplier * MIN_SPECIE_PRICE_MULTIPLIER,
    MAX_PRICE_MULTIPLIER * MAX_SPECIE_PRICE_MULTIPLIER
  );
  const midPrice = Math.max(1, good.basePrice * multiplier);
  return {
    midPrice,
    buyPrice: Math.max(1, Math.round(midPrice * PORT_MARKUP)),
    sellPrice: Math.max(1, Math.floor(midPrice * PORT_MARKDOWN))
  };
}

function criticalStockIntegratedMultiplier(port, good, stock, localMultiplier) {
  if (!Array.isArray(port.marketIntegrationNeighbors)) {
    throw new Error(`${port.name} market has no nearby-market topology`);
  }
  if (port.marketIntegrationNeighbors.length === 0) return localMultiplier;
  let weightedMultiplier = 0;
  let totalWeight = 0;
  for (const neighbor of port.marketIntegrationNeighbors) {
    const neighborState = neighbor?.state;
    const weight = neighbor?.weight;
    if (!neighborState?.goods?.has(good.id) || !Number.isFinite(weight) || weight <= 0) {
      throw new Error(`${port.name} has invalid nearby-market data for ${good.label}`);
    }
    weightedMultiplier += rawMarketMultiplier(
      neighborState,
      good,
      neighborState.goods.get(good.id).stock
    ) * weight;
    totalWeight += weight;
  }
  const integrationWeight = NEARBY_CRITICAL_STOCK_MARKET_INTEGRATION_STRENGTH *
    Math.min(1, totalWeight);
  return clamp(
    localMultiplier + (weightedMultiplier / totalWeight - localMultiplier) * integrationWeight,
    MIN_INTEGRATED_PRICE_MULTIPLIER,
    MAX_PRICE_MULTIPLIER
  );
}

function speciePriceMultiplier(port) {
  return speciePriceMultiplierAtSpecie(port, port.specie);
}

function speciePriceMultiplierAtSpecie(port, specie) {
  if (!Number.isFinite(specie) || specie < 0 ||
      !Number.isFinite(port.targetSpecie) || port.targetSpecie <= 0) {
    throw new Error(`${port.name} has invalid specie price inputs`);
  }
  const ratio = specie / port.targetSpecie;
  return clamp(
    Math.pow(ratio, SPECIE_PRICE_ELASTICITY),
    MIN_SPECIE_PRICE_MULTIPLIER,
    MAX_SPECIE_PRICE_MULTIPLIER
  );
}

function rawMarketMultiplier(port, good, stock) {
  const state = port.goods.get(good.id);
  if (!Number.isFinite(state.comparativeAdvantage) ||
      !Number.isFinite(state.localPriceVariation) ||
      !Number.isFinite(state.regionalTradePriceMultiplier) ||
      !Number.isFinite(state.minimumOrdinaryPriceMultiplier)) {
    throw new Error(`${port.name} has invalid cached price factors for ${good.label}`);
  }
  const scarcity = Math.pow(
    (state.targetStock + port.marketPriceDepth) /
      (Math.max(0, stock) + port.marketPriceDepth),
    0.72
  );
  const ordinaryMultiplier = clamp(
    state.comparativeAdvantage * scarcity *
      state.localPriceVariation * state.regionalTradePriceMultiplier,
    state.minimumOrdinaryPriceMultiplier,
    MAX_PRICE_MULTIPLIER
  );
  return Math.max(
    ordinaryMultiplier,
    criticalStockPriceMultiplier(good, state, stock)
  );
}

function refreshPortGoodPriceFactors(port, good) {
  const state = port.goods.get(good.id);
  if (!state) throw new Error(`${port.name} has no economy state for ${good.label}`);
  const balance = (state.consumptionPerDay - state.productionPerDay) /
    (state.consumptionPerDay + state.productionPerDay + 0.2);
  state.comparativeAdvantage = Math.exp(balance * 0.52);
  state.localPriceVariation = 0.94 + hashUnit(`${port.id}|${good.id}|price`) * 0.12;
  state.regionalTradePriceMultiplier =
    REGION_TRADE_PRICE_MULTIPLIER[port.economyRegion]?.[good.id] || 1;
  state.minimumOrdinaryPriceMultiplier =
    MIN_PRICE_MULTIPLIER * Math.min(1, state.regionalTradePriceMultiplier);
}

function criticalStockPriceMultiplier(good, state, stock) {
  if (!good.criticalStockPricing) return MIN_PRICE_MULTIPLIER;
  const stockRatio = Math.max(0, stock) / state.targetStock;
  if (stockRatio >= CRITICAL_STOCK_PRICE_THRESHOLD_RATIO) return MIN_PRICE_MULTIPLIER;
  const shortage = 1 - stockRatio / CRITICAL_STOCK_PRICE_THRESHOLD_RATIO;
  return 1 + (MAX_PRICE_MULTIPLIER - 1) * Math.pow(shortage, CRITICAL_STOCK_PRICE_EXPONENT);
}

function quoteTransactionAtStock(
  port,
  good,
  startStock,
  quantity,
  stockDirection,
  priceKey,
  specieMultiplier = speciePriceMultiplier(port)
) {
  if (quantity <= 0) return 0;
  if (priceKey === "sellPrice" && good.sellable === false) {
    throw new Error(`${port.name} does not buy ${good.label}`);
  }
  const startPrice = marketPrice(port, good, startStock, specieMultiplier)[priceKey];
  const endStock = Math.max(0, startStock + stockDirection * quantity);
  const endPrice = marketPrice(port, good, endStock, specieMultiplier)[priceKey];
  return Math.max(quantity, Math.round((startPrice + endPrice) * 0.5 * quantity));
}

function quoteTransaction(port, good, quantity, stockDirection, priceKey) {
  const state = port.goods.get(good.id);
  return quoteTransactionAtStock(
    port,
    good,
    state.stock,
    quantity,
    stockDirection,
    priceKey
  );
}

function repeatedPortPurchaseTotals(port, good, quantity, priceMultiplier) {
  const startStock = port.goods.get(good.id).stock;
  const minted = portMintsGood(port, good);
  let simulatedSpecie = port.specie;
  let grossTotal = 0;
  let total = 0;
  let mintingFee = 0;
  for (let index = 0; index < quantity; index++) {
    const unitGross = quoteTransactionAtStock(
      port,
      good,
      startStock + index,
      1,
      1,
      "sellPrice",
      speciePriceMultiplierAtSpecie(port, simulatedSpecie)
    );
    const unitTotal = applyTransactionPriceMultiplier(unitGross, priceMultiplier);
    const unitMintingFee = Math.max(1, Math.round(unitTotal * MINT_FEE_RATE));
    grossTotal += unitGross;
    total += unitTotal;
    mintingFee += unitMintingFee;
    simulatedSpecie = minted
      ? simulatedSpecie + unitMintingFee
      : Math.max(0, simulatedSpecie - unitTotal);
  }
  return Object.freeze({ grossTotal, total, mintingFee });
}

function maximumAffordablePortPurchaseQuantity(
  port,
  good,
  requestedQuantity,
  specieBudget,
  priceMultiplier = 1
) {
  let low = 0;
  let high = requestedQuantity;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const total = applyTransactionPriceMultiplier(
      quoteTransaction(port, good, middle, 1, "sellPrice"),
      priceMultiplier
    );
    if (total <= specieBudget + 1e-6) low = middle;
    else high = middle - 1;
  }
  return low;
}

function mostProfitableTradeLine(
  originPort,
  destinationPort,
  good,
  maximumQuantity,
  purchasePriceMultiplier = 1,
  salePriceMultiplier = 1
) {
  let low = 1;
  let high = maximumQuantity;
  while (high - low > 6) {
    const left = Math.floor((low * 2 + high) / 3);
    const right = Math.ceil((low + high * 2) / 3);
    if (
      tradeProfit(
        originPort,
        destinationPort,
        good,
        left,
        purchasePriceMultiplier,
        salePriceMultiplier
      ) <
      tradeProfit(
        originPort,
        destinationPort,
        good,
        right,
        purchasePriceMultiplier,
        salePriceMultiplier
      )
    ) {
      low = left + 1;
    } else {
      high = right - 1;
    }
  }

  let best = null;
  for (let quantity = low; quantity <= high; quantity++) {
    const purchaseTotal = applyTransactionPriceMultiplier(
      quoteTransaction(originPort, good, quantity, -1, "buyPrice"),
      purchasePriceMultiplier
    );
    const saleTotal = applyTransactionPriceMultiplier(
      quoteTransaction(destinationPort, good, quantity, 1, "sellPrice"),
      salePriceMultiplier
    );
    const expectedProfit = saleTotal - purchaseTotal;
    if (!best || expectedProfit > best.expectedProfit) {
      best = { quantity, purchaseTotal, saleTotal, expectedProfit };
    }
  }
  return best?.expectedProfit > 0 ? best : null;
}

function tradeProfit(
  originPort,
  destinationPort,
  good,
  quantity,
  purchasePriceMultiplier = 1,
  salePriceMultiplier = 1
) {
  return applyTransactionPriceMultiplier(
    quoteTransaction(destinationPort, good, quantity, 1, "sellPrice"),
    salePriceMultiplier
  ) - applyTransactionPriceMultiplier(
    quoteTransaction(originPort, good, quantity, -1, "buyPrice"),
    purchasePriceMultiplier
  );
}

function requiredPortState(economy, city) {
  assertEconomy(economy);
  const portId = requiredPortId(city);
  const port = economy.portStates.get(portId);
  if (!port) throw new Error(`No economy exists for canonical city: ${portId}`);
  return port;
}

function removePortGoodStock(economy, city, goodId, requestedQuantity) {
  const port = requiredPortState(economy, city);
  const good = tradeGoodById(goodId);
  if (good.alwaysAvailable) throw new Error(`Cannot deplete always-available port good: ${good.label}`);
  const state = port.goods.get(goodId);
  const consumedQuantity = requestedQuantity === null
    ? state.stock
    : Math.min(state.stock, requestedQuantity);
  state.stock = Math.max(0, state.stock - consumedQuantity);
  invalidateWorldMarketMedianCache(economy);
  return Object.freeze({
    good,
    requestedQuantity,
    consumedQuantity,
    remainingStock: state.stock
  });
}

function cachedWorldMarketMedian(economy, good, priceKey) {
  let cache = WORLD_MARKET_MEDIAN_CACHE.get(economy);
  if (!cache) {
    cache = new Map();
    WORLD_MARKET_MEDIAN_CACHE.set(economy, cache);
  }
  const cacheKey = `${good.id}:${priceKey}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const worldPrices = [...economy.portStates.values()]
    .map((worldPort) => marketPrice(
      worldPort,
      good,
      worldPort.goods.get(good.id).stock
    )[priceKey])
    .sort((a, b) => a - b);
  const value = median(worldPrices);
  cache.set(cacheKey, value);
  return value;
}

function invalidateWorldMarketMedianCache(economy) {
  WORLD_MARKET_MEDIAN_CACHE.delete(economy);
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
  return requireCityId(port, "Economy port");
}

function requiredPortTileId(port) {
  if (!Number.isInteger(port?.tileId) || port.tileId < 0) throw new Error("Economy port requires a tile id");
  return port.tileId;
}

function assertEconomy(economy) {
  if (!economy || economy.version !== 1 || !(economy.portStates instanceof Map) || !economy.shipyards ||
      (economy.seedKey !== null && (typeof economy.seedKey !== "string" || economy.seedKey.trim() === ""))) {
    throw new Error("Invalid world economy");
  }
}

function normalizedEconomyStock(value, label) {
  if (!Number.isFinite(value) || value < -STOCK_FLOAT_EPSILON) {
    throw new Error(`Invalid ${label}=${value}`);
  }
  return Math.max(0, value);
}

function economySeedKey(seedKey, value) {
  return seedKey === null ? value : `${seedKey}|${value}`;
}

function validateOptionalSeedKey(value, label) {
  if (value !== null && (typeof value !== "string" || value.trim() === "")) {
    throw new Error(`${label} seed must be null or a non-empty string`);
  }
  return value;
}

function assertTradeQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Invalid trade quantity: ${quantity}`);
}

function applyTransactionPriceMultiplier(total, multiplier) {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 4) {
    throw new Error(`Invalid transaction price multiplier: ${multiplier}`);
  }
  return Math.max(1, Math.round(total * multiplier));
}

function assertCargoCapacity(cargoCapacity) {
  if (!Number.isInteger(cargoCapacity) || cargoCapacity < 0) throw new Error(`Invalid cargo capacity: ${cargoCapacity}`);
}

function stapleDemandRate(category) {
  if (category === "food") return 0.42;
  if (category === "drink") return 0.42;
  if (category === "supply") return 0;
  if (category === "staple") return 0.25;
  if (category === "material") return 0.13;
  if (category === "manufactured" || category === "textile") return 0.09;
  if (category === "luxury" || category === "spice") return 0.045;
  if (category === "precious") return 0.018;
  throw new Error(`Unknown trade category: ${category}`);
}

function establishIndustryAtPort(port, goodId, productionPerDay, initialStock) {
  const good = tradeGoodById(goodId);
  if (good.alwaysAvailable) throw new Error(`${port.name} cannot establish an industry for ${good.label}`);
  const state = port.goods.get(goodId);
  if (!state) throw new Error(`${port.name} has no economy state for ${good.label}`);
  if (port.marketGoodIds) port.marketGoodIds.add(goodId);
  if (state.industryProductionPerDay > 0) {
    if (Math.abs(state.industryProductionPerDay - productionPerDay) > 1e-9) {
      throw new Error(
        `${port.name} ${good.label} industry is ${state.industryProductionPerDay}; ` +
        `cannot replace it with ${productionPerDay}`
      );
    }
    return Object.freeze({
      created: false,
      good,
      productionPerDay: state.industryProductionPerDay,
      stock: Math.floor(state.stock)
    });
  }

  state.industryProductionPerDay = productionPerDay;
  state.productionPerDay += productionPerDay;
  state.targetStock = targetStockForState(state);
  refreshPortGoodPriceFactors(port, good);
  for (const [inputGoodId, unitsPerOutput] of Object.entries(PRODUCTION_INPUTS[goodId] || {})) {
    const inputState = port.goods.get(inputGoodId);
    inputState.consumptionPerDay += productionPerDay * unitsPerOutput;
    inputState.targetStock = targetStockForState(inputState);
    refreshPortGoodPriceFactors(port, tradeGoodById(inputGoodId));
  }
  state.stock += initialStock;
  return Object.freeze({
    created: true,
    good,
    productionPerDay,
    stock: Math.floor(state.stock)
  });
}

function activateHistoricalPortIndustries(economy, clockMinute) {
  if (!Number.isFinite(clockMinute) || clockMinute < 0) {
    throw new Error(`Invalid historical industry clock: ${clockMinute}`);
  }
  let changed = false;
  for (const industry of HISTORICAL_PORT_INDUSTRIES) {
    if (clockMinute < industry.startMinute) continue;
    const ports = [...economy.portStates.values()].filter((port) => port.cityId === industry.cityId);
    if (ports.length > 1) {
      throw new Error(`Historical industry city is duplicated: ${industry.cityId}`);
    }
    if (ports.length === 0) continue;
    const result = establishIndustryAtPort(
      ports[0],
      industry.goodId,
      industry.productionPerDay,
      industry.initialStock
    );
    changed ||= result.created;
  }
  return changed;
}

function applyShipyardMaterialDemand(port, yard, { seedInitialStock }) {
  if (!port) throw new Error(`Shipyard economy port is missing: ${yard.portId}`);
  const demand = shipyardDailyMaterialDemand(yard);
  for (const [goodId, dailyQuantity] of Object.entries(demand)) {
    const state = port.goods.get(goodId);
    if (!state) throw new Error(`${port.name} has no shipbuilding material state for ${goodId}`);
    const previousTarget = state.targetStock;
    state.consumptionPerDay += dailyQuantity;
    state.targetStock = targetStockForState(state);
    if (seedInitialStock) {
      state.stock += Math.max(0, state.targetStock - previousTarget) * 0.85;
    }
    refreshPortGoodPriceFactors(port, tradeGoodById(goodId));
  }
}

function applyShipyardMaterialDemandChange(port, previousDemand, nextDemand) {
  if (!port) throw new Error("Player-backed shipyard economy port is missing");
  for (const goodId of SHIPBUILDING_MATERIAL_GOOD_IDS) {
    const state = port.goods.get(goodId);
    if (!state) throw new Error(`${port.name} has no shipbuilding material state for ${goodId}`);
    state.consumptionPerDay += nextDemand[goodId] - previousDemand[goodId];
    state.targetStock = targetStockForState(state);
    refreshPortGoodPriceFactors(port, tradeGoodById(goodId));
  }
}

function targetStockForState(state) {
  const ordinaryTargetStock = Math.max(
    3,
    state.productionPerDay * 28 + state.consumptionPerDay * 22
  );
  return state.localAbundancePriceMultiplier < 1
    ? Math.max(SOURCE_SPICE_MINIMUM_TARGET_STOCK, ordinaryTargetStock)
    : ordinaryTargetStock;
}

function applyInitialPortImports(goods, imports, portName) {
  if (imports === undefined) return;
  if (!Array.isArray(imports)) throw new Error(`${portName} initial imports must be an array`);
  const seen = new Set();
  for (const entry of imports) {
    if (!entry || typeof entry.goodId !== "string" ||
        !Number.isInteger(entry.quantity) || entry.quantity <= 0) {
      throw new Error(`Invalid initial import at ${portName}: ${entry?.goodId || "missing"}`);
    }
    if (seen.has(entry.goodId)) throw new Error(`Duplicate initial import at ${portName}: ${entry.goodId}`);
    seen.add(entry.goodId);
    tradeGoodById(entry.goodId);
    const state = goods.get(entry.goodId);
    state.stock = Math.max(state.stock, entry.quantity);
  }
}

function validateSavedIndustries(industries, portId) {
  if (industries === undefined) return;
  if (!Array.isArray(industries)) throw new Error(`Invalid saved industries for port: ${portId}`);
  const seen = new Set();
  for (const entry of industries) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new Error(`Invalid saved industry for port: ${portId}`);
    }
    const [goodId, productionPerDay] = entry;
    const good = tradeGoodById(goodId);
    if (good.alwaysAvailable || !Number.isFinite(productionPerDay) || productionPerDay <= 0) {
      throw new Error(`Invalid saved industry: ${portId}/${goodId}=${productionPerDay}`);
    }
    if (seen.has(goodId)) throw new Error(`Duplicate saved industry: ${portId}/${goodId}`);
    seen.add(goodId);
  }
}

function good(id, label, basePrice, category, options = {}) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid trade good id: ${id}`);
  if (!Number.isInteger(basePrice) || basePrice <= 0) throw new Error(`Invalid base price for ${id}`);
  const unitSize = options.unitSize ?? 1;
  if (!Number.isInteger(unitSize) || unitSize <= 0) throw new Error(`Invalid unit size for ${id}`);
  const specialtyCategory = ["luxury", "spice", "manufactured", "textile", "precious"].includes(category);
  const initialImportStockRatio = options.initialImportStockRatio ?? (specialtyCategory ? 0.08 : 1);
  if (!Number.isFinite(initialImportStockRatio) || initialImportStockRatio < 0 || initialImportStockRatio > 1) {
    throw new Error(`Invalid initial import stock ratio for ${id}: ${initialImportStockRatio}`);
  }
  return Object.freeze({
    id,
    label,
    basePrice,
    category,
    unitSize,
    alwaysAvailable: options.alwaysAvailable === true,
    fixedBuyPrice: Number.isFinite(options.fixedBuyPrice) ? options.fixedBuyPrice : null,
    initialImportStockRatio,
    criticalStockPricing: options.criticalStockPricing === true,
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

function specialty(cityId, goodIds) {
  for (const goodId of goodIds) tradeGoodById(goodId);
  return [cityId, Object.freeze(goodIds.slice())];
}

function canonicalSpecialty(cityId, goodIds) {
  if (!Array.isArray(goodIds) || goodIds.length === 0) {
    throw new Error(`Canonical city specialty requires goods: ${cityId}`);
  }
  return [cityId, Object.freeze([...goodIds])];
}

function cityRates(cityId, values) {
  return [cityId, rates(values)];
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
