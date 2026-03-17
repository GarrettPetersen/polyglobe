/**
 * Polyglobe – Reusable low-poly 3D globe (hexagons + 12 pentagons) with Three.js.
 * Terrain, water, sun, camera presets, atmosphere, and tile-based placement.
 */

// Core
export { Globe } from "./core/Globe.js";
export {
  buildGeodesicTiles,
  buildFlatGeometryData,
  createGeodesicGeometry,
  createGeodesicGeometryFlat,
  updateFlatGeometryFromTerrain,
  getEdgeNeighbor,
  type FlatGeometryData,
  type GeodesicTile,
  type GeodesicMeshOptions,
  type GeodesicFlatMeshOptions,
  type TilePeak,
  type TileKind,
} from "./core/geodesic.js";

// Terrain
export type { TerrainType, TileTerrain } from "./terrain/types.js";
export {
  TERRAIN_STYLES,
  applyTerrainToGeometry,
  applyTerrainColorsToGeometry,
  applyVertexColorsByTileId,
  geometryLandOnly,
  geometryOceanFloor,
  geometryCoastSkirt,
  type TerrainStyle,
  type TileTerrainData,
} from "./terrain/terrainMaterial.js";

// Earth (real geography from rasters or custom samplers)
export {
  tileCenterToLatLon,
  latLonToDegrees,
  earthRasterFromImageData,
  sampleRasterAtLatLon,
  buildTerrainFromEarthRaster,
  buildTerrainFromSampler,
  applyCoastalBeach,
  parseKoppenAsciiGrid,
  elevationFromImageData,
  resolveLandWaterByRegions,
  type EarthRaster,
  type ClimateGrid,
  type SampleResult,
  type BuildTerrainFromRasterOptions,
  type TerrainSampleMode,
  type EarthTerrainSampler,
  type RegionScores,
  type LandWaterAssignment,
  type ResolveLandWaterByRegionsOptions,
  rasterCutoutCrosses,
  type RasterWindow,
} from "./earth/earthSampling.js";

// Lighting
export { Sun, type SunOptions } from "./lighting/Sun.js";

// Camera
export {
  getPreset,
  applyPreset,
  STRATEGY_PRESET,
  ADVENTURE_PRESET,
  ORBIT_PRESET,
  TOP_DOWN_PRESET,
  type CameraPreset,
  type CameraPresetKind,
} from "./camera/CameraPresets.js";

// Atmosphere
export { Atmosphere, type AtmosphereOptions, type WeatherKind } from "./atmosphere/Atmosphere.js";

// Water (spherical; gravity is toward planet center by construction)
export { WaterSphere, type WaterSphereOptions } from "./water/WaterSphere.js";
export { createCoastMaskTexture, createCoastLandMaskTexture } from "./water/coastMask.js";
export {
  traceRiverThroughTiles,
  createRiverMesh,
  createRiverMeshFromTileEdges,
  getRiverEdgesByTile,
  lonLatToDirection,
  updateRiverMaterialTime,
  type RiverSegment,
  type RiverMeshOptions,
  type GetRiverEdgesOptions,
} from "./water/rivers.js";
export { CoastFoamOverlay } from "./water/coastFoamOverlay.js";

// Placement by tile ID (hex/pentagon)
export {
  getPlacementMatrix,
  placeObject,
  getTileTransform,
  type PlaceOptions,
} from "./placement/placeOnGlobe.js";

// Twinkling starfield background
export { Starfield, type StarfieldOptions } from "./stars/Starfield.js";
