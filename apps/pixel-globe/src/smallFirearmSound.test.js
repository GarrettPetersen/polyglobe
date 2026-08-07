import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const APP_ROOT = new URL("..", import.meta.url);

test("the small-firearm report keeps its source, timed production asset, and attribution", () => {
  const source = readFileSync(
    new URL("assets-source/sfx/freesound_community-old-musket-bang-95873.mp3", APP_ROOT)
  );
  const hasId3Tag = source.toString("ascii", 0, 3) === "ID3";
  const hasMpegFrameSync = source[0] === 0xff && (source[1] & 0xe0) === 0xe0;
  assert.ok(hasId3Tag || hasMpegFrameSync, "small-firearm source is not an MP3");

  const production = readFileSync(
    new URL("public/assets/sfx/freesound_community-old-musket-bang-95873.ogg", APP_ROOT)
  );
  assert.equal(production.toString("ascii", 0, 4), "OggS");
  assert.ok(production.length > 4096);

  const normalizer = readFileSync(new URL("tools/normalize-sfx.mjs", APP_ROOT), "utf8");
  assert.match(normalizer, /freesound_community-old-musket-bang-95873\.mp3/);
  assert.match(normalizer, /startSeconds: 0\.325/);

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(
    credits,
    /Freesound Community - "Old Musket Bang" \(Pixabay 95873, Pixabay Content License; trimmed\)/
  );

  const provenance = readFileSync(
    new URL("public/assets/licenses/freesound_community-old-musket-bang-95873.txt", APP_ROOT),
    "utf8"
  );
  assert.match(provenance, /freesound_community/);
  assert.match(provenance, /95873/);
  assert.match(provenance, /Pixabay Content License/);
  assert.match(provenance, /about 30 ms after the firearm animation begins/);
});
