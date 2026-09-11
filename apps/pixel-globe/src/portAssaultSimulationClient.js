// Recorded battles can take seconds for large crews. Keep their deterministic
// simulation off the UI thread, and release the worker after either outcome.
export function simulatePortAssaultInWorker(scenario, seed, {
  workerUrl, WorkerClass = globalThis.Worker, signal
} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { resolve(null); return; }
    const worker = new WorkerClass(workerUrl, { type: "module" });
    const cancel = () => { worker.terminate(); resolve(null); };
    signal?.addEventListener("abort", cancel, {once: true});
    const finish = () => { signal?.removeEventListener("abort", cancel); worker.terminate(); };
    const fail = message => {
      finish();
      reject(new Error(`Port assault simulation failed for ${scenario.cityId}: ${message}`));
    };
    worker.addEventListener("error", event => fail(event.message));
    worker.addEventListener("messageerror", () => fail("unreadable worker response"));
    worker.addEventListener("message", ({ data }) => {
      if (data?.error) return fail(data.error);
      if (data?.seed !== seed || data?.cityId !== scenario.cityId ||
          !Number.isFinite(data?.battle?.durationMs) || !Array.isArray(data?.battle?.events)) {
        return fail("invalid recorded battle");
      }
      finish();
      resolve(data.battle);
    });
    try {
      worker.postMessage({ kind: "battle", scenario, seed });
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  });
}
