import assert from "node:assert/strict";
import test from "node:test";

import {
  LANGUAGE_CHINESE_SIMPLIFIED,
  LANGUAGE_ENGLISH,
  LANGUAGE_JAPANESE,
  localizationCatalog,
  languageFontProfile,
  languageNativeLabel,
  localizeText,
  nextLanguage,
  normalizeLanguage,
  textContainsCjk,
  translate
} from "./localization.js";
import { pixelFontSizePx } from "./pixelText.js";

test("language aliases normalize to the supported locales", () => {
  assert.equal(normalizeLanguage("en-CA"), LANGUAGE_ENGLISH);
  assert.equal(normalizeLanguage("zh-CN"), LANGUAGE_CHINESE_SIMPLIFIED);
  assert.equal(normalizeLanguage("zh-Hans"), LANGUAGE_CHINESE_SIMPLIFIED);
  assert.equal(normalizeLanguage("ja-JP"), LANGUAGE_JAPANESE);
  assert.equal(normalizeLanguage("missing"), LANGUAGE_ENGLISH);
  assert.equal(nextLanguage(LANGUAGE_ENGLISH), LANGUAGE_CHINESE_SIMPLIFIED);
  assert.equal(nextLanguage(LANGUAGE_CHINESE_SIMPLIFIED), LANGUAGE_JAPANESE);
  assert.equal(nextLanguage(LANGUAGE_JAPANESE), LANGUAGE_ENGLISH);
  assert.equal(nextLanguage(LANGUAGE_ENGLISH, -1), LANGUAGE_JAPANESE);
  assert.equal(languageNativeLabel(LANGUAGE_JAPANESE), "日本語");
});

test("every translated catalog covers the complete English key set", () => {
  const englishKeys = Object.keys(localizationCatalog(LANGUAGE_ENGLISH)).sort();
  const chineseKeys = Object.keys(localizationCatalog(LANGUAGE_CHINESE_SIMPLIFIED)).sort();
  const japaneseKeys = Object.keys(localizationCatalog(LANGUAGE_JAPANESE)).sort();
  assert.deepEqual(chineseKeys, englishKeys);
  assert.deepEqual(japaneseKeys, englishKeys);
  assert.equal(translate(LANGUAGE_CHINESE_SIMPLIFIED, "options.language"), "语言");
  assert.equal(translate(LANGUAGE_CHINESE_SIMPLIFIED, "start.pastVoyages"), "往昔航程");
  assert.equal(translate(LANGUAGE_JAPANESE, "options.language"), "言語");
  assert.equal(translate(LANGUAGE_JAPANESE, "start.pastVoyages"), "過去の航海");
});

test("existing canvas phrases and templates localize without changing proper names", () => {
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "CAPTAIN'S LEDGER"), "船长账簿");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "PAGE 2/7"), "第2/7页");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "WATER 16D"), "淡水 16天");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "Hardtack"), "硬饼干");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "Hardtack 12 RATIONS"), "硬饼干 12份口粮");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "CLOVES 3"), "丁香 3");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "PIRATE"), "海盗");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "CAPTAIN'S LEDGER"), "船長の帳簿");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "PAGE 2/7"), "2/7頁");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "WATER 16D"), "水 16日");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "Hardtack 12 RATIONS"), "乾パン 12食");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "CLOVES 3"), "クローブ 3");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "PIRATE"), "海賊");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "Lisbon"), "Lisbon");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "Lisbon"), "Lisbon");
  assert.equal(localizeText(LANGUAGE_ENGLISH, "PAGE 2/7"), "PAGE 2/7");
});

test("Chinese and Japanese use zpix only at its exact 12px design scale", () => {
  for (const language of [LANGUAGE_CHINESE_SIMPLIFIED, LANGUAGE_JAPANESE]) {
    const profile = languageFontProfile(language);
    assert.equal(pixelFontSizePx(profile.smallFont), 12);
    assert.equal(pixelFontSizePx(profile.dialogueFont), 12);
    assert.equal(profile.lineHeight, 14);
    assert.ok(profile.lineHeight > profile.fontSize);
  }
  assert.equal(textContainsCjk("简体中文"), true);
  assert.equal(textContainsCjk("日本語カタカナ"), true);
  assert.equal(textContainsCjk("Marque & Reprisal"), false);
});

test("the longest dense-menu translations fit their conservative pixel budgets", () => {
  const cases = [
    ["options.fullscreenUnavailable", 176],
    ["options.returnToMainMenu", 138],
    ["captain.navigation", 194],
    ["navigation.none", 260],
    ["voyages.winDeathQuitDemo", 302],
    ["politics.playerStanding", 112],
    ["ship.itemsDocuments", 170]
  ];
  for (const language of [LANGUAGE_CHINESE_SIMPLIFIED, LANGUAGE_JAPANESE]) {
    for (const [key, maxWidth] of cases) {
      const text = translate(language, key);
      const conservativeWidth = Array.from(text).length * 12;
      assert.ok(
        conservativeWidth <= maxWidth,
        `${language} ${key} needs ${conservativeWidth}px, has ${maxWidth}px`
      );
    }
  }
});
