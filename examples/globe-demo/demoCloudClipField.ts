/**
 * Shared CloudClipField construction for Earth demo + `build-earth-globe-cache` so spawn-table bakes
 * match runtime.
 */

import { CloudClipField, type Globe } from "polyglobe";
import { dateToSubsolarPoint } from "./astronomy.js";

export function createEarthDemoCloudClipField(
  globe: Globe,
  tileTerrain: Map<
    number,
    { type: string; monthlyMeanTempC?: Float32Array | undefined }
  >,
): CloudClipField {
  const waterTileIds = new Set<number>();
  for (const [id, t] of tileTerrain) {
    if (t.type === "water") waterTileIds.add(id);
  }
  const hugeGlobe = globe.tileCount > 85_000;
  return new CloudClipField({
    maxClouds: hugeGlobe ? 72 : 96,
    cloudScale: 0.038,
    cloudCastShadows: false,
    cloudHemisphereShading: true,
    cloudMarchingCubesGrid: hugeGlobe ? 14 : 16,
    maxCloudMeshOpsPerSync: hugeGlobe ? 56 : 80,
    maxPhysicsMinutesPerSync: hugeGlobe ? 16 : 24,
    maxCatchUpMinutes: 720,
    waterTileIds,
    getTerrainTypeForTile: (id) => tileTerrain.get(id)?.type,
    getMonthlyMeanTempCForTile: (id) => tileTerrain.get(id)?.monthlyMeanTempC,
    getSubsolarLatDegForUtcMinute: (utcMin) =>
      dateToSubsolarPoint(new Date(utcMin * 60000)).latDeg,
  });
}
