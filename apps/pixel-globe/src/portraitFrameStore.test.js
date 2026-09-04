import assert from "node:assert/strict";
import test from "node:test";

import { createPortraitFrameStore } from "./portraitFrameStore.js";

test("portrait frame store holds the last decoded expression during a same-character swap", () => {
  const store = createPortraitFrameStore();
  const neutral = { id: "neutral-frame" };

  store.store("captain", "captain|neutral", neutral);
  store.display("captain", "captain|neutral");

  assert.equal(store.has("captain|happy"), false);
  assert.equal(store.display("captain", "captain|happy"), neutral);
});

test("portrait frame store swaps atomically when the target expression is decoded", () => {
  const store = createPortraitFrameStore();
  const neutral = { id: "neutral-frame" };
  const happy = { id: "happy-frame" };

  store.store("captain", "captain|neutral", neutral);
  store.display("captain", "captain|neutral");
  assert.equal(store.display("captain", "captain|happy"), neutral);

  store.store("captain", "captain|happy", happy);
  assert.equal(store.has("captain|happy"), true);
  assert.equal(store.display("captain", "captain|happy"), happy);
});

test("portrait frame store never carries a portrait across characters", () => {
  const store = createPortraitFrameStore();
  store.store("captain", "captain|neutral", { id: "captain-frame" });
  store.display("captain", "captain|neutral");

  assert.equal(store.display("patron", "patron|attentive"), null);
});

test("a dialogue cannot become cacheable before every captain portrait is resident", () => {
  const store = createPortraitFrameStore();
  store.store("player", "player|neutral", { id: "player-frame" });

  const hailFrameKeys = ["player|neutral", "pirate-captain|angry"];
  assert.equal(store.hasEvery(hailFrameKeys), false);

  store.store("pirate-captain", "pirate-captain|angry", { id: "pirate-frame" });
  assert.equal(store.hasEvery(hailFrameKeys), true);
});

test("a late decoded expression cannot replace the frame currently being held", () => {
  const store = createPortraitFrameStore();
  const neutral = { id: "neutral-frame" };
  const skipped = { id: "skipped-frame" };

  store.store("captain", "captain|neutral", neutral);
  store.display("captain", "captain|neutral");
  store.store("captain", "captain|surprised", skipped);

  assert.equal(store.display("captain", "captain|happy"), neutral);
});

test("portrait frame store rejects malformed cache entries", () => {
  const store = createPortraitFrameStore();

  assert.throws(() => store.display("", "captain|neutral"), /character id/);
  assert.throws(() => store.has(""), /frame key/);
  assert.throws(() => store.hasEvery([]), /non-empty frame-key array/);
  assert.throws(() => store.hasEvery([""]), /frame key/);
  assert.throws(() => store.store("captain", "captain|neutral", null), /decoded frame/);
});
