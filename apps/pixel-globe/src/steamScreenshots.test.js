import assert from "node:assert/strict";
import test from "node:test";
import { captureScenarioFromSearch } from "./captureScenarios.js";
import { SUPPORTED_LANGUAGES } from "./localization.js";
import {
  STEAM_SCREENSHOT_HEIGHT,
  STEAM_SCREENSHOT_LANGUAGES,
  STEAM_SCREENSHOT_SHOTS,
  STEAM_SCREENSHOT_WIDTH,
  steamScreenshotFileName
} from "../tools/steam-screenshot-catalog.mjs";

test("Steam screenshots cover every supported interface language", () => {
  assert.equal(STEAM_SCREENSHOT_WIDTH, 1920);
  assert.equal(STEAM_SCREENSHOT_HEIGHT, 1080);
  assert.deepEqual(
    STEAM_SCREENSHOT_LANGUAGES.map(({ id }) => id),
    SUPPORTED_LANGUAGES.map(({ id }) => id)
  );
  assert.equal(new Set(STEAM_SCREENSHOT_LANGUAGES.map(({ steamCode }) => steamCode)).size, 11);
});

test("Steam screenshot catalog covers a broad set of gameplay without the main menu", () => {
  assert.deepEqual(
    STEAM_SCREENSHOT_SHOTS.map(({ id }) => id),
    [
      "explore-pyramids",
      "trade-cloves",
      "fish-grand-banks",
      "whale-hunt",
      "fight-carrack-broadside",
      "pillage-havana",
      "colonize-port-royal",
      "survive-lightning",
      "meet-panda",
      "sail-great-barrier-reef",
      "sail-spice-islands",
      "sail-seto-inland-sea",
      "sail-bosporus",
      "sail-lake-victoria"
    ]
  );
  for (const shot of STEAM_SCREENSHOT_SHOTS) {
    const scenario = captureScenarioFromSearch(`?capture=${shot.scenarioId}`);
    assert.ok(scenario.sequence);
    assert.ok(shot.frameIndex >= 0);
    assert.ok(shot.atSeconds < scenario.sequence.durationSeconds);
  }
});

test("new Steam sailing screenshots use unobstructed daylight sequences in varied regions", () => {
  const sailingShots = STEAM_SCREENSHOT_SHOTS.slice(-5);
  assert.equal(sailingShots.length, 5);
  assert.equal(new Set(sailingShots.map(({ scenarioId }) => scenarioId)).size, 5);
  for (const shot of sailingShots) {
    const scenario = captureScenarioFromSearch(`?capture=${shot.scenarioId}`);
    const solarHour = (
      scenario.world.hour + scenario.world.minute / 60 + scenario.player.lon / 15 + 24
    ) % 24;
    assert.equal(scenario.sequence.kind, "sail");
    assert.ok(solarHour >= 10 && solarHour <= 16);
    assert.deepEqual(scenario.encounters, []);
  }
});

test("Steam screenshot filenames use recognized language suffixes", () => {
  const shot = STEAM_SCREENSHOT_SHOTS[0];
  assert.equal(
    steamScreenshotFileName(shot, STEAM_SCREENSHOT_LANGUAGES[0]),
    "01_explore-pyramids_english.png"
  );
  assert.equal(
    steamScreenshotFileName(shot, STEAM_SCREENSHOT_LANGUAGES.at(-1)),
    "01_explore-pyramids_koreana.png"
  );
});
