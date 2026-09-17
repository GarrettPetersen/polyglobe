import assert from "node:assert/strict";
import test from "node:test";

import { loadFontFaceAsset } from "./fontAssetLoader.js";

test("required fonts are fetched with a useful label and installed", async () => {
  const requests = [];
  const installed = [];
  const bytes = fontBytes("wOF2");
  class FakeFontFace {
    constructor(family, source) {
      this.family = family;
      this.source = source;
    }

    async load() {
      this.loaded = true;
      return this;
    }
  }

  const face = await loadFontFaceAsset({
    family: "Dogica",
    src: "assets/fonts/dogicapixel.ttf?v=1",
    label: "Dogica",
    fontFaceSet: { add: (loadedFace) => installed.push(loadedFace) },
    FontFaceConstructor: FakeFontFace,
    fetchAsset: async (src, options) => {
      requests.push({ src, options });
      return { ok: true, status: 200, arrayBuffer: async () => bytes };
    }
  });

  assert.deepEqual(requests, [{
    src: "assets/fonts/dogicapixel.ttf?v=1",
    options: { label: "Dogica font" }
  }]);
  assert.equal(face.family, "Dogica");
  assert.equal(face.source, bytes);
  assert.equal(face.loaded, true);
  assert.deepEqual(installed, [face]);
});

test("required font decoding errors identify the font and the rejected bytes", async () => {
  class BrokenFontFace {
    async load() {
      throw new DOMException("Invalid font data", "SyntaxError");
    }
  }

  await assert.rejects(
    loadFontFaceAsset({
      family: "Pixel Pirate",
      src: "assets/fonts/pixel_pirate.woff2",
      label: "Pixel Pirate",
      fontFaceSet: { add: () => {} },
      FontFaceConstructor: BrokenFontFace,
      fetchAsset: async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => fontBytes("wOF2", 8)
      })
    }),
    /Failed to decode Pixel Pirate font: Invalid font data \(8 bytes starting 77 4f 46 32/
  );
});

test("empty or HTML font payloads retry once with a cache bypass", async () => {
  const requests = [];
  const installed = [];
  const html = new TextEncoder().encode("<!DOCTYPE html>").buffer;
  const font = fontBytes("wOF2");
  class FakeFontFace {
    constructor(family, source) {
      this.family = family;
      this.source = source;
    }

    async load() {
      return this;
    }
  }

  const face = await loadFontFaceAsset({
    family: "Pixel Pirate",
    src: "assets/fonts/pixel_pirate.woff2?v=r-kern-2",
    label: "Pixel Pirate",
    fontFaceSet: { add: (loadedFace) => installed.push(loadedFace) },
    FontFaceConstructor: FakeFontFace,
    fetchAsset: async (src, options) => {
      requests.push({ src, options });
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => options.cache === "reload" ? font : html
      };
    }
  });

  assert.deepEqual(requests, [
    { src: "assets/fonts/pixel_pirate.woff2?v=r-kern-2", options: { label: "Pixel Pirate font" } },
    {
      src: "assets/fonts/pixel_pirate.woff2?v=r-kern-2",
      options: { label: "Pixel Pirate font", cache: "reload" }
    }
  ]);
  assert.equal(face.source, font);
  assert.deepEqual(installed, [face]);
});

test("empty font payloads that stay empty after a cache bypass fail with the buffer size", async () => {
  await assert.rejects(
    loadFontFaceAsset({
      family: "Pixel Pirate",
      src: "assets/fonts/pixel_pirate.woff2",
      label: "Pixel Pirate",
      fontFaceSet: { add: () => {} },
      FontFaceConstructor: class {},
      fetchAsset: async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(0)
      })
    }),
    /Failed to decode Pixel Pirate font: Invalid source buffer \(empty, 0 bytes\)/
  );
});

test("required font HTTP errors identify the font", async () => {
  await assert.rejects(
    loadFontFaceAsset({
      family: "zpix",
      src: "assets/fonts/zpix.woff2",
      label: "zpix",
      fontFaceSet: { add: () => {} },
      FontFaceConstructor: class {},
      fetchAsset: async () => ({ ok: false, status: 404 })
    }),
    /Failed to load zpix font: HTTP 404/
  );
});

function fontBytes(signature, byteLength = 8) {
  const bytes = new Uint8Array(byteLength);
  for (let index = 0; index < signature.length; index += 1) {
    bytes[index] = signature.charCodeAt(index);
  }
  return bytes.buffer;
}
