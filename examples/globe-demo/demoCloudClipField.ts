/**
 * Shared CloudClipField construction for Earth demo + `build-earth-globe-cache` so spawn-table bakes
 * match runtime.
 */

import { CloudClipField, type Globe } from "../../src/index.js";
import { dateToSubsolarPoint } from "./astronomy.js";

export function createEarthDemoCloudClipField(
  globe: Globe,
  tileTerrain: Map<
    number,
    { type: string; monthlyMeanTempC?: Float32Array | undefined }
  >,
  options?: { windDriftMul?: number },
): CloudClipField {
  const waterTileIds = new Set<number>();
  for (const [id, t] of tileTerrain) {
    if (t.type === "water") waterTileIds.add(id);
  }
  const hugeGlobe = globe.tileCount > 85_000;
  /** Library default is 1.875e-3; lower = slower birth-wind drift without longer template life. */
  const driftMul = Math.max(0.05, Math.min(3, options?.windDriftMul ?? 1));
  const windStepScale = 9.375e-4 * driftMul;
  return new CloudClipField({
    maxClouds: hugeGlobe ? 72 : 96,
    cloudScale: hugeGlobe ? 0.042 : 0.046,
    windStepScale,
    cloudCastShadows: false,
    cloudHemisphereShading: true,
    cloudMarchingCubesGrid: hugeGlobe ? 14 : 16,
    maxCloudMeshOpsPerSync: hugeGlobe ? 56 : 80,
    maxPhysicsMinutesPerSync: hugeGlobe ? 10 : 14,
    maxCatchUpMinutes: 720,
    waterTileIds,
    getTerrainTypeForTile: (id) => tileTerrain.get(id)?.type,
    getMonthlyMeanTempCForTile: (id) => tileTerrain.get(id)?.monthlyMeanTempC,
    getSubsolarLatDegForUtcMinute: (utcMin) =>
      dateToSubsolarPoint(new Date(utcMin * 60000)).latDeg,
  });
}
