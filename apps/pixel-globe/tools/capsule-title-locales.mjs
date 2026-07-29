export const CAPSULE_TITLE_LOCALES = Object.freeze([
  titleLocale(
    "en",
    "english",
    "English",
    "Marque",
    "Reprisal",
    "alphabetic",
    "pirata",
    "DEMO"
  ),
  titleLocale(
    "zh-Hans",
    "schinese",
    "Simplified Chinese",
    "私掠",
    "报复",
    "balanced",
    "ma-shan-zheng",
    "试玩版"
  ),
  titleLocale(
    "ru",
    "russian",
    "Russian",
    "Каперство",
    "Возмездие",
    "alphabetic",
    "yeseva",
    "ДЕМО",
    {
      initialDropScale: 0.5,
      upperStartX: 180,
      upperTouchShipRight: 660,
      upperKissesShip: true
    }
  ),
  titleLocale(
    "es",
    "spanish",
    "Spanish",
    "Corso",
    "Represalia",
    "alphabetic",
    "pirata",
    "DEMO"
  ),
  titleLocale(
    "pt-BR",
    "brazilian",
    "Portuguese (Brazil)",
    "Corso",
    "Represália",
    "alphabetic",
    "pirata",
    "DEMO"
  ),
  titleLocale(
    "ja",
    "japanese",
    "Japanese",
    "私掠",
    "報復",
    "balanced",
    "yuji-boku",
    "体験版"
  ),
  titleLocale(
    "de",
    "german",
    "German",
    "Kaperbrief",
    "Vergeltung",
    "alphabetic",
    "pirata",
    "DEMO",
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
    "pirata",
    "DÉMO"
  ),
  titleLocale(
    "pl",
    "polish",
    "Polish",
    "Kaperstwo",
    "Odwet",
    "alphabetic",
    "pirata",
    "DEMO",
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
    "masa",
    "試玩版"
  ),
  titleLocale(
    "ko",
    "koreana",
    "Korean",
    "사략",
    "보복",
    "balanced",
    "nanum-brush",
    "체험판",
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
  demoLabel,
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
    demoLabel,
    demoFont: options.demoFont ?? font,
    initialDropScale: options.initialDropScale ?? 1,
    centerLowerUnderUpperVisible: options.centerLowerUnderUpperVisible ?? false,
    upperKissesShip: options.upperKissesShip ?? false,
    upperStartX: options.upperStartX,
    upperTouchShipRight: options.upperTouchShipRight
  });
}
