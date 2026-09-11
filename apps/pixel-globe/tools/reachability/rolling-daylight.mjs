import { startStaticServer } from "./browser-runtime.mjs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

export async function verifyRollingDaylightGpu(gamePage) {
  const server = await startStaticServer({ rootDirectory: fileURLToPath(new URL("../../", import.meta.url)) });
  const page = await gamePage.context().newPage();
  try {
  await page.route("**/__gpu", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Daylight GPU test</title>" }));
  await page.goto(`http://127.0.0.1:${server.address().port}/__gpu`);
  const result = await page.evaluate(async () => {
    const { createWorldWebGL2Renderer } = await import("./src/worldWebglRenderer.js");
    const { rollingDayNightPaletteAtlas, applyDayNightPaletteGrade } = await import("./src/dayNightPalette.js");
    const { dayNightLightForSunAltitude } = await import("./src/dayNightCycle.js");
    const renderer = createWorldWebGL2Renderer({ atlasSize: 64 });
    const size = 12;
    let checked = 0;
    try {
      for (const axis of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.6, 0.8]]) {
        for (let step = -55; step <= 55; step++) {
          const altitude = step / 100;
          const tangent = Math.sqrt(1 - altitude * altitude);
          const sunScreen = [axis[0] * tangent, axis[1] * tangent, altitude];
          const scale = 1 / 120;
          renderer.beginFrame({ width: size, height: size, clearColor: [0, 0, 0, 1],
            paletteVariant: rollingDayNightPaletteAtlas(), daylight: { sunScreen, radiansPerPixel: scale } });
          renderer.drawSolidRect({ destinationRect: { x: 0, y: 0, width: size, height: size },
            color: [0x71 / 255, 0xaa / 255, 0x34 / 255, 1] });
          renderer.endFrame();
          const pixels = renderer.captureFrameCanvas().getContext("2d").getImageData(0, 0, size, size).data;
          for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const dx = (x + 0.5 - size / 2) * scale;
            const dy = (y + 0.5 - size / 2) * scale;
            const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
            const edgeOffset = (bayer[(y % 4) * 4 + x % 4] / 16 - 0.46875) * 4 * scale * tangent;
            const localAltitude = (altitude + dx * sunScreen[0] + dy * sunScreen[1] + edgeOffset) /
              Math.sqrt(1 + dx * dx + dy * dy);
            const expected = new Uint8ClampedArray([0x71, 0xaa, 0x34, 255]);
            applyDayNightPaletteGrade(expected, 1, 1, dayNightLightForSunAltitude(localAltitude));
            const actual = pixels.slice((y * size + x) * 4, (y * size + x + 1) * 4);
            if (actual.some((v, i) => v !== expected[i])) {
              throw new Error(`Daylight GPU mismatch at ${axis}/${altitude}/${x},${y}: ${actual} != ${expected}`);
            }
            checked++;
          }
        }
      }
      return checked;
    } finally {
      renderer.canvas.getContext("webgl2").getExtension("WEBGL_lose_context")?.loseContext();
    }
  });
  assert.equal(result, 79920);
  return result;
  } finally {
    await page.close();
    await new Promise(resolve => server.close(resolve));
  }
}
