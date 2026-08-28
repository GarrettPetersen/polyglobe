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

export const PAPAL_POLITICS_VERSION = 5;
export const PAPAL_FACTION_ID = "papal-states";
export const PAPAL_ACTION_FAVOUR = "papal-favour";
export const PAPAL_ACTION_EXCOMMUNICATION = "papal-excommunication";
export const PAPAL_ACTION_CONDEMNATION = "papal-condemnation";
export const PAPAL_ACTION_CRUSADE = "papal-crusade";
export const PAPAL_ACTION_REVOCATION = "papal-revocation";
export const PAPAL_COMMISSION_ADMONITION = "admonition";
export const PAPAL_COMMISSION_COMMENDATION = "commendation";
export const PAPAL_COMMISSION_PEACE = "peace";
export const PAPAL_COMMISSION_REFORM = "reform";
export const PAPAL_COMMISSION_RELIEF = "relief";
export const PAPAL_COMMISSION_ALMS = "alms";
export const PAPAL_MATTER_AVAILABLE = "available";
export const PAPAL_MATTER_COMMISSIONED = "commissioned";
export const PAPAL_RELIEF_GRAIN_QUANTITY = 8;
export const PAPAL_RELIEF_GUNPOWDER_QUANTITY = 3;
export const PAPAL_ALMS_GRAIN_QUANTITY = 10;

const MINUTES_PER_DAY = 24 * 60;
const PAPAL_MIN_ACTION_DAYS = 300;
const PAPAL_MAX_ACTION_DAYS = 480;
const PAPAL_HISTORY_LIMIT = 24;
const MAX_CATCH_UP_ACTIONS = 8;
const PAPAL_MATTER_DECISION_DAYS = 75;
const PAPAL_COMMISSION_DEADLINE_DAYS = 365;
const PAPAL_COMMISSION_CATHOLIC_REPUTATION = 10;
const PAPAL_COMMISSION_CHRISTIAN_REPUTATION = 25;
const PAPAL_COMMISSION_NON_CHRISTIAN_REPUTATION = 50;
const PAPAL_COMMISSION_KINDS = new Set([
  PAPAL_COMMISSION_ADMONITION,
  PAPAL_COMMISSION_COMMENDATION,
  PAPAL_COMMISSION_PEACE,
  PAPAL_COMMISSION_REFORM,
  PAPAL_COMMISSION_RELIEF,
  PAPAL_COMMISSION_ALMS
]);
const PAPAL_LOGISTICS_KINDS = new Set([
  PAPAL_COMMISSION_RELIEF,
  PAPAL_COMMISSION_ALMS
]);
const PAPAL_LOGISTICS_GOOD_IDS = new Set(["grain", "gunpowder"]);
const PAPAL_ACTION_KINDS = new Set([
  PAPAL_ACTION_FAVOUR,
  PAPAL_ACTION_EXCOMMUNICATION,
  PAPAL_ACTION_CONDEMNATION,
  PAPAL_ACTION_CRUSADE
]);
const PAPAL_RECORDED_ACTION_KINDS = new Set([
  ...PAPAL_ACTION_KINDS,
  PAPAL_ACTION_REVOCATION
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
    activeDecrees: {},
    history: [],
    pendingMatter: null
  };
  memory.nextActionMinute += papalActionIntervalMinutes(memory, 0);
  return validatePapalPolitics(memory);
}

export function migratePapalPolitics(memory, { startMinute = 0, seedKey = "papacy" } = {}) {
  if (memory === undefined || memory === null) return createPapalPolitics({ startMinute, seedKey });
  let migrated = memory;
  if (migrated?.version === 1) {
    migrated = {
      ...migrated,
      version: 2,
      pendingMatter: null
    };
  }
  if (migrated?.version === 2) {
    migrated = {
      ...migrated,
      version: 3,
      history: migrated.history.map((action) => ({ ...action, logistics: null })),
      pendingMatter: migrated.pendingMatter ? {
        ...migrated.pendingMatter,
        cargoRequirements: papalCargoRequirements(
          migrated.pendingMatter.id,
          migrated.pendingMatter.commissionKind
        )
      } : null
    };
  }
  if (migrated?.version === 3) {
    const revoked = migrated.pendingMatter?.playerOfferStatus === "revoked";
    migrated = {
      ...migrated,
      version: 4,
      pendingMatter: migrated.pendingMatter ? {
        ...migrated.pendingMatter,
        revocation: revoked ? {
          reason: "legacy-revocation",
          simMinute: Math.max(
            migrated.pendingMatter.createdMinute,
            migrated.pendingMatter.autonomousDecisionMinute - 7 * MINUTES_PER_DAY
          )
        } : null
      } : null
    };
  }
  if (migrated?.version === 4) {
    const history = migrated.history.map((action) => migratePapalAction(action));
    const activeDecrees = {};
    for (const action of history) {
      const key = papalDecreeKey(action.kind, action.targetFactionId);
      if (!Object.values(activeDecrees).some((entry) => (
        papalDecreeKey(entry.kind, entry.targetFactionId) === key
      ))) {
        activeDecrees[action.id] = { ...action };
      }
    }
    const excommunications = Object.fromEntries(Object.entries(migrated.excommunications)
      .map(([factionId, entry]) => {
        const action = Object.values(activeDecrees).find((candidate) => (
          candidate.kind === PAPAL_ACTION_EXCOMMUNICATION &&
          candidate.targetFactionId === factionId &&
          candidate.targetRulerName === entry.rulerName
        ));
        return [factionId, { ...entry, actionId: action?.id || null }];
      }));
    migrated = {
      ...migrated,
      version: PAPAL_POLITICS_VERSION,
      excommunications,
      activeDecrees,
      history
    };
  }
  return validatePapalPolitics(migrated);
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
    if (entry.actionId !== null &&
        (typeof entry.actionId !== "string" || entry.actionId === "")) {
      throw new Error(`Invalid papal excommunication decree for ${factionId}`);
    }
    assertMinute(entry.simMinute, "papal excommunication");
  }
  if (!memory.activeDecrees || typeof memory.activeDecrees !== "object" ||
      Array.isArray(memory.activeDecrees)) {
    throw new Error("Active Papal decrees must be an object");
  }
  for (const [actionId, action] of Object.entries(memory.activeDecrees)) {
    validatePapalAction(action);
    if (action.kind === PAPAL_ACTION_REVOCATION || action.id !== actionId) {
      throw new Error(`Invalid active Papal decree: ${actionId}`);
    }
  }
  if (!Array.isArray(memory.history) || memory.history.length > PAPAL_HISTORY_LIMIT) {
    throw new Error("Invalid papal action history");
  }
  for (const action of memory.history) validatePapalAction(action);
  if (memory.pendingMatter !== null) validatePapalMatter(memory.pendingMatter);
  return memory;
}

export function nextPapalPoliticsMinute(memory) {
  validatePapalPolitics(memory);
  const scheduledMinute = memory.pendingMatter
    ? memory.pendingMatter.status === PAPAL_MATTER_COMMISSIONED
      ? memory.pendingMatter.commission.deadlineMinute
      : memory.pendingMatter.autonomousDecisionMinute
    : memory.nextActionMinute;
  return memory.englishReformationApplied
    ? scheduledMinute
    : Math.min(scheduledMinute, ENGLISH_REFORMATION_MINUTE);
}

export function advancePapalPolitics(memory, diplomacy, currentMinute, {
  papalStatesActive = true,
  playerCommissionContext = null,
  papalAuthorityMultiplier = 1
} = {}) {
  validatePapalPolitics(memory);
  validateWorldDiplomacy(diplomacy);
  assertMinute(currentMinute, "papal politics current");
  assertPapalAuthorityMultiplier(papalAuthorityMultiplier);
  if (currentMinute < memory.lastUpdateMinute) {
    throw new Error(
      `Papal politics cannot move backward: ${currentMinute} < ${memory.lastUpdateMinute}`
    );
  }
  const actions = [];
  const diplomacyEvents = [];
  const mattersOpened = [];
  let commissionRevoked = null;
  let englishReformation = false;
  if (!memory.englishReformationApplied && currentMinute >= ENGLISH_REFORMATION_MINUTE) {
    memory.englishReformationApplied = true;
    englishReformation = true;
  }
  if (memory.pendingMatter?.status === PAPAL_MATTER_COMMISSIONED) {
    if (!papalStatesActive) {
      commissionRevoked = revokePapalCommission(memory, currentMinute, "rome-interrupted");
    } else if (playerCommissionContext) {
      const eligibility = papalCommissionEligibility(memory, diplomacy, playerCommissionContext);
      if (!eligibility.eligible) {
        commissionRevoked = revokePapalCommission(memory, currentMinute, eligibility.reason);
      }
    }
  }

  let guard = 0;
  while (guard < MAX_CATCH_UP_ACTIONS) {
    if (memory.pendingMatter) {
      const matter = memory.pendingMatter;
      if (matter.status === PAPAL_MATTER_COMMISSIONED &&
          currentMinute >= matter.commission.deadlineMinute) {
        commissionRevoked = revokePapalCommission(memory, currentMinute, "commission-expired");
      }
      if (memory.pendingMatter?.status === PAPAL_MATTER_AVAILABLE &&
          currentMinute >= memory.pendingMatter.autonomousDecisionMinute) {
        if (papalStatesActive) {
          const result = enactPapalMatter(memory, diplomacy, memory.pendingMatter, {
            simMinute: memory.pendingMatter.autonomousDecisionMinute,
            source: "papal-policy",
            papalAuthorityMultiplier
          });
          actions.push(result.action);
          diplomacyEvents.push(...result.diplomacyEvents);
        }
        memory.pendingMatter = null;
        guard += 1;
        continue;
      }
      break;
    }
    if (currentMinute < memory.nextActionMinute) break;
    const actionMinute = memory.nextActionMinute;
    if (papalStatesActive) {
      const revocable = chooseRevocablePapalDecree(memory, diplomacy, actionMinute);
      if (revocable) {
        actions.push(revokePapalDecree(memory, revocable.id, actionMinute, "papal-policy"));
      } else {
        const proposal = chooseScheduledPapalAction(memory, diplomacy, actionMinute);
        if (proposal) {
          const matter = createPapalMatter(memory, diplomacy, proposal, actionMinute);
          memory.pendingMatter = matter;
          mattersOpened.push(papalMatterView(matter));
        }
      }
    }
    memory.sequence += 1;
    memory.nextActionMinute = actionMinute + papalActionIntervalMinutes(memory, memory.sequence);
    guard += 1;
  }
  if (guard >= MAX_CATCH_UP_ACTIONS &&
      !memory.pendingMatter && currentMinute >= memory.nextActionMinute) {
    memory.nextActionMinute = currentMinute + papalActionIntervalMinutes(memory, memory.sequence + 1);
  }
  memory.lastUpdateMinute = currentMinute;
  return Object.freeze({
    actions,
    diplomacyEvents,
    mattersOpened: Object.freeze(mattersOpened),
    commissionRevoked,
    englishReformation
  });
}

export function papalPendingMatter(memory) {
  validatePapalPolitics(memory);
  return memory.pendingMatter ? papalMatterView(memory.pendingMatter) : null;
}

export function papalCommissionEligibility(memory, diplomacy, {
  playerFactionId,
  playerReligionId,
  papalReputation
}) {
  validatePapalPolitics(memory);
  validateWorldDiplomacy(diplomacy);
  const matter = memory.pendingMatter;
  if (!matter) return eligibility(false, "no-pending-matter");
  assertFactionId(playerFactionId);
  if (!Number.isFinite(papalReputation)) {
    throw new Error(`Invalid Papal reputation for commission: ${papalReputation}`);
  }
  if (playerFactionId === PIRATE_FACTION_ID || playerFactionId === NEUTRAL_FACTION_ID) {
    return eligibility(false, "outlaw-or-stateless");
  }
  const relation = worldDiplomacyBetween(diplomacy, PAPAL_FACTION_ID, playerFactionId);
  if (relation === DIPLOMACY_WAR || relation === DIPLOMACY_HOSTILE) {
    return eligibility(false, "papal-enemy");
  }
  if (isRomanCatholicReligion(playerReligionId)) {
    return eligibility(
      papalReputation >= PAPAL_COMMISSION_CATHOLIC_REPUTATION,
      "insufficient-papal-standing",
      PAPAL_COMMISSION_CATHOLIC_REPUTATION
    );
  }
  if (![PAPAL_COMMISSION_PEACE, PAPAL_COMMISSION_RELIEF, PAPAL_COMMISSION_ALMS]
    .includes(matter.commissionKind)) {
    return eligibility(false, "doctrinal-office-reserved");
  }
  if (isChristianReligion(playerReligionId)) {
    return eligibility(
      papalReputation >= PAPAL_COMMISSION_CHRISTIAN_REPUTATION &&
        (relation === DIPLOMACY_FRIENDLY || relation === DIPLOMACY_ALLY),
      "insufficient-papal-standing",
      PAPAL_COMMISSION_CHRISTIAN_REPUTATION
    );
  }
  return eligibility(
    papalReputation >= PAPAL_COMMISSION_NON_CHRISTIAN_REPUTATION &&
      (relation === DIPLOMACY_FRIENDLY || relation === DIPLOMACY_ALLY),
    "exceptional-trust-required",
    PAPAL_COMMISSION_NON_CHRISTIAN_REPUTATION
  );
}

export function acceptPapalCommission(memory, diplomacy, {
  playerFactionId,
  playerReligionId,
  papalReputation,
  simMinute,
  originTileId,
  itinerary,
  rewardDoubloons,
  nuncio
}) {
  const eligibilityResult = papalCommissionEligibility(memory, diplomacy, {
    playerFactionId,
    playerReligionId,
    papalReputation
  });
  if (!eligibilityResult.eligible) {
    throw new Error(`Cannot accept Papal commission: ${eligibilityResult.reason}`);
  }
  assertMinute(simMinute, "papal commission acceptance");
  if (!Number.isInteger(originTileId) || originTileId < 0) {
    throw new Error(`Invalid Papal commission origin: ${originTileId}`);
  }
  if (!Array.isArray(itinerary) || itinerary.length < 1 || itinerary.length > 3) {
    throw new Error("Papal commission requires one to three destinations");
  }
  const route = itinerary.map((destination, index) => validatePapalDestination({
    ...destination,
    order: index,
    visitedMinute: null
  }));
  if (!Number.isInteger(rewardDoubloons) || rewardDoubloons < 100) {
    throw new Error(`Invalid Papal commission reward: ${rewardDoubloons}`);
  }
  validatePapalNuncio(nuncio);
  const matter = memory.pendingMatter;
  matter.status = PAPAL_MATTER_COMMISSIONED;
  matter.playerOfferStatus = "accepted";
  matter.revocation = null;
  matter.commission = {
    acceptedMinute: simMinute,
    deadlineMinute: simMinute + PAPAL_COMMISSION_DEADLINE_DAYS * MINUTES_PER_DAY,
    originTileId,
    itinerary: route,
    nextStopIndex: 0,
    recommendation: null,
    rewardDoubloons,
    nuncio
  };
  validatePapalMatter(matter);
  return papalMatterView(matter);
}

export function declinePapalCommission(memory) {
  validatePapalPolitics(memory);
  const matter = memory.pendingMatter;
  if (!matter || matter.status !== PAPAL_MATTER_AVAILABLE) return false;
  matter.playerOfferStatus = "declined";
  return true;
}

export function recordPapalCommissionDenial(memory) {
  validatePapalPolitics(memory);
  const matter = memory.pendingMatter;
  if (!matter || matter.status !== PAPAL_MATTER_AVAILABLE) return false;
  matter.playerOfferStatus = "denied";
  return true;
}

export function revokeActivePapalCommission(memory, simMinute, reason = "papal-enemy") {
  validatePapalPolitics(memory);
  assertMinute(simMinute, "Papal commission revocation");
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new Error("Papal commission revocation requires a reason");
  }
  return revokePapalCommission(memory, simMinute, reason);
}

export function papalCommissionObjective(memory) {
  validatePapalPolitics(memory);
  const matter = memory.pendingMatter;
  if (!matter || matter.status !== PAPAL_MATTER_COMMISSIONED) return null;
  const commission = matter.commission;
  const destination = commission.itinerary[commission.nextStopIndex] || null;
  return Object.freeze(destination
    ? { kind: "destination", matterId: matter.id, destination: { ...destination } }
    : {
        kind: "return-to-rome",
        matterId: matter.id,
        destination: {
          tileId: commission.originTileId,
          portName: "Rome",
          factionId: PAPAL_FACTION_ID,
          purpose: "report"
        }
      });
}

export function papalCommissionCargoRequirements(memory) {
  validatePapalPolitics(memory);
  const matter = memory.pendingMatter;
  if (!matter || matter.status !== PAPAL_MATTER_COMMISSIONED) return Object.freeze([]);
  return Object.freeze(matter.cargoRequirements.map((requirement) => Object.freeze({
    ...requirement
  })));
}

export function advancePapalCommissionAtPort(memory, {
  tileId,
  simMinute,
  recommendation = null,
  cargoComplete = false
}) {
  validatePapalPolitics(memory);
  assertMinute(simMinute, "papal commission port visit");
  const objective = papalCommissionObjective(memory);
  if (!objective || objective.kind !== "destination") return null;
  if (objective.destination.tileId !== tileId) return null;
  if (recommendation !== null && !["firm", "moderate"].includes(recommendation)) {
    throw new Error(`Invalid Papal commission recommendation: ${recommendation}`);
  }
  if (typeof cargoComplete !== "boolean") {
    throw new Error("Papal commission cargo completion must be boolean");
  }
  const commission = memory.pendingMatter.commission;
  const cargoRequired = memory.pendingMatter.cargoRequirements.some((requirement) => (
    requirement.destinationOrder === commission.nextStopIndex
  ));
  if (cargoRequired && !cargoComplete) {
    throw new Error(`Papal commission cargo is incomplete at itinerary stop ${commission.nextStopIndex}`);
  }
  commission.itinerary[commission.nextStopIndex].visitedMinute = simMinute;
  commission.nextStopIndex += 1;
  if (recommendation !== null) commission.recommendation = recommendation;
  validatePapalMatter(memory.pendingMatter);
  return papalMatterView(memory.pendingMatter);
}

export function completePapalCommission(memory, diplomacy, {
  simMinute,
  papalAuthorityMultiplier = 1
}) {
  validatePapalPolitics(memory);
  validateWorldDiplomacy(diplomacy);
  assertMinute(simMinute, "papal commission completion");
  assertPapalAuthorityMultiplier(papalAuthorityMultiplier);
  const matter = memory.pendingMatter;
  if (!matter || matter.status !== PAPAL_MATTER_COMMISSIONED) {
    throw new Error("No Papal commission is ready to complete");
  }
  if (matter.commission.nextStopIndex !== matter.commission.itinerary.length) {
    throw new Error("Papal commission cannot be completed before every audience");
  }
  const result = enactPapalMatter(memory, diplomacy, matter, {
    simMinute,
    source: "player-papal-commission",
    recommendation: matter.commission.recommendation || "firm",
    papalAuthorityMultiplier
  });
  const completion = Object.freeze({
    matterId: matter.id,
    commissionKind: matter.commissionKind,
    rewardDoubloons: matter.commission.rewardDoubloons,
    safePassageFactionIds: Object.freeze([
      ...new Set(matter.commission.itinerary.map((entry) => entry.factionId))
    ]),
    safePassageUntilMinute: matter.commission.deadlineMinute,
    cargoRequirements: Object.freeze(matter.cargoRequirements.map((requirement) => Object.freeze({
      ...requirement
    }))),
    action: result.action,
    diplomacyEvents: result.diplomacyEvents
  });
  memory.pendingMatter = null;
  return completion;
}

export function papalCommissionLabel(kind) {
  if (!PAPAL_COMMISSION_KINDS.has(kind)) throw new Error(`Unknown Papal commission kind: ${kind}`);
  return {
    [PAPAL_COMMISSION_ADMONITION]: "Papal Admonition",
    [PAPAL_COMMISSION_COMMENDATION]: "Papal Commendation",
    [PAPAL_COMMISSION_PEACE]: "Papal Peace Commission",
    [PAPAL_COMMISSION_REFORM]: "Papal Reform Commission",
    [PAPAL_COMMISSION_RELIEF]: "Papal War Relief",
    [PAPAL_COMMISSION_ALMS]: "Papal Alms Mission"
  }[kind];
}

export function papalMatterNotice(matter) {
  const view = matter?.commissionKind ? matter : papalMatterView(matter);
  if (view.playerOfferStatus === "revoked") {
    return papalCommissionRevocationNotice(view.revocation);
  }
  const target = factionById(view.targetFactionId);
  if (view.commissionKind === PAPAL_COMMISSION_RELIEF) {
    if (!view.beneficiaryFactionId) throw new Error("Papal war relief has no beneficiary");
    const beneficiary = factionById(view.beneficiaryFactionId);
    return view.status === PAPAL_MATTER_COMMISSIONED
      ? `PAPAL RELIEF UNDERWAY FOR ${beneficiary.shortName.toUpperCase()} AGAINST ${target.shortName.toUpperCase()}`
      : `ROME DELIBERATES RELIEF FOR ${beneficiary.shortName.toUpperCase()} AGAINST ${target.shortName.toUpperCase()}`;
  }
  if (view.commissionKind === PAPAL_COMMISSION_ALMS) {
    return view.status === PAPAL_MATTER_COMMISSIONED
      ? `PAPAL GRAIN ALMS UNDERWAY FOR ${target.shortName.toUpperCase()}`
      : `ROME PREPARES GRAIN ALMS FOR ${target.shortName.toUpperCase()}`;
  }
  if (view.status === PAPAL_MATTER_COMMISSIONED) {
    return `${papalCommissionLabel(view.commissionKind).toUpperCase()} UNDERWAY CONCERNING ${target.shortName.toUpperCase()}`;
  }
  return `ROME DELIBERATES A ${papalCommissionLabel(view.commissionKind).toUpperCase()} CONCERNING ${target.shortName.toUpperCase()}`;
}

export function papalCommissionRevocationNotice(revocation) {
  if (!revocation || typeof revocation.reason !== "string" ||
      !Number.isFinite(revocation.simMinute) || revocation.simMinute < 0) {
    throw new Error("Papal commission revocation notice requires a valid revocation");
  }
  return revocation.reason === "commission-expired"
    ? "PAPAL LEGATION EXPIRED - ROME ACTS WITHOUT US"
    : "PAPAL LEGATION REVOKED";
}

export function imposePapalAction(memory, diplomacy, {
  kind,
  targetFactionId,
  simMinute,
  source = "rome-peace-treaty",
  papalAuthorityMultiplier = 1
}) {
  assertPapalAuthorityMultiplier(papalAuthorityMultiplier);
  const interruptedCommission = memory.pendingMatter?.status === PAPAL_MATTER_COMMISSIONED
      ? Object.freeze({
        matterId: memory.pendingMatter.id,
        cargoRequirements: Object.freeze(memory.pendingMatter.cargoRequirements.map((requirement) =>
          Object.freeze({ ...requirement })
        )),
        safePassageFactionIds: Object.freeze([
          ...new Set(memory.pendingMatter.commission.itinerary.map((entry) => entry.factionId))
        ]),
        safePassageUntilMinute: memory.pendingMatter.commission.deadlineMinute
      })
    : null;
  if (memory.pendingMatter) memory.pendingMatter = null;
  const result = enactPapalAction(memory, diplomacy, {
    kind,
    targetFactionId,
    simMinute,
    source,
    papalAuthorityMultiplier
  });
  return Object.freeze({ ...result, interruptedCommission });
}

export function activePapalDecrees(memory) {
  validatePapalPolitics(memory);
  return Object.freeze(Object.values(memory.activeDecrees)
    .sort((left, right) => right.simMinute - left.simMinute || left.id.localeCompare(right.id))
    .map((action) => Object.freeze({ ...action })));
}

export function revokePapalAction(memory, {
  actionId,
  simMinute,
  source = "apostolic-rescission"
}) {
  validatePapalPolitics(memory);
  assertMinute(simMinute, "Papal decree revocation");
  if (typeof actionId !== "string" || actionId === "") {
    throw new Error("Papal decree revocation requires an action id");
  }
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Papal decree revocation requires a source");
  }
  return revokePapalDecree(memory, actionId, simMinute, source);
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
  if (action.kind === PAPAL_ACTION_REVOCATION) {
    if (action.revokedActionKind === PAPAL_ACTION_EXCOMMUNICATION) {
      return `${action.popeName.toUpperCase()} RESTORES ${action.targetRulerName.toUpperCase()} TO COMMUNION`;
    }
    if (action.revokedActionKind === PAPAL_ACTION_CRUSADE) {
      return `${action.popeName.toUpperCase()} WITHDRAWS THE CRUSADE AGAINST ${target.shortName.toUpperCase()}`;
    }
    if (action.revokedActionKind === PAPAL_ACTION_FAVOUR) {
      return `${action.popeName.toUpperCase()} WITHDRAWS THE BULL IN FAVOUR OF ${target.shortName.toUpperCase()}`;
    }
    return `${action.popeName.toUpperCase()} WITHDRAWS THE CONDEMNATION OF ${target.shortName.toUpperCase()}`;
  }
  if (action.logistics?.kind === PAPAL_COMMISSION_RELIEF) {
    const recipient = factionById(action.logistics.recipientFactionId);
    const opponent = factionById(action.logistics.opponentFactionId);
    return `PAPAL RELIEF REACHES ${recipient.shortName.toUpperCase()} AGAINST ${opponent.shortName.toUpperCase()}`;
  }
  if (action.logistics?.kind === PAPAL_COMMISSION_ALMS) {
    const recipient = factionById(action.logistics.recipientFactionId);
    return `ROME SENDS GRAIN ALMS TO ${recipient.shortName.toUpperCase()}`;
  }
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

function enactPapalAction(memory, diplomacy, {
  kind,
  targetFactionId,
  simMinute,
  source,
  logistics = null,
  papalAuthorityMultiplier = 1
}) {
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
  assertPapalAuthorityMultiplier(papalAuthorityMultiplier);
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Papal action requires a source");
  }
  if (logistics !== null) validatePapalLogistics(logistics);
  if (Object.values(memory.activeDecrees).some((action) => (
    action.kind === kind && action.targetFactionId === targetFactionId
  ))) {
    throw new Error(`Papal decree is already active: ${kind}/${targetFactionId}`);
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
    const responseChance = Math.min(
      1,
      ruler.piety * pope.piety * responseStrength * papalAuthorityMultiplier
    );
    if (roll >= responseChance) continue;
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
    source,
    logistics
  });
  if (kind === PAPAL_ACTION_EXCOMMUNICATION) {
    memory.excommunications[targetFactionId] = {
      rulerName: targetRuler.displayName,
      simMinute,
      actionId: action.id
    };
  }
  memory.activeDecrees[action.id] = { ...action };
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
    if (isMuslimReligion(ruler.religionId) &&
        isAtWarWithCatholicPower(diplomacy, faction.id, simMinute)) {
      candidates.push({ kind: PAPAL_ACTION_CRUSADE, targetFactionId: faction.id, weight: 3 });
    }
  }
  const inactiveCandidates = candidates.filter(({ kind, targetFactionId }) => (
    !Object.values(memory.activeDecrees).some((action) => (
      action.kind === kind && action.targetFactionId === targetFactionId
    ))
  ));
  const filtered = inactiveCandidates.filter(({ kind, targetFactionId }) => (
    !memory.history.slice(0, 3).some((action) => (
      action.kind === kind && action.targetFactionId === targetFactionId
    ))
  ));
  const pool = filtered.length > 0 ? filtered : inactiveCandidates;
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

function chooseRevocablePapalDecree(memory, diplomacy, simMinute) {
  const candidates = Object.values(memory.activeDecrees)
    .filter((action) => papalDecreeShouldEnd(action, diplomacy, simMinute))
    .map((action) => ({
      action,
      weight: action.kind === PAPAL_ACTION_EXCOMMUNICATION ? 5
        : action.kind === PAPAL_ACTION_CRUSADE ? 4
          : action.kind === PAPAL_ACTION_CONDEMNATION ? 2.5 : 2
    }));
  if (candidates.length === 0) return null;
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let roll = papalRandom(memory, memory.sequence, `revocation|${simMinute}`) * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll < 0) return candidate.action;
  }
  throw new Error("Papal revocation weighted selection failed");
}

function papalDecreeShouldEnd(action, diplomacy, simMinute) {
  const relation = worldDiplomacyBetween(diplomacy, PAPAL_FACTION_ID, action.targetFactionId);
  const currentRuler = rulerAtMinute(action.targetFactionId, simMinute);
  const rulerChanged = !currentRuler || currentRuler.displayName !== action.targetRulerName;
  if (action.kind === PAPAL_ACTION_FAVOUR) {
    return rulerChanged || relation === DIPLOMACY_HOSTILE || relation === DIPLOMACY_WAR;
  }
  if (action.kind === PAPAL_ACTION_EXCOMMUNICATION) {
    return rulerChanged || relation === DIPLOMACY_NEUTRAL ||
      relation === DIPLOMACY_FRIENDLY || relation === DIPLOMACY_ALLY;
  }
  if (action.kind === PAPAL_ACTION_CONDEMNATION) {
    return rulerChanged || relation === DIPLOMACY_FRIENDLY || relation === DIPLOMACY_ALLY;
  }
  if (action.kind === PAPAL_ACTION_CRUSADE) {
    return rulerChanged || !isAtWarWithCatholicPower(diplomacy, action.targetFactionId, simMinute);
  }
  throw new Error(`Cannot assess Papal decree: ${action.kind}`);
}

function revokePapalDecree(memory, actionId, simMinute, source) {
  const decree = memory.activeDecrees[actionId];
  if (!decree) throw new Error(`Papal decree is not active: ${actionId}`);
  if (simMinute < decree.simMinute) {
    throw new Error(`Papal decree cannot be revoked before it was enacted: ${actionId}`);
  }
  const pope = rulerAtMinute(PAPAL_FACTION_ID, simMinute);
  if (!pope) throw new Error("Papal decree revocation requires a reigning Pope");
  delete memory.activeDecrees[actionId];
  if (decree.kind === PAPAL_ACTION_EXCOMMUNICATION) {
    const entry = memory.excommunications[decree.targetFactionId];
    if (entry && (entry.actionId === actionId ||
        entry.actionId === null && entry.rulerName === decree.targetRulerName)) {
      delete memory.excommunications[decree.targetFactionId];
    }
  }
  const action = Object.freeze({
    id: `${PAPAL_ACTION_REVOCATION}-${simMinute}-${actionId}`,
    kind: PAPAL_ACTION_REVOCATION,
    targetFactionId: decree.targetFactionId,
    targetRulerName: decree.targetRulerName,
    popeName: pope.displayName,
    respondingFactionIds: Object.freeze([]),
    simMinute,
    source,
    logistics: null,
    revokedActionId: actionId,
    revokedActionKind: decree.kind
  });
  validatePapalAction(action);
  memory.history.unshift(action);
  if (memory.history.length > PAPAL_HISTORY_LIMIT) memory.history.length = PAPAL_HISTORY_LIMIT;
  return action;
}

function createPapalMatter(memory, diplomacy, proposal, simMinute) {
  let actionKind = proposal.kind;
  let targetFactionId = proposal.targetFactionId;
  let partnerFactionId = null;
  let beneficiaryFactionId = null;
  let commissionKind;
  const pope = rulerAtMinute(PAPAL_FACTION_ID, simMinute);
  const catholicWarPair = firstCatholicWarPair(memory, diplomacy, simMinute);
  const reformCandidate = pope?.displayName === "Adrian VI" &&
    !memory.history.some((action) => action.source === "player-papal-reform") &&
    papalRandom(memory, memory.sequence, `adrian-reform|${simMinute}`) < 0.45;

  if (reformCandidate) {
    commissionKind = PAPAL_COMMISSION_REFORM;
    actionKind = PAPAL_ACTION_FAVOUR;
    targetFactionId = "burgundian-netherlands";
  } else if (proposal.kind === PAPAL_ACTION_CRUSADE) {
    commissionKind = PAPAL_COMMISSION_RELIEF;
    beneficiaryFactionId = catholicEnemyOf(diplomacy, proposal.targetFactionId, simMinute);
    if (!beneficiaryFactionId) {
      throw new Error(`Papal relief target has no Catholic belligerent: ${proposal.targetFactionId}`);
    }
  } else if (proposal.kind === PAPAL_ACTION_FAVOUR &&
      papalRandom(memory, memory.sequence, `alms|${simMinute}|${targetFactionId}`) < 0.45) {
    commissionKind = PAPAL_COMMISSION_ALMS;
  } else if (proposal.kind === PAPAL_ACTION_EXCOMMUNICATION ||
      proposal.kind === PAPAL_ACTION_CONDEMNATION) {
    commissionKind = PAPAL_COMMISSION_ADMONITION;
  } else if (catholicWarPair) {
    commissionKind = PAPAL_COMMISSION_PEACE;
    actionKind = PAPAL_ACTION_FAVOUR;
    targetFactionId = catholicWarPair[0];
    partnerFactionId = catholicWarPair[1];
  } else {
    commissionKind = PAPAL_COMMISSION_COMMENDATION;
  }

  const id = `papal-matter-${memory.sequence}-${simMinute}`;
  const matter = {
    id,
    status: PAPAL_MATTER_AVAILABLE,
    commissionKind,
    actionKind,
    targetFactionId,
    partnerFactionId,
    beneficiaryFactionId,
    cargoRequirements: papalCargoRequirements(id, commissionKind),
    createdMinute: simMinute,
    autonomousDecisionMinute: simMinute + PAPAL_MATTER_DECISION_DAYS * MINUTES_PER_DAY,
    playerOfferStatus: null,
    revocation: null,
    commission: null
  };
  validatePapalMatter(matter);
  return matter;
}

function enactPapalMatter(memory, diplomacy, matter, {
  simMinute,
  source,
  recommendation = "firm",
  papalAuthorityMultiplier = 1
}) {
  validatePapalMatter(matter);
  assertPapalAuthorityMultiplier(papalAuthorityMultiplier);
  let actionKind = matter.actionKind;
  let targetFactionId = matter.targetFactionId;
  const diplomacyEvents = [];

  if (matter.commissionKind === PAPAL_COMMISSION_ADMONITION &&
      recommendation === "moderate" && actionKind === PAPAL_ACTION_EXCOMMUNICATION) {
    actionKind = PAPAL_ACTION_CONDEMNATION;
  }
  if (matter.commissionKind === PAPAL_COMMISSION_COMMENDATION && recommendation === "moderate") {
    actionKind = PAPAL_ACTION_CONDEMNATION;
  }
  if (matter.commissionKind === PAPAL_COMMISSION_REFORM && recommendation === "moderate") {
    actionKind = PAPAL_ACTION_CONDEMNATION;
  }
  if (matter.commissionKind === PAPAL_COMMISSION_RELIEF &&
      recommendation === "moderate" && matter.beneficiaryFactionId) {
    actionKind = PAPAL_ACTION_FAVOUR;
    targetFactionId = matter.beneficiaryFactionId;
    diplomacyEvents.push(...adjustDiplomaticStance(
      diplomacy,
      matter.targetFactionId,
      matter.beneficiaryFactionId,
      "improve",
      simMinute,
      { eventReason: "papal-relief-truce" }
    ));
  }
  if (matter.commissionKind === PAPAL_COMMISSION_PEACE && matter.partnerFactionId) {
    if (recommendation === "moderate") {
      actionKind = PAPAL_ACTION_CONDEMNATION;
      targetFactionId = matter.partnerFactionId;
    } else {
      diplomacyEvents.push(...adjustDiplomaticStance(
        diplomacy,
        matter.targetFactionId,
        matter.partnerFactionId,
        "improve",
        simMinute,
        { eventReason: "papal-peace-commission" }
      ));
    }
  }
  const logisticsRecipientFactionId = matter.commissionKind === PAPAL_COMMISSION_RELIEF
    ? matter.beneficiaryFactionId
    : matter.commissionKind === PAPAL_COMMISSION_ALMS
      ? matter.targetFactionId
      : null;
  const logistics = logisticsRecipientFactionId ? Object.freeze({
    kind: matter.commissionKind,
    recipientFactionId: logisticsRecipientFactionId,
    opponentFactionId: matter.commissionKind === PAPAL_COMMISSION_RELIEF
      ? matter.targetFactionId
      : null,
    cargoRequirements: Object.freeze(matter.cargoRequirements.map((requirement) => Object.freeze({
      ...requirement
    })))
  }) : null;
  const result = enactPapalAction(memory, diplomacy, {
    kind: actionKind,
    targetFactionId,
    simMinute,
    source: matter.commissionKind === PAPAL_COMMISSION_REFORM && source === "player-papal-commission"
      ? "player-papal-reform"
      : source,
    logistics,
    papalAuthorityMultiplier
  });
  return Object.freeze({
    action: result.action,
    diplomacyEvents: Object.freeze([...diplomacyEvents, ...result.diplomacyEvents])
  });
}

function assertPapalAuthorityMultiplier(multiplier) {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error(`Invalid Papal authority multiplier: ${multiplier}`);
  }
}

function firstCatholicWarPair(memory, diplomacy, simMinute) {
  const pairs = [];
  for (let leftIndex = 0; leftIndex < SOVEREIGN_FACTIONS.length; leftIndex += 1) {
    const left = SOVEREIGN_FACTIONS[leftIndex];
    const leftRuler = rulerAtMinute(left.id, simMinute);
    if (!leftRuler || !isRomanCatholicReligion(leftRuler.religionId)) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < SOVEREIGN_FACTIONS.length; rightIndex += 1) {
      const right = SOVEREIGN_FACTIONS[rightIndex];
      const rightRuler = rulerAtMinute(right.id, simMinute);
      if (!rightRuler || !isRomanCatholicReligion(rightRuler.religionId)) continue;
      if (worldDiplomacyBetween(diplomacy, left.id, right.id) === DIPLOMACY_WAR) {
        pairs.push([left.id, right.id]);
      }
    }
  }
  if (pairs.length === 0) return null;
  const index = Math.floor(
    papalRandom(memory, memory.sequence, `peace-pair|${simMinute}`) * pairs.length
  );
  return pairs[index];
}

function catholicEnemyOf(diplomacy, targetFactionId, simMinute) {
  const enemies = SOVEREIGN_FACTIONS
    .filter(({ id }) => id !== targetFactionId)
    .filter(({ id }) => {
      const ruler = rulerAtMinute(id, simMinute);
      return ruler && isRomanCatholicReligion(ruler.religionId) &&
        worldDiplomacyBetween(diplomacy, targetFactionId, id) === DIPLOMACY_WAR;
    })
    .sort((left, right) => {
      if (left.id === "hospitallers") return right.id === "hospitallers" ? 0 : -1;
      if (right.id === "hospitallers") return 1;
      return left.id.localeCompare(right.id);
    });
  return enemies[0]?.id || null;
}

function revokePapalCommission(memory, simMinute, reason) {
  const matter = memory.pendingMatter;
  if (!matter || matter.status !== PAPAL_MATTER_COMMISSIONED) return null;
  const revoked = Object.freeze({
    matterId: matter.id,
    commissionKind: matter.commissionKind,
    cargoRequirements: Object.freeze(matter.cargoRequirements.map((requirement) => Object.freeze({
      ...requirement
    }))),
    reason,
    simMinute,
    safePassageFactionIds: Object.freeze([
      ...new Set(matter.commission.itinerary.map((entry) => entry.factionId))
    ]),
    safePassageUntilMinute: matter.commission.deadlineMinute
  });
  matter.status = PAPAL_MATTER_AVAILABLE;
  matter.playerOfferStatus = "revoked";
  matter.revocation = { reason, simMinute };
  matter.commission = null;
  matter.autonomousDecisionMinute = Math.max(
    simMinute + 7 * MINUTES_PER_DAY,
    matter.autonomousDecisionMinute
  );
  validatePapalMatter(matter);
  return revoked;
}

function eligibility(eligibleValue, reason, requiredReputation = null) {
  return Object.freeze({
    eligible: eligibleValue,
    reason: eligibleValue ? null : reason,
    requiredReputation: eligibleValue ? null : requiredReputation
  });
}

function papalMatterView(matter) {
  validatePapalMatter(matter);
  return Object.freeze({
    ...matter,
    commission: matter.commission ? Object.freeze({
      ...matter.commission,
      itinerary: Object.freeze(matter.commission.itinerary.map((entry) => Object.freeze({ ...entry })))
    }) : null
  });
}

function validatePapalMatter(matter) {
  if (!matter || typeof matter !== "object" || Array.isArray(matter) ||
      typeof matter.id !== "string" || matter.id === "") {
    throw new Error("Invalid pending Papal matter");
  }
  if (![PAPAL_MATTER_AVAILABLE, PAPAL_MATTER_COMMISSIONED].includes(matter.status)) {
    throw new Error(`Invalid Papal matter status: ${matter.status}`);
  }
  if (!PAPAL_COMMISSION_KINDS.has(matter.commissionKind)) {
    throw new Error(`Invalid Papal commission kind: ${matter.commissionKind}`);
  }
  if (!PAPAL_ACTION_KINDS.has(matter.actionKind)) {
    throw new Error(`Invalid Papal matter action: ${matter.actionKind}`);
  }
  assertFactionId(matter.targetFactionId);
  for (const [label, factionId] of [
    ["partner", matter.partnerFactionId],
    ["beneficiary", matter.beneficiaryFactionId]
  ]) {
    if (factionId !== null) {
      assertFactionId(factionId);
      if (factionId === matter.targetFactionId) {
        throw new Error(`Papal matter ${label} repeats its target`);
      }
    }
  }
  if (!Array.isArray(matter.cargoRequirements)) {
    throw new Error("Papal matter requires cargo requirements");
  }
  matter.cargoRequirements.forEach((requirement) => validatePapalCargoRequirement(requirement));
  if (matter.commissionKind === PAPAL_COMMISSION_RELIEF && matter.beneficiaryFactionId === null) {
    throw new Error("Papal war relief requires a beneficiary");
  }
  if (PAPAL_LOGISTICS_KINDS.has(matter.commissionKind) !== (matter.cargoRequirements.length > 0)) {
    throw new Error(`Papal ${matter.commissionKind} cargo requirements are inconsistent`);
  }
  assertMinute(matter.createdMinute, "Papal matter creation");
  assertMinute(matter.autonomousDecisionMinute, "Papal matter decision");
  if (matter.autonomousDecisionMinute <= matter.createdMinute) {
    throw new Error("Papal matter decision must follow its creation");
  }
  if (![null, "accepted", "declined", "denied", "revoked"].includes(matter.playerOfferStatus)) {
    throw new Error(`Invalid Papal player offer status: ${matter.playerOfferStatus}`);
  }
  if (matter.playerOfferStatus === "revoked") {
    if (!matter.revocation || typeof matter.revocation.reason !== "string" ||
        matter.revocation.reason.trim() === "") {
      throw new Error("Revoked Papal matter requires a reason");
    }
    assertMinute(matter.revocation.simMinute, "Papal matter revocation");
  } else if (matter.revocation !== null) {
    throw new Error("Active Papal matter retains a revocation");
  }
  if (matter.status === PAPAL_MATTER_COMMISSIONED) validatePapalCommission(matter.commission);
  else if (matter.commission !== null) throw new Error("Available Papal matter retains a commission");
  return matter;
}

function validatePapalCommission(commission) {
  if (!commission || typeof commission !== "object" || Array.isArray(commission)) {
    throw new Error("Commissioned Papal matter requires a commission");
  }
  assertMinute(commission.acceptedMinute, "Papal commission acceptance");
  assertMinute(commission.deadlineMinute, "Papal commission deadline");
  if (commission.deadlineMinute <= commission.acceptedMinute) {
    throw new Error("Papal commission deadline must follow acceptance");
  }
  if (!Number.isInteger(commission.originTileId) || commission.originTileId < 0) {
    throw new Error(`Invalid Papal commission origin: ${commission.originTileId}`);
  }
  if (!Array.isArray(commission.itinerary) || commission.itinerary.length < 1 ||
      commission.itinerary.length > 3) {
    throw new Error("Papal commission requires one to three destinations");
  }
  commission.itinerary.forEach((entry, index) => {
    validatePapalDestination(entry);
    if (entry.order !== index) throw new Error(`Invalid Papal itinerary order: ${entry.order}`);
  });
  if (!Number.isInteger(commission.nextStopIndex) || commission.nextStopIndex < 0 ||
      commission.nextStopIndex > commission.itinerary.length) {
    throw new Error(`Invalid Papal itinerary progress: ${commission.nextStopIndex}`);
  }
  if (![null, "firm", "moderate"].includes(commission.recommendation)) {
    throw new Error(`Invalid Papal recommendation: ${commission.recommendation}`);
  }
  if (!Number.isInteger(commission.rewardDoubloons) || commission.rewardDoubloons < 100) {
    throw new Error(`Invalid Papal commission reward: ${commission.rewardDoubloons}`);
  }
  validatePapalNuncio(commission.nuncio);
}

function validatePapalDestination(destination) {
  if (!destination || typeof destination !== "object" || Array.isArray(destination)) {
    throw new Error("Papal itinerary destination must be an object");
  }
  if (!Number.isInteger(destination.tileId) || destination.tileId < 0 ||
      typeof destination.portName !== "string" || destination.portName.trim() === "" ||
      typeof destination.purpose !== "string" || destination.purpose.trim() === "") {
    throw new Error("Invalid Papal itinerary destination");
  }
  assertFactionId(destination.factionId);
  if (!Number.isInteger(destination.order) || destination.order < 0) {
    throw new Error(`Invalid Papal itinerary destination order: ${destination.order}`);
  }
  if (destination.visitedMinute !== null) {
    assertMinute(destination.visitedMinute, "Papal itinerary visit");
  }
  return destination;
}

function validatePapalNuncio(nuncio) {
  if (!nuncio || typeof nuncio !== "object" || Array.isArray(nuncio) ||
      typeof nuncio.id !== "string" || nuncio.id === "" ||
      typeof nuncio.name !== "string" || nuncio.name === "") {
    throw new Error("Papal commission requires a named nuncio");
  }
  return nuncio;
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
  if (!PAPAL_RECORDED_ACTION_KINDS.has(action.kind)) {
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
  if (action.logistics !== null) validatePapalLogistics(action.logistics);
  if (action.kind === PAPAL_ACTION_REVOCATION) {
    if (typeof action.revokedActionId !== "string" || action.revokedActionId === "" ||
        !PAPAL_ACTION_KINDS.has(action.revokedActionKind)) {
      throw new Error("Papal revocation requires the decree it withdrew");
    }
  } else if (action.revokedActionId !== undefined || action.revokedActionKind !== undefined) {
    throw new Error(`Papal decree retains revocation fields: ${action.id}`);
  }
}

function migratePapalAction(action) {
  return {
    ...action,
    logistics: action.logistics ?? null
  };
}

function papalDecreeKey(kind, targetFactionId) {
  if (!PAPAL_ACTION_KINDS.has(kind)) throw new Error(`Invalid Papal decree kind: ${kind}`);
  assertFactionId(targetFactionId);
  return `${kind}|${targetFactionId}`;
}

function papalCargoRequirements(matterId, commissionKind) {
  if (commissionKind === PAPAL_COMMISSION_RELIEF) {
    return Object.freeze([
      papalCargoRequirement(matterId, "grain", PAPAL_RELIEF_GRAIN_QUANTITY, 0),
      papalCargoRequirement(matterId, "gunpowder", PAPAL_RELIEF_GUNPOWDER_QUANTITY, 0)
    ]);
  }
  if (commissionKind === PAPAL_COMMISSION_ALMS) {
    return Object.freeze([
      papalCargoRequirement(matterId, "grain", PAPAL_ALMS_GRAIN_QUANTITY, 0)
    ]);
  }
  return Object.freeze([]);
}

function papalCargoRequirement(matterId, goodId, quantity, destinationOrder) {
  const requirement = Object.freeze({
    id: `papal.${matterId}.${goodId}`,
    goodId,
    quantity,
    destinationOrder
  });
  validatePapalCargoRequirement(requirement);
  return requirement;
}

function validatePapalCargoRequirement(requirement) {
  if (!requirement || typeof requirement !== "object" || Array.isArray(requirement) ||
      typeof requirement.id !== "string" || requirement.id.trim() === "" ||
      !PAPAL_LOGISTICS_GOOD_IDS.has(requirement.goodId) ||
      !Number.isInteger(requirement.quantity) || requirement.quantity <= 0 ||
      !Number.isInteger(requirement.destinationOrder) || requirement.destinationOrder < 0) {
    throw new Error("Invalid Papal cargo requirement");
  }
  return requirement;
}

function validatePapalLogistics(logistics) {
  if (!logistics || typeof logistics !== "object" || Array.isArray(logistics) ||
      !PAPAL_LOGISTICS_KINDS.has(logistics.kind)) {
    throw new Error("Invalid Papal logistics record");
  }
  assertFactionId(logistics.recipientFactionId);
  if (logistics.kind === PAPAL_COMMISSION_RELIEF) {
    assertFactionId(logistics.opponentFactionId);
    if (logistics.opponentFactionId === logistics.recipientFactionId) {
      throw new Error("Papal war relief repeats its opponent as recipient");
    }
  } else if (logistics.opponentFactionId !== null) {
    throw new Error("Papal alms cannot name a military opponent");
  }
  if (!Array.isArray(logistics.cargoRequirements) || logistics.cargoRequirements.length === 0) {
    throw new Error("Papal logistics requires cargo");
  }
  logistics.cargoRequirements.forEach((requirement) => validatePapalCargoRequirement(requirement));
  return logistics;
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
