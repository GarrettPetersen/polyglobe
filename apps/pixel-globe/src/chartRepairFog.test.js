import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_FOG_REDRAW_CONCEALMENT,
  chartFogConcealsCircleForRepair,
  chartFogObscuresCircle,
  chartFogPixelDensity,
  chartRepairFogFrame,
  chartRepairFogWindPresence,
  createChartFogMaskField,
  createChartRepairFog,
  fillChartFogMaskPixels,
  polarChartFogFrame
} from "./chartRepairFog.js";

test("repair fog progressively hides distant geography before clearing", () => {
  const fog = createChartRepairFog({
    nowMs: 100,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });
  const open = chartRepairFogFrame(fog, 100);
  const rim = chartRepairFogFrame(fog, 100 + fog.formationDurationMs / 2);
  const nearlyClosed = chartRepairFogFrame(fog, 100 + fog.formationDurationMs * 0.999);
  const redrawReady = chartRepairFogFrame(fog, 100 + fog.formationDurationMs * 0.75);
  const closed = chartRepairFogFrame(fog, 100 + fog.formationDurationMs);
  const cleared = chartRepairFogFrame(fog, 100 + fog.durationMs);

  assert.ok(fog.formationDurationMs >= 60_000);
  assert.ok(fog.clearingDurationMs >= 50_000);
  assert.ok(fog.durationMs > 100_000);
  assert.equal(open.edgeOpacity, 0);
  assert.ok(open.clearRadius > 290);
  assert.equal(chartFogObscuresCircle(rim, 227, 128, 12), false);
  assert.equal(chartFogObscuresCircle(rim, 4, 4, 4), false);
  assert.ok(redrawReady.edgeOpacity >= CHART_FOG_REDRAW_CONCEALMENT);
  assert.equal(redrawReady.repairReady, true);
  assert.ok(redrawReady.edgeOpacity < 0.995);
  assert.equal(chartFogObscuresCircle(nearlyClosed, 4, 4, 4), true);
  assert.ok(Math.abs(closed.clearRadius - fog.minimumClearRadius) < 1e-9);
  assert.equal(closed.repairReady, true);
  assert.equal(cleared.finished, true);
});

test("repair fog has a stable ragged pixel edge rather than a perfect circle", () => {
  const fog = createChartRepairFog({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });
  const frame = chartRepairFogFrame(fog, fog.formationDurationMs);
  const densities = new Set();
  for (let degrees = 0; degrees < 360; degrees += 10) {
    const angle = degrees / 180 * Math.PI;
    const radius = frame.clearRadius + frame.fadeBandPx * 0.35;
    densities.add(chartFogPixelDensity(
      frame,
      Math.round(frame.focusX + Math.cos(angle) * radius),
      Math.round(frame.focusY + Math.sin(angle) * radius)
    ));
  }

  assert.ok(densities.size >= 3);
  assert.equal(chartFogPixelDensity(frame, frame.focusX, frame.focusY), 0);
  assert.equal(chartFogPixelDensity(frame, 0, 0), 1);
  const pixels = new Uint8ClampedArray(16 * 9 * 4);
  const field = createChartFogMaskField({
    width: 16,
    height: 9,
    focusX: frame.focusX,
    focusY: frame.focusY,
    pixelSize: 4
  });
  assert.equal(fillChartFogMaskPixels(pixels, 16, 9, frame, 4, field), pixels);
  assert.ok(pixels.some((value, index) => index % 4 === 3 && value > 0));
  assert.throws(
    () => fillChartFogMaskPixels(pixels, 16, 9, frame, 4, { ...field, width: 15 }),
    /does not match/
  );
});

test("repair fog shares the storm fog layers and never hides the world completely", () => {
  const width = 455;
  const height = 256;
  const pixelSize = 1;
  const fog = createChartRepairFog({
    nowMs: 0,
    viewportWidth: width * pixelSize,
    viewportHeight: height * pixelSize,
    focusX: width * pixelSize / 2,
    focusY: height * pixelSize / 2
  });
  const frame = chartRepairFogFrame(fog, fog.formationDurationMs);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const field = createChartFogMaskField({
    width,
    height,
    focusX: frame.focusX,
    focusY: frame.focusY,
    pixelSize
  });
  fillChartFogMaskPixels(pixels, width, height, frame, pixelSize, field);

  const colors = new Set();
  let maximumAlpha = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3];
    if (alpha === 0) continue;
    colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
    maximumAlpha = Math.max(maximumAlpha, alpha);
  }
  assert.ok(colors.size >= 3);
  assert.equal(maximumAlpha, 208);
  assert.ok(maximumAlpha < 255);
});

test("repair fog can clear early after an outer-ring repair is sufficient", () => {
  const fog = createChartRepairFog({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });
  const releaseAtMs = fog.formationDurationMs / 2;
  const forming = chartRepairFogFrame(fog, releaseAtMs);
  const clearing = chartRepairFogFrame(fog, releaseAtMs + fog.clearingDurationMs / 2, {
    startedAtMs: releaseAtMs,
    startLevel: forming.concealment
  });
  const cleared = chartRepairFogFrame(fog, releaseAtMs + fog.clearingDurationMs, {
    startedAtMs: releaseAtMs,
    startLevel: forming.concealment
  });

  assert.ok(clearing.concealment < forming.concealment);
  assert.equal(cleared.finished, true);
});

test("repair fog wind rises and falls with the visible haze", () => {
  const fog = createChartRepairFog({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });
  const open = chartRepairFogFrame(fog, 0);
  const forming = chartRepairFogFrame(fog, fog.formationDurationMs / 2);
  const closed = chartRepairFogFrame(fog, fog.formationDurationMs);
  const clearing = chartRepairFogFrame(
    fog,
    fog.formationDurationMs + fog.holdDurationMs + fog.clearingDurationMs / 2
  );

  assert.equal(chartRepairFogWindPresence(open), 0);
  assert.ok(chartRepairFogWindPresence(forming) > 0);
  assert.equal(chartRepairFogWindPresence(closed), 1);
  assert.ok(chartRepairFogWindPresence(clearing) < chartRepairFogWindPresence(closed));
});

test("polar fog preserves a clear navigable center and hides the chart edge", () => {
  const fog = polarChartFogFrame({
    latitudeDeg: 78,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });

  assert.ok(fog);
  assert.ok(fog.clearRadius >= 100 && fog.clearRadius <= 112);
  assert.equal(chartFogObscuresCircle(fog, 227, 128, 12), false);
  assert.equal(chartFogObscuresCircle(fog, 10, 10, 12), true);
  assert.equal(chartFogConcealsCircleForRepair(fog, 227, 128, 12), false);
  assert.equal(chartFogConcealsCircleForRepair(fog, 50, 50, 12), true);
  assert.equal(polarChartFogFrame({
    latitudeDeg: 50,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  }), null);
});

test("polar fog tightens its clear window under chart repair pressure", () => {
  const base = {
    latitudeDeg: 66,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  };
  const ordinary = polarChartFogFrame(base);
  const repairing = polarChartFogFrame({ ...base, repairPressure: 0.9 });

  assert.ok(repairing.clearRadius < ordinary.clearRadius - 60);
  assert.equal(repairing.polarAmount, ordinary.polarAmount);
  assert.equal(repairing.repairPressure, 0.9);
});

test("fog permits gradual repair in its visible band before full concealment", () => {
  const fog = polarChartFogFrame({
    latitudeDeg: 70,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });
  const repairBandX = fog.focusX - fog.clearRadius - fog.raggednessPx - 14;

  assert.equal(chartFogConcealsCircleForRepair(fog, repairBandX, fog.focusY, 12), true);
  assert.equal(chartFogObscuresCircle(fog, repairBandX, fog.focusY, 12), false);
});
