import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas } from "../../../examples/globe-demo/node_modules/canvas/index.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputPath = join(appRoot, "public/assets/misc/water.png");
const canvas = createCanvas(6, 6);
const ctx = canvas.getContext("2d");
const palette = Object.freeze({
  D: "#2e222f",
  H: "#9e4539",
  B: "#e6904e",
  L: "#fbb954",
  W: "#4d9be6"
});
const rows = [
  ".DDDD.",
  "DLBBLD",
  "DHHHHD",
  "DLWWLD",
  "DHHHHD",
  ".DDDD."
];

ctx.clearRect(0, 0, canvas.width, canvas.height);
for (let y = 0; y < rows.length; y++) {
  for (let x = 0; x < rows[y].length; x++) {
    const color = palette[rows[y][x]];
    if (!color) continue;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }
}

writeFileSync(outputPath, canvas.toBuffer("image/png"));
console.log(`Built 1522 water cask icon at ${outputPath}`);
