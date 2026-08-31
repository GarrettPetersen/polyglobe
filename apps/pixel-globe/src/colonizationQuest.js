import {
  colonizationTargetForCity,
  legacyColonizationTargetCityId
} from "./colonialCities.js";
import { CANONICAL_PORTS } from "./canonicalPorts.js";
import { cityIsInEurope } from "./cityCatalogData.js";
import { cityTerritoryId, requireEntityId } from "./entityIds.js";
import {
  CARGO_SPACE_TICKS_PER_UNIT,
  availableCargoTicks,
  cargoUnitsFromTicks
} from "./cargoSpace.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { tradeGoodById } from "./economy.js";
import { colonizationHistoryForTarget } from "./colonizationHistory.js";
import { foreignSettlementsByIds } from "./foreignSettlements.js";
import {
  questCargoDeliverableQuantity,
  questCargoDeliveryProgress
} from "./questCargoDeliveries.js";

export const COLONIZATION_QUEST_VERSION = 3;
export const COLONIZATION_ORIGIN_CITY = CANONICAL_PORTS.BORDEAUX.city;
export const COLONIZATION_ORIGIN_COUNTRY = CANONICAL_PORTS.BORDEAUX.country;
export const COLONIZATION_TARGET_CITY = "Port Royal";
export const COLONIZATION_TARGET_COUNTRY = "Canada";
export const COLONIZATION_TARGET_PORT_ID = "colony-port-royal";
export const COLONIZATION_CARGO_RESERVATION_ID = "port-royal-colonists";
export const COLONIZATION_EXPEDITION_CARGO_UNITS = 24;
export const COLONIZATION_SETTLER_COUNT = 12;
export const COLONIZATION_MIN_CARGO_CAPACITY = 90;
export const COLONIZATION_MIN_SEAWORTHINESS = 7;
export const COLONIZATION_RESUPPLY_DAYS = 365;
export const COLONIZATION_RESUPPLY_EXTENSION_DAYS_PER_UNIT = 30;
export const COLONIZATION_FOUNDER_DISCOUNT_MULTIPLIER = 0.85;
export const COLONIZATION_ORGANIZER_APPROACHED_FLAG = "colonizationOrganizerApproached";
export const COLONIZATION_SPAWN_CHANCE = 0.12;
export const COLONIZATION_ROLL_PERIOD_MINUTES = 14 * 24 * 60;
export const COLONIZATION_MIN_VOYAGE_DISTANCE_KM = 1200;
export const COLONIZATION_STAGE_FETCH = "fetch";
export const COLONIZATION_STAGE_READY = "ready";
export const COLONIZATION_STAGE_OUTBOUND = "outbound";
export const COLONIZATION_STAGE_AWAITING_RESUPPLY = "awaiting-resupply";
export const COLONIZATION_STAGE_DEFEND = "defend-colony";
export const COLONIZATION_STAGE_REPORT_DEFENSE = "report-defense";
export const COLONIZATION_STAGE_FAILED = "failed";
export const COLONIZATION_STAGE_ESTABLISHED = "established";
export const COLONIZATION_AFTERMATH_ROANOKE = "roanoke-lost-colony";
export const COLONIZATION_AFTERMATH_WAITING = "waiting";
export const COLONIZATION_AFTERMATH_MISSING = "missing";
export const COLONIZATION_AFTERMATH_INVESTIGATING = "investigating";
export const COLONIZATION_AFTERMATH_REPORTING = "reporting";
export const COLONIZATION_AFTERMATH_COMPLETE = "complete";
export const ROANOKE_DISAPPEARANCE_DAYS = 2 * 365;
export const ROANOKE_SPONTANEOUS_DISCOVERY_RADIUS_PX = 68;
export const ROANOKE_CLUES_ITEM_ID = "roanoke-clues";
export const ROANOKE_INVESTIGATION_REWARD = 2000;

const MINUTES_PER_DAY = 24 * 60;
const COLONIZATION_AFTERMATH_STAGES = new Set([
  COLONIZATION_AFTERMATH_WAITING,
  COLONIZATION_AFTERMATH_MISSING,
  COLONIZATION_AFTERMATH_INVESTIGATING,
  COLONIZATION_AFTERMATH_REPORTING,
  COLONIZATION_AFTERMATH_COMPLETE
]);
const STAGES = new Set([
  COLONIZATION_STAGE_FETCH,
  COLONIZATION_STAGE_READY,
  COLONIZATION_STAGE_OUTBOUND,
  COLONIZATION_STAGE_AWAITING_RESUPPLY,
  COLONIZATION_STAGE_DEFEND,
  COLONIZATION_STAGE_REPORT_DEFENSE,
  COLONIZATION_STAGE_FAILED,
  COLONIZATION_STAGE_ESTABLISHED
]);
const TARGET = colonizationTargetForCity({
  cityId: "port royal|canada",
  city: COLONIZATION_TARGET_CITY,
  country: COLONIZATION_TARGET_COUNTRY
});

if (!TARGET) throw new Error("Port Royal is missing from the colonization target registry");
if (TARGET.factionId !== "france") throw new Error("Port Royal colonization target must belong to France");

const DEFAULT_HISTORY = colonizationHistoryForTarget(TARGET);

export const COLONIZATION_FETCH_STAGES = DEFAULT_HISTORY.fetchStages;
export const COLONIZATION_RESUPPLY = DEFAULT_HISTORY.resupply;

export function createColonizationQuestMemory() {
  return {
    version: COLONIZATION_QUEST_VERSION,
    stage: COLONIZATION_STAGE_FETCH,
    fetchStageIndex: 0,
    targetTileId: null,
    foundedMinute: null,
    resupplyDeadlineMinute: null,
    resupplyExtensionMinutes: 0,
    leftSinceFounding: false,
    failedMinute: null,
    establishedMinute: null,
    defenseStartedMinute: null,
    defenseCompletedMinute: null,
    defenseShipIds: [],
    defenseDefeatedShipIds: [],
    aftermath: null,
    targetCityId: null,
    targetCity: null,
    targetCountry: null,
    originCityId: null,
    originTileId: null,
    originCity: null,
    originCountry: null,
    approvalCityId: null,
    approvalTileId: null,
    approvalCity: null,
    approvalCountry: null,
    approvalGranted: false,
    distanceKm: null,
    offerSeen: false,
    spawnRolls: {},
    pastSettlements: []
  };
}

export function validateColonizationQuestMemory(memory, { settlementRecord = false } = {}) {
  if (!memory || typeof memory !== "object" || memory.version !== COLONIZATION_QUEST_VERSION) {
    throw new Error(`Unsupported colonization quest memory: ${memory?.version ?? "missing"}`);
  }
  if (!STAGES.has(memory.stage)) throw new Error(`Invalid colonization quest stage: ${memory.stage}`);
  const selectedTarget = colonizationSelectedTarget(memory);
  validateColonizationAftermath(memory, selectedTarget);
  const history = selectedTarget ? colonizationHistoryForTarget(selectedTarget) : null;
  const fetchStages = history
    ? history.fetchStages
    : COLONIZATION_FETCH_STAGES;
  if (!Number.isInteger(memory.fetchStageIndex) ||
      memory.fetchStageIndex < 0 || memory.fetchStageIndex > fetchStages.length) {
    throw new Error(`Invalid colonization fetch stage: ${memory.fetchStageIndex}`);
  }
  const fetchComplete = memory.fetchStageIndex === fetchStages.length;
  if (memory.stage === COLONIZATION_STAGE_FETCH && fetchComplete) {
    throw new Error("Colonization fetch stage is complete but quest is still fetching");
  }
  if (memory.stage !== COLONIZATION_STAGE_FETCH && !fetchComplete) {
    throw new Error(`Colonization quest left fetch stage early: ${memory.fetchStageIndex}`);
  }
  if (memory.targetTileId !== null && (!Number.isInteger(memory.targetTileId) || memory.targetTileId < 0)) {
    throw new Error(`Invalid colonization target tile: ${memory.targetTileId}`);
  }
  validateOptionalIdentity(memory, "target");
  validateOptionalIdentity(memory, "origin", { tileId: true });
  validateOptionalIdentity(memory, "approval", { tileId: true });
  if (memory.offerSeen !== undefined && typeof memory.offerSeen !== "boolean") {
    throw new Error("Colonization quest offer-seen flag must be boolean");
  }
  if (memory.spawnRolls !== undefined) validateSpawnRolls(memory.spawnRolls);
  if (!Array.isArray(memory.pastSettlements)) {
    throw new Error("Colonization quest settlement history must be an array");
  }
  if (settlementRecord) {
    if (memory.pastSettlements.length !== 0) {
      throw new Error("Archived colonization settlements cannot contain nested history");
    }
    if (![COLONIZATION_STAGE_FAILED, COLONIZATION_STAGE_ESTABLISHED].includes(memory.stage)) {
      throw new Error(`Archived colonization settlement is not terminal: ${memory.stage}`);
    }
  } else {
    const settlementKeys = new Set();
    for (const settlement of memory.pastSettlements) {
      validateColonizationQuestMemory(settlement, { settlementRecord: true });
      const target = requiredSelectedTarget(settlement);
      const key = colonizationTargetKey(target);
      if (settlementKeys.has(key)) throw new Error(`Duplicate colonization settlement history: ${key}`);
      settlementKeys.add(key);
    }
  }
  const approval = colonizationApprovalIdentity(memory);
  if (memory.approvalGranted !== undefined && typeof memory.approvalGranted !== "boolean") {
    throw new Error("Colonization approval flag must be boolean");
  }
  if (selectedTarget?.approvalFactionId && !approval) {
    throw new Error(`${selectedTarget.city} requires a government approval port`);
  }
  if (!selectedTarget?.approvalFactionId && approval) {
    throw new Error("Colonization quest has an unnecessary approval port");
  }
  if (memory.approvalGranted === true && !approval) {
    throw new Error("Colonization approval has no government port");
  }
  if (memory.distanceKm !== undefined && memory.distanceKm !== null &&
      (!Number.isFinite(memory.distanceKm) || memory.distanceKm < COLONIZATION_MIN_VOYAGE_DISTANCE_KM)) {
    throw new Error(`Invalid colonization voyage distance: ${memory.distanceKm}`);
  }
  const hasOrigin = colonizationOriginIdentity(memory) !== null;
  if ((selectedTarget === null) !== !hasOrigin) {
    throw new Error("Colonization target and origin must be selected together");
  }
  if (selectedTarget === null && (
    memory.fetchStageIndex !== 0 ||
    memory.stage !== COLONIZATION_STAGE_FETCH ||
    memory.targetTileId !== null
  )) {
    throw new Error("Unspawned colonization quest contains active progress");
  }
  if (typeof memory.leftSinceFounding !== "boolean") {
    throw new Error("Colonization quest requires a departure flag");
  }
  if (!Number.isInteger(memory.resupplyExtensionMinutes) ||
      memory.resupplyExtensionMinutes < 0 ||
      memory.resupplyExtensionMinutes % (
        COLONIZATION_RESUPPLY_EXTENSION_DAYS_PER_UNIT * MINUTES_PER_DAY
      ) !== 0) {
    throw new Error(`Invalid colonization resupply extension: ${memory.resupplyExtensionMinutes}`);
  }
  for (const key of [
    "foundedMinute",
    "resupplyDeadlineMinute",
    "failedMinute",
    "establishedMinute",
    "defenseStartedMinute",
    "defenseCompletedMinute"
  ]) {
    if (memory[key] !== undefined && memory[key] !== null &&
        (!Number.isFinite(memory[key]) || memory[key] < 0)) {
      throw new Error(`Invalid colonization ${key}: ${memory[key]}`);
    }
  }
  const defenseShipIds = optionalShipIdList(memory.defenseShipIds, "defense ships");
  const defeatedShipIds = optionalShipIdList(memory.defenseDefeatedShipIds, "defeated defense ships");
  if (defeatedShipIds.some((shipId) => !defenseShipIds.includes(shipId))) {
    throw new Error("Defeated colony attacker is not in the defense fleet");
  }
  const founded = memory.foundedMinute !== null && memory.resupplyDeadlineMinute !== null;
  const requiresFounding = [
    COLONIZATION_STAGE_AWAITING_RESUPPLY,
    COLONIZATION_STAGE_DEFEND,
    COLONIZATION_STAGE_REPORT_DEFENSE,
    COLONIZATION_STAGE_FAILED,
    COLONIZATION_STAGE_ESTABLISHED
  ].includes(memory.stage);
  if (requiresFounding !== founded) {
    throw new Error(`Colonization founding timestamps do not match stage: ${memory.stage}`);
  }
  if (founded && memory.resupplyDeadlineMinute !==
      memory.foundedMinute +
        COLONIZATION_RESUPPLY_DAYS * MINUTES_PER_DAY +
        memory.resupplyExtensionMinutes) {
    throw new Error("Colonization resupply deadline is not one year after founding");
  }
  if ((memory.stage === COLONIZATION_STAGE_FAILED) !== (memory.failedMinute !== null)) {
    throw new Error("Colonization failure timestamp does not match stage");
  }
  if ((memory.stage === COLONIZATION_STAGE_ESTABLISHED) !== (memory.establishedMinute !== null)) {
    throw new Error("Colonization establishment timestamp does not match stage");
  }
  const activeDefense = [COLONIZATION_STAGE_DEFEND, COLONIZATION_STAGE_REPORT_DEFENSE].includes(memory.stage);
  if (activeDefense && !history?.defense) {
    throw new Error(`${selectedTarget?.city || "Colony"} has no historical defense encounter`);
  }
  if (activeDefense && (
    memory.defenseStartedMinute === null ||
    defenseShipIds.length < history.defense.minCanoes ||
    defenseShipIds.length > history.defense.maxCanoes
  )) {
    throw new Error("Active colony defense has an invalid attacking fleet");
  }
  if (memory.stage === COLONIZATION_STAGE_DEFEND && (
    memory.defenseCompletedMinute !== null || defeatedShipIds.length >= defenseShipIds.length
  )) {
    throw new Error("Unfinished colony defense has already defeated every attacker");
  }
  if (memory.stage === COLONIZATION_STAGE_REPORT_DEFENSE && (
    memory.defenseCompletedMinute === null || defeatedShipIds.length !== defenseShipIds.length
  )) {
    throw new Error("Completed colony defense still has active attackers");
  }
  return memory;
}

export function colonizationQuestMemory(state) {
  const memory = state?.memory?.colonization;
  return validateColonizationQuestMemory(memory);
}

export function migrateColonizationQuestMemory(memory, {
  legacyCityIdForPortReference = null
} = {}) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    return createColonizationQuestMemory();
  }
  if (![1, 2, COLONIZATION_QUEST_VERSION].includes(memory.version)) {
    throw new Error(`Unsupported colonization quest memory: ${memory.version ?? "missing"}`);
  }
  return validateColonizationQuestMemory(migrateColonizationQuestRecord(
    memory,
    legacyCityIdForPortReference
  ));
}

function migrateColonizationQuestRecord(memory, legacyCityIdForPortReference) {
  return {
    ...memory,
    version: COLONIZATION_QUEST_VERSION,
    targetCityId: migratedColonizationTargetCityId(memory),
    originCityId: migratedColonizationPortCityId(
      memory,
      "origin",
      legacyCityIdForPortReference
    ),
    approvalCityId: migratedColonizationPortCityId(
      memory,
      "approval",
      legacyCityIdForPortReference
    ),
    resupplyExtensionMinutes: memory.resupplyExtensionMinutes ?? 0,
    aftermath: memory.aftermath ?? null,
    pastSettlements: Array.isArray(memory.pastSettlements)
      ? memory.pastSettlements.map((settlement) => migrateColonizationQuestRecord(
          settlement,
          legacyCityIdForPortReference
        ))
      : []
  };
}

function migratedColonizationTargetCityId(memory) {
  if (nonEmptyString(memory.targetCityId)) return memory.targetCityId;
  if (memory.targetCity === null || memory.targetCity === undefined) return null;
  return legacyColonizationTargetCityId(memory.targetCity, memory.targetCountry);
}

function migratedColonizationPortCityId(memory, prefix, legacyCityIdForPortReference) {
  const cityId = memory[`${prefix}CityId`];
  if (nonEmptyString(cityId)) return cityId;
  const city = memory[`${prefix}City`];
  if (city === null || city === undefined) return null;
  const tileId = memory[`${prefix}TileId`];
  if (!Number.isInteger(tileId)) {
    throw new Error(`Legacy colonization ${prefix} has no canonicalizable tile`);
  }
  if (typeof legacyCityIdForPortReference !== "function") {
    throw new Error(`Legacy colonization ${prefix} migration requires a canonical city resolver`);
  }
  return requireEntityId(
    legacyCityIdForPortReference(Object.freeze({ tileId })),
    `Migrated colonization ${prefix}`
  );
}

export function prepareNextColonizationExpedition(state, memory = colonizationQuestMemory(state)) {
  validateColonizationQuestMemory(memory);
  if (!colonizationSelectedTarget(memory) ||
      ![COLONIZATION_STAGE_FAILED, COLONIZATION_STAGE_ESTABLISHED].includes(memory.stage)) {
    return false;
  }

  const settlement = colonizationSettlementSnapshot(memory);
  const settlementKey = colonizationTargetKey(requiredSelectedTarget(settlement));
  if (memory.pastSettlements.some((candidate) => (
    colonizationTargetKey(requiredSelectedTarget(candidate)) === settlementKey
  ))) {
    throw new Error(`Colonization settlement was already archived: ${settlementKey}`);
  }

  const pastSettlements = [...memory.pastSettlements, settlement];
  const spawnRolls = memory.spawnRolls;
  const reset = createColonizationQuestMemory();
  for (const key of Object.keys(memory)) delete memory[key];
  Object.assign(memory, reset, { pastSettlements, spawnRolls });
  if (state?.memory?.flags && typeof state.memory.flags === "object") {
    delete state.memory.flags[COLONIZATION_ORGANIZER_APPROACHED_FLAG];
  }
  validateColonizationQuestMemory(memory);
  return true;
}

export function colonizationSettlementMemories(memory) {
  validateColonizationQuestMemory(memory);
  return Object.freeze(memory.pastSettlements.slice());
}

function colonizationSettlementSnapshot(memory) {
  const snapshot = {
    ...memory,
    spawnRolls: {},
    pastSettlements: [],
    defenseShipIds: [...memory.defenseShipIds],
    defenseDefeatedShipIds: [...memory.defenseDefeatedShipIds]
  };
  return validateColonizationQuestMemory(snapshot, { settlementRecord: true });
}

export function assignColonizationQuest(memory, {
  target,
  origin,
  approvalPort = null,
  allowExiledSponsor = false
}) {
  validateColonizationQuestMemory(memory);
  validateQuestTarget(target);
  validateQuestOrigin(origin);
  const selectedTarget = colonizationSelectedTarget(memory);
  const selectedOrigin = colonizationOriginIdentity(memory);
  const rebindingExistingQuest = selectedTarget !== null && selectedOrigin !== null;
  if (!rebindingExistingQuest || [COLONIZATION_STAGE_FETCH, COLONIZATION_STAGE_READY].includes(memory.stage)) {
    assertColonizationOriginCanHostTarget(origin, target, {
      allowExiledSponsor: allowExiledSponsor || rebindingExistingQuest
    });
  }
  if (target.approvalFactionId) {
    validateQuestOrigin(approvalPort);
    if (!rebindingExistingQuest && approvalPort.factionId !== target.approvalFactionId) {
      throw new Error(`${target.city} requires approval from ${target.approvalFactionId}`);
    }
  } else if (approvalPort) {
    throw new Error(`${target.city} does not require a government approval stop`);
  }
  if (selectedTarget && selectedTarget.cityId !== target.cityId) {
    throw new Error(`Saved colony ${selectedTarget.city} does not match ${target.city}`);
  }
  if (selectedOrigin && Number.isInteger(selectedOrigin.tileId) && selectedOrigin.tileId !== origin.tileId) {
    throw new Error(`Saved colony origin ${selectedOrigin.tileId} does not match ${origin.tileId}`);
  }
  memory.targetCityId = target.cityId;
  memory.targetCity = target.city;
  memory.targetCountry = target.country;
  memory.targetTileId = target.tileId;
  memory.originCityId = origin.cityId;
  memory.originTileId = origin.tileId;
  memory.originCity = origin.city;
  memory.originCountry = origin.country;
  memory.approvalCityId = approvalPort?.cityId ?? null;
  memory.approvalTileId = approvalPort?.tileId ?? null;
  memory.approvalCity = approvalPort?.city ?? null;
  memory.approvalCountry = approvalPort?.country ?? null;
  if (memory.approvalGranted === undefined) memory.approvalGranted = false;
  memory.distanceKm = greatCircleDistanceKm(origin, target);
  if (memory.offerSeen === undefined) memory.offerSeen = false;
  if (memory.spawnRolls === undefined) memory.spawnRolls = {};
  if (memory.defenseStartedMinute === undefined) memory.defenseStartedMinute = null;
  if (memory.defenseCompletedMinute === undefined) memory.defenseCompletedMinute = null;
  if (memory.defenseShipIds === undefined) memory.defenseShipIds = [];
  if (memory.defenseDefeatedShipIds === undefined) memory.defenseDefeatedShipIds = [];
  validateColonizationQuestMemory(memory);
  return memory;
}

export function colonizationOriginCanSponsorTarget(origin, target) {
  return Boolean(
    cityIsInEurope(origin) &&
    origin?.factionId &&
    target?.originFactionId === origin.factionId &&
    (!target.originTerritoryId || cityTerritoryId(origin, "Colonization origin") === target.originTerritoryId) &&
    target.waterAccess !== "inland" &&
    Number.isInteger(target.tileId) &&
    greatCircleDistanceKm(origin, target) >= COLONIZATION_MIN_VOYAGE_DISTANCE_KM
  );
}

export function colonizationOriginCanHostExiledSponsor(origin, target) {
  return Boolean(
    cityIsInEurope(origin) &&
    origin?.foundingFactionId &&
    target?.originFactionId === origin.foundingFactionId &&
    origin.factionId !== target.originFactionId &&
    target.waterAccess !== "inland" &&
    Number.isInteger(target.tileId) &&
    greatCircleDistanceKm(origin, target) >= COLONIZATION_MIN_VOYAGE_DISTANCE_KM
  );
}

export function relocateColonizationQuestOrigin(memory, {
  target,
  origin,
  allowExiledSponsor = false
}) {
  validateColonizationQuestMemory(memory);
  validateQuestTarget(target);
  validateQuestOrigin(origin);
  const selectedTarget = requiredSelectedTarget(memory);
  if (selectedTarget.cityId !== target.cityId) {
    throw new Error(`Cannot relocate ${selectedTarget.city} expedition as ${target.city}`);
  }
  assertColonizationOriginCanHostTarget(origin, target, { allowExiledSponsor });
  memory.originCityId = origin.cityId;
  memory.originTileId = origin.tileId;
  memory.originCity = origin.city;
  memory.originCountry = origin.country;
  memory.distanceKm = greatCircleDistanceKm(origin, target);
  validateColonizationQuestMemory(memory);
  return memory;
}

export function reconcileColonizationQuestOriginAfterConquest(state, portCities) {
  const memory = colonizationQuestMemory(state);
  if (!Array.isArray(portCities)) throw new Error("Colonization origin reconciliation requires ports");
  const target = selectedTargetView(memory);
  if (!target || ![COLONIZATION_STAGE_FETCH, COLONIZATION_STAGE_READY].includes(memory.stage)) {
    return null;
  }
  const previousOrigin = colonizationOriginIdentity(memory);
  const currentOrigin = portCities.find((city) => portMatchesIdentity(city, previousOrigin)) || null;
  if (currentOrigin && colonizationOriginCanSponsorTarget(currentOrigin, target)) return null;

  const replacement = portCities
    .filter((city) => colonizationOriginCanSponsorTarget(city, target))
    .sort((a, b) => colonizationReplacementOriginOrder(a, b, target, currentOrigin))[0] || null;
  if (replacement) {
    relocateColonizationQuestOrigin(memory, { target, origin: replacement });
    return Object.freeze({
      kind: "relocated",
      target: Object.freeze({ city: target.city, country: target.country }),
      previousOrigin,
      origin: Object.freeze({
        tileId: replacement.tileId,
        city: replacement.city,
        country: replacement.country
      })
    });
  }
  if (currentOrigin && colonizationOriginCanHostExiledSponsor(currentOrigin, target)) return null;
  const exileReplacement = portCities
    .filter((city) => colonizationOriginCanHostExiledSponsor(city, target))
    .sort((a, b) => colonizationReplacementOriginOrder(a, b, target, currentOrigin))[0] || null;
  if (exileReplacement) {
    relocateColonizationQuestOrigin(memory, {
      target,
      origin: exileReplacement,
      allowExiledSponsor: true
    });
    return Object.freeze({
      kind: "government-in-exile",
      target: Object.freeze({ city: target.city, country: target.country }),
      previousOrigin,
      origin: Object.freeze({
        tileId: exileReplacement.tileId,
        city: exileReplacement.city,
        country: exileReplacement.country
      })
    });
  }
  if (currentOrigin) {
    return Object.freeze({
      kind: "government-in-exile",
      target: Object.freeze({ city: target.city, country: target.country }),
      previousOrigin,
      origin: Object.freeze({
        tileId: currentOrigin.tileId,
        city: currentOrigin.city,
        country: currentOrigin.country
      })
    });
  }
  throw new Error(`Colonization expedition origin disappeared after conquest: ${previousOrigin?.city || "unknown"}`);
}

export function colonizationOfferForCity(state, city, portCities, targetPlacements, context = {}) {
  const memory = colonizationQuestMemory(state);
  if (!city || !Array.isArray(portCities) || !Array.isArray(targetPlacements)) return null;
  prepareNextColonizationExpedition(state, memory);
  const selectedTarget = colonizationSelectedTarget(memory);
  if (selectedTarget) return isColonizationQuestOrigin(memory, city) ? memory : null;
  if (memory.stage !== COLONIZATION_STAGE_FETCH || memory.fetchStageIndex !== 0) return null;

  const settledTargets = new Set(memory.pastSettlements.map((settlement) => (
    colonizationTargetKey(requiredSelectedTarget(settlement))
  )));
  const eligibleTargets = eligibleColonizationTargetsForOrigin(city, targetPlacements, { portCities })
    .filter((target) => !settledTargets.has(colonizationTargetKey(target)));
  if (eligibleTargets.length === 0) return null;
  const period = colonizationRollPeriod(context.simMinute);
  const rollKey = `${portIdentityKey(city)}|${period}`;
  const spawnRolls = colonizationSpawnRolls(memory);
  if (spawnRolls[rollKey]) return null;
  spawnRolls[rollKey] = true;
  pruneSpawnRolls(spawnRolls);

  const spawnChance = colonizationSpawnChance(context.spawnChance);
  const identityKey = requireEntityId(state.playerCharacter?.id, "Colonization quest captain");
  if (spawnChance < 1 && seededFraction(`${identityKey}|${rollKey}|colonization`) >= spawnChance) return null;
  const target = chooseColonizationTarget(eligibleTargets, `${identityKey}|${rollKey}|target`, context);
  const approvalPort = target.approvalFactionId
    ? chooseApprovalPort(target, portCities, context)
    : null;
  if (target.approvalFactionId && !approvalPort) return null;
  assignColonizationQuest(memory, {
    target,
    origin: city,
    approvalPort,
    allowExiledSponsor: colonizationOriginCanHostExiledSponsor(city, target)
  });
  return memory;
}

export function eligibleColonizationTargetsForOrigin(city, targetPlacements, { portCities = null } = {}) {
  if (!city?.factionId || !Array.isArray(targetPlacements)) return Object.freeze([]);
  if (portCities !== null && !Array.isArray(portCities)) {
    throw new Error("Colonization target eligibility requires a port list");
  }
  const activeMetropolitanSponsorFactionIds = portCities === null
    ? null
    : new Set(portCities
      .filter(cityIsInEurope)
      .map((port) => port?.factionId)
      .filter(nonEmptyString));
  return Object.freeze(targetPlacements
    .filter((target) => (
      colonizationOriginCanSponsorTarget(city, target) ||
      (activeMetropolitanSponsorFactionIds !== null &&
        !activeMetropolitanSponsorFactionIds.has(target.originFactionId) &&
        colonizationOriginCanHostExiledSponsor(city, target))
    ))
    .sort((a, b) => colonizationTargetKey(a).localeCompare(colonizationTargetKey(b))));
}

export function colonizationGovernmentInExileFactionId(memory, collapsedFactionIds) {
  validateColonizationQuestMemory(memory);
  if (!Array.isArray(collapsedFactionIds)) {
    throw new Error("Colonization government-in-exile check requires collapsed factions");
  }
  if (memory.stage !== COLONIZATION_STAGE_ESTABLISHED) return null;
  const target = colonizationSelectedTarget(memory);
  if (!target || target.factionId !== target.originFactionId) return null;
  return collapsedFactionIds.includes(target.originFactionId)
    ? target.originFactionId
    : null;
}

export function isColonizationQuestOrigin(memory, city) {
  const origin = colonizationOriginIdentity(memory);
  return Boolean(origin && city?.cityId === origin.cityId);
}

export function isColonizationQuestTarget(memory, city) {
  const target = colonizationSelectedTarget(memory);
  return Boolean(target && city?.cityId === target.cityId);
}

export function isColonizationQuestApproval(memory, city) {
  const approval = colonizationApprovalIdentity(memory);
  return Boolean(approval && city?.cityId === approval.cityId);
}

export function grantColonizationApproval(memory, { approvalCargoDelivered = false } = {}) {
  validateColonizationQuestMemory(memory);
  const target = requiredSelectedTarget(memory);
  if (!target.approvalFactionId || !colonizationApprovalIdentity(memory)) {
    throw new Error(`${target.city} does not require government approval`);
  }
  if (memory.stage !== COLONIZATION_STAGE_OUTBOUND) {
    throw new Error(`Colonization approval cannot be granted during ${memory.stage}`);
  }
  if (target.approvalCargo.length > 0 && approvalCargoDelivered !== true) {
    throw new Error(`${target.city} approval requires its trade demonstration cargo`);
  }
  memory.approvalGranted = true;
  validateColonizationQuestMemory(memory);
  return memory;
}

export function colonizationOrganizerShouldApproach(state, city) {
  const memory = colonizationQuestMemory(state);
  if (!state.memory.flags || typeof state.memory.flags !== "object") {
    throw new Error("Colonization organizer approach requires game flags");
  }
  return isColonizationQuestOrigin(memory, city) &&
    memory.stage === COLONIZATION_STAGE_FETCH &&
    memory.fetchStageIndex === 0 &&
    memory.offerSeen !== true &&
    state.memory.flags[COLONIZATION_ORGANIZER_APPROACHED_FLAG] !== true;
}

export function markColonizationOrganizerApproached(state) {
  const memory = colonizationQuestMemory(state);
  if (!state.memory.flags || typeof state.memory.flags !== "object") {
    throw new Error("Colonization organizer approach requires game flags");
  }
  state.memory.flags[COLONIZATION_ORGANIZER_APPROACHED_FLAG] = true;
  memory.offerSeen = true;
  return true;
}

export function colonizationTargetCoordinates(memory) {
  const target = requiredSelectedTarget(memory);
  return Object.freeze({ lat: target.lat, lon: target.lon });
}

export function colonizationQuestView(
  state,
  { shipStats = null, currentMinute = 0, freeCargoUnits = null } = {}
) {
  const memory = colonizationQuestMemory(state);
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid colonization quest minute: ${currentMinute}`);
  }
  const selectedTarget = colonizationSelectedTarget(memory);
  const history = selectedTarget ? colonizationHistoryForTarget(selectedTarget) : null;
  const fetchStage = selectedTarget && memory.stage === COLONIZATION_STAGE_FETCH
    ? (history?.fetchStages || COLONIZATION_FETCH_STAGES)[memory.fetchStageIndex]
    : null;
  const held = fetchStage ? state.cargo?.[fetchStage.goodId] || 0 : 0;
  const fetchProgress = fetchStage
    ? questCargoDeliveryProgress(
        state,
        colonizationFetchRequirementId(selectedTarget, fetchStage),
        fetchStage.quantity
      )
    : null;
  const fetchDeliverable = fetchStage
    ? questCargoDeliverableQuantity(
        state,
        colonizationFetchRequirementId(selectedTarget, fetchStage),
        fetchStage.quantity,
        held
      )
    : 0;
  const shipEligibility = shipStats
    ? colonizationShipEligibility(shipStats, freeCargoUnits)
    : null;
  const target = selectedTargetView(memory);
  const approvalCargo = colonizationApprovalCargoView(state, target);
  return Object.freeze({
    ...memory,
    target,
    history,
    origin: colonizationOriginIdentity(memory),
    approval: colonizationApprovalIdentity(memory),
    approvalCargo,
    approvalCargoReady: approvalCargo.every((requirement) => requirement.missing === 0),
    approvalCargoDelivered: approvalCargo.every((requirement) => requirement.complete),
    approvalCargoDeliverable: approvalCargo.some((requirement) => requirement.deliverable > 0),
    fetchStage,
    held,
    fetchDelivered: fetchProgress?.deliveredQuantity || 0,
    fetchRemaining: fetchProgress?.remainingQuantity || 0,
    fetchDeliverable,
    canDeliverFetch: fetchDeliverable > 0,
    shipEligibility,
    resupply: colonizationResupplyView(
      state,
      selectedTarget,
      history?.resupply || COLONIZATION_RESUPPLY
    ),
    defense: history?.defense || null,
    defenseRemaining: Math.max(
      0,
      optionalShipIdList(memory.defenseShipIds, "defense ships").length -
        optionalShipIdList(memory.defenseDefeatedShipIds, "defeated defense ships").length
    ),
    resupplyHeld: state.cargo?.[(history?.resupply || COLONIZATION_RESUPPLY).goodId] || 0,
    deadlineExpired: memory.resupplyDeadlineMinute !== null && currentMinute > memory.resupplyDeadlineMinute
  });
}

export function colonizationShipEligibility(shipStats, freeCargoUnits) {
  if (!shipStats || typeof shipStats !== "object") throw new Error("Colonization voyage requires ship stats");
  if (!Number.isFinite(freeCargoUnits)) {
    throw new Error(`Invalid free cargo space for colonists: ${freeCargoUnits}`);
  }
  const freeCargoTicks = availableCargoTicks(
    Math.max(0, freeCargoUnits),
    "free cargo space for colonists"
  );
  const cargoCapacity = shipStats.cargoCapacity;
  const seaworthiness = shipStats.seaworthiness;
  if (!Number.isInteger(cargoCapacity) || !Number.isInteger(seaworthiness)) {
    throw new Error("Colonization voyage requires canonical cargo and seaworthiness stats");
  }
  const missing = [];
  if (cargoCapacity < COLONIZATION_MIN_CARGO_CAPACITY) {
    missing.push(`hold ${COLONIZATION_MIN_CARGO_CAPACITY}+`);
  }
  if (seaworthiness < COLONIZATION_MIN_SEAWORTHINESS) {
    missing.push(`seaworthiness ${COLONIZATION_MIN_SEAWORTHINESS}+`);
  }
  if (freeCargoTicks < COLONIZATION_EXPEDITION_CARGO_UNITS * CARGO_SPACE_TICKS_PER_UNIT) {
    missing.push(`${COLONIZATION_EXPEDITION_CARGO_UNITS} free cargo`);
  }
  return Object.freeze({
    eligible: missing.length === 0,
    missing,
    cargoCapacity,
    seaworthiness,
    freeCargoUnits: cargoUnitsFromTicks(freeCargoTicks)
  });
}

export function assertColonizationFetchDelivery(memory, stageId) {
  validateColonizationQuestMemory(memory);
  if (memory.stage !== COLONIZATION_STAGE_FETCH) {
    throw new Error(`Colonization materials cannot be delivered during ${memory.stage}`);
  }
  const history = colonizationHistoryForTarget(requiredSelectedTarget(memory));
  const stage = history.fetchStages[memory.fetchStageIndex];
  if (stage.id !== stageId) throw new Error(`Unexpected colonization material stage: ${stageId}`);
  return stage;
}

export function completeColonizationFetchStage(memory, stageId) {
  const stage = assertColonizationFetchDelivery(memory, stageId);
  const fetchStages = colonizationHistoryForTarget(requiredSelectedTarget(memory)).fetchStages;
  memory.fetchStageIndex += 1;
  if (memory.fetchStageIndex === fetchStages.length) {
    memory.stage = COLONIZATION_STAGE_READY;
  }
  validateColonizationQuestMemory(memory);
  return stage;
}

export function beginColonizationExpedition(memory) {
  validateColonizationQuestMemory(memory);
  if (memory.stage !== COLONIZATION_STAGE_READY) {
    throw new Error(`Colonization expedition cannot begin during ${memory.stage}`);
  }
  if (memory.targetTileId === null) throw new Error("Colonization expedition has no target tile");
  memory.stage = COLONIZATION_STAGE_OUTBOUND;
  validateColonizationQuestMemory(memory);
  return memory;
}

export function landColonists(memory, currentMinute) {
  validateColonizationQuestMemory(memory);
  if (memory.stage !== COLONIZATION_STAGE_OUTBOUND) {
    throw new Error(`Colonists cannot land during ${memory.stage}`);
  }
  const target = requiredSelectedTarget(memory);
  if (target.approvalFactionId && memory.approvalGranted !== true) {
    const approval = colonizationApprovalIdentity(memory);
    throw new Error(`${target.city} requires government approval in ${approval?.city || "the capital"}`);
  }
  assertMinute(currentMinute);
  memory.stage = COLONIZATION_STAGE_AWAITING_RESUPPLY;
  memory.foundedMinute = currentMinute;
  memory.resupplyDeadlineMinute = currentMinute + COLONIZATION_RESUPPLY_DAYS * MINUTES_PER_DAY;
  memory.resupplyExtensionMinutes = 0;
  memory.leftSinceFounding = false;
  validateColonizationQuestMemory(memory);
  return memory;
}

export function advanceColonizationQuest(memory, currentMinute, { awayFromColony = false } = {}) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  if (typeof awayFromColony !== "boolean") throw new Error("Colonization advance requires an away flag");
  let changed = false;
  if (memory.stage === COLONIZATION_STAGE_AWAITING_RESUPPLY && awayFromColony && !memory.leftSinceFounding) {
    memory.leftSinceFounding = true;
    changed = true;
  }
  if (memory.stage === COLONIZATION_STAGE_AWAITING_RESUPPLY && currentMinute > memory.resupplyDeadlineMinute) {
    memory.stage = COLONIZATION_STAGE_FAILED;
    memory.failedMinute = currentMinute;
    changed = true;
  }
  validateColonizationQuestMemory(memory);
  return changed;
}

export function assertColonizationResupplyDelivery(memory, currentMinute) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  if (memory.stage !== COLONIZATION_STAGE_AWAITING_RESUPPLY) {
    throw new Error(`Colonization resupply cannot be delivered during ${memory.stage}`);
  }
  if (currentMinute > memory.resupplyDeadlineMinute) throw new Error("The colony resupply deadline has passed");
  return colonizationHistoryForTarget(requiredSelectedTarget(memory)).resupply;
}

export function extendColonizationResupplyDeadline(memory, deliveredQuantity) {
  validateColonizationQuestMemory(memory);
  if (memory.stage !== COLONIZATION_STAGE_AWAITING_RESUPPLY) {
    throw new Error(`Colonization resupply cannot extend the deadline during ${memory.stage}`);
  }
  if (!Number.isInteger(deliveredQuantity) || deliveredQuantity <= 0) {
    throw new Error(`Invalid partial colony resupply quantity: ${deliveredQuantity}`);
  }
  const extensionMinutes =
    deliveredQuantity * COLONIZATION_RESUPPLY_EXTENSION_DAYS_PER_UNIT * MINUTES_PER_DAY;
  memory.resupplyExtensionMinutes += extensionMinutes;
  memory.resupplyDeadlineMinute += extensionMinutes;
  validateColonizationQuestMemory(memory);
  return extensionMinutes;
}

export function establishColony(memory, currentMinute) {
  assertColonizationResupplyDelivery(memory, currentMinute);
  const target = requiredSelectedTarget(memory);
  const defense = colonizationHistoryForTarget(target).defense;
  if (defense) {
    const count = defense.minCanoes + hashString32(
      `${colonizationTargetKey(target)}|${memory.foundedMinute}|defense-count`
    ) % (defense.maxCanoes - defense.minCanoes + 1);
    memory.stage = COLONIZATION_STAGE_DEFEND;
    memory.defenseStartedMinute = currentMinute;
    memory.defenseCompletedMinute = null;
    memory.defenseShipIds = Array.from(
      { length: count },
      (_, index) => `colony-defense:${slug(target.city)}:${index + 1}`
    );
    memory.defenseDefeatedShipIds = [];
  } else {
    memory.stage = COLONIZATION_STAGE_ESTABLISHED;
    memory.establishedMinute = currentMinute;
    initializeColonizationAftermath(memory, target, currentMinute);
  }
  validateColonizationQuestMemory(memory);
  return memory;
}

export function defeatColonizationAttacker(memory, shipId, currentMinute) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  if (memory.stage !== COLONIZATION_STAGE_DEFEND) return false;
  if (!memory.defenseShipIds.includes(shipId)) return false;
  if (memory.defenseDefeatedShipIds.includes(shipId)) return false;
  memory.defenseDefeatedShipIds.push(shipId);
  if (memory.defenseDefeatedShipIds.length === memory.defenseShipIds.length) {
    memory.stage = COLONIZATION_STAGE_REPORT_DEFENSE;
    memory.defenseCompletedMinute = currentMinute;
  }
  validateColonizationQuestMemory(memory);
  return true;
}

export function completeColonizationDefense(memory, currentMinute) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  if (memory.stage !== COLONIZATION_STAGE_REPORT_DEFENSE) {
    throw new Error(`Colony defense cannot be reported during ${memory.stage}`);
  }
  memory.stage = COLONIZATION_STAGE_ESTABLISHED;
  memory.establishedMinute = currentMinute;
  initializeColonizationAftermath(memory, requiredSelectedTarget(memory), currentMinute);
  validateColonizationQuestMemory(memory);
  return memory;
}

export function advanceColonizationAftermaths(
  memory,
  currentMinute,
  { isTileVisible = (_tileId) => false } = {}
) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  if (typeof isTileVisible !== "function") {
    throw new Error("Colonization aftermath advance requires a tile visibility function");
  }
  const events = [];
  for (const settlement of colonizationAllSettlementRecords(memory)) {
    const aftermath = settlement.aftermath;
    if (!aftermath || aftermath.stage !== COLONIZATION_AFTERMATH_WAITING ||
        currentMinute < aftermath.dueMinute || isTileVisible(settlement.targetTileId)) {
      continue;
    }
    aftermath.stage = COLONIZATION_AFTERMATH_MISSING;
    aftermath.disappearedMinute = currentMinute;
    events.push(Object.freeze({
      kind: "colony-disappeared",
      aftermathId: aftermath.id,
      city: settlement.targetCity,
      tileId: settlement.targetTileId
    }));
  }
  validateColonizationQuestMemory(memory);
  return Object.freeze(events);
}

export function colonizationAftermathForPort(memory, city) {
  validateColonizationQuestMemory(memory);
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.aftermath?.stage === COLONIZATION_AFTERMATH_MISSING ||
    candidate.aftermath?.stage === COLONIZATION_AFTERMATH_REPORTING
  ));
  if (!settlement || !colonizationAftermathReportPortEligible(city, colonizationAftermathTarget(settlement))) {
    return null;
  }
  return colonizationAftermathViewForSettlement(settlement);
}

export function commissionColonizationAftermath(memory, city, currentMinute) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.aftermath?.stage === COLONIZATION_AFTERMATH_MISSING
  ));
  if (!settlement) throw new Error("No missing colony is awaiting an investigation");
  if (!colonizationAftermathReportPortEligible(city, colonizationAftermathTarget(settlement))) {
    throw new Error("The Roanoke investigation must be commissioned in a European English port");
  }
  return beginColonizationAftermathInvestigation(memory, settlement, city, currentMinute);
}

export function discoverableColonizationAftermath(memory, distancePx) {
  validateColonizationQuestMemory(memory);
  if (!Number.isFinite(distancePx) || distancePx < 0) {
    throw new Error(`Invalid missing-colony discovery distance: ${distancePx}`);
  }
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.aftermath?.stage === COLONIZATION_AFTERMATH_MISSING
  ));
  if (!settlement || distancePx > ROANOKE_SPONTANEOUS_DISCOVERY_RADIUS_PX) return null;
  return colonizationAftermathViewForSettlement(settlement);
}

export function colonizationAftermathReportPort(memory, portCities) {
  validateColonizationQuestMemory(memory);
  if (!Array.isArray(portCities)) throw new Error("Roanoke report-port selection requires ports");
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.aftermath?.stage === COLONIZATION_AFTERMATH_MISSING
  ));
  if (!settlement) return null;
  const target = colonizationAftermathTarget(settlement);
  return portCities
    .filter((city) => colonizationAftermathReportPortEligible(city, target))
    .sort((a, b) => (
      Number(b.cityId === settlement.originCityId) - Number(a.cityId === settlement.originCityId) ||
      Number(b.capitalOfFactionId === target.originFactionId) -
        Number(a.capitalOfFactionId === target.originFactionId) ||
      greatCircleDistanceKm(a, target) - greatCircleDistanceKm(b, target) ||
      portIdentityKey(a).localeCompare(portIdentityKey(b))
    ))[0] || null;
}

export function discoverColonizationAftermath(memory, city, reportCity, currentMinute) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.targetCityId === city?.cityId &&
    candidate.aftermath?.stage === COLONIZATION_AFTERMATH_MISSING
  ));
  if (!settlement) throw new Error("No missing colony can be discovered at this site");
  if (!colonizationAftermathReportPortEligible(reportCity, colonizationAftermathTarget(settlement))) {
    throw new Error("The Roanoke investigation needs a European English report port");
  }
  return beginColonizationAftermathInvestigation(memory, settlement, reportCity, currentMinute);
}

export function colonizationAftermathAtSite(memory, city) {
  validateColonizationQuestMemory(memory);
  if (typeof city?.cityId !== "string") return null;
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.targetCityId === city.cityId &&
    [
      COLONIZATION_AFTERMATH_INVESTIGATING,
      COLONIZATION_AFTERMATH_REPORTING,
      COLONIZATION_AFTERMATH_COMPLETE
    ].includes(candidate.aftermath?.stage)
  ));
  return settlement ? colonizationAftermathViewForSettlement(settlement) : null;
}

export function inspectColonizationAftermath(memory, city, currentMinute) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.targetCityId === city?.cityId &&
    candidate.aftermath?.stage === COLONIZATION_AFTERMATH_INVESTIGATING
  ));
  if (!settlement) throw new Error("No colony investigation is active at this site");
  settlement.aftermath.stage = COLONIZATION_AFTERMATH_REPORTING;
  settlement.aftermath.inspectedMinute = currentMinute;
  validateColonizationQuestMemory(memory);
  return colonizationAftermathViewForSettlement(settlement);
}

export function completeColonizationAftermath(memory, city, currentMinute) {
  validateColonizationQuestMemory(memory);
  assertMinute(currentMinute);
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.aftermath?.stage === COLONIZATION_AFTERMATH_REPORTING
  ));
  if (!settlement) throw new Error("No Roanoke clues are awaiting delivery");
  if (!colonizationAftermathReportPortEligible(city, colonizationAftermathTarget(settlement))) {
    throw new Error("Roanoke's clues must be delivered to a European English port");
  }
  settlement.aftermath.stage = COLONIZATION_AFTERMATH_COMPLETE;
  settlement.aftermath.reportedMinute = currentMinute;
  validateColonizationQuestMemory(memory);
  return colonizationAftermathViewForSettlement(settlement);
}

export function colonizationAftermathView(memory) {
  validateColonizationQuestMemory(memory);
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    candidate.aftermath && candidate.aftermath.stage !== COLONIZATION_AFTERMATH_WAITING
  ));
  return settlement ? colonizationAftermathViewForSettlement(settlement) : null;
}

export function roanokeCluesAboard(memory) {
  return colonizationAllSettlementRecords(validateColonizationQuestMemory(memory)).some((settlement) => (
    settlement.aftermath?.id === COLONIZATION_AFTERMATH_ROANOKE &&
    settlement.aftermath.stage === COLONIZATION_AFTERMATH_REPORTING
  ));
}

export function colonizationDefenseShipIds(memory) {
  validateColonizationQuestMemory(memory);
  return Object.freeze(optionalShipIdList(memory.defenseShipIds, "defense ships").slice());
}

export function isColonizationDefenseShip(memory, shipId) {
  return nonEmptyString(shipId) && colonizationDefenseShipIds(memory).includes(shipId);
}

export function colonizationWorldRecord(memory) {
  validateColonizationQuestMemory(memory);
  return colonizationWorldRecordUnchecked(memory);
}

export function colonizationWorldRecords(memory) {
  validateColonizationQuestMemory(memory);
  return Object.freeze([
    ...memory.pastSettlements.map((settlement) => colonizationWorldRecordUnchecked(settlement)),
    colonizationWorldRecordUnchecked(memory)
  ].filter(Boolean));
}

function colonizationWorldRecordUnchecked(memory) {
  const target = colonizationSelectedTarget(memory);
  if (!target || memory.targetTileId === null) return null;
  if ([COLONIZATION_STAGE_FETCH, COLONIZATION_STAGE_READY].includes(memory.stage)) return null;
  if (target.preexistingSettlement && [
    COLONIZATION_STAGE_OUTBOUND,
    COLONIZATION_STAGE_FAILED
  ].includes(memory.stage)) return null;
  const established = memory.stage === COLONIZATION_STAGE_ESTABLISHED;
  const aftermathStage = memory.aftermath?.stage || null;
  const missing = aftermathStage === COLONIZATION_AFTERMATH_MISSING;
  const abandoned = [
    COLONIZATION_AFTERMATH_INVESTIGATING,
    COLONIZATION_AFTERMATH_REPORTING,
    COLONIZATION_AFTERMATH_COMPLETE
  ].includes(aftermathStage);
  const upgraded = established || [
    COLONIZATION_STAGE_DEFEND,
    COLONIZATION_STAGE_REPORT_DEFENSE
  ].includes(memory.stage);
  const failed = memory.stage === COLONIZATION_STAGE_FAILED;
  const outbound = memory.stage === COLONIZATION_STAGE_OUTBOUND;
  return {
    cityId: colonizationTargetKey(target),
    city: target.city,
    displayCity: abandoned
      ? `${target.city} Abandoned Colony`
      : upgraded
      ? target.city
      : failed
        ? `${target.city} Ruins`
        : target.preexistingSettlement
          ? target.city
          : outbound
            ? `${target.city} Colony Site`
            : `${target.city} Colony`,
    country: target.country,
    lat: target.lat,
    lon: target.lon,
    year: target.canFoundFromYear,
    historicalFoundingYear: target.year,
    population: abandoned
      ? 1
      : upgraded
      ? 2400
      : failed
        ? 1
        : target.preexistingSettlement
          ? target.preexistingPopulation
          : 120,
    cityType: target.cityType,
    economyRegion: target.economyRegion,
    settlementType: upgraded && !abandoned ? "city" : "village",
    coastalIntent: true,
    lakeIntent: false,
    requiredTradePort: upgraded && !abandoned && !missing,
    playerHomeExcluded: true,
    tileId: memory.targetTileId,
    portId: colonizationTargetPortId(target),
    factionId: abandoned ? "neutral" : upgraded || target.preexistingSettlement ? target.factionId : "neutral",
    foundingFactionId: target.factionId,
    colonialFoundingType: target.type,
    colonizationQuestSite: true,
    colonizationQuestStage: memory.stage,
    colonizationAftermathStage: aftermathStage,
    hiddenSettlement: outbound || missing,
    colonyAbandoned: abandoned,
    colonyBurning: failed,
    playerFoundedColony: upgraded && !abandoned && !target.preexistingSettlement,
    playerDevelopedPort: upgraded && !abandoned && target.preexistingSettlement,
    purchaseDiscountMultiplier: upgraded && !abandoned ? COLONIZATION_FOUNDER_DISCOUNT_MULTIPLIER : 1,
    initialImports: upgraded && !abandoned ? target.initialImports : [],
    foreignSettlements: established && !abandoned
      ? foreignSettlementsByIds(target.foreignSettlementIds)
      : []
  };
}

export function colonizationObjective(memory) {
  validateColonizationQuestMemory(memory);
  const aftermathObjective = colonizationAftermathObjective(memory);
  if (aftermathObjective) return aftermathObjective;
  if (memory.targetTileId === null) return null;
  if (memory.stage === COLONIZATION_STAGE_OUTBOUND) {
    const approval = colonizationApprovalIdentity(memory);
    if (approval && memory.approvalGranted !== true) {
      return { tileId: approval.tileId, kind: "negotiate-colony" };
    }
    const target = requiredSelectedTarget(memory);
    return {
      tileId: memory.targetTileId,
      kind: target.preexistingSettlement ? "develop-port" : "found-colony"
    };
  }
  if (memory.stage === COLONIZATION_STAGE_AWAITING_RESUPPLY) {
    return { tileId: memory.targetTileId, kind: "resupply-colony" };
  }
  if (memory.stage === COLONIZATION_STAGE_DEFEND) {
    const defense = colonizationHistoryForTarget(requiredSelectedTarget(memory)).defense;
    return {
      tileId: memory.targetTileId,
      kind: "defend-colony",
      attackerName: defense.objectiveName
    };
  }
  if (memory.stage === COLONIZATION_STAGE_REPORT_DEFENSE) {
    return { tileId: memory.targetTileId, kind: "report-colony-defense" };
  }
  return null;
}

export function colonizationNavigationObjective(
  state,
  { currentMinute = 0 } = {}
) {
  const quest = colonizationQuestView(state, { currentMinute });
  const objective = colonizationObjective(state.memory.colonization);
  if (objective?.kind === "negotiate-colony" && !quest.approvalCargoDeliverable) return null;
  if (objective) return objective;
  if (quest.stage === COLONIZATION_STAGE_FETCH && quest.canDeliverFetch) {
    return { tileId: quest.origin.tileId, kind: "deliver-colony-materials" };
  }
  if (quest.stage === COLONIZATION_STAGE_READY) {
    if (!Number.isInteger(quest.origin?.tileId)) {
      throw new Error("Ready colonization expedition has no sponsor port");
    }
    return { tileId: quest.origin.tileId, kind: "embark-colonists" };
  }
  return null;
}

function initializeColonizationAftermath(memory, target, establishedMinute) {
  if (!target.aftermathId) return null;
  if (target.aftermathId !== COLONIZATION_AFTERMATH_ROANOKE) {
    throw new Error(`Unknown colonization aftermath: ${target.aftermathId}`);
  }
  if (memory.aftermath !== null) {
    throw new Error(`${target.city} already has a colonization aftermath`);
  }
  memory.aftermath = {
    id: target.aftermathId,
    stage: COLONIZATION_AFTERMATH_WAITING,
    dueMinute: establishedMinute + ROANOKE_DISAPPEARANCE_DAYS * MINUTES_PER_DAY,
    disappearedMinute: null,
    offeredMinute: null,
    inspectedMinute: null,
    reportedMinute: null,
    reportTileId: null,
    reportCity: null,
    reportCountry: null
  };
  return memory.aftermath;
}

function validateColonizationAftermath(memory, target) {
  const aftermath = memory.aftermath;
  if (aftermath === null || aftermath === undefined) {
    if (target?.aftermathId && memory.stage === COLONIZATION_STAGE_ESTABLISHED) {
      throw new Error(`${target.city} established without its historical aftermath`);
    }
    return null;
  }
  if (!target?.aftermathId || aftermath.id !== target.aftermathId) {
    throw new Error(`Colonization aftermath does not match ${target?.city || "an unselected target"}`);
  }
  if (aftermath.id !== COLONIZATION_AFTERMATH_ROANOKE) {
    throw new Error(`Unknown colonization aftermath: ${aftermath.id}`);
  }
  if (memory.stage !== COLONIZATION_STAGE_ESTABLISHED) {
    throw new Error(`${target.city} aftermath requires an established colony`);
  }
  if (!COLONIZATION_AFTERMATH_STAGES.has(aftermath.stage)) {
    throw new Error(`Invalid colonization aftermath stage: ${aftermath.stage}`);
  }
  for (const key of [
    "dueMinute",
    "disappearedMinute",
    "offeredMinute",
    "inspectedMinute",
    "reportedMinute"
  ]) {
    if (aftermath[key] !== null && (!Number.isFinite(aftermath[key]) || aftermath[key] < 0)) {
      throw new Error(`Invalid colonization aftermath ${key}: ${aftermath[key]}`);
    }
  }
  if (!Number.isFinite(aftermath.dueMinute) || aftermath.dueMinute <= memory.establishedMinute) {
    throw new Error(`Invalid ${target.city} disappearance minute`);
  }
  const missingOrLater = aftermath.stage !== COLONIZATION_AFTERMATH_WAITING;
  if (missingOrLater !== (aftermath.disappearedMinute !== null)) {
    throw new Error(`${target.city} disappearance timestamp does not match its aftermath stage`);
  }
  const commissioned = [
    COLONIZATION_AFTERMATH_INVESTIGATING,
    COLONIZATION_AFTERMATH_REPORTING,
    COLONIZATION_AFTERMATH_COMPLETE
  ].includes(aftermath.stage);
  const reportIdentityComplete = Number.isInteger(aftermath.reportTileId) && aftermath.reportTileId >= 0 &&
    nonEmptyString(aftermath.reportCity) && nonEmptyString(aftermath.reportCountry);
  if (commissioned !== (aftermath.offeredMinute !== null) || commissioned !== reportIdentityComplete) {
    throw new Error(`${target.city} investigation commission is incomplete`);
  }
  const inspected = [COLONIZATION_AFTERMATH_REPORTING, COLONIZATION_AFTERMATH_COMPLETE].includes(aftermath.stage);
  if (inspected !== (aftermath.inspectedMinute !== null)) {
    throw new Error(`${target.city} inspection timestamp does not match its aftermath stage`);
  }
  if ((aftermath.stage === COLONIZATION_AFTERMATH_COMPLETE) !== (aftermath.reportedMinute !== null)) {
    throw new Error(`${target.city} report timestamp does not match its aftermath stage`);
  }
  return aftermath;
}

function colonizationAllSettlementRecords(memory) {
  return [...memory.pastSettlements, ...(colonizationSelectedTarget(memory) ? [memory] : [])];
}

function colonizationAftermathViewForSettlement(settlement) {
  const target = colonizationAftermathTarget(settlement);
  return Object.freeze({
    ...settlement.aftermath,
    target: Object.freeze(target)
  });
}

function colonizationAftermathTarget(settlement) {
  return { ...requiredSelectedTarget(settlement), tileId: settlement.targetTileId };
}

function colonizationAftermathObjective(memory) {
  const settlement = colonizationAllSettlementRecords(memory).find((candidate) => (
    [COLONIZATION_AFTERMATH_INVESTIGATING, COLONIZATION_AFTERMATH_REPORTING]
      .includes(candidate.aftermath?.stage)
  ));
  if (!settlement) return null;
  if (settlement.aftermath.stage === COLONIZATION_AFTERMATH_INVESTIGATING) {
    return { tileId: settlement.targetTileId, kind: "investigate-lost-colony" };
  }
  return { tileId: settlement.aftermath.reportTileId, kind: "report-lost-colony" };
}

function beginColonizationAftermathInvestigation(memory, settlement, reportCity, currentMinute) {
  const aftermath = settlement.aftermath;
  aftermath.stage = COLONIZATION_AFTERMATH_INVESTIGATING;
  aftermath.offeredMinute = currentMinute;
  aftermath.reportTileId = reportCity.tileId;
  aftermath.reportCity = reportCity.city;
  aftermath.reportCountry = reportCity.country;
  validateColonizationQuestMemory(memory);
  return colonizationAftermathViewForSettlement(settlement);
}

function colonizationAftermathReportPortEligible(city, target) {
  return Boolean(
    Number.isInteger(city?.tileId) &&
    nonEmptyString(city.city) &&
    nonEmptyString(city.country) &&
    cityIsInEurope(city) &&
    (city.factionId === target.originFactionId || colonizationOriginCanHostExiledSponsor(city, target))
  );
}

function assertMinute(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid colonization minute: ${value}`);
}

function colonizationSelectedTarget(memory) {
  if (!memory || typeof memory !== "object") return null;
  if (nonEmptyString(memory.targetCityId)) {
    return colonizationTargetForCity({ cityId: memory.targetCityId });
  }
  const legacyMemory = memory.targetCity === undefined &&
    memory.targetCountry === undefined &&
    memory.spawnRolls === undefined;
  return legacyMemory ? TARGET : null;
}

function requiredSelectedTarget(memory) {
  validateColonizationQuestMemory(memory);
  const target = colonizationSelectedTarget(memory);
  if (!target) throw new Error("Colonization quest has not selected a target");
  return target;
}

function selectedTargetView(memory) {
  const target = colonizationSelectedTarget(memory);
  return target ? Object.freeze({
    ...target,
    tileId: memory.targetTileId,
    distanceKm: memory.distanceKm ?? null
  }) : null;
}

function colonizationOriginIdentity(memory) {
  if (!memory || typeof memory !== "object") return null;
  if (nonEmptyString(memory.originCityId) && nonEmptyString(memory.originCity) && nonEmptyString(memory.originCountry)) {
    return Object.freeze({
      cityId: memory.originCityId,
      tileId: memory.originTileId,
      city: memory.originCity,
      country: memory.originCountry
    });
  }
  const legacyMemory = memory.originCity === undefined &&
    memory.originCountry === undefined &&
    memory.spawnRolls === undefined;
  return legacyMemory
    ? Object.freeze({ tileId: null, city: COLONIZATION_ORIGIN_CITY, country: COLONIZATION_ORIGIN_COUNTRY })
    : null;
}

function colonizationApprovalIdentity(memory) {
  if (!memory || typeof memory !== "object") return null;
  if (nonEmptyString(memory.approvalCityId) && nonEmptyString(memory.approvalCity) && nonEmptyString(memory.approvalCountry)) {
    return Object.freeze({
      cityId: memory.approvalCityId,
      tileId: memory.approvalTileId,
      city: memory.approvalCity,
      country: memory.approvalCountry
    });
  }
  return null;
}

function validateOptionalIdentity(memory, prefix, { tileId = false } = {}) {
  const city = memory[`${prefix}City`];
  const country = memory[`${prefix}Country`];
  const absent = (city === null || city === undefined) && (country === null || country === undefined);
  if (!absent && (!nonEmptyString(city) || !nonEmptyString(country))) {
    throw new Error(`Colonization ${prefix} identity is incomplete`);
  }
  if (!tileId) return;
  const id = memory[`${prefix}TileId`];
  if (absent) {
    if (id !== null && id !== undefined) throw new Error(`Colonization ${prefix} tile has no identity`);
  } else if (!Number.isInteger(id) || id < 0) {
    throw new Error(`Colonization ${prefix} requires a tile`);
  }
}

function validateQuestTarget(target) {
  if (!target || !nonEmptyString(target.cityId) || !nonEmptyString(target.city) || !nonEmptyString(target.country) ||
      !Number.isInteger(target.tileId) || target.tileId < 0) {
    throw new Error("Colonization quest requires a placed target");
  }
  const canonical = colonizationTargetForCity(target);
  if (!canonical) throw new Error(`Unknown colonization target: ${target.city}, ${target.country}`);
  if (canonical.waterAccess === "inland") {
    throw new Error(`Inland city cannot be a sailing colonization quest: ${target.city}`);
  }
  colonizationHistoryForTarget(canonical);
  for (const requirement of canonical.approvalCargo) tradeGoodById(requirement.goodId);
}

function colonizationApprovalCargoView(state, target) {
  if (!target) return Object.freeze([]);
  return Object.freeze(target.approvalCargo.map((requirement) => {
    const good = tradeGoodById(requirement.goodId);
    const held = state.cargo?.[good.id] || 0;
    const requirementId = colonizationApprovalRequirementId(target, requirement);
    const progress = questCargoDeliveryProgress(state, requirementId, requirement.quantity);
    const deliverable = questCargoDeliverableQuantity(
      state,
      requirementId,
      requirement.quantity,
      held
    );
    return Object.freeze({
      ...requirement,
      goodLabel: good.label,
      held,
      requirementId,
      delivered: progress.deliveredQuantity,
      remaining: progress.remainingQuantity,
      deliverable,
      complete: progress.complete,
      missing: Math.max(0, progress.remainingQuantity - held)
    });
  }));
}

function colonizationResupplyView(state, target, resupply) {
  if (!target) return resupply;
  const requirementId = colonizationResupplyRequirementId(target, resupply);
  const held = state.cargo?.[resupply.goodId] || 0;
  const progress = questCargoDeliveryProgress(state, requirementId, resupply.quantity);
  return Object.freeze({
    ...resupply,
    requirementId,
    delivered: progress.deliveredQuantity,
    remaining: progress.remainingQuantity,
    deliverable: questCargoDeliverableQuantity(
      state,
      requirementId,
      resupply.quantity,
      held
    ),
    complete: progress.complete
  });
}

export function colonizationFetchRequirementId(target, stage) {
  if (!stage?.id) throw new Error("Colonization fetch requirement needs a stage");
  return `${colonizationRequirementPrefix(target)}.fetch.${stage.id}`;
}

export function colonizationApprovalRequirementId(target, requirement) {
  if (!requirement?.goodId) throw new Error("Colonization approval requirement needs a good");
  return `${colonizationRequirementPrefix(target)}.approval.${requirement.goodId}`;
}

export function colonizationResupplyRequirementId(target, resupply) {
  if (!resupply?.goodId) throw new Error("Colonization resupply requirement needs a good");
  return `${colonizationRequirementPrefix(target)}.resupply.${resupply.goodId}`;
}

function colonizationRequirementPrefix(target) {
  if (!target?.cityId) {
    throw new Error("Colonization cargo requirement needs a selected target");
  }
  return `colonization.${target.cityId}`.replace(/[^a-z0-9]+/g, "-");
}

function validateQuestOrigin(origin) {
  if (!origin || !nonEmptyString(origin.cityId) || !nonEmptyString(origin.city) || !nonEmptyString(origin.country) ||
      !nonEmptyString(origin.factionId) || !Number.isInteger(origin.tileId) || origin.tileId < 0) {
    throw new Error("Colonization quest requires a faction port origin");
  }
}

function assertColonizationOriginCanHostTarget(origin, target, { allowExiledSponsor = false } = {}) {
  if (colonizationOriginCanSponsorTarget(origin, target)) return;
  if (allowExiledSponsor && colonizationOriginCanHostExiledSponsor(origin, target)) return;
  const sponsorFactionId = allowExiledSponsor ? origin.foundingFactionId : origin.factionId;
  if (target.originFactionId !== sponsorFactionId) {
    throw new Error(`${origin.city} cannot sponsor a ${target.originFactionId} colony mission`);
  }
  throw new Error(`${origin.city} cannot reach the ${target.city} colonization target`);
}

function validateSpawnRolls(rolls) {
  if (!rolls || typeof rolls !== "object" || Array.isArray(rolls)) {
    throw new Error("Colonization spawn rolls must be an object");
  }
  for (const [key, value] of Object.entries(rolls)) {
    if (!nonEmptyString(key) || value !== true) throw new Error(`Invalid colonization spawn roll: ${key}`);
  }
}

function optionalShipIdList(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((shipId) => !nonEmptyString(shipId)) ||
      new Set(value).size !== value.length) {
    throw new Error(`Invalid colonization ${label}`);
  }
  return value;
}

function colonizationSpawnRolls(memory) {
  if (memory.spawnRolls === undefined) memory.spawnRolls = {};
  validateSpawnRolls(memory.spawnRolls);
  return memory.spawnRolls;
}

function colonizationSpawnChance(value) {
  const chance = value ?? COLONIZATION_SPAWN_CHANCE;
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid colonization spawn chance: ${chance}`);
  }
  return chance;
}

function colonizationRollPeriod(simMinute = 0) {
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid colonization offer minute: ${simMinute}`);
  }
  return Math.floor(simMinute / COLONIZATION_ROLL_PERIOD_MINUTES);
}

function chooseColonizationTarget(candidates, seed, context) {
  const requested = context.targetTileId === undefined
    ? null
    // IDENTITY_SPATIAL_EXCEPTION: scenario authors may deliberately select this exact world tile.
    : candidates.find((target) => target.tileId === context.targetTileId);
  if (context.targetTileId !== undefined && !requested) {
    throw new Error(`Requested colony target is not eligible: ${context.targetTileId}`);
  }
  return requested || candidates[hashString32(seed) % candidates.length];
}

function chooseApprovalPort(target, portCities, context) {
  const candidates = portCities
    .filter((port) => port.factionId === target.approvalFactionId)
    .sort((a, b) => (
      Number(b.capitalOfFactionId === target.approvalFactionId) -
        Number(a.capitalOfFactionId === target.approvalFactionId) ||
      portIdentityKey(a).localeCompare(portIdentityKey(b))
    ));
  if (context.approvalTileId !== undefined) {
    // IDENTITY_SPATIAL_EXCEPTION: scenario authors may deliberately select this exact world tile.
    const requested = candidates.find((port) => port.tileId === context.approvalTileId);
    if (!requested) throw new Error(`Requested approval port is not eligible: ${context.approvalTileId}`);
    return requested;
  }
  return candidates[0] || null;
}

function pruneSpawnRolls(rolls) {
  const keys = Object.keys(rolls);
  for (const key of keys.slice(0, Math.max(0, keys.length - 256))) delete rolls[key];
}

function colonizationTargetPortId(target) {
  return `colony-${target.cityId.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function colonizationTargetKey(target) {
  return target.cityId;
}

function portIdentityKey(city) {
  return city.cityId;
}

function portMatchesIdentity(city, identity) {
  return Boolean(identity && city?.cityId === identity.cityId);
}

function colonizationReplacementOriginOrder(a, b, target, previousOrigin) {
  const capitalDifference =
    Number(b.capitalOfFactionId === target.originFactionId) -
    Number(a.capitalOfFactionId === target.originFactionId);
  if (capitalDifference !== 0) return capitalDifference;
  const reference = previousOrigin && Number.isFinite(previousOrigin.lat) && Number.isFinite(previousOrigin.lon)
    ? previousOrigin
    : target;
  const distanceDifference = greatCircleDistanceKm(reference, a) - greatCircleDistanceKm(reference, b);
  return distanceDifference || portIdentityKey(a).localeCompare(portIdentityKey(b));
}

function seededFraction(value) {
  return hashString32(value) / 0x100000000;
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
