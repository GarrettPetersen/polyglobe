import { createCitySceneRuntime } from "./main.js";

const requiredElement = (selector) => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`City visualizer is missing required element: ${selector}`);
  return element;
};

await createCitySceneRuntime({
  canvas: requiredElement("#scene"),
  stage: requiredElement("#stage"),
  loading: requiredElement("#loading"),
  controls: {
    citySelect: requiredElement("#city-select"),
    viewportSelect: requiredElement("#viewport-select"),
    shipSelect: requiredElement("#ship-select"),
    approachOverride: requiredElement("#approach-override"),
    leftBankCityOverride: requiredElement("#left-bank-city-override"),
    dockOverride: requiredElement("#dock-override"),
    fortOverride: requiredElement("#fort-override"),
    mountainOverride: requiredElement("#mountain-override"),
    leftTerrainOverride: requiredElement("#left-terrain-override"),
    rightTerrainOverride: requiredElement("#right-terrain-override"),
    windSpeedOverride: requiredElement("#wind-speed-override"),
    windDirectionOverride: requiredElement("#wind-direction-override"),
    resetOverrides: requiredElement("#reset-overrides"),
    ruleLedger: requiredElement("#rule-ledger"),
    destinationDialog: requiredElement("#destination-dialog"),
    destinationTitle: requiredElement("#destination-title"),
    destinationCopy: requiredElement("#destination-copy")
  }
});
