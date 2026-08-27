import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceIncrementalUniqueMapping,
  beginIncrementalUniqueMapping
} from "./incrementalUniqueMapping.js";

test("incremental unique mapping bounds costly work and preserves first-key order", () => {
  let mappingCalls = 0;
  const job = beginIncrementalUniqueMapping({
    source: [1, 2, 3, 4, 5, 6, 7],
    mapItem: (value) => {
      mappingCalls++;
      return { key: value % 3, value };
    },
    keyForItem: (item) => item.key
  });
  let progress;
  do {
    const before = mappingCalls;
    progress = advanceIncrementalUniqueMapping(job, 2);
    assert.ok(mappingCalls - before <= 2);
    if (!progress.complete) assert.equal(progress.items, null);
  } while (!progress.complete);

  assert.deepEqual(progress.items, [
    { key: 1, value: 1 },
    { key: 2, value: 2 },
    { key: 0, value: 3 }
  ]);
  assert.throws(
    () => advanceIncrementalUniqueMapping(job, 2),
    /already complete/
  );
});
