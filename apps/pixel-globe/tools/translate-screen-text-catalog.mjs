import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SCREEN_TEXT_TEMPLATES } from "../src/screenTextCatalog.js";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = path.join(APP_ROOT, "src/locales/screen");
const BATCH_CHARACTER_LIMIT = 3_200;
const PRUNE_ONLY = process.argv.includes("--prune-only");
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
  "Panokseon", "Hyeopseon", "Umi-bune", "Kobaya", "Sekibune", "Atakebune", "Spanish Nao",
  "Portuguese Carrack", "Viking Longship", "Polynesian Voyaging Canoe", "Dugout Canoe",
  "Nusantaran Outrigger", "Kelulus", "Penjajap", "Lancaran", "Royal Lancaran", "Kancabash",
  "Holk", "Javanese Jong"
]);

const DIPLOMACY_TERMS = new Set(["Ally", "Friendly", "Neutral", "Hostile", "War"]);

const REVIEWED_SHIP_TYPE_TERMS = Object.freeze([
  "Fishing Barque", "Small Cog", "Ocean Dhow", "Large Junk", "Heavy Caravel",
  "Great Carrack", "Medium Junk", "Square-Rigged Caravel", "Small Junk",
  "Coastal Pinnace", "Lateen Barque", "Mediterranean Galley", "Turtle Ship",
  "Spanish Nao", "Portuguese Carrack", "Viking Longship", "Polynesian Voyaging Canoe",
  "Dugout Canoe", "Nusantaran Outrigger", "Royal Lancaran", "Holk", "Javanese Jong",
  "Hyeopseon"
]);

const REVIEWED_SHIP_TYPE_TRANSLATIONS = Object.freeze({
  "zh-Hans": Object.freeze([
    "渔用帆船", "小型柯克船", "远洋单桅三角帆船", "大型福船", "重型卡拉维尔帆船",
    "大型卡拉克帆船", "中型福船", "横帆卡拉维尔帆船", "小型福船",
    "近海轻帆船", "三角帆驳船", "地中海桨帆船", "龟船",
    "西班牙大帆船", "葡萄牙卡拉克帆船", "维京长船", "波利尼西亚远航独木舟",
    "独木舟", "南洋舷外浮木舟", "皇家兰卡兰", "霍尔克船", "爪哇海船", "朝鲜挟船"
  ]),
  ru: Object.freeze([
    "Рыболовный барк", "Малый когг", "Океанский дау", "Большая джонка", "Тяжёлая каравелла",
    "Большая каракка", "Средняя джонка", "Каравелла с прямым парусом", "Малая джонка",
    "Прибрежная пинасса", "Латинская барка", "Средиземноморская галера", "Корабль-черепаха",
    "Испанский нао", "Португальская каракка", "Драккар викингов", "Полинезийское мореходное каноэ",
    "Долблёное каноэ", "Нусантаранское каноэ с аутригером", "Королевский ланчаран",
    "Корабль-хольк", "Яванский джонг", "Корейский хёпсон"
  ]),
  es: Object.freeze([
    "Barca pesquera", "Coca pequeña", "Dhow oceánico", "Junco grande", "Carabela pesada",
    "Gran carraca", "Junco mediano", "Carabela de aparejo cuadrado", "Junco pequeño",
    "Pinaza costera", "Barca de vela latina", "Galera mediterránea", "Barco tortuga",
    "Nao española", "Carraca portuguesa", "Drakkar vikingo", "Canoa de travesía polinesia",
    "Canoa monóxila", "Canoa con balancín nusantarana", "Lancaran real", "Holca", "Junco javanés",
    "Hyeopseon coreano"
  ]),
  "pt-BR": Object.freeze([
    "Barca de pesca", "Coca pequena", "Dhow oceânico", "Junco grande", "Caravela pesada",
    "Grande carraca", "Junco médio", "Caravela de armação redonda", "Junco pequeno",
    "Pinaça costeira", "Barca de vela latina", "Galé mediterrânea", "Navio-tartaruga",
    "Nao espanhola", "Carraca portuguesa", "Dracar viking", "Canoa de viagem polinésia",
    "Canoa monóxila", "Canoa nusantarense com estabilizador", "Lancaran real", "Holca", "Jong javanês",
    "Hyeopseon coreano"
  ]),
  ja: Object.freeze([
    "漁船", "小型コグ船", "外洋ダウ船", "大型ジャンク船", "重カラベル船",
    "大型キャラック船", "中型ジャンク船", "横帆カラベル船", "小型ジャンク船",
    "沿岸ピンネース", "ラティーン帆船", "地中海ガレー船", "亀甲船",
    "スペイン・ナオ船", "ポルトガル・キャラック船", "ヴァイキング長船", "ポリネシア航海カヌー",
    "丸木舟", "ヌサンタラ式アウトリガー船", "王室ランチャラン", "ホルク船", "ジャワ式ジョン船",
    "朝鮮挟船"
  ]),
  de: Object.freeze([
    "Fischerbarke", "Kleine Kogge", "Hochseedhau", "Große Dschunke", "Schwere Karavelle",
    "Große Karacke", "Mittlere Dschunke", "Rahgetakelte Karavelle", "Kleine Dschunke",
    "Küstenpinasse", "Lateinerbarke", "Mittelmeergaleere", "Schildkrötenschiff",
    "Spanische Nao", "Portugiesische Karacke", "Wikinger-Langschiff", "Polynesisches Reisekanu",
    "Einbaum", "Nusantara-Auslegerboot", "Königliche Lancaran", "Holk-Schiff", "Javanischer Jong",
    "Koreanische Hyeopseon"
  ]),
  fr: Object.freeze([
    "Barque de pêche", "Petite cogue", "Boutre hauturier", "Grande jonque", "Caravelle lourde",
    "Grande caraque", "Jonque moyenne", "Caravelle à gréement carré", "Petite jonque",
    "Pinasse côtière", "Barque à voile latine", "Galère méditerranéenne", "Navire tortue",
    "Nao espagnole", "Caraque portugaise", "Drakkar viking", "Pirogue de voyage polynésienne",
    "Pirogue monoxyle", "Pirogue à balancier nusantarienne", "Lancaran royal", "Hourque", "Jong javanais",
    "Hyeopseon coréen"
  ]),
  pl: Object.freeze([
    "Barka rybacka", "Mała koga", "Dau oceaniczne", "Wielka dżonka", "Ciężka karawela",
    "Wielka karaka", "Średnia dżonka", "Karawela rejowa", "Mała dżonka",
    "Pinasa przybrzeżna", "Barka łacińska", "Galera śródziemnomorska", "Okręt żółwi",
    "Hiszpańska nao", "Portugalska karaka", "Wikiński drakkar", "Polinezyjskie kanoe oceaniczne",
    "Wydrążone czółno", "Nusantaryjskie czółno z podporą", "Królewski lancaran",
    "Statek holk", "Jawajski dżong", "Koreański hyeopseon"
  ]),
  "zh-Hant": Object.freeze([
    "漁用帆船", "小型柯克船", "遠洋單桅三角帆船", "大型福船", "重型卡拉維爾帆船",
    "大型卡拉克帆船", "中型福船", "橫帆卡拉維爾帆船", "小型福船",
    "近海輕帆船", "三角帆駁船", "地中海槳帆船", "龜船",
    "西班牙大帆船", "葡萄牙卡拉克帆船", "維京長船", "波利尼西亞遠航獨木舟",
    "獨木舟", "南洋舷外浮木舟", "皇家蘭卡蘭", "霍爾克船", "爪哇海船", "朝鮮挾船"
  ]),
  ko: Object.freeze([
    "어선", "소형 코그선", "대양 다우선", "대형 정크선", "중무장 카라벨선",
    "대형 카락선", "중형 정크선", "횡범 카라벨선", "소형 정크선",
    "연안 피나스선", "라틴 범장 바크선", "지중해 갤리선", "거북선",
    "스페인 나오선", "포르투갈 카락선", "바이킹 롱십", "폴리네시아 원양 카누",
    "통나무배", "누산타라 아웃리거선", "왕실 란차란", "홀크선", "자바 종선", "협선"
  ])
});

const REVIEWED_OVERRIDES = Object.freeze({
  "Taking this vessel as a prize is lawful.": Object.freeze({
    "zh-Hans": "将这艘船作为战利船扣押是合法的。",
    ru: "Взять это судно в качестве приза законно.",
    es: "Tomar este buque como presa es legal.",
    "pt-BR": "Tomar esta embarcação como presa é legal.",
    ja: "この船を拿捕して戦利船とするのは合法です。",
    de: "Dieses Schiff als Prise zu nehmen ist rechtmäßig.",
    fr: "La prise de ce navire est légale.",
    pl: "Zajęcie tego statku jako pryzu jest zgodne z prawem.",
    "zh-Hant": "將這艘船作為戰利船扣押是合法的。",
    ko: "이 배를 나포선으로 취하는 것은 합법입니다."
  }),
  "Taking this vessel as a prize would be piracy.": Object.freeze({
    "zh-Hans": "扣押这艘船作为战利船将构成海盗行为。",
    ru: "Взять это судно в качестве приза было бы пиратством.",
    es: "Tomar este buque como presa sería piratería.",
    "pt-BR": "Tomar esta embarcação como presa seria pirataria.",
    ja: "この船を戦利船として拿捕すれば海賊行為になります。",
    de: "Dieses Schiff als Prise zu nehmen wäre Piraterie.",
    fr: "La prise de ce navire constituerait un acte de piraterie.",
    pl: "Zajęcie tego statku jako pryzu byłoby piractwem.",
    "zh-Hant": "扣押這艘船作為戰利船將構成海盜行為。",
    ko: "이 배를 나포선으로 취하면 해적 행위가 됩니다."
  }),
  "This vessel attacked you. Taking it as a prize is lawful.": Object.freeze({
    "zh-Hans": "这艘船先向你发动攻击。将其作为战利船扣押是合法的。",
    ru: "Это судно атаковало вас. Взять его в качестве приза законно.",
    es: "Este buque te atacó. Tomarlo como presa es legal.",
    "pt-BR": "Esta embarcação atacou você. Tomá-la como presa é legal.",
    ja: "この船が先に攻撃しました。戦利船として拿捕するのは合法です。",
    de: "Dieses Schiff hat Euch angegriffen. Es als Prise zu nehmen ist rechtmäßig.",
    fr: "Ce navire vous a attaqué. Sa prise est légale.",
    pl: "Ten statek was zaatakował. Zajęcie go jako pryzu jest zgodne z prawem.",
    "zh-Hant": "這艘船先向你發動攻擊。將其作為戰利船扣押是合法的。",
    ko: "이 배가 먼저 공격했습니다. 나포선으로 취하는 것은 합법입니다."
  }),
  "Your {0} letter of marque makes this a lawful prize.": Object.freeze({
    "zh-Hans": "你的{0}私掠许可证使这艘船成为合法战利船。",
    ru: "Каперская грамота ({0}) делает это судно законным призом.",
    es: "Tu patente de corso {0} hace de este buque una presa legítima.",
    "pt-BR": "Sua carta de corso {0} torna esta embarcação uma presa legítima.",
    ja: "{0}の私掠免許状により、この船は合法的な戦利船となります。",
    de: "Der Kaperbrief Eures Auftraggebers ({0}) macht dieses Schiff zu einer rechtmäßigen Prise.",
    fr: "Votre lettre de marque {0} fait de ce navire une prise légitime.",
    pl: "Wasz list kaperski ({0}) czyni ten statek legalnym pryzem.",
    "zh-Hant": "你的{0}私掠許可證使這艘船成為合法戰利船。",
    ko: "{0} 사략 허가장에 따라 이 배는 합법적인 나포선입니다."
  }),
  "The hosts paid {0} db.": Object.freeze({
    "zh-Hans": "主办方支付了 {0} DB。", ru: "Хозяева заплатили {0} DB.",
    es: "Los anfitriones pagaron {0} DB.", "pt-BR": "Os anfitriões pagaram {0} DB.",
    ja: "主催者から {0} DB が支払われた。", de: "Die Gastgeber zahlten {0} DB.",
    fr: "Les hôtes ont payé {0} DB.", pl: "Gospodarze zapłacili {0} DB.",
    "zh-Hant": "主辦方支付了 {0} DB。", ko: "주최 측에서 {0} DB를 지급했다."
  }),
  "CAPTIVE BOUND FOR {0}": Object.freeze({
    "zh-Hans": "押送俘虏前往 {0}", ru: "ПЛЕННИК СЛЕДУЕТ В {0}", es: "CAUTIVO RUMBO A {0}",
    "pt-BR": "CATIVO A CAMINHO DE {0}", ja: "捕虜の護送先: {0}", de: "GEFANGENER AUF DEM WEG NACH {0}",
    fr: "PRISONNIER À LIVRER À {0}", pl: "JENIEC W DRODZE DO {0}", "zh-Hant": "押送俘虜前往 {0}",
    ko: "포로 호송지: {0}"
  }),
  "CAPTIVE DELIVERED +{0} DB": Object.freeze({
    "zh-Hans": "俘虏已移交 +{0} DB", ru: "ПЛЕННИК ПЕРЕДАН +{0} DB", es: "CAUTIVO ENTREGADO +{0} DB",
    "pt-BR": "CATIVO ENTREGUE +{0} DB", ja: "捕虜を引き渡した +{0} DB", de: "GEFANGENER ÜBERGEBEN +{0} DB",
    fr: "PRISONNIER LIVRÉ +{0} DB", pl: "JENIEC PRZEKAZANY +{0} DB", "zh-Hant": "俘虜已移交 +{0} DB",
    ko: "포로 인계 +{0} DB"
  }),
  "The beast is spent. Time to land the killing blow.": Object.freeze({
    "zh-Hans": "这头巨鲸已经力竭。是时候给予致命一击了。",
    ru: "Зверь выбился из сил. Пора нанести смертельный удар.",
    es: "La bestia está agotada. Es hora de asestar el golpe final.",
    "pt-BR": "A fera está exausta. É hora de desferir o golpe final.",
    ja: "獲物は力尽きた。とどめを刺す時だ。",
    de: "Das Tier ist erschöpft. Zeit für den Todesstoß.",
    fr: "La bête est à bout de forces. Il est temps de porter le coup de grâce.",
    pl: "Bestia opadła z sił. Czas zadać śmiertelny cios.",
    "zh-Hant": "這頭巨鯨已經力竭。是時候給予致命一擊了。",
    ko: "고래가 기진맥진했다. 이제 결정타를 날릴 때다."
  }),
  "{0}, female calf": Object.freeze({
    "zh-Hans": "{0}，雌性幼鲸", ru: "{0}, детёныш-самка", es: "{0}, cría hembra",
    "pt-BR": "{0}, filhote fêmea", ja: "{0}（雌の幼鯨）", de: "{0}, weibliches Jungtier",
    fr: "{0}, baleineau femelle", pl: "{0}, młoda samica", "zh-Hant": "{0}，雌性幼鯨",
    ko: "{0}, 암컷 새끼"
  }),
  "{0}, male calf": Object.freeze({
    "zh-Hans": "{0}，雄性幼鲸", ru: "{0}, детёныш-самец", es: "{0}, cría macho",
    "pt-BR": "{0}, filhote macho", ja: "{0}（雄の幼鯨）", de: "{0}, männliches Jungtier",
    fr: "{0}, baleineau mâle", pl: "{0}, młody samiec", "zh-Hant": "{0}，雄性幼鯨",
    ko: "{0}, 수컷 새끼"
  }),
  "{0}, adolescent female": Object.freeze({
    "zh-Hans": "{0}，雌性亚成体", ru: "{0}, молодая самка", es: "{0}, hembra joven",
    "pt-BR": "{0}, fêmea jovem", ja: "{0}（若い雌）", de: "{0}, heranwachsendes Weibchen",
    fr: "{0}, jeune femelle", pl: "{0}, dorastająca samica", "zh-Hant": "{0}，雌性亞成體",
    ko: "{0}, 어린 암컷"
  }),
  "{0}, adolescent male": Object.freeze({
    "zh-Hans": "{0}，雄性亚成体", ru: "{0}, молодой самец", es: "{0}, macho joven",
    "pt-BR": "{0}, macho jovem", ja: "{0}（若い雄）", de: "{0}, heranwachsendes Männchen",
    fr: "{0}, jeune mâle", pl: "{0}, dorastający samiec", "zh-Hant": "{0}，雄性亞成體",
    ko: "{0}, 어린 수컷"
  }),
  "{0}, adult female": Object.freeze({
    "zh-Hans": "{0}，成年雌性", ru: "{0}, взрослая самка", es: "{0}, hembra adulta",
    "pt-BR": "{0}, fêmea adulta", ja: "{0}（成体の雌）", de: "{0}, ausgewachsenes Weibchen",
    fr: "{0}, femelle adulte", pl: "{0}, dorosła samica", "zh-Hant": "{0}，成年雌性",
    ko: "{0}, 성체 암컷"
  }),
  "{0}, adult male": Object.freeze({
    "zh-Hans": "{0}，成年雄性", ru: "{0}, взрослый самец", es: "{0}, macho adulto",
    "pt-BR": "{0}, macho adulto", ja: "{0}（成体の雄）", de: "{0}, ausgewachsenes Männchen",
    fr: "{0}, mâle adulte", pl: "{0}, dorosły samiec", "zh-Hant": "{0}，成年雄性",
    ko: "{0}, 성체 수컷"
  }),
  "{0}'s battery has its new guns. The remaining plans may go to {1} in any order.": Object.freeze({
    "zh-Hans": "{0}的炮台已装上新炮。其余图样可按任意顺序送往{1}。",
    ja: "{0}の砲台に新しい砲を据えました。残りの図面は{1}へ、どの順番で運んでも構いません。",
    "zh-Hant": "{0}的砲臺已裝上新砲。其餘圖樣可按任意順序送往{1}。",
    ko: "{0} 포대에 새 대포를 설치했습니다. 남은 도면은 {1}에 원하는 순서로 전달할 수 있습니다."
  }),
  "Nanjing has copied the Portuguese patterns. We may now refit {0} in any order.": Object.freeze({
    "zh-Hans": "南京已仿制葡萄牙火炮。现在可按任意顺序改装{0}。",
    ja: "南京でポルトガル砲の図面を写し終えました。次は{0}を好きな順番で改修できます。",
    "zh-Hant": "南京已仿製葡萄牙火砲。現在可按任意順序改裝{0}。",
    ko: "난징에서 포르투갈 대포 도면을 복제했습니다. 이제 {0}을 원하는 순서로 개수할 수 있습니다."
  }),
  "The artillery plans are bound for {0}. We may visit the remaining ports in any order.": Object.freeze({
    "zh-Hans": "火炮图样要送往{0}。其余港口可按任意顺序前往。",
    ja: "砲術図面の届け先は{0}です。残りの港はどの順番で回っても構いません。",
    "zh-Hant": "火砲圖樣要送往{0}。其餘港口可按任意順序前往。",
    ko: "포술 도면은 {0}에 전달해야 합니다. 남은 항구는 원하는 순서로 방문할 수 있습니다."
  }),
  "Become Lutheran": Object.freeze({
    "zh-Hans": "改信路德宗", ru: "Принять лютеранство", es: "Convertirse al luteranismo",
    "pt-BR": "Converter-se ao luteranismo", ja: "ルター派に改宗する", de: "Lutherisch werden",
    fr: "Se convertir au luthéranisme", pl: "Przejść na luteranizm", "zh-Hant": "改信路德宗",
    ko: "루터교로 개종하기"
  }),
  "{0} deliveries remain.": Object.freeze({
    "zh-Hans": "还有{0}次投递。", "zh-Hant": "還有{0}次投遞。",
    ja: "あと{0}か所に届けなければなりません。", ko: "배달할 곳이 {0}곳 남았습니다."
  }),
  "{0} has trusted readers waiting behind drawn shutters.": Object.freeze({
    "zh-Hans": "{0}有可信的读者在紧闭的百叶窗后等候。",
    "zh-Hant": "{0}有可信的讀者在緊閉的百葉窗後等候。",
    ja: "{0}では、信頼できる読者たちが閉ざした雨戸の奥で待っています。",
    ko: "{0}에서는 믿을 만한 독자들이 닫힌 덧문 뒤에서 기다리고 있습니다."
  }),
  "{0} has trusted readers waiting behind drawn shutters. This is delivery {1} of {2}.": Object.freeze({
    "zh-Hans": "{0}有可信的读者在紧闭的百叶窗后等候。这是第{1}/{2}次投递。",
    "zh-Hant": "{0}有可信的讀者在緊閉的百葉窗後等候。這是第{1}/{2}次投遞。",
    ja: "{0}では、信頼できる読者たちが閉ざした雨戸の奥で待っています。これは{1}/{2}か所目の配達です。",
    ko: "{0}에서는 믿을 만한 독자들이 닫힌 덧문 뒤에서 기다리고 있습니다. 이번은 {1}/{2}번째 배달입니다."
  }),
  "BIBLES SEIZED MISSION FAILED": Object.freeze({
    "zh-Hans": "《圣经》被没收 任务失败", "zh-Hant": "《聖經》被沒收 任務失敗",
    ja: "聖書没収 任務失敗", ko: "성경 압수 임무 실패"
  }),
  "Continue the circuit": Object.freeze({
    "zh-Hans": "继续送书", "zh-Hant": "繼續送書", ja: "次の街へ向かう", ko: "다음 도시로 향하기"
  }),
  "Deliver Testaments {0}/{1}": Object.freeze({
    "zh-Hans": "交付《新约》 {0}/{1}", "zh-Hant": "交付《新約》 {0}/{1}",
    ja: "新約聖書を渡す {0}/{1}", ko: "신약성서 전달 {0}/{1}"
  }),
  "Heave to. We found Luther's forbidden Testaments. Surrender the books, or answer to our guns.": Object.freeze({
    "zh-Hans": "停船。我们发现了路德的禁书《新约》。交出书籍，否则就开火。",
    "zh-Hant": "停船。我們發現了路德的禁書《新約》。交出書籍，否則就開火。",
    ja: "停船せよ。ルターの禁制の新約聖書を見つけた。本を渡せ。さもなくば砲火で答えてもらう。",
    ko: "정선하라. 루터의 금서인 신약성서를 찾았다. 책을 넘기지 않으면 발포하겠다."
  }),
  "Keep my present faith": Object.freeze({
    "zh-Hans": "保持目前的信仰", "zh-Hant": "保持目前的信仰",
    ja: "今の信仰を守る", ko: "현재 신앙을 지킨다"
  }),
  "Luther's Testaments are forbidden. Fortunately, I have read them. Close the chest, captain; my eyesight has failed.": Object.freeze({
    "zh-Hans": "路德的《新约》是禁书。幸好我读过。把箱子关上吧，船长；看来我的眼神不太好。",
    "zh-Hant": "路德的《新約》是禁書。幸好我讀過。把箱子關上吧，船長；看來我的眼神不太好。",
    ja: "ルターの新約聖書は禁止されています。幸い、私も読んだことがある。箱を閉じなさい、船長。どうやら目がかすんだようだ。",
    ko: "루터의 신약성서는 금서요. 다행히 나도 읽었소. 상자를 닫으시오, 선장. 내 눈이 침침했던 모양이군."
  }),
  "One city supplied. {0} is next.": Object.freeze({
    "zh-Hans": "一座城市已收到书。下一站是{0}。", "zh-Hant": "一座城市已收到書。下一站是{0}。",
    ja: "一つの街に届けました。次は{0}です。", ko: "한 도시에 전달했습니다. 다음은 {0}입니다."
  }),
  "One city supplied. {0} is next. The bishops have excellent roads; unfortunately for them, so do we.": Object.freeze({
    "zh-Hans": "一座城市已收到书。下一站是{0}。主教们的道路修得很好；可惜我们也会走。",
    "zh-Hant": "一座城市已收到書。下一站是{0}。主教們的道路修得很好；可惜我們也會走。",
    ja: "一つの街に届けました。次は{0}です。司教たちは立派な道を整えています。運の悪いことに、その道は私たちも使えます。",
    ko: "한 도시에 전달했습니다. 다음은 {0}입니다. 주교들은 훌륭한 길을 닦아 두었습니다. 불행히도 우리도 그 길을 쓸 수 있지요."
  }),
  "Surrender the Bibles": Object.freeze({
    "zh-Hans": "交出《圣经》", "zh-Hant": "交出《聖經》", ja: "聖書を引き渡す", ko: "성경을 넘긴다"
  }),
  "TESTAMENTS DELIVERED {0}/{1}": Object.freeze({
    "zh-Hans": "《新约》已送达 {0}/{1}", "zh-Hant": "《新約》已送達 {0}/{1}",
    ja: "新約聖書を配達 {0}/{1}", ko: "신약성서 전달 완료 {0}/{1}"
  }),
  "The bishops have excellent roads; unfortunately for them, so do we.": Object.freeze({
    "zh-Hans": "主教们的道路修得很好；可惜我们也会走。",
    "zh-Hant": "主教們的道路修得很好；可惜我們也會走。",
    ja: "司教たちは立派な道を整えています。運の悪いことに、その道は私たちも使えます。",
    ko: "주교들은 훌륭한 길을 닦아 두었습니다. 불행히도 우리도 그 길을 쓸 수 있지요."
  }),
  "The next bundles are bound for {0}.": Object.freeze({
    "zh-Hans": "下一批书要送往{0}。", "zh-Hant": "下一批書要送往{0}。",
    ja: "次の包みは{0}行きです。", ko: "다음 책 꾸러미는 {0}행입니다."
  }),
  "The next bundles are bound for {0}. {1} deliveries remain.": Object.freeze({
    "zh-Hans": "下一批书要送往{0}。还有{1}次投递。", "zh-Hant": "下一批書要送往{0}。還有{1}次投遞。",
    ja: "次の包みは{0}行きです。あと{1}か所です。", ko: "다음 책 꾸러미는 {0}행입니다. 배달할 곳이 {1}곳 남았습니다."
  }),
  "This is delivery {0} of {1}.": Object.freeze({
    "zh-Hans": "这是第{0}/{1}次投递。", "zh-Hant": "這是第{0}/{1}次投遞。",
    ja: "これは{0}/{1}か所目の配達です。", ko: "이번은 {0}/{1}번째 배달입니다."
  }),
  "{0} ship {1}": Object.freeze({
    "zh-Hans": "{0}船只：{1}", ru: "Корабль {0}: {1}", es: "Buque de {0}: {1}",
    "pt-BR": "Navio de {0}: {1}", ja: "{0}船：{1}", de: "{0}-Schiff: {1}",
    fr: "Navire de {0} : {1}", pl: "Okręt {0}: {1}", "zh-Hant": "{0}船隻：{1}",
    ko: "{0} 선박: {1}"
  }),
  "{0} succeeded by {1}": Object.freeze({
    "zh-Hans": "{0}由{1}继任", ru: "После {0} престол занял {1}", es: "{0}, sucedido por {1}",
    "pt-BR": "{0}, sucedido por {1}", ja: "{0}から{1}へ継承", de: "Auf {0} folgt {1}",
    fr: "{0}, remplacé par {1}", pl: "Po {0} władzę obejmuje {1}", "zh-Hant": "{0}由{1}繼任",
    ko: "{0}의 뒤를 {1}이(가) 이음"
  }),
  "Booksellers' purse": Object.freeze({
    "zh-Hans": "书商酬金", ru: "Гонорар книготорговцев", es: "Recompensa de los libreros",
    "pt-BR": "Recompensa dos livreiros", ja: "書商からの謝礼", de: "Honorar der Buchhändler",
    fr: "Gratification des libraires", pl: "Zapłata księgarzy", "zh-Hant": "書商酬金",
    ko: "서적상들의 사례금"
  }),
  "Captain, you read the Bibles all the way here. Did they change your faith, or only ruin your sleep?": Object.freeze({
    "zh-Hans": "船长，您一路都在读这些《圣经》。它们改变了您的信仰，还是只毁了您的睡眠？",
    ru: "Капитан, вы всю дорогу читали эти Библии. Они изменили вашу веру или лишь лишили вас сна?",
    es: "Capitán, habéis leído esas Biblias durante todo el viaje. ¿Os cambiaron la fe o solo os quitaron el sueño?",
    "pt-BR": "Capitão, você leu essas Bíblias durante toda a viagem. Elas mudaram sua fé ou só acabaram com seu sono?",
    ja: "船長、航海中ずっとその聖書を読んでいましたね。信仰が変わったのですか、それとも眠れなくなっただけですか？",
    de: "Kapitän, Ihr habt die Bibeln während der ganzen Reise gelesen. Haben sie Euren Glauben verändert oder Euch nur den Schlaf geraubt?",
    fr: "Capitaine, vous avez lu ces Bibles pendant toute la traversée. Ont-elles changé votre foi ou seulement ruiné votre sommeil ?",
    pl: "Kapitanie, przez całą drogę czytaliście te Biblie. Zmieniły waszą wiarę czy tylko odebrały wam sen?",
    "zh-Hant": "船長，您一路都在讀這些《聖經》。它們改變了您的信仰，還是只毀了您的睡眠？",
    ko: "선장님, 오는 내내 그 성경들을 읽으셨군요. 신앙이 바뀐 겁니까, 아니면 잠만 설친 겁니까?"
  }),
  "Defied {0}": Object.freeze({
    "zh-Hans": "反抗{0}", ru: "Брошен вызов: {0}", es: "Desafió a {0}",
    "pt-BR": "Desafiou {0}", ja: "{0}に背いた", de: "{0} getrotzt",
    fr: "A défié {0}", pl: "Sprzeciwiono się {0}", "zh-Hant": "反抗{0}",
    ko: "{0}에 반항함"
  }),
  "Help distribute the Testaments": Object.freeze({
    "zh-Hans": "帮助分发《新约》", ru: "Помочь распространить Новый Завет", es: "Ayudar a distribuir los Nuevos Testamentos",
    "pt-BR": "Ajudar a distribuir os Novos Testamentos", ja: "新約聖書の配布を手伝う", de: "Beim Verteilen der Neuen Testamente helfen",
    fr: "Aider à distribuer les Nouveaux Testaments", pl: "Pomóc rozprowadzać Nowe Testamenty", "zh-Hant": "幫助分發《新約》",
    ko: "신약성서 배포 돕기"
  }),
  "Remain Roman Catholic": Object.freeze({
    "zh-Hans": "保持罗马天主教信仰", ru: "Остаться католиком", es: "Conservar la fe católica romana",
    "pt-BR": "Manter a fé católica romana", ja: "ローマ・カトリックに留まる", de: "Römisch-katholisch bleiben",
    fr: "Garder la foi catholique romaine", pl: "Pozostać przy katolicyzmie", "zh-Hant": "保持羅馬天主教信仰",
    ko: "로마 가톨릭에 남기"
  }),
  "The Central European frontier holds": Object.freeze({
    "zh-Hans": "中欧防线守住了", ru: "Центральноевропейский рубеж удержан", es: "El frente centroeuropeo resiste",
    "pt-BR": "A frente da Europa Central resiste", ja: "中央ヨーロッパの戦線は持ちこたえた", de: "Die mitteleuropäische Front hält",
    fr: "Le front d'Europe centrale tient", pl: "Front środkowoeuropejski się utrzymał", "zh-Hant": "中歐防線守住了",
    ko: "중앙유럽 전선이 버텨냈다"
  }),
  "The crown assumes ecclesiastical supremacy": Object.freeze({
    "zh-Hans": "王权取得教会最高权力", ru: "Корона принимает верховенство над церковью", es: "La Corona asume la supremacía eclesiástica",
    "pt-BR": "A Coroa assume a supremacia eclesiástica", ja: "王権が教会の首長権を握る", de: "Die Krone übernimmt die kirchliche Oberhoheit",
    fr: "La Couronne assume la suprématie ecclésiastique", pl: "Korona przejmuje zwierzchnictwo nad Kościołem", "zh-Hant": "王權取得教會最高權力",
    ko: "왕권이 교회 수장권을 장악하다"
  }),
  "The Edict of Worms forbids Luther's books and vernacular Scripture. Turn away from {0}, or the books will be seized.": Object.freeze({
    "zh-Hans": "沃尔姆斯敕令禁止路德的著作和本国语《圣经》。离开{0}，否则书籍将被查扣。",
    ru: "Вормсский эдикт запрещает книги Лютера и Священное Писание на народном языке. Покиньте {0}, иначе книги будут конфискованы.",
    es: "El Edicto de Worms prohíbe los libros de Lutero y las Escrituras en lengua vernácula. Aléjate de {0} o los libros serán confiscados.",
    "pt-BR": "O Édito de Worms proíbe os escritos de Lutero e as Escrituras em língua vernácula. Deixe {0}, ou os livros serão apreendidos.",
    ja: "ヴォルムス勅令はルターの著作と各国語訳聖書を禁じている。{0}から立ち去れ。さもなくば書物を没収する。",
    de: "Das Wormser Edikt verbietet Luthers Schriften und die Bibel in der Volkssprache. Kehrt vor {0} um, sonst werden die Bücher beschlagnahmt.",
    fr: "L'édit de Worms interdit les écrits de Luther et les Écritures en langue vernaculaire. Éloignez-vous de {0}, sinon les livres seront confisqués.",
    pl: "Edykt wormacki zakazuje pism Lutra i Pisma Świętego w językach narodowych. Zawróć spod {0}, inaczej księgi zostaną skonfiskowane.",
    "zh-Hant": "沃爾姆斯敕令禁止路德的著作和本國語《聖經》。離開{0}，否則書籍將被查扣。",
    ko: "보름스 칙령은 루터의 저술과 자국어 성서를 금한다. {0}에서 물러나라. 그렇지 않으면 책을 압수하겠다."
  }),
  "The English crown breaks with Rome": Object.freeze({
    "zh-Hans": "英格兰王室与罗马决裂", ru: "Английская корона порывает с Римом", es: "La Corona inglesa rompe con Roma",
    "pt-BR": "A Coroa inglesa rompe com Roma", ja: "イングランド王権がローマと決別", de: "Die englische Krone bricht mit Rom",
    fr: "La Couronne anglaise rompt avec Rome", pl: "Korona angielska zrywa z Rzymem", "zh-Hant": "英格蘭王室與羅馬決裂",
    ko: "잉글랜드 왕권이 로마와 결별하다"
  }),
  "The Habsburg frontier collapses": Object.freeze({
    "zh-Hans": "哈布斯堡防线崩溃", ru: "Габсбургский рубеж рушится", es: "El frente de los Habsburgo se derrumba",
    "pt-BR": "A frente dos Habsburgos desmorona", ja: "ハプスブルクの戦線が崩壊", de: "Die habsburgische Front bricht zusammen",
    fr: "Le front des Habsbourg s'effondre", pl: "Front habsburski się załamuje", "zh-Hant": "哈布斯堡防線崩潰",
    ko: "합스부르크 전선이 무너지다"
  }),
  "The Ottoman advance is checked": Object.freeze({
    "zh-Hans": "奥斯曼攻势受阻", ru: "Османское наступление остановлено", es: "El avance otomano queda detenido",
    "pt-BR": "O avanço otomano é detido", ja: "オスマン軍の進撃が阻まれた", de: "Der osmanische Vormarsch wird aufgehalten",
    fr: "L'avancée ottomane est arrêtée", pl: "Natarcie osmańskie zostaje zatrzymane", "zh-Hant": "鄂圖曼攻勢受阻",
    ko: "오스만군의 진격이 저지되다"
  }),
  "The Ottoman army withdraws from Vienna": Object.freeze({
    "zh-Hans": "奥斯曼军队撤离维也纳", ru: "Османская армия отступает от Вены", es: "El ejército otomano se retira de Viena",
    "pt-BR": "O exército otomano se retira de Viena", ja: "オスマン軍がウィーンから撤退", de: "Das osmanische Heer zieht sich von Wien zurück",
    fr: "L'armée ottomane se retire de Vienne", pl: "Armia osmańska wycofuje się spod Wiednia", "zh-Hant": "鄂圖曼軍隊撤離維也納",
    ko: "오스만군이 빈에서 철수하다"
  }),
  "The September Testament": Object.freeze({
    "zh-Hans": "《九月圣经》", ru: "Сентябрьский Завет", es: "El Testamento de Septiembre",
    "pt-BR": "O Testamento de Setembro", ja: "九月聖書", de: "Das Septembertestament",
    fr: "Le Testament de septembre", pl: "Testament wrześniowy", "zh-Hant": "《九月聖經》",
    ko: "9월 성서"
  }),
  "Vienna holds against Suleiman's army": Object.freeze({
    "zh-Hans": "维也纳挡住苏莱曼的大军", ru: "Вена устояла против армии Сулеймана", es: "Viena resiste al ejército de Solimán",
    "pt-BR": "Viena resiste ao exército de Solimão", ja: "ウィーンがスレイマン軍を退けた", de: "Wien hält Suleimans Heer stand",
    fr: "Vienne résiste à l'armée de Soliman", pl: "Wiedeń odpiera armię Sulejmana", "zh-Hant": "維也納擋住蘇萊曼的大軍",
    ko: "빈이 술레이만의 군대를 막아내다"
  }),
  "{0}'s coastal officers seek a captain to hunt the wokou reported near {1}. Sink or force their surrender, then return for {2} db. Pirates require no marque.": Object.freeze({
    ja: "{0}の沿海官は、{1}付近に出没する倭寇を討つ船長を求めている。沈めるか降伏させ、戻れば{2} DBを支払う。海賊討伐に私掠免許状は要らない。",
    "zh-Hans": "{0}的沿海官员正在征募船长，讨伐出没于{1}附近的倭寇。击沉或迫降他们，再回此地复命，赏金{2} DB。讨伐海盗无需私掠许可证。",
    "zh-Hant": "{0}的沿海官員正在徵募船長，討伐出沒於{1}附近的倭寇。擊沉或迫降他們，再回此地覆命，賞金{2} DB。討伐海盜無需私掠許可證。",
    ko: "{0}의 해안 관리는 {1} 근처에 출몰하는 왜구를 토벌할 선장을 찾고 있다. 침몰시키거나 항복시킨 뒤 돌아오면 {2} DB를 지급한다. 해적 토벌에는 사략 면허장이 필요 없다."
  }),
  "{0}'s council seeks a captain to hunt the wokou raiding near {1}. Sink or force their surrender, then return for {2} db. Pirates require no marque.": Object.freeze({
    ja: "{0}の評定は、{1}付近を荒らす倭寇を討つ船長を求めている。沈めるか降伏させ、戻れば{2} DBを支払う。海賊討伐に私掠免許状は要らない。",
    "zh-Hans": "{0}的评定所正在征募船长，讨伐{1}附近的倭寇。击沉或迫降他们，再回来领取{2} DB。讨伐海盗无需私掠许可证。",
    "zh-Hant": "{0}的評定所正在徵募船長，討伐{1}附近的倭寇。擊沉或迫降他們，再回來領取{2} DB。討伐海盜無需私掠許可證。",
    ko: "{0}의 평정은 {1} 근처를 약탈하는 왜구를 토벌할 선장을 찾고 있다. 침몰시키거나 항복시킨 뒤 돌아오면 {2} DB를 지급한다. 해적 토벌에는 사략 면허장이 필요 없다."
  }),
  "{0}'s council needs a sealed order carried to {1} and the local reply returned to Kyoto. The bakufu will pay {2} db.": Object.freeze({
    ja: "{0}の評定は、封印した御教書を{1}へ届け、現地の返書を京都へ持ち帰るよう命じている。幕府は{2} DBを支払う。",
    "zh-Hans": "{0}的评定所命你将封缄御教书送往{1}，再把当地回书带回京都。幕府将支付{2} DB。",
    "zh-Hant": "{0}的評定所命你將封緘御教書送往{1}，再把當地回書帶回京都。幕府將支付{2} DB。",
    ko: "{0}의 평정은 봉인된 명령서를 {1}에 전하고 현지의 답서를 교토로 가져오라고 명한다. 막부는 {2} DB를 지급한다."
  }),
  "{0}'s secretariat requires a memorial carried to {1} and its answer returned to Beijing. The court will pay {2} db.": Object.freeze({
    ja: "{0}の官署は、奏疏を{1}へ届け、その返答を北京へ持ち帰るよう命じている。朝廷は{2} DBを支払う。",
    "zh-Hans": "{0}的官署命你将奏疏送往{1}，再把答复带回北京。朝廷将支付{2} DB。",
    "zh-Hant": "{0}的官署命你將奏疏送往{1}，再把答覆帶回北京。朝廷將支付{2} DB。",
    ko: "{0}의 관청은 상소문을 {1}에 전하고 그 답서를 베이징으로 가져오라고 명한다. 조정은 {2} DB를 지급한다."
  }),
  "{0} offers tribute and allegiance to {1} in return for recognition and protection.": Object.freeze({
    ja: "{0}は、承認と保護を受ける代わりに、{1}へ朝貢し臣従することを申し出る。",
    "zh-Hans": "{0}提出向{1}进贡并称臣，以换取承认和保护。",
    "zh-Hant": "{0}提出向{1}進貢並稱臣，以換取承認和保護。",
    ko: "{0}은 승인과 보호를 받는 대가로 {1}에 조공하고 복속하겠다고 제안한다."
  }),
  "Those {0} are sealed tribute, not your cargo. Selling {1} is theft from the court. Your mission will fail and your standing will fall {2} with {3}{4}.": Object.freeze({
    ja: "その{0}は封印された貢物で、あなたの積荷ではない。{1}を売れば朝廷からの窃盗となる。任務は失敗し、{3}での評判が{2}下がる{4}。",
    "zh-Hans": "这些{0}是封缄贡品，不是你的货物。出售{1}就是盗取朝廷财物。任务将失败，你在{3}的声望会降低{2}{4}。",
    "zh-Hant": "這些{0}是封緘貢品，不是你的貨物。出售{1}就是盜取朝廷財物。任務將失敗，你在{3}的聲望會降低{2}{4}。",
    ko: "이 {0}은 봉인된 공물이지 당신의 화물이 아니다. {1}을 팔면 조정의 재물을 훔치는 셈이다. 임무는 실패하고 {3}에서의 평판이 {2}만큼 떨어진다{4}."
  }),
  "By imperial order, this memorial is presented for entry and reply.": Object.freeze({
    ja: "勅命により、この奏疏を記録に納め、返答を賜るため提出する。",
    "zh-Hans": "奉圣旨，谨呈此奏疏，请登记并作答。",
    "zh-Hant": "奉聖旨，謹呈此奏疏，請登記並作答。",
    ko: "황명에 따라 이 상소문을 접수하고 답하도록 올린다."
  }),
  "This memorial concerns coastal order, licensed trade, and the conduct of local officials.": Object.freeze({
    ja: "この奏疏は、沿海の秩序、許可貿易、地方官の振る舞いに関するものだ。",
    "zh-Hans": "此奏疏事关海防秩序、持照贸易与地方官员的操守。",
    "zh-Hant": "此奏疏事關海防秩序、持照貿易與地方官員的操守。",
    ko: "이 상소문은 해안 질서, 허가 무역, 지방 관리의 행실에 관한 것이다."
  }),
  ...reviewedShipTypeOverrides(),
  "{0}'s court is raising privateers for the war against {1}. Accept this letter of marque, and you may lawfully prize the ships and cargo of every power at war with {2}: {3}.": Object.freeze({
    "zh-Hans": "{0}的宫廷正在为对{1}的战争招募私掠船长。接受这份私掠许可证后，你便可合法捕获与{2}交战的所有势力之船只与货物：{3}。",
    ru: "Двор {0} набирает каперов для войны против {1}. Примите каперскую грамоту, и вы сможете законно захватывать корабли и грузы всех держав, воюющих с {2}: {3}.",
    es: "La corte de {0} está reclutando corsarios para la guerra contra {1}. Acepta esta patente de corso y podrás apresar legalmente los barcos y cargamentos de toda potencia en guerra con {2}: {3}.",
    "pt-BR": "A corte de {0} está recrutando corsários para a guerra contra {1}. Aceite esta carta de corso e poderá apresar legalmente os navios e cargas de toda potência em guerra com {2}: {3}.",
    ja: "{0}の宮廷は{1}との戦争のため私掠船長を募っている。この私掠免許状を受け取れば、{2}と交戦中のすべての勢力の船と積荷を合法的に拿捕できる：{3}。",
    de: "Der Hof von {0} wirbt Kaperfahrer für den Krieg gegen {1} an. Nehmt diesen Kaperbrief an, und Ihr dürft Schiffe und Ladung jeder Macht, die mit {2} im Krieg liegt, rechtmäßig als Prise nehmen: {3}.",
    fr: "La cour de {0} recrute des corsaires pour la guerre contre {1}. Acceptez cette lettre de marque et vous pourrez légalement saisir les navires et cargaisons de toute puissance en guerre contre {2} : {3}.",
    pl: "Dwór {0} werbuje kaprów do wojny przeciwko {1}. Przyjmij ten list kaperski, a będziesz mógł zgodnie z prawem zajmować statki i ładunki każdego państwa będącego w stanie wojny z {2}: {3}.",
    "zh-Hant": "{0}的宮廷正在為對{1}的戰爭招募私掠船長。接受這份私掠許可證後，你便可合法捕獲與{2}交戰的所有勢力之船隻與貨物：{3}。",
    ko: "{0}의 조정은 {1}과의 전쟁에 나설 사략선을 모집하고 있다. 이 사략 허가장을 받으면 {2}에 맞서 싸우는 모든 세력의 선박과 화물을 합법적으로 나포할 수 있다: {3}."
  }),
  "Accept the letter of marque": Object.freeze({
    "zh-Hans": "接受私掠许可证",
    ru: "Принять каперскую грамоту",
    es: "Aceptar la patente de corso",
    "pt-BR": "Aceitar a carta de corso",
    ja: "私掠免許状を受け取る",
    de: "Kaperbrief annehmen",
    fr: "Accepter la lettre de marque",
    pl: "Przyjmij list kaperski",
    "zh-Hant": "接受私掠許可證",
    ko: "사략 허가장 받기"
  }),
  "By {0}'s authority, your commission now covers every enemy of {1}: {2}. Keep it with your papers.": Object.freeze({
    "zh-Hans": "奉{0}之命，你的委任现在适用于{1}的所有敌人：{2}。请将它与船只文书一同保管。",
    ru: "По воле {0} ваша каперская грамота теперь действует против всех врагов {1}: {2}. Храните ее среди судовых бумаг.",
    es: "Por autoridad de {0}, tu patente abarca ahora a todos los enemigos de {1}: {2}. Guárdala con los papeles del barco.",
    "pt-BR": "Pela autoridade de {0}, sua carta agora abrange todos os inimigos de {1}: {2}. Guarde-a com os documentos do navio.",
    ja: "{0}の権威により、この免許状は{1}のすべての敵に対して有効となった：{2}。船の書類とともに保管せよ。",
    de: "Mit {0}s Vollmacht gilt Euer Kaperbrief nun gegen alle Feinde von {1}: {2}. Verwahrt ihn bei den Schiffspapieren.",
    fr: "Par l'autorité de {0}, votre commission couvre désormais tous les ennemis de {1} : {2}. Gardez-la avec les papiers du navire.",
    pl: "Z upoważnienia {0} twój list kaperski obejmuje teraz wszystkich wrogów {1}: {2}. Przechowuj go z dokumentami okrętowymi.",
    "zh-Hant": "奉{0}之命，你的委任現在適用於{1}的所有敵人：{2}。請將它與船隻文書一同保管。",
    ko: "{0}의 권위로, 이제 이 허가장은 {1}의 모든 적에게 적용된다: {2}. 선박 문서와 함께 보관하라."
  }),
  "Very well. The commission remains available while {0} is at war. Ask me if you reconsider.": Object.freeze({
    "zh-Hans": "很好。只要{0}仍在交战，这份委任就继续有效。若你改变主意，来找我。",
    ru: "Хорошо. Пока {0} ведет войну, предложение остается в силе. Обратитесь ко мне, если передумаете.",
    es: "Así sea. La patente seguirá disponible mientras {0} esté en guerra. Pregúntame si cambias de opinión.",
    "pt-BR": "Muito bem. A carta continuará disponível enquanto {0} estiver em guerra. Fale comigo se mudar de ideia.",
    ja: "承知した。{0}が戦争中である限り、この申し出は有効だ。気が変わったら声をかけてくれ。",
    de: "Wie Ihr wünscht. Solange {0} Krieg führt, bleibt das Angebot bestehen. Sprecht mich an, falls Ihr es Euch anders überlegt.",
    fr: "Très bien. La commission restera disponible tant que {0} sera en guerre. Revenez me voir si vous changez d'avis.",
    pl: "Dobrze. Dopóki {0} prowadzi wojnę, oferta pozostaje aktualna. Powiedz mi, jeśli zmienisz zdanie.",
    "zh-Hant": "很好。只要{0}仍在交戰，這份委任就繼續有效。若你改變主意，來找我。",
    ko: "좋다. {0}이 전쟁 중인 동안 이 허가장은 계속 신청할 수 있다. 마음이 바뀌면 말하라."
  }),
  "Do you think the fish smell us coming, or have they gone mercifully numb?": Object.freeze({
    "zh-Hans": "你觉得鱼儿闻到我们来了，还是已经麻木得不知害怕了？"
  }),
  "Heave to. Customs officers at {0} traced illicit trade to this vessel. Pay the fine, surrender the unlicensed cargo, or answer to our guns.": Object.freeze({
    "zh-Hans": "停船受检。{0}海关已查明这艘船参与走私。缴纳罚款、交出违禁货物，否则我们就开火。",
    ru: "Лечь в дрейф! Таможня в {0} установила, что это судно вело контрабандную торговлю. Уплатите штраф, сдайте незаконный груз — или мы откроем огонь.",
    es: "¡Deténganse! Los aduaneros de {0} han vinculado este navío con el comercio clandestino. Paguen la multa, entreguen la carga ilícita o responderán ante nuestros cañones.",
    "pt-BR": "Parem o navio! Os fiscais da alfândega de {0} ligaram esta embarcação ao comércio clandestino. Paguem a multa, entreguem a carga ilícita ou respondam aos nossos canhões.",
    ja: "停船せよ。{0}の税関は、この船の密貿易を突き止めた。罰金を払い、密輸品を引き渡せ。さもなくば砲撃する。",
    de: "Beidrehen! Die Zollbeamten in {0} haben dieses Schiff mit illegalem Handel in Verbindung gebracht. Zahlt die Strafe, übergebt die unverzollte Ladung oder stellt euch unseren Geschützen.",
    fr: "Mettez en panne ! Les douaniers de {0} ont relié ce navire à un commerce clandestin. Payez l'amende, livrez la cargaison illicite ou répondez à nos canons.",
    pl: "Stać! Celnicy z {0} powiązali ten statek z nielegalnym handlem. Zapłaćcie grzywnę, oddajcie nielegalny ładunek albo odpowiecie przed naszymi działami.",
    "zh-Hant": "停船受檢。{0}海關已查明這艘船參與走私。繳納罰款、交出違禁貨物，否則我們就開火。",
    ko: "정선하라! {0} 세관이 이 배의 밀무역을 적발했다. 벌금을 내고 밀수 화물을 넘겨라. 거부하면 포격하겠다."
  }),
  "ILLICIT": Object.freeze({
    "zh-Hans": "走私", ru: "КОНТРАБАНДА", es: "ILÍCITO", "pt-BR": "CLANDESTINO",
    ja: "密貿易", de: "ILLEGAL", fr: "CLANDESTIN", pl: "NIELEGALNY",
    "zh-Hant": "走私", ko: "밀무역"
  }),
  "ILLICIT CARGO SURRENDERED {0}": Object.freeze({
    "zh-Hans": "已交出走私货物 {0}", ru: "КОНТРАБАНДНЫЙ ГРУЗ СДАН {0}",
    es: "CARGA ILÍCITA ENTREGADA {0}", "pt-BR": "CARGA CLANDESTINA ENTREGUE {0}",
    ja: "密輸品を引き渡した {0}", de: "ILLEGALE LADUNG ÜBERGEBEN {0}",
    fr: "CARGAISON CLANDESTINE LIVRÉE {0}", pl: "ODDANO NIELEGALNY ŁADUNEK {0}",
    "zh-Hant": "已交出走私貨物 {0}", ko: "밀수 화물 인도 {0}"
  }),
  "ILLICIT TRADE FINE {0} DB": Object.freeze({
    "zh-Hans": "走私罚款 {0} DB", ru: "ШТРАФ ЗА КОНТРАБАНДУ {0} DB",
    es: "MULTA POR COMERCIO ILÍCITO {0} DB", "pt-BR": "MULTA POR COMÉRCIO CLANDESTINO {0} DB",
    ja: "密貿易の罰金 {0} DB", de: "STRAFE FÜR ILLEGALEN HANDEL {0} DB",
    fr: "AMENDE POUR COMMERCE CLANDESTIN {0} DB", pl: "GRZYWNA ZA NIELEGALNY HANDEL {0} DB",
    "zh-Hant": "走私罰款 {0} DB", ko: "밀무역 벌금 {0} DB"
  }),
  "Surrender illicit cargo": Object.freeze({
    "zh-Hans": "交出走私货物", ru: "Сдать контрабандный груз", es: "Entregar carga ilícita",
    "pt-BR": "Entregar carga clandestina", ja: "密輸品を引き渡す", de: "Illegale Ladung übergeben",
    fr: "Livrer la cargaison clandestine", pl: "Oddaj nielegalny ładunek",
    "zh-Hant": "交出走私貨物", ko: "밀수 화물 넘기기"
  }),
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
  const missing = PRUNE_ONLY ? [] : SCREEN_TEXT_TEMPLATES.filter((source) => (
    !REVIEWED_OVERRIDES[source]?.[locale.id] && (
      typeof existing[source] !== "string" ||
      (existing[source] === source && requiresTranslatedProse(source))
    )
  ));
  process.stdout.write(`${locale.id}: ${PRUNE_ONLY ? "pruning" : `translating ${missing.length} missing templates`}\n`);
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
      if (
        translation === source &&
        requiresTranslatedProse(source) &&
        !REVIEWED_OVERRIDES[source]?.[locale.id]
      ) {
        translation = restoreProtectedText(await translatePlainText(
          translationSource(source),
          locale
        ));
        translation = await repairChangedPlaceholders(source, translation, locale);
        translation = extractContextualTranslation(source, translation);
        if (translation === source) {
          throw new Error(`${locale.id} translation service left prose in English: ${source}`);
        }
      }
      if (isUppercaseDisplayText(source)) translation = translation.toLocaleUpperCase(locale.id);
      output[source] = translation;
    }
    process.stdout.write(`  ${index + 1}/${batches.length}\r`);
  }
  process.stdout.write("\n");
  return output;
}

function requiresTranslatedProse(value) {
  if (/MARQUE-AND-REPRISAL\.COM/i.test(value)) return false;
  if (/\b(?:Dogica|Galmuri11)\b/.test(value)) return false;
  if (!/\s/.test(value)) return false;
  return (value.match(/[A-Za-z]{2,}/g) || []).length >= 3;
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
