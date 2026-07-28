import assert from "node:assert/strict";
import test from "node:test";
import {
  LruChunkKeys,
  TextureAtlasAllocator,
  quadVertices
} from "./worldWebglRenderer.js";

test("texture atlas allocation is deterministic and starts a new shelf", () => {
  const allocator = new TextureAtlasAllocator(32, 32, 1);
  assert.deepEqual(allocator.allocate(10, 5), { x: 1, y: 1, width: 10, height: 5 });
  assert.deepEqual(allocator.allocate(10, 7), { x: 12, y: 1, width: 10, height: 7 });
  assert.deepEqual(allocator.allocate(10, 4), { x: 1, y: 9, width: 10, height: 4 });
});

test("texture atlas fails loudly instead of overwriting resident art", () => {
  const allocator = new TextureAtlasAllocator(16, 16, 1);
  assert.throws(() => allocator.allocate(15, 1), /exceeds page dimensions/);
  allocator.allocate(10, 10);
  assert.throws(() => allocator.allocate(10, 10), /atlas is full/i);
});

test("batched quad vertices preserve painter geometry and exact UV bounds", () => {
  const vertices = quadVertices({
    sourceRect: { x: 16, y: 8, width: 8, height: 4 },
    textureWidth: 32,
    textureHeight: 16,
    destinationRect: { x: 10, y: 20, width: 16, height: 8 },
    color: [0.5, 0.75, 1, 0.25],
    refractionPx: 2,
    alphaThreshold: 0.1
  });
  assert.equal(vertices.length, 60);
  assert.deepEqual([...vertices.slice(0, 10)], [
    10, 20, 0.5, 0.5, 0.5, 0.75, 1, 0.25, 2, 0.10000000149011612
  ]);
  assert.deepEqual([...vertices.slice(50, 60)], [
    26, 28, 0.75, 0.75, 0.5, 0.75, 1, 0.25, 2, 0.10000000149011612
  ]);
});

test("batched quad vertices can mirror a sprite without changing its geometry", () => {
  const vertices = quadVertices({
    sourceRect: { x: 4, y: 2, width: 8, height: 4 },
    textureWidth: 16,
    textureHeight: 8,
    destinationRect: { x: 10, y: 20, width: 8, height: 4 },
    flipX: true
  });
  assert.equal(vertices[2], 0.75);
  assert.equal(vertices[12], 0.25);
  assert.equal(vertices[0], 10);
  assert.equal(vertices[10], 18);
});

test("chunk LRU evicts only after the configured resident limit", () => {
  const lru = new LruChunkKeys(2);
  assert.equal(lru.touch("a"), null);
  assert.equal(lru.touch("b"), null);
  assert.equal(lru.touch("a"), null);
  assert.equal(lru.touch("c"), "b");
  assert.deepEqual(lru.keys, ["a", "c"]);
});
