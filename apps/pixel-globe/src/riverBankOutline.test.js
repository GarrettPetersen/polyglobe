import assert from "node:assert/strict";
import test from "node:test";

import {
  riverBankTerrainCalls,
  visibleRiverBankPixelSet,
  visibleRiverBankPixelsFromRows
} from "./riverBankOutline.js";

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

test("numeric river rows produce the same joined cardinal outline", () => {
  const rows = new Map([[2, new Set([1, 2, 3, 4, 5, 6])]]);
  const bank = visibleRiverBankPixelsFromRows(rows)
    .map(({ x, y }) => `${x},${y}`)
    .sort();

  assert.equal(bank.includes("3,2"), false);
  assert.equal(bank.includes("4,2"), false);
  assert.equal(bank.includes("3,1"), true);
  assert.equal(bank.includes("4,3"), true);
});

test("numeric river rows reject malformed input", () => {
  assert.throws(() => visibleRiverBankPixelsFromRows([]), /grouped by row/);
  assert.throws(
    () => visibleRiverBankPixelsFromRows(new Map([["2", new Set([2])]])),
    /integer coordinates/
  );
});

test("riverbank shading samples land beneath a mouth but never open water", () => {
  const land = { id: 1, row: { t: "grass" } };
  const ocean = { id: 2, row: { t: "ocean" } };
  const calls = riverBankTerrainCalls([land, ocean], (row) => row.t === "ocean");

  assert.deepEqual(calls, [land]);
  assert.throws(() => riverBankTerrainCalls(new Set(), () => false), /array/);
  assert.throws(() => riverBankTerrainCalls([], null), /predicate/);
});
