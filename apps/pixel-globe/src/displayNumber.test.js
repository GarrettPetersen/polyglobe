import assert from "node:assert/strict";
import test from "node:test";
import { formatDisplayQuantity } from "./displayNumber.js";

test("display quantities use readable decimals without scientific notation", () => {
  assert.equal(formatDisplayQuantity(0), "0");
  assert.equal(formatDisplayQuantity(4), "4");
  assert.equal(formatDisplayQuantity(1 / 12), "0.08");
  assert.equal(formatDisplayQuantity(1 / 3), "0.33");
  assert.equal(formatDisplayQuantity(1e-9), "<0.01");
  assert.equal(formatDisplayQuantity(1e24), "1000000000000000000000000");
});

test("display quantity precision is explicit and validated", () => {
  assert.equal(formatDisplayQuantity(1 / 12, { maximumFractionDigits: 3 }), "0.083");
  assert.equal(formatDisplayQuantity(1e-9, { maximumFractionDigits: 3 }), "<0.001");
  assert.throws(() => formatDisplayQuantity(-1), /finite non-negative/);
  assert.throws(() => formatDisplayQuantity(Number.NaN), /finite non-negative/);
  assert.throws(
    () => formatDisplayQuantity(1, { maximumFractionDigits: 13 }),
    /Invalid display quantity precision/
  );
});
