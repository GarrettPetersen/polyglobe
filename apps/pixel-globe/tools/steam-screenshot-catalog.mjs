import { AUTOMATIC_CAPTURE_FRAME_RATE } from "../src/captureDirector.js";
import { CAPTURE_VIEWPORTS, captureScenarioFromSearch } from "../src/captureScenarios.js";
import { SUPPORTED_LANGUAGES } from "../src/localization.js";
import { loadingCapsuleTitleSteamCode } from "../src/loadingScreenLocale.js";

export const STEAM_SCREENSHOT_WIDTH = 1920;
export const STEAM_SCREENSHOT_HEIGHT = 1080;
export const STEAM_SCREENSHOT_LOGICAL_WIDTH = CAPTURE_VIEWPORTS.steam.width;
export const STEAM_SCREENSHOT_LOGICAL_HEIGHT = CAPTURE_VIEWPORTS.steam.height;

export const STEAM_SCREENSHOT_LANGUAGES = Object.freeze(
  SUPPORTED_LANGUAGES.map(({ id, label, nativeLabel }) => Object.freeze({
    id,
    label,
    nativeLabel,
    steamCode: loadingCapsuleTitleSteamCode(id)
  }))
);

export const STEAM_SCREENSHOT_SHOTS = Object.freeze([
  screenshot({
    order: 1,
    id: "explore-pyramids",
    title: "Discover the Pyramids of Meroe",
    scenarioId: "trailer-explore-pyramid",
    atSeconds: 4.2
  }),
  screenshot({
    order: 2,
    id: "trade-cloves",
    title: "Buy cloves in Ternate",
    scenarioId: "trailer-trade-ternate",
    atSeconds: 3.5
  }),
  screenshot({
    order: 3,
    id: "fish-grand-banks",
    title: "Fish the Grand Banks",
    scenarioId: "trailer-fish-cod",
    atSeconds: 2.5
  }),
  screenshot({
    order: 4,
    id: "whale-hunt",
    title: "Harpoon a right whale",
    scenarioId: "trailer-whale-right",
    atSeconds: 2.7
  }),
  screenshot({
    order: 5,
    id: "fight-carrack-broadside",
    title: "Exchange broadsides off Iberia",
    scenarioId: "trailer-fight-atlantic",
    atSeconds: 1.6
  }),
  screenshot({
    order: 6,
    id: "pillage-havana",
    title: "Bombard Havana",
    scenarioId: "trailer-pillage-havana",
    atSeconds: 3.0
  }),
  screenshot({
    order: 7,
    id: "colonize-port-royal",
    title: "Found Port Royal",
    scenarioId: "trailer-colonize-found",
    atSeconds: 3.4
  }),
  screenshot({
    order: 8,
    id: "survive-lightning",
    title: "Survive a lightning strike",
    scenarioId: "trailer-survive-lightning",
    atSeconds: 2.0
  }),
  screenshot({
    order: 9,
    id: "meet-panda",
    title: "Meet a panda in Sichuan",
    scenarioId: "trailer-panda-encounter",
    atSeconds: 11.0
  }),
  screenshot({
    order: 10,
    id: "sail-great-barrier-reef",
    title: "Sail the Great Barrier Reef",
    scenarioId: "screenshot-sail-great-barrier-reef",
    atSeconds: 3.5
  }),
  screenshot({
    order: 11,
    id: "sail-spice-islands",
    title: "Sail the Spice Islands",
    scenarioId: "screenshot-sail-ternate",
    atSeconds: 3.5
  }),
  screenshot({
    order: 12,
    id: "sail-seto-inland-sea",
    title: "Sail the Seto Inland Sea",
    scenarioId: "screenshot-sail-seto",
    atSeconds: 1.5
  }),
  screenshot({
    order: 13,
    id: "sail-bosporus",
    title: "Sail the Bosporus",
    scenarioId: "screenshot-sail-bosporus",
    atSeconds: 1.5
  }),
  screenshot({
    order: 14,
    id: "sail-lake-victoria",
    title: "Sail Lake Victoria",
    scenarioId: "screenshot-sail-lake-victoria",
    atSeconds: 3.5
  })
]);

export function steamScreenshotFileName(shot, language) {
  const prefix = String(shot.order).padStart(2, "0");
  return `${prefix}_${shot.id}_${language.steamCode}.png`;
}

function screenshot(value) {
  if (!Number.isInteger(value.order) || value.order < 1 || value.order > 99) {
    throw new Error(`Invalid Steam screenshot order: ${value.order}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) {
    throw new Error(`Invalid Steam screenshot id: ${value.id}`);
  }
  const scenario = captureScenarioFromSearch(`?capture=${value.scenarioId}`);
  if (!scenario.sequence) {
    throw new Error(`Steam screenshot must use a scripted gameplay scenario: ${value.scenarioId}`);
  }
  const frameIndex = Math.ceil(value.atSeconds * AUTOMATIC_CAPTURE_FRAME_RATE) - 1;
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || value.atSeconds >= scenario.sequence.durationSeconds) {
    throw new Error(`Invalid frame time for Steam screenshot ${value.id}: ${value.atSeconds}`);
  }
  return Object.freeze({ ...value, frameIndex });
}

validateCatalog();

function validateCatalog() {
  const orders = new Set(STEAM_SCREENSHOT_SHOTS.map(({ order }) => order));
  const ids = new Set(STEAM_SCREENSHOT_SHOTS.map(({ id }) => id));
  if (orders.size !== STEAM_SCREENSHOT_SHOTS.length || ids.size !== STEAM_SCREENSHOT_SHOTS.length) {
    throw new Error("Steam screenshot orders and ids must be unique");
  }
  const languageIds = new Set(STEAM_SCREENSHOT_LANGUAGES.map(({ id }) => id));
  const steamCodes = new Set(STEAM_SCREENSHOT_LANGUAGES.map(({ steamCode }) => steamCode));
  if (languageIds.size !== SUPPORTED_LANGUAGES.length || steamCodes.size !== SUPPORTED_LANGUAGES.length) {
    throw new Error("Every supported language needs a unique Steam screenshot suffix");
  }
}
