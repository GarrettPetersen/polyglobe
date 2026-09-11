const DEFAULT_ATTEMPTS = 5;
const DEFAULT_RETRY_DELAY_MS = 200;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429]);

export class StaticAssetNetworkError extends Error {
  constructor(message, { cause = null, status = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = this.constructor.name;
    this.code = "STATIC_ASSET_NETWORK";
    this.status = status;
  }
}

export function isTransientStaticAssetError(error) {
  const visited = new Set();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    if (current instanceof StaticAssetNetworkError || current.code === "STATIC_ASSET_NETWORK") {
      return true;
    }
    visited.add(current);
    current = current.cause;
  }
  return false;
}

export async function fetchStaticAsset(resource, {
  label,
  fetchImpl = globalThis.fetch,
  attempts = DEFAULT_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  sleep = wait
} = {}) {
  if (typeof label !== "string" || label.length === 0) {
    throw new Error("Static asset fetch requires a label");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error(`Static asset fetch requires fetch support: ${label}`);
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error(`Static asset fetch requires positive attempts: ${attempts}`);
  }
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new Error(`Static asset fetch requires a nonnegative retry delay: ${retryDelayMs}`);
  }
  if (typeof sleep !== "function") {
    throw new Error("Static asset fetch requires a sleep function");
  }

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response;
    try {
      response = await fetchImpl(resource);
    } catch (error) {
      if (attempt === attempts) {
        throw new StaticAssetNetworkError(
          `Failed to load ${label} after ${attempts} attempts: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error }
        );
      }
      await sleep(retryDelayMs * attempt);
      continue;
    }
    // Response-contract failures are programming errors, not lost connections.
    if (!response || typeof response.ok !== "boolean" || !Number.isInteger(response.status)) {
      throw new Error(`Invalid fetch response for ${label}`);
    }
    if (!responseIsRetryable(response)) return response;
    if (attempt === attempts) {
      throw new StaticAssetNetworkError(
        `Failed to load ${label} after ${attempts} attempts: HTTP ${response.status}`,
        { status: response.status }
      );
    }
    await sleep(retryDelayMs * attempt);
  }
  throw new Error(`Static asset retry loop exhausted unexpectedly: ${label}`);
}

function responseIsRetryable(response) {
  return RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
