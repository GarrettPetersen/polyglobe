import { forecastPortAssault, simulatePortAssault } from "./portAssaultBattle.js";

self.addEventListener("message", ({ data }) => {
  try {
    if (data.kind === "battle") {
      self.postMessage({seed: data.seed, cityId: data.scenario.cityId, battle: simulatePortAssault(data.scenario, data.seed)});
      return;
    }
    forecastPortAssault(data.scenario, { seedKey: data.seedKey,
      onProgress: (forecast, complete) => self.postMessage({ seedKey: data.seedKey, forecast, complete })
    });
  } catch (error) {
    // Preserve the failure across the worker boundary; the client reports it.
    self.postMessage({ seedKey: data?.seedKey, error: error instanceof Error ? error.message : String(error) });
  }
});
