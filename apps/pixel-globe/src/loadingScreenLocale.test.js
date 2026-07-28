import assert from "node:assert/strict";
import test from "node:test";

import { SUPPORTED_LANGUAGES } from "./localization.js";
import {
  INTERFACE_LANGUAGE_STORAGE_KEY,
  initialInterfaceLanguage,
  loadingCapsuleTitleAtlasFile,
  loadingCapsuleTitleSteamCode
} from "./loadingScreenLocale.js";

test("loading screen selects every supported localized capsule title", () => {
  const expected = new Map([
    ["en", "english"],
    ["zh-Hans", "schinese"],
    ["ru", "russian"],
    ["es", "spanish"],
    ["pt-BR", "brazilian"],
    ["ja", "japanese"],
    ["de", "german"],
    ["fr", "french"],
    ["pl", "polish"],
    ["zh-Hant", "tchinese"],
    ["ko", "koreana"]
  ]);
  assert.equal(INTERFACE_LANGUAGE_STORAGE_KEY, "pixel_globe_language");
  assert.equal(expected.size, SUPPORTED_LANGUAGES.length);
  for (const { id } of SUPPORTED_LANGUAGES) {
    assert.equal(loadingCapsuleTitleSteamCode(id), expected.get(id));
    assert.equal(
      loadingCapsuleTitleAtlasFile(id),
      `title_${expected.get(id)}.png`
    );
  }
});

test("loading screen follows URL language before saved language", () => {
  assert.equal(initialInterfaceLanguage("ja", "fr"), "ja");
  assert.equal(initialInterfaceLanguage(null, "fr"), "fr");
  assert.equal(initialInterfaceLanguage(null, null), "en");
  assert.equal(initialInterfaceLanguage("zh-TW", "en"), "zh-Hant");
});
