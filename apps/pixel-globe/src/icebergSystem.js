export const ICEBERG_MEMORY_VERSION = 1;
export const ICEBERG_POPULATION_TARGET = 54;
export const ICEBERG_ADVANCE_INTERVAL_MINUTES = 30;

const MINUTES_PER_DAY = 24 * 60;
const EARTH_RADIUS_KM = 6371;
const ICEBERG_BASE_DRIFT_KM_PER_DAY = 11;
const ICEBERG_RESPAWN_INTERVAL_MINUTES = 2 * MINUTES_PER_DAY;
const ICEBERG_SEED = 0x49434542;

export const ICEBERG_VARIANTS = Object.freeze([
  Object.freeze({
    id: "iceberg-small",
    label: "Small Iceberg",
    weight: 0.5,
    mass: 220,
    radiusPx: 8,
    driftMultiplier: 1.16,
    meltPerWarmDegreeDay: 0.016
  }),
  Object.freeze({
    id: "iceberg-medium",
    label: "Medium Iceberg",
    weight: 0.35,
    mass: 720,
    radiusPx: 12,
    driftMultiplier: 0.92,
    meltPerWarmDegreeDay: 0.008
  }),
  Object.freeze({
    id: "iceberg-large",
    label: "Large Iceberg",
    weight: 0.15,
    mass: 2100,
    radiusPx: 17,
    driftMultiplier: 0.68,
    meltPerWarmDegreeDay: 0.0042
  })
]);

const ICEBERG_VARIANT_BY_ID = new Map(ICEBERG_VARIANTS.map((variant) => [variant.id, variant]));

export function icebergVariantById(id) {
  const variant = ICEBERG_VARIANT_BY_ID.get(id);
  if (!variant) throw new Error(`Unknown iceberg variant: ${id}`);
  return variant;
}

export function createIcebergMemory() {
  return {
    version: ICEBERG_MEMORY_VERSION,
    nextId: 1,
    individuals: [],
    lastAdvanceMinute: null,
    lastSpawnMinute: null
  };
}

export function seedIcebergPopulation(memory, candidates, {
  startMinute = 0,
  seedKey = "icebergs",
  count = ICEBERG_POPULATION_TARGET
} = {}) {
  validateIcebergMemory(memory);
  validateCandidates(candidates);
  assertMinute(startMinute);
  if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid iceberg population size: ${count}`);
  if (typeof seedKey !== "string" || seedKey.trim() === "") {
    throw new Error("Iceberg population requires a non-empty seed key");
  }
  if (memory.individuals.length > 0) return memory.individuals;
  if (count > 0 && candidates.length === 0) {
    throw new Error("Iceberg population has no active polar spawning waters");
  }
  const seed = hashString(seedKey) ^ ICEBERG_SEED;
  for (let index = 0; index < count; index++) {
    spawnIceberg(memory, candidates, seed, index);
  }
  memory.lastAdvanceMinute = startMinute;
  memory.lastSpawnMinute = startMinute;
  validateIcebergMemory(memory);
  return memory.individuals;
}

export function advanceIcebergMemory(memory, {
  currentMinute,
  environmentAtPosition,
  ejectionCandidateForIceberg = null,
  spawnCandidates,
  seedKey = "icebergs",
  targetCount = ICEBERG_POPULATION_TARGET
}) {
  validateIcebergMemory(memory);
  assertMinute(currentMinute);
  if (typeof environmentAtPosition !== "function") {
    throw new Error("Iceberg simulation requires an environment resolver");
  }
  if (ejectionCandidateForIceberg !== null && typeof ejectionCandidateForIceberg !== "function") {
    throw new Error("Iceberg simulation ejection resolver must be a function");
  }
  validateCandidates(spawnCandidates);
  if (typeof seedKey !== "string" || seedKey.trim() === "") {
    throw new Error("Iceberg simulation requires a non-empty seed key");
  }
  if (!Number.isInteger(targetCount) || targetCount < 0) {
    throw new Error(`Invalid iceberg population target: ${targetCount}`);
  }
  if (memory.lastAdvanceMinute === null) memory.lastAdvanceMinute = currentMinute;
  if (currentMinute < memory.lastAdvanceMinute) {
    throw new Error(`Iceberg simulation cannot move backwards: ${currentMinute} < ${memory.lastAdvanceMinute}`);
  }
  const elapsedMinutes = currentMinute - memory.lastAdvanceMinute;
  if (elapsedMinutes < ICEBERG_ADVANCE_INTERVAL_MINUTES) {
    return Object.freeze({
      changed: false,
      meltedIds: Object.freeze([]),
      ejectedIds: Object.freeze([]),
      spawnedIds: Object.freeze([])
    });
  }

  const elapsedDays = elapsedMinutes / MINUTES_PER_DAY;
  const survivors = [];
  const meltedIds = [];
  const ejectedIds = [];
  let changed = false;
  for (const iceberg of memory.individuals) {
    let environment = validateEnvironment(environmentAtPosition(iceberg.position));
    let wasEjected = false;
    if ((!environment.navigable || environment.frozen) && ejectionCandidateForIceberg) {
      const candidate = validateCandidate(ejectionCandidateForIceberg(iceberg));
      const destination = validateEnvironment(environmentAtPosition(candidate.position));
      if (!destination.navigable || destination.frozen) {
        throw new Error(`Iceberg ejection candidate is not open water: ${iceberg.id}/${candidate.tileId}`);
      }
      iceberg.position = candidate.position.slice();
      iceberg.tileId = destination.tileId;
      if (candidate.heading) iceberg.heading = candidate.heading.slice();
      environment = destination;
      ejectedIds.push(iceberg.id);
      wasEjected = true;
      changed = true;
    }
    const variant = icebergVariantById(iceberg.variantId);
    const warmDegrees = Math.max(0, environment.waterTemperatureC - 1.5);
    const melted = warmDegrees * elapsedDays * variant.meltPerWarmDegreeDay;
    if (melted > 0) {
      iceberg.integrity = Math.max(0, iceberg.integrity - melted);
      changed = true;
    }
    if (iceberg.integrity <= 0) {
      meltedIds.push(iceberg.id);
      changed = true;
      continue;
    }
    const shrunkenVariantId = icebergVariantForIntegrity(iceberg.variantId, iceberg.integrity);
    if (shrunkenVariantId !== iceberg.variantId) {
      iceberg.variantId = shrunkenVariantId;
      changed = true;
    }

    const moved = !wasEjected && driftIceberg(
      iceberg,
      icebergVariantById(iceberg.variantId),
      environment,
      elapsedDays,
      environmentAtPosition
    );
    changed ||= moved;
    survivors.push(iceberg);
  }
  memory.individuals = survivors;
  memory.lastAdvanceMinute = currentMinute;

  const spawnedIds = [];
  const mayRespawn = memory.individuals.length < targetCount && spawnCandidates.length > 0 &&
    (memory.lastSpawnMinute === null ||
      currentMinute - memory.lastSpawnMinute >= ICEBERG_RESPAWN_INTERVAL_MINUTES);
  if (mayRespawn) {
    const seed = hashString(seedKey) ^ ICEBERG_SEED ^ Math.floor(currentMinute);
    const iceberg = spawnIceberg(memory, spawnCandidates, seed, memory.nextId);
    memory.lastSpawnMinute = currentMinute;
    spawnedIds.push(iceberg.id);
    changed = true;
  }
  validateIcebergMemory(memory);
  return Object.freeze({
    changed,
    meltedIds: Object.freeze(meltedIds),
    ejectedIds: Object.freeze(ejectedIds),
    spawnedIds: Object.freeze(spawnedIds)
  });
}

function icebergVariantForIntegrity(variantId, integrity) {
  if (variantId === "iceberg-large" && integrity <= 0.66) return "iceberg-medium";
  if (variantId === "iceberg-medium" && integrity <= 0.33) return "iceberg-small";
  return variantId;
}

export function validateIcebergMemory(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== ICEBERG_MEMORY_VERSION) {
    throw new Error(`Unsupported iceberg memory version: ${memory?.version ?? "missing"}`);
  }
  if (!Number.isInteger(memory.nextId) || memory.nextId <= 0) {
    throw new Error(`Invalid next iceberg id: ${memory.nextId}`);
  }
  if (!Array.isArray(memory.individuals)) throw new Error("Iceberg memory requires individuals");
  if (memory.lastAdvanceMinute !== null) assertMinute(memory.lastAdvanceMinute);
  if (memory.lastSpawnMinute !== null) assertMinute(memory.lastSpawnMinute);
  const ids = new Set();
  for (const iceberg of memory.individuals) {
    validateIceberg(iceberg);
    if (ids.has(iceberg.id)) throw new Error(`Duplicate iceberg id: ${iceberg.id}`);
    ids.add(iceberg.id);
  }
  return memory;
}

function spawnIceberg(memory, candidates, seed, index) {
  const candidateIndex = hashInt(seed ^ Math.imul(index + 1, 0x9e3779b1)) % candidates.length;
  const candidate = candidates[candidateIndex];
  const variant = weightedVariant(hashUnit(seed ^ Math.imul(index + 1, 0x85ebca6b)));
  const headingAngle = hashUnit(seed ^ Math.imul(index + 1, 0xc2b2ae35)) * Math.PI * 2;
  const heading = candidate.heading?.slice() || tangentDirection(candidate.position, headingAngle);
  const iceberg = {
    id: `iceberg-${memory.nextId++}`,
    variantId: variant.id,
    sourceIceTileId: candidate.sourceIceTileId,
    tileId: candidate.tileId,
    position: candidate.position.slice(),
    heading,
    integrity: 1,
    seed: hashInt(seed ^ index)
  };
  memory.individuals.push(iceberg);
  return iceberg;
}

function driftIceberg(iceberg, variant, environment, elapsedDays, environmentAtPosition) {
  const flowAngle = environment.windDirectionRad + Math.PI;
  const driftRad = ICEBERG_BASE_DRIFT_KM_PER_DAY / EARTH_RADIUS_KM * elapsedDays *
    variant.driftMultiplier * (0.25 + environment.windStrength * 0.75);
  if (driftRad <= 1e-10) return false;
  const offsets = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2];
  for (const offset of offsets) {
    const direction = tangentDirection(iceberg.position, flowAngle + offset);
    const position = normalize([
      iceberg.position[0] + direction[0] * driftRad,
      iceberg.position[1] + direction[1] * driftRad,
      iceberg.position[2] + direction[2] * driftRad
    ]);
    const destination = validateEnvironment(environmentAtPosition(position));
    if (!destination.navigable || destination.frozen) continue;
    iceberg.position = position;
    iceberg.tileId = destination.tileId;
    iceberg.heading = direction;
    return true;
  }
  return false;
}

function tangentDirection(position, angle) {
  const lat = Math.asin(clamp(position[1], -1, 1));
  const lon = Math.atan2(-position[2], position[0]);
  const east = [-Math.sin(lon), 0, -Math.cos(lon)];
  const north = [
    -Math.sin(lat) * Math.cos(lon),
    Math.cos(lat),
    Math.sin(lat) * Math.sin(lon)
  ];
  return normalize([
    east[0] * Math.cos(angle) + north[0] * Math.sin(angle),
    east[1] * Math.cos(angle) + north[1] * Math.sin(angle),
    east[2] * Math.cos(angle) + north[2] * Math.sin(angle)
  ]);
}

function weightedVariant(value) {
  let remaining = value;
  for (const variant of ICEBERG_VARIANTS) {
    if (remaining < variant.weight) return variant;
    remaining -= variant.weight;
  }
  return ICEBERG_VARIANTS[ICEBERG_VARIANTS.length - 1];
}

function validateIceberg(iceberg) {
  if (!iceberg || typeof iceberg !== "object" || typeof iceberg.id !== "string" || iceberg.id === "") {
    throw new Error("Iceberg requires an id");
  }
  icebergVariantById(iceberg.variantId);
  for (const field of ["sourceIceTileId", "tileId"]) {
    if (!Number.isInteger(iceberg[field]) || iceberg[field] < 0) {
      throw new Error(`Invalid ${field} for iceberg ${iceberg.id}: ${iceberg[field]}`);
    }
  }
  validateVector(iceberg.position, `${iceberg.id} position`);
  validateVector(iceberg.heading, `${iceberg.id} heading`);
  if (!Number.isFinite(iceberg.integrity) || iceberg.integrity <= 0 || iceberg.integrity > 1) {
    throw new Error(`Invalid iceberg integrity: ${iceberg.id}/${iceberg.integrity}`);
  }
  if (!Number.isInteger(iceberg.seed)) throw new Error(`Invalid iceberg seed: ${iceberg.id}`);
}

function validateCandidates(candidates) {
  if (!Array.isArray(candidates)) throw new Error("Iceberg spawning requires candidate waters");
  for (const candidate of candidates) validateCandidate(candidate);
  return candidates;
}

function validateCandidate(candidate) {
  if (!candidate || !Number.isInteger(candidate.sourceIceTileId) || candidate.sourceIceTileId < 0 ||
      !Number.isInteger(candidate.tileId) || candidate.tileId < 0) {
    throw new Error("Iceberg candidate requires source and open-water tile ids");
  }
  validateVector(candidate.position, "iceberg candidate position");
  if (candidate.heading !== undefined) validateVector(candidate.heading, "iceberg candidate heading");
  return candidate;
}

function validateEnvironment(environment) {
  if (!environment || typeof environment !== "object") {
    throw new Error("Iceberg environment is missing");
  }
  if (!Number.isInteger(environment.tileId) || environment.tileId < 0) {
    throw new Error(`Invalid iceberg environment tile: ${environment.tileId}`);
  }
  if (typeof environment.navigable !== "boolean" || typeof environment.frozen !== "boolean") {
    throw new Error("Iceberg environment requires navigation and ice flags");
  }
  for (const field of ["windDirectionRad", "windStrength", "waterTemperatureC"]) {
    if (!Number.isFinite(environment[field])) {
      throw new Error(`Invalid iceberg environment ${field}: ${environment[field]}`);
    }
  }
  return environment;
}

function validateVector(vector, label) {
  if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite)) {
    throw new Error(`Invalid ${label}`);
  }
}

function assertMinute(minute) {
  if (!Number.isFinite(minute) || minute < 0) throw new Error(`Invalid iceberg simulation minute: ${minute}`);
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= 1e-12) throw new Error("Cannot normalize an empty iceberg vector");
  return [vector[0] / length, vector[1] / length, vector[2] / length];
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
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function hashUnit(value) {
  return hashInt(value) / 0x100000000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
