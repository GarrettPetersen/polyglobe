import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  HISTORICAL_BATTLE_SCENARIOS,
  HOLY_LEAGUE_SIDE_ID,
  LEPANTO_SCENARIO_ID,
  OTTOMAN_SIDE_ID,
  historicalBattleScenarioById,
  historicalBattleScenarioShipCount,
  historicalBattleSideById
} from "./historicalBattleScenarios.js";

test("Lepanto carries its historical fleet scale and division structure", () => {
  const scenario = historicalBattleScenarioById(LEPANTO_SCENARIO_ID);

  assert.equal(HISTORICAL_BATTLE_SCENARIOS.length, 1);
  assert.equal(historicalBattleScenarioShipCount(scenario, HOLY_LEAGUE_SIDE_ID), 314);
  assert.equal(historicalBattleScenarioShipCount(scenario, OTTOMAN_SIDE_ID), 272);
  assert.equal(historicalBattleScenarioShipCount(scenario), 586);
  assert.equal(historicalBattleSideById(scenario, HOLY_LEAGUE_SIDE_ID).squadrons.length, 7);
  assert.equal(historicalBattleSideById(scenario, OTTOMAN_SIDE_ID).squadrons.length, 4);
});

test("the Holy League includes its independent sailing ships and light auxiliaries", () => {
  const league = historicalBattleSideById(
    historicalBattleScenarioById(LEPANTO_SCENARIO_ID),
    HOLY_LEAGUE_SIDE_ID
  );
  const sailing = league.squadrons.find((squadron) => squadron.id === "league-sailing");
  const auxiliaries = league.squadrons.find((squadron) => squadron.id === "league-auxiliaries");

  assert.equal(sailing.count, 26);
  assert.deepEqual(sailing.shipGroups.map(({ shipSlug, count, factionId }) => (
    { shipSlug, count, factionId }
  )), [
    { shipSlug: "galleon", count: 24, factionId: "spain" },
    { shipSlug: "carrack", count: 2, factionId: "venice" }
  ]);
  assert.equal(auxiliaries.count, 76);
  assert.deepEqual(auxiliaries.shipGroups.map(({ count, factionId }) => ({ count, factionId })), [
    { count: 50, factionId: "spain" },
    { count: 20, factionId: "venice" },
    { count: 6, factionId: "papal-states" }
  ]);
  assert.ok(auxiliaries.shipGroups.every((group) => group.shipSlug === "fusta"));
});

test("the Holy League vanguard contains the six Venetian galleasses", () => {
  const scenario = historicalBattleScenarioById(LEPANTO_SCENARIO_ID);
  const league = historicalBattleSideById(scenario, HOLY_LEAGUE_SIDE_ID);
  const vanguard = league.squadrons.find((squadron) => squadron.id === "league-galleasses");

  assert.equal(vanguard.count, 6);
  assert.deepEqual(vanguard.shipGroups, [{
    shipSlug: "galleass",
    count: 6,
    role: "galleass",
    factionId: "venice",
    cannons: 36,
    portableWeaponItemIds: ["matchlock-arquebuses"]
  }]);
  assert.ok(vanguard.rowSpacingPx >= 100);
});

test("squadron tactics are explicit metadata rather than inferred from names", () => {
  const scenario = historicalBattleScenarioById(LEPANTO_SCENARIO_ID);
  const league = historicalBattleSideById(scenario, HOLY_LEAGUE_SIDE_ID);
  const ottomans = historicalBattleSideById(scenario, OTTOMAN_SIDE_ID);
  assert.equal(league.squadrons.find(({ id }) => id === "league-galleasses").role, "vanguard");
  assert.equal(league.squadrons.find(({ id }) => id === "league-reserve").role, "reserve");
  assert.equal(ottomans.squadrons.find(({ id }) => id === "ottoman-reserve").role, "reserve");
  assert.equal(league.squadrons.find(({ id }) => id === "league-center").role, "line");
});

test("Lepanto records faction flags, asymmetric artillery, and an Ottoman escape", () => {
  const scenario = historicalBattleScenarioById(LEPANTO_SCENARIO_ID);
  const leagueGroups = historicalBattleSideById(scenario, HOLY_LEAGUE_SIDE_ID).squadrons
    .flatMap((squadron) => squadron.shipGroups);
  const ottomanGroups = historicalBattleSideById(scenario, OTTOMAN_SIDE_ID).squadrons
    .flatMap((squadron) => squadron.shipGroups);

  assert.ok(new Set(leagueGroups.map((group) => group.factionId)).size >= 6);
  assert.ok(leagueGroups.every((group) => group.portableWeaponItemIds.includes("matchlock-arquebuses")));
  assert.ok(ottomanGroups.every((group) => group.factionId === "ottoman"));
  assert.ok(ottomanGroups.every((group) => group.portableWeaponItemIds.includes("composite-recurve-bows")));
  assert.ok(Math.max(...ottomanGroups.map((group) => group.cannons)) <
    Math.max(...leagueGroups.filter((group) => group.role === "galley").map((group) => group.cannons)));
  assert.equal(scenario.map.escape.sideId, OTTOMAN_SIDE_ID);
  assert.equal(scenario.map.escape.edge, "east");
  assert.equal(scenario.map.wind.directionRad, 0);
  assert.equal(scenario.map.wind.shift.directionRad, Math.PI);
  assert.ok(scenario.map.wind.shift.beginsAtSeconds >= 60);
  assert.ok(scenario.map.wind.shift.completesAtSeconds <= 150);
  assert.equal(scenario.map.escape.longitudeDeg, 21.52);
});

test("Lepanto exposes one map marker and six playable historical commanders", () => {
  const scenario = historicalBattleScenarioById(LEPANTO_SCENARIO_ID);
  const commanders = scenario.selection.commanders;
  const supportingCharacters = scenario.selection.supportingCharacters;

  assert.deepEqual(scenario.selection.marker, {
    longitudeDeg: 21.18,
    latitudeDeg: 38.23,
    shipSlug: "galleass"
  });
  assert.equal(commanders.length, 6);
  assert.deepEqual(commanders.map(({ sideId }) => sideId), [
    HOLY_LEAGUE_SIDE_ID,
    HOLY_LEAGUE_SIDE_ID,
    HOLY_LEAGUE_SIDE_ID,
    OTTOMAN_SIDE_ID,
    OTTOMAN_SIDE_ID,
    OTTOMAN_SIDE_ID
  ]);
  assert.equal(new Set(commanders.map(({ id }) => id)).size, 6);
  assert.equal(new Set(commanders.map(({ portraitSrc }) => portraitSrc)).size, 6);
  for (const commander of commanders) {
    assert.equal(commander.shipSlug, "mediterranean-galley");
    assert.equal(commander.portraitFacing, "right");
    assert.equal(
      existsSync(new URL(`../public/${commander.portraitSrc}`, import.meta.url)),
      true,
      `Missing historical commander portrait: ${commander.id}`
    );
  }
  assert.deepEqual(supportingCharacters.map(({ id }) => id), ["christian-oarsman"]);
  assert.equal(supportingCharacters[0].portraitFacing, "left");
  assert.equal(
    existsSync(new URL(`../public/${supportingCharacters[0].portraitSrc}`, import.meta.url)),
    true,
    "Missing Christian oarsman portrait"
  );
});

test("historical scenario records are immutable", () => {
  const scenario = historicalBattleScenarioById(LEPANTO_SCENARIO_ID);
  assert.equal(Object.isFrozen(scenario), true);
  assert.equal(Object.isFrozen(scenario.sides[0].squadrons[0].shipGroups[0]), true);
  assert.throws(() => {
    scenario.map.width = 1;
  }, /read only|Cannot assign/);
});
