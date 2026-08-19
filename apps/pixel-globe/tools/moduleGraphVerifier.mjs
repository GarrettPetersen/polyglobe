import { readFile } from "node:fs/promises";
import path from "node:path";

const JAVASCRIPT_CONTENT_TYPE = /(?:application|text)\/(?:javascript|ecmascript)/i;
const FORBIDDEN_DEPLOYMENT_SEGMENTS = new Set(["node_modules"]);

export async function verifyLocalModuleGraph({ rootDirectory, entryPaths }) {
  const root = path.resolve(requiredString(rootDirectory, "module graph root"));
  return crawlModuleGraph({
    entryIds: normalizeEntryPaths(entryPaths),
    load: async (id) => {
      const absolutePath = path.resolve(root, id);
      if (!isInside(absolutePath, root)) {
        throw new Error(`JavaScript module escapes the deployment root: ${id}`);
      }
      return readFile(absolutePath, "utf8");
    },
    resolve: (specifier, parentId) => resolveLocalSpecifier(specifier, parentId),
    validateId: assertDeployableModuleId
  });
}

export async function verifyRemoteModuleGraph({
  baseUrl,
  entryPaths,
  expectedRevision = null,
  attempts = 1,
  retryDelayMs = 0
}) {
  const base = new URL(requiredString(baseUrl, "module graph URL"));
  const entries = normalizeEntryPaths(entryPaths);
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error(`Module graph verification attempts are invalid: ${attempts}`);
  }
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new Error(`Module graph retry delay is invalid: ${retryDelayMs}`);
  }
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (expectedRevision !== null) await assertRemoteRevision(base, expectedRevision);
      return await crawlModuleGraph({
        entryIds: entries,
        load: (id) => loadRemoteModule(new URL(id, base), base),
        resolve: (specifier, parentId) => resolveRemoteSpecifier(specifier, parentId, base),
        validateId: assertDeployableModuleId
      });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(retryDelayMs);
    }
  }
  throw new Error(
    `Deployed JavaScript module graph remained invalid after ${attempts} attempts: ` +
      `${lastError?.message || lastError}`,
    { cause: lastError }
  );
}

export function moduleDependencySpecifiers(source) {
  if (typeof source !== "string") throw new Error("Module dependency scan requires source text");
  const dependencies = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
    /\bnew\s+(?:Shared)?Worker\s*\(\s*new\s+URL\s*\(\s*["']([^"']+\.js)["']/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) dependencies.add(match[1]);
  }
  return Object.freeze([...dependencies]);
}

async function crawlModuleGraph({ entryIds, load, resolve, validateId }) {
  const pending = entryIds.slice();
  const visited = new Set();
  while (pending.length > 0) {
    const id = pending.shift();
    if (visited.has(id)) continue;
    validateId(id);
    const source = await load(id);
    visited.add(id);
    for (const specifier of moduleDependencySpecifiers(source)) {
      const dependencyId = resolve(specifier, id);
      if (!visited.has(dependencyId)) pending.push(dependencyId);
    }
  }
  return Object.freeze({ modulesChecked: visited.size });
}

function resolveLocalSpecifier(specifier, parentId) {
  assertRelativeModuleSpecifier(specifier, parentId);
  return normalizeModuleId(path.posix.join(path.posix.dirname(parentId), specifier));
}

function resolveRemoteSpecifier(specifier, parentId, base) {
  assertRelativeModuleSpecifier(specifier, parentId);
  const resolved = new URL(specifier, new URL(parentId, base));
  if (resolved.origin !== base.origin || !resolved.href.startsWith(base.href)) {
    throw new Error(`JavaScript module escapes the deployed origin: ${resolved.href}`);
  }
  return decodeURIComponent(resolved.pathname.slice(base.pathname.length));
}

function assertRelativeModuleSpecifier(specifier, parentId) {
  if (typeof specifier !== "string" || !specifier.startsWith(".")) {
    throw new Error(`Browser module ${parentId} has unresolved bare import: ${specifier}`);
  }
}

function assertDeployableModuleId(id) {
  const normalized = normalizeModuleId(id);
  for (const segment of normalized.split("/")) {
    if (FORBIDDEN_DEPLOYMENT_SEGMENTS.has(segment)) {
      throw new Error(`Browser module uses deployment-excluded path: ${normalized}`);
    }
  }
  if (!normalized.endsWith(".js")) {
    throw new Error(`Browser module dependency is not JavaScript: ${normalized}`);
  }
}

async function loadRemoteModule(url, base) {
  const response = await fetch(url, {
    headers: { "cache-control": "no-cache" }
  });
  const contentType = response.headers.get("content-type") || "";
  const source = await response.text();
  const id = decodeURIComponent(url.pathname.slice(base.pathname.length));
  if (!response.ok) throw new Error(`Browser module ${id} returned HTTP ${response.status}`);
  if (!JAVASCRIPT_CONTENT_TYPE.test(contentType) || /^\s*<!doctype html/i.test(source)) {
    throw new Error(`Browser module ${id} returned ${contentType || "no content type"}`);
  }
  return source;
}

async function assertRemoteRevision(base, expectedRevision) {
  const expected = requiredString(expectedRevision, "expected build revision");
  const response = await fetch(new URL("src/buildEdition.js", base), {
    headers: { "cache-control": "no-cache" }
  });
  const source = await response.text();
  if (!response.ok || !JAVASCRIPT_CONTENT_TYPE.test(response.headers.get("content-type") || "")) {
    throw new Error(`Build revision module returned HTTP ${response.status}`);
  }
  if (!source.includes(`BUILD_REVISION = ${JSON.stringify(expected)}`)) {
    throw new Error(`Production build revision has not reached ${expected}`);
  }
}

function normalizeEntryPaths(entryPaths) {
  if (!Array.isArray(entryPaths) || entryPaths.length === 0) {
    throw new Error("Module graph verification requires entry paths");
  }
  return entryPaths.map((entry) => normalizeModuleId(requiredString(entry, "module entry")));
}

function normalizeModuleId(id) {
  return id.replaceAll("\\", "/").replace(/^\.\//, "");
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
