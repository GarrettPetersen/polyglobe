import assert from "node:assert/strict";
import test from "node:test";

import {
  DISTANT_WORLD_WORK_KIND,
  createDistantWorldWorkPlan
} from "./distantWorldWorkPlan.js";

test("distant-world work is ordered and split into bounded frame-sized batches", () => {
  const work = createDistantWorldWorkPlan({
    economy: true,
    maintenance: true,
    cartIds: ["c1", "c2", "c3"],
    shipIds: ["s1", "s2", "s3", "s4", "s5"]
  }, {
    cartBatchSize: 2,
    shipBatchSize: 3
  });

  assert.deepEqual(work.map((entry) => entry.kind), [
    DISTANT_WORLD_WORK_KIND.ECONOMY,
    DISTANT_WORLD_WORK_KIND.CARTS,
    DISTANT_WORLD_WORK_KIND.CARTS,
    DISTANT_WORLD_WORK_KIND.HIDEOUTS,
    DISTANT_WORLD_WORK_KIND.MAINTENANCE,
    DISTANT_WORLD_WORK_KIND.SHIPS,
    DISTANT_WORLD_WORK_KIND.SHIPS,
    DISTANT_WORLD_WORK_KIND.RESCHEDULE
  ]);
  assert.deepEqual(work[1].cartIds, ["c1", "c2"]);
  assert.deepEqual(work[2].cartIds, ["c3"]);
  assert.deepEqual(work[5].shipIds, ["s1", "s2", "s3"]);
  assert.deepEqual(work[6].shipIds, ["s4", "s5"]);
});

test("an otherwise empty due event still reschedules the worker", () => {
  const work = createDistantWorldWorkPlan({
    economy: false,
    maintenance: false,
    cartIds: [],
    shipIds: []
  });
  assert.deepEqual(work, [{ kind: DISTANT_WORLD_WORK_KIND.RESCHEDULE }]);
});

test("distant-world work rejects invalid batch limits", () => {
  const event = {
    economy: false,
    maintenance: false,
    cartIds: [],
    shipIds: []
  };
  assert.throws(
    () => createDistantWorldWorkPlan(event, { shipBatchSize: 0 }),
    /positive integer/
  );
});
