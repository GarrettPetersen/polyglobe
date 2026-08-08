import { normalizeLanguage } from "./localization.js";

const PLACE_NAMES = Object.freeze([
  place(["Wroclaw", "Wrocław"], names("弗罗茨瓦夫", "弗羅茨瓦夫", "ヴロツワフ", "브로츠와프", "Вроцлав", {
    es: "Breslavia", "pt-BR": "Breslávia", de: "Breslau"
  })),
  place(["Hafnarfjordur", "Hafnarfjörður"], names("哈布纳菲厄泽", "哈布納菲厄澤", "ハフナルフィヨルズゥル", "하프나르피외르뒤르", "Хабнарфьордюр")),
  place(["Lisbon"], names("里斯本", "里斯本", "リスボン", "리스본", "Лиссабон", {
    es: "Lisboa", "pt-BR": "Lisboa", de: "Lissabon", fr: "Lisbonne", pl: "Lizbona"
  })),
  place(["Porto"], names("波尔图", "波爾圖", "ポルト", "포르투", "Порту", { es: "Oporto" })),
  place(["London"], names("伦敦", "倫敦", "ロンドン", "런던", "Лондон", {
    es: "Londres", "pt-BR": "Londres", fr: "Londres", pl: "Londyn"
  })),
  place(["Paris"], names("巴黎", "巴黎", "パリ", "파리", "Париж", { pl: "Paryż" })),
  place(["Seville"], names("塞维利亚", "塞維亞", "セビリア", "세비야", "Севилья", {
    es: "Sevilla", "pt-BR": "Sevilha", de: "Sevilla", fr: "Séville", pl: "Sewilla"
  })),
  place(["Cadiz", "Cádiz"], names("加的斯", "加的斯", "カディス", "카디스", "Кадис", {
    es: "Cádiz", "pt-BR": "Cádis", fr: "Cadix", pl: "Kadyks"
  })),
  place(["Venice"], names("威尼斯", "威尼斯", "ヴェネツィア", "베네치아", "Венеция", {
    es: "Venecia", "pt-BR": "Veneza", de: "Venedig", fr: "Venise", pl: "Wenecja"
  })),
  place(["Florence"], names("佛罗伦萨", "佛羅倫斯", "フィレンツェ", "피렌체", "Флоренция", {
    es: "Florencia", "pt-BR": "Florença", de: "Florenz", pl: "Florencja"
  })),
  place(["Rome"], names("罗马", "羅馬", "ローマ", "로마", "Рим", {
    es: "Roma", "pt-BR": "Roma", de: "Rom", pl: "Rzym"
  })),
  place(["Istanbul"], names("伊斯坦布尔", "伊斯坦堡", "イスタンブール", "이스탄불", "Стамбул", {
    "pt-BR": "Istambul", pl: "Stambuł"
  })),
  place(["Cairo"], names("开罗", "開羅", "カイロ", "카이로", "Каир", {
    es: "El Cairo", de: "Kairo", fr: "Le Caire", pl: "Kair"
  })),
  place(["Alexandria"], names("亚历山大", "亞歷山卓", "アレクサンドリア", "알렉산드리아", "Александрия", {
    es: "Alejandría", fr: "Alexandrie", pl: "Aleksandria"
  })),
  place(["Jerusalem"], names("耶路撒冷", "耶路撒冷", "エルサレム", "예루살렘", "Иерусалим", {
    es: "Jerusalén", "pt-BR": "Jerusalém", fr: "Jérusalem", pl: "Jerozolima"
  })),
  place(["Moscow"], names("莫斯科", "莫斯科", "モスクワ", "모스크바", "Москва", {
    es: "Moscú", "pt-BR": "Moscou", de: "Moskau", fr: "Moscou", pl: "Moskwa"
  })),
  place(["Beijing"], names("北京", "北京", "北京", "베이징", "Пекин", {
    es: "Pekín", "pt-BR": "Pequim", de: "Peking", fr: "Pékin", pl: "Pekin"
  })),
  place(["Nanjing"], names("南京", "南京", "南京", "난징", "Нанкин", {
    es: "Nankín", "pt-BR": "Nanquim", de: "Nanking", fr: "Nankin", pl: "Nankin"
  })),
  place(["Guangzhou"], names("广州", "廣州", "広州", "광저우", "Гуанчжоу", {
    es: "Cantón", "pt-BR": "Cantão", de: "Kanton", fr: "Canton", pl: "Kanton"
  })),
  place(["Seoul"], names("首尔", "首爾", "ソウル", "서울", "Сеул", {
    es: "Seúl", "pt-BR": "Seul", fr: "Séoul", pl: "Seul"
  })),
  place(["Kyoto"], names("京都", "京都", "京都", "교토", "Киото", {
    es: "Kioto", "pt-BR": "Quioto", pl: "Kioto"
  })),
  place(["Edo"], names("江户", "江戶", "江戸", "에도", "Эдо")),
  place(["Hakata", "Fukuoka"], names("博多", "博多", "博多", "하카타", "Хаката")),
  place(["Nagasaki"], names("长崎", "長崎", "長崎", "나가사키", "Нагасаки")),
  place(["Malacca"], names("马六甲", "馬六甲", "マラッカ", "말라카", "Малакка", {
    es: "Malaca", "pt-BR": "Malaca", de: "Malakka", pl: "Malakka"
  })),
  place(["Goa"], names("果阿", "果阿", "ゴア", "고아", "Гоа")),
  place(["Calicut"], names("卡利卡特", "卡利卡特", "カリカット", "캘리컷", "Каликут", {
    "pt-BR": "Calecute", de: "Kalikut"
  })),
  place(["Colombo"], names("科伦坡", "科倫坡", "コロンボ", "콜롬보", "Коломбо")),
  place(["Ternate"], names("特尔纳特", "特爾納特", "テルナテ", "테르나테", "Тернате")),
  place(["Tenochtitlan"], names("特诺奇蒂特兰", "特諾奇蒂特蘭", "テノチティトラン", "테노치티틀란", "Теночтитлан")),
  place(["Havana"], names("哈瓦那", "哈瓦那", "ハバナ", "아바나", "Гавана", {
    es: "La Habana", de: "Havanna", fr: "La Havane", pl: "Hawana"
  }))
]);

const ALIAS_ENTRIES = Object.freeze(PLACE_NAMES
  .flatMap((entry) => entry.aliases.map((alias) => Object.freeze({
    alias,
    key: alias.toLocaleLowerCase("en"),
    translations: entry.translations
  })))
  .sort((left, right) => right.alias.length - left.alias.length));
const ALIAS_LOOKUP = new Map(ALIAS_ENTRIES.map((entry) => [entry.key, entry]));
const PLACE_NAME_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9])(${ALIAS_ENTRIES.map((entry) => escapeRegularExpression(entry.alias)).join("|")})(?=$|[^A-Za-z0-9])`,
  "gi"
);

export function localizePlaceName(language, name) {
  if (typeof name !== "string" || name.length === 0) throw new Error("Place name must be a non-empty string");
  const locale = normalizeLanguage(language);
  const entry = ALIAS_LOOKUP.get(name.toLocaleLowerCase("en"));
  return entry?.translations[locale] || name;
}

export function localizePlaceNames(language, text) {
  if (typeof text !== "string") throw new Error(`Place-name text must be a string: ${text}`);
  const locale = normalizeLanguage(language);
  if (locale === "en" || text.length === 0) return text;
  PLACE_NAME_PATTERN.lastIndex = 0;
  return text.replace(PLACE_NAME_PATTERN, (match, prefix, alias) => {
    const entry = ALIAS_LOOKUP.get(alias.toLocaleLowerCase("en"));
    if (!entry) throw new Error(`Localized place-name pattern has no entry: ${alias}`);
    return `${prefix}${entry.translations[locale] || alias}`;
  });
}

function place(aliases, translations) {
  if (!Array.isArray(aliases) || aliases.length === 0 || aliases.some((alias) => !alias)) {
    throw new Error("Localized place requires at least one alias");
  }
  return Object.freeze({ aliases: Object.freeze(aliases), translations: Object.freeze(translations) });
}

function names(zhHans, zhHant, ja, ko, ru, others = {}) {
  return {
    "zh-Hans": zhHans,
    "zh-Hant": zhHant,
    ja,
    ko,
    ru,
    ...others
  };
}

function escapeRegularExpression(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
