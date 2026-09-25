import assert from "node:assert/strict";
import test from "node:test";
import { createAsyncOperationQueue } from "./asyncOperationQueue.js";

test("queued operations run one at a time and a drain waits for the follower", async () => {
  const queue = createAsyncOperationQueue();
  const order = [];
  let releaseFirst;
  const first = queue.enqueue(() => new Promise((resolve) => {
    order.push("first-start");
    releaseFirst = () => {
      order.push("first-end");
      resolve("first");
    };
  }));
  let secondStarted = false;
  const second = queue.enqueue(async () => {
    secondStarted = true;
    order.push("second");
    await Promise.resolve();
    order.push("second-end");
    return "second";
  });

  await Promise.resolve();
  assert.equal(secondStarted, false);
  releaseFirst();
  assert.equal(await first, "first");
  let drained = false;
  const drain = queue.drained().then(() => {
    drained = true;
  });
  assert.equal(drained, false);
  assert.equal(await second, "second");
  await drain;
  assert.equal(drained, true);
  assert.deepEqual(order, ["first-start", "first-end", "second", "second-end"]);
});

test("a rejected operation still lets the next operation and the drain finish", async () => {
  const queue = createAsyncOperationQueue();
  const first = queue.enqueue(async () => {
    throw new Error("scene sync failed");
  });
  const second = queue.enqueue(async () => "recovered");
  await assert.rejects(first, /scene sync failed/);
  assert.equal(await second, "recovered");
  await queue.drained();
});

test("an idle queue is already drained and rejects a non-function operation", async () => {
  const queue = createAsyncOperationQueue();
  await queue.drained();
  assert.throws(() => queue.enqueue(null), /requires a function/);
});
