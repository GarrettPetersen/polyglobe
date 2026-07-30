import { fetchStaticAsset } from "./staticAssetFetch.js";

const DEFAULT_CHUNK_ATTEMPTS = 3;
const DEFAULT_CHUNK_CONCURRENCY = 3;
const DEFAULT_CHUNK_RETRY_DELAY_MS = 250;

export async function fetchChunkedBinary(path, label, {
  fetchAsset = fetchStaticAsset,
  baseUrl = globalThis.location?.href,
  chunkAttempts = DEFAULT_CHUNK_ATTEMPTS,
  chunkConcurrency = DEFAULT_CHUNK_CONCURRENCY,
  chunkRetryDelayMs = DEFAULT_CHUNK_RETRY_DELAY_MS,
  sleep = wait
} = {}) {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("Chunked binary fetch requires an asset path");
  }
  if (typeof label !== "string" || label.length === 0) {
    throw new Error("Chunked binary fetch requires an asset label");
  }
  if (typeof fetchAsset !== "function") {
    throw new Error(`Chunked binary fetch requires fetch support: ${label}`);
  }
  if (!Number.isInteger(chunkAttempts) || chunkAttempts < 1) {
    throw new Error(`Chunked binary fetch requires positive chunk attempts: ${chunkAttempts}`);
  }
  if (!Number.isInteger(chunkConcurrency) || chunkConcurrency < 1) {
    throw new Error(`Chunked binary fetch requires positive concurrency: ${chunkConcurrency}`);
  }
  if (!Number.isFinite(chunkRetryDelayMs) || chunkRetryDelayMs < 0) {
    throw new Error(`Chunked binary fetch requires a nonnegative retry delay: ${chunkRetryDelayMs}`);
  }
  if (typeof sleep !== "function") {
    throw new Error(`Chunked binary fetch requires sleep support: ${label}`);
  }

  const manifestPath = `${path}.chunks.json`;
  const manifestRes = await fetchAsset(manifestPath, {
    label: `${label} chunk manifest`
  });
  if (manifestRes.status === 404) return null;
  if (!manifestRes.ok) {
    throw new Error(`Failed to load ${label} chunk manifest: HTTP ${manifestRes.status}`);
  }
  const manifestContentType = manifestRes.headers.get("content-type") || "";
  if (!manifestContentType.toLowerCase().includes("json")) return null;

  let manifest;
  try {
    manifest = await manifestRes.json();
  } catch (error) {
    throw new Error(
      `Malformed ${label} chunk manifest: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!Number.isSafeInteger(manifest.byteLength) || manifest.byteLength < 0) {
    throw new Error(`Malformed ${label} chunk manifest: invalid byteLength`);
  }
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
    throw new Error(`Malformed ${label} chunk manifest: missing chunks`);
  }

  let expectedByteLength = 0;
  const chunks = manifest.chunks.map((chunkSpec, index) => {
    if (
      !chunkSpec ||
      typeof chunkSpec.path !== "string" ||
      chunkSpec.path.length === 0 ||
      !Number.isSafeInteger(chunkSpec.byteLength) ||
      chunkSpec.byteLength < 0
    ) {
      throw new Error(`Malformed ${label} chunk manifest entry ${index}`);
    }
    const chunk = Object.freeze({
      index,
      path: chunkSpec.path,
      byteLength: chunkSpec.byteLength,
      offset: expectedByteLength
    });
    expectedByteLength += chunkSpec.byteLength;
    return chunk;
  });
  if (!Number.isSafeInteger(expectedByteLength) || expectedByteLength !== manifest.byteLength) {
    throw new Error(
      `Malformed ${label} chunk manifest: chunk bytes total ${expectedByteLength}, expected ${manifest.byteLength}`
    );
  }
  if (typeof baseUrl !== "string" || baseUrl.length === 0) {
    throw new Error(`Chunked binary fetch requires a base URL: ${label}`);
  }

  const manifestUrl = new URL(manifestPath, baseUrl);
  const out = new Uint8Array(manifest.byteLength);
  await mapWithConcurrency(chunks, chunkConcurrency, async (chunkSpec) => {
    const chunkUrl = new URL(chunkSpec.path, manifestUrl);
    const bytes = await fetchValidatedChunk(chunkUrl, chunkSpec, label, {
      fetchAsset,
      chunkAttempts,
      chunkRetryDelayMs,
      sleep
    });
    out.set(bytes, chunkSpec.offset);
  });
  return out.buffer;
}

async function fetchValidatedChunk(chunkUrl, chunkSpec, label, {
  fetchAsset,
  chunkAttempts,
  chunkRetryDelayMs,
  sleep
}) {
  let lastContentError = null;
  for (let attempt = 0; attempt < chunkAttempts; attempt++) {
    if (attempt > 0) await sleep(chunkRetryDelayMs * attempt);
    const attemptUrl = new URL(chunkUrl);
    if (attempt > 0) attemptUrl.searchParams.set("chunk_retry", String(attempt));
    const chunkRes = await fetchAsset(attemptUrl.toString(), {
      label: `${label} chunk ${chunkSpec.index}`
    });
    if (!chunkRes.ok) {
      throw new Error(`Failed to load ${label} chunk ${chunkSpec.index}: HTTP ${chunkRes.status}`);
    }

    let bytes;
    try {
      bytes = new Uint8Array(await chunkRes.arrayBuffer());
    } catch (error) {
      lastContentError = new Error(
        `Could not read ${label} chunk ${chunkSpec.index}`,
        { cause: error instanceof Error ? error : new Error(String(error)) }
      );
      continue;
    }
    if (bytes.byteLength === chunkSpec.byteLength) return bytes;
    lastContentError = new Error(
      `expected ${chunkSpec.byteLength} bytes, got ${bytes.byteLength}`
    );
  }

  throw new Error(
    `Malformed ${label} chunk ${chunkSpec.index} after ${chunkAttempts} attempts: ` +
      (lastContentError?.message || "unknown content error"),
    { cause: lastContentError }
  );
}

async function mapWithConcurrency(values, concurrency, work) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex++;
        await work(values[index]);
      }
    }
  );
  await Promise.all(workers);
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
