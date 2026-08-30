import { SHIP_STATS, shipLabelForSlug } from "./shipStats.js";
import { PORT_ASSAULT_SHIP_GEOMETRY } from "./portAssaultShipGeometry.js";

const PORT_ASSAULT_ASSET_ROOT = "/assets/vehicles/unity-ships/port-assault";
const PORT_ASSAULT_SHIP_LOGICAL_WIDTH = 320;
const PORT_ASSAULT_SHIP_LOGICAL_HEIGHT = 160;
const PORT_ASSAULT_SHIP_NATIVE_SCALE = 3;
const PORT_ASSAULT_BROADSIDE_OFFSET_DEGREES = 72.5;
const PORT_ASSAULT_CAMERA_ELEVATION_DEGREES = 20;

const rosterSlugs = SHIP_STATS.map((entry) => entry.slug);
const geometrySlugs = Object.keys(PORT_ASSAULT_SHIP_GEOMETRY);
if (
  JSON.stringify([...geometrySlugs].sort()) !== JSON.stringify([...rosterSlugs].sort())
) {
  throw new Error("Port-assault ship geometry does not exactly match the production roster");
}

export const PORT_ASSAULT_SHIP_ASSETS = Object.freeze(Object.fromEntries(
  rosterSlugs.map((slug) => {
    const geometry = PORT_ASSAULT_SHIP_GEOMETRY[slug];
    if (!geometry) throw new Error(`Missing port-assault ship geometry: ${slug}`);
    return [slug, Object.freeze({
      src: `${PORT_ASSAULT_ASSET_ROOT}/${slug}-city-dockside.png`,
      foregroundSrc: `${PORT_ASSAULT_ASSET_ROOT}/${slug}-city-dockside-foreground.png`,
      depthSrc: `${PORT_ASSAULT_ASSET_ROOT}/${slug}-city-dockside-depth.png`,
      sinkDepthSrc: `${PORT_ASSAULT_ASSET_ROOT}/${slug}-city-dockside-sink-depth.png`,
      label: shipLabelForSlug(slug),
      logicalWidth: PORT_ASSAULT_SHIP_LOGICAL_WIDTH,
      logicalHeight: PORT_ASSAULT_SHIP_LOGICAL_HEIGHT,
      nativeScale: PORT_ASSAULT_SHIP_NATIVE_SCALE,
      width: PORT_ASSAULT_SHIP_LOGICAL_WIDTH * PORT_ASSAULT_SHIP_NATIVE_SCALE,
      height: PORT_ASSAULT_SHIP_LOGICAL_HEIGHT * PORT_ASSAULT_SHIP_NATIVE_SCALE,
      broadsideOffsetDegrees: PORT_ASSAULT_BROADSIDE_OFFSET_DEGREES,
      cameraElevationDegrees: PORT_ASSAULT_CAMERA_ELEVATION_DEGREES,
      deckPolygon: Object.freeze(geometry.deckPolygon.map(frozenPoint)),
      deckEntryAnchor: frozenPoint(geometry.deckEntryAnchor),
      sailorSpawnAnchor: frozenPoint(geometry.sailorSpawnAnchor),
      bowScreenDirection: "up-right",
      dockFacingSide: "port"
    })];
  })
));

export function portAssaultShipAsset(shipSlug) {
  const asset = PORT_ASSAULT_SHIP_ASSETS[shipSlug];
  if (!asset) throw new Error(`No port-assault ship asset for hull: ${shipSlug}`);
  return asset;
}

function frozenPoint(point) {
  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`Invalid port-assault ship geometry point: ${JSON.stringify(point)}`);
  }
  return Object.freeze({ x: point.x, y: point.y });
}
