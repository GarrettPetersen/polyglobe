import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyRemoteModuleGraph } from "./moduleGraphVerifier.mjs";

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

const buildEditionSource = readFileSync(path.join(distPath, "src/buildEdition.js"), "utf8");
const revisionMatch = buildEditionSource.match(/BUILD_REVISION\s*=\s*"([^"]+)"/);
if (!revisionMatch) throw new Error("Game build is missing its revision marker");
await verifyRemoteModuleGraph({
  baseUrl: "https://pirates-of-the-pixel-globe.pages.dev/",
  entryPaths: ["src/bootstrap.js"],
  expectedRevision: revisionMatch[1],
  attempts: 20,
  retryDelayMs: 1_000
});
process.stdout.write(`Verified deployed JavaScript module graph for ${revisionMatch[1]}\n`);

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
