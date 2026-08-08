import test from "node:test";
import assert from "node:assert/strict";
import { cross3, dot3, normalize3 } from "./geodesic.js";
import { predictiveAdmissionProjection } from "./chartAdmissionProjection.js";

const VIEWPORT_SIZE = 200;
const PIXELS_PER_RADIAN = 1000;

test("visible chart tiles keep their current projection", () => {
  const camera = cameraAt(60, 0);
  const tile = projectedTile(1, 60, 5, camera);
  const projected = predictiveProjection([tile], camera, () => directionAt(60, 5));

  assert.deepEqual(projected.get(tile.id), tile);
});

test("an eastern hidden tile anticipates the north-up frame where it will enter", () => {
  const camera = cameraAt(60, 0);
  const direction = directionAt(60, 34.38);
  const tile = projectedTileForDirection(1, direction, camera);
  assert.ok(tile.x > VIEWPORT_SIZE, "Regression tile must begin east of the viewport");

  const predicted = predictiveProjection([tile], camera, () => direction).get(tile.id);

  assert.ok(
    predicted.y > tile.y + 20,
    `Future eastern frame did not anticipate latitude curvature: ${tile.y} -> ${predicted.y}`
  );
  assert.ok(
    Math.abs(predicted.x - tile.x) < 12,
    `Future eastern frame unexpectedly changed travel distance: ${tile.x} -> ${predicted.x}`
  );
});

test("predictive admission is disabled when no hidden lookahead is allowed", () => {
  const camera = cameraAt(60, 0);
  const direction = directionAt(60, 34.38);
  const tile = projectedTileForDirection(1, direction, camera);
  const projected = predictiveProjection([tile], camera, () => direction, 0);

  assert.deepEqual(projected.get(tile.id), tile);
});

function predictiveProjection(projectedTiles, camera, directionForTile, maximumLookaheadPx = 100) {
  return predictiveAdmissionProjection({
    projectedTiles,
    directionForTile,
    camera,
    viewportWidth: VIEWPORT_SIZE,
    viewportHeight: VIEWPORT_SIZE,
    tileVisualRadius: 10,
    pixelsPerRadian: PIXELS_PER_RADIAN,
    maximumLookaheadPx
  });
}

function cameraAt(lat, lon) {
  const center = directionAt(lat, lon);
  const north = [0, 1, 0];
  const projection = dot3(north, center);
  const up = normalize3([
    north[0] - center[0] * projection,
    north[1] - center[1] * projection,
    north[2] - center[2] * projection
  ]);
  return { center, right: normalize3(cross3(up, center)), up };
}

function projectedTile(id, lat, lon, camera) {
  return projectedTileForDirection(id, directionAt(lat, lon), camera);
}

function projectedTileForDirection(id, direction, camera) {
  const depth = dot3(direction, camera.center);
  const sinTheta = Math.sqrt(Math.max(0, 1 - depth * depth));
  const scale = sinTheta > 1e-6
    ? Math.acos(Math.max(-1, Math.min(1, depth))) / sinTheta
    : 1;
  return {
    id,
    x: Math.round(VIEWPORT_SIZE / 2 + dot3(direction, camera.right) * scale * PIXELS_PER_RADIAN),
    y: Math.round(VIEWPORT_SIZE / 2 - dot3(direction, camera.up) * scale * PIXELS_PER_RADIAN)
  };
}

function directionAt(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  return [
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon)
  ];
}
