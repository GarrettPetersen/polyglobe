import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_CHIMNEY_SMOKE_EMITTERS,
  backgroundCityChimneySmokeEmitters,
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

test("background cities deterministically smoke from exactly half their scaled chimneys", async () => {
  const manifest = JSON.parse(await readFile(join(assetRoot, "manifest.json"), "utf8"));
  const frames = CITY_CHIMNEY_SMOKE_EMITTERS.map((emitter) => (
    manifest.staticFrames.find((frame) => frame.layer === emitter.layerName)
  ));
  assert.ok(frames.every(Boolean));
  const buildings = Array.from({ length: 12 }, (_, index) => {
    const frame = frames[index % frames.length];
    const scale = index < 6 ? 0.5 : 0.25;
    return Object.freeze({
      frame,
      x: 840 + index * 31,
      y: 420 - index * 3,
      width: Math.round(frame.frame.w * scale),
      height: Math.round(frame.frame.h * scale)
    });
  });
  const rows = [
    Object.freeze({ distanceFromFront: 2, buildings: Object.freeze(buildings.slice(6)) }),
    Object.freeze({ distanceFromFront: 0, buildings: Object.freeze(buildings.slice(0, 6)) })
  ];
  const options = { cityId: "london|united kingdom", side: "right", rows };
  const selected = backgroundCityChimneySmokeEmitters(options);
  const repeated = backgroundCityChimneySmokeEmitters(options);
  assert.equal(selected.length, Math.round(buildings.length / 2));
  assert.deepEqual(
    repeated.map(({ emitter }) => emitter.id),
    selected.map(({ emitter }) => emitter.id)
  );
  assert.equal(new Set(selected.map(({ building }) => building)).size, selected.length);

  const sourceByLayer = new Map(CITY_CHIMNEY_SMOKE_EMITTERS.map((emitter) => (
    [emitter.layerName, emitter]
  )));
  for (const { building, emitter } of selected) {
    const source = sourceByLayer.get(building.frame.layer);
    const scaleX = building.width / building.frame.frame.w;
    const scaleY = building.height / building.frame.frame.h;
    assert.equal(
      emitter.x,
      building.x + (source.x - building.frame.spriteSourceSize.x) * scaleX
    );
    assert.equal(
      emitter.y,
      building.y + (source.y - building.frame.spriteSourceSize.y) * scaleY
    );
    assert.equal(emitter.maximumSize, 1);
    assert.ok(emitter.opacity < source.opacity);
    assert.ok(emitter.rise >= 2 && emitter.rise <= source.rise);
    assert.ok(cityChimneySmokeParticles(emitter, 4800).every((particle) => (
      particle.size === 1 && particle.y <= Math.round(emitter.y)
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
