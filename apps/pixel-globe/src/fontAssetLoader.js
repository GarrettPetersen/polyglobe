import { fetchStaticAsset } from "./staticAssetFetch.js";

const FONT_CACHE_BYPASS = "reload";

export async function loadFontFaceAsset({
  family,
  src,
  label,
  fontFaceSet,
  FontFaceConstructor = globalThis.FontFace,
  fetchAsset = fetchStaticAsset
}) {
  if (typeof family !== "string" || family.length === 0) {
    throw new Error("Font asset requires a family");
  }
  if (typeof src !== "string" || src.length === 0) {
    throw new Error(`Font asset requires a source: ${family}`);
  }
  if (typeof label !== "string" || label.length === 0) {
    throw new Error(`Font asset requires a label: ${family}`);
  }
  if (!fontFaceSet || typeof fontFaceSet.add !== "function") {
    throw new Error(`FontFaceSet cannot install required font: ${label}`);
  }
  if (typeof FontFaceConstructor !== "function") {
    throw new Error(`FontFace API cannot install required font: ${label}`);
  }
  if (typeof fetchAsset !== "function") {
    throw new Error(`Font asset fetch is unavailable: ${label}`);
  }

  let bytes = await readFontSourceBuffer(fetchAsset, src, label);
  let sourceError = fontSourceBufferError(bytes, label);
  if (sourceError) {
    bytes = await readFontSourceBuffer(fetchAsset, src, label, FONT_CACHE_BYPASS);
    sourceError = fontSourceBufferError(bytes, label);
    if (sourceError) throw sourceError;
  }

  try {
    return await installFontFace(FontFaceConstructor, fontFaceSet, family, bytes);
  } catch (error) {
    let retried;
    try {
      retried = await readFontSourceBuffer(fetchAsset, src, label, FONT_CACHE_BYPASS);
    } catch {
      throw decodeFontError(label, error, bytes);
    }
    const retrySourceError = fontSourceBufferError(retried, label);
    if (retrySourceError) throw retrySourceError;
    try {
      return await installFontFace(FontFaceConstructor, fontFaceSet, family, retried);
    } catch (retryError) {
      throw decodeFontError(label, retryError, retried);
    }
  }
}

async function installFontFace(FontFaceConstructor, fontFaceSet, family, bytes) {
  const face = new FontFaceConstructor(family, bytes);
  await face.load();
  fontFaceSet.add(face);
  return face;
}

async function readFontSourceBuffer(fetchAsset, src, label, cache) {
  const response = await fetchAsset(src, cache === undefined
    ? { label: `${label} font` }
    : { label: `${label} font`, cache });
  if (!response.ok) {
    throw new Error(`Failed to load ${label} font: HTTP ${response.status}`);
  }

  try {
    return await response.arrayBuffer();
  } catch (error) {
    throw new Error(
      `Failed to read ${label} font: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

function fontSourceBufferError(bytes, label) {
  if (!(bytes instanceof ArrayBuffer)) {
    return new Error(`Failed to decode ${label} font: Invalid source buffer (not an ArrayBuffer)`);
  }
  if (bytes.byteLength === 0) {
    return new Error(`Failed to decode ${label} font: Invalid source buffer (empty, 0 bytes)`);
  }
  if (sourceLooksLikeHtml(bytes)) {
    return new Error(
      `Failed to decode ${label} font: Invalid source buffer (html, ${describeFontBuffer(bytes)})`
    );
  }
  if (!sourceLooksLikeFont(bytes)) {
    return new Error(
      `Failed to decode ${label} font: Invalid source buffer (unknown, ${describeFontBuffer(bytes)})`
    );
  }
  return null;
}

function decodeFontError(label, error, bytes) {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(
    `Failed to decode ${label} font: ${detail} (${describeFontBuffer(bytes)})`,
    { cause: error instanceof Error ? error : undefined }
  );
}

function describeFontBuffer(bytes) {
  const view = new Uint8Array(bytes);
  const preview = Array.from(view.subarray(0, Math.min(16, view.length)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return preview.length === 0
    ? `${bytes.byteLength} bytes`
    : `${bytes.byteLength} bytes starting ${preview}`;
}

function sourceLooksLikeHtml(bytes) {
  const view = new Uint8Array(bytes);
  let index = 0;
  if (view.length >= 3 && view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf) {
    index = 3;
  }
  while (
    index < view.length &&
    (view[index] === 0x09 || view[index] === 0x0a || view[index] === 0x0d || view[index] === 0x20)
  ) {
    index += 1;
  }
  return index < view.length && view[index] === 0x3c;
}

function sourceLooksLikeFont(bytes) {
  if (bytes.byteLength < 4) return false;
  const view = new Uint8Array(bytes);
  const tag = String.fromCharCode(view[0], view[1], view[2], view[3]);
  if (tag === "wOFF" || tag === "wOF2" || tag === "OTTO" || tag === "true" || tag === "ttcf") {
    return true;
  }
  return view[0] === 0x00 && view[1] === 0x01 && view[2] === 0x00 && view[3] === 0x00;
}
