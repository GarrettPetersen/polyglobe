import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_PLAY_LIMIT_SECONDS,
  BUILD_EDITION_ID
} from "./buildEdition.js";
import {
  DEMO_LIMIT_MESSAGE,
  DEMO_VOYAGE_LIMIT_SECONDS,
  demoVoyageLimitReached,
  startMenuEditionLabel
} from "./demoVoyage.js";

test("the checked-in source remains the unlimited full edition", () => {
  assert.equal(BUILD_EDITION_ID, "full");
  assert.equal(ACTIVE_PLAY_LIMIT_SECONDS, null);
  assert.equal(startMenuEditionLabel(BUILD_EDITION_ID), null);
});

test("only the demo build labels itself on the start menu", () => {
  assert.equal(startMenuEditionLabel("demo"), "DEMO");
  assert.throws(() => startMenuEditionLabel("preview"), /Unknown build edition/);
});

test("the demo voyage ends after two active hours", () => {
  assert.equal(DEMO_VOYAGE_LIMIT_SECONDS, 7200);
  assert.equal(demoVoyageLimitReached(7199.99, DEMO_VOYAGE_LIMIT_SECONDS), false);
  assert.equal(demoVoyageLimitReached(7200, DEMO_VOYAGE_LIMIT_SECONDS), true);
  assert.equal(demoVoyageLimitReached(9000, DEMO_VOYAGE_LIMIT_SECONDS), true);
});

test("the full build has no voyage time limit", () => {
  assert.equal(demoVoyageLimitReached(100000, null), false);
});

test("the demo ending tells players where the full game will be available", () => {
  assert.match(DEMO_LIMIT_MESSAGE, /demo version/i);
  assert.match(DEMO_LIMIT_MESSAGE, /Steam/);
});

test("demo voyage timing rejects malformed state", () => {
  assert.throws(() => demoVoyageLimitReached(-1, 7200), /Invalid active play time/);
  assert.throws(() => demoVoyageLimitReached(10, 0), /Invalid configured demo voyage limit/);
});
