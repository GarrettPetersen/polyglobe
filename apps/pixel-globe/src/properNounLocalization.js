import { localizeText, normalizeLanguage } from "./localization.js";
import { localizePlaceNames } from "./placeNameLocalization.js";

const SCRIPTED_LANGUAGES = new Set(["zh-Hans", "zh-Hant", "ja", "ko", "ru"]);
const PLACE_DESCRIPTORS = Object.freeze([
  descriptor("Colony Site", {
    de: (name) => `Koloniestandort ${name}`,
    es: (name) => `Emplazamiento de la colonia de ${name}`,
    fr: (name) => `Site de la colonie de ${name}`,
    "pt-BR": (name) => `Local da colônia de ${name}`,
    pl: (name) => `Miejsce kolonii ${name}`,
    ru: (name) => `Место колонии ${name}`,
    "zh-Hans": (name) => `${name}殖民地遗址`,
    "zh-Hant": (name) => `${name}殖民地遺址`,
    ja: (name) => `${name}植民地予定地`,
    ko: (name) => `${name} 식민지 터`
  }),
  descriptor("Pirate Hideout", {
    de: (name) => `Piratenversteck ${name}`,
    es: (name) => `Guarida pirata de ${name}`,
    fr: (name) => `Repaire pirate de ${name}`,
    "pt-BR": (name) => `Covil pirata de ${name}`,
    pl: (name) => `Piracka kryjówka ${name}`,
    ru: (name) => `Пиратское логово ${name}`,
    "zh-Hans": (name) => `${name}海盗巢穴`,
    "zh-Hant": (name) => `${name}海盜巢穴`,
    ja: (name) => `${name}海賊の隠れ家`,
    ko: (name) => `${name} 해적 소굴`
  }),
  descriptor("Village", {
    de: (name) => `Dorf ${name}`,
    es: (name) => `Aldea de ${name}`,
    fr: (name) => `Village de ${name}`,
    "pt-BR": (name) => `Aldeia de ${name}`,
    pl: (name) => `Wioska ${name}`,
    ru: (name) => `Деревня ${name}`,
    "zh-Hans": (name) => `${name}村`,
    "zh-Hant": (name) => `${name}村`,
    ja: (name) => `${name}村`,
    ko: (name) => `${name} 마을`
  }),
  descriptor("Colony", {
    de: (name) => `Kolonie ${name}`,
    es: (name) => `Colonia de ${name}`,
    fr: (name) => `Colonie de ${name}`,
    "pt-BR": (name) => `Colônia de ${name}`,
    pl: (name) => `Kolonia ${name}`,
    ru: (name) => `Колония ${name}`,
    "zh-Hans": (name) => `${name}殖民地`,
    "zh-Hant": (name) => `${name}殖民地`,
    ja: (name) => `${name}植民地`,
    ko: (name) => `${name} 식민지`
  }),
  descriptor("Ruins", {
    de: (name) => `Ruinen von ${name}`,
    es: (name) => `Ruinas de ${name}`,
    fr: (name) => `Ruines de ${name}`,
    "pt-BR": (name) => `Ruínas de ${name}`,
    pl: (name) => `Ruiny ${name}`,
    ru: (name) => `Руины ${name}`,
    "zh-Hans": (name) => `${name}废墟`,
    "zh-Hant": (name) => `${name}廢墟`,
    ja: (name) => `${name}遺跡`,
    ko: (name) => `${name} 폐허`
  }),
  descriptor("City", {
    de: (name) => `${name}-Stadt`,
    es: (name) => `Ciudad de ${name}`,
    fr: (name) => `Ville de ${name}`,
    "pt-BR": (name) => `Cidade de ${name}`,
    pl: (name) => `Miasto ${name}`,
    ru: (name) => `Город ${name}`,
    "zh-Hans": (name) => `${name}市`,
    "zh-Hant": (name) => `${name}市`,
    ja: (name) => `${name}市`,
    ko: (name) => `${name}시`
  })
]);

const CHINESE_GIVEN_NAMES = Object.freeze({
  Bao: "宝", Cheng: "成", De: "德", Guang: "光", Hong: "宏", Jian: "建",
  Ming: "明", Ping: "平", Sheng: "胜", Wei: "伟", Wen: "文", Yong: "永",
  Chun: "春", Fang: "芳", Hua: "华", Lan: "兰", Lian: "莲", Mei: "梅",
  Ning: "宁", Qiao: "巧", Xia: "霞", Xiu: "秀", Yan: "燕", Ying: "英"
});
const CHINESE_FAMILY_NAMES = Object.freeze({
  Chen: "陈", Huang: "黄", Li: "李", Lin: "林", Liu: "刘", Sun: "孙",
  Wang: "王", Wu: "吴", Xu: "徐", Yang: "杨", Zhang: "张", Zhao: "赵"
});
const JAPANESE_GIVEN_NAMES = Object.freeze({
  Dosan: "道三", Harunobu: "晴信", Hideyoshi: "秀吉", Hisahide: "久秀",
  Ieyasu: "家康", Kenshin: "謙信", Motonari: "元就", Nobunaga: "信長",
  Shingen: "信玄", Takakage: "隆景", Yoshihiro: "義弘", Yukimura: "幸村",
  Chacha: "茶々", Go: "江", Hatsu: "初", Jukeini: "寿桂尼", Kicho: "帰蝶",
  Matsu: "まつ", Nene: "ねね", Oichi: "お市", Otsuya: "おつや", Sen: "千",
  Tama: "玉", Tora: "虎"
});
const JAPANESE_FAMILY_NAMES = Object.freeze({
  Abe: "安倍", Fujiwara: "藤原", Hojo: "北条", Mori: "毛利", Oda: "織田",
  Saito: "斎藤", Shimazu: "島津", Takeda: "武田", Tokugawa: "徳川",
  Uesugi: "上杉", Yamamoto: "山本", Yoshida: "吉田"
});
const KOREAN_GIVEN_NAMES = Object.freeze({
  Dong: "동", Gyeom: "겸", Hwan: "환", Jin: "진", Jun: "준", Min: "민",
  Seong: "성", Sik: "식", Su: "수", Tae: "태", Won: "원", Yeong: "영",
  Eun: "은", Hwa: "화", Hye: "혜", Ji: "지", Mi: "미", Ok: "옥",
  Seon: "선", Suk: "숙", Sun: "선", Yeon: "연", Yun: "윤"
});
const KOREAN_FAMILY_NAMES = Object.freeze({
  An: "안", Choe: "최", Gang: "강", Han: "한", Hong: "홍", Im: "임",
  Jeong: "정", Jo: "조", Kim: "김", Lee: "이", Pak: "박", Yun: "윤"
});

const registry = new Map();
const registryKeysByFirstToken = new Map();
const localizedTextCache = new Map();

export function registerPlaceProperNames(names) {
  if (!Array.isArray(names)) throw new Error("Proper-name place registration requires an array");
  for (const value of names) {
    if (typeof value !== "string" || value.trim() === "") continue;
    const canonical = value.trim();
    registerProperNoun(canonical, placeEntry(canonical));
    const parsed = parsePlaceDescriptor(canonical);
    const base = parsed?.base || canonical;
    if (parsed) registerProperNoun(base, placeEntry(base));
    for (const descriptorEntry of PLACE_DESCRIPTORS) {
      const derived = `${base} ${descriptorEntry.english}`;
      registerProperNoun(derived, placeEntry(derived));
    }
  }
}

export function registerCharacterProperName(character) {
  if (!character || typeof character !== "object") return;
  if (typeof character.name !== "string" || character.name.trim() === "") return;
  const canonical = character.name.trim();
  const next = Object.freeze({
    kind: "character",
    canonical,
    givenName: typeof character.givenName === "string" ? character.givenName : null,
    familyName: typeof character.familyName === "string" ? character.familyName : null,
    nameCulture: typeof character.nameCulture === "string" ? character.nameCulture : null
  });
  const key = canonical.toLocaleLowerCase("en");
  const existing = registry.get(key);
  if (existing?.kind === "character" && existing.nameCulture !== next.nameCulture) {
    registerProperNoun(canonical, Object.freeze({ ...next, nameCulture: null }));
    return;
  }
  registerProperNoun(canonical, next);
}

export function localizeProperNouns(language, text) {
  if (typeof text !== "string") throw new Error(`Proper-noun text must be a string: ${text}`);
  const locale = normalizeLanguage(language);
  if (locale === "en" || text.length === 0) return text;
  const cacheKey = `${locale}\u0000${text}`;
  const cached = localizedTextCache.get(cacheKey);
  if (cached !== undefined) return cached;
  let localized = localizePlaceNames(locale, text);
  const pattern = properNounPatternForText(localized);
  if (pattern) {
    pattern.lastIndex = 0;
    localized = localized.replace(pattern, (match, prefix, canonical) => {
      const entry = registry.get(canonical.toLocaleLowerCase("en"));
      if (!entry) throw new Error(`Proper-name pattern has no registry entry: ${canonical}`);
      return `${prefix}${localizeRegistryEntry(locale, entry)}`;
    });
  }
  localizedTextCache.set(cacheKey, localized);
  return localized;
}

export function localizeCharacterProperName(language, character) {
  if (!character || typeof character !== "object") throw new Error("Localized character name requires a character");
  if (typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Localized character name requires a canonical name");
  }
  return localizeCharacterEntry(normalizeLanguage(language), {
    canonical: character.name.trim(),
    givenName: character.givenName || null,
    familyName: character.familyName || null,
    nameCulture: character.nameCulture || null
  });
}

function registerProperNoun(canonical, entry) {
  const key = canonical.toLocaleLowerCase("en");
  const existing = registry.get(key);
  if (existing && equivalentRegistryEntry(existing, entry)) return;
  registry.set(key, entry);
  const firstToken = firstRegistryToken(canonical);
  if (!firstToken) throw new Error(`Proper name has no searchable token: ${canonical}`);
  let keys = registryKeysByFirstToken.get(firstToken);
  if (!keys) {
    keys = new Set();
    registryKeysByFirstToken.set(firstToken, keys);
  }
  keys.add(key);
  localizedTextCache.clear();
}

function equivalentRegistryEntry(left, right) {
  return left.kind === right.kind &&
    left.canonical === right.canonical &&
    left.givenName === right.givenName &&
    left.familyName === right.familyName &&
    left.nameCulture === right.nameCulture;
}

function properNounPatternForText(text) {
  if (registry.size === 0) return null;
  const candidateKeys = new Set();
  for (const match of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const keys = registryKeysByFirstToken.get(match[0].toLocaleLowerCase("en"));
    if (!keys) continue;
    for (const key of keys) candidateKeys.add(key);
  }
  if (candidateKeys.size === 0) return null;
  const alternatives = [...candidateKeys]
    .map((key) => registry.get(key).canonical)
    .sort((left, right) => right.length - left.length)
    .map(escapeRegularExpression);
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${alternatives.join("|")})(?=$|[^\\p{L}\\p{N}])`, "giu");
}

function firstRegistryToken(canonical) {
  return canonical.match(/[\p{L}\p{N}]+/u)?.[0].toLocaleLowerCase("en") || null;
}

function localizeRegistryEntry(locale, entry) {
  if (entry.kind === "character") return localizeCharacterEntry(locale, entry);
  if (entry.kind === "place") return localizePlaceEntry(locale, entry.canonical);
  throw new Error(`Unknown proper-name kind: ${entry.kind}`);
}

function localizePlaceEntry(locale, canonical) {
  const parsed = parsePlaceDescriptor(canonical);
  if (!parsed) return localizeCanonicalPlace(locale, canonical);
  const base = localizeCanonicalPlace(locale, parsed.base);
  return parsed.descriptor.formats[locale]?.(base) || canonical;
}

function localizeCanonicalPlace(locale, canonical) {
  const phrase = localizeText(locale, canonical);
  if (phrase !== canonical) return phrase;
  const established = localizePlaceNames(locale, canonical);
  if (established !== canonical) return established;
  return localizeScriptName(locale, canonical);
}

function localizeCharacterEntry(locale, character) {
  if (!SCRIPTED_LANGUAGES.has(locale)) return character.canonical;
  if (locale === "zh-Hans" || locale === "zh-Hant") {
    if (character.nameCulture === "chinese" && character.givenName && character.familyName) {
      const family = CHINESE_FAMILY_NAMES[character.familyName];
      const given = CHINESE_GIVEN_NAMES[character.givenName];
      if (family && given) return locale === "zh-Hant" ? toTraditionalChinese(`${family}${given}`) : `${family}${given}`;
    }
    const value = transliterateChinese(character.canonical);
    return locale === "zh-Hant" ? toTraditionalChinese(value) : value;
  }
  if (locale === "ja") {
    if (character.nameCulture === "japanese" && character.givenName && character.familyName) {
      const family = JAPANESE_FAMILY_NAMES[character.familyName];
      const given = JAPANESE_GIVEN_NAMES[character.givenName];
      if (family && given) return `${family} ${given}`;
    }
    return transliterateJapanese(character.canonical);
  }
  if (locale === "ko") {
    if (character.nameCulture === "korean" && character.givenName && character.familyName) {
      const family = KOREAN_FAMILY_NAMES[character.familyName];
      const given = KOREAN_GIVEN_NAMES[character.givenName];
      if (family && given) return `${family}${given}`;
    }
    return transliterateKorean(character.canonical);
  }
  return transliterateRussian(character.canonical);
}

function localizeScriptName(locale, canonical) {
  if (!SCRIPTED_LANGUAGES.has(locale)) return canonical;
  if (locale === "ru") return transliterateRussian(canonical);
  if (locale === "ja") return transliterateJapanese(canonical);
  if (locale === "ko") return transliterateKorean(canonical);
  const value = transliterateChinese(canonical);
  return locale === "zh-Hant" ? toTraditionalChinese(value) : value;
}

function parsePlaceDescriptor(canonical) {
  const lower = canonical.toLocaleLowerCase("en");
  for (const descriptorEntry of PLACE_DESCRIPTORS) {
    const suffix = ` ${descriptorEntry.english.toLocaleLowerCase("en")}`;
    if (!lower.endsWith(suffix) || canonical.length <= suffix.length) continue;
    return {
      base: canonical.slice(0, canonical.length - suffix.length),
      descriptor: descriptorEntry
    };
  }
  return null;
}

function placeEntry(canonical) {
  return Object.freeze({
    kind: "place",
    canonical,
    givenName: null,
    familyName: null,
    nameCulture: null
  });
}

function descriptor(english, formats) {
  return Object.freeze({ english, formats: Object.freeze(formats) });
}

function transliterateRussian(value) {
  return transliterateWords(value, russianWord, " ", "-");
}

function russianWord(word) {
  const normalizedWord = normalizeRomanWord(word);
  const established = ({
    guatemala: "Гватемала",
    joao: "Жуан",
    pereira: "Перейра"
  })[normalizedWord];
  if (established) return established;
  const replacements = [
    ["shch", "щ"], ["sch", "щ"], ["yo", "ё"], ["zh", "ж"], ["kh", "х"],
    ["ts", "ц"], ["ch", "ч"], ["sh", "ш"], ["yu", "ю"], ["ya", "я"],
    ["ye", "е"], ["yi", "и"], ["ph", "ф"], ["th", "т"], ["qu", "кв"],
    ["ck", "к"], ["ng", "нг"]
  ];
  let remaining = normalizedWord;
  let result = "";
  while (remaining.length > 0) {
    const pair = replacements.find(([source]) => remaining.startsWith(source));
    if (pair) {
      result += pair[1];
      remaining = remaining.slice(pair[0].length);
      continue;
    }
    const letter = remaining[0];
    result += ({
      a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х",
      i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п",
      q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс",
      y: "й", z: "з"
    })[letter] || letter;
    remaining = remaining.slice(1);
  }
  return result.length > 0 ? `${result[0].toLocaleUpperCase("ru")}${result.slice(1)}` : result;
}

const JAPANESE_SYLLABLES = syllableTable({
  "": ["ア", "エ", "イ", "オ", "ウ"], b: ["バ", "ベ", "ビ", "ボ", "ブ"],
  c: ["カ", "セ", "シ", "コ", "ク"], d: ["ダ", "デ", "ディ", "ド", "ドゥ"],
  f: ["ファ", "フェ", "フィ", "フォ", "フ"], g: ["ガ", "ゲ", "ギ", "ゴ", "グ"],
  h: ["ハ", "ヘ", "ヒ", "ホ", "フ"], j: ["ジャ", "ジェ", "ジ", "ジョ", "ジュ"],
  k: ["カ", "ケ", "キ", "コ", "ク"], l: ["ラ", "レ", "リ", "ロ", "ル"],
  m: ["マ", "メ", "ミ", "モ", "ム"], n: ["ナ", "ネ", "ニ", "ノ", "ヌ"],
  p: ["パ", "ペ", "ピ", "ポ", "プ"], q: ["カ", "ケ", "キ", "コ", "ク"],
  r: ["ラ", "レ", "リ", "ロ", "ル"], s: ["サ", "セ", "シ", "ソ", "ス"],
  t: ["タ", "テ", "ティ", "ト", "トゥ"], v: ["ヴァ", "ヴェ", "ヴィ", "ヴォ", "ヴ"],
  w: ["ワ", "ウェ", "ウィ", "ウォ", "ウ"], x: ["ザ", "ゼ", "ジ", "ゾ", "ズ"],
  y: ["ヤ", "イェ", "イ", "ヨ", "ユ"], z: ["ザ", "ゼ", "ジ", "ゾ", "ズ"],
  ch: ["チャ", "チェ", "チ", "チョ", "チュ"], sh: ["シャ", "シェ", "シ", "ショ", "シュ"],
  th: ["サ", "セ", "シ", "ソ", "ス"], ph: ["ファ", "フェ", "フィ", "フォ", "フ"]
});
const JAPANESE_FINALS = Object.freeze({ n: "ン", r: "ル", l: "ル", s: "ス", t: "ト", d: "ド", k: "ク", g: "グ", m: "ム", p: "プ", b: "ブ", f: "フ", v: "ヴ", x: "クス" });

function transliterateJapanese(value) {
  return transliterateWords(value, (word) => syllabicWord(word, JAPANESE_SYLLABLES, JAPANESE_FINALS), "・");
}

const KOREAN_SYLLABLES = syllableTable({
  "": ["아", "에", "이", "오", "우"], b: ["바", "베", "비", "보", "부"],
  c: ["카", "세", "시", "코", "쿠"], d: ["다", "데", "디", "도", "두"],
  f: ["파", "페", "피", "포", "푸"], g: ["가", "게", "기", "고", "구"],
  h: ["하", "헤", "히", "호", "후"], j: ["자", "제", "지", "조", "주"],
  k: ["카", "케", "키", "코", "쿠"], l: ["라", "레", "리", "로", "루"],
  m: ["마", "메", "미", "모", "무"], n: ["나", "네", "니", "노", "누"],
  p: ["파", "페", "피", "포", "푸"], q: ["카", "케", "키", "코", "쿠"],
  r: ["라", "레", "리", "로", "루"], s: ["사", "세", "시", "소", "수"],
  t: ["타", "테", "티", "토", "투"], v: ["바", "베", "비", "보", "부"],
  w: ["와", "웨", "위", "워", "우"], x: ["자", "제", "지", "조", "주"],
  y: ["야", "예", "이", "요", "유"], z: ["자", "제", "지", "조", "주"],
  ch: ["차", "체", "치", "초", "추"], sh: ["샤", "셰", "시", "쇼", "슈"],
  th: ["사", "세", "시", "소", "수"], ph: ["파", "페", "피", "포", "푸"]
});
const KOREAN_FINALS = Object.freeze({ r: "르", l: "르", s: "스", t: "트", d: "드", k: "크", g: "그", m: "므", n: "느", p: "프", b: "브", f: "프", v: "브", x: "크스" });
const KOREAN_CODA_INDEX = Object.freeze({ g: 1, n: 4, d: 7, r: 8, l: 8, m: 16, b: 17, s: 19, ng: 21, k: 24, t: 25, p: 26, h: 27 });

function transliterateKorean(value) {
  return transliterateWords(value, koreanWord, " ", "-");
}

function koreanWord(word) {
  let remaining = normalizeRomanWord(word)
    .replaceAll("tion", "shon")
    .replaceAll("qu", "kw")
    .replaceAll("ck", "k");
  let result = "";
  while (remaining.length > 0) {
    let consumed = false;
    for (const length of [3, 2, 1]) {
      const chunk = remaining.slice(0, length);
      const localized = KOREAN_SYLLABLES[chunk];
      if (!localized) continue;
      result += localized;
      remaining = remaining.slice(length);
      consumed = true;
      break;
    }
    if (consumed) continue;
    const coda = remaining.startsWith("ng") ? "ng" : remaining[0];
    const composed = appendKoreanCoda(result, coda);
    if (composed !== null) {
      result = composed;
      remaining = remaining.slice(coda.length);
      continue;
    }
    result += KOREAN_FINALS[remaining[0]] || remaining[0];
    remaining = remaining.slice(1);
  }
  return result;
}

function appendKoreanCoda(value, romanCoda) {
  const codaIndex = KOREAN_CODA_INDEX[romanCoda];
  if (!codaIndex || value.length === 0) return null;
  const last = value.codePointAt(value.length - 1);
  const syllableOffset = last - 0xac00;
  if (syllableOffset < 0 || syllableOffset >= 11172 || syllableOffset % 28 !== 0) return null;
  return `${value.slice(0, -1)}${String.fromCodePoint(last + codaIndex)}`;
}

const CHINESE_SYLLABLES = syllableTable({
  "": ["阿", "埃", "伊", "奥", "乌"], b: ["巴", "贝", "比", "博", "布"],
  c: ["卡", "塞", "西", "科", "库"], d: ["达", "德", "迪", "多", "杜"],
  f: ["法", "费", "菲", "福", "富"], g: ["加", "格", "吉", "戈", "古"],
  h: ["哈", "赫", "希", "霍", "胡"], j: ["贾", "杰", "吉", "乔", "朱"],
  k: ["卡", "凯", "基", "科", "库"], l: ["拉", "莱", "利", "洛", "卢"],
  m: ["马", "梅", "米", "莫", "穆"], n: ["纳", "内", "尼", "诺", "努"],
  p: ["帕", "佩", "皮", "波", "普"], q: ["卡", "凯", "基", "科", "库"],
  r: ["拉", "雷", "里", "罗", "鲁"], s: ["萨", "塞", "西", "索", "苏"],
  t: ["塔", "泰", "蒂", "托", "图"], v: ["瓦", "维", "维", "沃", "武"],
  w: ["瓦", "韦", "威", "沃", "乌"], x: ["克萨", "克塞", "克西", "克索", "克苏"],
  y: ["亚", "耶", "伊", "约", "尤"], z: ["扎", "泽", "齐", "佐", "祖"],
  ch: ["查", "切", "奇", "乔", "丘"], sh: ["沙", "谢", "希", "绍", "舒"],
  th: ["萨", "塞", "西", "索", "苏"], ph: ["法", "费", "菲", "福", "富"]
});
const CHINESE_FINALS = Object.freeze({ n: "恩", r: "尔", l: "尔", s: "斯", t: "特", d: "德", k: "克", g: "格", m: "姆", p: "普", b: "布", f: "夫", v: "夫", x: "克斯" });

function transliterateChinese(value) {
  return transliterateWords(value, (word) => syllabicWord(word, CHINESE_SYLLABLES, CHINESE_FINALS), "·");
}

function syllableTable(rows) {
  const table = {};
  const vowels = ["a", "e", "i", "o", "u"];
  for (const [onset, values] of Object.entries(rows)) {
    vowels.forEach((vowel, index) => { table[`${onset}${vowel}`] = values[index]; });
  }
  return Object.freeze(table);
}

function syllabicWord(word, syllables, finals) {
  let remaining = normalizeRomanWord(word)
    .replaceAll("tion", "shon")
    .replaceAll("qu", "kw")
    .replaceAll("ck", "k");
  let result = "";
  while (remaining.length > 0) {
    let consumed = false;
    for (const length of [3, 2, 1]) {
      const chunk = remaining.slice(0, length);
      const localized = syllables[chunk];
      if (!localized) continue;
      result += localized;
      remaining = remaining.slice(length);
      consumed = true;
      break;
    }
    if (consumed) continue;
    const final = finals[remaining[0]];
    result += final || remaining[0];
    remaining = remaining.slice(1);
  }
  return result;
}

function transliterateWords(value, localizeWord, separator, punctuationSeparator = "・") {
  return String(value)
    .trim()
    .split(/([\s'-]+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return separator;
      if (part === "-" || part === "'") return punctuationSeparator;
      return localizeWord(part);
    })
    .join("")
    .replace(new RegExp(`${escapeRegularExpression(separator)}+`, "g"), separator)
    .replace(new RegExp(`^${escapeRegularExpression(separator)}|${escapeRegularExpression(separator)}$`, "g"), "");
}

function normalizeRomanWord(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z]/g, "");
}

function toTraditionalChinese(value) {
  const replacements = {
    宝: "寶", 胜: "勝", 伟: "偉", 华: "華", 兰: "蘭", 莲: "蓮", 宁: "寧",
    陈: "陳", 黄: "黃", 刘: "劉", 孙: "孫", 吴: "吳", 杨: "楊", 张: "張",
    赵: "趙", 尔: "爾", 贝: "貝", 亚: "亞", 维: "維", 乌: "烏", 罗: "羅",
    废: "廢", 遗: "遺", 乔: "喬", 约: "約", 韦: "韋", 库: "庫"
  };
  return Array.from(value, (character) => replacements[character] || character).join("");
}

function escapeRegularExpression(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
