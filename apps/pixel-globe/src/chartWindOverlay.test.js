import assert from "node:assert/strict";
import test from "node:test";

import {
  CHART_WIND_MAX_COUNT,
  CHART_WIND_TARGET_COUNT,
  averageWindSamples,
  chartWindArrowScreen,
  chartWindArrows,
  chartWindToggleRect
} from "./chartWindOverlay.js";
import { windAtLatLonDeg } from "./weather.js";

const CLIMATE = Object.freeze({
  seed: 1,
  noiseDirectionRad: 0,
  noiseStrength: 0
});

test("a full-world chart uses about twenty wind arrows and never walks a tile grid", () => {
  let samples = 0;
  const arrows = chartWindArrows({
    width: 400,
    height: 120,
    sampleWind() {
      samples += 1;
      return { directionRad: Math.PI / 4, strength: 0.5 };
    }
  });
  assert.equal(arrows.length, CHART_WIND_TARGET_COUNT);
  assert.equal(samples, arrows.length * 5);
  assert.ok(arrows.length <= CHART_WIND_MAX_COUNT);
  const dense = chartWindArrows({
    width: 2000,
    height: 2000,
    sampleWind() {
      return { directionRad: 0, strength: 0.4 };
    }
  });
  assert.ok(dense.length <= CHART_WIND_MAX_COUNT);
  assert.ok(dense.length >= 4);
});

test("wind samples stay inside each chart cell", () => {
  const seen = [];
  chartWindArrows({
    width: 300,
    height: 90,
    sampleWind(x, y) {
      seen.push({ x, y });
      return { directionRad: 0, strength: 0.2 };
    }
  });
  for (const sample of seen) {
    assert.ok(sample.x >= 0 && sample.x < 300);
    assert.ok(sample.y >= 0 && sample.y < 90);
  }
});

test("arrow direction follows where the wind blows, and length follows speed", () => {
  const trades = chartWindArrowScreen(Math.PI / 4, 0.5);
  assert.ok(trades.dx < -0.5, "northeast trades should flow toward the west");
  assert.ok(trades.dy > 0.5, "northeast trades should flow toward the south on the chart");
  const calm = chartWindArrowScreen(0, 0.1);
  const strong = chartWindArrowScreen(0, 0.9);
  assert.ok(strong.length > calm.length);
  assert.ok(strong.alpha > calm.alpha);
  assert.ok(strong.alpha < 0.9);
});

test("climatic samples show trade winds and the South China Sea monsoon", () => {
  const northernTrade = chartWindArrowScreen(
    windAtLatLonDeg(12, -30, 0, { ...CLIMATE, simMinute: 80 * 1440 }).directionRad,
    0.5
  );
  assert.ok(northernTrade.dx < 0, "northern trade wind should have a westward component");

  const summer = windAtLatLonDeg(15, 115, 23, { ...CLIMATE, simMinute: 195 * 1440 });
  const winter = windAtLatLonDeg(15, 115, -20, { ...CLIMATE, simMinute: 15 * 1440 });
  const summerArrow = chartWindArrowScreen(summer.directionRad, summer.strength);
  const winterArrow = chartWindArrowScreen(winter.directionRad, winter.strength);
  const agreement = summerArrow.dx * winterArrow.dx + summerArrow.dy * winterArrow.dy;
  assert.ok(agreement < 0.2, "monsoon arrows should reverse between summer and winter");
});

test("averaging wind samples keeps a steady direction", () => {
  const average = averageWindSamples([
    { directionRad: 0, strength: 1 },
    { directionRad: 0.1, strength: 1 },
    { directionRad: -0.1, strength: 1 }
  ]);
  assert.ok(Math.abs(average.directionRad) < 0.05);
  assert.ok(average.strength > 0.9);
});

test("the wind toggle sits in the free map corner and clears a pan button", () => {
  const clear = chartWindToggleRect({
    mapX: 10,
    mapY: 20,
    mapWidth: 400,
    mapHeight: 120,
    labelWidth: 24
  });
  assert.equal(clear.x + clear.w, 407);
  assert.equal(clear.y + clear.h, 137);
  const blocked = chartWindToggleRect({
    mapX: 10,
    mapY: 20,
    mapWidth: 80,
    mapHeight: 40,
    labelWidth: 48,
    obstacleRect: { x: 40, y: 45, w: 18, h: 12 }
  });
  assert.ok(blocked.y + blocked.h <= 45);
});
