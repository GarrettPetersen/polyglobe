import assert from "node:assert/strict";
import test from "node:test";

import { SUPPORTED_LANGUAGES } from "./localization.js";
import {
  currentSteamInterfaceLanguage,
  INTERFACE_LANGUAGE_STORAGE_KEY,
  initialInterfaceLanguage,
  interfaceLanguageForSteamCode,
  loadingCapsuleTitleAtlasFile,
  loadingCapsuleTitleSteamCode,
  setSteamInterfaceLanguage
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

test("loading screen follows URL, saved, Steam, then English language priority", () => {
  assert.equal(initialInterfaceLanguage("ja", "fr", "de"), "ja");
  assert.equal(initialInterfaceLanguage(null, "fr", "de"), "fr");
  assert.equal(initialInterfaceLanguage(null, null, "de"), "de");
  assert.equal(initialInterfaceLanguage(null, null, null), "en");
  assert.equal(initialInterfaceLanguage("zh-TW", "en", "de"), "zh-Hant");
});

test("Steam language codes map to supported interface languages", () => {
  assert.equal(interfaceLanguageForSteamCode("english"), "en");
  assert.equal(interfaceLanguageForSteamCode("SChinese"), "zh-Hans");
  assert.equal(interfaceLanguageForSteamCode("brazilian"), "pt-BR");
  assert.equal(interfaceLanguageForSteamCode("koreana"), "ko");
  assert.equal(interfaceLanguageForSteamCode("italian"), "en");
  assert.throws(() => interfaceLanguageForSteamCode(""), /language is missing/);
  assert.equal(setSteamInterfaceLanguage("japanese"), "ja");
  assert.equal(currentSteamInterfaceLanguage(), "ja");
});
