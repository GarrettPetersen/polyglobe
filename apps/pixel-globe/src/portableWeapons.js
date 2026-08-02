import { shipMinimumCrew } from "./shipLoadouts.js";

export const PORTABLE_PROJECTILE_ARROW = "arrow";
export const PORTABLE_PROJECTILE_BULLET = "bullet";
export const PORTABLE_PROJECTILE_CANNON = "cannon";

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

function portableItem({
  id,
  label,
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
  return value;
}

function weaponSpec(itemId, {
  animationKind,
  hullDamage,
  crewDamage,
  crewHitChance,
  rangeScale,
  speedScale,
  arcHeightScale,
  reloadSeconds,
  operatorLimit,
  projectileSize = 1,
  smokeScale = 0,
  bow = false,
  swivel = false
}) {
  const spec = {
    itemId,
    animationKind,
    hullDamage,
    crewDamage,
    crewHitChance,
    rangeScale,
    speedScale,
    arcHeightScale,
    reloadSeconds,
    operatorLimit,
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
    detail: "A rack of simple bows lets free hands harry an exposed enemy deck.",
    price: 450,
    tier: 1,
    iconId: "item:mariners-bows",
    perks: { assaultChanceBonus: 0.01 },
    regions: ["global"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.2, rangeScale: 0.48, speedScale: 1.3, arcHeightScale: 0.8,
      reloadSeconds: 2.4, operatorLimit: 5, bow: true
    }
  }),
  portableItem({
    id: ENGLISH_LONGBOWS_ITEM_ID,
    label: "English Longbows",
    detail: "Powerful yew bows reach farther across the water, but demand practiced archers.",
    price: 950,
    tier: 2,
    iconId: "item:english-longbows",
    perks: { assaultChanceBonus: 0.02 },
    regions: ["england"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.27, rangeScale: 0.64, speedScale: 1.38, arcHeightScale: 0.7,
      reloadSeconds: 2.7, operatorLimit: 5, bow: true
    }
  }),
  portableItem({
    id: COMPOSITE_BOWS_ITEM_ID,
    label: "Composite Recurve Bows",
    detail: "Compact horn-and-sinew bows loose quickly from a crowded deck.",
    price: 900,
    tier: 2,
    iconId: "item:composite-recurve-bows",
    perks: { assaultChanceBonus: 0.02 },
    regions: ["islamic", "south-asia", "southeast-asia"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.25, rangeScale: 0.57, speedScale: 1.4, arcHeightScale: 0.72,
      reloadSeconds: 2.0, operatorLimit: 5, bow: true
    }
  }),
  portableItem({
    id: YUMI_ITEM_ID,
    label: "Yumi",
    detail: "Asymmetric Japanese bows can be worked above a gunwale without striking the deck.",
    price: 1000,
    tier: 2,
    iconId: "item:yumi",
    perks: { assaultChanceBonus: 0.02 },
    regions: ["japan"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.28, rangeScale: 0.61, speedScale: 1.38, arcHeightScale: 0.72,
      reloadSeconds: 2.3, operatorLimit: 5, bow: true
    }
  }),
  portableItem({
    id: VIKING_BOWS_ITEM_ID,
    label: "Viking Bows",
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
      reloadSeconds: 2.25, operatorLimit: 5, bow: true
    }
  }),
  portableItem({
    id: CROSSBOWS_ITEM_ID,
    label: "Crossbows",
    detail: "A chest of crossbows trades a slow spanning time for an easier, harder shot.",
    price: 1150,
    tier: 2,
    iconId: "item:crossbows",
    perks: { assaultChanceBonus: 0.03 },
    regions: ["europe", "east-asia"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_ARROW, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.34, rangeScale: 0.62, speedScale: 1.55, arcHeightScale: 0.55,
      reloadSeconds: 4.2, operatorLimit: 4
    }
  }),
  portableItem({
    id: MATCHLOCK_ARQUEBUSES_ITEM_ID,
    label: "Matchlock Arquebuses",
    detail: "A stand of heavy handguns punches through cover at the cost of smoke and a long reload.",
    price: 3400,
    tier: 3,
    iconId: "item:matchlock-arquebuses",
    perks: { assaultChanceBonus: 0.08 },
    regions: ["europe", "islamic", "south-asia"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_BULLET, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.45, rangeScale: 0.55, speedScale: 2.1, arcHeightScale: 0.16,
      reloadSeconds: 6.5, operatorLimit: 4, smokeScale: 0.35
    }
  }),
  portableItem({
    id: WHEELLOCK_PISTOLS_ITEM_ID,
    label: "Wheellock Pistols",
    detail: "Costly self-igniting pistols are deadly at close range and useful in a landing party.",
    price: 3000,
    tier: 3,
    iconId: "item:wheellock-pistol",
    perks: { assaultChanceBonus: 0.1 },
    regions: ["europe"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_BULLET, hullDamage: 0, crewDamage: 1,
      crewHitChance: 0.52, rangeScale: 0.32, speedScale: 2.0, arcHeightScale: 0.12,
      reloadSeconds: 5.2, operatorLimit: 2, smokeScale: 0.28
    }
  }),
  portableItem({
    id: SWIVEL_GUN_ITEM_ID,
    label: "Swivel Gun",
    detail: "One rail-mounted light gun can turn in any direction and rake an exposed deck.",
    price: 2800,
    tier: 3,
    iconId: "item:swivel-gun",
    perks: { assaultChanceBonus: 0.04 },
    regions: ["europe", "islamic", "south-asia", "east-asia", "southeast-asia"],
    weapon: {
      animationKind: PORTABLE_PROJECTILE_CANNON, hullDamage: 0.5, crewDamage: 2,
      crewHitChance: 0.55, rangeScale: 0.76, speedScale: 1.5, arcHeightScale: 0.18,
      reloadSeconds: 8.5, operatorLimit: 1, projectileSize: 1, smokeScale: 0.55, swivel: true
    }
  }),
  portableItem({
    id: INCENDIARY_ARROWS_ITEM_ID,
    label: "Incendiary Arrows",
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
      bowHullDamage: 0.25
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

export function activePortableWeaponAssignments({
  ownedItemIds,
  activeCrew,
  shipStats,
  installedCannons,
  targetDistancePx,
  baseRangePx
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
  const owned = new Set(ownedItemIds);
  const incendiary = owned.has(INCENDIARY_ARROWS_ITEM_ID);
  const availableWeapons = [...owned]
    .map((id) => portableWeaponItemById(id).weapon)
    .filter(Boolean)
    .map((weapon) => incendiary && weapon.bow ? applyIncendiaryArrows(weapon) : weapon)
    .filter((weapon) => targetDistancePx <= baseRangePx * weapon.rangeScale)
    .sort((a, b) => (
      Number(b.swivel) - Number(a.swivel) ||
      portableWeaponScore(b) - portableWeaponScore(a) ||
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
    const operators = Math.min(weapon.operatorLimit, freeCrew);
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
  return itemIds.reduce((total, itemId) => {
    const item = portableWeaponItemById(itemId);
    if (!item.weapon) return total;
    return total + portableWeaponScore(item.weapon) * item.weapon.operatorLimit;
  }, 0);
}

function applyIncendiaryArrows(weapon) {
  const modifier = portableWeaponItemById(INCENDIARY_ARROWS_ITEM_ID).modifier;
  return Object.freeze({
    ...weapon,
    rangeScale: weapon.rangeScale * modifier.bowRangeMultiplier,
    reloadSeconds: weapon.reloadSeconds * modifier.bowReloadMultiplier,
    hullDamage: Math.max(weapon.hullDamage, modifier.bowHullDamage),
    incendiary: true
  });
}

function portableWeaponScore(weapon) {
  return (weapon.crewDamage * weapon.crewHitChance + weapon.hullDamage * 1.5) / weapon.reloadSeconds;
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
  for (const key of ["hullDamage", "crewDamage", "crewHitChance", "rangeScale", "speedScale", "arcHeightScale", "reloadSeconds", "smokeScale"]) {
    if (!Number.isFinite(spec[key]) || spec[key] < 0) throw new Error(`Invalid portable weapon ${key}: ${spec.itemId}`);
  }
  if (!Number.isInteger(spec.crewDamage) || spec.crewDamage <= 0 ||
      !Number.isInteger(spec.operatorLimit) || spec.operatorLimit <= 0 ||
      !Number.isInteger(spec.projectileSize) || spec.projectileSize <= 0 ||
      spec.crewHitChance > 1 || spec.rangeScale <= 0 || spec.speedScale <= 0 || spec.reloadSeconds <= 0) {
    throw new Error(`Invalid portable weapon combat values: ${spec.itemId}`);
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
