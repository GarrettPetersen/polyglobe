import { portEquipmentProsperity } from "./portEquipment.js";
import { requireCityId } from "./entityIds.js";
import { perkEffectLabels, validatePerkSource } from "./perkSystem.js";
import { MATCHLOCKS_GOOD_ID, portMarket } from "./economy.js";
import { isJapanesePolityFaction } from "./factions.js";
import {
  MATCHLOCK_ARQUEBUSES_ITEM_ID,
  PORTABLE_WEAPON_ITEMS,
  portableWeaponEffectLabel,
  portableWeaponItemIsArmoryUpgrade
} from "./portableWeapons.js";
import {
  GRAMMATICAL_NUMBER_PLURAL,
  GRAMMATICAL_NUMBER_SINGULAR,
  validateGrammaticalNumber
} from "./grammaticalNumber.js";

const EUROPEAN_FACTIONS = new Set([
  "england", "scotland", "france", "spain", "portugal", "burgundian-netherlands", "habsburg", "hungary",
  "venice", "genoa", "florence", "papal-states", "muscovy", "poland-lithuania", "sweden",
  "denmark-norway"
]);
const SOUTH_ASIAN_FACTIONS = new Set(["vijayanagara", "gujarat", "bengal", "delhi", "mughal"]);

export const HAJJ_PILGRIMAGE_PERK_ITEM_ID = "zamzam-flask";

function item(
  id,
  label,
  detail,
  price,
  tier,
  iconId,
  perks,
  regions = ["global"],
  {
    rewardOnly = false,
    grammaticalNumber = GRAMMATICAL_NUMBER_SINGULAR
  } = {}
) {
  const value = Object.freeze({
    id,
    label,
    grammaticalNumber,
    detail,
    price,
    tier,
    iconId,
    perks: Object.freeze(perks),
    regions: Object.freeze(regions),
    rewardOnly
  });
  validatePerkItem(value);
  return value;
}

export const PERK_ITEMS = Object.freeze([
  item("sturdy-barrels", "Sturdy Barrels", "Iron-hooped casks pack stores securely into the hold.", 700, 1,
    "item:sturdy-barrels", { cargoCapacityFlat: 3 }, ["global"],
    { grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL }),
  item("shore-party-kit", "Shore Party Kit", "Hatchets, sacks, tinderboxes, and cordage improve expeditions ashore.", 850, 1,
    "item:shore-party-kit", { scavengingChanceMultiplier: 1.18, scavengingYieldMultiplier: 1.3 }),
  item("tarred-hemp-rigging", "Tarred Hemp Rigging", "Weatherproof European hemp line makes sail handling faster.", 1100, 1,
    "item:tarred-hemp-rigging", { accelerationMultiplier: 1.08 }, ["europe"]),
  item("coir-cordage", "Coir Cordage", "Elastic coconut-fibre rope stands up well to warm salt water.", 1050, 1,
    "item:coir-cordage", { accelerationMultiplier: 1.06, windwardAngleReductionDeg: 1 }, ["indian-ocean"]),
  item("flemish-sailcloth", "Flemish Sailcloth", "Closely woven canvas holds its shape in a fresh breeze.", 2100, 2,
    "item:flemish-sailcloth", { topSpeedMultiplier: 1.08 }, ["europe"]),
  item("lateen-sailcloth", "Fine Lateen Sailcloth", "Light, strong canvas keeps a lateen rig drawing closer to the wind.", 2000, 2,
    "item:lateen-sailcloth", { topSpeedMultiplier: 1.04, windwardAngleReductionDeg: 2 }, ["indian-ocean"]),
  item("lead-sheathing", "Lead Hull Sheathing", "Lead plates can turn aside a glancing shot or protect the hull during a grounding.", 3600, 3,
    "item:lead-sheathing", { damageResistanceChance: 0.14 }),
  item("surgeons-chest", "Surgeon's Chest", "Bandages, needles, splints, and spirits improve survival after injury.", 1750, 2,
    "item:surgeons-chest", { crewCasualtyResistanceChance: 0.16 }),
  item("pilots-instruments", "Pilot's Instruments", "A compass, cross-staff, lead line, and tables sharpen shiphandling.", 2600, 2,
    "item:pilots-instruments", { topSpeedMultiplier: 1.03, windwardAngleReductionDeg: 1, seaworthinessFlat: 1 }, ["global"],
    { grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL }),
  item("longsword", "Longsword", "A well-made European sidearm lends confidence to a landing party.", 950, 1,
    "item:longsword", { portAssaultMeleeDamageMultiplier: 1.12 }, ["europe"]),
  item("tulwar", "Tulwar", "A curved South Asian sword built for decisive close fighting.", 1000, 1,
    "item:tulwar", { portAssaultMeleeDamageMultiplier: 1.14 }, ["south-asia"]),
  item("katana", "Katana", "A Japanese sword whose keen edge serves a marine officer well.", 1250, 2,
    "item:katana", { portAssaultMeleeDamageMultiplier: 1.16 }, ["japan"]),
  item("padded-jack", "Padded Jack", "A quilted coat gives a landing party useful protection without slowing it badly.", 800, 1,
    "item:padded-jack", { portAssaultArmorCoverageFlat: 0.06 }, ["global"]),
  item("brigandine", "Brigandine", "Overlapping plates riveted inside cloth turn blades while leaving a marine mobile.", 1900, 2,
    "item:brigandine", { portAssaultArmorCoverageFlat: 0.16 }, ["europe"]),
  item("indo-persian-mail", "Indo-Persian Mail", "A shirt of fine linked rings protects fighting hands from cuts and arrows.", 1850, 2,
    "item:indo-persian-mail", { portAssaultArmorCoverageFlat: 0.14 }, ["islamic", "south-asia"]),
  item("lamellar-coat", "Lamellar Coat", "Laced iron scales spread a blow across the body without the weight of solid plate.", 1800, 2,
    "item:lamellar-coat", { portAssaultArmorCoverageFlat: 0.15 }, ["east-asia"]),
  item("bronze-fish-hooks", "Bronze Fish Hooks", "A case of strong hooks improves both line fishing and net work.", 650, 1,
    "item:bronze-fish-hooks", { fishingChanceMultiplier: 1.08, fishingHaulMultiplier: 1.1 }, ["global"],
    { grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL }),
  item(
    HAJJ_PILGRIMAGE_PERK_ITEM_ID,
    "Zamzam Flask",
    "A pilgrim's flask filled at the Zamzam well, with a fitted cup that helps the crew ration every cask.",
    1600,
    2,
    "item:zamzam-flask",
    { waterDurationMultiplier: 1.1 },
    ["global"],
    { rewardOnly: true }
  ),
  ...PORTABLE_WEAPON_ITEMS
]);

const ITEMS_BY_ID = new Map(PERK_ITEMS.map((entry) => [entry.id, entry]));
if (ITEMS_BY_ID.size !== PERK_ITEMS.length) throw new Error("Duplicate perk item id");

export function perkItemById(id) {
  const value = ITEMS_BY_ID.get(id);
  if (!value) throw new Error(`Unknown perk item: ${id}`);
  return value;
}

export function perkItemOfferAtPort(economy, city, { ownedItemIds = [], seedKey = null } = {}) {
  if (!Array.isArray(ownedItemIds) || ownedItemIds.some((id) => typeof id !== "string")) {
    throw new Error("Perk item offer requires owned item ids");
  }
  if (seedKey !== null && (typeof seedKey !== "string" || seedKey.trim() === "")) {
    throw new Error("Perk item offer seed must be null or a non-empty string");
  }
  const prosperity = portEquipmentProsperity(economy, city);
  const portId = requiredPortId(city);
  const matchlocksListed = portMarket(economy, city).some((row) => (
    row.good.id === MATCHLOCKS_GOOD_ID && row.listedForSale
  ));
  if (matchlocksListed && perkItemIsMerchantUpgrade(MATCHLOCK_ARQUEBUSES_ITEM_ID, ownedItemIds)) {
    return perkItemById(MATCHLOCK_ARQUEBUSES_ITEM_ID);
  }
  const spawnChance = 0.035 + prosperity * 0.065;
  if (hashUnit(perkOfferSeedKey(seedKey, `${portId}|perk-item-offer|spawn`)) >= spawnChance) return null;

  const tierRoll = hashUnit(perkOfferSeedKey(seedKey, `${portId}|perk-item-offer|tier`));
  const maximumTier = prosperity >= 0.68 && tierRoll >= 0.9
    ? 3
    : prosperity >= 0.32 && tierRoll >= 0.48 ? 2 : 1;
  const candidates = PERK_ITEMS.filter((entry) => (
    !entry.rewardOnly &&
    entry.tier <= maximumTier && itemMatchesPortRegion(entry, city) &&
    perkItemIsMerchantUpgrade(entry.id, ownedItemIds)
  ));
  if (candidates.length === 0) return null;
  return candidates[
    hashString32(perkOfferSeedKey(seedKey, `${portId}|perk-item-offer|choice`)) % candidates.length
  ];
}

export function perkItemIsMerchantUpgrade(itemId, ownedItemIds) {
  if (!Array.isArray(ownedItemIds) || ownedItemIds.some((id) => typeof id !== "string")) {
    throw new Error("Merchant equipment comparison requires owned item ids");
  }
  const item = perkItemById(itemId);
  if (ownedItemIds.includes(item.id)) return false;
  if (!item.weapon && !item.modifier) return true;
  return portableWeaponItemIsArmoryUpgrade(item.id, ownedItemIds);
}

export function missionGiftItem({ city, identityKey, ownedItemIds = [] }) {
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Mission item gift requires an identity key");
  }
  const owned = new Set(ownedItemIds);
  const regional = PERK_ITEMS.filter((entry) => !entry.rewardOnly && itemMatchesPortRegion(entry, city));
  const unowned = regional.filter((entry) => !owned.has(entry.id));
  if (regional.length === 0) throw new Error(`No mission gift items available at ${city?.city || "unknown port"}`);
  if (unowned.length === 0) return null;
  return unowned[hashString32(`${identityKey}|mission-gift-item`) % unowned.length];
}

export function highValueMissionGiftItem({ city, identityKey, ownedItemIds = [] }) {
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("High-value mission item gift requires an identity key");
  }
  const owned = new Set(ownedItemIds);
  const unowned = PERK_ITEMS
    .filter((entry) => !entry.rewardOnly && itemMatchesPortRegion(entry, city) && !owned.has(entry.id))
    .sort((a, b) => b.price - a.price || b.tier - a.tier || a.id.localeCompare(b.id));
  if (unowned.length === 0) return null;
  const premiumFloor = Math.max(1500, Math.floor(unowned[0].price * 0.7));
  const premium = unowned.filter((entry) => entry.price >= premiumFloor);
  return premium[hashString32(`${identityKey}|high-value-mission-gift`) % premium.length];
}

export function perkItemSummary(itemId) {
  const value = perkItemById(itemId);
  const effectLabels = [...perkEffectLabels(value.perks)];
  if (value.weapon || value.modifier) effectLabels.push(portableWeaponEffectLabel(itemId));
  return Object.freeze({ ...value, effectLabels: Object.freeze(effectLabels) });
}

function validatePerkItem(value) {
  validatePerkSource(value);
  if (typeof value.label !== "string" || value.label.trim() === "") throw new Error(`Perk item ${value.id} needs a label`);
  validateGrammaticalNumber(value.grammaticalNumber, `perk item ${value.id}`);
  if (typeof value.detail !== "string" || value.detail.trim() === "") throw new Error(`Perk item ${value.id} needs detail`);
  if (!Number.isInteger(value.price) || value.price <= 0) throw new Error(`Invalid perk item price: ${value.id}`);
  if (!Number.isInteger(value.tier) || value.tier < 1 || value.tier > 3) throw new Error(`Invalid perk item tier: ${value.id}`);
  if (typeof value.iconId !== "string" || value.iconId.trim() === "") throw new Error(`Perk item ${value.id} needs an icon`);
  if (!Array.isArray(value.regions) || value.regions.length === 0) throw new Error(`Perk item ${value.id} needs regions`);
  if (typeof value.rewardOnly !== "boolean") throw new Error(`Perk item ${value.id} needs reward-only availability`);
  return value;
}

function itemMatchesPortRegion(entry, city) {
  if (entry.regions.includes("global")) return true;
  return entry.regions.some((region) => portHasRegion(city, region));
}

function portHasRegion(city, region) {
  if (!city || typeof city !== "object") return false;
  if (region === "japan") return isJapanesePolityFaction(city.factionId);
  if (region === "south-asia") return SOUTH_ASIAN_FACTIONS.has(city.factionId) || city.cityType === "south-asian";
  if (region === "europe") return EUROPEAN_FACTIONS.has(city.factionId);
  if (region === "england") return city.factionId === "england" || city.factionId === "scotland";
  if (region === "islamic") {
    return ["ottoman", "crimea", "kazan", "morocco", "safavid", "hormuz", "gujarat", "delhi", "mughal", "bengal"]
      .includes(city.factionId) || city.cityType === "islamic-desert";
  }
  if (region === "east-asia") {
    return ["ming", "joseon", "japan"].includes(city.factionId) || city.cityType === "east-asian";
  }
  if (region === "southeast-asia") {
    return ["ternate", "tidore"].includes(city.factionId) || city.cityType === "southeast-asian";
  }
  if (region === "indian-ocean") {
    return SOUTH_ASIAN_FACTIONS.has(city.factionId) || city.factionId === "ottoman" ||
      ["south-asian", "east-african", "desert"].includes(city.cityType);
  }
  throw new Error(`Unknown perk item region: ${region}`);
}

function requiredPortId(city) {
  return requireCityId(city, "Perk item offer port");
}

function perkOfferSeedKey(seedKey, value) {
  return seedKey === null ? value : `${seedKey}|${value}`;
}

function hashUnit(value) {
  return hashString32(value) / 0x100000000;
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
