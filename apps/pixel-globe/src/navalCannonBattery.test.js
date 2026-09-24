import assert from "node:assert/strict";
import test from "node:test";

import {
  cannonBatteryIsReady,
  cannonBatterySideForTarget,
  navalCannonVolleyCount,
  reloadCannonBattery
} from "./navalCannonBattery.js";
import {
  SHIP_CANNON_LAYOUT_BROADSIDE,
  SHIP_CANNON_LAYOUT_FORWARD
} from "./shipStats.js";

const BROADSIDE_STATS = Object.freeze({ cannons: 7, cannonLayout: SHIP_CANNON_LAYOUT_BROADSIDE });
const FORWARD_STATS = Object.freeze({ cannons: 7, cannonLayout: SHIP_CANNON_LAYOUT_FORWARD });

test("forward batteries fire every cannon and share one reload across both controls", () => {
  const cooldowns = { port: 0, starboard: 0 };
  assert.equal(navalCannonVolleyCount(FORWARD_STATS), 7);
  assert.equal(cannonBatteryIsReady(cooldowns, FORWARD_STATS, "starboard"), true);

  reloadCannonBattery(cooldowns, FORWARD_STATS, "starboard", 5);

  assert.deepEqual(cooldowns, { port: 5, starboard: 5 });
  assert.equal(cannonBatteryIsReady(cooldowns, FORWARD_STATS, "port"), false);
});

test("broadside batteries retain separate half-ship volleys and reloads", () => {
  const cooldowns = { port: 0, starboard: 0 };
  assert.equal(navalCannonVolleyCount(BROADSIDE_STATS), 4);

  reloadCannonBattery(cooldowns, BROADSIDE_STATS, "starboard", 5);

  assert.deepEqual(cooldowns, { port: 0, starboard: 5 });
  assert.equal(cannonBatteryIsReady(cooldowns, BROADSIDE_STATS, "port"), true);
});

test("forward target selection maps the bow arc to either existing fire control", () => {
  const heading = { x: 1, y: 0 };
  const origin = { x: 0, y: 0 };
  assert.equal(cannonBatterySideForTarget(FORWARD_STATS, heading, origin, { x: 10, y: 0 }), "port");
  assert.equal(cannonBatterySideForTarget(FORWARD_STATS, heading, origin, { x: 0, y: 10 }), null);
  assert.equal(cannonBatterySideForTarget(BROADSIDE_STATS, heading, origin, { x: 0, y: 10 }), "starboard");
});
