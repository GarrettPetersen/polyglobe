export const LOCAL_SAVE_STORAGE_KEY = "marque-and-reprisal.save";
export const LOCAL_SAVE_VERSION = 1;

export function writeLocalSave(payload, { storage = defaultStorage(), savedAt = Date.now() } = {}) {
  const save = createLocalSave(payload, savedAt);
  storage.setItem(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(save));
  return save;
}

export function readLocalSave({ storage = defaultStorage() } = {}) {
  try {
    const serialized = storage.getItem(LOCAL_SAVE_STORAGE_KEY);
    if (serialized === null) return { status: "empty", save: null, error: null };
    const save = JSON.parse(serialized);
    validateLocalSave(save);
    return { status: "ready", save, error: null };
  } catch (error) {
    return { status: "invalid", save: null, error: asError(error) };
  }
}

export function clearLocalSave({ storage = defaultStorage() } = {}) {
  storage.removeItem(LOCAL_SAVE_STORAGE_KEY);
}

export function validateLocalSave(save) {
  if (!save || typeof save !== "object" || save.version !== LOCAL_SAVE_VERSION) {
    throw new Error(`Unsupported local save version: ${save?.version ?? "missing"}`);
  }
  if (!Number.isFinite(save.savedAt) || save.savedAt <= 0) {
    throw new Error(`Invalid local save timestamp: ${save.savedAt}`);
  }
  validateSavePayload(save.payload);
  return save;
}

function createLocalSave(payload, savedAt) {
  validateSavePayload(payload);
  if (!Number.isFinite(savedAt) || savedAt <= 0) {
    throw new Error(`Invalid local save timestamp: ${savedAt}`);
  }
  return {
    version: LOCAL_SAVE_VERSION,
    savedAt,
    payload
  };
}

function validateSavePayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Local save payload is missing");
  for (const key of ["gameState", "playerShip", "worldClock", "economy", "npcRoutes"]) {
    if (!payload[key] || typeof payload[key] !== "object") {
      throw new Error(`Local save payload is missing ${key}`);
    }
  }
  if (!Number.isFinite(payload.worldClock.currentMinute) ||
      !Number.isFinite(payload.worldClock.voyageStartMinute)) {
    throw new Error("Local save contains an invalid world clock");
  }
  if (typeof payload.anchored !== "boolean") throw new Error("Local save contains invalid anchor state");
  const ship = payload.playerShip;
  if (typeof ship.typeSlug !== "string" || ship.typeSlug === "" || !Number.isInteger(ship.tileId)) {
    throw new Error("Local save contains an invalid player ship");
  }
  for (const key of ["position", "heading", "targetHeading", "velocity"]) {
    if (!isFiniteVector(ship[key])) throw new Error(`Local save contains an invalid ship ${key}`);
  }
}

function isFiniteVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function defaultStorage() {
  if (typeof localStorage === "undefined") throw new Error("Local storage is unavailable");
  return localStorage;
}

function asError(value) {
  return value instanceof Error ? value : new Error(String(value));
}
