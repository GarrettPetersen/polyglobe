import assert from "node:assert/strict";
import test from "node:test";

import worker from "./index.js";

test("health checks do not touch analytics", async () => {
  const points = [];
  const response = await worker.fetch(new Request("https://telemetry.example/health"), environment(points));
  assert.equal(response.status, 200);
  assert.equal(points.length, 0);
});

test("health checks fail when deployment secrets or bindings are absent", async () => {
  const response = await worker.fetch(new Request("https://telemetry.example/health"), {
    EVENTS: { writeDataPoint() {} }
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    service: "marque-and-reprisal-telemetry",
    schemaVersion: 1
  });
});

test("valid crash reports are hashed and written without network identity", async () => {
  const points = [];
  const response = await worker.fetch(requestFor([event("crash", {
    samplingWeight: 1,
    errorName: "Error",
    message: "Boom",
    stack: "Error: Boom\n at main.js:1",
    screen: "sailing",
    mainQuest: "explorer",
    ship: "caravel"
  })]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.match(points[0].indexes[0], /^[a-f0-9]{64}$/);
  assert.equal(points[0].blobs[0], "crash");
  assert.equal(points[0].blobs[14], "Boom");
});

test("nonfatal diagnostics are stored separately from crashes", async () => {
  const points = [];
  const response = await worker.fetch(new Request("https://telemetry.example/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events: [event("diagnostic", {
      samplingWeight: 1,
      errorName: "ProtectedChartStitchError",
      message: "Recovered protected edge",
      stack: "ProtectedChartStitchError: Recovered protected edge\n at main.js:1",
      screen: "chart-stitch-recovered",
      mainQuest: "explorer",
      ship: "caravel"
    })] })
  }), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[0], "diagnostic");
  assert.match(points[0].blobs[12], /^[a-f0-9]{64}$/);
});

test("persistent low frame rate reports retain actionable stage and scene context", async () => {
  const points = [];
  const response = await worker.fetch(requestFor([event("low_fps", lowFrameRatePayload())]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[0], "low_fps");
  assert.equal(points[0].blobs[7], "explorer");
  assert.equal(points[0].blobs[8], "render");
  assert.equal(points[0].blobs[9], "caravel");
  assert.match(points[0].blobs[10], /^render:50\/95,npcShips:20\/35$/);
  assert.match(points[0].blobs[11], /viewport=416x280;.*npc=17;.*draws=42/);
  assert.deepEqual(points[0].doubles.slice(1, 10), [10, 100, 120, 180, 82, 100, 145, 95, 20.4]);
});

test("persistent low frame rate reports reject malformed stage profiles", async () => {
  const points = [];
  const response = await worker.fetch(requestFor([event("low_fps", {
    ...lowFrameRatePayload(),
    stages: []
  })]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 0);
  assert.deepEqual(await response.json(), {
    accepted: 0,
    rejected: 1,
    errors: [{ eventId: "event-1", error: "invalid_low_fps_stages" }]
  });
});

test("foreground freeze reports retain timing, cause, and scene context", async () => {
  const points = [];
  const response = await worker.fetch(requestFor([event("freeze", freezePayload())]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[0], "freeze");
  assert.equal(points[0].blobs[7], "explorer");
  assert.equal(points[0].blobs[8], "save.periodic");
  assert.equal(points[0].blobs[9], "caravel");
  assert.equal(points[0].blobs[10], "save.periodic");
  assert.match(points[0].blobs[11], /viewport=416x280;.*npc=17;.*draws=42/);
  assert.deepEqual(points[0].doubles.slice(1, 5), [1850, 15, 1835, 1720]);
});

test("foreground freeze reports reject background-scale gaps", async () => {
  const points = [];
  const response = await worker.fetch(requestFor([event("freeze", {
    ...freezePayload(),
    gapMs: 60_000
  })]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 0);
  assert.deepEqual(await response.json(), {
    accepted: 0,
    rejected: 1,
    errors: [{ eventId: "event-1", error: "invalid_number" }]
  });
});

test("full-collection weights and batch sizes are enforced", async () => {
  const points = [];
  const accepted = await worker.fetch(requestFor([event("session_start", {
    samplingWeight: 1,
    installAgeDays: 0,
    daysSinceLastSession: -1
  })]), environment(points));
  assert.equal(accepted.status, 202);
  assert.equal(points.length, 1);
  assert.equal(points[0].doubles[0], 1);

  const tooMany = Array.from({ length: 9 }, () => event("session_checkpoint", {
    samplingWeight: 1,
    activePlaySeconds: 60
  }));
  const badBatch = await worker.fetch(requestFor(tooMany), environment(points));
  assert.equal(badBatch.status, 400);
});

test("routine events queued by old tabs are normalized to unit weight", async () => {
  const points = [];
  const response = await worker.fetch(requestFor([event("session_checkpoint", {
    samplingWeight: 100,
    activePlaySeconds: 60
  })]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.equal(points[0].doubles[0], 1);
  assert.equal(points[0].doubles[16], 1);
});

test("corrected session clocks carry a queryable telemetry version", async () => {
  const points = [];
  const checkpoint = event("session_checkpoint", {
    samplingWeight: 1,
    activePlaySeconds: 60
  });
  checkpoint.metadata.sessionClockVersion = 2;
  const response = await worker.fetch(requestFor([checkpoint]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.equal(points[0].doubles[16], 2);
});

test("voyage events record every animal companion while accepting old panda payloads", async () => {
  const points = [];
  const current = event("voyage_end", voyagePayload({
    features: ["animals", "panda", "penguin", "raccoon"],
    companionStatuses: "panda:aboard,penguin:with-naturalist,raccoon:aboard"
  }));
  const legacy = event("voyage_end", voyagePayload({
    features: ["animals", "panda"],
    pandaStatus: "aboard"
  }));
  legacy.eventId = "event-2";
  const response = await worker.fetch(requestFor([current, legacy]), environment(points));

  assert.equal(response.status, 202);
  assert.equal(points.length, 2);
  assert.equal(points[0].blobs[10], "animals,panda,penguin,raccoon");
  assert.equal(points[0].blobs[11], "panda:aboard,penguin:with-naturalist,raccoon:aboard");
  assert.equal(points[1].blobs[11], "panda:aboard");
});

test("voyage starts record bounded origin, captain, ship, and loadout details", async () => {
  const points = [];
  const response = await worker.fetch(requestFor([event("voyage_start", voyageStartPayload())]), environment(points));

  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.deepEqual(points[0].blobs.slice(7, 17), [
    "explorer",
    "portugal",
    "caravel",
    "Lisbon",
    "europe",
    "roman-catholic",
    "female",
    "master-navigator",
    "provisional-short-haul",
    "captured-v1"
  ]);
  assert.deepEqual(points[0].doubles.slice(1, 8), [31, 12, 4, 90, 20, 20, 500]);
});

test("voyage starts reject malformed captain demographics", async () => {
  const points = [];
  const response = await worker.fetch(requestFor([event("voyage_start", voyageStartPayload({
    captainSex: "unknown"
  }))]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 0);
  assert.deepEqual(await response.json(), {
    accepted: 0,
    rejected: 1,
    errors: [{ eventId: "event-1", error: "invalid_captain_sex" }]
  });
});

test("an invalid queued event cannot prevent valid events from being written", async () => {
  const points = [];
  const valid = event("session_checkpoint", {
    samplingWeight: 1,
    activePlaySeconds: 60
  });
  const invalid = event("session_checkpoint", {
    samplingWeight: 17,
    activePlaySeconds: 60
  });
  invalid.eventId = "event-2";
  const response = await worker.fetch(requestFor([valid, invalid]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.deepEqual(await response.json(), {
    accepted: 1,
    rejected: 1,
    errors: [{ eventId: "event-2", error: "invalid_sampling_weight" }]
  });
});

function environment(points) {
  return {
    INSTALL_HASH_PEPPER: "a-secure-test-pepper-that-is-at-least-32-characters",
    EVENTS: {
      writeDataPoint(point) {
        points.push(point);
      }
    }
  };
}

function requestFor(events) {
  return new Request("https://telemetry.example/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events })
  });
}

function event(type, payload) {
  return {
    schemaVersion: 1,
    eventId: "event-1",
    type,
    installationId: "installation-1",
    sessionId: "session-1",
    occurredAt: "2026-07-25T12:00:00.000Z",
    metadata: {
      edition: "full",
      revision: "abc123",
      channel: "web-prototype",
      platform: "browser",
      locale: "en",
      gameStateVersion: 44
    },
    payload
  };
}

function voyagePayload(overrides) {
  return {
    samplingWeight: 1,
    activePlaySeconds: 120,
    mainQuest: "explorer",
    outcome: "victory",
    daysAtSea: 3,
    endingDoubloons: 500,
    grossDoubloonsEarned: 200,
    mappedPercent: 1,
    discoveries: 1,
    visitedPorts: 2,
    completedQuests: 1,
    crewLost: 0,
    ship: "Caravel",
    features: [],
    defeatedShips: 0,
    whalesKilled: 0,
    coloniesFounded: 0,
    spicesSold: 0,
    ...overrides
  };
}

function lowFrameRatePayload() {
  return {
    samplingWeight: 1,
    durationSeconds: 20.4,
    sampledFrames: 204,
    framesPerSecond: 10,
    frameTimeP50Ms: 100,
    frameTimeP95Ms: 120,
    frameTimeMaxMs: 180,
    cpuTimeMeanMs: 82,
    cpuTimeP95Ms: 100,
    cpuTimeMaxMs: 145,
    longFramePercent: 95,
    stages: [
      { name: "render", meanMs: 50, maxMs: 95 },
      { name: "npcShips", meanMs: 20, maxMs: 35 }
    ],
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

function freezePayload() {
  return {
    samplingWeight: 1,
    gapMs: 1850,
    previousFrameCpuMs: 15,
    schedulerDelayMs: 1835,
    cause: "save.periodic",
    recentWork: "save.periodic",
    recentWorkMs: 1720,
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

function voyageStartPayload(overrides = {}) {
  return {
    samplingWeight: 1,
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
    startingDoubloons: 500,
    ...overrides
  };
}
