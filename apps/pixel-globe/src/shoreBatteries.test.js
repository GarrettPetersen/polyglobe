import test from "node:test";
import assert from "node:assert/strict";
import { STANDARD_CANNON_RELOAD_SECONDS } from "./navalWeapons.js";
import {
  SHORE_BATTERY_DISABLE_DAYS,
  SHORE_BATTERY_DISABLE_MINUTES,
  SHORE_BATTERY_HIT_POINTS_PER_GUN,
  SHORE_BATTERY_NOTICE_RADIUS_PX,
  SHORE_BATTERY_PORTABLE_HIT_CHANCE_SCALE,
  SHORE_BATTERY_RELOAD_SECONDS,
  armShoreBatteryReload,
  clearShoreBatteryCombatWounds,
  createShoreBatteryState,
  damageShoreBattery,
  damageShoreBatteryCrew,
  reconcileShoreBatteryPortFlagIdentities,
  shoreBatteryCanFire,
  shoreBatteryDisabledNotice,
  shoreBatteryGunCount,
  shoreBatteryHostileToFaction,
  shoreBatteryLevel,
  shoreBatteryMayDemandToll,
  shoreBatteryMayReceivePlayerPortableFire,
  shoreBatteryPortableImpact,
  shoreBatteryPlayerEngagementEnvelope,
  shoreBatteryPlayerResponse,
  shoreBatteryPlayerEngagementRange,
  shoreBatteryRecoveryStatus,
  shoreBatterySurrenderNotice,
  shoreBatteryWarWarningSeen,
  rememberShoreBatteryWarWarning,
  upgradeShoreBattery,
  updateShoreBatteryState
} from "./shoreBatteries.js";

const city = {
  cityId: "alexandria|egypt",
  tileId: 7,
  portId: "test-port",
  city: "Alexandria",
  factionId: "ottoman",
  cityType: "mediterranean",
  population: 80000
};

test("cities have doubled fortification durability while capitals mount more guns", () => {
  const battery = createShoreBatteryState(city, {}, 0);
  assert.equal(SHORE_BATTERY_HIT_POINTS_PER_GUN, 16);
  assert.equal(shoreBatteryGunCount(city), 2);
  assert.equal(battery.maxHitPoints, 2 * SHORE_BATTERY_HIT_POINTS_PER_GUN);
  assert.equal(shoreBatteryGunCount({ ...city, isFactionCapital: true }), 4);
  assert.equal(shoreBatteryGunCount({ ...city, population: 12000, settlementType: "village" }), 1);
  assert.equal(shoreBatteryGunCount({ ...city, population: 160000, isFactionCapital: true }), 6);
});

test("a commissioned captain can open a bombardment at the ship's weapon range", () => {
  assert.equal(shoreBatteryPlayerEngagementRange({
    batteryRangePx: 76,
    playerWeaponRangePx: 112,
    commissioned: true
  }), 112);
  assert.equal(shoreBatteryPlayerEngagementRange({
    batteryRangePx: 76,
    playerWeaponRangePx: 112,
    commissioned: false
  }), 76);
});

test("a bombardment ordered while docked survives projected distance from the battery", () => {
  assert.deepEqual(shoreBatteryPlayerEngagementEnvelope({
    playerDistancePx: 104,
    engagementRangePx: 76,
    playerAttackActive: true,
    playerAtPortTile: true,
    disengagementBufferPx: 20
  }), {
    withinEngagementRange: true,
    beyondDisengagementRange: false
  });
  assert.deepEqual(shoreBatteryPlayerEngagementEnvelope({
    playerDistancePx: 104,
    engagementRangePx: 76,
    playerAttackActive: true,
    playerAtPortTile: false,
    disengagementBufferPx: 20
  }), {
    withinEngagementRange: false,
    beyondDisengagementRange: true
  });
});

test("battery upgrades persist as additive fortification levels", () => {
  const flags = {};
  assert.equal(shoreBatteryLevel(city, flags), 2);
  const result = upgradeShoreBattery(city, flags);
  assert.deepEqual(result, {
    cityTileId: 7,
    cityName: "Alexandria",
    before: 2,
    after: 3,
    gunCount: 4,
    upgraded: true
  });
  assert.equal(shoreBatteryLevel(city, flags), 3);
  assert.equal(createShoreBatteryState(city, flags, 0).gunCount, 4);
});

test("port identity reconciliation merges every shore-battery flag as one semantic record", () => {
  const canonicalId = city.cityId;
  const legacyId = "city-700";
  const flags = {
    [`shoreBatteryDisabledUntil:${legacyId}`]: 700,
    [`shoreBatteryDisabledByShip:${legacyId}`]: "the Golden Hind",
    [`shoreBatteryUpgradeLevel:${legacyId}`]: 2,
    [`shoreBatteryDisabledUntil:${canonicalId}`]: 500,
    [`shoreBatteryDisabledByShip:${canonicalId}`]: "the Pelican",
    [`shoreBatteryUpgradeLevel:${canonicalId}`]: 1
  };
  const resolve = (storedId) => (
    storedId === legacyId || storedId === canonicalId ? canonicalId : null
  );

  assert.ok(reconcileShoreBatteryPortFlagIdentities(flags, resolve) > 0);
  assert.deepEqual(flags, {
    [`shoreBatteryDisabledUntil:${canonicalId}`]: 700,
    [`shoreBatteryDisabledByShip:${canonicalId}`]: "the Golden Hind",
    [`shoreBatteryUpgradeLevel:${canonicalId}`]: 2
  });
  assert.equal(reconcileShoreBatteryPortFlagIdentities(flags, resolve), 0);
});

test("port identity reconciliation rejects unresolved or internally invalid durable aliases", () => {
  assert.throws(() => reconcileShoreBatteryPortFlagIdentities({
    "shoreBatteryUpgradeLevel:lost-port": 1
  }, () => null), /does not resolve/);
  assert.throws(() => reconcileShoreBatteryPortFlagIdentities({
    "shoreBatteryDisabledByShip:legacy-port": "the Pelican"
  }, () => city.cityId), /disabled time/);
});

test("only fortified ports demand empire-wide passage tolls", () => {
  assert.equal(shoreBatteryMayDemandToll(city), true);
  assert.equal(shoreBatteryMayDemandToll({ ...city, population: 12000 }), false);
  assert.equal(shoreBatteryMayDemandToll({ ...city, population: 12000, isFactionCapital: true }), true);
});

test("a shore battery never targets a ship flying its own faction's flag", () => {
  let diplomacyQueries = 0;
  const relationBetween = () => {
    diplomacyQueries += 1;
    return "war";
  };
  assert.equal(shoreBatteryHostileToFaction(city, "ottoman", relationBetween), false);
  assert.equal(diplomacyQueries, 0);
  assert.equal(shoreBatteryHostileToFaction(city, "spanish", relationBetween), true);
  assert.equal(diplomacyQueries, 1);
});

test("disabled shore batteries recover after three in-game days", () => {
  const flags = {};
  const battery = createShoreBatteryState(city, flags, 100);
  const result = damageShoreBattery(
    battery,
    flags,
    battery.maxHitPoints,
    100,
    "your Armed Galleon"
  );
  assert.equal(result.newlyDisabled, true);
  assert.equal(SHORE_BATTERY_DISABLE_DAYS, 3);
  assert.equal(shoreBatteryDisabledNotice(battery), "ALEXANDRIA BATTERY DISABLED (3 DAYS)");
  assert.equal(battery.disabledUntilMinute, 100 + SHORE_BATTERY_DISABLE_MINUTES);
  assert.deepEqual(shoreBatteryRecoveryStatus(battery, 101), {
    attackerShipLabel: "your Armed Galleon",
    disabledUntilMinute: 100 + SHORE_BATTERY_DISABLE_MINUTES,
    daysRemaining: 3
  });
  const restored = createShoreBatteryState(city, flags, 101);
  assert.equal(restored.disabledByShipLabel, "your Armed Galleon");
  assert.equal(updateShoreBatteryState(battery, flags, battery.disabledUntilMinute - 1, 1), false);
  assert.equal(updateShoreBatteryState(battery, flags, battery.disabledUntilMinute, 1), true);
  assert.equal(battery.hitPoints, battery.maxHitPoints);
  assert.equal(shoreBatteryRecoveryStatus(battery, battery.disabledUntilMinute || 0), null);
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

test("shore garrisons surrender to heavy wounds and recover lesser wounds after combat", () => {
  const flags = {};
  const battery = createShoreBatteryState(city, flags, 0);
  const skirmish = damageShoreBatteryCrew(
    battery,
    flags,
    { crewDamage: 2, crewHitChance: 1 },
    0,
    "your Brigantine",
    () => 0
  );
  assert.equal(skirmish.newWounds, 2);
  assert.equal(skirmish.disabled, false);
  assert.equal(clearShoreBatteryCombatWounds(battery), true);
  assert.equal(battery.woundedGarrison, 0);

  const surrender = damageShoreBatteryCrew(
    battery,
    flags,
    { crewDamage: 7, crewHitChance: 1 },
    0,
    "your Brigantine",
    () => 0
  );
  assert.equal(surrender.newlyDisabled, true);
  assert.equal(battery.hitPoints, 0);
});

test("shore garrison deaths reduce its defenders and do not recover after combat", () => {
  const battery = createShoreBatteryState(city, {}, 0);
  const result = damageShoreBatteryCrew(
    battery,
    {},
    { crewDamage: 2, crewHitChance: 1, crewFatalityChance: 1 },
    0,
    "your Brigantine",
    () => 0
  );
  assert.equal(result.newDeaths, 2);
  assert.equal(battery.garrisonCrew, battery.maxGarrison - 2);
  assert.equal(clearShoreBatteryCombatWounds(battery), false);
  assert.equal(battery.garrisonCrew, battery.maxGarrison - 2);
});

test("fortifications protect their garrisons while retaining portable hull hit chances", () => {
  const fireArrow = shoreBatteryPortableImpact({
    crewDamage: 1,
    crewHitChance: 0.4,
    crewFatalityChance: 0.35,
    crewProtectionPenetration: 0.1,
    hullDamage: 0.25,
    hullHitChance: 0.2
  });
  assert.equal(fireArrow.crewHitChance, 0.4 * SHORE_BATTERY_PORTABLE_HIT_CHANCE_SCALE);
  assert.equal(fireArrow.crewFatalityChance, 0.35);
  assert.equal(fireArrow.hullDamage, 0.25);
  assert.equal(fireArrow.hullHitChance, 0.2);

  const swivelShot = shoreBatteryPortableImpact({
    crewDamage: 2,
    crewHitChance: 0.68,
    crewProtectionPenetration: 0.75,
    hullDamage: 0.5,
    hullHitChance: 1
  });
  assert.equal(swivelShot.hullDamage, 0.5);
});

test("a hostile battery is not an automatic small-arms target until the player orders an attack", () => {
  const battery = createShoreBatteryState(city, {}, 0);
  battery.engagedTargetIds.add("player");
  assert.equal(shoreBatteryMayReceivePlayerPortableFire(battery, "player"), false);
  battery.playerAttackActive = true;
  assert.equal(shoreBatteryMayReceivePlayerPortableFire(battery, "player"), true);
});

test("a remembered toll refusal suppresses another hail without forgiving a war", () => {
  const hostile = shoreBatteryPlayerResponse({
    playerHostile: true,
    hostileByWar: false,
    withinWeaponRange: true,
    withinTollRange: true,
    tollDemandEligible: true,
    playerHailed: false,
    playerAttackActive: false,
    passageRefusalActive: true,
    warWarningSeen: false,
    playerCombatActive: false
  });
  assert.deepEqual(hostile, { shouldHail: false, shouldEngage: false });

  const war = shoreBatteryPlayerResponse({
    playerHostile: true,
    hostileByWar: true,
    withinWeaponRange: true,
    withinTollRange: false,
    tollDemandEligible: false,
    playerHailed: false,
    playerAttackActive: false,
    passageRefusalActive: true,
    warWarningSeen: false,
    playerCombatActive: false
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
    playerAttackActive: false,
    passageRefusalActive: false,
    warWarningSeen: false,
    playerCombatActive: false
  }), { shouldHail: true, shouldEngage: false });
});

test("hostile toll hails wait for docking range and ignore minor ports", () => {
  const base = {
    playerHostile: true,
    hostileByWar: false,
    withinWeaponRange: true,
    playerHailed: false,
    playerAttackActive: false,
    passageRefusalActive: false,
    warWarningSeen: false,
    playerCombatActive: false
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

test("a player-declared shore attack persists without ordinary diplomatic hostility", () => {
  assert.deepEqual(shoreBatteryPlayerResponse({
    playerHostile: false,
    hostileByWar: false,
    withinWeaponRange: true,
    withinTollRange: false,
    tollDemandEligible: false,
    playerHailed: true,
    playerAttackActive: true,
    passageRefusalActive: false,
    warWarningSeen: false,
    playerCombatActive: false
  }), { shouldHail: false, shouldEngage: true });
});

test("wartime shore warnings are remembered by faction", () => {
  const flags = {};
  assert.equal(shoreBatteryWarWarningSeen(flags, "france"), false);
  assert.equal(shoreBatteryWarWarningSeen(flags, "england"), false);
  rememberShoreBatteryWarWarning(flags, "france");
  assert.equal(shoreBatteryWarWarningSeen(flags, "france"), true);
  assert.equal(shoreBatteryWarWarningSeen(flags, "england"), false);
});

test("a warned faction's later batteries join combat without another hail", () => {
  const base = {
    playerHostile: true,
    hostileByWar: true,
    withinWeaponRange: true,
    withinTollRange: false,
    tollDemandEligible: false,
    playerHailed: false,
    playerAttackActive: false,
    passageRefusalActive: false
  };
  assert.deepEqual(shoreBatteryPlayerResponse({
    ...base,
    warWarningSeen: true,
    playerCombatActive: false
  }), { shouldHail: false, shouldEngage: true });
  assert.deepEqual(shoreBatteryPlayerResponse({
    ...base,
    warWarningSeen: false,
    playerCombatActive: true
  }), { shouldHail: false, shouldEngage: true });
});

test("a wartime warning does not suppress an unrelated customs hail", () => {
  assert.deepEqual(shoreBatteryPlayerResponse({
    playerHostile: true,
    hostileByWar: false,
    withinWeaponRange: true,
    withinTollRange: true,
    tollDemandEligible: true,
    playerHailed: false,
    playerAttackActive: false,
    passageRefusalActive: false,
    warWarningSeen: true,
    playerCombatActive: false
  }), { shouldHail: true, shouldEngage: false });
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
