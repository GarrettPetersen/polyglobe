import { fetchChunkedJson } from "../src/chunkedBinaryFetch.js";

export async function verifyRemoteStartupAssets({
  baseUrl,
  subdivisions,
  fetchAsset
}) {
  const base = new URL(requiredString(baseUrl, "startup asset URL"));
  if (!Number.isInteger(subdivisions) || subdivisions < 0) {
    throw new Error(`Startup asset subdivisions are invalid: ${subdivisions}`);
  }
  const path = `shared/earth-globe-cache-${subdivisions}.json`;
  const options = { baseUrl: base.href };
  if (fetchAsset !== undefined) options.fetchAsset = fetchAsset;
  const earth = await fetchChunkedJson(
    new URL(path, base).href,
    "deployed Earth cache",
    options
  );
  if (earth === null) {
    throw new Error(`Deployed Earth cache has no JSON chunk manifest: ${path}.chunks.json`);
  }
  const expectedTileCount = 10 * 4 ** subdivisions + 2;
  if (
    !earth ||
    earth.subdivisions !== subdivisions ||
    earth.tileCount !== expectedTileCount ||
    !Array.isArray(earth.tiles) ||
    earth.tiles.length !== expectedTileCount
  ) {
    throw new Error(
      `Deployed Earth cache is incompatible with subdivision ${subdivisions}`
    );
  }
  return Object.freeze({ earthTileCount: earth.tileCount });
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}
