import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_POPULATION_PROFILES,
  cityRecruitableCrewAppearances
} from "../city-visualizer/cityPeople.js";
import {
  CREW_MONTHLY_SALARY_MAX_DOUBLOONS,
  CREW_MONTHLY_SALARY_MIN_DOUBLOONS,
  CREW_PAYROLL_RESERVE_DOUBLOONS,
  crewMemberMonthlySalary,
  crewPayrollPeriodIndexAtMinute,
  crewRosterMonthlySalary
} from "./crewPayroll.js";
import {
  GAME_STATE_VERSION,
  createGameState,
  migrateGameState,
  settleCrewPayrollThroughMinute,
  validateGameState
} from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import {
  NAMED_CREW_ROLE_HISTORIAN,
  addNamedCrewMember
} from "./namedCrew.js";
import {
  setTestCrewCount,
  setTestCrewExperienceStars
} from "./test-fixtures/crewTestFixtures.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

const FEBRUARY_1_MINUTE = 31 * WEATHER_MINUTES_PER_DAY;
const MARCH_1_MINUTE = (31 + 28) * WEATHER_MINUTES_PER_DAY;
test("crew salaries span one to ten doubloons by role and experience", () => {
  const salaries = [];
  const crewTypeIds = new Set();
  for (const profile of CITY_POPULATION_PROFILES) {
    const appearances = cityRecruitableCrewAppearances({
      cityId: `salary-test-${profile.id}|test`,
      cityType: "city",
      country: "Test",
      populationProfileId: profile.id
    });
    for (const appearance of appearances) crewTypeIds.add(appearance.crewTypeId);
  }
  for (const crewTypeId of crewTypeIds) {
    for (const [experienceStars, sailingMinutes] of [
      [0, 0],
      [1, 14 * WEATHER_MINUTES_PER_DAY],
      [2, 45 * WEATHER_MINUTES_PER_DAY],
      [3, 120 * WEATHER_MINUTES_PER_DAY]
    ]) {
      const salary = crewMemberMonthlySalary(member({ crewTypeId, sailingMinutes }));
      assert.ok(salary >= CREW_MONTHLY_SALARY_MIN_DOUBLOONS, `${crewTypeId}/${experienceStars}`);
      assert.ok(salary <= CREW_MONTHLY_SALARY_MAX_DOUBLOONS, `${crewTypeId}/${experienceStars}`);
      salaries.push(salary);
    }
  }
  assert.equal(Math.min(...salaries), 1);
  assert.equal(Math.max(...salaries), 10);
  assert.equal(crewMemberMonthlySalary(member({ crewTypeId: "sailor", sailingMinutes: 0 })), 1);
  assert.equal(crewMemberMonthlySalary(member({
    crewTypeId: "samurai",
    sailingMinutes: 120 * WEATHER_MINUTES_PER_DAY
  })), 10);
});

test("equally experienced combat crew earn more than ordinary sailors", () => {
  for (const sailingMinutes of [0, 14, 45, 120].map((days) => days * WEATHER_MINUTES_PER_DAY)) {
    const salary = (crewTypeId) => crewMemberMonthlySalary(member({ crewTypeId, sailingMinutes }));
    assert.equal(salary("hunter"), salary("sailor") + 1);
    assert.equal(salary("warrior"), salary("hunter") + 1);
    assert.equal(salary("ronin"), salary("warrior"));
    assert.equal(salary("samurai"), salary("ronin") + 1);
  }
});

test("unknown crew roles cannot silently receive a generic salary", () => {
  assert.throws(
    () => crewMemberMonthlySalary(member({ crewTypeId: "wizard", sailingMinutes: 0 })),
    /no salary grade/
  );
});

test("monthly payroll pays ordinary crew, records the expense, and preserves 100 DB", () => {
  const state = crewedState();
  const monthlySalaryDoubloons = crewRosterMonthlySalary(state.crewRoster);
  state.doubloons = CREW_PAYROLL_RESERVE_DOUBLOONS + monthlySalaryDoubloons;

  assert.equal(settleCrewPayrollThroughMinute(state, FEBRUARY_1_MINUTE - 1), null);
  const settlement = settleCrewPayrollThroughMinute(state, FEBRUARY_1_MINUTE);

  assert.equal(settlement.periodsDue, 1);
  assert.equal(settlement.monthlySalaryDoubloons, monthlySalaryDoubloons);
  assert.equal(settlement.paidDoubloons, monthlySalaryDoubloons);
  assert.equal(settlement.arrearsAfterDoubloons, 0);
  assert.equal(settlement.paidInFull, true);
  assert.equal(state.doubloons, CREW_PAYROLL_RESERVE_DOUBLOONS);
  assert.deepEqual(state.accounts.ledger.at(-1), {
    id: 2,
    kind: "expense",
    simMinute: FEBRUARY_1_MINUTE,
    location: "Aboard",
    country: "",
    description: "Crew salaries",
    goodId: null,
    quantity: 0,
    amount: -monthlySalaryDoubloons,
    balance: CREW_PAYROLL_RESERVE_DOUBLOONS,
    costBasis: null,
    pnl: null
  });
});

test("unpaid salary becomes arrears and is added to the following month", () => {
  const state = crewedState();
  const monthlySalaryDoubloons = crewRosterMonthlySalary(state.crewRoster);
  state.doubloons = CREW_PAYROLL_RESERVE_DOUBLOONS + monthlySalaryDoubloons - 1;

  const missed = settleCrewPayrollThroughMinute(state, FEBRUARY_1_MINUTE);
  assert.equal(missed.paidDoubloons, 0);
  assert.equal(missed.arrearsAfterDoubloons, monthlySalaryDoubloons);
  assert.equal(state.doubloons, CREW_PAYROLL_RESERVE_DOUBLOONS + monthlySalaryDoubloons - 1);

  state.doubloons = CREW_PAYROLL_RESERVE_DOUBLOONS + monthlySalaryDoubloons * 2;
  const caughtUp = settleCrewPayrollThroughMinute(state, MARCH_1_MINUTE);
  assert.equal(caughtUp.regularDueDoubloons, monthlySalaryDoubloons);
  assert.equal(caughtUp.arrearsBeforeDoubloons, monthlySalaryDoubloons);
  assert.equal(caughtUp.paidDoubloons, monthlySalaryDoubloons * 2);
  assert.equal(caughtUp.arrearsAfterDoubloons, 0);
  assert.equal(state.doubloons, CREW_PAYROLL_RESERVE_DOUBLOONS);
});

test("skipping calendar months settles each missed payroll exactly once", () => {
  const state = crewedState();
  const monthlySalaryDoubloons = crewRosterMonthlySalary(state.crewRoster);
  state.doubloons = CREW_PAYROLL_RESERVE_DOUBLOONS + monthlySalaryDoubloons * 2;

  const settlement = settleCrewPayrollThroughMinute(state, MARCH_1_MINUTE);
  assert.equal(settlement.periodsDue, 2);
  assert.equal(settlement.regularDueDoubloons, monthlySalaryDoubloons * 2);
  assert.equal(settlement.paidDoubloons, monthlySalaryDoubloons * 2);
  assert.equal(state.doubloons, CREW_PAYROLL_RESERVE_DOUBLOONS);
  assert.equal(settleCrewPayrollThroughMinute(state, MARCH_1_MINUTE), null);
});

test("rewinding the simulation clock cannot refund or duplicate settled payroll", () => {
  const state = crewedState();
  const monthlySalaryDoubloons = crewRosterMonthlySalary(state.crewRoster);
  state.doubloons = CREW_PAYROLL_RESERVE_DOUBLOONS + monthlySalaryDoubloons * 2;

  settleCrewPayrollThroughMinute(state, FEBRUARY_1_MINUTE);
  assert.equal(settleCrewPayrollThroughMinute(state, FEBRUARY_1_MINUTE - 1), null);
  assert.equal(settleCrewPayrollThroughMinute(state, FEBRUARY_1_MINUTE), null);
  assert.equal(state.doubloons, CREW_PAYROLL_RESERVE_DOUBLOONS + monthlySalaryDoubloons);
});

test("named characters never enter the ordinary crew payroll", () => {
  const state = crewedState();
  const before = crewRosterMonthlySalary(state.crewRoster);
  addNamedCrewMember(state, {
    id: "named-sailor",
    name: "Named Sailor",
    expressions: [{ id: "neutral" }],
    skillIds: ["able-seaman"]
  }, NAMED_CREW_ROLE_HISTORIAN);
  assert.equal(crewRosterMonthlySalary(state.crewRoster), before);
});

test("version 97 saves preserve their crew and begin payroll in the restored month", () => {
  const state = crewedState();
  const crewBefore = structuredClone(state.crewRoster);
  state.version = 97;
  state.survival.lastMinute = FEBRUARY_1_MINUTE + 500;
  delete state.crewPayroll;

  const migrated = migrateGameState(state, shipStatsForSlug("brigantine"));

  assert.equal(migrated.version, GAME_STATE_VERSION);
  assert.deepEqual(migrated.crewRoster, crewBefore);
  assert.equal(
    migrated.crewPayroll.lastSettledPeriodIndex,
    crewPayrollPeriodIndexAtMinute(state.survival.lastMinute)
  );
  assert.equal(migrated.crewPayroll.arrearsDoubloons, 0);
  assert.equal(settleCrewPayrollThroughMinute(migrated, state.survival.lastMinute), null);
  assert.equal(validateGameState(migrated), migrated);
});

function crewedState() {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  setTestCrewCount(state, 3);
  setTestCrewExperienceStars(state, 0);
  return state;
}

function member({ crewTypeId, sailingMinutes }) {
  return {
    id: `crew:test:${crewTypeId}:${sailingMinutes}`,
    name: "Test Crew",
    nameCulture: "maritime",
    religionId: "roman-catholic",
    nationalityId: "neutral",
    homePortCityId: "test-home|test",
    homePortTileId: 1,
    homePortName: "Test Home",
    appearanceId: "mariner-light-black-hair",
    crewTypeId,
    recruitedAtMinute: 0,
    sailingMinutes,
    wound: null
  };
}
