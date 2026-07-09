import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const distRoot = join(appRoot, "dist");
const publicRoot = join(appRoot, "public");
const sharedDataRoot = join(repoRoot, "examples/globe-demo/public");

const appEntries = [
  ["index.html", "index.html"],
  ["src", "src"]
];

const publicEntries = [
  ["assets", "assets"]
];

const sharedEntries = [
  ["earth-globe-cache-7.json", "shared/earth-globe-cache-7.json"],
  ["discrete-weather-bake-7.bin", "shared/discrete-weather-bake-7.bin"],
  ["globe-runtime-bake-7.bin", "shared/globe-runtime-bake-7.bin"],
  [
    "datasets/urbanization-dominance-pruned",
    "shared/datasets/urbanization-dominance-pruned"
  ]
];

async function mustExist(path) {
  try {
    await stat(path);
  } catch (error) {
    throw new Error(`Missing required Pixel Globe static build input: ${path}`, { cause: error });
  }
}

async function copyEntry(fromRoot, [from, to]) {
  const source = join(fromRoot, from);
  const target = join(distRoot, to);
  await mustExist(source);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });

for (const entry of appEntries) await copyEntry(appRoot, entry);
for (const entry of publicEntries) await copyEntry(publicRoot, entry);
for (const entry of sharedEntries) await copyEntry(sharedDataRoot, entry);

console.log(`Built Pirates of the Pixel Globe static site at ${distRoot}`);
