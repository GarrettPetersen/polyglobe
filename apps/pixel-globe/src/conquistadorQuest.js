import {
  CANONICAL_PORTS,
  portMatchesCanonicalReference,
  requireCanonicalPort
} from "./canonicalPorts.js";
import {
  effectivePortFactionId,
  markFactionCollapsedByConquest,
  recordCityDisplayName,
  recordPortCapture
} from "./portConquest.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { requireCityId, requireEntityId } from "./entityIds.js";
import { factionSeaCapitalForId, NEUTRAL_FACTION_ID } from "./factions.js";

export const CONQUISTADOR_QUEST_VERSION = 3;
export const CONQUISTADOR_QUEST_ID = "spanish-conquest-of-the-inca";
export const CONQUISTADOR_STAGE_DORMANT = "dormant";
export const CONQUISTADOR_STAGE_FETCH = "fetch";
export const CONQUISTADOR_STAGE_READY = "ready";
export const CONQUISTADOR_STAGE_CAPTURE = "capture";
export const CONQUISTADOR_STAGE_CAMPAIGN = "campaign";
export const CONQUISTADOR_STAGE_REWARD_READY = "reward-ready";
export const CONQUISTADOR_STAGE_COMPLETE = "complete";
export const CONQUISTADOR_REWARD_DOUBLOONS = 20000;
export const CONQUISTADOR_CAMPAIGN_DAYS = 365;
export const CONQUISTADOR_ORIGIN_FACTION_ID = "spain";
export const CONQUISTADOR_TARGET_FACTION_ID = "inca";
export const CONQUISTADOR_COMPANY_MAX_STRENGTH = 24;
export const CONQUISTADOR_FIRST_ASSAULT_BONUS = 0.3;
export const CONQUISTADOR_RETRY_ASSAULT_BONUS = 0.08;

const MINUTES_PER_DAY = 24 * 60;
const CONQUISTADOR_CAMPAIGN_MINUTES = CONQUISTADOR_CAMPAIGN_DAYS * MINUTES_PER_DAY;
const STAGES = new Set([
  CONQUISTADOR_STAGE_DORMANT,
  CONQUISTADOR_STAGE_FETCH,
  CONQUISTADOR_STAGE_READY,
  CONQUISTADOR_STAGE_CAPTURE,
  CONQUISTADOR_STAGE_CAMPAIGN,
  CONQUISTADOR_STAGE_REWARD_READY,
  CONQUISTADOR_STAGE_COMPLETE
]);

export const CONQUISTADOR_FETCH_STAGES = Object.freeze([
  fetchStage("provisions", "grain", "Grain", 12, 300, "the landing company"),
  fetchStage("weapons", "arms", "Pikes & Blades", 6, 500, "the soldiers"),
  fetchStage("powder", "gunpowder", "Gunpowder", 6, 700, "the siege guns")
]);

const SPANISH_CITY_NAMES = Object.freeze(new Map([
  ["chanchan|peru", "Trujillo"]
]));

export function createConquistadorQuestMemory() {
  return {
    version: CONQUISTADOR_QUEST_VERSION,
    stage: CONQUISTADOR_STAGE_DORMANT,
    offerSeen: false,
    originCityId: null,
    originTileId: null,
    targetCityId: null,
    targetTileId: null,
    fetchStageIndex: 0,
    companyStrength: 0,
    companyNeedsReplenishment: false,
    failedAssaults: 0,
    capturedAtMinute: null,
    rewardReadyMinute: null,
    transferSchedule: [],
    transferredCityIds: [],
    completedAtMinute: null
  };
}

export function migrateConquistadorQuestMemory(memory) {
  if (memory === undefined || memory === null) return createConquistadorQuestMemory();
  if (![1, 2, CONQUISTADOR_QUEST_VERSION].includes(memory.version)) {
    throw new Error(`Unsupported conquistador quest version: ${memory.version ?? "missing"}`);
  }
  const migratedCompany = memory.version === 1
    ? {
        companyStrength: memory.stage === CONQUISTADOR_STAGE_CAPTURE
          ? CONQUISTADOR_COMPANY_MAX_STRENGTH
          : 0,
        companyNeedsReplenishment: false,
        failedAssaults: 0
      }
    : {};
  const canUseCanonicalVersion = memory.version === CONQUISTADOR_QUEST_VERSION || (
    memory.stage === CONQUISTADOR_STAGE_DORMANT &&
    (memory.originTileId ?? null) === null &&
    (memory.targetTileId ?? null) === null
  );
  const migrated = {
    ...createConquistadorQuestMemory(),
    ...memory,
    ...migratedCompany,
    version: canUseCanonicalVersion ? CONQUISTADOR_QUEST_VERSION : 2,
    transferSchedule: [...(memory.transferSchedule || [])],
    ...(canUseCanonicalVersion
      ? { transferredCityIds: [...(memory.transferredCityIds || [])] }
      : { transferredTileIds: [...(memory.transferredTileIds || [])] })
  };
  if (canUseCanonicalVersion) delete migrated.transferredTileIds;
  return validateConquistadorQuestMemory(migrated);
}

export function validateConquistadorQuestMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Conquistador quest memory must be an object");
  }
  if (memory.version === 2) return validateLegacyConquistadorQuestMemory(memory);
  if (memory.version !== CONQUISTADOR_QUEST_VERSION) {
    throw new Error(`Invalid conquistador quest version: ${memory.version}`);
  }
  if (!STAGES.has(memory.stage)) throw new Error(`Invalid conquistador quest stage: ${memory.stage}`);
  if (typeof memory.offerSeen !== "boolean") throw new Error("Conquistador offer flag must be boolean");
  assertOptionalTileId(memory.originTileId, "origin");
  assertOptionalTileId(memory.targetTileId, "target");
  assertOptionalEntityId(memory.originCityId, "origin");
  assertOptionalEntityId(memory.targetCityId, "target");
  if (!Number.isInteger(memory.fetchStageIndex) || memory.fetchStageIndex < 0 ||
      memory.fetchStageIndex > CONQUISTADOR_FETCH_STAGES.length) {
    throw new Error(`Invalid conquistador fetch stage index: ${memory.fetchStageIndex}`);
  }
  if (!Number.isInteger(memory.companyStrength) || memory.companyStrength < 0 ||
      memory.companyStrength > CONQUISTADOR_COMPANY_MAX_STRENGTH) {
    throw new Error(`Invalid conquistador company strength: ${memory.companyStrength}`);
  }
  if (typeof memory.companyNeedsReplenishment !== "boolean") {
    throw new Error("Conquistador company replenishment flag must be boolean");
  }
  if (!Number.isInteger(memory.failedAssaults) || memory.failedAssaults < 0) {
    throw new Error(`Invalid conquistador failed assault count: ${memory.failedAssaults}`);
  }
  assertOptionalMinute(memory.capturedAtMinute, "capture");
  assertOptionalMinute(memory.rewardReadyMinute, "reward");
  assertOptionalMinute(memory.completedAtMinute, "completion");
  if (!Array.isArray(memory.transferSchedule)) throw new Error("Conquistador transfers must be an array");
  const scheduledCityIds = new Set();
  let previousMinute = -Infinity;
  for (const transfer of memory.transferSchedule) {
    if (typeof transfer?.cityId !== "string" || transfer.cityId === "" ||
        !Number.isInteger(transfer.tileId) || transfer.tileId < 0 ||
        !Number.isFinite(transfer.simMinute) || transfer.simMinute < 0) {
      throw new Error("Invalid conquistador transfer");
    }
    if (scheduledCityIds.has(transfer.cityId)) {
      throw new Error(`Duplicate conquistador transfer city: ${transfer.cityId}`);
    }
    if (transfer.simMinute < previousMinute) {
      throw new Error("Conquistador transfers must be chronological");
    }
    scheduledCityIds.add(transfer.cityId);
    previousMinute = transfer.simMinute;
  }
  if (!Array.isArray(memory.transferredCityIds) ||
      memory.transferredCityIds.some((cityId) => !scheduledCityIds.has(cityId)) ||
      new Set(memory.transferredCityIds).size !== memory.transferredCityIds.length) {
    throw new Error("Invalid completed conquistador transfers");
  }
  const bound = memory.originCityId !== null && memory.targetCityId !== null &&
    memory.originTileId !== null && memory.targetTileId !== null;
  if (memory.stage === CONQUISTADOR_STAGE_DORMANT && bound) {
    throw new Error("Dormant conquistador quest cannot be bound to ports");
  }
  if (memory.stage !== CONQUISTADOR_STAGE_DORMANT && !bound) {
    throw new Error("Active conquistador quest requires origin and target ports");
  }
  if ([CONQUISTADOR_STAGE_CAMPAIGN, CONQUISTADOR_STAGE_REWARD_READY,
    CONQUISTADOR_STAGE_COMPLETE].includes(memory.stage)) {
    if (memory.capturedAtMinute === null || memory.rewardReadyMinute === null) {
      throw new Error("Conquistador aftermath requires capture and reward dates");
    }
  }
  if (memory.stage !== CONQUISTADOR_STAGE_CAPTURE &&
      (memory.companyStrength !== 0 || memory.companyNeedsReplenishment)) {
    throw new Error("Conquistador company can only remain embarked during the capture stage");
  }
  if (memory.companyNeedsReplenishment && memory.companyStrength >= CONQUISTADOR_COMPANY_MAX_STRENGTH) {
    throw new Error("A full conquistador company cannot need replenishment");
  }
  return memory;
}

export function conquistadorQuestAvailable(memory, portCities) {
  validateConquistadorQuestMemory(memory);
  if (memory.stage !== CONQUISTADOR_STAGE_DORMANT) return false;
  const { origin, target } = conquistadorQuestPorts(portCities);
  return origin.factionId === CONQUISTADOR_ORIGIN_FACTION_ID &&
    target.factionId === CONQUISTADOR_TARGET_FACTION_ID;
}

export function conquistadorQuestPorts(portCities) {
  return Object.freeze({
    origin: requireCanonicalPort(
      portCities,
      CANONICAL_PORTS.PANAMA_CITY,
      "Spanish conquistador quest"
    ),
    target: requireCanonicalPort(
      portCities,
      CANONICAL_PORTS.CHAN_CHAN,
      "Spanish conquistador quest"
    )
  });
}

export function conquistadorQuestView(memory, portCities, currentMinute, { cargo = {}, eligibility = null } = {}) {
  validateConquistadorQuestMemory(memory);
  assertMinute(currentMinute, "conquistador-view");
  const canonical = conquistadorQuestPorts(portCities);
  const origin = boundPort(memory.originCityId, canonical.origin, portCities, "origin");
  const target = boundPort(memory.targetCityId, canonical.target, portCities, "target");
  const fetchStage = memory.stage === CONQUISTADOR_STAGE_FETCH
    ? CONQUISTADOR_FETCH_STAGES[memory.fetchStageIndex]
    : null;
  const held = fetchStage ? cargo[fetchStage.goodId] || 0 : 0;
  return Object.freeze({
    ...memory,
    available: conquistadorQuestAvailable(memory, portCities),
    origin,
    target,
    fetchStage,
    held,
    eligibility,
    daysUntilReward: memory.rewardReadyMinute === null
      ? null
      : Math.max(0, Math.ceil((memory.rewardReadyMinute - currentMinute) / MINUTES_PER_DAY)),
    reward: CONQUISTADOR_REWARD_DOUBLOONS
  });
}

export function acceptConquistadorQuest(memory, portCities) {
  validateConquistadorQuestMemory(memory);
  if (!conquistadorQuestAvailable(memory, portCities)) {
    throw new Error("Spanish conquistador expedition is not available");
  }
  const { origin, target } = conquistadorQuestPorts(portCities);
  memory.stage = CONQUISTADOR_STAGE_FETCH;
  memory.offerSeen = true;
  memory.originCityId = requireCityId(origin, "Conquistador origin");
  memory.originTileId = origin.tileId;
  memory.targetCityId = requireCityId(target, "Conquistador target");
  memory.targetTileId = target.tileId;
  memory.fetchStageIndex = 0;
  return validateConquistadorQuestMemory(memory);
}

export function markConquistadorOfferSeen(memory) {
  validateConquistadorQuestMemory(memory);
  memory.offerSeen = true;
  return memory;
}

export function conquistadorFetchRequirementId(stage) {
  if (!CONQUISTADOR_FETCH_STAGES.includes(stage)) {
    throw new Error(`Unknown conquistador supply stage: ${stage?.id || "missing"}`);
  }
  return `${CONQUISTADOR_QUEST_ID}:${stage.id}`;
}

export function completeConquistadorFetchStage(memory, stageId) {
  validateConquistadorQuestMemory(memory);
  if (memory.stage !== CONQUISTADOR_STAGE_FETCH) {
    throw new Error("Conquistador supplies can only be completed during the fetch stage");
  }
  const stage = CONQUISTADOR_FETCH_STAGES[memory.fetchStageIndex];
  if (stage?.id !== stageId) throw new Error(`Conquistador supply stage mismatch: ${stageId}`);
  memory.fetchStageIndex += 1;
  if (memory.fetchStageIndex === CONQUISTADOR_FETCH_STAGES.length) {
    memory.stage = CONQUISTADOR_STAGE_READY;
  }
  return validateConquistadorQuestMemory(memory);
}

export function beginConquistadorExpedition(memory, eligibility) {
  validateConquistadorQuestMemory(memory);
  if (memory.stage !== CONQUISTADOR_STAGE_READY) {
    throw new Error("Conquistador expedition is not ready to depart");
  }
  if (!eligibility?.eligible) throw new Error("Conquistador expedition requires a conquest-capable ship");
  memory.stage = CONQUISTADOR_STAGE_CAPTURE;
  memory.companyStrength = CONQUISTADOR_COMPANY_MAX_STRENGTH;
  memory.companyNeedsReplenishment = false;
  return validateConquistadorQuestMemory(memory);
}

export function conquistadorCompanyAssaultStatus(memory, city) {
  validateConquistadorQuestMemory(memory);
  if (memory.stage !== CONQUISTADOR_STAGE_CAPTURE || city?.cityId !== memory.targetCityId) return null;
  const combatStrengthMultiplierBonus = Math.min(
    0.46,
    CONQUISTADOR_FIRST_ASSAULT_BONUS + memory.failedAssaults * CONQUISTADOR_RETRY_ASSAULT_BONUS
  );
  return Object.freeze({
    strength: memory.companyStrength,
    maximumStrength: CONQUISTADOR_COMPANY_MAX_STRENGTH,
    needsReplenishment: memory.companyNeedsReplenishment,
    ready: memory.companyStrength > 0 && !memory.companyNeedsReplenishment,
    failedAssaults: memory.failedAssaults,
    attemptNumber: memory.failedAssaults + 1,
    guaranteedSuccess: memory.failedAssaults >= 2,
    combatStrengthMultiplierBonus
  });
}

export function recordConquistadorAssaultFailure(memory, companyCasualties) {
  validateConquistadorQuestMemory(memory);
  if (memory.stage !== CONQUISTADOR_STAGE_CAPTURE) {
    throw new Error("Conquistador assault failure requires an active expedition");
  }
  if (!Number.isInteger(companyCasualties) || companyCasualties <= 0 ||
      companyCasualties > memory.companyStrength) {
    throw new Error(`Invalid conquistador company casualties: ${companyCasualties}`);
  }
  memory.companyStrength -= companyCasualties;
  memory.companyNeedsReplenishment = true;
  memory.failedAssaults += 1;
  validateConquistadorQuestMemory(memory);
  return Object.freeze({
    casualties: companyCasualties,
    remaining: memory.companyStrength,
    failedAssaults: memory.failedAssaults
  });
}

export function conquistadorCompanyReplenishmentPolicy(memory, portCities) {
  validateConquistadorQuestMemory(memory);
  if (!Array.isArray(portCities) || portCities.length === 0) {
    throw new Error("Conquistador replenishment policy requires the port catalog");
  }
  const spanishPortsRemain = portCities.some(
    (port) => port?.factionId === CONQUISTADOR_ORIGIN_FACTION_ID
  );
  return Object.freeze({
    spanishPortsRemain,
    exileBaseCityId: spanishPortsRemain ? null : memory.originCityId
  });
}

export function isConquistadorCompanyReplenishmentPort(memory, city, portCities) {
  validateConquistadorQuestMemory(memory);
  if (memory.stage !== CONQUISTADOR_STAGE_CAPTURE || !memory.companyNeedsReplenishment) return false;
  const policy = conquistadorCompanyReplenishmentPolicy(memory, portCities);
  return policy.spanishPortsRemain
    ? city?.factionId === CONQUISTADOR_ORIGIN_FACTION_ID
    : city?.cityId === policy.exileBaseCityId;
}

export function replenishConquistadorCompany(memory, city, portCities) {
  if (!isConquistadorCompanyReplenishmentPort(memory, city, portCities)) {
    throw new Error("Conquistador company can only replenish at a Spanish port or its exile base");
  }
  const added = CONQUISTADOR_COMPANY_MAX_STRENGTH - memory.companyStrength;
  if (added <= 0) throw new Error("Conquistador company has no missing soldiers");
  memory.companyStrength = CONQUISTADOR_COMPANY_MAX_STRENGTH;
  memory.companyNeedsReplenishment = false;
  validateConquistadorQuestMemory(memory);
  return Object.freeze({ added, strength: memory.companyStrength });
}

export function conquistadorCommissionedCaptureFactionId(memory, city) {
  validateConquistadorQuestMemory(memory);
  return memory.stage === CONQUISTADOR_STAGE_CAPTURE && city?.cityId === memory.targetCityId
    ? CONQUISTADOR_ORIGIN_FACTION_ID
    : null;
}

export function recordConquistadorTargetCapture(memory, conquestMemory, cities, event, simMinute) {
  validateConquistadorQuestMemory(memory);
  assertMinute(simMinute, "conquistador capture");
  if (memory.stage !== CONQUISTADOR_STAGE_CAPTURE || event?.cityId !== memory.targetCityId ||
      event.newFactionId !== CONQUISTADOR_ORIGIN_FACTION_ID || event.source !== "player") {
    throw new Error("Conquistador quest received an unrelated port capture");
  }
  const target = cities.find((city) => city.cityId === memory.targetCityId);
  if (!target) throw new Error(`Conquistador target city is missing: ${memory.targetCityId}`);
  memory.stage = CONQUISTADOR_STAGE_CAMPAIGN;
  memory.companyStrength = 0;
  memory.companyNeedsReplenishment = false;
  memory.capturedAtMinute = simMinute;
  memory.rewardReadyMinute = simMinute + CONQUISTADOR_CAMPAIGN_MINUTES;
  const candidates = cities
    .filter((city) => city.tileId !== target.tileId)
    .filter((city) => effectivePortFactionId(conquestMemory, city) === CONQUISTADOR_TARGET_FACTION_ID)
    .sort((a, b) => (
      greatCircleDistanceKm(target, a) - greatCircleDistanceKm(target, b) || a.tileId - b.tileId
    ));
  memory.transferSchedule = candidates.map((city, index) => ({
    cityId: requireCityId(city, "Conquistador campaign city"),
    tileId: city.tileId,
    simMinute: simMinute + Math.round(
      CONQUISTADOR_CAMPAIGN_MINUTES * 0.9 * (index + 1) / (candidates.length + 1)
    )
  }));
  memory.transferredCityIds = [];
  const spanishName = spanishConquestName(target);
  if (spanishName) recordCityDisplayName(conquestMemory, target, spanishName);
  return validateConquistadorQuestMemory(memory);
}

export function nextConquistadorQuestMinute(memory) {
  validateConquistadorQuestMemory(memory);
  if (memory.stage !== CONQUISTADOR_STAGE_CAMPAIGN) return Number.POSITIVE_INFINITY;
  const completed = new Set(memory.transferredCityIds);
  const nextTransfer = memory.transferSchedule.find((entry) => !completed.has(entry.cityId));
  return Math.min(nextTransfer?.simMinute ?? Number.POSITIVE_INFINITY, memory.rewardReadyMinute);
}

export function advanceConquistadorCampaign(memory, conquestMemory, cities, currentMinute, { ports } = {}) {
  validateConquistadorQuestMemory(memory);
  assertMinute(currentMinute, "conquistador campaign");
  if (memory.stage !== CONQUISTADOR_STAGE_CAMPAIGN) return Object.freeze({ transfers: [], rewardReady: false });
  const completed = new Set(memory.transferredCityIds);
  const transfers = [];
  reconcileConquistadorSovereignty(memory, conquestMemory, cities, { ports });
  for (const scheduled of memory.transferSchedule) {
    if (scheduled.simMinute > currentMinute || completed.has(scheduled.cityId)) continue;
    const city = cities.find((candidate) => candidate.cityId === scheduled.cityId);
    if (!city) throw new Error(`Conquistador campaign city is missing: ${scheduled.cityId}`);
    const factionId = effectivePortFactionId(conquestMemory, city);
    // Once Cuzco falls, its unoccupied towns become independent remnants.
    // The columns still arrive on schedule, but may not overwrite a later conquest.
    const unoccupiedRemnant = factionId === NEUTRAL_FACTION_ID &&
      conquestMemory.collapsedFactionIds.includes(CONQUISTADOR_TARGET_FACTION_ID) &&
      (city.foundingFactionId || city.factionId) === CONQUISTADOR_TARGET_FACTION_ID &&
      !Object.hasOwn(conquestMemory.portFactionOverrides, city.cityId);
    if (factionId === CONQUISTADOR_TARGET_FACTION_ID || unoccupiedRemnant) {
      const currentCity = { ...city, factionId };
      transfers.push(recordPortCapture(
        conquestMemory,
        currentCity,
        CONQUISTADOR_ORIGIN_FACTION_ID,
        scheduled.simMinute,
        "conquistador-campaign"
      ));
      const spanishName = spanishConquestName(city);
      if (spanishName) recordCityDisplayName(conquestMemory, city, spanishName);
    }
    completed.add(scheduled.cityId);
    memory.transferredCityIds = [...completed];
    reconcileConquistadorSovereignty(memory, conquestMemory, cities, { ports });
  }
  const rewardReady = currentMinute >= memory.rewardReadyMinute;
  if (rewardReady) {
    const incaCitiesRemain = cities.some((city) => (
      effectivePortFactionId(conquestMemory, city) === CONQUISTADOR_TARGET_FACTION_ID
    ));
    if (!incaCitiesRemain) {
      markFactionCollapsedByConquest(conquestMemory, {
        factionId: CONQUISTADOR_TARGET_FACTION_ID,
        successorFactionId: CONQUISTADOR_ORIGIN_FACTION_ID,
        simMinute: memory.rewardReadyMinute,
        source: "conquistador-campaign"
      });
    }
    memory.stage = CONQUISTADOR_STAGE_REWARD_READY;
  }
  validateConquistadorQuestMemory(memory);
  return Object.freeze({ transfers: Object.freeze(transfers), rewardReady });
}

// Apply at ownership synchronization as well as campaign ticks. Released saves
// can already be between Cuzco's fall and the reward date; their existing
// conquests and future transfer dates must survive repairing the vacant office.
export function reconcileConquistadorSovereignty(memory, conquestMemory, cities, { ports } = {}) {
  validateConquistadorQuestMemory(memory);
  if (!Array.isArray(ports)) throw new Error("Conquistador sovereignty requires the functional port catalog");
  if (![CONQUISTADOR_STAGE_CAMPAIGN, CONQUISTADOR_STAGE_REWARD_READY, CONQUISTADOR_STAGE_COMPLETE]
    .includes(memory.stage) || conquestMemory.collapsedFactionIds.includes(CONQUISTADOR_TARGET_FACTION_ID)) return null;
  const capitalCityId = conquestMemory.factionCapitalOverrides[CONQUISTADOR_TARGET_FACTION_ID] ||
    factionSeaCapitalForId(CONQUISTADOR_TARGET_FACTION_ID).cityId;
  if (!memory.transferredCityIds.includes(capitalCityId)) return null;
  const capital = cities.find(({cityId}) => cityId === capitalCityId);
  if (!capital) throw new Error(`Conquistador capital is missing: ${capitalCityId}`);
  if (effectivePortFactionId(conquestMemory, capital) === CONQUISTADOR_TARGET_FACTION_ID) return null;
  const retreatPort = ports.filter((city) => effectivePortFactionId(conquestMemory, city) === CONQUISTADOR_TARGET_FACTION_ID)
    .sort((left, right) => greatCircleDistanceKm(capital, left) - greatCircleDistanceKm(capital, right) ||
      left.cityId.localeCompare(right.cityId, "en"))[0];
  if (retreatPort) {
    // Divergent conquests may have left another functioning port. Transfer the
    // office to that existing city; never move any city's geographic position.
    conquestMemory.factionCapitalOverrides[CONQUISTADOR_TARGET_FACTION_ID] = requireCityId(retreatPort);
    return null;
  }
  for (const city of cities) {
    if (conquestMemory.portFactionOverrides[city.cityId] === CONQUISTADOR_TARGET_FACTION_ID) {
      conquestMemory.portFactionOverrides[city.cityId] = NEUTRAL_FACTION_ID;
    }
  }
  const transfer = memory.transferSchedule.find(({cityId}) => cityId === capitalCityId);
  return markFactionCollapsedByConquest(conquestMemory, {
    factionId: CONQUISTADOR_TARGET_FACTION_ID,
    successorFactionId: CONQUISTADOR_ORIGIN_FACTION_ID,
    simMinute: transfer.simMinute,
    source: "conquistador-campaign"
  });
}

export function completeConquistadorQuest(memory, simMinute) {
  validateConquistadorQuestMemory(memory);
  assertMinute(simMinute, "conquistador completion");
  if (memory.stage !== CONQUISTADOR_STAGE_REWARD_READY || simMinute < memory.rewardReadyMinute) {
    throw new Error("Conquistador spoils are not ready");
  }
  memory.stage = CONQUISTADOR_STAGE_COMPLETE;
  memory.completedAtMinute = simMinute;
  return validateConquistadorQuestMemory(memory);
}

export function isConquistadorQuestOrigin(memory, city) {
  validateConquistadorQuestMemory(memory);
  return memory.originCityId === null
    ? portMatchesCanonicalReference(city, CANONICAL_PORTS.PANAMA_CITY)
    : city?.cityId === memory.originCityId;
}

export function isConquistadorQuestTarget(memory, city) {
  validateConquistadorQuestMemory(memory);
  return memory.targetCityId === null
    ? portMatchesCanonicalReference(city, CANONICAL_PORTS.CHAN_CHAN)
    : city?.cityId === memory.targetCityId;
}

export function conquistadorQuestShouldAppearAtCity(memory, city, portCities) {
  validateConquistadorQuestMemory(memory);
  if (memory.stage === CONQUISTADOR_STAGE_DORMANT) {
    return isConquistadorQuestOrigin(memory, city) && conquistadorQuestAvailable(memory, portCities);
  }
  if ([CONQUISTADOR_STAGE_FETCH, CONQUISTADOR_STAGE_READY,
    CONQUISTADOR_STAGE_CAPTURE].includes(memory.stage)) {
    return isConquistadorQuestOrigin(memory, city) ||
      isConquistadorCompanyReplenishmentPort(memory, city, portCities);
  }
  if ([CONQUISTADOR_STAGE_CAMPAIGN, CONQUISTADOR_STAGE_REWARD_READY].includes(memory.stage)) {
    return isConquistadorQuestTarget(memory, city);
  }
  return false;
}

export function conquistadorQuestOfferShouldApproach(memory, city, portCities) {
  validateConquistadorQuestMemory(memory);
  return memory.stage === CONQUISTADOR_STAGE_DORMANT &&
    !memory.offerSeen &&
    conquistadorQuestShouldAppearAtCity(memory, city, portCities);
}

export function conquistadorEmbarkationShouldApproach(memory, city, hasEligibleLoadout) {
  validateConquistadorQuestMemory(memory);
  if (typeof hasEligibleLoadout !== "boolean") {
    throw new Error("Conquistador embarkation approach requires loadout eligibility");
  }
  return memory.stage === CONQUISTADOR_STAGE_READY &&
    isConquistadorQuestOrigin(memory, city) &&
    hasEligibleLoadout;
}

export function conquistadorQuestDestination(memory, portCities, currentMinute) {
  validateConquistadorQuestMemory(memory);
  assertMinute(currentMinute, "conquistador destination");
  if (memory.stage === CONQUISTADOR_STAGE_DORMANT || memory.stage === CONQUISTADOR_STAGE_COMPLETE) {
    return null;
  }
  const view = conquistadorQuestView(memory, portCities, currentMinute);
  if ([CONQUISTADOR_STAGE_FETCH, CONQUISTADOR_STAGE_READY].includes(view.stage)) return view.origin;
  if (view.stage === CONQUISTADOR_STAGE_CAPTURE && view.companyNeedsReplenishment) return null;
  if (view.stage === CONQUISTADOR_STAGE_CAPTURE || view.stage === CONQUISTADOR_STAGE_REWARD_READY) {
    return view.target;
  }
  if (view.stage === CONQUISTADOR_STAGE_CAMPAIGN) {
    return currentMinute >= view.rewardReadyMinute ? view.target : null;
  }
  return null;
}

function spanishConquestName(city) {
  return SPANISH_CITY_NAMES.get(requireCityId(city, "Conquistador city")) || null;
}

function boundPort(cityId, fallback, portCities, label) {
  if (cityId === null) return fallback;
  const port = portCities.find((candidate) => candidate.cityId === cityId);
  if (!port) throw new Error(`Conquistador ${label} port is missing: ${cityId}`);
  return port;
}

function fetchStage(id, goodId, goodLabel, quantity, reward, purpose) {
  return Object.freeze({ id, goodId, goodLabel, quantity, reward, purpose });
}

function assertOptionalTileId(value, label) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    throw new Error(`Invalid conquistador ${label} tile: ${value}`);
  }
}

function assertOptionalEntityId(value, label) {
  if (value !== null) requireEntityId(value, `Conquistador ${label}`);
}

function assertOptionalMinute(value, label) {
  if (value !== null) assertMinute(value, `conquistador ${label}`);
}

function validateLegacyConquistadorQuestMemory(memory) {
  if (!STAGES.has(memory.stage) || typeof memory.offerSeen !== "boolean") {
    throw new Error("Invalid legacy conquistador quest state");
  }
  assertOptionalTileId(memory.originTileId, "legacy origin");
  assertOptionalTileId(memory.targetTileId, "legacy target");
  if (!Array.isArray(memory.transferSchedule) || !Array.isArray(memory.transferredTileIds)) {
    throw new Error("Invalid legacy conquistador transfer state");
  }
  const scheduledTiles = new Set();
  for (const transfer of memory.transferSchedule) {
    if (!Number.isInteger(transfer?.tileId) || !Number.isFinite(transfer.simMinute)) {
      throw new Error("Invalid legacy conquistador transfer");
    }
    scheduledTiles.add(transfer.tileId);
  }
  if (memory.transferredTileIds.some((tileId) => !scheduledTiles.has(tileId))) {
    throw new Error("Invalid completed legacy conquistador transfers");
  }
  return memory;
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label} minute: ${value}`);
}
