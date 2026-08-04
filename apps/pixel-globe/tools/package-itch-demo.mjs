import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const appRoot = process.cwd();
const distRoot = path.join(appRoot, "dist-demo");
const outputZip = path.resolve(
  appRoot,
  process.argv[2] || "build/marque-and-reprisal-demo-itch.zip"
);

const ITCH_LIMITS = Object.freeze({
  maxFiles: 1000,
  fileSafetyMargin: 5,
  maxPathLength: 240,
  maxExtractedBytes: 500 * 1024 * 1024,
  maxSingleFileBytes: 200 * 1024 * 1024
});
const REQUIRED_RUNTIME_FILES = Object.freeze([
  "index.html",
  "src/bootstrap.js",
  "src/buildEdition.js",
  "assets/fonts/Silkscreen-Regular.ttf",
  "assets/factions/flags-atlas.png",
  "assets/ui/game-icons.png",
  "assets/terrain/resurrect-64/water_deep_01_01.png",
  "assets/characters/generated/character-portraits.json",
  "assets/vehicles/unity-ships/brigantine-32-headings.png",
  "assets/vehicles/unity-ships/mediterranean-galley-rowing-atlas-32-headings.png",
  "assets/vehicles/unity-ships/mediterranean-galley-rowing-atlas-32-headings-sink-depth.png",
  "assets/vehicles/unity-ships/mediterranean-galley-pivot-port-atlas-32-headings.png",
  "assets/vehicles/unity-ships/mediterranean-galley-pivot-port-atlas-32-headings-sink-depth.png",
  "assets/vehicles/unity-ships/mediterranean-galley-pivot-starboard-atlas-32-headings.png",
  "assets/vehicles/unity-ships/mediterranean-galley-pivot-starboard-atlas-32-headings-sink-depth.png",
  "assets/vehicles/unity-ships/galleass-rowing-atlas-32-headings.png",
  "assets/vehicles/unity-ships/galleass-rowing-atlas-32-headings-sink-depth.png",
  "assets/vehicles/unity-ships/galleass-pivot-port-atlas-32-headings.png",
  "assets/vehicles/unity-ships/galleass-pivot-port-atlas-32-headings-sink-depth.png",
  "assets/vehicles/unity-ships/galleass-pivot-starboard-atlas-32-headings.png",
  "assets/vehicles/unity-ships/galleass-pivot-starboard-atlas-32-headings-sink-depth.png",
  "assets/vehicles/horse-cart/horse-cart-walk-atlas-32-headings.png",
  "assets/vehicles/horse-cart/horse-cart-walk-atlas-32-headings-light.png",
  "assets/vehicles/horse-cart/horse-cart-walk-atlas-32-headings-shade.png",
  "assets/vehicles/horse-cart/horse-cart-walk-atlas-32-headings-shadow.png",
  "assets/vehicles/llama-caravan/llama-caravan-walk-atlas-32-headings.png",
  "assets/vehicles/llama-caravan/llama-caravan-walk-atlas-32-headings-light.png",
  "assets/vehicles/llama-caravan/llama-caravan-walk-atlas-32-headings-shade.png",
  "assets/vehicles/llama-caravan/llama-caravan-walk-atlas-32-headings-shadow.png",
  "assets/vehicles/ship-render-layers/manifest.json",
  "assets/vehicles/ship-render-layers/ship-render-layers-0.bin",
  "shared/earth-globe-cache-7.json",
  "shared/discrete-weather-bake-7.bin",
  "shared/globe-runtime-bake-7.bin"
]);

async function collectFiles(directory, baseDirectory = directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, baseDirectory));
      continue;
    }
    if (!entry.isFile()) continue;
    const relativePath = path.relative(baseDirectory, absolutePath).split(path.sep).join("/");
    const fileStat = await fs.stat(absolutePath);
    files.push({ absolutePath, relativePath, size: fileStat.size });
  }
  return files;
}

async function assertDemoBuild(files) {
  const packagedPaths = new Set(files.map((file) => file.relativePath));
  for (const requiredPath of REQUIRED_RUNTIME_FILES) {
    if (!packagedPaths.has(requiredPath)) {
      throw new Error(`Itch package is missing required runtime file: ${requiredPath}`);
    }
  }
  const unpackedFlag = files.find((file) => file.relativePath.startsWith("assets/factions/flags/"));
  if (unpackedFlag) {
    throw new Error(`Itch package contains an unpacked faction flag: ${unpackedFlag.relativePath}`);
  }
  const unpackedRowingFrame = files.find((file) => (
    /assets\/vehicles\/unity-ships\/.*-(?:rowing|pivot-port|pivot-starboard)-\d+-32-headings(?:-sink-depth)?\.png$/.test(
      file.relativePath
    )
  ));
  if (unpackedRowingFrame) {
    throw new Error(`Itch package contains an unpacked rowing frame: ${unpackedRowingFrame.relativePath}`);
  }
  const unpackedLandVehicleFrame = files.find((file) => (
    /assets\/vehicles\/(?:horse-cart|llama-caravan)\/.*-walk-\d+-32-headings(?:-(?:light|shade|shadow))?\.png$/.test(
      file.relativePath
    )
  ));
  if (unpackedLandVehicleFrame) {
    throw new Error(
      `Itch package contains an unpacked land-vehicle frame: ${unpackedLandVehicleFrame.relativePath}`
    );
  }
  const editionPath = path.join(distRoot, "src/buildEdition.js");
  const editionSource = await fs.readFile(editionPath, "utf8");
  if (!editionSource.includes('BUILD_EDITION_ID = "demo"') ||
      editionSource.includes("ACTIVE_PLAY_LIMIT_SECONDS")) {
    throw new Error("Itch package was not built as the unlimited Mediterranean demo edition");
  }
}

function assertItchLimits(files) {
  const extractedBytes = files.reduce((sum, file) => sum + file.size, 0);
  const safeFileLimit = ITCH_LIMITS.maxFiles - ITCH_LIMITS.fileSafetyMargin;
  if (files.length > safeFileLimit) {
    throw new Error(
      `Itch package contains ${files.length} files; it must stay below the ` +
      `${ITCH_LIMITS.maxFiles}-file platform boundary (target ${safeFileLimit})`
    );
  }
  if (extractedBytes > ITCH_LIMITS.maxExtractedBytes) {
    throw new Error(
      `Itch package extracts to ${formatBytes(extractedBytes)}; maximum is ` +
      formatBytes(ITCH_LIMITS.maxExtractedBytes)
    );
  }
  const overlong = files.find((file) => file.relativePath.length > ITCH_LIMITS.maxPathLength);
  if (overlong) throw new Error(`Itch package path is too long: ${overlong.relativePath}`);
  const oversized = files.find((file) => file.size > ITCH_LIMITS.maxSingleFileBytes);
  if (oversized) throw new Error(`Itch package file is too large: ${oversized.relativePath}`);
  return extractedBytes;
}

async function assertRelativeRuntimeUrls(files) {
  const textExtensions = new Set([".css", ".html", ".js", ".json"]);
  const absoluteRootPattern = /(?:["'(=]\s*)\/(?:assets|shared|src)\//;
  for (const file of files) {
    if (!textExtensions.has(path.extname(file.relativePath))) continue;
    const source = await fs.readFile(file.absolutePath, "utf8");
    if (absoluteRootPattern.test(source)) {
      throw new Error(`Itch package contains a root-absolute runtime URL: ${file.relativePath}`);
    }
  }
}

function zipFiles(files) {
  return new Promise((resolve, reject) => {
    const zip = spawn("zip", ["-q", outputZip, "-@"], {
      cwd: distRoot,
      stdio: ["pipe", "inherit", "inherit"]
    });
    zip.on("error", reject);
    zip.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`zip exited with code ${code}`));
    });
    zip.stdin.end(files.map((file) => file.relativePath).join("\n"));
  });
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const files = (await collectFiles(distRoot))
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
await assertDemoBuild(files);
const extractedBytes = assertItchLimits(files);
await assertRelativeRuntimeUrls(files);
await fs.mkdir(path.dirname(outputZip), { recursive: true });
await fs.rm(outputZip, { force: true });
await zipFiles(files);
const zipStat = await fs.stat(outputZip);

console.log(`Created ${path.relative(appRoot, outputZip)}`);
console.log(
  `${files.length} files, ${formatBytes(extractedBytes)} extracted, ${formatBytes(zipStat.size)} zipped`
);
