import { createCrewCasualtyReport } from "./crewCasualtyReport.js";

export const NAVAL_AFTER_ACTION_QUIET_MS = 5000;
const MAX_PENDING_CASUALTIES = 4096;

export function recordNavalCasualties(entries, { deaths, wounded }) {
  validateNavalCasualties(entries);
  if (!Array.isArray(deaths) || !Array.isArray(wounded)) {
    throw new Error("Naval casualty recording requires death and wound lists");
  }
  const ordinary = createCrewCasualtyReport({
    deaths: deaths.filter(({ kind }) => kind === "crew"), wounded
  }).entries;
  const named = deaths.filter(({ kind }) => kind === "named").map(({ member }) => ({
    memberId: member.id, name: member.name, appearanceId: null,
    crewTypeId: member.role, experienceStars: 0, fate: "dead", recoveryDays: 0
  }));
  if (ordinary.length + named.length !== deaths.length + wounded.length) {
    throw new Error("Naval casualty report contains an unknown crew kind");
  }
  const next = new Map(entries.map((entry) => [entry.memberId, entry]));
  for (const entry of [...ordinary, ...named]) {
    // A wounded sailor subsequently killed belongs in the death roll once.
    if (next.get(entry.memberId)?.fate !== "dead") next.set(entry.memberId, entry);
  }
  const result = [...next.values()];
  validateNavalCasualties(result);
  entries.splice(0, entries.length, ...result);
}

export function validateNavalCasualties(entries) {
  if (!Array.isArray(entries) || entries.length > MAX_PENDING_CASUALTIES) {
    throw new Error("Invalid pending naval casualty roll");
  }
  const ids = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry.memberId !== "string" || !entry.memberId || ids.has(entry.memberId) ||
        typeof entry.name !== "string" || !entry.name ||
        (entry.appearanceId !== null && (typeof entry.appearanceId !== "string" || !entry.appearanceId)) ||
        typeof entry.crewTypeId !== "string" || !entry.crewTypeId ||
        !Number.isInteger(entry.experienceStars) || entry.experienceStars < 0 || entry.experienceStars > 3 ||
        !["dead", "wounded"].includes(entry.fate) ||
        !Number.isInteger(entry.recoveryDays) ||
        (entry.fate === "dead" ? entry.recoveryDays !== 0 : entry.recoveryDays <= 0)) {
      throw new Error(`Invalid naval casualty entry: ${entry?.memberId}`);
    }
    ids.add(entry.memberId);
  }
  return entries;
}

export function navalCasualtyReport(entries) {
  validateNavalCasualties(entries);
  return Object.freeze({ entries: Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))),
    deaths: entries.filter(({ fate }) => fate === "dead").length,
    wounded: entries.filter(({ fate }) => fate === "wounded").length });
}

export function navalAfterActionReady({ quietSinceMs, nowMs, engaged, projectilesActive, blocked }) {
  if (!Number.isFinite(nowMs) || (quietSinceMs !== null && !Number.isFinite(quietSinceMs)) ||
      [engaged, projectilesActive, blocked].some((value) => typeof value !== "boolean")) {
    throw new Error("Naval after-action readiness requires a clock and combat state");
  }
  return quietSinceMs !== null && nowMs - quietSinceMs >= NAVAL_AFTER_ACTION_QUIET_MS &&
    !engaged && !projectilesActive && !blocked;
}
