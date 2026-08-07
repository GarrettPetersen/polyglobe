import test from "node:test";
import assert from "node:assert/strict";
import { openNextPortArrivalFollowup } from "./portArrivalQueue.js";

test("port arrival follow-ups drain in priority order across successive dialogues", () => {
  const pending = new Set(["envoy", "naturalist", "discovery"]);
  const opened = [];
  const openers = ["envoy", "naturalist", "discovery"].map((id) => () => {
    if (!pending.has(id)) return false;
    pending.delete(id);
    opened.push(id);
    return true;
  });

  assert.equal(openNextPortArrivalFollowup(openers), true);
  assert.deepEqual(opened, ["envoy"]);
  assert.equal(openNextPortArrivalFollowup(openers), true);
  assert.deepEqual(opened, ["envoy", "naturalist"]);
  assert.equal(openNextPortArrivalFollowup(openers), true);
  assert.deepEqual(opened, ["envoy", "naturalist", "discovery"]);
  assert.equal(openNextPortArrivalFollowup(openers), false);
});

test("port arrival follow-up queues reject invalid openers and return values", () => {
  assert.throws(
    () => openNextPortArrivalFollowup([]),
    /requires at least one opener/
  );
  assert.throws(
    () => openNextPortArrivalFollowup([null]),
    /opener 0 is not a function/
  );
  assert.throws(
    () => openNextPortArrivalFollowup([() => "yes"]),
    /opener 0 did not return a boolean/
  );
});
