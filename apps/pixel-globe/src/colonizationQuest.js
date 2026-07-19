import { colonizationTargetForCity } from "./colonialCities.js";
import {
  CARGO_SPACE_TICKS_PER_UNIT,
  availableCargoTicks,
  cargoUnitsFromTicks
} from "./cargoSpace.js";

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

export const COLONIZATION_STAGE_FETCH = "fetch";
export const COLONIZATION_STAGE_READY = "ready";
export const COLONIZATION_STAGE_OUTBOUND = "outbound";
export const COLONIZATION_STAGE_AWAITING_RESUPPLY = "awaiting-resupply";
export const COLONIZATION_STAGE_FAILED = "failed";
export const COLONIZATION_STAGE_ESTABLISHED = "established";

export const COLONIZATION_FETCH_STAGES = Object.freeze([
  fetchStage(
    "canvas-and-clothing",
    "wool-cloth",
    "Wool Cloth",
    6,
    300,
    "tents, spare clothes, and weatherproof covers"
  ),
  fetchStage(
    "house-frames",
    "timber",
    "Timber",
    10,
    220,
    "house frames, a palisade, and a boat for the shallows"
  ),
  fetchStage(
    "tools-and-nails",
    "iron",
    "Iron",
    6,
    240,
    "axes, nails, hoes, and tools that cannot be replaced across the ocean"
  )
]);

export const COLONIZATION_RESUPPLY = Object.freeze({
  goodId: "grain",
  goodLabel: "Grain",
  quantity: 12,
  reward: 1500,
  purpose: "seed grain and food insurance for the colony's second year"
});

const MINUTES_PER_DAY = 24 * 60;
const STAGES = new Set([
  COLONIZATION_STAGE_FETCH,
  COLONIZATION_STAGE_READY,
  COLONIZATION_STAGE_OUTBOUND,
  COLONIZATION_STAGE_AWAITING_RESUPPLY,
  COLONIZATION_STAGE_FAILED,
  COLONIZATION_STAGE_ESTABLISHED
]);
const TARGET = colonizationTargetForCity({
  city: COLONIZATION_TARGET_CITY,
  country: COLONIZATION_TARGET_COUNTRY
});

if (!TARGET) throw new Error("Port Royal is missing from the colonization target registry");
if (TARGET.factionId !== "france") throw new Error("Port Royal colonization target must belong to France");

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
    establishedMinute: null
  };
}

export function validateColonizationQuestMemory(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== COLONIZATION_QUEST_VERSION) {
    throw new Error(`Unsupported colonization quest memory: ${memory?.version ?? "missing"}`);
  }
  if (!STAGES.has(memory.stage)) throw new Error(`Invalid colonization quest stage: ${memory.stage}`);
  if (!Number.isInteger(memory.fetchStageIndex) ||
      memory.fetchStageIndex < 0 || memory.fetchStageIndex > COLONIZATION_FETCH_STAGES.length) {
    throw new Error(`Invalid colonization fetch stage: ${memory.fetchStageIndex}`);
  }
  const fetchComplete = memory.fetchStageIndex === COLONIZATION_FETCH_STAGES.length;
  if (memory.stage === COLONIZATION_STAGE_FETCH && fetchComplete) {
    throw new Error("Colonization fetch stage is complete but quest is still fetching");
  }
  if (memory.stage !== COLONIZATION_STAGE_FETCH && !fetchComplete) {
    throw new Error(`Colonization quest left fetch stage early: ${memory.fetchStageIndex}`);
  }
  if (memory.targetTileId !== null && (!Number.isInteger(memory.targetTileId) || memory.targetTileId < 0)) {
    throw new Error(`Invalid colonization target tile: ${memory.targetTileId}`);
  }
  if (typeof memory.leftSinceFounding !== "boolean") {
    throw new Error("Colonization quest requires a departure flag");
  }
  for (const key of ["foundedMinute", "resupplyDeadlineMinute", "failedMinute", "establishedMinute"]) {
    if (memory[key] !== null && (!Number.isFinite(memory[key]) || memory[key] < 0)) {
      throw new Error(`Invalid colonization ${key}: ${memory[key]}`);
    }
  }
  const founded = memory.foundedMinute !== null && memory.resupplyDeadlineMinute !== null;
  const requiresFounding = [
    COLONIZATION_STAGE_AWAITING_RESUPPLY,
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
  return memory;
}

export function colonizationQuestMemory(state) {
  const memory = state?.memory?.colonization;
  return validateColonizationQuestMemory(memory);
}

export function assignColonizationTargetTile(memory, tileId) {
  validateColonizationQuestMemory(memory);
  if (!Number.isInteger(tileId) || tileId < 0) throw new Error(`Invalid Port Royal target tile: ${tileId}`);
  if (memory.targetTileId !== null && memory.targetTileId !== tileId) {
    throw new Error(`Saved Port Royal tile ${memory.targetTileId} does not match world tile ${tileId}`);
  }
  memory.targetTileId = tileId;
  return tileId;
}

export function isColonizationQuestOrigin(city) {
  return city?.city === COLONIZATION_ORIGIN_CITY && city?.country === COLONIZATION_ORIGIN_COUNTRY;
}

export function isColonizationQuestTarget(city) {
  return city?.portId === COLONIZATION_TARGET_PORT_ID || (
    city?.city === COLONIZATION_TARGET_CITY && city?.country === COLONIZATION_TARGET_COUNTRY
  );
}

export function colonizationTargetCoordinates() {
  return Object.freeze({ lat: TARGET.lat, lon: TARGET.lon });
}

export function colonizationQuestView(
  state,
  { shipStats = null, currentMinute = 0, freeCargoUnits = null } = {}
) {
  const memory = colonizationQuestMemory(state);
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid colonization quest minute: ${currentMinute}`);
  }
  const fetchStage = memory.stage === COLONIZATION_STAGE_FETCH
    ? COLONIZATION_FETCH_STAGES[memory.fetchStageIndex]
    : null;
  const held = fetchStage ? state.cargo?.[fetchStage.goodId] || 0 : 0;
  const shipEligibility = shipStats
    ? colonizationShipEligibility(shipStats, freeCargoUnits)
    : null;
  return Object.freeze({
    ...memory,
    fetchStage,
    held,
    canDeliverFetch: Boolean(fetchStage && held >= fetchStage.quantity),
    shipEligibility,
    resupply: COLONIZATION_RESUPPLY,
    resupplyHeld: state.cargo?.[COLONIZATION_RESUPPLY.goodId] || 0,
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
  const stage = COLONIZATION_FETCH_STAGES[memory.fetchStageIndex];
  if (stage.id !== stageId) throw new Error(`Unexpected colonization material stage: ${stageId}`);
  return stage;
}

export function completeColonizationFetchStage(memory, stageId) {
  const stage = assertColonizationFetchDelivery(memory, stageId);
  memory.fetchStageIndex += 1;
  if (memory.fetchStageIndex === COLONIZATION_FETCH_STAGES.length) {
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
  return COLONIZATION_RESUPPLY;
}

export function establishColony(memory, currentMinute) {
  assertColonizationResupplyDelivery(memory, currentMinute);
  memory.stage = COLONIZATION_STAGE_ESTABLISHED;
  memory.establishedMinute = currentMinute;
  validateColonizationQuestMemory(memory);
  return memory;
}

export function colonizationWorldRecord(memory) {
  validateColonizationQuestMemory(memory);
  if (memory.targetTileId === null) throw new Error("Cannot build Port Royal without a target tile");
  if ([COLONIZATION_STAGE_FETCH, COLONIZATION_STAGE_READY].includes(memory.stage)) return null;
  const established = memory.stage === COLONIZATION_STAGE_ESTABLISHED;
  const failed = memory.stage === COLONIZATION_STAGE_FAILED;
  const outbound = memory.stage === COLONIZATION_STAGE_OUTBOUND;
  return {
    cityId: "port royal|canada",
    city: COLONIZATION_TARGET_CITY,
    displayCity: established
      ? COLONIZATION_TARGET_CITY
      : failed
        ? `${COLONIZATION_TARGET_CITY} Ruins`
        : outbound
          ? `${COLONIZATION_TARGET_CITY} Colony Site`
          : `${COLONIZATION_TARGET_CITY} Colony`,
    country: COLONIZATION_TARGET_COUNTRY,
    lat: TARGET.lat,
    lon: TARGET.lon,
    year: TARGET.canFoundFromYear,
    historicalFoundingYear: TARGET.year,
    population: established ? 2400 : failed ? 1 : 120,
    cityType: TARGET.cityType,
    settlementType: established ? "city" : "village",
    coastalIntent: true,
    lakeIntent: false,
    requiredTradePort: established,
    playerHomeExcluded: true,
    tileId: memory.targetTileId,
    portId: COLONIZATION_TARGET_PORT_ID,
    factionId: established ? TARGET.factionId : "neutral",
    foundingFactionId: TARGET.factionId,
    colonizationQuestSite: true,
    colonizationQuestStage: memory.stage,
    hiddenSettlement: outbound,
    colonyBurning: failed,
    playerFoundedColony: established,
    purchaseDiscountMultiplier: established ? COLONIZATION_FOUNDER_DISCOUNT_MULTIPLIER : 1
  };
}

export function colonizationObjective(memory) {
  validateColonizationQuestMemory(memory);
  if (memory.targetTileId === null) return null;
  if (memory.stage === COLONIZATION_STAGE_OUTBOUND) {
    return { tileId: memory.targetTileId, kind: "found-colony" };
  }
  if (memory.stage === COLONIZATION_STAGE_AWAITING_RESUPPLY && memory.leftSinceFounding) {
    return { tileId: memory.targetTileId, kind: "resupply-colony" };
  }
  return null;
}

function fetchStage(id, goodId, goodLabel, quantity, reward, purpose) {
  return Object.freeze({ id, goodId, goodLabel, quantity, reward, purpose });
}

function assertMinute(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid colonization minute: ${value}`);
}
