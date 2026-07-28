import assert from "node:assert/strict";
import test from "node:test";

import { createSpatialHash } from "./spatialHash.js";

test("spatial hash finds nearby entries once across overlapping cells", () => {
  const grid = createSpatialHash({ cellSize: 10 });
  grid.set({ id: "ship:a", kind: "ship", x: 9, y: 9, radius: 3, value: "a" });
  grid.set({ id: "ship:b", kind: "ship", x: 30, y: 30, radius: 2, value: "b" });

  const matches = grid.queryCircle({ x: 0, y: 0, radius: 11, kinds: ["ship"] });
  assert.deepEqual(matches.map((match) => match.entry.value), ["a"]);
});

test("spatial hash accounts for entity radius at a query boundary", () => {
  const grid = createSpatialHash({ cellSize: 8 });
  grid.set({ id: "battery:a", kind: "battery", x: 14, y: 0, radius: 5 });

  assert.equal(grid.queryCircle({ x: 0, y: 0, radius: 10 }).length, 1);
  assert.equal(grid.queryCircle({ x: 0, y: 0, radius: 8 }).length, 0);
});

test("replacing one kind leaves all other spatial categories intact", () => {
  const grid = createSpatialHash({ cellSize: 16 });
  grid.set({ id: "player", kind: "player", x: 0, y: 0 });
  grid.replaceKind("fish", [
    { id: "fish:a", x: 4, y: 0 },
    { id: "fish:b", x: 8, y: 0 }
  ]);
  grid.replaceKind("fish", [{ id: "fish:c", x: 12, y: 0 }]);

  assert.equal(grid.get("fish:a"), null);
  assert.equal(grid.get("player").kind, "player");
  assert.deepEqual(grid.entriesForKind("fish").map((entry) => entry.id), ["fish:c"]);
});

test("spatial hash updates moved entries without leaving stale cells", () => {
  const grid = createSpatialHash({ cellSize: 10 });
  grid.set({ id: "whale:a", kind: "whale", x: 2, y: 2 });
  grid.set({ id: "whale:a", kind: "whale", x: 102, y: 102 });

  assert.equal(grid.queryCircle({ x: 2, y: 2, radius: 4 }).length, 0);
  assert.equal(grid.queryCircle({ x: 102, y: 102, radius: 4 }).length, 1);
  assert.equal(grid.size, 1);
});

test("spatial hash rejects malformed entries and query geometry", () => {
  const grid = createSpatialHash();
  assert.throws(
    () => grid.set({ id: "bad", kind: "ship", x: Number.NaN, y: 0 }),
    /invalid point/
  );
  assert.throws(
    () => grid.queryCircle({ x: 0, y: 0, radius: -1 }),
    /non-negative radius/
  );
  assert.throws(
    () => grid.replaceKind("ship", [{ id: "same", x: 0, y: 0 }, { id: "same", x: 1, y: 1 }]),
    /duplicate id/
  );
});
