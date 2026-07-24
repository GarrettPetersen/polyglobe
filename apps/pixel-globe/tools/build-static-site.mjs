import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

import { DEMO_VOYAGE_LIMIT_SECONDS } from "../src/demoVoyage.js";

const BUILD_EDITION_FULL = "full";
const BUILD_EDITION_DEMO = "demo";
const DEMO_PORTRAIT_EXPRESSION_LIMIT = 4;
const CHARACTER_MANIFEST_PATH = "assets/characters/generated/character-portraits.json";
const SOURCE_ONLY_EXTENSIONS = new Set([".ase", ".aseprite"]);
const DEMO_TERRAIN_VARIANT = "resurrect-64";
const DEMO_PREBUILT_ICON_SOURCES = new Set([
  "assets/ui/anchor.png",
  "assets/misc/confucian.png",
  "assets/misc/faravahar.png",
  "assets/misc/fresh-water-cask.png",
  "assets/misc/ik_onkar.png",
  "assets/misc/jain.png",
  "assets/misc/om.png",
  "assets/misc/orthodox_cross.png",
  "assets/misc/shinto.png"
]);

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const publicRoot = join(appRoot, "public");
const sharedDataRoot = join(repoRoot, "examples/globe-demo/public");
const edition = buildEditionFromArgs(process.argv.slice(2));
const distRoot = join(appRoot, edition === BUILD_EDITION_DEMO ? "dist-demo" : "dist");
const maxPagesFileBytes = 24 * 1024 * 1024;

const appEntries = edition === BUILD_EDITION_DEMO
  ? [
      ["index.html", "index.html"],
      ["src/styles.css", "src/styles.css"],
      ["src/loadingScreenWorker.js", "src/loadingScreenWorker.js"],
      ["src/loadingScreenMotion.js", "src/loadingScreenMotion.js"]
    ]
  : [
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

const fullCharacterManifest = JSON.parse(
  await readFile(join(publicRoot, CHARACTER_MANIFEST_PATH), "utf8")
);
const demoCharacterManifest = edition === BUILD_EDITION_DEMO
  ? createDemoCharacterManifest(fullCharacterManifest)
  : null;
const demoPortraitFiles = demoCharacterManifest
  ? portraitFilesForManifest(demoCharacterManifest)
  : null;

async function mustExist(path) {
  try {
    return await stat(path);
  } catch (error) {
    throw new Error(`Missing required Pixel Globe static build input: ${path}`, { cause: error });
  }
}

async function copyEntry(fromRoot, [from, to], filter = null) {
  const source = join(fromRoot, from);
  const target = join(distRoot, to);
  const sourceStat = await mustExist(source);
  await mkdir(dirname(target), { recursive: true });
  if (sourceStat.isFile() && sourceStat.size > maxPagesFileBytes) {
    await copyLargeFileAsChunks(source, target, sourceStat.size);
    return;
  }
  await cp(source, target, {
    recursive: true,
    filter: filter ? (sourcePath) => filter(relative(fromRoot, sourcePath)) : undefined
  });
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

function buildEditionFromArgs(args) {
  let requested = BUILD_EDITION_FULL;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--edition") {
      requested = args[index + 1];
      index++;
    } else if (arg.startsWith("--edition=")) {
      requested = arg.slice("--edition=".length);
    } else {
      throw new Error(`Unknown static build argument: ${arg}`);
    }
  }
  if (![BUILD_EDITION_FULL, BUILD_EDITION_DEMO].includes(requested)) {
    throw new Error(`Unknown Pixel Globe build edition: ${requested}`);
  }
  return requested;
}

function shouldCopyAppPath(path) {
  const normalized = normalizePath(path);
  return !normalized.endsWith(".test.js");
}

function shouldCopyPublicPath(path) {
  const normalized = normalizePath(path);
  const fileName = basename(normalized);
  const extension = extname(fileName).toLowerCase();
  if (fileName === ".DS_Store" || SOURCE_ONLY_EXTENSIONS.has(extension)) return false;
  if (normalized.startsWith("assets/capsule/")) return false;
  if (normalized === "assets/social/gameplay-source.png") return false;
  if (normalized === "assets/fonts/born2bsporty-fs.otf") return false;
  if (normalized === "assets/ui/game-icons.json") return false;
  if (normalized.startsWith("assets/vehicles/sail-ship-16-headings")) return false;
  if (normalized === "assets/vehicles/unity-ships/unity-ships-contact-sheet.png") return false;
  if (/-32-headings-(?:preview|lighting-preview)\.png$/.test(normalized)) return false;

  if (edition !== BUILD_EDITION_DEMO) return true;
  if (
    normalized === "assets/ui/ship-icons" ||
    normalized.startsWith("assets/ui/ship-icons/") ||
    normalized === "assets/buildings/city-types/README.md" ||
    DEMO_PREBUILT_ICON_SOURCES.has(normalized)
  ) {
    return false;
  }
  if (normalized.startsWith("assets/terrain/")) {
    const demoTerrainRoot = `assets/terrain/${DEMO_TERRAIN_VARIANT}`;
    return normalized === demoTerrainRoot || normalized.startsWith(`${demoTerrainRoot}/`);
  }
  if (normalized.startsWith("assets/characters/") && normalized.endsWith(".png")) {
    return demoPortraitFiles.has(normalized);
  }
  return true;
}

function createDemoCharacterManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.sourceCharacters)) {
    throw new Error("Cannot create demo portrait manifest from malformed source data");
  }
  return {
    ...manifest,
    generatedBy: "tools/build-static-site.mjs --edition=demo",
    sourceCharacters: manifest.sourceCharacters.map((character) => ({
      ...character,
      expressions: selectDemoExpressions(character)
    }))
  };
}

function selectDemoExpressions(character) {
  if (!Array.isArray(character.expressions) || character.expressions.length === 0) {
    throw new Error(`Demo portrait source has no expressions: ${character?.id}`);
  }
  const ranked = character.expressions
    .map((expression, index) => ({
      expression,
      index,
      priority: demoExpressionPriority(expression.id)
    }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .slice(0, DEMO_PORTRAIT_EXPRESSION_LIMIT)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.expression);
  if (!ranked.some((expression) => expression.id === "neutral")) {
    throw new Error(`Demo portrait selection lost neutral expression: ${character.id}`);
  }
  return ranked;
}

function demoExpressionPriority(expressionId) {
  const preferred = [
    "neutral",
    "happy",
    "soft-smile",
    "smile",
    "sad",
    "worried",
    "angry",
    "stern",
    "concerned",
    "serious"
  ];
  const index = preferred.indexOf(expressionId);
  return index >= 0 ? index : preferred.length;
}

function portraitFilesForManifest(manifest) {
  const paths = new Set();
  for (const character of manifest.sourceCharacters) {
    for (const expression of character.expressions) {
      if (typeof expression.src !== "string" || !expression.src.startsWith("assets/characters/")) {
        throw new Error(`Demo portrait has invalid relative source: ${expression.src}`);
      }
      paths.add(decodeURIComponent(expression.src));
    }
  }
  return paths;
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function buildEditionModuleSource() {
  const limit = edition === BUILD_EDITION_DEMO ? DEMO_VOYAGE_LIMIT_SECONDS : null;
  return [
    `export const BUILD_EDITION_ID = ${JSON.stringify(edition)};`,
    `export const ACTIVE_PLAY_LIMIT_SECONDS = ${limit === null ? "null" : limit};`,
    ""
  ].join("\n");
}

async function bundleDemoRuntime() {
  await build({
    entryPoints: [join(appRoot, "src/bootstrap.js")],
    outfile: join(distRoot, "src/bootstrap.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    legalComments: "none",
    plugins: [{
      name: "pixel-globe-build-edition",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^\.\/buildEdition\.js$/ }, () => ({
          path: "buildEdition.js",
          namespace: "pixel-globe-build"
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "pixel-globe-build" }, () => ({
          contents: buildEditionModuleSource(),
          loader: "js"
        }));
      }
    }]
  });
}

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });

for (const entry of appEntries) await copyEntry(appRoot, entry, shouldCopyAppPath);
for (const entry of publicEntries) await copyEntry(publicRoot, entry, shouldCopyPublicPath);
for (const entry of sharedEntries) await copyEntry(sharedDataRoot, entry);

await writeFile(join(distRoot, "src/buildEdition.js"), buildEditionModuleSource());
if (edition === BUILD_EDITION_DEMO) await bundleDemoRuntime();
if (demoCharacterManifest) {
  await writeFile(
    join(distRoot, CHARACTER_MANIFEST_PATH),
    `${JSON.stringify(demoCharacterManifest, null, 2)}\n`
  );
}

console.log(`Built Marque & Reprisal ${edition} static site at ${distRoot}`);
