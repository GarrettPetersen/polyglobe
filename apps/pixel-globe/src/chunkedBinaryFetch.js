import { fetchStaticAsset } from "./staticAssetFetch.js";

export async function fetchChunkedBinary(path, label, {
  fetchAsset = fetchStaticAsset,
  baseUrl = globalThis.location?.href
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
  await Promise.all(chunks.map(async (chunkSpec) => {
    const chunkUrl = new URL(chunkSpec.path, manifestUrl).toString();
    const chunkRes = await fetchAsset(chunkUrl, {
      label: `${label} chunk ${chunkSpec.index}`
    });
    if (!chunkRes.ok) {
      throw new Error(`Failed to load ${label} chunk ${chunkSpec.index}: HTTP ${chunkRes.status}`);
    }
    const bytes = new Uint8Array(await chunkRes.arrayBuffer());
    if (bytes.byteLength !== chunkSpec.byteLength) {
      throw new Error(
        `Malformed ${label} chunk ${chunkSpec.index}: expected ${chunkSpec.byteLength} bytes, got ${bytes.byteLength}`
      );
    }
    out.set(bytes, chunkSpec.offset);
  }));
  return out.buffer;
}
