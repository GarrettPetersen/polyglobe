import { readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const terrainRoot = join(appRoot, "public/assets/terrain");
const steps = 4;

const frames = [
  {
    shallow: "water_shallow_01.png",
    deep: "water_deep_01_01.png",
    suffix: "01"
  },
  {
    shallow: "water_shallow_02.png",
    deep: "water_deep_01_02.png",
    suffix: "02"
  }
];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

async function imageDataFor(path) {
  const img = await loadImage(path);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return {
    width: img.width,
    height: img.height,
    data: ctx.getImageData(0, 0, img.width, img.height).data
  };
}

function representativeColor(image) {
  const counts = new Map();
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] <= 50) continue;
    const r = image.data[i];
    const g = image.data[i + 1];
    const b = image.data[i + 2];
    const brightness = r * 0.299 + g * 0.587 + b * 0.114;
    if (brightness < 28) continue;
    const key = `${r},${g},${b}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) throw new Error("Could not find representative water color");
  return ranked[0][0].split(",").map(Number);
}

async function buildBlend(shallowPath, deepPath, t) {
  const shallow = await imageDataFor(shallowPath);
  const deep = await imageDataFor(deepPath);
  if (shallow.width !== deep.width || shallow.height !== deep.height) {
    throw new Error(`Water sprite dimensions differ: ${shallowPath} vs ${deepPath}`);
  }

  const shallowBase = representativeColor(shallow);
  const deepBase = representativeColor(deep);
  const targetBase = [
    lerp(shallowBase[0], deepBase[0], t),
    lerp(shallowBase[1], deepBase[1], t),
    lerp(shallowBase[2], deepBase[2], t)
  ];
  const contrast = 1 - t * 0.25;
  const canvas = createCanvas(shallow.width, shallow.height);
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(shallow.width, shallow.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const sa = shallow.data[i + 3];
    if (sa < 8) {
      image.data[i] = 0;
      image.data[i + 1] = 0;
      image.data[i + 2] = 0;
      image.data[i + 3] = 0;
      continue;
    }

    image.data[i] = clampByte(targetBase[0] + (shallow.data[i] - shallowBase[0]) * contrast);
    image.data[i + 1] = clampByte(targetBase[1] + (shallow.data[i + 1] - shallowBase[1]) * contrast);
    image.data[i + 2] = clampByte(targetBase[2] + (shallow.data[i + 2] - shallowBase[2]) * contrast);
    image.data[i + 3] = sa >= 128 ? 255 : sa;
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

async function main() {
  const variants = readdirSync(terrainRoot)
    .map((name) => join(terrainRoot, name))
    .filter((path) => statSync(path).isDirectory());

  for (const variantPath of variants) {
    for (const frame of frames) {
      const shallowPath = join(variantPath, frame.shallow);
      const deepPath = join(variantPath, frame.deep);
      for (let step = 1; step <= steps; step++) {
        const t = step / (steps + 1);
        const canvas = await buildBlend(shallowPath, deepPath, t);
        const output = join(variantPath, `water_depth_0${step}_${frame.suffix}.png`);
        writeFileSync(output, canvas.toBuffer("image/png"));
        console.log(output);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
