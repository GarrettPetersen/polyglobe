import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCAL_SAVE_STORAGE_KEY,
  clearLocalSave,
  isLocalSaveCapacityError,
  readLocalSave,
  writeLocalSave,
  writeLocalSaveWithRecovery
} from "./localSave.js";

test("local saves round trip through a single versioned slot", () => {
  const storage = memoryStorage();
  const payload = savePayload();
  const written = writeLocalSave(payload, { storage, savedAt: 123456 });
  const loaded = readLocalSave({ storage });

  assert.equal(written.version, 1);
  assert.equal(loaded.status, "ready");
  assert.deepEqual(loaded.save, written);
  assert.deepEqual(loaded.save.payload, payload);
});

test("the returned save and live payload cannot mutate each other or persisted storage", () => {
  const storage = memoryStorage();
  const payload = savePayload();
  const written = writeLocalSave(payload, { storage, savedAt: 123456 });

  payload.gameState.version = 99;
  assert.equal(written.payload.gameState.version, 8);

  written.payload.gameState.version = 77;
  const loaded = readLocalSave({ storage });
  assert.equal(loaded.status, "ready");
  assert.equal(loaded.save.payload.gameState.version, 8);
});

test("missing, malformed, and incompatible saves never crash loading", () => {
  const storage = memoryStorage();
  assert.equal(readLocalSave({ storage }).status, "empty");

  storage.setItem(LOCAL_SAVE_STORAGE_KEY, "not-json");
  assert.equal(readLocalSave({ storage }).status, "invalid");

  storage.setItem(LOCAL_SAVE_STORAGE_KEY, JSON.stringify({ version: 999, savedAt: 1, payload: {} }));
  const incompatible = readLocalSave({ storage });
  assert.equal(incompatible.status, "invalid");
  assert.match(incompatible.error.message, /Unsupported local save version/);
});

test("failed save reads preserve the serialized voyage for a later recovery", () => {
  const storage = memoryStorage();
  const serialized = JSON.stringify({ version: 999, savedAt: 1, payload: { voyage: "recover me" } });
  storage.setItem(LOCAL_SAVE_STORAGE_KEY, serialized);

  assert.equal(readLocalSave({ storage }).status, "invalid");
  assert.equal(storage.getItem(LOCAL_SAVE_STORAGE_KEY), serialized);
});

test("clearing a save leaves the slot empty", () => {
  const storage = memoryStorage();
  writeLocalSave(savePayload(), { storage, savedAt: 1 });
  clearLocalSave({ storage });
  assert.equal(readLocalSave({ storage }).status, "empty");
});

test("clearing a save fails loudly when storage does not delete the slot", () => {
  const storage = memoryStorage();
  writeLocalSave(savePayload(), { storage, savedAt: 1 });
  storage.removeItem = () => {};

  assert.throws(() => clearLocalSave({ storage }), /remained occupied/);
  assert.equal(readLocalSave({ storage }).status, "ready");
});

test("save writes fail loudly when storage silently keeps an older voyage", () => {
  const storage = memoryStorage();
  const previous = writeLocalSave(savePayload(), { storage, savedAt: 1 });
  storage.setItem = () => {};

  assert.throws(
    () => writeLocalSave({
      ...savePayload(),
      worldClock: { currentMinute: 300, voyageStartMinute: 100 }
    }, { storage, savedAt: 2 }),
    /did not preserve/
  );
  assert.deepEqual(readLocalSave({ storage }).save, previous);
});

test("capacity recovery keeps voyage core and economy while dropping world traffic", () => {
  const storage = capacityStorage(750);
  const payload = {
    ...savePayload(),
    landTrade: { version: 1, carts: [{ route: "x".repeat(500) }] },
    npcRoutes: { version: 2, ships: [{ plan: "y".repeat(500) }] }
  };
  const result = writeLocalSaveWithRecovery(payload, { storage, savedAt: 123456 });

  assert.equal(result.mode, "economy");
  assert.equal(result.save.payload.gameState.version, 8);
  assert.deepEqual(result.save.payload.economy, payload.economy);
  assert.equal(result.save.payload.landTrade, undefined);
  assert.equal(result.save.payload.npcRoutes, undefined);
  assert.equal(readLocalSave({ storage }).status, "ready");
});

test("capacity recovery can preserve the voyage when all derived state is too large", () => {
  const storage = capacityStorage(520);
  const payload = {
    ...savePayload(),
    economy: { version: 1, ports: ["e".repeat(500)] },
    landTrade: { version: 1, carts: ["l".repeat(500)] },
    npcRoutes: { version: 2, ships: ["n".repeat(500)] }
  };
  const result = writeLocalSaveWithRecovery(payload, { storage, savedAt: 123456 });

  assert.equal(result.mode, "core");
  assert.equal(result.save.payload.worldClock.currentMinute, 200);
  assert.equal(result.save.payload.economy, undefined);
  assert.equal(result.save.payload.landTrade, undefined);
  assert.equal(result.save.payload.npcRoutes, undefined);
});

test("capacity recovery preserves the previous voyage when even core cannot fit", () => {
  const storage = capacityStorage(600);
  const previous = writeLocalSave(savePayload(), { storage, savedAt: 1 });
  const oversized = {
    ...savePayload(),
    gameState: { version: 8, memory: "x".repeat(1000) },
    economy: { version: 1, ports: ["e".repeat(1000)] },
    npcRoutes: { version: 1, ships: ["n".repeat(1000)] }
  };

  assert.throws(
    () => writeLocalSaveWithRecovery(oversized, { storage, savedAt: 2 }),
    (error) => isLocalSaveCapacityError(error)
  );
  assert.deepEqual(readLocalSave({ storage }).save, previous);
});

function savePayload() {
  return {
    gameState: { version: 8 },
    playerShip: {
      typeSlug: "brigantine",
      tileId: 12,
      position: [1, 0, 0],
      heading: [0, 1, 0],
      targetHeading: [0, 1, 0],
      velocity: [0, 0, 0]
    },
    worldClock: { currentMinute: 200, voyageStartMinute: 100 },
    economy: { version: 1 },
    npcRoutes: { version: 1 },
    anchored: false
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function capacityStorage(maxCharacters) {
  const storage = memoryStorage();
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    const serialized = String(value);
    if (serialized.length > maxCharacters) {
      const error = new Error(`Storage quota exceeded: ${serialized.length}/${maxCharacters}`);
      error.name = "QuotaExceededError";
      throw error;
    }
    setItem(key, serialized);
  };
  return storage;
}
