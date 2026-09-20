import assert from "node:assert/strict";
import test from "node:test";

import {
  LANGUAGE_CHINESE_SIMPLIFIED,
  LANGUAGE_CHINESE_TRADITIONAL,
  LANGUAGE_ENGLISH,
  LANGUAGE_FRENCH,
  LANGUAGE_GERMAN,
  LANGUAGE_JAPANESE,
  LANGUAGE_KOREAN,
  LANGUAGE_POLISH,
  LANGUAGE_PORTUGUESE_BRAZIL,
  LANGUAGE_RUSSIAN,
  LANGUAGE_SPANISH,
  SUPPORTED_LANGUAGES,
  localizationCatalog,
  languageFontProfile,
  languageNativeLabel,
  languageTitleFont,
  languageUsesTallPixelMetrics,
  localizeText,
  nextLanguage,
  normalizeLanguage,
  textContainsCjk,
  textUsesLocaleGlyphs,
  translate
} from "./localization.js";
import { pixelFontSizePx } from "./pixelText.js";

test("language aliases normalize to the supported locales", () => {
  assert.equal(normalizeLanguage("en-CA"), LANGUAGE_ENGLISH);
  assert.equal(normalizeLanguage("zh-CN"), LANGUAGE_CHINESE_SIMPLIFIED);
  assert.equal(normalizeLanguage("zh-Hans"), LANGUAGE_CHINESE_SIMPLIFIED);
  assert.equal(normalizeLanguage("zh-TW"), LANGUAGE_CHINESE_TRADITIONAL);
  assert.equal(normalizeLanguage("ru-RU"), LANGUAGE_RUSSIAN);
  assert.equal(normalizeLanguage("es-MX"), LANGUAGE_SPANISH);
  assert.equal(normalizeLanguage("pt"), LANGUAGE_PORTUGUESE_BRAZIL);
  assert.equal(normalizeLanguage("pt-BR"), LANGUAGE_PORTUGUESE_BRAZIL);
  assert.equal(normalizeLanguage("ja-JP"), LANGUAGE_JAPANESE);
  assert.equal(normalizeLanguage("de-DE"), LANGUAGE_GERMAN);
  assert.equal(normalizeLanguage("fr-CA"), LANGUAGE_FRENCH);
  assert.equal(normalizeLanguage("pl-PL"), LANGUAGE_POLISH);
  assert.equal(normalizeLanguage("ko-KR"), LANGUAGE_KOREAN);
  assert.equal(normalizeLanguage("missing"), LANGUAGE_ENGLISH);
  assert.equal(nextLanguage(LANGUAGE_ENGLISH), LANGUAGE_CHINESE_SIMPLIFIED);
  assert.equal(nextLanguage(LANGUAGE_CHINESE_SIMPLIFIED), LANGUAGE_RUSSIAN);
  assert.equal(nextLanguage(LANGUAGE_KOREAN), LANGUAGE_ENGLISH);
  assert.equal(nextLanguage(LANGUAGE_ENGLISH, -1), LANGUAGE_KOREAN);
  assert.equal(languageNativeLabel(LANGUAGE_JAPANESE), "日本語");
  assert.equal(languageNativeLabel(LANGUAGE_KOREAN), "한국어");
});

test("every translated catalog covers the complete English key set", () => {
  const englishKeys = Object.keys(localizationCatalog(LANGUAGE_ENGLISH)).sort();
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  for (const { id } of SUPPORTED_LANGUAGES) {
    const translatedKeys = Object.keys(localizationCatalog(id)).sort();
    assert.deepEqual(translatedKeys, englishKeys, `${id} catalog differs from English`);
  }
  assert.equal(translate(LANGUAGE_CHINESE_SIMPLIFIED, "options.language"), "语言");
  assert.equal(translate(LANGUAGE_CHINESE_TRADITIONAL, "options.language"), "語言");
  assert.equal(translate(LANGUAGE_RUSSIAN, "options.language"), "ЯЗЫК");
  assert.equal(translate(LANGUAGE_SPANISH, "options.language"), "IDIOMA");
  assert.equal(translate(LANGUAGE_PORTUGUESE_BRAZIL, "options.language"), "IDIOMA");
  assert.equal(translate(LANGUAGE_JAPANESE, "options.language"), "言語");
  assert.equal(translate(LANGUAGE_GERMAN, "options.language"), "SPRACHE");
  assert.equal(translate(LANGUAGE_FRENCH, "options.language"), "LANGUE");
  assert.equal(translate(LANGUAGE_POLISH, "options.language"), "JĘZYK");
  assert.equal(translate(LANGUAGE_KOREAN, "options.language"), "언어");
});

test("rice cargo localizes across its principal Asian languages", () => {
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "Rice"), "大米");
  assert.equal(localizeText(LANGUAGE_CHINESE_TRADITIONAL, "Rice"), "稻米");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "Rice"), "米");
  assert.equal(localizeText(LANGUAGE_KOREAN, "Rice"), "쌀");
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "sealed rice tribute"), "封缄的贡米");
});

test("Sound Dues use the historical Øresund toll term in every locale", () => {
  const expected = new Map([
    [LANGUAGE_ENGLISH, "Sound Dues"],
    [LANGUAGE_CHINESE_SIMPLIFIED, "厄勒海峡通行税"],
    [LANGUAGE_RUSSIAN, "Зундская пошлина"],
    [LANGUAGE_SPANISH, "Peaje del Sund"],
    [LANGUAGE_PORTUGUESE_BRAZIL, "Pedágio do Sund"],
    [LANGUAGE_JAPANESE, "エーレスンド海峡通行税"],
    [LANGUAGE_GERMAN, "Sundzoll"],
    [LANGUAGE_FRENCH, "Droits du Sund"],
    [LANGUAGE_POLISH, "Cło sundzkie"],
    [LANGUAGE_CHINESE_TRADITIONAL, "厄勒海峽通行稅"],
    [LANGUAGE_KOREAN, "외레순 해협 통행세"]
  ]);
  for (const { id } of SUPPORTED_LANGUAGES) {
    assert.equal(localizeText(id, "Sound Dues"), expected.get(id), `${id} mistranslated Sound as audio`);
  }
});

test("diplomatic briefs and settlement stores retain their historical meaning", () => {
  const briefs = "{0} comes aboard with the briefs.{1}";
  const resupply = "{0} A timely resupply earns {1} doubloons and gives {2} the stores it needs to become a permanent city.";
  const expectedBriefs = new Map([
    [LANGUAGE_CHINESE_SIMPLIFIED, "{0}携密封文书登船。{1}"],
    [LANGUAGE_RUSSIAN, "{0} поднимается на борт с запечатанными бумагами.{1}"],
    [LANGUAGE_SPANISH, "{0} sube a bordo con los despachos.{1}"],
    [LANGUAGE_PORTUGUESE_BRAZIL, "{0} sobe a bordo com os despachos.{1}"],
    [LANGUAGE_JAPANESE, "{0}が封印文書を携えて乗船します。{1}"],
    [LANGUAGE_GERMAN, "{0} kommt mit den versiegelten Schriftstücken an Bord.{1}"],
    [LANGUAGE_FRENCH, "{0} monte à bord avec les dépêches scellées.{1}"],
    [LANGUAGE_POLISH, "{0} wchodzi na pokład z zapieczętowanymi pismami.{1}"],
    [LANGUAGE_CHINESE_TRADITIONAL, "{0}攜密封文書登船。{1}"],
    [LANGUAGE_KOREAN, "{0}이 봉인된 문서를 가지고 승선합니다.{1}"]
  ]);
  const expectedResupply = new Map([
    [LANGUAGE_CHINESE_SIMPLIFIED, "{0}及时补给可获得{1}达布隆，并为{2}提供成为永久城市所需的物资。"],
    [LANGUAGE_RUSSIAN, "{0}Своевременное снабжение принесёт {1} дублонов и даст {2} необходимые припасы, чтобы стать постоянным городом."],
    [LANGUAGE_SPANISH, "{0}Un reabastecimiento a tiempo otorga {1} doblones y proporciona a {2} los suministros necesarios para convertirse en una ciudad permanente."],
    [LANGUAGE_PORTUGUESE_BRAZIL, "{0}Um reabastecimento a tempo rende {1} dobrões e fornece a {2} os mantimentos necessários para se tornar uma cidade permanente."],
    [LANGUAGE_JAPANESE, "{0}期日どおりの補給で{1}ダブロンを得られ、{2}が恒久都市となるために必要な物資も届けられます。"],
    [LANGUAGE_GERMAN, "{0}Eine rechtzeitige Versorgung bringt {1} Dublonen ein und liefert {2} die Vorräte, die es für den Status einer dauerhaften Stadt benötigt."],
    [LANGUAGE_FRENCH, "{0}Un ravitaillement effectué à temps rapporte {1} doublons et fournit à {2} les provisions nécessaires pour devenir une ville permanente."],
    [LANGUAGE_POLISH, "{0}Terminowe zaopatrzenie przynosi {1} dublonów i dostarcza {2} zapasów potrzebnych, by stało się stałym miastem."],
    [LANGUAGE_CHINESE_TRADITIONAL, "{0}及時補給可獲得{1}達布隆，並為{2}提供成為永久城市所需的物資。"],
    [LANGUAGE_KOREAN, "{0}제때 보급하면 더블룬 {1}닢을 얻고 {2}이 영구 도시가 되는 데 필요한 물자를 공급합니다."]
  ]);

  for (const { id } of SUPPORTED_LANGUAGES) {
    if (id === LANGUAGE_ENGLISH) continue;
    assert.equal(localizeText(id, briefs), expectedBriefs.get(id), `${id} diplomatic briefs`);
    assert.equal(localizeText(id, resupply), expectedResupply.get(id), `${id} resupply notice`);
    for (const suffix of ["{3}", "{3}{4}"]) {
      assert.equal(localizeText(id, `${resupply}${suffix}`), `${expectedResupply.get(id)}${suffix}`, `${id} resupply notice suffix ${suffix}`);
    }
  }
});

test("first-day sunset and sunrise notices are localized everywhere", () => {
  for (const { id } of SUPPORTED_LANGUAGES) {
    for (const key of ["status.sunset", "status.sunrise"]) {
      const value = translate(id, key);
      assert.ok(value.length > 0, `${id} has an empty ${key}`);
      if (id !== LANGUAGE_ENGLISH) {
        assert.notEqual(value, translate(LANGUAGE_ENGLISH, key), `${id} retained English for ${key}`);
      }
    }
  }
});

test("family debt journal summaries localize the live amount and home port", () => {
  for (const { id } of SUPPORTED_LANGUAGES) {
    const summary = translate(id, "quest.familyDebtOutstanding", {
      amount: "97k DB",
      city: "London"
    });
    assert.match(summary, /97k DB/);
    assert.match(summary, /London/);
    assert.doesNotMatch(summary, /\{(?:amount|city)\}/);
    if (id !== LANGUAGE_ENGLISH) {
      assert.notEqual(
        summary,
        translate(LANGUAGE_ENGLISH, "quest.familyDebtOutstanding", {
          amount: "97k DB",
          city: "London"
        }),
        `${id} retained the English family-debt summary`
      );
    }
  }
});

test("completed main voyages direct every language toward eventual retirement", () => {
  for (const { id } of SUPPORTED_LANGUAGES) {
    const summary = translate(id, "quest.mainVoyageCompleted", { city: "London" });
    assert.match(summary, /London/);
    assert.doesNotMatch(summary, /\{city\}/);
    if (id !== LANGUAGE_ENGLISH) {
      assert.notEqual(
        summary,
        translate(LANGUAGE_ENGLISH, "quest.mainVoyageCompleted", { city: "London" }),
        `${id} retained the English completed-voyage summary`
      );
    }
  }
});

test("the Great Barrier Reef discovery and patron exchange are localized everywhere", () => {
  const keys = [
    "discovery.greatBarrierReef.name",
    "discovery.greatBarrierReef.notice",
    "discovery.greatBarrierReef.detail",
    "discovery.greatBarrierReef.captain",
    "discovery.greatBarrierReef.reportCaptain",
    "discovery.greatBarrierReef.reportPatron"
  ];
  for (const { id } of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      const value = translate(id, key);
      assert.ok(value.length > 0, `${id} has an empty ${key}`);
      if (id !== LANGUAGE_ENGLISH) {
        assert.notEqual(value, translate(LANGUAGE_ENGLISH, key), `${id} retained English for ${key}`);
      }
    }
  }
  assert.equal(translate(LANGUAGE_CHINESE_SIMPLIFIED, keys[0]), "大堡礁");
  assert.equal(translate(LANGUAGE_JAPANESE, keys[0]), "グレート・バリア・リーフ");
  assert.equal(translate(LANGUAGE_KOREAN, keys[0]), "그레이트 배리어 리프");
});

test("controller icon preferences use localized mode and platform labels", () => {
  const expected = new Map([
    [LANGUAGE_ENGLISH, ["AUTOMATIC", "NINTENDO", "GENERIC"]],
    [LANGUAGE_CHINESE_SIMPLIFIED, ["自动", "任天堂", "通用"]],
    [LANGUAGE_RUSSIAN, ["АВТО", "NINTENDO", "ОБЩ."]],
    [LANGUAGE_SPANISH, ["AUTOMÁTICO", "NINTENDO", "GENÉRICO"]],
    [LANGUAGE_PORTUGUESE_BRAZIL, ["AUTOMÁTICO", "NINTENDO", "GENÉRICO"]],
    [LANGUAGE_JAPANESE, ["自動", "任天堂", "汎用"]],
    [LANGUAGE_GERMAN, ["AUTOMATIK", "NINTENDO", "ALLGEMEIN"]],
    [LANGUAGE_FRENCH, ["AUTOMATIQUE", "NINTENDO", "GÉNÉRIQUE"]],
    [LANGUAGE_POLISH, ["AUTOMAT.", "NINTENDO", "OGÓLNE"]],
    [LANGUAGE_CHINESE_TRADITIONAL, ["自動", "任天堂", "通用"]],
    [LANGUAGE_KOREAN, ["자동", "닌텐도", "범용"]]
  ]);
  for (const { id } of SUPPORTED_LANGUAGES) {
    assert.deepEqual([
      translate(id, "options.controllerIcons.automatic"),
      translate(id, "options.controllerIcons.nintendo"),
      translate(id, "options.controllerIcons.generic")
    ], expected.get(id), `${id} controller labels fell back to English`);
    for (const key of ["xbox", "playstation"]) {
      assert.ok(translate(id, `options.controllerIcons.${key}`).length > 0);
    }
  }
});

test("control scheme help is localized in every supported language", () => {
  const keys = [
    "options.controlScheme",
    "options.controlScheme.title",
    "options.controlScheme.absolute",
    "options.controlScheme.relative",
    "options.controlScheme.absoluteDetail",
    "options.controlScheme.relativeDetail",
    "options.controlScheme.pointerNote"
  ];
  for (const { id } of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      const value = translate(id, key);
      assert.ok(value.length > 0, `${id} has an empty ${key}`);
      if (id !== LANGUAGE_ENGLISH) {
        assert.notEqual(value, translate(LANGUAGE_ENGLISH, key), `${id} retained English for ${key}`);
      }
    }
  }
});

test("Duel and the historical commander selector are localized everywhere", () => {
  const keys = [
    "start.shipBattle",
    "historical.chooseCommander",
    "historical.couldNotLoadPortrait",
    "historical.scenario.lepanto-1571.mapLabel",
    "historical.ship.galley",
    "historical.commander.john-of-austria",
    "historical.commander.agostino-barbarigo",
    "historical.commander.giovanni-andrea-doria",
    "historical.commander.ali-pasha",
    "historical.commander.mahomet-sirocco",
    "historical.commander.uluc-ali",
    "historical.commander.short.john-of-austria",
    "historical.commander.short.agostino-barbarigo",
    "historical.commander.short.giovanni-andrea-doria",
    "historical.commander.short.ali-pasha",
    "historical.commander.short.mahomet-sirocco",
    "historical.commander.short.uluc-ali"
  ];
  for (const { id } of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      assert.ok(translate(id, key).length > 0, `${id} has an empty ${key}`);
    }
  }
  assert.equal(translate(LANGUAGE_ENGLISH, "start.shipBattle"), "DUEL");
  assert.equal(translate(LANGUAGE_JAPANESE, "start.shipBattle"), "決闘");
  assert.equal(translate(LANGUAGE_KOREAN, "start.shipBattle"), "결투");
});

test("controller layout labels, actions, and feedback are localized everywhere", () => {
  const keys = [
    "options.keyMapping",
    "options.keyMapping.pressKey",
    "options.keyMapping.rebind",
    "options.keyMapping.clear",
    "options.keyMapping.defaults",
    "options.keyMapping.rebindHint",
    "options.keyMapping.defaultsRestored",
    "options.keyMapping.movedFrom",
    "options.keyMapping.assigned",
    "options.keyMapping.bindingCleared",
    "options.keyMapping.bindingCancelled",
    "options.keyMapping.action.steer-left",
    "options.keyMapping.action.steer-right",
    "options.keyMapping.action.steer-up",
    "options.keyMapping.action.steer-down",
    "options.keyMapping.action.fire-port",
    "options.keyMapping.action.fire-starboard",
    "options.keyMapping.action.interact",
    "options.keyMapping.action.captain-menu",
    "options.keyMapping.action.ship-info",
    "options.keyMapping.action.politics",
    "options.keyMapping.action.screenshot"
  ];
  for (const { id } of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      const value = translate(id, key, { action: "ACTION", key: "K" });
      assert.ok(value.length > 0, `${id} has an empty ${key}`);
      if (id !== LANGUAGE_ENGLISH) {
        assert.notEqual(value, translate(LANGUAGE_ENGLISH, key, {
          action: "ACTION",
          key: "K"
        }), `${id} retained English for ${key}`);
      }
    }
  }
});

test("audited canvas headings are localized everywhere", () => {
  const keys = [
    "common.target",
    "aboard.goal",
    "aboard.skill",
    "ledger.captainAccount",
    "demo.voyageComplete",
    "demo.thanks",
    "demo.fullVersion",
    "outcome.lostAtSea",
    "outcome.neverSeenAgain",
    "outcome.voyageEnded",
    "loadout.title",
    "loadout.holdPlan"
  ];
  for (const { id } of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      const value = translate(id, key);
      assert.ok(value.length > 0, `${id} has an empty ${key}`);
      if (id !== LANGUAGE_ENGLISH) {
        assert.notEqual(value, translate(LANGUAGE_ENGLISH, key), `${id} retained English for ${key}`);
      }
    }
  }
});

test("the start-menu title is translated in every supported language with a complete pixel font", () => {
  const expectedTitles = new Map([
    [LANGUAGE_ENGLISH, "MARQUE & REPRISAL"],
    [LANGUAGE_CHINESE_SIMPLIFIED, "私掠与报复"],
    [LANGUAGE_RUSSIAN, "КАПЕРСТВО И ВОЗМЕЗДИЕ"],
    [LANGUAGE_SPANISH, "CORSO Y REPRESALIA"],
    [LANGUAGE_PORTUGUESE_BRAZIL, "CORSO E REPRESÁLIA"],
    [LANGUAGE_JAPANESE, "私掠と報復"],
    [LANGUAGE_GERMAN, "KAPERBRIEF & VERGELTUNG"],
    [LANGUAGE_FRENCH, "MARQUE ET REPRÉSAILLES"],
    [LANGUAGE_POLISH, "KAPERSTWO I ODWET"],
    [LANGUAGE_CHINESE_TRADITIONAL, "私掠與報復"],
    [LANGUAGE_KOREAN, "사략과 보복"]
  ]);
  assert.equal(expectedTitles.size, SUPPORTED_LANGUAGES.length);
  for (const { id } of SUPPORTED_LANGUAGES) {
    const title = translate(id, "start.title");
    const font = languageTitleFont(id, title);
    assert.equal(title, expectedTitles.get(id));
    if (id !== LANGUAGE_ENGLISH) {
      assert.doesNotMatch(title, /Marque & Reprisal/i, `${id} retained the English title`);
    }
    const expectedFamily = /^[\x20-\x7e]+$/.test(title)
      ? "Pixel Pirate"
      : languageFontProfile(id).fontFamily;
    assert.ok(font.includes(expectedFamily), `${id} title did not use ${expectedFamily}`);
  }
  assert.throws(() => languageTitleFont(LANGUAGE_ENGLISH, ""), /non-empty string/);
  assert.throws(() => languageTitleFont(LANGUAGE_ENGLISH, null), /non-empty string/);
});

test("existing canvas phrases, templates, and place names localize", () => {
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
  assert.equal(localizeText(LANGUAGE_CHINESE_SIMPLIFIED, "Lisbon"), "里斯本");
  assert.equal(localizeText(LANGUAGE_JAPANESE, "Lisbon"), "リスボン");
  assert.equal(localizeText(LANGUAGE_ENGLISH, "PAGE 2/7"), "PAGE 2/7");
});

test("each writing system uses a pixel font at its exact native scale", () => {
  const zpixLanguages = [
    LANGUAGE_CHINESE_SIMPLIFIED,
    LANGUAGE_CHINESE_TRADITIONAL,
    LANGUAGE_JAPANESE,
    LANGUAGE_RUSSIAN,
    LANGUAGE_POLISH
  ];
  for (const language of zpixLanguages) {
    const profile = languageFontProfile(language);
    assert.equal(pixelFontSizePx(profile.smallFont), 12);
    assert.equal(pixelFontSizePx(profile.dialogueFont), 12);
    assert.equal(profile.lineHeight, 14);
    assert.ok(profile.lineHeight > profile.fontSize);
    assert.equal(languageUsesTallPixelMetrics(language), true);
  }
  const koreanProfile = languageFontProfile(LANGUAGE_KOREAN);
  assert.equal(pixelFontSizePx(koreanProfile.smallFont), 11);
  assert.equal(pixelFontSizePx(koreanProfile.dialogueFont), 11);
  assert.equal(koreanProfile.lineHeight, 13);
  assert.equal(languageUsesTallPixelMetrics(LANGUAGE_KOREAN), true);

  for (const language of [
    LANGUAGE_ENGLISH,
    LANGUAGE_SPANISH,
    LANGUAGE_PORTUGUESE_BRAZIL,
    LANGUAGE_GERMAN,
    LANGUAGE_FRENCH
  ]) {
    assert.equal(pixelFontSizePx(languageFontProfile(language).smallFont), 8);
    assert.equal(languageUsesTallPixelMetrics(language), false);
  }
  assert.equal(textContainsCjk("简体中文"), true);
  assert.equal(textContainsCjk("日本語カタカナ"), true);
  assert.equal(textContainsCjk("한국어"), true);
  assert.equal(textContainsCjk("Marque & Reprisal"), false);
  assert.equal(textUsesLocaleGlyphs(LANGUAGE_RUSSIAN, "НАСТРОЙКИ"), true);
  assert.equal(textUsesLocaleGlyphs(LANGUAGE_POLISH, "JĘZYK"), true);
  assert.equal(textUsesLocaleGlyphs(LANGUAGE_SPANISH, "ESPAÑOL"), false);
});

test("dynamic canvas templates localize in every target language", () => {
  for (const { id } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    const page = localizeText(id, "PAGE 2/7");
    const water = localizeText(id, "WATER 16D");
    const rations = localizeText(id, "Hardtack 12 RATIONS");
    assert.equal(page.includes("{0}"), false, `${id} left a page placeholder`);
    assert.equal(water.includes("{0}"), false, `${id} left a water placeholder`);
    assert.equal(rations.includes("Hardtack"), false, `${id} left an English good name`);
    assert.match(page, /2.*7/);
    assert.match(water, /16/);
    assert.match(rations, /12/);
    assert.notEqual(localizeText(id, "Lisbon"), "Lisbon", `${id} left an English place name`);
  }
});

test("war-loan journal, secured renegotiation, and repayment navigation localize in every target language", () => {
  const cases = [
    ["quest.sovereignWarLoan", {}],
    ["quest.warLoanAwait", { borrower: "Portugal", enemy: "Spain" }],
    ["quest.warLoanClaim", { city: "Lisbon" }],
    ["quest.warLoanDefault", { city: "Lisbon" }],
    ["quest.warLoanRenegotiate", { city: "Lisbon" }],
    ["quest.warLoanArrears", { borrower: "Portugal" }],
    ["quest.warLoanCustomsPaused", { city: "Lisbon" }],
    ["quest.warLoanCustoms", { accrued: "600,000", total: "1,200,000", city: "Lisbon" }],
    ["navigation.claimWarLoanRepayment", {}],
    ["navigation.warLoanRepaymentAt", { city: "Lisbon" }],
    ["navigation.hearWarLoanRenegotiation", {}],
    ["navigation.warLoanRenegotiationAt", { city: "Lisbon" }]
  ];
  for (const { id } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    for (const [key, replacements] of cases) {
      const localized = translate(id, key, replacements);
      assert.notEqual(localized, translate(LANGUAGE_ENGLISH, key, replacements), `${id}: ${key}`);
      assert.doesNotMatch(localized, /\{(?:borrower|enemy|city|accrued|total)\}/, `${id}: ${key}`);
    }
  }
});

test("the longest dense-menu translations fit their conservative pixel budgets", () => {
  const cases = [
    ["options.fullscreenUnavailable", 176],
    ["options.returnToMainMenu", 138],
    ["captain.navigation", 194],
    ["navigation.none", 260],
    ["voyages.winDeathQuitDemo", 302],
    ["politics.playerStanding", 112],
    ["ship.itemsDocuments", 170],
    ["start.pastVoyages", 176],
    ["ship.vessel", 105],
    ["ship.ledger", 105],
    ["ship.inventory", 105]
  ];
  for (const { id: language } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    for (const [key, maxWidth] of cases) {
      const text = translate(language, key);
      const profile = languageFontProfile(language);
      const glyphWidth = textContainsCjk(text) ? profile.fontSize : Math.ceil(profile.fontSize * 0.625);
      const conservativeWidth = Array.from(text).length * glyphWidth;
      assert.ok(
        conservativeWidth <= maxWidth,
        `${language} ${key} needs ${conservativeWidth}px, has ${maxWidth}px`
      );
    }
  }
});

test("Spanish keeps nautical, financial, and political labels concise and unambiguous", () => {
  const expected = new Map([
    ["options.controlScheme.relativeDetail", "ARRIBA: HALAR; IZQ./DER.: GIRAR"],
    ["ship.ledger", "CUENTAS"],
    ["captain.chart", "CARTA NÁUTICA"],
    ["politics.papalAuthorityShort", "PAPAL"],
    ["politics.bans", "VETOS"],
    ["politics.importBan", "PROHÍBE IMPORTACIONES"],
    ["good.arms", "Picas y espadas"],
    ["tutorial.haul", "HALAR"],
    ["hud.tooltip.waterDaysOne", "Queda 1 día de agua potable"],
    ["hud.tooltip.foodDaysOne", "1 día de comida disponible"],
    ["outcome.neverSeenAgain", "DESAPARECIÓ PARA SIEMPRE."]
  ]);
  for (const [key, value] of expected) {
    const replacements = key.includes("DaysOne") ? { days: "1" } : undefined;
    assert.equal(translate(LANGUAGE_SPANISH, key, replacements), value, key);
  }
});
