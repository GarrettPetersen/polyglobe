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
  fireHistoricalBattleBroadside,
  historicalBattleCommanderMarkers,
  historicalBattleInterpolatedShipPose,
  historicalBattleNavigableCourse,
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
import {
  historicalBattleMapWaterAt
} from "./historicalBattleMap.js";
import { validateShipFootprintBake } from "./shipFootprint.js";
import { validateShipWakeAnchors } from "./shipWakeAnchors.js";
import { SHIP_ROWING_MODE_PIVOT_PORT } from "./shipRowingAnimation.js";
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
    shipFootprints: HISTORICAL_SHIP_FOOTPRINTS,
    shipWakeAnchorsBySlug: HISTORICAL_SHIP_WAKE_ANCHORS,
    seed: 12345,
    ...overrides
  });
}

test("Lepanto starts all 586 ships in small tactical squadrons", () => {
  const battle = createBattle();

  assert.equal(battle.phase, HISTORICAL_BATTLE_PHASE_ACTIVE);
  assert.equal(battle.ships.length, 586);
  assert.equal(battle.squadrons.length, 54);
  assert.equal(new Set(battle.squadrons.map((squadron) => squadron.divisionId)).size, 11);
  assert.ok(Math.max(...battle.squadrons.map((squadron) => squadron.startingShips)) <= 16);
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
  assert.equal(playerShips[0].divisionId, "ottoman-left");
  assert.equal(
    battle.squadrons.find((squadron) => squadron.id === "ottoman-left").startingShips,
    12
  );
});

test("the HUD tracks every other surviving commander by allegiance and distance", () => {
  const battle = createBattle();
  const markers = historicalBattleCommanderMarkers(battle);

  assert.equal(markers.length, 5);
  assert.deepEqual(
    markers.map((marker) => marker.commanderId).sort(),
    ["agostino-barbarigo", "ali-pasha", "giovanni-andrea-doria", "mahomet-sirocco", "uluc-ali"]
  );
  assert.equal(markers.filter((marker) => marker.sideId === battle.playerSideId).length, 2);
  assert.equal(markers.filter((marker) => marker.sideId !== battle.playerSideId).length, 3);
  assert.ok(markers.every((marker) => marker.distancePx > 0));
  assert.ok(markers.every((marker) => marker.distanceKm > 0 && marker.distanceKm < 100));
});

test("the fleets have a brief orderly approach before first contact", () => {
  const battle = createBattle();
  const initialRemaining = battle.sides.map((side) => side.remainingShips);
  const openingEvents = [];
  const player = historicalBattlePlayerShip(battle);
  const nearestEnemyDistance = Math.min(...battle.ships
    .filter((ship) => ship.sideId !== player.sideId)
    .map((ship) => Math.hypot(ship.x - player.x, ship.y - player.y)));

  assert.ok(
    nearestEnemyDistance >= 1_800 && nearestEnemyDistance <= 3_200,
    `player approach starts at ${nearestEnemyDistance}px`
  );

  for (let tick = 0; tick < 60; tick++) {
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

  let firstContactSeconds = null;
  for (let tick = 60; tick < 600 && firstContactSeconds === null; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: true
    });
    const contact = drainHistoricalBattleEvents(battle).some((event) => (
      ["collision", "fire", "hit"].includes(event.type)
    ));
    if (contact) firstContactSeconds = battle.elapsedSeconds;
  }
  assert.ok(firstContactSeconds !== null, "the fleets did not enter combat within 30 seconds");
  assert.ok(firstContactSeconds >= 4, `combat began too abruptly at ${firstContactSeconds}s`);
});

test("both fleets deploy east of Cephalonia with clear water ahead", () => {
  const battle = createBattle();
  assert.ok(battle.map.bounds.minLongitudeDeg > 20.8, "Cephalonia entered the tactical field");
  for (const squadron of battle.squadrons) {
    const leader = battle.ships[squadron.leaderIndex];
    const headingRad = leader.sideId === HOLY_LEAGUE_SIDE_ID ? 0 : Math.PI;
    const clearancePx = leader.role === "galleass" ? 10 : 7;
    assert.equal(
      historicalBattleMapWaterAt(battle.map, leader.x, leader.y, clearancePx),
      true,
      `${leader.id} starts outside navigable water`
    );
    const course = historicalBattleNavigableCourse(battle.map, {
      x: leader.x,
      y: leader.y,
      desiredHeadingRad: headingRad,
      currentHeadingRad: headingRad,
      clearancePx,
      preferredSide: 1
    });
    const turn = Math.atan2(
      Math.sin(course.headingRad - headingRad),
      Math.cos(course.headingRad - headingRad)
    );
    assert.ok(Math.abs(turn) < 1e-6, `${leader.id} must turn ${turn.toFixed(3)} radians at deployment`);
    assert.ok(course.clearDistancePx >= 520, `${leader.id} starts only ${course.clearDistancePx}px from land`);
  }
});

test("the opening battle lines have an unclogged maneuvering corridor", () => {
  const battle = createBattle();
  const league = battle.ships.filter((ship) => ship.sideId === HOLY_LEAGUE_SIDE_ID);
  const ottomans = battle.ships.filter((ship) => ship.sideId === OTTOMAN_SIDE_ID);
  const leagueMaxX = Math.max(...league.map((ship) => ship.x));
  const ottomanMinX = Math.min(...ottomans.map((ship) => ship.x));
  assert.ok(
    ottomanMinX - leagueMaxX >= 500 && ottomanMinX - leagueMaxX <= 900,
    "the opening maneuvering corridor is too narrow or too long"
  );
  assert.ok(
    Math.max(...league.map((ship) => ship.y)) - Math.min(...league.map((ship) => ship.y)) >= 15_000,
    "the Holy League is packed into too little frontage"
  );
  assert.ok(
    Math.max(...ottomans.map((ship) => ship.y)) - Math.min(...ottomans.map((ship) => ship.y)) >= 10_000,
    "the Ottoman fleet is packed into too little frontage"
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
  assert.equal(
    battle.projectiles.find((projectile) => (
      projectile.ownerIndex === shooterIndex && projectile.weaponId === event.weaponId
    ))?.portable,
    true
  );
});

test("fixed-step updates are deterministic across different render frame rates", () => {
  const fastFrames = createBattle();
  const slowFrames = createBattle();
  const command = { desiredHeadingRad: 0.12, rowingRequested: true };

  for (let index = 0; index < 200; index++) updateHistoricalBattle(fastFrames, 1 / 40, command);
  for (let index = 0; index < 100; index++) updateHistoricalBattle(slowFrames, 1 / 20, command);

  assert.deepEqual(historicalBattleSnapshot(fastFrames), historicalBattleSnapshot(slowFrames));
});

test("the player flagship can pivot with opposed oar banks", () => {
  const battle = createBattle();
  const player = historicalBattlePlayerShip(battle);
  const startingHeading = player.headingRad;

  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    desiredHeadingRad: startingHeading - Math.PI / 2,
    rowingMode: SHIP_ROWING_MODE_PIVOT_PORT
  });

  const signedTurn = Math.atan2(
    Math.sin(player.headingRad - startingHeading),
    Math.cos(player.headingRad - startingHeading)
  );
  assert.ok(signedTurn < 0);
  assert.equal(player.speedPx, 0);
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

test("player controls are compact, quantized, and tick stamped for future networking", () => {
  const command = createHistoricalBattleCommand(17, {
    desiredHeadingRad: Math.PI / 3,
    rowingRequested: true,
    firePort: true
  });

  assert.deepEqual(command, {
    tick: 17,
      desiredHeadingQ: Math.round((Math.PI / 3) / (Math.PI * 2) * 65535),
      rowingRequested: true,
      rowingMode: "ahead",
      firePort: true,
      fireStarboard: false
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

test("the player can fire a centerline broadside without an auto-selected target", () => {
  const battle = createBattle();
  const player = historicalBattlePlayerShip(battle);
  player.headingRad = 0;

  assert.equal(fireHistoricalBattleBroadside(battle, "port"), true);
  assert.ok(battle.projectiles.length > 0);
  assert.ok(battle.projectiles.every((projectile) => projectile.targetIndex === -1));
  const trueShot = battle.projectiles.find((projectile) => projectile.trueShot);
  assert.ok(trueShot);
  assert.ok(Math.abs(trueShot.targetX - trueShot.startX) < 1e-9);
  assert.ok(trueShot.targetY < trueShot.startY);
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
  assert.equal(centerFollowers.length, 11);
  assert.ok(centerFollowers.some((ship) => ship.x > startX - 80));
});

test("AI divisions pursue their historical counterparts before mopping up", () => {
  const battle = createBattle();
  for (let tick = 0; tick < 20; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: false
    });
  }

  for (const squadron of battle.squadrons) {
    const target = battle.ships[squadron.strategicTargetIndex];
    assert.ok(target?.active, `${squadron.id} has no strategic target`);
    assert.equal(
      target.divisionId,
      squadron.counterpartDivisionId,
      `${squadron.id} ignored ${squadron.counterpartDivisionId}`
    );
  }

  for (const ship of battle.ships) {
    if (ship.divisionId === "ottoman-center") ship.active = false;
  }
  for (let tick = 0; tick < 20; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: false
    });
  }
  const leagueCenter = battle.squadrons.find((squadron) => squadron.id === "league-center");
  const mopUpTarget = battle.ships[leagueCenter.strategicTargetIndex];
  assert.ok(mopUpTarget?.active);
  assert.equal(mopUpTarget.sideId, OTTOMAN_SIDE_ID);
  assert.notEqual(mopUpTarget.divisionId, "ottoman-center");
});

test("the Holy League sailing squadron reaches battle instead of stalling upwind", () => {
  const battle = createBattle();
  const squadron = battle.squadrons.find((entry) => entry.id === "league-sailing");
  const leader = battle.ships[squadron.leaderIndex];
  const start = { x: leader.x, y: leader.y };
  let fireEvents = 0;

  for (let tick = 0; tick < 800; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: false
    });
    for (const event of drainHistoricalBattleEvents(battle)) {
      if (event.type === "fire" && battle.ships[event.shipIndex]?.divisionId === "league-sailing") {
        fireEvents += 1;
      }
    }
  }

  assert.ok(
    Math.hypot(leader.x - start.x, leader.y - start.y) > 20,
    "sail-only squadron remained stalled at deployment"
  );
  assert.ok(leader.x > start.x, "sailing squadron made no progress toward the Ottoman line");
  assert.ok(fireEvents > 0, "sailing squadron did not join the opening engagement");
});

test("a broken side retreats through a timed mop-up instead of requiring annihilation", () => {
  const battle = createBattle();
  const ottomanShips = battle.ships.filter((ship) => ship.sideId === OTTOMAN_SIDE_ID);
  const survivors = Math.floor(ottomanShips.length * 0.35);
  for (const ship of ottomanShips.slice(survivors)) {
    ship.active = false;
    ship.surrendered = true;
  }
  battle.elapsedSeconds = 90;

  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    desiredHeadingRad: 0,
    rowingRequested: false
  });
  const events = drainHistoricalBattleEvents(battle);
  assert.equal(battle.brokenSideId, OTTOMAN_SIDE_ID);
  assert.equal(battle.phase, HISTORICAL_BATTLE_PHASE_ACTIVE);
  assert.ok(events.some((event) => event.type === "side-broken" && event.sideId === OTTOMAN_SIDE_ID));
  assert.ok(battle.squadrons
    .filter((squadron) => squadron.sideId === OTTOMAN_SIDE_ID)
    .every((squadron) => squadron.stance === "withdraw"));

  battle.elapsedSeconds = battle.mopUpEndsAtSeconds - HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    desiredHeadingRad: 0,
    rowingRequested: false
  });
  assert.equal(battle.phase, "finished");
  assert.equal(battle.winningSideId, HOLY_LEAGUE_SIDE_ID);
});

test("a disengaged player flagship slowly repairs to half hull and not under threat", () => {
  const battle = createBattle();
  const player = historicalBattlePlayerShip(battle);
  player.hitPoints = 1;
  player.lastDamageAtSeconds = 0;
  player.repairProgressSeconds = 19.95;
  battle.elapsedSeconds = 12;

  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    desiredHeadingRad: null,
    rowingRequested: false
  });
  assert.equal(player.hitPoints, 2);
  assert.equal(player.repairing, true);

  const enemy = battle.ships.find((ship) => ship.sideId !== player.sideId && ship.active);
  enemy.x = player.x + 200;
  enemy.y = player.y;
  enemy.previousX = enemy.x;
  enemy.previousY = enemy.y;
  player.hitPoints = 1;
  player.repairProgressSeconds = 19.95;
  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    desiredHeadingRad: null,
    rowingRequested: false
  });
  assert.equal(player.hitPoints, 1);
  assert.equal(player.repairing, false);

  enemy.x = player.x + 1000;
  enemy.previousX = enemy.x;
  player.hitPoints = Math.ceil(player.maxHitPoints * 0.5);
  player.repairProgressSeconds = 19.95;
  updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
    desiredHeadingRad: null,
    rowingRequested: false
  });
  assert.equal(player.hitPoints, Math.ceil(player.maxHitPoints * 0.5));
});

test("a player-led reserve follows its flagship without manual orders", () => {
  const battle = createBattle({ playerSquadronId: "league-reserve" });
  const player = historicalBattlePlayerShip(battle);
  const followers = battle.ships.filter((ship) => (
    ship.squadronId === battle.playerSquadronId && !ship.playerControlled
  ));
  const initialAverageX = followers.reduce((sum, ship) => sum + ship.x, 0) / followers.length;

  for (let tick = 0; tick < 100; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: true
    });
  }

  const averageX = followers.reduce((sum, ship) => sum + ship.x, 0) / followers.length;
  assert.ok(player.x > initialAverageX + 20);
  assert.ok(averageX > initialAverageX + 5, "reserve followers stayed at their starting anchor");
});

test("squadron mates engage nearby enemies and reform on the flagship afterward", () => {
  const battle = createBattle();
  const player = historicalBattlePlayerShip(battle);
  const follower = battle.ships.find((ship) => (
    ship.squadronId === battle.playerSquadronId && !ship.playerControlled
  ));
  const enemy = battle.ships.find((ship) => ship.sideId !== battle.playerSideId);
  const enemyIndex = battle.ships.indexOf(enemy);
  enemy.x = follower.x + 82;
  enemy.y = follower.y;
  enemy.previousX = enemy.x;
  enemy.previousY = enemy.y;

  for (let tick = 0; tick < 16 && follower.targetIndex !== enemyIndex; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: player.headingRad,
      rowingRequested: false
    });
  }
  assert.equal(follower.targetIndex, enemyIndex, "squadron mate ignored a nearby enemy");

  enemy.active = false;
  follower.x += 110;
  follower.y += 70;
  follower.previousX = follower.x;
  follower.previousY = follower.y;
  const formationDistance = () => {
    const cos = Math.cos(player.headingRad);
    const sin = Math.sin(player.headingRad);
    const slotX = player.x + cos * follower.formationForward - sin * follower.formationLateral;
    const slotY = player.y + sin * follower.formationForward + cos * follower.formationLateral;
    return Math.hypot(follower.x - slotX, follower.y - slotY);
  };
  const displacedDistance = formationDistance();

  for (let tick = 0; tick < 128; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: player.headingRad,
      rowingRequested: false
    });
  }

  assert.equal(follower.targetIndex, -1);
  assert.ok(
    formationDistance() < displacedDistance - 10,
    "squadron mate did not regroup after its target left combat"
  );
});

test("a player squadron flows through a hard turn without an allied collision pileup", () => {
  const battle = createBattle();

  for (let tick = 0; tick < 120; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: Math.PI / 2,
      rowingRequested: true
    });
  }

  const playerSquadron = historicalBattleSquadronSummary(battle, battle.playerSquadronId);
  assert.ok(
    battle.metrics.playerSquadronFriendlyCollisionCorrections <= playerSquadron.startingShips / 2,
    `hard turn caused ${battle.metrics.playerSquadronFriendlyCollisionCorrections} repeated allied contacts`
  );
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
  let sailingSquadronFireEvents = 0;
  for (let tick = 0; tick < 3600 && battle.phase === HISTORICAL_BATTLE_PHASE_ACTIVE; tick++) {
    updateHistoricalBattle(battle, HISTORICAL_BATTLE_FIXED_STEP_SECONDS, {
      desiredHeadingRad: 0,
      rowingRequested: true,
      firePort: tick % 120 === 0,
      fireStarboard: tick % 120 === 60
    });
    for (const event of drainHistoricalBattleEvents(battle)) {
      const firingShip = battle.ships[event.shipIndex];
      if (event.type === "fire" && firingShip?.divisionId === "league-sailing") {
        sailingSquadronFireEvents += 1;
      }
    }
  }

  const remaining = battle.sides.reduce((total, side) => total + side.remainingShips, 0);
  assert.ok(remaining < initialRemaining, `all ${remaining} ships remained active`);
  assert.ok(sailingSquadronFireEvents > 0, "Holy League sailing squadron never entered combat");
  assert.equal("gameState" in battle, false);
  assert.equal("localLayout" in battle, false);
});
