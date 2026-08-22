import assert from "node:assert/strict";
import test from "node:test";

import { createExactByteMaskCache } from "./exactByteMaskCache.js";

test("exact byte-mask caches reuse equal masks without retaining mutable callers", () => {
  const cache = createExactByteMaskCache();
  const mask = new Uint8Array([0, 1, 0, 1]);
  const value = { id: "river-bank" };

  assert.equal(cache.get("lower", mask), undefined);
  assert.equal(cache.set("lower", mask, value), value);
  mask[1] = 0;

  assert.equal(cache.get("lower", new Uint8Array([0, 1, 0, 1])), value);
  assert.equal(cache.get("lower", mask), undefined);
  assert.equal(cache.get("upper", new Uint8Array([0, 1, 0, 1])), undefined);
  assert.equal(cache.size, 1);
});

test("exact byte-mask caches replace an exact entry and reject malformed keys", () => {
  const cache = createExactByteMaskCache();
  const mask = new Uint8Array([1, 2, 3]);

  cache.set("bank", mask, "first");
  cache.set("bank", mask, "second");
  assert.equal(cache.get("bank", mask), "second");
  assert.equal(cache.size, 1);
  assert.throws(() => cache.get("", mask), /non-empty prefix/);
  assert.throws(() => cache.get("bank", []), /Uint8Array/);
  assert.throws(() => cache.set("bank", mask, undefined), /cannot store undefined/);
  assert.throws(
    () => createExactByteMaskCache({ maximumEntries: 0 }),
    /positive entry limit/
  );
});

test("exact byte-mask caches evict the oldest distinct mask at their entry limit", () => {
  const cache = createExactByteMaskCache({ maximumEntries: 2 });
  const first = new Uint8Array([1]);
  const second = new Uint8Array([2]);
  const third = new Uint8Array([3]);

  cache.set("bank", first, "first");
  cache.set("bank", second, "second");
  cache.set("bank", third, "third");

  assert.equal(cache.size, 2);
  assert.equal(cache.get("bank", first), undefined);
  assert.equal(cache.get("bank", second), "second");
  assert.equal(cache.get("bank", third), "third");
});
