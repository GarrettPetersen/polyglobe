import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceIncrementalRowJob,
  createIncrementalRowJob
} from "./incrementalRowJob.js";

test("incremental rows spread outward from the point of interest", () => {
  const job = createIncrementalRowJob(7, 3);
  assert.deepEqual(job.rows, [3, 2, 4, 1, 5, 0, 6]);
});

test("incremental rows respect a time budget and eventually render every row once", () => {
  const job = createIncrementalRowJob(8, 4);
  const rendered = [];
  let elapsedMs = 0;
  const advance = () => advanceIncrementalRowJob(job, {
    budgetMs: 4,
    renderRow: (row) => {
      rendered.push(row);
      elapsedMs += 2;
    },
    now: () => elapsedMs
  });

  assert.deepEqual(advance(), { processedRows: 2, complete: false });
  assert.deepEqual(advance(), { processedRows: 2, complete: false });
  assert.deepEqual(advance(), { processedRows: 2, complete: false });
  assert.deepEqual(advance(), { processedRows: 2, complete: true });
  assert.deepEqual([...rendered].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test("incremental row jobs reject malformed work instead of stalling", () => {
  assert.throws(() => createIncrementalRowJob(0), /positive row count/);
  assert.throws(() => createIncrementalRowJob(2, Infinity), /finite focus row/);
  assert.throws(
    () => advanceIncrementalRowJob({}, { budgetMs: 4, renderRow() {} }),
    /valid job/
  );
});
