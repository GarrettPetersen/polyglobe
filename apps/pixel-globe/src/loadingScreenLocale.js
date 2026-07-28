import {
  LANGUAGE_ENGLISH,
  normalizeLanguage
} from "./localization.js";

export const INTERFACE_LANGUAGE_STORAGE_KEY = "pixel_globe_language";

const CAPSULE_TITLE_STEAM_CODE_BY_LANGUAGE = Object.freeze(new Map([
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
]));

export function initialInterfaceLanguage(requestedLanguage, storedLanguage) {
  return normalizeLanguage(
    requestedLanguage ||
    storedLanguage ||
    LANGUAGE_ENGLISH
  );
}

export function loadingCapsuleTitleSteamCode(language) {
  const normalized = normalizeLanguage(language);
  const steamCode = CAPSULE_TITLE_STEAM_CODE_BY_LANGUAGE.get(normalized);
  if (steamCode === undefined) {
    throw new Error(`Loading capsule title is missing for interface language: ${normalized}`);
  }
  return steamCode;
}

export function loadingCapsuleTitleAtlasFile(language) {
  return `title_${loadingCapsuleTitleSteamCode(language)}.png`;
}
