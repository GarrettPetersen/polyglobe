#!/usr/bin/env node

import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  createCanvas,
  loadImage
} from "../../../examples/globe-demo/node_modules/canvas/index.js";

const run = promisify(execFile);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = join(appRoot, "capsule_art/generated");
const sourcePath = join(generatedRoot, "app_icon_512.png");
const macOutputPath = join(generatedRoot, "marque-and-reprisal.icns");
const linuxOutputPath = join(
  generatedRoot,
  "marque-and-reprisal-linux-icons.zip"
);
const linuxIconRoot = join(generatedRoot, "platform-icons/linux");
const LINUX_SIZES = Object.freeze([16, 24, 32, 48, 64, 96, 128, 256, 512]);
const MAC_REPRESENTATIONS = Object.freeze([
  ["icon_16x16.png", 16],
  ["icon_16x16@2x.png", 32],
  ["icon_32x32.png", 32],
  ["icon_32x32@2x.png", 64],
  ["icon_128x128.png", 128],
  ["icon_128x128@2x.png", 256],
  ["icon_256x256.png", 256],
  ["icon_256x256@2x.png", 512],
  ["icon_512x512.png", 512]
]);

async function main() {
  const source = await loadImage(sourcePath);
  if (source.width !== 512 || source.height !== 512) {
    throw new Error(
      `Platform icon source must be 512x512: ${source.width}x${source.height}`
    );
  }

  await mkdir(linuxIconRoot, { recursive: true });
  const linuxPaths = [];
  for (const size of LINUX_SIZES) {
    const path = join(
      linuxIconRoot,
      `marque-and-reprisal-${size}x${size}.png`
    );
    await writeFile(path, renderPlatformIcon(source, size));
    linuxPaths.push(path);
  }

  await rm(linuxOutputPath, { force: true });
  await run("zip", [
    "-j",
    "-q",
    linuxOutputPath,
    ...linuxPaths
  ]);
  await assertZipContains(linuxOutputPath, linuxPaths);

  const temporaryRoot = await mkdtemp(join(tmpdir(), "marque-platform-icons-"));
  try {
    const iconsetPath = join(
      temporaryRoot,
      "marque-and-reprisal.iconset"
    );
    await mkdir(iconsetPath);
    for (const [filename, size] of MAC_REPRESENTATIONS) {
      await writeFile(
        join(iconsetPath, filename),
        renderPlatformIcon(source, size)
      );
    }
    await run("iconutil", [
      "-c",
      "icns",
      iconsetPath,
      "-o",
      macOutputPath
    ]);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  await assertIcns(macOutputPath);
  console.log(`Generated ${macOutputPath}`);
  console.log(`Generated ${linuxOutputPath}`);
}

function renderPlatformIcon(source, size) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, size, size);
  return canvas.toBuffer("image/png");
}

async function assertZipContains(path, expectedPaths) {
  const { stdout } = await run("unzip", ["-Z1", path]);
  const entries = stdout.trim().split("\n").filter(Boolean).sort();
  const expected = expectedPaths.map((entry) => basename(entry)).sort();
  if (JSON.stringify(entries) !== JSON.stringify(expected)) {
    throw new Error(`Linux icon zip has unexpected contents: ${entries.join(", ")}`);
  }
}

async function assertIcns(path) {
  const buffer = await readFile(path);
  if (buffer.length < 8 || buffer.subarray(0, 4).toString("ascii") !== "icns") {
    throw new Error("Generated macOS icon is not an ICNS file");
  }
}

await main();
