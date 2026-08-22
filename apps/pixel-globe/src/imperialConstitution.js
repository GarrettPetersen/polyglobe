import { assertFactionId, factionById } from "./factions.js";
import {
  IMPERIAL_ESTATES_1522,
  imperialCircleMembers,
  imperialEstateForCityId,
  imperialEstateForFaction,
  isImperialMemberFaction
} from "./imperialEstates.js";

export const IMPERIAL_CONSTITUTION_VERSION = 1;
export const IMPERIAL_HISTORY_LIMIT = 40;
export const IMPERIAL_AUTHORITY_MIN = 0;
export const IMPERIAL_AUTHORITY_MAX = 100;

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

const INITIAL_HABSBURG_SUPPORT = Object.freeze({
  mainz: 74,
  "cologne-electorate": 68,
  trier: 64,
  palatinate: 58,
  bohemia: 70,
  "electoral-saxony": 52,
  brandenburg: 60
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
    emperorFactionId: "habsburg",
    authority: 46,
    electionSequence: 0,
    electors: Object.fromEntries(ELECTOR_FACTION_IDS.map((factionId) => [
      factionId,
      {
        factionId,
        voteFactionId: "habsburg",
        supportByCandidateId: {
          habsburg: INITIAL_HABSBURG_SUPPORT[factionId],
          france: Math.max(8, 100 - INITIAL_HABSBURG_SUPPORT[factionId] - 18)
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
  if (memory.version !== IMPERIAL_CONSTITUTION_VERSION) {
    throw new Error(`Unsupported Imperial constitution version: ${memory.version ?? "missing"}`);
  }
  const initial = createImperialConstitution({ startMinute });
  return validateImperialConstitution({
    ...initial,
    ...memory,
    electors: Object.fromEntries(ELECTOR_FACTION_IDS.map((factionId) => [
      factionId,
      memory.electors?.[factionId] || initial.electors[factionId]
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
  source = "imperial-election"
}) {
  validateImperialConstitution(memory);
  assertMinute(simMinute, "Imperial election minute");
  if (!Array.isArray(candidateFactionIds) || candidateFactionIds.length < 1) {
    throw new Error("Imperial election requires candidates");
  }
  const candidates = [...new Set(candidateFactionIds.map(assertFactionId))];
  const tally = Object.fromEntries(candidates.map((factionId) => [factionId, 0]));
  const votes = {};
  for (const electorId of ELECTOR_FACTION_IDS) {
    const elector = memory.electors[electorId];
    const voteFactionId = [...candidates].sort((left, right) => {
      const scoreDifference = electorSupport(elector, right) - electorSupport(elector, left);
      if (scoreDifference !== 0) return scoreDifference;
      if (left === memory.emperorFactionId) return -1;
      if (right === memory.emperorFactionId) return 1;
      return left.localeCompare(right);
    })[0];
    elector.voteFactionId = voteFactionId;
    votes[electorId] = voteFactionId;
    tally[voteFactionId] += 1;
  }
  const winnerFactionId = [...candidates].sort((left, right) => (
    tally[right] - tally[left] ||
    (left === memory.emperorFactionId ? -1 : right === memory.emperorFactionId ? 1 : left.localeCompare(right))
  ))[0];
  const previousEmperorFactionId = memory.emperorFactionId;
  memory.emperorFactionId = winnerFactionId;
  memory.electionSequence += 1;
  memory.lastUpdateMinute = Math.max(memory.lastUpdateMinute, simMinute);
  const event = freezeEvent({
    kind: "election",
    simMinute,
    source,
    previousEmperorFactionId,
    emperorFactionId: winnerFactionId,
    votes: Object.freeze(votes),
    tally: Object.freeze(tally)
  });
  recordHistory(memory, event);
  return event;
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
    const habsburgSupportDelta = religionId === "lutheran" ? -18 : religionId === "mixed" ? -6 : 6;
    const reformSupportDelta = religionId === "lutheran" ? 18 : religionId === "mixed" ? 6 : -4;
    elector.supportByCandidateId.habsburg = clamp(
      electorSupport(elector, "habsburg") + habsburgSupportDelta,
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
  return elector.supportByCandidateId[candidateFactionId] ?? 0;
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
