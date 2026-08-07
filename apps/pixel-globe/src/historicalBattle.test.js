import assert from "node:assert/strict";
import test from "node:test";

import {
  HISTORICAL_BATTLE_FIXED_STEP_SECONDS,
  HISTORICAL_BATTLE_PHASE_ACTIVE,
  createHistoricalBattle,
  createHistoricalBattleCommand,
  historicalBattlePlayerShip,
  historicalBattleSideSummary,
  historicalBattleSnapshot,
  historicalBattleSquadronSummary,
  historicalBattleVisibleShips,
  updateHistoricalBattle
} from "./historicalBattle.js";
import {
  HOLY_LEAGUE_SIDE_ID,
  LEPANTO_SCENARIO_ID,
  OTTOMAN_SIDE_ID
} from "./historicalBattleScenarios.js";

function createBattle(overrides = {}) {
  return createHistoricalBattle({
    scenarioId: LEPANTO_SCENARIO_ID,
    playerSideId: HOLY_LEAGUE_SIDE_ID,
    playerSquadronId: "league-center",
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

test("fixed-step updates are deterministic across different render frame rates", () => {
  const fastFrames = createBattle();
  const slowFrames = createBattle();
  const command = { desiredHeadingRad: 0.12, rowingRequested: true };

  for (let index = 0; index < 200; index++) updateHistoricalBattle(fastFrames, 1 / 40, command);
  for (let index = 0; index < 100; index++) updateHistoricalBattle(slowFrames, 1 / 20, command);

  assert.deepEqual(historicalBattleSnapshot(fastFrames), historicalBattleSnapshot(slowFrames));
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

  assert.equal(player.cooldowns.port, 0);
  assert.ok(player.cooldowns.starboard > 0);
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
