import test from "node:test";
import assert from "node:assert/strict";
import { STANDARD_CANNON_RELOAD_SECONDS } from "./navalWeapons.js";
import {
  SHORE_BATTERY_DISABLE_DAYS,
  SHORE_BATTERY_DISABLE_MINUTES,
  SHORE_BATTERY_HIT_POINTS_PER_GUN,
  SHORE_BATTERY_NOTICE_RADIUS_PX,
  SHORE_BATTERY_RELOAD_SECONDS,
  armShoreBatteryReload,
  createShoreBatteryState,
  damageShoreBattery,
  shoreBatteryCanFire,
  shoreBatteryDisabledNotice,
  shoreBatteryGunCount,
  shoreBatteryMayDemandToll,
  shoreBatteryPlayerResponse,
  shoreBatterySurrenderNotice,
  updateShoreBatteryState
} from "./shoreBatteries.js";

const city = {
  tileId: 7,
  portId: "test-port",
  city: "Alexandria",
  factionId: "ottoman",
  cityType: "mediterranean",
  population: 80000
};

test("capitals mount four shore guns while other important cities mount two", () => {
  const battery = createShoreBatteryState(city, {}, 0);
  assert.equal(shoreBatteryGunCount(city), 2);
  assert.equal(battery.maxHitPoints, 2 * SHORE_BATTERY_HIT_POINTS_PER_GUN);
  assert.equal(shoreBatteryGunCount({ ...city, isFactionCapital: true }), 4);
  assert.equal(shoreBatteryGunCount({ ...city, population: 12000, settlementType: "village" }), 1);
});

test("only fortified ports demand empire-wide passage tolls", () => {
  assert.equal(shoreBatteryMayDemandToll(city), true);
  assert.equal(shoreBatteryMayDemandToll({ ...city, population: 12000 }), false);
  assert.equal(shoreBatteryMayDemandToll({ ...city, population: 12000, isFactionCapital: true }), true);
});

test("disabled shore batteries recover after three in-game days", () => {
  const flags = {};
  const battery = createShoreBatteryState(city, flags, 100);
  const result = damageShoreBattery(battery, flags, battery.maxHitPoints, 100);
  assert.equal(result.newlyDisabled, true);
  assert.equal(SHORE_BATTERY_DISABLE_DAYS, 3);
  assert.equal(shoreBatteryDisabledNotice(battery), "ALEXANDRIA BATTERY DISABLED (3 DAYS)");
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

test("a remembered toll refusal suppresses another hail without forgiving a war", () => {
  const hostile = shoreBatteryPlayerResponse({
    playerHostile: true,
    hostileByWar: false,
    withinWeaponRange: true,
    withinTollRange: true,
    tollDemandEligible: true,
    playerHailed: false,
    passageRefusalActive: true
  });
  assert.deepEqual(hostile, { shouldHail: false, shouldEngage: false });

  const war = shoreBatteryPlayerResponse({
    playerHostile: true,
    hostileByWar: true,
    withinWeaponRange: true,
    withinTollRange: false,
    tollDemandEligible: false,
    playerHailed: false,
    passageRefusalActive: true
  });
  assert.deepEqual(war, { shouldHail: false, shouldEngage: true });
});

test("an expired toll refusal allows the next hostile port to hail", () => {
  assert.deepEqual(shoreBatteryPlayerResponse({
    playerHostile: true,
    hostileByWar: false,
    withinWeaponRange: true,
    withinTollRange: true,
    tollDemandEligible: true,
    playerHailed: false,
    passageRefusalActive: false
  }), { shouldHail: true, shouldEngage: false });
});

test("hostile toll hails wait for docking range and ignore minor ports", () => {
  const base = {
    playerHostile: true,
    hostileByWar: false,
    withinWeaponRange: true,
    playerHailed: false,
    passageRefusalActive: false
  };
  assert.equal(shoreBatteryPlayerResponse({
    ...base,
    withinTollRange: false,
    tollDemandEligible: true
  }).shouldHail, false);
  assert.equal(shoreBatteryPlayerResponse({
    ...base,
    withinTollRange: true,
    tollDemandEligible: false
  }).shouldHail, false);
  assert.equal(shoreBatteryPlayerResponse({
    ...base,
    withinTollRange: true,
    tollDemandEligible: true
  }).shouldHail, true);
});

test("nearby port surrenders identify the captain, nationality, and port", () => {
  assert.equal(shoreBatterySurrenderNotice({
    captainName: "Jean Moreau",
    nationalityAdjective: "French",
    portName: "Lisbon",
    playerPoint: { x: 20, y: 30 },
    surrenderPoint: { x: 20 + SHORE_BATTERY_NOTICE_RADIUS_PX, y: 30 }
  }), "JEAN MOREAU, FRENCH CAPTAIN, SURRENDERED TO LISBON");
});

test("distant port surrenders do not notify the player", () => {
  assert.equal(shoreBatterySurrenderNotice({
    captainName: "Jean Moreau",
    nationalityAdjective: "French",
    portName: "Lisbon",
    playerPoint: { x: 20, y: 30 },
    surrenderPoint: { x: 21 + SHORE_BATTERY_NOTICE_RADIUS_PX, y: 30 }
  }), null);
});

test("port surrender notices reject missing identities and positions", () => {
  const valid = {
    captainName: "Jean Moreau",
    nationalityAdjective: "French",
    portName: "Lisbon",
    playerPoint: { x: 20, y: 30 },
    surrenderPoint: { x: 21, y: 30 }
  };
  assert.throws(
    () => shoreBatterySurrenderNotice({ ...valid, captainName: "" }),
    /requires captainName/
  );
  assert.throws(
    () => shoreBatterySurrenderNotice({ ...valid, surrenderPoint: null }),
    /finite surrender point/
  );
});
