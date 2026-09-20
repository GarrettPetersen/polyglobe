import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

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

function assertReviewedTranslations(reviewed, context) {
  const languages = SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH);
  for (const { id: language } of languages) {
    const catalog = screenTextTranslationCatalog(language);
    const languageIndex = languages.findIndex(({ id }) => id === language);
    for (const [source, expected] of reviewed) {
      assert.equal(catalog[source], expected[languageIndex], `${context}: ${language}: ${source}`);
    }
  }
}

test("shared action eligibility retains player explanations in the text catalog", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "action-text-contract-"));
  try {
    writeFileSync(path.join(directory, "eligibility.js"), `
      export function eligibility() {
        return { disabledReason: "Make room for a crewmate.", invariant: "Bad crew count." };
      }
    `);
    const catalog = extractScreenTextSourceCatalog(directory);
    assert.ok(catalog.includes("Make room for a crewmate."));
    assert.ok(!catalog.includes("Bad crew count."));
  } finally {
    rmSync(directory, { recursive: true });
  }
});

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

test("routine crew experience gains stay silent", () => {
  assert.equal(screenTextTemplates().includes("A CREWMATE GAINED EXPERIENCE"), false);
  assert.equal(screenTextTemplates().includes("{0} CREWMATES GAINED EXPERIENCE"), false);
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

test("community port offices are localized inside generated speaker names", () => {
  const source = "Te Rongo, island chief of Tarawa Village";
  for (const { id: language } of SUPPORTED_LANGUAGES.filter(({ id }) => id !== LANGUAGE_ENGLISH)) {
    assert.notEqual(localizeText(language, source), source, language);
  }
});

test("political standing is translated as reputation in every screen locale", () => {
  const reviewed = new Map([
    ["{0} Standing {1}/{2}.", [
      "{0} 声望 {1}/{2}。", "Репутация {0}: {1}/{2}.", "Reputación de {0}: {1}/{2}.", "Reputação de {0}: {1}/{2}.", "{0}の評判 {1}/{2}。", "{0} Ansehen {1}/{2}.", "Réputation de {0} : {1}/{2}.", "Reputacja {0}: {1}/{2}.", "{0} 聲望 {1}/{2}。", "{0} 평판 {1}/{2}."
    ]],
    ["Standing adjustment", [
      "声望变化", "Изменение репутации", "Cambio de reputación", "Variação de reputação", "評判の変動", "Ansehensänderung", "Évolution de la réputation", "Zmiana reputacji", "聲望變化", "평판 변화"
    ]]
  ]);
  assertReviewedTranslations(reviewed, "standing");
});

test("nautical watch shifts are not translated as timepieces", () => {
  const reviewed = new Map([
    ["A pinch of the tea would improve this watch beyond recognition.", [
      "一撮茶就能让这班岗轻松不少。", "Щепотка чая сделала бы эту вахту куда приятнее.", "Una pizca de té mejoraría mucho esta guardia.", "Uma pitada de chá tornaria este turno bem melhor.", "お茶をひとつまみ飲めば、この当直もずっと楽になる。", "Eine Prise Tee würde diese Wache deutlich angenehmer machen.", "Une pincée de thé rendrait ce quart bien plus agréable.", "Szczypta herbaty umiliłaby tę wachtę.", "一撮茶就能讓這班值勤輕鬆不少。", "차 한 꼬집이면 이번 당직이 훨씬 나아질 거야."
    ]],
    ["No, sleeping through the watch does not count as standing it.", [
      "不，值勤时睡觉可不算在岗。", "Нет, сон во время вахты не считается несением службы.", "No, dormir durante la guardia no cuenta como hacerla.", "Não, dormir durante o turno não conta como cumprir serviço.", "いや、当直中に眠っていては務めを果たしたことにならない。", "Nein, während der Wache zu schlafen gilt nicht als Wachdienst.", "Non, dormir pendant le quart ne compte pas comme monter la garde.", "Nie, przespanie wachty nie liczy się jako służba.", "不，值勤時睡覺可不算在崗。", "아니, 당직 중에 자는 건 근무한 게 아니야."
    ]]
  ]);
  assertReviewedTranslations(reviewed, "watch duty");
});

test("fishing and scavenging haul labels describe their yields", () => {
  const reviewed = new Map([
    ["Fishing odds x{0} / Max haul {1}", [
      "钓鱼概率 x{0} / 最大渔获 {1}", "Шанс улова x{0} / Макс. улов {1}", "Probabilidad de pesca x{0} / Captura máxima {1}", "Chance de pesca x{0} / Captura máxima {1}", "漁獲確率 x{0} / 最大漁獲量 {1}", "Fangchance x{0} / Höchstfang {1}", "Chance de pêche x{0} / Prise maximale {1}", "Szansa połowu x{0} / Maks. połów {1}", "釣魚機率 x{0} / 最大漁獲 {1}", "어획 확률 x{0} / 최대 어획량 {1}"
    ]],
    ["Scavenging haul +{0}", [
      "搜集所得 +{0}", "Добыча припасов +{0}", "Rendimiento de recolección +{0}", "Rendimento da coleta +{0}", "物資採集量 +{0}", "Bergungsertrag +{0}", "Rendement de récupération +{0}", "Wydajność zbieractwa +{0}", "蒐集所得 +{0}", "채집 수확량 +{0}"
    ]]
  ]);
  assertReviewedTranslations(reviewed, "fishing yield");
});

test("ship stores mean provisions rather than shops", () => {
  const reviewed = new Map([
    ["Stores", ["物资", "Запасы", "Provisiones", "Suprimentos", "物資", "Vorräte", "Réserves", "Zapasy", "物資", "비축품"]],
    ["These stores are received. Still required: {0}.", [
      "物资已收到。仍需：{0}。", "Припасы получены. Ещё требуется: {0}.", "Suministros recibidos. Aún faltan: {0}.", "Suprimentos recebidos. Ainda faltam: {0}.", "物資を受領した。残り：{0}。", "Vorräte eingetroffen. Noch benötigt: {0}.", "Approvisionnements reçus. Il manque encore : {0}.", "Zaopatrzenie odebrane. Nadal potrzeba: {0}.", "物資已收到。仍需：{0}。", "보급품을 받았다. 남은 수량: {0}."
    ]],
    ["A rising whiteout drove the party back before they found anything fit for the stores.", [
      "暴风雪渐浓，队伍还没找到可补充船上储备的东西便被迫折返。", "Налетевшая метель заставила отряд повернуть назад, прежде чем он нашёл что-либо для пополнения запасов.", "La ventisca obligó al grupo a regresar antes de encontrar provisiones para el barco.", "A nevasca obrigou o grupo a voltar antes que encontrasse mantimentos para o navio.", "吹雪が強まり、船の物資にできるものを見つける前に一行は引き返した。", "Ein aufziehender Schneesturm zwang die Gruppe zur Umkehr, bevor sie etwas für die Vorräte fand.", "Un blizzard grandissant força le groupe à rebrousser chemin avant qu'il ne trouve de quoi ravitailler le navire.", "Nadciągająca zawieja zmusiła grupę do odwrotu, nim znalazła zapasy dla statku.", "暴風雪漸濃，隊伍還沒找到可補充船上儲備的東西便被迫折返。", "눈보라가 거세져 배의 비축품으로 쓸 것을 찾기도 전에 일행은 돌아갈 수밖에 없었다."
    ]]
  ]);
  assertReviewedTranslations(reviewed, "ship stores");
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
