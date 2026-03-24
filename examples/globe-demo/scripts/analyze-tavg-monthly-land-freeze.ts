/**
 * Report how much land (per earth-region-grid.bin) has mean monthly temperature below freezing
 * in each month of tavg_monthly.bin — and how that relates to in-engine snow thresholds.
 *
 * Run from examples/globe-demo:
 *   npx tsx scripts/analyze-tavg-monthly-land-freeze.ts
 *   npx tsx scripts/analyze-tavg-monthly-land-freeze.ts /path/to/tavg_monthly.bin
 *
 * Notes (see src/climate/seasonalClimate.ts):
 * - Raster cells are **long-term monthly means** (WorldClim-style tavg), not daily max or noon-only;
 *   the sim interpolates between **mid-month** anchors in UTC.
 * - getTileTemperature01 blends **85%** climatology 0–1 + **15%** subsolar/Köppen model; cold anchor −28 °C.
 * - Snow precip uses {@link SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01} on that blended scale.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseTemperatureMonthlyBin } from "../../../src/earth/earthSampling.js";
import {
  meanMonthlyTempCToTemperature01,
  SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01,
} from "../../../src/climate/seasonalClimate.js";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const SNOW_TEMP_01 = SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01;
/** Monthly mean °C where climatology-only 0–1 equals snow threshold (linear map [−28, 42]). */
const T_MONTHLY_FOR_CLIM_SNOW = SNOW_TEMP_01 * (42 - -28) + -28;

function loadEarthLandMask(
  publicDir: string,
): { w: number; h: number; isLand: (latDeg: number, lonDeg: number) => boolean } | null {
  let buf: Buffer;
  try {
    buf = readFileSync(join(publicDir, "earth-region-grid.bin"));
  } catch {
    return null;
  }
  try {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const w = dv.getUint32(0, true);
    const h = dv.getUint32(4, true);
    const n = w * h;
    const landmassId = new Uint32Array(buf.buffer, buf.byteOffset + 8, n);
    return {
      w,
      h,
      isLand(latDeg: number, lonDeg: number): boolean {
        const x = ((lonDeg + 180) / 360) * (w - 1);
        const y = ((90 - latDeg) / 180) * (h - 1);
        const xi = Math.max(0, Math.min(Math.round(x), w - 1));
        const yi = Math.max(0, Math.min(Math.round(y), h - 1));
        return landmassId[yi * w + xi]! !== 0;
      },
    };
  } catch {
    return null;
  }
}

function main(): void {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const demoRoot = join(__dirname, "..");
  const publicDir = join(demoRoot, "public");
  const tavgPath =
    process.argv[2] ?? join(publicDir, "tavg_monthly.bin");

  const tavgBuf = readFileSync(tavgPath);
  const layer = parseTemperatureMonthlyBin(tavgBuf.buffer.slice(tavgBuf.byteOffset, tavgBuf.byteOffset + tavgBuf.byteLength));
  if (!layer) {
    console.error("Invalid or missing tavg_monthly.bin (expected PG12 header + 12×W×H float32).");
    process.exit(1);
  }

  const land = loadEarthLandMask(publicDir);
  if (!land) {
    console.error(
      "Missing public/earth-region-grid.bin — run build-land-raster-png or place the bin next to tavg.",
    );
    process.exit(1);
  }

  const { width: W, height: H, data } = layer;
  const cells = W * H;

  const landWeightTotal = new Float64Array(12).fill(0);
  const below0Weight = new Float64Array(12).fill(0);
  const belowNeg2p8Weight = new Float64Array(12).fill(0);
  const belowClimSnowWeight = new Float64Array(12).fill(0);
  const meanTempLand = new Float64Array(12).fill(0);
  let landSamples = 0;

  for (let j = 0; j < H; j++) {
    const latDeg = 90 - (j / Math.max(1, H - 1)) * 180;
    const latRad = (latDeg * Math.PI) / 180;
    const cosW = Math.cos(latRad);
    if (cosW < 1e-6) continue;

    for (let i = 0; i < W; i++) {
      const lonDeg = (i / Math.max(1, W - 1)) * 360 - 180;
      if (!land.isLand(latDeg, lonDeg)) continue;

      landSamples++;
      const idx = j * W + i;
      for (let m = 0; m < 12; m++) {
        const t = data[m * cells + idx]!;
        if (!Number.isFinite(t)) continue;
        landWeightTotal[m] += cosW;
        meanTempLand[m] += t * cosW;
        if (t < 0) below0Weight[m] += cosW;
        if (t < T_MONTHLY_FOR_CLIM_SNOW) belowNeg2p8Weight[m] += cosW;
        if (meanMonthlyTempCToTemperature01(t) < SNOW_TEMP_01) {
          belowClimSnowWeight[m] += cosW;
        }
      }
    }
  }

  console.log("=== tavg_monthly.bin vs land mask ===\n");
  console.log("Tavg file:", tavgPath);
  console.log("Grid:", `${W}×${H}`, "month-major float32 °C");
  console.log("Land mask: earth-region-grid.bin", `${land.w}×${land.h}`, "(land = landmassId ≠ 0)");
  console.log("Land cells sampled (tavg grid):", landSamples);
  console.log(
    "\nArea weights use cos(latitude) per equirectangular cell (relative area).\n",
  );
  console.log(
    `Engine snow threshold on 0–1 scale: ${SNOW_TEMP_01} (cloud precip); monthly mean °C for that on the **climatology channel alone**: ≈ ${T_MONTHLY_FOR_CLIM_SNOW.toFixed(2)}°C`,
  );
  console.log(
    "At 0°C monthly mean, climatology 0–1 =",
    meanMonthlyTempCToTemperature01(0).toFixed(3),
    "(vs threshold",
    SNOW_TEMP_01 + ").\n",
  );

  console.log(
    "Month |  land °C (mean) |  frac land T<0°C |  frac land T<" +
      T_MONTHLY_FOR_CLIM_SNOW.toFixed(1) +
      "°C |  frac land clim01<" +
      SNOW_TEMP_01 +
      " (same as prev col)",
  );
  console.log(
    "-".repeat(88),
  );

  for (let m = 0; m < 12; m++) {
    const den = landWeightTotal[m];
    const f0 = den > 0 ? below0Weight[m] / den : 0;
    const f28 = den > 0 ? belowNeg2p8Weight[m] / den : 0;
    const fClim = den > 0 ? belowClimSnowWeight[m] / den : 0;
    const meanC = den > 0 ? meanTempLand[m] / den : Number.NaN;
    console.log(
      `${MONTH_NAMES[m]!.padEnd(5)} | ${meanC.toFixed(2).padStart(15)} | ${(f0 * 100).toFixed(2).padStart(15)}% | ${(f28 * 100).toFixed(2).padStart(17)}% | ${(fClim * 100).toFixed(2).padStart(22)}%`,
    );
  }

  console.log(
    "\nInterpretation: middle columns are **raw monthly means** from the dataset. The last column is",
    "the fraction of land where the **climatology 0–1 alone** would allow snow (before the 85/15 blend",
    "with the subsolar model in getTileTemperature01).\n",
  );
}

main();
