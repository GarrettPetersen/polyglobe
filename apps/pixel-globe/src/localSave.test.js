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

test("clearing a save leaves the slot empty", () => {
  const storage = memoryStorage();
  writeLocalSave(savePayload(), { storage, savedAt: 1 });
  clearLocalSave({ storage });
  assert.equal(readLocalSave({ storage }).status, "empty");
});

function savePayload() {
  return {
    gameState: { version: 7 },
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
