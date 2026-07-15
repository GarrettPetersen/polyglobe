import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  LAKE_BATTLE_ENEMY_ID,
  LAKE_BATTLE_CITY_SLUG,
  LAKE_BATTLE_ENEMY_SLUGS,
  LAKE_BATTLE_PHASE_ACTIVE,
  LAKE_BATTLE_PLAYER_ID,
  LAKE_BATTLE_SHIP_SLUGS,
  buildLakeBattleWaterMask,
  createLakeBattle as createRuntimeLakeBattle,
  drainLakeBattleEvents,
  fireLakeBattleBroadside,
  lakeBattleBroadsideDirection,
  lakeBattleHeadingVector,
  lakeBattleShipFitsInWater,
  lakeBattleWindFlowDirection,
  lakeBattleWeaponRange,
  resizeLakeBattle,
  updateLakeBattle
} from "./lakeBattle.js";
import {
  SHORE_BATTERY_HIT_POINTS_PER_GUN,
  SHORE_BATTERY_RELOAD_SECONDS
} from "./shoreBatteries.js";
import {
  shipFootprintCenter,
  shipFootprintFrame,
  validateShipFootprintBake
} from "./shipFootprint.js";
import {
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS
} from "./shipSpriteLayout.js";

const TEST_SHIP_FOOTPRINTS = validateShipFootprintBake(
  JSON.parse(readFileSync(new URL("../public/assets/vehicles/unity-ships/hull-footprints.json", import.meta.url), "utf8")),
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS,
  LAKE_BATTLE_SHIP_SLUGS
);

function createLakeBattle(options) {
  return createRuntimeLakeBattle({ ...options, shipFootprints: TEST_SHIP_FOOTPRINTS });
}

test("lake battle roster contains every armed hull including native canoes", () => {
  assert.ok(LAKE_BATTLE_SHIP_SLUGS.includes("brigantine"));
  assert.ok(LAKE_BATTLE_SHIP_SLUGS.includes("viking-longship"));
  assert.ok(LAKE_BATTLE_SHIP_SLUGS.includes("polynesian-voyaging-canoe"));
  assert.ok(LAKE_BATTLE_SHIP_SLUGS.includes("mesoamerican-dugout-canoe"));
  assert.equal(LAKE_BATTLE_SHIP_SLUGS.includes("fishing-lugger"), false);
  assert.ok(LAKE_BATTLE_ENEMY_SLUGS.includes(LAKE_BATTLE_CITY_SLUG));
  assert.equal(LAKE_BATTLE_SHIP_SLUGS.includes(LAKE_BATTLE_CITY_SLUG), false);
});

test("a city is a stationary coastal enemy with a two-shot shore battery", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: LAKE_BATTLE_CITY_SLUG
  });
  const start = { x: battle.enemy.x, y: battle.enemy.y };

  assert.equal(battle.enemy.kind, "city");
  assert.equal(battle.enemy.stats.batteryGuns, 2);
  assert.equal(battle.enemy.maxHitPoints, 2 * SHORE_BATTERY_HIT_POINTS_PER_GUN);
  assert.equal(battle.enemy.weapon.reloadSeconds, SHORE_BATTERY_RELOAD_SECONDS);
  assert.equal(lakeBattleShipFitsInWater(battle, battle.enemy), true);
  assert.ok(battle.enemy.x >= 36 && battle.enemy.x <= battle.width - 36);
  assert.ok(battle.enemy.y >= 36 && battle.enemy.y <= battle.height - 36);
  updateLakeBattle(battle, 1 / 60, {});
  assert.deepEqual({ x: battle.enemy.x, y: battle.enemy.y }, start);
  const fire = drainLakeBattleEvents(battle).find((event) => event.type === "fire");
  assert.equal(fire.shipId, LAKE_BATTLE_ENEMY_ID);
  assert.equal(fire.count, 2);

  resizeLakeBattle(battle, 400, 240);
  assert.equal(lakeBattleShipFitsInWater(battle, battle.enemy), true);
  assert.ok(battle.enemy.x >= 36 && battle.enemy.x <= battle.width - 36);
});

test("native canoe archers automatically fire in any direction", () => {
  for (const playerSlug of ["polynesian-voyaging-canoe", "mesoamerican-dugout-canoe"]) {
    const battle = createLakeBattle({
      width: 455,
      height: 256,
      playerSlug,
      enemySlug: "caravel"
    });

    assert.equal(battle.player.weapon.kind, "arrow");
    assert.equal(fireLakeBattleBroadside(battle, LAKE_BATTLE_PLAYER_ID, "port"), false);
    const dx = battle.enemy.x - battle.player.x;
    const dy = battle.enemy.y - battle.player.y;
    const distance = Math.hypot(dx, dy);
    battle.enemy.x = battle.player.x + dx / distance * 32;
    battle.enemy.y = battle.player.y + dy / distance * 32;
    battle.enemy.cooldowns.port = 100;
    battle.enemy.cooldowns.starboard = 100;
    battle.player.headingRad = Math.atan2(dy, dx);
    updateLakeBattle(battle, 1 / 60, {});
    const arrows = battle.projectiles.filter((projectile) => (
      projectile.ownerId === LAKE_BATTLE_PLAYER_ID && projectile.kind === "arrow"
    ));
    assert.ok(arrows.length >= 2);
    assert.ok(arrows.every((projectile) => projectile.targetId === LAKE_BATTLE_ENEMY_ID));
    assert.ok(battle.player.cooldowns.atWill > 0);
    assert.equal(battle.player.cooldowns.port, 0);
    assert.equal(battle.player.cooldowns.starboard, 0);
    assert.equal(battle.cannonSmokeBursts.length, 0);
    assert.ok(lakeBattleWeaponRange(battle.player) < lakeBattleWeaponRange(battle.enemy));
  }
});

test("a lake battle is transient local state with two selected hulls", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "viking-longship",
    enemySlug: "galleon"
  });

  assert.equal(battle.phase, LAKE_BATTLE_PHASE_ACTIVE);
  assert.equal(battle.player.slug, "viking-longship");
  assert.equal(battle.player.weapon.kind, "arrow");
  assert.equal(battle.enemy.slug, "galleon");
  assert.equal(battle.enemy.weapon.kind, "cannon");
  assert.equal("gameState" in battle, false);
  assert.equal("worldPosition" in battle.player, false);
  assert.equal(lakeBattleShipFitsInWater(battle, battle.player), true);
  assert.equal(lakeBattleShipFitsInWater(battle, battle.enemy), true);
});

test("the cached arena mask follows the battle's rendered hex terrain", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  const mask = buildLakeBattleWaterMask(battle.map);
  const waterPixels = mask.reduce((sum, value) => sum + value, 0);

  assert.equal(mask.length, battle.width * battle.height);
  assert.equal(mask[0], 0);
  assert.ok(waterPixels > battle.width * battle.height * 0.35);
  assert.ok(waterPixels < battle.width * battle.height * 0.75);
  assert.ok(battle.map.cells.some((cell) => cell.terrain.t === "beach"));
  assert.ok(battle.map.cells.some((cell) => cell.terrain.waterDepthBand >= 2));
});

test("lake wind varies smoothly and exposes the normal downwind flow direction", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  const startDirection = battle.wind.directionRad;
  const startStrength = battle.wind.strength;
  for (let frame = 0; frame < 120; frame++) updateLakeBattle(battle, 1 / 60, {});

  assert.ok(Math.abs(battle.wind.directionRad - startDirection) < 0.1);
  assert.ok(Math.abs(battle.wind.directionRad - startDirection) > 0.0001);
  assert.ok(Math.abs(battle.wind.strength - startStrength) > 0.0001);
  assert.ok(battle.wind.strength >= 0.16 && battle.wind.strength <= 0.98);
  const expectedFlow = (battle.wind.directionRad + Math.PI) % (Math.PI * 2);
  const flowDelta = Math.atan2(
    Math.sin(lakeBattleWindFlowDirection(battle) - expectedFlow),
    Math.cos(lakeBattleWindFlowDirection(battle) - expectedFlow)
  );
  assert.ok(Math.abs(flowDelta) < 1e-9);
});

test("ships remain inside the independent lake while sailing and fighting", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });

  for (let frame = 0; frame < 2400; frame++) {
    updateLakeBattle(battle, 1 / 60, {
      desiredHeadingRad: frame < 1200 ? -0.7 : 2.45,
      firePort: frame % 180 === 0,
      fireStarboard: frame % 180 === 90
    });
    if (battle.phase !== LAKE_BATTLE_PHASE_ACTIVE) break;
    assert.equal(lakeBattleShipFitsInWater(battle, battle.player), true);
    assert.equal(lakeBattleShipFitsInWater(battle, battle.enemy), true);
  }
});

test("enemy navigation commits to a route around a lake island", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  const island = battle.map.cells.find((cell) => (
    !cell.water &&
    cell.x > battle.width * 0.35 && cell.x < battle.width * 0.65 &&
    cell.y > battle.height * 0.2 && cell.y < battle.height * 0.55
  ));
  assert.ok(island, "the deterministic lake needs an interior island for navigation coverage");
  const navigableCells = battle.map.cells.filter((cell) => (
    cell.water && lakeBattleShipFitsInWater(battle, battle.enemy, cell.x, cell.y)
  ));
  const routeCell = (side) => navigableCells
    .filter((cell) => side * (cell.x - island.x) > 32)
    .sort((a, b) => (
      Math.abs(a.y - island.y) - Math.abs(b.y - island.y) ||
      Math.abs(a.x - island.x) - Math.abs(b.x - island.x)
    ))[0];
  const enemyStart = routeCell(-1);
  const playerTarget = routeCell(1);
  assert.ok(enemyStart && playerTarget, "the island needs navigable water on both sides");

  Object.assign(battle.enemy, {
    x: enemyStart.x,
    y: enemyStart.y,
    headingRad: 0,
    speedPx: 0,
    hitPoints: 10000,
    navigationCourseRad: 0,
    navigationDecisionCooldown: 0
  });
  Object.assign(battle.player, {
    x: playerTarget.x,
    y: playerTarget.y,
    headingRad: Math.PI,
    speedPx: 0,
    hitPoints: 10000
  });

  let maximumCrossTrackPx = 0;
  let passedIsland = false;
  for (let frame = 0; frame < 480 && !passedIsland; frame++) {
    updateLakeBattle(battle, 1 / 60, {});
    Object.assign(battle.player, {
      x: playerTarget.x,
      y: playerTarget.y,
      speedPx: 0,
      hitPoints: 10000
    });
    assert.equal(lakeBattleShipFitsInWater(battle, battle.enemy), true);
    maximumCrossTrackPx = Math.max(maximumCrossTrackPx, Math.abs(battle.enemy.y - enemyStart.y));
    passedIsland = battle.enemy.x > island.x + 12;
  }

  assert.equal(passedIsland, true);
  assert.ok(maximumCrossTrackPx > 18, `enemy only deviated ${maximumCrossTrackPx.toFixed(1)}px around island`);
});

test("a scripted skirmish reaches a transient combat result", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  for (let frame = 0; frame < 14400 && battle.phase === LAKE_BATTLE_PHASE_ACTIVE; frame++) {
    updateLakeBattle(battle, 1 / 60, {
      desiredHeadingRad: frame < 900 ? -0.5 : -1.2,
      firePort: frame % 90 === 0,
      fireStarboard: frame % 90 === 45
    });
  }

  assert.notEqual(battle.phase, LAKE_BATTLE_PHASE_ACTIVE);
  assert.ok(["victory", "defeat", "draw"].includes(battle.outcome));
});

test("broadside fire follows the selected side and emits combat events", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  battle.player.headingRad = 0;
  const port = lakeBattleBroadsideDirection(battle.player, "port");
  const starboard = lakeBattleBroadsideDirection(battle.player, "starboard");

  assert.equal(Math.abs(port.x), 0);
  assert.equal(port.y, -1);
  assert.equal(Math.abs(starboard.x), 0);
  assert.equal(starboard.y, 1);
  assert.equal(fireLakeBattleBroadside(battle, LAKE_BATTLE_PLAYER_ID, "port"), true);
  assert.ok(battle.projectiles.length > 1);
  assert.equal(battle.cannonSmokeBursts.length, battle.projectiles.length);
  assert.ok(battle.projectiles.every((projectile) => projectile.arcHeight < 4));
  assert.deepEqual(drainLakeBattleEvents(battle).map((event) => event.type), ["fire"]);
  assert.equal(fireLakeBattleBroadside(battle, LAKE_BATTLE_PLAYER_ID, "port"), false);
  assert.throws(
    () => fireLakeBattleBroadside(battle, LAKE_BATTLE_ENEMY_ID, "bow"),
    /Unknown lake battle broadside/
  );
});

test("a cannonball damages the first ship crossed before its endpoint", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  const initialHitPoints = battle.enemy.hitPoints;
  const targetCenter = shipFootprintCenter(shipFootprintFrame(
    TEST_SHIP_FOOTPRINTS.get(battle.enemy.slug),
    lakeBattleHeadingVector(battle.enemy)
  ));
  battle.enemy.cooldowns.port = 100;
  battle.enemy.cooldowns.starboard = 100;
  battle.projectiles = [{
    id: 999,
    ownerId: LAKE_BATTLE_PLAYER_ID,
    targetId: null,
    kind: "cannon",
    startX: battle.enemy.x - 30,
    startY: battle.enemy.y + targetCenter.y,
    targetX: battle.enemy.x + 30,
    targetY: battle.enemy.y + targetCenter.y,
    age: 0,
    duration: 0.6,
    arcHeight: 3,
    damage: 1,
    seed: 1
  }];

  for (let frame = 0; frame < 6 && battle.enemy.hitPoints === initialHitPoints; frame++) {
    updateLakeBattle(battle, 0.1, {});
  }

  assert.equal(battle.enemy.hitPoints, initialHitPoints - 1);
  assert.equal(battle.projectiles.length, 0);
  assert.equal(battle.hullSplinterBursts.length, 1);
  assert.ok(drainLakeBattleEvents(battle).some((event) => (
    event.type === "hit" && event.shipId === LAKE_BATTLE_ENEMY_ID
  )));
});

test("lake battle cannon tiers alter cooldown, damage, and range without save data", () => {
  const standard = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  const upgraded = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel",
    playerCannonEquipmentId: "royal-foundry-battery"
  });

  assert.ok(lakeBattleWeaponRange(upgraded.player) > lakeBattleWeaponRange(standard.player));
  assert.equal(fireLakeBattleBroadside(upgraded, LAKE_BATTLE_PLAYER_ID, "port"), true);
  assert.equal(upgraded.player.cooldowns.port, 5.5);
  assert.ok(upgraded.projectiles.every((projectile) => projectile.damage === 1.58));
  assert.throws(
    () => createLakeBattle({
      width: 455,
      height: 256,
      playerSlug: "viking-longship",
      enemySlug: "caravel",
      playerCannonEquipmentId: "bronze-culverins"
    }),
    /cannot be fitted/
  );
});

test("releasing steering stops turning while the ship continues under sail", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  updateLakeBattle(battle, 0.1, { desiredHeadingRad: 1.2 });
  const releasedHeading = battle.player.headingRad;
  const releasedPosition = { x: battle.player.x, y: battle.player.y };

  for (let frame = 0; frame < 10; frame++) updateLakeBattle(battle, 0.1, {});

  assert.equal(battle.player.headingRad, releasedHeading);
  assert.ok(Math.hypot(battle.player.x - releasedPosition.x, battle.player.y - releasedPosition.y) > 0);
});

test("lake battle rudder authority falls while stalled without reaching zero", () => {
  const stalled = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  const moving = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  stalled.player.headingRad = 0;
  stalled.player.speedPx = 0;
  moving.player.headingRad = 0;
  moving.player.speedPx = Number.MAX_SAFE_INTEGER;

  updateLakeBattle(stalled, 0.1, { desiredHeadingRad: Math.PI / 2 });
  updateLakeBattle(moving, 0.1, { desiredHeadingRad: Math.PI / 2 });

  assert.ok(stalled.player.headingRad > 0);
  assert.ok(stalled.player.headingRad < moving.player.headingRad);
  assert.equal(moving.player.headingRad, moving.player.stats.turnRateRad * 0.1);
});

test("shore overlap never vetoes a player turn and nudges the hull toward clearance", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  const ship = battle.player;
  ship.headingRad = 0;
  ship.speedPx = Number.MAX_SAFE_INTEGER;
  const nextHeading = ship.stats.turnRateRad * 0.1;
  const frames = battle.shipFootprints.get(ship.slug);
  const currentFrame = shipFootprintFrame(frames, { x: 1, y: 0 });
  const nextFrame = shipFootprintFrame(frames, {
    x: Math.cos(nextHeading),
    y: Math.sin(nextHeading)
  });
  const occupiedNow = new Set(currentFrame.samples.map((sample) => (
    `${Math.floor(ship.x + sample.x)},${Math.floor(ship.y + sample.y)}`
  )));
  const newlyOccupied = nextFrame.samples.find((sample) => !occupiedNow.has(
    `${Math.floor(ship.x + sample.x)},${Math.floor(ship.y + sample.y)}`
  ));
  assert.ok(newlyOccupied, "adjacent heading needs a distinct waterline sample");
  const blockedX = Math.floor(ship.x + newlyOccupied.x);
  const blockedY = Math.floor(ship.y + newlyOccupied.y);
  battle.waterMask[blockedY * battle.width + blockedX] = 0;
  assert.equal(lakeBattleShipFitsInWater(battle, ship), true);
  const start = { x: ship.x, y: ship.y };

  updateLakeBattle(battle, 0.1, { desiredHeadingRad: Math.PI / 2 });

  assert.equal(ship.headingRad, nextHeading);
  assert.ok(Math.hypot(ship.x - start.x, ship.y - start.y) > 0);
  assert.equal(lakeBattleShipFitsInWater(battle, ship), true);
});

test("lake battle geometry follows responsive logical viewport changes", () => {
  const battle = createLakeBattle({
    width: 455,
    height: 256,
    playerSlug: "brigantine",
    enemySlug: "caravel"
  });
  const playerFraction = { x: battle.player.x / battle.width, y: battle.player.y / battle.height };

  assert.equal(resizeLakeBattle(battle, 256, 455), true);
  assert.equal(battle.player.x / battle.width, playerFraction.x);
  assert.equal(battle.player.y / battle.height, playerFraction.y);
  assert.equal(lakeBattleShipFitsInWater(battle, battle.player), true);
  assert.equal(lakeBattleShipFitsInWater(battle, battle.enemy), true);
  assert.equal(resizeLakeBattle(battle, 256, 455), false);
});
