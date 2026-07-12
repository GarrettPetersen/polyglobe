import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const distRoot = join(appRoot, "dist");
const publicRoot = join(appRoot, "public");
const sharedDataRoot = join(repoRoot, "examples/globe-demo/public");
const maxPagesFileBytes = 24 * 1024 * 1024;

const appEntries = [
  ["index.html", "index.html"],
  ["src", "src"]
];

const publicEntries = [
  ["assets", "assets"]
];

const sharedEntries = [
  ["earth-globe-cache-7.json", "shared/earth-globe-cache-7.json"],
  ["mountains.json", "shared/mountains.json"],
  ["discrete-weather-bake-7.bin", "shared/discrete-weather-bake-7.bin"],
  ["globe-runtime-bake-7.bin", "shared/globe-runtime-bake-7.bin"],
  [
    "datasets/urbanization-dominance-pruned",
    "shared/datasets/urbanization-dominance-pruned"
  ]
];

async function mustExist(path) {
  try {
    return await stat(path);
  } catch (error) {
    throw new Error(`Missing required Pixel Globe static build input: ${path}`, { cause: error });
  }
}

async function copyEntry(fromRoot, [from, to]) {
  const source = join(fromRoot, from);
  const target = join(distRoot, to);
  const sourceStat = await mustExist(source);
  await mkdir(dirname(target), { recursive: true });
  if (sourceStat.isFile() && sourceStat.size > maxPagesFileBytes) {
    await copyLargeFileAsChunks(source, target, sourceStat.size);
    return;
  }
  await cp(source, target, { recursive: true });
}

async function copyLargeFileAsChunks(source, target, byteLength) {
  const bytes = await readFile(source);
  if (bytes.byteLength !== byteLength) {
    throw new Error(`Large file changed while reading: ${source}`);
  }
  const chunks = [];
  for (let offset = 0; offset < bytes.byteLength; offset += maxPagesFileBytes) {
    const index = chunks.length;
    const chunkName = `${basename(target)}.part${String(index).padStart(3, "0")}`;
    const chunkPath = join(dirname(target), chunkName);
    const chunk = bytes.subarray(offset, Math.min(offset + maxPagesFileBytes, bytes.byteLength));
    await writeFile(chunkPath, chunk);
    chunks.push({
      path: chunkName,
      byteLength: chunk.byteLength
    });
  }
  await writeFile(
    `${target}.chunks.json`,
    JSON.stringify({ byteLength: bytes.byteLength, chunks }, null, 2)
  );
}

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });

for (const entry of appEntries) await copyEntry(appRoot, entry);
for (const entry of publicEntries) await copyEntry(publicRoot, entry);
for (const entry of sharedEntries) await copyEntry(sharedDataRoot, entry);

console.log(`Built Marque & Reprisal static site at ${distRoot}`);
