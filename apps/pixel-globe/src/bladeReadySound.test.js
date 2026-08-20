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

test("the blade-ready cue is bundled and credited", () => {
  const sound = readFileSync(
    new URL("public/assets/sfx/three-kingdoms-stratagem-unsheath-sword.ogg", APP_ROOT)
  );
  assert.equal(sound.toString("ascii", 0, 4), "OggS");

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(credits, /Three Kingdoms Stratagem - sword unsheathing cue/);
});

test("drawing a blade cues whale finishing, port storming, and sword confrontations", () => {
  const source = readFileSync(new URL("src/main.js", APP_ROOT), "utf8");
  assert.match(
    source,
    /const SFX_BLADE_READY_URL = "assets\/sfx\/three-kingdoms-stratagem-unsheath-sword\.ogg";/
  );

  const whales = functionSource(source, "updateWhales", "captureWhalePresentationStarts");
  assert.match(whales, /event\.type === "exhausted"[\s\S]*?playBladeReadySound\(\)/);

  const portAssault = functionSource(source, "attemptPlayerPortConquest", "completePlayerPortConquest");
  assert.match(portAssault, /playBladeReadySound\(\)/);

  const captive = functionSource(
    source,
    "resolvePirateCaptiveConfrontation",
    "openReformedPirateCaptiveChoice"
  );
  assert.match(
    captive,
    /weapon && PIRATE_CAPTIVE_SWORD_ITEM_IDS\.has\(weapon\.id\)\) playBladeReadySound\(\)/
  );
});
