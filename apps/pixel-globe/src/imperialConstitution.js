import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  assertFactionId,
  factionById
} from "./factions.js";
import {
  IMPERIAL_ESTATES_1522,
  imperialCircleMembers,
  imperialEstateForCityId,
  imperialEstateForFaction,
  isImperialMemberFaction
} from "./imperialEstates.js";
import { gameMinuteForDate, rulerAtMinute, rulerChangesBetween } from "./rulers.js";

export const IMPERIAL_CONSTITUTION_VERSION = 4;
export const IMPERIAL_HISTORY_LIMIT = 40;
export const IMPERIAL_AUTHORITY_MIN = 0;
export const IMPERIAL_AUTHORITY_MAX = 100;
export const IMPERIAL_ELECTION_CONVENED_MINUTE = gameMinuteForDate(1530, 6, 20);
export const IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE = gameMinuteForDate(1531, 1, 5);
export const IMPERIAL_SUCCESSION_ELECTION_DELAY_DAYS = 45;

export const IMPERIAL_ELECTION_OFFICE_EMPEROR = "emperor";
export const IMPERIAL_ELECTION_OFFICE_KING_OF_ROMANS = "king-of-romans";

const IMPERIAL_ELECTION_OFFICES = new Set([
  IMPERIAL_ELECTION_OFFICE_EMPEROR,
  IMPERIAL_ELECTION_OFFICE_KING_OF_ROMANS
]);

const IMPERIAL_PUBLIC_EVENT_KINDS = new Set([
  "election-convened",
  "election",
  "king-of-romans-succeeds",
  "imperial-vacancy",
  "king-of-romans-vacancy"
]);

const FOUNDATIONAL_ELECTION_CANDIDATE_IDS = Object.freeze([
  "bohemia",
  "france",
  "palatinate",
  "electoral-saxony",
  "brandenburg"
]);

const SUCCESSION_ELECTION_CANDIDATE_IDS = Object.freeze([
  "habsburg",
  "bohemia",
  "france",
  "palatinate",
  "electoral-saxony",
  "brandenburg",
  "ducal-saxony"
]);

const DIPLOMACY_ELECTION_SCORE = Object.freeze({
  [DIPLOMACY_ALLY]: 22,
  [DIPLOMACY_FRIENDLY]: 10,
  [DIPLOMACY_NEUTRAL]: 0,
  [DIPLOMACY_HOSTILE]: -18,
  [DIPLOMACY_WAR]: -50
});

export const IMPERIAL_RESOLUTION_KINDS = Object.freeze([
  "imperial-ban",
  "mediation",
  "sanctions",
  "taxation",
  "imperial-defence",
  "imperial-war"
]);

const RESOLUTION_RULES = Object.freeze({
  "imperial-ban": Object.freeze({ authorityCost: 8, minimumSupport: 4 }),
  mediation: Object.freeze({ authorityCost: 3, minimumSupport: 3 }),
  sanctions: Object.freeze({ authorityCost: 6, minimumSupport: 4 }),
  taxation: Object.freeze({ authorityCost: 5, minimumSupport: 5 }),
  "imperial-defence": Object.freeze({ authorityCost: 6, minimumSupport: 5 }),
  "imperial-war": Object.freeze({ authorityCost: 12, minimumSupport: 6 })
});

const ELECTOR_FACTION_IDS = Object.freeze(IMPERIAL_ESTATES_1522
  .filter((estate) => estate.electorId !== null)
  .map((estate) => estate.factionId));

const INITIAL_CHARLES_SUPPORT = Object.freeze({
  mainz: 74,
  "cologne-electorate": 68,
  trier: 64,
  palatinate: 58,
  bohemia: 70,
  "electoral-saxony": 52,
  brandenburg: 60
});

const INITIAL_FERDINAND_SUPPORT = Object.freeze({
  mainz: 78,
  "cologne-electorate": 74,
  trier: 72,
  palatinate: 61,
  bohemia: 94,
  "electoral-saxony": 42,
  brandenburg: 58
});

const INITIAL_SAXON_SUPPORT = Object.freeze({
  mainz: 26,
  "cologne-electorate": 24,
  trier: 23,
  palatinate: 44,
  bohemia: 30,
  "electoral-saxony": 92,
  brandenburg: 56
});

export function createImperialConstitution({ startMinute = 0 } = {}) {
  assertMinute(startMinute, "Imperial constitution start minute");
  const cityReligions = Object.fromEntries(IMPERIAL_ESTATES_1522.flatMap((estate) => (
    estate.cityIds.map((cityId) => [cityId, "roman-catholic"])
  )));
  return validateImperialConstitution({
    version: IMPERIAL_CONSTITUTION_VERSION,
    startMinute,
    lastUpdateMinute: startMinute,
    emperorFactionId: "burgundian-netherlands",
    emperorRulerId: rulerAtMinute("burgundian-netherlands", startMinute).id,
    emperorRulerName: rulerAtMinute("burgundian-netherlands", startMinute).name,
    emperorOfficeVacant: false,
    kingOfRomans: null,
    pendingElection: null,
    foundationalElectionResolved: false,
    authority: 46,
    electionSequence: 0,
    electors: Object.fromEntries(ELECTOR_FACTION_IDS.map((factionId) => [
      factionId,
      {
        factionId,
        voteFactionId: "burgundian-netherlands",
        supportByCandidateId: {
          "burgundian-netherlands": INITIAL_CHARLES_SUPPORT[factionId],
          habsburg: INITIAL_FERDINAND_SUPPORT[factionId],
          bohemia: INITIAL_FERDINAND_SUPPORT[factionId],
          france: Math.max(8, 100 - INITIAL_CHARLES_SUPPORT[factionId] - 18),
          "electoral-saxony": INITIAL_SAXON_SUPPORT[factionId],
          palatinate: factionId === "palatinate" ? 86 : 34,
          brandenburg: factionId === "brandenburg" ? 88 : 31
        }
      }
    ])),
    religiousBlocByFactionId: Object.fromEntries(IMPERIAL_ESTATES_1522.map((estate) => [
      estate.factionId,
      estate.factionId === "electoral-saxony" ? "reform-sympathetic" : "catholic"
    ])),
    cityReligions,
    resolutions: [],
    bansByFactionId: {},
    history: []
  });
}

export function migrateImperialConstitution(memory, { startMinute = 0 } = {}) {
  if (memory == null) return createImperialConstitution({ startMinute });
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Imperial constitution migration requires an object");
  }
  if (![1, 2, 3, IMPERIAL_CONSTITUTION_VERSION].includes(memory.version)) {
    throw new Error(`Unsupported Imperial constitution version: ${memory.version ?? "missing"}`);
  }
  const initial = createImperialConstitution({ startMinute });
  const migratedFromV1 = memory.version === 1;
  const migratedFromCombinedHabsburg = memory.version < 3;
  const charlesHeldOffice = migratedFromCombinedHabsburg &&
    memory.emperorFactionId === "habsburg";
  const emperorFactionId = charlesHeldOffice
    ? "burgundian-netherlands"
    : memory.emperorFactionId;
  const emperorRuler = rulerAtMinute(emperorFactionId, memory.lastUpdateMinute);
  return validateImperialConstitution({
    ...initial,
    ...memory,
    version: IMPERIAL_CONSTITUTION_VERSION,
    emperorFactionId,
    emperorRulerId: memory.emperorRulerId || emperorRuler.id,
    emperorRulerName: migratedFromV1
      ? emperorRuler.name
      : memory.emperorRulerName,
    emperorOfficeVacant: migratedFromV1 ? false : memory.emperorOfficeVacant,
    kingOfRomans: migratedFromV1 || !memory.kingOfRomans ? null : {
      ...memory.kingOfRomans,
      rulerId: memory.kingOfRomans.rulerId || rulerAtMinute(
        memory.kingOfRomans.factionId,
        memory.kingOfRomans.electedMinute
      ).id
    },
    pendingElection: migratedFromV1 ? null : memory.pendingElection,
    foundationalElectionResolved: migratedFromV1
      ? memory.electionSequence > 0 || !charlesHeldOffice
      : memory.foundationalElectionResolved,
    electors: Object.fromEntries(ELECTOR_FACTION_IDS.map((factionId) => [
      factionId,
      {
        ...initial.electors[factionId],
        ...(memory.electors?.[factionId] || {}),
        voteFactionId: migratedFromCombinedHabsburg &&
          memory.electionSequence === 0 &&
          memory.electors?.[factionId]?.voteFactionId === "habsburg"
          ? "burgundian-netherlands"
          : memory.electors?.[factionId]?.voteFactionId || initial.electors[factionId].voteFactionId,
        supportByCandidateId: {
          ...initial.electors[factionId].supportByCandidateId,
          ...(memory.electors?.[factionId]?.supportByCandidateId || {}),
          ...(migratedFromCombinedHabsburg &&
            memory.electors?.[factionId]?.supportByCandidateId?.habsburg !== undefined
            ? {
                "burgundian-netherlands": memory.electors[factionId].supportByCandidateId.habsburg,
                habsburg: INITIAL_FERDINAND_SUPPORT[factionId]
              }
            : {})
        }
      }
    ])),
    religiousBlocByFactionId: {
      ...initial.religiousBlocByFactionId,
      ...memory.religiousBlocByFactionId
    },
    cityReligions: { ...initial.cityReligions, ...memory.cityReligions },
    bansByFactionId: memory.bansByFactionId || {},
    resolutions: memory.resolutions || [],
    history: memory.history || []
  });
}

export function validateImperialConstitution(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== IMPERIAL_CONSTITUTION_VERSION) {
    throw new Error(`Unsupported Imperial constitution version: ${memory?.version ?? "missing"}`);
  }
  assertMinute(memory.startMinute, "Imperial constitution start minute");
  assertMinute(memory.lastUpdateMinute, "Imperial constitution update minute");
  if (memory.lastUpdateMinute < memory.startMinute) {
    throw new Error("Imperial constitution update precedes its start");
  }
  assertFactionId(memory.emperorFactionId);
  if (typeof memory.emperorRulerId !== "string" || memory.emperorRulerId.trim() === "") {
    throw new Error("Imperial constitution is missing the Emperor's id");
  }
  if (typeof memory.emperorRulerName !== "string" || memory.emperorRulerName.trim() === "") {
    throw new Error("Imperial constitution is missing the Emperor's name");
  }
  if (typeof memory.emperorOfficeVacant !== "boolean") {
    throw new Error("Imperial constitution is missing the Imperial vacancy state");
  }
  if (typeof memory.foundationalElectionResolved !== "boolean") {
    throw new Error("Imperial constitution is missing the 1531 election state");
  }
  validateKingOfRomans(memory.kingOfRomans);
  validatePendingElection(memory.pendingElection);
  assertAuthority(memory.authority);
  if (!Number.isInteger(memory.electionSequence) || memory.electionSequence < 0) {
    throw new Error(`Invalid Imperial election sequence: ${memory.electionSequence}`);
  }
  if (!memory.electors || Object.keys(memory.electors).length !== ELECTOR_FACTION_IDS.length) {
    throw new Error("Imperial constitution must contain the seven electors");
  }
  for (const factionId of ELECTOR_FACTION_IDS) validateElector(memory.electors[factionId], factionId);
  if (!memory.religiousBlocByFactionId || !memory.cityReligions || !memory.bansByFactionId) {
    throw new Error("Imperial constitution is missing Estate, city, or ban state");
  }
  for (const estate of IMPERIAL_ESTATES_1522) {
    if (!["catholic", "reform-sympathetic", "mixed", "lutheran"].includes(
      memory.religiousBlocByFactionId[estate.factionId]
    )) {
      throw new Error(`Invalid Imperial religious bloc: ${estate.factionId}`);
    }
    for (const cityId of estate.cityIds) {
      if (!["roman-catholic", "mixed", "lutheran"].includes(memory.cityReligions[cityId])) {
        throw new Error(`Invalid Imperial city religion: ${cityId}`);
      }
    }
  }
  for (const [factionId, ban] of Object.entries(memory.bansByFactionId)) {
    assertFactionId(factionId);
    validateBan(ban, factionId);
  }
  if (!Array.isArray(memory.resolutions)) throw new Error("Imperial resolutions must be an array");
  for (const resolution of memory.resolutions) validateResolution(resolution);
  if (!Array.isArray(memory.history) || memory.history.length > IMPERIAL_HISTORY_LIMIT) {
    throw new Error("Invalid Imperial constitution history");
  }
  return memory;
}

export function holdImperialElection(memory, {
  candidateFactionIds,
  simMinute,
  source = "imperial-election",
  office = IMPERIAL_ELECTION_OFFICE_EMPEROR,
  authorityForCandidate = null,
  relationBetween = defaultCandidateRelation
}) {
  validateImperialConstitution(memory);
  assertMinute(simMinute, "Imperial election minute");
  if (!IMPERIAL_ELECTION_OFFICES.has(office)) {
    throw new Error(`Unknown Imperial election office: ${office}`);
  }
  if (!Array.isArray(candidateFactionIds) || candidateFactionIds.length < 2) {
    throw new Error("Imperial election requires at least two candidates");
  }
  const candidates = [...new Set(candidateFactionIds.map(assertFactionId))];
  if (candidates.length < 2) throw new Error("Imperial election requires two distinct candidates");
  if (authorityForCandidate !== null && typeof authorityForCandidate !== "function" ||
      typeof relationBetween !== "function") {
    throw new Error("Imperial election requires authority and diplomacy resolvers");
  }
  const candidateRulers = Object.fromEntries(candidates.map((factionId) => {
    const candidateRuler = rulerAtMinute(factionId, simMinute);
    if (!candidateRuler) throw new Error(`Imperial candidate has no ruler: ${factionId}`);
    return [factionId, candidateRuler];
  }));
  const authorityResolver = authorityForCandidate || ((factionId) => candidateRulers[factionId].authority);
  const scores = Object.fromEntries(ELECTOR_FACTION_IDS.map((electorId) => [
    electorId,
    Object.fromEntries(candidates.map((candidateId) => [
      candidateId,
      electionScore(memory, electorId, candidateId, candidateRulers[candidateId], {
        authorityForCandidate: authorityResolver,
        relationBetween
      })
    ]))
  ]));
  const firstBallot = Object.fromEntries(candidates.map((candidateId) => [
    candidateId,
    ELECTOR_FACTION_IDS.reduce((sum, electorId) => sum + scores[electorId][candidateId].total, 0)
  ]));
  const runoffCandidateFactionIds = candidates
    .slice()
    .sort((left, right) => firstBallot[right] - firstBallot[left] || left.localeCompare(right))
    .slice(0, 2);
  const tally = Object.fromEntries(runoffCandidateFactionIds.map((factionId) => [factionId, 0]));
  const votes = {};
  for (const electorId of ELECTOR_FACTION_IDS) {
    const elector = memory.electors[electorId];
    const voteFactionId = [...runoffCandidateFactionIds].sort((left, right) => {
      const scoreDifference = scores[electorId][right].total - scores[electorId][left].total;
      if (scoreDifference !== 0) return scoreDifference;
      const nominationDifference = firstBallot[right] - firstBallot[left];
      if (nominationDifference !== 0) return nominationDifference;
      return left.localeCompare(right);
    })[0];
    elector.voteFactionId = voteFactionId;
    votes[electorId] = voteFactionId;
    tally[voteFactionId] += 1;
  }
  const winnerFactionId = [...runoffCandidateFactionIds].sort((left, right) => (
    tally[right] - tally[left] ||
    firstBallot[right] - firstBallot[left] ||
    left.localeCompare(right)
  ))[0];
  const previousEmperorFactionId = memory.emperorFactionId;
  if (office === IMPERIAL_ELECTION_OFFICE_EMPEROR) {
    memory.emperorFactionId = winnerFactionId;
    memory.emperorRulerId = candidateRulers[winnerFactionId].id;
    memory.emperorRulerName = candidateRulers[winnerFactionId].name;
    memory.emperorOfficeVacant = false;
    memory.kingOfRomans = null;
  } else {
    memory.kingOfRomans = Object.freeze({
      factionId: winnerFactionId,
      rulerId: candidateRulers[winnerFactionId].id,
      rulerName: candidateRulers[winnerFactionId].name,
      electedMinute: simMinute
    });
  }
  memory.electionSequence += 1;
  if (simMinute <= IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE) {
    memory.foundationalElectionResolved = true;
  }
  memory.lastUpdateMinute = Math.max(memory.lastUpdateMinute, simMinute);
  const event = freezeEvent({
    kind: "election",
    simMinute,
    source,
    office,
    previousEmperorFactionId,
    emperorFactionId: memory.emperorFactionId,
    winnerFactionId,
    winnerRulerId: candidateRulers[winnerFactionId].id,
    winnerRulerName: candidateRulers[winnerFactionId].name,
    candidateFactionIds: Object.freeze(candidates),
    runoffCandidateFactionIds: Object.freeze(runoffCandidateFactionIds),
    firstBallot: Object.freeze(firstBallot),
    scores: freezeElectionScores(scores),
    votes: Object.freeze(votes),
    tally: Object.freeze(tally)
  });
  recordHistory(memory, event);
  return event;
}

export function nextImperialPoliticsMinute(memory) {
  validateImperialConstitution(memory);
  const dueMinutes = [];
  if (!memory.foundationalElectionResolved && memory.pendingElection === null) {
    dueMinutes.push(Math.max(memory.lastUpdateMinute, IMPERIAL_ELECTION_CONVENED_MINUTE));
  }
  if (memory.pendingElection) dueMinutes.push(memory.pendingElection.electionMinute);
  const nextOfficeChange = nextTrackedRulerChange(memory);
  if (nextOfficeChange) dueMinutes.push(nextOfficeChange.fromMinute);
  return dueMinutes.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...dueMinutes);
}

export function advanceImperialConstitution(memory, currentMinute, {
  authorityForCandidate = null,
  relationBetween = defaultCandidateRelation
} = {}) {
  validateImperialConstitution(memory);
  assertMinute(currentMinute, "Imperial politics minute");
  if (currentMinute < memory.lastUpdateMinute) {
    throw new Error(`Imperial politics cannot move backward: ${currentMinute} < ${memory.lastUpdateMinute}`);
  }
  if (authorityForCandidate !== null && typeof authorityForCandidate !== "function" ||
      typeof relationBetween !== "function") {
    throw new Error("Imperial politics requires authority and diplomacy resolvers");
  }
  const events = [];
  let guard = 0;
  while (nextImperialPoliticsMinute(memory) <= currentMinute && guard < 20) {
    const eventMinute = nextImperialPoliticsMinute(memory);
    const trackedChange = nextTrackedRulerChange(memory);
    if (trackedChange?.fromMinute === eventMinute) {
      const event = handleTrackedRulerChange(memory, trackedChange);
      if (event) events.push(event);
    } else if (memory.pendingElection?.electionMinute === eventMinute) {
      const pending = memory.pendingElection;
      memory.pendingElection = null;
      const election = holdImperialElection(memory, {
        candidateFactionIds: pending.candidateFactionIds,
        simMinute: eventMinute,
        source: pending.source,
        office: pending.office,
        authorityForCandidate: authorityForCandidate || (
          (factionId) => rulerAtMinute(factionId, eventMinute).authority
        ),
        relationBetween
      });
      if (pending.foundational === true) memory.foundationalElectionResolved = true;
      events.push(election);
    } else if (!memory.foundationalElectionResolved && memory.pendingElection === null) {
      events.push(conveneImperialElection(memory, {
        office: IMPERIAL_ELECTION_OFFICE_KING_OF_ROMANS,
        candidateFactionIds: FOUNDATIONAL_ELECTION_CANDIDATE_IDS,
        convenedMinute: eventMinute,
        electionMinute: Math.max(eventMinute, IMPERIAL_KING_OF_ROMANS_ELECTION_MINUTE),
        source: "1530-king-of-romans-election",
        foundational: true
      }));
    } else {
      throw new Error(`Imperial politics found no event at minute ${eventMinute}`);
    }
    memory.lastUpdateMinute = Math.max(memory.lastUpdateMinute, eventMinute);
    guard += 1;
  }
  if (guard >= 20 && nextImperialPoliticsMinute(memory) <= currentMinute) {
    throw new Error("Imperial politics catch-up exceeded its event limit");
  }
  memory.lastUpdateMinute = currentMinute;
  return Object.freeze(events);
}

export function imperialElectionIsPending(memory) {
  validateImperialConstitution(memory);
  return memory.pendingElection !== null;
}

function conveneImperialElection(memory, {
  office,
  candidateFactionIds,
  convenedMinute,
  electionMinute,
  source,
  foundational = false
}) {
  if (memory.pendingElection !== null) throw new Error("An Imperial election is already pending");
  if (!IMPERIAL_ELECTION_OFFICES.has(office)) throw new Error(`Unknown Imperial election office: ${office}`);
  assertMinute(convenedMinute, "Imperial election convening minute");
  assertMinute(electionMinute, "Imperial election minute");
  if (electionMinute < convenedMinute) throw new Error("Imperial election precedes its convocation");
  const candidates = [...new Set(candidateFactionIds.map(assertFactionId))];
  if (candidates.length < 2) throw new Error("Imperial election convocation requires two candidates");
  const pending = Object.freeze({
    id: `imperial-election-${memory.electionSequence + 1}-${convenedMinute}`,
    office,
    convenedMinute,
    electionMinute,
    candidateFactionIds: Object.freeze(candidates),
    source,
    foundational
  });
  memory.pendingElection = pending;
  const event = freezeEvent({
    kind: "election-convened",
    simMinute: convenedMinute,
    electionId: pending.id,
    office,
    electionMinute,
    candidateFactionIds: pending.candidateFactionIds,
    source
  });
  recordHistory(memory, event);
  return event;
}

function handleTrackedRulerChange(memory, change) {
  if (memory.kingOfRomans &&
      change.factionId === memory.kingOfRomans.factionId &&
      change.previousRuler.id === memory.kingOfRomans.rulerId &&
      !(change.factionId === memory.emperorFactionId &&
        change.previousRuler.id === memory.emperorRulerId)) {
    const previousKingOfRomans = memory.kingOfRomans;
    memory.kingOfRomans = null;
    const event = freezeEvent({
      kind: "king-of-romans-vacancy",
      simMinute: change.fromMinute,
      factionId: previousKingOfRomans.factionId,
      rulerId: previousKingOfRomans.rulerId,
      rulerName: previousKingOfRomans.rulerName,
      source: "ruler-succession"
    });
    recordHistory(memory, event);
    if (memory.pendingElection === null) {
      conveneImperialElection(memory, {
        office: IMPERIAL_ELECTION_OFFICE_KING_OF_ROMANS,
        candidateFactionIds: SUCCESSION_ELECTION_CANDIDATE_IDS,
        convenedMinute: change.fromMinute,
        electionMinute: change.fromMinute + IMPERIAL_SUCCESSION_ELECTION_DELAY_DAYS * 24 * 60,
        source: "king-of-romans-vacancy"
      });
    }
    return event;
  }
  if (change.factionId !== memory.emperorFactionId ||
      change.previousRuler.id !== memory.emperorRulerId) return null;
  if (memory.kingOfRomans !== null) {
    const previousEmperorFactionId = memory.emperorFactionId;
    const successor = memory.kingOfRomans;
    memory.emperorFactionId = successor.factionId;
    memory.emperorRulerId = successor.rulerId;
    memory.emperorRulerName = successor.rulerName;
    memory.emperorOfficeVacant = false;
    memory.kingOfRomans = null;
    const event = freezeEvent({
      kind: "king-of-romans-succeeds",
      simMinute: change.fromMinute,
      previousEmperorFactionId,
      emperorFactionId: successor.factionId,
      emperorRulerId: successor.rulerId,
      emperorRulerName: successor.rulerName,
      source: "ruler-succession"
    });
    recordHistory(memory, event);
    return event;
  }
  memory.emperorOfficeVacant = true;
  const event = freezeEvent({
    kind: "imperial-vacancy",
    simMinute: change.fromMinute,
    previousEmperorFactionId: memory.emperorFactionId,
    previousEmperorRulerId: memory.emperorRulerId,
    previousEmperorRulerName: memory.emperorRulerName,
    source: "ruler-succession"
  });
  recordHistory(memory, event);
  if (memory.pendingElection === null) {
    conveneImperialElection(memory, {
      office: IMPERIAL_ELECTION_OFFICE_EMPEROR,
      candidateFactionIds: SUCCESSION_ELECTION_CANDIDATE_IDS,
      convenedMinute: change.fromMinute,
      electionMinute: change.fromMinute + IMPERIAL_SUCCESSION_ELECTION_DELAY_DAYS * 24 * 60,
      source: "imperial-vacancy"
    });
  }
  return event;
}

function nextTrackedRulerChange(memory) {
  return rulerChangesBetween(memory.lastUpdateMinute, Number.MAX_SAFE_INTEGER).find((change) => (
    (change.factionId === memory.emperorFactionId && change.previousRuler.id === memory.emperorRulerId) ||
    (memory.kingOfRomans !== null && change.factionId === memory.kingOfRomans.factionId &&
      change.previousRuler.id === memory.kingOfRomans.rulerId)
  )) || null;
}

export function adjustElectorSupport(memory, electorFactionId, candidateFactionId, delta, {
  simMinute,
  source = "imperial-politics"
}) {
  validateImperialConstitution(memory);
  const elector = memory.electors[assertFactionId(electorFactionId)];
  if (!elector) throw new Error(`Faction is not an Imperial elector: ${electorFactionId}`);
  const candidateId = assertFactionId(candidateFactionId);
  if (!Number.isFinite(delta) || delta === 0) throw new Error(`Invalid elector support change: ${delta}`);
  assertMinute(simMinute, "Elector support minute");
  const previous = electorSupport(elector, candidateId);
  const next = clamp(Math.round(previous + delta), 0, 100);
  elector.supportByCandidateId[candidateId] = next;
  memory.lastUpdateMinute = Math.max(memory.lastUpdateMinute, simMinute);
  recordHistory(memory, freezeEvent({
    kind: "elector-support",
    simMinute,
    source,
    electorFactionId,
    candidateFactionId: candidateId,
    previous,
    next
  }));
  return next;
}

export function adoptDietResolution(memory, {
  kind,
  sponsorFactionId,
  targetFactionId = null,
  supportingFactionIds,
  simMinute,
  expiresMinute = null,
  scope = "target"
}) {
  validateImperialConstitution(memory);
  const rule = RESOLUTION_RULES[kind];
  if (!rule) throw new Error(`Unknown Imperial Diet resolution: ${kind}`);
  const sponsorId = assertFactionId(sponsorFactionId);
  if (sponsorId !== memory.emperorFactionId && !isImperialMemberFaction(sponsorId)) {
    throw new Error(`Imperial resolution sponsor is not an Estate: ${sponsorId}`);
  }
  const supporters = [...new Set((supportingFactionIds || []).map(assertFactionId))];
  if (supporters.some((factionId) => !isImperialMemberFaction(factionId))) {
    throw new Error("Imperial Diet support may only come from Estates");
  }
  if (supporters.length < rule.minimumSupport) {
    throw new Error(`${kind} requires support from ${rule.minimumSupport} Estates`);
  }
  if (memory.authority < rule.authorityCost) {
    throw new Error(`${kind} requires ${rule.authorityCost} Imperial authority`);
  }
  assertMinute(simMinute, "Imperial resolution minute");
  if (expiresMinute !== null && (!Number.isFinite(expiresMinute) || expiresMinute <= simMinute)) {
    throw new Error(`Invalid Imperial resolution expiry: ${expiresMinute}`);
  }
  const targetId = targetFactionId === null ? null : assertFactionId(targetFactionId);
  if (["imperial-ban", "mediation", "sanctions", "imperial-war"].includes(kind) && targetId === null) {
    throw new Error(`${kind} requires a target faction`);
  }
  const resolution = Object.freeze({
    id: `diet-${memory.history.length + 1}-${simMinute}`,
    kind,
    sponsorFactionId: sponsorId,
    targetFactionId: targetId,
    supportingFactionIds: Object.freeze(supporters.sort()),
    simMinute,
    expiresMinute,
    scope
  });
  memory.authority -= rule.authorityCost;
  memory.lastUpdateMinute = Math.max(memory.lastUpdateMinute, simMinute);
  memory.resolutions.push(resolution);
  if (kind === "imperial-ban") {
    memory.bansByFactionId[targetId] = Object.freeze({
      factionId: targetId,
      imposedMinute: simMinute,
      expiresMinute,
      resolutionId: resolution.id
    });
  }
  recordHistory(memory, freezeEvent({ kind: "diet-resolution", simMinute, resolution }));
  return resolution;
}

export function imperialTargetIsAuthorized(memory, targetFactionId, simMinute = memory?.lastUpdateMinute ?? 0) {
  validateImperialConstitution(memory);
  const targetId = assertFactionId(targetFactionId);
  const ban = memory.bansByFactionId[targetId];
  if (ban && (ban.expiresMinute === null || simMinute < ban.expiresMinute)) return true;
  return activeImperialResolutions(memory, simMinute).some((resolution) => (
    resolution.kind === "imperial-war" && resolution.targetFactionId === targetId
  ));
}

export function imperialDefensePartners(memory, defenderFactionId, attackerFactionId, simMinute) {
  validateImperialConstitution(memory);
  const defenderId = assertFactionId(defenderFactionId);
  const attackerId = assertFactionId(attackerFactionId);
  const defenderEstate = imperialEstateForFaction(defenderId);
  if (!defenderEstate || isImperialMemberFaction(attackerId)) return Object.freeze([]);
  const authorization = activeImperialResolutions(memory, simMinute).find((resolution) => (
    resolution.kind === "imperial-defence" &&
    (resolution.targetFactionId === null || resolution.targetFactionId === defenderId)
  ));
  if (!authorization) return Object.freeze([]);
  const partners = new Set([memory.emperorFactionId]);
  if (authorization.scope === "empire") {
    for (const estate of IMPERIAL_ESTATES_1522) partners.add(estate.factionId);
  } else {
    for (const circleId of defenderEstate.circleIds) {
      for (const factionId of imperialCircleMembers(circleId)) partners.add(factionId);
    }
  }
  partners.delete(defenderId);
  partners.delete(attackerId);
  return Object.freeze([...partners].sort());
}

export function recordImperialReformationOutcome(memory, {
  cityId,
  religionId,
  simMinute,
  source = "reformation"
}) {
  validateImperialConstitution(memory);
  const estate = imperialEstateForCityId(cityId);
  if (!estate) throw new Error(`Reformation outcome requires an Imperial city: ${cityId}`);
  if (!["roman-catholic", "mixed", "lutheran"].includes(religionId)) {
    throw new Error(`Invalid Imperial Reformation religion: ${religionId}`);
  }
  assertMinute(simMinute, "Imperial Reformation minute");
  const previousReligionId = memory.cityReligions[cityId];
  if (previousReligionId === religionId) return null;
  memory.cityReligions[cityId] = religionId;
  const cityReligions = estate.cityIds.map((id) => memory.cityReligions[id]);
  memory.religiousBlocByFactionId[estate.factionId] = cityReligions.every((id) => id === "lutheran")
    ? "lutheran"
    : cityReligions.every((id) => id === "roman-catholic")
      ? "catholic"
      : "mixed";
  const authorityDelta = religionId === "lutheran" ? -3 : religionId === "mixed" ? -1 : 1;
  memory.authority = clamp(memory.authority + authorityDelta, IMPERIAL_AUTHORITY_MIN, IMPERIAL_AUTHORITY_MAX);
  if (memory.electors[estate.factionId]) {
    const elector = memory.electors[estate.factionId];
    const incumbentSupportDelta = religionId === "lutheran" ? -18 : religionId === "mixed" ? -6 : 6;
    const reformSupportDelta = religionId === "lutheran" ? 18 : religionId === "mixed" ? 6 : -4;
    elector.supportByCandidateId[memory.emperorFactionId] = clamp(
      electorSupport(elector, memory.emperorFactionId) + incumbentSupportDelta,
      0,
      100
    );
    elector.supportByCandidateId["electoral-saxony"] = clamp(
      electorSupport(elector, "electoral-saxony") + reformSupportDelta,
      0,
      100
    );
  }
  memory.lastUpdateMinute = Math.max(memory.lastUpdateMinute, simMinute);
  const event = freezeEvent({
    kind: "reformation",
    simMinute,
    source,
    cityId,
    factionId: estate.factionId,
    previousReligionId,
    religionId,
    authorityDelta
  });
  recordHistory(memory, event);
  return event;
}

export function recordImperialReligiousCirculation(memory, {
  cityId,
  simMinute,
  source = "religious-circulation"
}) {
  validateImperialConstitution(memory);
  const estate = imperialEstateForCityId(cityId);
  if (!estate) throw new Error(`Religious circulation requires an Imperial city: ${cityId}`);
  if (memory.cityReligions[cityId] !== "roman-catholic") return null;
  return recordImperialReformationOutcome(memory, {
    cityId,
    religionId: "mixed",
    simMinute,
    source
  });
}

export function activeImperialResolutions(memory, simMinute = memory?.lastUpdateMinute ?? 0) {
  validateImperialConstitution(memory);
  assertMinute(simMinute, "Imperial resolution query minute");
  return Object.freeze(memory.resolutions.filter((resolution) => (
    resolution.expiresMinute === null || simMinute < resolution.expiresMinute
  )));
}

export function imperialPoliticsView(memory, simMinute = memory?.lastUpdateMinute ?? 0) {
  validateImperialConstitution(memory);
  const resolutions = activeImperialResolutions(memory, simMinute);
  const blocCounts = { catholic: 0, "reform-sympathetic": 0, mixed: 0, lutheran: 0 };
  for (const bloc of Object.values(memory.religiousBlocByFactionId)) blocCounts[bloc] += 1;
  return Object.freeze({
    emperorFactionId: memory.emperorFactionId,
    emperorFactionName: factionById(memory.emperorFactionId).shortName,
    emperorRulerId: memory.emperorRulerId,
    emperorRulerName: memory.emperorRulerName,
    emperorOfficeVacant: memory.emperorOfficeVacant,
    kingOfRomans: memory.kingOfRomans,
    pendingElection: memory.pendingElection,
    authority: memory.authority,
    electors: Object.freeze(ELECTOR_FACTION_IDS.map((factionId) => Object.freeze({
      factionId,
      voteFactionId: memory.electors[factionId].voteFactionId,
      emperorSupport: electorSupport(memory.electors[factionId], memory.emperorFactionId),
      religiousBloc: memory.religiousBlocByFactionId[factionId]
    }))),
    religiousBalance: Object.freeze(blocCounts),
    activeResolutions: resolutions,
    activeBans: Object.freeze(Object.values(memory.bansByFactionId).filter((ban) => (
      ban.expiresMinute === null || simMinute < ban.expiresMinute
    )))
  });
}

export function recentImperialEvents(memory, limit = 5) {
  validateImperialConstitution(memory);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`Invalid Imperial history limit: ${limit}`);
  }
  return Object.freeze(memory.history
    .filter((event) => IMPERIAL_PUBLIC_EVENT_KINDS.has(event.kind))
    .slice(-limit)
    .reverse());
}

export function imperialEventNotice(event) {
  if (!event || typeof event !== "object") throw new Error("Imperial notice requires an event");
  if (event.kind === "election-convened") {
    return event.office === IMPERIAL_ELECTION_OFFICE_KING_OF_ROMANS
      ? "THE ELECTORS ARE SUMMONED TO CHOOSE A KING OF THE ROMANS"
      : "THE ELECTORS ARE SUMMONED TO CHOOSE A ROMAN EMPEROR";
  }
  if (event.kind === "election") {
    return event.office === IMPERIAL_ELECTION_OFFICE_KING_OF_ROMANS
      ? `${event.winnerRulerName.toUpperCase()} IS ELECTED KING OF THE ROMANS`
      : `${event.winnerRulerName.toUpperCase()} IS ELECTED ROMAN EMPEROR`;
  }
  if (event.kind === "king-of-romans-succeeds") {
    return `${event.emperorRulerName.toUpperCase()} BECOMES ROMAN EMPEROR`;
  }
  if (event.kind === "imperial-vacancy") return "THE IMPERIAL THRONE FALLS VACANT";
  if (event.kind === "king-of-romans-vacancy") return "THE OFFICE OF KING OF THE ROMANS FALLS VACANT";
  throw new Error(`Imperial event has no public notice: ${event.kind}`);
}

function validateElector(elector, factionId) {
  if (!elector || elector.factionId !== factionId || !elector.supportByCandidateId) {
    throw new Error(`Invalid Imperial elector: ${factionId}`);
  }
  assertFactionId(elector.voteFactionId);
  for (const [candidateFactionId, support] of Object.entries(elector.supportByCandidateId)) {
    assertFactionId(candidateFactionId);
    if (!Number.isInteger(support) || support < 0 || support > 100) {
      throw new Error(`Invalid elector support: ${factionId}/${candidateFactionId}=${support}`);
    }
  }
}

function validateKingOfRomans(kingOfRomans) {
  if (kingOfRomans === null) return;
  if (!kingOfRomans || typeof kingOfRomans !== "object" || Array.isArray(kingOfRomans)) {
    throw new Error("Invalid King of the Romans state");
  }
  assertFactionId(kingOfRomans.factionId);
  if (typeof kingOfRomans.rulerId !== "string" || kingOfRomans.rulerId.trim() === "") {
    throw new Error("King of the Romans is missing a ruler id");
  }
  if (typeof kingOfRomans.rulerName !== "string" || kingOfRomans.rulerName.trim() === "") {
    throw new Error("King of the Romans is missing a ruler name");
  }
  assertMinute(kingOfRomans.electedMinute, "King of the Romans election minute");
}

function validatePendingElection(pending) {
  if (pending === null) return;
  if (!pending || typeof pending !== "object" || Array.isArray(pending)) {
    throw new Error("Invalid pending Imperial election");
  }
  if (typeof pending.id !== "string" || pending.id.trim() === "") {
    throw new Error("Pending Imperial election has no id");
  }
  if (!IMPERIAL_ELECTION_OFFICES.has(pending.office)) {
    throw new Error(`Invalid pending Imperial election office: ${pending.office}`);
  }
  assertMinute(pending.convenedMinute, "Imperial election convening minute");
  assertMinute(pending.electionMinute, "Imperial election minute");
  if (pending.electionMinute < pending.convenedMinute) {
    throw new Error("Pending Imperial election precedes its convocation");
  }
  if (!Array.isArray(pending.candidateFactionIds) || pending.candidateFactionIds.length < 2) {
    throw new Error("Pending Imperial election requires candidates");
  }
  for (const factionId of pending.candidateFactionIds) assertFactionId(factionId);
  if (typeof pending.source !== "string" || typeof pending.foundational !== "boolean") {
    throw new Error("Pending Imperial election is missing its source or foundation state");
  }
}

function validateResolution(resolution) {
  if (!resolution || !IMPERIAL_RESOLUTION_KINDS.includes(resolution.kind)) {
    throw new Error(`Invalid Imperial resolution: ${resolution?.kind ?? "missing"}`);
  }
  assertMinute(resolution.simMinute, "Imperial resolution minute");
  assertFactionId(resolution.sponsorFactionId);
  if (resolution.targetFactionId !== null) assertFactionId(resolution.targetFactionId);
  if (!Array.isArray(resolution.supportingFactionIds)) throw new Error("Imperial resolution has no supporters");
}

function validateBan(ban, factionId) {
  if (!ban || ban.factionId !== factionId) throw new Error(`Invalid Imperial ban: ${factionId}`);
  assertMinute(ban.imposedMinute, "Imperial ban minute");
  if (ban.expiresMinute !== null && ban.expiresMinute <= ban.imposedMinute) {
    throw new Error(`Invalid Imperial ban expiry: ${factionId}`);
  }
}

function electorSupport(elector, candidateFactionId) {
  const recorded = elector.supportByCandidateId[candidateFactionId];
  if (recorded !== undefined) return recorded;
  if (elector.factionId === candidateFactionId) return 55;
  return isImperialMemberFaction(candidateFactionId) ? 35 : 18;
}

function electionScore(memory, electorFactionId, candidateFactionId, candidateRuler, {
  authorityForCandidate,
  relationBetween
}) {
  const elector = memory.electors[electorFactionId];
  const durableSupport = electorSupport(elector, candidateFactionId);
  const authority = authorityForCandidate(candidateFactionId);
  if (!Number.isFinite(authority) || authority < 0 || authority > 100) {
    throw new Error(`Invalid Imperial candidate authority: ${candidateFactionId}=${authority}`);
  }
  const authorityScore = Math.round((authority - 50) * 0.4);
  const relation = relationBetween(electorFactionId, candidateFactionId);
  if (!Object.hasOwn(DIPLOMACY_ELECTION_SCORE, relation)) {
    throw new Error(`Invalid elector-candidate relation: ${electorFactionId}/${candidateFactionId}=${relation}`);
  }
  const diplomacyScore = DIPLOMACY_ELECTION_SCORE[relation];
  const confessionalScore = electionConfessionalScore(
    memory.religiousBlocByFactionId[electorFactionId],
    candidateRuler.religionId
  );
  const estateScore = isImperialMemberFaction(candidateFactionId) ? 5 : -8;
  const selfScore = electorFactionId === candidateFactionId ? 14 : 0;
  return Object.freeze({
    total: durableSupport + authorityScore + diplomacyScore + confessionalScore + estateScore + selfScore,
    durableSupport,
    authority,
    authorityScore,
    relation,
    diplomacyScore,
    confessionalScore,
    estateScore,
    selfScore
  });
}

function electionConfessionalScore(electorBloc, candidateReligionId) {
  const candidateIsCatholic = candidateReligionId === "roman-catholic";
  const candidateIsLutheran = candidateReligionId === "lutheran";
  if (electorBloc === "catholic") return candidateIsCatholic ? 7 : -14;
  if (electorBloc === "lutheran") return candidateIsLutheran ? 10 : candidateIsCatholic ? -12 : -4;
  if (electorBloc === "reform-sympathetic") {
    return candidateIsLutheran ? 8 : candidateIsCatholic ? -3 : 1;
  }
  return candidateIsCatholic || candidateIsLutheran ? 2 : -2;
}

function defaultCandidateRelation(electorFactionId, candidateFactionId) {
  return electorFactionId === candidateFactionId ? DIPLOMACY_ALLY : DIPLOMACY_NEUTRAL;
}

function freezeElectionScores(scores) {
  return Object.freeze(Object.fromEntries(Object.entries(scores).map(([electorId, candidates]) => [
    electorId,
    Object.freeze({ ...candidates })
  ])));
}

function assertAuthority(value) {
  if (!Number.isInteger(value) || value < IMPERIAL_AUTHORITY_MIN || value > IMPERIAL_AUTHORITY_MAX) {
    throw new Error(`Invalid Imperial authority: ${value}`);
  }
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function recordHistory(memory, event) {
  memory.history.push(event);
  if (memory.history.length > IMPERIAL_HISTORY_LIMIT) {
    memory.history.splice(0, memory.history.length - IMPERIAL_HISTORY_LIMIT);
  }
}

function freezeEvent(event) {
  return Object.freeze(event);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
