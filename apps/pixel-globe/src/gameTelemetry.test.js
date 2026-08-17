import assert from "node:assert/strict";
import test from "node:test";

import {
  TELEMETRY_CONSENT_DENIED,
  TELEMETRY_CONSENT_GRANTED,
  TELEMETRY_CONSENT_STORAGE_KEY,
  TELEMETRY_DIAGNOSTIC_COOLDOWNS_STORAGE_KEY,
  TELEMETRY_FREEZE_SIGNATURES_STORAGE_KEY,
  TELEMETRY_INSTALLATION_STORAGE_KEY,
  TELEMETRY_LAST_VOYAGE_START_STORAGE_KEY,
  TELEMETRY_LOW_FRAME_RATE_BUILDS_STORAGE_KEY,
  TELEMETRY_QUEUE_STORAGE_KEY,
  createGameTelemetry,
  freezeTelemetryPayload,
  lowFrameRateTelemetryPayload,
  shouldCaptureGlobalTelemetryError,
  telemetryRuntimeChannel,
  voyageStartTelemetryPayload,
  voyageTelemetryPayload
} from "./gameTelemetry.js";
import { captureVoyageStartProfile } from "./voyageStartProfile.js";

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values
  };
}

test("global telemetry ignores failures raised by injected browser extensions", () => {
  const metaMaskError = new Error("Failed to connect to MetaMask");
  metaMaskError.stack = "Error: Failed to connect to MetaMask\n" +
    "    at chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js:1:1";
  assert.equal(shouldCaptureGlobalTelemetryError(metaMaskError), false);
  assert.equal(shouldCaptureGlobalTelemetryError(
    new Error("Extension failed"),
    "moz-extension://example/injected.js"
  ), false);
  assert.equal(shouldCaptureGlobalTelemetryError(
    new Error("Failed to connect to MetaMask"),
    "https://pirates-of-the-pixel-globe.pages.dev/src/main.js"
  ), true);
});

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

test("every consenting installation submits routine sessions at unit weight", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "any-consenting-installation"
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
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].events[0].type, "session_start");
  assert.equal(bodies[0].events[0].payload.samplingWeight, 1);
});

test("session checkpoints report only explicitly recorded play in this page session", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "session-playtime"
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
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });

  telemetry.start();
  await nextTask();
  telemetry.recordActivePlaySeconds(12.5);
  assert.equal(telemetry.checkpoint(), true);
  await nextTask();

  const checkpoints = bodies.flatMap((body) => body.events)
    .filter((entry) => entry.type === "session_checkpoint");
  assert.equal(checkpoints.length, 1);
  assert.equal(checkpoints[0].payload.activePlaySeconds, 12.5);
  assert.equal(telemetry.checkpoint(), false);
});

test("session play rejects invalid durations", () => {
  const telemetry = createGameTelemetry({
    storage: memoryStorage(),
    metadata: metadata()
  });
  telemetry.start();
  assert.throws(
    () => telemetry.recordActivePlaySeconds(-1),
    /Invalid telemetry active play duration/
  );
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
  assert.equal(queue.length, 2);
  const crash = queue.find((entry) => entry.type === "crash");
  assert.equal(crash.payload.message, "boom");
});

test("historical battle crashes retain their battle screen in telemetry", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "historical-battle-installation"
  });
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async () => {
      throw new Error("offline");
    },
    randomId: (() => {
      let serial = 0;
      return () => `historical-event-${++serial}`;
    })(),
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });
  telemetry.start();
  assert.equal(telemetry.captureCrash(new Error("Lepanto failed"), {
    screen: "historical-battle:active"
  }), true);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const queue = JSON.parse(storage.values.get(TELEMETRY_QUEUE_STORAGE_KEY));
  const crash = queue.find((entry) => entry.type === "crash");
  assert.equal(crash.payload.screen, "historical-battle:active");
  assert.equal(crash.payload.message, "Lepanto failed");
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
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(requests.length, 2);
  assert.equal(
    requests.flatMap((request) => request.events).filter((entry) => entry.type === "crash").length,
    1
  );
});

test("protected stitch diagnostics use one persisted installation-wide cooldown", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "diagnostic-installation"
  });
  const requests = [];
  let currentTime = 1_750_000_000_000;
  const createTelemetry = () => createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true };
    },
    randomId: (() => {
      let serial = 0;
      return () => `diagnostic-event-${++serial}`;
    })(),
    now: () => currentTime,
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });
  const options = { key: "protected-chart-stitch", cooldownMs: 30 * 86_400_000 };
  const first = createTelemetry();
  first.start();
  assert.equal(first.captureDiagnostic(new Error("recovered stitch"), {
    screen: "chart-stitch-recovered"
  }, options), true);
  assert.equal(first.captureDiagnostic(new Error("different recovered edge"), {
    screen: "chart-stitch-recovered"
  }, options), false);
  await nextTask();

  currentTime += 29 * 86_400_000;
  const reloaded = createTelemetry();
  reloaded.start();
  assert.equal(reloaded.captureDiagnostic(new Error("recovered stitch"), {}, options), false);

  currentTime += 2 * 86_400_000;
  assert.equal(reloaded.captureDiagnostic(new Error("recovered stitch"), {}, options), true);
  await nextTask();
  const diagnostics = requests.flatMap((request) => request.events)
    .filter((entry) => entry.type === "diagnostic");
  assert.equal(diagnostics.length, 2);
  assert.equal(storage.values.has(TELEMETRY_DIAGNOSTIC_COOLDOWNS_STORAGE_KEY), true);
});

test("persistent low frame rate reports once per installation and build", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "slow-device"
  });
  const events = [];
  const createTelemetry = (revision) => createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      events.push(...JSON.parse(options.body).events);
      return successfulResponse();
    },
    randomId: (() => {
      let serial = 0;
      return () => `${revision}-event-${++serial}`;
    })(),
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: { ...metadata(), revision }
  });
  const context = lowFrameRateContext();
  const report = lowFrameRateReport();

  const first = createTelemetry("slow-build-a");
  first.start();
  await nextTask();
  assert.equal(first.recordLowFrameRate(report, context), true);
  assert.equal(first.recordLowFrameRate(report, context), false);
  await nextTask();

  const reloaded = createTelemetry("slow-build-a");
  reloaded.start();
  await nextTask();
  assert.equal(reloaded.recordLowFrameRate(report, context), false);

  const newBuild = createTelemetry("slow-build-b");
  newBuild.start();
  await nextTask();
  assert.equal(newBuild.recordLowFrameRate(report, context), true);
  await nextTask();

  const reports = events.filter((event) => event.type === "low_fps");
  assert.equal(reports.length, 2);
  assert.deepEqual(
    JSON.parse(storage.values.get(TELEMETRY_LOW_FRAME_RATE_BUILDS_STORAGE_KEY)),
    ["slow-build-a", "slow-build-b"]
  );
  assert.equal(reports[0].payload.stages[0].name, "render");
  assert.equal(reports[0].payload.visibleNpcShips, 17);
});

test("low frame rate payloads reject unbounded or unactionable data", () => {
  assert.throws(
    () => lowFrameRateTelemetryPayload({ ...lowFrameRateReport(), stages: [] }, lowFrameRateContext()),
    /actionable report/
  );
  assert.throws(
    () => lowFrameRateTelemetryPayload(lowFrameRateReport(), {
      ...lowFrameRateContext(),
      viewportWidth: 0
    }),
    /viewport width/
  );
});

test("foreground freezes report once per build, screen, and cause", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "frozen-device"
  });
  const events = [];
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      events.push(...JSON.parse(options.body).events);
      return successfulResponse();
    },
    randomId: (() => {
      let serial = 0;
      return () => `freeze-event-${++serial}`;
    })(),
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: { ...metadata(), revision: "freeze-build" }
  });
  telemetry.start();
  await nextTask();
  const report = freezeReport();
  const context = lowFrameRateContext();

  assert.equal(telemetry.recordFreeze(report, context), true);
  assert.equal(telemetry.recordFreeze(report, context), false);
  assert.equal(telemetry.recordFreeze(report, { ...context, screen: "anchored" }), true);
  await nextTask();

  const freezes = events.filter((event) => event.type === "freeze");
  assert.equal(freezes.length, 2);
  assert.equal(freezes[0].payload.gapMs, 1_850);
  assert.equal(freezes[0].payload.recentWork, "save.periodic");
  assert.equal(storage.values.has(TELEMETRY_FREEZE_SIGNATURES_STORAGE_KEY), true);
});

test("freeze payloads reject background-scale gaps and incomplete scene context", () => {
  assert.throws(
    () => freezeTelemetryPayload({ ...freezeReport(), gapMs: 60_000 }, lowFrameRateContext()),
    /freeze frame gap/
  );
  assert.throws(
    () => freezeTelemetryPayload(freezeReport(), { ...lowFrameRateContext(), viewportHeight: 0 }),
    /viewport height/
  );
});

test("a consenting installation retries an offline crash alongside its next routine session", async () => {
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
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].events.map((entry) => entry.type), ["crash", "session_start"]);
  assert.equal(requests[0].events[1].payload.samplingWeight, 1);
});

test("a voyage ending during an active request flushes as soon as that request completes", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "voyage-during-request"
  });
  const bodies = [];
  let releaseFirstRequest;
  const firstRequestPending = new Promise((resolve) => {
    releaseFirstRequest = resolve;
  });
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      bodies.push({
        ...JSON.parse(options.body),
        keepalive: options.keepalive
      });
      if (bodies.length === 1) await firstRequestPending;
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
  await nextTask();
  assert.equal(bodies.length, 1);
  assert.equal(telemetry.recordVoyage(voyageRecord(), voyageState("white-whale-revenge")), true);
  releaseFirstRequest();
  await nextTask();
  await nextTask();

  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[1].events.map((entry) => entry.type), ["voyage_end"]);
  assert.equal(bodies[1].events[0].payload.mainQuest, "white-whale-revenge");
  assert.equal(bodies[1].keepalive, true);
  assert.equal(storage.values.has(TELEMETRY_QUEUE_STORAGE_KEY), false);
});

test("a fresh voyage records its bounded starting profile", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "voyage-start"
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
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });

  telemetry.start();
  await nextTask();
  assert.equal(telemetry.recordVoyageStart(voyageStartState()), true);
  await nextTask();

  const start = bodies.flatMap((body) => body.events)
    .find((entry) => entry.type === "voyage_start");
  assert.ok(start);
  assert.equal(start.payload.mainQuest, "explorer");
  assert.equal(start.payload.faction, "portugal");
  assert.equal(start.payload.homePort, "Lisbon");
  assert.equal(start.payload.ship, "caravel");
  assert.equal(start.payload.startingCrew, 12);
});

test("a resumed voyage reports its captured opening profile once while a new voyage can force it", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "voyage-start-recovery"
  });
  const events = [];
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      events.push(...JSON.parse(options.body).events);
      return successfulResponse();
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
  await nextTask();
  const state = voyageStartState();
  assert.equal(telemetry.recordVoyageStart(state), true);
  await nextTask();
  assert.equal(telemetry.recordVoyageStart(state), true);
  await nextTask();
  assert.equal(events.filter((event) => event.type === "voyage_start").length, 1);
  assert.equal(storage.values.get(TELEMETRY_LAST_VOYAGE_START_STORAGE_KEY), state.voyageSeed);

  assert.equal(telemetry.recordVoyageStart(state, { force: true }), true);
  await nextTask();
  assert.equal(events.filter((event) => event.type === "voyage_start").length, 2);
});

test("a migrated voyage without an opening profile does not invent start data", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "voyage-start-legacy"
  });
  const events = [];
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      events.push(...JSON.parse(options.body).events);
      return successfulResponse();
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
  await nextTask();
  const state = voyageStartState();
  state.voyageStartProfile = null;
  state.ship.slug = "spanish-nao";
  assert.equal(telemetry.recordVoyageStart(state), false);
  await nextTask();
  assert.equal(events.filter((event) => event.type === "voyage_start").length, 0);
  assert.equal(storage.values.has(TELEMETRY_LAST_VOYAGE_START_STORAGE_KEY), false);
});

test("accepted batches remove poisoned legacy events from the persisted queue", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "poisoned-queue",
    [TELEMETRY_QUEUE_STORAGE_KEY]: JSON.stringify([queuedCrash()])
  });
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async () => successfulResponse({
      accepted: 1,
      rejected: 1,
      errors: [{ eventId: "old-event", error: "invalid_legacy_payload" }]
    }),
    randomId: () => "session-id",
    setIntervalImpl: () => 1,
    clearIntervalImpl() {},
    metadata: metadata()
  });

  telemetry.start();
  await nextTask();
  assert.equal(storage.values.has(TELEMETRY_QUEUE_STORAGE_KEY), false);
});

test("an urgent voyage retries immediately when the older active request fails", async () => {
  const storage = memoryStorage({
    [TELEMETRY_CONSENT_STORAGE_KEY]: TELEMETRY_CONSENT_GRANTED,
    [TELEMETRY_INSTALLATION_STORAGE_KEY]: "voyage-after-failed-request"
  });
  const bodies = [];
  let releaseFirstRequest;
  const firstRequestPending = new Promise((resolve) => {
    releaseFirstRequest = resolve;
  });
  const telemetry = createGameTelemetry({
    storage,
    fetchImpl: async (_url, options) => {
      bodies.push({
        ...JSON.parse(options.body),
        keepalive: options.keepalive
      });
      if (bodies.length === 1) {
        await firstRequestPending;
        return { ok: false };
      }
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
  await nextTask();
  assert.equal(telemetry.recordVoyage(voyageRecord(), voyageState("treasure-hunt")), true);
  releaseFirstRequest();
  await nextTask();
  await nextTask();

  assert.equal(bodies.length, 2);
  assert.deepEqual(
    bodies[1].events.map((entry) => entry.type),
    ["session_start", "voyage_end"]
  );
  assert.equal(bodies[1].keepalive, true);
  assert.equal(storage.values.has(TELEMETRY_QUEUE_STORAGE_KEY), false);
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
      animalCompanions: {
        byId: {
          panda: { status: "aboard" },
          penguin: { status: "aboard" },
          raccoon: { status: "aboard" }
        }
      },
      achievements: {
        defeatedShipCount: 2,
        whalesKilled: 0,
        foundedCityIds: ["colony"],
        soldSpiceGoodIds: ["cloves"]
      }
    }
  });
  assert.deepEqual(payload.features, [
    "trade",
    "fish",
    "combat",
    "colonize",
    "side-quests",
    "animals",
    "panda",
    "penguin",
    "raccoon"
  ]);
  assert.equal(payload.mainQuest, "explorer");
  assert.equal(payload.companionStatuses, "panda:aboard,penguin:aboard,raccoon:aboard");
  assert.equal(JSON.stringify(payload).includes("captain"), false);
});

test("voyage start summaries omit generated names and exact positions", () => {
  const payload = voyageStartTelemetryPayload(voyageStartState());
  assert.deepEqual(payload, {
    profileVersion: 1,
    mainQuest: "explorer",
    faction: "portugal",
    ship: "caravel",
    homePort: "Lisbon",
    startRegion: "europe",
    captainReligion: "roman-catholic",
    captainSex: "female",
    captainSkills: "master-navigator",
    loadout: "provisional-short-haul",
    captainAge: 31,
    startingCrew: 12,
    startingCannons: 4,
    cargoCapacity: 90,
    foodDays: 20,
    waterDays: 20,
    startingDoubloons: 500
  });
  const serialized = JSON.stringify(payload);
  assert.ok(!serialized.includes("Maria Test"));
  assert.ok(!serialized.includes("latitude"));
  assert.ok(!serialized.includes("longitude"));
});

test("voyage start telemetry never substitutes a later prize vessel", () => {
  const state = voyageStartState();
  state.ship.slug = "spanish-nao";
  state.ship.crew = 40;
  state.ship.cannons = 18;
  state.cargoCapacity = 180;
  state.doubloons = 75_000;

  const payload = voyageStartTelemetryPayload(state);
  assert.equal(payload.ship, "caravel");
  assert.equal(payload.startingCrew, 12);
  assert.equal(payload.startingCannons, 4);
  assert.equal(payload.cargoCapacity, 90);
  assert.equal(payload.startingDoubloons, 500);
});

test("raccoon telemetry records acquisition rather than a recruitment prompt", () => {
  for (const status of ["unmet", "pending", "declined"]) {
    const state = voyageState("explorer");
    state.memory.animalCompanions.byId.raccoon.status = status;
    assert.ok(!voyageTelemetryPayload(voyageRecord(), state).features.includes("raccoon"));
  }
  for (const status of ["aboard", "with-naturalist"]) {
    const state = voyageState("explorer");
    state.memory.animalCompanions.byId.raccoon.status = status;
    const payload = voyageTelemetryPayload(voyageRecord(), state);
    assert.ok(payload.features.includes("raccoon"));
    assert.match(payload.companionStatuses, new RegExp(`raccoon:${status}`));
  }
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
  }), "steam-full");
  assert.equal(telemetryRuntimeChannel({
    edition: "demo",
    platformId: "steam",
    location: { protocol: "file:", hostname: "" }
  }), "steam-demo");
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

function voyageRecord() {
  return {
    outcomeType: "death",
    daysAtSea: 10,
    endingDoubloons: 500,
    doubloonsEarned: 200,
    mappedPercent: 2,
    discoveries: 1,
    visitedPorts: 3,
    completedQuests: 0,
    crewLost: 2,
    vessel: "Kelulus"
  };
}

function voyageState(mainQuest) {
  return {
    activePlaySeconds: 600,
    memory: {
      campaignGoal: { type: mainQuest },
      decisions: {},
      quests: { completed: {} },
      animals: { encounterOrder: [] },
      animalCompanions: {
        byId: {
          panda: { status: "unmet" },
          penguin: { status: "unmet" },
          raccoon: { status: "unmet" }
        }
      },
      achievements: {}
    }
  };
}

function voyageStartState() {
  const state = {
    voyageSeed: "voyage-start-seed",
    voyageStartProfile: null,
    doubloons: 500,
    cargoCapacity: 90,
    playerCharacter: {
      name: "Maria Test",
      nationalityId: "portugal",
      homePortName: "Lisbon",
      startRegion: "europe",
      religionId: "roman-catholic",
      sex: "female",
      age: 31,
      skillIds: ["master-navigator"]
    },
    ship: {
      slug: "caravel",
      loadoutId: null,
      loadoutTargets: { foodDays: 20, waterDays: 20 },
      crew: 12,
      cannons: 4
    },
    memory: {
      campaignGoal: { type: "explorer" }
    }
  };
  captureVoyageStartProfile(state);
  return state;
}

function lowFrameRateReport() {
  return {
    durationSeconds: 20.4,
    sampledFrames: 204,
    framesPerSecond: 10,
    frameTimeMs: { p50: 100, p95: 120, max: 180 },
    cpuTimeMs: { mean: 82, p95: 100, max: 145 },
    longFramePercent: 95,
    stages: [
      { name: "render", meanMs: 50, maxMs: 95 },
      { name: "npcShips", meanMs: 20, maxMs: 35 }
    ]
  };
}

function freezeReport() {
  return {
    gapMs: 1_850,
    previousFrameCpuMs: 15,
    schedulerDelayMs: 1_835,
    cause: "save.periodic",
    recentWork: "save.periodic",
    recentWorkMs: 1_720
  };
}

function lowFrameRateContext() {
  return {
    screen: "sailing",
    mainQuest: "explorer",
    ship: "caravel",
    viewportWidth: 416,
    viewportHeight: 280,
    adaptiveVisualDensity: 0.3,
    chartTiles: 171,
    visibleNpcShips: 17,
    cloudSprites: 8,
    precipitationParticles: 12,
    gpuDrawCalls: 42,
    hardwareConcurrency: 4,
    deviceMemoryGb: 8
  };
}

function successfulResponse(body = { accepted: 1, rejected: 0, errors: [] }) {
  return {
    ok: true,
    async json() {
      return body;
    }
  };
}

function nextTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
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
