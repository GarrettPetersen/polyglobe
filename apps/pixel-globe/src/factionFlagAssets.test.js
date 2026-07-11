import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { FACTIONS, NEUTRAL_FACTION_ID, PIRATE_FACTION_ID } from "./factions.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const flagRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/factions/flags");

test("every faction has a sourced Resurrect pixel identifier", async () => {
  const manifest = JSON.parse(await readFile(join(flagRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.year, 1522);
  assert.equal(manifest.palette, "Resurrect 64");
  assert.equal(manifest.width, 32);
  assert.equal(manifest.height, 20);
  assert.deepEqual(
    manifest.factions.map((entry) => entry.id).sort(),
    FACTIONS.map((entry) => entry.id).sort()
  );

  const palette = new Set(RESURRECT_64_HEX);
  for (const entry of manifest.factions) {
    assert.ok(entry.evidence, `${entry.id} lacks an evidence level`);
    assert.ok(manifest.evidenceLevels[entry.evidence], `${entry.id} has an undocumented evidence level`);
    assert.ok(entry.representation, `${entry.id} lacks a representation`);
    assert.ok(entry.accuracyNote, `${entry.id} lacks an accuracy note`);
    if (![NEUTRAL_FACTION_ID, PIRATE_FACTION_ID].includes(entry.id)) {
      assert.ok(entry.sources.length > 0, `${entry.id} lacks provenance`);
      for (const source of entry.sources) assert.match(source.url, /^https:\/\//, `${entry.id} source URL`);
    }

    const image = await loadImage(join(flagRoot, entry.file));
    assert.equal(image.width, manifest.width, `${entry.id} width`);
    assert.equal(image.height, manifest.height, `${entry.id} height`);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let opaquePixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] === 0) continue;
      assert.equal(pixels[offset + 3], 255, `${entry.id} has partial alpha`);
      const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `${entry.id} contains non-Resurrect color #${hex}`);
      opaquePixels += 1;
    }
    assert.ok(opaquePixels > 0, `${entry.id} flag is blank`);
  }
});
