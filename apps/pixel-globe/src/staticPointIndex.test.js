import assert from "node:assert/strict";
import test from "node:test";

import {
  createStaticPointIndex,
  forEachStaticPointInRadius,
  nearestStaticPoint
} from "./staticPointIndex.js";

test("static point index finds the exact nearest point across cell boundaries", () => {
  const entries = [
    { id: "far", x: -25, y: 8 },
    { id: "near", x: 11, y: 4 },
    { id: "other", x: 29, y: -3 }
  ];
  const index = createStaticPointIndex(entries, { cellSize: 10 });

  const nearest = nearestStaticPoint(index, 9, 1);
  assert.equal(nearest.entry.id, "near");
  assert.equal(nearest.distanceSquared, 13);
});

test("static point nearest queries match a brute-force search on irregular geometry", () => {
  const entries = Array.from({ length: 173 }, (_, index) => ({
    id: index,
    px: ((index * 83) % 311) - 147,
    py: ((index * 47) % 257) - 119
  }));
  const pointForEntry = (entry) => ({ x: entry.px, y: entry.py });
  const index = createStaticPointIndex(entries, { cellSize: 19, pointForEntry });

  for (let y = -161; y <= 163; y += 17) {
    for (let x = -183; x <= 187; x += 23) {
      const expected = entries.reduce((best, entry) => {
        const dx = entry.px - x;
        const dy = entry.py - y;
        return Math.min(best, dx * dx + dy * dy);
      }, Number.POSITIVE_INFINITY);
      assert.equal(nearestStaticPoint(index, x, y).distanceSquared, expected);
    }
  }
});

test("static point radius queries visit only points strictly inside the radius", () => {
  const entries = [
    { id: "inside", x: 3, y: 4 },
    { id: "edge", x: 0, y: 10 },
    { id: "outside", x: 14, y: 0 }
  ];
  const index = createStaticPointIndex(entries, { cellSize: 8 });
  const visited = [];
  forEachStaticPointInRadius(index, 0, 0, 10, (point, distanceSquared) => {
    visited.push([point.entry.id, distanceSquared]);
  });

  assert.deepEqual(visited, [["inside", 25]]);
});
