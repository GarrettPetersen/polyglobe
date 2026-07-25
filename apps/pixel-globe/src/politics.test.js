import assert from "node:assert/strict";
import test from "node:test";

import { FACTIONS, NEUTRAL_FACTION_ID } from "./factions.js";
import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  adjustFactionReputation,
  createGameState,
  diplomacyBetweenForState,
  grantLetterOfMarque,
  visitPort,
  recordPiracyAgainstFaction,
  recordTradeWithFaction
} from "./gameState.js";
import { makeDiplomaticPeace } from "./worldDiplomacy.js";
import {
  SPANISH_INDIES_TRADE_POLICY_ID,
  grantPersonalTradePass
} from "./sovereignTradeAccess.js";
import {
  createPoliticsView,
  playerStandingForReputation,
  politicalPowers,
  politicsDependencyGlyph,
  politicsPowerLabel,
  politicsRowsPage,
  politicsTradeCode
} from "./politics.js";

const PLAYER = {
  name: "Joan Alden",
  nationalityId: "england",
  expressions: ["neutral", "happy"]
};

test("politics view covers every non-neutral power including pirates", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const expectedIds = FACTIONS
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID)
    .map((faction) => faction.id);

  assert.deepEqual(view.powers.map((faction) => faction.id), expectedIds);
  assert.equal(view.rows.length, expectedIds.length);
  assert.ok(view.rows.every((row) => row.stances.length === expectedIds.length));
});

test("collapsed empires leave the active politics matrix", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.conquest.collapsedFactionIds.push("france");
  const view = createPoliticsView(state);
  assert.equal(view.powers.some((faction) => faction.id === "france"), false);
  assert.equal(view.rows.some((row) => row.faction.id === "france"), false);
  assert.ok(view.rows.every((row) => row.stances.every((stance) => stance.factionId !== "france")));
});

test("politics matrix reports diplomacy and player standing", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  recordTradeWithFaction(state, "england");
  recordPiracyAgainstFaction(state, "france");
  const view = createPoliticsView(state);
  const england = view.rows.find((row) => row.faction.id === "england");
  const france = view.rows.find((row) => row.faction.id === "france");
  const pirate = view.rows.find((row) => row.faction.id === "pirate");

  assert.equal(england.stances.find((stance) => stance.factionId === "france").relation, "war");
  assert.equal(england.player.label, "Warm");
  assert.equal(france.player.label, "Angry");
  assert.equal(pirate.player.label, "Hostile");
});

test("politics keeps vassal status visibly separate from diplomatic stance", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const hormuz = view.rows.find((row) => row.faction.id === "hormuz");
  assert.equal(hormuz.faction.suzerainFactionId, "portugal");
  assert.equal(politicsPowerLabel(hormuz.faction, view.powers), "HORMUZ >PO");
  assert.equal(
    hormuz.stances.find((stance) => stance.factionId === "portugal").relation,
    "friendly"
  );
});

test("the Habsburg personal union is not presented as Spanish vassalage", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const spain = view.rows.find((row) => row.faction.id === "spain");
  const habsburg = view.rows.find((row) => row.faction.id === "habsburg");
  assert.equal(politicsPowerLabel(spain.faction, view.powers), "SPAIN =HB");
  assert.equal(habsburg.faction.vassalFactionIds.includes("spain"), false);
});

test("the politics chart distinguishes tributaries from vassals and unions", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const joseon = view.rows.find((row) => row.faction.id === "joseon");

  assert.equal(politicsPowerLabel(joseon.faction, view.powers), "JOSEON ~MI");
  assert.equal(politicsDependencyGlyph("vassal"), ">");
  assert.equal(politicsDependencyGlyph("tributary"), "~");
  assert.equal(politicsDependencyGlyph("personal-union"), "=");
});

test("politics trade codes expose duties and protected-market access", () => {
  const habsburgState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "habsburg" }
  });
  const habsburgView = createPoliticsView(habsburgState);
  const spain = habsburgView.rows.find((row) => row.faction.id === "spain");
  assert.equal(spain.player.trade.dutyPercent, 2);
  assert.equal(spain.player.trade.access, "closed");
  assert.equal(politicsTradeCode(spain.player.trade), "2%X");
  grantPersonalTradePass(
    habsburgState.relations.personalTradePasses,
    SPANISH_INDIES_TRADE_POLICY_ID,
    0
  );
  const licensedSpain = createPoliticsView(habsburgState).rows
    .find((row) => row.faction.id === "spain");
  assert.equal(licensedSpain.player.trade.access, "pass");
  assert.equal(politicsTradeCode(licensedSpain.player.trade), "2%P");

  const portugalState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "portugal" }
  });
  const portugalView = createPoliticsView(portugalState);
  const hormuz = portugalView.rows.find((row) => row.faction.id === "hormuz");
  assert.equal(hormuz.player.trade.dutyPercent, 2);
  assert.equal(hormuz.player.trade.access, "ordinary");
  assert.equal(politicsTradeCode(hormuz.player.trade), "2%");

  const joseonState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "joseon" }
  });
  const joseonView = createPoliticsView(joseonState);
  const ming = joseonView.rows.find((row) => row.faction.id === "ming");
  assert.equal(ming.player.trade.dutyPercent, 2);
  assert.equal(ming.player.trade.access, "open");
  assert.equal(politicsTradeCode(ming.player.trade), "2%O");
});

test("politics matrix follows changing world diplomacy", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  makeDiplomaticPeace(state.relations.diplomacy, "england", "france", 200 * 24 * 60);
  const view = createPoliticsView(state);
  const england = view.rows.find((row) => row.faction.id === "england");

  assert.equal(diplomacyBetweenForState(state, "england", "france"), "hostile");
  assert.equal(england.stances.find((stance) => stance.factionId === "france").relation, "hostile");
  assert.equal(view.recentEvents[0].kind, "peace");
});

test("politics distinguishes contacted neutral powers from powers with no interaction", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const venice = { tileId: 9, city: "Venice", country: "Italy", factionId: "venice" };
  visitPort(state, venice, 100);
  const view = createPoliticsView(state);
  const england = view.rows.find((row) => row.faction.id === "england");

  assert.equal(england.stances.find((stance) => stance.factionId === "venice").contact.portCalls, 1);
  assert.equal(england.stances.find((stance) => stance.factionId === "inca").contact, null);
});

test("politics view marks factions that granted letters of marque", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const london = {
    tileId: 1,
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england"
  };
  adjustFactionReputation(state, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  grantLetterOfMarque(state, london, LETTER_OF_MARQUE_POWER_REQUIRED);
  const view = createPoliticsView(state);

  assert.equal(view.rows.find((row) => row.faction.id === "england").player.hasLetterOfMarque, true);
  assert.equal(view.rows.find((row) => row.faction.id === "france").player.hasLetterOfMarque, false);
});

test("politics rows stop at the last page", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const first = politicsRowsPage(view, 0, 12);
  const last = politicsRowsPage(view, first.pageCount, 12);

  assert.equal(first.rows.length, 12);
  assert.equal(last.page, first.pageCount - 1);
});

test("political power codes are compact for matrix headers", () => {
  assert.ok(politicalPowers().every((faction) => faction.code.length <= 2));
  assert.equal(politicalPowers().find((faction) => faction.id === "pirate").code, "PX");
});

test("player standing labels summarize reputation ranges", () => {
  assert.equal(playerStandingForReputation(0).label, "Neutral");
  assert.equal(playerStandingForReputation(8).label, "Warm");
  assert.equal(playerStandingForReputation(-8).label, "Cold");
  assert.equal(playerStandingForReputation(-100).label, "Hostile");
});
