import {
  NAVAL_WEAPON_CANNON,
  STANDARD_CANNON_RELOAD_SECONDS
} from "./navalWeapons.js";

export const STANDARD_CANNON_EQUIPMENT_ID = "standard-ordnance";

export const CANNON_EQUIPMENT = Object.freeze([
  cannonEquipment(
    STANDARD_CANNON_EQUIPMENT_ID,
    "Standard ordnance",
    0,
    0,
    STANDARD_CANNON_RELOAD_SECONDS,
    1,
    1
  ),
  cannonEquipment("bronze-culverins", "Bronze culverins", 1, 2400, 1.02, 1.15, 1.12),
  cannonEquipment("reinforced-culverins", "Reinforced culverins", 2, 8500, 0.86, 1.34, 1.23),
  cannonEquipment("royal-foundry-battery", "Royal foundry battery", 3, 24000, 0.7, 1.58, 1.36)
]);

const CANNON_EQUIPMENT_BY_ID = new Map(CANNON_EQUIPMENT.map((equipment) => [equipment.id, equipment]));

export function cannonEquipmentById(equipmentId) {
  const equipment = CANNON_EQUIPMENT_BY_ID.get(equipmentId);
  if (!equipment) throw new Error(`Unknown cannon equipment: ${equipmentId}`);
  return equipment;
}

export function cannonWeaponWithEquipment(weapon, equipmentId) {
  if (!weapon || weapon.kind !== NAVAL_WEAPON_CANNON) {
    throw new Error("Cannon equipment requires a cannon weapon");
  }
  const equipment = cannonEquipmentById(equipmentId);
  return Object.freeze({
    ...weapon,
    damage: weapon.damage * equipment.damageMultiplier,
    rangeScale: weapon.rangeScale * equipment.rangeMultiplier,
    reloadSeconds: equipment.reloadSeconds,
    equipmentId: equipment.id
  });
}

function cannonEquipment(id, label, tier, price, reloadSeconds, damageMultiplier, rangeMultiplier) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid cannon equipment id: ${id}`);
  if (typeof label !== "string" || label.trim() === "") throw new Error(`Invalid cannon equipment label: ${id}`);
  if (!Number.isInteger(tier) || tier < 0) throw new Error(`Invalid cannon equipment tier: ${id}`);
  if (!Number.isInteger(price) || price < 0) throw new Error(`Invalid cannon equipment price: ${id}`);
  if (!Number.isFinite(reloadSeconds) || reloadSeconds <= 0) {
    throw new Error(`Invalid cannon equipment reload time: ${id}`);
  }
  if (!Number.isFinite(damageMultiplier) || damageMultiplier <= 0) {
    throw new Error(`Invalid cannon equipment damage: ${id}`);
  }
  if (!Number.isFinite(rangeMultiplier) || rangeMultiplier <= 0) {
    throw new Error(`Invalid cannon equipment range: ${id}`);
  }
  return Object.freeze({
    id,
    label,
    tier,
    price,
    reloadSeconds,
    damageMultiplier,
    rangeMultiplier
  });
}
