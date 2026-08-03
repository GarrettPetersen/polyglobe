export const WEATHER_DAYS = 365;
export const WEATHER_MINUTES_PER_DAY = 1440;
export const WEATHER_REF_YEAR = 2023;

export const TILE_DAY_CLEAR = 0;
export const TILE_DAY_RAIN = 1;
export const TILE_DAY_SNOW_FALL = 2;
export const TILE_DAY_WET_SOIL = 4;
export const TILE_DAY_SNOW_GROUND = 8;

const DISCRETE_MAGIC = "PLYW";
const DISCRETE_FILE_VERSION = 2;
const DISCRETE_HEADER_BYTES = 20;

const RUNTIME_MAGIC = "PGRB";
const RUNTIME_FILE_VERSION = 3;
const RUNTIME_HEADER_BYTES = 64;
const CLOUD_SPAWN_RECORD_BYTES = 24;
const WIND_YEAR_MINUTES = WEATHER_DAYS * WEATHER_MINUTES_PER_DAY;
const WIND_TIME_CELL_MINUTES = 5 * WEATHER_MINUTES_PER_DAY;
const WIND_TIME_CELLS = WIND_YEAR_MINUTES / WIND_TIME_CELL_MINUTES;
const WIND_LAT_CELL_DEG = 12;
const WIND_LON_CELL_DEG = 20;
const WIND_LAT_CELLS = 180 / WIND_LAT_CELL_DEG;
const WIND_LON_CELLS = 360 / WIND_LON_CELL_DEG;
const MIN_WIND_STRENGTH = 0.025;
const MAX_BASE_WIND_STRENGTH = 0.78;

export function discreteWeatherBakeEarthCacheVersionU32(key) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function decodeDiscreteWeatherYearBakeFile(buffer, globeTileIds, expectedVersionKey, expectedSubdivisions) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  if (u8.byteLength < DISCRETE_HEADER_BYTES) {
    throw new Error(`Discrete weather bake is too small: ${u8.byteLength} bytes`);
  }
  requireMagic(u8, DISCRETE_MAGIC, "discrete weather bake");

  let o = 4;
  const fileVersion = dv.getUint32(o, true);
  o += 4;
  if (fileVersion !== DISCRETE_FILE_VERSION) {
    throw new Error(`Unsupported discrete weather bake version ${fileVersion}; expected ${DISCRETE_FILE_VERSION}`);
  }

  const cacheVersion = dv.getUint32(o, true);
  o += 4;
  const expectedCacheVersion = discreteWeatherBakeEarthCacheVersionU32(expectedVersionKey);
  if (cacheVersion !== expectedCacheVersion) {
    throw new Error(`Discrete weather bake cache version ${cacheVersion} does not match Earth cache ${expectedVersionKey}`);
  }

  const subdivisions = dv.getUint32(o, true);
  o += 4;
  if (subdivisions !== expectedSubdivisions) {
    throw new Error(`Discrete weather bake subdivision ${subdivisions}; expected ${expectedSubdivisions}`);
  }

  const tileCount = dv.getUint32(o, true);
  o += 4;
  if (tileCount !== globeTileIds.length) {
    throw new Error(`Discrete weather bake tile count ${tileCount}; expected ${globeTileIds.length}`);
  }

  const idsEnd = o + tileCount * 4;
  const payloadBytes = WEATHER_DAYS * tileCount;
  if (u8.byteLength !== idsEnd + payloadBytes) {
    throw new Error(`Discrete weather bake has ${u8.byteLength} bytes; expected ${idsEnd + payloadBytes}`);
  }

  const ordinalByTileId = new Int32Array(tileCount);
  ordinalByTileId.fill(-1);
  for (let i = 0; i < tileCount; i++) {
    const tileId = dv.getInt32(o + i * 4, true);
    if (tileId !== globeTileIds[i]) {
      throw new Error(`Discrete weather bake tile order mismatch at ordinal ${i}: got ${tileId}, expected ${globeTileIds[i]}`);
    }
    if (tileId < 0 || tileId >= tileCount) {
      throw new Error(`Discrete weather bake tile id out of range at ordinal ${i}: ${tileId}`);
    }
    ordinalByTileId[tileId] = i;
  }

  return {
    tileCount,
    ordinalByTileId,
    packed: new Uint8Array(buffer, idsEnd, payloadBytes)
  };
}

export function decodePixelRuntimeWeatherBakeFile(buffer, expectedVersionKey, expectedSubdivisions, expectedTileCount) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  if (u8.byteLength < RUNTIME_HEADER_BYTES) {
    throw new Error(`Globe runtime bake is too small: ${u8.byteLength} bytes`);
  }
  requireMagic(u8, RUNTIME_MAGIC, "globe runtime bake");

  let p = 4;
  const fileVersion = dv.getUint32(p, true);
  p += 4;
  if (fileVersion !== RUNTIME_FILE_VERSION) {
    throw new Error(`Unsupported globe runtime bake version ${fileVersion}; expected ${RUNTIME_FILE_VERSION}`);
  }

  const cacheVersion = dv.getUint32(p, true);
  p += 4;
  const expectedCacheVersion = discreteWeatherBakeEarthCacheVersionU32(expectedVersionKey);
  if (cacheVersion !== expectedCacheVersion) {
    throw new Error(`Globe runtime bake cache version ${cacheVersion} does not match Earth cache ${expectedVersionKey}`);
  }

  const subdivisions = dv.getUint32(p, true);
  p += 4;
  if (subdivisions !== expectedSubdivisions) {
    throw new Error(`Globe runtime bake subdivision ${subdivisions}; expected ${expectedSubdivisions}`);
  }

  const tileCount = dv.getUint32(p, true);
  p += 4;
  if (tileCount !== expectedTileCount) {
    throw new Error(`Globe runtime bake tile count ${tileCount}; expected ${expectedTileCount}`);
  }

  const coastW = dv.getUint32(p, true);
  p += 4;
  const coastH = dv.getUint32(p, true);
  p += 4;
  const headerMaxCloudSlots = dv.getUint32(p, true);
  p += 4;
  p += 4; // cloud spawn config hash, validated by the 3D demo; the pixel app only consumes layout.
  p += 4; // water table fingerprint.
  const riverTileCount = dv.getUint32(p, true);
  p = RUNTIME_HEADER_BYTES;

  let o = p;
  requireBytes(o, 12, u8.byteLength, "runtime water section header");
  const vertCount = dv.getUint32(o, true);
  o += 4;
  const indexCount = dv.getUint32(o, true);
  o += 4;
  const indexType = dv.getUint32(o, true);
  o += 4;
  if (indexType !== 0 && indexType !== 1) {
    throw new Error(`Globe runtime bake index type ${indexType} is invalid`);
  }

  o = skipBytes(o, vertCount * 12, u8.byteLength, "runtime water positions");
  o = skipBytes(o, vertCount * 12, u8.byteLength, "runtime water normals");
  o = skipBytes(o, indexCount * (indexType === 1 ? 4 : 2), u8.byteLength, "runtime water indices");
  o = skipBytes(o, coastW * coastH, u8.byteLength, "runtime coast water mask");
  o = skipBytes(o, coastW * coastH, u8.byteLength, "runtime coast land mask");

  requireBytes(o, 4, u8.byteLength, "runtime cloud slot count");
  const maxCloudSlots = dv.getUint32(o, true);
  o += 4;
  if (maxCloudSlots !== headerMaxCloudSlots) {
    throw new Error(`Runtime cloud slot count mismatch: header=${headerMaxCloudSlots}, section=${maxCloudSlots}`);
  }

  const recordCount = maxCloudSlots * WEATHER_DAYS;
  const cloudSpawnTileIds = new Uint32Array(recordCount);
  const cloudTemplateIndices = new Uint32Array(recordCount);
  const cloudBaseScales = new Float32Array(recordCount);
  const cloudLifecyclePhases = new Float32Array(recordCount);
  requireBytes(o, recordCount * CLOUD_SPAWN_RECORD_BYTES, u8.byteLength, "runtime cloud spawn table");
  for (let i = 0; i < recordCount; i++) {
    const rec = o + i * CLOUD_SPAWN_RECORD_BYTES;
    const tileId = dv.getUint32(rec, true);
    if (tileId >= tileCount) {
      throw new Error(`Runtime cloud spawn table tile id ${tileId} is out of range at record ${i}`);
    }
    cloudSpawnTileIds[i] = tileId;
    cloudTemplateIndices[i] = dv.getUint32(rec + 4, true);
    cloudBaseScales[i] = dv.getFloat32(rec + 8, true);
    cloudLifecyclePhases[i] = dv.getFloat32(rec + 20, true);
  }
  o += recordCount * CLOUD_SPAWN_RECORD_BYTES;

  o = skipBytes(o, riverTileCount * 4, u8.byteLength, "runtime river flow tile ids");
  o = skipBytes(o, riverTileCount * WEATHER_DAYS * 4, u8.byteLength, "runtime river flow strengths");

  const seaDecoded = decodeIceCycleSection(dv, o, u8.byteLength, tileCount, "sea ice");
  o = seaDecoded.offset;
  const freshwaterDecoded = decodeIceCycleSection(dv, o, u8.byteLength, tileCount, "freshwater ice");
  o = freshwaterDecoded.offset;

  if (o !== u8.byteLength) {
    throw new Error(`Globe runtime bake has ${u8.byteLength - o} trailing bytes`);
  }

  return {
    maxCloudSlots,
    cloudSpawnTileIds,
    cloudTemplateIndices,
    cloudBaseScales,
    cloudLifecyclePhases,
    seaIceCycle: seaDecoded.cycle,
    freshwaterIceCycle: freshwaterDecoded.cycle
  };
}

export function discreteWeatherFlagsForTile(bake, tileId, dayIndex) {
  if (!bake) return TILE_DAY_CLEAR;
  const ord = bake.ordinalByTileId[tileId];
  if (ord == null || ord < 0) return TILE_DAY_CLEAR;
  const day = normalizeDayIndex(dayIndex);
  return bake.packed[day * bake.tileCount + ord] || TILE_DAY_CLEAR;
}

export function fillIceMaskForDay(cycle, dayOfYear, outMask) {
  if (!cycle) {
    outMask.fill(0);
    return;
  }
  if (outMask.length < cycle.tileCount) {
    throw new Error(`Ice mask length ${outMask.length}; expected at least ${cycle.tileCount}`);
  }

  outMask.fill(0);
  const day = normalizeDayIndex(dayOfYear);
  fillAlwaysIce(cycle.northAlwaysTileIds, outMask);
  fillAlwaysIce(cycle.southAlwaysTileIds, outMask);
  fillSeasonalIce(cycle.northSeasonalTileIds, cycle.northFreezeDayOfYear, cycle.northThawDayOfYear, day, outMask);
  fillSeasonalIce(cycle.southSeasonalTileIds, cycle.southFreezeDayOfYear, cycle.southThawDayOfYear, day, outMask);
}

export function isSeaIceActiveOnDay(freezeDay, thawDay, dayOfYear) {
  const day = normalizeDayIndex(dayOfYear);
  if (freezeDay === thawDay) return false;
  if (freezeDay < thawDay) return day >= freezeDay && day < thawDay;
  return day >= freezeDay || day < thawDay;
}

export function weatherClockParts(clockMinutes) {
  const cycleMinutes = WEATHER_DAYS * WEATHER_MINUTES_PER_DAY;
  const minute = positiveModulo(Math.floor(clockMinutes), cycleMinutes);
  const dayIndex = Math.floor(minute / WEATHER_MINUTES_PER_DAY);
  const minuteOfDay = minute - dayIndex * WEATHER_MINUTES_PER_DAY;
  return {
    dayIndex,
    minuteOfDay,
    date: new Date(Date.UTC(
      WEATHER_REF_YEAR,
      0,
      1 + dayIndex,
      Math.floor(minuteOfDay / 60),
      minuteOfDay % 60,
      0,
      0
    ))
  };
}

export function weatherLocalHour(clockMinutes, longitudeDeg) {
  if (![clockMinutes, longitudeDeg].every(Number.isFinite)) {
    throw new Error("Local weather hour inputs must be finite numbers");
  }
  if (longitudeDeg < -180 || longitudeDeg > 180) {
    throw new Error(`Longitude ${longitudeDeg} is outside -180..180`);
  }
  const localMinute = positiveModulo(
    Math.floor(clockMinutes + longitudeDeg * 4),
    WEATHER_MINUTES_PER_DAY
  );
  return Math.floor(localMinute / 60);
}

export function weatherClockAtLocalTime(clockMinutes, longitudeDeg, localHour, localMinute = 0) {
  if (![clockMinutes, longitudeDeg, localHour, localMinute].every(Number.isFinite)) {
    throw new Error("Local weather clock inputs must be finite numbers");
  }
  if (longitudeDeg < -180 || longitudeDeg > 180) {
    throw new Error(`Longitude ${longitudeDeg} is outside -180..180`);
  }
  if (localHour < 0 || localHour >= 24 || localMinute < 0 || localMinute >= 60) {
    throw new Error(`Invalid local time ${localHour}:${localMinute}`);
  }
  const localDayStart = Math.floor(clockMinutes / WEATHER_MINUTES_PER_DAY) * WEATHER_MINUTES_PER_DAY;
  return localDayStart + localHour * 60 + localMinute - longitudeDeg * 4;
}

export function dateToSubsolarLatDeg(date) {
  const utcMs = date.getTime();
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0, 0, 0, 0, 0);
  const dayOfYear = (utcMs - yearStart) / 86400000;
  return 23.4397 * Math.sin((2 * Math.PI / 365.25) * (dayOfYear - 81));
}

export function windAtLatLonDeg(latDeg, lonDeg, subsolarLatDeg, options = {}) {
  const baseStrength = options.baseStrength ?? 1;
  const seed = options.seed ?? 12345;
  const simMinute = options.simMinute ?? 0;
  const noiseDirectionRad = options.noiseDirectionRad ?? 0.22;
  const noiseStrength = options.noiseStrength ?? 0.32;
  const effLat = effectiveLatForSeason(latDeg, subsolarLatDeg);
  let { directionRad, strength } = baseWindAtLat(effLat);
  ({ directionRad, strength } = southChinaSeaMonsoonWind({
    latDeg,
    lonDeg,
    simMinute,
    directionRad,
    strength
  }));
  const directionJitter = coherentSignedWindNoise(
    seed,
    latDeg,
    lonDeg,
    simMinute,
    0x7e3779b9
  ) * noiseDirectionRad;
  const gust = coherentSignedWindNoise(seed, latDeg, lonDeg, simMinute, 0x9e3779b1);
  const lull = coherentWindNoise(seed, latDeg + 19.7, lonDeg - 73.3, simMinute + 997, 0x85ebca6b);
  const strengthMul = Math.max(0.18, 1 + gust * noiseStrength * 1.8);
  const lullCut = smoothstep(0.55, 1, lull) * noiseStrength * 1.25;

  directionRad += directionJitter;
  strength = clamp(strength * Math.max(0.14, strengthMul - lullCut) * baseStrength, MIN_WIND_STRENGTH, 1);
  return { directionRad, strength };
}

export function cloudLifecycleScaleOpacity(lifecycleU) {
  const x = Math.min(1, Math.max(0, lifecycleU));
  let envelope;
  if (x < 1 / 3) {
    const g = x * 3;
    envelope = 0.5 - 0.5 * Math.cos(Math.PI * g);
  } else if (x < 2 / 3) {
    envelope = 1;
  } else {
    const s = (x - 2 / 3) * 3;
    envelope = 0.5 + 0.5 * Math.cos(Math.PI * s * s);
  }
  return {
    scaleMul: 0.1 + envelope * 1.12,
    opacity: 0.26 + envelope * 0.7
  };
}

function decodeIceCycleSection(dv, offset, totalBytes, tileCount, label) {
  let o = offset;
  requireBytes(o, 16, totalBytes, `${label} counts`);
  const northAlwaysCount = dv.getUint32(o, true);
  o += 4;
  const northSeasonalCount = dv.getUint32(o, true);
  o += 4;
  const southAlwaysCount = dv.getUint32(o, true);
  o += 4;
  const southSeasonalCount = dv.getUint32(o, true);
  o += 4;

  const northAlways = readTileIdArray(dv, o, northAlwaysCount, totalBytes, tileCount, `${label} north always`);
  o = northAlways.offset;
  const northSeasonal = readTileIdArray(dv, o, northSeasonalCount, totalBytes, tileCount, `${label} north seasonal`);
  o = northSeasonal.offset;
  const northFreeze = readDayArray(dv, o, northSeasonalCount, totalBytes, `${label} north freeze`);
  o = northFreeze.offset;
  const northThaw = readDayArray(dv, o, northSeasonalCount, totalBytes, `${label} north thaw`);
  o = northThaw.offset;
  const southAlways = readTileIdArray(dv, o, southAlwaysCount, totalBytes, tileCount, `${label} south always`);
  o = southAlways.offset;
  const southSeasonal = readTileIdArray(dv, o, southSeasonalCount, totalBytes, tileCount, `${label} south seasonal`);
  o = southSeasonal.offset;
  const southFreeze = readDayArray(dv, o, southSeasonalCount, totalBytes, `${label} south freeze`);
  o = southFreeze.offset;
  const southThaw = readDayArray(dv, o, southSeasonalCount, totalBytes, `${label} south thaw`);
  o = southThaw.offset;

  return {
    offset: o,
    cycle: {
      tileCount,
      northAlwaysTileIds: northAlways.values,
      northSeasonalTileIds: northSeasonal.values,
      northFreezeDayOfYear: northFreeze.values,
      northThawDayOfYear: northThaw.values,
      southAlwaysTileIds: southAlways.values,
      southSeasonalTileIds: southSeasonal.values,
      southFreezeDayOfYear: southFreeze.values,
      southThawDayOfYear: southThaw.values
    }
  };
}

function readTileIdArray(dv, offset, count, totalBytes, tileCount, label) {
  requireBytes(offset, count * 4, totalBytes, label);
  const values = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const tileId = dv.getUint32(offset + i * 4, true);
    if (tileId >= tileCount) throw new Error(`${label} tile id ${tileId} is out of range`);
    values[i] = tileId;
  }
  return { values, offset: offset + count * 4 };
}

function readDayArray(dv, offset, count, totalBytes, label) {
  requireBytes(offset, count * 2, totalBytes, label);
  const values = new Uint16Array(count);
  for (let i = 0; i < count; i++) {
    const day = dv.getUint16(offset + i * 2, true);
    if (day > WEATHER_DAYS) throw new Error(`${label} day ${day} is outside 0..${WEATHER_DAYS}`);
    values[i] = day;
  }
  return { values, offset: offset + count * 2 };
}

function fillAlwaysIce(tileIds, outMask) {
  for (let i = 0; i < tileIds.length; i++) outMask[tileIds[i]] = 255;
}

function fillSeasonalIce(tileIds, freezeDays, thawDays, day, outMask) {
  for (let i = 0; i < tileIds.length; i++) {
    if (isSeaIceActiveOnDay(freezeDays[i], thawDays[i], day)) outMask[tileIds[i]] = 255;
  }
}

function normalizeDayIndex(day) {
  return positiveModulo(Math.floor(day), WEATHER_DAYS);
}

function positiveModulo(value, divisor) {
  const m = value % divisor;
  return m < 0 ? m + divisor : m;
}

function requireMagic(u8, magic, label) {
  for (let i = 0; i < magic.length; i++) {
    if (u8[i] !== magic.charCodeAt(i)) {
      throw new Error(`Invalid ${label} magic; expected ${magic}`);
    }
  }
}

function requireBytes(offset, byteLength, totalBytes, label) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0 || offset + byteLength > totalBytes) {
    throw new Error(`Malformed ${label}: need ${byteLength} bytes at ${offset}, file has ${totalBytes}`);
  }
}

function skipBytes(offset, byteLength, totalBytes, label) {
  requireBytes(offset, byteLength, totalBytes, label);
  return offset + byteLength;
}

function baseWindAtLat(latDeg) {
  const absLat = Math.min(90, Math.abs(latDeg));
  const hemisphere = latDeg >= 0 ? 1 : -1;
  const equatorialHemisphere = smoothstep(-8, 8, latDeg) * 2 - 1;
  const tradeDir = Math.PI * 0.25 * equatorialHemisphere;
  const westerlyDir = hemisphere > 0 ? -Math.PI * 0.75 : Math.PI * 0.75;
  const polarDir = hemisphere > 0 ? Math.PI * 0.12 : -Math.PI * 0.12;

  const tradeStrength = 0.34 + 0.22 * (1 - smoothstep(0, 22, absLat));
  const westerlyStrength = 0.4 + 0.22 * Math.exp(-Math.pow((absLat - 42) / 15, 2));
  const polarStrength = 0.2 + 0.13 * smoothstep(60, 85, absLat);

  if (absLat <= 18) return { directionRad: tradeDir, strength: tradeStrength };
  if (absLat < 34) {
    const blend = smoothstep(18, 34, absLat);
    return {
      directionRad: lerpAngleRad(tradeDir, westerlyDir, blend),
      strength: lerp(tradeStrength, westerlyStrength, blend)
    };
  }
  if (absLat <= 52) return { directionRad: westerlyDir, strength: westerlyStrength };
  if (absLat < 68) {
    const blend = smoothstep(52, 68, absLat);
    return {
      directionRad: lerpAngleRad(westerlyDir, polarDir, blend),
      strength: lerp(westerlyStrength, polarStrength, blend)
    };
  }
  return { directionRad: polarDir, strength: polarStrength };
}

function effectiveLatForSeason(latDeg, subsolarLatDeg) {
  return latDeg - subsolarLatDeg * 0.4;
}

function southChinaSeaMonsoonWind({
  latDeg,
  lonDeg,
  simMinute,
  directionRad,
  strength
}) {
  const longitude = normalizeLongitudeDeg(lonDeg);
  const latitudeWeight = smoothstep(-6, 5, latDeg) * (1 - smoothstep(24, 31, latDeg));
  const longitudeWeight = smoothstep(95, 105, longitude) * (1 - smoothstep(122, 132, longitude));
  const spatialWeight = latitudeWeight * longitudeWeight;
  if (spatialWeight <= 0) return { directionRad, strength };

  const dayOfYear = positiveModulo(simMinute, WIND_YEAR_MINUTES) / WEATHER_MINUTES_PER_DAY;
  const summerWeight = smoothstep(112, 160, dayOfYear) * (1 - smoothstep(270, 315, dayOfYear));
  const winterWeight = Math.max(
    1 - smoothstep(45, 105, dayOfYear),
    smoothstep(290, 335, dayOfYear)
  );
  const summerInfluence = spatialWeight * summerWeight;
  const winterInfluence = spatialWeight * winterWeight;
  directionRad = lerpAngleRad(directionRad, -Math.PI * 0.75, summerInfluence);
  strength = lerp(strength, 0.52, summerInfluence);
  directionRad = lerpAngleRad(directionRad, Math.PI * 0.25, winterInfluence);
  strength = lerp(strength, 0.46, winterInfluence);
  return { directionRad, strength };
}

function normalizeLongitudeDeg(longitudeDeg) {
  return positiveModulo(longitudeDeg + 180, 360) - 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngleRad(from, to, t) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}

function u32Hash(parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function unitFromHash(parts) {
  return u32Hash(parts) / 0xffffffff;
}

function windLatticeNoise(seed, latCell, lonCell, timeCell, salt) {
  return unitFromHash([seed, latCell, lonCell, timeCell, salt]);
}

function coherentWindNoise(seed, latDeg, lonDeg, simMinute, salt) {
  const latPos = clamp(latDeg + 90, 0, 180) / WIND_LAT_CELL_DEG;
  const lat0 = Math.min(WIND_LAT_CELLS, Math.floor(latPos));
  const lat1 = Math.min(WIND_LAT_CELLS, lat0 + 1);
  const latU = smoothstep(0, 1, latPos - lat0);

  const lonWrapped = positiveModulo(lonDeg + 180, 360);
  const lonPos = lonWrapped / WIND_LON_CELL_DEG;
  const lon0 = Math.floor(lonPos) % WIND_LON_CELLS;
  const lon1 = (lon0 + 1) % WIND_LON_CELLS;
  const lonU = smoothstep(0, 1, lonPos - Math.floor(lonPos));

  const minute = positiveModulo(Math.floor(simMinute), WIND_YEAR_MINUTES);
  const timePos = minute / WIND_TIME_CELL_MINUTES;
  const time0 = Math.floor(timePos) % WIND_TIME_CELLS;
  const time1 = (time0 + 1) % WIND_TIME_CELLS;
  const timeU = smoothstep(0, 1, timePos - Math.floor(timePos));

  const n000 = windLatticeNoise(seed, lat0, lon0, time0, salt);
  const n010 = windLatticeNoise(seed, lat1, lon0, time0, salt);
  const n100 = windLatticeNoise(seed, lat0, lon1, time0, salt);
  const n110 = windLatticeNoise(seed, lat1, lon1, time0, salt);
  const n001 = windLatticeNoise(seed, lat0, lon0, time1, salt);
  const n011 = windLatticeNoise(seed, lat1, lon0, time1, salt);
  const n101 = windLatticeNoise(seed, lat0, lon1, time1, salt);
  const n111 = windLatticeNoise(seed, lat1, lon1, time1, salt);

  const a0 = lerp(lerp(n000, n100, lonU), lerp(n010, n110, lonU), latU);
  const a1 = lerp(lerp(n001, n101, lonU), lerp(n011, n111, lonU), latU);
  return lerp(a0, a1, timeU);
}

function coherentSignedWindNoise(seed, latDeg, lonDeg, simMinute, salt) {
  return coherentWindNoise(seed, latDeg, lonDeg, simMinute, salt) * 2 - 1;
}
