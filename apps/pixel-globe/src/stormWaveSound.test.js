import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const APP_ROOT = new URL("..", import.meta.url);

test("the storm breaker keeps its source, production asset, and attribution", () => {
  const source = readFileSync(
    new URL("assets-source/sfx/catfox_alex-ocean-wave-slowly-236010.mp3", APP_ROOT)
  );
  const hasId3Tag = source.toString("ascii", 0, 3) === "ID3";
  const hasMpegFrameSync = source[0] === 0xff && (source[1] & 0xe0) === 0xe0;
  assert.ok(hasId3Tag || hasMpegFrameSync, "storm breaker source is not an MP3");

  const production = readFileSync(
    new URL("public/assets/sfx/catfox_alex-ocean-wave-slowly-236010.ogg", APP_ROOT)
  );
  assert.equal(production.toString("ascii", 0, 4), "OggS");
  assert.ok(production.length > 4096);

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(
    credits,
    /CatFox_Alex - "Ocean Wave Slowly" \(Pixabay 236010, Pixabay Content License\)/
  );

  const provenance = readFileSync(
    new URL("public/assets/licenses/catfox_alex-ocean-wave-slowly-236010.txt", APP_ROOT),
    "utf8"
  );
  assert.match(provenance, /CatFox_Alex/);
  assert.match(provenance, /236010/);
  assert.match(provenance, /Pixabay Content License/);
});
