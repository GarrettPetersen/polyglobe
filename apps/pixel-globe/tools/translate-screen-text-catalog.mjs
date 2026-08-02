import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SCREEN_TEXT_TEMPLATES } from "../src/screenTextCatalog.js";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = path.join(APP_ROOT, "src/locales/screen");
const BATCH_CHARACTER_LIMIT = 3_200;
const LOCALES = Object.freeze([
  { id: "zh-Hans", serviceCode: "zh-CN", fileName: "zh-Hans.js" },
  { id: "ru", serviceCode: "ru", fileName: "ru.js" },
  { id: "es", serviceCode: "es", fileName: "es.js" },
  { id: "pt-BR", serviceCode: "pt", fileName: "pt-BR.js" },
  { id: "ja", serviceCode: "ja", fileName: "ja.js" },
  { id: "de", serviceCode: "de", fileName: "de.js" },
  { id: "fr", serviceCode: "fr", fileName: "fr.js" },
  { id: "pl", serviceCode: "pl", fileName: "pl.js" },
  { id: "zh-Hant", serviceCode: "zh-TW", fileName: "zh-Hant.js" },
  { id: "ko", serviceCode: "ko", fileName: "ko.js" }
]);

const SHIP_TYPE_TERMS = new Set([
  "Fishing Barque", "Small Cog", "Dhow", "Ocean Dhow", "Sampan", "Large Junk",
  "Heavy Caravel", "Galleon", "Urca", "Carrack", "Great Carrack", "Medium Junk",
  "Xebec", "Caravel", "Square-Rigged Caravel", "Brigantine", "Small Junk", "Felucca",
  "Coastal Pinnace", "Lateen Barque", "Mediterranean Galley", "Galleass", "Turtle Ship",
  "Panokseon", "Umi-bune", "Kobaya", "Sekibune", "Atakebune", "Spanish Nao",
  "Portuguese Carrack", "Viking Longship", "Polynesian Voyaging Canoe", "Dugout Canoe",
  "Nusantaran Outrigger", "Kelulus", "Penjajap", "Lancaran", "Royal Lancaran", "Kancabash"
]);

const DIPLOMACY_TERMS = new Set(["Ally", "Friendly", "Neutral", "Hostile", "War"]);

const REVIEWED_SHIP_TYPE_TERMS = Object.freeze([
  "Fishing Barque", "Small Cog", "Ocean Dhow", "Large Junk", "Heavy Caravel",
  "Great Carrack", "Medium Junk", "Square-Rigged Caravel", "Small Junk",
  "Coastal Pinnace", "Lateen Barque", "Mediterranean Galley", "Turtle Ship",
  "Spanish Nao", "Portuguese Carrack", "Viking Longship", "Polynesian Voyaging Canoe",
  "Dugout Canoe", "Nusantaran Outrigger", "Royal Lancaran"
]);

const REVIEWED_SHIP_TYPE_TRANSLATIONS = Object.freeze({
  "zh-Hans": Object.freeze([
    "渔用帆船", "小型柯克船", "远洋单桅三角帆船", "大型福船", "重型卡拉维尔帆船",
    "大型卡拉克帆船", "中型福船", "横帆卡拉维尔帆船", "小型福船",
    "近海轻帆船", "三角帆驳船", "地中海桨帆船", "龟船",
    "西班牙大帆船", "葡萄牙卡拉克帆船", "维京长船", "波利尼西亚远航独木舟",
    "独木舟", "南洋舷外浮木舟", "皇家兰卡兰"
  ]),
  ru: Object.freeze([
    "Рыболовный барк", "Малый когг", "Океанский дау", "Большая джонка", "Тяжёлая каравелла",
    "Большая каракка", "Средняя джонка", "Каравелла с прямым парусом", "Малая джонка",
    "Прибрежная пинасса", "Латинская барка", "Средиземноморская галера", "Корабль-черепаха",
    "Испанский нао", "Португальская каракка", "Драккар викингов", "Полинезийское мореходное каноэ",
    "Долблёное каноэ", "Нусантаранское каноэ с аутригером", "Королевский ланчаран"
  ]),
  es: Object.freeze([
    "Barca pesquera", "Coca pequeña", "Dhow oceánico", "Junco grande", "Carabela pesada",
    "Gran carraca", "Junco mediano", "Carabela de aparejo cuadrado", "Junco pequeño",
    "Pinaza costera", "Barca de vela latina", "Galera mediterránea", "Barco tortuga",
    "Nao española", "Carraca portuguesa", "Drakkar vikingo", "Canoa de travesía polinesia",
    "Canoa monóxila", "Canoa con balancín nusantarana", "Lancaran real"
  ]),
  "pt-BR": Object.freeze([
    "Barca de pesca", "Coca pequena", "Dhow oceânico", "Junco grande", "Caravela pesada",
    "Grande carraca", "Junco médio", "Caravela de armação redonda", "Junco pequeno",
    "Pinaça costeira", "Barca de vela latina", "Galé mediterrânea", "Navio-tartaruga",
    "Nao espanhola", "Carraca portuguesa", "Dracar viking", "Canoa de viagem polinésia",
    "Canoa monóxila", "Canoa nusantarense com estabilizador", "Lancaran real"
  ]),
  ja: Object.freeze([
    "漁船", "小型コグ船", "外洋ダウ船", "大型ジャンク船", "重カラベル船",
    "大型キャラック船", "中型ジャンク船", "横帆カラベル船", "小型ジャンク船",
    "沿岸ピンネース", "ラティーン帆船", "地中海ガレー船", "亀甲船",
    "スペイン・ナオ船", "ポルトガル・キャラック船", "ヴァイキング長船", "ポリネシア航海カヌー",
    "丸木舟", "ヌサンタラ式アウトリガー船", "王室ランチャラン"
  ]),
  de: Object.freeze([
    "Fischerbarke", "Kleine Kogge", "Hochseedhau", "Große Dschunke", "Schwere Karavelle",
    "Große Karacke", "Mittlere Dschunke", "Rahgetakelte Karavelle", "Kleine Dschunke",
    "Küstenpinasse", "Lateinerbarke", "Mittelmeergaleere", "Schildkrötenschiff",
    "Spanische Nao", "Portugiesische Karacke", "Wikinger-Langschiff", "Polynesisches Reisekanu",
    "Einbaum", "Nusantara-Auslegerboot", "Königliche Lancaran"
  ]),
  fr: Object.freeze([
    "Barque de pêche", "Petite cogue", "Boutre hauturier", "Grande jonque", "Caravelle lourde",
    "Grande caraque", "Jonque moyenne", "Caravelle à gréement carré", "Petite jonque",
    "Pinasse côtière", "Barque à voile latine", "Galère méditerranéenne", "Navire tortue",
    "Nao espagnole", "Caraque portugaise", "Drakkar viking", "Pirogue de voyage polynésienne",
    "Pirogue monoxyle", "Pirogue à balancier nusantarienne", "Lancaran royal"
  ]),
  pl: Object.freeze([
    "Barka rybacka", "Mała koga", "Dau oceaniczne", "Wielka dżonka", "Ciężka karawela",
    "Wielka karaka", "Średnia dżonka", "Karawela rejowa", "Mała dżonka",
    "Pinasa przybrzeżna", "Barka łacińska", "Galera śródziemnomorska", "Okręt żółwi",
    "Hiszpańska nao", "Portugalska karaka", "Wikiński drakkar", "Polinezyjskie kanoe oceaniczne",
    "Wydrążone czółno", "Nusantaryjskie czółno z podporą", "Królewski lancaran"
  ]),
  "zh-Hant": Object.freeze([
    "漁用帆船", "小型柯克船", "遠洋單桅三角帆船", "大型福船", "重型卡拉維爾帆船",
    "大型卡拉克帆船", "中型福船", "橫帆卡拉維爾帆船", "小型福船",
    "近海輕帆船", "三角帆駁船", "地中海槳帆船", "龜船",
    "西班牙大帆船", "葡萄牙卡拉克帆船", "維京長船", "波利尼西亞遠航獨木舟",
    "獨木舟", "南洋舷外浮木舟", "皇家蘭卡蘭"
  ]),
  ko: Object.freeze([
    "어선", "소형 코그선", "대양 다우선", "대형 정크선", "중무장 카라벨선",
    "대형 카락선", "중형 정크선", "횡범 카라벨선", "소형 정크선",
    "연안 피나스선", "라틴 범장 바크선", "지중해 갤리선", "거북선",
    "스페인 나오선", "포르투갈 카락선", "바이킹 롱십", "폴리네시아 원양 카누",
    "통나무배", "누산타라 아웃리거선", "왕실 란차란"
  ])
});

const REVIEWED_OVERRIDES = Object.freeze({
  ...reviewedShipTypeOverrides(),
  "STRAY SHOT - HOLD YOUR FIRE": Object.freeze({
    "zh-Hans": "流弹——停止射击",
    ru: "СЛУЧАЙНЫЙ ВЫСТРЕЛ — ПРЕКРАТИТЬ ОГОНЬ",
    es: "DISPARO PERDIDO — ALTO EL FUEGO",
    "pt-BR": "TIRO PERDIDO — CESSAR FOGO",
    ja: "流れ弾だ——撃ち方やめ",
    de: "FEHLSCHUSS — FEUER EINSTELLEN",
    fr: "TIR PERDU — CESSEZ LE FEU",
    pl: "ZABŁĄKANY STRZAŁ — WSTRZYMAĆ OGIEŃ",
    "zh-Hant": "流彈——停止射擊",
    ko: "빗나간 포탄 — 사격 중지"
  }),
  "STRAY SHOT: {0} STANDING {1}": Object.freeze({
    "zh-Hans": "流弹：{0} 声望 {1}",
    ru: "СЛУЧАЙНЫЙ ВЫСТРЕЛ: {0} РЕПУТАЦИЯ {1}",
    es: "DISPARO PERDIDO: {0} REPUTACIÓN {1}",
    "pt-BR": "TIRO PERDIDO: {0} REPUTAÇÃO {1}",
    ja: "流れ弾：{0} 評判 {1}",
    de: "FEHLSCHUSS: {0} ANSEHEN {1}",
    fr: "TIR PERDU : {0} RÉPUTATION {1}",
    pl: "ZABŁĄKANY STRZAŁ: {0} REPUTACJA {1}",
    "zh-Hant": "流彈：{0} 聲望 {1}",
    ko: "빗나간 포탄: {0} 평판 {1}"
  }),
  "THE LINE HOLDS - PREPARE FOR THE TOW": Object.freeze({
    "zh-Hans": "缆绳撑住了——准备被鲸拖行",
    ru: "ЛИНЬ ДЕРЖИТСЯ — ГОТОВЬТЕСЬ К БУКСИРОВКЕ",
    es: "EL CABO AGUANTA — PREPÁRENSE PARA EL REMOLQUE",
    "pt-BR": "O CABO AGUENTA — PREPAREM-SE PARA O REBOQUE",
    ja: "綱はもった——引きずられるぞ",
    de: "DIE LEINE HÄLT — MACHT EUCH AUF DEN SCHLEPPZUG GEFASST",
    fr: "LA LIGNE TIENT — PRÉPAREZ-VOUS AU REMORQUAGE",
    pl: "LINA TRZYMA — SZYKUJCIE SIĘ NA HOLOWANIE",
    "zh-Hant": "纜繩撐住了——準備被鯨拖行",
    ko: "밧줄이 버틴다 — 끌려갈 준비를 하라"
  }),
  "CARTAZ FINE {0} DB": Object.freeze({
    "zh-Hans": "CARTAZ 罚款 {0} DB",
    ru: "ШТРАФ ЗА КАРТАЗ {0} DB",
    es: "MULTA DE CARTAZ {0} DB",
    "pt-BR": "MULTA DO CARTAZ {0} DB",
    ja: "カルタス罰金 {0} DB",
    de: "CARTAZ-BUSSGELD {0} DB",
    fr: "AMENDE CARTAZ {0} DB",
    pl: "GRZYWNA CARTAZ {0} DB",
    "zh-Hant": "CARTAZ 罰款 {0} DB",
    ko: "카르타즈 벌금 {0} DB"
  }),
  "ODDS x{0} MAX HAUL {1}": Object.freeze({
    de: "CHANCE x{0}  MAX. FANG {1}"
  }),
  "Busy World Performance Benchmark": Object.freeze({
    de: "Leistungstest für eine belebte Welt"
  }),
  "Your berth is still yours. Keep the guns quiet and the purse open.": Object.freeze({
    de: "Eure Koje bleibt Euch. Haltet die Geschütze still und den Geldbeutel offen."
  }),
  "Your ship has no cannon battery to refit.": Object.freeze({
    de: "Euer Schiff hat keine Kanonenbatterie zum Umrüsten."
  }),
  "P/L {0} DB": Object.freeze({
    es: "G/P {0} DB",
    de: "G/V {0} DB",
    pl: "Z/S {0} DB"
  }),
  "PEACE AT {0} +{1} DB": Object.freeze({
    ru: "МИР В {0} +{1} DB"
  }),
  "{0} -{1} CREW": Object.freeze({
    de: "{0} -{1} BESATZUNG"
  }),
  "{0} CAPTURED +{1} DB": Object.freeze({
    de: "{0} EROBERT +{1} DB"
  }),
  "{0}, chef": Object.freeze({
    "pt-BR": "{0}, cozinheiro"
  }),
  "ALLIANCE: {0} / {1}": Object.freeze({
    pl: "SOJUSZ: {0} / {1}"
  }),
  "CASTAWAY": Object.freeze({
    pl: "ROZBITEK"
  }),
  "DEHYDRATION": Object.freeze({
    de: "VERDURSTEN"
  }),
  "Deliver {0} x{1}": Object.freeze({
    pl: "Dostarcz {0} x{1}"
  }),
  "FOOD {0}D": Object.freeze({
    de: "PROVIANT {0}T"
  }),
  "Governor {0}": Object.freeze({
    ja: "総督{0}"
  }),
  "Grand Master {0}": Object.freeze({
    ja: "総長{0}"
  }),
  "Grand Prince {0}": Object.freeze({
    ja: "大公{0}"
  }),
  "HARDTACK": Object.freeze({
    de: "SCHIFFSZWIEBACK"
  }),
  "MANIFEST {0}/{1}": Object.freeze({
    de: "LADUNGSLISTE {0}/{1}",
    pl: "MANIFEST ŁADUNKU {0}/{1}"
  }),
  "PORT: {0}": Object.freeze({
    pl: "PORT: {0}"
  }),
  "REBELLION: {0} / {1}": Object.freeze({
    de: "AUFSTAND: {0} / {1}"
  }),
  "ROUTE": Object.freeze({
    de: "KURS"
  }),
  "SAIL / {0} DEG": Object.freeze({
    pl: "ŻAGIEL / {0} STOPNI"
  }),
  "VASSALAGE: {0} / {1}": Object.freeze({
    ja: "従属関係: {0} / {1}",
    de: "VASALLITÄT: {0} / {1}"
  }),
  "WAR: {0} / {1}": Object.freeze({
    ja: "戦争: {0} / {1}",
    de: "KRIEG: {0} / {1}",
    ko: "전쟁: {0} / {1}"
  }),
  "Dock: {0}": Object.freeze({
    "zh-Hans": "停靠：{0}", ru: "Причалить: {0}", es: "Atracar: {0}",
    "pt-BR": "Atracar: {0}", ja: "{0}に入港", de: "Anlegen: {0}",
    fr: "Accoster : {0}", pl: "Przybij: {0}", "zh-Hant": "停靠：{0}", ko: "{0}에 정박"
  }),
  "Hail: {0}": Object.freeze({
    "zh-Hans": "呼叫：{0}", ru: "Окликнуть: {0}", es: "Llamar: {0}",
    "pt-BR": "Chamar: {0}", ja: "{0}に呼びかける", de: "Anrufen: {0}",
    fr: "Héler : {0}", pl: "Wezwij: {0}", "zh-Hant": "呼叫：{0}", ko: "{0} 호출"
  }),
  "Harpoon {0}": Object.freeze({
    "zh-Hans": "用鱼叉攻击{0}", ru: "Гарпунить: {0}", es: "Arponear: {0}",
    "pt-BR": "Arpoar: {0}", ja: "{0}に銛を打つ", de: "Harpunieren: {0}",
    fr: "Harponner : {0}", pl: "Harpunuj: {0}", "zh-Hant": "用魚叉攻擊{0}", ko: "{0} 작살 공격"
  }),
  "Cut whale loose": Object.freeze({
    "zh-Hans": "割断缆绳", ru: "Обрезать линь", es: "Cortar la línea",
    "pt-BR": "Cortar a linha", ja: "綱を切る", de: "Leine kappen",
    fr: "Couper la ligne", pl: "Odciąć linę", "zh-Hant": "割斷纜繩", ko: "밧줄 끊기"
  }),
  "Land killing blow": Object.freeze({
    "zh-Hans": "给予致命一击", ru: "Нанести последний удар", es: "Dar el golpe final",
    "pt-BR": "Desferir golpe final", ja: "とどめを刺す", de: "Tödlichen Stoß setzen",
    fr: "Porter le coup fatal", pl: "Zadaj ostateczny cios", "zh-Hant": "給予致命一擊", ko: "최후의 일격"
  }),
  "Release whale": Object.freeze({
    "zh-Hans": "放走鲸鱼", ru: "Отпустить кита", es: "Liberar a la ballena",
    "pt-BR": "Soltar a baleia", ja: "クジラを逃がす", de: "Wal freilassen",
    fr: "Relâcher la baleine", pl: "Wypuść wieloryba", "zh-Hant": "放走鯨魚", ko: "고래 놓아주기"
  }),
  "DROP ANCHOR": Object.freeze({
    "zh-Hans": "下锚", ru: "БРОСИТЬ ЯКОРЬ", es: "ECHAR EL ANCLA",
    "pt-BR": "LANÇAR ÂNCORA", ja: "投錨", de: "ANKER WERFEN",
    fr: "JETER L'ANCRE", pl: "RZUĆ KOTWICĘ", "zh-Hant": "下錨", ko: "닻 내리기"
  }),
  "FISH FOR {0}": Object.freeze({
    "zh-Hans": "捕捞{0}", ru: "ЛОВИТЬ: {0}", es: "PESCAR {0}",
    "pt-BR": "PESCAR {0}", ja: "{0}を釣る", de: "AUF {0} FISCHEN",
    fr: "PÊCHER : {0}", pl: "ŁOWIĆ: {0}", "zh-Hant": "捕撈{0}", ko: "{0} 낚기"
  }),
  "HOLD FAST": Object.freeze({
    "zh-Hans": "保持停泊", ru: "СТОЯТЬ НА ЯКОРЕ", es: "MANTENER POSICIÓN",
    "pt-BR": "MANTER POSIÇÃO", ja: "停泊を続ける", de: "FESTMACHEN",
    fr: "RESTER MOUILLÉ", pl: "TRZYMAJ POZYCJĘ", "zh-Hant": "保持停泊", ko: "정박 유지"
  }),
  "RETURN TO PORT": Object.freeze({
    "zh-Hans": "返回港口", ru: "ВЕРНУТЬСЯ В ПОРТ", es: "VOLVER AL PUERTO",
    "pt-BR": "VOLTAR AO PORTO", ja: "港に戻る", de: "ZUM HAFEN ZURÜCK",
    fr: "RETOURNER AU PORT", pl: "WRÓĆ DO PORTU", "zh-Hant": "返回港口", ko: "항구로 돌아가기"
  }),
  "SCAVENGE": Object.freeze({
    "zh-Hans": "搜寻", ru: "ОБЫСКАТЬ БЕРЕГ", es: "REBUSCAR",
    "pt-BR": "VASCULHAR", ja: "探索", de: "SUCHEN",
    fr: "FOUILLER", pl: "PRZESZUKAJ", "zh-Hant": "搜尋", ko: "수색"
  }),
  "WEIGH ANCHOR": Object.freeze({
    "zh-Hans": "起锚", ru: "ПОДНЯТЬ ЯКОРЬ", es: "LEVAR ANCLAS",
    "pt-BR": "SUSPENDER ÂNCORA", ja: "揚錨", de: "ANKER LICHTEN",
    fr: "LEVER L'ANCRE", pl: "PODNIEŚ KOTWICĘ", "zh-Hant": "起錨", ko: "닻 올리기"
  }),
  "Concepcion endures at Penco as a military and administrative center, sustained from Peru on a frontier Spain has not subdued.": Object.freeze({
    pl: "Concepcion trwa w Penco jako ośrodek wojskowy i administracyjny, zaopatrywany z Peru na pograniczu, którego Hiszpania nie podporządkowała."
  })
});

function reviewedShipTypeOverrides() {
  for (const locale of LOCALES) {
    const translations = REVIEWED_SHIP_TYPE_TRANSLATIONS[locale.id];
    if (!translations || translations.length !== REVIEWED_SHIP_TYPE_TERMS.length) {
      throw new Error(`Reviewed ship translations are incomplete for ${locale.id}`);
    }
  }
  return Object.fromEntries(REVIEWED_SHIP_TYPE_TERMS.map((source, index) => [
    source,
    Object.freeze(Object.fromEntries(LOCALES.map(({ id }) => [
      id,
      REVIEWED_SHIP_TYPE_TRANSLATIONS[id][index]
    ])))
  ]));
}

await mkdir(OUTPUT_ROOT, { recursive: true });
for (const locale of LOCALES) {
  const outputPath = path.join(OUTPUT_ROOT, locale.fileName);
  const existing = await readExistingCatalog(outputPath);
  const missing = SCREEN_TEXT_TEMPLATES.filter((source) => (
    typeof existing[source] !== "string" || needsTranslationRefresh(source)
  ));
  process.stdout.write(`${locale.id}: translating ${missing.length} missing templates\n`);
  const translated = missing.length > 0
    ? await translateTemplates(missing, locale)
    : {};
  const catalog = Object.fromEntries(SCREEN_TEXT_TEMPLATES.map((source) => [
    source,
    REVIEWED_OVERRIDES[source]?.[locale.id] || translated[source] || existing[source]
  ]));
  validateCatalog(locale.id, catalog);
  await writeFile(outputPath, renderModule(locale.id, catalog));
}

async function translateTemplates(templates, locale) {
  const output = {};
  const batches = makeBatches(templates);
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const requestText = batch.map((source, entryIndex) => (
      `${marker(entryIndex)}\n${translationSource(source)}`
    )).join("\n") + `\n${marker(batch.length)}`;
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", locale.serviceCode);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", requestText);
    const payload = await fetchTranslationPayload(
      url,
      `${locale.id} translation request`
    );
    const body = payload[0].map((part) => part[0]).join("");
    const entries = splitBatch(body, batch.length);
    for (let entryIndex = 0; entryIndex < batch.length; entryIndex += 1) {
      const source = batch[entryIndex];
      let translation = restoreProtectedText(entries[entryIndex].trim());
      translation = await repairChangedPlaceholders(source, translation, locale);
      translation = extractContextualTranslation(source, translation);
      if (isUppercaseDisplayText(source)) translation = translation.toLocaleUpperCase(locale.id);
      output[source] = translation;
    }
    process.stdout.write(`  ${index + 1}/${batches.length}\r`);
  }
  process.stdout.write("\n");
  return output;
}

async function repairChangedPlaceholders(source, translation, locale) {
  const expected = placeholderSequence(source);
  const actual = placeholderSequence(translation);
  if (expected.join(",") === [...actual].sort((a, b) => a - b).join(",") &&
      expected.join(",") === [...expected].sort((a, b) => a - b).join(",")) {
    return translation;
  }
  if (actual.length === expected.length) {
    let index = 0;
    return translation.replace(/\{\d+\}/g, () => `{${expected[index++]}}`);
  }
  const pieces = source.split(/(\{\d+\})/g);
  const translated = [];
  for (const piece of pieces) {
    if (/^\{\d+\}$/.test(piece) || piece.trim().length === 0) {
      translated.push(piece);
      continue;
    }
    translated.push(await translatePlainText(contextualizeNauticalTerms(piece), locale));
  }
  return translated.join("");
}

async function translatePlainText(text, locale) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", locale.serviceCode);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);
  const payload = await fetchTranslationPayload(
    url,
    `${locale.id} fallback translation`
  );
  return payload[0].map((part) => part[0]).join("");
}

async function fetchTranslationPayload(url, label) {
  const maximumAttempts = 4;
  let lastError = null;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      const error = new Error(`${label} failed: ${response.status}`);
      if (response.status < 500 && response.status !== 429) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < maximumAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`${label} failed after ${maximumAttempts} attempts`, { cause: lastError });
}

function placeholderSequence(value) {
  return [...value.matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1]));
}

function makeBatches(templates) {
  const batches = [];
  let current = [];
  let size = 0;
  for (const template of templates) {
    const protectedText = translationSource(template);
    if (current.length > 0 && size + protectedText.length > BATCH_CHARACTER_LIMIT) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(template);
    size += protectedText.length + 20;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function splitBatch(body, count) {
  const values = [];
  for (let index = 0; index < count; index += 1) {
    const start = body.indexOf(marker(index));
    const end = body.indexOf(marker(index + 1));
    if (start < 0 || end < start) throw new Error(`Translation response lost marker ${index}`);
    values.push(body.slice(start + marker(index).length, end));
  }
  return values;
}

function marker(index) {
  return `<<<PG${String(index).padStart(3, "0")}>>>`;
}

function protectPlaceholders(value) {
  return value.replace(
    /\{(\d+)\}/g,
    '<span class="notranslate">__PG_$1__</span>'
  );
}

function restoreProtectedText(value) {
  return value.replace(
    /<span class="notranslate">__PG_\s*(\d+)\s*__<\/span>/g,
    "{$1}"
  ).replace(
    /<span class="notranslate">[^<]*<\/span>/gi,
    "DB"
  );
}

function translationSource(value) {
  const protectedValue = protectPlaceholders(contextualizeNauticalTerms(value));
  if (SHIP_TYPE_TERMS.has(value)) {
    return `Historical sailing-vessel type: ⟦${protectedValue}⟧`;
  }
  if (DIPLOMACY_TERMS.has(value)) {
    return `Diplomatic relationship: ⟦${protectedValue}⟧`;
  }
  return protectedValue;
}

function extractContextualTranslation(source, translation) {
  if (!SHIP_TYPE_TERMS.has(source) && !DIPLOMACY_TERMS.has(source)) return translation;
  const match = translation.match(/⟦([^\]]+)⟧/u);
  if (!match || !match[1].trim()) {
    throw new Error(`Contextual translation lost its marked value: ${source}`);
  }
  return match[1].trim();
}

function contextualizeNauticalTerms(value) {
  return value
    .replace(/\bdb\b/gi, '<span class="notranslate">DB</span>')
    .replace(/\bfactors\b/gi, "port merchants")
    .replace(/\bfactor\b/gi, "port merchant")
    .replace(/\bDUTY\b/g, "CUSTOMS DUTY")
    .replace(/\bSTOCK\b/g, "AVAILABLE STOCK")
    .replace(/\bABOVE WORLD\b/g, "ABOVE WORLD PRICE")
    .replace(/\bBELOW WORLD\b/g, "BELOW WORLD PRICE")
    .replace(/\bSPACE\b/g, "CARGO SPACE")
    .replace(/\bEACH\b/g, "PER UNIT")
    .replace(/\bHELD\b/g, "UNITS HELD")
    .replace(/P\/L/g, "PROFIT OR LOSS")
    .replace(/\bBuy max\b/gi, "Buy maximum");
}

function needsTranslationRefresh(value) {
  return SHIP_TYPE_TERMS.has(value) || DIPLOMACY_TERMS.has(value) ||
    /\b(?:db|factor|factors|DUTY|STOCK|ABOVE WORLD|BELOW WORLD|SPACE|EACH|HELD|Buy max)\b|P\/L/i.test(value);
}

function isUppercaseDisplayText(value) {
  const letters = value.replace(/[^A-Za-z]+/g, "");
  return letters.length > 1 && letters === letters.toUpperCase();
}

async function readExistingCatalog(outputPath) {
  try {
    await readFile(outputPath, "utf8");
    const cacheBuster = `?updated=${Date.now()}-${Math.random()}`;
    return (await import(pathToFileURL(outputPath).href + cacheBuster)).default;
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function validateCatalog(language, catalog) {
  for (const source of SCREEN_TEXT_TEMPLATES) {
    const translation = catalog[source];
    if (typeof translation !== "string" || translation.trim().length === 0) {
      throw new Error(`${language} has no translation for: ${source}`);
    }
    const sourcePlaceholders = [...source.matchAll(/\{(\d+)\}/g)].map((match) => match[1]).sort();
    const translatedPlaceholders = [...translation.matchAll(/\{(\d+)\}/g)].map((match) => match[1]).sort();
    if (sourcePlaceholders.join(",") !== translatedPlaceholders.join(",")) {
      throw new Error(`${language} changed placeholders for: ${source}`);
    }
  }
}

function renderModule(language, catalog) {
  return `// Generated gameplay text for ${language}. Update with tools/translate-screen-text-catalog.mjs.\n` +
    `export default Object.freeze(${JSON.stringify(catalog, null, 2)});\n`;
}
