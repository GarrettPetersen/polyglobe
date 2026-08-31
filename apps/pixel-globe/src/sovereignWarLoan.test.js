import assert from "node:assert/strict";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  acceptSovereignWarLoanSecurityForState,
  advanceSovereignWarLoanCreditForState,
  acknowledgeSovereignWarLoanDefault,
  issueSovereignWarLoanForState,
  holdSovereignWarLoanBondForState,
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
  SOVEREIGN_WAR_LOAN_ARREARS,
  SOVEREIGN_WAR_LOAN_DEFAULT_READY,
  SOVEREIGN_WAR_LOAN_OFFER_THRESHOLD,
  SOVEREIGN_WAR_LOAN_PRINCIPAL,
  SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY,
  SOVEREIGN_WAR_LOAN_REPAYMENT,
  SOVEREIGN_WAR_LOAN_REPAYMENT_READY,
  SOVEREIGN_WAR_LOAN_RESERVE_SLOTS,
  SOVEREIGN_WAR_LOAN_SECURED,
  SOVEREIGN_WAR_LOAN_SOLVENCY_RATIO,
  acceptSovereignWarLoanRenegotiation,
  advanceSovereignWarLoanAfterPeace,
  createSovereignWarLoanMemory,
  createSovereignWarLoanOffer,
  fundSovereignWarLoan,
  holdSovereignWarLoanBond,
  migrateSovereignWarLoanMemory,
  recordSovereignWarLoanMobilization,
  resolveSovereignWarLoan,
  selectSovereignWarLoanCustomsSecurity,
  sovereignWarLoanOfferNeedsPresentation,
  validateSovereignWarLoanMemory
} from "./sovereignWarLoan.js";

const PLAYER = {
  id: "player:joan-alden",
  name: "Joan Alden",
  nationalityId: "england",
  homePortCityId: "lisbon|portugal",
  homePortTileId: 1,
  homePortName: "Lisbon",
  homePortCountry: "Portugal",
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

test("victory repays, defeat defaults, and an insolvent even peace receives court-selected security", () => {
  const winning = fundedMemory();
  const gainedCadiz = [LISBON, PORTO, SEVILLE, { ...CADIZ, factionId: "portugal" }];
  const win = resolveSovereignWarLoan(winning, {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: gainedCadiz,
    simMinute: 100
  });
  assert.equal(win.status, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
  assert.equal(win.won, true);
  assert.equal(win.outcome, "victory");

  const defeated = fundedMemory();
  const lostPorto = [{ ...LISBON }, { ...PORTO, factionId: "spain" }, SEVILLE, CADIZ];
  const loss = resolveSovereignWarLoan(defeated, {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: lostPorto,
    simMinute: 100
  });
  assert.equal(loss.status, SOVEREIGN_WAR_LOAN_DEFAULT_READY);
  assert.equal(loss.won, false);
  assert.equal(loss.outcome, "defeat");

  const solventPeace = resolveSovereignWarLoan(fundedMemory(), {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerSolvencyRatio: SOVEREIGN_WAR_LOAN_SOLVENCY_RATIO,
    simMinute: 100
  });
  assert.equal(solventPeace.status, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
  assert.equal(solventPeace.won, false);
  assert.equal(solventPeace.repaid, true);
  assert.equal(solventPeace.outcome, "peace-solvent");

  const security = customsSecurity(100);
  assert.equal(security.portId, "lisbon|portugal");
  const insolventMemory = fundedMemory();
  const insolventPeace = resolveSovereignWarLoan(insolventMemory, {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerSolvencyRatio: SOVEREIGN_WAR_LOAN_SOLVENCY_RATIO - 0.01,
    renegotiationSecurity: security,
    simMinute: 100
  });
  assert.equal(insolventPeace.status, SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY);
  assert.equal(insolventPeace.outcome, "peace-insolvent");
  assert.equal(insolventMemory.contract.security.portId, "lisbon|portugal");

  assert.throws(() => resolveSovereignWarLoan(fundedMemory(), {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    simMinute: 100
  }), /requires borrower solvency/);
  assert.throws(() => resolveSovereignWarLoan(fundedMemory(), {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerSolvencyRatio: SOVEREIGN_WAR_LOAN_SOLVENCY_RATIO - 0.01,
    simMinute: 100
  }), /Invalid war-loan customs assignment/);
});

test("accepted customs security accrues, pauses on capture, resumes, and becomes payable", () => {
  const memory = insolventPeaceMemory();
  acceptSovereignWarLoanRenegotiation(memory, 110);
  assert.equal(memory.contract.status, SOVEREIGN_WAR_LOAN_SECURED);

  const firstDay = advanceSovereignWarLoanAfterPeace(memory, {
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    securityPortLiquidityRatio: 1,
    simMinute: 110 + 24 * 60
  });
  assert.equal(firstDay.outcome, "customs-accrued");
  assert.ok(memory.contract.security.accruedAmount > 0);

  const capturedLisbon = { ...LISBON, factionId: "spain", isFactionCapital: false, capitalOfFactionId: null };
  const suspended = advanceSovereignWarLoanAfterPeace(memory, {
    ports: [capturedLisbon, PORTO, SEVILLE, CADIZ],
    securityPortLiquidityRatio: 1,
    simMinute: 2_000
  });
  assert.equal(suspended.outcome, "customs-suspended");
  const accruedBeforeSuspension = memory.contract.security.accruedAmount;
  advanceSovereignWarLoanAfterPeace(memory, {
    ports: [capturedLisbon, PORTO, SEVILLE, CADIZ],
    simMinute: 2_000 + 30 * 24 * 60
  });
  assert.equal(memory.contract.security.accruedAmount, accruedBeforeSuspension);

  const resumed = advanceSovereignWarLoanAfterPeace(memory, {
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    securityPortLiquidityRatio: 1,
    simMinute: 50_000
  });
  assert.equal(resumed.outcome, "customs-resumed");
  const completed = advanceSovereignWarLoanAfterPeace(memory, {
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    securityPortLiquidityRatio: 1.25,
    simMinute: 50_000 + 600 * 24 * 60
  });
  assert.equal(completed.outcome, "customs-complete");
  assert.equal(completed.status, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
  assert.equal(memory.contract.security.accruedAmount, SOVEREIGN_WAR_LOAN_REPAYMENT);
});

test("holding the original bond leaves arrears until the borrower regains solvency", () => {
  const memory = insolventPeaceMemory();
  holdSovereignWarLoanBond(memory, 110);
  assert.equal(memory.contract.status, SOVEREIGN_WAR_LOAN_ARREARS);
  assert.equal(memory.contract.security, null);
  assert.equal(advanceSovereignWarLoanAfterPeace(memory, {
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerSolvencyRatio: SOVEREIGN_WAR_LOAN_SOLVENCY_RATIO - 0.01,
    simMinute: 200
  }), null);
  const recovered = advanceSovereignWarLoanAfterPeace(memory, {
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerSolvencyRatio: SOVEREIGN_WAR_LOAN_SOLVENCY_RATIO,
    simMinute: 300
  });
  assert.equal(recovered.outcome, "arrears-recovered");
  assert.equal(recovered.status, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
});

test("game-state renegotiation keeps the captain to a commercial choice at the borrower capital", () => {
  const state = fundedState();
  makeDiplomaticPeace(state.relations.diplomacy, "portugal", "spain", 30);
  const security = customsSecurity(30);
  const settlement = resolveSovereignWarLoanForState(
    state,
    [LISBON, PORTO, SEVILLE, CADIZ],
    30,
    {
      borrowerSolvencyRatio: SOVEREIGN_WAR_LOAN_SOLVENCY_RATIO - 0.01,
      renegotiationSecurity: security
    }
  );
  assert.equal(settlement.status, SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY);
  assert.throws(() => acceptSovereignWarLoanSecurityForState(state, PORTO, 31), /capital/);
  acceptSovereignWarLoanSecurityForState(state, LISBON, 31);
  const paper = shipItemRows(state).find((item) => item.id === SOVEREIGN_WAR_LOAN_CONTRACT_ITEM_ID);
  assert.match(paper.label, /Customs Assignment/);
  assert.match(paper.detail, /Lisbon customs have gathered 0 of 1,200,000 doubloons/);

  const service = advanceSovereignWarLoanCreditForState(
    state,
    [LISBON, PORTO, SEVILLE, CADIZ],
    31 + 600 * 24 * 60,
    { borrowerSolvencyRatio: 0.5, securityPortLiquidityRatio: 1.25 }
  );
  assert.equal(service.status, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
  const repayment = receiveSovereignWarLoanRepayment(state, LISBON, { simMinute: 31 + 600 * 24 * 60 + 1 });
  assert.equal(repayment.amount, SOVEREIGN_WAR_LOAN_REPAYMENT);
});

test("the captain may reject security without dictating a replacement revenue", () => {
  const state = fundedState();
  makeDiplomaticPeace(state.relations.diplomacy, "portugal", "spain", 30);
  resolveSovereignWarLoanForState(state, [LISBON, PORTO, SEVILLE, CADIZ], 30, {
    borrowerSolvencyRatio: 0.5,
    renegotiationSecurity: customsSecurity(30)
  });
  holdSovereignWarLoanBondForState(state, LISBON, 31);
  assert.equal(state.memory.quests.sovereignWarLoan.contract.status, SOVEREIGN_WAR_LOAN_ARREARS);
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

test("version 86 voyages preserve active war loans while adding secured-credit fields", () => {
  const current = fundedState();
  const legacy = structuredClone(current);
  legacy.version = 86;
  legacy.memory.quests.sovereignWarLoan.version = 1;
  delete legacy.memory.quests.sovereignWarLoan.contract.settlementOutcome;
  delete legacy.memory.quests.sovereignWarLoan.contract.security;
  const migrated = migrateGameState(legacy, null);
  assert.equal(migrated.version, GAME_STATE_VERSION);
  assert.equal(migrated.memory.quests.sovereignWarLoan.version, 2);
  assert.equal(migrated.memory.quests.sovereignWarLoan.contract.status, "active");
  assert.equal(migrated.memory.quests.sovereignWarLoan.contract.security, null);
  validateSovereignWarLoanMemory(migrated.memory.quests.sovereignWarLoan);
});

test("version 86 settled loans migrate without inventing a victory or defeat", () => {
  for (const [status, expectedOutcome] of [
    [SOVEREIGN_WAR_LOAN_REPAYMENT_READY, "legacy-repaid"],
    [SOVEREIGN_WAR_LOAN_DEFAULT_READY, "legacy-default"]
  ]) {
    const memory = fundedMemory();
    memory.contract.status = status;
    memory.contract.settlementMinute = 100;
    memory.version = 1;
    delete memory.contract.settlementOutcome;
    delete memory.contract.security;
    const migrated = migrateSovereignWarLoanMemory(memory);
    assert.equal(migrated.contract.status, status);
    assert.equal(migrated.contract.settlementOutcome, expectedOutcome);
    assert.equal(migrated.contract.security, null);
  }
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

function insolventPeaceMemory() {
  const memory = fundedMemory();
  resolveSovereignWarLoan(memory, {
    relationBetween: () => DIPLOMACY_NEUTRAL,
    ports: [LISBON, PORTO, SEVILLE, CADIZ],
    borrowerSolvencyRatio: 0.5,
    renegotiationSecurity: customsSecurity(100),
    simMinute: 100
  });
  return memory;
}

function customsSecurity(simMinute) {
  return selectSovereignWarLoanCustomsSecurity(
    [LISBON, PORTO, SEVILLE, CADIZ],
    "portugal",
    (portRecord) => portRecord.portId === "lisbon"
      ? { specie: 45_000, targetSpecie: 50_000 }
      : { specie: 20_000, targetSpecie: 30_000 },
    simMinute
  );
}

function fundedState() {
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
  issueSovereignWarLoanForState(
    state,
    LISBON,
    [LISBON, PORTO, SEVILLE, CADIZ],
    { simMinute: 20 }
  );
  return state;
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
    cityId: `${portId}|${factionId}`,
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
