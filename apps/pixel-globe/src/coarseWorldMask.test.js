import assert from "node:assert/strict";
import test from "node:test";

import {
  coarseMaskHasWorldTile,
  coarseTileIdForWorldTile,
  fillDiscreteWeatherFlagMask
} from "./coarseWorldMask.js";

test("coarse masks answer fine-world queries without expanding to world size", () => {
  const mapping = Uint32Array.from([0, 1, 1, 2, 0, 2]);
  const mask = Uint8Array.from([0, 1, 0]);
  assert.equal(coarseMaskHasWorldTile(mask, mapping, 0), false);
  assert.equal(coarseMaskHasWorldTile(mask, mapping, 1), true);
  assert.equal(coarseMaskHasWorldTile(mask, mapping, 2), true);
  assert.equal(coarseMaskHasWorldTile(mask, mapping, 5), false);
  assert.equal(mask.length, 3);
  assert.equal(mapping.length, 6);
  assert.throws(() => coarseTileIdForWorldTile(mapping, 6, mask.length), /Invalid world tile/);
});

test("snow-ground masks remain at discrete-climate resolution", () => {
  const bake = {
    tileCount: 3,
    ordinalByTileId: Int32Array.from([2, 0, 1]),
    packed: Uint8Array.from([
      0b0001, 0b0010, 0b0011,
      0b0010, 0b0001, 0b0000
    ])
  };
  const out = new Uint8Array(3);
  fillDiscreteWeatherFlagMask(bake, 0, 0b0010, out);
  assert.deepEqual([...out], [1, 0, 1]);
  fillDiscreteWeatherFlagMask(bake, 1, 0b0010, out);
  assert.deepEqual([...out], [0, 1, 0]);
  assert.throws(
    () => fillDiscreteWeatherFlagMask(bake, 0, 0b0010, new Uint8Array(6)),
    /expected 3/
  );
});
