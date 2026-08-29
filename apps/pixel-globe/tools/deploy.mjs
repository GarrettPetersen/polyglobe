import { existsSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyRemoteModuleGraph } from "./moduleGraphVerifier.mjs";
import { verifyRemoteStartupAssets } from "./startupAssetVerifier.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const envPath = path.join(repoRoot, ".env");
const wranglerPath = path.join(appRoot, "node_modules/.bin/wrangler");
const distPath = path.join(appRoot, "dist");

if (!existsSync(wranglerPath)) {
  throw new Error("Wrangler is not installed. Run npm install in " + appRoot);
}
if (!existsSync(path.join(distPath, "index.html"))) {
  throw new Error("Game build is missing. Run npm run build first.");
}
const buildEditionSource = readFileSync(path.join(distPath, "src/buildEdition.js"), "utf8");
const revisionMatch = buildEditionSource.match(/BUILD_REVISION\s*=\s*"([^"]+)"/);
if (!revisionMatch) throw new Error("Game build is missing its revision marker");
const expectedRevision = localSourceRevision();
if (revisionMatch[1] !== expectedRevision) {
  throw new Error(
    `Game build revision ${revisionMatch[1]} does not match source revision ${expectedRevision}; ` +
    "run npm run build before deploying"
  );
}

const fileCredentials = existsSync(envPath)
  ? parseEnv(readFileSync(envPath, "utf8"))
  : {};
const accountId = requiredCredential(
  "PRODUCTION_CLOUDFLARE_ACCOUNT_ID",
  fileCredentials
);
const apiToken = requiredCredential(
  "PRODUCTION_CLOUDFLARE_API_TOKEN",
  fileCredentials
);
const args = [
  "pages",
  "deploy",
  distPath,
  "--project-name",
  "pirates-of-the-pixel-globe",
  "--branch",
  "master"
];
const commitHash = process.env.GITHUB_SHA?.trim();
if (commitHash) args.push("--commit-hash", commitHash);

const deployment = spawnSync(wranglerPath, args, {
  cwd: appRoot,
  env: {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_API_TOKEN: apiToken
  },
  stdio: "inherit"
});

if (deployment.error) throw deployment.error;
if (deployment.status !== 0) {
  throw new Error("Cloudflare Pages deployment exited with code " + deployment.status);
}

await verifyRemoteModuleGraph({
  baseUrl: "https://pirates-of-the-pixel-globe.pages.dev/",
  entryPaths: ["src/bootstrap.js"],
  expectedRevision: revisionMatch[1],
  exactModuleIds: [
    "src/bootstrap.js",
    "src/distantWorldWorker.js",
    "src/loadingScreenWorker.js",
    "src/localSaveCompressionWorker.js"
  ],
  attempts: 90,
  retryDelayMs: 1_000
});
const startupAssets = await verifyRemoteStartupAssets({
  baseUrl: "https://pirates-of-the-pixel-globe.pages.dev/",
  subdivisions: 8
});
const cityVisualizer = await verifyRemoteCityVisualizer({
  baseUrl: "https://pirates-of-the-pixel-globe.pages.dev/",
  attempts: 90,
  retryDelayMs: 1_000
});
process.stdout.write(`Verified deployed JavaScript module graph for ${revisionMatch[1]}\n`);
process.stdout.write(`Verified deployed startup Earth cache (${startupAssets.earthTileCount} tiles)\n`);
process.stdout.write(`Verified deployed city visualizer (${cityVisualizer.cityCount} cities)\n`);

async function verifyRemoteCityVisualizer({ baseUrl, attempts, retryDelayMs }) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const cacheBust = `deployment_check=${Date.now()}-${attempt}`;
    try {
      const indexUrl = new URL("city-visualizer/", baseUrl);
      indexUrl.search = cacheBust;
      const indexResponse = await fetch(indexUrl, { cache: "no-store" });
      if (!indexResponse.ok) {
        throw new Error(`city visualizer index returned HTTP ${indexResponse.status}`);
      }
      const html = await indexResponse.text();
      if (
        !html.includes("Marque &amp; Reprisal — City Visualizer") ||
        !html.includes('src="./main.js"')
      ) {
        throw new Error("city visualizer route returned the wrong HTML shell");
      }

      const scriptUrl = new URL("city-visualizer/main.js", baseUrl);
      scriptUrl.search = cacheBust;
      const catalogUrl = new URL("city-visualizer/data/cities.json", baseUrl);
      catalogUrl.search = cacheBust;
      const atlasUrl = new URL("city-visualizer/assets/port-parallax/static.png", baseUrl);
      atlasUrl.search = cacheBust;
      const [scriptResponse, catalogResponse, atlasResponse] = await Promise.all([
        fetch(scriptUrl, { cache: "no-store" }),
        fetch(catalogUrl, { cache: "no-store" }),
        fetch(atlasUrl, { cache: "no-store", method: "HEAD" })
      ]);
      if (!scriptResponse.ok) {
        throw new Error(`city visualizer bundle returned HTTP ${scriptResponse.status}`);
      }
      if ((await scriptResponse.text()).length < 10_000) {
        throw new Error("city visualizer bundle is unexpectedly small");
      }
      if (!catalogResponse.ok) {
        throw new Error(`city visualizer catalog returned HTTP ${catalogResponse.status}`);
      }
      const catalog = await catalogResponse.json();
      if (
        catalog?.format !== "marque-city-visualizer-catalog" ||
        !Array.isArray(catalog.cities) ||
        catalog.cities.length === 0
      ) {
        throw new Error("city visualizer catalog is malformed");
      }
      if (!atlasResponse.ok) {
        throw new Error(`city visualizer atlas returned HTTP ${atlasResponse.status}`);
      }
      return { cityCount: catalog.cities.length };
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw new Error(
    `City visualizer did not become available after ${attempts} attempts`,
    { cause: lastError }
  );
}

function localSourceRevision() {
  const configured = process.env.BUILD_REVISION?.trim();
  if (configured) return configured.slice(0, 64);
  return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
}

function parseEnv(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) throw new Error("Malformed .env line: " + rawLine);
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function requiredCredential(key, fileCredentials) {
  const value = process.env[key] || fileCredentials[key];
  if (!value) {
    throw new Error(
      "Missing " + key + " in the environment or repository .env"
    );
  }
  return value;
}
