import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const contextCode = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "portDialogueContext").getText(source);

test("repeated market context refreshes do not search worldwide shipyard listings", () => {
  const city = { cityId: "suez|egypt", tileId: 1, factionId: "mamluks" };
  let searches = 0;
  const context = {
    dialogueState: { kind: "port", cityId: city.cityId, nodeId: "market" },
    gameState: { playerCharacter: { homePortCityId: city.cityId, name: "Captain" } },
    cityById: new Map([[city.cityId, city]]), cityByTileId: new Map([[1, city]]),
    worldEconomy: { shipyards: {} }, weatherClockMinutes: 100,
    weatherParts: { dayIndex: 0 }, graph: { lonDeg: [0, 30] }, ship: null,
    portArrivalNavigationByCityId: new Map(), STORM_ACTIVE_INTENSITY: 1, WEATHER_MINUTES_PER_DAY: 1440,
    playerAccessiblePortCities: () => [city], pendingPassengerOffersForCity: () => [],
    nearestShipyardListingForPort: () => { searches++; return { portId: "basra|iraq" }; },
    shipyardRumorForPort: () => { searches++; return { portId: "basra|iraq" }; }
  };
  for (const name of ["chartPortCallById", "colonizationSiteIsRuined", "shipyardAtPort", "chefFeastInputBlocked",
    "weatherLocalHour", "currentPortArrivalGreetingPresented", "playerShipPrivateeringPower", "nearbyPortTraffic",
    "stormIntensityForTile", "factionReputation", "portPoliticalRivalTerms", "sailingDistanceBetweenPorts",
    "portEntryStatus", "shoreBatteryRecoveryStatus", "ensureShoreBatteryState", "playerPortConquestStatus",
    "playerPortAttackStatus", "portInnDialogue", "mediterraneanDemoVoyageIsActive"]) context[name] = () => null;
  const buildContext = runInNewContext(`${contextCode}; portDialogueContext`, context);
  for (let click = 0; click < 100; click++) assert.equal(buildContext().simMinute, 100);
  assert.equal(searches, 0);
  const shipyardContext = buildContext();
  assert.equal(shipyardContext.nearestShipyardListing.portId, "basra|iraq");
  assert.equal(shipyardContext.shipyardRumor.portId, "basra|iraq");
  assert.equal(searches, 2, "shipyard and greeting consumers still resolve current stock on demand");
});

test("freshwater checks the ship's actual ocean tile, not the inland river segment's tile", async () => {
  const { shipCanRefillFreshWater } = await import("./freshWaterAccess.js");
  const code = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "shipIsInFreshWater").getText(source);
  const earthById = [{ t: "water" }, { t: "land" }];
  const context = { ship: { tileId: 0, position: [1, 0, 0] }, earthById,
    localLayout: { viewX: 0, viewY: 0 }, chart: {}, freshWaterSurfaceMask: [0, 0],
    SALTWATER_PASSAGE_TILE_IDS: [], freshwaterIceAtWorldTile: () => false,
    shipNavigabilityAtLocalPoint: () => ({ ok: true, kind: "river", riverTileId: 1 }), shipCanRefillFreshWater };
  const canRefill = runInNewContext(`${code}; shipIsInFreshWater`, context);
  assert.equal(canRefill(), false);
  context.ship.tileId = 1;
  assert.equal(canRefill(), true);
});

test("a fatal assault hit keeps the scene active for the whole sink before applying defeat", () => {
  const code = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "updatePortAssault").getText(source);
  let completed = 0;
  const state = { battle: { durationMs: 1000, finalShipHitPoints: 0 }, pausedAtMs: null,
    pausedDurationMs: 0, breakOffPrompt: true, completionApplied: false };
  const context = { portAssaultState: state, menusAreOpen: () => false,
    portAssaultElapsedMs: timeMs => timeMs, capturePortAssaultElapsedMs: (_, timeMs) => timeMs,
    SHIP_SINK_EFFECT_DURATION_MS: 5200,
    completePlayerPortAssault: () => { completed++; } };
  const update = runInNewContext(`${code}; updatePortAssault`, context);
  update(6199);
  assert.equal(completed, 0);
  update(6600);
  update(7000);
  assert.equal(completed, 1);
});
