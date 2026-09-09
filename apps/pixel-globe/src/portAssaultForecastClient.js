const FORECAST_FIELDS = Object.freeze([
  "sampleCount", "successChance", "successPercent", "expectedCasualties", "expectedCasualtiesRounded",
  "casualtyRangeLow", "casualtyRangeHigh", "expectedDeaths", "expectedDeathsRounded", "deathRangeLow",
  "deathRangeHigh", "expectedWounded", "expectedWoundedRounded", "woundedRangeLow", "woundedRangeHigh", "expectedHullDamage"
]);

// One estimate is useful at a time. Replacing it terminates the old calculation;
// a late message may never overwrite the current city's odds.
export function createPortAssaultForecastClient({ workerUrl, WorkerClass = globalThis.Worker,
  onReady, onError = error => { throw error; } }) {
  if (typeof onReady !== "function" || typeof onError !== "function") throw new Error("Assault forecast requires lifecycle callbacks");
  let current = null;
  function clear() {
    current?.worker?.terminate();
    current = null;
  }
  function request(scenario, seedKey) {
    if (typeof seedKey !== "string" || !seedKey.trim()) throw new Error("Assault forecast requires a stable key");
    if (current?.key === seedKey) return current.result;
    clear();
    if (typeof WorkerClass !== "function") throw new Error("Assault forecast worker is unavailable");
    const worker = new WorkerClass(workerUrl, { type: "module" });
    const entry = { key: seedKey, worker, result: null };
    current = entry;
    function fail(message) {
      if (current !== entry) return;
      clear();
      onError(new Error(`Port assault forecast failed for ${scenario.cityId}: ${message}`));
    }
    worker.addEventListener("error", event => fail(event.message));
    worker.addEventListener("messageerror", () => fail("unreadable worker message"));
    worker.addEventListener("message", ({ data }) => {
      if (current !== entry || entry.result !== null) return;
      if (data?.seedKey !== seedKey) return fail("worker key mismatch");
      if (data.error) return fail(data.error);
      if (!data.forecast || !Number.isInteger(data.forecast.sampleCount) || data.forecast.sampleCount < 16 ||
          FORECAST_FIELDS.some(field => !Number.isFinite(data.forecast[field]))) return fail("invalid forecast result");
      entry.result = Object.freeze(data.forecast);
      worker.terminate();
      entry.worker = null;
      onReady();
    });
    try { worker.postMessage({ scenario, seedKey }); }
    catch (error) { fail(error.message); }
    return null;
  }
  return Object.freeze({ request, clear });
}
