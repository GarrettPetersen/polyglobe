import { colonizationTargetForCity } from "./colonialCities.js";
import {
  CARGO_SPACE_TICKS_PER_UNIT,
  availableCargoTicks,
  cargoUnitsFromTicks
} from "./cargoSpace.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { tradeGoodById } from "./economy.js";
import { colonizationHistoryForTarget } from "./colonizationHistory.js";

export const COLONIZATION_QUEST_VERSION = 1;
export const COLONIZATION_ORIGIN_CITY = "Bordeaux";
export const COLONIZATION_ORIGIN_COUNTRY = "France";
export const COLONIZATION_TARGET_CITY = "Port Royal";
export const COLONIZATION_TARGET_COUNTRY = "Canada";
export const COLONIZATION_TARGET_PORT_ID = "colony-port-royal";
export const COLONIZATION_CARGO_RESERVATION_ID = "port-royal-colonists";
export const COLONIZATION_EXPEDITION_CARGO_UNITS = 24;
export const COLONIZATION_SETTLER_COUNT = 12;
export const COLONIZATION_MIN_CARGO_CAPACITY = 90;
export const COLONIZATION_MIN_SEAWORTHINESS = 7;
export const COLONIZATION_RESUPPLY_DAYS = 365;
export const COLONIZATION_FOUNDER_DISCOUNT_MULTIPLIER = 0.85;
export const COLONIZATION_ORGANIZER_APPROACHED_FLAG = "colonizationOrganizerApproached";
export const COLONIZATION_SPAWN_CHANCE = 0.035;
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

const MINUTES_PER_DAY = 24 * 60;
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
    leftSinceFounding: false,
    failedMinute: null,
    establishedMinute: null,
    defenseStartedMinute: null,
    defenseCompletedMinute: null,
    defenseShipIds: [],
    defenseDefeatedShipIds: [],
    targetCity: null,
    targetCountry: null,
    originTileId: null,
    originCity: null,
    originCountry: null,
    approvalTileId: null,
    approvalCity: null,
    approvalCountry: null,
    approvalGranted: false,
    distanceKm: null,
    offerSeen: false,
    spawnRolls: {}
  };
}

export function validateColonizationQuestMemory(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== COLONIZATION_QUEST_VERSION) {
    throw new Error(`Unsupported colonization quest memory: ${memory?.version ?? "missing"}`);
  }
  if (!STAGES.has(memory.stage)) throw new Error(`Invalid colonization quest stage: ${memory.stage}`);
  const selectedTarget = colonizationSelectedTarget(memory);
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
      memory.foundedMinute + COLONIZATION_RESUPPLY_DAYS * MINUTES_PER_DAY) {
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

export function assignColonizationQuest(memory, { target, origin, approvalPort = null }) {
  validateColonizationQuestMemory(memory);
  validateQuestTarget(target);
  validateQuestOrigin(origin);
  if (target.originFactionId !== origin.factionId) {
    throw new Error(`${origin.city} cannot sponsor a ${target.originFactionId} colony mission`);
  }
  if (target.originCountry && target.originCountry !== origin.country) {
    throw new Error(`${target.city} expedition must leave from ${target.originCountry}`);
  }
  if (target.approvalFactionId) {
    validateQuestOrigin(approvalPort);
    if (approvalPort.factionId !== target.approvalFactionId) {
      throw new Error(`${target.city} requires approval from ${target.approvalFactionId}`);
    }
  } else if (approvalPort) {
    throw new Error(`${target.city} does not require a government approval stop`);
  }
  const selectedTarget = colonizationSelectedTarget(memory);
  const selectedOrigin = colonizationOriginIdentity(memory);
  if (selectedTarget && (
    selectedTarget.city !== target.city || selectedTarget.country !== target.country
  )) {
    throw new Error(`Saved colony ${selectedTarget.city} does not match ${target.city}`);
  }
  if (selectedOrigin && Number.isInteger(selectedOrigin.tileId) && selectedOrigin.tileId !== origin.tileId) {
    throw new Error(`Saved colony origin ${selectedOrigin.tileId} does not match ${origin.tileId}`);
  }
  memory.targetCity = target.city;
  memory.targetCountry = target.country;
  memory.targetTileId = target.tileId;
  memory.originTileId = origin.tileId;
  memory.originCity = origin.city;
  memory.originCountry = origin.country;
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

export function colonizationOfferForCity(state, city, portCities, targetPlacements, context = {}) {
  const memory = colonizationQuestMemory(state);
  if (!city || !Array.isArray(portCities) || !Array.isArray(targetPlacements)) return null;
  const selectedTarget = colonizationSelectedTarget(memory);
  if (selectedTarget) return isColonizationQuestOrigin(memory, city) ? memory : null;
  if (memory.stage !== COLONIZATION_STAGE_FETCH || memory.fetchStageIndex !== 0) return null;

  const eligibleTargets = eligibleColonizationTargetsForOrigin(city, targetPlacements);
  if (eligibleTargets.length === 0) return null;
  const period = colonizationRollPeriod(context.simMinute);
  const rollKey = `${portIdentityKey(city)}|${period}`;
  const spawnRolls = colonizationSpawnRolls(memory);
  if (spawnRolls[rollKey]) return null;
  spawnRolls[rollKey] = true;
  pruneSpawnRolls(spawnRolls);

  const spawnChance = colonizationSpawnChance(context.spawnChance);
  const identityKey = state.playerCharacter?.identityKey || state.playerCharacter?.name || "captain";
  if (spawnChance < 1 && seededFraction(`${identityKey}|${rollKey}|colonization`) >= spawnChance) return null;
  const target = chooseColonizationTarget(eligibleTargets, `${identityKey}|${rollKey}|target`, context);
  const approvalPort = target.approvalFactionId
    ? chooseApprovalPort(target, portCities, context)
    : null;
  if (target.approvalFactionId && !approvalPort) return null;
  assignColonizationQuest(memory, { target, origin: city, approvalPort });
  return memory;
}

export function eligibleColonizationTargetsForOrigin(city, targetPlacements) {
  if (!city?.factionId || !Array.isArray(targetPlacements)) return Object.freeze([]);
  return Object.freeze(targetPlacements
    .filter((target) => (
      target?.originFactionId === city.factionId &&
      (!target.originCountry || target.originCountry === city.country) &&
      target.waterAccess !== "inland" &&
      Number.isInteger(target.tileId) &&
      greatCircleDistanceKm(city, target) >= COLONIZATION_MIN_VOYAGE_DISTANCE_KM
    ))
    .sort((a, b) => colonizationTargetKey(a).localeCompare(colonizationTargetKey(b))));
}

export function isColonizationQuestOrigin(memory, city) {
  const origin = colonizationOriginIdentity(memory);
  return Boolean(origin && (
    city?.tileId === origin.tileId ||
    (city?.city === origin.city && city?.country === origin.country)
  ));
}

export function isColonizationQuestTarget(memory, city) {
  const target = colonizationSelectedTarget(memory);
  return Boolean(target && (
    city?.tileId === memory.targetTileId ||
    city?.portId === colonizationTargetPortId(target) ||
    (city?.city === target.city && city?.country === target.country)
  ));
}

export function isColonizationQuestApproval(memory, city) {
  const approval = colonizationApprovalIdentity(memory);
  return Boolean(approval && (
    city?.tileId === approval.tileId ||
    (city?.city === approval.city && city?.country === approval.country)
  ));
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
  const fetchStage = memory.stage === COLONIZATION_STAGE_FETCH
    ? (history?.fetchStages || COLONIZATION_FETCH_STAGES)[memory.fetchStageIndex]
    : null;
  const held = fetchStage ? state.cargo?.[fetchStage.goodId] || 0 : 0;
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
    fetchStage,
    held,
    canDeliverFetch: Boolean(fetchStage && held >= fetchStage.quantity),
    shipEligibility,
    resupply: history?.resupply || COLONIZATION_RESUPPLY,
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
  if (!memory.leftSinceFounding) throw new Error("The ship must leave the colony before returning with resupply");
  if (currentMinute > memory.resupplyDeadlineMinute) throw new Error("The colony resupply deadline has passed");
  return colonizationHistoryForTarget(requiredSelectedTarget(memory)).resupply;
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
  validateColonizationQuestMemory(memory);
  return memory;
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
  const target = colonizationSelectedTarget(memory);
  if (!target || memory.targetTileId === null) return null;
  if ([COLONIZATION_STAGE_FETCH, COLONIZATION_STAGE_READY].includes(memory.stage)) return null;
  const established = memory.stage === COLONIZATION_STAGE_ESTABLISHED;
  const upgraded = established || [
    COLONIZATION_STAGE_DEFEND,
    COLONIZATION_STAGE_REPORT_DEFENSE
  ].includes(memory.stage);
  const failed = memory.stage === COLONIZATION_STAGE_FAILED;
  const outbound = memory.stage === COLONIZATION_STAGE_OUTBOUND;
  return {
    cityId: colonizationTargetKey(target),
    city: target.city,
    displayCity: upgraded
      ? target.city
      : failed
        ? `${target.city} Ruins`
        : outbound
          ? `${target.city} Colony Site`
          : `${target.city} Colony`,
    country: target.country,
    lat: target.lat,
    lon: target.lon,
    year: target.canFoundFromYear,
    historicalFoundingYear: target.year,
    population: upgraded ? 2400 : failed ? 1 : 120,
    cityType: target.cityType,
    settlementType: upgraded ? "city" : "village",
    coastalIntent: true,
    lakeIntent: false,
    requiredTradePort: upgraded,
    playerHomeExcluded: true,
    tileId: memory.targetTileId,
    portId: colonizationTargetPortId(target),
    factionId: upgraded ? target.factionId : "neutral",
    foundingFactionId: target.factionId,
    colonizationQuestSite: true,
    colonizationQuestStage: memory.stage,
    hiddenSettlement: outbound,
    colonyBurning: failed,
    playerFoundedColony: upgraded,
    purchaseDiscountMultiplier: upgraded ? COLONIZATION_FOUNDER_DISCOUNT_MULTIPLIER : 1
  };
}

export function colonizationObjective(memory) {
  validateColonizationQuestMemory(memory);
  if (memory.targetTileId === null) return null;
  if (memory.stage === COLONIZATION_STAGE_OUTBOUND) {
    const approval = colonizationApprovalIdentity(memory);
    if (approval && memory.approvalGranted !== true) {
      return { tileId: approval.tileId, kind: "negotiate-colony" };
    }
    return { tileId: memory.targetTileId, kind: "found-colony" };
  }
  if (memory.stage === COLONIZATION_STAGE_AWAITING_RESUPPLY && memory.leftSinceFounding) {
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

function assertMinute(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid colonization minute: ${value}`);
}

function colonizationSelectedTarget(memory) {
  if (!memory || typeof memory !== "object") return null;
  if (nonEmptyString(memory.targetCity) && nonEmptyString(memory.targetCountry)) {
    return colonizationTargetForCity({ city: memory.targetCity, country: memory.targetCountry });
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
  if (nonEmptyString(memory.originCity) && nonEmptyString(memory.originCountry)) {
    return Object.freeze({
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
  if (nonEmptyString(memory.approvalCity) && nonEmptyString(memory.approvalCountry)) {
    return Object.freeze({
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
  if (!target || !nonEmptyString(target.city) || !nonEmptyString(target.country) ||
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
    return Object.freeze({
      ...requirement,
      goodLabel: good.label,
      held,
      missing: Math.max(0, requirement.quantity - held)
    });
  }));
}

function validateQuestOrigin(origin) {
  if (!origin || !nonEmptyString(origin.city) || !nonEmptyString(origin.country) ||
      !nonEmptyString(origin.factionId) || !Number.isInteger(origin.tileId) || origin.tileId < 0) {
    throw new Error("Colonization quest requires a faction port origin");
  }
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
  return `colony-${slug(target.city)}-${slug(target.country)}`;
}

function colonizationTargetKey(target) {
  return `${target.city.trim().toLowerCase()}|${target.country.trim().toLowerCase()}`;
}

function portIdentityKey(city) {
  return `${city.city}|${city.country}|${city.tileId}`;
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
