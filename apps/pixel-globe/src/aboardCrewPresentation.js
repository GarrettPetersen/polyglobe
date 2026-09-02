import { crewMemberExperienceStars } from "./crewMembers.js";
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

export function aboardCrewMemberDetail(member, currentMinute) {
  const experienceStars = crewMemberExperienceStars(member);
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
    typeLabel: member.crewTypeId.replaceAll("-", " ").toUpperCase(),
    timeAboardDays: Math.floor((wholeMinute - member.recruitedAtMinute) / WEATHER_MINUTES_PER_DAY),
    experienceStars,
    experienceLevelKey: aboardCrewExperienceLevelKey(experienceStars)
  });
}
