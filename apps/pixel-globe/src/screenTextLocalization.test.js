import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LANGUAGE_ENGLISH,
  SUPPORTED_LANGUAGES,
  localizationCatalog,
  localizeText
} from "./localization.js";
import {
  screenTextTemplates,
  screenTextTranslationCatalog
} from "./screenTextLocalization.js";
import { extractScreenTextSourceCatalog } from "../tools/screen-text-source-catalog.mjs";

const SOURCE_ROOT = path.dirname(fileURLToPath(import.meta.url));

test("every authored screen-text template is committed to the localization catalog", () => {
  const baseEnglish = new Set(Object.values(localizationCatalog(LANGUAGE_ENGLISH)));
  const authored = extractScreenTextSourceCatalog(SOURCE_ROOT)
    .filter((template) => !baseEnglish.has(template));
  assert.deepEqual(authored, screenTextTemplates());
});

test("ordinary screen text stays concise enough to read instead of skip", () => {
  const overlong = screenTextTemplates().filter((template) => template.length > 200);
  assert.deepEqual(overlong, []);
});

test("historical dialogue avoids present-day institutional framing", () => {
  const modernPhrases = [
    /\bIndigenous\b/i,
    /\bNative land rights\b/i,
    /\bright relation\b/i,
    /\benslaved people\b/i,
    /\bNative and Dutch geographies\b/i
  ];
  const violations = screenTextTemplates().filter((template) => (
    modernPhrases.some((phrase) => phrase.test(template))
  ));
  assert.deepEqual(violations, []);
});

test("prose-form ship labels retain their localized vessel names", () => {
  for (const { id: language } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    assert.equal(
      localizeText(language, "square-rigged caravel"),
      screenTextTranslationCatalog(language)["Square-Rigged Caravel"],
      language
    );
  }
});

test("normal game text cannot be written to the screen in English-only form", () => {
  for (const { id: language } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    const catalog = screenTextTranslationCatalog(language);
    assert.deepEqual(Object.keys(catalog), screenTextTemplates(), `${language} catalog order drifted`);
    for (const source of screenTextTemplates()) {
      const translation = catalog[source];
      assert.equal(typeof translation, "string", `${language} is missing: ${source}`);
      assert.notEqual(translation.trim(), "", `${language} has an empty translation: ${source}`);
      assert.deepEqual(
        placeholders(translation),
        placeholders(source),
        `${language} changed dynamic fields in: ${source}`
      );
      if (isSubstantiveEnglishCopy(source)) {
        assert.notEqual(translation, source, `${language} left normal screen text in English: ${source}`);
      }
      const example = source.replace(/\{\d+\}/g, "7");
      const localized = localizeText(language, example);
      if (isSubstantiveEnglishCopy(source)) {
        assert.notEqual(localized, example, `${language} could not render localized text: ${source}`);
      }
    }
  }
});

test("whale tow feedback is localized in every supported language", () => {
  const source = "THE LINE HOLDS - PREPARE FOR THE TOW";
  for (const { id: language } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    assert.notEqual(localizeText(language, source), source, language);
  }
});

test("whale demographics stay in the localized hunt UI rather than captain dialogue", () => {
  const identity = "Humpback whale, adult female";
  const dialogue = "The beast is spent. Time to land the killing blow.";
  for (const { id: language } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    const localizedIdentity = localizeText(language, identity);
    const localizedDialogue = localizeText(language, dialogue);
    assert.notEqual(localizedIdentity, identity, `${language} identity`);
    assert.notEqual(localizedDialogue, dialogue, `${language} dialogue`);
    assert.doesNotMatch(localizedDialogue, /adult|female|male/i, language);
  }
});

test("composed port greetings localize both the salutation and useful news", () => {
  const source = "Good morning, captain.  Pirates are close. Keep a watch posted before you cast off.";
  for (const { id: language } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    const localized = localizeText(language, source);
    assert.notEqual(localized, source, language);
    assert.doesNotMatch(localized, /Good morning|Pirates are close/, language);
  }
});

test("short diplomacy and ship labels are localized rather than mistaken for identifiers", () => {
  const labels = [
    "Ally", "Friendly", "War", "Fishing Barque", "Small Cog", "Large Junk",
    "Heavy Caravel", "Coastal Pinnace", "Turtle Ship", "Dugout Canoe",
    "Dock: Lisbon", "Hail: Portuguese Carrack", "Land killing blow", "WEIGH ANCHOR"
  ];
  for (const { id: language } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    for (const label of labels) {
      assert.notEqual(localizeText(language, label), label, `${language}: ${label}`);
    }
  }
});

function placeholders(value) {
  return [...value.matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1])).sort((a, b) => a - b);
}

function isSubstantiveEnglishCopy(value) {
  if (/MARQUE-AND-REPRISAL\.COM/i.test(value)) return false;
  if (/\b(?:Dogica|Galmuri11)\b/.test(value)) return false;
  if (!/\s/.test(value)) return false;
  const words = value.match(/[A-Za-z]{2,}/g) || [];
  return words.length >= 3;
}
