import {
  DIPLOMACY_HOSTILE,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  factionById
} from "./factions.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import {
  adjustDiplomaticStance,
  makeDiplomaticPeace,
  validateWorldDiplomacy,
  worldDiplomacyBetween
} from "./worldDiplomacy.js";
import { dependentsOf } from "./suzerainty.js";
import { QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER } from "./questJourneyDialogue.js";
import { requireCityId, requireEntityId } from "./entityIds.js";

export const COURT_POLITICS_VERSION = 2;
export const COURT_MATTER_AVAILABLE = "available";
export const COURT_MATTER_COMMISSIONED = "commissioned";

export const COURT_KIND_MING_INVESTITURE = "ming-investiture";
export const COURT_KIND_MING_MEDIATION = "ming-mediation";
export const COURT_KIND_MING_CENSURE = "ming-censure";
export const COURT_KIND_MING_PROTECTION = "ming-protection";
export const COURT_KIND_SHOGUNAL_MEDIATION = "shogunal-mediation";
export const COURT_KIND_SHOGUNAL_CONFIRMATION = "shogunal-confirmation";
export const COURT_KIND_SHOGUNAL_CENSURE = "shogunal-censure";
export const COURT_KIND_WOKOU_SUPPRESSION = "wokou-suppression";
export const COURT_KIND_ROYAL_DISPATCH = "royal-dispatch";
export const COURT_KIND_ROYAL_OFFICER = "royal-officer";
export const COURT_KIND_GARRISON_MUSTER = "garrison-muster";
export const COURT_KIND_COLONIAL_ACCOUNTS = "colonial-accounts";

const MINUTES_PER_DAY = 24 * 60;
const COURT_MIN_ACTION_DAYS = 150;
const COURT_MAX_ACTION_DAYS = 245;
const COURT_AUTONOMOUS_DECISION_DAYS = 75;
const COURT_HISTORY_LIMIT = 32;
const MAX_CATCH_UP_ACTIONS = 8;
const OVERSEAS_DISTANCE_KM = 2200;
const FOUNDED_COLONY_DISTANCE_KM = 900;
const MING_FACTION_ID = "ming";
const JAPAN_FACTION_ID = "japan";
const IBERIAN_ADMINISTRATION_WEIGHT = 2.4;
const COURT_POLICY_WEIGHT = 2.1;

const COURT_KINDS = new Set([
  COURT_KIND_MING_INVESTITURE,
  COURT_KIND_MING_MEDIATION,
  COURT_KIND_MING_CENSURE,
  COURT_KIND_MING_PROTECTION,
  COURT_KIND_SHOGUNAL_MEDIATION,
  COURT_KIND_SHOGUNAL_CONFIRMATION,
  COURT_KIND_SHOGUNAL_CENSURE,
  COURT_KIND_WOKOU_SUPPRESSION,
  COURT_KIND_ROYAL_DISPATCH,
  COURT_KIND_ROYAL_OFFICER,
  COURT_KIND_GARRISON_MUSTER,
  COURT_KIND_COLONIAL_ACCOUNTS
]);

const ADMINISTRATION_KINDS = Object.freeze([
  COURT_KIND_ROYAL_DISPATCH,
  COURT_KIND_ROYAL_OFFICER,
  COURT_KIND_GARRISON_MUSTER,
  COURT_KIND_COLONIAL_ACCOUNTS
]);

const INTERNAL_SHOGUNAL_KINDS = Object.freeze([
  COURT_KIND_SHOGUNAL_MEDIATION,
  COURT_KIND_SHOGUNAL_CONFIRMATION,
  COURT_KIND_SHOGUNAL_CENSURE,
  COURT_KIND_WOKOU_SUPPRESSION
]);

const SOVEREIGN_FACTION_IDS = new Set(FACTIONS
  .map((faction) => faction.id)
  .filter((id) => id !== NEUTRAL_FACTION_ID && id !== PIRATE_FACTION_ID));

export function createCourtPolitics({ startMinute = 0, seedKey = "courts" } = {}) {
  assertMinute(startMinute, "court politics start");
  if (typeof seedKey !== "string" || seedKey.trim() === "") {
    throw new Error("Court politics requires a seed key");
  }
  const memory = {
    version: COURT_POLITICS_VERSION,
    seed: hashString32(`${seedKey}|court-politics`),
    sequence: 0,
    startMinute,
    lastUpdateMinute: startMinute,
    nextActionMinute: startMinute,
    portServiceMinutes: {},
    history: [],
    pendingMatter: null
  };
  memory.nextActionMinute += courtActionIntervalMinutes(memory, 0);
  return validateCourtPolitics(memory);
}

export function migrateCourtPolitics(memory, { startMinute = 0, seedKey = "courts" } = {}) {
  if (memory === undefined || memory === null) return createCourtPolitics({ startMinute, seedKey });
  return validateCourtPolitics(memory);
}

export function validateCourtPolitics(memory) {
  if (!memory || typeof memory !== "object" || ![1, COURT_POLITICS_VERSION].includes(memory.version)) {
    throw new Error(`Unsupported court politics version: ${memory?.version ?? "missing"}`);
  }
  if (!Number.isInteger(memory.seed) || memory.seed < 0 || memory.seed > 0xffffffff) {
    throw new Error(`Invalid court politics seed: ${memory.seed}`);
  }
  if (!Number.isInteger(memory.sequence) || memory.sequence < 0) {
    throw new Error(`Invalid court politics sequence: ${memory.sequence}`);
  }
  assertMinute(memory.startMinute, "court politics start");
  assertMinute(memory.lastUpdateMinute, "court politics update");
  assertMinute(memory.nextActionMinute, "next court action");
  if (memory.lastUpdateMinute < memory.startMinute || memory.nextActionMinute < memory.startMinute) {
    throw new Error("Court politics clock precedes its start");
  }
  if (!memory.portServiceMinutes || typeof memory.portServiceMinutes !== "object" ||
      Array.isArray(memory.portServiceMinutes)) {
    throw new Error("Court administration service memory must be an object");
  }
  for (const [portId, minute] of Object.entries(memory.portServiceMinutes)) {
    if (portId.trim() === "") throw new Error("Court administration service has an empty port id");
    assertMinute(minute, `court administration service ${portId}`);
  }
  if (!Array.isArray(memory.history) || memory.history.length > COURT_HISTORY_LIMIT) {
    throw new Error("Invalid court politics history");
  }
  const legacy = memory.version === 1;
  for (const action of memory.history) validateCourtAction(action, { legacy });
  if (memory.pendingMatter !== null) validateCourtMatter(memory.pendingMatter, { legacy });
  return memory;
}

export function nextCourtPoliticsMinute(memory) {
  validateCourtPolitics(memory);
  if (!memory.pendingMatter) return memory.nextActionMinute;
  return memory.pendingMatter.status === COURT_MATTER_COMMISSIONED
    ? Number.POSITIVE_INFINITY
    : memory.pendingMatter.autonomousDecisionMinute;
}

export function advanceCourtPolitics(memory, diplomacy, currentMinute, { portCities = [] } = {}) {
  validateCourtPolitics(memory);
  validateWorldDiplomacy(diplomacy);
  assertMinute(currentMinute, "court politics current");
  if (currentMinute < memory.lastUpdateMinute) {
    throw new Error(
      `Court politics cannot move backward: ${currentMinute} < ${memory.lastUpdateMinute}`
    );
  }
  validatePortList(portCities);
  const actions = [];
  const diplomacyEvents = [];
  const mattersOpened = [];
  let guard = 0;
  while (guard < MAX_CATCH_UP_ACTIONS) {
    if (memory.pendingMatter) {
      if (memory.pendingMatter.status === COURT_MATTER_AVAILABLE &&
          currentMinute >= memory.pendingMatter.autonomousDecisionMinute) {
        const result = enactCourtMatter(memory, diplomacy, memory.pendingMatter, {
          simMinute: memory.pendingMatter.autonomousDecisionMinute,
          source: "court-policy",
          portCities
        });
        actions.push(result.action);
        diplomacyEvents.push(...result.diplomacyEvents);
        memory.pendingMatter = null;
        guard += 1;
        continue;
      }
      break;
    }
    if (currentMinute < memory.nextActionMinute) break;
    const actionMinute = memory.nextActionMinute;
    const proposal = chooseScheduledCourtMatter(memory, diplomacy, portCities, actionMinute);
    if (proposal) {
      memory.pendingMatter = createCourtMatter(memory, proposal, actionMinute);
      mattersOpened.push(courtMatterView(memory.pendingMatter));
    }
    memory.sequence += 1;
    memory.nextActionMinute = actionMinute + courtActionIntervalMinutes(memory, memory.sequence);
    guard += 1;
  }
  if (guard >= MAX_CATCH_UP_ACTIONS && !memory.pendingMatter &&
      currentMinute >= memory.nextActionMinute) {
    memory.nextActionMinute = currentMinute + courtActionIntervalMinutes(memory, memory.sequence + 1);
  }
  memory.lastUpdateMinute = currentMinute;
  return Object.freeze({
    actions: Object.freeze(actions),
    diplomacyEvents: Object.freeze(diplomacyEvents),
    mattersOpened: Object.freeze(mattersOpened)
  });
}

export function courtPendingMatter(memory) {
  validateCourtPolitics(memory);
  return memory.pendingMatter ? courtMatterView(memory.pendingMatter) : null;
}

export function recentCourtActions(memory, limit = 5) {
  validateCourtPolitics(memory);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`Invalid court action history limit: ${limit}`);
  }
  return Object.freeze(memory.history.slice(0, limit).map((action) => Object.freeze({ ...action })));
}

export function courtMissionPlan(memory, origin, portCities) {
  validateCourtPolitics(memory);
  validatePort(origin, "court mission origin");
  validatePortList(portCities);
  const matter = memory.pendingMatter;
  if (!matter || matter.status !== COURT_MATTER_AVAILABLE) return null;
  if (matter.origin.cityId !== origin.cityId) return null;
  const destination = portCities.find((port) => port.cityId === matter.destination.cityId) || null;
  if (!destination) return null;
  if (destination.factionId !== matter.destination.factionId) return null;
  return Object.freeze({
    destination,
    commissionKind: matter.kind,
    matter: courtMatterView(matter)
  });
}

export function commissionCourtMatter(memory, {
  matterId,
  questId,
  acceptedMinute
}) {
  validateCourtPolitics(memory);
  assertMinute(acceptedMinute, "court commission acceptance");
  if (typeof questId !== "string" || questId.trim() === "") {
    throw new Error("Court commission requires a quest id");
  }
  const matter = memory.pendingMatter;
  if (!matter || matter.id !== matterId || matter.status !== COURT_MATTER_AVAILABLE) {
    throw new Error(`Court matter is not available for commission: ${matterId}`);
  }
  matter.status = COURT_MATTER_COMMISSIONED;
  matter.commission = { questId, acceptedMinute, deliveredMinute: null };
  validateCourtMatter(matter);
  return courtMatterView(matter);
}

export function deliverCourtCommission(memory, { matterId, questId, simMinute }) {
  validateCourtPolitics(memory);
  assertMinute(simMinute, "court commission delivery");
  const matter = requiredCommissionedMatter(memory, matterId, questId);
  matter.commission.deliveredMinute = simMinute;
  validateCourtMatter(matter);
  return courtMatterView(matter);
}

export function completeCourtCommission(memory, diplomacy, {
  matterId,
  questId,
  simMinute,
  portCities = []
}) {
  validateCourtPolitics(memory);
  validateWorldDiplomacy(diplomacy);
  assertMinute(simMinute, "court commission completion");
  validatePortList(portCities);
  const matter = requiredCommissionedMatter(memory, matterId, questId);
  if (matter.commission.deliveredMinute === null) {
    throw new Error(`Court commission has not reached ${matter.destination.name}: ${matterId}`);
  }
  const result = enactCourtMatter(memory, diplomacy, matter, {
    simMinute,
    source: "player-court-commission",
    portCities
  });
  memory.pendingMatter = null;
  return result;
}

export function courtMatterNotice(matter) {
  const view = matter?.origin ? matter : courtMatterView(matter);
  const destination = view.destination.name.toUpperCase();
  if (view.authorityFactionId === MING_FACTION_ID) {
    return `THE MING COURT DELIBERATES POLICY CONCERNING ${destination}`;
  }
  if (view.authorityFactionId === JAPAN_FACTION_ID) {
    return `THE ASHIKAGA BAKUFU SENDS ORDERS TOWARD ${destination}`;
  }
  return `${factionById(view.authorityFactionId).shortName.toUpperCase()} PREPARES A DISPATCH FOR ${destination}`;
}

export function courtActionNotice(action) {
  validateCourtAction(action);
  return action.headline.toUpperCase();
}

export function courtMatterDialogue(matter, { origin, destination, reward, rulerName }) {
  validateCourtMatter(matter);
  validatePort(origin, "court dialogue origin");
  validatePort(destination, "court dialogue destination");
  if (!Number.isInteger(reward) || reward <= 0) throw new Error(`Invalid court reward: ${reward}`);
  if (typeof rulerName !== "string" || rulerName.trim() === "") {
    throw new Error("Court dialogue requires a ruler name");
  }
  const home = portName(origin);
  const target = portName(destination);
  if (matter.authorityFactionId === MING_FACTION_ID) {
    const purpose = mingPurpose(matter.kind);
    return Object.freeze({
      offer: `${rulerName}'s Grand Secretariat has settled upon ${purpose}. Carry me under seal to ${target}, then return with the answer. The court will pay ${reward} db.`,
      underway: `The imperial memorial remains sealed. ${target} is ahead.`,
      negotiationOpening: `By imperial command, I present the court's determination concerning ${matterPolicySubject(matter)}.`,
      negotiation: `The order is entered in the register. Carry the formal reply back to ${home}.`,
      returnUnderway: `The reply is sealed. Set our course for ${home}; the court must learn whether its command was obeyed.`,
      homecoming: `The Grand Secretariat has received the reply. The treasury releases ${reward} db.`,
      intercession: "Stand down! This vessel carries an accredited imperial commissioner.",
      journeyEvents: courtJourneyBriefing(
        "ming-court-policy",
        `The memorial invokes investiture, tribute, and the peace of the seas. Its force lies in the imperial seal, but whether ${target} obeys will measure that force.`,
        "attentive"
      )
    });
  }
  if (matter.authorityFactionId === JAPAN_FACTION_ID) {
    return Object.freeze({
      offer: `${rulerName}'s council has issued ${shogunalPurpose(matter.kind)} for ${target}. Carry me there and return with the local answer for ${reward} db.`,
      underway: `The shogunal order remains sealed. ${target} is ahead.`,
      negotiationOpening: `Under the shogun's seal, I deliver this order and require the council's answer.`,
      negotiation: `The order is received. Their reply is careful, but it is a reply. Carry it back to ${home}.`,
      returnUnderway: `Kyoto must hear what was promised at ${target}, and what was conspicuously left unsaid.`,
      homecoming: `The bakufu has entered the answer in its records. Your payment is ${reward} db.`,
      intercession: "Stand down! This vessel carries the shogun's sealed order.",
      journeyEvents: courtJourneyBriefing(
        "shogunal-policy",
        `The shogun's seal still commands respect. Whether ${target} obeys promptly, delays, or answers only in ceremony will reveal how much authority remains behind it.`,
        "thoughtful"
      )
    });
  }
  const institution = matter.authorityFactionId === "spain"
    ? "the Casa de Contratacion"
    : matter.authorityFactionId === "portugal"
      ? "the royal council and the governor's secretariat"
      : "the royal council";
  return Object.freeze({
    offer: `${rulerName} requires ${administrationPurpose(matter.kind)} at ${target}. ${institution} will entrust the papers to you; return with the colonial officers' answer for ${reward} db.`,
    underway: `The royal dispatch remains sealed. ${target} is ahead.`,
    negotiationOpening: `I deliver the sovereign's commission. Assemble the officers of ${target} and enter it in the port register.`,
    negotiation: `The dispatch is entered and the officers' return is sealed. Carry it back to ${home}.`,
    returnUnderway: `The outpost has answered. Now ${home} must receive its accounts and petitions.`,
    homecoming: `The administration has received the colonial return. Your ${reward} db is ready.`,
    intercession: "Stand down! This vessel carries royal dispatches and colonial returns.",
    journeyEvents: courtJourneyBriefing(
      "overseas-administration",
      `A distant possession is held by ships, stores, accounts, and orders that actually arrive. These papers bind ${target} to the court at ${home}.`,
      "attentive"
    )
  });
}

function courtJourneyBriefing(id, text, expressionId) {
  return Object.freeze([
    Object.freeze({
      id,
      trigger: QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER,
      expressionId,
      text
    })
  ]);
}

function chooseScheduledCourtMatter(memory, diplomacy, portCities, actionMinute) {
  const candidates = [
    ...mingPolicyCandidates(diplomacy, portCities),
    ...shogunalPolicyCandidates(diplomacy, portCities, memory),
    ...administrationCandidates(memory, portCities, actionMinute)
  ];
  if (candidates.length === 0) return null;
  return weightedCandidate(candidates, `${memory.seed}|${memory.sequence}|${actionMinute}`);
}

function mingPolicyCandidates(diplomacy, portCities) {
  const origin = sovereignCapital(portCities, MING_FACTION_ID);
  if (!origin) return [];
  const dependents = dependentsOf(diplomacy.suzerainties, MING_FACTION_ID)
    .map((relationship) => ({
      relationship,
      port: sovereignCapital(portCities, relationship.vassalFactionId)
    }))
    .filter(({ port }) => port);
  const candidates = [];
  for (let i = 0; i < dependents.length; i += 1) {
    const dependent = dependents[i];
    const targetFactionId = dependent.relationship.vassalFactionId;
    const relation = worldDiplomacyBetween(diplomacy, MING_FACTION_ID, targetFactionId);
    candidates.push(policyCandidate({
      kind: [DIPLOMACY_HOSTILE, DIPLOMACY_WAR].includes(relation)
        ? COURT_KIND_MING_CENSURE
        : COURT_KIND_MING_INVESTITURE,
      authorityFactionId: MING_FACTION_ID,
      origin,
      destination: dependent.port,
      targetFactionId,
      weight: COURT_POLICY_WEIGHT
    }));
    for (let j = i + 1; j < dependents.length; j += 1) {
      const otherFactionId = dependents[j].relationship.vassalFactionId;
      const dependentRelation = worldDiplomacyBetween(diplomacy, targetFactionId, otherFactionId);
      if (![DIPLOMACY_HOSTILE, DIPLOMACY_WAR].includes(dependentRelation)) continue;
      candidates.push(policyCandidate({
        kind: COURT_KIND_MING_MEDIATION,
        authorityFactionId: MING_FACTION_ID,
        origin,
        destination: dependent.port,
        targetFactionId,
        secondaryFactionId: otherFactionId,
        weight: COURT_POLICY_WEIGHT * 1.5
      }));
    }
  }
  for (const dependent of dependents) {
    const protectedFactionId = dependent.relationship.vassalFactionId;
    const opponent = FACTIONS.find((faction) => (
      SOVEREIGN_FACTION_IDS.has(faction.id) &&
      faction.id !== MING_FACTION_ID &&
      faction.id !== protectedFactionId &&
      worldDiplomacyBetween(diplomacy, protectedFactionId, faction.id) === DIPLOMACY_WAR
    ));
    if (!opponent) continue;
    const opponentCapital = sovereignCapital(portCities, opponent.id);
    if (!opponentCapital) continue;
    candidates.push(policyCandidate({
      kind: COURT_KIND_MING_PROTECTION,
      authorityFactionId: MING_FACTION_ID,
      origin,
      destination: opponentCapital,
      targetFactionId: opponent.id,
      secondaryFactionId: protectedFactionId,
      weight: COURT_POLICY_WEIGHT * 1.25
    }));
  }
  return candidates;
}

function shogunalPolicyCandidates(diplomacy, portCities, memory) {
  const origin = sovereignCapital(portCities, JAPAN_FACTION_ID);
  if (!origin) return [];
  const dependents = dependencyDescendants(diplomacy.suzerainties, JAPAN_FACTION_ID)
    .map((relationship) => ({
      relationship,
      port: sovereignCapital(portCities, relationship.vassalFactionId)
    }))
    .filter(({ port }) => port);
  if (dependents.length > 0) {
    const candidates = dependents.map(({ relationship, port }) => {
      const relation = worldDiplomacyBetween(
        diplomacy,
        JAPAN_FACTION_ID,
        relationship.vassalFactionId
      );
      return policyCandidate({
        kind: [DIPLOMACY_HOSTILE, DIPLOMACY_WAR].includes(relation)
          ? COURT_KIND_SHOGUNAL_CENSURE
          : COURT_KIND_SHOGUNAL_CONFIRMATION,
        authorityFactionId: JAPAN_FACTION_ID,
        origin,
        destination: port,
        targetFactionId: relationship.vassalFactionId,
        weight: COURT_POLICY_WEIGHT
      });
    });
    for (let index = 0; index < dependents.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < dependents.length; otherIndex += 1) {
        const leftFactionId = dependents[index].relationship.vassalFactionId;
        const rightFactionId = dependents[otherIndex].relationship.vassalFactionId;
        if (![DIPLOMACY_HOSTILE, DIPLOMACY_WAR].includes(
          worldDiplomacyBetween(diplomacy, leftFactionId, rightFactionId)
        )) continue;
        candidates.push(policyCandidate({
          kind: COURT_KIND_SHOGUNAL_MEDIATION,
          authorityFactionId: JAPAN_FACTION_ID,
          origin,
          destination: dependents[index].port,
          targetFactionId: leftFactionId,
          secondaryFactionId: rightFactionId,
          weight: COURT_POLICY_WEIGHT * 1.6
        }));
      }
    }
    return candidates;
  }
  const domesticPorts = portCities
    .filter((port) => port.factionId === JAPAN_FACTION_ID && port.cityId !== origin.cityId)
    .filter((port) => greatCircleDistanceKm(origin, port) >= 120)
    .sort((a, b) => requireCityId(a).localeCompare(requireCityId(b)));
  return domesticPorts.map((destination, index) => policyCandidate({
    kind: INTERNAL_SHOGUNAL_KINDS[(memory.sequence + index) % INTERNAL_SHOGUNAL_KINDS.length],
    authorityFactionId: JAPAN_FACTION_ID,
    origin,
    destination,
    targetFactionId: JAPAN_FACTION_ID,
    weight: COURT_POLICY_WEIGHT * 0.8
  }));
}

function dependencyDescendants(memory, suzerainFactionId) {
  const descendants = [];
  const queue = [...dependentsOf(memory, suzerainFactionId)];
  const visited = new Set();
  while (queue.length > 0) {
    const relationship = queue.shift();
    if (visited.has(relationship.vassalFactionId)) continue;
    visited.add(relationship.vassalFactionId);
    descendants.push(relationship);
    queue.push(...dependentsOf(memory, relationship.vassalFactionId));
  }
  return descendants;
}

function administrationCandidates(memory, portCities, actionMinute) {
  const capitals = portCities.filter((port) => (
    port.isFactionCapital === true &&
    port.capitalOfFactionId === port.factionId &&
    SOVEREIGN_FACTION_IDS.has(port.factionId)
  ));
  const candidates = [];
  for (const origin of capitals) {
    for (const destination of portCities) {
      if (destination.cityId === origin.cityId || destination.factionId !== origin.factionId) continue;
      const distanceKm = greatCircleDistanceKm(origin, destination);
      const threshold = destination.playerFoundedColony === true
        ? FOUNDED_COLONY_DISTANCE_KM
        : OVERSEAS_DISTANCE_KM;
      if (distanceKm < threshold) continue;
      const serviceMinute = memory.portServiceMinutes[requireCityId(destination)] ?? memory.startMinute;
      const neglectYears = Math.max(0, actionMinute - serviceMinute) / (365 * MINUTES_PER_DAY);
      const imperialWeight = ["spain", "portugal"].includes(origin.factionId)
        ? IBERIAN_ADMINISTRATION_WEIGHT
        : 1;
      const colonyWeight = destination.playerFoundedColony === true ? 1.8 : 1;
      const distanceWeight = Math.min(2.2, 0.65 + distanceKm / 7000);
      candidates.push(policyCandidate({
        kind: administrationKind(memory, origin, destination),
        authorityFactionId: origin.factionId,
        origin,
        destination,
        targetFactionId: origin.factionId,
        weight: imperialWeight * colonyWeight * distanceWeight * (1 + neglectYears * 0.45)
      }));
    }
  }
  return candidates;
}

function administrationKind(memory, origin, destination) {
  const index = hashString32(
    `${memory.seed}|${memory.sequence}|${requireCityId(origin)}|${requireCityId(destination)}`
  ) % ADMINISTRATION_KINDS.length;
  return ADMINISTRATION_KINDS[index];
}

function createCourtMatter(memory, proposal, simMinute) {
  const matter = {
    id: `court-${memory.sequence}-${proposal.kind}-${requireCityId(proposal.destination)}`,
    status: COURT_MATTER_AVAILABLE,
    authorityFactionId: proposal.authorityFactionId,
    kind: proposal.kind,
    targetFactionId: proposal.targetFactionId,
    secondaryFactionId: proposal.secondaryFactionId || null,
    origin: portSnapshot(proposal.origin),
    destination: portSnapshot(proposal.destination),
    createdMinute: simMinute,
    autonomousDecisionMinute: simMinute + COURT_AUTONOMOUS_DECISION_DAYS * MINUTES_PER_DAY,
    commission: null
  };
  validateCourtMatter(matter);
  return matter;
}

function enactCourtMatter(memory, diplomacy, matter, { simMinute, source, portCities }) {
  validateCourtMatter(matter);
  assertMinute(simMinute, "court action");
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Court action requires a source");
  }
  const liveDestination = portCities.find((port) => port.cityId === matter.destination.cityId) || null;
  if (liveDestination && matterIsAdministrative(matter) &&
      liveDestination.factionId !== matter.authorityFactionId) {
    throw new Error(
      `${matter.destination.name} changed sovereign before ${matter.kind} could be completed`
    );
  }
  const diplomacyEvents = [];
  if ([COURT_KIND_MING_INVESTITURE, COURT_KIND_SHOGUNAL_CONFIRMATION].includes(matter.kind)) {
    diplomacyEvents.push(...adjustDiplomaticStance(
      diplomacy,
      matter.authorityFactionId,
      matter.targetFactionId,
      "improve",
      simMinute,
      { reason: matter.kind }
    ));
  } else if ([COURT_KIND_MING_CENSURE, COURT_KIND_SHOGUNAL_CENSURE].includes(matter.kind)) {
    diplomacyEvents.push(...adjustDiplomaticStance(
      diplomacy,
      matter.authorityFactionId,
      matter.targetFactionId,
      "worsen",
      simMinute,
      { reason: matter.kind }
    ));
  } else if ([COURT_KIND_MING_MEDIATION, COURT_KIND_SHOGUNAL_MEDIATION].includes(matter.kind) &&
      matter.secondaryFactionId && matter.targetFactionId !== matter.secondaryFactionId) {
    const relation = worldDiplomacyBetween(
      diplomacy,
      matter.targetFactionId,
      matter.secondaryFactionId
    );
    diplomacyEvents.push(...(relation === DIPLOMACY_WAR
      ? makeDiplomaticPeace(
          diplomacy,
          matter.targetFactionId,
          matter.secondaryFactionId,
          simMinute,
          { reason: matter.kind }
        )
      : adjustDiplomaticStance(
          diplomacy,
          matter.targetFactionId,
          matter.secondaryFactionId,
          "improve",
          simMinute,
          { reason: matter.kind }
        )));
  } else if (matter.kind === COURT_KIND_MING_PROTECTION) {
    diplomacyEvents.push(...adjustDiplomaticStance(
      diplomacy,
      MING_FACTION_ID,
      matter.targetFactionId,
      "worsen",
      simMinute,
      { reason: matter.kind }
    ));
  }
  if (matterIsAdministrative(matter)) {
    memory.portServiceMinutes[matter.destination.cityId] = simMinute;
  }
  const action = {
    id: `court-action-${memory.sequence}-${matter.id}`,
    simMinute,
    source,
    authorityFactionId: matter.authorityFactionId,
    kind: matter.kind,
    targetFactionId: matter.targetFactionId,
    secondaryFactionId: matter.secondaryFactionId,
    destinationCityId: matter.destination.cityId,
    destinationName: matter.destination.name,
    headline: courtActionHeadline(matter),
    detail: courtActionDetail(matter)
  };
  validateCourtAction(action);
  memory.history.unshift(action);
  if (memory.history.length > COURT_HISTORY_LIMIT) memory.history.length = COURT_HISTORY_LIMIT;
  return Object.freeze({ action: Object.freeze({ ...action }), diplomacyEvents: Object.freeze(diplomacyEvents) });
}

function courtActionHeadline(matter) {
  const authority = factionById(matter.authorityFactionId).shortName;
  const destination = matter.destination.name;
  if (matter.kind === COURT_KIND_MING_INVESTITURE) return `Ming confirms the investiture of ${factionById(matter.targetFactionId).shortName}`;
  if (matter.kind === COURT_KIND_MING_MEDIATION) return "Ming court brokers peace among tributaries";
  if (matter.kind === COURT_KIND_MING_CENSURE) return `Ming court censures ${factionById(matter.targetFactionId).shortName}`;
  if (matter.kind === COURT_KIND_MING_PROTECTION) return `Ming court admonishes ${factionById(matter.targetFactionId).shortName}`;
  if (matter.kind === COURT_KIND_SHOGUNAL_MEDIATION) return `Ashikaga mediation reaches ${destination}`;
  if (matter.kind === COURT_KIND_SHOGUNAL_CONFIRMATION) return `Ashikaga authority confirmed at ${destination}`;
  if (matter.kind === COURT_KIND_SHOGUNAL_CENSURE) return `Ashikaga censure reaches ${destination}`;
  if (matter.kind === COURT_KIND_WOKOU_SUPPRESSION) return `Bakufu orders wokou suppression near ${destination}`;
  return `${authority} renews its authority at ${destination}`;
}

function courtActionDetail(matter) {
  const destination = matter.destination.name;
  if (matter.kind === COURT_KIND_MING_INVESTITURE) {
    return `The imperial patent and seal recognize ${factionById(matter.targetFactionId).name}, binding recognition to tribute and orderly trade.`;
  }
  if (matter.kind === COURT_KIND_MING_MEDIATION) {
    return "The Board of Rites invokes the tributary order to press two courts toward peace.";
  }
  if (matter.kind === COURT_KIND_MING_CENSURE) {
    return "The emperor withholds favour and warns that recognition and licensed trade depend upon obedience.";
  }
  if (matter.kind === COURT_KIND_MING_PROTECTION) {
    return `The emperor admonishes ${factionById(matter.targetFactionId).name} for disturbing a recognized tributary.`;
  }
  if (matter.authorityFactionId === JAPAN_FACTION_ID) {
    return `The shogun's seal is entered at ${destination}; enforcement still depends upon the houses that receive it.`;
  }
  return `${factionById(matter.authorityFactionId).name} receives the officers' return from ${destination}, restoring the chain of orders, stores, and accounts.`;
}

function matterIsAdministrative(matter) {
  return ADMINISTRATION_KINDS.includes(matter.kind);
}

function requiredCommissionedMatter(memory, matterId, questId) {
  const matter = memory.pendingMatter;
  if (!matter || matter.id !== matterId || matter.status !== COURT_MATTER_COMMISSIONED ||
      matter.commission?.questId !== questId) {
    throw new Error(`Court commission does not match the pending matter: ${matterId}/${questId}`);
  }
  return matter;
}

function courtMatterView(matter) {
  validateCourtMatter(matter);
  return Object.freeze({
    ...matter,
    origin: Object.freeze({ ...matter.origin }),
    destination: Object.freeze({ ...matter.destination }),
    commission: matter.commission ? Object.freeze({ ...matter.commission }) : null
  });
}

function validateCourtMatter(matter, { legacy = false } = {}) {
  if (!matter || typeof matter !== "object" || typeof matter.id !== "string" || matter.id === "") {
    throw new Error("Invalid court matter");
  }
  if (![COURT_MATTER_AVAILABLE, COURT_MATTER_COMMISSIONED].includes(matter.status)) {
    throw new Error(`Invalid court matter status: ${matter.status}`);
  }
  if (!COURT_KINDS.has(matter.kind)) throw new Error(`Invalid court matter kind: ${matter.kind}`);
  assertFactionId(matter.authorityFactionId);
  assertFactionId(matter.targetFactionId);
  if (matter.secondaryFactionId !== null) assertFactionId(matter.secondaryFactionId);
  validatePortSnapshot(matter.origin, "court matter origin", { legacy });
  validatePortSnapshot(matter.destination, "court matter destination", { legacy });
  assertMinute(matter.createdMinute, "court matter creation");
  assertMinute(matter.autonomousDecisionMinute, "court matter decision");
  if (matter.autonomousDecisionMinute <= matter.createdMinute) {
    throw new Error(`Court matter decision does not follow creation: ${matter.id}`);
  }
  if (matter.status === COURT_MATTER_AVAILABLE && matter.commission !== null) {
    throw new Error(`Available court matter has a commission: ${matter.id}`);
  }
  if (matter.status === COURT_MATTER_COMMISSIONED) {
    if (!matter.commission || typeof matter.commission.questId !== "string" ||
        matter.commission.questId === "") {
      throw new Error(`Commissioned court matter has no quest: ${matter.id}`);
    }
    assertMinute(matter.commission.acceptedMinute, "court commission acceptance");
    if (matter.commission.deliveredMinute !== null) {
      assertMinute(matter.commission.deliveredMinute, "court commission delivery");
    }
  }
  return matter;
}

function validateCourtAction(action, { legacy = false } = {}) {
  if (!action || typeof action !== "object" || typeof action.id !== "string" || action.id === "") {
    throw new Error("Invalid court action");
  }
  assertMinute(action.simMinute, "court action");
  assertFactionId(action.authorityFactionId);
  assertFactionId(action.targetFactionId);
  if (action.secondaryFactionId !== null) assertFactionId(action.secondaryFactionId);
  if (!COURT_KINDS.has(action.kind)) throw new Error(`Invalid court action kind: ${action.kind}`);
  const identityField = legacy ? "destinationPortId" : "destinationCityId";
  for (const field of ["source", identityField, "destinationName", "headline", "detail"]) {
    if (typeof action[field] !== "string" || action[field].trim() === "") {
      throw new Error(`Court action requires ${field}`);
    }
  }
  return action;
}

function policyCandidate({
  kind,
  authorityFactionId,
  origin,
  destination,
  targetFactionId,
  secondaryFactionId = null,
  weight
}) {
  if (!COURT_KINDS.has(kind)) throw new Error(`Invalid court policy candidate kind: ${kind}`);
  assertFactionId(authorityFactionId);
  assertFactionId(targetFactionId);
  if (secondaryFactionId !== null) assertFactionId(secondaryFactionId);
  validatePort(origin, "court policy origin");
  validatePort(destination, "court policy destination");
  if (!Number.isFinite(weight) || weight <= 0) throw new Error(`Invalid court policy weight: ${weight}`);
  return Object.freeze({
    kind,
    authorityFactionId,
    origin,
    destination,
    targetFactionId,
    secondaryFactionId,
    weight
  });
}

function sovereignCapital(portCities, factionId) {
  return portCities.find((port) => (
    port.factionId === factionId &&
    port.isFactionCapital === true &&
    port.capitalOfFactionId === factionId
  )) || null;
}

function weightedCandidate(candidates, seed) {
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let roll = seededFraction(seed) * total;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll < 0) return candidate;
  }
  return candidates.at(-1);
}

function courtActionIntervalMinutes(memory, sequence) {
  const span = COURT_MAX_ACTION_DAYS - COURT_MIN_ACTION_DAYS + 1;
  const days = COURT_MIN_ACTION_DAYS + (
    hashString32(`${memory.seed}|court-interval|${sequence}`) % span
  );
  return days * MINUTES_PER_DAY;
}

function portSnapshot(port) {
  validatePort(port, "court port snapshot");
  return {
    tileId: port.tileId,
    cityId: requireCityId(port, "Court port snapshot"),
    name: portName(port),
    country: port.country || "",
    factionId: port.factionId
  };
}

function portName(port) {
  return port.displayCity || port.city;
}

function validatePortList(portCities) {
  if (!Array.isArray(portCities)) throw new Error("Court politics requires a port list");
  for (const port of portCities) validatePort(port, "court politics port");
}

function validatePort(port, label) {
  if (!port || !Number.isInteger(port.tileId) || typeof portName(port) !== "string" ||
      portName(port).trim() === "" || typeof port.factionId !== "string") {
    throw new Error(`Invalid ${label}`);
  }
  assertFactionId(port.factionId);
  requireCityId(port, label);
  if (!Number.isFinite(port.lat) || !Number.isFinite(port.lon)) {
    throw new Error(`${label} requires coordinates: ${portName(port)}`);
  }
  return port;
}

function validatePortSnapshot(port, label, { legacy = false } = {}) {
  const identity = legacy ? port?.portId : port?.cityId;
  if (!port || !Number.isInteger(port.tileId) || typeof identity !== "string" ||
      identity === "" || typeof port.name !== "string" || port.name === "" ||
      typeof port.country !== "string") {
    throw new Error(`Invalid ${label}`);
  }
  requireEntityId(identity, label);
  assertFactionId(port.factionId);
}

function mingPurpose(kind) {
  if (kind === COURT_KIND_MING_INVESTITURE) return "a patent of investiture and recognition";
  if (kind === COURT_KIND_MING_MEDIATION) return "an imperial mediation between tributary courts";
  if (kind === COURT_KIND_MING_CENSURE) return "a formal censure and warning";
  return "an admonition in defence of a recognized tributary";
}

function shogunalPurpose(kind) {
  if (kind === COURT_KIND_SHOGUNAL_MEDIATION) return "a shogunal mediation";
  if (kind === COURT_KIND_SHOGUNAL_CONFIRMATION) return "a patent confirming office and authority";
  if (kind === COURT_KIND_SHOGUNAL_CENSURE) return "a formal censure";
  return "orders for the suppression of wokou raiders";
}

function administrationPurpose(kind) {
  if (kind === COURT_KIND_ROYAL_OFFICER) return "a royal officer and fresh instructions";
  if (kind === COURT_KIND_GARRISON_MUSTER) return "a muster of the garrison and its stores";
  if (kind === COURT_KIND_COLONIAL_ACCOUNTS) return "the inspection and return of colonial accounts";
  return "sealed royal dispatches";
}

function matterPolicySubject(matter) {
  if (matter.secondaryFactionId) {
    return `${factionById(matter.targetFactionId).name} and ${factionById(matter.secondaryFactionId).name}`;
  }
  return factionById(matter.targetFactionId).name;
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function seededFraction(seed) {
  return hashString32(seed) / 0x100000000;
}

function hashString32(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
