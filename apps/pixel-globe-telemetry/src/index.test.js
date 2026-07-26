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
});

test("voyage events record every animal companion while accepting old panda payloads", async () => {
  const points = [];
  const current = event("voyage_end", voyagePayload({
    features: ["animals", "panda", "penguin"],
    companionStatuses: "panda:aboard,penguin:with-naturalist"
  }));
  const legacy = event("voyage_end", voyagePayload({
    features: ["animals", "panda"],
    pandaStatus: "aboard"
  }));
  legacy.eventId = "event-2";
  const response = await worker.fetch(requestFor([current, legacy]), environment(points));

  assert.equal(response.status, 202);
  assert.equal(points.length, 2);
  assert.equal(points[0].blobs[10], "animals,panda,penguin");
  assert.equal(points[0].blobs[11], "panda:aboard,penguin:with-naturalist");
  assert.equal(points[1].blobs[11], "panda:aboard");
});

test("an invalid event prevents the entire batch from being written", async () => {
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
  assert.equal(response.status, 400);
  assert.equal(points.length, 0);
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
