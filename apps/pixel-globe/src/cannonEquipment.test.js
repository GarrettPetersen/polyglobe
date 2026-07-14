import assert from "node:assert/strict";
import test from "node:test";

import {
  CANNON_EQUIPMENT,
  STANDARD_CANNON_EQUIPMENT_ID,
  cannonEquipmentById,
  cannonWeaponWithEquipment
} from "./cannonEquipment.js";
import { NAVAL_WEAPON_CANNON, navalWeaponSpec } from "./navalWeapons.js";

test("cannon equipment is a strictly improving and increasingly expensive ramp", () => {
  assert.equal(CANNON_EQUIPMENT[0].id, STANDARD_CANNON_EQUIPMENT_ID);
  assert.equal(CANNON_EQUIPMENT[0].reloadSeconds, 10);
  assert.ok(CANNON_EQUIPMENT.at(-1).reloadSeconds >= 5);
  for (let index = 1; index < CANNON_EQUIPMENT.length; index++) {
    const previous = CANNON_EQUIPMENT[index - 1];
    const current = CANNON_EQUIPMENT[index];
    assert.ok(current.price > previous.price);
    assert.ok(current.reloadSeconds < previous.reloadSeconds);
    assert.ok(current.damageMultiplier > previous.damageMultiplier);
    assert.ok(current.rangeMultiplier > previous.rangeMultiplier);
  }
});

test("installed cannon equipment alters the complete firing profile", () => {
  const base = navalWeaponSpec(NAVAL_WEAPON_CANNON);
  const equipment = cannonEquipmentById("reinforced-culverins");
  const weapon = cannonWeaponWithEquipment(base, equipment.id);

  assert.equal(weapon.reloadSeconds, equipment.reloadSeconds);
  assert.equal(weapon.damage, base.damage * equipment.damageMultiplier);
  assert.equal(weapon.rangeScale, base.rangeScale * equipment.rangeMultiplier);
  assert.equal(weapon.equipmentId, equipment.id);
});

test("cannon equipment cannot be applied to non-cannon weapons", () => {
  assert.throws(
    () => cannonWeaponWithEquipment({ kind: "arrow" }, STANDARD_CANNON_EQUIPMENT_ID),
    /requires a cannon weapon/
  );
});
