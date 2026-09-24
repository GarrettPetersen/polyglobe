import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "navigationMenuEntries");
const targetDeclaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "questNavigationTarget");

test("waypoints list quests and price tips before shipyard dividends", () => {
  const destination = { cityId: "london|united kingdom", city: "London", tileId: 1 };
  const context = {
    gameState: { memory: { quests: { sovereignWarLoan: { contract: null }, hospitallerMalta: null },
      shipyardInvestment: { project: null }, navigation: { optionalWaypoints: [{ id: "price-tip", destinationName: "London", reason: "price" }] } },
      relations: { papacy: {} } },
    SOVEREIGN_WAR_LOAN_REPAYMENT_READY: "ready", SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY: "renegotiate",
    PAPAL_MATTER_COMMISSIONED: "commissioned", papalPendingMatter: () => null,
    hospitallerMaltaQuestObjective: () => null, activeConquistadorDestination: () => null,
    activeQuestDestinations: () => [{ quest: { id: "delivery" }, destination }],
    isWokouHuntQuest: () => false,
    activeRescuedTravelerDestinations: () => [], activeColonizationObjectives: () => [],
    currentReadyFetchQuestDestinations: () => [], activeCampaignGoalDestinations: () => [],
    activeNaturalistReportDestination: () => null, cityLabelText: city => city.city,
    placedCityTargetVector: () => [1, 0, 0], navigationQuestReason: () => "DELIVER",
    QUEST_NAVIGATION_STYLE: {}, OPTIONAL_NAVIGATION_STYLE: {},
    fishingTradeTutorialNavigationEntry: () => null,
    portWaypointDestination: () => destination, portNavigationReasonLabel: () => "PRICE TIP",
    pirateHavenNavigationEntries: () => [{ id: "pirate-quest" }],
    shipyardDividendNavigationEntries: () => [{ id: "dividend-a" }, { id: "dividend-b" }]
  };
  const entries = runInNewContext(`${targetDeclaration.getText(source)}\n${declaration.getText(source)}; navigationMenuEntries()`, context);
  assert.deepEqual(Array.from(entries, entry => entry.id), ["quest:delivery:london|united kingdom", "price-tip", "pirate-quest", "dividend-a", "dividend-b"]);
});

test("each simultaneous colony objective draws its own blue waypoint", () => {
  const objectives = [{ kind: "investigate-lost-colony", tileId: 20 }, { kind: "found-colony", tileId: 30 }];
  const sites = new Map([[20, { cityId: "roanoke|united states of america", city: "Roanoke" }],
    [30, { cityId: "salvador|brazil", city: "Salvador" }]]);
  const draws = [];
  const style = {};
  const context = { ship: {}, chart: {}, localLayout: {}, gameState: {},
    activeColonizationObjectives: () => objectives,
    colonizationObjectiveDestination: (_state, objective) => sites.get(objective.tileId),
    tileCenterVector: tileId => [tileId, 0, 0], visibleChartCity: () => null,
    localPointForGlobeVector: vector => vector, cityLabelText: city => city.city,
    drawWorldTargetArrow: arrow => draws.push(arrow), QUEST_ARROW_CITY_Y_OFFSET: 0,
    COLONIZATION_NAVIGATION_STYLE: style };
  const drawDeclaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "drawColonizationDestinationArrow");
  runInNewContext(`${drawDeclaration.getText(source)}; drawColonizationDestinationArrow(1);`, context);
  assert.deepEqual(draws.map(({ label }) => label), ["Roanoke", "Salvador"]);
  assert.equal(new Set(draws.map(({ id }) => id)).size, 2);
  assert.ok(draws.every(arrow => arrow.style === style));
});
