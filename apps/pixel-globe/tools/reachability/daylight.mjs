import { startStaticServer } from "./browser-runtime.mjs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

export async function verifyDaylightGpu(gamePage) {
  const server = await startStaticServer({ rootDirectory: fileURLToPath(new URL("../../", import.meta.url)) });
  const page = await gamePage.context().newPage();
  try {
  await page.route("**/__gpu", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Daylight GPU test</title>" }));
  await page.goto(`http://127.0.0.1:${server.address().port}/__gpu`);
  const result = await page.evaluate(async () => {
    const { createWorldWebGL2Renderer } = await import("./src/worldWebglRenderer.js");
    const { dayNightPaletteVariant, applyDayNightPaletteGrade } = await import("./src/dayNightPalette.js");
    const { dayNightLightForSunAltitude } = await import("./src/dayNightCycle.js");
    const renderer = createWorldWebGL2Renderer({ atlasSize: 64 });
    const size = 12;
    let checked = 0;
    try {
      for (const source of [[0x71, 0xaa, 0x34], [0x0b, 0x8a, 0x8f], [0x4c, 0x3e, 0x24], [0xff, 0xff, 0xff], [0x9b, 0xab, 0xb2]]) {
        for (let step = -55; step <= 55; step++) {
          const altitude = step / 100;
          renderer.beginFrame({ width: size, height: size, clearColor: [0, 0, 0, 1],
            paletteVariant: dayNightPaletteVariant(dayNightLightForSunAltitude(altitude)) });
          renderer.drawSolidRect({ destinationRect: { x: 0, y: 0, width: size, height: size },
            color: [...source.map(value => value / 255), 1] });
          renderer.endFrame();
          const pixels = renderer.captureFrameCanvas().getContext("2d").getImageData(0, 0, size, size).data;
          for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const expected = new Uint8ClampedArray([...source, 255]);
            applyDayNightPaletteGrade(expected, 1, 1, dayNightLightForSunAltitude(altitude));
            const actual = pixels.slice((y * size + x) * 4, (y * size + x + 1) * 4);
            if (actual.some((v, i) => v !== expected[i])) {
              throw new Error(`Daylight GPU mismatch at ${source}/${altitude}/${x},${y}: ${actual} != ${expected}`);
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
