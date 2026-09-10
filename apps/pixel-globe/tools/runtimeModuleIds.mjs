// Build and deployment must validate the same closed set of shipped modules.
export const RUNTIME_MODULE_IDS = Object.freeze([
  "src/bootstrap.js",
  "src/distantWorldWorker.js",
  "src/loadingScreenWorker.js",
  "src/localSaveCompressionWorker.js",
  "src/portAssaultForecastWorker.js"
]);
