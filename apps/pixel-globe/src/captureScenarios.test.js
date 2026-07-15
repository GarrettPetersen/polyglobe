import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_MAX_SECONDS,
  CAPTURE_VIEWPORT,
  captureScenarioFromSearch,
  captureScenarioIds,
  validateCaptureScenario
} from "./captureScenarios.js";

test("capture scenarios use a native 9:16 frame and a ten-minute cap", () => {
  assert.deepEqual(CAPTURE_VIEWPORT, { width: 270, height: 480 });
  assert.equal(CAPTURE_VIEWPORT.width / CAPTURE_VIEWPORT.height, 9 / 16);
  assert.equal(CAPTURE_MAX_SECONDS, 600);
});

test("capture scenario lookup is explicit and fails for unknown ids", () => {
  assert.ok(captureScenarioIds().includes("turtle-ship-war"));
  assert.equal(captureScenarioFromSearch(""), null);
  assert.equal(captureScenarioFromSearch("?capture=turtle-ship-war").player.factionId, "joseon");
  assert.throws(() => captureScenarioFromSearch("?capture=missing"), /Unknown capture scenario/);
});

test("capture validation rejects unknown vessels and malformed clocks", () => {
  const valid = structuredClone(captureScenarioFromSearch("?capture=turtle-ship-war"));
  valid.world.hour = 24;
  assert.throws(() => validateCaptureScenario(valid), /capture hour/);
  valid.world.hour = 12;
  valid.player.shipSlug = "not-a-ship";
  assert.throws(() => validateCaptureScenario(valid), /Missing ship stats/);
});
