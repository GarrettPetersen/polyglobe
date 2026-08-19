import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_REPAIR_CLOUD_BLUR_STRENGTH,
  CHART_REPAIR_CLOUD_SPRITE_ALPHA,
  chartRepairCloudFullyCoversCircle,
  chartRepairCloudBankFrame,
  chartRepairCloudMayFullyCoverCircle,
  chartRepairCloudMayMostlyCoverCircle,
  chartRepairCloudMostlyCoversCircle,
  chartRepairCloudTileStepPx,
  createChartRepairCloudBank,
  slowedChartRepairCloudSpeed
} from "./chartRepairCloudBank.js";

const WORLD_VIEW = Object.freeze({ worldViewX: 1000, worldViewY: -400 });

function createBank(options) {
  return createChartRepairCloudBank({ ...WORLD_VIEW, ...options });
}

function frameAt(bank, nowMs, worldView = WORLD_VIEW) {
  return chartRepairCloudBankFrame(bank, nowMs, worldView);
}

test("repair clouds trade opacity for a silhouette-clipped world blur", () => {
  assert.ok(CHART_REPAIR_CLOUD_SPRITE_ALPHA > 0.3);
  assert.ok(CHART_REPAIR_CLOUD_SPRITE_ALPHA < 0.7);
  assert.ok(CHART_REPAIR_CLOUD_BLUR_STRENGTH > 0.8);
  assert.ok(CHART_REPAIR_CLOUD_BLUR_STRENGTH < 1);
});

test("repair clouds span their target, stay staggered, and never carry a rotation", () => {
  const bank = createBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 1,
    speedPxPerSecond: 12
  });
  const frame = frameAt(bank, bank.durationMs / 2);

  assert.ok(frame.clouds.length >= 7 && frame.clouds.length <= 13);
  assert.equal(Object.hasOwn(frame, "angleRad"), false);
  assert.equal(frame.clouds.some((cloud) => cloud.x !== frame.centerX), true);
  assert.equal(frame.clouds.some((cloud) => cloud.y !== frame.centerY), true);
  assert.equal(frame.clouds.some((cloud) => cloud.variantIndex === 3), false);
});

test("sparse repair clouds conceal their own pixels without an invisible solid front", () => {
  const bank = createBank({
    nowMs: 1000,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0.25,
    speedPxPerSecond: 42
  });
  const entering = frameAt(bank, 1000);
  const covered = frameAt(bank, 1000 + bank.durationMs / 2);
  const departed = frameAt(bank, 1000 + bank.durationMs);

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
  const calm = createBank({ ...base, speedPxPerSecond: 24 });
  const brisk = createBank({ ...base, speedPxPerSecond: 60 });
  assert.ok(brisk.durationMs < calm.durationMs);
  assert.equal(calm.durationMs / brisk.durationMs, 2.5);
  assert.equal(slowedChartRepairCloudSpeed(60), 20);
  assert.throws(() => slowedChartRepairCloudSpeed(0), /positive/);
});

test("a local cloud bank covers only its requested repair neighborhood", () => {
  const bank = createBank({
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
  const covered = frameAt(bank, bank.durationMs / 2);

  assert.equal(chartRepairCloudFullyCoversCircle(covered, 80, 80, 18), true);
  assert.equal(chartRepairCloudFullyCoversCircle(covered, 400, 220, 18), false);
});

test("a cloud path identifies the complete repair group before crossing it", () => {
  const bank = createBank({
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

  assert.equal(chartRepairCloudMayFullyCoverCircle(bank, 940, -448, 18), true);
  assert.equal(chartRepairCloudMayFullyCoverCircle(bank, 1140, -448, 18), true);
  assert.equal(chartRepairCloudMayFullyCoverCircle(bank, 1000, -398, 18), false);
});

test("a mostly covered tile may settle gradually before full cloud cover", () => {
  const bank = createBank({
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
  const frame = frameAt(bank, bank.durationMs / 2);

  assert.equal(chartRepairCloudMostlyCoversCircle(frame, 100, 80, 18), true);
  assert.equal(chartRepairCloudFullyCoversCircle(frame, 100, 80, 18), false);
  assert.equal(chartRepairCloudMayMostlyCoverCircle(bank, 1140, -428, 18), true);
  assert.equal(chartRepairCloudTileStepPx(frame, 100, 80, 18, false), 1);
  assert.equal(chartRepairCloudTileStepPx(frame, 100, 80, 18, true), 4);
  assert.equal(
    chartRepairCloudTileStepPx(frame, 80, 80, 18, true),
    Number.POSITIVE_INFINITY
  );
  assert.throws(
    () => chartRepairCloudTileStepPx(frame, 80, 80, 18, "yes"),
    /severity must be boolean/
  );
});

test("a local cloud group leaves most of the viewport uncovered", () => {
  const bank = createBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0.2,
    speedPxPerSecond: 100,
    targetX: 90,
    targetY: 80,
    targetWidth: 70,
    targetHeight: 56
  });
  const frame = frameAt(bank, bank.durationMs / 2);
  const covered = Array.from({ length: 12 }, (_, index) => (
    chartRepairCloudFullyCoversCircle(frame, 20 + index * 36, 30, 0)
  )).filter(Boolean).length;
  assert.ok(covered < 4);
});

test("a frame-wide cloud path reaches every crosswind part of a tall viewport", () => {
  const bank = createBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 0,
    directionY: 1,
    speedPxPerSecond: 36
  });

  assert.equal(bank.cloudOffsets.length, 11);
  for (let x = 0; x <= 455; x += 7) {
    assert.equal(
      chartRepairCloudMayMostlyCoverCircle(bank, x + 772.5, -400, 18),
      true,
      `cloud path missed x=${x}`
    );
  }
});

test("repair clouds remain over world locations while the camera moves", () => {
  const bank = createBank({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    directionX: 1,
    directionY: 0,
    speedPxPerSecond: 36
  });
  const stationaryCamera = frameAt(bank, bank.durationMs / 2);
  const movedCamera = frameAt(bank, bank.durationMs / 2, {
    worldViewX: WORLD_VIEW.worldViewX + 24,
    worldViewY: WORLD_VIEW.worldViewY - 9
  });

  assert.equal(movedCamera.centerX, stationaryCamera.centerX - 24);
  assert.equal(movedCamera.centerY, stationaryCamera.centerY + 9);
  assert.deepEqual(
    movedCamera.clouds.map((cloud) => [cloud.x, cloud.y]),
    stationaryCamera.clouds.map((cloud) => [cloud.x - 24, cloud.y + 9])
  );
});
