import { PORT_SCENE_DEPTH } from "./citySceneRules.js";

export const CITY_SHIPYARD_CONSTRUCTION_CENTER_X = 887;
export const CITY_SHIPYARD_CONSTRUCTION_KEEL_Y = 493;
export const CITY_SHIPYARD_CONSTRUCTION_SCALE = 1;
export const CITY_SHIPYARD_CONSTRUCTION_Z = 25.1;
export const CITY_SHIPYARD_FRONT_Z = 25.2;
export const CITY_SHIPYARD_CONSTRUCTION_DEPTH = PORT_SCENE_DEPTH.businesses;
export const CITY_SHIPYARD_CONSTRUCTION_PARALLAX_ANCHOR = 1;

export function validateCityShipyardConstruction(construction) {
  if (construction === null) return null;
  if (!construction || typeof construction.shipSlug !== "string" || construction.shipSlug === "" ||
      !Number.isFinite(construction.progress) ||
      construction.progress < 0 || construction.progress > 1) {
    throw new Error("Invalid city shipyard construction state");
  }
  return Object.freeze({
    shipSlug: construction.shipSlug,
    progress: construction.progress
  });
}

export function cityShipyardConstructionPlacement(ship, progress) {
  const construction = validateCityShipyardConstruction({ shipSlug: ship?.slug, progress });
  const bounds = ship?.opaqueBounds;
  if (!bounds ||
      !Number.isInteger(bounds.minX) || !Number.isInteger(bounds.maxX) ||
      !Number.isInteger(bounds.minY) || !Number.isInteger(bounds.maxY) ||
      bounds.minX < 0 || bounds.maxX < bounds.minX ||
      bounds.minY < 0 || bounds.maxY < bounds.minY ||
      bounds.maxX >= ship.width || bounds.maxY >= ship.height) {
    throw new Error(`Invalid city construction ship raster: ${construction.shipSlug}`);
  }
  const opaqueCenterX = (bounds.minX + bounds.maxX + 1) / 2;
  return Object.freeze({
    ship,
    progress: construction.progress,
    x: Math.round(CITY_SHIPYARD_CONSTRUCTION_CENTER_X - opaqueCenterX * CITY_SHIPYARD_CONSTRUCTION_SCALE),
    y: CITY_SHIPYARD_CONSTRUCTION_KEEL_Y - (bounds.maxY + 1) * CITY_SHIPYARD_CONSTRUCTION_SCALE,
    width: ship.width * CITY_SHIPYARD_CONSTRUCTION_SCALE,
    height: ship.height * CITY_SHIPYARD_CONSTRUCTION_SCALE,
    visibleLeftX: CITY_SHIPYARD_CONSTRUCTION_CENTER_X -
      (bounds.maxX - bounds.minX + 1) * CITY_SHIPYARD_CONSTRUCTION_SCALE / 2,
    visibleRightX: CITY_SHIPYARD_CONSTRUCTION_CENTER_X +
      (bounds.maxX - bounds.minX + 1) * CITY_SHIPYARD_CONSTRUCTION_SCALE / 2,
    visibleTopY: CITY_SHIPYARD_CONSTRUCTION_KEEL_Y -
      (bounds.maxY - bounds.minY + 1) * CITY_SHIPYARD_CONSTRUCTION_SCALE,
    visibleBottomY: CITY_SHIPYARD_CONSTRUCTION_KEEL_Y,
    scale: CITY_SHIPYARD_CONSTRUCTION_SCALE,
    depth: CITY_SHIPYARD_CONSTRUCTION_DEPTH,
    parallaxAnchor: CITY_SHIPYARD_CONSTRUCTION_PARALLAX_ANCHOR,
    z: CITY_SHIPYARD_CONSTRUCTION_Z
  });
}
