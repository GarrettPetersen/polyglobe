import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const APP_ROOT = new URL("..", import.meta.url);

test("the whale surface blow keeps its editable source, production asset, and provenance", () => {
  const source = readFileSync(
    new URL("assets-source/sfx/nps-humpback-whale-surface-blow.wav", APP_ROOT)
  );
  assert.equal(source.toString("ascii", 0, 4), "RIFF");
  assert.equal(source.toString("ascii", 8, 12), "WAVE");

  const production = readFileSync(
    new URL("public/assets/sfx/nps-humpback-whale-surface-blow.ogg", APP_ROOT)
  );
  assert.equal(production.toString("ascii", 0, 4), "OggS");

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(
    credits,
    /H\. Lentfer \/ National Park Service - "Humpbacks and Murrelets" surface blow excerpt \(public domain; cleaned\)/
  );

  const provenance = readFileSync(
    new URL("public/assets/licenses/nps-humpback-whale-surface-blow.txt", APP_ROOT),
    "utf8"
  );
  assert.match(provenance, /00:28\.37/);
  assert.match(
    provenance,
    /https:\/\/www\.nps\.gov\/glba\/learn\/nature\/lower-bay-soundscape-gallery\.htm/
  );
});

test("underwater whale songs keep normalized production files and exact attribution", () => {
  const sounds = [
    ["dragon-studio-creepy-whale-song-323612", "Creepy Whale Song"],
    ["dragon-studio-haunting-whale-song-515260", "Haunting Whale Song"],
    ["freesound-community-cclaretc-whale-45996", "Whale"]
  ];
  for (const [filename] of sounds) {
    const source = readFileSync(new URL(`assets-source/sfx/${filename}.mp3`, APP_ROOT));
    const production = readFileSync(new URL(`public/assets/sfx/${filename}.ogg`, APP_ROOT));
    const hasId3Tag = source.toString("ascii", 0, 3) === "ID3";
    const hasMpegFrameSync = source[0] === 0xff && (source[1] & 0xe0) === 0xe0;
    assert.ok(hasId3Tag || hasMpegFrameSync, `${filename} is not an MP3 source`);
    assert.equal(production.toString("ascii", 0, 4), "OggS");
  }

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(credits, /DRAGON-STUDIO - "Creepy Whale Song" and "Haunting Whale Song"/);
  assert.match(credits, /cclaretc \/ Freesound Community - "Whale"/);
  const provenance = readFileSync(
    new URL("public/assets/licenses/whale-song-sources.txt", APP_ROOT),
    "utf8"
  );
  for (const [, title] of sounds) assert.match(provenance, new RegExp(`"${title}"`));
  assert.match(provenance, /creepy-whale-song-323612/);
  assert.match(provenance, /haunting-whale-song-515260/);
  assert.match(provenance, /nature-whale-45996/);
});
