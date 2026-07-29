import { fetchStaticAsset } from "./staticAssetFetch.js";

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

  const response = await fetchAsset(src, { label: `${label} font` });
  if (!response.ok) {
    throw new Error(`Failed to load ${label} font: HTTP ${response.status}`);
  }

  let bytes;
  try {
    bytes = await response.arrayBuffer();
  } catch (error) {
    throw new Error(
      `Failed to read ${label} font: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }

  let face;
  try {
    face = new FontFaceConstructor(family, bytes);
    await face.load();
  } catch (error) {
    throw new Error(
      `Failed to decode ${label} font: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  fontFaceSet.add(face);
  return face;
}
