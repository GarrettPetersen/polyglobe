import { gameCalendarDateAtMinute } from "./characterBiography.js";
import {
  CREW_EXPERIENCE_MAX_STARS,
  crewMemberExperienceStars,
  validateCrewRoster
} from "./crewMembers.js";

export const CREW_PAYROLL_STATE_VERSION = 1;
export const CREW_PAYROLL_RESERVE_DOUBLOONS = 100;
export const CREW_MONTHLY_SALARY_MIN_DOUBLOONS = 1;
export const CREW_MONTHLY_SALARY_MAX_DOUBLOONS = 10;

const EXPERIENCE_SALARY_DOUBLOONS = Object.freeze([1, 3, 5, 7]);
const ROLE_SALARY_PREMIUM_DOUBLOONS = Object.freeze({
  sailor: 0,
  warrior: 0,
  hunter: 0,
  archer: 1,
  spearman: 1,
  swordsman: 2,
  crossbowman: 2,
  shieldman: 2,
  halberdier: 2,
  gunner: 2,
  ronin: 2,
  samurai: 3
});

export function createCrewPayrollState(startMinute) {
  return {
    version: CREW_PAYROLL_STATE_VERSION,
    lastSettledPeriodIndex: crewPayrollPeriodIndexAtMinute(startMinute),
    arrearsDoubloons: 0
  };
}

export function validateCrewPayrollState(payroll) {
  if (!payroll || typeof payroll !== "object" || Array.isArray(payroll)) {
    throw new Error("Crew payroll state must be an object");
  }
  if (payroll.version !== CREW_PAYROLL_STATE_VERSION) {
    throw new Error(`Unsupported crew payroll state version: ${payroll.version}`);
  }
  if (!Number.isInteger(payroll.lastSettledPeriodIndex) || payroll.lastSettledPeriodIndex < 0) {
    throw new Error(`Invalid settled crew payroll period: ${payroll.lastSettledPeriodIndex}`);
  }
  if (!Number.isSafeInteger(payroll.arrearsDoubloons) || payroll.arrearsDoubloons < 0) {
    throw new Error(`Invalid crew salary arrears: ${payroll.arrearsDoubloons}`);
  }
  return payroll;
}

export function crewMemberMonthlySalary(member) {
  const stars = crewMemberExperienceStars(member);
  const rolePremium = ROLE_SALARY_PREMIUM_DOUBLOONS[member.crewTypeId];
  if (rolePremium === undefined) {
    throw new Error(`Crew member ${member.id} has no salary grade for type ${member.crewTypeId}`);
  }
  const salary = EXPERIENCE_SALARY_DOUBLOONS[stars] + rolePremium;
  if (!Number.isInteger(salary) || salary < CREW_MONTHLY_SALARY_MIN_DOUBLOONS ||
      salary > CREW_MONTHLY_SALARY_MAX_DOUBLOONS) {
    throw new Error(`Crew member ${member.id} has invalid monthly salary: ${salary}`);
  }
  return salary;
}

export function crewRosterMonthlySalary(roster) {
  validateCrewRoster(roster);
  const salary = roster.reduce((total, member) => total + crewMemberMonthlySalary(member), 0);
  if (!Number.isSafeInteger(salary) || salary < 0) {
    throw new Error(`Invalid monthly crew salary total: ${salary}`);
  }
  return salary;
}

export function crewPayrollPeriodsDue(payroll, currentMinute) {
  validateCrewPayrollState(payroll);
  const currentPeriodIndex = crewPayrollPeriodIndexAtMinute(currentMinute);
  // Debug clock rewinds do not reverse settled wages. Keeping the later period also
  // prevents the same month from being charged again when time catches back up.
  return Math.max(0, currentPeriodIndex - payroll.lastSettledPeriodIndex);
}

export function crewPayrollPeriodIndexAtMinute(simMinute) {
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid crew payroll minute: ${simMinute}`);
  }
  const date = gameCalendarDateAtMinute(simMinute);
  const periodIndex = date.year * 12 + date.month - 1;
  if (!Number.isSafeInteger(periodIndex) || periodIndex < 0) {
    throw new Error(`Invalid crew payroll period at minute ${simMinute}: ${periodIndex}`);
  }
  return periodIndex;
}

if (EXPERIENCE_SALARY_DOUBLOONS.length !== CREW_EXPERIENCE_MAX_STARS + 1) {
  throw new Error("Crew salary experience grades do not cover every experience level");
}
