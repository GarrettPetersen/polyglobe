#!/usr/bin/env node

import { readdir, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  createCanvas,
  loadImage
} from "../../../examples/globe-demo/node_modules/canvas/index.js";

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const titleRoot = join(appRoot, "public/assets/capsule");
const generatorPath = join(toolsRoot, "generate-capsule-art.mjs");
const outputRoot = join(appRoot, "capsule_art/generated-title-comparison");
const comparisonPath = join(outputRoot, "itch-title-comparison.png");
const coverName = "itchio_cover_en.png";

const titleFiles = (await readdir(titleRoot))
  .filter((name) => /^detailed_title(?:_[a-z0-9_]+)?\.png$/i.test(name))
  .sort(compareTitleNames);
if (titleFiles.length < 2) {
  throw new Error(`Title comparison requires at least two PNG sources; found ${titleFiles.length}`);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const rendered = [];
const renderedHashes = new Map();
for (const titleFile of titleFiles) {
  const slug = basename(titleFile, ".png").replace(/^detailed_title_?/, "") || "current";
  const variantOutput = join(outputRoot, slug);
  await runNode([
    generatorPath,
    "--title",
    relative(appRoot, join(titleRoot, titleFile)),
    "--output-dir",
    relative(appRoot, variantOutput),
    "--only",
    coverName
  ]);
  const coverPath = join(variantOutput, coverName);
  const coverHash = createHash("sha256").update(await readFile(coverPath)).digest("hex");
  const duplicateOf = renderedHashes.get(coverHash);
  if (duplicateOf) {
    console.log(`Skipped ${titleLabel(titleFile)}; identical to ${duplicateOf}`);
    continue;
  }
  const label = titleLabel(titleFile);
  renderedHashes.set(coverHash, label);
  rendered.push({ label, image: await loadImage(coverPath) });
}

const columns = 2;
const coverWidth = 630;
const coverHeight = 500;
const labelHeight = 42;
const gap = 24;
const margin = 24;
const rows = Math.ceil(rendered.length / columns);
const sheet = createCanvas(
  margin * 2 + coverWidth * columns + gap * (columns - 1),
  margin * 2 + (labelHeight + coverHeight) * rows + gap * (rows - 1)
);
const context = sheet.getContext("2d");
context.fillStyle = "#17130f";
context.fillRect(0, 0, sheet.width, sheet.height);
context.font = "bold 24px sans-serif";
context.textBaseline = "middle";

for (let index = 0; index < rendered.length; index++) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = margin + column * (coverWidth + gap);
  const y = margin + row * (labelHeight + coverHeight + gap);
  context.fillStyle = "#f0ddb1";
  context.fillText(rendered[index].label, x, y + labelHeight / 2);
  context.drawImage(rendered[index].image, x, y + labelHeight);
}

await writeFile(comparisonPath, sheet.toBuffer("image/png"));
console.log(`Generated ${relative(appRoot, comparisonPath)} (${sheet.width}x${sheet.height})`);

function compareTitleNames(a, b) {
  if (a === "detailed_title.png") return -1;
  if (b === "detailed_title.png") return 1;
  return a.localeCompare(b, "en", { numeric: true });
}

function titleLabel(fileName) {
  if (fileName === "detailed_title.png") return "CURRENT";
  return basename(fileName, ".png")
    .replace(/^detailed_title_/, "")
    .replace(/(\D)(\d+)/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toUpperCase();
}

function runNode(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, args, {
      cwd: appRoot,
      stdio: "inherit"
    });
    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`Capsule renderer exited with code ${code}`));
    });
  });
}
