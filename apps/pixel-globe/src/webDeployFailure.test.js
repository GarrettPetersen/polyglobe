import assert from "node:assert/strict";
import test from "node:test";
import { webDeployFailureEvent } from "./webDeployFailure.js";

const occurredAt = "2026-09-25T21:05:26.000Z";

test("a failed web deploy becomes one telemetry diagnostic", () => {
  const event = webDeployFailureEvent({
    revision: "94dbd4ae72e9",
    runUrl: "https://github.com/GarrettPetersen/polyglobe/actions/runs/36189582271",
    runId: "36189582271",
    occurredAt
  });
  assert.equal(event.type, "diagnostic");
  assert.equal(event.payload.errorName, "WebDeployFailed");
  assert.equal(event.metadata.channel, "web-deploy");
  assert.equal(event.metadata.revision, "94dbd4ae72e9");
  assert.match(event.payload.message, /94dbd4ae72e9/);
  assert.match(event.payload.message, /^Web deploy failed/);
  assert.equal(event.eventId, "web-deploy-94dbd4ae72e9-36189582271");
});

test("a web deploy failure rejects an unusable revision or run", () => {
  assert.throws(() => webDeployFailureEvent({
    revision: "development",
    runUrl: "https://github.com/GarrettPetersen/polyglobe/actions/runs/1",
    runId: "1",
    occurredAt
  }), /12-character revision/);
  assert.throws(() => webDeployFailureEvent({
    revision: "94dbd4ae72e9",
    runUrl: "http://github.com/GarrettPetersen/polyglobe/actions/runs/1",
    runId: "1",
    occurredAt
  }), /must be https/);
});
