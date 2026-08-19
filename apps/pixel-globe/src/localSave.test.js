import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCAL_SAVE_STORAGE_KEY,
  LOCAL_SAVE_VERSION,
  clearLocalSave,
  isLocalSaveCapacityError,
  readLocalSave,
  writeLocalSaveWithRecoveryAsync
} from "./localSave.js";

test("local saves round trip through a single versioned slot", async () => {
  const storage = memoryStorage();
  const payload = savePayload();
  const written = await writeSave(payload, { storage, savedAt: 123456 });
  const loaded = readLocalSave({ storage });

  assert.equal(written.version, LOCAL_SAVE_VERSION);
  assert.equal(loaded.status, "ready");
  assert.deepEqual(loaded.save, written);
  assert.deepEqual(loaded.save.payload, payload);
});

test("version 1 saves remain readable after compressed saves are introduced", () => {
  const storage = memoryStorage();
  const legacy = { version: 1, savedAt: 123456, payload: savePayload() };
  storage.setItem(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(legacy));

  const loaded = readLocalSave({ storage });

  assert.equal(loaded.status, "ready");
  assert.deepEqual(loaded.save, legacy);
});

test("compressed saves preserve a multi-megabyte long voyage within browser storage", async () => {
  const storage = capacityStorage(5 * 1024 * 1024);
  const payload = {
    ...savePayload(),
    gameState: {
      version: 8,
      politicalHistory: Array.from({ length: 45_000 }, (_, index) => ({
        id: index,
        simMinute: index * 1440,
        factionId: `faction-${index % 48}`,
        text: `The ruler received dispatch ${index} and recorded the voyage outcome.`
      }))
    }
  };
  const rawBytes = Buffer.byteLength(JSON.stringify({
    version: LOCAL_SAVE_VERSION,
    savedAt: 123456,
    payload
  }));

  const result = await writeLocalSaveWithRecoveryAsync(payload, {
    storage,
    savedAt: 123456
  });

  assert.ok(rawBytes > 5 * 1024 * 1024, `expected raw fixture over 5 MiB, got ${rawBytes}`);
  assert.equal(result.mode, "economy");
  assert.ok(result.byteLength < 1 * 1024 * 1024, `expected compressed save under 1 MiB, got ${result.byteLength}`);
  assert.deepEqual(readLocalSave({ storage }).save.payload, payload);
});

test("an aborted asynchronous save cannot overwrite the current voyage", async () => {
  const storage = memoryStorage();
  const previous = await writeSave(savePayload(), { storage, savedAt: 1 });
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    writeLocalSaveWithRecoveryAsync({
      ...savePayload(),
      worldClock: { currentMinute: 300, voyageStartMinute: 100 }
    }, { storage, savedAt: 2, signal: controller.signal }),
    { name: "AbortError" }
  );
  assert.deepEqual(readLocalSave({ storage }).save, previous);
});

test("the returned save and live payload cannot mutate each other or persisted storage", async () => {
  const storage = memoryStorage();
  const payload = savePayload();
  const written = await writeSave(payload, { storage, savedAt: 123456 });

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

test("clearing a save leaves the slot empty", async () => {
  const storage = memoryStorage();
  await writeSave(savePayload(), { storage, savedAt: 1 });
  clearLocalSave({ storage });
  assert.equal(readLocalSave({ storage }).status, "empty");
});

test("clearing a save fails loudly when storage does not delete the slot", async () => {
  const storage = memoryStorage();
  await writeSave(savePayload(), { storage, savedAt: 1 });
  storage.removeItem = () => {};

  assert.throws(() => clearLocalSave({ storage }), /remained occupied/);
  assert.equal(readLocalSave({ storage }).status, "ready");
});

test("save writes fail loudly when storage silently keeps an older voyage", async () => {
  const storage = memoryStorage();
  const previous = await writeSave(savePayload(), { storage, savedAt: 1 });
  storage.setItem = () => {};

  await assert.rejects(
    writeSave({
      ...savePayload(),
      worldClock: { currentMinute: 300, voyageStartMinute: 100 }
    }, { storage, savedAt: 2 }),
    (error) => isLocalSaveCapacityError(error) &&
      /did not preserve/.test(error.cause?.message || "")
  );
  assert.deepEqual(readLocalSave({ storage }).save, previous);
});

test("capacity recovery keeps voyage core and economy while dropping world traffic", async () => {
  const payload = {
    ...savePayload(),
    npcSurrenders: { version: 1, ships: [{ id: "ship-1" }] },
    landTrade: { version: 1, carts: [{ route: noise(12_000, 1) }] },
    npcRoutes: { version: 2, ships: [{ plan: noise(12_000, 2) }] }
  };
  const economyPayload = { ...payload };
  delete economyPayload.landTrade;
  delete economyPayload.npcRoutes;
  const storage = capacityStorage(Math.floor(
    (await serializedSaveLength(payload, 123456) +
      await serializedSaveLength(economyPayload, 123456)) / 2
  ));
  const result = await writeLocalSaveWithRecoveryAsync(payload, { storage, savedAt: 123456 });

  assert.equal(result.mode, "economy");
  assert.equal(result.save.payload.gameState.version, 8);
  assert.deepEqual(result.save.payload.economy, payload.economy);
  assert.deepEqual(result.save.payload.npcSurrenders, payload.npcSurrenders);
  assert.equal(result.save.payload.landTrade, undefined);
  assert.equal(result.save.payload.npcRoutes, undefined);
  assert.equal(readLocalSave({ storage }).status, "ready");
});

test("background saves can skip immediate reparsing while retaining exact persisted data", async () => {
  const storage = memoryStorage();
  const payload = savePayload();
  const result = await writeLocalSaveWithRecoveryAsync(payload, {
    storage,
    savedAt: 123456,
    materializeSave: false
  });

  assert.equal(result.mode, "economy");
  assert.equal(result.save, null);
  const loaded = readLocalSave({ storage });
  assert.equal(loaded.status, "ready");
  assert.deepEqual(loaded.save.payload, payload);
});

test("save materialization options fail loudly when malformed", async () => {
  await assert.rejects(
    writeLocalSaveWithRecoveryAsync(savePayload(), { materializeSave: "no" }),
    /materialization option must be boolean/
  );
});

test("capacity recovery can preserve the voyage when all derived state is too large", async () => {
  const payload = {
    ...savePayload(),
    npcSurrenders: { version: 1, ships: [{ id: "ship-1" }] },
    economy: { version: 1, ports: [noise(12_000, 3)] },
    landTrade: { version: 1, carts: [noise(12_000, 4)] },
    npcRoutes: { version: 2, ships: [noise(12_000, 5)] }
  };
  const corePayload = { ...payload };
  delete corePayload.economy;
  delete corePayload.landTrade;
  delete corePayload.npcRoutes;
  const economyPayload = { ...corePayload, economy: payload.economy };
  const storage = capacityStorage(Math.floor(
    (await serializedSaveLength(economyPayload, 123456) +
      await serializedSaveLength(corePayload, 123456)) / 2
  ));
  const result = await writeLocalSaveWithRecoveryAsync(payload, { storage, savedAt: 123456 });

  assert.equal(result.mode, "core");
  assert.equal(result.save.payload.worldClock.currentMinute, 200);
  assert.deepEqual(result.save.payload.npcSurrenders, payload.npcSurrenders);
  assert.equal(result.save.payload.economy, undefined);
  assert.equal(result.save.payload.landTrade, undefined);
  assert.equal(result.save.payload.npcRoutes, undefined);
});

test("capacity recovery preserves the previous voyage when even core cannot fit", async () => {
  const oversized = {
    ...savePayload(),
    gameState: { version: 8, memory: noise(20_000, 6) },
    economy: { version: 1, ports: [noise(20_000, 7)] },
    npcRoutes: { version: 1, ships: [noise(20_000, 8)] }
  };
  const previousSize = await serializedSaveLength(savePayload(), 1);
  const storage = capacityStorage(previousSize + 16);
  const previous = await writeSave(savePayload(), { storage, savedAt: 1 });

  await assert.rejects(
    writeLocalSaveWithRecoveryAsync(oversized, { storage, savedAt: 2 }),
    (error) => isLocalSaveCapacityError(error)
  );
  assert.deepEqual(readLocalSave({ storage }).save, previous);
});

async function writeSave(payload, options) {
  return (await writeLocalSaveWithRecoveryAsync(payload, options)).save;
}

async function serializedSaveLength(payload, savedAt) {
  const storage = memoryStorage();
  await writeLocalSaveWithRecoveryAsync(payload, { storage, savedAt, materializeSave: false });
  return storage.getItem(LOCAL_SAVE_STORAGE_KEY).length;
}

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

function noise(length, seed) {
  let state = seed >>> 0;
  let value = "";
  for (let index = 0; index < length; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    value += String.fromCharCode(33 + ((state >>> 0) % 90));
  }
  return value;
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
