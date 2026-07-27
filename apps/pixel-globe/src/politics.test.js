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
  politicsTradeCode
} from "./politics.js";

const PLAYER = {
  name: "Joan Alden",
  nationalityId: "england",
  expressions: ["neutral", "happy"]
};

test("politics cards cover every non-neutral power including pirates", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const expectedIds = FACTIONS
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID)
    .map((faction) => faction.id);

  assert.deepEqual(view.powers.map((faction) => faction.id), expectedIds);
  assert.equal(view.cards.length, expectedIds.length);
  assert.equal(view.cards[0].faction.id, PLAYER.nationalityId);
  assert.equal(view.cards.at(-1).faction.id, "pirate");
});

test("collapsed empires leave the active politics cards", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.conquest.collapsedFactionIds.push("france");
  const view = createPoliticsView(state);
  assert.equal(view.powers.some((faction) => faction.id === "france"), false);
  assert.equal(view.cards.some((card) => card.faction.id === "france"), false);
  assert.ok(view.cards.every((card) =>
    card.dependencies.every((dependency) => dependency.factionId !== "france") &&
    card.relationships.every((group) => !group.factionIds.includes("france"))
  ));
});

test("politics cards report meaningful diplomacy and player standing", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  recordTradeWithFaction(state, "england");
  recordPiracyAgainstFaction(state, "france");
  const view = createPoliticsView(state);
  const england = politicsCard(view, "england");
  const france = politicsCard(view, "france");
  const pirate = politicsCard(view, "pirate");

  assert.ok(relationshipFactionIds(england, "war").includes("france"));
  assert.equal(england.player.label, "Warm");
  assert.equal(france.player.label, "Hostile");
  assert.equal(pirate.player.label, "Hostile");
});

test("politics keeps vassal status visibly separate from diplomatic stance", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const hormuz = politicsCard(view, "hormuz");
  assert.deepEqual(hormuz.dependencies, [{
    kind: "vassal",
    role: "subject",
    factionId: "portugal"
  }]);
  assert.equal(relationshipFactionIds(hormuz, "friendly").includes("portugal"), false);
});

test("the Habsburg personal union is not presented as Spanish vassalage", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const spain = politicsCard(view, "spain");
  const habsburg = politicsCard(view, "habsburg");
  assert.deepEqual(spain.dependencies, [{
    kind: "personal-union",
    role: "member",
    factionId: "habsburg"
  }]);
  assert.deepEqual(habsburg.dependencies, [{
    kind: "personal-union",
    role: "member",
    factionId: "spain"
  }]);
});

test("the politics cards distinguish tributaries from vassals and unions", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const joseon = politicsCard(view, "joseon");
  const ming = politicsCard(view, "ming");
  assert.deepEqual(joseon.dependencies, [{
    kind: "tributary",
    role: "subject",
    factionId: "ming"
  }]);
  assert.deepEqual(ming.dependencies, [{
    kind: "tributary",
    role: "suzerain",
    factionId: "joseon"
  }]);
});

test("politics trade codes expose duties and protected-market access", () => {
  const habsburgState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "habsburg" }
  });
  const habsburgView = createPoliticsView(habsburgState);
  const spain = politicsCard(habsburgView, "spain");
  assert.equal(spain.player.trade.dutyPercent, 2);
  assert.equal(spain.player.trade.access, "closed");
  assert.equal(politicsTradeCode(spain.player.trade), "2%X");
  grantPersonalTradePass(
    habsburgState.relations.personalTradePasses,
    SPANISH_INDIES_TRADE_POLICY_ID,
    0
  );
  const licensedSpain = politicsCard(createPoliticsView(habsburgState), "spain");
  assert.equal(licensedSpain.player.trade.access, "pass");
  assert.equal(politicsTradeCode(licensedSpain.player.trade), "2%P");

  const portugalState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "portugal" }
  });
  const portugalView = createPoliticsView(portugalState);
  const hormuz = politicsCard(portugalView, "hormuz");
  assert.equal(hormuz.player.trade.dutyPercent, 2);
  assert.equal(hormuz.player.trade.access, "ordinary");
  assert.equal(politicsTradeCode(hormuz.player.trade), "2%");

  const joseonState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "joseon" }
  });
  const joseonView = createPoliticsView(joseonState);
  const ming = politicsCard(joseonView, "ming");
  assert.equal(ming.player.trade.dutyPercent, 2);
  assert.equal(ming.player.trade.access, "open");
  assert.equal(politicsTradeCode(ming.player.trade), "2%O");
});

test("politics cards follow changing world diplomacy", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  makeDiplomaticPeace(state.relations.diplomacy, "england", "france", 200 * 24 * 60);
  const view = createPoliticsView(state);
  const england = politicsCard(view, "england");

  assert.equal(diplomacyBetweenForState(state, "england", "france"), "hostile");
  assert.ok(relationshipFactionIds(england, "hostile").includes("france"));
  assert.equal(view.recentEvents[0].kind, "peace");
});

test("politics cards omit neutral relationships even after contact", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const venice = { tileId: 9, city: "Venice", country: "Italy", factionId: "venice" };
  visitPort(state, venice, 100);
  const view = createPoliticsView(state);
  const england = politicsCard(view, "england");

  assert.ok(england.relationships.every((group) => !group.factionIds.includes("venice")));
  assert.ok(england.relationships.every((group) => !group.factionIds.includes("inca")));
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

  assert.equal(politicsCard(view, "england").player.hasLetterOfMarque, true);
  assert.equal(politicsCard(view, "france").player.hasLetterOfMarque, false);
});

test("political power codes are compact for card relationship tokens", () => {
  assert.ok(politicalPowers().every((faction) => faction.code.length <= 2));
  assert.equal(politicalPowers().find((faction) => faction.id === "pirate").code, "PX");
});

test("player standing labels summarize reputation ranges", () => {
  assert.equal(playerStandingForReputation(0).label, "Neutral");
  assert.equal(playerStandingForReputation(8).label, "Warm");
  assert.equal(playerStandingForReputation(-8).label, "Cold");
  assert.equal(playerStandingForReputation(-100).label, "Hostile");
});

function politicsCard(view, factionId) {
  const card = view.cards.find((entry) => entry.faction.id === factionId);
  if (!card) throw new Error(`Missing politics card for ${factionId}`);
  return card;
}

function relationshipFactionIds(card, relation) {
  return card.relationships.find((group) => group.relation === relation)?.factionIds || [];
}
