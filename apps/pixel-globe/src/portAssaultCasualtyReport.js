import { crewMemberExperienceStars } from "./crewMembers.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const PORT_ASSAULT_CASUALTY_FATE = Object.freeze({
  DEAD: "dead",
  WOUNDED: "wounded"
});

export function createPortAssaultCasualtyReport({ deaths, wounded }) {
  if (!Array.isArray(deaths) || !Array.isArray(wounded)) {
    throw new Error("Port assault casualty report requires death and wound lists");
  }
  const deadEntries = deaths.map((casualty) => {
    if (casualty?.kind !== "crew") {
      throw new Error("Port assault death report requires an ordinary crew casualty");
    }
    return casualtyReportEntry(casualty.member, PORT_ASSAULT_CASUALTY_FATE.DEAD, 0);
  });
  const woundedEntries = wounded.map((casualty) => {
    if (!Number.isInteger(casualty?.recoveryMinutes) || casualty.recoveryMinutes <= 0) {
      throw new Error(`Invalid reported wound recovery time: ${casualty?.recoveryMinutes}`);
    }
    if (casualty.member?.wound?.recoveryMinutesRemaining !== casualty.recoveryMinutes) {
      throw new Error(`Reported wound does not match ${casualty.member?.id || "missing crew member"}`);
    }
    return casualtyReportEntry(
      casualty.member,
      PORT_ASSAULT_CASUALTY_FATE.WOUNDED,
      Math.ceil(casualty.recoveryMinutes / WEATHER_MINUTES_PER_DAY)
    );
  });
  const entries = [...deadEntries, ...woundedEntries];
  const memberIds = entries.map(({ memberId }) => memberId);
  if (new Set(memberIds).size !== memberIds.length) {
    throw new Error("Port assault casualty report repeats a crew member");
  }
  return Object.freeze({
    deaths: deadEntries.length,
    wounded: woundedEntries.length,
    entries: Object.freeze(entries)
  });
}

function casualtyReportEntry(member, fate, recoveryDays) {
  if (!member || typeof member !== "object") {
    throw new Error("Port assault casualty report requires a crew member");
  }
  const experienceStars = crewMemberExperienceStars(member);
  return Object.freeze({
    memberId: member.id,
    name: member.name,
    appearanceId: member.appearanceId,
    crewTypeId: member.crewTypeId,
    experienceStars,
    fate,
    recoveryDays
  });
}
