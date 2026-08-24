import assert from "node:assert/strict";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  acknowledgeSovereignWarLoanDefault,
  issueSovereignWarLoanForState,
  migrateGameState,
  receiveSovereignWarLoanRepayment,
  resolveSovereignWarLoanForState,
  shipItemRows,
  createGameState
} from "./gameState.js";
import {
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR
} from "./factions.js";
import {
  declareDiplomaticWar,
  makeDiplomaticPeace
} from "./worldDiplomacy.js";
import {
  SOVEREIGN_WAR_LOAN_CONTRACT_ITEM_ID,
  SOVEREIGN_WAR_LOAN_DEFAULT_READY,
  SOVEREIGN_WAR_LOAN_OFFER_THRESHOLD,
  SOVEREIGN_WAR_LOAN_PRINCIPAL,
  SOVEREIGN_WAR_LOAN_REPAYMENT,
  SOVEREIGN_WAR_LOAN_REPAYMENT_READY,
  SOVEREIGN_WAR_LOAN_RESERVE_SLOTS,
  createSovereignWarLoanMemory,
  createSovereignWarLoanOffer,
  fundSovereignWarLoan,
  recordSovereignWarLoanMobilization,
  resolveSovereignWarLoan,
  sovereignWarLoanOfferNeedsPresentation,
  validateSovereignWarLoanMemory
} from "./sovereignWarLoan.js";

const PLAYER = {
  name: "Joan Alden",
  nationalityId: "england",
  expressions: ["neutral", "happy"]
};

const LISBON = capital(1, "lisbon", "Lisbon", "portugal");
const PORTO = port(2, "porto", "Porto", "portugal");
const SEVILLE = capital(3, "seville", "Seville", "spain");
const CADIZ = port(4, "cadiz", "Cadiz", "spain");

test("sovereign war-loan offers require a million-scale purse and an actual capital", () => {
  const memory = createSovereignWarLoanMemory();
  assert.equal(createSovereignWarLoanOffer(memory, {
    borrowerFactionId: "portugal",
    enemyFactionId: "spain",
    capital: LISBON,
    simMinute: 10,
    doubloons: SOVEREIGN_WAR_LOAN_OFFER_THRESHOLD - 1
  }), null);

  assert.throws(() => createSovereignWarLoanOffer(memory, {
    borrowerFactionId: "portugal",
    enemyFactionId: "spain",
    capital: PORTO,
    simMinute: 10,
    doubloons: SOVEREIGN_WAR_LOAN_OFFER_THRESHOLD
  }), /requires the portugal capital/);

  const offer = createSovereignWarLoanOffer(memory, {
    borrowerFactionId: "portugal",
    enemyFactionId: "spain",
    capital: LISBON,
    simMinute: 10,
    doubloons: SOVEREIGN_WAR_LOAN_OFFER_THRESHOLD
  });
  assert.equal(offer.borrowerFactionId, "portugal");
  assert.equal(offer.enemyFactionId, "spain");
  assert.equal(sovereignWarLoanOfferNeedsPresentation(memory, LISBON, 900_000), true);
});

test("the court fixes the named enemy before the captain funds the loan", () => {
  const memory = offeredMemory();
  assert.throws(() => fundSovereignWarLoan(memory, {
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerRulerName: "King John III",
    simMinute: 20,
    doubloons: SOVEREIGN_WAR_LOAN_PRINCIPAL - 1,
    relationBetween: () => DIPLOMACY_WAR
  }), /requires 1000000 doubloons/);

  const contract = fundSovereignWarLoan(memory, {
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerRulerName: "King John III",
    simMinute: 20,
    doubloons: SOVEREIGN_WAR_LOAN_PRINCIPAL,
    relationBetween: () => DIPLOMACY_WAR
  });
  assert.equal(contract.enemyFactionId, "spain");
  recordSovereignWarLoanMobilization(memory, {
    reserveSlotIds: ["reserve-a", "reserve-b"],
    offensiveShipIds: ["warship-a", "warship-b"]
  });
  assert.equal(contract.reserveSlotIds.length, SOVEREIGN_WAR_LOAN_RESERVE_SLOTS);
  validateSovereignWarLoanMemory(memory);
});

test("a better peace earns repayment while peace without advantage forfeits the bond", () => {
  const winning = fundedMemory();
  const gainedCadiz = [LISBON, PORTO, SEVILLE, { ...CADIZ, factionId: "portugal" }];
  const win = resolveSovereignWarLoan(winning, {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: gainedCadiz,
    simMinute: 100
  });
  assert.equal(win.status, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
  assert.equal(win.won, true);

  const losing = fundedMemory();
  const loss = resolveSovereignWarLoan(losing, {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    simMinute: 100
  });
  assert.equal(loss.status, SOVEREIGN_WAR_LOAN_DEFAULT_READY);
  assert.equal(loss.won, false);
});

test("a capital treaty decides the loan without hard-coding a historical winner", () => {
  const memory = fundedMemory();
  const result = resolveSovereignWarLoan(memory, {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    treaties: [{
      id: "treaty-portuguese-victory",
      winnerFactionId: "portugal",
      loserFactionId: "spain",
      simMinute: 80
    }],
    simMinute: 100
  });
  assert.equal(result.status, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
  assert.equal(result.basis, "treaty:treaty-portuguese-victory");
});

test("issuing and repaying the loan uses the purse, ledger, and carried contract", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.doubloons = 1_500_000;
  declareDiplomaticWar(state.relations.diplomacy, "portugal", "spain", 10);
  createSovereignWarLoanOffer(state.memory.quests.sovereignWarLoan, {
    borrowerFactionId: "portugal",
    enemyFactionId: "spain",
    capital: LISBON,
    simMinute: 10,
    doubloons: state.doubloons
  });

  const issuance = issueSovereignWarLoanForState(
    state,
    LISBON,
    [LISBON, PORTO, SEVILLE, CADIZ],
    { simMinute: 20 }
  );
  assert.equal(issuance.balance, 500_000);
  assert.equal(state.accounts.ledger.at(-1).amount, -SOVEREIGN_WAR_LOAN_PRINCIPAL);
  const paper = shipItemRows(state).find((item) => item.id === SOVEREIGN_WAR_LOAN_CONTRACT_ITEM_ID);
  assert.ok(paper);
  assert.equal(paper.questItem, true);
  assert.equal(paper.discardable, false);

  makeDiplomaticPeace(state.relations.diplomacy, "portugal", "spain", 30);
  const result = resolveSovereignWarLoanForState(
    state,
    [LISBON, PORTO, SEVILLE, { ...CADIZ, factionId: "portugal" }],
    30
  );
  assert.equal(result.status, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
  const repayment = receiveSovereignWarLoanRepayment(state, LISBON, { simMinute: 31 });
  assert.equal(repayment.amount, SOVEREIGN_WAR_LOAN_REPAYMENT);
  assert.equal(repayment.balance, 1_700_000);
  assert.equal(state.accounts.ledger.at(-1).pnl, 200_000);
  assert.equal(shipItemRows(state).some((item) => item.id === SOVEREIGN_WAR_LOAN_CONTRACT_ITEM_ID), false);
});

test("a fallen treasury can renege at the capital where it sealed the bond", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.doubloons = SOVEREIGN_WAR_LOAN_PRINCIPAL;
  declareDiplomaticWar(state.relations.diplomacy, "portugal", "spain", 10);
  createSovereignWarLoanOffer(state.memory.quests.sovereignWarLoan, {
    borrowerFactionId: "portugal",
    enemyFactionId: "spain",
    capital: LISBON,
    simMinute: 10,
    doubloons: state.doubloons
  });
  issueSovereignWarLoanForState(state, LISBON, [LISBON, PORTO, SEVILLE, CADIZ], { simMinute: 20 });
  makeDiplomaticPeace(state.relations.diplomacy, "portugal", "spain", 30);
  const fallenLisbon = { ...LISBON, factionId: "spain", isFactionCapital: false, capitalOfFactionId: null };
  const result = resolveSovereignWarLoanForState(
    state,
    [fallenLisbon, { ...PORTO, factionId: "spain" }, SEVILLE, CADIZ],
    30
  );
  assert.equal(result.status, SOVEREIGN_WAR_LOAN_DEFAULT_READY);
  const settlement = acknowledgeSovereignWarLoanDefault(state, fallenLisbon, { simMinute: 31 });
  assert.equal(settlement.amount, 0);
  assert.equal(state.memory.quests.sovereignWarLoan.contract, null);
});

test("version 85 voyages gain dormant war-loan memory without changing their history", () => {
  const current = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const legacy = structuredClone(current);
  legacy.version = 85;
  delete legacy.memory.quests.sovereignWarLoan;
  const migrated = migrateGameState(legacy, null);
  assert.equal(migrated.version, GAME_STATE_VERSION);
  assert.deepEqual(migrated.memory.quests.sovereignWarLoan, createSovereignWarLoanMemory());
  assert.equal(migrated.doubloons, current.doubloons);
});

function offeredMemory() {
  const memory = createSovereignWarLoanMemory();
  createSovereignWarLoanOffer(memory, {
    borrowerFactionId: "portugal",
    enemyFactionId: "spain",
    capital: LISBON,
    simMinute: 10,
    doubloons: SOVEREIGN_WAR_LOAN_PRINCIPAL
  });
  return memory;
}

function fundedMemory() {
  const memory = offeredMemory();
  fundSovereignWarLoan(memory, {
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerRulerName: "King John III",
    simMinute: 20,
    doubloons: SOVEREIGN_WAR_LOAN_PRINCIPAL,
    relationBetween: () => DIPLOMACY_WAR
  });
  recordSovereignWarLoanMobilization(memory, {
    reserveSlotIds: ["reserve-a", "reserve-b"],
    offensiveShipIds: ["warship-a", "warship-b"]
  });
  return memory;
}

function capital(tileId, portId, city, factionId) {
  return {
    ...port(tileId, portId, city, factionId),
    isFactionCapital: true,
    capitalOfFactionId: factionId
  };
}

function port(tileId, portId, city, factionId) {
  return {
    tileId,
    portId,
    city,
    displayCity: city,
    country: factionId,
    cityType: "northern-european",
    factionId,
    population: 60_000,
    lat: 38 + tileId / 10,
    lon: -10 + tileId / 10
  };
}
