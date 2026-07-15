import test from "node:test";
import assert from "node:assert/strict";
import { STANDARD_CANNON_RELOAD_SECONDS } from "./navalWeapons.js";
import {
  SHORE_BATTERY_DISABLE_MINUTES,
  SHORE_BATTERY_HIT_POINTS_PER_GUN,
  SHORE_BATTERY_RELOAD_SECONDS,
  armShoreBatteryReload,
  createShoreBatteryState,
  damageShoreBattery,
  shoreBatteryCanFire,
  shoreBatteryGunCount,
  updateShoreBatteryState
} from "./shoreBatteries.js";

const city = { tileId: 7, portId: "test-port", factionId: "ottoman", cityType: "mediterranean", population: 80000 };

test("capitals mount four shore guns while other important cities mount two", () => {
  const battery = createShoreBatteryState(city, {}, 0);
  assert.equal(shoreBatteryGunCount(city), 2);
  assert.equal(battery.maxHitPoints, 2 * SHORE_BATTERY_HIT_POINTS_PER_GUN);
  assert.equal(shoreBatteryGunCount({ ...city, isFactionCapital: true }), 4);
  assert.equal(shoreBatteryGunCount({ ...city, population: 12000, settlementType: "village" }), 1);
});

test("disabled shore batteries recover after three in-game days", () => {
  const flags = {};
  const battery = createShoreBatteryState(city, flags, 100);
  const result = damageShoreBattery(battery, flags, battery.maxHitPoints, 100);
  assert.equal(result.newlyDisabled, true);
  assert.equal(battery.disabledUntilMinute, 100 + SHORE_BATTERY_DISABLE_MINUTES);
  assert.equal(updateShoreBatteryState(battery, flags, battery.disabledUntilMinute - 1, 1), false);
  assert.equal(updateShoreBatteryState(battery, flags, battery.disabledUntilMinute, 1), true);
  assert.equal(battery.hitPoints, battery.maxHitPoints);
});

test("shore battery reload prevents immediate repeat fire", () => {
  const battery = createShoreBatteryState(city, {}, 0);
  assert.ok(SHORE_BATTERY_RELOAD_SECONDS > STANDARD_CANNON_RELOAD_SECONDS);
  assert.equal(shoreBatteryCanFire(battery, 0), true);
  armShoreBatteryReload(battery);
  assert.equal(battery.cooldownSeconds, SHORE_BATTERY_RELOAD_SECONDS);
  assert.equal(shoreBatteryCanFire(battery, 0), false);
  updateShoreBatteryState(battery, {}, 0, SHORE_BATTERY_RELOAD_SECONDS - 0.01);
  assert.equal(shoreBatteryCanFire(battery, 0), false);
  updateShoreBatteryState(battery, {}, 0, 0.01);
  assert.equal(shoreBatteryCanFire(battery, 0), true);
});
