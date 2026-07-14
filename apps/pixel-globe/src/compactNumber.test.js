import assert from "node:assert/strict";
import test from "node:test";

import { formatCompactNumber } from "./compactNumber.js";

test("compact numbers preserve small values and abbreviate large balances", () => {
  assert.equal(formatCompactNumber(0), "0");
  assert.equal(formatCompactNumber(999), "999");
  assert.equal(formatCompactNumber(1000), "1k");
  assert.equal(formatCompactNumber(1200), "1.2k");
  assert.equal(formatCompactNumber(12500), "13k");
  assert.equal(formatCompactNumber(1_200_000), "1.2m");
  assert.equal(formatCompactNumber(1_200_000_000), "1.2b");
  assert.equal(formatCompactNumber(1_200_000_000_000), "1.2t");
});

test("compact numbers carry rounded values into the next suffix", () => {
  assert.equal(formatCompactNumber(999_999), "1m");
  assert.equal(formatCompactNumber(999_999_999), "1b");
  assert.equal(formatCompactNumber(999_999_999_999), "1t");
});

test("compact numbers reject balances the game state cannot safely represent", () => {
  assert.throws(() => formatCompactNumber(-1), /non-negative safe integer/);
  assert.throws(() => formatCompactNumber(1.5), /non-negative safe integer/);
  assert.throws(() => formatCompactNumber(Number.MAX_SAFE_INTEGER + 1), /non-negative safe integer/);
});
