import assert from "node:assert/strict";
import test from "node:test";

import {
  FACTIONS,
  FACTION_CAPITALS_1522,
  NEUTRAL_FACTION_ID,
  factionExistsIn1522
} from "./factions.js";
import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  adjustFactionReputation,
  createGameState,
  diplomacyBetweenForState,
  factionReputation,
  grantLetterOfMarque,
  visitPort,
  recordPiracyAgainstFaction,
  recordTradeWithFaction
} from "./gameState.js";
import {
  PAPAL_ACTION_CRUSADE,
  acceptPapalCommission,
  advancePapalPolitics,
  imposePapalAction,
  revokeActivePapalCommission
} from "./papalPolitics.js";
import { makeDiplomaticPeace } from "./worldDiplomacy.js";
import { recordEnglishReformationAuthority } from "./sovereignAuthority.js";
import { holdImperialElection } from "./imperialConstitution.js";
import {
  expelHostileForeignSettlements,
  withForeignSettlements1522
} from "./foreignSettlements.js";
import { recordPortCapture } from "./portConquest.js";
import {
  SPANISH_INDIES_TRADE_POLICY_ID,
  grantPersonalTradePass
} from "./sovereignTradeAccess.js";
import {
  POLITICS_NEWS_HISTORY_LIMIT,
  createPoliticsView,
  playerStandingForReputation,
  politicalPowers,
  politicsMarqueMarker,
  politicsTradeCode,
  recentPoliticsNews
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
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID && factionExistsIn1522(faction.id))
    .map((faction) => faction.id);

  assert.deepEqual(view.powers.map((faction) => faction.id), expectedIds);
  assert.equal(view.cards.length, expectedIds.length);
  assert.equal(view.cards[0].faction.id, PLAYER.nationalityId);
  assert.equal(view.cards.at(-1).faction.id, "pirate");
});

test("politics replaces the Delhi Sultanate with Mughal rule after Panipat", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.conquest.collapsedFactionIds = state.memory.conquest.collapsedFactionIds
    .filter((factionId) => factionId !== "mughal");
  state.memory.conquest.collapsedFactionIds.push("delhi");
  state.memory.conquest.factionSuccessors.delhi = "mughal";
  state.memory.conquest.factionCapitalOverrides.mughal = "agra";

  const view = createPoliticsView(state);

  assert.equal(view.powers.some((faction) => faction.id === "delhi"), false);
  assert.equal(politicsCard(view, "mughal").capital.city, "Agra");
  assert.equal(politicsCard(view, "mughal").capital.portId, "agra");
});

test("politics cards name each nation's capital while pirates have none", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);

  for (const capital of FACTION_CAPITALS_1522) {
    assert.equal(
      politicsCard(view, capital.factionId).capital.city,
      capital.city,
      `${capital.factionId} politics capital must match its playable map capital`
    );
  }
  assert.equal(politicsCard(view, "nagao").capital.city, "Naoetsu");
  assert.equal(politicsCard(view, "pirate").capital, null);
  assert.equal(politicsCard(view, "japan").authority.sovereign, 22);
  assert.equal(politicsCard(view, "papal-states").authority.papal, 58);
  assert.equal(politicsCard(view, "pirate").authority, null);
});

test("politics cards follow a restored nation's current capital", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const cities = FACTION_CAPITALS_1522.map((capital, index) => ({
    tileId: index + 1,
    city: capital.factionId === "hospitallers" ? "Birgu" : capital.city,
    displayCity: capital.factionId === "hospitallers" ? "Birgu" : capital.city,
    factionId: capital.factionId,
    capitalOfFactionId: capital.factionId
  }));
  const view = createPoliticsView(state, 0, cities);
  const birgu = cities.find((city) => city.factionId === "hospitallers");

  assert.equal(politicsCard(view, "hospitallers").capital.city, "Birgu");
  assert.equal(politicsCard(view, "hospitallers").capital.portId, `city-${birgu.tileId}`);
});

test("collapsed empires leave the active politics cards", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.conquest.collapsedFactionIds.push("france");
  const view = createPoliticsView(state);
  assert.equal(view.powers.some((faction) => faction.id === "france"), false);
  assert.equal(view.cards.some((card) => card.faction.id === "france"), false);
  assert.ok(view.cards.every((card) =>
    card.dependencies.every((dependency) => dependency.factionId !== "france") &&
    card.constitutionalConnections.every((connection) => connection.factionId !== "france") &&
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
  assert.deepEqual(dependencySummaries(hormuz), [{
    kind: "vassal",
    role: "subject",
    factionId: "portugal"
  }]);
  assert.equal(relationshipFactionIds(hormuz, "friendly").includes("portugal"), false);
});

test("the Burgundian personal union is not presented as Spanish vassalage", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const spain = politicsCard(view, "spain");
  const burgundian = politicsCard(view, "burgundian-netherlands");
  assert.deepEqual(dependencySummaries(spain), [{
    kind: "personal-union",
    role: "member",
    factionId: "burgundian-netherlands"
  }]);
  assert.deepEqual(dependencySummaries(burgundian), [{
    kind: "personal-union",
    role: "member",
    factionId: "spain"
  }]);
  assert.deepEqual(dependencySummaries(politicsCard(view, "habsburg")), []);
});

test("Imperial Estates show a constitutional connection to the elected Emperor", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  let view = createPoliticsView(state);

  assert.deepEqual(politicsCard(view, "augsburg").constitutionalConnections, [{
    kind: "imperial-constitution",
    role: "estate",
    factionId: "burgundian-netherlands"
  }]);
  assert.ok(politicsCard(view, "burgundian-netherlands").constitutionalConnections.some((connection) => (
    connection.role === "emperor" && connection.factionId === "augsburg"
  )));
  assert.equal(politicsCard(view, "augsburg").dependencies.length, 0);

  for (const elector of Object.values(state.relations.imperial.electors)) {
    elector.supportByCandidateId.france = 100;
  }
  holdImperialElection(state.relations.imperial, {
    candidateFactionIds: ["habsburg", "france"],
    simMinute: 10,
    source: "test"
  });
  view = createPoliticsView(state, 10);

  assert.deepEqual(politicsCard(view, "augsburg").constitutionalConnections, [{
    kind: "imperial-constitution",
    role: "estate",
    factionId: "france"
  }]);
  assert.ok(politicsCard(view, "france").constitutionalConnections.some((connection) => (
    connection.role === "emperor" && connection.factionId === "augsburg"
  )));
  assert.deepEqual(politicsCard(view, "habsburg").constitutionalConnections, [{
    kind: "imperial-constitution",
    role: "estate",
    factionId: "france"
  }]);
});

test("the politics cards distinguish tributaries from vassals and unions", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const joseon = politicsCard(view, "joseon");
  const ming = politicsCard(view, "ming");
  assert.deepEqual(dependencySummaries(joseon), [{
    kind: "tributary",
    role: "subject",
    factionId: "ming"
  }]);
  assert.deepEqual(dependencySummaries(ming), [
    { kind: "tributary", role: "suzerain", factionId: "joseon" },
    { kind: "tributary", role: "suzerain", factionId: "ryukyu" }
  ]);
  const wallachia = politicsCard(view, "wallachia");
  const crimea = politicsCard(view, "crimea");
  assert.deepEqual(dependencySummaries(wallachia), [{
    kind: "autonomous-vassal",
    role: "subject",
    factionId: "ottoman"
  }]);
  assert.equal(wallachia.dependencies[0].terms.foreignPolicy, "independent");
  assert.equal(wallachia.dependencies[0].terms.tribute, true);
  assert.equal(crimea.dependencies[0].terms.tribute, false);
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
  assert.equal(view.latestNews.text, "PEACE: ENGLAND / FRANCE");
  assert.equal(view.latestNews.source, "diplomacy");
});

test("the politics view preserves the complete newest papal headline", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  imposePapalAction(state.relations.papacy, state.relations.diplomacy, {
    kind: PAPAL_ACTION_CRUSADE,
    targetFactionId: "ottoman",
    simMinute: 500,
    source: "test"
  });

  const view = createPoliticsView(state, 500);

  assert.equal(view.latestNews.source, "papal");
  assert.match(view.latestNews.text, /PROCLAIMS A CRUSADE AGAINST OTTOMAN/);
  assert.equal(view.latestNews.text.endsWith("..."), false);
});

test("the English break with Rome persists once in politics history", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  recordEnglishReformationAuthority(state.relations.authority, 500);

  const view = createPoliticsView(state, 500);

  assert.equal(view.latestNews.source, "authority");
  assert.equal(view.latestNews.text, "ENGLAND BREAKS WITH ROME");
  assert.equal(
    view.newsHistory.filter((entry) => entry.text === "ENGLAND BREAKS WITH ROME").length,
    1
  );
});

test("scripted political notices remain available in dated politics history", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  recordPortCapture(state.memory.conquest, {
    tileId: 900001,
    city: "Cuzco",
    country: "Peru",
    factionId: "inca"
  }, "spain", 300, "conquistador-campaign");
  const ternate = withForeignSettlements1522({
    tileId: 900002,
    city: "Ternate",
    country: "Indonesia",
    factionId: "ternate"
  });
  expelHostileForeignSettlements({
    memory: state.relations.foreignSettlementExpulsions,
    ports: [ternate],
    relationBetween: () => "war",
    simMinute: 400
  });

  const papacy = state.relations.papacy;
  advancePapalPolitics(papacy, state.relations.diplomacy, papacy.nextActionMinute);
  assert.ok(papacy.pendingMatter);
  const context = {
    playerFactionId: "spain",
    playerReligionId: "roman-catholic",
    papalReputation: 20
  };
  acceptPapalCommission(papacy, state.relations.diplomacy, {
    ...context,
    simMinute: papacy.lastUpdateMinute,
    originTileId: 1,
    itinerary: [{
      tileId: 2,
      portName: "Test Port",
      factionId: "habsburg",
      purpose: "test"
    }],
    rewardDoubloons: 500,
    nuncio: { id: "nuncio-politics-history", name: "Monsignor Test" }
  });
  const revokedMinute = papacy.lastUpdateMinute + 10;
  revokeActivePapalCommission(papacy, revokedMinute, "papal-enemy");

  const history = createPoliticsView(state, revokedMinute).newsHistory;

  assert.ok(history.some((entry) => (
    entry.source === "conquistador" && entry.text === "CUZCO FALLS TO THE SPANISH COLUMNS"
  )));
  assert.ok(history.some((entry) => (
    entry.source === "settlement-expulsion" &&
    entry.text === "PORTUGUESE SETTLEMENT EXPELLED FROM TERNATE"
  )));
  assert.ok(history.some((entry) => (
    entry.source === "papal-matter" && entry.simMinute === revokedMinute &&
    entry.text === "PAPAL LEGATION REVOKED"
  )));
});

test("politics news keeps the ten newest dated developments", () => {
  const recentEvents = Array.from({ length: 12 }, (_, index) => ({
    id: `test-politics-${index}`,
    kind: index % 2 === 0 ? "war" : "peace",
    factionAId: "england",
    factionBId: "france",
    simMinute: 100 + index * 10,
    headline: `Test development ${index}`
  })).reverse();

  const history = recentPoliticsNews({
    recentEvents,
    recentPapalActions: [],
    pendingPapalMatter: null
  });

  assert.equal(history.length, POLITICS_NEWS_HISTORY_LIMIT);
  assert.deepEqual(
    history.map((entry) => entry.simMinute),
    [210, 200, 190, 180, 170, 160, 150, 140, 130, 120]
  );
  assert.equal(history[0].text, "PEACE: ENGLAND / FRANCE");
  assert.equal(Object.isFrozen(history), true);
  assert.equal(Object.isFrozen(history[0]), true);
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

test("politics view independently marks every faction that granted a letter of marque", () => {
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
  const paris = {
    tileId: 2,
    city: "Paris",
    displayCity: "Paris",
    country: "France",
    factionId: "france",
    isFactionCapital: true,
    capitalOfFactionId: "france"
  };
  for (const capital of [london, paris]) {
    adjustFactionReputation(
      state,
      capital.factionId,
      LETTER_OF_MARQUE_REPUTATION_REQUIRED - factionReputation(state, capital.factionId)
    );
    grantLetterOfMarque(state, capital, LETTER_OF_MARQUE_POWER_REQUIRED);
  }
  const view = createPoliticsView(state);
  const england = politicsCard(view, "england");
  const france = politicsCard(view, "france");
  const portugal = politicsCard(view, "portugal");

  assert.equal(politicsMarqueMarker(england.player), "M");
  assert.equal(politicsMarqueMarker(france.player), "M");
  assert.equal(politicsMarqueMarker(portugal.player), "");
});

test("political power codes are compact for card relationship tokens", () => {
  const powers = politicalPowers();
  assert.ok(powers.every((faction) => faction.code.length <= 2));
  assert.equal(new Set(powers.map((faction) => faction.code)).size, powers.length);
  assert.equal(powers.find((faction) => faction.id === "pirate").code, "PX");
});

test("Mughal and Muscovite politics codes remain distinct after Panipat", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.conquest.collapsedFactionIds = state.memory.conquest.collapsedFactionIds
    .filter((factionId) => factionId !== "mughal");
  const powers = politicalPowers(state);
  assert.equal(powers.find((faction) => faction.id === "mughal").code, "MG");
  assert.equal(powers.find((faction) => faction.id === "muscovy").code, "MU");
  assert.equal(new Set(powers.map((faction) => faction.code)).size, powers.length);
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

function dependencySummaries(card) {
  return card.dependencies.map(({ kind, role, factionId }) => ({ kind, role, factionId }));
}
