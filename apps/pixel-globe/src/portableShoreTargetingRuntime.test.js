import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createShoreBatteryState, shoreBatteryMayReceivePlayerPortableFire } from "./shoreBatteries.js";
const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
function runtime(context) {
  const names = ["nearestPlayerPortableWeaponTarget", "resolvePlayerNavalImpact"];
  const code = names.map(name => {
    const start = main.indexOf(`function ${name}(`);
    assert.ok(start >= 0);
    return main.slice(start, main.indexOf("\nfunction ", start + 1));
  }).join("\n");
  return runInNewContext(`${code}\n({${names.join(",")}})`, context);
}
test("an engaged city cannot bypass portable targeting consent through the engagement list", () => {
  // Use the real eligibility policy; the renderer and world index are boundary fakes.
  const battery = createShoreBatteryState({ cityId: "almeria|spain", tileId: 7, city: "Almeria", factionId: "spain", cityType: "mediterranean", population: 80000 }, {}, 0);
  battery.engagedTargetIds.add("player");
  const points = { [battery.id]: { x: 1, y: 0 }, portuguese: { x: 5, y: 0 } };
  let impacts = 0;
  const context = {
    PLAYER_COMBAT_ID: "player", NPC_COMBAT_PROJECTILE_HIT_RADIUS_PX: 2,
    shipCombatState: { engagements: new Map([["city", { aId: "player", bId: battery.id }], ["ship", { aId: "player", bId: "portuguese" }]]) },
    shoreBatteryMayReceivePlayerPortableFire,
    shoreBatteryStates: new Map([[battery.id, battery]]), npcVisualShips: new Map([["portuguese", { id: "portuguese" }]]),
    activeVisibleShoreBatteries: () => [battery], localLayout: { viewX: 0, viewY: 0 },
    combatEntityAimPoint: id => points[id], combatEntityPoint: id => points[id],
    combatShipProjectileShape: () => ({ projectileSilhouette: null }), combatEngagementIsActive: () => true,
    applyShoreBatteryHit: () => { impacts++; }
  };
  const api = runtime(context);
  assert.equal(api.nearestPlayerPortableWeaponTarget(10).id, "portuguese");
  battery.playerAttackActive = true;
  assert.equal(api.nearestPlayerPortableWeaponTarget(10).id, battery.id);
  const shot = { portable: true, targetId: battery.id, targetX: 1, targetY: 0 };
  assert.equal(api.resolvePlayerNavalImpact(shot), true);
  battery.playerAttackActive = false;
  assert.equal(api.resolvePlayerNavalImpact(shot), false);
  assert.equal(impacts, 1);
});
