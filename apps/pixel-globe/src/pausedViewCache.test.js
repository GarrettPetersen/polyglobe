import assert from "node:assert/strict";
import test from "node:test";

import {
  cachedPausedView,
  capturePausedView,
  clearPausedView,
  createPausedViewCache,
  currentPausedView
} from "./pausedViewCache.js";

test("a paused view is built once until explicitly invalidated", () => {
  const source = {};
  const cache = createPausedViewCache("Politics");
  let builds = 0;
  const first = cachedPausedView(cache, source, () => ({ build: ++builds }));
  const second = cachedPausedView(cache, source, () => ({ build: ++builds }));
  assert.strictEqual(second, first);
  assert.equal(builds, 1);

  clearPausedView(cache);
  const third = cachedPausedView(cache, source, () => ({ build: ++builds }));
  assert.notStrictEqual(third, first);
  assert.equal(builds, 2);
});

test("capturing refreshes a view even when the source identity is unchanged", () => {
  const source = {};
  const cache = createPausedViewCache("Ship information");
  const first = capturePausedView(cache, source, () => ({ revision: 1 }));
  const second = capturePausedView(cache, source, () => ({ revision: 2 }));
  assert.notStrictEqual(second, first);
  assert.strictEqual(currentPausedView(cache, source), second);
});

test("paused views fail loudly when missing or paired with another source", () => {
  const cache = createPausedViewCache("Aboard");
  const source = {};
  assert.throws(() => currentPausedView(cache, source), /stale or missing/);
  capturePausedView(cache, source, () => ({ roster: [] }));
  assert.throws(() => currentPausedView(cache, {}), /stale or missing/);
  assert.throws(() => capturePausedView(cache, source, () => null), /returned no value/);
});
