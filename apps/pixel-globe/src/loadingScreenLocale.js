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

const INTERFACE_LANGUAGE_BY_STEAM_CODE = Object.freeze(new Map(
  [...CAPSULE_TITLE_STEAM_CODE_BY_LANGUAGE]
    .map(([language, steamCode]) => [steamCode, language])
));

let steamInterfaceLanguage = null;

export function initialInterfaceLanguage(requestedLanguage, storedLanguage, platformLanguage = null) {
  return normalizeLanguage(
    requestedLanguage ||
    storedLanguage ||
    platformLanguage ||
    LANGUAGE_ENGLISH
  );
}

export function interfaceLanguageForSteamCode(steamCode) {
  if (typeof steamCode !== "string" || steamCode.trim() === "") {
    throw new Error("Steam game language is missing");
  }
  return INTERFACE_LANGUAGE_BY_STEAM_CODE.get(steamCode.trim().toLowerCase()) || LANGUAGE_ENGLISH;
}

export function setSteamInterfaceLanguage(steamCode) {
  steamInterfaceLanguage = interfaceLanguageForSteamCode(steamCode);
  return steamInterfaceLanguage;
}

export function currentSteamInterfaceLanguage() {
  return steamInterfaceLanguage;
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
