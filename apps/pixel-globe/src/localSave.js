import { gameStorage, isStorageCapacityError } from "./gameStorage.js";
import {
  strFromU8,
  unzlibSync
} from "../node_modules/fflate/esm/browser.js";

export const LOCAL_SAVE_STORAGE_KEY = "marque-and-reprisal.save";
export const LOCAL_SAVE_VERSION = 2;
export const LOCAL_SAVE_MODE_FULL = "full";
export const LOCAL_SAVE_MODE_ECONOMY = "economy";
export const LOCAL_SAVE_MODE_CORE = "core";

const LEGACY_LOCAL_SAVE_VERSION = 1;
const LOCAL_SAVE_ENCODING_JSON = "json";
const LOCAL_SAVE_ENCODING_ZLIB = "zlib-base64";
const LOCAL_SAVE_COMPRESSION_MIN_BYTES = 512 * 1024;
const BASE64_CHUNK_BYTES = 0x8000;
let localSaveCompressionWorker = null;
let localSaveCompressionSequence = 0;
const localSaveCompressionRequests = new Map();

async function writeLocalSaveAttemptAsync(
  payload,
  { storage, savedAt, materializeSave = true, signal = null }
) {
  if (typeof materializeSave !== "boolean") {
    throw new Error("Local save materialization option must be boolean");
  }
  throwIfSaveAborted(signal);
  const save = createLocalSave(payload, savedAt);
  const serialized = await serializeLocalSaveAsync(save);
  throwIfSaveAborted(signal);
  return persistSerializedLocalSave(serialized, { storage, materializeSave });
}

function persistSerializedLocalSave(serialized, { storage, materializeSave }) {
  const byteLength = serializedByteLength(serialized);
  try {
    storage.setItem(LOCAL_SAVE_STORAGE_KEY, serialized);
  } catch (error) {
    const normalized = asError(error);
    if (!isStorageCapacityError(normalized)) throw normalized;
    const capacityError = localSaveWriteError(
      "Local save exceeds available browser storage",
      "capacity",
      byteLength
    );
    capacityError.cause = normalized;
    throw capacityError;
  }
  const persistedSerialized = storage.getItem(LOCAL_SAVE_STORAGE_KEY);
  if (persistedSerialized !== serialized) {
    throw localSaveWriteError(
      "Local save storage did not preserve the newly written voyage",
      "write-verification",
      byteLength
    );
  }
  if (!materializeSave) {
    return {
      save: null,
      byteLength
    };
  }
  const persisted = deserializeLocalSave(persistedSerialized);
  return {
    save: persisted,
    byteLength
  };
}

export async function writeLocalSaveWithRecoveryAsync(
  payload,
  {
    storage = defaultStorage(),
    savedAt = Date.now(),
    materializeSave = true,
    signal = null
  } = {}
) {
  if (typeof materializeSave !== "boolean") {
    throw new Error("Local save materialization option must be boolean");
  }
  validateAbortSignal(signal);
  const candidates = localSaveCandidates(payload);
  const attempts = [];
  let capacityError = null;

  for (const candidate of candidates) {
    throwIfSaveAborted(signal);
    try {
      const write = await writeLocalSaveAttemptAsync(candidate.payload, {
        storage,
        savedAt,
        materializeSave,
        signal
      });
      return {
        save: write.save,
        mode: candidate.mode,
        byteLength: write.byteLength,
        attempts: Object.freeze(attempts)
      };
    } catch (error) {
      const normalized = asError(error);
      if (normalized.name === "AbortError") throw normalized;
      attempts.push(Object.freeze({
        mode: candidate.mode,
        byteLength: normalized.byteLength || 0,
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

export function isLocalSaveCapacityError(error) {
  if (!error || typeof error !== "object") return false;
  if (error.localSaveCode === "write-verification" || error.localSaveCode === "capacity") return true;
  return isStorageCapacityError(error);
}

export function readLocalSave({ storage = defaultStorage() } = {}) {
  try {
    const serialized = storage.getItem(LOCAL_SAVE_STORAGE_KEY);
    if (serialized === null) return { status: "empty", save: null, error: null };
    const save = deserializeLocalSave(serialized);
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
  if (!save || typeof save !== "object" || ![
    LEGACY_LOCAL_SAVE_VERSION,
    LOCAL_SAVE_VERSION
  ].includes(save.version)) {
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

async function serializeLocalSaveAsync(save) {
  validateLocalSave(save);
  if (save.version !== LOCAL_SAVE_VERSION) {
    throw new Error(`Cannot write legacy local save version: ${save.version}`);
  }
  const payloadJson = JSON.stringify(save.payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  if (payloadBytes.byteLength < LOCAL_SAVE_COMPRESSION_MIN_BYTES) {
    return jsonLocalSaveEnvelope(save, payloadJson);
  }
  const uncompressedByteLength = payloadBytes.byteLength;
  const compressedData = await compressSaveBytes(payloadBytes);
  return compressedLocalSaveEnvelope(save, uncompressedByteLength, compressedData);
}

function jsonLocalSaveEnvelope(save, payloadJson) {
  return [
    `{"version":${save.version}`,
    `,"savedAt":${save.savedAt}`,
    `,"encoding":"${LOCAL_SAVE_ENCODING_JSON}"`,
    `,"payload":${payloadJson}}`
  ].join("");
}

function compressedLocalSaveEnvelope(save, uncompressedByteLength, compressedData) {
  return JSON.stringify({
    version: save.version,
    savedAt: save.savedAt,
    encoding: LOCAL_SAVE_ENCODING_ZLIB,
    uncompressedByteLength,
    data: compressedData
  });
}

async function compressSaveBytes(bytes) {
  if (typeof Worker !== "function") return bytesToBase64(await compressSaveBytesInline(bytes));
  const worker = ensureLocalSaveCompressionWorker();
  const id = ++localSaveCompressionSequence;
  const response = new Promise((resolve, reject) => {
    localSaveCompressionRequests.set(id, { resolve, reject });
  });
  worker.postMessage({ id, bytes: bytes.buffer }, [bytes.buffer]);
  return response;
}

async function compressSaveBytesInline(bytes) {
  if (typeof CompressionStream !== "function") {
    throw new Error("Browser compression is unavailable for the local save");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function ensureLocalSaveCompressionWorker() {
  if (localSaveCompressionWorker) return localSaveCompressionWorker;
  const worker = new Worker(new URL("./localSaveCompressionWorker.js", import.meta.url), {
    type: "module"
  });
  worker.addEventListener("message", handleLocalSaveCompressionMessage);
  worker.addEventListener("error", handleLocalSaveCompressionError);
  localSaveCompressionWorker = worker;
  return worker;
}

function handleLocalSaveCompressionMessage(event) {
  const request = localSaveCompressionRequests.get(event.data?.id);
  if (!request) throw new Error(`Unknown local save compression response: ${event.data?.id}`);
  localSaveCompressionRequests.delete(event.data.id);
  if (typeof event.data.error === "string") {
    request.reject(new Error(`Local save compression failed: ${event.data.error}`));
    return;
  }
  if (typeof event.data.data !== "string" || event.data.data.length === 0) {
    request.reject(new Error("Local save compression returned no data"));
    return;
  }
  request.resolve(event.data.data);
}

function handleLocalSaveCompressionError(event) {
  const error = new Error(`Local save compression worker failed: ${event.message || "unknown error"}`);
  for (const request of localSaveCompressionRequests.values()) request.reject(error);
  localSaveCompressionRequests.clear();
  localSaveCompressionWorker?.terminate();
  localSaveCompressionWorker = null;
}

function deserializeLocalSave(serialized) {
  const stored = JSON.parse(serialized);
  if (stored?.version === LEGACY_LOCAL_SAVE_VERSION) {
    validateLocalSave(stored);
    return stored;
  }
  if (stored?.version !== LOCAL_SAVE_VERSION) {
    throw new Error(`Unsupported local save version: ${stored?.version ?? "missing"}`);
  }
  if (stored.encoding === LOCAL_SAVE_ENCODING_JSON) {
    const save = {
      version: stored.version,
      savedAt: stored.savedAt,
      payload: stored.payload
    };
    validateLocalSave(save);
    return save;
  }
  if (stored.encoding !== LOCAL_SAVE_ENCODING_ZLIB) {
    throw new Error(`Unsupported local save encoding: ${stored.encoding ?? "missing"}`);
  }
  if (!Number.isInteger(stored.uncompressedByteLength) || stored.uncompressedByteLength <= 0) {
    throw new Error(`Invalid local save uncompressed size: ${stored.uncompressedByteLength}`);
  }
  if (typeof stored.data !== "string" || stored.data.length === 0) {
    throw new Error("Compressed local save data is missing");
  }
  const payloadBytes = unzlibSync(base64ToBytes(stored.data));
  if (payloadBytes.byteLength !== stored.uncompressedByteLength) {
    throw new Error(
      `Compressed local save size mismatch: ${payloadBytes.byteLength}/${stored.uncompressedByteLength}`
    );
  }
  const save = {
    version: stored.version,
    savedAt: stored.savedAt,
    payload: JSON.parse(strFromU8(payloadBytes))
  };
  validateLocalSave(save);
  return save;
}

function bytesToBase64(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error("Local save compression produced invalid bytes");
  if (typeof btoa !== "function") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  if (typeof atob !== "function") return new Uint8Array(Buffer.from(base64, "base64"));
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function validateAbortSignal(signal) {
  if (signal !== null && (
    typeof signal !== "object" ||
    typeof signal.aborted !== "boolean" ||
    typeof signal.throwIfAborted !== "function"
  )) {
    throw new Error("Local save abort signal is invalid");
  }
}

function throwIfSaveAborted(signal) {
  validateAbortSignal(signal);
  signal?.throwIfAborted();
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
