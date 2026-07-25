import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(workerRoot, "../..");

export async function cloudflareEnvironment() {
  await loadEnvironmentFile(resolve(repoRoot, ".env"));
  return {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: requiredEnvironment("PRODUCTION_CLOUDFLARE_ACCOUNT_ID"),
    CLOUDFLARE_API_TOKEN: requiredEnvironment("PRODUCTION_CLOUDFLARE_API_TOKEN")
  };
}

export function workerBinary(name) {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return resolve(workerRoot, `node_modules/.bin/${name}${suffix}`);
}

async function loadEnvironmentFile(path) {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch {
    return;
  }
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
