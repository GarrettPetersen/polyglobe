import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCAL_SAVE_STORAGE_KEY,
  clearLocalSave,
  readLocalSave,
  writeLocalSave
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
