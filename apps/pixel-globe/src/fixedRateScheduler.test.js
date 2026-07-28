import assert from "node:assert/strict";
import test from "node:test";

import { createFixedRateScheduler } from "./fixedRateScheduler.js";

test("fixed-rate systems run only when their cadence is due", () => {
  const calls = [];
  const scheduler = createFixedRateScheduler([
    { id: "visible", hz: 20, update: (dt) => calls.push(dt) }
  ]);

  assert.equal(scheduler.advance(0.049).get("visible").steps, 0);
  assert.equal(scheduler.advance(0.001).get("visible").steps, 1);
  assert.deepEqual(calls, [0.05]);
});

test("scheduler reports changes while keeping systems at independent rates", () => {
  let fast = 0;
  let slow = 0;
  const scheduler = createFixedRateScheduler([
    { id: "fast", hz: 20, update: () => (++fast % 2) === 0 },
    { id: "slow", hz: 2, update: () => { slow += 1; } }
  ]);

  const result = scheduler.advance(0.5);
  assert.equal(result.get("fast").steps, 1);
  assert.equal(result.get("fast").changed, false);
  assert.equal(result.get("slow").steps, 1);
  assert.equal(slow, 1);
});

test("a long frame cannot cause an unbounded catch-up spiral", () => {
  let calls = 0;
  const scheduler = createFixedRateScheduler([
    {
      id: "physics",
      hz: 60,
      maxStepsPerAdvance: 2,
      maxAccumulatedSteps: 3,
      update: () => { calls += 1; }
    }
  ]);

  assert.equal(scheduler.advance(10).get("physics").steps, 2);
  assert.equal(scheduler.advance(0).get("physics").steps, 1);
  assert.equal(scheduler.advance(0).get("physics").steps, 0);
  assert.equal(calls, 3);
});

test("scheduler reset discards accumulated partial time", () => {
  let calls = 0;
  const scheduler = createFixedRateScheduler([
    { id: "audio", hz: 2, update: () => { calls += 1; } }
  ]);
  scheduler.advance(0.4);
  scheduler.reset("audio");
  scheduler.advance(0.2);
  assert.equal(calls, 0);
});

test("phase offsets keep independent systems from becoming due together", () => {
  const calls = [];
  const scheduler = createFixedRateScheduler([
    { id: "first", hz: 2, update: () => calls.push("first") },
    { id: "second", hz: 2, phaseSeconds: 0.25, update: () => calls.push("second") }
  ]);

  scheduler.advance(0.5);
  assert.deepEqual(calls, ["first"]);
  scheduler.advance(0.25);
  assert.deepEqual(calls, ["first", "second"]);
  scheduler.reset();
  scheduler.advance(0.5);
  assert.deepEqual(calls, ["first", "second", "first"]);
});

test("scheduler rejects malformed systems and frame deltas", () => {
  assert.throws(
    () => createFixedRateScheduler([{ id: "bad", hz: 0, update() {} }]),
    /invalid interval/
  );
  const scheduler = createFixedRateScheduler([{ id: "ok", hz: 1, update() {} }]);
  assert.throws(() => scheduler.advance(-1), /invalid delta/);
  assert.throws(
    () => createFixedRateScheduler([{ id: "bad-phase", hz: 2, phaseSeconds: 0.5, update() {} }]),
    /invalid phase/
  );
});
