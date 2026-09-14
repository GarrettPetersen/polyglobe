import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  PLATFORM_CLIP_PRIORITY,
  PLATFORM_CLOUD_FILE,
  PLATFORM_CLOUD_STORAGE_KEYS,
  PLATFORM_TIMELINE_MODE,
  addPlatformTimelineEvent,
  createPlatformActivityPublisher,
  createPlatformCloudSync,
  currentPlatformGameLanguage,
  hydratePlatformCloudStorage,
  parseCloudEnvelope,
  platformServicesAdapter,
  serializeCloudEnvelope,
  updatePlatformStats,
  validatePlatformCapabilities
} from "./platformServices.js";

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

const legacyCloudProfile = readFileSync(new URL("./test-fixtures/steam-cloud-v1.json", import.meta.url), "utf8");
const battleRecordsKey = "marque-and-reprisal.historical-battle-records";

test("frozen legacy Cloud profiles migrate idempotently without erasing local battle history", async () => {
  const migrated = parseCloudEnvelope(legacyCloudProfile);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.values[battleRecordsKey], null);
  assert.deepEqual(parseCloudEnvelope(JSON.stringify(migrated)), migrated);
  for (const records of [null, "local-battle-history"]) {
    const storage = memoryStorage(records === null ? {} : { [battleRecordsKey]: records });
    await hydratePlatformCloudStorage(storage, bridge({ readCloudFile: async () => legacyCloudProfile }));
    assert.equal(storage.getItem(battleRecordsKey), records);
    assert.equal(storage.getItem("marque-and-reprisal.save"), "frozen-save-payload");
    assert.equal(JSON.parse(serializeCloudEnvelope(storage, 1234)).version, 3);
  }
});

test("later v1 Cloud records remain authoritative, including explicit deletion", async () => {
  for (const records of [null, "cloud-battle-history"]) {
    const profile = JSON.parse(legacyCloudProfile);
    profile.values[battleRecordsKey] = records;
    const storage = memoryStorage({ [battleRecordsKey]: "local-history" });
    await hydratePlatformCloudStorage(storage, bridge({ readCloudFile: async () => JSON.stringify(profile) }));
    assert.equal(storage.getItem(battleRecordsKey), records);
  }
});

test("Cloud migration rejects malformed profiles before mutating local storage", async () => {
  const malformed = [];
  for (const key of Object.keys(JSON.parse(legacyCloudProfile).values)) {
    const profile = JSON.parse(legacyCloudProfile);
    delete profile.values[key];
    malformed.push(profile);
  }
  malformed.push({ ...JSON.parse(legacyCloudProfile), version: 2 });
  malformed.push({ ...JSON.parse(legacyCloudProfile), version: 4 });
  const invalidRecords = JSON.parse(legacyCloudProfile);
  invalidRecords.values[battleRecordsKey] = 42;
  malformed.push(invalidRecords);
  for (const profile of malformed) {
    const storage = memoryStorage({ "marque-and-reprisal.save": "local-save" });
    await assert.rejects(hydratePlatformCloudStorage(storage, bridge({
      readCloudFile: async () => JSON.stringify(profile)
    })));
    assert.equal(storage.getItem("marque-and-reprisal.save"), "local-save");
  }
});

function bridge(overrides = {}) {
  return {
    platformId: "steam",
    getCapabilities: async () => ({
      achievements: true,
      cloud: true,
      input: true,
      richPresence: true,
      screenshots: true,
      stats: true,
      timeline: true
    }),
    getCurrentGameLanguage: async () => "english",
    readCloudFile: async () => null,
    writeCloudFile: async () => {},
    setRichPresence: async () => {},
    setTimelineState: async () => {},
    addTimelineEvent: async () => {},
    triggerScreenshot: async () => {},
    updateStats: async () => {},
    onPauseRequested: () => {},
    toggleFullscreen: async () => true,
    quitGame: async () => {},
    ...overrides
  };
}

test("browser builds have no platform adapter", () => {
  assert.equal(platformServicesAdapter({}), null);
});

test("installed Steam bridges must expose every shipping capability", async () => {
  const installed = bridge();
  assert.equal(platformServicesAdapter({ marqueSteamPlatform: installed }), installed);
  assert.equal((await validatePlatformCapabilities(installed)).timeline, true);
  assert.equal(await currentPlatformGameLanguage(installed), "english");
  await assert.rejects(
    validatePlatformCapabilities(bridge({ getCapabilities: async () => ({ achievements: true }) })),
    /capability is invalid: cloud/
  );
  await assert.rejects(
    currentPlatformGameLanguage(bridge({ getCurrentGameLanguage: async () => "" })),
    /invalid game language/
  );
});

test("demo bridges keep Cloud but disable Steam progression services", async () => {
  const capabilities = await validatePlatformCapabilities(bridge({
    getCapabilities: async () => ({
      achievements: false,
      cloud: true,
      input: true,
      richPresence: true,
      screenshots: true,
      stats: false,
      timeline: true
    })
  }));
  assert.equal(capabilities.cloud, true);
  assert.equal(capabilities.achievements, false);
  assert.equal(capabilities.stats, false);
  await assert.rejects(
    validatePlatformCapabilities(bridge({
      getCapabilities: async () => ({
        achievements: false,
        cloud: true,
        input: true,
        richPresence: true,
        screenshots: true,
        stats: true,
        timeline: true
      })
    })),
    /must be enabled together/
  );
});

test("Steam builds remain playable when the user disables Cloud", async () => {
  const capabilities = await validatePlatformCapabilities(bridge({
    getCapabilities: async () => ({
      achievements: true,
      cloud: false,
      input: true,
      richPresence: true,
      screenshots: true,
      stats: true,
      timeline: true
    })
  }));
  assert.equal(capabilities.cloud, false);
});

test("Steam Cloud envelopes preserve every persistent game key", async () => {
  const original = memoryStorage(Object.fromEntries(
    PLATFORM_CLOUD_STORAGE_KEYS.map((key, index) => [key, `value-${index}`])
  ));
  const serialized = serializeCloudEnvelope(original, 1234);
  assert.equal(parseCloudEnvelope(serialized).savedAt, 1234);
  const restored = memoryStorage();
  const result = await hydratePlatformCloudStorage(restored, bridge({
    readCloudFile: async (name) => {
      assert.equal(name, PLATFORM_CLOUD_FILE);
      return serialized;
    }
  }));
  assert.equal(result.source, "steam-cloud");
  for (const key of PLATFORM_CLOUD_STORAGE_KEYS) {
    assert.equal(restored.getItem(key), original.getItem(key));
  }
});

test("cloud writes coalesce changes made during an active upload", async () => {
  const storage = memoryStorage();
  const uploads = [];
  let releaseFirst;
  const firstUpload = new Promise((resolve) => { releaseFirst = resolve; });
  const sync = createPlatformCloudSync(storage, bridge({
    writeCloudFile: async (_name, serialized) => {
      uploads.push(parseCloudEnvelope(serialized));
      if (uploads.length === 1) await firstUpload;
    }
  }), { now: () => uploads.length + 100 });
  storage.setItem(PLATFORM_CLOUD_STORAGE_KEYS[0], "one");
  sync.request(PLATFORM_CLOUD_STORAGE_KEYS[0]);
  storage.setItem(PLATFORM_CLOUD_STORAGE_KEYS[0], "two");
  sync.request(PLATFORM_CLOUD_STORAGE_KEYS[0]);
  releaseFirst();
  await sync.flush();
  assert.equal(uploads.length, 2);
  assert.equal(uploads[1].values[PLATFORM_CLOUD_STORAGE_KEYS[0]], "two");
});

test("presence is deduplicated while timeline events remain explicit", async () => {
  const calls = [];
  const installed = bridge({
    setRichPresence: async (value) => calls.push(["presence", value]),
    setTimelineState: async (value) => calls.push(["state", value]),
    addTimelineEvent: async (value) => calls.push(["event", value])
  });
  const publisher = createPlatformActivityPublisher(installed);
  const activity = {
    presence: { steam_display: "#Status_Sailing", ship: "Caravel" },
    timeline: { description: "Sailing a Caravel", mode: PLATFORM_TIMELINE_MODE.PLAYING }
  };
  assert.equal(await publisher.publish(activity), true);
  assert.equal(await publisher.publish(activity), false);
  await addPlatformTimelineEvent(installed, {
    title: "New discovery",
    description: "Charted Mount Fuji",
    icon: "steam_star",
    priority: 500,
    durationSeconds: 0,
    clipPriority: PLATFORM_CLIP_PRIORITY.STANDARD
  });
  assert.deepEqual(calls.map(([kind]) => kind), ["presence", "state", "event"]);
});

test("failed activity updates remain retryable", async () => {
  let presenceAttempts = 0;
  const installed = bridge({
    setRichPresence: async () => {
      presenceAttempts += 1;
      if (presenceAttempts === 1) throw new Error("Steam unavailable");
    }
  });
  const publisher = createPlatformActivityPublisher(installed);
  const activity = {
    presence: { steam_display: "#Status_MainMenu" },
    timeline: { description: "In the main menu", mode: PLATFORM_TIMELINE_MODE.MENUS }
  };
  await assert.rejects(publisher.publish(activity), /Steam unavailable/);
  assert.equal(await publisher.publish(activity), true);
  assert.equal(presenceAttempts, 2);
});

test("Steam stat updates are validated and browser builds remain inert", async () => {
  const updates = [];
  const installed = bridge({
    updateStats: async (values) => updates.push(values)
  });
  assert.equal(await updatePlatformStats(installed, { MAX_VOYAGE_DISCOVERIES: 4 }), true);
  assert.deepEqual(updates, [{ MAX_VOYAGE_DISCOVERIES: 4 }]);
  assert.equal(await updatePlatformStats(null, { MAX_VOYAGE_DISCOVERIES: 4 }), false);
  await assert.rejects(
    updatePlatformStats(installed, { "bad stat": 4 }),
    /Invalid Steam stat entry/
  );
  await assert.rejects(
    updatePlatformStats(installed, { MAX_VOYAGE_DISCOVERIES: 1.5 }),
    /Invalid Steam stat entry/
  );
});

test("v2 profiles migrate without deleting the new demo slot", async () => {
  const profile = JSON.parse(serializeCloudEnvelope(memoryStorage(), 1234));
  profile.version = 2;
  delete profile.values["marque-and-reprisal.demo-save"];
  const store = memoryStorage({ "marque-and-reprisal.demo-save": "demo-voyage" });
  await hydratePlatformCloudStorage(store, bridge({ readCloudFile: async () => JSON.stringify(profile) }));
  assert.equal(store.getItem("marque-and-reprisal.demo-save"), "demo-voyage");
  const migrated = parseCloudEnvelope(JSON.stringify(profile));
  assert.equal(migrated.version, 3);
  assert.deepEqual(parseCloudEnvelope(JSON.stringify(migrated)), migrated);
});

test("quit flush retries failed background cloud writes and fails if still unavailable", async () => {
  let available = false;
  let writes = 0;
  const sync = createPlatformCloudSync(memoryStorage(), bridge({ writeCloudFile: async () => {
    writes += 1;
    if (!available) throw new Error("offline");
  } }));
  await assert.rejects(sync.request(PLATFORM_CLOUD_STORAGE_KEYS[0]), /offline/);
  await assert.rejects(sync.flush(), /offline/);
  assert.equal(writes, 2);
  available = true;
  await sync.flush();
  assert.equal(writes, 3);
  await sync.flush();
  assert.equal(writes, 3);
});
