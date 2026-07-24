import assert from "node:assert/strict";
import test from "node:test";

import { formatSignedReputation } from "./reputationDisplay.js";

test("reputation display never rounds a fractional score across a requirement", () => {
  assert.equal(formatSignedReputation(14.6), "+14.6");
  assert.equal(formatSignedReputation(14.999), "+14.999");
  assert.equal(formatSignedReputation(15), "+15");
  assert.equal(formatSignedReputation(-14.8), "-14.8");
});

test("reputation display rejects invalid scores", () => {
  assert.throws(() => formatSignedReputation(Number.NaN), /invalid reputation/);
});
