import assert from "node:assert/strict";
import test from "node:test";

import { RELIGION_CATALOG } from "./characterReligion.js";
import {
  RELIGIOUS_ATTITUDE_MATRIX,
  RELIGIOUS_ATTITUDE_SAME_FAITH,
  religiousAttitude
} from "./religiousAttitudes.js";

test("religious attitudes form a complete symmetric matrix", () => {
  const ids = RELIGION_CATALOG.map(({ id }) => id);
  assert.deepEqual(Object.keys(RELIGIOUS_ATTITUDE_MATRIX).sort(), [...ids].sort());
  for (const leftId of ids) {
    assert.deepEqual(Object.keys(RELIGIOUS_ATTITUDE_MATRIX[leftId]).sort(), [...ids].sort());
    assert.equal(religiousAttitude(leftId, leftId), RELIGIOUS_ATTITUDE_SAME_FAITH);
    for (const rightId of ids) {
      assert.equal(religiousAttitude(leftId, rightId), religiousAttitude(rightId, leftId));
    }
  }
});

test("sectarian conflicts are strong while unrelated faiths are often neutral", () => {
  assert.equal(religiousAttitude("roman-catholic", "lutheran"), -6);
  assert.equal(religiousAttitude("sunni-islam", "shia-islam"), -6);
  assert.equal(religiousAttitude("roman-catholic", "sunni-islam"), -4);
  assert.equal(religiousAttitude("roman-catholic", "kami-buddhist"), 0);
  assert.equal(religiousAttitude("kami-buddhist", "chinese-traditional"), 2);
});
