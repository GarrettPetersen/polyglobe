import { shipMinimumCrew } from "./shipLoadouts.js";
import { effectiveCrewHitChance } from "./combatWounds.js";
import {
  GRAMMATICAL_NUMBER_PLURAL,
  GRAMMATICAL_NUMBER_SINGULAR,
  validateGrammaticalNumber
} from "./grammaticalNumber.js";

export const PORTABLE_PROJECTILE_ARROW = "arrow";
export const PORTABLE_PROJECTILE_BULLET = "bullet";
export const PORTABLE_PROJECTILE_CANNON = "cannon";

export const PORTABLE_WEAPON_SOUND_BOW = "bow";
export const PORTABLE_WEAPON_SOUND_SMALL_FIREARM = "small-firearm";
export const PORTABLE_WEAPON_SOUND_CANNON = "cannon";

export const MARINERS_BOWS_ITEM_ID = "mariners-bows";
export const ENGLISH_LONGBOWS_ITEM_ID = "english-longbows";
export const COMPOSITE_BOWS_ITEM_ID = "composite-recurve-bows";
export const YUMI_ITEM_ID = "yumi";
export const CROSSBOWS_ITEM_ID = "crossbows";
export const MATCHLOCK_ARQUEBUSES_ITEM_ID = "matchlock-arquebuses";
export const WHEELLOCK_PISTOLS_ITEM_ID = "wheellock-pistol";
export const SWIVEL_GUN_ITEM_ID = "swivel-gun";
export const INCENDIARY_ARROWS_ITEM_ID = "incendiary-arrows";
export const VIKING_BOWS_ITEM_ID = "viking-bows";
export const INCENDIARY_ARROW_HULL_HIT_CHANCE = 0.2;
const PORTABLE_WEAPON_RATING_CREW = 5;

const EUROPEAN_FACTIONS = new Set([
  "england", "scotland", "france", "spain", "portugal", "habsburg", "hungary",
  "venice", "genoa", "papal-states", "hospitallers", "muscovy", "poland-lithuania",
  "sweden", "denmark-norway"
]);
const ISLAMIC_BOW_FACTIONS = new Set([
  "ottoman", "crimea", "morocco", "safavid", "hormuz", "gujarat", "delhi", "bengal"
]);
const SOUTH_ASIAN_FACTIONS = new Set(["vijayanagara", "gujarat", "bengal", "delhi"]);
const EAST_ASIAN_CROSSBOW_FACTIONS = new Set(["ming", "joseon"]);
const JAPANESE_SHIP_SLUGS = new Set([
  "japanese-kuribune", "japanese-kobaya", "japanese-sekibune", "japanese-atakebune"
]);
const EAST_ASIAN_SHIP_SLUGS = new Set([
  "sampan", "small-junk", "medium-junk", "large-junk", "joseon-turtle-ship",
  "joseon-hyeopseon", "joseon-panokseon"
]);
const ISLAMIC_AND_INDIAN_OCEAN_SHIP_SLUGS = new Set([
  "dhow", "ocean-dhow", "felucca", "xebec", "ottoman-coastal-trader"
]);
const SOUTHEAST_ASIAN_SHIP_SLUGS = new Set([
  "nusantaran-outrigger", "kelulus", "penjajap", "lancaran", "royal-lancaran", "javanese-jong"
]);

function portableItem({
  id,
  label,
  grammaticalNumber,
  detail,
  price,
  tier,
  iconId,
  perks,
  regions,
  weapon = null,
  modifier = null,
  rewardOnly = false
}) {
  if ((weapon === null) === (modifier === null)) {
    throw new Error(`Portable weapon item ${id} needs exactly one weapon or modifier`);
  }
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
    rewardOnly,
    weapon: weapon ? weaponSpec(id, weapon) : null,
    modifier: modifier ? Object.freeze({ ...modifier }) : null
  });
  validateGrammaticalNumber(grammaticalNumber, `portable weapon item ${id}`);
  return value;
}

function weaponSpec(itemId, {
  animationKind,
  hullDamage,
  hullHitChance = 1,
  crewDamage,
  crewHitChance,
  rangeScale,
  speedScale,
  arcHeightScale,
  reloadSeconds,
  singleInstallation = false,
  crewProtectionPenetration = 0,
  projectileSize = 1,
  smokeScale = 0,
  bow = false,
  swivel = false
}) {
  const spec = {
    itemId,
    animationKind,
    hullDamage,
    hullHitChance,
    crewDamage,
    crewHitChance,
    rangeScale,
    speedScale,
    arcHeightScale,
    reloadSeconds,
    singleInstallation,
    crewProtectionPenetration,
    projectileSize,
    smokeScale,
    bow,
    swivel
  };
  validatePortableWeaponSpec(spec);
  return Object.freeze(spec);
}

export const PORTABLE_WEAPON_ITEMS = Object.freeze([
  portableItem({
    id: MARINERS_BOWS_ITEM_ID,
    label: "Mariners' Bows",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "A rack of simple bows lets free hands harry an exposed enemy deck.",
    price: 450,
    tier: 1,
    iconId: "item:mariners-bows",
    perks: { assaultChanceBonus: 0.01 },
    regions: ["global"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.2, rangeScale: 0.48, speedScale: 1.3, arcHeightScale: 0.8,
      reloadSeconds: 2.4, bow: true
    }
  }),
  portableItem({
    id: ENGLISH_LONGBOWS_ITEM_ID,
    label: "English Longbows",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "Powerful yew bows reach farther across the water, but demand practiced archers.",
    price: 950,
    tier: 2,
    iconId: "item:english-longbows",
    perks: { assaultChanceBonus: 0.02 },
    regions: ["england"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.27, rangeScale: 0.64, speedScale: 1.38, arcHeightScale: 0.7,
      reloadSeconds: 2.7, crewProtectionPenetration: 0.1, bow: true
    }
  }),
  portableItem({
    id: COMPOSITE_BOWS_ITEM_ID,
    label: "Composite Recurve Bows",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "Compact horn-and-sinew bows loose quickly from a crowded deck.",
    price: 900,
    tier: 2,
    iconId: "item:composite-recurve-bows",
    perks: { assaultChanceBonus: 0.02 },
    regions: ["islamic", "south-asia", "southeast-asia"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.25, rangeScale: 0.57, speedScale: 1.4, arcHeightScale: 0.72,
      reloadSeconds: 2.0, crewProtectionPenetration: 0.08, bow: true
    }
  }),
  portableItem({
    id: YUMI_ITEM_ID,
    label: "Yumi",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "Asymmetric Japanese bows can be worked above a gunwale without striking the deck.",
    price: 1000,
    tier: 2,
    iconId: "item:yumi",
    perks: { assaultChanceBonus: 0.02 },
    regions: ["japan"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.28, rangeScale: 0.61, speedScale: 1.38, arcHeightScale: 0.72,
      reloadSeconds: 2.3, crewProtectionPenetration: 0.08, bow: true
    }
  }),
  portableItem({
    id: VIKING_BOWS_ITEM_ID,
    label: "Viking Bows",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "Reconstructed ash and yew bows complete the longship's fighting equipment.",
    price: 850,
    tier: 2,
    iconId: "item:viking-bows",
    perks: { assaultChanceBonus: 0.02 },
    regions: ["global"],
    rewardOnly: true,
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.25, rangeScale: 0.56, speedScale: 1.34, arcHeightScale: 0.75,
      reloadSeconds: 2.25, crewProtectionPenetration: 0.05, bow: true
    }
  }),
  portableItem({
    id: CROSSBOWS_ITEM_ID,
    label: "Crossbows",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "A chest of crossbows trades a slow spanning time for an easier, harder shot.",
    price: 1150,
    tier: 2,
    iconId: "item:crossbows",
    perks: { assaultChanceBonus: 0.03 },
    regions: ["europe", "east-asia"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.44, rangeScale: 0.62, speedScale: 1.55, arcHeightScale: 0.55,
      reloadSeconds: 4, crewProtectionPenetration: 0.35
    }
  }),
  portableItem({
    id: MATCHLOCK_ARQUEBUSES_ITEM_ID,
    label: "Matchlock Arquebuses",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "A stand of heavy handguns punches through cover at the cost of smoke and a long reload.",
    price: 3400,
    tier: 3,
    iconId: "item:matchlock-arquebuses",
    perks: { assaultChanceBonus: 0.08 },
    regions: ["europe", "islamic", "south-asia"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_BULLET, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.78, rangeScale: 0.55, speedScale: 2.1, arcHeightScale: 0.16,
      reloadSeconds: 5.8, crewProtectionPenetration: 0.7,
      smokeScale: 0.35
    }
  }),
  portableItem({
    id: WHEELLOCK_PISTOLS_ITEM_ID,
    label: "Wheellock Pistols",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "Costly self-igniting pistols are deadly at close range and useful in a landing party.",
    price: 3000,
    tier: 3,
    iconId: "item:wheellock-pistol",
    perks: { assaultChanceBonus: 0.1 },
    regions: ["europe"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_BULLET, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.7, rangeScale: 0.32, speedScale: 2.0, arcHeightScale: 0.12,
      reloadSeconds: 4.8, crewProtectionPenetration: 0.55,
      smokeScale: 0.28
    }
  }),
  portableItem({
    id: SWIVEL_GUN_ITEM_ID,
    label: "Swivel Gun",
    grammaticalNumber: GRAMMATICAL_NUMBER_SINGULAR,
    detail: "One rail-mounted light gun can turn in any direction and rake an exposed deck.",
    price: 2800,
    tier: 3,
    iconId: "item:swivel-gun",
    perks: { assaultChanceBonus: 0.04 },
    regions: ["europe", "islamic", "south-asia", "east-asia", "southeast-asia"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_CANNON, hullDamage: 0.5, crewDamage: 2,
      crewHitChance: 0.68, rangeScale: 0.76, speedScale: 1.5, arcHeightScale: 0.18,
      reloadSeconds: 8, singleInstallation: true, crewProtectionPenetration: 0.75,
      projectileSize: 1, smokeScale: 0.55, swivel: true
    }
  }),
  portableItem({
    id: INCENDIARY_ARROWS_ITEM_ID,
    label: "Incendiary Arrows",
    grammaticalNumber: GRAMMATICAL_NUMBER_PLURAL,
    detail: "Pitch-wrapped heads let every bow threaten rigging and planks, but fly shorter and slower.",
    price: 1400,
    tier: 2,
    iconId: "item:incendiary-arrows",
    perks: { assaultChanceBonus: 0.02 },
    regions: ["global"],
    modifier: Object.freeze({
      kind: "incendiary-arrows",
      bowRangeMultiplier: 0.72,
      bowReloadMultiplier: 1.55,
      bowHullDamage: 0.25,
      bowHullHitChance: INCENDIARY_ARROW_HULL_HIT_CHANCE
    })
  })
]);

const ITEMS_BY_ID = new Map(PORTABLE_WEAPON_ITEMS.map((item) => [item.id, item]));
if (ITEMS_BY_ID.size !== PORTABLE_WEAPON_ITEMS.length) throw new Error("Duplicate portable weapon item id");

export function portableWeaponItemById(itemId) {
  const item = ITEMS_BY_ID.get(itemId);
  if (!item) throw new Error(`Unknown portable weapon item: ${itemId}`);
  return item;
}

export function isPortableWeaponItemId(itemId) {
  return ITEMS_BY_ID.has(itemId);
}

export function portableWeaponItemIsArmoryUpgrade(itemId, ownedItemIds) {
  if (!Array.isArray(ownedItemIds) || ownedItemIds.some((id) => typeof id !== "string")) {
    throw new Error("Portable weapon upgrade comparison requires owned item ids");
  }
  const candidate = portableWeaponItemById(itemId);
  const owned = new Set(ownedItemIds.filter(isPortableWeaponItemId));
  if (owned.has(itemId)) return false;

  if (candidate.modifier) {
    return [...owned].some((id) => portableWeaponItemById(id).weapon?.bow);
  }

  const singleInstallation = candidate.weapon.singleInstallation;
  const bestOwnedTier = [...owned].reduce((bestTier, id) => {
    const item = portableWeaponItemById(id);
    if (!item.weapon || item.weapon.singleInstallation !== singleInstallation) return bestTier;
    return Math.max(bestTier, item.tier);
  }, 0);
  return candidate.tier > bestOwnedTier;
}

export function portableWeaponSoundKind(weapon) {
  if (!weapon || typeof weapon !== "object") {
    throw new Error("Portable weapon sound needs a weapon");
  }
  if (weapon.animationKind === PORTABLE_PROJECTILE_ARROW) {
    return PORTABLE_WEAPON_SOUND_BOW;
  }
  if (weapon.animationKind === PORTABLE_PROJECTILE_BULLET) {
    if (weapon.swivel) throw new Error(`Small firearm cannot be a swivel gun: ${weapon.itemId}`);
    return PORTABLE_WEAPON_SOUND_SMALL_FIREARM;
  }
  if (weapon.animationKind === PORTABLE_PROJECTILE_CANNON) {
    if (!weapon.swivel) throw new Error(`Portable cannon must be a swivel gun: ${weapon.itemId}`);
    return PORTABLE_WEAPON_SOUND_CANNON;
  }
  throw new Error(`Unknown portable weapon sound animation: ${weapon.animationKind}`);
}

export function ownedPortableWeaponItemIds(itemCounts) {
  if (!itemCounts || typeof itemCounts !== "object" || Array.isArray(itemCounts)) {
    throw new Error("Portable weapon inventory must be an item-count object");
  }
  return Object.entries(itemCounts)
    .filter(([itemId, count]) => count > 0 && isPortableWeaponItemId(itemId))
    .map(([itemId]) => itemId);
}

export function regionalStarterPortableWeaponItemIds({ factionId, cityType = null, shipSlug = null }) {
  if (typeof factionId !== "string" || factionId === "") {
    throw new Error(`Starter portable weapons require a faction: ${factionId}`);
  }
  if (shipSlug === "viking-longship") return Object.freeze([VIKING_BOWS_ITEM_ID]);
  if (factionId === "england" || factionId === "scotland") {
    return Object.freeze([ENGLISH_LONGBOWS_ITEM_ID]);
  }
  if (factionId === "japan") return Object.freeze([YUMI_ITEM_ID]);
  if (EAST_ASIAN_CROSSBOW_FACTIONS.has(factionId)) return Object.freeze([CROSSBOWS_ITEM_ID]);
  if (ISLAMIC_BOW_FACTIONS.has(factionId) || SOUTH_ASIAN_FACTIONS.has(factionId) ||
      ["south-asian", "southeast-asian", "islamic-desert"].includes(cityType)) {
    return Object.freeze([COMPOSITE_BOWS_ITEM_ID]);
  }
  if (EUROPEAN_FACTIONS.has(factionId) || ["northern-european", "mediterranean"].includes(cityType)) {
    return Object.freeze([CROSSBOWS_ITEM_ID]);
  }
  return Object.freeze([MARINERS_BOWS_ITEM_ID]);
}

export function npcPortableWeaponItemIds({
  factionId,
  cityType = null,
  shipSlug,
  role,
  cannons,
  identityKey
}) {
  if (!Number.isInteger(cannons) || cannons < 0) throw new Error(`Invalid NPC cannon count: ${cannons}`);
  if (typeof identityKey !== "string" || identityKey === "") throw new Error("NPC portable weapons require an identity");
  const ids = [...regionalStarterPortableWeaponItemIds({ factionId, cityType, shipSlug })];
  const military = role === "warship" || role === "pirate";
  if (military && cannons > 0 && factionUsesMatchlocks(factionId, cityType) && seededUnit(`${identityKey}|matchlocks`) < 0.72) {
    ids.push(MATCHLOCK_ARQUEBUSES_ITEM_ID);
  }
  if (military && cannons >= 6 && seededUnit(`${identityKey}|swivel`) < 0.58) ids.push(SWIVEL_GUN_ITEM_ID);
  if (military && ids.some((id) => portableWeaponItemById(id).weapon?.bow) &&
      seededUnit(`${identityKey}|incendiary`) < 0.16) {
    ids.push(INCENDIARY_ARROWS_ITEM_ID);
  }
  return Object.freeze(ids);
}

export function representativePortableWeaponItemIdsForShip({ shipSlug, cannons }) {
  if (typeof shipSlug !== "string" || shipSlug === "") {
    throw new Error(`Representative portable weapons require a ship: ${shipSlug}`);
  }
  if (!Number.isInteger(cannons) || cannons < 0) {
    throw new Error(`Invalid representative cannon count: ${cannons}`);
  }

  const baseWeaponId = shipSlug === "viking-longship"
    ? VIKING_BOWS_ITEM_ID
    : JAPANESE_SHIP_SLUGS.has(shipSlug)
      ? YUMI_ITEM_ID
      : EAST_ASIAN_SHIP_SLUGS.has(shipSlug)
        ? CROSSBOWS_ITEM_ID
        : ISLAMIC_AND_INDIAN_OCEAN_SHIP_SLUGS.has(shipSlug) || SOUTHEAST_ASIAN_SHIP_SLUGS.has(shipSlug)
          ? COMPOSITE_BOWS_ITEM_ID
          : MARINERS_BOWS_ITEM_ID;
  const ids = [baseWeaponId];

  // The arena has no faction or port context, so give gunpowder hulls a representative
  // fighting fit instead of pretending their crews brought no portable firearms.
  if (cannons >= 6) ids.push(MATCHLOCK_ARQUEBUSES_ITEM_ID);
  if (cannons >= 12) ids.push(SWIVEL_GUN_ITEM_ID);
  return Object.freeze(ids);
}

export function activePortableWeaponAssignments({
  ownedItemIds,
  activeCrew,
  shipStats,
  installedCannons,
  targetDistancePx,
  baseRangePx,
  targetCrewProtection = 0
}) {
  if (!Array.isArray(ownedItemIds)) throw new Error("Portable weapon assignments require item ids");
  if (!Number.isInteger(activeCrew) || activeCrew < 0) throw new Error(`Invalid active weapon crew: ${activeCrew}`);
  if (!shipStats || typeof shipStats !== "object") throw new Error("Portable weapons require ship stats");
  if (!Number.isInteger(installedCannons) || installedCannons < 0) {
    throw new Error(`Invalid installed cannon count: ${installedCannons}`);
  }
  if (!Number.isFinite(targetDistancePx) || targetDistancePx < 0 ||
      !Number.isFinite(baseRangePx) || baseRangePx <= 0) {
    throw new Error(`Invalid portable weapon range: ${targetDistancePx}/${baseRangePx}`);
  }
  if (!Number.isInteger(targetCrewProtection) || targetCrewProtection < 0 || targetCrewProtection > 100) {
    throw new Error(`Invalid portable weapon target protection: ${targetCrewProtection}`);
  }
  const owned = new Set(ownedItemIds);
  const incendiary = owned.has(INCENDIARY_ARROWS_ITEM_ID);
  const availableWeapons = [...owned]
    .map((id) => portableWeaponItemById(id).weapon)
    .filter(Boolean)
    .map((weapon) => incendiary && weapon.bow ? applyIncendiaryArrows(weapon) : weapon)
    .filter((weapon) => targetDistancePx <= baseRangePx * weapon.rangeScale)
    .sort((a, b) => (
      Number(b.swivel) - Number(a.swivel) ||
      portableWeaponScore(b, targetCrewProtection) - portableWeaponScore(a, targetCrewProtection) ||
      a.itemId.localeCompare(b.itemId)
    ));
  if (availableWeapons.length === 0 || activeCrew === 0) return Object.freeze([]);

  const minimumCrew = shipMinimumCrew(shipStats);
  const sailingReserve = Math.min(Math.max(0, activeCrew - 1), Math.max(1, Math.ceil(minimumCrew * 0.6)));
  const cannonReserve = Math.min(
    Math.max(0, activeCrew - sailingReserve - 1),
    Math.ceil(installedCannons / 3)
  );
  let freeCrew = Math.max(0, activeCrew - sailingReserve - cannonReserve);
  const assignments = [];
  for (const weapon of availableWeapons) {
    if (freeCrew <= 0) break;
    // Small-arms purchases stock an armory for every free hand; mounted weapons are singular.
    const operators = weapon.singleInstallation ? Math.min(1, freeCrew) : freeCrew;
    if (operators <= 0) continue;
    assignments.push(Object.freeze({ weapon, operators }));
    freeCrew -= operators;
  }
  return Object.freeze(assignments);
}

export function portableWeaponEffectLabel(itemId) {
  const item = portableWeaponItemById(itemId);
  if (item.modifier) return "Bows gain hull damage; range -28%; reload 55% slower";
  const weapon = item.weapon;
  const damage = weapon.hullDamage > 0
    ? `${weapon.crewDamage} crew / ${weapon.hullDamage} hull`
    : `${weapon.crewDamage} crew`;
  return `${damage}; range ${Math.round(weapon.rangeScale * 74)}; reload ${weapon.reloadSeconds}s`;
}

export function portableWeaponCombatRating(itemIds) {
  if (!Array.isArray(itemIds)) throw new Error("Portable weapon rating requires item ids");
  // This strategic rating lacks a live crew count, so compare armories at a standard detail size.
  let sharedArmoryScore = 0;
  let installedWeaponScore = 0;
  for (const itemId of itemIds) {
    const item = portableWeaponItemById(itemId);
    if (!item.weapon) continue;
    const score = portableWeaponScore(item.weapon);
    if (item.weapon.singleInstallation) installedWeaponScore += score;
    else sharedArmoryScore = Math.max(sharedArmoryScore, score);
  }
  return installedWeaponScore + sharedArmoryScore * PORTABLE_WEAPON_RATING_CREW;
}

function applyIncendiaryArrows(weapon) {
  const modifier = portableWeaponItemById(INCENDIARY_ARROWS_ITEM_ID).modifier;
  return Object.freeze({
    ...weapon,
    rangeScale: weapon.rangeScale * modifier.bowRangeMultiplier,
    reloadSeconds: weapon.reloadSeconds * modifier.bowReloadMultiplier,
    hullDamage: Math.max(weapon.hullDamage, modifier.bowHullDamage),
    hullHitChance: modifier.bowHullHitChance,
    incendiary: true
  });
}

function portableWeaponScore(weapon, targetCrewProtection = 0) {
  const effectiveHitChance = effectiveCrewHitChance(
    weapon.crewHitChance,
    targetCrewProtection,
    weapon.crewProtectionPenetration
  );
  return (
    weapon.crewDamage * effectiveHitChance +
    weapon.hullDamage * weapon.hullHitChance * 1.5
  ) / weapon.reloadSeconds;
}

function factionUsesMatchlocks(factionId, cityType) {
  return EUROPEAN_FACTIONS.has(factionId) || ISLAMIC_BOW_FACTIONS.has(factionId) ||
    SOUTH_ASIAN_FACTIONS.has(factionId) || factionId === "ming" ||
    ["northern-european", "mediterranean", "south-asian", "islamic-desert"].includes(cityType);
}

function validatePortableWeaponSpec(spec) {
  if (![PORTABLE_PROJECTILE_ARROW, PORTABLE_PROJECTILE_BULLET, PORTABLE_PROJECTILE_CANNON].includes(spec.animationKind)) {
    throw new Error(`Invalid portable weapon animation: ${spec.itemId}`);
  }
  for (const key of ["hullDamage", "hullHitChance", "crewDamage", "crewHitChance", "rangeScale", "speedScale", "arcHeightScale", "reloadSeconds", "crewProtectionPenetration", "smokeScale"]) {
    if (!Number.isFinite(spec[key]) || spec[key] < 0) throw new Error(`Invalid portable weapon ${key}: ${spec.itemId}`);
  }
  if (!Number.isInteger(spec.crewDamage) || spec.crewDamage <= 0 ||
      !Number.isInteger(spec.projectileSize) || spec.projectileSize <= 0 ||
      spec.hullHitChance > 1 || spec.crewHitChance > 1 || spec.crewProtectionPenetration > 1 ||
      spec.rangeScale <= 0 || spec.speedScale <= 0 || spec.reloadSeconds <= 0) {
    throw new Error(`Invalid portable weapon combat values: ${spec.itemId}`);
  }
  if (typeof spec.singleInstallation !== "boolean") {
    throw new Error(`Invalid portable weapon installation type: ${spec.itemId}`);
  }
}

function seededUnit(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x100000000;
}
