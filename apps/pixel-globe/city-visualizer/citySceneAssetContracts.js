import { CITY_DOCKSIDE_SHADOW_LIGHT_DIRECTION } from "../src/shipBakeLighting.js";

export const CITY_DOCKSIDE_SHADOW_STATES = Object.freeze(["up", "level", "down"]);
export const CITY_DOCKSIDE_SHADOW_MAX_ABOVE_DECK_PX = 10;
export const CITY_DOCKSIDE_SHADOW_MAX_LEFT_REACH_PX = 32;

const PUBLIC_ASSET_PREFIX = "apps/pixel-globe/public";
const CANONICAL_ASSET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function publicCityAssetUrl(file) {
  if (typeof file !== "string" || !file.startsWith(`${PUBLIC_ASSET_PREFIX}/`)) {
    throw new Error(`City scene requires a public asset path: ${file}`);
  }
  const publicPath = file.slice(PUBLIC_ASSET_PREFIX.length);
  if (publicPath.includes("/../") || publicPath.includes("/./") || publicPath.includes("//")) {
    throw new Error(`City scene public asset path is not normalized: ${file}`);
  }
  return publicPath;
}

export function validateCityFlagManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.factions) || manifest.factions.length === 0) {
    throw new Error("City scene requires a non-empty faction flag manifest");
  }
  if (!Number.isInteger(manifest.width) || manifest.width <= 0 ||
      !Number.isInteger(manifest.height) || manifest.height <= 0) {
    throw new Error("City faction flag manifest has invalid dimensions");
  }
  const byFactionId = indexCanonicalEntries(manifest.factions, "id", "city faction flag");
  for (const flag of manifest.factions) {
    if (flag.width !== manifest.width || flag.height !== manifest.height) {
      throw new Error(`City faction flag dimensions disagree with manifest: ${flag.id}`);
    }
    if (flag.file !== `${flag.id}.png`) {
      throw new Error(`City faction flag file does not match its canonical ID: ${flag.id}`);
    }
  }
  return Object.freeze({ manifest, byFactionId });
}

export function requireCityFlag(flagCatalog, factionId) {
  requireCanonicalId(factionId, "city faction");
  const flag = flagCatalog?.byFactionId?.get(factionId);
  if (!flag) throw new Error(`City faction flag manifest has no canonical ID: ${factionId}`);
  return flag;
}

export function cityFlagAssetUrl(flag) {
  if (!flag || typeof flag.id !== "string") {
    throw new Error(`Invalid city faction flag asset: ${flag?.id}`);
  }
  requireCanonicalId(flag.id, "city faction flag");
  if (flag.file !== `${flag.id}.png`) {
    throw new Error(`Invalid city faction flag asset: ${flag.id}`);
  }
  return `/assets/factions/flags/${flag.file}`;
}

export function validateCityDocksideShipManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.ships) || manifest.ships.length === 0) {
    throw new Error("City scene requires a non-empty dockside ship manifest");
  }
  if (!sameVector(manifest.waterShadowLightDirection, CITY_DOCKSIDE_SHADOW_LIGHT_DIRECTION)) {
    throw new Error("City dockside ship manifest has the wrong water-shadow light direction");
  }
  const catalog = Object.freeze({
    manifest,
    byShipSlug: indexCanonicalEntries(manifest.ships, "slug", "city dockside ship")
  });
  for (const ship of manifest.ships) requireCityDocksideShip(catalog, ship.slug);
  return catalog;
}

export function requireCityDocksideShip(shipCatalog, shipSlug) {
  requireCanonicalId(shipSlug, "city dockside ship");
  const ship = shipCatalog?.byShipSlug?.get(shipSlug);
  if (!ship) throw new Error(`City dockside ship manifest has no canonical ID: ${shipSlug}`);
  const dockside = ship.cityDockside;
  if (!dockside) throw new Error(`Missing native city dockside raster: ${shipSlug}`);
  const waterShadows = dockside.waterShadows;
  const shadowKeys = waterShadows ? Object.keys(waterShadows).sort() : [];
  if (JSON.stringify(shadowKeys) !== JSON.stringify([...CITY_DOCKSIDE_SHADOW_STATES].sort())) {
    throw new Error(`Missing dockside water-shadow bakes: ${shipSlug}`);
  }
  validateDocksideShadowGeometry(ship);
  for (const file of [
    dockside.file,
    dockside.sinkDepthFile,
    ...CITY_DOCKSIDE_SHADOW_STATES.map((state) => waterShadows[state].file)
  ]) {
    publicCityAssetUrl(file);
  }
  return ship;
}

function validateDocksideShadowGeometry(ship) {
  const dockside = ship.cityDockside;
  if (!Number.isInteger(dockside.nativeScale) || dockside.nativeScale <= 0) {
    throw new Error(`Invalid dockside native scale: ${ship.slug}`);
  }
  if (!Array.isArray(dockside.deckPolygon) || dockside.deckPolygon.length !== 4 ||
      dockside.deckPolygon.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    throw new Error(`Invalid dockside deck polygon: ${ship.slug}`);
  }
  const deckTopY = Math.min(...dockside.deckPolygon.map(({ y }) => y));
  const deckLeftX = Math.min(...dockside.deckPolygon.map(({ x }) => x));
  const deckCenterX = dockside.deckPolygon.reduce((sum, { x }) => sum + x, 0) /
    dockside.deckPolygon.length;
  for (const shadowState of CITY_DOCKSIDE_SHADOW_STATES) {
    const shadow = dockside.waterShadows[shadowState];
    const bounds = shadow?.opaqueBounds;
    if (!bounds || ![bounds.minX, bounds.minY, bounds.width, bounds.height].every(Number.isFinite) ||
        bounds.width <= 0 || bounds.height <= 0) {
      throw new Error(`Invalid ${shadowState} dockside water-shadow bounds: ${ship.slug}`);
    }
    const aboveDeckPx = (deckTopY - bounds.minY) / dockside.nativeScale;
    if (aboveDeckPx > CITY_DOCKSIDE_SHADOW_MAX_ABOVE_DECK_PX) {
      throw new Error(`Distant-reaching ${shadowState} dockside water shadow: ${ship.slug}`);
    }
    const leftReachPx = (deckLeftX - bounds.minX) / dockside.nativeScale;
    if (leftReachPx > CITY_DOCKSIDE_SHADOW_MAX_LEFT_REACH_PX) {
      throw new Error(`Overlong ${shadowState} dockside water shadow: ${ship.slug}`);
    }
    const shadowCenterX = bounds.minX + (bounds.width - 1) / 2;
    if (shadowCenterX >= deckCenterX) {
      throw new Error(`Wrong-way ${shadowState} dockside water shadow: ${ship.slug}`);
    }
  }
}

export function cityDocksideAssetUrls(shipCatalog, shipSlug) {
  const ship = requireCityDocksideShip(shipCatalog, shipSlug);
  return Object.freeze([
    publicCityAssetUrl(ship.cityDockside.file),
    publicCityAssetUrl(ship.cityDockside.sinkDepthFile),
    ...CITY_DOCKSIDE_SHADOW_STATES.map((state) => (
      publicCityAssetUrl(ship.cityDockside.waterShadows[state].file)
    ))
  ]);
}

export function indexCitySideViewShips(manifest) {
  if (!manifest || !Array.isArray(manifest.ships) || manifest.ships.length === 0) {
    throw new Error("City scene requires a non-empty ship side-view manifest");
  }
  return indexCanonicalEntries(manifest.ships, "slug", "city ship side view");
}

export function requireCitySideViewShip(byShipSlug, shipSlug, context = "city ship side view") {
  requireCanonicalId(shipSlug, context);
  const ship = byShipSlug?.get(shipSlug);
  if (!ship) throw new Error(`${context} manifest has no canonical ID: ${shipSlug}`);
  publicCityAssetUrl(ship.file);
  return ship;
}

function indexCanonicalEntries(entries, idKey, label) {
  const byId = new Map();
  for (const entry of entries) {
    const id = entry?.[idKey];
    requireCanonicalId(id, label);
    if (byId.has(id)) throw new Error(`Duplicate ${label} canonical ID: ${id}`);
    byId.set(id, entry);
  }
  return byId;
}

function requireCanonicalId(id, label) {
  if (typeof id !== "string" || !CANONICAL_ASSET_ID.test(id)) {
    throw new Error(`${label} requires a canonical ID`);
  }
}

function sameVector(actual, expected) {
  return actual && ["x", "y", "z"].every((axis) => actual[axis] === expected[axis]);
}
