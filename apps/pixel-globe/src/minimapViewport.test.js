import assert from "node:assert/strict";
import test from "node:test";

import {
  MINIMAP_LONGITUDE_BIN_COUNT,
  exploredMinimapViewport,
  minimapLongitudeBin,
  minimapProjectLatitude,
  minimapProjectLongitude,
  minimapUnprojectLatitude,
  minimapUnprojectLongitude,
  minimapViewportContainsPoint,
  minimapViewportPixel,
  minimapViewportSample
} from "./minimapViewport.js";

const WORLD_W = 80;
const WORLD_H = 26;
const MAX_LAT = 72;

test("a Mediterranean voyage produces a local aspect-correct minimap", () => {
  const exploration = explorationFor([
    { lon: -6, lat: 36 },
    { lon: 35, lat: 32 }
  ]);
  const viewport = exploredMinimapViewport({
    ...exploration,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H
  });

  assert.ok(viewport.spanX < WORLD_W * 0.4);
  assert.equal(viewport.spanX / viewport.spanY, WORLD_W / WORLD_H);
  for (const point of exploration.points) {
    assert.equal(minimapViewportContainsPoint(viewport, point.x, point.y, WORLD_W), true);
  }
});

test("exploration crossing the date line stays a narrow local map", () => {
  const exploration = explorationFor([
    { lon: 178, lat: 10 },
    { lon: -178, lat: 12 }
  ]);
  const viewport = exploredMinimapViewport({
    ...exploration,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H
  });

  assert.ok(viewport.spanX < WORLD_W * 0.15);
  for (const point of exploration.points) {
    assert.equal(minimapViewportContainsPoint(viewport, point.x, point.y, WORLD_W), true);
  }
});

test("circumnavigation explicitly expands the viewport to the full current map", () => {
  const exploration = explorationFor([
    { lon: -179, lat: 0 },
    { lon: 179, lat: 0 }
  ]);
  const viewport = exploredMinimapViewport({
    ...exploration,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    forceFullMap: true
  });

  assert.deepEqual(viewport, { startX: 0, startY: 0, spanX: WORLD_W, spanY: WORLD_H });
});

test("exploring both cropped poles expands the viewport to the full current map", () => {
  const exploration = explorationFor([
    { lon: 20, lat: -90 },
    { lon: 20, lat: 90 }
  ]);
  const viewport = exploredMinimapViewport({
    ...exploration,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H
  });

  assert.deepEqual(viewport, { startX: 0, startY: 0, spanX: WORLD_W, spanY: WORLD_H });
});

test("viewport pixels remain on the fixed 80 by 26 pixel grid", () => {
  const exploration = explorationFor([
    { lon: -10, lat: 30 },
    { lon: 40, lat: 45 }
  ]);
  const viewport = exploredMinimapViewport({
    ...exploration,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H
  });
  const point = exploration.points[0];
  const pixel = minimapViewportPixel({
    viewport,
    projectedX: point.x,
    projectedY: point.y,
    worldWidth: WORLD_W,
    pixelWidth: WORLD_W,
    pixelHeight: WORLD_H
  });

  assert.ok(Number.isInteger(pixel.x) && pixel.x >= 0 && pixel.x < WORLD_W);
  assert.ok(Number.isInteger(pixel.y) && pixel.y >= 0 && pixel.y < WORLD_H);
  assert.equal(pixel.pixel, pixel.x + pixel.y * WORLD_W);
});

test("every close-up minimap pixel produces valid globe samples", () => {
  const exploration = explorationFor([
    { lon: -6, lat: 36 },
    { lon: 35, lat: 32 }
  ]);
  const viewport = exploredMinimapViewport({
    ...exploration,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H
  });
  const offsets = [1 / 6, 3 / 6, 5 / 6];

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      for (const sampleY of offsets) {
        for (const sampleX of offsets) {
          const projected = minimapViewportSample({
            viewport,
            pixelX: x,
            pixelY: y,
            sampleX,
            sampleY,
            worldWidth: WORLD_W,
            pixelWidth: WORLD_W,
            pixelHeight: WORLD_H
          });
          const longitude = minimapUnprojectLongitude(projected.x, WORLD_W);
          const latitude = minimapUnprojectLatitude(projected.y, MAX_LAT, WORLD_H);
          assert.ok(longitude >= -180 && longitude < 180);
          assert.ok(latitude >= -MAX_LAT && latitude <= MAX_LAT);
        }
      }
    }
  }
});

test("minimap projection and unprojection round trip", () => {
  for (const { lon, lat } of [
    { lon: -179, lat: -70 },
    { lon: -6, lat: 36 },
    { lon: 35, lat: 32 },
    { lon: 179, lat: 70 }
  ]) {
    const projectedX = minimapProjectLongitude(lon, WORLD_W);
    const projectedY = minimapProjectLatitude(lat, MAX_LAT, WORLD_H);
    assert.ok(Math.abs(minimapUnprojectLongitude(projectedX, WORLD_W) - lon) < 1e-9);
    assert.ok(Math.abs(minimapUnprojectLatitude(projectedY, MAX_LAT, WORLD_H) - lat) < 1e-9);
  }
});

function explorationFor(coordinates) {
  const longitudeBinCounts = new Uint16Array(MINIMAP_LONGITUDE_BIN_COUNT);
  const points = coordinates.map(({ lon, lat }) => {
    const x = minimapProjectLongitude(lon, WORLD_W);
    const y = minimapProjectLatitude(lat, MAX_LAT, WORLD_H);
    longitudeBinCounts[minimapLongitudeBin(x, WORLD_W)] += 1;
    return { x, y };
  });
  return {
    longitudeBinCounts,
    minimumY: Math.min(...points.map((point) => point.y)),
    maximumY: Math.max(...points.map((point) => point.y)),
    points
  };
}
