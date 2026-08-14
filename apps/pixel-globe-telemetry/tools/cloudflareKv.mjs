import { cloudflareEnvironment } from "./cloudflareEnvironment.mjs";

import {
  CRASH_CURSOR_KEY,
  PERFORMANCE_CURSOR_KEY,
  normalizeCrashCursor,
  normalizePerformanceCursor
} from "../src/crashCursor.js";

export const TELEMETRY_STATE_NAMESPACE_TITLE = "marque-and-reprisal-telemetry-state";

export async function readRemoteCrashCursor(options = {}) {
  return readRemoteCursor(CRASH_CURSOR_KEY, normalizeCrashCursor, "crash", options);
}

export async function readRemotePerformanceCursor(options = {}) {
  return readRemoteCursor(
    PERFORMANCE_CURSOR_KEY,
    normalizePerformanceCursor,
    "performance",
    options
  );
}

async function readRemoteCursor(key, normalize, label, options) {
  const client = await cloudflareKvClient(options);
  const response = await client.fetchImpl(
    `${client.namespaceEndpoint}/values/${encodeURIComponent(key)}`,
    { headers: client.headers }
  );
  if (response.status === 404) return null;
  if (!response.ok) throw await cloudflareApiError(response, `read telemetry ${label} cursor`);
  return normalize(await response.text());
}

export async function writeRemoteCrashCursor(value, options = {}) {
  return writeRemoteCursor(CRASH_CURSOR_KEY, value, normalizeCrashCursor, "crash", options);
}

export async function writeRemotePerformanceCursor(value, options = {}) {
  return writeRemoteCursor(
    PERFORMANCE_CURSOR_KEY,
    value,
    normalizePerformanceCursor,
    "performance",
    options
  );
}

async function writeRemoteCursor(key, value, normalize, label, options) {
  const cursor = normalize(value);
  if (cursor === null) throw new Error(`Cannot write an empty telemetry ${label} cursor`);
  const client = await cloudflareKvClient(options);
  const response = await client.fetchImpl(
    `${client.namespaceEndpoint}/values/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      headers: {
        ...client.headers,
        "content-type": "text/plain; charset=utf-8"
      },
      body: cursor
    }
  );
  if (!response.ok) throw await cloudflareApiError(response, `write telemetry ${label} cursor`);
  return cursor;
}

async function cloudflareKvClient({
  environment = null,
  fetchImpl = globalThis.fetch?.bind(globalThis)
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Cloudflare KV access requires fetch");
  const resolvedEnvironment = environment || await cloudflareEnvironment();
  const accountId = requiredValue(resolvedEnvironment.CLOUDFLARE_ACCOUNT_ID, "Cloudflare account ID");
  const apiToken = requiredValue(resolvedEnvironment.CLOUDFLARE_API_TOKEN, "Cloudflare API token");
  const headers = { authorization: `Bearer ${apiToken}` };
  const namespaceId = await findNamespaceId({ accountId, headers, fetchImpl });
  return {
    fetchImpl,
    headers,
    namespaceEndpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`
  };
}

async function findNamespaceId({ accountId, headers, fetchImpl }) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`;
  const response = await fetchImpl(`${endpoint}?per_page=100`, { headers });
  if (!response.ok) throw await cloudflareApiError(response, "list telemetry KV namespaces");
  const body = await response.json();
  if (body.success === false || !Array.isArray(body.result)) {
    throw new Error("Cloudflare returned an invalid KV namespace list");
  }
  const namespace = body.result.find((entry) => entry.title === TELEMETRY_STATE_NAMESPACE_TITLE);
  if (typeof namespace?.id !== "string" || namespace.id === "") {
    throw new Error(`Missing Cloudflare KV namespace: ${TELEMETRY_STATE_NAMESPACE_TITLE}`);
  }
  return namespace.id;
}

async function cloudflareApiError(response, operation) {
  const text = await response.text();
  let detail = text;
  try {
    const body = JSON.parse(text);
    detail = body.errors?.map((entry) => entry.message).join("; ") || text;
  } catch {
    // Keep the response body as diagnostic context.
  }
  return new Error(`Could not ${operation} (${response.status}): ${detail || "unknown error"}`);
}

function requiredValue(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing ${label}`);
  return value.trim();
}
