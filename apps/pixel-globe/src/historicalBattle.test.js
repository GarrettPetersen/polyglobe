import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  HISTORICAL_BATTLE_FIXED_STEP_SECONDS,
  HISTORICAL_BATTLE_PHASE_ACTIVE,
  createHistoricalBattle,
  createHistoricalBattleCommand,
  createHistoricalBattleReplay,
  drainHistoricalBattleEvents,
  historicalBattleInterpolatedShipPose,
  historicalBattlePlayerShip,
  historicalBattleSideSummary,
  historicalBattleSnapshot,
  historicalBattleSquadronSummary,
  historicalBattleVisibleShips,
  historicalBattleWindAt,
  historicalBattleWindFlowDirection,
  updateHistoricalBattle,
  updateHistoricalBattleReplay
} from "./historicalBattle.js";
import { validateShipFootprintBake } from "./shipFootprint.js";
import { validateShipWakeAnchors } from "./shipWakeAnchors.js";
import { SHIP_SPRITE_FRAME_SIZE, SHIP_SPRITE_HEADINGS } from "./shipSpriteLayout.js";
import {
  HOLY_LEAGUE_SIDE_ID,
  LEPANTO_SCENARIO_ID,
  OTTOMAN_SIDE_ID
} from "./historicalBattleScenarios.js";

const HISTORICAL_SHIP_SLUGS = Object.freeze([
  "mediterranean-galley",
  "galleass",
  "galleon",
  "carrack",
  "fusta"
]);
const SHIP_FOOTPRINT_BAKE = JSON.parse(readFileSync(
  new URL("../public/assets/vehicles/unity-ships/hull-footprints.json", import.meta.url),
  "utf8"
));
const HISTORICAL_SHIP_FOOTPRINTS = validateShipFootprintBake(
  SHIP_FOOTPRINT_BAKE,
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS,
  HISTORICAL_SHIP_SLUGS
);
const SHIP_WAKE_ANCHOR_BAKE = JSON.parse(readFileSync(
  new URL("../public/assets/vehicles/unity-ships/wake-anchors.json", import.meta.url),
  "utf8"
));
const HISTORICAL_SHIP_WAKE_ANCHORS = new Map(HISTORICAL_SHIP_SLUGS.map((slug) => [
  slug,
  validateShipWakeAnchors(
    slug,
    SHIP_WAKE_ANCHOR_BAKE.ships[slug],
    SHIP_SPRITE_HEADINGS,
    SHIP_SPRITE_FRAME_SIZE
  )
]));

function createBattle(overrides = {}) {
  return createHistoricalBattle({
    scenarioId: LEPANTO_SCENARIO_ID,
    playerSideId: HOLY_LEAGUE_SIDE_ID,
    playerSquadronId: "league-center",
    shipWakeAnchorsBySlug: HISTORICAL_SHIP_WAKE_ANCHORS,
    seed: 12345,
    ...overrides
  });
}

test("Lepanto starts all 586 ships in the expanded historical order of battle", () => {
  const battle = createBattle();

  assert.equal(battle.phase, HISTORICAL_BATTLE_PHASE_ACTIVE);
  assert.equal(battle.ships.length, 586);
  assert.equal(battle.squadrons.length, 11);
  assert.equal(historicalBattleSideSummary(battle, HOLY_LEAGUE_SIDE_ID).remainingShips, 314);
  assert.equal(historicalBattleSideSummary(battle, OTTOMAN_SIDE_ID).remainingShips, 272);
  assert.equal(battle.ships.filter((ship) => ship.shipSlug === "galleass").length, 6);
  assert.equal(battle.ships.filter((ship) => ship.role === "galliot").length, 56);
  assert.equal(battle.ships.filter((ship) => ship.role === "auxiliary").length, 76);
  assert.equal(battle.ships.filter((ship) => ship.shipSlug === "fusta").length, 132);
});

test("the chosen squadron flagship is the only player-controlled ship", () => {
  const battle = createBattle({
    playerSideId: OTTOMAN_SIDE_ID,
    playerSquadronId: "ottoman-left"
  });
  const playerShips = battle.ships.filter((ship) => ship.playerControlled);

  assert.equal(playerShips.length, 1);
  assert.equal(playerShips[0].id, historicalBattlePlayerShip(battle).id);
  assert.equal(playerShips[0].sideId, OTTOMAN_SIDE_ID);
  assert.equal(playerShips[0].squadronId, "ottoman-left");
});

test("the separated fleets suffer no losses or collisions before first contact", () => {
  const battle = createBattle();
  const initialRemaining = battle.sides.map((side) => side.remainingShips);
  const openingEvents = [];

  for (let tick = 0; tick < 200; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: true
    });
    openingEvents.push(...drainHistoricalBattleEvents(battle));
  }

  assert.deepEqual(battle.sides.map((side) => side.remainingShips), initialRemaining);
  assert.equal(
    openingEvents.some((event) => ["collision", "fire", "hit", "sunk", "surrendered"].includes(event.type)),
    false
  );
});

test("portable fire events retain the weapon identity needed by shared audio", () => {
  const battle = createBattle();
  const shooterIndex = battle.ships.findIndex((ship) => (
    ship.factionId === "venice" && !ship.playerControlled
  ));
  const targetIndex = battle.ships.findIndex((ship) => ship.sideId === OTTOMAN_SIDE_ID);
  const shooter = battle.ships[shooterIndex];
  const target = battle.ships[targetIndex];
  target.x = shooter.x + 35;
  target.y = shooter.y;
  shooter.targetIndex = targetIndex;

  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS);
  const event = drainHistoricalBattleEvents(battle).find((entry) => (
    entry.type === "fire" && entry.shipIndex === shooterIndex && entry.weaponId
  ));

  assert.equal(event.weaponId, "matchlock-arquebuses");
  assert.equal(event.weaponKind, "bullet");
  assert.ok(event.count >= 1);
});

test("fixed-step updates are deterministic across different render frame rates", () => {
  const fastFrames = createBattle();
  const slowFrames = createBattle();
  const command = { desiredHeadingRad: 0.12, rowingRequested: true };

  for (let index = 0; index < 200; index++) updateHistoricalBattle(fastFrames, 1 / 40, command);
  for (let index = 0; index < 100; index++) updateHistoricalBattle(slowFrames, 1 / 20, command);

  assert.deepEqual(historicalBattleSnapshot(fastFrames), historicalBattleSnapshot(slowFrames));
});

test("recorded commands replay to the same deterministic fleet state", () => {
  const original = createBattle({ shipFootprints: HISTORICAL_SHIP_FOOTPRINTS });
  const inputs = Array.from({ length: 120 }, (_, tick) => ({
    desiredHeadingRad: tick < 40 ? 0.05 : tick < 80 ? null : -0.08,
    rowingRequested: tick < 90,
    firePort: tick === 24,
    fireStarboard: tick === 64
  }));
  for (const input of inputs) {
    updateHistoricalBattle(original, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, input);
  }
  const replay = createHistoricalBattleReplay(original);
  const replayed = createBattle({
    shipFootprints: HISTORICAL_SHIP_FOOTPRINTS,
    seed: replay.seed
  });
  for (let tick = 0; tick < inputs.length; tick++) {
    updateHistoricalBattleReplay(
      replayed,
      HISTORICAL_BATTLE_FIXED_STEP_SECONDS,
      replay
    );
  }

  assert.ok(replay.commands.some((command) => command.desiredHeadingQ === null));
  assert.deepEqual(historicalBattleSnapshot(replayed), historicalBattleSnapshot(original));
});

test("render poses interpolate between deterministic physics ticks", () => {
  const battle = createBattle();
  const player = historicalBattlePlayerShip(battle);

  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    desiredHeadingRad: 0.3,
    rowingRequested: true
  });
  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS / 2, {
    desiredHeadingRad: 0.3,
    rowingRequested: true
  });
  const pose = historicalBattleInterpolatedShipPose(battle, player);

  assert.ok(Math.abs(pose.x - (player.previousX + player.x) / 2) < 1e-9);
  assert.ok(Math.abs(pose.y - (player.previousY + player.y) / 2) < 1e-9);
  assert.notEqual(pose.headingRad, player.previousHeadingRad);
  assert.notEqual(pose.headingRad, player.headingRad);
});

test("player commands are compact, quantized, and tick stamped for future networking", () => {
  const command = createHistoricalBattleCommand(17, {
    desiredHeadingRad: Math.PI / 3,
    rowingRequested: true,
    firePort: true,
    squadronOrder: "advance"
  });

  assert.deepEqual(command, {
    tick: 17,
      desiredHeadingQ: Math.round((Math.PI / 3) / (Math.PI * 2) * 65535),
      rowingRequested: true,
      rowingMode: "ahead",
      firePort: true,
      fireStarboard: false,
      squadronOrder: "advance",
      unitCommand: null
  });
  assert.equal(Object.isFrozen(command), true);
});

test("port and starboard cannon reloads remain independent", () => {
  const battle = createBattle();
  const player = historicalBattlePlayerShip(battle);
  const target = battle.ships.find((ship) => ship.sideId === OTTOMAN_SIDE_ID);
  target.x = player.x;
  target.y = player.y + 36;
  player.cooldowns.port = 0;
  player.cooldowns.starboard = 0;

  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    fireStarboard: true
  });

  const fireEvent = drainHistoricalBattleEvents(battle).find((event) => (
    event.type === "fire" && event.shipIndex === battle.playerShipIndex && !event.weaponId
  ));

  assert.equal(player.cooldowns.port, 0);
  assert.ok(player.cooldowns.starboard > 0);
  assert.ok(fireEvent.smokeProjectiles.length > 0);
  assert.ok(fireEvent.smokeProjectiles.every((projectile) => (
    projectile.kind === "cannon" && Number.isInteger(projectile.seed)
  )));
});

test("historical wind uses the shared downwind flow convention", () => {
  const battle = createBattle();

  assert.equal(historicalBattleWindFlowDirection(battle), Math.PI);
});

test("Lepanto's east wind lulls and reverses before the fleets make contact", () => {
  const battle = createBattle();
  const windSpec = battle.scenario.map.wind;
  const opening = historicalBattleWindAt(windSpec, 0);
  const lull = historicalBattleWindAt(windSpec, windSpec.shift.reversesAtSeconds);
  const contact = historicalBattleWindAt(windSpec, windSpec.shift.completesAtSeconds);

  assert.equal(opening.directionRad, 0);
  assert.equal(opening.strength, 0.32);
  assert.equal(lull.directionRad, Math.PI);
  assert.equal(lull.strength, 0.04);
  assert.equal(contact.directionRad, Math.PI);
  assert.equal(contact.strength, 0.3);
  assert.equal((contact.directionRad + Math.PI) % (Math.PI * 2), 0);
});

test("baked hull radii keep large ships in the collision broad phase", () => {
  const battle = createBattle({ shipFootprints: HISTORICAL_SHIP_FOOTPRINTS });
  const player = historicalBattlePlayerShip(battle);
  const targetIndex = battle.ships.findIndex((ship) => (
    ship.sideId === OTTOMAN_SIDE_ID && ship.shipSlug === "mediterranean-galley"
  ));
  const target = battle.ships[targetIndex];
  player.x = 1987;
  player.y = 1100;
  player.headingRad = 0;
  player.speedPx = 12;
  target.x = 2016;
  target.y = 1100;
  target.headingRad = Math.PI;
  target.speedPx = 12;

  for (let step = 0; step < 2; step++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: false
    });
  }
  const collision = drainHistoricalBattleEvents(battle).find((event) => (
    event.type === "collision" && event.shipIndex === battle.playerShipIndex &&
    event.otherIndex === targetIndex
  ));

  assert.ok(player.collisionRadius > 18);
  assert.ok(battle.maxCollisionRadius > 21);
  assert.ok(collision, "overlapping ships in adjacent spatial cells passed through each other");
});

test("Lepanto uses faction equipment rather than a separate boarding weapon", () => {
  const battle = createBattle();
  const Venetian = battle.ships.find((ship) => ship.factionId === "venice");
  const Ottoman = battle.ships.find((ship) => ship.factionId === "ottoman");

  assert.deepEqual(Venetian.portableWeaponItemIds, ["matchlock-arquebuses"]);
  assert.deepEqual(Ottoman.portableWeaponItemIds, ["composite-recurve-bows"]);
  assert.equal("boardingCooldownSeconds" in Venetian, false);
});

test("the player's squadron follows its flagship while the other divisions advance", () => {
  const battle = createBattle();
  const player = historicalBattlePlayerShip(battle);
  const startX = player.x;

  for (let tick = 0; tick < 80; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: true
    });
  }

  assert.ok(player.x > startX + 20);
  const center = historicalBattleSquadronSummary(battle, "league-center");
  assert.equal(center.remainingShips, center.startingShips);
  const centerFollowers = battle.ships.filter((ship) => (
    ship.squadronId === "league-center" && !ship.playerControlled
  ));
  assert.ok(centerFollowers.some((ship) => ship.x > startX - 80));
});

test("spatial targeting keeps fleet work far below all-pairs scans", () => {
  const battle = createBattle();
  for (let tick = 0; tick < 240; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: true
    });
  }

  const allPairsPerTick = battle.ships.length * battle.ships.length * battle.metrics.fixedSteps;
  assert.ok(battle.metrics.targetQueries > 0);
  assert.ok(
    battle.metrics.spatialCandidates < allPairsPerTick * 0.08,
    `${battle.metrics.spatialCandidates} spatial candidates approached ${allPairsPerTick} all-pairs checks`
  );
});

test("render visibility culls the large fleet to the local camera", () => {
  const battle = createBattle();
  const player = historicalBattlePlayerShip(battle);
  const visible = historicalBattleVisibleShips(battle, player, 455, 256);

  assert.ok(visible.some((ship) => ship.playerControlled));
  assert.ok(visible.length < battle.ships.length / 2);
});

test("the fleet engagement produces combat casualties without world-sandbox state", () => {
  const battle = createBattle();
  const initialRemaining = battle.sides.reduce((total, side) => total + side.remainingShips, 0);
  for (let tick = 0; tick < 3600 && battle.phase === HISTORICAL_BATTLE_PHASE_ACTIVE; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: true,
      firePort: tick % 120 === 0,
      fireStarboard: tick % 120 === 60
    });
  }

  const remaining = battle.sides.reduce((total, side) => total + side.remainingShips, 0);
  assert.ok(remaining < initialRemaining, `all ${remaining} ships remained active`);
  assert.equal("gameState" in battle, false);
  assert.equal("localLayout" in battle, false);
});
