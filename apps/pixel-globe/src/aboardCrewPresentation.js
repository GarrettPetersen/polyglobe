import { characterCultureLabel } from "./characterBiography.js";
import { crewMemberExperienceStars, crewMemberIsWounded } from "./crewMembers.js";
import { crewMemberMonthlySalary } from "./crewPayroll.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

const EXPERIENCE_LEVEL_KEYS = Object.freeze([
  "aboard.experience.novice",
  "aboard.experience.steady",
  "aboard.experience.seasoned",
  "aboard.experience.master"
]);

export function aboardCrewExperienceLevelKey(experienceStars) {
  if (!Number.isInteger(experienceStars) || experienceStars < 0 ||
      experienceStars >= EXPERIENCE_LEVEL_KEYS.length) {
    throw new Error(`Invalid aboard crew experience level: ${experienceStars}`);
  }
  return EXPERIENCE_LEVEL_KEYS[experienceStars];
}

export function aboardCharacterBiography({
  roleLabel,
  nationalityLabel,
  homePortLabel,
  homePortName,
  sexLabel,
  birthDateLabel,
  age
}) {
  const textFields = { roleLabel, nationalityLabel, homePortLabel, homePortName, sexLabel, birthDateLabel };
  for (const [field, value] of Object.entries(textFields)) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Aboard biography requires ${field}`);
    }
  }
  if (!Number.isInteger(age) || age < 0) throw new Error(`Aboard biography requires a valid age: ${age}`);
  return Object.freeze([
    Object.freeze(["ROLE", roleLabel]),
    Object.freeze(["NATIONALITY", nationalityLabel]),
    Object.freeze([homePortLabel, homePortName]),
    Object.freeze(["SEX", sexLabel]),
    Object.freeze(["BORN", birthDateLabel]),
    Object.freeze(["AGE", String(age)])
  ]);
}

export function aboardCrewMemberDetail(member, currentMinute) {
  const experienceStars = crewMemberExperienceStars(member);
  const wounded = crewMemberIsWounded(member);
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid aboard crew detail minute: ${currentMinute}`);
  }
  const wholeMinute = Math.floor(currentMinute);
  if (wholeMinute < member.recruitedAtMinute) {
    throw new Error(
      `Crew member ${member.id} was recruited after the current minute: ` +
      `${member.recruitedAtMinute}/${wholeMinute}`
    );
  }
  return Object.freeze({
    memberId: member.id,
    name: member.name,
    homePortCityId: member.homePortCityId,
    homePortName: member.homePortName,
    nameCulture: member.nameCulture,
    cultureLabel: characterCultureLabel(member),
    religionId: member.religionId,
    nationalityId: member.nationalityId,
    typeLabel: member.crewTypeId.replaceAll("-", " ").toUpperCase(),
    timeAboardDays: Math.floor((wholeMinute - member.recruitedAtMinute) / WEATHER_MINUTES_PER_DAY),
    monthlySalaryDoubloons: crewMemberMonthlySalary(member),
    wounded,
    woundRecoveryDays: wounded
      ? Math.ceil(member.wound.recoveryMinutesRemaining / WEATHER_MINUTES_PER_DAY)
      : 0,
    experienceStars,
    experienceLevelKey: aboardCrewExperienceLevelKey(experienceStars)
  });
}

export function crewWoundNoticeText(wounded) {
  if (!Array.isArray(wounded) || wounded.length === 0) {
    throw new Error("Crew wound notice requires wounded crewmates");
  }
  for (const entry of wounded) {
    if (typeof entry?.member?.name !== "string" || entry.member.name === "") {
      throw new Error("Crew wound notice requires named crewmates");
    }
  }
  const firstName = wounded[0].member.name.toUpperCase();
  return wounded.length === 1
    ? `${firstName} WOUNDED`
    : `${firstName} + ${wounded.length - 1} WOUNDED`;
}
