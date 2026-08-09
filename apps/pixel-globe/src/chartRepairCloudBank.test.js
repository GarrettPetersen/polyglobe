import test from "node:test";
import assert from "node:assert/strict";
import {
  chartRepairCloudFullyCoversCircle,
  chartRepairCloudTargetContainsCircle,
  chartRepairCloudBankFrame,
  createChartRepairCloudBank
} from "./chartRepairCloudBank.js";

test("a narrow repair cloud front crosses without covering the viewport", () => {
  const bank = createChartRepairCloudBank({
    nowMs: 1000,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0.25,
    speedPxPerSecond: 42
  });
  const entering = chartRepairCloudBankFrame(bank, 1000);
  const covered = chartRepairCloudBankFrame(bank, 1000 + bank.durationMs / 2);
  const departed = chartRepairCloudBankFrame(bank, 1000 + bank.durationMs);

  assert.equal(chartRepairCloudFullyCoversCircle(entering, 227.5, 128, 18), false);
  assert.equal(chartRepairCloudFullyCoversCircle(covered, 227.5, 128, 18), true);
  assert.equal(chartRepairCloudFullyCoversCircle(covered, 280, 128, 18), false);
  assert.ok(covered.solidHalfDepth * 2 < 455 / 4);
  assert.equal(departed.finished, true);
  assert.ok(bank.durationMs > 10_000 && bank.durationMs < 20_000);
});

test("a ship-scale travel speed controls the cloud crossing time", () => {
  const base = {
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 0,
    directionY: 1
  };
  const calm = createChartRepairCloudBank({ ...base, speedPxPerSecond: 24 });
  const brisk = createChartRepairCloudBank({ ...base, speedPxPerSecond: 60 });
  assert.ok(brisk.durationMs < calm.durationMs);
  assert.equal(calm.durationMs / brisk.durationMs, 2.5);
});

test("a local cloud bank covers only its requested repair neighborhood", () => {
  const bank = createChartRepairCloudBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0,
    speedPxPerSecond: 36,
    targetX: 80,
    targetY: 80,
    targetWidth: 70,
    targetHeight: 56
  });
  const covered = chartRepairCloudBankFrame(bank, bank.durationMs / 2);

  assert.equal(chartRepairCloudFullyCoversCircle(covered, 80, 80, 18), true);
  assert.equal(chartRepairCloudFullyCoversCircle(covered, 400, 220, 18), false);
  assert.equal(chartRepairCloudTargetContainsCircle(covered, 80, 80, 18), true);
  assert.equal(chartRepairCloudTargetContainsCircle(covered, 125, 80, 18), false);
});

test("a ship-speed cloud front fully conceals every tile center as it passes", () => {
  const bank = createChartRepairCloudBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0.2,
    speedPxPerSecond: 100
  });
  const centers = [];
  for (let y = 18; y <= 238; y += 36) {
    for (let x = 18; x <= 437; x += 36) centers.push({ x, y, covered: false });
  }
  for (let nowMs = 0; nowMs <= bank.durationMs + 120; nowMs += 120) {
    const frame = chartRepairCloudBankFrame(bank, nowMs);
    for (const center of centers) {
      center.covered ||= chartRepairCloudFullyCoversCircle(frame, center.x, center.y, 21);
    }
  }
  assert.equal(centers.filter((center) => !center.covered).length, 0);
});
