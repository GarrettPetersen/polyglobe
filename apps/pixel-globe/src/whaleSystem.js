import {
  WHITE_WHALE_ID,
  WHALE_LIFE_STAGE_ADOLESCENT,
  WHALE_LIFE_STAGE_ADULT,
  WHALE_LIFE_STAGE_CALF,
  WHALE_POPULATION_TARGET,
  WHALE_SPECIES,
  WHALE_SPECIES_SPERM,
  whaleRangeContains,
  whaleRangeContainsCandidate,
  whaleSpeciesById,
  whaleSpeciesForIndividual,
  vectorLatLon
} from "./whaleSpecies.js";
import { whaleHarpoonById } from "./whaleHarpoons.js";

export const WHALE_MEMORY_VERSION = 3;
export const WHALE_PHASE_SUBMERGED = "submerged";
export const WHALE_PHASE_RISING = "rising";
export const WHALE_PHASE_SURFACED = "surfaced";
export const WHALE_PHASE_DIVING = "diving";
export const WHALE_PHASE_TETHERED = "tethered";
export const WHALE_PHASE_EXHAUSTED = "exhausted";
export const WHALE_PHASE_DEAD = "dead";

export { WHALE_POPULATION_TARGET } from "./whaleSpecies.js";
export const NPC_WHALING_EQUILIBRIUM_RATIO = 0.72;
export const NPC_WHALING_MIN_LIVING_POPULATION = Math.ceil(
  (WHALE_POPULATION_TARGET - 1) * NPC_WHALING_EQUILIBRIUM_RATIO
);

const MINUTES_PER_DAY = 24 * 60;
const WHALE_RISING_SECONDS = 1.35;
const WHALE_SURFACED_SECONDS = 4.2;
const WHALE_DIVING_SECONDS = 1.8;
const WHALE_SUBMERGED_MIN_SECONDS = 17;
const WHALE_SUBMERGED_SPREAD_SECONDS = 31;
const WHALE_SEED = 0x5748414c;
const MATING_SEARCH_RADIUS_RAD = 0.22;
const FAMILY_FOLLOW_DISTANCE_RAD = 0.004;
const FAMILY_MAX_SEPARATION_RAD = 0.018;
const WHITE_WHALE_RESISTANCE_MULTIPLIER = 1.45;
const WHITE_WHALE_MIGRATION_TURN_MULTIPLIER = 1.8;
const WHITE_WHALE_MIGRATION_LATITUDE_MIN_DEG = 16;
const WHITE_WHALE_MIGRATION_LATITUDE_SPREAD_DEG = 34;
const WHALE_TETHER_HAUL_START_PROGRESS = 0.65;
const WHALE_TETHER_FINAL_LENGTH_SCALE = 0.36;
const WHALE_RAM_TRIGGER_PROGRESS = 0.28;
const WHALE_RAM_WARNING_SECONDS = 1.2;
const WHALE_ECOLOGY_INTERVAL_MINUTES = 6 * 60;
const whaleAdvanceValidationCache = new WeakMap();
const whaleIndexCache = new WeakMap();
const whaleMovementBucketCache = new WeakMap();
const whaleSimulationClockCache = new WeakMap();

const PHASES = new Set([
  WHALE_PHASE_SUBMERGED,
  WHALE_PHASE_RISING,
  WHALE_PHASE_SURFACED,
  WHALE_PHASE_DIVING,
  WHALE_PHASE_TETHERED,
  WHALE_PHASE_EXHAUSTED,
  WHALE_PHASE_DEAD
]);
const SEXES = new Set(["female", "male"]);
const LIFE_STAGES = new Set([
  WHALE_LIFE_STAGE_CALF,
  WHALE_LIFE_STAGE_ADOLESCENT,
  WHALE_LIFE_STAGE_ADULT
]);
const WHALE_RAM_STATES = new Set(["ineligible", "waiting", "warned", "complete"]);
const WHALE_HUNT_PROFILE_BY_LIFE_STAGE = Object.freeze({
  [WHALE_LIFE_STAGE_CALF]: Object.freeze({
    breakResistanceMultiplier: 0.35,
    exhaustionMultiplier: 0.3,
    towingSpeedMultiplier: 0.55,
    yieldMultiplier: 0.2
  }),
  [WHALE_LIFE_STAGE_ADOLESCENT]: Object.freeze({
    breakResistanceMultiplier: 0.7,
    exhaustionMultiplier: 0.7,
    towingSpeedMultiplier: 0.85,
    yieldMultiplier: 0.7
  }),
  [WHALE_LIFE_STAGE_ADULT]: Object.freeze({
    breakResistanceMultiplier: 1,
    exhaustionMultiplier: 1,
    towingSpeedMultiplier: 1,
    yieldMultiplier: 1
  })
});

export function createWhaleMemory() {
  return {
    version: WHALE_MEMORY_VERSION,
    nextId: 1,
    individuals: [],
    activeHunt: null,
    lastEcologyMinute: null
  };
}

export function migrateWhaleMemory(memory) {
  if (memory === undefined || memory === null) return createWhaleMemory();
  if (!memory || typeof memory !== "object") throw new Error("Whale memory migration requires an object");
  if (memory.version === WHALE_MEMORY_VERSION) return validateWhaleMemory(memory);
  if (memory.version !== 2) throw new Error(`Unsupported whale memory version: ${memory.version ?? "missing"}`);
  const migrated = {
    ...memory,
    version: WHALE_MEMORY_VERSION,
    activeHunt: memory.activeHunt ? migrateActiveWhaleHunt(memory) : null
  };
  return validateWhaleMemory(migrated);
}

function migrateActiveWhaleHunt(memory) {
  const hunt = memory.activeHunt;
  const whale = memory.individuals?.find((candidate) => candidate.id === hunt.whaleId);
  if (!whale) throw new Error("Active whale hunt references a missing individual during migration");
  const initialSeconds = whaleHuntDurationSeconds(whale, whaleHarpoonById(hunt.harpoonId));
  return {
    ...hunt,
    initialSeconds,
    ramState: whaleMayRamWhileTethered(whale) ? "waiting" : "ineligible",
    ramCountdownSeconds: null
  };
}

export function seedWhalePopulation(memory, candidates, count = WHALE_POPULATION_TARGET, {
  startMinute = 0,
  avoidPosition = null,
  seedKey = null
} = {}) {
  validateWhaleMemory(memory);
  if (!Array.isArray(candidates)) throw new Error("Whale population seeding requires candidate waters");
  if (!Number.isInteger(count) || count < 2) throw new Error(`Invalid whale population size: ${count}`);
  assertSimulationMinute(startMinute);
  if (avoidPosition !== null) validateVector(avoidPosition, "white whale avoidance position");
  if (seedKey !== null && (typeof seedKey !== "string" || seedKey.trim() === "")) {
    throw new Error("Whale population seed must be null or a non-empty string");
  }
  if (memory.individuals.length > 0) return memory.individuals;

  const waters = candidates.map(validateCandidate);
  const seedSalt = seedKey === null ? 0 : hashString(seedKey);
  const allocation = populationAllocation(count - 1);
  for (const species of WHALE_SPECIES) {
    seedSpeciesPopulation(memory, species, waters, allocation.get(species.id), startMinute, seedSalt);
  }
  seedWhiteWhale(memory, waters, startMinute, avoidPosition, seedSalt);
  if (memory.individuals.length !== count) {
    throw new Error(`Whale population seeded ${memory.individuals.length}, expected ${count}`);
  }
  memory.lastEcologyMinute = startMinute;
  validateWhaleMemory(memory);
  return memory.individuals;
}

export function validateWhaleMemory(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== WHALE_MEMORY_VERSION) {
    throw new Error(`Unsupported whale memory version: ${memory?.version ?? "missing"}`);
  }
  if (!Number.isInteger(memory.nextId) || memory.nextId <= 0) {
    throw new Error(`Invalid next whale id: ${memory.nextId}`);
  }
  if (!Array.isArray(memory.individuals)) throw new Error("Whale memory requires individuals");
  if (memory.lastEcologyMinute !== null) assertSimulationMinute(memory.lastEcologyMinute);
  const ids = new Set();
  const individualsById = new Map();
  for (const whale of memory.individuals) {
    validateWhale(whale);
    if (ids.has(whale.id)) throw new Error(`Duplicate whale id: ${whale.id}`);
    ids.add(whale.id);
    individualsById.set(whale.id, whale);
  }
  for (const whale of memory.individuals) {
    if (whale.motherId === null) continue;
    const mother = individualsById.get(whale.motherId);
    if (!mother) throw new Error(`${whale.id} references missing mother ${whale.motherId}`);
    if (mother.sex !== "female" || mother.speciesId !== whale.speciesId) {
      throw new Error(`${whale.id} has an invalid mother ${whale.motherId}`);
    }
  }
  if (memory.activeHunt !== null) {
    const hunt = memory.activeHunt;
    if (!hunt || typeof hunt !== "object" || !ids.has(hunt.whaleId)) {
      throw new Error("Active whale hunt references a missing individual");
    }
    if (!Number.isFinite(hunt.remainingSeconds) || hunt.remainingSeconds < 0) {
      throw new Error(`Invalid whale hunt time: ${hunt.remainingSeconds}`);
    }
    if (typeof hunt.harpoonId !== "string" || hunt.harpoonId.length === 0) {
      throw new Error("Active whale hunt requires harpoon equipment");
    }
    if (!Number.isFinite(hunt.initialSeconds) || hunt.initialSeconds <= 0 ||
        hunt.remainingSeconds > hunt.initialSeconds + 1e-9) {
      throw new Error(`Invalid initial whale hunt time: ${hunt.initialSeconds}`);
    }
    if (!WHALE_RAM_STATES.has(hunt.ramState)) {
      throw new Error(`Invalid whale ram state: ${hunt.ramState}`);
    }
    const whale = individualsById.get(hunt.whaleId);
    const eligible = whaleMayRamWhileTethered(whale);
    if (eligible === (hunt.ramState === "ineligible")) {
      throw new Error(`Whale ram eligibility does not match ${hunt.ramState}: ${hunt.whaleId}`);
    }
    if (hunt.ramState === "warned") {
      if (!Number.isFinite(hunt.ramCountdownSeconds) || hunt.ramCountdownSeconds < 0) {
        throw new Error(`Invalid whale ram countdown: ${hunt.ramCountdownSeconds}`);
      }
    } else if (hunt.ramCountdownSeconds !== null) {
      throw new Error(`Whale ram countdown must be null while ${hunt.ramState}`);
    }
  }
  return memory;
}

export function advanceWhaleMemory(
  memory,
  dt,
  navigationAtPosition,
  currentMinute,
  movementSchedule = null
) {
  validateWhaleMemoryForAdvance(memory);
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid whale simulation step: ${dt}`);
  if (typeof navigationAtPosition !== "function") {
    throw new Error("Whale simulation requires an ocean navigation resolver");
  }
  assertSimulationMinute(currentMinute);
  const schedule = validateWhaleMovementSchedule(movementSchedule);
  const events = advanceWhaleEcology(memory, currentMinute);
  const individualsById = whaleIndex(memory);
  const movementClock = whaleSimulationClock(memory);
  movementClock.elapsedSeconds += dt;
  const dueWhales = new Map(
    whaleMovementBucket(memory, schedule.bucketCount, schedule.bucket)
      .map((whale) => [whale.id, whale])
  );
  for (const whaleId of schedule.activeWhaleIds) {
    const whale = individualsById.get(whaleId);
    if (!whale) throw new Error(`Active whale movement references missing individual: ${whaleId}`);
    dueWhales.set(whale.id, whale);
  }
  for (const whale of dueWhales.values()) {
    if (whale.phase === WHALE_PHASE_DEAD || whale.phase === WHALE_PHASE_EXHAUSTED) continue;
    const lastMovementSeconds = movementClock.lastMovementSeconds.get(whale.id);
    if (!Number.isFinite(lastMovementSeconds)) {
      throw new Error(`Whale movement clock is missing individual: ${whale.id}`);
    }
    const movementDebt = movementClock.elapsedSeconds - lastMovementSeconds;
    movementClock.lastMovementSeconds.set(whale.id, movementClock.elapsedSeconds);
    whale.lifeSeconds += movementDebt;
    whale.phaseElapsedSeconds += movementDebt;
    if (whale.phase === WHALE_PHASE_TETHERED) {
      const currentNavigation = requireWhaleNavigation(navigationAtPosition(whale.position));
      if (!currentNavigation.canSurface) breakWhaleTetherUnderIce(memory, whale, events);
    }
    const navigation = advanceWhaleMovement(
      whale,
      movementDebt,
      navigationAtPosition,
      individualsById,
      currentMinute
    );
    if (whale.phase === WHALE_PHASE_TETHERED && !navigation.canSurface) {
      breakWhaleTetherUnderIce(memory, whale, events);
    }
    if (whale.phase === WHALE_PHASE_TETHERED) continue;
    advanceWhalePhase(whale, events, navigation.canSurface);
  }

  const hunt = memory.activeHunt;
  if (hunt) {
    const whale = whaleById(memory, hunt.whaleId);
    if (whale.phase === WHALE_PHASE_TETHERED) {
      advanceTetheredWhaleRam(hunt, whale, dt, events);
      hunt.remainingSeconds = Math.max(0, hunt.remainingSeconds - dt);
      if (hunt.remainingSeconds === 0) {
        markWhaleExhausted(whale, hunt);
        events.push(Object.freeze({ type: "exhausted", whaleId: whale.id }));
      }
    }
  }
  return events;
}

function advanceTetheredWhaleRam(hunt, whale, dt, events) {
  if (hunt.ramState === "ineligible" || hunt.ramState === "complete") return;
  if (hunt.ramState === "waiting") {
    const progress = 1 - hunt.remainingSeconds / hunt.initialSeconds;
    if (progress < WHALE_RAM_TRIGGER_PROGRESS) return;
    hunt.ramState = "warned";
    hunt.ramCountdownSeconds = WHALE_RAM_WARNING_SECONDS;
    events.push(Object.freeze({ type: "ram-warning", whaleId: whale.id }));
    return;
  }
  if (hunt.ramState !== "warned") throw new Error(`Cannot advance whale ram state: ${hunt.ramState}`);
  hunt.ramCountdownSeconds = Math.max(0, hunt.ramCountdownSeconds - dt);
  if (hunt.ramCountdownSeconds > 0) return;
  hunt.ramState = "complete";
  hunt.ramCountdownSeconds = null;
  events.push(Object.freeze({ type: "ram-impact", whaleId: whale.id }));
}

function validateWhaleMovementSchedule(schedule) {
  if (schedule === null) return { bucket: 0, bucketCount: 1, activeWhaleIds: [] };
  if (!schedule || typeof schedule !== "object") {
    throw new Error("Whale movement schedule must be an object");
  }
  const { bucket, bucketCount, activeWhaleIds = [] } = schedule;
  if (!Number.isInteger(bucketCount) || bucketCount <= 0) {
    throw new Error(`Invalid whale movement bucket count: ${bucketCount}`);
  }
  if (!Number.isInteger(bucket) || bucket < 0 || bucket >= bucketCount) {
    throw new Error(`Invalid whale movement bucket: ${bucket}/${bucketCount}`);
  }
  if (!Array.isArray(activeWhaleIds) ||
      new Set(activeWhaleIds).size !== activeWhaleIds.length ||
      activeWhaleIds.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new Error("Whale movement active ids must be unique non-empty strings");
  }
  return { bucket, bucketCount, activeWhaleIds };
}

function whaleIndex(memory) {
  const cached = whaleIndexCache.get(memory);
  if (cached &&
      cached.individuals === memory.individuals &&
      cached.individualCount === memory.individuals.length &&
      cached.nextId === memory.nextId) {
    return cached.byId;
  }
  const byId = new Map();
  for (const whale of memory.individuals) {
    if (byId.has(whale.id)) throw new Error(`Duplicate whale id: ${whale.id}`);
    byId.set(whale.id, whale);
  }
  whaleIndexCache.set(memory, {
    individuals: memory.individuals,
    individualCount: memory.individuals.length,
    nextId: memory.nextId,
    byId
  });
  return byId;
}

function whaleMovementBucket(memory, bucketCount, bucket) {
  let cacheByBucketCount = whaleMovementBucketCache.get(memory);
  if (!cacheByBucketCount) {
    cacheByBucketCount = new Map();
    whaleMovementBucketCache.set(memory, cacheByBucketCount);
  }
  let cached = cacheByBucketCount.get(bucketCount);
  if (!cached ||
      cached.individuals !== memory.individuals ||
      cached.individualCount !== memory.individuals.length ||
      cached.nextId !== memory.nextId) {
    const buckets = Array.from({ length: bucketCount }, () => []);
    for (const whale of memory.individuals) {
      buckets[(whale.seed >>> 0) % bucketCount].push(whale);
    }
    cached = {
      individuals: memory.individuals,
      individualCount: memory.individuals.length,
      nextId: memory.nextId,
      buckets
    };
    cacheByBucketCount.set(bucketCount, cached);
  }
  return cached.buckets[bucket];
}

function whaleSimulationClock(memory) {
  let clock = whaleSimulationClockCache.get(memory);
  if (!clock) {
    clock = {
      elapsedSeconds: 0,
      individuals: memory.individuals,
      individualCount: memory.individuals.length,
      nextId: memory.nextId,
      lastMovementSeconds: new Map(memory.individuals.map((whale) => [whale.id, 0]))
    };
    whaleSimulationClockCache.set(memory, clock);
  } else if (
    clock.individuals !== memory.individuals ||
    clock.individualCount !== memory.individuals.length ||
    clock.nextId !== memory.nextId
  ) {
    for (const whale of memory.individuals) {
      if (!clock.lastMovementSeconds.has(whale.id)) {
        clock.lastMovementSeconds.set(whale.id, clock.elapsedSeconds);
      }
    }
    clock.individuals = memory.individuals;
    clock.individualCount = memory.individuals.length;
    clock.nextId = memory.nextId;
  }
  return clock;
}

function validateWhaleMemoryForAdvance(memory) {
  if (!memory || typeof memory !== "object") {
    validateWhaleMemory(memory);
    return;
  }
  const signature = whaleAdvanceValidationCache.get(memory);
  if (
    signature?.version === memory.version &&
    signature?.nextId === memory.nextId &&
    signature?.individuals === memory.individuals &&
    signature?.individualCount === memory.individuals?.length &&
    signature?.activeHunt === memory.activeHunt
  ) {
    if (memory.lastEcologyMinute !== null) assertSimulationMinute(memory.lastEcologyMinute);
    return;
  }
  validateWhaleMemory(memory);
  whaleAdvanceValidationCache.set(memory, {
    version: memory.version,
    nextId: memory.nextId,
    individuals: memory.individuals,
    individualCount: memory.individuals.length,
    activeHunt: memory.activeHunt
  });
}

export function exhaustTetheredWhale(memory) {
  validateWhaleMemory(memory);
  if (!memory.activeHunt) throw new Error("No whale hunt is active");
  const whale = whaleById(memory, memory.activeHunt.whaleId);
  if (whale.phase !== WHALE_PHASE_TETHERED) {
    throw new Error(`Whale is not tethered: ${whale.id}`);
  }
  markWhaleExhausted(whale, memory.activeHunt);
  return whale;
}

function markWhaleExhausted(whale, hunt) {
  hunt.remainingSeconds = 0;
  whale.phase = WHALE_PHASE_EXHAUSTED;
  whale.phaseElapsedSeconds = 0;
  whale.phaseDurationSeconds = 0;
}

export function tetherWhale(memory, whaleId, harpoon) {
  validateWhaleMemory(memory);
  if (memory.activeHunt) throw new Error(`A whale hunt is already active: ${memory.activeHunt.whaleId}`);
  const whale = whaleById(memory, whaleId);
  if (!whaleCanBeHarpooned(whale)) throw new Error(`Whale is not exposed for a harpoon: ${whale.id}`);
  if (!harpoon || typeof harpoon.id !== "string" || !Number.isFinite(harpoon.exhaustionSeconds)) {
    throw new Error("Tethering a whale requires valid harpoon equipment");
  }
  whale.phase = WHALE_PHASE_TETHERED;
  whale.phaseElapsedSeconds = 0;
  whale.phaseDurationSeconds = 0;
  const initialSeconds = whaleHuntDurationSeconds(whale, harpoon);
  memory.activeHunt = {
    whaleId: whale.id,
    harpoonId: harpoon.id,
    remainingSeconds: initialSeconds,
    initialSeconds,
    ramState: whaleMayRamWhileTethered(whale) ? "waiting" : "ineligible",
    ramCountdownSeconds: null
  };
  return whale;
}

export function whaleMayRamWhileTethered(whale) {
  validateWhale(whale);
  return whale.speciesId === WHALE_SPECIES_SPERM && whale.lifeStage !== WHALE_LIFE_STAGE_CALF;
}

export function whaleTetherLengthScale(whale, hunt) {
  validateWhale(whale);
  if (!hunt || hunt.whaleId !== whale.id || !Number.isFinite(hunt.remainingSeconds) || hunt.remainingSeconds < 0) {
    throw new Error(`Invalid tether state for whale: ${whale.id}`);
  }
  const totalSeconds = whaleHuntDurationSeconds(whale, whaleHarpoonById(hunt.harpoonId));
  if (hunt.remainingSeconds > totalSeconds + 1e-9) {
    throw new Error(`Whale hunt time exceeds its initial duration: ${whale.id}`);
  }
  const chaseProgress = 1 - hunt.remainingSeconds / totalSeconds;
  const haulProgress = smootherstep(
    (chaseProgress - WHALE_TETHER_HAUL_START_PROGRESS) / (1 - WHALE_TETHER_HAUL_START_PROGRESS)
  );
  return 1 - haulProgress * (1 - WHALE_TETHER_FINAL_LENGTH_SCALE);
}

export function constrainWhaleTether(whale, anchorPosition, maximumDistanceRad, navigationAtPosition) {
  validateWhale(whale);
  validateVector(anchorPosition, "whale tether anchor");
  if (whale.phase !== WHALE_PHASE_TETHERED && whale.phase !== WHALE_PHASE_EXHAUSTED) {
    throw new Error(`Cannot constrain an untethered whale: ${whale.id}`);
  }
  if (!Number.isFinite(maximumDistanceRad) || maximumDistanceRad <= 0 || maximumDistanceRad >= Math.PI) {
    throw new Error(`Invalid whale tether distance: ${maximumDistanceRad}`);
  }
  if (typeof navigationAtPosition !== "function") {
    throw new Error("Whale tether requires an ocean navigation resolver");
  }

  const distance = angularDistance(anchorPosition, whale.position);
  if (distance <= maximumDistanceRad) return false;
  const towardWhale = normalizeTangentOrNull(whale.position, anchorPosition);
  if (!towardWhale) throw new Error(`Whale tether has no direction: ${whale.id}`);

  const searchSteps = 16;
  for (let step = searchSteps; step >= 0; step--) {
    const constrainedDistance = maximumDistanceRad * step / searchSteps;
    const candidatePosition = normalize([
      anchorPosition[0] * Math.cos(constrainedDistance) + towardWhale[0] * Math.sin(constrainedDistance),
      anchorPosition[1] * Math.cos(constrainedDistance) + towardWhale[1] * Math.sin(constrainedDistance),
      anchorPosition[2] * Math.cos(constrainedDistance) + towardWhale[2] * Math.sin(constrainedDistance)
    ]);
    const navigation = requireWhaleNavigation(navigationAtPosition(candidatePosition));
    if (!navigation.ok || !navigation.canSurface) continue;
    whale.position = candidatePosition;
    whale.tileId = navigation.tileId;
    whale.heading = normalizeTangent(whale.heading, whale.position);
    return true;
  }
  throw new Error(`Whale tether could not find ocean between ${whale.id} and the player ship`);
}

export function cutWhaleLoose(memory) {
  validateWhaleMemory(memory);
  if (!memory.activeHunt) throw new Error("No whale is tethered");
  const whale = whaleById(memory, memory.activeHunt.whaleId);
  releaseWhale(whale);
  memory.activeHunt = null;
  return whale;
}

export function killExhaustedWhale(memory) {
  validateWhaleMemory(memory);
  if (!memory.activeHunt) throw new Error("No whale hunt is active");
  const whale = whaleById(memory, memory.activeHunt.whaleId);
  if (whale.phase !== WHALE_PHASE_EXHAUSTED) throw new Error(`Whale is not exhausted: ${whale.id}`);
  killWhale(memory, whale);
  memory.activeHunt = null;
  return whale;
}

export function harvestWhaleForNpc(memory, position, {
  maxDistanceRad,
  minimumLivingPopulation = NPC_WHALING_MIN_LIVING_POPULATION,
  protectSpeciesEquilibrium = false
}) {
  validateWhaleMemory(memory);
  validateVector(position, "NPC whaling position");
  if (!Number.isFinite(maxDistanceRad) || maxDistanceRad <= 0 || maxDistanceRad > Math.PI) {
    throw new Error(`Invalid NPC whaling range: ${maxDistanceRad}`);
  }
  if (!Number.isInteger(minimumLivingPopulation) || minimumLivingPopulation < 0) {
    throw new Error(`Invalid NPC whale population floor: ${minimumLivingPopulation}`);
  }

  const living = memory.individuals.filter((whale) => whale.phase !== WHALE_PHASE_DEAD);
  if (living.length <= minimumLivingPopulation) {
    return Object.freeze({ outcome: "protected-population", whale: null, livingPopulation: living.length });
  }

  const activeWhaleId = memory.activeHunt?.whaleId || null;
  const dependentMotherIds = new Set(living
    .filter((whale) => whale.lifeStage === WHALE_LIFE_STAGE_CALF && whale.motherId !== null)
    .map((whale) => whale.motherId));
  const livingBySpecies = protectSpeciesEquilibrium
    ? whaleLivingPopulationBySpecies(living)
    : null;
  const candidates = living
    .filter((whale) => whale.id !== activeWhaleId && whale.id !== WHITE_WHALE_ID)
    .filter((whale) => whale.lifeStage !== WHALE_LIFE_STAGE_CALF && !dependentMotherIds.has(whale.id))
    .filter((whale) => whale.phase !== WHALE_PHASE_TETHERED && whale.phase !== WHALE_PHASE_EXHAUSTED)
    .filter((whale) => !protectSpeciesEquilibrium || (
      livingBySpecies.get(whale.speciesId) > npcWhalingSpeciesFloor(whale.speciesId)
    ))
    .map((whale) => ({
      whale,
      distanceRad: angularDistance(position, whale.position)
    }))
    .filter((candidate) => candidate.distanceRad <= maxDistanceRad)
    .sort((a, b) => a.distanceRad - b.distanceRad || a.whale.id.localeCompare(b.whale.id));
  if (candidates.length === 0) {
    return Object.freeze({ outcome: "no-whale-in-range", whale: null, livingPopulation: living.length });
  }

  const whale = candidates[0].whale;
  killWhale(memory, whale);
  return Object.freeze({ outcome: "caught", whale, livingPopulation: living.length - 1 });
}

export function npcWhalingCooldownMinutes(memory) {
  validateWhaleMemory(memory);
  const ordinaryLiving = memory.individuals.filter((whale) => (
    whale.id !== WHITE_WHALE_ID && whale.phase !== WHALE_PHASE_DEAD
  )).length;
  const target = WHALE_POPULATION_TARGET - 1;
  const ratio = ordinaryLiving / target;
  if (ratio <= NPC_WHALING_EQUILIBRIUM_RATIO) return Number.POSITIVE_INFINITY;
  const pressure = clamp(
    (ratio - NPC_WHALING_EQUILIBRIUM_RATIO) / (1 - NPC_WHALING_EQUILIBRIUM_RATIO),
    0,
    1
  );
  const days = 95 - pressure * 71;
  return Math.round(days * MINUTES_PER_DAY);
}

function whaleLivingPopulationBySpecies(living) {
  const counts = new Map(WHALE_SPECIES.map((species) => [species.id, 0]));
  for (const whale of living) {
    if (whale.id === WHITE_WHALE_ID) continue;
    counts.set(whale.speciesId, (counts.get(whale.speciesId) || 0) + 1);
  }
  return counts;
}

function npcWhalingSpeciesFloor(speciesId) {
  return Math.ceil(whaleSpeciesById(speciesId).population * NPC_WHALING_EQUILIBRIUM_RATIO);
}

export function whaleById(memory, whaleId) {
  const whale = whaleIndex(memory).get(whaleId);
  if (!whale) throw new Error(`Unknown whale: ${whaleId}`);
  return whale;
}

export function livingWhaleCountForSpecies(memory, speciesId) {
  validateWhaleMemory(memory);
  whaleSpeciesById(speciesId);
  return memory.individuals.reduce((count, whale) => (
    whale.speciesId === speciesId && whale.phase !== WHALE_PHASE_DEAD
      ? count + 1
      : count
  ), 0);
}

export function whiteWhale(memory) {
  return whaleById(memory, WHITE_WHALE_ID);
}

export function whaleCanBeHarpooned(whale) {
  validateWhale(whale);
  return whale.phase === WHALE_PHASE_RISING || whale.phase === WHALE_PHASE_SURFACED;
}

export function whaleSurfaceExposure(whale) {
  validateWhale(whale);
  if (whale.phase === WHALE_PHASE_SUBMERGED || whale.phase === WHALE_PHASE_DEAD) return 0;
  if (whale.phase === WHALE_PHASE_RISING) {
    return smootherstep(whale.phaseElapsedSeconds / whale.phaseDurationSeconds);
  }
  if (whale.phase === WHALE_PHASE_DIVING) {
    return 1 - smootherstep(whale.phaseElapsedSeconds / whale.phaseDurationSeconds);
  }
  return 1;
}

export function whaleTowingSpeed(whale) {
  validateWhale(whale);
  return whaleSpeciesForIndividual(whale).towingSpeedRad * whaleHuntProfile(whale).towingSpeedMultiplier;
}

export function whaleHarpoonBreakMultiplier(whale) {
  validateWhale(whale);
  return whaleSpeciesForIndividual(whale).harpoonBreakMultiplier *
    (whale.id === WHITE_WHALE_ID ? WHITE_WHALE_RESISTANCE_MULTIPLIER : 1) *
    whaleHuntProfile(whale).breakResistanceMultiplier;
}

export function whaleBlubberYield(whale) {
  validateWhale(whale);
  const base = whaleSpeciesForIndividual(whale).blubberYield;
  return Math.max(1, Math.round(
    base * whaleHuntProfile(whale).yieldMultiplier * (whale.id === WHITE_WHALE_ID ? 1.25 : 1)
  ));
}

function whaleHuntProfile(whale) {
  const profile = WHALE_HUNT_PROFILE_BY_LIFE_STAGE[whale.lifeStage];
  if (!profile) throw new Error(`Missing whale hunt profile for life stage: ${whale.lifeStage}`);
  return profile;
}

function whaleHuntDurationSeconds(whale, harpoon) {
  if (!harpoon || typeof harpoon.id !== "string" || !Number.isFinite(harpoon.exhaustionSeconds)) {
    throw new Error("Whale hunt duration requires valid harpoon equipment");
  }
  return harpoon.exhaustionSeconds *
    whaleSpeciesForIndividual(whale).exhaustionMultiplier *
    (whale.id === WHITE_WHALE_ID ? WHITE_WHALE_RESISTANCE_MULTIPLIER : 1) *
    whaleHuntProfile(whale).exhaustionMultiplier;
}

export function underwaterWhaleSongPresence(whale, distancePx, nearPx, farPx) {
  validateWhale(whale);
  if (!Number.isFinite(distancePx) || distancePx < 0) {
    throw new Error(`Invalid whale-song distance: ${distancePx}`);
  }
  if (!Number.isFinite(nearPx) || !Number.isFinite(farPx) || nearPx < 0 || farPx <= nearPx) {
    throw new Error(`Invalid whale-song range: ${nearPx}-${farPx}`);
  }
  if ([WHALE_PHASE_TETHERED, WHALE_PHASE_EXHAUSTED, WHALE_PHASE_DEAD].includes(whale.phase)) return 0;
  const distancePresence = clamp((farPx - distancePx) / (farPx - nearPx), 0, 1);
  const submergedPresence = 1 - whaleSurfaceExposure(whale);
  return distancePresence * submergedPresence * submergedPresence;
}

function populationAllocation(ordinaryCount) {
  const productionOrdinaryCount = WHALE_POPULATION_TARGET - 1;
  const allocation = new Map();
  let assigned = 0;
  const ranked = [];
  for (const species of WHALE_SPECIES) {
    const exact = ordinaryCount * species.population / productionOrdinaryCount;
    const count = Math.floor(exact);
    allocation.set(species.id, count);
    assigned += count;
    ranked.push({ speciesId: species.id, remainder: exact - count });
  }
  ranked.sort((a, b) => b.remainder - a.remainder || a.speciesId.localeCompare(b.speciesId));
  for (let index = 0; assigned < ordinaryCount; index++, assigned++) {
    const speciesId = ranked[index % ranked.length].speciesId;
    allocation.set(speciesId, allocation.get(speciesId) + 1);
  }
  return allocation;
}

function seedSpeciesPopulation(memory, species, waters, count, startMinute, seedSalt) {
  if (count === 0) return;
  const eligible = waters
    .filter((candidate) => whaleRangeContainsCandidate(species.id, candidate))
    .sort((a, b) => (
      hashInt(a.tileId ^ hashString(species.id) ^ seedSalt) -
      hashInt(b.tileId ^ hashString(species.id) ^ seedSalt)
    ));
  if (eligible.length < count) {
    throw new Error(`${species.label} population needs ${count} range-valid ocean tiles, got ${eligible.length}`);
  }
  const adultCount = Math.min(count, Math.max(2, Math.floor(count * 0.72)));
  const adults = [];
  const stride = eligible.length / adultCount;
  for (let index = 0; index < adultCount; index++) {
    const candidate = eligible[Math.floor(index * stride)];
    const idNumber = memory.nextId++;
    const seed = hashInt(candidate.tileId ^ Math.imul(idNumber, 0x9e3779b1) ^ seedSalt);
    const sex = index % 2 === 0 ? "female" : "male";
    const startsPregnant = sex === "female" && unit(seed ^ 0x50524547) < 0.22;
    const ageDays = species.maturityDays + 365 + unit(seed ^ 0x414745) * 20 * 365;
    const whale = createWhaleIndividual({
      id: numberedWhaleId(idNumber),
      speciesId: species.id,
      candidate,
      seed,
      sex,
      lifeStage: WHALE_LIFE_STAGE_ADULT,
      birthMinute: startMinute - ageDays * MINUTES_PER_DAY,
      motherId: null,
      nextMatingMinute: sex === "female" && !startsPregnant
        ? startMinute + (30 + unit(seed ^ 0x4d415445) * species.calvingIntervalDays) * MINUTES_PER_DAY
        : null
    });
    if (startsPregnant) {
      whale.pregnancyDueMinute = startMinute +
        (10 + unit(seed ^ 0x445545) * (species.gestationDays - 10)) * MINUTES_PER_DAY;
    }
    memory.individuals.push(whale);
    adults.push(whale);
  }

  const mothers = adults.filter((whale) => whale.sex === "female");
  for (let index = adultCount; index < count; index++) {
    const mother = mothers[(index - adultCount) % mothers.length];
    const idNumber = memory.nextId++;
    const seed = hashInt(mother.seed ^ Math.imul(idNumber, 0x85ebca6b));
    const calf = (index - adultCount) % 3 !== 2;
    const ageDays = calf
      ? 10 + unit(seed ^ 0x594f554e) * Math.max(20, species.weaningDays * 0.9)
      : species.weaningDays + unit(seed ^ 0x41444f4c) * Math.max(30, species.maturityDays - species.weaningDays - 30);
    const lifeStage = calf ? WHALE_LIFE_STAGE_CALF : WHALE_LIFE_STAGE_ADOLESCENT;
    const candidate = familyCandidate(mother, seed, FAMILY_FOLLOW_DISTANCE_RAD);
    memory.individuals.push(createWhaleIndividual({
      id: numberedWhaleId(idNumber),
      speciesId: species.id,
      candidate,
      seed,
      sex: unit(seed ^ 0x534558) < 0.5 ? "female" : "male",
      lifeStage,
      birthMinute: startMinute - ageDays * MINUTES_PER_DAY,
      motherId: mother.id,
      nextMatingMinute: null,
      heading: mother.heading
    }));
  }
}

function seedWhiteWhale(memory, waters, startMinute, avoidPosition, seedSalt) {
  const eligible = waters.filter((candidate) => whaleRangeContainsCandidate(WHALE_SPECIES_SPERM, candidate));
  if (eligible.length === 0) throw new Error("White whale has no range-valid ocean tile");
  const distantCandidates = avoidPosition && seedSalt !== 0
    ? [...eligible]
      .sort((a, b) => angularDistance(avoidPosition, b.position) - angularDistance(avoidPosition, a.position))
      .slice(0, Math.max(8, Math.ceil(eligible.length * 0.08)))
    : eligible;
  const candidate = [...distantCandidates].sort((a, b) => {
    if (avoidPosition && seedSalt === 0) {
      const distanceDifference = angularDistance(avoidPosition, b.position) - angularDistance(avoidPosition, a.position);
      if (Math.abs(distanceDifference) > 1e-9) return distanceDifference;
    }
    return hashInt(a.tileId ^ 0x4d4f4259 ^ seedSalt) - hashInt(b.tileId ^ 0x4d4f4259 ^ seedSalt);
  })[0];
  whaleSpeciesById(WHALE_SPECIES_SPERM);
  const seed = hashInt(candidate.tileId ^ 0x57484954 ^ seedSalt);
  memory.individuals.push(createWhaleIndividual({
    id: WHITE_WHALE_ID,
    speciesId: WHALE_SPECIES_SPERM,
    candidate,
    seed,
    sex: "male",
    lifeStage: WHALE_LIFE_STAGE_ADULT,
    birthMinute: startMinute - (30 * 365 + unit(seed) * 25 * 365) * MINUTES_PER_DAY,
    motherId: null,
    nextMatingMinute: null,
    variant: "white"
  }));
}

function createWhaleIndividual({
  id,
  speciesId,
  candidate,
  seed,
  sex,
  lifeStage,
  birthMinute,
  motherId,
  nextMatingMinute,
  heading = null,
  variant = null
}) {
  const position = candidate.position.slice();
  const initialHeading = heading ? normalizeTangent(heading, position) : randomTangent(position, seed);
  const phaseDurationSeconds = submergedDuration(seed, 0, speciesId);
  return {
    id,
    speciesId,
    variant,
    seed,
    sex,
    lifeStage,
    birthMinute,
    motherId,
    pregnancyDueMinute: null,
    mateId: null,
    lastCalvingMinute: null,
    nextMatingMinute,
    tileId: candidate.tileId,
    position,
    heading: initialHeading,
    lifeSeconds: unit(seed ^ 0x4c494645) * 90,
    phase: WHALE_PHASE_SUBMERGED,
    phaseElapsedSeconds: unit(seed ^ 0x454c4150) * phaseDurationSeconds,
    phaseDurationSeconds,
    cycle: 0
  };
}

function advanceWhaleEcology(memory, currentMinute) {
  if (memory.lastEcologyMinute === null) {
    memory.lastEcologyMinute = currentMinute;
    return [];
  }
  if (currentMinute < memory.lastEcologyMinute) {
    throw new Error(`Whale ecology cannot move backwards: ${currentMinute} < ${memory.lastEcologyMinute}`);
  }
  if (currentMinute < memory.lastEcologyMinute + WHALE_ECOLOGY_INTERVAL_MINUTES) return [];
  const events = [];
  updateLifeStages(memory, currentMinute);
  const adultFemales = [];
  const adultMalesBySpecies = new Map();
  for (const whale of memory.individuals) {
    if (whale.phase === WHALE_PHASE_DEAD || whale.lifeStage !== WHALE_LIFE_STAGE_ADULT) continue;
    if (whale.sex === "female") {
      adultFemales.push(whale);
      continue;
    }
    let males = adultMalesBySpecies.get(whale.speciesId);
    if (!males) {
      males = [];
      adultMalesBySpecies.set(whale.speciesId, males);
    }
    males.push(whale);
  }
  for (const female of adultFemales) {
    const species = whaleSpeciesForIndividual(female);
    if (female.pregnancyDueMinute !== null && female.pregnancyDueMinute <= currentMinute) {
      const calf = giveBirth(memory, female, female.pregnancyDueMinute);
      events.push(Object.freeze({ type: "birth", whaleId: calf.id, motherId: female.id }));
      female.lastCalvingMinute = female.pregnancyDueMinute;
      female.pregnancyDueMinute = null;
      female.mateId = null;
      female.nextMatingMinute = currentMinute +
        Math.max(30, species.calvingIntervalDays - species.gestationDays) * MINUTES_PER_DAY;
      continue;
    }
    if (female.pregnancyDueMinute !== null || female.nextMatingMinute === null ||
      female.nextMatingMinute > currentMinute) continue;
    const mate = nearestMate(female, adultMalesBySpecies.get(female.speciesId) || []);
    if (!mate) {
      female.nextMatingMinute = currentMinute + 30 * MINUTES_PER_DAY;
      continue;
    }
    female.mateId = mate.id;
    female.pregnancyDueMinute = currentMinute + species.gestationDays * MINUTES_PER_DAY;
    female.nextMatingMinute = null;
  }
  memory.lastEcologyMinute = currentMinute;
  return events;
}

function updateLifeStages(memory, currentMinute) {
  for (const whale of memory.individuals) {
    if (whale.phase === WHALE_PHASE_DEAD || whale.lifeStage === WHALE_LIFE_STAGE_ADULT) continue;
    const species = whaleSpeciesForIndividual(whale);
    const ageDays = (currentMinute - whale.birthMinute) / MINUTES_PER_DAY;
    if (ageDays >= species.maturityDays) {
      whale.lifeStage = WHALE_LIFE_STAGE_ADULT;
      whale.motherId = null;
      if (whale.sex === "female") {
        whale.nextMatingMinute = currentMinute +
          (30 + unit(whale.seed ^ 0x4d415445) * species.calvingIntervalDays) * MINUTES_PER_DAY;
      }
    } else if (ageDays >= species.weaningDays) {
      whale.lifeStage = WHALE_LIFE_STAGE_ADOLESCENT;
    }
  }
}

function nearestMate(female, malesOfSpecies) {
  let best = null;
  let bestDot = Math.cos(MATING_SEARCH_RADIUS_RAD);
  for (const candidate of malesOfSpecies) {
    const positionDot = dot(female.position, candidate.position);
    if (positionDot >= bestDot) {
      best = candidate;
      bestDot = positionDot;
    }
  }
  return best;
}

function giveBirth(memory, mother, birthMinute) {
  const idNumber = memory.nextId++;
  const seed = hashInt(mother.seed ^ Math.imul(idNumber, 0x27d4eb2d));
  const candidate = familyCandidate(mother, seed, FAMILY_FOLLOW_DISTANCE_RAD * 0.5);
  const calf = createWhaleIndividual({
    id: numberedWhaleId(idNumber),
    speciesId: mother.speciesId,
    candidate,
    seed,
    sex: unit(seed ^ 0x534558) < 0.5 ? "female" : "male",
    lifeStage: WHALE_LIFE_STAGE_CALF,
    birthMinute,
    motherId: mother.id,
    nextMatingMinute: null,
    heading: mother.heading
  });
  memory.individuals.push(calf);
  return calf;
}

function advanceWhaleMovement(whale, dt, navigationAtPosition, individualsById, currentMinute) {
  const species = whaleSpeciesForIndividual(whale);
  const stageSpeed = whale.lifeStage === WHALE_LIFE_STAGE_CALF
    ? 0.82
    : whale.lifeStage === WHALE_LIFE_STAGE_ADOLESCENT ? 0.95 : 1;
  const speed = whale.phase === WHALE_PHASE_TETHERED
    ? whaleTowingSpeed(whale)
    : species.cruiseSpeedRad * stageSpeed;
  const mother = whale.motherId === null ? null : individualsById.get(whale.motherId);
  if (mother && mother.phase !== WHALE_PHASE_DEAD) steerTowardMother(whale, mother, dt);
  else if (whale.id === WHITE_WHALE_ID && whale.phase !== WHALE_PHASE_TETHERED) {
    steerWhiteWhaleMigration(whale, dt, currentMinute);
  } else {
    const turnWave = Math.sin(whale.lifeSeconds * 0.21 + (whale.seed & 1023) * 0.013);
    whale.heading = rotateAroundNormal(whale.heading, whale.position, turnWave * species.turnRateRad * dt);
  }
  const step = whaleMovementStep(
    whale,
    speed * dt,
    navigationAtPosition,
    whale.id === WHITE_WHALE_ID
  );
  if (!step) {
    whale.heading = rotateAroundNormal(
      whale.heading,
      whale.position,
      Math.PI * (0.72 + unit(whale.seed ^ whale.cycle) * 0.5)
    );
    return requireWhaleNavigation(navigationAtPosition(whale.position));
  }
  whale.position = step.position;
  whale.tileId = step.navigation.tileId;
  whale.heading = step.heading;
  whale.heading = normalizeTangent(whale.heading, whale.position);
  return step.navigation;
}

function steerWhiteWhaleMigration(whale, dt, currentMinute) {
  const { latitudeDeg } = vectorLatLon(whale.position);
  const hemisphere = (whale.seed & 1) === 0 ? 1 : -1;
  const annualPhase = currentMinute / (365.25 * MINUTES_PER_DAY) * Math.PI * 2 + unit(whale.seed) * Math.PI * 2;
  const targetLatitudeDeg = hemisphere * (
    WHITE_WHALE_MIGRATION_LATITUDE_MIN_DEG +
    WHITE_WHALE_MIGRATION_LATITUDE_SPREAD_DEG * (0.5 + Math.sin(annualPhase) * 0.5)
  );
  const north = normalizeTangentOrNull([0, 1, 0], whale.position) || randomTangent(whale.position, whale.seed);
  const east = normalizeTangent(cross([0, 1, 0], whale.position), whale.position);
  const latitudeSteer = clamp((targetLatitudeDeg - latitudeDeg) / 24, -0.7, 0.7);
  const migration = normalizeTangent([
    east[0] + north[0] * latitudeSteer,
    east[1] + north[1] * latitudeSteer,
    east[2] + north[2] * latitudeSteer
  ], whale.position);
  const wander = Math.sin(whale.lifeSeconds * 0.075 + unit(whale.seed ^ 0x57414e44) * Math.PI * 2) * 0.08;
  const desired = rotateAroundNormal(migration, whale.position, wander);
  whale.heading = rotateTangentToward(
    whale.heading,
    desired,
    whale.position,
    whaleSpeciesForIndividual(whale).turnRateRad * WHITE_WHALE_MIGRATION_TURN_MULTIPLIER * dt
  );
}

function whaleMovementStep(whale, distanceRad, navigationAtPosition, steerAroundCoast) {
  const offsets = steerAroundCoast
    ? [0, Math.PI / 12, -Math.PI / 12, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2]
    : [0];
  for (const offset of offsets) {
    const heading = offset === 0
      ? whale.heading
      : rotateAroundNormal(whale.heading, whale.position, offset);
    const position = normalize([
      whale.position[0] + heading[0] * distanceRad,
      whale.position[1] + heading[1] * distanceRad,
      whale.position[2] + heading[2] * distanceRad
    ]);
    const navigation = requireWhaleNavigation(navigationAtPosition(position));
    if (!navigation.ok || !whaleRangeContains(whale.speciesId, position)) continue;
    return { position, heading, navigation };
  }
  return null;
}

function steerTowardMother(whale, mother, dt) {
  const distance = angularDistance(whale.position, mother.position);
  const towardMother = normalizeTangentOrNull(mother.position, whale.position);
  const desired = distance > FAMILY_FOLLOW_DISTANCE_RAD && towardMother
    ? normalizeTangent([
        mother.heading[0] * 0.45 + towardMother[0] * 0.55,
        mother.heading[1] * 0.45 + towardMother[1] * 0.55,
        mother.heading[2] * 0.45 + towardMother[2] * 0.55
      ], whale.position)
    : normalizeTangent(mother.heading, whale.position);
  const maxTurn = whaleSpeciesForIndividual(whale).turnRateRad * dt *
    (distance > FAMILY_MAX_SEPARATION_RAD ? 3.5 : 1.8);
  whale.heading = rotateTangentToward(whale.heading, desired, whale.position, maxTurn);
}

function advanceWhalePhase(whale, events, canSurface) {
  if (typeof canSurface !== "boolean") {
    throw new Error(`Whale navigation omitted surface state for ${whale.id}`);
  }
  if (!canSurface) {
    if (whale.phase !== WHALE_PHASE_SUBMERGED) {
      whale.phase = WHALE_PHASE_SUBMERGED;
      whale.phaseElapsedSeconds = 0;
      whale.phaseDurationSeconds = submergedDuration(whale.seed, whale.cycle, whale.speciesId);
    } else {
      whale.phaseElapsedSeconds = Math.min(whale.phaseElapsedSeconds, whale.phaseDurationSeconds);
    }
    return;
  }
  while (whale.phaseElapsedSeconds >= whale.phaseDurationSeconds) {
    whale.phaseElapsedSeconds -= whale.phaseDurationSeconds;
    if (whale.phase === WHALE_PHASE_SUBMERGED) {
      whale.phase = WHALE_PHASE_RISING;
      whale.phaseDurationSeconds = WHALE_RISING_SECONDS;
    } else if (whale.phase === WHALE_PHASE_RISING) {
      whale.phase = WHALE_PHASE_SURFACED;
      whale.phaseDurationSeconds = WHALE_SURFACED_SECONDS;
      events.push(Object.freeze({ type: "blow", whaleId: whale.id }));
    } else if (whale.phase === WHALE_PHASE_SURFACED) {
      whale.phase = WHALE_PHASE_DIVING;
      whale.phaseDurationSeconds = WHALE_DIVING_SECONDS;
    } else if (whale.phase === WHALE_PHASE_DIVING) {
      whale.phase = WHALE_PHASE_SUBMERGED;
      whale.cycle += 1;
      whale.phaseDurationSeconds = submergedDuration(whale.seed, whale.cycle, whale.speciesId);
    } else {
      throw new Error(`Whale phase cannot advance automatically: ${whale.phase}`);
    }
  }
}

function requireWhaleNavigation(navigation) {
  if (!navigation || typeof navigation.ok !== "boolean" ||
    typeof navigation.canSurface !== "boolean" || !Number.isInteger(navigation.tileId)) {
    throw new Error("Whale navigation resolver returned an invalid result");
  }
  if (navigation.canSurface && !navigation.ok) {
    throw new Error(`Whale navigation marked blocked tile ${navigation.tileId} as surfaceable`);
  }
  return navigation;
}

function breakWhaleTetherUnderIce(memory, whale, events) {
  if (memory.activeHunt?.whaleId !== whale.id || whale.phase !== WHALE_PHASE_TETHERED) {
    throw new Error(`Cannot break an inactive whale tether under ice: ${whale.id}`);
  }
  memory.activeHunt = null;
  releaseWhale(whale);
  events.push(Object.freeze({ type: "ice-line-break", whaleId: whale.id }));
}

function releaseWhale(whale) {
  whale.phase = WHALE_PHASE_DIVING;
  whale.phaseElapsedSeconds = 0;
  whale.phaseDurationSeconds = WHALE_DIVING_SECONDS;
}

function killWhale(memory, whale) {
  whale.phase = WHALE_PHASE_DEAD;
  whale.phaseElapsedSeconds = 0;
  whale.phaseDurationSeconds = 0;
  for (const dependent of memory.individuals) {
    if (dependent.motherId === whale.id) dependent.motherId = null;
  }
}

function submergedDuration(seed, cycle, speciesId) {
  const species = whaleSpeciesById(speciesId);
  const diveMultiplier = species.id === WHALE_SPECIES_SPERM
    ? 2.4
    : species.id === "southern-minke-whale" ? 0.65
      : species.id === "blue-whale" ? 1.25
        : species.id === "humpback-whale" ? 0.9 : 1;
  return (WHALE_SUBMERGED_MIN_SECONDS +
    unit(seed ^ Math.imul(cycle + 1, 0x85ebca6b)) * WHALE_SUBMERGED_SPREAD_SECONDS) * diveMultiplier;
}

function familyCandidate(mother, seed, distanceRad) {
  const side = normalize(cross(mother.position, mother.heading));
  const signedDistance = unit(seed ^ 0x53494445) < 0.5 ? -distanceRad : distanceRad;
  const position = normalize([
    mother.position[0] + side[0] * signedDistance,
    mother.position[1] + side[1] * signedDistance,
    mother.position[2] + side[2] * signedDistance
  ]);
  return { tileId: mother.tileId, position };
}

function validateCandidate(candidate) {
  if (!candidate || !Number.isInteger(candidate.tileId) || candidate.tileId < 0) {
    throw new Error("Whale candidate requires a tile id");
  }
  if (!Number.isFinite(candidate.latitudeDeg) || !Number.isFinite(candidate.longitudeDeg)) {
    throw new Error(`Whale candidate ${candidate.tileId} has invalid coordinates`);
  }
  validateVector(candidate.position, `whale candidate ${candidate.tileId} position`);
  return candidate;
}

function validateWhale(whale) {
  if (!whale || typeof whale.id !== "string" || whale.id.length === 0) throw new Error("Whale requires an id");
  whaleSpeciesById(whale.speciesId);
  if (!SEXES.has(whale.sex)) throw new Error(`Unknown whale sex: ${whale.sex}`);
  if (!LIFE_STAGES.has(whale.lifeStage)) throw new Error(`Unknown whale life stage: ${whale.lifeStage}`);
  if (!PHASES.has(whale.phase)) throw new Error(`Unknown whale phase: ${whale.phase}`);
  if (!Number.isInteger(whale.seed) || !Number.isInteger(whale.tileId)) throw new Error(`Invalid whale identity: ${whale.id}`);
  validateVector(whale.position, `${whale.id} position`);
  validateVector(whale.heading, `${whale.id} heading`);
  for (const [label, value] of Object.entries({
    birthMinute: whale.birthMinute,
    lifeSeconds: whale.lifeSeconds,
    phaseElapsedSeconds: whale.phaseElapsedSeconds,
    phaseDurationSeconds: whale.phaseDurationSeconds
  })) {
    if (!Number.isFinite(value) || (label !== "birthMinute" && value < 0)) {
      throw new Error(`Invalid whale ${label}: ${whale.id}`);
    }
  }
  for (const key of ["pregnancyDueMinute", "lastCalvingMinute", "nextMatingMinute"]) {
    if (whale[key] !== null && !Number.isFinite(whale[key])) {
      throw new Error(`Invalid whale ${key}: ${whale.id}`);
    }
  }
  for (const key of ["motherId", "mateId"]) {
    if (whale[key] !== null && (typeof whale[key] !== "string" || whale[key] === "")) {
      throw new Error(`Invalid whale ${key}: ${whale.id}`);
    }
  }
  if (!Number.isInteger(whale.cycle) || whale.cycle < 0) throw new Error(`Invalid whale cycle: ${whale.id}`);
  return whale;
}

function randomTangent(position, seed) {
  const reference = Math.abs(position[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const firstTangent = normalize(cross(position, reference));
  const secondTangent = normalize(cross(position, firstTangent));
  const angle = unit(seed) * Math.PI * 2;
  return normalize([
    firstTangent[0] * Math.cos(angle) + secondTangent[0] * Math.sin(angle),
    firstTangent[1] * Math.cos(angle) + secondTangent[1] * Math.sin(angle),
    firstTangent[2] * Math.cos(angle) + secondTangent[2] * Math.sin(angle)
  ]);
}

function numberedWhaleId(idNumber) {
  return `whale-${String(idNumber).padStart(4, "0")}`;
}

function validateVector(vector, label) {
  if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite)) {
    throw new Error(`Invalid ${label}`);
  }
}

function assertSimulationMinute(value) {
  if (!Number.isFinite(value)) throw new Error(`Invalid whale simulation minute: ${value}`);
}

function normalizeTangent(vector, position) {
  const projection = dot(vector, position);
  return normalize([
    vector[0] - position[0] * projection,
    vector[1] - position[1] * projection,
    vector[2] - position[2] * projection
  ]);
}

function normalizeTangentOrNull(vector, position) {
  const projection = dot(vector, position);
  const tangent = [
    vector[0] - position[0] * projection,
    vector[1] - position[1] * projection,
    vector[2] - position[2] * projection
  ];
  return Math.hypot(...tangent) <= 1e-9 ? null : normalize(tangent);
}

function rotateAroundNormal(vector, normal, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const crossed = cross(normal, vector);
  return normalizeTangent([
    vector[0] * cos + crossed[0] * sin,
    vector[1] * cos + crossed[1] * sin,
    vector[2] * cos + crossed[2] * sin
  ], normal);
}

function rotateTangentToward(current, target, normal, maxStep) {
  const sin = dot(cross(current, target), normal);
  const cos = clamp(dot(current, target), -1, 1);
  return rotateAroundNormal(current, normal, clamp(Math.atan2(sin, cos), -maxStep, maxStep));
}

function angularDistance(a, b) {
  return Math.acos(clamp(dot(a, b), -1, 1));
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(vector) {
  const length = Math.hypot(...vector);
  if (length <= 1e-9) throw new Error("Cannot normalize a zero whale vector");
  return vector.map((value) => value / length);
}

function smootherstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function unit(value) {
  return (hashInt(value) >>> 0) / 0x100000000;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashInt(value) {
  let hash = value | 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
