import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

import { createWorldEconomy } from "./economy.js";
import {
  createPortDialogueSession,
  portDialogueView,
  selectPortDialogueOption
} from "./dialogueSystem.js";
import {
  TRADE_EMBARGO_WARNING_COOLDOWN_DAYS,
  acknowledgePlayerTradeEmbargoWarnings,
  buyGood,
  createGameState,
  playerFactionAttacksOnSight,
  playerTradeEmbargoPurchaseWarnings
} from "./gameState.js";
import { adjustDiplomaticStance } from "./worldDiplomacy.js";

const MINUTES_PER_DAY = 24 * 60;
const mainSource = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const navigationStart = mainSource.indexOf("function updateDialogueNavigationPosition(");
assert.ok(navigationStart >= 0);
const navigationRuntime = {};
runInNewContext(mainSource.slice(navigationStart, mainSource.indexOf("\nfunction ", navigationStart)), navigationRuntime);
const updateNavigation = navigationRuntime.updateDialogueNavigationPosition;
const PLAYER = Object.freeze({
  id: "embargo-warning-captain",
  name: "Joan Alden",
  nationalityId: "england",
  homePortCityId: "london|united kingdom",
  homePortTileId: 1,
  homePortName: "London",
  expressions: ["neutral", "happy"]
});
const LONDON = Object.freeze({
  cityId: "london|united kingdom",
  portId: "city-1",
  tileId: 1,
  city: "London",
  displayCity: "London",
  country: "United Kingdom",
  factionId: "england",
  cityType: "northern-european",
  population: 80000,
  character: Object.freeze({ name: "Thomas Smythe", role: "merchant", expressions: ["neutral"] })
});

test("embargo warnings are suppressed when every enforcer already attacks on sight", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });

  assert.equal(playerFactionAttacksOnSight(state, "france"), true);
  assert.deepEqual(playerTradeEmbargoPurchaseWarnings(state, LONDON, "timber", 0), []);
});

test("acknowledged embargo issuers stay quiet for two in-game months", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  adjustDiplomaticStance(state.relations.diplomacy, "england", "france", "improve", 1);
  const acknowledgedMinute = 10;
  const warnings = playerTradeEmbargoPurchaseWarnings(state, LONDON, "timber", acknowledgedMinute);

  assert.deepEqual(warnings.map((order) => order.issuerFactionId), ["france"]);
  assert.deepEqual(
    acknowledgePlayerTradeEmbargoWarnings(state, warnings, acknowledgedMinute),
    ["france"]
  );
  const cooldownMinutes = TRADE_EMBARGO_WARNING_COOLDOWN_DAYS * MINUTES_PER_DAY;
  assert.deepEqual(
    playerTradeEmbargoPurchaseWarnings(
      state,
      LONDON,
      "timber",
      acknowledgedMinute + cooldownMinutes - 1
    ),
    []
  );
  assert.deepEqual(
    playerTradeEmbargoPurchaseWarnings(
      state,
      LONDON,
      "timber",
      acknowledgedMinute + cooldownMinutes
    ).map((order) => order.issuerFactionId),
    ["france"]
  );
});

test("suppressed warnings do not suppress embargo cargo tracking", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  state.doubloons = 10000;

  assert.deepEqual(playerTradeEmbargoPurchaseWarnings(state, LONDON, "timber", 0), []);
  const purchase = buyGood(state, economy, LONDON, "timber", 1, { simMinute: 0 });

  assert.deepEqual(purchase.embargoOrders.map((order) => order.issuerFactionId), ["france"]);
  assert.equal(state.memory.tradeEmbargoEnforcement.incidents.length, 1);
  assert.equal(state.memory.tradeEmbargoEnforcement.incidents[0].orderId, "embargo-1");
});

test("proceeding through the embargo modal records the issuer cooldown", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const simMinute = 10;
  state.doubloons = 10000;
  adjustDiplomaticStance(state.relations.diplomacy, "england", "france", "improve", 1);
  const session = createPortDialogueSession(LONDON, {
    initialNodeId: "market",
    marketMode: "buy",
    admittedToPort: true
  });
  const context = { simMinute };
  const market = portDialogueView(session, LONDON, state, economy, [LONDON], context);
  const timberIndex = market.options.findIndex((entry) => (
    entry.action.type === "buy" && entry.action.goodId === "timber"
  ));
  assert.notEqual(timberIndex, -1);

  selectPortDialogueOption(
    session,
    LONDON,
    state,
    economy,
    [LONDON],
    timberIndex,
    context
  );
  assert.equal(session.nodeId, "trade-embargo-warning");
  const warning = portDialogueView(session, LONDON, state, economy, [LONDON], context);
  assert.equal(warning.options[0].label, "Load it");
  const result = selectPortDialogueOption(session, LONDON, state, economy, [LONDON], 0, context);

  assert.equal(result.marketPurchase.good.id, "timber");
  assert.equal(
    state.memory.decisions["trade.embargo-warning-acknowledged.france"],
    simMinute + 1
  );
});

for (const warningChoice of [0, 1]) {
  test(`embargo purchase choice ${warningChoice} restores the selected good and scroll position`, () => {
    const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
    state.doubloons = 10000;
    adjustDiplomaticStance(state.relations.diplomacy, "england", "france", "improve", 1);
    const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
    const session = createPortDialogueSession(LONDON, {
      initialNodeId: "market", marketMode: "buy", admittedToPort: true
    });
    const context = { simMinute: 10 };
    const view = portDialogueView(session, LONDON, state, economy, [LONDON], context);
    const index = view.options.findIndex(({ action }) => action.type === "buy" && action.goodId === "timber");
    assert.ok(index > 0);
    const layout = { scrollOffset: Math.max(1, index - 2), marketReturnPosition: null };
    const origin = { nodeId: session.nodeId, marketMode: session.marketMode,
      selectedIndex: index, scrollOffset: layout.scrollOffset };
    selectPortDialogueOption(session, LONDON, state, economy, [LONDON], index, context);
    updateNavigation(session, layout, origin);
    assert.equal(layout.scrollOffset, 0, "warning starts at its own first option");
    const warning = { nodeId: session.nodeId, marketMode: session.marketMode,
      selectedIndex: warningChoice, scrollOffset: 0 };
    selectPortDialogueOption(session, LONDON, state, economy, [LONDON], warningChoice, context);
    updateNavigation(session, layout, warning);
    assert.equal(session.nodeId, "market");
    assert.equal(layout.scrollOffset, origin.scrollOffset);
    assert.equal(session.selectedIndex, index);
    assert.equal(layout.marketReturnPosition, null);
  });
}

test("chained sale warnings preserve position but ordinary navigation clears it", () => {
  const origin = { nodeId: "market", marketMode: "sell", selectedIndex: 12, scrollOffset: 8 };
  const session = { kind: "port", nodeId: "trade-embargo-sale-warning", marketMode: "sell", selectedIndex: 0 };
  const layout = { scrollOffset: 8, marketReturnPosition: null };
  updateNavigation(session, layout, origin);
  session.nodeId = "quest-cargo-sale-warning";
  updateNavigation(session, layout, { ...origin, nodeId: "trade-embargo-sale-warning", selectedIndex: 0, scrollOffset: 0 });
  session.nodeId = "market";
  updateNavigation(session, layout, { ...origin, nodeId: "quest-cargo-sale-warning", selectedIndex: 0, scrollOffset: 0 });
  assert.equal(layout.scrollOffset, 8);
  assert.equal(session.selectedIndex, 12);
  session.nodeId = "trade-embargo-sale-warning";
  updateNavigation(session, layout, origin);
  session.nodeId = "root";
  updateNavigation(session, layout, { ...origin, nodeId: "trade-embargo-sale-warning" });
  assert.equal(layout.scrollOffset, 0);
  assert.equal(layout.marketReturnPosition, null);
});
