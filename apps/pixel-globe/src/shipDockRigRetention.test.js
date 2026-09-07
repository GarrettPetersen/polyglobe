import test from "node:test";
import assert from "node:assert/strict";
import { dockRigHardwareToRemove } from "./shipDockRigRetention.js";

test("stowing a combined yard and batten mesh retains its structural yard", () => {
  const hardwareIndexes = new Set([10, 11, 12, 13]);
  const removed = dockRigHardwareToRemove({ hardwareIndexes,
    retainedIndexes: new Set([10, 11]), sailIndexes: new Set([1, 2]) });
  assert.deepEqual([...removed], [12, 13]);
  assert.deepEqual([...hardwareIndexes], [10, 11, 12, 13]);
});

test("yard retention rejects an unresolved or cloth selection", () => {
  for (const [retained, sails] of [[[99], []], [[10], [10]]]) {
    assert.throws(() => dockRigHardwareToRemove({ hardwareIndexes: new Set([10]),
      retainedIndexes: new Set(retained), sailIndexes: new Set(sails) }), /must belong to hardware/);
  }
});
