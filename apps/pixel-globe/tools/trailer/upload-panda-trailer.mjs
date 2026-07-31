import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TOOL_DIR, "../..");
const REPO_ROOT = path.resolve(APP_ROOT, "../..");
const TRAILER = path.join(
  APP_ROOT,
  ".captures/panda-trailer/marque-and-reprisal-panda-trailer.mp4"
);
const BUCKET = "marque-and-reprisal-press";
const OBJECT_KEY = "trailers/marque-and-reprisal-panda-trailer-v2.mp4";
const PUBLIC_URL = `https://downloads.marque-and-reprisal.com/${OBJECT_KEY}`;
const WRANGLER = path.join(
  REPO_ROOT,
  "apps/pixel-globe-telemetry/node_modules/.bin/wrangler"
);

for (const required of [TRAILER, WRANGLER]) {
  if (!existsSync(required)) throw new Error(`Required panda trailer upload file is missing: ${required}`);
}

const localEnv = readEnvFile(path.join(REPO_ROOT, ".env"));
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || localEnv.PRODUCTION_CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN || localEnv.PRODUCTION_CLOUDFLARE_API_TOKEN;
if (!accountId || !apiToken) {
  throw new Error("Panda trailer upload requires the production Cloudflare account ID and API token");
}

const upload = spawnSync(WRANGLER, [
  "r2", "object", "put", `${BUCKET}/${OBJECT_KEY}`,
  "--remote", "--force", "--file", TRAILER,
  "--content-type", "video/mp4",
  "--content-disposition", "inline",
  "--cache-control", "public, max-age=31536000, immutable"
], {
  cwd: REPO_ROOT,
  env: {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_API_TOKEN: apiToken
  },
  encoding: "utf8"
});
if (upload.stdout) process.stdout.write(upload.stdout);
if (upload.stderr) process.stderr.write(upload.stderr);
if (upload.error) throw upload.error;
if (upload.status !== 0) throw new Error(`Wrangler exited with status ${upload.status}`);

const response = await fetch(PUBLIC_URL, { method: "HEAD", cache: "no-store" });
if (!response.ok) throw new Error(`Uploaded panda trailer returned HTTP ${response.status}`);
const expectedBytes = statSync(TRAILER).size;
const remoteBytes = Number(response.headers.get("content-length"));
if (remoteBytes !== expectedBytes) {
  throw new Error(`Uploaded panda trailer is ${remoteBytes} bytes; expected ${expectedBytes}`);
}
process.stdout.write(`Panda trailer: ${PUBLIC_URL}\n`);

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const values = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}
