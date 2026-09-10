import { pirateHavenNavigationReasonText } from "./pirateHavenDialogue.js";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { pirateRevengeTargetPresent } from "./pirateHavens.js";
const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name).getText(source);

test("a revenge waypoint follows the actual ship and returns to the issuer if that hull is lost", () => {
  const haven = { cityId: "pirate-haven-1", city: "Black Gull Cove", vector: [1, 0, 0] };
  const port = { cityId: "lisbon|portugal", city: "Lisbon", vector: [0, 1, 0] };
  const merchant = { id: "merchant-1", seed: 77, hitPoints: 20, currentPort: port, visualNavigation: { vector: [0.9, 0.1, 0] } };
  const quest = { id: "quest-1", kind: "revenge", ready: false, originCityId: haven.cityId, havenCityId: haven.cityId,
    targetShipId: merchant.id, targetShipSeed: merchant.seed, targetCaptainName: "Joao", targetShipName: "Santa Maria" };
  const context = { gameState: { memory: { pirateHavens: { revenge: quest, suppression: null } } },
    npcSeaRoutes: { shipById: new Map([[merchant.id, merchant]]) }, cityById: new Map([[haven.cityId, haven]]),
    pirateHavenNavigationReasonText, pirateRevengeTargetPresent, weatherClockMinutes: 1, npcShipSnapshotForId: () => ({ routeVector: [0.8, 0.2, 0] }),
    placedCityTargetVector: city => city.vector, requireEntityById: (map, id) => map.get(id),
    cityLabelText: city => city.city, QUEST_NAVIGATION_STYLE: {} };
  const entries = runInNewContext(`${declaration("pirateHavenNavigationEntries")}; pirateHavenNavigationEntries`, context);
  assert.deepEqual(entries()[0].targetVector, merchant.visualNavigation.vector);
  merchant.visualNavigation = null;
  assert.deepEqual(entries()[0].targetVector, [0.8, 0.2, 0]);
  merchant.seed++;
  assert.deepEqual(entries()[0].targetVector, haven.vector);
  assert.match(entries()[0].reason, /Ship lost/);
});

test("haven state changes cancel stale workers and rebuild chart records before spatial indexes", () => {
  const calls = [];
  const context = { chart: null, camera: {}, resetDistantWorldWorkerSchedule: () => calls.push("worker"),
    buildChart: () => { calls.push("chart"); return { updated: true }; },
    refreshWorldSpatialStaticEntries: () => { assert.equal(context.chart.updated, true); calls.push("spatial"); } };
  runInNewContext(`${declaration("refreshPirateHavenWorld")}; refreshPirateHavenWorld();`, context);
  assert.deepEqual(calls, ["worker", "chart", "spatial"]);
});
