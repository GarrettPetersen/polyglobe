#!/usr/bin/env node

import { execFile } from "node:child_process";
import {
  mkdir,
  readFile,
  rm,
  utimes,
  writeFile
} from "node:fs/promises";
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
const windowsOutputPath = join(generatedRoot, "marque-and-reprisal.ico");
const linuxOutputPath = join(
  generatedRoot,
  "marque-and-reprisal-linux-icons.zip"
);
const linuxIconRoot = join(generatedRoot, "platform-icons/linux");
const LINUX_SIZES = Object.freeze([16, 24, 32, 48, 64, 96, 128, 256, 512]);
const WINDOWS_SIZES = Object.freeze([16, 24, 32, 48, 64, 128, 256]);
const MAC_REPRESENTATIONS = Object.freeze([
  ["icp4", 16],
  ["icp5", 32],
  ["icp6", 64],
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024]
]);
const GENERATED_MTIME = new Date("2000-01-01T00:00:00Z");

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
    await utimes(path, GENERATED_MTIME, GENERATED_MTIME);
    linuxPaths.push(path);
  }

  await rm(linuxOutputPath, { force: true });
  await run("zip", [
    "-X",
    "-j",
    "-q",
    linuxOutputPath,
    ...linuxPaths
  ]);
  await assertZipContains(linuxOutputPath, linuxPaths);
  await writeFile(windowsOutputPath, renderWindowsIcon(source));
  await writeFile(macOutputPath, renderMacIcon(source));

  await assertIcns(macOutputPath);
  console.log(`Generated ${macOutputPath}`);
  console.log(`Generated ${linuxOutputPath}`);
  console.log(`Generated ${windowsOutputPath}`);
}

function renderPlatformIcon(source, size) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, size, size);
  return canvas.toBuffer("image/png");
}

function renderWindowsIcon(source) {
  const images = WINDOWS_SIZES.map((size) => renderPlatformIcon(source, size));
  const headerSize = 6;
  const entrySize = 16;
  const entriesSize = entrySize * images.length;
  const totalSize = headerSize + entriesSize +
    images.reduce((sum, image) => sum + image.length, 0);
  const icon = Buffer.alloc(totalSize);
  icon.writeUInt16LE(0, 0);
  icon.writeUInt16LE(1, 2);
  icon.writeUInt16LE(images.length, 4);

  let imageOffset = headerSize + entriesSize;
  for (let index = 0; index < images.length; index += 1) {
    const size = WINDOWS_SIZES[index];
    const image = images[index];
    const entryOffset = headerSize + index * entrySize;
    icon.writeUInt8(size === 256 ? 0 : size, entryOffset);
    icon.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    icon.writeUInt8(0, entryOffset + 2);
    icon.writeUInt8(0, entryOffset + 3);
    icon.writeUInt16LE(1, entryOffset + 4);
    icon.writeUInt16LE(32, entryOffset + 6);
    icon.writeUInt32LE(image.length, entryOffset + 8);
    icon.writeUInt32LE(imageOffset, entryOffset + 12);
    image.copy(icon, imageOffset);
    imageOffset += image.length;
  }
  return icon;
}

function renderMacIcon(source) {
  const elements = MAC_REPRESENTATIONS.map(([type, size]) => {
    const image = renderPlatformIcon(source, size);
    const element = Buffer.alloc(8 + image.length);
    element.write(type, 0, 4, "ascii");
    element.writeUInt32BE(element.length, 4);
    image.copy(element, 8);
    return element;
  });
  const totalSize = 8 + elements.reduce((sum, element) => sum + element.length, 0);
  const icon = Buffer.alloc(totalSize);
  icon.write("icns", 0, 4, "ascii");
  icon.writeUInt32BE(totalSize, 4);
  let offset = 8;
  for (const element of elements) {
    element.copy(icon, offset);
    offset += element.length;
  }
  return icon;
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
