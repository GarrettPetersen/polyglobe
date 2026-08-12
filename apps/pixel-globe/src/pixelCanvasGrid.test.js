import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("runtime effects never bypass the native logical pixel grid", () => {
  const main = source("./main.js");
  const filterAssignments = [...main.matchAll(/\b\w+\.filter\s*=/g)]
    .map((match) => match[0]);

  assert.deepEqual(filterAssignments, []);
  assert.match(main, /const CHART_REPAIR_FOG_MASK_PIXEL_SIZE = 1/);
  assert.match(main, /ctx\.imageSmoothingEnabled = false;[\s\S]+ctx\.drawImage\(chartFogRaggedTexture\(frame\), 0, 0, SCREEN_W, SCREEN_H\)/);
  assert.doesNotMatch(main, /(?:style\.filter|backdropFilter)\s*=/);
});

test("every runtime presentation path uses nearest-neighbor sampling", () => {
  const styles = source("./styles.css");
  const worldRenderer = source("./worldWebglRenderer.js");
  const paletteRenderer = source("./dayNightPaletteRenderer.js");
  const loadingWorker = source("./loadingScreenWorker.js");
  const screenshots = source("./screenshotExport.js");

  assert.match(styles, /canvas\s*\{[\s\S]*image-rendering:\s*pixelated/);
  assert.match(styles, /canvas\s*\{[\s\S]*image-rendering:\s*crisp-edges/);
  assert.doesNotMatch(styles, /(?:^|[;{])\s*(?:filter|backdrop-filter)\s*:/m);

  for (const [label, renderer] of [
    ["world", worldRenderer],
    ["palette", paletteRenderer]
  ]) {
    assert.match(renderer, /TEXTURE_MIN_FILTER, gl\.NEAREST/, `${label} minification`);
    assert.match(renderer, /TEXTURE_MAG_FILTER, gl\.NEAREST/, `${label} magnification`);
    assert.doesNotMatch(renderer, /gl\.LINEAR/, `${label} linear sampling`);
  }

  assert.match(loadingWorker, /displayContext\.imageSmoothingEnabled = false/);
  assert.match(loadingWorker, /hardenPixelTextAlpha\(glyph\.data\)/);
  assert.match(loadingWorker, /displayContext\.drawImage\(statusRaster, x, y\)/);
  assert.match(screenshots, /outputCtx\.imageSmoothingEnabled = false/);
});
