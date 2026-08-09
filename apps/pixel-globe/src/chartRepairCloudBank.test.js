import test from "node:test";
import assert from "node:assert/strict";
import {
  chartRepairCloudFullyCoversCircle,
  chartRepairCloudBankFrame,
  chartRepairCloudMayFullyCoverCircle,
  createChartRepairCloudBank,
  slowedChartRepairCloudSpeed
} from "./chartRepairCloudBank.js";

test("repair clouds are sparse, staggered, and never carry a rotation", () => {
  const bank = createChartRepairCloudBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 1,
    speedPxPerSecond: 12
  });
  const frame = chartRepairCloudBankFrame(bank, bank.durationMs / 2);

  assert.ok(frame.clouds.length >= 1 && frame.clouds.length <= 5);
  assert.equal(Object.hasOwn(frame, "angleRad"), false);
  assert.equal(frame.clouds.some((cloud) => cloud.x !== frame.centerX), true);
  assert.equal(frame.clouds.some((cloud) => cloud.y !== frame.centerY), true);
});

test("sparse repair clouds conceal their own pixels without an invisible solid front", () => {
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
  assert.equal(chartRepairCloudFullyCoversCircle(covered, 260, 128, 18), false);
  assert.equal(chartRepairCloudFullyCoversCircle(covered, 400, 20, 0), false);
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
  assert.equal(slowedChartRepairCloudSpeed(60), 20);
  assert.throws(() => slowedChartRepairCloudSpeed(0), /positive/);
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
});

test("a cloud path identifies the complete repair group before crossing it", () => {
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

  assert.equal(chartRepairCloudMayFullyCoverCircle(bank, 20, 80, 18), true);
  assert.equal(chartRepairCloudMayFullyCoverCircle(bank, 220, 80, 18), true);
  assert.equal(chartRepairCloudMayFullyCoverCircle(bank, 80, 130, 18), false);
});

test("a sparse cloud group leaves most of the viewport uncovered", () => {
  const bank = createChartRepairCloudBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0.2,
    speedPxPerSecond: 100
  });
  const frame = chartRepairCloudBankFrame(bank, bank.durationMs / 2);
  const covered = Array.from({ length: 12 }, (_, index) => (
    chartRepairCloudFullyCoversCircle(frame, 20 + index * 36, 30, 0)
  )).filter(Boolean).length;
  assert.ok(covered < 4);
});
