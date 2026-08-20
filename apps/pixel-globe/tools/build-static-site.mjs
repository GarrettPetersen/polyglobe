import { execFile } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";

import { FACTIONS, factionHasFlag } from "../src/factions.js";
import { SHIP_ROWING_ANIMATION_SPECS } from "../src/shipRowingAnimation.js";
import {
  SHIP_SPRITE_SHEET_HEIGHT,
  SHIP_SPRITE_SHEET_WIDTH
} from "../src/shipSpriteLayout.js";
import { verifyLocalModuleGraph } from "./moduleGraphVerifier.mjs";

const BUILD_EDITION_FULL = "full";
const BUILD_EDITION_DEMO = "demo";
const DEMO_PORTRAIT_EXPRESSION_LIMIT = 3;
const CHARACTER_MANIFEST_PATH = "assets/characters/generated/character-portraits.json";
const CHARACTER_ATLAS_PATH = "assets/characters/generated/character-portraits-atlas.png";
const CHARACTER_PORTRAIT_SIZE = 64;
const CHARACTER_ATLAS_COLUMNS = 24;
const FACTION_FLAG_ATLAS_PATH = "assets/factions/flags-atlas.png";
const FACTION_FLAG_ATLAS_COLUMNS = 8;
const FACTION_FLAG_WIDTH = 32;
const FACTION_FLAG_HEIGHT = 20;
const SOURCE_ONLY_EXTENSIONS = new Set([".ase", ".aseprite"]);
const SOURCE_ONLY_PUBLIC_FILES = new Set([
  "assets/clouds/README.md",
  "assets/misc/barrel.png",
  "assets/misc/crate.png",
  "assets/misc/crate_empty.png",
  "assets/misc/hull.png"
]);
const DEMO_TERRAIN_VARIANT = "resurrect-64";
const DEMO_ROWING_ANIMATION_STEMS = Object.freeze([
  "rowing",
  "pivot-port",
  "pivot-starboard"
]);
const DEMO_LAND_VEHICLE_TYPES = Object.freeze(["horse-cart", "llama-caravan"]);
const DEMO_LAND_VEHICLE_FRAME_COUNT = 6;
const DEMO_LAND_VEHICLE_LAYERS = Object.freeze(["color", "light", "shade", "shadow"]);
const DEMO_PREBUILT_ICON_SOURCES = new Set([
  "assets/ui/anchor.png",
  "assets/misc/confucian.png",
  "assets/misc/faravahar.png",
  "assets/misc/ik_onkar.png",
  "assets/misc/jain.png",
  "assets/misc/om.png",
  "assets/misc/orthodox_cross.png",
  "assets/misc/shinto.png"
]);

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const execFileAsync = promisify(execFile);
const publicRoot = join(appRoot, "public");
const sharedDataRoot = join(repoRoot, "examples/globe-demo/public");
const edition = buildEditionFromArgs(process.argv.slice(2));
const distRoot = join(appRoot, edition === BUILD_EDITION_DEMO ? "dist-demo" : "dist");
const maxHostedFileBytes = edition === BUILD_EDITION_DEMO
  ? 200 * 1024 * 1024
  : 24 * 1024 * 1024;
const largeFileChunkBytes = 10 * 1024 * 1024;

const appEntries = edition === BUILD_EDITION_DEMO
  ? [
      ["index.html", "index.html"],
      ["privacy.html", "privacy.html"],
      ["src/styles.css", "src/styles.css"]
    ]
  : [
      ["index.html", "index.html"],
      ["privacy.html", "privacy.html"],
      ["src", "src"]
    ];

const runtimeDependencyEntries = [
  ["node_modules/fflate/LICENSE", "vendor/fflate.LICENSE"],
  ...(edition === BUILD_EDITION_FULL
    ? [["node_modules/fflate/esm/browser.js", "vendor/fflate.js"]]
    : [])
];

const publicEntries = [
  ["assets", "assets"]
];

const sharedEntries = [
  ["earth-globe-cache-7.json", "shared/earth-globe-cache-7.json"],
  ["mountains.json", "shared/mountains.json"],
  ["discrete-weather-bake-7.bin", "shared/discrete-weather-bake-7.bin"],
  ["globe-runtime-bake-7.bin", "shared/globe-runtime-bake-7.bin"],
  edition === BUILD_EDITION_DEMO
    ? [
        "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv",
        "shared/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"
      ]
    : [
        "datasets/urbanization-dominance-pruned",
        "shared/datasets/urbanization-dominance-pruned"
      ]
];

const fullCharacterManifest = JSON.parse(
  await readFile(join(publicRoot, CHARACTER_MANIFEST_PATH), "utf8")
);
const characterPortraitSourcePaths = new Set(
  fullCharacterManifest.sourceCharacters.flatMap((character) => (
    character.expressions.map((expression) => normalizePath(decodeURIComponent(expression.src)))
  ))
);
const buildCharacterManifest = edition === BUILD_EDITION_DEMO
  ? createDemoCharacterManifest(fullCharacterManifest)
  : structuredClone(fullCharacterManifest);
const buildRevision = await resolveBuildRevision();

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
  if (sourceStat.isFile() && sourceStat.size > maxHostedFileBytes) {
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
  for (let offset = 0; offset < bytes.byteLength; offset += largeFileChunkBytes) {
    const index = chunks.length;
    const chunkName = `${basename(target)}.part${String(index).padStart(3, "0")}`;
    const chunkPath = join(dirname(target), chunkName);
    const chunk = bytes.subarray(offset, Math.min(offset + largeFileChunkBytes, bytes.byteLength));
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
  if (
    fileName === ".DS_Store" ||
    SOURCE_ONLY_EXTENSIONS.has(extension) ||
    SOURCE_ONLY_PUBLIC_FILES.has(normalized)
  ) {
    return false;
  }
  if (normalized.startsWith("assets/capsule/")) return false;
  if (normalized === "assets/social/gameplay-source.png") return false;
  if (normalized === "assets/fonts/born2bsporty-fs.otf") return false;
  if (normalized === "assets/ui/game-icons.json") return false;
  if (normalized === CHARACTER_ATLAS_PATH || characterPortraitSourcePaths.has(normalized)) return false;
  if (normalized.startsWith("assets/vehicles/sail-ship-16-headings")) return false;
  if (normalized.endsWith("/contact-sheet.png") || normalized.endsWith("-contact-sheet.png")) {
    return false;
  }
  if (/-32-headings-(?:preview|lighting-preview)\.png$/.test(normalized)) return false;

  if (edition !== BUILD_EDITION_DEMO) return true;
  if (
    normalized === "assets/social" ||
    normalized.startsWith("assets/social/") ||
    normalized === "assets/factions/flags" ||
    normalized.startsWith("assets/factions/flags/") ||
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
  if (
    normalized.startsWith("assets/vehicles/unity-ships/") &&
    /-(?:rowing|pivot-port|pivot-starboard)-\d+-32-headings(?:-sink-depth)?\.png$/.test(normalized)
  ) {
    return false;
  }
  if (
    /^assets\/vehicles\/(?:horse-cart|llama-caravan)\/[^/]+-walk-\d+-32-headings(?:-(?:light|shade|shadow))?\.png$/.test(
      normalized
    )
  ) {
    return false;
  }
  if (normalized.startsWith("assets/characters/historical-battles/")) return true;
  if (normalized.startsWith("assets/characters/") && normalized.endsWith(".png")) {
    return false;
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
  const selected = new Set();
  selectFirstDemoExpression(character.expressions, selected, ["neutral"]);
  selectFirstDemoExpression(character.expressions, selected, [
    "overjoyed", "laughing", "happy", "pleased", "smile", "soft-smile", "knowing"
  ]);
  selectFirstDemoExpression(character.expressions, selected, [
    "crying", "pained", "hurt", "sad", "afraid", "worried", "concerned", "weary", "grimace"
  ]);
  for (const expression of character.expressions) {
    if (selected.size >= DEMO_PORTRAIT_EXPRESSION_LIMIT) break;
    selected.add(expression);
  }
  const ranked = character.expressions.filter((expression) => selected.has(expression));
  if (!ranked.some((expression) => expression.id === "neutral")) {
    throw new Error(`Demo portrait selection lost neutral expression: ${character.id}`);
  }
  return ranked;
}

function selectFirstDemoExpression(expressions, selected, preferredIds) {
  for (const expressionId of preferredIds) {
    const expression = expressions.find((entry) => entry.id === expressionId);
    if (!expression) continue;
    selected.add(expression);
    return;
  }
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

async function buildCharacterPortraitAtlas(manifest) {
  const expressions = manifest.sourceCharacters.flatMap((character) => character.expressions);
  const rows = Math.ceil(expressions.length / CHARACTER_ATLAS_COLUMNS);
  const canvas = createCanvas(
    CHARACTER_ATLAS_COLUMNS * CHARACTER_PORTRAIT_SIZE,
    rows * CHARACTER_PORTRAIT_SIZE
  );
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;

  for (const [index, expression] of expressions.entries()) {
    if (typeof expression.src !== "string" || !expression.src.startsWith("assets/characters/")) {
      throw new Error(`Character portrait has invalid relative source: ${expression.src}`);
    }
    const image = await loadImage(join(publicRoot, decodeURIComponent(expression.src)));
    if (image.width !== CHARACTER_PORTRAIT_SIZE || image.height !== CHARACTER_PORTRAIT_SIZE) {
      throw new Error(
        `Character portrait ${expression.src} must be ${CHARACTER_PORTRAIT_SIZE}x` +
        `${CHARACTER_PORTRAIT_SIZE}, got ${image.width}x${image.height}`
      );
    }
    const atlasX = (index % CHARACTER_ATLAS_COLUMNS) * CHARACTER_PORTRAIT_SIZE;
    const atlasY = Math.floor(index / CHARACTER_ATLAS_COLUMNS) * CHARACTER_PORTRAIT_SIZE;
    context.drawImage(image, atlasX, atlasY);
    expression.src = CHARACTER_ATLAS_PATH;
    expression.atlasX = atlasX;
    expression.atlasY = atlasY;
  }

  const atlasPath = join(distRoot, CHARACTER_ATLAS_PATH);
  await mkdir(dirname(atlasPath), { recursive: true });
  await writeFile(atlasPath, canvas.toBuffer("image/png"));
}

async function buildDemoFactionFlagAtlas() {
  const factions = FACTIONS.filter((faction) => factionHasFlag(faction.id));
  const rows = Math.ceil(factions.length / FACTION_FLAG_ATLAS_COLUMNS);
  const canvas = createCanvas(
    FACTION_FLAG_ATLAS_COLUMNS * FACTION_FLAG_WIDTH,
    rows * FACTION_FLAG_HEIGHT
  );
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  for (const [index, faction] of factions.entries()) {
    const image = await loadImage(
      join(publicRoot, `assets/factions/flags/${faction.id}.png`)
    );
    if (image.width !== FACTION_FLAG_WIDTH || image.height !== FACTION_FLAG_HEIGHT) {
      throw new Error(
        `Faction flag ${faction.id} must be ${FACTION_FLAG_WIDTH}x${FACTION_FLAG_HEIGHT}, ` +
          `got ${image.width}x${image.height}`
      );
    }
    const x = (index % FACTION_FLAG_ATLAS_COLUMNS) * FACTION_FLAG_WIDTH;
    const y = Math.floor(index / FACTION_FLAG_ATLAS_COLUMNS) * FACTION_FLAG_HEIGHT;
    context.drawImage(image, x, y);
  }
  const atlasPath = join(distRoot, FACTION_FLAG_ATLAS_PATH);
  await mkdir(dirname(atlasPath), { recursive: true });
  await writeFile(atlasPath, canvas.toBuffer("image/png"));
}

async function buildDemoRowingAtlases() {
  for (const [slug, spec] of SHIP_ROWING_ANIMATION_SPECS) {
    for (const animationStem of DEMO_ROWING_ANIMATION_STEMS) {
      await buildDemoRowingAtlas(slug, animationStem, spec.frames, "");
      await buildDemoRowingAtlas(slug, animationStem, spec.frames, "-sink-depth");
    }
  }
}

async function buildDemoRowingAtlas(slug, animationStem, frameCount, suffix) {
  const canvas = createCanvas(
    SHIP_SPRITE_SHEET_WIDTH,
    SHIP_SPRITE_SHEET_HEIGHT * frameCount
  );
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const fileName = `${slug}-${animationStem}-${frameIndex}-32-headings${suffix}.png`;
    const image = await loadImage(
      join(publicRoot, "assets/vehicles/unity-ships", fileName)
    );
    if (
      image.width !== SHIP_SPRITE_SHEET_WIDTH ||
      image.height !== SHIP_SPRITE_SHEET_HEIGHT
    ) {
      throw new Error(
        `Demo rowing frame ${fileName} must be ${SHIP_SPRITE_SHEET_WIDTH}x` +
        `${SHIP_SPRITE_SHEET_HEIGHT}, got ${image.width}x${image.height}`
      );
    }
    context.drawImage(image, 0, frameIndex * SHIP_SPRITE_SHEET_HEIGHT);
  }
  const atlasName = `${slug}-${animationStem}-atlas-32-headings${suffix}.png`;
  const atlasPath = join(distRoot, "assets/vehicles/unity-ships", atlasName);
  await mkdir(dirname(atlasPath), { recursive: true });
  await writeFile(atlasPath, canvas.toBuffer("image/png"));
}

async function buildDemoLandVehicleAtlases() {
  for (const vehicleType of DEMO_LAND_VEHICLE_TYPES) {
    for (const layer of DEMO_LAND_VEHICLE_LAYERS) {
      const suffix = layer === "color" ? "" : `-${layer}`;
      const firstName = `${vehicleType}-walk-0-32-headings${suffix}.png`;
      const first = await loadImage(join(publicRoot, "assets/vehicles", vehicleType, firstName));
      const canvas = createCanvas(first.width, first.height * DEMO_LAND_VEHICLE_FRAME_COUNT);
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = false;
      for (let frameIndex = 0; frameIndex < DEMO_LAND_VEHICLE_FRAME_COUNT; frameIndex++) {
        const fileName = `${vehicleType}-walk-${frameIndex}-32-headings${suffix}.png`;
        const image = frameIndex === 0
          ? first
          : await loadImage(join(publicRoot, "assets/vehicles", vehicleType, fileName));
        if (image.width !== first.width || image.height !== first.height) {
          throw new Error(
            `Demo land-vehicle frame ${fileName} is ${image.width}x${image.height}; ` +
            `expected ${first.width}x${first.height}`
          );
        }
        context.drawImage(image, 0, frameIndex * first.height);
      }
      const atlasName = `${vehicleType}-walk-atlas-32-headings${suffix}.png`;
      const atlasPath = join(distRoot, "assets/vehicles", vehicleType, atlasName);
      await mkdir(dirname(atlasPath), { recursive: true });
      await writeFile(atlasPath, canvas.toBuffer("image/png"));
    }
  }
}

function buildEditionModuleSource() {
  return [
    `export const BUILD_EDITION_ID = ${JSON.stringify(edition)};`,
    `export const BUILD_REVISION = ${JSON.stringify(buildRevision)};`,
    ""
  ].join("\n");
}

async function resolveBuildRevision() {
  const configured = process.env.BUILD_REVISION?.trim();
  if (configured) return configured.slice(0, 64);
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: repoRoot
    });
    const revision = stdout.trim();
    return revision || "unknown";
  } catch {
    return "unknown";
  }
}

async function stripDemoSocialMetadata() {
  const indexPath = join(distRoot, "index.html");
  const source = await readFile(indexPath, "utf8");
  const html = source
    .split("\n")
    .filter((line) => !/^\s*<meta (?:property="og:|name="twitter:)/.test(line))
    .join("\n");
  await writeFile(indexPath, html);
}

async function bundleDemoRuntime() {
  await build({
    entryPoints: {
      bootstrap: join(appRoot, "src/bootstrap.js"),
      loadingScreenWorker: join(appRoot, "src/loadingScreenWorker.js"),
      distantWorldWorker: join(appRoot, "src/distantWorldWorker.js"),
      localSaveCompressionWorker: join(appRoot, "src/localSaveCompressionWorker.js")
    },
    outdir: join(distRoot, "src"),
    bundle: true,
    entryNames: "[name]",
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
  await assertStandaloneDemoWorkers();
}

async function assertStandaloneDemoWorkers() {
  for (const fileName of [
    "loadingScreenWorker.js",
    "distantWorldWorker.js",
    "localSaveCompressionWorker.js"
  ]) {
    const workerPath = join(distRoot, "src", fileName);
    const source = await readFile(workerPath, "utf8");
    const relativeImports = [
      ...source.matchAll(/\b(?:from|import)\s*(?:\(\s*)?["'](\.[^"']+)["']/g)
    ].map((match) => match[1]);
    if (relativeImports.length > 0) {
      throw new Error(
        `Demo ${fileName} contains unresolved relative imports: ${relativeImports.join(", ")}`
      );
    }
  }
}

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });

for (const entry of appEntries) await copyEntry(appRoot, entry, shouldCopyAppPath);
for (const entry of runtimeDependencyEntries) await copyEntry(appRoot, entry);
for (const entry of publicEntries) await copyEntry(publicRoot, entry, shouldCopyPublicPath);
for (const entry of sharedEntries) await copyEntry(sharedDataRoot, entry);
if (edition === BUILD_EDITION_DEMO) await buildDemoFactionFlagAtlas();
await buildCharacterPortraitAtlas(buildCharacterManifest);
if (edition === BUILD_EDITION_DEMO) await buildDemoRowingAtlases();
if (edition === BUILD_EDITION_DEMO) await buildDemoLandVehicleAtlases();

await writeFile(join(distRoot, "src/buildEdition.js"), buildEditionModuleSource());
if (edition === BUILD_EDITION_DEMO) {
  await stripDemoSocialMetadata();
  await bundleDemoRuntime();
}
await writeFile(
  join(distRoot, CHARACTER_MANIFEST_PATH),
  `${JSON.stringify(buildCharacterManifest, null, 2)}\n`
);
await verifyLocalModuleGraph({
  rootDirectory: distRoot,
  entryPaths: ["src/bootstrap.js"]
});

console.log(`Built Marque & Reprisal ${edition} static site at ${distRoot}`);
