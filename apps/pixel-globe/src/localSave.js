import { gameStorage } from "./gameStorage.js";

export const LOCAL_SAVE_STORAGE_KEY = "marque-and-reprisal.save";
export const LOCAL_SAVE_VERSION = 1;
export const LOCAL_SAVE_MODE_FULL = "full";
export const LOCAL_SAVE_MODE_ECONOMY = "economy";
export const LOCAL_SAVE_MODE_CORE = "core";

export function writeLocalSave(payload, { storage = defaultStorage(), savedAt = Date.now() } = {}) {
  const save = createLocalSave(payload, savedAt);
  const serialized = JSON.stringify(save);
  storage.setItem(LOCAL_SAVE_STORAGE_KEY, serialized);
  const persistedSerialized = storage.getItem(LOCAL_SAVE_STORAGE_KEY);
  if (persistedSerialized !== serialized) {
    throw localSaveWriteError(
      "Local save storage did not preserve the newly written voyage",
      "write-verification",
      serializedByteLength(serialized)
    );
  }
  const persisted = JSON.parse(persistedSerialized);
  validateLocalSave(persisted);
  return persisted;
}

export function writeLocalSaveWithRecovery(
  payload,
  { storage = defaultStorage(), savedAt = Date.now() } = {}
) {
  const candidates = localSaveCandidates(payload);
  const attempts = [];
  let capacityError = null;

  for (const candidate of candidates) {
    try {
      const save = writeLocalSave(candidate.payload, { storage, savedAt });
      return {
        save,
        mode: candidate.mode,
        byteLength: serializedByteLength(JSON.stringify(save)),
        attempts: Object.freeze(attempts)
      };
    } catch (error) {
      const normalized = asError(error);
      attempts.push(Object.freeze({
        mode: candidate.mode,
        byteLength: localSaveByteLength(candidate.payload, savedAt),
        error: normalized
      }));
      if (!isLocalSaveCapacityError(normalized)) throw normalized;
      capacityError = normalized;
    }
  }

  const error = localSaveWriteError(
    "Local save exceeds available browser storage even after removing reconstructible world traffic",
    "capacity",
    attempts.at(-1)?.byteLength || 0
  );
  error.cause = capacityError;
  error.attempts = Object.freeze(attempts);
  throw error;
}

export function localSaveByteLength(payload, savedAt = Date.now()) {
  return serializedByteLength(JSON.stringify(createLocalSave(payload, savedAt)));
}

export function isLocalSaveCapacityError(error) {
  if (!error || typeof error !== "object") return false;
  if (error.localSaveCode === "write-verification" || error.localSaveCode === "capacity") return true;
  return [
    "QuotaExceededError",
    "NS_ERROR_DOM_QUOTA_REACHED"
  ].includes(error.name) || error.code === 22 || error.code === 1014;
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
  if (storage.getItem(LOCAL_SAVE_STORAGE_KEY) !== null) {
    throw new Error("Local save slot remained occupied after deletion");
  }
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
  for (const key of ["gameState", "playerShip", "worldClock"]) {
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
  return gameStorage;
}

function localSaveCandidates(payload) {
  validateSavePayload(payload);
  const {
    economy,
    landTrade: _landTrade,
    npcRoutes: _npcRoutes,
    ...core
  } = payload;
  const candidates = [{
    mode: saveModeForPayload(payload),
    payload
  }];
  if (economy) {
    candidates.push({
      mode: LOCAL_SAVE_MODE_ECONOMY,
      payload: { ...core, economy }
    });
  }
  candidates.push({
    mode: LOCAL_SAVE_MODE_CORE,
    payload: core
  });

  const seen = new Set();
  return candidates.filter((candidate) => {
    const signature = [
      Boolean(candidate.payload.economy),
      Boolean(candidate.payload.landTrade),
      Boolean(candidate.payload.npcRoutes)
    ].join("|");
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function saveModeForPayload(payload) {
  if (payload.economy && payload.landTrade && payload.npcRoutes) return LOCAL_SAVE_MODE_FULL;
  if (payload.economy) return LOCAL_SAVE_MODE_ECONOMY;
  return LOCAL_SAVE_MODE_CORE;
}

function localSaveWriteError(message, code, byteLength) {
  const error = new Error(message);
  error.name = "LocalSaveWriteError";
  error.localSaveCode = code;
  error.byteLength = byteLength;
  return error;
}

function serializedByteLength(serialized) {
  if (typeof TextEncoder === "function") return new TextEncoder().encode(serialized).byteLength;
  return Buffer.byteLength(serialized, "utf8");
}

function asError(value) {
  return value instanceof Error ? value : new Error(String(value));
}
