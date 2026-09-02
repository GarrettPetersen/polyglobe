export const CITY_SHIPYARD_SALE_SHIP_MAX_COUNT = 3;
export const CITY_SHIPYARD_SALE_SHIP_SCALE = 1;
export const CITY_SHIPYARD_SALE_SHIP_Z = 24.4;

const FIRST_VISIBLE_RIGHT_X = 831;
const VISIBLE_RIGHT_STEP = 60;
const FIRST_WATERLINE_Y = 490;
const WATERLINE_STEP = 6;
const FIRST_DEPTH = 0.84;
const DEPTH_STEP = 0.06;
const PARALLAX_ANCHOR = 1;

export function validateCityShipSideViewManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.ships) || manifest.ships.length === 0) {
    throw new Error("City shipyard sale ships require a non-empty side-view manifest");
  }
  const seen = new Set();
  for (const ship of manifest.ships) {
    if (!ship || typeof ship.slug !== "string" || ship.slug.length === 0) {
      throw new Error("City shipyard side-view ship is missing a slug");
    }
    if (seen.has(ship.slug)) throw new Error(`Duplicate city shipyard side-view slug: ${ship.slug}`);
    seen.add(ship.slug);
    if (
      !Number.isInteger(ship.width) || ship.width <= 0 ||
      !Number.isInteger(ship.height) || ship.height <= 0
    ) {
      throw new Error(`Invalid city shipyard side-view dimensions: ${ship.slug}`);
    }
    if (typeof ship.file !== "string" || !ship.file.endsWith(`/${ship.slug}.png`)) {
      throw new Error(`Invalid city shipyard side-view file: ${ship.slug}`);
    }
    if (
      !Number.isInteger(ship.sideViewWaterlineY) ||
      ship.sideViewWaterlineY < 0 ||
      ship.sideViewWaterlineY >= ship.height
    ) {
      throw new Error(`Invalid city shipyard side-view waterline: ${ship.slug}`);
    }
    if (
      !Number.isInteger(ship.lowestOpaquePixelY) ||
      ship.lowestOpaquePixelY <= ship.sideViewWaterlineY ||
      ship.lowestOpaquePixelY >= ship.height
    ) {
      throw new Error(`City shipyard side view must extend below its waterline: ${ship.slug}`);
    }
  }
  return manifest;
}

export function cityShipyardSaleShipSlugs(city, features) {
  if (!city || typeof city.defaultShip !== "string") {
    throw new Error("City shipyard sale ships require a city default ship");
  }
  if (!features || typeof features.shipyard !== "boolean") {
    throw new Error("City shipyard sale ships require resolved shipyard features");
  }
  if (!features.shipyard) return Object.freeze([]);
  const configured = city.shipyardSaleShips ?? [city.defaultShip];
  if (!Array.isArray(configured)) {
    throw new Error(`Invalid shipyard sale ship list: ${city.id || city.city || "unknown city"}`);
  }
  if (configured.length > CITY_SHIPYARD_SALE_SHIP_MAX_COUNT) {
    throw new Error(
      `City shipyard sale ship list exceeds ${CITY_SHIPYARD_SALE_SHIP_MAX_COUNT}: ` +
      `${city.id || city.city || "unknown city"}`
    );
  }
  const slugs = configured.map((slug) => {
    if (typeof slug !== "string" || slug.length === 0) {
      throw new Error(`Invalid shipyard sale ship slug: ${city.id || city.city || "unknown city"}`);
    }
    return slug;
  });
  return Object.freeze(slugs);
}

export function cityShipyardSaleShipPlacements(ships) {
  if (!Array.isArray(ships)) throw new Error("City shipyard sale ship placement requires ships");
  if (ships.length > CITY_SHIPYARD_SALE_SHIP_MAX_COUNT) {
    throw new Error(`Too many city shipyard sale ships: ${ships.length}`);
  }
  return Object.freeze(ships.map((ship, index) => {
    const bounds = requireOpaqueBounds(ship);
    const visibleRightX = FIRST_VISIBLE_RIGHT_X - index * VISIBLE_RIGHT_STEP;
    const waterlineY = FIRST_WATERLINE_Y - index * WATERLINE_STEP;
    const depth = FIRST_DEPTH - index * DEPTH_STEP;
    const x = visibleRightX - bounds.maxX * CITY_SHIPYARD_SALE_SHIP_SCALE;
    const y = waterlineY - ship.sideViewWaterlineY * CITY_SHIPYARD_SALE_SHIP_SCALE;
    return Object.freeze({
      id: `shipyard-sale:${index}:${ship.slug}`,
      ship,
      index,
      x,
      y,
      width: ship.width * CITY_SHIPYARD_SALE_SHIP_SCALE,
      height: ship.height * CITY_SHIPYARD_SALE_SHIP_SCALE,
      waterlineY,
      visibleLeftX: x + bounds.minX * CITY_SHIPYARD_SALE_SHIP_SCALE,
      visibleRightX,
      visibleTopY: y + bounds.minY * CITY_SHIPYARD_SALE_SHIP_SCALE,
      visibleBottomY: y + bounds.maxY * CITY_SHIPYARD_SALE_SHIP_SCALE,
      scale: CITY_SHIPYARD_SALE_SHIP_SCALE,
      depth,
      parallaxAnchor: PARALLAX_ANCHOR,
      z: CITY_SHIPYARD_SALE_SHIP_Z + (ships.length - index) / 100,
      bobPhase: index * 811
    });
  }));
}

export function cityShipyardSaleShipContainsPoint({ placement, screenX, screenY, alpha }) {
  if (!placement || !Number.isFinite(screenX) || !Number.isFinite(screenY)) {
    throw new Error("City shipyard sale ship hit test requires a placement and point");
  }
  if (!(alpha instanceof Uint8Array) || alpha.length !== placement.ship.width * placement.ship.height) {
    throw new Error(`Invalid city shipyard sale ship alpha mask: ${placement.ship.slug}`);
  }
  const localX = Math.floor((screenX - placement.x) / placement.scale);
  const localY = Math.floor((screenY - placement.y) / placement.scale);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = localX + dx;
      const y = localY + dy;
      if (x < 0 || y < 0 || x >= placement.ship.width || y >= placement.ship.height) continue;
      if (alpha[x + y * placement.ship.width] > 16) return true;
    }
  }
  return false;
}

function requireOpaqueBounds(ship) {
  const bounds = ship?.opaqueBounds;
  if (
    !ship || typeof ship.slug !== "string" ||
    !Number.isInteger(ship.width) || !Number.isInteger(ship.height) ||
    !Number.isInteger(ship.sideViewWaterlineY) ||
    !bounds ||
    !Number.isInteger(bounds.minX) || !Number.isInteger(bounds.maxX) ||
    !Number.isInteger(bounds.minY) || !Number.isInteger(bounds.maxY) ||
    bounds.minX < 0 || bounds.minY < 0 ||
    bounds.maxX < bounds.minX || bounds.maxX >= ship.width ||
    bounds.maxY < bounds.minY || bounds.maxY >= ship.height
  ) {
    throw new Error(`Invalid city shipyard sale ship raster: ${ship?.slug || "unknown"}`);
  }
  return bounds;
}
