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
const NEARBY_PORT_MARKET_INTEGRATION_STRENGTH = 0.65;
const SOURCE_SPICE_ABUNDANCE_PRICE_MULTIPLIER = 0.22;
const SOURCE_GINGER_ABUNDANCE_PRICE_MULTIPLIER = 0.4;
const SOURCE_SPICE_MINIMUM_TARGET_STOCK = 80;
const CRITICAL_STOCK_PRICE_THRESHOLD_RATIO = 0.75;
const CRITICAL_STOCK_PRICE_EXPONENT = 1.25;
const MINT_FEE_RATE = 0.05;
const SPECIE_METAL_GOOD_IDS = new Set(["gold", "silver"]);

export const HARDTACK_GOOD_ID = "hardtack";
export const FRESH_WATER_GOOD_ID = "fresh-water";
export const FORAGED_FOOD_GOOD_ID = "foraged-food";
export const WINE_GOOD_ID = "wine";
export const WHALE_BLUBBER_GOOD_ID = "whale-blubber";
export const BEAVER_PELTS_GOOD_ID = "beaver-pelts";
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
export const PAPER_GOOD_ID = "paper";
export const LACQUERWARE_GOOD_ID = "lacquerware";
export const GINSENG_GOOD_ID = "ginseng";
export const SULFUR_GOOD_ID = "sulfur";
export const PRINTED_BOOKS_GOOD_ID = "printed-books";

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
  good(WINE_GOOD_ID, "Wine", 18, "drink"),
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
  good(AMBER_GOOD_ID, "Amber", 52, "luxury", { initialImportStockRatio: 0.08 }),
  good(FURS_GOOD_ID, "Furs", 46, "luxury", { unitSize: 2, initialImportStockRatio: 0.08 }),
  good(BEESWAX_GOOD_ID, "Beeswax", 22, "material", { unitSize: 2, initialImportStockRatio: 0.08 }),
  good(NAVAL_STORES_GOOD_ID, "Naval Stores", 18, "material", {
    unitSize: 3,
    initialImportStockRatio: 0.08
  }),
  good(SULFUR_GOOD_ID, "Sulfur", 30, "material", { unitSize: 2, initialImportStockRatio: 0.08 }),
  good("arms", "Arms", 50, "manufactured", { unitSize: 2 }),
  good(GUNPOWDER_GOOD_ID, "Gunpowder", 44, "manufactured", {
    unitSize: 2,
    initialImportStockRatio: 0.08,
    criticalStockPricing: true
  }),
  good(MATCHLOCKS_GOOD_ID, "Matchlocks", 88, "manufactured", {
    unitSize: 2,
    initialImportStockRatio: 0.08
  }),
  good("linen-cloth", "Linen Cloth", 34, "textile", { unitSize: 2 }),
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
  good("tea", "Tea", 60, "luxury"),
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
  mediterranean: rates({ hardtack: 0.7, grain: 0.32, fish: 0.35, wine: 0.34, "olive-oil": 0.28, salt: 0.2, gunpowder: 0.06 }),
  "islamic-desert": rates({ hardtack: 0.55, cotton: 0.38, "cotton-cloth": 0.16, carpets: 0.14, perfume: 0.1, gunpowder: 0.05 }),
  "east-asian": rates({ hardtack: 0.55, grain: 0.7 }),
  "south-asian": rates({ hardtack: 0.6, grain: 0.65, cotton: 0.48, "cotton-cloth": 0.2, ginger: 0.12, dyes: 0.16, sugar: 0.12, gunpowder: 0.03 }),
  "southeast-asian": rates({ hardtack: 0.55, fish: 0.5, timber: 0.4, sugar: 0.22, ginger: 0.18, dyes: 0.1, indigo: 0.08, gunpowder: 0.02 }),
  polynesian: rates({ hardtack: 0.35, fish: 1.4, timber: 0.75, sugar: 0.55, dyes: 0.25, artwork: 0.3 }),
  mesoamerican: rates({ hardtack: 0.45, grain: 0.8, cacao: 1.1, sugar: 0.25, dyes: 0.55 }),
  andean: rates({ hardtack: 0.4, grain: 0.45, wool: 0.6, copper: 0.55, dyes: 0.2 }),
  "sub-saharan": rates({ hardtack: 0.45, grain: 0.45, timber: 0.45, ivory: 0.8, dyes: 0.35, salt: 0.3 })
});

const REGION_DEMAND = Object.freeze({
  "northern-european": rates({ wine: 0.65, "olive-oil": 0.5, "beaver-pelts": 0.6, pepper: 0.55, cinnamon: 0.5, cloves: 0.65, nutmeg: 0.7, ginger: 0.38, indigo: 0.34, tea: 0.45, porcelain: 0.4, silk: 0.35 }),
  mediterranean: rates({ timber: 0.55, iron: 0.35, "beaver-pelts": 0.38, pepper: 0.35, cinnamon: 0.3, cloves: 0.4, nutmeg: 0.42, ginger: 0.24, indigo: 0.2, silk: 0.3, ivory: 0.18 }),
  "islamic-desert": rates({ timber: 0.65, iron: 0.3, wool: 0.25, "beaver-pelts": 0.18, pepper: 0.12, cinnamon: 0.12, cloves: 0.14, nutmeg: 0.16, ginger: 0.08, tea: 0.2, porcelain: 0.22, ivory: 0.15 }),
  "east-asian": rates({ "beaver-pelts": 0.3, pepper: 0.25, cinnamon: 0.12, cloves: 0.22, nutmeg: 0.18, silver: 0.55, glassware: 0.25, wool: 0.2, gunpowder: 0.12, matchlocks: 0.42 }),
  "south-asian": rates({ cloves: 0.12, nutmeg: 0.12, silver: 0.4, gold: 0.15, porcelain: 0.2, silk: 0.2, arms: 0.18, gunpowder: 0.1, matchlocks: 0.18 }),
  "southeast-asian": rates({ pepper: 0.12, cinnamon: 0.16, cotton: 0.35, "cotton-cloth": 0.3, silver: 0.4, porcelain: 0.2, arms: 0.16, gunpowder: 0.12, matchlocks: 0.22 }),
  polynesian: rates({ iron: 0.65, arms: 0.45, matchlocks: 0.4, gunpowder: 0.35, "cotton-cloth": 0.45, glassware: 0.35, salt: 0.25 }),
  mesoamerican: rates({ iron: 0.7, arms: 0.55, matchlocks: 0.5, gunpowder: 0.4, "cotton-cloth": 0.3, glassware: 0.3, wine: 0.2 }),
  andean: rates({ iron: 0.55, arms: 0.5, matchlocks: 0.45, gunpowder: 0.4, "cotton-cloth": 0.3, wine: 0.2, salt: 0.2 }),
  "sub-saharan": rates({ "cotton-cloth": 0.5, iron: 0.45, arms: 0.35, matchlocks: 0.3, gunpowder: 0.25, salt: 0.35, glassware: 0.3 })
});

const REGION_TRADE_PRICE_MULTIPLIER = Object.freeze({
  "northern-european": rates({
    "beaver-pelts": 2.6,
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
  andean: rates({ arms: 1.35, gunpowder: 1.4, matchlocks: 1.65, iron: 1.25, glassware: 1.2, "cotton-cloth": 1.2, wine: 1.15 }),
  "sub-saharan": rates({ arms: 1.25, gunpowder: 1.3, matchlocks: 1.5, iron: 1.2, glassware: 1.2, "cotton-cloth": 1.2, salt: 1.15 })
});

const CITY_SPECIALTIES = uniqueMap([
  specialty("Lisbon", ["salt", GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID]),
  specialty("London", ["wool", "wool-cloth", "arms"]),
  specialty("Brugge", ["wool-cloth"]),
  specialty("Gent", ["wool-cloth", "linen-cloth"]),
  specialty("Norwich", ["wool-cloth"]),
  specialty("Exeter", ["tin", "wool"]),
  specialty("Gdansk", ["grain", AMBER_GOOD_ID]),
  specialty("Szczecin", ["grain", "timber", NAVAL_STORES_GOOD_ID]),
  specialty("Riga", ["flax", BEESWAX_GOOD_ID, NAVAL_STORES_GOOD_ID]),
  specialty("Stockholm", ["iron", "copper", NAVAL_STORES_GOOD_ID]),
  specialty("Novgorod", [FURS_GOOD_ID, BEESWAX_GOOD_ID]),
  specialty("Pskov", [FURS_GOOD_ID, BEESWAX_GOOD_ID]),
  specialty("Kholmogory", ["fish", FURS_GOOD_ID, BEESWAX_GOOD_ID]),
  specialty("Lubeck", ["salt", "fish"]),
  specialty("Copenhagen", ["fish", "salt"]),
  specialty("Krakow", ["salt"]),
  specialty("Venice", ["glassware", PRINTED_BOOKS_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("Genova", ["silver"]),
  specialty("Genoa", ["silver"]),
  specialty("Bologna", [PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID]),
  specialty("Milan", ["arms", "silk-cloth"]),
  specialty("Rome", ["artwork", PRINTED_BOOKS_GOOD_ID]),
  specialty("Nurnberg", ["arms", PRINTED_BOOKS_GOOD_ID]),
  specialty("Mainz", [PRINTED_BOOKS_GOOD_ID]),
  specialty("Leipzig", [PRINTED_BOOKS_GOOD_ID]),
  specialty("Paris", [PRINTED_BOOKS_GOOD_ID, "artwork"]),
  specialty("Alexandria", ["cotton-cloth"]),
  specialty("Istanbul", ["carpets", GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID]),
  specialty("Tabriz", ["carpets", GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID]),
  specialty("Cairo", ["artwork"]),
  specialty("Goa", ["pepper", GUNPOWDER_GOOD_ID, MATCHLOCKS_GOOD_ID]),
  specialty("Colombo", [CINNAMON_GOOD_ID]),
  specialty("Aden", ["coffee"]),
  specialty("Jeddah", ["coffee"]),
  specialty("Calicut", ["pepper"]),
  specialty("Cochin", ["pepper"]),
  specialty("Diu", ["cotton-cloth"]),
  specialty("Surat", ["cotton-cloth"]),
  specialty("Malacca", [GINGER_GOOD_ID]),
  specialty("Aceh", ["pepper", GINGER_GOOD_ID]),
  specialty("Quilon", ["pepper"]),
  specialty("Patani", ["pepper", GINGER_GOOD_ID]),
  specialty("Ternate", [CLOVE_GOOD_ID]),
  specialty("Tidore", [CLOVE_GOOD_ID]),
  specialty("Banda Village", [NUTMEG_GOOD_ID]),
  specialty("Makian Village", [CLOVE_GOOD_ID]),
  specialty("Gane Village", ["fish", "timber", NAVAL_STORES_GOOD_ID]),
  specialty("Buru Village", ["fish", "timber", BEESWAX_GOOD_ID]),
  specialty("Sofala", ["gold"]),
  specialty("Mozambique Island", ["gold", "ivory"]),
  specialty("Mombasa", ["ivory"]),
  specialty("Mogadishu", ["cotton-cloth", "ivory"]),
  specialty("Santo Domingo", ["sugar", INDIGO_GOOD_ID, "gold"]),
  specialty("Havana", ["sugar", INDIGO_GOOD_ID, "gold"]),
  specialty("Veracruz", ["cacao", "gold"]),
  specialty("Nombre de Dios", ["gold"]),
  specialty("Panama City", ["gold"]),
  specialty("Beijing", [PRINTED_BOOKS_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("Hangzhou", ["silk", "silk-cloth"]),
  specialty("Suzhou", ["silk", "silk-cloth"]),
  specialty("Jingdezhen", ["porcelain"]),
  specialty("Guangzhou", ["porcelain", "silk", "tea", GINGER_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("Fuzhou", ["tea", PAPER_GOOD_ID, "porcelain"]),
  specialty("Tsinkiang", ["tea", "porcelain"]),
  specialty("Nanjing", ["silk-cloth", PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("Chengdu", ["silk", PAPER_GOOD_ID]),
  specialty("Kaifeng", [PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID]),
  specialty("Xian", [PAPER_GOOD_ID, PRINTED_BOOKS_GOOD_ID]),
  specialty("Changsha", ["tea"]),
  specialty("Kaesong", [GINSENG_GOOD_ID, PAPER_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("Seoul", [GINSENG_GOOD_ID, PAPER_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("Gyeongju", [PAPER_GOOD_ID, LACQUERWARE_GOOD_ID]),
  specialty("Kyoto", ["silk-cloth", LACQUERWARE_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("Sakai", ["arms", LACQUERWARE_GOOD_ID, GUNPOWDER_GOOD_ID]),
  specialty("Yamaguchi", ["silver", SULFUR_GOOD_ID]),
  specialty("Fukuoka", [SULFUR_GOOD_ID]),
  specialty("Kagoshima", [SULFUR_GOOD_ID]),
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

const CITY_DEMANDS = uniqueMap([
  cityRates("London", { grain: 0.35, timber: 0.24, [AMBER_GOOD_ID]: 0.16, [FURS_GOOD_ID]: 0.16 }),
  cityRates("Brugge", { grain: 0.3, [AMBER_GOOD_ID]: 0.14, [BEESWAX_GOOD_ID]: 0.14 }),
  cityRates("Gent", { grain: 0.28, flax: 0.22, [BEESWAX_GOOD_ID]: 0.12 }),
  cityRates("Lubeck", { grain: 0.28, timber: 0.22, [AMBER_GOOD_ID]: 0.16, [FURS_GOOD_ID]: 0.14, [BEESWAX_GOOD_ID]: 0.14 }),
  cityRates("Hamburg", { grain: 0.28, timber: 0.2, [NAVAL_STORES_GOOD_ID]: 0.16, [FURS_GOOD_ID]: 0.12 }),
  cityRates("Bremen", { grain: 0.24, timber: 0.2, [NAVAL_STORES_GOOD_ID]: 0.16 }),
  cityRates("Gdansk", { "wool-cloth": 0.24, salt: 0.2, wine: 0.16, [PRINTED_BOOKS_GOOD_ID]: 0.1 }),
  cityRates("Riga", { "wool-cloth": 0.22, salt: 0.2, wine: 0.14, arms: 0.12 }),
  cityRates("Stockholm", { grain: 0.26, "wool-cloth": 0.2, salt: 0.16, wine: 0.14 }),
  cityRates("Novgorod", { "wool-cloth": 0.25, salt: 0.22, wine: 0.15, [AMBER_GOOD_ID]: 0.1 }),
  cityRates("Pskov", { "wool-cloth": 0.22, salt: 0.2, wine: 0.14 }),
  cityRates("Beijing", { silver: 0.24, [GINSENG_GOOD_ID]: 0.18, [LACQUERWARE_GOOD_ID]: 0.12 }),
  cityRates("Nanjing", { silver: 0.22, [GINSENG_GOOD_ID]: 0.14, [LACQUERWARE_GOOD_ID]: 0.12 }),
  cityRates("Hangzhou", { silver: 0.22, [GINSENG_GOOD_ID]: 0.13, [LACQUERWARE_GOOD_ID]: 0.12 }),
  cityRates("Guangzhou", { silver: 0.24, [GINSENG_GOOD_ID]: 0.12, [LACQUERWARE_GOOD_ID]: 0.1 }),
  cityRates("Kaesong", {
    silk: 0.2,
    porcelain: 0.2,
    [LACQUERWARE_GOOD_ID]: 0.22,
    [SULFUR_GOOD_ID]: 0.12
  }),
  cityRates("Seoul", {
    silk: 0.2,
    porcelain: 0.2,
    [LACQUERWARE_GOOD_ID]: 0.22,
    [SULFUR_GOOD_ID]: 0.12
  }),
  cityRates("Kyoto", { silk: 0.22, porcelain: 0.18, [GINSENG_GOOD_ID]: 0.18, [SULFUR_GOOD_ID]: 0.1 }),
  cityRates("Sakai", { silk: 0.18, porcelain: 0.18, [GINSENG_GOOD_ID]: 0.14, [SULFUR_GOOD_ID]: 0.12 }),
  cityRates("Kagoshima", { silk: 0.16, porcelain: 0.16, [GINSENG_GOOD_ID]: 0.12 })
], "city demands");

// Major commercial mints operating in 1522. Later colonial mints are intentionally excluded.
const MINT_CITY_NAMES_1522 = new Set([
  "Cairo",
  "Fez",
  "Genova",
  "Genoa",
  "Goa",
  "Istanbul",
  "Lisbon",
  "London",
  "Seville",
  "Venice"
].map(normalizeName));

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
    if (portStates.has(portId)) throw new Error(`Duplicate economy port tile: ${portId}`);
    portStates.set(portId, createPortState(port, seedKey));
  }
  for (const shipyardPort of shipyardPorts) {
    const portId = requiredPortId(shipyardPort);
    if (!portStates.has(portId)) throw new Error(`Shipyard city is missing from the economy: ${portId}`);
  }
  return {
    version: 1,
    seedKey,
    lastMinute: startMinute,
    portStates,
    shipyards: createWorldShipyards({ ports: shipyardPorts, startMinute, seedKey })
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
  const state = createPortState(port, economy.seedKey);
  const yard = addWorldShipyardPort(economy.shipyards, port, startMinute);
  economy.portStates.set(portId, state);
  return { port: state, shipyard: yard };
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
  return establishIndustryAtPort(port, goodId, productionPerDay, initialStock);
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
      targetSpecie: port.targetSpecie,
      industries: [...port.goods.entries()]
        .filter(([, state]) => state.industryProductionPerDay > 0)
        .map(([goodId, state]) => [goodId, state.industryProductionPerDay]),
      stocks: [...port.goods.entries()].map(([goodId, state]) => [goodId, state.stock])
    })),
    shipyards: snapshotWorldShipyards(economy.shipyards)
  };
}

export function restoreWorldEconomy(economy, snapshot, { seedKey = economy?.seedKey } = {}) {
  assertEconomy(economy);
  validateOptionalSeedKey(seedKey, "restored economy");
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
      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error(`Invalid saved stock: ${saved.id}/${goodId}=${stock}`);
      }
    }
  }
  economy.seedKey = seedKey;
  restoreWorldShipyards(economy.shipyards, snapshot.shipyards, { seedKey });
  for (const saved of snapshot.ports) {
    const port = economy.portStates.get(saved.id);
    for (const [goodId, productionPerDay] of saved.industries || []) {
      establishIndustryAtPort(port, goodId, productionPerDay, 0);
    }
    for (const [goodId, stock] of saved.stocks) port.goods.get(goodId).stock = stock;
    const savedTargetSpecie = saved.targetSpecie ?? legacyTargetSpecie(port);
    port.specie = saved.specie * port.targetSpecie / savedTargetSpecie;
  }
  economy.lastMinute = snapshot.lastMinute;
  return economy;
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
    populationScale: port.populationScale,
    hasMint: port.hasMint
  };
}

export function consumePortGoodStock(economy, city, goodId, quantity) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`Invalid port stock consumption: ${goodId}=${quantity}`);
  }
  return removePortGoodStock(economy, city, goodId, quantity);
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
  const total = applyTransactionPriceMultiplier(
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

export function planNpcTrade(
  economy,
  origin,
  destination,
  {
    cargoCapacity,
    specie,
    purchasePriceMultiplier = () => 1,
    salePriceMultiplier = () => 1
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

export function cargoSaleValue(economy, city, cargo, salePriceMultiplier = () => 1) {
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
  const productionProfile = REGION_PRODUCTION[port.cityType];
  const demandProfile = REGION_DEMAND[port.cityType];
  if (!productionProfile || !demandProfile) throw new Error(`No economy profile for city type: ${port.cityType}`);
  const specialties = CITY_SPECIALTIES.get(normalizeName(port.city)) || [];
  const cityDemandProfile = CITY_DEMANDS.get(normalizeName(port.city)) || {};
  const localSpiceSourceIds = new Set(TRADE_GOODS
    .filter((good) => good.category === "spice" && (
      specialties.includes(good.id) ||
      (good.id === GINGER_GOOD_ID && ["south-asian", "southeast-asian"].includes(port.cityType))
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
      economySeedKey(seedKey, `${port.tileId}|${good.id}|stock`)
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
  const targetSpecie = settlementType === "village"
    ? Math.round(700 + populationScale * 1800)
    : Math.round(8000 + populationScale * 38000);
  const marketPriceDepth = populationScale * (settlementType === "village"
    ? VILLAGE_MARKET_PRICE_DEPTH_PER_POPULATION_SCALE
    : CITY_MARKET_PRICE_DEPTH_PER_POPULATION_SCALE);
  return {
    id: requiredPortId(port),
    name: port.displayCity || port.city,
    cityType: port.cityType,
    settlementType,
    populationScale,
    marketPriceDepth,
    targetSpecie,
    specie: targetSpecie * (0.85 + hashUnit(economySeedKey(seedKey, `${port.tileId}|specie`)) * 0.3),
    hasMint: MINT_CITY_NAMES_1522.has(normalizeName(port.city)),
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
    listedForSale: good.alwaysAvailable || (portOffersGood(port, good) && (
      state.productionPerDay > 0 || state.stock >= Math.max(3, state.targetStock * 0.16)
    )),
    sellable: good.sellable !== false,
    portSpecie: Math.max(0, Math.floor(port.specie))
  };
}

function marketPrice(port, good, stock) {
  const specieMultiplier = speciePriceMultiplier(port);
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
  const integratedMultiplier = good.criticalStockPricing && stock <= 0
    ? MAX_PRICE_MULTIPLIER
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

function speciePriceMultiplier(port) {
  if (!Number.isFinite(port.specie) || port.specie < 0 ||
      !Number.isFinite(port.targetSpecie) || port.targetSpecie <= 0) {
    throw new Error(`${port.name} has invalid specie price inputs`);
  }
  const ratio = port.specie / port.targetSpecie;
  return clamp(
    Math.pow(ratio, SPECIE_PRICE_ELASTICITY),
    MIN_SPECIE_PRICE_MULTIPLIER,
    MAX_SPECIE_PRICE_MULTIPLIER
  );
}

function rawMarketMultiplier(port, good, stock) {
  const state = port.goods.get(good.id);
  const balance = (state.consumptionPerDay - state.productionPerDay) /
    (state.consumptionPerDay + state.productionPerDay + 0.2);
  const comparativeAdvantage = Math.exp(balance * 0.52);
  const scarcity = Math.pow(
    (state.targetStock + port.marketPriceDepth) /
      (Math.max(0, stock) + port.marketPriceDepth),
    0.72
  );
  const localVariation = 0.94 + hashUnit(`${port.id}|${good.id}|price`) * 0.12;
  const regionalTradePriceMultiplier = REGION_TRADE_PRICE_MULTIPLIER[port.cityType]?.[good.id] || 1;
  const ordinaryMultiplier = clamp(
    comparativeAdvantage * scarcity * localVariation * regionalTradePriceMultiplier,
    MIN_PRICE_MULTIPLIER * Math.min(1, regionalTradePriceMultiplier),
    MAX_PRICE_MULTIPLIER
  );
  return Math.max(
    ordinaryMultiplier,
    criticalStockPriceMultiplier(good, state, stock)
  );
}

function criticalStockPriceMultiplier(good, state, stock) {
  if (!good.criticalStockPricing) return MIN_PRICE_MULTIPLIER;
  const stockRatio = Math.max(0, stock) / state.targetStock;
  if (stockRatio >= CRITICAL_STOCK_PRICE_THRESHOLD_RATIO) return MIN_PRICE_MULTIPLIER;
  const shortage = 1 - stockRatio / CRITICAL_STOCK_PRICE_THRESHOLD_RATIO;
  return 1 + (MAX_PRICE_MULTIPLIER - 1) * Math.pow(shortage, CRITICAL_STOCK_PRICE_EXPONENT);
}

function quoteTransaction(port, good, quantity, stockDirection, priceKey) {
  if (quantity <= 0) return 0;
  if (priceKey === "sellPrice" && good.sellable === false) {
    throw new Error(`${port.name} does not buy ${good.label}`);
  }
  const state = port.goods.get(good.id);
  const startPrice = marketPrice(port, good, state.stock)[priceKey];
  const endStock = Math.max(0, state.stock + stockDirection * quantity);
  const endPrice = marketPrice(port, good, endStock)[priceKey];
  return Math.max(quantity, Math.round((startPrice + endPrice) * 0.5 * quantity));
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
  if (!port) throw new Error(`No economy exists for port tile: ${portId}`);
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
  return Object.freeze({
    good,
    requestedQuantity,
    consumedQuantity,
    remainingStock: state.stock
  });
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
  if (!economy || economy.version !== 1 || !(economy.portStates instanceof Map) || !economy.shipyards ||
      (economy.seedKey !== null && (typeof economy.seedKey !== "string" || economy.seedKey.trim() === ""))) {
    throw new Error("Invalid world economy");
  }
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
  for (const [inputGoodId, unitsPerOutput] of Object.entries(PRODUCTION_INPUTS[goodId] || {})) {
    const inputState = port.goods.get(inputGoodId);
    inputState.consumptionPerDay += productionPerDay * unitsPerOutput;
    inputState.targetStock = targetStockForState(inputState);
  }
  state.stock += initialStock;
  return Object.freeze({
    created: true,
    good,
    productionPerDay,
    stock: Math.floor(state.stock)
  });
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

function specialty(city, goodIds) {
  for (const goodId of goodIds) tradeGoodById(goodId);
  return [normalizeName(city), Object.freeze(goodIds.slice())];
}

function cityRates(city, values) {
  return [normalizeName(city), rates(values)];
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
