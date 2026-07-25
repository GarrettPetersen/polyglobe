import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy, portMarket } from "./economy.js";
import {
  buyGood,
  createGameState,
  openSovereignTradeToFaction,
  playerTradeAccess,
  sellGood,
  sovereignTradeOpenToFaction
} from "./gameState.js";
import {
  JOSEON_TRADE_POLICY_ID,
  MING_TRADE_POLICY_ID,
  MING_TRADE_RESTRICTION_END_MINUTE,
  SPANISH_INDIES_TRADE_POLICY_ID,
  createPersonalTradePassMemory,
  createSovereignTradeGrantMemory,
  evaluateSovereignTradeAccess,
  grantPersonalTradePass,
  personalTradePassGranted,
  resolveSovereignIllicitMarketAttempt,
  sovereignTradeGrantedToFaction,
  sovereignTradePolicyForPort
} from "./sovereignTradeAccess.js";

const GUANGZHOU = port(8, "Guangzhou", "China", "ming");
const SEOUL = port(9, "Seoul", "South Korea", "joseon");
const KYOTO = port(10, "Kyoto", "Japan", "japan");
const SEVILLE = port(11, "Seville", "Spain", "spain");
const HAVANA = port(12, "Havana", "Cuba", "spain");
const ISTANBUL = port(14, "Istanbul", "Turkey", "ottoman");
const LISBON = port(15, "Lisbon", "Portugal", "portugal");
const CONQUERED_BRAZILIAN_COLONY = Object.freeze({
  ...port(13, "Porto Seguro", "Brazil", "spain"),
  lat: -16.44,
  lon: -39.08
});

test("sovereign policies distinguish Ming, controlled Joseon trade, open Japan, and the Spanish Indies", () => {
  assert.equal(sovereignTradePolicyForPort(GUANGZHOU, 0)?.id, MING_TRADE_POLICY_ID);
  assert.equal(sovereignTradePolicyForPort(SEOUL, 0)?.id, JOSEON_TRADE_POLICY_ID);
  assert.equal(sovereignTradePolicyForPort(KYOTO, 0), null);
  assert.equal(sovereignTradePolicyForPort(ISTANBUL, 0), null);
  assert.equal(sovereignTradePolicyForPort(SEVILLE, 0), null);
  assert.equal(sovereignTradePolicyForPort(HAVANA, 0)?.id, SPANISH_INDIES_TRADE_POLICY_ID);
  assert.equal(
    sovereignTradePolicyForPort(CONQUERED_BRAZILIAN_COLONY, 0)?.id,
    SPANISH_INDIES_TRADE_POLICY_ID
  );
});

test("the Indies monopoly follows Spanish conquest rather than a fixed colonial roster", () => {
  const independentColony = {
    ...CONQUERED_BRAZILIAN_COLONY,
    factionId: "portugal"
  };
  assert.equal(sovereignTradePolicyForPort(independentColony, 0), null);
  assert.equal(
    sovereignTradePolicyForPort({ ...independentColony, factionId: "spain" }, 0)?.id,
    SPANISH_INDIES_TRADE_POLICY_ID
  );
});

test("default permissions preserve tribute and licensed regional traffic", () => {
  const grants = createSovereignTradeGrantMemory();
  assert.equal(sovereignTradeGrantedToFaction(grants, MING_TRADE_POLICY_ID, "joseon"), true);
  assert.equal(sovereignTradeGrantedToFaction(grants, MING_TRADE_POLICY_ID, "england"), false);
  assert.equal(sovereignTradeGrantedToFaction(grants, JOSEON_TRADE_POLICY_ID, "ming"), true);
  assert.equal(sovereignTradeGrantedToFaction(grants, JOSEON_TRADE_POLICY_ID, "japan"), true);
  assert.equal(sovereignTradeGrantedToFaction(grants, JOSEON_TRADE_POLICY_ID, "england"), false);
  assert.equal(sovereignTradeGrantedToFaction(grants, SPANISH_INDIES_TRADE_POLICY_ID, "spain"), true);
  assert.equal(sovereignTradeGrantedToFaction(grants, SPANISH_INDIES_TRADE_POLICY_ID, "portugal"), false);
});

test("personal trade passes are named policy papers rather than national treaties", () => {
  const passes = createPersonalTradePassMemory();

  assert.equal(personalTradePassGranted(passes, MING_TRADE_POLICY_ID), false);
  assert.equal(grantPersonalTradePass(passes, MING_TRADE_POLICY_ID, 720), true);
  assert.equal(grantPersonalTradePass(passes, MING_TRADE_POLICY_ID, 900), false);
  assert.equal(personalTradePassGranted(passes, MING_TRADE_POLICY_ID), true);
  assert.deepEqual(passes[MING_TRADE_POLICY_ID], {
    policyId: MING_TRADE_POLICY_ID,
    issuerFactionId: "ming",
    simMinute: 720
  });
});

test("a closed commercial market still permits basic provisioning", () => {
  const blocked = evaluateSovereignTradeAccess({
    port: SEOUL,
    traderFactionId: "england",
    simMinute: 0
  });
  assert.equal(blocked.restricted, true);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.provisioningAllowed, true);
});

test("Ming restrictions expire while policy grants and illicit access work generically", () => {
  const before = evaluateSovereignTradeAccess({
    port: GUANGZHOU,
    traderFactionId: "england",
    simMinute: MING_TRADE_RESTRICTION_END_MINUTE - 1
  });
  assert.equal(before.allowed, false);

  const granted = evaluateSovereignTradeAccess({
    port: GUANGZHOU,
    traderFactionId: "england",
    simMinute: 0,
    granted: true
  });
  assert.equal(granted.allowed, true);
  assert.equal(granted.lawful, true);

  const illicit = evaluateSovereignTradeAccess({
    port: GUANGZHOU,
    traderFactionId: "england",
    simMinute: 0,
    illicitAccessPolicyId: MING_TRADE_POLICY_ID
  });
  assert.equal(illicit.allowed, true);
  assert.equal(illicit.illicit, true);

  assert.equal(sovereignTradePolicyForPort(GUANGZHOU, MING_TRADE_RESTRICTION_END_MINUTE), null);
  assert.equal(resolveSovereignIllicitMarketAttempt(MING_TRADE_POLICY_ID, 0.549), true);
  assert.equal(resolveSovereignIllicitMarketAttempt(MING_TRADE_POLICY_ID, 0.55), false);
});

test("player commodity transactions cannot bypass sovereign trade access", () => {
  const playerCharacter = {
    name: "Joan Alden",
    nationalityId: "england",
    expressions: ["neutral", "happy"]
  };
  const state = createGameState({ cargoCapacity: 20, playerCharacter });
  const economy = createWorldEconomy({ ports: [GUANGZHOU], startMinute: 0 });
  const row = portMarket(economy, GUANGZHOU).find((entry) => (
    entry.listedForSale && entry.stock > 0 && entry.good.sellable !== false &&
    entry.buyPrice <= state.doubloons
  ));
  assert.ok(row);

  assert.throws(
    () => buyGood(state, economy, GUANGZHOU, row.good.id, 1, { simMinute: 0 }),
    /closed to foreign trade/
  );
  buyGood(state, economy, GUANGZHOU, row.good.id, 1, {
    simMinute: 0,
    illicitTradeAccessPolicyId: MING_TRADE_POLICY_ID
  });
  sellGood(state, economy, GUANGZHOU, row.good.id, 1, {
    simMinute: 0,
    illicitTradeAccessPolicyId: MING_TRADE_POLICY_ID
  });
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "england"), false);
  assert.equal(openSovereignTradeToFaction(state, MING_TRADE_POLICY_ID, "england"), true);
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "england"), true);
  assert.equal(playerTradeAccess(state, GUANGZHOU, { simMinute: 0 }).allowed, true);
});

test("wartime entry at an unrestricted port does not invent a sovereign policy", () => {
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Yusuf al-Marrakushi",
      nationalityId: "morocco",
      expressions: ["neutral", "happy"]
    }
  });

  const access = playerTradeAccess(state, LISBON, { simMinute: 0 });
  assert.equal(access.allowed, false);
  assert.equal(access.reason, "war");
  assert.equal(access.policyId, null);
  assert.equal(access.policy, null);
  assert.equal(access.personalTradePass, false);
});

function port(tileId, city, country, factionId) {
  return Object.freeze({
    tileId,
    city,
    displayCity: city,
    country,
    cityType: "east-asian",
    factionId,
    population: 120000
  });
}
