import test from "node:test";
import assert from "node:assert/strict";
import {
  chartRepairCloudFullyCoversCircle,
  chartRepairCloudTargetContainsCircle,
  chartRepairCloudBankFrame,
  createChartRepairCloudBank
} from "./chartRepairCloudBank.js";

test("a repair cloud bank crosses with a fully opaque reframe interval", () => {
  const bank = createChartRepairCloudBank({
    nowMs: 1000,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0.25,
    windStrength: 0.6
  });
  const entering = chartRepairCloudBankFrame(bank, 1000);
  const covered = chartRepairCloudBankFrame(bank, 1000 + bank.durationMs / 2);
  const departed = chartRepairCloudBankFrame(bank, 1000 + bank.durationMs);

  assert.equal(entering.coversViewport, false);
  assert.equal(covered.coversViewport, true);
  assert.equal(departed.coversViewport, false);
  assert.equal(departed.finished, true);
  assert.ok(bank.durationMs > 3000 && bank.durationMs < 10000);
});

test("wind strength makes the same cloud bank cross faster", () => {
  const base = {
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 0,
    directionY: 1
  };
  const calm = createChartRepairCloudBank({ ...base, windStrength: 0.1 });
  const brisk = createChartRepairCloudBank({ ...base, windStrength: 1 });
  assert.ok(brisk.durationMs < calm.durationMs);
});

test("a local cloud bank covers only its requested repair neighborhood", () => {
  const bank = createChartRepairCloudBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0,
    windStrength: 0.5,
    targetX: 80,
    targetY: 80,
    targetWidth: 70,
    targetHeight: 56
  });
  const covered = chartRepairCloudBankFrame(bank, bank.durationMs / 2);

  assert.equal(covered.coversTarget, true);
  assert.equal(covered.coversViewport, false);
  assert.equal(chartRepairCloudFullyCoversCircle(covered, 80, 80, 18), true);
  assert.equal(chartRepairCloudFullyCoversCircle(covered, 400, 220, 18), false);
  assert.equal(chartRepairCloudTargetContainsCircle(covered, 80, 80, 18), true);
  assert.equal(chartRepairCloudTargetContainsCircle(covered, 125, 80, 18), false);
});
