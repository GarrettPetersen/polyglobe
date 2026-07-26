import {
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
import {
  adjustDiplomaticStance,
  validateWorldDiplomacy,
  worldDiplomacyBetween
} from "./worldDiplomacy.js";
import {
  ENGLISH_REFORMATION_MINUTE,
  rulerAtMinute
} from "./rulers.js";
import {
  isChristianReligion,
  isMuslimReligion,
  isRomanCatholicReligion
} from "./religiousAttitudes.js";

export const PAPAL_POLITICS_VERSION = 1;
export const PAPAL_FACTION_ID = "papal-states";
export const PAPAL_ACTION_FAVOUR = "papal-favour";
export const PAPAL_ACTION_EXCOMMUNICATION = "papal-excommunication";
export const PAPAL_ACTION_CONDEMNATION = "papal-condemnation";
export const PAPAL_ACTION_CRUSADE = "papal-crusade";

const MINUTES_PER_DAY = 24 * 60;
const PAPAL_MIN_ACTION_DAYS = 300;
const PAPAL_MAX_ACTION_DAYS = 480;
const PAPAL_HISTORY_LIMIT = 24;
const MAX_CATCH_UP_ACTIONS = 8;
const PAPAL_ACTION_KINDS = new Set([
  PAPAL_ACTION_FAVOUR,
  PAPAL_ACTION_EXCOMMUNICATION,
  PAPAL_ACTION_CONDEMNATION,
  PAPAL_ACTION_CRUSADE
]);
const SOVEREIGN_FACTIONS = FACTIONS.filter(({ id }) => (
  id !== NEUTRAL_FACTION_ID && id !== PIRATE_FACTION_ID
));

export function createPapalPolitics({ startMinute = 0, seedKey = "papacy" } = {}) {
  assertMinute(startMinute, "papal politics start");
  if (typeof seedKey !== "string" || seedKey.trim() === "") {
    throw new Error("Papal politics requires a seed key");
  }
  const memory = {
    version: PAPAL_POLITICS_VERSION,
    seed: hashString32(`${seedKey}|papacy`),
    sequence: 0,
    startMinute,
    lastUpdateMinute: startMinute,
    nextActionMinute: startMinute,
    englishReformationApplied: false,
    excommunications: {},
    history: []
  };
  memory.nextActionMinute += papalActionIntervalMinutes(memory, 0);
  return validatePapalPolitics(memory);
}

export function migratePapalPolitics(memory, { startMinute = 0, seedKey = "papacy" } = {}) {
  if (memory === undefined || memory === null) return createPapalPolitics({ startMinute, seedKey });
  return validatePapalPolitics(memory);
}

export function validatePapalPolitics(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== PAPAL_POLITICS_VERSION) {
    throw new Error(`Unsupported papal politics version: ${memory?.version ?? "missing"}`);
  }
  if (!Number.isInteger(memory.seed) || memory.seed < 0 || memory.seed > 0xffffffff) {
    throw new Error(`Invalid papal politics seed: ${memory.seed}`);
  }
  if (!Number.isInteger(memory.sequence) || memory.sequence < 0) {
    throw new Error(`Invalid papal politics sequence: ${memory.sequence}`);
  }
  assertMinute(memory.startMinute, "papal politics start");
  assertMinute(memory.lastUpdateMinute, "papal politics update");
  assertMinute(memory.nextActionMinute, "next papal action");
  if (memory.lastUpdateMinute < memory.startMinute || memory.nextActionMinute < memory.startMinute) {
    throw new Error("Papal politics clock precedes its start");
  }
  if (typeof memory.englishReformationApplied !== "boolean") {
    throw new Error("Papal politics requires an English Reformation flag");
  }
  if (!memory.excommunications || typeof memory.excommunications !== "object" ||
      Array.isArray(memory.excommunications)) {
    throw new Error("Papal excommunications must be an object");
  }
  for (const [factionId, entry] of Object.entries(memory.excommunications)) {
    assertFactionId(factionId);
    if (!entry || typeof entry.rulerName !== "string" || entry.rulerName === "") {
      throw new Error(`Invalid papal excommunication for ${factionId}`);
    }
    assertMinute(entry.simMinute, "papal excommunication");
  }
  if (!Array.isArray(memory.history) || memory.history.length > PAPAL_HISTORY_LIMIT) {
    throw new Error("Invalid papal action history");
  }
  for (const action of memory.history) validatePapalAction(action);
  return memory;
}

export function nextPapalPoliticsMinute(memory) {
  validatePapalPolitics(memory);
  return memory.englishReformationApplied
    ? memory.nextActionMinute
    : Math.min(memory.nextActionMinute, ENGLISH_REFORMATION_MINUTE);
}

export function advancePapalPolitics(memory, diplomacy, currentMinute, {
  papalStatesActive = true
} = {}) {
  validatePapalPolitics(memory);
  validateWorldDiplomacy(diplomacy);
  assertMinute(currentMinute, "papal politics current");
  if (currentMinute < memory.lastUpdateMinute) {
    throw new Error(
      `Papal politics cannot move backward: ${currentMinute} < ${memory.lastUpdateMinute}`
    );
  }
  const actions = [];
  const diplomacyEvents = [];
  let englishReformation = false;
  if (!memory.englishReformationApplied && currentMinute >= ENGLISH_REFORMATION_MINUTE) {
    memory.englishReformationApplied = true;
    englishReformation = true;
  }
  let guard = 0;
  while (currentMinute >= memory.nextActionMinute && guard < MAX_CATCH_UP_ACTIONS) {
    const actionMinute = memory.nextActionMinute;
    if (papalStatesActive) {
      const proposal = chooseScheduledPapalAction(memory, diplomacy, actionMinute);
      if (proposal) {
        const result = enactPapalAction(memory, diplomacy, {
          ...proposal,
          simMinute: actionMinute,
          source: "papal-policy"
        });
        actions.push(result.action);
        diplomacyEvents.push(...result.diplomacyEvents);
      }
    }
    memory.sequence += 1;
    memory.nextActionMinute = actionMinute + papalActionIntervalMinutes(memory, memory.sequence);
    guard += 1;
  }
  if (guard >= MAX_CATCH_UP_ACTIONS && currentMinute >= memory.nextActionMinute) {
    memory.nextActionMinute = currentMinute + papalActionIntervalMinutes(memory, memory.sequence + 1);
  }
  memory.lastUpdateMinute = currentMinute;
  return Object.freeze({ actions, diplomacyEvents, englishReformation });
}

export function imposePapalAction(memory, diplomacy, {
  kind,
  targetFactionId,
  simMinute,
  source = "rome-peace-treaty"
}) {
  return enactPapalAction(memory, diplomacy, { kind, targetFactionId, simMinute, source });
}

export function papalExcommunicationTargetCandidates(diplomacy, winnerFactionId, simMinute) {
  validateWorldDiplomacy(diplomacy);
  assertFactionId(winnerFactionId);
  assertMinute(simMinute, "papal treaty target");
  return SOVEREIGN_FACTIONS
    .filter(({ id }) => id !== winnerFactionId && id !== PAPAL_FACTION_ID)
    .map((faction) => ({
      faction,
      ruler: rulerAtMinute(faction.id, simMinute),
      relation: worldDiplomacyBetween(diplomacy, winnerFactionId, faction.id)
    }))
    .filter(({ ruler, relation }) => (
      ruler && isChristianReligion(ruler.religionId) &&
      (relation === DIPLOMACY_WAR || relation === DIPLOMACY_HOSTILE)
    ))
    .sort((left, right) => (
      relationSeverity(right.relation) - relationSeverity(left.relation) ||
      right.ruler.piety - left.ruler.piety ||
      left.faction.id.localeCompare(right.faction.id)
    ))
    .map(({ faction }) => faction.id);
}

export function papalActionNotice(action) {
  validatePapalAction(action);
  const target = factionById(action.targetFactionId);
  if (action.kind === PAPAL_ACTION_FAVOUR) {
    return `${action.popeName.toUpperCase()} ISSUES A BULL IN FAVOUR OF ${target.shortName.toUpperCase()}`;
  }
  if (action.kind === PAPAL_ACTION_EXCOMMUNICATION) {
    return `${action.targetRulerName.toUpperCase()} EXCOMMUNICATED BY ${action.popeName.toUpperCase()}`;
  }
  if (action.kind === PAPAL_ACTION_CONDEMNATION) {
    return `${action.popeName.toUpperCase()} CONDEMNS ${target.shortName.toUpperCase()}`;
  }
  return `${action.popeName.toUpperCase()} PROCLAIMS A CRUSADE AGAINST ${target.shortName.toUpperCase()}`;
}

export function convertEnglishCatholicCharacter(character) {
  if (!character || typeof character !== "object") return character;
  if (character.nationalityId !== "england" || character.religionId !== "roman-catholic") {
    return character;
  }
  return Object.freeze({ ...character, religionId: "anglican" });
}

function enactPapalAction(memory, diplomacy, { kind, targetFactionId, simMinute, source }) {
  validatePapalPolitics(memory);
  validateWorldDiplomacy(diplomacy);
  if (!PAPAL_ACTION_KINDS.has(kind)) throw new Error(`Invalid papal action kind: ${kind}`);
  assertFactionId(targetFactionId);
  if (targetFactionId === PAPAL_FACTION_ID ||
      targetFactionId === PIRATE_FACTION_ID ||
      targetFactionId === NEUTRAL_FACTION_ID) {
    throw new Error(`Invalid papal action target: ${targetFactionId}`);
  }
  assertMinute(simMinute, "papal action");
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Papal action requires a source");
  }
  const pope = rulerAtMinute(PAPAL_FACTION_ID, simMinute);
  const targetRuler = rulerAtMinute(targetFactionId, simMinute);
  if (!pope || !targetRuler) throw new Error("Papal action requires current rulers");
  const direction = kind === PAPAL_ACTION_FAVOUR ? "improve" : "worsen";
  const diplomacyEvents = adjustDiplomaticStance(
    diplomacy,
    PAPAL_FACTION_ID,
    targetFactionId,
    direction,
    simMinute,
    { eventReason: kind }
  );
  const respondingFactionIds = [];
  const responseStrength = papalResponseStrength(kind);
  for (const faction of SOVEREIGN_FACTIONS) {
    if (faction.id === PAPAL_FACTION_ID || faction.id === targetFactionId) continue;
    const ruler = rulerAtMinute(faction.id, simMinute);
    if (!ruler || !isRomanCatholicReligion(ruler.religionId)) continue;
    const roll = papalRandom(
      memory,
      memory.sequence,
      `${kind}|${targetFactionId}|${faction.id}|${simMinute}`
    );
    if (roll >= ruler.piety * pope.piety * responseStrength) continue;
    const events = adjustDiplomaticStance(
      diplomacy,
      faction.id,
      targetFactionId,
      direction,
      simMinute,
      { eventReason: kind }
    );
    if (events.length > 0) {
      respondingFactionIds.push(faction.id);
      diplomacyEvents.push(...events);
    }
  }
  const action = Object.freeze({
    id: `${kind}-${simMinute}-${targetFactionId}`,
    kind,
    targetFactionId,
    targetRulerName: targetRuler.displayName,
    popeName: pope.displayName,
    respondingFactionIds: Object.freeze(respondingFactionIds),
    simMinute,
    source
  });
  if (kind === PAPAL_ACTION_EXCOMMUNICATION) {
    memory.excommunications[targetFactionId] = {
      rulerName: targetRuler.displayName,
      simMinute
    };
  }
  memory.history.unshift(action);
  if (memory.history.length > PAPAL_HISTORY_LIMIT) memory.history.length = PAPAL_HISTORY_LIMIT;
  return Object.freeze({ action, diplomacyEvents });
}

function chooseScheduledPapalAction(memory, diplomacy, simMinute) {
  const candidates = [];
  for (const faction of SOVEREIGN_FACTIONS) {
    if (faction.id === PAPAL_FACTION_ID) continue;
    const ruler = rulerAtMinute(faction.id, simMinute);
    if (!ruler) continue;
    const papalRelation = worldDiplomacyBetween(diplomacy, PAPAL_FACTION_ID, faction.id);
    if (isRomanCatholicReligion(ruler.religionId) &&
        (papalRelation === DIPLOMACY_NEUTRAL || papalRelation === DIPLOMACY_FRIENDLY)) {
      candidates.push({ kind: PAPAL_ACTION_FAVOUR, targetFactionId: faction.id, weight: 2 });
    }
    if (isChristianReligion(ruler.religionId) &&
        (papalRelation === DIPLOMACY_HOSTILE || papalRelation === DIPLOMACY_WAR)) {
      candidates.push({
        kind: PAPAL_ACTION_EXCOMMUNICATION,
        targetFactionId: faction.id,
        weight: isRomanCatholicReligion(ruler.religionId) ? 4 : 2
      });
    } else if (isChristianReligion(ruler.religionId) &&
        !isRomanCatholicReligion(ruler.religionId)) {
      candidates.push({ kind: PAPAL_ACTION_CONDEMNATION, targetFactionId: faction.id, weight: 2 });
    }
    if (isMuslimReligion(ruler.religionId) && (
      papalRelation === DIPLOMACY_HOSTILE ||
      papalRelation === DIPLOMACY_WAR ||
      isAtWarWithCatholicPower(diplomacy, faction.id, simMinute)
    )) {
      candidates.push({ kind: PAPAL_ACTION_CRUSADE, targetFactionId: faction.id, weight: 3 });
    }
  }
  const filtered = candidates.filter(({ kind, targetFactionId }) => (
    !memory.history.slice(0, 3).some((action) => (
      action.kind === kind && action.targetFactionId === targetFactionId
    ))
  ));
  const pool = filtered.length > 0 ? filtered : candidates;
  if (pool.length === 0) return null;
  const totalWeight = pool.reduce((sum, candidate) => sum + candidate.weight, 0);
  let roll = papalRandom(memory, memory.sequence, `action|${simMinute}`) * totalWeight;
  for (const candidate of pool) {
    roll -= candidate.weight;
    if (roll < 0) {
      return { kind: candidate.kind, targetFactionId: candidate.targetFactionId };
    }
  }
  throw new Error("Papal action weighted selection failed");
}

function isAtWarWithCatholicPower(diplomacy, targetFactionId, simMinute) {
  return SOVEREIGN_FACTIONS.some((faction) => {
    if (faction.id === targetFactionId) return false;
    const ruler = rulerAtMinute(faction.id, simMinute);
    return ruler && isRomanCatholicReligion(ruler.religionId) &&
      worldDiplomacyBetween(diplomacy, targetFactionId, faction.id) === DIPLOMACY_WAR;
  });
}

function papalResponseStrength(kind) {
  if (kind === PAPAL_ACTION_FAVOUR) return 0.55;
  if (kind === PAPAL_ACTION_EXCOMMUNICATION) return 0.86;
  if (kind === PAPAL_ACTION_CRUSADE) return 0.74;
  return 0.62;
}

function papalActionIntervalMinutes(memory, sequence) {
  const span = PAPAL_MAX_ACTION_DAYS - PAPAL_MIN_ACTION_DAYS + 1;
  const days = PAPAL_MIN_ACTION_DAYS + Math.floor(
    papalRandom(memory, sequence, "interval") * span
  );
  return days * MINUTES_PER_DAY;
}

function relationSeverity(relation) {
  if (relation === DIPLOMACY_WAR) return 2;
  if (relation === DIPLOMACY_HOSTILE) return 1;
  return 0;
}

function papalRandom(memory, sequence, salt) {
  return hashString32(`${memory.seed}|${sequence}|${salt}`) / 0x100000000;
}

function validatePapalAction(action) {
  if (!action || typeof action !== "object" || typeof action.id !== "string" || action.id === "") {
    throw new Error("Invalid papal action");
  }
  if (!PAPAL_ACTION_KINDS.has(action.kind)) {
    throw new Error(`Invalid recorded papal action kind: ${action.kind}`);
  }
  assertFactionId(action.targetFactionId);
  if (typeof action.targetRulerName !== "string" || action.targetRulerName === "" ||
      typeof action.popeName !== "string" || action.popeName === "") {
    throw new Error("Papal action requires ruler names");
  }
  if (!Array.isArray(action.respondingFactionIds)) {
    throw new Error("Papal action requires responding Catholic factions");
  }
  for (const factionId of action.respondingFactionIds) assertFactionId(factionId);
  assertMinute(action.simMinute, "recorded papal action");
  if (typeof action.source !== "string" || action.source === "") {
    throw new Error("Papal action requires a source");
  }
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label} minute: ${value}`);
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
