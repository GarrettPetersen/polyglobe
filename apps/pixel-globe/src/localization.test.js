import assert from "node:assert/strict";
import test from "node:test";

import {
  LANGUAGE_CHINESE_SIMPLIFIED,
  LANGUAGE_ENGLISH,
  localizationCatalog,
  languageFontProfile,
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
  assert.equal(normalizeLanguage("missing"), LANGUAGE_ENGLISH);
  assert.equal(nextLanguage(LANGUAGE_ENGLISH), LANGUAGE_CHINESE_SIMPLIFIED);
  assert.equal(nextLanguage(LANGUAGE_CHINESE_SIMPLIFIED), LANGUAGE_ENGLISH);
});

test("Simplified Chinese covers every English localization key", () => {
  const englishKeys = Object.keys(localizationCatalog(LANGUAGE_ENGLISH)).sort();
  const chineseKeys = Object.keys(localizationCatalog(LANGUAGE_CHINESE_SIMPLIFIED)).sort();
  assert.deepEqual(chineseKeys, englishKeys);
  assert.equal(translate(LANGUAGE_CHINESE_SIMPLIFIED, "options.language"), "语言");
  assert.equal(translate(LANGUAGE_CHINESE_SIMPLIFIED, "start.pastVoyages"), "往昔航程");
});

test("existing canvas phrases and templates localize without changing proper names", () => {
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "CAPTAIN'S LEDGER"), "船长账簿");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "PAGE 2/7"), "第2/7页");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "WATER 16D"), "淡水 16天");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "Hardtack"), "硬饼干");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "Hardtack 12 RATIONS"), "硬饼干 12份口粮");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "CLOVES 3"), "丁香 3");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "PIRATE"), "海盗");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "Lisbon"), "Lisbon");
  assert.equal(localizeText(LANGUAGE_ENGLISH, "PAGE 2/7"), "PAGE 2/7");
});

test("CJK uses zpix only at its exact 12px design scale", () => {
  const profile = languageFontProfile(LANGUAGE_CHINESE_SIMPLIFIED);
  assert.equal(pixelFontSizePx(profile.smallFont), 12);
  assert.equal(pixelFontSizePx(profile.dialogueFont), 12);
  assert.equal(profile.lineHeight, 14);
  assert.ok(profile.lineHeight > profile.fontSize);
  assert.equal(textContainsCjk("简体中文"), true);
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
  for (const [key, maxWidth] of cases) {
    const text = translate(LANGUAGE_CHINESE_SIMPLIFIED, key);
    const conservativeWidth = Array.from(text).length * 12;
    assert.ok(conservativeWidth <= maxWidth, `${key} needs ${conservativeWidth}px, has ${maxWidth}px`);
  }
});
