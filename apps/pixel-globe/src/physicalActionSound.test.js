import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const APP_ROOT = new URL("..", import.meta.url);

function functionSource(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} is missing`);
  assert.ok(end > start, `${name} has no ${nextName} boundary`);
  return source.slice(start, end);
}

test("physical action cues from Three Kingdoms Stratagem are bundled and credited", () => {
  for (const filename of [
    "three-kingdoms-stratagem-anchor-handling.ogg",
    "three-kingdoms-stratagem-ice-crack.ogg",
    "three-kingdoms-stratagem-ice-break.ogg",
    "three-kingdoms-stratagem-shipwright-hammer.ogg"
  ]) {
    const sound = readFileSync(new URL(`public/assets/sfx/${filename}`, APP_ROOT));
    assert.equal(sound.toString("ascii", 0, 4), "OggS", `${filename} is not an Ogg asset`);
  }

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(credits, /Three Kingdoms Stratagem - anchor handling, surface ice, and shipwright impact cues/);
});

test("important silent physical actions now trigger feedback", () => {
  const source = readFileSync(new URL("src/main.js", APP_ROOT), "utf8");

  const anchor = functionSource(source, "toggleAnchor", "maybeAutoAnchorAtNonPortQuestSite");
  assert.match(anchor, /playAnchorHandlingSound\(\{ raising: true \}\)/);
  assert.match(anchor, /playAnchorHandlingSound\(\{ raising: false \}\)/);

  const autoAnchor = functionSource(
    source,
    "maybeAutoAnchorAtNonPortQuestSite",
    "maybeRecoverCampaignTreasureAtAnchor"
  );
  assert.match(autoAnchor, /playAnchorHandlingSound\(\{ raising: false \}\)/);

  const repair = functionSource(source, "repairPlayerShipAtPort", "createWorldPassengerDialogueSession");
  assert.match(repair, /playShipRepairSound\(\)/);

  const shipyard = functionSource(source, "purchaseShipyardShip", "placeVikingLongshipEnthusiastAtPort");
  assert.match(shipyard, /playShipHandoverSound\(\)/);

  const surrender = functionSource(source, "handleNpcSurrender", "receivePlayerSurrenderedShipLoot");
  assert.match(surrender, /if \(state\) \{\s*playStruckColorsSound\(\)/);

  const ice = functionSource(source, "advancePendingWeatherMaskRefresh", "updateSurfaceIceTransition");
  assert.match(ice, /surfaceIceTransitionCueForTiles\(/);
  assert.match(ice, /playSurfaceIceTransitionSound\(iceCue\)/);

  const digOut = functionSource(source, "digPlayerOutOfSurfaceIce", "fillSnowGroundMaskForDay");
  assert.match(digOut, /playIceDigOutSound\(\)/);
});
