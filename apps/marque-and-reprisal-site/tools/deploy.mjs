import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const envPath = path.join(repoRoot, ".env");
const wranglerPath = path.join(appRoot, "node_modules/.bin/wrangler");
const distPath = path.join(appRoot, "dist");

if (!existsSync(wranglerPath)) {
  throw new Error("Wrangler is not installed. Run npm install in " + appRoot);
}
if (!existsSync(path.join(distPath, "index.html"))) {
  throw new Error("Website build is missing. Run npm run build first.");
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

const deployment = spawnSync(
  wranglerPath,
  [
    "pages",
    "deploy",
    distPath,
    "--project-name",
    "marque-and-reprisal",
    "--branch",
    "master"
  ],
  {
    cwd: appRoot,
    env: {
      ...process.env,
      CLOUDFLARE_ACCOUNT_ID: accountId,
      CLOUDFLARE_API_TOKEN: apiToken
    },
    stdio: "inherit"
  }
);

if (deployment.error) throw deployment.error;
if (deployment.status !== 0) {
  throw new Error("Cloudflare Pages deployment exited with code " + deployment.status);
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
