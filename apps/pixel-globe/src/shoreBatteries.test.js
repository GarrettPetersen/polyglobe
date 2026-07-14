import test from "node:test";
import assert from "node:assert/strict";
import {
  SHORE_BATTERY_DISABLE_MINUTES,
  armShoreBatteryReload,
  createShoreBatteryState,
  damageShoreBattery,
  shoreBatteryCanFire,
  shoreBatteryGunCount,
  updateShoreBatteryState
} from "./shoreBatteries.js";

const city = { tileId: 7, portId: "test-port", factionId: "ottoman", cityType: "mediterranean", population: 80000 };

test("important cities mount two shore guns", () => {
  assert.equal(shoreBatteryGunCount(city), 2);
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
  assert.equal(shoreBatteryCanFire(battery, 0), true);
  armShoreBatteryReload(battery);
  assert.equal(shoreBatteryCanFire(battery, 0), false);
  updateShoreBatteryState(battery, {}, 0, 10);
  assert.equal(shoreBatteryCanFire(battery, 0), true);
});
