import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  factionById
} from "./factions.js";
import { gameMinuteForDate, rulerAtMinute, rulerChangesBetween } from "./rulers.js";
import {
  declareDiplomaticWar,
  establishDiplomaticSuzerainty,
  rawWorldDiplomacyBetween,
  releaseDiplomaticVassal,
  validateWorldDiplomacy
} from "./worldDiplomacy.js";
import {
  SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
  SUZERAINTY_KIND_PERSONAL_UNION,
  SUZERAINTY_KIND_TRIBUTARY,
  SUZERAINTY_KIND_VASSAL
} from "./suzerainty.js";

export const SOVEREIGN_AUTHORITY_VERSION = 1;
export const AUTHORITY_MIN = 0;
export const AUTHORITY_MAX = 100;
export const AUTHORITY_HISTORY_LIMIT = 64;
export const PAPAL_AUTHORITY_INITIAL = 58;

const MINUTES_PER_DAY = 24 * 60;
const SUBJECT_REVIEW_MIN_DAYS = 105;
const SUBJECT_REVIEW_MAX_DAYS = 180;
const MAX_CATCH_UP_REVIEWS = 8;
const VIENNA_SIEGE_AUTHORITY_MINUTE = gameMinuteForDate(1529, 10, 14);
const AUTHORITY_HEADLINE_NOTICES = Object.freeze({
  "english-reformation": "ENGLAND BREAKS WITH ROME"
});
const LUTHERAN_RECEPTIVE_FACTIONS = new Set([
  "burgundian-netherlands",
  "habsburg",
  "hungary",
  "poland-lithuania",
  "sweden",
  "denmark-norway"
]);
const SOVEREIGN_FACTIONS = Object.freeze(FACTIONS.filter(({ id }) => (
  id !== NEUTRAL_FACTION_ID && id !== PIRATE_FACTION_ID
)));

export function createSovereignAuthority({ startMinute = 0, seedKey = "authority" } = {}) {
  assertMinute(startMinute, "authority start");
  assertSeedKey(seedKey);
  const scores = Object.fromEntries(SOVEREIGN_FACTIONS.map(({ id }) => [
    id,
    rulerAtMinute(id, startMinute).authority
  ]));
  const memory = {
    version: SOVEREIGN_AUTHORITY_VERSION,
    seed: hashString32(`${seedKey}|sovereign-authority`),
    sequence: 0,
    startMinute,
    lastUpdateMinute: startMinute,
    nextSubjectReviewMinute: startMinute,
    scores,
    papal: PAPAL_AUTHORITY_INITIAL,
    englishReformationApplied: false,
    viennaSiegeApplied: false,
    history: []
  };
  memory.nextSubjectReviewMinute += subjectReviewInterval(memory, 0);
  return validateSovereignAuthority(memory);
}

export function migrateSovereignAuthority(memory, {
  startMinute = 0,
  seedKey = "authority",
  splitCombinedHabsburg = false
} = {}) {
  if (memory === undefined || memory === null) {
    return createSovereignAuthority({ startMinute, seedKey });
  }
  const scores = Object.fromEntries(SOVEREIGN_FACTIONS.map(({ id }) => [
    id,
    id === "burgundian-netherlands" && splitCombinedHabsburg
      ? memory.scores?.[id] ?? memory.scores?.habsburg ?? rulerAtMinute(id, startMinute).authority
      : memory.scores?.[id] ?? rulerAtMinute(id, startMinute).authority
  ]));
  return validateSovereignAuthority({ ...memory, scores });
}

export function validateSovereignAuthority(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== SOVEREIGN_AUTHORITY_VERSION) {
    throw new Error(`Unsupported sovereign authority version: ${memory?.version ?? "missing"}`);
  }
  if (!Number.isInteger(memory.seed) || memory.seed < 0 || memory.seed > 0xffffffff) {
    throw new Error(`Invalid sovereign authority seed: ${memory.seed}`);
  }
  if (!Number.isInteger(memory.sequence) || memory.sequence < 0) {
    throw new Error(`Invalid sovereign authority sequence: ${memory.sequence}`);
  }
  assertMinute(memory.startMinute, "authority start");
  assertMinute(memory.lastUpdateMinute, "authority update");
  assertMinute(memory.nextSubjectReviewMinute, "authority subject review");
  if (memory.lastUpdateMinute < memory.startMinute ||
      memory.nextSubjectReviewMinute < memory.startMinute) {
    throw new Error("Sovereign authority clock precedes its start");
  }
  if (!memory.scores || typeof memory.scores !== "object" || Array.isArray(memory.scores)) {
    throw new Error("Sovereign authority scores must be an object");
  }
  const expected = SOVEREIGN_FACTIONS.map(({ id }) => id).sort();
  const actual = Object.keys(memory.scores).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Sovereign authority must cover every sovereign faction exactly once");
  }
  for (const [factionId, score] of Object.entries(memory.scores)) {
    assertFactionId(factionId);
    assertAuthorityScore(score, factionId);
  }
  assertAuthorityScore(memory.papal, "papacy");
  if (typeof memory.englishReformationApplied !== "boolean") {
    throw new Error("Sovereign authority requires an English Reformation flag");
  }
  if (typeof memory.viennaSiegeApplied !== "boolean") {
    throw new Error("Sovereign authority requires a Vienna siege flag");
  }
  if (!Array.isArray(memory.history) || memory.history.length > AUTHORITY_HISTORY_LIMIT) {
    throw new Error("Invalid sovereign authority history");
  }
  for (const event of memory.history) validateAuthorityEvent(event);
  return memory;
}

export function sovereignAuthorityScore(memory, factionId) {
  validateSovereignAuthority(memory);
  assertSovereignFaction(factionId);
  return memory.scores[factionId];
}

export function papalAuthorityScore(memory) {
  validateSovereignAuthority(memory);
  return memory.papal;
}

export function papalAuthorityResponseMultiplier(memoryOrScore) {
  const score = typeof memoryOrScore === "number"
    ? memoryOrScore
    : papalAuthorityScore(memoryOrScore);
  assertAuthorityScore(score, "papal response");
  return 0.35 + score / 100 * 0.9;
}

export function recentSovereignAuthorityHeadlines(memory, limit = 3) {
  validateSovereignAuthority(memory);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`Invalid authority headline history limit: ${limit}`);
  }
  if (limit === 0) return Object.freeze([]);
  const headlines = [];
  const seen = new Set();
  for (const event of memory.history) {
    if (!Object.hasOwn(AUTHORITY_HEADLINE_NOTICES, event.source)) continue;
    const key = `${event.source}|${event.simMinute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    headlines.push(event);
    if (headlines.length >= limit) break;
  }
  return Object.freeze(headlines);
}

export function sovereignAuthorityHeadlineNotice(event) {
  validateAuthorityEvent(event);
  const notice = AUTHORITY_HEADLINE_NOTICES[event.source];
  if (!notice) throw new Error(`Authority event is not a political headline: ${event.source}`);
  return notice;
}

export function convertCatholicFactorForPapalAuthority(character, memoryOrScore) {
  if (!character || typeof character !== "object" ||
      character.religionId !== "roman-catholic" ||
      !LUTHERAN_RECEPTIVE_FACTIONS.has(character.nationalityId)) {
    return character;
  }
  const score = typeof memoryOrScore === "number"
    ? memoryOrScore
    : papalAuthorityScore(memoryOrScore);
  assertAuthorityScore(score, "factor conversion");
  if (score >= 48) return character;
  const identity = character.identityKey || character.id ||
    `${character.name}|${character.homePort || "unknown"}`;
  const chance = Math.min(0.48, (48 - score) / 75);
  const roll = hashString32(`${identity}|papal-authority-conversion`) / 0x100000000;
  return roll < chance
    ? Object.freeze({ ...character, religionId: "lutheran" })
    : character;
}

export function adjustSovereignAuthority(memory, factionId, delta, {
  simMinute,
  source,
  detail = null
}) {
  validateSovereignAuthority(memory);
  assertSovereignFaction(factionId);
  return adjustAuthorityValue(memory, factionId, delta, { simMinute, source, detail });
}

export function adjustPapalAuthority(memory, delta, {
  simMinute,
  source,
  detail = null
}) {
  validateSovereignAuthority(memory);
  return adjustAuthorityValue(memory, "papacy", delta, { simMinute, source, detail });
}

export function nextSovereignAuthorityMinute(memory) {
  validateSovereignAuthority(memory);
  return memory.nextSubjectReviewMinute;
}

export function advanceSovereignAuthority(memory, diplomacy, currentMinute) {
  validateSovereignAuthority(memory);
  validateWorldDiplomacy(diplomacy);
  assertMinute(currentMinute, "authority current");
  if (currentMinute < memory.lastUpdateMinute) {
    throw new Error(
      `Sovereign authority cannot move backward: ${currentMinute} < ${memory.lastUpdateMinute}`
    );
  }
  const authorityEvents = [];
  const diplomacyEvents = [];
  for (const change of rulerChangesBetween(memory.lastUpdateMinute, currentMinute)) {
    const delta = roundHundredth((change.authority - change.previousRuler.authority) * 0.4);
    if (delta === 0) continue;
    authorityEvents.push(adjustSovereignAuthority(memory, change.factionId, delta, {
      simMinute: change.fromMinute,
      source: "ruler-succession",
      detail: `${change.previousRuler.displayName} succeeded by ${change.displayName}`
    }));
  }
  if (!memory.viennaSiegeApplied &&
      memory.lastUpdateMinute < VIENNA_SIEGE_AUTHORITY_MINUTE &&
      currentMinute >= VIENNA_SIEGE_AUTHORITY_MINUTE) {
    memory.viennaSiegeApplied = true;
    if (rawWorldDiplomacyBetween(diplomacy, "ottoman", "habsburg") === DIPLOMACY_WAR) {
      authorityEvents.push(adjustSovereignAuthority(memory, "habsburg", 2, {
        simMinute: VIENNA_SIEGE_AUTHORITY_MINUTE,
        source: "vienna-withstands-siege",
        detail: "Vienna holds against Suleiman's army"
      }));
      authorityEvents.push(adjustSovereignAuthority(memory, "ottoman", -1.5, {
        simMinute: VIENNA_SIEGE_AUTHORITY_MINUTE,
        source: "vienna-siege-withdrawal",
        detail: "The Ottoman army withdraws from Vienna"
      }));
      authorityEvents.push(adjustSovereignAuthority(memory, "poland-lithuania", 0.5, {
        simMinute: VIENNA_SIEGE_AUTHORITY_MINUTE,
        source: "vienna-frontier-holds",
        detail: "The Central European frontier holds"
      }));
    }
  }

  let guard = 0;
  while (currentMinute >= memory.nextSubjectReviewMinute && guard < MAX_CATCH_UP_REVIEWS) {
    const reviewMinute = memory.nextSubjectReviewMinute;
    const candidate = chooseSubjectAuthorityEvent(memory, diplomacy, reviewMinute);
    if (candidate) {
      const result = enactSubjectAuthorityEvent(memory, diplomacy, candidate, reviewMinute);
      authorityEvents.push(...result.authorityEvents);
      diplomacyEvents.push(...result.diplomacyEvents);
    }
    memory.sequence += 1;
    memory.nextSubjectReviewMinute = reviewMinute + subjectReviewInterval(memory, memory.sequence);
    guard += 1;
  }
  if (guard >= MAX_CATCH_UP_REVIEWS && currentMinute >= memory.nextSubjectReviewMinute) {
    memory.nextSubjectReviewMinute = currentMinute + subjectReviewInterval(memory, memory.sequence + 1);
  }
  memory.lastUpdateMinute = currentMinute;
  return Object.freeze({
    authorityEvents: Object.freeze(authorityEvents),
    diplomacyEvents: Object.freeze(diplomacyEvents)
  });
}

export function recordEnglishReformationAuthority(memory, simMinute) {
  validateSovereignAuthority(memory);
  assertMinute(simMinute, "English Reformation authority");
  if (memory.englishReformationApplied) return Object.freeze([]);
  memory.englishReformationApplied = true;
  return Object.freeze([
    adjustPapalAuthority(memory, -12, {
      simMinute,
      source: "english-reformation",
      detail: "The English crown breaks with Rome"
    }),
    adjustSovereignAuthority(memory, "england", 10, {
      simMinute,
      source: "english-reformation",
      detail: "The crown assumes ecclesiastical supremacy"
    })
  ]);
}

export function recordNavalAuthorityOutcome(memory, {
  winnerFactionId,
  loserFactionId,
  simMinute,
  sunk = false,
  source = "naval-combat"
}) {
  validateSovereignAuthority(memory);
  assertMinute(simMinute, "naval authority outcome");
  if (!isSovereignFaction(winnerFactionId) || !isSovereignFaction(loserFactionId) ||
      winnerFactionId === loserFactionId) {
    return Object.freeze([]);
  }
  const winnerDelta = sunk ? 0.08 : 0.05;
  const loserDelta = sunk ? -0.12 : -0.08;
  return Object.freeze([
    adjustSovereignAuthority(memory, winnerFactionId, winnerDelta, {
      simMinute,
      source,
      detail: `${factionById(loserFactionId).shortName} ship ${sunk ? "sunk" : "forced to surrender"}`
    }),
    adjustSovereignAuthority(memory, loserFactionId, loserDelta, {
      simMinute,
      source,
      detail: `${factionById(loserFactionId).shortName} ship ${sunk ? "lost" : "surrendered"}`
    })
  ]);
}

export function recordPortCaptureAuthority(memory, {
  winnerFactionId,
  loserFactionId,
  cityName,
  simMinute,
  capital = false
}) {
  validateSovereignAuthority(memory);
  assertMinute(simMinute, "port-capture authority");
  if (!isSovereignFaction(winnerFactionId) || !isSovereignFaction(loserFactionId) ||
      winnerFactionId === loserFactionId) {
    return Object.freeze([]);
  }
  const events = [
    adjustSovereignAuthority(memory, winnerFactionId, capital ? 4 : 1.5, {
      simMinute,
      source: capital ? "capital-captured" : "port-captured",
      detail: cityName
    }),
    adjustSovereignAuthority(memory, loserFactionId, capital ? -6 : -2.25, {
      simMinute,
      source: capital ? "capital-lost" : "port-lost",
      detail: cityName
    })
  ];
  if (capital && cityName === "Vienna") {
    if (winnerFactionId === "ottoman") {
      events.push(adjustSovereignAuthority(memory, "poland-lithuania", -1.5, {
        simMinute,
        source: "vienna-falls",
        detail: "The Habsburg frontier collapses"
      }));
    } else if (loserFactionId === "ottoman") {
      events.push(adjustSovereignAuthority(memory, "poland-lithuania", 1, {
        simMinute,
        source: "vienna-relieved",
        detail: "The Ottoman advance is checked"
      }));
    }
  }
  return Object.freeze(events);
}

export function recordColonyAuthority(memory, factionId, cityName, simMinute) {
  if (!isSovereignFaction(factionId)) return null;
  return adjustSovereignAuthority(memory, factionId, 1.25, {
    simMinute,
    source: "colony-established",
    detail: cityName
  });
}

export function recordPeaceTreatyAuthority(memory, {
  winnerFactionId,
  loserFactionId,
  simMinute,
  detail
}) {
  validateSovereignAuthority(memory);
  assertMinute(simMinute, "peace-treaty authority");
  if (!isSovereignFaction(winnerFactionId) || !isSovereignFaction(loserFactionId) ||
      winnerFactionId === loserFactionId) {
    return Object.freeze([]);
  }
  return Object.freeze([
    adjustSovereignAuthority(memory, winnerFactionId, 1, {
      simMinute,
      source: "favorable-peace",
      detail
    }),
    adjustSovereignAuthority(memory, loserFactionId, -0.75, {
      simMinute,
      source: "unfavorable-peace",
      detail
    })
  ]);
}

export function recordCourtMissionAuthority(memory, factionId, simMinute, detail) {
  return adjustSovereignAuthority(memory, factionId, 1.4, {
    simMinute,
    source: "court-commission-completed",
    detail
  });
}

export function recordPapalMissionAuthority(memory, simMinute, detail) {
  return adjustPapalAuthority(memory, 1.5, {
    simMinute,
    source: "papal-commission-completed",
    detail
  });
}

export function recordProtestantMissionAuthority(memory, factionId, simMinute, detail) {
  const events = [adjustPapalAuthority(memory, -0.8, {
    simMinute,
    source: "reformation-mission-completed",
    detail
  })];
  if (isSovereignFaction(factionId)) {
    events.push(adjustSovereignAuthority(memory, factionId, 0.5, {
      simMinute,
      source: "reformation-mission-completed",
      detail
    }));
  }
  return Object.freeze(events);
}

function chooseSubjectAuthorityEvent(memory, diplomacy, simMinute) {
  const candidates = [];
  for (const relationship of Object.values(diplomacy.suzerainties.byVassalId)) {
    const subjectId = relationship.vassalFactionId;
    const suzerainId = relationship.suzerainFactionId;
    const relation = rawWorldDiplomacyBetween(diplomacy, subjectId, suzerainId);
    const relationCohesion = relation === DIPLOMACY_ALLY ? 22
      : relation === DIPLOMACY_FRIENDLY ? 12
        : relation === DIPLOMACY_HOSTILE ? -24
          : relation === DIPLOMACY_WAR ? -40
            : 0;
    const cohesion = memory.scores[suzerainId] - memory.scores[subjectId] + relationCohesion;
    if (cohesion <= -18) {
      const kind = (relation === DIPLOMACY_HOSTILE || relation === DIPLOMACY_WAR || cohesion <= -45)
        ? "rebel"
        : "loosen";
      candidates.push({ relationship, kind, weight: Math.abs(cohesion + 12) });
    }
    if (cohesion >= 28 && [DIPLOMACY_FRIENDLY, DIPLOMACY_ALLY].includes(relation) &&
        [SUZERAINTY_KIND_TRIBUTARY, SUZERAINTY_KIND_AUTONOMOUS_VASSAL].includes(relationship.kind)) {
      candidates.push({ relationship, kind: "tighten", weight: cohesion - 18 });
    }
  }
  return weightedChoice(candidates, authorityRandom(memory, memory.sequence, `subject|${simMinute}`));
}

function enactSubjectAuthorityEvent(memory, diplomacy, candidate, simMinute) {
  const relationship = candidate.relationship;
  const subjectId = relationship.vassalFactionId;
  const suzerainId = relationship.suzerainFactionId;
  const diplomacyEvents = [];
  const authorityEvents = [];
  if (candidate.kind === "rebel") {
    diplomacyEvents.push(...declareDiplomaticWar(
      diplomacy,
      subjectId,
      suzerainId,
      simMinute,
      { eventReason: "authority-rebellion" }
    ));
    authorityEvents.push(adjustSovereignAuthority(memory, suzerainId, -1.25, {
      simMinute,
      source: "subject-rebellion",
      detail: factionById(subjectId).shortName
    }));
    authorityEvents.push(adjustSovereignAuthority(memory, subjectId, 0.75, {
      simMinute,
      source: "subject-rebellion",
      detail: `Defied ${factionById(suzerainId).shortName}`
    }));
  } else if (candidate.kind === "loosen") {
    const nextKind = looserSuzeraintyKind(relationship.kind);
    if (nextKind === null) {
      diplomacyEvents.push(releaseDiplomaticVassal(diplomacy, {
        vassalFactionId: subjectId,
        simMinute,
        relation: DIPLOMACY_NEUTRAL,
        source: "authority-independence"
      }));
    } else {
      diplomacyEvents.push(establishDiplomaticSuzerainty(diplomacy, {
        vassalFactionId: subjectId,
        suzerainFactionId: suzerainId,
        kind: nextKind,
        simMinute,
        source: "authority-loosening"
      }));
    }
    authorityEvents.push(adjustSovereignAuthority(memory, suzerainId, -0.6, {
      simMinute,
      source: "subject-ties-loosened",
      detail: factionById(subjectId).shortName
    }));
  } else if (candidate.kind === "tighten") {
    const nextKind = relationship.kind === SUZERAINTY_KIND_TRIBUTARY
      ? SUZERAINTY_KIND_AUTONOMOUS_VASSAL
      : SUZERAINTY_KIND_VASSAL;
    diplomacyEvents.push(establishDiplomaticSuzerainty(diplomacy, {
      vassalFactionId: subjectId,
      suzerainFactionId: suzerainId,
      kind: nextKind,
      simMinute,
      source: "authority-consolidation"
    }));
    authorityEvents.push(adjustSovereignAuthority(memory, suzerainId, 0.6, {
      simMinute,
      source: "subject-ties-tightened",
      detail: factionById(subjectId).shortName
    }));
  } else {
    throw new Error(`Unknown authority subject event: ${candidate.kind}`);
  }
  return Object.freeze({ authorityEvents, diplomacyEvents: diplomacyEvents.filter(Boolean) });
}

function looserSuzeraintyKind(kind) {
  if (kind === SUZERAINTY_KIND_PERSONAL_UNION || kind === SUZERAINTY_KIND_VASSAL) {
    return SUZERAINTY_KIND_AUTONOMOUS_VASSAL;
  }
  if (kind === SUZERAINTY_KIND_AUTONOMOUS_VASSAL) return SUZERAINTY_KIND_TRIBUTARY;
  if (kind === SUZERAINTY_KIND_TRIBUTARY) return null;
  throw new Error(`Unknown suzerainty kind: ${kind}`);
}

function adjustAuthorityValue(memory, subjectId, delta, { simMinute, source, detail }) {
  assertAuthorityDelta(delta);
  assertMinute(simMinute, "authority event");
  assertSource(source);
  if (detail !== null && (typeof detail !== "string" || detail.trim() === "")) {
    throw new Error("Authority event detail must be null or non-empty text");
  }
  const before = subjectId === "papacy" ? memory.papal : memory.scores[subjectId];
  const after = roundHundredth(clamp(before + delta, AUTHORITY_MIN, AUTHORITY_MAX));
  const event = Object.freeze({
    id: `authority-${memory.sequence}-${memory.history.length}-${simMinute}-${subjectId}-${source}`,
    subjectId,
    before,
    after,
    delta: roundHundredth(after - before),
    simMinute,
    source,
    detail
  });
  if (subjectId === "papacy") memory.papal = after;
  else memory.scores[subjectId] = after;
  memory.history.unshift(event);
  if (memory.history.length > AUTHORITY_HISTORY_LIMIT) memory.history.length = AUTHORITY_HISTORY_LIMIT;
  return event;
}

function validateAuthorityEvent(event) {
  if (!event || typeof event !== "object" || typeof event.id !== "string" || event.id === "") {
    throw new Error("Invalid authority history event");
  }
  if (event.subjectId !== "papacy") assertSovereignFaction(event.subjectId);
  assertAuthorityScore(event.before, "authority event before");
  assertAuthorityScore(event.after, "authority event after");
  if (!Number.isFinite(event.delta)) {
    throw new Error(`Invalid recorded authority change: ${event.delta}`);
  }
  assertMinute(event.simMinute, "authority history event");
  assertSource(event.source);
}

function subjectReviewInterval(memory, sequence) {
  const span = SUBJECT_REVIEW_MAX_DAYS - SUBJECT_REVIEW_MIN_DAYS;
  const days = SUBJECT_REVIEW_MIN_DAYS + authorityRandom(memory, sequence, "interval") * span;
  return Math.round(days * MINUTES_PER_DAY);
}

function authorityRandom(memory, sequence, salt) {
  return hashString32(`${memory.seed}|${sequence}|${salt}`) / 0x100000000;
}

function weightedChoice(candidates, roll) {
  const eligible = candidates.filter(({ weight }) => Number.isFinite(weight) && weight > 0);
  const total = eligible.reduce((sum, { weight }) => sum + weight, 0);
  if (total <= 0) return null;
  let target = roll * total;
  for (const candidate of eligible) {
    target -= candidate.weight;
    if (target <= 0) return candidate;
  }
  return eligible.at(-1) || null;
}

function isSovereignFaction(factionId) {
  return typeof factionId === "string" && factionId !== NEUTRAL_FACTION_ID &&
    factionId !== PIRATE_FACTION_ID && SOVEREIGN_FACTIONS.some(({ id }) => id === factionId);
}

function assertSovereignFaction(factionId) {
  assertFactionId(factionId);
  if (!isSovereignFaction(factionId)) {
    throw new Error(`Authority requires a sovereign faction: ${factionId}`);
  }
  return factionId;
}

function assertAuthorityScore(score, label) {
  if (!Number.isFinite(score) || score < AUTHORITY_MIN || score > AUTHORITY_MAX) {
    throw new Error(`Invalid ${label} authority: ${score}`);
  }
}

function assertAuthorityDelta(delta) {
  if (!Number.isFinite(delta) || delta === 0) throw new Error(`Invalid authority change: ${delta}`);
}

function assertMinute(minute, label) {
  if (!Number.isFinite(minute) || minute < 0) throw new Error(`Invalid ${label} minute: ${minute}`);
}

function assertSeedKey(seedKey) {
  if (typeof seedKey !== "string" || seedKey.trim() === "") {
    throw new Error("Sovereign authority requires a seed key");
  }
}

function assertSource(source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Authority event requires a source");
  }
}

function roundHundredth(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
