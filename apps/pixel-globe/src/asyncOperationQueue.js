// One scene sync reads the live port view while another is still selecting a city.
// The overlap clears destination labels and returns before the replacement is ready.
export function createAsyncOperationQueue() {
  let tail = Promise.resolve();
  let pendingCount = 0;
  let idleWaiters = [];

  function settleIdleWaiters() {
    if (pendingCount !== 0) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    for (const resolve of waiters) resolve();
  }

  return Object.freeze({
    enqueue(operation) {
      if (typeof operation !== "function") {
        throw new TypeError("Async operation queue requires a function");
      }
      pendingCount += 1;
      const previous = tail;
      let releaseGate;
      const gate = new Promise((resolve) => {
        releaseGate = resolve;
      });
      tail = gate;
      return previous.then(operation).finally(() => {
        releaseGate();
        pendingCount -= 1;
        if (pendingCount < 0) {
          throw new Error("Async operation queue released more operations than it started");
        }
        settleIdleWaiters();
      });
    },
    drained() {
      if (pendingCount === 0) return Promise.resolve();
      return new Promise((resolve) => {
        idleWaiters.push(resolve);
      });
    }
  });
}
