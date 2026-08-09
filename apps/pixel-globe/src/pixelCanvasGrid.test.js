import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("runtime blur stays on the native logical pixel grid", () => {
  const main = source("./main.js");
  const filterAssignments = [...main.matchAll(/\b\w+\.filter\s*=/g)]
    .map((match) => match[0]);

  assert.deepEqual(filterAssignments, ["hazeContext.filter ="]);
  assert.match(
    main,
    /worldRenderer\.canvas\.width !== SCREEN_W[\s\S]+Chart repair blur must remain on the logical pixel canvas/
  );
  assert.match(main, /hazeContext\.setTransform\(1, 0, 0, 1, 0, 0\)/);
  assert.match(
    main,
    /hazeContext\.drawImage\(worldRenderer\.canvas, 0, 0, SCREEN_W, SCREEN_H\)/
  );
  assert.match(main, /ctx\.drawImage\(chartRepairFogCanvas, 0, 0\)/);
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
  assert.match(screenshots, /outputCtx\.imageSmoothingEnabled = false/);
});
