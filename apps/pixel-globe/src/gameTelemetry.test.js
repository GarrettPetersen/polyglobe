import assert from "node:assert/strict";
import test from "node:test";

import {
  TELEMETRY_CONSENT_DENIED,
  TELEMETRY_CONSENT_GRANTED,
  TELEMETRY_CONSENT_STORAGE_KEY,
  TELEMETRY_INSTALLATION_STORAGE_KEY,
  TELEMETRY_QUEUE_STORAGE_KEY,
  createGameTelemetry,
  telemetryRuntimeChannel,
  voyageStartTelemetryPayload,
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
  return {
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
