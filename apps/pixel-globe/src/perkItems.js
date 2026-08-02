import { portEquipmentProsperity } from "./portEquipment.js";
import { perkEffectLabels, validatePerkSource } from "./perkSystem.js";
import { MATCHLOCKS_GOOD_ID, portMarket } from "./economy.js";
import {
  MATCHLOCK_ARQUEBUSES_ITEM_ID,
  PORTABLE_WEAPON_ITEMS,
  portableWeaponEffectLabel
} from "./portableWeapons.js";

const EUROPEAN_FACTIONS = new Set([
  "england", "scotland", "france", "spain", "portugal", "habsburg", "hungary",
  "venice", "genoa", "papal-states", "muscovy", "poland-lithuania", "sweden",
  "denmark-norway"
]);
const SOUTH_ASIAN_FACTIONS = new Set(["vijayanagara", "gujarat", "bengal", "delhi"]);

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
  { rewardOnly = false } = {}
) {
  const value = Object.freeze({
    id,
    label,
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
    "item:sturdy-barrels", { cargoCapacityFlat: 3 }),
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
  item("lead-sheathing", "Lead Hull Sheathing", "Period hull sheathing sometimes turns a glancing blow or grounding.", 3600, 3,
    "item:lead-sheathing", { damageResistanceChance: 0.14 }),
  item("surgeons-chest", "Surgeon's Chest", "Bandages, needles, splints, and spirits improve survival after injury.", 1750, 2,
    "item:surgeons-chest", { crewCasualtyResistanceChance: 0.16 }),
  item("pilots-instruments", "Pilot's Instruments", "A compass, cross-staff, lead line, and tables sharpen shiphandling.", 2600, 2,
    "item:pilots-instruments", { topSpeedMultiplier: 1.03, windwardAngleReductionDeg: 1, seaworthinessFlat: 1 }),
  item("longsword", "Longsword", "A well-made European sidearm lends confidence to a landing party.", 950, 1,
    "item:longsword", { assaultChanceBonus: 0.05 }, ["europe"]),
  item("tulwar", "Tulwar", "A curved South Asian sword built for decisive close fighting.", 1000, 1,
    "item:tulwar", { assaultChanceBonus: 0.06 }, ["south-asia"]),
  item("katana", "Katana", "A Japanese sword whose keen edge serves a marine officer well.", 1250, 2,
    "item:katana", { assaultChanceBonus: 0.07 }, ["japan"]),
  item("bronze-fish-hooks", "Bronze Fish Hooks", "A case of strong hooks improves both line fishing and net work.", 650, 1,
    "item:bronze-fish-hooks", { fishingChanceMultiplier: 1.08, fishingHaulMultiplier: 1.1 }),
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
  const owned = new Set(ownedItemIds);
  const matchlocksListed = portMarket(economy, city).some((row) => (
    row.good.id === MATCHLOCKS_GOOD_ID && row.listedForSale
  ));
  if (matchlocksListed && !owned.has(MATCHLOCK_ARQUEBUSES_ITEM_ID)) {
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
    entry.tier <= maximumTier && itemMatchesPortRegion(entry, city) && !owned.has(entry.id)
  ));
  if (candidates.length === 0) return null;
  return candidates[
    hashString32(perkOfferSeedKey(seedKey, `${portId}|perk-item-offer|choice`)) % candidates.length
  ];
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
  if (region === "japan") return city.factionId === "japan";
  if (region === "south-asia") return SOUTH_ASIAN_FACTIONS.has(city.factionId) || city.cityType === "south-asian";
  if (region === "europe") return EUROPEAN_FACTIONS.has(city.factionId);
  if (region === "england") return city.factionId === "england" || city.factionId === "scotland";
  if (region === "islamic") {
    return ["ottoman", "crimea", "morocco", "safavid", "hormuz", "gujarat", "delhi", "bengal"]
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
  const id = city?.portId || (Number.isInteger(city?.tileId) ? `city-${city.tileId}` : null);
  if (!id) throw new Error("Perk item offer requires a city tile or port id");
  return id;
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
