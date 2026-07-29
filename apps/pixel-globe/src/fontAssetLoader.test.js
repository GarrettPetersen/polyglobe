import assert from "node:assert/strict";
import test from "node:test";

import { loadFontFaceAsset } from "./fontAssetLoader.js";

test("required fonts are fetched with a useful label and installed", async () => {
  const requests = [];
  const installed = [];
  const bytes = new ArrayBuffer(4);
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

test("required font decoding errors identify the font", async () => {
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
        arrayBuffer: async () => new ArrayBuffer(4)
      })
    }),
    /Failed to decode Pixel Pirate font: Invalid font data/
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
