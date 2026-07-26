const STORM_SPAWN_INTERVAL_MINUTES = 6 * 60;
const STORMS_PER_INTERVAL = 4;
const STORM_LOOKBACK_INTERVALS = 9;
const STORM_CACHE_MINUTES = 15;
const STORM_MIN_DURATION_MINUTES = 18 * 60;
const STORM_DURATION_SPREAD_MINUTES = 30 * 60;

export const STORM_ACTIVE_INTENSITY = 0.28;
export const STORM_DAMAGE_INTENSITY = 0.42;

export function rainCollectionStrength({ raining, snowing, stormIntensity }) {
  if (typeof raining !== "boolean" || typeof snowing !== "boolean") {
    throw new Error("Rain collection requires boolean precipitation flags");
  }
  if (!Number.isFinite(stormIntensity) || stormIntensity < 0 || stormIntensity > 1) {
    throw new Error(`Invalid rain collection storm intensity: ${stormIntensity}`);
  }
  if (stormIntensity >= STORM_ACTIVE_INTENSITY) {
    const stormProgress = (stormIntensity - STORM_ACTIVE_INTENSITY) / (1 - STORM_ACTIVE_INTENSITY);
    return Math.max(raining ? 0.35 : 0, 0.8 + stormProgress * 0.2);
  }
  if (snowing) return 0;
  return raining ? 0.35 : 0;
}

export function createStormSystem({
  neighbors,
  latDeg,
  lonDeg,
  waterMask,
  oceanMask,
  seed = 0x53544f52
}) {
  const tileCount = neighbors?.length;
  if (!Number.isInteger(tileCount) || tileCount <= 0) {
    throw new Error("Storm system requires a non-empty neighbor graph");
  }
  for (const [label, values] of Object.entries({ latDeg, lonDeg, waterMask, oceanMask })) {
    if (!values || values.length !== tileCount) {
      throw new Error(`Storm system ${label} length does not match the graph`);
    }
  }
  const shelterRoutes = buildStormShelterRoutes({ neighbors, waterMask, oceanMask });
  return {
    neighbors,
    latDeg,
    lonDeg,
    exposure: buildStormExposure({ neighbors, waterMask, oceanMask }),
    nearestShelterTile: shelterRoutes.nearest,
    nextShelterTile: shelterRoutes.next,
    seed: seed | 0,
    cacheKey: null,
    cells: [],
    tileCache: new Map()
  };
}

export function buildNearestStormShelterTiles({ neighbors, waterMask, oceanMask }) {
  return buildStormShelterRoutes({ neighbors, waterMask, oceanMask }).nearest;
}

export function buildStormShelterRoutes({ neighbors, waterMask, oceanMask }) {
  const tileCount = neighbors.length;
  const nearest = new Int32Array(tileCount);
  const next = new Int32Array(tileCount);
  nearest.fill(-1);
  next.fill(-1);
  const queue = [];
  for (let tileId = 0; tileId < tileCount; tileId++) {
    if (!waterMask[tileId] || !oceanMask[tileId]) continue;
    const touchesLand = neighbors[tileId].some((neighborId) => !waterMask[neighborId]);
    if (!touchesLand) continue;
    nearest[tileId] = tileId;
    next[tileId] = tileId;
    queue.push(tileId);
  }
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of neighbors[tileId]) {
      if (nearest[neighborId] >= 0 || !waterMask[neighborId] || !oceanMask[neighborId]) continue;
      nearest[neighborId] = nearest[tileId];
      next[neighborId] = tileId;
      queue.push(neighborId);
    }
  }
  return { nearest, next };
}

export function nearestStormShelterTile(system, tileId) {
  validateSystemTile(system, tileId, 0);
  const shelterTileId = system.nearestShelterTile?.[tileId] ?? -1;
  return shelterTileId >= 0 ? shelterTileId : null;
}

export function nextStormShelterTile(system, tileId) {
  validateSystemTile(system, tileId, 0);
  const nextTileId = system.nextShelterTile?.[tileId] ?? -1;
  return nextTileId >= 0 ? nextTileId : null;
}

export function buildStormExposure({ neighbors, waterMask, oceanMask }) {
  const tileCount = neighbors.length;
  const landDistance = new Int16Array(tileCount);
  landDistance.fill(-1);
  const queue = [];
  for (let tileId = 0; tileId < tileCount; tileId++) {
    if (waterMask[tileId]) continue;
    landDistance[tileId] = 0;
    queue.push(tileId);
  }
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of neighbors[tileId]) {
      if (landDistance[neighborId] >= 0) continue;
      landDistance[neighborId] = landDistance[tileId] + 1;
      queue.push(neighborId);
    }
  }

  const exposure = new Float32Array(tileCount);
  for (let tileId = 0; tileId < tileCount; tileId++) {
    if (!waterMask[tileId] || !oceanMask[tileId]) continue;
    const adjacent = neighbors[tileId];
    let waterNeighbors = 0;
    for (const neighborId of adjacent) {
      if (waterMask[neighborId]) waterNeighbors++;
    }
    const neighborOpenness = smoothstep(
      (waterNeighbors / Math.max(1, adjacent.length) - 0.4) / 0.6
    );
    const offshoreDistance = smoothstep((landDistance[tileId] - 1) / 4);
    exposure[tileId] = 0.08 + 0.92 * (
      offshoreDistance * 0.75 + neighborOpenness * 0.25
    );
  }
  return exposure;
}

export function stormIntensityAtTile(system, tileId, simMinute) {
  validateSystemTile(system, tileId, simMinute);
  const cacheKey = Math.floor(simMinute / STORM_CACHE_MINUTES);
  if (system.cacheKey !== cacheKey) {
    system.cacheKey = cacheKey;
    system.cells = stormCellsAtMinute(cacheKey * STORM_CACHE_MINUTES, system.seed);
    system.tileCache.clear();
  }
  if (system.tileCache.has(tileId)) return system.tileCache.get(tileId);
  const raw = stormIntensityAtPosition(
    system.cells,
    system.latDeg[tileId],
    system.lonDeg[tileId]
  );
  const intensity = clamp(raw * system.exposure[tileId], 0, 1);
  system.tileCache.set(tileId, intensity);
  return intensity;
}

export function stormCellsAtMinute(simMinute, seed = 0x53544f52) {
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid storm minute: ${simMinute}`);
  const currentInterval = Math.floor(simMinute / STORM_SPAWN_INTERVAL_MINUTES);
  const cells = [];
  for (
    let interval = currentInterval - STORM_LOOKBACK_INTERVALS;
    interval <= currentInterval;
    interval++
  ) {
    for (let slot = 0; slot < STORMS_PER_INTERVAL; slot++) {
      const stormSeed = mix32(seed ^ Math.imul(interval + 0x4000, 0x9e3779b1) ^ Math.imul(slot + 1, 0x85ebca6b));
      const startMinute = interval * STORM_SPAWN_INTERVAL_MINUTES +
        unit(stormSeed, 1) * STORM_SPAWN_INTERVAL_MINUTES;
      const durationMinutes = STORM_MIN_DURATION_MINUTES +
        unit(stormSeed, 2) * STORM_DURATION_SPREAD_MINUTES;
      const ageMinutes = simMinute - startMinute;
      if (ageMinutes < 0 || ageMinutes >= durationMinutes) continue;

      const age = ageMinutes / durationMinutes;
      const life = smoothstep(age / 0.16) * (1 - smoothstep((age - 0.72) / 0.28));
      const hours = ageMinutes / 60;
      const startLat = -62 + unit(stormSeed, 3) * 124;
      const startLon = -180 + unit(stormSeed, 4) * 360;
      const driftLatPerHour = (unit(stormSeed, 5) - 0.5) * 0.12;
      const driftLonPerHour = (unit(stormSeed, 6) - 0.5) * 0.7;
      const latDeg = clamp(startLat + driftLatPerHour * hours, -70, 70);
      const radiusDeg = 7 + unit(stormSeed, 7) * 9;
      cells.push({
        id: `${interval}:${slot}`,
        latDeg,
        lonDeg: wrapLongitude(startLon + driftLonPerHour * hours),
        radiusDeg,
        longitudeRadiusDeg: stormLongitudeRadiusDeg(latDeg, radiusDeg),
        strength: (0.72 + unit(stormSeed, 8) * 0.28) * life
      });
    }
  }
  return cells;
}

export function stormIntensityAtPosition(cells, latDeg, lonDeg) {
  if (!Array.isArray(cells)) throw new Error("Storm intensity requires storm cells");
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) {
    throw new Error("Storm intensity requires a finite position");
  }
  let strongest = 0;
  for (const cell of cells) {
    if (cell.strength <= strongest) continue;
    if (Math.abs(latDeg - cell.latDeg) >= cell.radiusDeg) continue;
    const longitudeDelta = Math.abs(wrapLongitude(lonDeg - cell.lonDeg));
    const longitudeRadius = cell.longitudeRadiusDeg ??
      stormLongitudeRadiusDeg(cell.latDeg, cell.radiusDeg);
    if (longitudeDelta >= longitudeRadius) continue;
    const distanceDeg = angularDistanceDeg(latDeg, lonDeg, cell.latDeg, cell.lonDeg);
    if (distanceDeg >= cell.radiusDeg) continue;
    const edge = smoothstep((distanceDeg / cell.radiusDeg - 0.38) / 0.62);
    strongest = Math.max(strongest, cell.strength * (1 - edge));
  }
  return clamp(strongest, 0, 1);
}

function stormLongitudeRadiusDeg(latDeg, radiusDeg) {
  const toRad = Math.PI / 180;
  const ratio = Math.sin(radiusDeg * toRad) / Math.cos(latDeg * toRad);
  if (ratio >= 1) return 180;
  return Math.asin(ratio) / toRad;
}

export function stormWindStrength(baseStrength, stormIntensity) {
  if (!Number.isFinite(baseStrength) || !Number.isFinite(stormIntensity)) {
    throw new Error("Storm wind requires finite strengths");
  }
  const intensity = clamp(stormIntensity, 0, 1);
  return clamp(baseStrength * (1 + intensity * 1.4) + intensity * 0.35, 0, 2.6);
}

export function stormDamageForHour({
  intensity,
  seaworthiness,
  maxHull,
  hourIndex,
  seed = 0x44414d47
}) {
  if (!Number.isFinite(intensity) || !Number.isInteger(seaworthiness) ||
      !Number.isFinite(maxHull) || !Number.isInteger(hourIndex)) {
    throw new Error("Storm damage requires intensity, seaworthiness, hull, and hour");
  }
  if (intensity < STORM_DAMAGE_INTENSITY || seaworthiness < 1 || seaworthiness > 10 || maxHull <= 0) {
    return 0;
  }
  const severity = clamp((intensity - STORM_DAMAGE_INTENSITY) / (1 - STORM_DAMAGE_INTENSITY), 0, 1);
  const vulnerability = (11 - seaworthiness) / 10;
  const eventSeed = mix32(seed ^ Math.imul(hourIndex + 1, 0x9e3779b1));
  const chance = severity * (0.18 + vulnerability * 0.42);
  if (unit(eventSeed, 11) >= chance) return 0;
  const damageFraction = 0.006 + intensity * 0.012 + vulnerability * 0.014;
  const jitter = 0.65 + unit(eventSeed, 12) * 0.7;
  return Math.max(1, Math.round(maxHull * damageFraction * jitter));
}

function validateSystemTile(system, tileId, simMinute) {
  if (!system || !system.exposure || !Number.isInteger(tileId) ||
      tileId < 0 || tileId >= system.exposure.length) {
    throw new Error(`Invalid storm tile: ${tileId}`);
  }
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid storm minute: ${simMinute}`);
}

function angularDistanceDeg(latA, lonA, latB, lonB) {
  const toRad = Math.PI / 180;
  const a = latA * toRad;
  const b = latB * toRad;
  const deltaLat = (latB - latA) * toRad;
  const deltaLon = wrapLongitude(lonB - lonA) * toRad;
  const h = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(a) * Math.cos(b) * Math.sin(deltaLon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h))) / toRad;
}

function wrapLongitude(lonDeg) {
  return ((((lonDeg + 180) % 360) + 360) % 360) - 180;
}

function unit(seed, salt) {
  return (mix32(seed ^ Math.imul(salt + 1, 0x7f4a7c15)) >>> 0) / 0x100000000;
}

function mix32(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x | 0;
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
