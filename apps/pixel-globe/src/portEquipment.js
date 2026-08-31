import { portEconomySummary } from "./economy.js";
import { isPreGunpowderCulture } from "./navalWeapons.js";
import { requireCityId } from "./entityIds.js";

export const EQUIPMENT_STOCK_FISHING_NET = "fishing-net";
export const EQUIPMENT_STOCK_CANNON = "cannon";
export const EQUIPMENT_STOCK_WHALE_HARPOON = "whale-harpoon";

const EQUIPMENT_STOCK_KINDS = new Set([
  EQUIPMENT_STOCK_FISHING_NET,
  EQUIPMENT_STOCK_CANNON,
  EQUIPMENT_STOCK_WHALE_HARPOON
]);
const TIER_PROSPERITY_THRESHOLDS = Object.freeze([0, 0.27, 0.53, 0.8]);
const EQUIPMENT_SPECIALIST_CITY_IDS = Object.freeze({
  [EQUIPMENT_STOCK_FISHING_NET]: Object.freeze(["brugge|belgium", "guangzhou|china", "lubeck|germany"]),
  [EQUIPMENT_STOCK_CANNON]: Object.freeze(["goa|india", "istanbul|turkey", "lisbon|portugal"]),
  [EQUIPMENT_STOCK_WHALE_HARPOON]: Object.freeze(["bordeaux|france"])
});
const PRE_CONTACT_NATIVE_FACTION_IDS = new Set(["inca", "neutral"]);

export function equipmentStockAtPort(economy, city, kind, equipment) {
  assertEquipmentKind(kind);
  return saleableEquipmentCatalog(equipment)
    .filter((item) => equipmentAvailableAtPort(economy, city, kind, item));
}

export function saleableEquipmentCatalog(equipment) {
  if (!Array.isArray(equipment) || equipment.length === 0) {
    throw new Error("Port equipment stock requires equipment choices");
  }
  for (const item of equipment) assertEquipment(item);
  return equipment.filter((item) => item.tier > 0);
}

export function equipmentAvailableAtPort(economy, city, kind, equipment) {
  assertEquipmentKind(kind);
  assertEquipment(equipment);
  if (equipment.tier === 0) return false;
  if (nativePreContactPortCannotBuildCannons(city, kind)) return false;
  if (equipmentSpecialistAtPort(city, kind)) return true;
  const threshold = TIER_PROSPERITY_THRESHOLDS[equipment.tier];
  if (threshold === undefined) throw new Error(`No port equipment threshold for tier: ${equipment.tier}`);
  const prosperity = portEquipmentProsperity(economy, city);
  const specialty = (hashUnit(`${requiredPortId(city)}|${kind}|${equipment.id}`) - 0.5) * 0.34;
  return prosperity + specialty >= threshold;
}

export function nativePreContactPortCannotBuildCannons(city, kind) {
  assertEquipmentKind(kind);
  if (kind !== EQUIPMENT_STOCK_CANNON || !isPreGunpowderCulture(city?.cityType)) return false;
  return PRE_CONTACT_NATIVE_FACTION_IDS.has(city?.factionId || "neutral");
}

export function equipmentSpecialistAtPort(city, kind) {
  assertEquipmentKind(kind);
  return EQUIPMENT_SPECIALIST_CITY_IDS[kind].includes(requireCityId(city, "Equipment specialist port"));
}

export function portEquipmentProsperity(economy, city) {
  const summary = portEconomySummary(economy, city);
  const size = clamp((summary.populationScale - 0.45) / (4.2 - 0.45), 0, 1);
  const liquidity = clamp((summary.specie / summary.targetSpecie - 0.65) / 0.85, 0, 1);
  return size * 0.35 + liquidity * 0.65;
}

function assertEquipmentKind(kind) {
  if (!EQUIPMENT_STOCK_KINDS.has(kind)) throw new Error(`Unknown port equipment kind: ${kind}`);
}

function assertEquipment(equipment) {
  if (!equipment || typeof equipment !== "object") throw new Error("Invalid port equipment");
  if (typeof equipment.id !== "string" || equipment.id.trim() === "") {
    throw new Error("Port equipment requires an id");
  }
  if (!Number.isInteger(equipment.tier) || equipment.tier < 0) {
    throw new Error(`Invalid port equipment tier: ${equipment.id}`);
  }
}

function requiredPortId(city) {
  return requireCityId(city, "Port equipment city");
}

function hashUnit(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
