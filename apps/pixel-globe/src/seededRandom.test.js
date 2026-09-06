import assert from "node:assert/strict";
import test from "node:test";
import { createRandomStream, nextSeededRandom } from "./seededRandom.js";
import { browserJourneyEnabled } from "./saveRestoreSmoke.js";

test("seeded random cursors survive JSON restoration and forks independently", () => {
  const first = createRandomStream(42);
  for (let i = 0; i < 17; i++) nextSeededRandom(first);
  const restored = JSON.parse(JSON.stringify(first));
  const cursor = first.value;
  const expected = Array.from({ length: 20 }, () => nextSeededRandom(first));
  assert.equal(restored.value, cursor);
  assert.deepEqual(Array.from({ length: 20 }, () => nextSeededRandom(restored)), expected);
  assert.ok(expected.every((value) => value >= 0 && value < 1));
  assert.throws(() => nextSeededRandom({ value: -1 }), /cursor/);
});
test("browser journey commands are restricted to explicitly enabled local hosts", () => {
  assert.equal(browserJourneyEnabled({ search: "", hostname: "example.com" }), false);
  assert.equal(browserJourneyEnabled({ search: "?browserJourney=1", hostname: "127.0.0.1" }), true);
  assert.throws(() => browserJourneyEnabled({ search: "?browserJourney=1", hostname: "example.com" }), /restricted/);
  assert.throws(() => browserJourneyEnabled({ search: "?browserJourney=true", hostname: "localhost" }), /Invalid/);
});
