import assert from "node:assert/strict";
import test from "node:test";

import { visibleRiverBankPixelSet } from "./riverBankOutline.js";

test("visible riverbanks are calculated after adjoining water segments are united", () => {
  const firstSegment = new Set(["1,2", "2,2", "3,2"]);
  const secondSegment = new Set(["4,2", "5,2", "6,2"]);
  const bank = visibleRiverBankPixelSet([firstSegment, secondSegment]);

  assert.equal(bank.has("3,2"), false);
  assert.equal(bank.has("4,2"), false);
  assert.equal(bank.has("3,1"), true);
  assert.equal(bank.has("4,3"), true);
});

test("visible riverbanks shade cardinal land pixels without chunky diagonal corners", () => {
  const bank = visibleRiverBankPixelSet([new Set(["2,2"])]);

  assert.deepEqual(
    [...bank].sort(),
    ["1,2", "2,1", "2,3", "3,2"]
  );
});

test("visible riverbanks reject malformed pixel groups", () => {
  assert.throws(() => visibleRiverBankPixelSet(new Set()), /array/);
  assert.throws(() => visibleRiverBankPixelSet([[]]), /must be a Set/);
  assert.throws(() => visibleRiverBankPixelSet([new Set(["bad"])]), /pixel key/);
});
