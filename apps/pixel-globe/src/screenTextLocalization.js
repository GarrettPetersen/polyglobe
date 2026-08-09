import { SCREEN_TEXT_TEMPLATES } from "./screenTextCatalog.js";
import CHINESE_SIMPLIFIED from "./locales/screen/zh-Hans.js";
import RUSSIAN from "./locales/screen/ru.js";
import SPANISH from "./locales/screen/es.js";
import PORTUGUESE_BRAZIL from "./locales/screen/pt-BR.js";
import JAPANESE from "./locales/screen/ja.js";
import GERMAN from "./locales/screen/de.js";
import FRENCH from "./locales/screen/fr.js";
import POLISH from "./locales/screen/pl.js";
import CHINESE_TRADITIONAL from "./locales/screen/zh-Hant.js";
import KOREAN from "./locales/screen/ko.js";
import { SHIP_STATS, shipLabelForSlug } from "./shipStats.js";

const TRANSLATIONS = Object.freeze({
  "zh-Hans": CHINESE_SIMPLIFIED,
  ru: RUSSIAN,
  es: SPANISH,
  "pt-BR": PORTUGUESE_BRAZIL,
  ja: JAPANESE,
  de: GERMAN,
  fr: FRENCH,
  pl: POLISH,
  "zh-Hant": CHINESE_TRADITIONAL,
  ko: KOREAN
});

const compiledByLanguage = new Map();
const CASE_INSENSITIVE_EXACT_SOURCES = new Set(
  SHIP_STATS.map(({ slug }) => shipLabelForSlug(slug))
);

export function localizeGameplayScreenText(language, text, localizeCapture) {
  if (language === "en" || text.length === 0) return text;
  const compiled = compiledCatalog(language);
  const exact = compiled.exact.get(text);
  if (exact !== undefined) return exact;
  const uppercaseExact = compiled.uppercaseExact.get(text);
  if (uppercaseExact !== undefined) return uppercaseExact;
  const caseInsensitiveExact = compiled.caseInsensitiveExact.get(text.toLocaleLowerCase("en"));
  if (caseInsensitiveExact !== undefined) return caseInsensitiveExact;
  for (const entry of compiled.patterns) {
    const match = entry.expression.exec(text);
    if (!match) continue;
    const translated = entry.translation.replace(/\{(\d+)\}/g, (_token, rawIndex) => {
      const capture = match[Number(rawIndex) + 1];
      if (capture === undefined) throw new Error(`Missing screen-text capture ${rawIndex}: ${entry.source}`);
      return localizeCapture(capture);
    });
    return uppercaseDisplayText(text)
      ? translated.toLocaleUpperCase(language)
      : translated;
  }
  return text;
}

export function screenTextTranslationCatalog(language) {
  const catalog = TRANSLATIONS[language];
  if (!catalog) throw new Error(`Missing gameplay screen-text locale: ${language}`);
  return catalog;
}

export function screenTextTemplates() {
  return SCREEN_TEXT_TEMPLATES;
}

function compiledCatalog(language) {
  const cached = compiledByLanguage.get(language);
  if (cached) return cached;
  const catalog = TRANSLATIONS[language];
  if (!catalog) throw new Error(`Missing gameplay screen-text locale: ${language}`);
  const compiled = compileCatalog(catalog, language);
  compiledByLanguage.set(language, compiled);
  return compiled;
}

function compileCatalog(catalog, language) {
  const exact = new Map();
  const uppercaseExact = new Map();
  const caseInsensitiveExact = new Map();
  const patterns = [];
  for (const source of SCREEN_TEXT_TEMPLATES) {
    const translation = catalog[source];
    if (typeof translation !== "string" || translation.length === 0) {
      throw new Error(`Missing gameplay screen-text translation: ${source}`);
    }
    if (!source.includes("{0}")) {
      exact.set(source, translation);
      uppercaseExact.set(source.toLocaleUpperCase("en"), translation.toLocaleUpperCase(language));
      if (CASE_INSENSITIVE_EXACT_SOURCES.has(source)) {
        caseInsensitiveExact.set(source.toLocaleLowerCase("en"), translation);
      }
      continue;
    }
    patterns.push(Object.freeze({
      source,
      translation,
      expression: templateExpression(source),
      specificity: source.replace(/\{\d+\}/g, "").length
    }));
  }
  patterns.sort((left, right) => right.specificity - left.specificity);
  return Object.freeze({ exact, uppercaseExact, caseInsensitiveExact, patterns: Object.freeze(patterns) });
}

function templateExpression(template) {
  let source = "^";
  let cursor = 0;
  for (const match of template.matchAll(/\{(\d+)\}/g)) {
    source += escapeExpression(template.slice(cursor, match.index)).replace(/\\ /g, "\\s+");
    source += "([\\s\\S]*?)";
    cursor = match.index + match[0].length;
  }
  source += escapeExpression(template.slice(cursor)).replace(/\\ /g, "\\s+");
  source += "$";
  return new RegExp(source, "i");
}

function uppercaseDisplayText(value) {
  const letters = value.replace(/[^\p{L}]+/gu, "");
  return letters.length > 1 && letters === letters.toLocaleUpperCase("en");
}

function escapeExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\ ");
}
