import assert from "node:assert/strict";
import test from "node:test";
import {
  LruChunkKeys,
  PagedTextureAtlasAllocator,
  TextureAtlasAllocator,
  allocateWorldSceneTexture,
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

test("failed texture atlas probes do not consume remaining shelf space", () => {
  const allocator = new TextureAtlasAllocator(16, 16, 1);
  allocator.allocate(10, 10);
  assert.equal(allocator.tryAllocate(10, 10), null);
  assert.deepEqual(allocator.allocate(2, 2), { x: 12, y: 1, width: 2, height: 2 });
});

test("paged texture atlases preserve allocations after one page fills", () => {
  const allocator = new PagedTextureAtlasAllocator(16, 16, 1);
  assert.deepEqual(
    allocator.allocate(10, 10),
    { pageIndex: 0, x: 1, y: 1, width: 10, height: 10 }
  );
  assert.deepEqual(
    allocator.allocate(10, 10),
    { pageIndex: 1, x: 1, y: 1, width: 10, height: 10 }
  );
  assert.equal(allocator.pageCount, 2);
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

test("world scene texture falls back to RGB8 when RGBA8 is unsupported", () => {
  const gl = framebufferGl([36061, 36053]);
  const format = allocateWorldSceneTexture(gl, {
    texture: {},
    framebuffer: {},
    width: 455,
    height: 256
  });

  assert.equal(format, "rgb8");
  assert.deepEqual(gl.internalFormats, [gl.RGBA8, gl.RGB8]);
  assert.equal(gl.lastFramebuffer, null);
});

test("world scene texture remembers a working RGB8 preference", () => {
  const gl = framebufferGl([36053]);
  const format = allocateWorldSceneTexture(gl, {
    texture: {},
    framebuffer: {},
    width: 910,
    height: 256,
    preferredFormat: "rgb8"
  });

  assert.equal(format, "rgb8");
  assert.deepEqual(gl.internalFormats, [gl.RGB8]);
});

test("world scene texture supports legacy RGBA render targets on strict drivers", () => {
  const gl = framebufferGl([36061, 36061, 36053]);
  const format = allocateWorldSceneTexture(gl, {
    texture: {},
    framebuffer: {},
    width: 455,
    height: 256
  });

  assert.equal(format, "rgba");
  assert.deepEqual(gl.internalFormats, [gl.RGBA8, gl.RGB8, gl.RGBA]);
  assert.deepEqual(gl.types, [gl.UNSIGNED_BYTE, gl.UNSIGNED_BYTE, gl.UNSIGNED_BYTE]);
});

test("world scene texture has a required low-color render-target fallback", () => {
  const gl = framebufferGl([36061, 36061, 36061, 36053]);
  const format = allocateWorldSceneTexture(gl, {
    texture: {},
    framebuffer: {},
    width: 455,
    height: 256
  });

  assert.equal(format, "rgb565");
  assert.deepEqual(gl.internalFormats, [gl.RGBA8, gl.RGB8, gl.RGBA, gl.RGB565]);
  assert.equal(gl.types.at(-1), gl.UNSIGNED_SHORT_5_6_5);
});

test("world scene texture reports every rejected framebuffer format", () => {
  const gl = framebufferGl([36061, 36054, 36061, 36054]);
  assert.throws(
    () => allocateWorldSceneTexture(gl, {
      texture: {},
      framebuffer: {},
      width: 455,
      height: 256
    }),
    /rgba8:36061, rgb8:36054, rgba:36061, rgb565:36054/
  );
  assert.equal(gl.lastFramebuffer, null);
});

function framebufferGl(statuses) {
  const remainingStatuses = [...statuses];
  return {
    TEXTURE_2D: 3553,
    FRAMEBUFFER: 36160,
    COLOR_ATTACHMENT0: 36064,
    FRAMEBUFFER_COMPLETE: 36053,
    RGBA8: 32856,
    RGBA: 6408,
    RGB8: 32849,
    RGB: 6407,
    RGB565: 36194,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT_5_6_5: 33635,
    internalFormats: [],
    types: [],
    lastFramebuffer: undefined,
    bindTexture() {},
    texImage2D(target, level, internalFormat, width, height, border, format, type) {
      this.internalFormats.push(internalFormat);
      this.types.push(type);
    },
    bindFramebuffer(target, framebuffer) {
      this.lastFramebuffer = framebuffer;
    },
    framebufferTexture2D() {},
    checkFramebufferStatus() {
      return remainingStatuses.shift();
    }
  };
}
