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
export {
  getTileTangentFrame,
  getTileTangentFrameById,
  tilePlanePoint,
  tileCornerWorldFlat,
  tileEdgeMidpointWorldFlat,
  worldToTilePlane,
  tileMeanCornerRadius,
  type TileTangentFrame,
} from "./core/tileLocalFrame.js";

// Terrain
export type { TerrainType, TileTerrain } from "./terrain/types.js";
export {
  TERRAIN_STYLES,
  applyTerrainToGeometry,
  applyTerrainColorsToGeometry,
  applyLandSurfaceWeatherVertexColors,
  applyVertexColorsByTileId,
  geometryLandOnly,
  geometryOceanFloor,
  geometryWaterSurfacePatch,
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
  computeWaterLevelsByBody,
  parseKoppenAsciiGrid,
  elevationFromImageData,
  parseElevationBin,
  type ElevationGrid,
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
  type WaterLevelsByBody,
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
  getRiverFlowByTile,
  pruneThreeWayRiverJunctions,
  connectIsolatedRiverTiles,
  fillRiverGaps,
  forceRiverReciprocity,
  symmetrizeRiverNeighborEdgesUntilStable,
  lonLatToDirection,
  updateRiverMaterialTime,
  type RiverSegment,
  type RiverMeshOptions,
  type GetRiverEdgesOptions,
  type RiverFlowAtTile,
  type GetRiverFlowOptions,
} from "./water/rivers.js";
export { CoastFoamOverlay } from "./water/coastFoamOverlay.js";
export {
  createRiverTerrainMeshes,
  buildRiverLandAndVoidMultipolygon,
  hexRiverWedgeEdgeIndices,
  buildRiverBankExtrusionGeometry,
  tileHexPlanarBasis6,
  tileCanonicalHexBasis6,
  type RiverTerrainMeshesOptions,
  type BuildRiverBankExtrusionParams,
} from "./water/riverHexGeometry.js";

// Placement by tile ID (hex/pentagon)
export {
  getPlacementMatrix,
  placeObject,
  getTileTransform,
  type PlaceOptions,
} from "./placement/placeOnGlobe.js";

// Twinkling starfield background
export {
  Starfield,
  type StarfieldOptions,
  type StarCatalogEntry,
} from "./stars/Starfield.js";

// Wind (seasonal patterns + arrow overlay)
export {
  computeWindForTiles,
  type TileWind,
  type ComputeWindOptions,
} from "./wind/windPatterns.js";
export {
  createWindArrows,
  updateWindArrows,
  createFlowArrows,
  updateFlowArrows,
  type WindArrowsOptions,
  type HexFlow,
  type FlowArrowsOptions,
} from "./wind/windArrows.js";

// Climate (seasonal precip/temp for rivers, future snow)
export { getPrecipitation, getTemperature } from "./climate/seasonalClimate.js";
export {
  createPrecipitationOverlay,
  updatePrecipitationOverlay,
  getPrecipitationByTile,
  getPrecipitationByTileWithMoisture,
  type PrecipitationOverlayOptions,
} from "./climate/precipitationOverlay.js";
export {
  OCEAN_MOISTURE_FACTOR,
  moistureFactorForKoppenCode,
  moistureFactorForTerrainType,
  buildMoistureByTileFromTerrain,
} from "./climate/koppenMoisture.js";
export {
  createPuffyClouds,
  updatePuffyClouds,
  createLowPolyClouds,
  updateLowPolyClouds,
  sortLowPolyCloudsByCamera,
  createLowPolyCloudGroupAtAnchor,
  setLowPolyCloudGroupShellPose,
  updateLowPolyCloudGroupVisualScaleOpacity,
  CLOUD_SHADOW_LAYER,
  createCloudSphereLayer,
  updateCloudSphereLayer,
  createCloudLayer,
  updateCloudLayer,
  type PuffyCloudOptions,
  type LowPolyCloudOptions,
  type CloudSphereOptions,
  type CloudLayerOptions,
  type SimCloudVisualSpec,
} from "./climate/cloudLayer.js";
export {
  CloudWeatherSimulator,
  DEFAULT_CLOUD_SIM_CONFIG,
  CLOUD_HISTORY_MINUTES,
  replayCloudSimToUtcMinute,
  replayCloudSimToUtcMinuteChunked,
  syncCloudSimToUtcMinute,
  utcMinuteFromDate,
  type PrecipSubsolarForMinute,
  type CloudSimConfig,
} from "./climate/cloudSimulation.js";
export type { SimCloud as SimulatedCloudParticle } from "./climate/cloudSimulation.js";
export {
  CloudClipField,
  buildAnnualCloudSpawnTable,
  buildAnnualPrecipClimatology,
  annualSpawnDayIndex,
  type CloudClipFieldConfig,
  type CloudClipTemplate,
  type CloudClipFrame,
  type AnnualSpawnSpec,
} from "./climate/cloudClipSystem.js";
export {
  TileSurfaceState,
  type GroundSurfaceClimateParams,
} from "./climate/tileSurfaceState.js";
export {
  createPrecipitationParticlesGroup,
  updatePrecipitationParticles,
  disposePrecipitationParticlesGroup,
} from "./climate/precipitationParticles.js";
