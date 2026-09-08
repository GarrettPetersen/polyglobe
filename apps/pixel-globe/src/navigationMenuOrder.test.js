import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "navigationMenuEntries");

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
    activeRescuedTravelerDestinations: () => [], activeColonizationObjective: () => null,
    currentReadyFetchQuestDestinations: () => [], activeCampaignGoalDestinations: () => [],
    activeNaturalistReportDestination: () => null, cityLabelText: city => city.city,
    placedCityTargetVector: () => [1, 0, 0], navigationQuestReason: () => "DELIVER",
    QUEST_NAVIGATION_STYLE: {}, OPTIONAL_NAVIGATION_STYLE: {},
    portWaypointDestination: () => destination, portNavigationReasonLabel: () => "PRICE TIP",
    shipyardDividendNavigationEntries: () => [{ id: "dividend-a" }, { id: "dividend-b" }]
  };
  const entries = runInNewContext(`${declaration.getText(source)}; navigationMenuEntries()`, context);
  assert.deepEqual(Array.from(entries, entry => entry.id), ["quest:delivery:london|united kingdom", "price-tip", "dividend-a", "dividend-b"]);
});
