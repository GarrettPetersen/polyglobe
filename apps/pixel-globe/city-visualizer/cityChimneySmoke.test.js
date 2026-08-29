import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_CHIMNEY_SMOKE_EMITTERS,
  cityChimneySmokeParticles
} from "./cityChimneySmoke.js";

const visualizerRoot = dirname(fileURLToPath(import.meta.url));
const assetRoot = join(visualizerRoot, "assets/port-parallax");

test("each smoke emitter occupies the transparent pixel immediately above its authored flue", async () => {
  const manifest = JSON.parse(await readFile(join(assetRoot, "manifest.json"), "utf8"));
  const atlas = await loadImage(join(assetRoot, manifest.staticSheet));
  const canvas = createCanvas(atlas.width, atlas.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(atlas, 0, 0);
  const atlasPixels = context.getImageData(0, 0, atlas.width, atlas.height).data;

  for (const emitter of CITY_CHIMNEY_SMOKE_EMITTERS) {
    const frame = manifest.staticFrames.find((candidate) => candidate.layer === emitter.layerName);
    assert.ok(frame, `${emitter.layerName} has an exported atlas frame`);
    for (const mouthPixel of emitter.mouthPixels) {
      assert.equal(sceneAlpha(frame, atlasPixels, atlas.width, mouthPixel.x, mouthPixel.y), 255);
      assert.equal(sceneAlpha(frame, atlasPixels, atlas.width, mouthPixel.x, mouthPixel.y - 1), 0);
    }
    assert.equal(emitter.y, emitter.mouthPixels[0].y - 1);
  }
});

test("the smith produces the densest, darkest chimney plume", () => {
  const sampleTime = 4800;
  const samples = CITY_CHIMNEY_SMOKE_EMITTERS.map((emitter) => ({
    emitter,
    particles: cityChimneySmokeParticles(emitter, sampleTime)
  }));
  const smith = samples.find(({ emitter }) => emitter.id === "smith");
  assert.ok(smith);
  assert.ok(samples.slice(1).every(({ particles }) => smith.particles.length > particles.length));
  assert.ok(samples.slice(1).every(({ emitter }) => smith.emitter.opacity > emitter.opacity));
  assert.ok(smith.emitter.colors.includes("#3e3546"));
  assert.ok(samples.slice(1).every(({ emitter }) => !emitter.colors.includes("#3e3546")));
  for (const { emitter, particles } of samples) {
    assert.ok(particles.length > 0);
    assert.ok(particles.every((particle) => (
      Number.isInteger(particle.x) &&
      Number.isInteger(particle.y) &&
      Number.isInteger(particle.size) &&
      particle.size >= 1 &&
      particle.size <= emitter.maximumSize &&
      particle.y <= emitter.y &&
      particle.alpha >= 0 &&
      particle.alpha <= emitter.opacity
    )));
  }
});

function sceneAlpha(frame, atlasPixels, atlasWidth, sceneX, sceneY) {
  const localX = sceneX - frame.spriteSourceSize.x;
  const localY = sceneY - frame.spriteSourceSize.y;
  if (
    localX < 0 ||
    localX >= frame.frame.w ||
    localY < 0 ||
    localY >= frame.frame.h
  ) return 0;
  const atlasX = frame.frame.x + localX;
  const atlasY = frame.frame.y + localY;
  return atlasPixels[(atlasY * atlasWidth + atlasX) * 4 + 3];
}
