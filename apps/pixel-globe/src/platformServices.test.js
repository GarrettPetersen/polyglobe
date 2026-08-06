import assert from "node:assert/strict";
import test from "node:test";

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
