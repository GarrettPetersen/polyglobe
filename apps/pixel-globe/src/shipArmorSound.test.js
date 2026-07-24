import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const APP_ROOT = new URL("..", import.meta.url);

test("the armored hull glance keeps its source, production asset, and attribution", () => {
  const source = readFileSync(
    new URL("assets-source/sfx/freesound_community-doorhit-98828.mp3", APP_ROOT)
  );
  const hasId3Tag = source.toString("ascii", 0, 3) === "ID3";
  const hasMpegFrameSync = source[0] === 0xff && (source[1] & 0xe0) === 0xe0;
  assert.ok(hasId3Tag || hasMpegFrameSync, "armor glance source is not an MP3");

  const production = readFileSync(
    new URL("public/assets/sfx/freesound_community-doorhit-98828.ogg", APP_ROOT)
  );
  assert.equal(production.toString("ascii", 0, 4), "OggS");
  assert.ok(production.length > 1000);

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(
    credits,
    /Freesound Community - "Door Hit" \(Pixabay 98828, Pixabay Content License\)/
  );

  const provenance = readFileSync(
    new URL("public/assets/licenses/freesound_community-doorhit-98828.txt", APP_ROOT),
    "utf8"
  );
  assert.match(provenance, /pixabay\.com\/sound-effects\/doorhit-98828/);
  assert.match(provenance, /Pixabay Content License/);
});
