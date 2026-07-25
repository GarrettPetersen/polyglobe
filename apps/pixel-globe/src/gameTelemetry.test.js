import assert from "node:assert/strict";
import test from "node:test";

import {
  TELEMETRY_CONSENT_DENIED,
  TELEMETRY_CONSENT_GRANTED,
  TELEMETRY_CONSENT_STORAGE_KEY,
  TELEMETRY_INSTALLATION_STORAGE_KEY,
  TELEMETRY_QUEUE_STORAGE_KEY,
  createGameTelemetry,
  installationIsSampled,
  telemetryRuntimeChannel,
  voyageTelemetryPayload
} from "./gameTelemetry.js";

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values
  };
}

function sampledId() {
  for (let index = 0; index < 10_000; index++) {
    const candidate = `installation-${index}`;
    if (installationIsSampled(candidate)) return candidate;
  }
  throw new Error("Could not find deterministic sampled installation");
}

test("telemetry remains completely inert before consent and after refusal", async () => {
  const storage = memoryStorage();
  const requests = [];
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (...args) => {
      requests.push(args);
      return { ok: true };
    },
    randomId: () => "session-id",
    metadata: metadata()
  });
  telemetry.start();
  telemetry.captureCrash(new Error("not collected"));
  assert.equal(requests.length, 0);
  assert.equal(storage.values.has(TELEMETRY_INSTALLATION_STORAGE_KEY), false);

  telemetry.setConsent(false);
  assert.equal(telemetry.consentStatus, TELEMETRY_CONSENT_DENIED);
  assert.equal(storage.values.get(TELEMETRY_CONSENT_STORAGE_KEY), TELEMETRY_CONSENT_DENIED);
  telemetry.captureCrash(new Error("still not collected"));
  assert.equal(requests.length, 0);
});

test("routine sessions use the deterministic one-percent cohort", async () => {
  const installationId = sampledId();
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: installationId
  });
  const bodies = [];
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      bodies.push(JSON.parse(options.body));
      return { ok: true };
    },
    randomId: (() => {
      let serial = 0;
      return () => `event-${++serial}`;
    })(),
    now: () => 1_750_000_000_000,
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });
  telemetry.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(telemetry.routineSampled, true);
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].events[0].type, "session_start");
  assert.equal(bodies[0].events[0].payload.samplingWeight, 100);
});

test("crashes queue safely when the network is unavailable", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "not-in-routine-cohort"
  });
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async () => {
      throw new Error("offline");
    },
    randomId: (() => {
      let serial = 0;
      return () => `event-${++serial}`;
    })(),
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });
  telemetry.start();
  assert.equal(telemetry.captureCrash(new Error("boom"), { screen: "sailing" }), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const queue = JSON.parse(storage.values.get(TELEMETRY_QUEUE_STORAGE_KEY));
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, "crash");
  assert.equal(queue[0].payload.message, "boom");
});

test("the same crash is reported only once per page session", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "not-in-routine-cohort"
  });
  const requests = [];
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true };
    },
    randomId: (() => {
      let serial = 0;
      return () => `event-${++serial}`;
    })(),
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });
  telemetry.start();
  const crash = new Error("repeated frame failure");
  assert.equal(telemetry.captureCrash(crash, { screen: "sailing" }), true);
  assert.equal(telemetry.captureCrash(crash, { screen: "sailing" }), false);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].events.length, 1);
});

test("an unsampled installation retries an offline crash on its next session", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "not-in-routine-cohort",
    [TELEMETRY_QUEUE_STORAGE_KEY]: JSON.stringify([queuedCrash()])
  });
  const requests = [];
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true };
    },
    randomId: () => "session-id",
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });
  telemetry.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(telemetry.routineSampled, false);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].events[0].type, "crash");
});

test("voyage summaries expose bounded feature engagement without names or save data", () => {
  const payload = voyageTelemetryPayload({
    outcomeType: "victory",
    daysAtSea: 20,
    endingDoubloons: 12500,
    doubloonsEarned: 14000,
    mappedPercent: 4.2,
    discoveries: 3,
    visitedPorts: 8,
    completedQuests: 2,
    crewLost: 1,
    vessel: "Caravel"
  }, {
    activePlaySeconds: 3600,
    memory: {
      campaignGoal: { type: "explorer" },
      decisions: { "trade.sell.lisbon.cloves": 2, "fish.catch.cod": 1 },
      quests: { completed: { delivery: true } },
      animals: { encounterOrder: ["otter"] },
      panda: { status: "aboard" },
      achievements: {
        defeatedShipCount: 2,
        whalesKilled: 0,
        foundedCityIds: ["colony"],
        soldSpiceGoodIds: ["cloves"]
      }
    }
  });
  assert.deepEqual(payload.features, ["trade", "fish", "combat", "colonize", "side-quests", "animals", "panda"]);
  assert.equal(payload.mainQuest, "explorer");
  assert.equal(JSON.stringify(payload).includes("captain"), false);
});

test("runtime channels keep web, itch, local, and Steam reports separate", () => {
  assert.equal(telemetryRuntimeChannel({
    edition: "full",
    location: { protocol: "https:", hostname: "marque-and-reprisal.pages.dev" }
  }), "web-prototype");
  assert.equal(telemetryRuntimeChannel({
    edition: "demo",
    location: { protocol: "https:", hostname: "html-classic.itch.zone" }
  }), "itch-demo");
  assert.equal(telemetryRuntimeChannel({
    edition: "full",
    location: { protocol: "http:", hostname: "127.0.0.1" }
  }), "local");
  assert.equal(telemetryRuntimeChannel({
    edition: "full",
    platformId: "steam",
    location: { protocol: "file:", hostname: "" }
  }), "steam");
});

function metadata() {
  return {
    edition: "full",
    revision: "test",
    channel: "local",
    platform: "browser",
    locale: "en",
    gameStateVersion: 44
  };
}

function queuedCrash() {
  return {
    schemaVersion: 1,
    eventId: "queued-event",
    type: "crash",
    installationId: "not-in-routine-cohort",
    sessionId: "previous-session",
    occurredAt: "2026-07-25T00:00:00.000Z",
    metadata: metadata(),
    payload: {
      samplingWeight: 1,
      errorName: "Error",
      message: "offline crash",
      stack: "",
      screen: "sailing",
      mainQuest: "none",
      ship: "dhow"
    }
  };
}
