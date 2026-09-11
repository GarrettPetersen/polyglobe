import { forecastPortAssault } from "./portAssaultBattle.js";

self.addEventListener("message", ({ data }) => {
  try {
    forecastPortAssault(data.scenario, { seedKey: data.seedKey,
      onProgress: (forecast, complete) => self.postMessage({ seedKey: data.seedKey, forecast, complete })
    });
  } catch (error) {
    // Preserve the failure across the worker boundary; the client reports it.
    self.postMessage({ seedKey: data?.seedKey, error: error instanceof Error ? error.message : String(error) });
  }
});
