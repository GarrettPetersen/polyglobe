import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeodesicGraph,
  createDirectionIndex,
  findNearestTileId,
  graphCenter,
  normalize3
} from "./geodesic.js";
import { admitProjectedTiles } from "./localLayoutAdmission.js";

const TRAVERSAL_SCREEN_W = 455;
const TRAVERSAL_SCREEN_H = 256;
const TRAVERSAL_MARGIN = 72;
const TRAVERSAL_PIXELS_PER_RADIAN = 620;

test("new tiles use their exact projected shape in the retained chart frame", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [3, { x: 100, y: 20 }]
  ]);
  const projectedById = new Map([
    [0, { x: 100, y: 80 }],
    [1, { x: 120, y: 90 }],
    [2, { x: 180, y: 110 }],
    [3, { x: 200, y: 100 }]
  ]);

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [1, 2],
    anchorId: 0
  });

  assert.deepEqual(positions.get(0), { x: 0, y: 0 });
  assert.deepEqual(positions.get(3), { x: 100, y: 20 });
  assert.deepEqual(positions.get(1), { x: 20, y: 10 });
  assert.deepEqual(positions.get(2), { x: 80, y: 30 });
  assert.equal(positions.get(2).x - positions.get(1).x, 60);
  assert.equal(positions.get(2).y - positions.get(1).y, 20);
});

test("layout translation does not alter the projected shape with one retained tile", () => {
  const positions = new Map([[0, { x: 40, y: 60 }]]);
  const projectedById = new Map([
    [0, { x: 10, y: 20 }],
    [1, { x: 100, y: 120 }],
    [2, { x: 130, y: 150 }]
  ]);

  const admitted = admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [1, 2],
    anchorId: 0
  });

  assert.equal(admitted, 2);
  assert.deepEqual(positions.get(0), { x: 40, y: 60 });
  assert.deepEqual(positions.get(1), { x: 130, y: 160 });
  assert.deepEqual(positions.get(2), { x: 160, y: 190 });
});

test("high-latitude tangent frame rotation cannot tear adjacent tiles apart", () => {
  const angle = 28 * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotate = ({ x, y }) => ({
    x: x * cos - y * sin,
    y: x * sin + y * cos
  });
  const retainedChartPoints = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 0, y: 24 }],
    [3, { x: -24, y: 0 }]
  ]);
  const projectedById = new Map();
  for (const [id, point] of retainedChartPoints.entries()) {
    projectedById.set(id, rotate(point));
  }
  projectedById.set(4, rotate({ x: 48, y: 0 }));

  admitProjectedTiles({
    positions: retainedChartPoints,
    projectedById,
    pendingIds: [4],
    anchorId: 0
  });

  assert.deepEqual(retainedChartPoints.get(4), { x: 48, y: 0 });
  assert.equal(
    Math.hypot(
      retainedChartPoints.get(4).x - retainedChartPoints.get(1).x,
      retainedChartPoints.get(4).y - retainedChartPoints.get(1).y
    ),
    24
  );
});

test("successive high-latitude chart rebuilds keep newly entering neighbors attached", () => {
  const registered = simulateHighLatitudeTraversal(admitProjectedTiles);
  const translationOnly = simulateHighLatitudeTraversal(admitWithTranslationOnly);

  assert.ok(
    registered.admittedTotal > 500,
    `Expected a moving chart to admit many tiles, got ${registered.admittedTotal}`
  );
  assert.ok(
    registered.maxNeighborDistance < 31,
    `High-latitude traversal tore a neighboring tile edge to ${registered.maxNeighborDistance.toFixed(2)}px`
  );
  assert.ok(
    registered.maxNeighborStretch < 1.2,
    `High-latitude traversal stretched a neighboring tile edge by ${registered.maxNeighborStretch.toFixed(3)}x`
  );
  assert.ok(
    translationOnly.maxNeighborDistance > registered.maxNeighborDistance + 10,
    "Traversal regression must detect the former translation-only frame mismatch"
  );
});

function simulateHighLatitudeTraversal(admitTiles) {
  const graph = buildGeodesicGraph(5);
  const directionIndex = createDirectionIndex(graph);
  const positions = new Map();
  let viewX = 0;
  let viewY = 0;
  let previousDirection = directionAt(63.9, -25);
  let camera = northUpFrame(previousDirection);
  let admittedTotal = 0;
  let maxNeighborDistance = 0;
  let maxNeighborStretch = 1;

  for (let step = 0; step <= 80; step++) {
    const direction = directionAt(63.9, -25 + step * 0.35);
    if (step > 0) {
      const delta = [
        direction[0] - previousDirection[0],
        direction[1] - previousDirection[1],
        direction[2] - previousDirection[2]
      ];
      viewX += dot3(delta, camera.right) * TRAVERSAL_PIXELS_PER_RADIAN;
      viewY -= dot3(delta, camera.up) * TRAVERSAL_PIXELS_PER_RADIAN;
      camera = northUpFrame(direction);
    }

    const centerId = findNearestTileId(graph, directionIndex, direction);
    const projectedVisible = collectTraversalTiles(graph, camera);
    const projectedById = new Map(projectedVisible.map((point) => [point.id, point]));
    const pendingIds = projectedVisible
      .map((point) => point.id)
      .filter((id) => !positions.has(id));
    if (!positions.has(centerId)) {
      positions.set(centerId, { x: Math.round(viewX), y: Math.round(viewY) });
      const pendingIndex = pendingIds.indexOf(centerId);
      if (pendingIndex >= 0) pendingIds.splice(pendingIndex, 1);
    }

    admittedTotal += admitTiles({
      positions,
      projectedById,
      pendingIds,
      anchorId: centerId
    });
    const visibleIds = new Set(projectedById.keys());
    for (const id of positions.keys()) {
      if (!visibleIds.has(id)) positions.delete(id);
    }

    for (const [id, position] of positions.entries()) {
      for (const neighborId of graph.neighbors[id]) {
        const neighbor = positions.get(neighborId);
        if (!neighbor) continue;
        maxNeighborDistance = Math.max(
          maxNeighborDistance,
          Math.hypot(neighbor.x - position.x, neighbor.y - position.y)
        );
        const projected = projectedById.get(id);
        const projectedNeighbor = projectedById.get(neighborId);
        const projectedDistance = Math.hypot(
          projectedNeighbor.x - projected.x,
          projectedNeighbor.y - projected.y
        );
        const visualDistance = Math.hypot(
          neighbor.x - position.x,
          neighbor.y - position.y
        );
        maxNeighborStretch = Math.max(maxNeighborStretch, visualDistance / projectedDistance);
      }
    }
    previousDirection = direction;
  }

  return { admittedTotal, maxNeighborDistance, maxNeighborStretch };
}

function admitWithTranslationOnly({ positions, projectedById, pendingIds, anchorId }) {
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  if (!anchorPosition || !anchorProjected) throw new Error("Translation-only admission lost its anchor");
  for (const id of pendingIds) {
    const projected = projectedById.get(id);
    positions.set(id, {
      x: Math.round(anchorPosition.x + projected.x - anchorProjected.x),
      y: Math.round(anchorPosition.y + projected.y - anchorProjected.y)
    });
  }
  return pendingIds.length;
}

test("projection registration never changes scale or shear", () => {
  const positions = new Map([
    [0, { x: 10, y: 20 }],
    [1, { x: 10, y: 60 }]
  ]);
  const projectedById = new Map([
    [0, { x: 100, y: 100 }],
    [1, { x: 140, y: 100 }],
    [2, { x: 180, y: 100 }],
    [3, { x: 140, y: 140 }]
  ]);

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [2, 3],
    anchorId: 0
  });

  assert.deepEqual(positions.get(2), { x: 10, y: 100 });
  assert.deepEqual(positions.get(3), { x: -30, y: 60 });
  assert.equal(Math.hypot(positions.get(2).x - 10, positions.get(2).y - 20), 80);
  assert.equal(Math.hypot(positions.get(3).x - 10, positions.get(3).y - 20), Math.hypot(40, 40));
});

test("admission fails when its projected anchor is missing", () => {
  assert.throws(
    () => admitProjectedTiles({
      positions: new Map([[0, { x: 0, y: 0 }]]),
      projectedById: new Map([[1, { x: 20, y: 10 }]]),
      pendingIds: [1],
      anchorId: 0
    }),
    /Projected anchor position/
  );
});

function collectTraversalTiles(graph, camera) {
  const points = [];
  for (let id = 0; id < graph.tileCount; id++) {
    const projected = projectDirection(graphCenter(graph, id), camera);
    if (!projected) continue;
    if (
      projected.x < -TRAVERSAL_MARGIN ||
      projected.x > TRAVERSAL_SCREEN_W + TRAVERSAL_MARGIN ||
      projected.y < -TRAVERSAL_MARGIN ||
      projected.y > TRAVERSAL_SCREEN_H + TRAVERSAL_MARGIN
    ) continue;
    points.push({ id, ...projected });
  }
  return points;
}

function projectDirection(direction, camera) {
  const d = dot3(direction, camera.center);
  if (d <= 0.2) return null;
  const vx = dot3(direction, camera.right);
  const vy = dot3(direction, camera.up);
  const sinTheta = Math.sqrt(Math.max(0, 1 - d * d));
  const scale = sinTheta > 1e-6 ? Math.acos(clamp(d, -1, 1)) / sinTheta : 1;
  return {
    x: Math.round(TRAVERSAL_SCREEN_W / 2 + vx * scale * TRAVERSAL_PIXELS_PER_RADIAN),
    y: Math.round(TRAVERSAL_SCREEN_H / 2 - vy * scale * TRAVERSAL_PIXELS_PER_RADIAN)
  };
}

function northUpFrame(center) {
  const north = [0, 1, 0];
  const projection = projectToTangent(north, center);
  const up = normalize3(projection);
  const right = normalize3(cross3(up, center));
  return { center, right, up };
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

function projectToTangent(vector, normal) {
  const dot = dot3(vector, normal);
  return [
    vector[0] - normal[0] * dot,
    vector[1] - normal[1] * dot,
    vector[2] - normal[2] * dot
  ];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
