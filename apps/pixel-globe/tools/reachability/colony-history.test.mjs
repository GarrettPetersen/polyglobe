import test from "node:test";
import assert from "node:assert/strict";
import { colonyHistoryChanges } from "./colony-history.mjs";

test("colony restoration tolerates only floating-point noise in its derived distance", () => {
  const history = { distanceKm: 6028.150863648952, stage: "investigating", deadlineMinute: 100 };
  assert.deepEqual(colonyHistoryChanges(history, { ...history, distanceKm: 6028.150863648951 }), []);
  for (const distanceKm of [6028.151, NaN, Infinity, undefined, "6028.150863648952"]) {
    assert.equal(colonyHistoryChanges(history, { ...history, distanceKm })[0].key, "distanceKm");
  }
  assert.equal(colonyHistoryChanges(history, { ...history, deadlineMinute: 100 + Number.EPSILON * 100 })[0].key, "deadlineMinute");
  assert.equal(colonyHistoryChanges(history, { ...history, stage: "failed" })[0].key, "stage");
  assert.equal(colonyHistoryChanges(history, { ...history, newField: true })[0].key, "newField");
  assert.equal(colonyHistoryChanges(history, { stage: history.stage })[0].key, "deadlineMinute");
});
