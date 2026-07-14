import assert from "node:assert/strict";
import test from "node:test";

import {
  MING_ILLICIT_MARKET_SUCCESS_CHANCE,
  MING_TRADE_RESTRICTION_END_MINUTE,
  mingTradeAccess,
  resolveMingIllicitMarketAttempt
} from "./mingTradeRestrictions.js";
import { createWorldEconomy, portMarket } from "./economy.js";
import {
  buyGood,
  createGameState,
  mingTradeOpenToFaction,
  openMingTradeToFaction,
  sellGood
} from "./gameState.js";

const GUANGZHOU = Object.freeze({
  tileId: 8,
  city: "Guangzhou",
  displayCity: "Guangzhou",
  country: "China",
  cityType: "east-asian",
  factionId: "ming",
  population: 120000
});

test("Ming trade restrictions admit domestic and Joseon tribute traffic", () => {
  for (const traderFactionId of ["ming", "joseon"]) {
    const access = mingTradeAccess({
      portFactionId: "ming",
      traderFactionId,
      simMinute: 0,
      openTrade: traderFactionId === "joseon"
    });
    assert.equal(access.allowed, true);
    assert.equal(access.lawful, true);
    assert.equal(access.lawfulExemption, true);
  }
});

test("foreign trade at Ming ports requires illicit access until 1567", () => {
  const blocked = mingTradeAccess({
    portFactionId: "ming",
    traderFactionId: "england",
    simMinute: MING_TRADE_RESTRICTION_END_MINUTE - 1
  });
  assert.equal(blocked.restricted, true);
  assert.equal(blocked.allowed, false);

  const diplomaticallyOpened = mingTradeAccess({
    portFactionId: "ming",
    traderFactionId: "england",
    simMinute: MING_TRADE_RESTRICTION_END_MINUTE - 1,
    openTrade: true
  });
  assert.equal(diplomaticallyOpened.allowed, true);
  assert.equal(diplomaticallyOpened.lawful, true);

  const illicit = mingTradeAccess({
    portFactionId: "ming",
    traderFactionId: "england",
    simMinute: MING_TRADE_RESTRICTION_END_MINUTE - 1,
    illicitAccess: true
  });
  assert.equal(illicit.allowed, true);
  assert.equal(illicit.lawful, false);
  assert.equal(illicit.illicit, true);

  const opened = mingTradeAccess({
    portFactionId: "ming",
    traderFactionId: "england",
    simMinute: MING_TRADE_RESTRICTION_END_MINUTE
  });
  assert.equal(opened.restricted, false);
  assert.equal(opened.allowed, true);
  assert.equal(opened.lawful, true);
});

test("Ming illicit market attempts use a strict validated probability", () => {
  assert.equal(resolveMingIllicitMarketAttempt(MING_ILLICIT_MARKET_SUCCESS_CHANCE - 0.001), true);
  assert.equal(resolveMingIllicitMarketAttempt(MING_ILLICIT_MARKET_SUCCESS_CHANCE), false);
  assert.throws(() => resolveMingIllicitMarketAttempt(1), /Invalid Ming illicit market roll/);
});

test("player commodity transactions cannot bypass Ming trade access", () => {
  const playerCharacter = {
    name: "Joan Alden",
    nationalityId: "england",
    expressions: ["neutral", "happy"]
  };
  const state = createGameState({ cargoCapacity: 20, playerCharacter });
  const economy = createWorldEconomy({ ports: [GUANGZHOU], startMinute: 0 });
  const row = portMarket(economy, GUANGZHOU).find((entry) => (
    entry.listedForSale && entry.stock > 0 && entry.good.sellable !== false && entry.buyPrice <= state.doubloons
  ));
  assert.ok(row, "Guangzhou should have an affordable trade good for the access test");

  assert.throws(
    () => buyGood(state, economy, GUANGZHOU, row.good.id, 1, { simMinute: 0 }),
    /closed to foreign trade/
  );
  buyGood(state, economy, GUANGZHOU, row.good.id, 1, {
    simMinute: 0,
    mingIllicitTradeAccess: true
  });
  sellGood(state, economy, GUANGZHOU, row.good.id, 1, {
    simMinute: 0,
    mingIllicitTradeAccess: true
  });
  assert.equal(mingTradeOpenToFaction(state, "joseon"), true);
  assert.equal(openMingTradeToFaction(state, "england"), true);
  assert.equal(mingTradeOpenToFaction(state, "england"), true);
  buyGood(state, economy, GUANGZHOU, row.good.id, 1, { simMinute: 0 });
  assert.equal(state.cargo[row.good.id], 1);
  sellGood(state, economy, GUANGZHOU, row.good.id, 1, { simMinute: 0 });
  assert.equal(state.cargo[row.good.id], undefined);
});
