/**
 * Land-area statistics for 1 Jan 12:00 UTC using public/tavg_monthly.bin + the same
 * {@link getTileTemperature01} mapping as the globe demo (terrain = null → Köppen off).
 *
 * Run from examples/globe-demo:
 *   npx tsx scripts/report-jan1-temp-model.ts
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseTemperatureMonthlyBin } from "../../../src/earth/earthSampling.js";
import {
  getTileTemperature01,
  interpolateMonthlyClimatologyC,
  SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01,
} from "../../../src/climate/seasonalClimate.js";
import { dateToSubsolarPoint } from "../astronomy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(__dirname, "..");
const publicDir = join(demoRoot, "public");

function loadLandIsLand(): ((latDeg: number, lonDeg: number) => boolean) | null {
  try {
    const buf = readFileSync(join(publicDir, "earth-region-grid.bin"));
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const w = dv.getUint32(0, true);
    const h = dv.getUint32(4, true);
    const n = w * h;
    const landmassId = new Uint32Array(buf.buffer, buf.byteOffset + 8, n);
    return (latDeg: number, lonDeg: number) => {
      const x = ((lonDeg + 180) / 360) * (w - 1);
      const y = ((90 - latDeg) / 180) * (h - 1);
      const xi = Math.max(0, Math.min(Math.round(x), w - 1));
      const yi = Math.max(0, Math.min(Math.round(y), h - 1));
      return landmassId[yi * w + xi]! !== 0;
    };
  } catch {
    return null;
  }
}

function main(): void {
  const tavgPath = join(publicDir, "tavg_monthly.bin");
  const buf = readFileSync(tavgPath);
  const layer = parseTemperatureMonthlyBin(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
  if (!layer) {
    console.error("Missing or invalid", tavgPath);
    process.exit(1);
  }
  const land = loadLandIsLand();
  if (!land) {
    console.error("Missing earth-region-grid.bin");
    process.exit(1);
  }

  const { width: W, height: H, data } = layer;
  const cells = W * H;
  const jan1 = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
  const subsolar = dateToSubsolarPoint(jan1);

  let wLand = 0;
  let wBelow0C = 0;
  let wBelowSnow01 = 0;
  let wGlobe = 0;
  let wGlobeBelow0C = 0;

  const hScale = H > 1 ? H - 1 : 1;
  const wScale = W > 1 ? W - 1 : 1;

  for (let j = 0; j < H; j++) {
    const latDeg = 90 - (j / hScale) * 180;
    const latRad = (latDeg * Math.PI) / 180;
    const cosW = Math.cos(latRad);
    if (cosW < 1e-6) continue;

    for (let i = 0; i < W; i++) {
      const lonDeg = (i / wScale) * 360 - 180;

      const idx = j * W + i;
      const monthly = new Float32Array(12);
      for (let m = 0; m < 12; m++) {
        monthly[m] = data[m * cells + idx]!;
      }

      const tc = interpolateMonthlyClimatologyC(monthly, jan1);
      wGlobe += cosW;
      if (Number.isFinite(tc) && tc < 0) wGlobeBelow0C += cosW;

      if (!land(latDeg, lonDeg)) continue;

      const t01 = getTileTemperature01(
        latDeg,
        subsolar.latDeg,
        null,
        monthly,
        jan1,
      );

      wLand += cosW;
      if (Number.isFinite(tc) && tc < 0) wBelow0C += cosW;
      if (t01 < SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01) {
        wBelowSnow01 += cosW;
      }
    }
  }

  const f0 = wLand > 0 ? wBelow0C / wLand : 0;
  const fs = wLand > 0 ? wBelowSnow01 / wLand : 0;
  const fg = wGlobe > 0 ? wGlobeBelow0C / wGlobe : 0;

  console.log("=== 1 Jan 12:00 UTC (cos(lat)-weighted) ===\n");
  console.log("tavg:", tavgPath, `${W}×${H}`);
  console.log("Subsolar latitude (°):", subsolar.latDeg.toFixed(2));
  console.log(
    "Fraction of **global** grid (all cells, incl. ocean) with interpolated climatology °C < 0:",
    (fg * 100).toFixed(2) + "%",
  );
  console.log(
    "Fraction of **land** with interpolated monthly climatology °C < 0:",
    (f0 * 100).toFixed(2) + "%",
  );
  console.log(
    `Fraction of **land** with getTileTemperature01 < ${SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01} (snow precip threshold):`,
    (fs * 100).toFixed(2) + "%",
  );
  console.log(
    "\n(Snow line uses monthly stack + seasonalClimate: 85% climatology 0–1 with cold anchor −28 °C, 15% subsolar model; terrain null.)",
  );
}

main();
