import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";

const generatedRoot = new URL("../capsule_art/generated/", import.meta.url);
const expectedOutputs = Object.freeze(new Map([
  ["capsule_header_en.png", [920, 430]],
  ["capsule_small_en.png", [462, 174]],
  ["capsule_main_en.png", [1232, 706]],
  ["capsule_vertical_en.png", [748, 896]],
  ["capsule_background.png", [1438, 810]],
  ["library_capsule_en.png", [600, 900]],
  ["library_header_en.png", [920, 430]],
  ["library_hero.png", [3840, 1240]],
  ["library_logo_en.png", [1280, 720]],
  ["community_icon_184.png", [184, 184]],
  ["client_icon_32.png", [32, 32]],
  ["shortcut_icon_256.png", [256, 256]],
  ["event_cover_en.png", [800, 450]],
  ["event_header_en.png", [1920, 622]],
  ["social_share_en.png", [1200, 630]],
  ["itchio_cover_en.png", [630, 500]]
]));

test("capsule generator produces the complete storefront image set", async () => {
  for (const [filename, [width, height]] of expectedOutputs) {
    const image = await loadImage(fileURLToPath(new URL(filename, generatedRoot)));
    assert.equal(image.width, width, `${filename} width`);
    assert.equal(image.height, height, `${filename} height`);
  }
});

test("capsule generator produces the active ship client icon comparison", async () => {
  const image = await loadImage(
    fileURLToPath(new URL("client-icon-ship-comparison.png", generatedRoot))
  );
  assert.equal(image.width, 900);
  assert.equal(image.height, 780);
});

test("capsule art keeps its title fonts and public-domain painting documented", async () => {
  const [generator, readme, credits] = await Promise.all([
    readFile(new URL("../tools/generate-capsule-art.mjs", import.meta.url), "utf8"),
    readFile(new URL("../capsule_art/README.md", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/CREDITS.md", import.meta.url), "utf8")
  ]);
  assert.match(generator, /public\/assets\/capsule\/detailed_title\.png/);
  assert.match(generator, /embarkation-of-henry-viii-at-dover\.jpg/);
  assert.match(readme, /Pirata One/);
  assert.match(readme, /Party LET/);
  assert.match(credits, /Pirata One - capsule title lettering/);
  assert.match(credits, /Party LET - capsule title ampersand/);
  assert.match(readme, /31 May 1520/);
  assert.match(readme, /public domain/i);
  assert.match(credits, /Embarkation of Henry VIII at Dover.*public domain/i);
});
