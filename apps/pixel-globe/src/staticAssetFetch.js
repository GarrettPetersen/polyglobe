const DEFAULT_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 150;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429]);

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

  let lastNetworkError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(resource);
      if (!response || typeof response.ok !== "boolean" || !Number.isInteger(response.status)) {
        throw new Error("fetch returned an invalid response");
      }
      if (!responseIsRetryable(response) || attempt === attempts) return response;
    } catch (error) {
      lastNetworkError = error;
      if (attempt === attempts) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to load ${label} after ${attempts} attempts: ${message}`,
          { cause: error }
        );
      }
    }
    await sleep(retryDelayMs * attempt);
  }

  throw new Error(
    `Failed to load ${label} after ${attempts} attempts`,
    { cause: lastNetworkError }
  );
}

function responseIsRetryable(response) {
  return RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
