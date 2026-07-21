import { SHIP_STATS } from "./shipStats.js";

export const GAME_ICON_SIZE = 16;
export const GAME_ICON_ATLAS_COLUMNS = 16;
export const GAME_ICON_ASSET_VERSION = "resurrect-icons-13";

export const GAME_ICON_PACKS = Object.freeze({
  pirate: iconPack({
    creator: "Free Game Assets",
    title: "Free Pirate Stuff Icons",
    sourceUrl: "https://free-game-assets.itch.io/free-pirate-stuff-pixel-art-icons",
    license: "CraftPix Freebie License",
    archive: "free-pirate-stuff-pixel-art-icons.zip"
  }),
  lethe: iconPack({
    creator: "LetheDiana",
    title: "Pixel Items_300+",
    sourceUrl: "https://lethediana.itch.io/pixel-items",
    license: "LetheDiana itch.io asset license",
    archive: "Pixel_Items_16x16_free.zip"
  }),
  glionox: iconPack({
    creator: "Glionox",
    title: "Items pack (x16)",
    sourceUrl: "https://glionox.itch.io/items16",
    license: "Glionox itch.io asset license",
    archive: "items.zip"
  }),
  alex: iconPack({
    creator: "alexkovacsart",
    title: "100 Free Pixel Art Foods!",
    sourceUrl: "https://alexkovacsart.itch.io/free-pixel-art-foods",
    license: "CC BY 4.0",
    archive: "Free_pixel_food_16x16.zip"
  }),
  keifoo: iconPack({
    creator: "KeifooPX",
    title: "99 various ingredients +",
    sourceUrl: "https://keifoopx.itch.io/99-various-ingredients",
    license: "KeifooPX itch.io asset license",
    archive: "99_ingredients.zip"
  }),
  hollow: iconPack({
    creator: "Hollow Dolphin",
    title: "Fishing Icon Pack 16x16",
    sourceUrl: "https://hollowdolphin.itch.io/fishing-icon-pack",
    license: "Hollow Dolphin itch.io asset license",
    archive: "Hollow Dolphin Fishing Icon Pack.zip"
  })
});

export const SHIP_MENU_ICON_IDS = Object.freeze(Object.fromEntries(
  SHIP_STATS.map(({ slug }) => [slug, `ship:${slug}`])
));

const SHIP_MENU_ICON_SOURCES = Object.freeze(Object.fromEntries(
  SHIP_STATS.map(({ slug }) => [
    SHIP_MENU_ICON_IDS[slug],
    projectAsset(`public/assets/ui/ship-icons/${slug}.png`)
  ])
));

export const GAME_ICON_SOURCES = Object.freeze({
  "good:hardtack": alex("pastry_bread.png"),
  "good:fresh-water": keifoo("water_png/water_bottled.png"),
  "good:foraged-food": alex("fruit_apple.png"),
  "good:grain": paperOutlined(keifoo("grains_png/wheat.png")),
  "good:fish": hollow(4),
  "good:whale-blubber": pirate(9),
  "good:beaver-pelts": generatedIcon("beaver-pelt"),
  "good:cheese": alex("cheese_gouda.png"),
  "good:wine": pirate(43),
  "good:olive-oil": glionox(378),
  "good:salt": paperOutlined(lethe(1, 7)),
  "good:sugar": paperOutlined(lethe(2, 7)),
  "good:timber": glionox(991),
  "good:wool": glionox(780),
  "good:cotton": glionox(1121),
  "good:flax": glionox(1010),
  "good:iron": glionox(562),
  "good:copper": glionox(564),
  "good:tin": glionox(566),
  "good:arms": pirate(34),
  "good:linen-cloth": paperOutlined(glionox(785)),
  "good:wool-cloth": glionox(581),
  "good:cotton-cloth": glionox(582),
  "good:silk": glionox(580),
  "good:silk-cloth": glionox(592),
  "good:pepper": keifoo("spices_png/pepper.png"),
  "good:cinnamon": generatedIcon("cinnamon-sticks"),
  "good:cloves": keifoo("spices_png/cloves.png"),
  "good:nutmeg": keifoo("spices_png/nutmeg.png"),
  "good:ginger": alex("vegetable_ginger.png"),
  "good:tea": alex("coffee_greentea.png"),
  "good:coffee": alex("coffee_darkroast.png"),
  "good:cacao": glionox(395),
  "good:dyes": lethe(10, 7),
  "good:indigo": lethe(1, 1),
  "good:porcelain": glionox(810),
  "good:glassware": keifoo("water_png/water_glass.png"),
  "good:carpets": glionox(660),
  "good:artwork": lethe(4, 14),
  "good:perfume": lethe(12, 2),
  "good:ivory": glionox(1164),
  "good:silver": glionox(570),
  "good:gold": glionox(567),

  "menu:continue": generatedIcon("play-arrow"),
  "menu:new-game": pirate(12),
  "menu:lake-battle": pirate(22),
  "menu:past-voyages": pirate(48),
  "menu:options": glionox(934),
  "menu:credits": glionox(625),
  "menu:captain": pirate(29),
  "menu:politics": pirate(23),
  "menu:discoveries": projectAsset("public/assets/terrain/resurrect-64/egyptian_pyramid.png", {
    x: 2,
    y: 0,
    w: 32,
    h: 32
  }),

  ...SHIP_MENU_ICON_SOURCES,

  "action:dock": pirate(44),
  "action:hail": pirate(14),
  "action:fish": hollow(7),
  "action:harpoon": glionox(119),
  "action:scavenge": pirate(40),
  "action:buy": pirate(31),
  "action:sell": pirate(32),
  "action:back": generatedIcon("back-arrow"),
  "action:leave": pirate(19),
  "action:quest": pirate(7),
  "action:talk": glionox(652),
  "action:wait": glionox(941),
  "action:attack": pirate(22),
  "action:loadout": glionox(934),
  "action:shipyard": glionox(695),
  "action:letter": lethe(5, 14),
  "action:disguise": pirate(35),
  "action:surrender": generatedIcon("surrender-flag"),
  "action:passenger": glionox(782),
  "action:viking": glionox(202),
  "action:inventory": pirate(10),
  "action:resume": generatedIcon("play-arrow"),
  "action:restart": generatedIcon("restart-arrow"),
  "action:choose-ships": pirate(19),
  "action:start-menu": pirate(4),
  "action:navigation": generatedIcon("gray-waypoint-arrow"),

  "good:gunpowder": pirate(42),
  "good:matchlocks": pirate(45)
});

const GAME_ICON_IDS = Object.freeze(Object.keys(GAME_ICON_SOURCES));
const GAME_ICON_INDEX = new Map(GAME_ICON_IDS.map((id, index) => [id, index]));
if (GAME_ICON_INDEX.size !== GAME_ICON_IDS.length) throw new Error("Game icon registry contains duplicate ids");

export const TRADE_GOOD_ICON_IDS = Object.freeze(Object.fromEntries(
  GAME_ICON_IDS
    .filter((id) => id.startsWith("good:"))
    .map((id) => [id.slice("good:".length), id])
));

const START_MENU_ICON_IDS = Object.freeze({
  continue: "menu:continue",
  "new-game": "menu:new-game",
  "lake-battle": "menu:lake-battle",
  "past-voyages": "menu:past-voyages",
  achievements: "good:gold",
  options: "menu:options",
  credits: "menu:credits"
});

const MENU_LABEL_ICON_IDS = Object.freeze({
  RESUME: "action:resume",
  RESTART: "action:restart",
  REMATCH: "action:attack",
  "CHOOSE SHIPS": "action:choose-ships",
  OPTIONS: "menu:options",
  "START MENU": "action:start-menu",
  BACK: "action:back",
  BATTLE: "action:attack"
});

const DIALOGUE_NODE_ICON_IDS = Object.freeze({
  greeting: "action:talk",
  "drunk-factor": "action:talk",
  root: "action:back",
  buy: "action:buy",
  equipment: "action:inventory",
  "equipment-nets": "action:fish",
  "equipment-cannons": "action:attack",
  "equipment-harpoons": "action:harpoon",
  loadout: "action:loadout",
  shipyard: "action:shipyard",
  sell: "action:sell",
  quest: "action:quest",
  "viking-longship": "action:viking",
  "japanese-matchlocks": "good:matchlocks",
  "caribbean-ginger": "good:ginger",
  colonization: "action:quest",
  marque: "action:letter",
  cargo: "action:inventory"
});

const DIALOGUE_ACTION_ICON_IDS = Object.freeze({
  close: "action:leave",
  "wait-in-port": "action:wait",
  "leave-buy": "action:back",
  "leave-sell": "action:back",
  "set-port-heading": "action:navigation",
  "open-port": "action:dock",
  "open-passenger": "action:passenger",
  "complete-quest": "action:quest",
  "attempt-disguise": "action:disguise",
  "land-marines": "action:attack",
  "attempt-ming-illicit-trade": "action:disguise",
  attack: "action:attack",
  threaten: "action:attack",
  surrender: "action:surrender",
  "review-surrendered-prize": "action:shipyard",
  "inspect-surrendered-ship": "action:shipyard",
  "capture-surrendered-ship": "action:surrender",
  sell: "action:sell",
  "open-custom-loadout": "action:loadout",
  "select-custom-loadout": "action:loadout",
  "select-loadout": "action:loadout",
  "request-marque": "action:letter",
  "purchase-safe-passage": "action:buy",
  "refuse-safe-passage": "action:leave",
  "purchase-viking-longship": "action:viking",
  "accept-viking-longship-reward": "action:viking",
  "decline-viking-longship-reward": "action:leave",
  "purchase-ship": "action:shipyard",
  "deliver-viking-material": "action:quest",
  "deliver-japanese-matchlock-material": "action:quest",
  "deliver-caribbean-ginger": "good:ginger",
  "deliver-colonization-material": "action:quest",
  "grant-colony-permission": "action:letter",
  "embark-colonists": "action:passenger",
  "land-colonists": "action:dock",
  "deliver-colony-resupply": "action:quest",
  "report-colony-defense": "action:quest",
  "confirm-piracy": "action:attack",
  "receive-aid": "good:fresh-water",
  "complete-passenger": "action:passenger",
  "negotiate-envoy": "action:letter",
  "envoy-negotiated": "action:letter",
  "continue-campaign": "action:talk",
  "buy-net": "action:fish",
  "buy-cannon-equipment": "action:attack",
  "buy-whale-harpoon": "action:harpoon",
  buy: "action:buy",
  "accept-quest": "action:quest",
  "accept-passenger": "action:passenger"
});

export function gameIconIds() {
  return GAME_ICON_IDS;
}

export function gameIconAtlasDimensions() {
  return {
    width: GAME_ICON_ATLAS_COLUMNS * GAME_ICON_SIZE,
    height: Math.ceil(GAME_ICON_IDS.length / GAME_ICON_ATLAS_COLUMNS) * GAME_ICON_SIZE
  };
}

export function gameIconAtlasRect(iconId) {
  const index = GAME_ICON_INDEX.get(iconId);
  if (index === undefined) throw new Error(`Unknown game icon: ${iconId}`);
  return {
    x: (index % GAME_ICON_ATLAS_COLUMNS) * GAME_ICON_SIZE,
    y: Math.floor(index / GAME_ICON_ATLAS_COLUMNS) * GAME_ICON_SIZE,
    w: GAME_ICON_SIZE,
    h: GAME_ICON_SIZE
  };
}

export function gameIconDrawRect(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Invalid game icon position: ${x},${y}`);
  }
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: GAME_ICON_SIZE,
    h: GAME_ICON_SIZE
  };
}

export function tradeGoodIconId(goodId) {
  const iconId = TRADE_GOOD_ICON_IDS[goodId];
  if (!iconId) throw new Error(`Trade good has no icon: ${goodId}`);
  return iconId;
}

export function startMenuIconId(actionId) {
  const iconId = START_MENU_ICON_IDS[actionId];
  if (!iconId) throw new Error(`Start menu action has no icon: ${actionId}`);
  return iconId;
}

export function shipMenuIconId(shipSlug) {
  const iconId = SHIP_MENU_ICON_IDS[shipSlug];
  if (!iconId) throw new Error(`Ship has no menu icon: ${shipSlug}`);
  return iconId;
}

export function menuLabelIconId(label) {
  const iconId = MENU_LABEL_ICON_IDS[label];
  if (!iconId) throw new Error(`Menu label has no icon: ${label}`);
  return iconId;
}

export function dialogueOptionIconId(option) {
  if (!option?.action?.type) throw new Error("Dialogue option has no action type");
  if (option.action.goodId) return tradeGoodIconId(option.action.goodId);
  if (option.action.type === "node" || (
    (option.action.type === "leave-buy" || option.action.type === "leave-sell") && option.action.nodeId
  )) {
    const iconId = DIALOGUE_NODE_ICON_IDS[option.action.nodeId];
    if (!iconId) throw new Error(`Dialogue node has no icon: ${option.action.nodeId}`);
    return iconId;
  }
  const iconId = DIALOGUE_ACTION_ICON_IDS[option.action.type];
  if (!iconId) throw new Error(`Dialogue action has no icon: ${option.action.type}`);
  return iconId;
}

function iconPack(pack) {
  return Object.freeze(pack);
}

function iconSource(packId, entry, crop = null) {
  if (!GAME_ICON_PACKS[packId]) throw new Error(`Unknown game icon pack: ${packId}`);
  return Object.freeze({ packId, entry, crop });
}

function projectAsset(assetPath, crop = null) {
  if (typeof assetPath !== "string" || !assetPath.startsWith("public/assets/")) {
    throw new Error(`Invalid project icon asset: ${assetPath}`);
  }
  return Object.freeze({ packId: null, assetPath, crop });
}

function generatedIcon(generatedId) {
  if (typeof generatedId !== "string" || generatedId === "") {
    throw new Error("Generated game icon requires an id");
  }
  return Object.freeze({ packId: null, generatedId });
}

function paperOutlined(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("Paper-outlined game icon requires a source");
  }
  return Object.freeze({ ...source, paperOutline: true });
}

function pirate(number) {
  return iconSource("pirate", `PNG/Transperent/Icon${number}.png`);
}

function lethe(cellX, cellY) {
  return iconSource("lethe", "Pixel_Items_16x16_free/items.png", { x: cellX * 16, y: cellY * 16, w: 16, h: 16 });
}

function glionox(number) {
  return iconSource("glionox", `item${number}.png`);
}

function alex(filename) {
  return iconSource("alex", `Free_pixel_food_16x16/Icons/${filename}`);
}

function keifoo(path) {
  return iconSource("keifoo", `99_ingredients/ingredients_png/${path}`);
}

function hollow(number) {
  return iconSource("hollow", `Separated Sprites/16x16/fishing_icons_16x16_${number}.png`);
}
