import {
  NAVAL_WEAPON_CANNON,
  STANDARD_CANNON_RELOAD_SECONDS
} from "./navalWeapons.js";
import {
  GRAMMATICAL_NUMBER_PLURAL,
  GRAMMATICAL_NUMBER_SINGULAR,
  validateGrammaticalNumber
} from "./grammaticalNumber.js";

export const STANDARD_CANNON_EQUIPMENT_ID = "standard-ordnance";

export const CANNON_EQUIPMENT = Object.freeze([
  cannonEquipment(
    STANDARD_CANNON_EQUIPMENT_ID,
    "Standard ordnance",
    0,
    0,
    STANDARD_CANNON_RELOAD_SECONDS,
    1,
    1,
    GRAMMATICAL_NUMBER_SINGULAR
  ),
  cannonEquipment(
    "bronze-culverins", "Bronze culverins", 1, 2400, 8.5, 1.15, 1.12,
    GRAMMATICAL_NUMBER_PLURAL
  ),
  cannonEquipment(
    "reinforced-culverins", "Reinforced culverins", 2, 8500, 7, 1.34, 1.23,
    GRAMMATICAL_NUMBER_PLURAL
  ),
  cannonEquipment(
    "royal-foundry-battery", "Royal foundry battery", 3, 24000, 5.5, 1.58, 1.36,
    GRAMMATICAL_NUMBER_SINGULAR
  )
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

function cannonEquipment(
  id,
  label,
  tier,
  price,
  reloadSeconds,
  damageMultiplier,
  rangeMultiplier,
  grammaticalNumber
) {
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
  validateGrammaticalNumber(grammaticalNumber, `cannon equipment ${id}`);
  return Object.freeze({
    id,
    label,
    grammaticalNumber,
    tier,
    price,
    reloadSeconds,
    damageMultiplier,
    rangeMultiplier
  });
}
