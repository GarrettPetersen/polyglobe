export const CAPSULE_TITLE_LOCALES = Object.freeze([
  titleLocale(
    "en",
    "english",
    "English",
    "Marque",
    "Reprisal",
    "alphabetic",
    "pirata"
  ),
  titleLocale(
    "zh-Hans",
    "schinese",
    "Simplified Chinese",
    "私掠",
    "报复",
    "balanced",
    "ma-shan-zheng"
  ),
  titleLocale(
    "ru",
    "russian",
    "Russian",
    "Каперство",
    "Возмездие",
    "alphabetic",
    "yeseva",
    {
      initialDropScale: 0.5,
      upperStartX: 180,
      upperTouchShipRight: 660,
      upperKissesShip: true
    }
  ),
  titleLocale("es", "spanish", "Spanish", "Corso", "Represalia", "alphabetic", "pirata"),
  titleLocale(
    "pt-BR",
    "brazilian",
    "Portuguese (Brazil)",
    "Corso",
    "Represália",
    "alphabetic",
    "pirata"
  ),
  titleLocale("ja", "japanese", "Japanese", "私掠", "報復", "balanced", "yuji-boku"),
  titleLocale(
    "de",
    "german",
    "German",
    "Kaperbrief",
    "Vergeltung",
    "alphabetic",
    "pirata",
    {
      upperStartX: 180,
      upperTouchShipRight: 660,
      upperKissesShip: true
    }
  ),
  titleLocale(
    "fr",
    "french",
    "French",
    "Marque",
    "Représailles",
    "alphabetic",
    "pirata"
  ),
  titleLocale(
    "pl",
    "polish",
    "Polish",
    "Kaperstwo",
    "Odwet",
    "alphabetic",
    "pirata",
    {
      upperStartX: 180,
      upperTouchShipRight: 660,
      upperKissesShip: true
    }
  ),
  titleLocale(
    "zh-Hant",
    "tchinese",
    "Traditional Chinese",
    "私掠",
    "報復",
    "balanced",
    "masa"
  ),
  titleLocale(
    "ko",
    "koreana",
    "Korean",
    "사략",
    "보복",
    "balanced",
    "nanum-brush",
    { centerLowerUnderUpperVisible: true }
  )
]);

function titleLocale(
  appLocale,
  steamCode,
  label,
  upperWord,
  lowerWord,
  composition,
  font,
  options = {}
) {
  return Object.freeze({
    appLocale,
    steamCode,
    label,
    upperWord,
    lowerWord,
    composition,
    font,
    initialDropScale: options.initialDropScale ?? 1,
    centerLowerUnderUpperVisible: options.centerLowerUnderUpperVisible ?? false,
    upperKissesShip: options.upperKissesShip ?? false,
    upperStartX: options.upperStartX,
    upperTouchShipRight: options.upperTouchShipRight
  });
}
