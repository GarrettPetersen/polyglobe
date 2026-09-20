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

// Preserve reviewed translations when an English source sentence is polished
// without changing its meaning. The next successful translation run can then
// retain the existing locale copy instead of exporting the renamed text.
const LEGACY_SOURCE_BY_SOURCE = Object.freeze({
  "AVG {0}": "AVG {0} DB",
  "Matanzas Bay gives us a defensible harbor. We will lay out St. Augustine here while the army turns north toward Fort Caroline.":
    "Matanzas Bay gives us a defensible harbor. We will lay out San Agustin here while the army turns north toward Fort Caroline.",
  "Menendez calls the plan St. Augustine, a permanent Spanish town where earlier Florida ventures failed.":
    "Menendez calls the plan San Agustin, a permanent Spanish town where earlier Florida ventures failed.",
  "St. Augustine needs grain before storms or war cut off the harbor.":
    "San Agustin needs grain before storms or war cut off the harbor.",
  "The granary is secure; St. Augustine can remain a town rather than another abandoned camp.":
    "The granary is secure; San Agustin can remain a town rather than another abandoned camp.",
  "You have done me a great service. Please accept {0}; it may serve you as well as you served me.":
    "You have done me a great service. Please take this {0}; it may serve you as well as you served me."
});

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
  ...reviewedSupplyAndBriefOverrides(),
  ...reviewedSpanishScreenOverrides(),
  ...reviewedStandingOverrides(),
  "PIRATE BOUNTY +{0} DB": Object.freeze({
    "zh-Hans": "海盗赏金 +{0} DB",
    ru: "НАГРАДА ЗА ПИРАТОВ +{0} DB",
    es: "RECOMPENSA POR PIRATAS +{0} DB",
    "pt-BR": "RECOMPENSA POR PIRATAS +{0} DB",
    ja: "海賊討伐報奨金 +{0} DB",
    de: "PIRATENKOPFGELD +{0} DB",
    fr: "PRIME AUX PIRATES +{0} DB",
    pl: "NAGRODA ZA PIRATÓW +{0} DB",
    "zh-Hant": "海盜賞金 +{0} DB",
    ko: "해적 현상금 +{0} DB"
  }),
  ...reviewedSoundDuesOverrides(),
  ...reviewedPlaytesterPolishOverrides(),
  // Retain or transliterate the regional fish name instead of translating it
  // as an unrelated word when the translation service lacks this species.
  "Shabout": Object.freeze({
    "zh-Hans": "沙布特鱼", "zh-Hant": "沙布特魚", ru: "Шабут",
    ja: "シャブート", ko: "샤부트", es: "Shabout", "pt-BR": "Shabout",
    de: "Shabout", fr: "Shabout", pl: "Shabout"
  }),
  "Norse": Object.freeze({
    "zh-Hans": "北欧人", "zh-Hant": "北歐人", ja: "北欧人", ko: "노르드인"
  }),
  "North Indian": Object.freeze({
    ja: "北インド人", ko: "북인도인"
  }),
  "South Indian": Object.freeze({
    ja: "南インド人", ko: "남인도인"
  }),
  "Malayali": Object.freeze({
    ja: "マラヤーリ人", ko: "말라얄리인"
  }),
  "Mon-Burmese": Object.freeze({
    ja: "モン・ビルマ系", ko: "몬·버마계"
  }),
  "Kongo": Object.freeze({ ja: "コンゴ" }),
  "Visit inn": Object.freeze({
    "zh-Hans": "前往客栈",
    ru: "Посетить трактир",
    es: "Visitar la posada",
    "pt-BR": "Visitar a estalagem",
    ja: "宿屋を訪ねる",
    de: "Gasthaus besuchen",
    fr: "Visiter l'auberge",
    pl: "Odwiedź zajazd",
    "zh-Hant": "前往客棧",
    ko: "여관 방문"
  }),
  "We need to be discreet. One official looking closely at our papers would end this disguise.": Object.freeze({
    "zh-Hans": "我们得谨慎行事。只要有一名官员仔细查验我们的文书，伪装就会败露。",
    ru: "Нам следует вести себя осторожно. Стоит чиновнику внимательно проверить наши бумаги — и прикрытие будет раскрыто.",
    es: "Debemos ser discretos. Bastaría con que un funcionario examinara bien nuestros papeles para descubrir nuestro disfraz.",
    "pt-BR": "Precisamos ser discretos. Basta um oficial examinar nossos papéis com atenção para desmascarar o disfarce.",
    ja: "慎重に動かねば。役人に書類を詳しく調べられれば、この変装は見破られる。",
    de: "Wir müssen unauffällig bleiben. Ein Beamter müsste unsere Papiere nur genauer prüfen, und unsere Tarnung wäre aufgeflogen.",
    fr: "Nous devons rester discrets. Il suffirait qu’un officier examine nos papiers de près pour découvrir notre déguisement.",
    pl: "Musimy zachować dyskrecję. Wystarczy, że urzędnik dokładnie sprawdzi nasze dokumenty, a przejrzy nasze przebranie.",
    "zh-Hant": "我們得謹慎行事。只要有一名官員仔細查驗我們的文書，偽裝就會敗露。",
    ko: "신중하게 행동해야 해. 관리 한 명이 서류를 자세히 살펴보기만 해도 우리 변장이 들통날 거야."
  }),
  "Traders carry word of your wealth farther than any ship. Your business shall have first hearing.": Object.freeze({
    "zh-Hans": "商人们把您财富的消息传得比任何船都远。您的生意会得到优先接洽。",
    ru: "Купцы разносят вести о вашем богатстве дальше любого корабля. Ваше дело выслушают первым.",
    es: "Los mercaderes llevan noticias de vuestra riqueza más lejos que cualquier nave. Vuestros asuntos tendrán audiencia primero.",
    "pt-BR": "Os mercadores levam notícias de vossa riqueza mais longe que qualquer navio. Vossos negócios terão a primeira audiência.",
    ja: "商人たちは、どの船よりも遠くまで貴殿の富を言い伝えております。貴殿の用件を真っ先に伺いましょう。",
    de: "Händler tragen die Kunde von Eurem Reichtum weiter als jedes Schiff. Euer Anliegen wird zuerst gehört.",
    fr: "Les marchands portent la nouvelle de votre fortune plus loin qu'aucun navire. Vos affaires seront entendues en premier.",
    pl: "Kupcy niosą wieść o waszym bogactwie dalej niż jakikolwiek okręt. Wasza sprawa zostanie wysłuchana jako pierwsza.",
    "zh-Hant": "商人們把您財富的消息傳得比任何船都遠。您的生意會得到優先接洽。",
    ko: "상인들은 어떤 배보다도 멀리 선장님의 부에 관한 소문을 전합니다. 선장님의 용무를 먼저 듣겠습니다."
  }),
  "Your purse could fit out a fleet, captain. I shall not trouble you with small courtesies.": Object.freeze({
    "zh-Hans": "船长，您的钱袋足以装备一支舰队。我就不拿小礼数耽搁您了。",
    ru: "Ваш кошель мог бы снарядить целый флот, капитан. Не стану задерживать вас мелкими любезностями.",
    es: "Vuestra bolsa podría armar una flota, capitán. No os entretendré con pequeñas cortesías.",
    "pt-BR": "Vossa bolsa poderia armar uma frota, capitão. Não vos deterei com pequenas cortesias.",
    ja: "船長、貴殿の財布なら艦隊一つを仕立てられましょう。些細な礼儀でお引き留めはいたしません。",
    de: "Euer Geldbeutel könnte eine Flotte ausrüsten, Kapitän. Ich will Euch nicht mit kleinen Höflichkeiten aufhalten.",
    fr: "Votre bourse pourrait armer une flotte, capitaine. Je ne vous retiendrai pas avec de menues politesses.",
    pl: "Wasza sakiewka mogłaby wyposażyć całą flotę, kapitanie. Nie będę was zatrzymywać drobnymi uprzejmościami.",
    "zh-Hant": "船長，您的錢袋足以裝備一支艦隊。我就不拿小禮數耽擱您了。",
    ko: "선장님의 돈이라면 함대 하나도 꾸릴 수 있겠습니다. 사소한 예법으로 붙들지는 않겠습니다."
  }),
  "The black flags have learned your sail, captain. They flee from it sooner than from our patrols.": Object.freeze({
    "zh-Hans": "船长，黑旗已经认得您的帆了。他们见您便逃，比见我们的巡船还快。",
    ru: "Чёрные флаги выучили ваши паруса, капитан. От них они бегут раньше, чем от наших дозоров.",
    es: "Las banderas negras ya conocen vuestra vela, capitán. Huyen de ella antes que de nuestras patrullas.",
    "pt-BR": "As bandeiras negras já conhecem vossas velas, capitão. Fogem delas antes que de nossas patrulhas.",
    ja: "船長、黒旗どもは貴殿の帆を覚えました。我らの巡船より先に、貴殿を見て逃げ出します。",
    de: "Die schwarzen Flaggen kennen Eure Segel, Kapitän. Vor ihnen fliehen sie früher als vor unseren Patrouillen.",
    fr: "Les pavillons noirs connaissent votre voile, capitaine. Ils la fuient avant même nos patrouilles.",
    pl: "Czarne bandery poznały wasze żagle, kapitanie. Uciekają przed nimi wcześniej niż przed naszymi patrolami.",
    "zh-Hant": "船長，黑旗已經認得您的帆了。他們見您便逃，比見我們的巡船還快。",
    ko: "선장, 검은 깃발들이 선장님의 돛을 알아봅니다. 우리 순찰선보다 선장님을 보고 먼저 달아납니다."
  }),
  "garrison commander": Object.freeze({
    "zh-Hans": "驻军司令", ru: "командир гарнизона", es: "comandante de la guarnición",
    "pt-BR": "comandante da guarnição", ja: "駐屯隊司令官", de: "Garnisonskommandant",
    fr: "commandant de la garnison", pl: "dowódca garnizonu", "zh-Hant": "駐軍司令",
    ko: "주둔군 사령관"
  }),
  "harbour master": Object.freeze({
    "zh-Hans": "港务长", ru: "начальник порта", es: "capitán del puerto",
    "pt-BR": "capitão do porto", ja: "港長", de: "Hafenmeister",
    fr: "capitaine de port", pl: "kapitan portu", "zh-Hant": "港務長", ko: "항만장"
  }),
  "All market trades were undone.": Object.freeze({
    "zh-Hans": "所有市场交易均已撤销。",
    ru: "Все сделки на рынке отменены.",
    es: "Se deshicieron todas las transacciones del mercado.",
    "pt-BR": "Todas as transações do mercado foram desfeitas.",
    ja: "市場での取引をすべて取り消しました。",
    de: "Alle Marktgeschäfte wurden rückgängig gemacht.",
    fr: "Toutes les transactions du marché ont été annulées.",
    pl: "Wszystkie transakcje na targu zostały cofnięte.",
    "zh-Hant": "所有市場交易均已撤銷。",
    ko: "시장 거래를 모두 되돌렸습니다."
  }),
  Buy: Object.freeze({
    "zh-Hans": "购买", ru: "Купить", es: "Comprar", "pt-BR": "Comprar", ja: "買う",
    de: "Kaufen", fr: "Acheter", pl: "Kup", "zh-Hant": "購買", ko: "구매"
  }),
  Market: Object.freeze({
    "zh-Hans": "市场", ru: "Рынок", es: "Mercado", "pt-BR": "Mercado", ja: "市場",
    de: "Markt", fr: "Marché", pl: "Targ", "zh-Hant": "市場", ko: "시장"
  }),
  Sell: Object.freeze({
    "zh-Hans": "卖出", ru: "Продать", es: "Vender", "pt-BR": "Vender", ja: "売る",
    de: "Verkaufen", fr: "Vendre", pl: "Sprzedaj", "zh-Hant": "賣出", ko: "판매"
  }),
  "Shall I strike every market trade made during this visit from the ledger and restore your coin, cargo, and the factor's stock?": Object.freeze({
    "zh-Hans": "要从账簿中划去本次造访期间的所有市场交易，并恢复你的钱币、货物和港口商人的库存吗？",
    ru: "Прикажете вычеркнуть из книги все сделки на рынке за это посещение и восстановить ваши монеты, груз и запасы портового купца?",
    es: "¿Queréis que tache del libro todas las transacciones del mercado realizadas durante esta visita y restituya vuestras monedas, la carga y las existencias del factor?",
    "pt-BR": "Quereis que eu risque do livro todas as transações do mercado feitas durante esta visita e restitua vossas moedas, carga e o estoque do feitor?",
    ja: "今回の訪問中に行った市場取引をすべて帳簿から消し、貴殿の貨幣と積荷、商館主の在庫を元に戻しますか？",
    de: "Soll ich alle Marktgeschäfte dieses Besuchs aus dem Hauptbuch streichen und Eure Münzen, Ladung und den Bestand des Faktors wiederherstellen?",
    fr: "Dois-je rayer du registre toutes les transactions du marché effectuées pendant cette visite et rétablir vos pièces, votre cargaison et le stock du facteur ?",
    pl: "Czy mam wykreślić z księgi wszystkie transakcje targowe dokonane podczas tej wizyty i przywrócić wasze monety, ładunek oraz zapasy faktora?",
    "zh-Hant": "要從賬簿中劃去本次造訪期間的所有市場交易，並恢復你的錢幣、貨物和港口商人的庫存嗎？",
    ko: "이번 방문 중 이뤄진 모든 시장 거래를 장부에서 지우고 선장님의 돈과 화물, 상관장의 재고를 되돌릴까요?"
  }),
  "The market trades remain entered in the ledger.": Object.freeze({
    "zh-Hans": "市场交易仍记在账簿中。",
    ru: "Сделки на рынке остаются записанными в книге.",
    es: "Las transacciones del mercado siguen asentadas en el libro.",
    "pt-BR": "As transações do mercado permanecem registradas no livro.",
    ja: "市場での取引は帳簿に残されています。",
    de: "Die Marktgeschäfte bleiben im Hauptbuch eingetragen.",
    fr: "Les transactions du marché restent inscrites au registre.",
    pl: "Transakcje targowe pozostają zapisane w księdze.",
    "zh-Hant": "市場交易仍記在賬簿中。",
    ko: "시장 거래는 장부에 그대로 기록되어 있습니다."
  }),
  "Undo all trades": Object.freeze({
    "zh-Hans": "撤销所有交易", ru: "Отменить все сделки", es: "Deshacer todas las transacciones",
    "pt-BR": "Desfazer todas as transações", ja: "すべての取引を取り消す",
    de: "Alle Geschäfte rückgängig machen", fr: "Annuler toutes les transactions",
    pl: "Cofnij wszystkie transakcje", "zh-Hant": "撤銷所有交易", ko: "모든 거래 되돌리기"
  }),
  "Assault armour coverage +{0}%": Object.freeze({
    "zh-Hans": "突击护甲覆盖 +{0}%", ru: "Покрытие брони при штурме +{0}%",
    es: "Cobertura de armadura en asalto +{0}%",
    "pt-BR": "Cobertura de armadura em assalto +{0}%",
    ja: "強襲時の装甲範囲 +{0}%", de: "Rüstungsdeckung beim Sturm +{0}%",
    fr: "Couverture d’armure en assaut +{0}%", pl: "Pokrycie pancerza w szturmie +{0}%",
    "zh-Hant": "突擊護甲覆蓋 +{0}%", ko: "강습 방어구 범위 +{0}%"
  }),
  ...reviewedCrewOverrides(),
  ...reviewedPortCityOverrides(),
  "Chan Chan has fallen. The company is ashore; Spain's flag flies over Trujillo. Keep the {0} doubloons. I march for Cuzco at dawn. If I live to take the empire, word will reach Trujillo; return then.": Object.freeze({
    "zh-Hans": "昌昌陷落了。部队已经登陆；西班牙旗帜飘扬在特鲁希略上空。留下这 {0} 枚达布隆。我黎明时向库斯科进军。若我能活着征服帝国，消息会传到特鲁希略；届时再回来。",
    ru: "Чан-Чан пал. Отряд высадился; над Трухильо реет испанский флаг. Оставьте себе {0} дублонов. На рассвете я выступаю к Куско. Если доживу до покорения империи, в Трухильо придёт весть; тогда возвращайтесь.",
    es: "Chan Chan ha caído. La compañía está en tierra; la bandera de España ondea sobre Trujillo. Conserva los {0} doblones. Marcho hacia Cuzco al amanecer. Si vivo para conquistar el imperio, la noticia llegará a Trujillo; vuelve entonces.",
    "pt-BR": "Chan Chan caiu. A companhia está em terra; a bandeira da Espanha tremula sobre Trujillo. Fique com os {0} dobrões. Marcho para Cuzco ao amanhecer. Se eu viver para conquistar o império, a notícia chegará a Trujillo; volte então.",
    ja: "チャン・チャンは陥落した。隊は上陸し、トルヒーリョにはスペインの旗が翻っている。{0}ダブロンは受け取れ。夜明けにクスコへ進軍する。生きて帝国を征服できたなら、報せはトルヒーリョに届く。その時に戻ってこい。",
    de: "Chan Chan ist gefallen. Die Kompanie ist an Land; Spaniens Flagge weht über Trujillo. Behaltet die {0} Dublonen. Bei Tagesanbruch marschiere ich nach Cuzco. Wenn ich die Eroberung des Reiches erlebe, erreicht Trujillo die Kunde; kehrt dann zurück.",
    fr: "Chan Chan est tombée. La compagnie a débarqué ; le drapeau espagnol flotte sur Trujillo. Gardez les {0} doublons. Je marche sur Cuzco à l’aube. Si je vis assez pour conquérir l’empire, la nouvelle parviendra à Trujillo ; revenez alors.",
    pl: "Chan Chan upadło. Kompania zeszła na ląd; nad Trujillo powiewa hiszpańska flaga. Zatrzymajcie {0} dublonów. O świcie ruszam na Cuzco. Jeśli dożyję podboju imperium, wieść dotrze do Trujillo; wtedy wróćcie.",
    "zh-Hant": "昌昌陷落了。部隊已經登陸；西班牙旗幟飄揚在特魯希略上空。留下這 {0} 枚達布隆。我黎明時向庫斯科進軍。若我能活著征服帝國，消息會傳到特魯希略；屆時再回來。",
    ko: "찬찬은 함락되었다. 원정대는 상륙했고 트루히요에는 스페인 깃발이 나부낀다. {0}더블룬은 가져라. 나는 새벽에 쿠스코로 진군한다. 살아서 제국을 정복한다면 트루히요에 소식이 닿을 테니, 그때 돌아오라."
  }),
  "CREW {0} GUNS {1}": Object.freeze({
    "zh-Hans": "船员 {0} 火炮 {1}", ru: "КОМАНДА {0} ПУШКИ {1}",
    es: "TRIPULACIÓN {0} CAÑONES {1}", "pt-BR": "TRIPULAÇÃO {0} CANHÕES {1}",
    ja: "乗組員 {0} 大砲 {1}", de: "MANNSCHAFT {0} KANONEN {1}",
    fr: "ÉQUIPAGE {0} CANONS {1}", pl: "ZAŁOGA {0} DZIAŁA {1}",
    "zh-Hant": "船員 {0} 火炮 {1}", ko: "선원 {0} 대포 {1}"
  }),
  "Switch to {0}": Object.freeze({
    "zh-Hans": "切换为{0}", ru: "Переключиться на {0}", es: "Cambiar a {0}",
    "pt-BR": "Mudar para {0}", ja: "{0}に切り替える", de: "Zu {0} wechseln",
    fr: "Passer à {0}", pl: "Przełącz na {0}", "zh-Hant": "切換為{0}",
    ko: "{0}(으)로 전환"
  }),
  "The harbor guns are silent. The conquistadors are lowering their boats. If the assault succeeds, Chan Chan will become Spanish Trujillo, and the company will march inland toward Cuzco.": Object.freeze({
    "zh-Hans": "港口炮台已经沉默。征服者们正在放下小艇。如果进攻成功，昌昌将成为西班牙的特鲁希略，部队随后将向内陆进军库斯科。",
    ru: "Портовые орудия умолкли. Конкистадоры спускают шлюпки. Если штурм удастся, Чан-Чан станет испанским Трухильо, а отряд двинется вглубь страны к Куско.",
    es: "Los cañones del puerto han callado. Los conquistadores están arriando sus botes. Si el asalto triunfa, Chan Chan se convertirá en la Trujillo española y la compañía marchará tierra adentro hacia Cuzco.",
    "pt-BR": "Os canhões do porto silenciaram. Os conquistadores estão baixando os botes. Se o ataque for bem-sucedido, Chan Chan se tornará a Trujillo espanhola, e a companhia marchará para o interior rumo a Cuzco.",
    ja: "港の砲台は沈黙した。コンキスタドールたちがボートを降ろしている。襲撃が成功すれば、チャン・チャンはスペイン領トルヒーリョとなり、隊は内陸のクスコへ進軍する。",
    de: "Die Hafengeschütze schweigen. Die Konquistadoren lassen ihre Boote zu Wasser. Gelingt der Sturm, wird Chan Chan zum spanischen Trujillo, und die Kompanie marschiert landeinwärts nach Cuzco.",
    fr: "Les canons du port se sont tus. Les conquistadors mettent leurs chaloupes à l’eau. Si l’assaut réussit, Chan Chan deviendra la Trujillo espagnole et la compagnie marchera dans les terres vers Cuzco.",
    pl: "Działa portowe umilkły. Konkwistadorzy opuszczają łodzie. Jeśli szturm się powiedzie, Chan Chan stanie się hiszpańskim Trujillo, a kompania pomaszeruje w głąb lądu ku Cuzco.",
    "zh-Hant": "港口炮臺已經沉默。征服者們正在放下小艇。如果進攻成功，昌昌將成為西班牙的特魯希略，部隊隨後將向內陸進軍庫斯科。",
    ko: "항구 포대가 침묵했다. 콩키스타도르들이 보트를 내리고 있다. 공격에 성공하면 찬찬은 스페인령 트루히요가 되고, 원정대는 내륙의 쿠스코로 진군한다."
  }),
  ...reviewedShipyardListingOverrides(),
  ...reviewedPortFactorRecognitionOverrides(),
  ...reviewedTreasurePirateSearchOverrides(),
  "The hoard is ours: {0} units of gold and Captain {1}'s treasure. Every pirate afloat will hunt us. Set course for {2}; I marked it on the chart. The old crew bars the way.": Object.freeze({
    "zh-Hans": "宝藏归我们了：{0}份黄金，还有{1}船长的宝物。海上的每个海盗都会来追杀我们。转舵驶向{2}；我已在海图上标出航路。那帮旧船员会挡道。",
    ru: "Клад наш: {0} мер золота и сокровище капитана {1}. Теперь за нами погонится всякий пират на море. Держать курс на {2}; я отметил путь на карте. Старая команда преградит дорогу.",
    es: "El botín es nuestro: {0} unidades de oro y el tesoro del capitán {1}. Todo pirata en el mar nos dará caza. Poned rumbo a {2}; lo he trazado en la carta. La antigua tripulación nos cerrará el paso.",
    "pt-BR": "O tesouro é nosso: {0} unidades de ouro e o tesouro do capitão {1}. Todo pirata no mar nos dará caça. Ponde o rumo para {2}; marquei-o na carta. A antiga tripulação nos barrará o caminho.",
    ja: "財宝は我らのものだ。金{0}単位と{1}船長の宝だ。海に浮かぶ海賊どもが我らを追うだろう。{2}へ針路を取れ。海図に印を付けた。古い船員どもが行く手を塞ぐ。",
    de: "Der Hort ist unser: {0} Einheiten Gold und Kapitän {1}s Schatz. Jeder Pirat auf See wird Jagd auf uns machen. Kurs auf {2}; ich habe ihn in der Karte vermerkt. Die alte Mannschaft versperrt uns den Weg.",
    fr: "Le butin est à nous : {0} unités d'or et le trésor du capitaine {1}. Tous les pirates en mer nous donneront la chasse. Cap sur {2} ; je l'ai tracé sur la carte. L'ancien équipage nous barrera la route.",
    pl: "Łup jest nasz: {0} jednostek złota i skarb kapitana {1}. Każdy pirat na morzu ruszy za nami. Kurs na {2}; zaznaczyłem go na mapie. Dawna załoga zagrodzi nam drogę.",
    "zh-Hant": "寶藏歸我們了：{0}份黃金，還有{1}船長的寶物。海上的每個海盜都會來追殺我們。轉舵駛向{2}；我已在海圖上標出航路。那幫舊船員會擋道。",
    ko: "보물은 우리 것이다. 금 {0}단위와 {1} 선장의 보물이다. 바다의 해적이라면 모조리 우리를 쫓을 것이다. {2}으로 침로를 잡아라. 해도에 표시해 두었다. 옛 선원들이 길을 막을 것이다."
  }),
  "The hold cannot take another coin, but Captain {0}'s treasure is ours. Every pirate afloat will hunt us. Set course for {1}; I marked it on the chart. The old crew bars the way.": Object.freeze({
    "zh-Hans": "货舱连一枚金币也装不下了，但{0}船长的宝物已归我们。海上的每个海盗都会来追杀我们。转舵驶向{1}；我已在海图上标出航路。那帮旧船员会挡道。",
    ru: "Трюм не примет больше ни монеты, но сокровище капитана {0} у нас. Всякий пират на море будет за нами охотиться. Держать курс на {1}; я отметил путь на карте. Старая команда преградит дорогу.",
    es: "La bodega no admite una moneda más, pero el tesoro del capitán {0} es nuestro. Todo pirata en el mar nos dará caza. Poned rumbo a {1}; lo he trazado en la carta. La antigua tripulación nos cerrará el paso.",
    "pt-BR": "O porão não recebe mais uma moeda, mas o tesouro do capitão {0} é nosso. Todo pirata no mar nos dará caça. Ponde o rumo para {1}; marquei-o na carta. A antiga tripulação nos barrará o caminho.",
    ja: "船倉にはもう一枚の金貨も入らぬが、{0}船長の宝は我らのものだ。海に浮かぶ海賊どもが我らを追うだろう。{1}へ針路を取れ。海図に印を付けた。古い船員どもが行く手を塞ぐ。",
    de: "Der Laderaum fasst keine Münze mehr, doch Kapitän {0}s Schatz ist unser. Jeder Pirat auf See wird Jagd auf uns machen. Kurs auf {1}; ich habe ihn in der Karte vermerkt. Die alte Mannschaft versperrt uns den Weg.",
    fr: "La cale ne peut prendre une pièce de plus, mais le trésor du capitaine {0} est à nous. Tous les pirates en mer nous donneront la chasse. Cap sur {1} ; je l'ai tracé sur la carte. L'ancien équipage nous barrera la route.",
    pl: "Ładownia nie przyjmie już ani monety, lecz skarb kapitana {0} jest nasz. Każdy pirat na morzu ruszy za nami. Kurs na {1}; zaznaczyłem go na mapie. Dawna załoga zagrodzi nam drogę.",
    "zh-Hant": "貨艙連一枚金幣也裝不下了，但{0}船長的寶物已歸我們。海上的每個海盜都會來追殺我們。轉舵駛向{1}；我已在海圖上標出航路。那幫舊船員會擋道。",
    ko: "화물창에는 동전 한 닢도 더 들지 않지만 {0} 선장의 보물은 우리 것이다. 바다의 해적이라면 모조리 우리를 쫓을 것이다. {1}으로 침로를 잡아라. 해도에 표시해 두었다. 옛 선원들이 길을 막을 것이다."
  }),
  "EMBARGO FINE {0} DB": Object.freeze({
    "pt-BR": "MULTA POR EMBARGO {0} DB",
    ja: "禁輸違反金 {0} DB",
    ko: "금수 조치 위반 벌금 {0} DB"
  }),
  "Set heading: {0} ({1}; harbor barred)": Object.freeze({
    "zh-Hans": "设定航向：{0}（{1}；港口禁止入内）",
    ru: "Проложить курс: {0} ({1}; вход в гавань запрещён)",
    es: "Trazar rumbo: {0} ({1}; acceso al puerto prohibido)",
    "pt-BR": "Traçar rumo: {0} ({1}; entrada no porto proibida)",
    ja: "針路を設定：{0}（{1}、入港禁止）",
    de: "Kurs setzen: {0} ({1}; Hafeneinfahrt verwehrt)",
    fr: "Mettre le cap : {0} ({1} ; accès au port interdit)",
    pl: "Wyznacz kurs: {0} ({1}; wstęp do portu wzbroniony)",
    "zh-Hant": "設定航向：{0}（{1}；港口禁止入內）",
    ko: "침로 설정: {0} ({1}, 입항 금지)"
  }),
  "The nearest known {0} supply is at {1}, though its harbor is barred to us.": Object.freeze({
    "zh-Hans": "已知最近的{0}货源在{1}，但该港不准我们入内。",
    ru: "Ближайший известный запас {0} находится в {1}, но вход в эту гавань нам запрещён.",
    es: "El suministro conocido de {0} más cercano está en {1}, aunque se nos prohíbe entrar en su puerto.",
    "pt-BR": "O suprimento conhecido de {0} mais próximo fica em {1}, embora a entrada naquele porto nos seja proibida.",
    ja: "最も近い既知の{0}の供給地は{1}ですが、その港への入港は禁じられています。",
    de: "Der nächste bekannte Vorrat an {0} liegt in {1}, doch die Hafeneinfahrt ist uns verwehrt.",
    fr: "La source connue de {0} la plus proche se trouve à {1}, mais l'entrée de ce port nous est interdite.",
    pl: "Najbliższy znany zapas {0} znajduje się w {1}, lecz wstęp do tamtejszego portu jest nam wzbroniony.",
    "zh-Hant": "已知最近的{0}貨源在{1}，但該港不准我們入內。",
    ko: "가장 가까운 {0} 공급지는 {1}이지만, 그 항구에는 들어갈 수 없습니다."
  }),
  ...reviewedWarLoanOverrides(),
  ...reviewedWhaleRamOverrides(),
  "Petition for a capture warrant": Object.freeze({
    "zh-Hans": "请求颁发港口占领敕令",
    ru: "Просить грамоту на захват порта",
    es: "Solicitar una comisión de conquista",
    "pt-BR": "Pedir uma comissão de conquista",
    ja: "港湾攻略の勅許を願い出る",
    de: "Um einen Eroberungsauftrag ersuchen",
    fr: "Solliciter une commission de conquête",
    pl: "Prosić o zlecenie zdobycia portu",
    "zh-Hant": "請求頒發港口佔領敕令",
    ko: "항구 점령 위임장을 청원한다"
  }),
  "A letter of marque licenses prizes at sea; it does not grant its bearer the choice of a harbor. Name the enemy. The council will judge the war's need; any warrant granted will name the port.": Object.freeze({
    "zh-Hans": "私掠许可证准许在海上夺取战利船，却不把港口的选择交给持证人。说出你请求与之交战的敌国。议政会将裁定夺港是否有利于战事；若准所请，敕令自会写明目标港口。",
    ru: "Каперская грамота дозволяет брать призы в море, но не отдаёт её держателю выбор гавани. Назовите державу, против которой ходатайствуете. Военный совет решит, послужит ли захват ходу войны; если просьба будет удовлетворена, в грамоте будет назван порт.",
    es: "Una patente de corso autoriza a tomar presas en el mar; no entrega a su titular la elección de un puerto. Nombrad a la potencia contra la que suplicáis. El consejo decidirá si una conquista conviene a la guerra y, si concede la comisión, señalará el puerto.",
    "pt-BR": "Uma carta de corso autoriza a tomar presas no mar; não entrega ao portador a escolha de um porto. Nomeai a potência contra a qual fazeis a petição. O conselho decidirá se a conquista serve à guerra e, se conceder a comissão, nomeará o porto.",
    ja: "私掠免許状は海上で敵船を拿捕する権利を与えるが、どの港を攻めるかまで持ち主に委ねるものではない。請願の相手となる敵国を申せ。評議会がその攻略が戦の利となるかを裁き、許されれば勅許状に港の名を記す。",
    de: "Ein Kaperbrief erlaubt, auf See Prisen zu nehmen; die Wahl eines Hafens überlässt er seinem Träger nicht. Nennt die Macht, gegen die Ihr Bittschrift einreicht. Der Kriegsrat entscheidet, ob eine Eroberung dem Krieg dient, und nennt im Auftrag den Hafen, falls er ihn gewährt.",
    fr: "Une lettre de marque autorise les prises en mer ; elle ne remet pas à son porteur le choix d'un port. Nommez la puissance contre laquelle vous présentez requête. Le conseil décidera si une conquête sert la guerre et, s'il accorde la commission, celle-ci désignera le port.",
    pl: "List kaperski pozwala brać pryzy na morzu, lecz nie oddaje jego posiadaczowi wyboru portu. Wskażcie państwo, przeciw któremu prosicie o zlecenie. Rada rozstrzygnie, czy zdobycie służy wojnie, a jeśli przychyli się do prośby, w dokumencie wskaże port.",
    "zh-Hant": "私掠許可證准許在海上奪取戰利船，卻不把港口的選擇交給持證人。說出你請求與之交戰的敵國。議政會將裁定奪港是否有利於戰事；若准所請，敕令自會寫明目標港口。",
    ko: "사략 허가장은 바다에서 적선을 나포할 권한을 줄 뿐, 어느 항구를 칠지까지 소지자에게 맡기지는 않는다. 청원하려는 적국을 말하라. 조정의 회의가 그 점령이 전쟁에 이로운지 판단하고, 허락한다면 위임장에 목표 항구를 적을 것이다."
  }),
  "Petition against {0}": Object.freeze({
    "zh-Hans": "请求出兵攻取{0}", ru: "Ходатайствовать против {0}",
    es: "Suplicar una comisión contra {0}", "pt-BR": "Pedir comissão contra {0}",
    ja: "{0}に対する攻略を願い出る", de: "Um einen Auftrag gegen {0} ersuchen",
    fr: "Solliciter une commission contre {0}", pl: "Prosić o zlecenie przeciw {0}",
    "zh-Hant": "請求出兵攻取{0}", ko: "{0}을 상대로 청원한다"
  }),
  "The court will weigh your service and the needs of the war.": Object.freeze({
    "zh-Hans": "朝廷会衡量你的功劳与战事所需。", ru: "Двор взвесит ваши заслуги и нужды войны.",
    es: "La corte sopesará vuestros servicios y las necesidades de la guerra.",
    "pt-BR": "A corte pesará vossos serviços e as necessidades da guerra.",
    ja: "宮廷はそなたの功績と戦の要を量る。", de: "Der Hof wird Eure Dienste und die Erfordernisse des Krieges abwägen.",
    fr: "La cour pèsera vos services et les nécessités de la guerre.",
    pl: "Dwór rozważy wasze zasługi i potrzeby wojny.",
    "zh-Hant": "朝廷會衡量你的功勞與戰事所需。", ko: "조정은 그대의 공적과 전쟁의 형편을 함께 헤아릴 것이다."
  }),
  "The council has answered this petition. Return in {0} days.": Object.freeze({
    "zh-Hans": "议政会已对此作出答复。{0}日后再来。", ru: "Совет уже ответил на это ходатайство. Возвращайтесь через {0} дней.",
    es: "El consejo ya ha respondido a esta súplica. Volved dentro de {0} días.",
    "pt-BR": "O conselho já respondeu a esta petição. Voltai em {0} dias.",
    ja: "評議会はすでにこの請願へ返答した。{0}日後に戻れ。", de: "Der Rat hat diese Bittschrift bereits beschieden. Kehrt in {0} Tagen zurück.",
    fr: "Le conseil a déjà répondu à cette requête. Revenez dans {0} jours.",
    pl: "Rada już odpowiedziała na tę prośbę. Wróćcie za {0} dni.",
    "zh-Hant": "議政會已對此作出答覆。{0}日後再來。", ko: "회의는 이미 이 청원에 답했다. {0}일 뒤에 다시 오라."
  }),
  "The council has heard your petition against {0}. {1} grants a warrant, but its object is fixed under seal: take {2}, raise {3} colors, and return for {4} doubloons.": Object.freeze({
    "zh-Hans": "议政会已审理你针对{0}的请求。{1}准发敕令，但目标已封缄写定：夺取{2}，升起{3}旗帜，返航后领赏{4}达布隆。",
    ru: "Военный совет рассмотрел ваше ходатайство против {0}. {1} жалует грамоту, но цель в ней скреплена печатью: возьмите {2}, поднимите {3} знамя и возвращайтесь за {4} дублонами.",
    es: "El consejo ha oído vuestra súplica contra {0}. {1} concede la comisión, pero su objetivo queda fijado bajo sello: tomad {2}, izad los colores {3} y regresad por {4} doblones.",
    "pt-BR": "O conselho ouviu vossa petição contra {0}. {1} concede a comissão, mas o alvo fica fixado sob selo: tomai {2}, hasteai as cores {3} e voltai por {4} dobrões.",
    ja: "{0}に対するそなたの請願を評議会は聞き届けた。{1}は勅許を与えるが、目標は封印の下に定められている。{2}を攻略し、{3}の旗を掲げ、帰還すれば{4}ダブロンを与える。",
    de: "Der Kriegsrat hat Eure Bittschrift gegen {0} gehört. {1} gewährt den Auftrag, doch sein Ziel ist unter Siegel festgelegt: Nehmt {2}, hisst die {3} Flagge und kehrt für {4} Dublonen zurück.",
    fr: "Le conseil a entendu votre requête contre {0}. {1} accorde la commission, mais son objectif est fixé sous le sceau : prenez {2}, hissez les couleurs {3} et revenez toucher {4} doublons.",
    pl: "Rada wysłuchała waszej prośby przeciw {0}. {1} udziela zlecenia, lecz jego cel zapisano pod pieczęcią: zdobądźcie {2}, wznieście {3} barwy i wróćcie po {4} dublonów.",
    "zh-Hant": "議政會已審理你針對{0}的請求。{1}准發敕令，但目標已封緘寫定：奪取{2}，升起{3}旗幟，返航後領賞{4}達布隆。",
    ko: "회의는 {0}을 상대로 한 그대의 청원을 들었다. {1}께서 위임장을 내리시되, 목표는 봉인 아래 정해져 있다. {2}을 점령하고 {3} 깃발을 올린 뒤 돌아오면 {4}더블룬을 받을 것이다."
  }),
  "Accept the warrant: capture {0}": Object.freeze({
    "zh-Hans": "接领敕令：夺取{0}", ru: "Принять грамоту: захватить {0}",
    es: "Aceptar la comisión: tomar {0}", "pt-BR": "Aceitar a comissão: tomar {0}",
    ja: "勅許を受ける：{0}を攻略する", de: "Auftrag annehmen: {0} erobern",
    fr: "Accepter la commission : prendre {0}", pl: "Przyjąć zlecenie: zdobyć {0}",
    "zh-Hant": "接領敕令：奪取{0}", ko: "위임장을 받는다: {0} 점령"
  }),
  "Your service is well spoken of, but the council will issue no warrant against {0} at present. Return when the campaign has altered.": Object.freeze({
    "zh-Hans": "众人都称道你的功劳，但议政会眼下不会颁发攻取{0}的敕令。待战局有变再来。",
    ru: "О вашей службе говорят с похвалой, но ныне совет не выдаст грамоты против {0}. Возвращайтесь, когда ход кампании изменится.",
    es: "Vuestros servicios reciben elogios, pero el consejo no expedirá ahora comisión contra {0}. Volved cuando cambie la campaña.",
    "pt-BR": "Vossos serviços são louvados, mas o conselho não emitirá agora comissão contra {0}. Voltai quando a campanha mudar.",
    ja: "そなたの功績は高く評されている。だが今、評議会は{0}に対する勅許を出さぬ。戦況が変われば戻れ。",
    de: "Eure Dienste werden gerühmt, doch der Rat wird gegenwärtig keinen Auftrag gegen {0} erteilen. Kehrt zurück, wenn sich der Feldzug gewandelt hat.",
    fr: "Vos services sont tenus en haute estime, mais le conseil ne délivrera pour l'heure aucune commission contre {0}. Revenez lorsque la campagne aura changé.",
    pl: "Wasza służba cieszy się dobrą opinią, lecz rada nie wyda teraz zlecenia przeciw {0}. Wróćcie, gdy kampania przybierze inny obrót.",
    "zh-Hant": "眾人都稱道你的功勞，但議政會眼下不會頒發攻取{0}的敕令。待戰局有變再來。",
    ko: "그대의 공적은 높이 평가받고 있다. 그러나 지금 회의는 {0}을 상대로 한 위임장을 내리지 않을 것이다. 전황이 달라지면 다시 오라."
  }),
  "No warrant shall issue against {0}. A captain may offer service, but the court conducts the war. Return when your credit or the campaign has altered.": Object.freeze({
    "zh-Hans": "议政会已听取你针对{0}的请求。敕令不予颁发。船长可以请命效力，但用兵之权在朝廷。待你的声望更高，或战局有变，再来。",
    ru: "Совет рассмотрел ваше ходатайство против {0}. Грамота выдана не будет. Капитан вправе предложить службу, но войной распоряжается двор. Возвращайтесь, когда ваш вес при дворе возрастёт или ход кампании изменится.",
    es: "El consejo ha oído vuestra súplica contra {0}. No se expedirá comisión. Un capitán puede ofrecer sus servicios, pero la dirección de la guerra corresponde a la corte. Volved cuando vuestro crédito sea mayor o cambie la campaña.",
    "pt-BR": "O conselho ouviu vossa petição contra {0}. Não será emitida comissão. Um capitão pode oferecer serviço, mas a condução da guerra pertence à corte. Voltai quando vosso crédito for maior ou a campanha mudar.",
    ja: "評議会は{0}に対するそなたの請願を聞いた。勅許は出さぬ。船長が奉仕を申し出ることはできるが、戦を指図するのは宮廷である。宮廷での信用が増すか、戦況が変われば戻れ。",
    de: "Der Rat hat Eure Bittschrift gegen {0} gehört. Ein Auftrag wird nicht erteilt. Ein Kapitän mag seinen Dienst anbieten, doch die Führung des Krieges liegt beim Hof. Kehrt zurück, wenn Euer Ansehen größer ist oder sich der Feldzug gewandelt hat.",
    fr: "Le conseil a entendu votre requête contre {0}. Aucune commission ne sera délivrée. Un capitaine peut offrir ses services, mais la conduite de la guerre appartient à la cour. Revenez lorsque votre crédit sera plus grand ou que la campagne aura changé.",
    pl: "Rada wysłuchała waszej prośby przeciw {0}. Zlecenie nie zostanie wydane. Kapitan może zaoferować służbę, lecz prowadzenie wojny należy do dworu. Wróćcie, gdy wasze znaczenie wzrośnie albo kampania przybierze inny obrót.",
    "zh-Hant": "議政會已聽取你針對{0}的請求。敕令不予頒發。船長可以請命效力，但用兵之權在朝廷。待你的聲望更高，或戰局有變，再來。",
    ko: "회의는 {0}을 상대로 한 그대의 청원을 들었다. 위임장은 내리지 않는다. 선장은 봉사를 청할 수 있으나 전쟁을 이끄는 권한은 조정에 있다. 조정에서의 신망이 더 높아지거나 전황이 달라지면 돌아오라."
  }),
  "Return to the quay": Object.freeze({
    "zh-Hans": "返回码头", ru: "Вернуться на пристань", es: "Volver al muelle",
    "pt-BR": "Voltar ao cais", ja: "波止場へ戻る", de: "Zum Kai zurückkehren",
    fr: "Retourner au quai", pl: "Wrócić na nabrzeże", "zh-Hant": "返回碼頭",
    ko: "부두로 돌아간다"
  }),
  "The flag you serve is at war with {0}. You may batter the harbor and carry off lawful spoil, but only a ruler's express commission can bring {1} under another obedience.": Object.freeze({
    "zh-Hans": "你所效忠的旗帜正与{0}交战。你可以轰击港口，夺取合法战利品；但只有君主的明令委任，方能使{1}改奉他主。",
    ru: "Держава, под чьим флагом вы служите, воюет с {0}. Вы вправе обстрелять гавань и взять законную добычу, но лишь прямая грамота государя может привести {1} под иную власть.",
    es: "La bandera a la que servís está en guerra con {0}. Podéis batir el puerto y tomar presa legítima, pero solo una comisión expresa de un soberano puede poner a {1} bajo otra obediencia.",
    "pt-BR": "A bandeira a que servis está em guerra com {0}. Podeis bombardear o porto e tomar presa legítima, mas somente uma comissão expressa de um soberano pode pôr {1} sob outra obediência.",
    ja: "あなたが仕える旗は{0}と戦争中です。港を砲撃し、正当な戦利品を持ち帰ることはできますが、{1}を別の主君に服させるには、君主の明確な委任状が要ります。",
    de: "Die Flagge, der Ihr dient, steht mit {0} im Krieg. Ihr dürft den Hafen beschießen und rechtmäßige Beute nehmen, doch nur der ausdrückliche Auftrag eines Herrschers kann {1} unter einen anderen Gehorsam bringen.",
    fr: "La bannière que vous servez est en guerre contre {0}. Vous pouvez battre le port et emporter une prise légitime, mais seule la commission expresse d'un souverain peut placer {1} sous une autre obédience.",
    pl: "Bandera, której służycie, prowadzi wojnę z {0}. Możecie ostrzelać port i zabrać prawowity łup, lecz tylko wyraźne zlecenie władcy może oddać {1} pod inne posłuszeństwo.",
    "zh-Hant": "你所效忠的旗幟正與{0}交戰。你可以轟擊港口，奪取合法戰利品；但只有君主的明令委任，方能使{1}改奉他主。",
    ko: "그대가 섬기는 깃발은 {0}와 전쟁 중이오. 항구를 포격하고 정당한 전리품을 거둘 수는 있으나, {1}을 다른 군주의 지배 아래 들이려면 통치자의 명시적인 위임장이 있어야 하오."
  }),
  "Camel_walk": Object.freeze({
    "zh-Hans": "单峰骆驼行走", ru: "Шагающий дромадер", es: "Dromedario caminando",
    "pt-BR": "Dromedário caminhando", ja: "歩くヒトコブラクダ", de: "Gehendes Dromedar",
    fr: "Dromadaire en marche", pl: "Idący dromader", "zh-Hant": "單峰駱駝行走",
    ko: "걷는 단봉낙타"
  }),
  "Bactrian_camel_low_poly": Object.freeze({
    "zh-Hans": "低多边形双峰骆驼", ru: "Низкополигональный бактриан",
    es: "Camello bactriano de baja poligonización", "pt-BR": "Camelo-bactriano low poly",
    ja: "ローポリのフタコブラクダ", de: "Low-Poly-Trampeltier",
    fr: "Chameau de Bactriane low poly", pl: "Niskopoligonowy wielbłąd dwugarbny",
    "zh-Hant": "低多邊形雙峰駱駝", ko: "로우 폴리 쌍봉낙타"
  }),
  "We need our {0} for a commission. Sell it anyway?": Object.freeze({
    "zh-Hans": "我们需要这批{0}来完成委托。仍要出售吗？",
    ru: "Этот груз {0} нужен нам для поручения. Всё равно продать?",
    es: "Necesitamos esta carga de {0} para un encargo. ¿Venderla de todos modos?",
    "pt-BR": "Precisamos desta carga de {0} para uma missão. Vender mesmo assim?",
    ja: "この{0}は依頼に必要だ。それでも売るか？",
    de: "Wir brauchen diese Ladung {0} für einen Auftrag. Trotzdem verkaufen?",
    fr: "Nous avons besoin de cette cargaison de {0} pour une mission. La vendre quand même ?",
    pl: "Ten ładunek {0} jest nam potrzebny do zlecenia. Mimo to sprzedać?",
    "zh-Hant": "我們需要這批{0}來完成委託。仍要出售嗎？",
    ko: "이 {0} 화물은 의뢰에 필요하다. 그래도 팔까?"
  }),
  "Sell it anyway": Object.freeze({
    "zh-Hans": "仍然出售",
    ru: "Всё равно продать",
    es: "Venderla de todos modos",
    "pt-BR": "Vender mesmo assim",
    ja: "それでも売る",
    de: "Trotzdem verkaufen",
    fr: "La vendre quand même",
    pl: "Mimo to sprzedać",
    "zh-Hant": "仍然出售",
    ko: "그래도 판다"
  }),
  "Keep it aboard": Object.freeze({
    "zh-Hans": "留在船上",
    ru: "Оставить на борту",
    es: "Dejarla a bordo",
    "pt-BR": "Manter a bordo",
    ja: "船に残す",
    de: "An Bord behalten",
    fr: "La garder à bord",
    pl: "Zostawić na pokładzie",
    "zh-Hant": "留在船上",
    ko: "배에 둔다"
  }),
  "The quest cargo remains aboard.": Object.freeze({
    "zh-Hans": "任务货物仍留在船上。",
    ru: "Груз для поручения остался на борту.",
    es: "La carga del encargo permanece a bordo.",
    "pt-BR": "A carga da missão continua a bordo.",
    ja: "依頼の積荷は船に残した。",
    de: "Die Ladung für den Auftrag bleibt an Bord.",
    fr: "La cargaison de la mission reste à bord.",
    pl: "Ładunek potrzebny do zlecenia pozostał na pokładzie.",
    "zh-Hant": "任務貨物仍留在船上。",
    ko: "의뢰 화물은 배에 남겨 두었다."
  }),
  "Peace may hold between our flags, but your name is cursed in {0}. Keep away, or we will defend ourselves!": Object.freeze({
    "zh-Hans": "我们的旗帜之间或许已经停战，但你的名字在{0}仍受唾骂。离远些，否则我们就自卫！",
    ru: "Между нашими флагами может быть мир, но в {0} ваше имя проклято. Держитесь подальше, иначе мы будем защищаться!",
    es: "Puede haber paz entre nuestras banderas, pero vuestro nombre está maldito en {0}. ¡Manteneos lejos o nos defenderemos!",
    "pt-BR": "Pode haver paz entre nossas bandeiras, mas seu nome é maldito em {0}. Fique longe ou vamos nos defender!",
    ja: "我らの旗同士は和平を結んだかもしれぬが、{0}では貴殿の名は呪われている。近づくな、さもなくば自衛する！",
    de: "Zwischen unseren Flaggen mag Frieden herrschen, doch Euer Name ist in {0} verflucht. Bleibt fern, sonst verteidigen wir uns!",
    fr: "La paix règne peut-être entre nos pavillons, mais votre nom est maudit en {0}. Restez à distance, ou nous nous défendrons !",
    pl: "Między naszymi banderami może panować pokój, lecz w {0} wasze imię jest przeklęte. Trzymajcie się z dala, inaczej będziemy się bronić!",
    "zh-Hant": "我們的旗幟之間或許已經停戰，但你的名字在{0}仍受唾罵。離遠些，否則我們就自衛！",
    ko: "우리 두 깃발 사이에는 평화가 있을지 몰라도, {0}에서는 선장 이름이 저주받았소. 물러나시오. 아니면 우리도 방어하겠소!"
  }),
  "Your flag is not our quarrel, captain. You are. {0} has declared you an outlaw. Heave to!": Object.freeze({
    "zh-Hans": "船长，我们的敌人不是你的旗帜，而是你本人。{0}已宣布你为不法之徒。立即停船！",
    ru: "Не ваш флаг нам враг, капитан. Вы. Власти {0} объявили вас вне закона. Лечь в дрейф!",
    es: "El problema no es vuestra bandera, capitán. Sois vos. {0} os ha declarado fuera de la ley. ¡Poneos al pairo!",
    "pt-BR": "A questão não é sua bandeira, capitão. É você. {0} declarou você fora da lei. Pare o navio!",
    ja: "争いがあるのは貴船の旗ではない、船長。貴殿自身だ。{0}は貴殿を無法者と宣告した。停船せよ！",
    de: "Nicht Eure Flagge ist unser Feind, Kapitän. Ihr seid es. {0} hat Euch zum Geächteten erklärt. Beidrehen!",
    fr: "Ce n'est pas votre pavillon qui nous querelle, capitaine. C'est vous. {0} vous a déclaré hors-la-loi. Mettez en panne !",
    pl: "Nie z waszą banderą mamy zatarg, kapitanie. Z wami. Władcy {0} uznali was za banitę. Położyć się w dryf!",
    "zh-Hant": "船長，我們的敵人不是你的旗幟，而是你本人。{0}已宣告你為不法之徒。立即停船！",
    ko: "문제는 선장 깃발이 아니라 선장 자신이오. {0} 당국은 선장을 무법자로 선포했소. 정선하시오!"
  }),
  "PET IT": Object.freeze({
    "zh-Hans": "摸摸它", ru: "ПОГЛАДИТЬ", es: "ACARICIARLO", "pt-BR": "ACARICIAR",
    ja: "撫でる", de: "STREICHELN", fr: "LE CARESSER", pl: "POGŁASKAĆ",
    "zh-Hant": "摸摸牠", ko: "쓰다듬는다"
  }),
  "DON'T PET IT": Object.freeze({
    "zh-Hans": "别摸它", ru: "НЕ ГЛАДИТЬ", es: "NO ACARICIARLO", "pt-BR": "NÃO ACARICIAR",
    ja: "撫でない", de: "NICHT STREICHELN", fr: "NE PAS LE CARESSER", pl: "NIE GŁASKAĆ",
    "zh-Hant": "別摸牠", ko: "쓰다듬지 않는다"
  }),
  "It is a wild hunter, but it is also a dog. Shall I pet it?": Object.freeze({
    "zh-Hans": "它是凶猛的猎手，但终究也是狗。我要摸摸它吗？",
    ru: "Это дикий охотник, но всё же собака. Погладить его?",
    es: "Es un cazador salvaje, pero sigue siendo un perro. ¿Lo acaricio?",
    "pt-BR": "É um caçador selvagem, mas continua sendo um cachorro. Devo acariciá-lo?",
    ja: "野生の狩人だが、やはり犬でもある。撫でてみようか？",
    de: "Es ist ein wilder Jäger, aber eben auch ein Hund. Soll ich ihn streicheln?",
    fr: "C'est un chasseur sauvage, mais c'est tout de même un chien. Dois-je le caresser ?",
    pl: "To dziki łowca, ale jednak pies. Pogłaskać go?",
    "zh-Hant": "牠是兇猛的獵手，但終究也是狗。我要摸摸牠嗎？",
    ko: "사나운 사냥꾼이지만, 그래도 개다. 쓰다듬어 볼까?"
  }),
  "Prudence wins. We shall admire the dog from here.": Object.freeze({
    "zh-Hans": "谨慎占了上风。我们还是站在这里欣赏这只狗吧。",
    ru: "Осторожность победила. Полюбуемся собакой отсюда.",
    es: "Vence la prudencia. Admiraremos al perro desde aquí.",
    "pt-BR": "A prudência vence. Vamos admirar o cachorro daqui.",
    ja: "ここは慎重にいこう。犬はここから眺めることにする。",
    de: "Die Vorsicht siegt. Wir bewundern den Hund von hier aus.",
    fr: "La prudence l'emporte. Nous admirerons le chien d'ici.",
    pl: "Rozsądek zwycięża. Będziemy podziwiać psa stąd.",
    "zh-Hant": "謹慎佔了上風。我們還是站在這裡欣賞這隻狗吧。",
    ko: "신중함이 이겼다. 여기서 바라보기로 하자."
  }),
  "Success. I have petted the dog and retained all ten fingers.": Object.freeze({
    "zh-Hans": "成功。我摸到了狗，十根手指也都还在。",
    ru: "Успех: удалось погладить собаку и сохранить все десять пальцев.",
    es: "Éxito. He acariciado al perro y aún conservo los diez dedos.",
    "pt-BR": "Sucesso. Acariciei o cachorro e continuo com os dez dedos.",
    ja: "成功だ。犬を撫でたが、指は十本とも無事だ。",
    de: "Ein Erfolg. Ich habe den Hund gestreichelt und noch alle zehn Finger.",
    fr: "Succès. J'ai caressé le chien et conservé mes dix doigts.",
    pl: "Sukces. Udało się pogłaskać psa i zachować wszystkie dziesięć palców.",
    "zh-Hant": "成功。我摸到了狗，十根手指也都還在。",
    ko: "성공이다. 개를 쓰다듬었고 손가락 열 개도 모두 무사하다."
  }),
  "By order of the Estado da India, heave to. Your vessel carries no valid Portuguese cartaz. At sea, it is too late to buy a license. Pay the Crown's fine, surrender controlled spice cargo, or fight.": Object.freeze({
    "zh-Hans": "奉葡属印度之命，停船！你的船没有有效的葡萄牙卡塔兹。在海上已来不及购买许可证。缴纳王室罚金、交出管制香料，或开战。",
    ru: "Лечь в дрейф по приказу Estado da Índia! На вашем судне нет действующего португальского картаза. В море покупать лицензию уже поздно. Заплатите штраф Короне, сдайте подконтрольный груз пряностей или сражайтесь.",
    es: "¡Póngase al pairo por orden del Estado da Índia! Su nave no lleva un cartaz portugués válido. En el mar ya es demasiado tarde para comprar una licencia. Pague la multa de la Corona, entregue las especias controladas o luche.",
    "pt-BR": "Pare, por ordem do Estado da Índia! Seu navio não leva um cartaz português válido. No mar já é tarde demais para comprar uma licença. Pague a multa da Coroa, entregue a carga de especiarias controladas ou lute.",
    ja: "エスタード・ダ・インディアの命令だ、停船せよ！ 貴船には有効なポルトガルのカルタスがない。海上ではもう許可証は買えない。王室の罰金を払うか、規制香料を引き渡すか、戦え。",
    de: "Beidrehen auf Befehl des Estado da Índia! Ihr Schiff führt keinen gültigen portugiesischen Cartaz. Auf See ist es zu spät, eine Lizenz zu kaufen. Zahlen Sie die Strafe der Krone, übergeben Sie die kontrollierte Gewürzladung oder kämpfen Sie.",
    fr: "Mettez en panne sur ordre de l’Estado da Índia ! Votre navire n’a pas de cartaz portugais valide. En mer, il est trop tard pour acheter un permis. Payez l’amende de la Couronne, livrez les épices contrôlées ou combattez.",
    pl: "Położyć się w dryf, z rozkazu Estado da Índia! Wasz statek nie ma ważnego portugalskiego kartazu. Na morzu jest już za późno na zakup licencji. Zapłaćcie grzywnę Korony, oddajcie kontrolowany ładunek przypraw albo walczcie.",
    "zh-Hant": "奉葡屬印度之命，停船！你的船沒有有效的葡萄牙卡塔茲。在海上已來不及購買許可證。繳納王室罰金、交出管制香料，或開戰。",
    ko: "에스타두 다 인디아의 명령이다. 정선하라! 귀선에는 유효한 포르투갈 카르타즈가 없다. 해상에서는 이미 허가증을 살 수 없다. 왕실의 벌금을 내거나, 통제 향신료를 넘기거나, 싸워라."
  }),
  "Ribeira Grande": Object.freeze({
    "zh-Hans": "里贝拉格兰德", ru: "Рибейра-Гранде", es: "Ribeira Grande",
    "pt-BR": "Ribeira Grande", ja: "リベイラ・グランデ", de: "Ribeira Grande",
    fr: "Ribeira Grande", pl: "Ribeira Grande", "zh-Hant": "里貝拉格蘭德",
    ko: "리베이라그란데"
  }),
  "Agra": Object.freeze({
    "zh-Hans": "阿格拉", ru: "Агра", es: "Agra", "pt-BR": "Agra", ja: "アーグラ",
    de: "Agra", fr: "Agra", pl: "Agra", "zh-Hant": "阿格拉", ko: "아그라"
  }),
  "Babur defeats Ibrahim Lodi at Panipat and founds the Mughal Empire at Agra.": Object.freeze({
    "zh-Hans": "巴布尔在帕尼帕特击败易卜拉欣·洛迪，并在阿格拉建立莫卧儿帝国。",
    ru: "Бабур побеждает Ибрагима Лоди при Панипате и основывает Империю Великих Моголов в Агре.",
    es: "Babur derrota a Ibrahim Lodi en Panipat y funda el Imperio mogol en Agra.",
    "pt-BR": "Babur derrota Ibrahim Lodi em Panipat e funda o Império Mughal em Agra.",
    ja: "バーブルはパーニーパットでイブラヒム・ロディを破り、アーグラにムガル帝国を建国した。",
    de: "Babur besiegt Ibrahim Lodi bei Panipat und gründet das Mogulreich in Agra.",
    fr: "Babur bat Ibrahim Lodi à Panipat et fonde l’Empire moghol à Agra.",
    pl: "Babur pokonuje Ibrahima Lodiego pod Panipatem i zakłada Imperium Mogołów w Agrze.",
    "zh-Hant": "巴布爾在帕尼帕特擊敗易卜拉欣·洛迪，並在阿格拉建立蒙兀兒帝國。",
    ko: "바부르는 파니파트에서 이브라힘 로디를 물리치고 아그라에 무굴 제국을 세운다."
  }),
  "Babur's victory at Panipat establishes Mughal rule from Agra.": Object.freeze({
    "zh-Hans": "巴布尔在帕尼帕特的胜利确立了以阿格拉为中心的莫卧儿统治。",
    ru: "Победа Бабура при Панипате утверждает власть Великих Моголов из Агры.",
    es: "La victoria de Babur en Panipat establece el gobierno mogol desde Agra.",
    "pt-BR": "A vitória de Babur em Panipat estabelece o domínio Mughal a partir de Agra.",
    ja: "パーニーパットでのバーブルの勝利により、アーグラを拠点とするムガル帝国の支配が確立された。",
    de: "Baburs Sieg bei Panipat begründet die Mogulherrschaft von Agra aus.",
    fr: "La victoire de Babur à Panipat établit le pouvoir moghol depuis Agra.",
    pl: "Zwycięstwo Babura pod Panipatem ustanawia rządy Mogołów z Agry.",
    "zh-Hant": "巴布爾在帕尼帕特的勝利確立了以阿格拉為中心的蒙兀兒統治。",
    ko: "파니파트에서 거둔 바부르의 승리는 아그라를 중심으로 무굴 통치를 확립한다."
  }),
  "The Lodi court at Agra still claims the tribute and military roads of northern India.": Object.freeze({
    "zh-Hans": "阿格拉的洛迪宫廷仍声称对北印度的贡赋与军道拥有权利。",
    ru: "Двор Лоди в Агре по-прежнему притязает на дань и военные дороги Северной Индии.",
    es: "La corte de los Lodi en Agra aún reclama los tributos y caminos militares del norte de la India.",
    "pt-BR": "A corte Lodi em Agra ainda reivindica os tributos e as estradas militares do norte da Índia.",
    ja: "アーグラのローディー朝廷は、今なお北インドの貢納と軍道への支配を主張している。",
    de: "Der Lodi-Hof in Agra beansprucht noch immer die Tribute und Heerstraßen Nordindiens.",
    fr: "La cour des Lodi à Agra revendique toujours les tributs et les routes militaires du nord de l’Inde.",
    pl: "Dwór Lodich w Agrze nadal rości sobie prawa do danin i szlaków wojskowych północnych Indii.",
    "zh-Hant": "阿格拉的洛迪宮廷仍聲稱對北印度的貢賦與軍道擁有權利。",
    ko: "아그라의 로디 조정은 여전히 북인도의 공물과 군사 도로에 대한 권리를 주장한다."
  }),
  "Babur's new court means to bind northern India's roads and rivers to Agra.": Object.freeze({
    "zh-Hans": "巴布尔的新朝廷意在把北印度的道路与河流都系于阿格拉。",
    ru: "Новый двор Бабура намерен связать дороги и реки Северной Индии с Агрой.",
    es: "La nueva corte de Babur pretende vincular los caminos y ríos del norte de la India con Agra.",
    "pt-BR": "A nova corte de Babur pretende ligar as estradas e os rios do norte da Índia a Agra.",
    ja: "バーブルの新たな宮廷は、北インドの道と河川をアーグラへ結びつけようとしている。",
    de: "Baburs neuer Hof will Nordindiens Straßen und Flüsse an Agra binden.",
    fr: "La nouvelle cour de Babur entend relier les routes et les fleuves du nord de l’Inde à Agra.",
    pl: "Nowy dwór Babura zamierza związać drogi i rzeki północnych Indii z Agrą.",
    "zh-Hant": "巴布爾的新朝廷意在把北印度的道路與河流都繫於阿格拉。",
    ko: "바부르의 새 조정은 북인도의 도로와 강을 아그라에 잇고자 한다."
  }),
  "Praise be to God, my Hajj is complete. Now I need passage home to {0}. Carry me there and I will pay {1} db.": Object.freeze({
    "zh-Hans": "感谢真主，我已完成朝觐。现在我需要搭船返回{0}的家。送我回去，我会付你{1}达布隆。",
    ru: "Хвала Аллаху, мой хадж завершён. Теперь мне нужен корабль домой, в {0}. Доставьте меня туда, и я заплачу {1} дублонов.",
    es: "Alabado sea Dios, he completado el Hajj. Ahora necesito pasaje de regreso a {0}. Lléveme allí y le pagaré {1} doblones.",
    "pt-BR": "Graças a Deus, completei o Hajj. Agora preciso de uma passagem de volta para {0}. Leve-me até lá e pagarei {1} dobrões.",
    ja: "アッラーに感謝を。ハッジを終えました。今度は故郷の{0}まで船に乗せてください。送り届けてくだされば{1}ダブロンをお支払いします。",
    de: "Gott sei gepriesen, mein Haddsch ist vollendet. Nun brauche ich eine Überfahrt nach Hause, nach {0}. Bringt mich dorthin, und ich zahle {1} Dublonen.",
    fr: "Dieu soit loué, mon hajj est accompli. Il me faut maintenant rentrer chez moi à {0}. Conduisez-moi et je vous paierai {1} doublons.",
    pl: "Chwała Bogu, mój hadżdż dobiegł końca. Teraz potrzebuję transportu do domu, do {0}. Zawieźcie mnie tam, a zapłacę {1} dublonów.",
    "zh-Hant": "感謝真主，我已完成朝覲。現在我需要搭船返回{0}的家。送我回去，我會付你{1}達布隆。",
    ko: "알라께 찬미를, 하지 순례를 마쳤습니다. 이제 고향 {0}으로 돌아갈 배편이 필요합니다. 데려다주시면 {1}더블룬을 드리겠습니다."
  }),
  "After the crowds of Mecca, the quiet sea is welcome. I am returning home to {0} from the Hajj.": Object.freeze({
    "zh-Hans": "离开麦加的人潮，宁静的海面令人舒心。我完成朝觐，正返回{0}的家。",
    ru: "После толп Мекки тихое море — благословение. Я возвращаюсь домой, в {0}, после хаджа.",
    es: "Después de las multitudes de La Meca, el mar en calma es un alivio. Regreso a casa, a {0}, después del Hajj.",
    "pt-BR": "Depois das multidões de Meca, o mar tranquilo é um alívio. Estou voltando para casa, em {0}, depois do Hajj.",
    ja: "メッカの群衆を離れると、静かな海がありがたく感じます。ハッジを終え、故郷の{0}へ帰るところです。",
    de: "Nach dem Gedränge in Mekka ist die ruhige See willkommen. Vom Haddsch kehre ich heim nach {0}.",
    fr: "Après la foule de La Mecque, le calme de la mer fait du bien. Je rentre chez moi à {0} après le hajj.",
    pl: "Po tłumach Mekki spokojne morze jest prawdziwą ulgą. Wracam z hadżdżu do domu, do {0}.",
    "zh-Hant": "離開麥加的人潮，寧靜的海面令人舒心。我完成朝覲，正返回{0}的家。",
    ko: "메카의 군중을 벗어나니 고요한 바다가 반갑습니다. 하지 순례를 마치고 고향 {0}으로 돌아가는 길입니다."
  }),
  "{0} at last. I left home a pilgrim and return from the Hajj. You have my thanks.": Object.freeze({
    "zh-Hans": "终于回到{0}了。我离家时是朝圣者，如今完成朝觐归来。多谢你。",
    ru: "Наконец-то {0}. Здесь началось моё паломничество, а теперь я возвращаюсь после хаджа. Благодарю вас.",
    es: "Por fin, {0}. Partí para peregrinar y regreso del Hajj. Tiene mi agradecimiento.",
    "pt-BR": "Finalmente, {0}. Parti em peregrinação e volto do Hajj. Você tem minha gratidão.",
    ja: "ようやく{0}です。巡礼の旅に出た故郷へ、ハッジを終えて帰ってきました。ありがとうございます。",
    de: "Endlich {0}. Zur Pilgerfahrt zog ich fort, nun kehre ich vom Haddsch zurück. Habt meinen Dank.",
    fr: "Enfin {0}. J'étais parti en pèlerinage ; je reviens du hajj. Vous avez toute ma gratitude.",
    pl: "Nareszcie {0}. Stąd rozpoczęła się moja pielgrzymka; teraz wracam z hadżdżu. Dziękuję.",
    "zh-Hant": "終於回到{0}了。我離家時是朝聖者，如今完成朝覲歸來。多謝你。",
    ko: "마침내 {0}입니다. 순례자로 고향을 떠났다가 하지를 마치고 돌아왔습니다. 감사합니다."
  }),
  "Babur has won a new empire, but its maps still end where caravan reports begin. Bring Agra a captain's account of the seas.": Object.freeze({
    "zh-Hans": "巴布尔赢得了一个新帝国，但它的地图仍止于商队传闻。把一位船长对海洋的见闻带到阿格拉。",
    ru: "Бабур завоевал новую империю, но её карты всё ещё кончаются там, где начинаются рассказы караванщиков. Доставьте в Агру морской отчёт капитана.",
    es: "Babur ha conquistado un nuevo imperio, pero sus mapas aún terminan donde comienzan los relatos de las caravanas. Lleva a Agra el informe marítimo de un capitán.",
    "pt-BR": "Babur conquistou um novo império, mas seus mapas ainda terminam onde começam os relatos das caravanas. Leve a Agra o relato marítimo de um capitão.",
    ja: "バーブルは新たな帝国を勝ち取ったが、その地図はまだ隊商の報告が始まる所で終わっている。海を知る船長の記録をアーグラへ届けよ。",
    de: "Babur hat ein neues Reich erobert, doch seine Karten enden noch immer dort, wo die Berichte der Karawanen beginnen. Bringt den Bericht eines Kapitäns über die Meere nach Agra.",
    fr: "Babur a conquis un nouvel empire, mais ses cartes s’arrêtent encore là où commencent les récits des caravanes. Apportez à Agra le témoignage maritime d’un capitaine.",
    pl: "Babur zdobył nowe imperium, ale jego mapy wciąż kończą się tam, gdzie zaczynają się opowieści karawan. Dostarcz do Agry kapitańską relację o morzach.",
    "zh-Hant": "巴布爾贏得了一個新帝國，但它的地圖仍止於商隊傳聞。把一位船長對海洋的見聞帶到阿格拉。",
    ko: "바부르는 새 제국을 얻었지만, 그 지도는 아직 대상의 전언이 시작되는 곳에서 끝난다. 바다를 아는 선장의 기록을 아그라로 가져가라."
  }),
  "Captain, you brought our prodigal home. Please accept {0} doubloons.": Object.freeze({
    "zh-Hans": "船长，你把我们家这位浪子带回来了。请收下 {0} 枚达布隆。",
    ru: "Капитан, вы вернули домой нашего заблудшего родича. Примите {0} дублонов.",
    es: "Capitán, ha traído de vuelta a nuestro familiar pródigo. Acepte {0} doblones.",
    "pt-BR": "Capitão, você trouxe nosso familiar pródigo de volta. Aceite {0} dobrões.",
    ja: "船長、放蕩者だった身内を連れ帰ってくださいました。{0} ダブロンをお受け取りください。",
    de: "Kapitän, Ihr habt unser verlorenes Familienmitglied heimgebracht. Nehmt bitte {0} Dublonen an.",
    fr: "Capitaine, vous avez ramené notre enfant prodigue. Acceptez ces {0} doublons.",
    pl: "Kapitanie, sprowadziliście do domu naszego marnotrawnego krewniaka. Przyjmijcie {0} dublonów.",
    "zh-Hant": "船長，你把我們家這位浪子帶回來了。請收下 {0} 枚達布隆。",
    ko: "선장님, 방탕했던 우리 가족을 집으로 데려와 주셨습니다. {0} 더블룬을 받아 주십시오."
  }),
  "Captain, you restored our family. Please accept {0} doubloons with our everlasting gratitude.": Object.freeze({
    "zh-Hans": "船长，你让我们一家团聚。请收下 {0} 枚达布隆，谨表我们永远的感激。",
    ru: "Капитан, вы воссоединили нашу семью. Примите {0} дублонов в знак нашей вечной благодарности.",
    es: "Capitán, ha reunido a nuestra familia. Acepte {0} doblones con nuestra eterna gratitud.",
    "pt-BR": "Capitão, você reuniu nossa família. Aceite {0} dobrões com nossa eterna gratidão.",
    ja: "船長、私たち家族を再び結び合わせてくださいました。永遠の感謝を込めて、{0} ダブロンをお受け取りください。",
    de: "Kapitän, Ihr habt unsere Familie wiedervereint. Nehmt als Zeichen unserer ewigen Dankbarkeit {0} Dublonen an.",
    fr: "Capitaine, vous avez réuni notre famille. Acceptez ces {0} doublons avec notre éternelle gratitude.",
    pl: "Kapitanie, zjednoczyliście naszą rodzinę. Przyjmijcie {0} dublonów wraz z naszą wieczną wdzięcznością.",
    "zh-Hant": "船長，你讓我們一家團聚。請收下 {0} 枚達布隆，謹表我們永遠的感激。",
    ko: "선장님, 우리 가족을 다시 만나게 해 주셨습니다. 영원한 감사의 뜻으로 {0} 더블룬을 받아 주십시오."
  }),
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
  ...independentPolityOverrides(),
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
  "Wishlist on Steam": Object.freeze({
    "de": "Auf Steam wünschen",
    "es": "Añadir a deseados en Steam",
    "fr": "Ajouter à la liste de souhaits Steam",
    "ru": "В желаемое в Steam",
    "pl": "Dodaj do listy życzeń Steam",
    "pt-BR": "Adicionar à lista de desejos Steam",
    "ja": "Steamでウィッシュリストに追加",
    "ko": "Steam 찜 목록에 추가",
    "zh-Hans": "加入 Steam 愿望单",
    "zh-Hant": "加入 Steam 願望清單"
}),
  "Your next voyage awaits": Object.freeze({
    "de": "Deine nächste Reise wartet",
    "es": "Tu próximo viaje te espera",
    "fr": "Votre prochain voyage vous attend",
    "ru": "Следующее плавание ждёт",
    "pl": "Następna wyprawa czeka",
    "pt-BR": "Sua próxima viagem espera",
    "ja": "次の航海が待っている",
    "ko": "다음 항해가 기다립니다",
    "zh-Hans": "下一段航程在等你",
    "zh-Hant": "下一段航程在等你"
}),
  "Wishlist Marque & Reprisal on Steam": Object.freeze({
    "de": "Marque & Reprisal auf Steam vormerken",
    "es": "Añade Marque & Reprisal a deseados en Steam",
    "fr": "Ajoutez Marque & Reprisal à vos souhaits Steam",
    "ru": "Добавьте Marque & Reprisal в желаемое в Steam",
    "pl": "Dodaj Marque & Reprisal do listy życzeń Steam",
    "pt-BR": "Adicione Marque & Reprisal à lista de desejos Steam",
    "ja": "SteamでMarque & Reprisalをウィッシュリストに追加",
    "ko": "Steam에서 Marque & Reprisal을 찜하세요",
    "zh-Hans": "将 Marque & Reprisal 加入 Steam 愿望单",
    "zh-Hant": "將 Marque & Reprisal 加入 Steam 願望清單"
}),
  "{0}: {1} → {2}": Object.freeze({
    "de": "{0}: {1} → {2}",
    "es": "{0}: {1} → {2}",
    "fr": "{0}: {1} → {2}",
    "ru": "{0}: {1} → {2}",
    "pl": "{0}: {1} → {2}",
    "pt-BR": "{0}: {1} → {2}",
    "ja": "{0}: {1} → {2}",
    "ko": "{0}: {1} → {2}",
    "zh-Hans": "{0}: {1} → {2}",
    "zh-Hant": "{0}: {1} → {2}"
}),
  "{0} JOINS {1} VS. {2}": Object.freeze({
    "de": "{0} UNTERSTÜTZT {1} GEGEN {2}",
    "es": "{0} SE UNE A {1} CONTRA {2}",
    "fr": "{0} REJOINT {1} CONTRE {2}",
    "ru": "{0} ВСТУПАЕТ НА СТОРОНЕ {1} ПРОТИВ {2}",
    "pl": "{0} DOŁĄCZA DO {1} PRZECIW {2}",
    "pt-BR": "{0} SE JUNTA A {1} CONTRA {2}",
    "ja": "{0}が{1}に加勢、対{2}",
    "ko": "{0}, {1}에 합류하여 {2}에 맞섬",
    "zh-Hans": "{0}加入{1}一方，对抗{2}",
    "zh-Hant": "{0}加入{1}一方，對抗{2}"
}),
  "WAR: {0} VS. {1}": Object.freeze({
    "zh-Hant": "戰爭：{0} 對 {1}",
    "pl": "WOJNA: {0} przeciw {1}",
    "ko": "전쟁: {0} 대 {1}",
    "ru": "ВОЙНА: {0} против {1}",
    "ja": "戦争: {0} 対 {1}",
    "pt-BR": "GUERRA: {0} contra {1}",
    "de": "KRIEG: {0} gegen {1}",
    "fr": "GUERRE : {0} contre {1}",
    "es": "GUERRA: {0} contra {1}",
    "zh-Hans": "战争：{0} 对 {1}"
}),
  "VASSALAGE: {0} / {1}": Object.freeze({
    ja: "従属関係: {0} / {1}",
    de: "VASALLITÄT: {0} / {1}"
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
  "x{0} / {1} DRINKS": Object.freeze({
    "zh-Hans": "x{0} / {1} 饮料", ru: "x{0} / {1} НАПИТКИ", es: "x{0} / {1} BEBIDAS",
    "pt-BR": "x{0} / {1} BEBIDAS", ja: "x{0} / {1} ドリンク", de: "x{0} / {1} GETRÄNKE",
    fr: "x{0} / {1} BOISSONS", pl: "x{0} / {1} NAPOJE", "zh-Hant": "x{0} / {1} 飲料", ko: "x{0} / {1} 음료"
  }),
  "x{0} / {1} RATIONS": Object.freeze({
    "zh-Hans": "x{0} / {1} 口粮", ru: "x{0} / {1} РАЦИОНЫ", es: "x{0} / {1} RACIONES",
    "pt-BR": "x{0} / {1} RAÇÕES", ja: "x{0} / {1} 配給", de: "x{0} / {1} RATIONEN",
    fr: "x{0} / {1} RATIONS", pl: "x{0} / {1} RACJE ŻYWNOŚCIOWE", "zh-Hant": "x{0} / {1} 口糧", ko: "x{0} / {1} 배급"
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
  }),
  ...reviewedStandingOverrides(),
  ...reviewedWatchShiftOverrides(),
  ...reviewedFishingYieldOverrides(),
  ...reviewedStoreSupplyOverrides(),
  ...reviewedSpanishAuditOverrides(),
  ...reviewedSpanishAuditFollowUpOverrides(),
  ...reviewedWhalingLineOverrides(),
  ...reviewedEarlyCatalogRangeOverrides(),
  ...reviewedNextCatalogRangeOverrides(),
  ...reviewedCatalogRange1150Overrides(),
  ...reviewedCatalogRange1200Overrides(),
  ...reviewedCatalogRange1250Overrides(),
  ...reviewedCatalogRange1300Overrides(),
  ...reviewedCatalogRange1350Overrides(),
  ...reviewedCatalogRange1400Overrides(),
  ...reviewedCatalogRange1450Overrides(),
  ...reviewedCatalogRange1500Overrides(),
  ...reviewedCatalogRange1550Overrides(),
  ...reviewedCatalogRange1600Overrides(),
  ...reviewedCatalogRange1650Overrides(),
  ...reviewedCatalogRange1100Overrides(),
  ...reviewedCatalogRange1050Overrides()
});

function reviewedCatalogRange1200Overrides() {
  const entries = [
    ["Coasters call with every change of wind, but an unusual cargo can still stir the whole market.", ["沿海商船随风向变化频频靠港，但一批特别的货物仍足以搅动整个市场。", "Каботажные суда заходят в порт при каждой перемене ветра, но необычный груз всё равно способен всколыхнуть весь рынок.", "Los barcos de cabotaje hacen escala con cada cambio de viento, pero una carga inusual aún puede agitar todo el mercado.", "Os navios de cabotagem fazem escala a cada mudança do vento, mas uma carga incomum ainda pode movimentar todo o mercado.", "沿岸を行き来する商船は風向きが変わるたびに寄港しますが、珍しい積荷なら市場全体を沸かせます。", "Küstenfahrer laufen mit jedem Windwechsel den Hafen an, doch ungewöhnliche Fracht kann den ganzen Markt in Bewegung bringen.", "Les caboteurs font escale à chaque changement de vent, mais une cargaison inhabituelle peut tout de même agiter le marché.", "Kabotażowce zawijają do portu przy każdej zmianie wiatru, ale niezwykły ładunek wciąż może poruszyć cały rynek.", "沿岸商船隨風向變化頻頻靠港，但一批特別的貨物仍足以攪動整個市場。", "연안 무역선은 바람이 바뀔 때마다 들르지만, 색다른 화물은 시장 전체를 뒤흔들 수 있습니다。"]],
    ["Coaxes the ship through turns and closer to the wind.", ["操船灵活，转向利落，也能迎风航行。", "Умело ведёт корабль на поворотах и позволяет идти круче к ветру.", "Gobierna el barco con pericia en los virajes y al navegar más cerca del viento.", "Manobra o navio com perícia nas curvas e ao navegar mais próximo do vento.", "巧みな操船で船を旋回させ、風上へ切り上がる。", "Steuert das Schiff geschickt durch Wendungen und näher an den Wind.", "Manœuvre habilement le navire dans les virages et au plus près du vent.", "Sprawnie prowadzi statek przez zwroty i pozwala mu żeglować ostrzej do wiatru.", "操船靈活，轉向俐落，也能迎風航行。", "선회를 능숙하게 해내고 바람을 향해 더 가까이 항해합니다."]],
    ["Coffee first. Then bearings. Then whales.", ["先喝咖啡，再测定航向，最后找鲸鱼。", "Сначала кофе. Потом определим курс. А затем — к китам.", "Primero, café. Luego, tomaremos rumbo. Después, iremos a por las ballenas.", "Primeiro, café. Depois, acertamos o rumo. Por fim, vamos atrás das baleias.", "まずはコーヒー。それから方位を定め、最後にクジラを探そう。", "Erst Kaffee. Dann bestimmen wir den Kurs. Danach suchen wir Wale.", "D'abord le café. Ensuite, on relève notre position. Puis, les baleines.", "Najpierw kawa. Potem wyznaczymy namiar. A na końcu wieloryby.", "先喝咖啡，再測定航向，最後找鯨魚。", "먼저 커피. 그다음 항로를 잡고, 마지막으로 고래를 찾자."]],
    ["Cold", ["寒冷", "Холод", "Frío", "Frio", "寒さ", "Kälte", "Froid", "Zimno", "寒冷", "추위"]],
    ["Collect commission reward", ["领取私掠赏金", "Получить каперскую награду", "Cobrar la recompensa de corso", "Receber a recompensa de corso", "私掠の報奨金を受け取る", "Kaperprämie einfordern", "Recevoir la prime de course", "Odbierz nagrodę za kaperstwo", "領取私掠賞金", "사략 허가 포상금 받기"]],
    ["Cologne Electorate", ["科隆选侯国", "Кёльнское курфюршество", "Electorado de Colonia", "Eleitorado de Colônia", "ケルン選帝侯領", "Kurfürstentum Köln", "Électorat de Cologne", "Elektorat Koloński", "科隆選侯國", "쾰른 선제후령"]],
    ["Colossal stone ancestors stand watch over Rapa Nui. How did one island raise so many?", ["巨大的摩艾石像守望着拉帕努伊岛。一座岛上怎会竖起这么多？", "Гигантские моаи стоят стражами на Рапа-Нуи. Как на одном острове воздвигли столько статуй?", "Los colosales moáis vigilan Rapa Nui. ¿Cómo pudo una sola isla erigir tantos?", "Os colossais moais vigiam Rapa Nui. Como uma única ilha ergueu tantos?", "巨大なモアイ像がラパ・ヌイを見守っています。ひとつの島で、どうしてこれほど多く建てられたのでしょう。", "Riesige Moai wachen über Rapa Nui. Wie konnte eine einzige Insel so viele errichten?", "D'immenses moaïs veillent sur Rapa Nui. Comment une seule île a-t-elle pu en ériger autant ?", "Olbrzymie moai strzegą Rapa Nui. Jak jedna wyspa wzniosła ich aż tyle?", "巨大的摩艾石像守望著拉帕努伊島。一座島上怎會豎起這麼多？", "거대한 모아이 석상이 라파누이를 지킵니다. 한 섬에서 어떻게 이렇게 많이 세웠을까요?"]],
    ["Commission accepted. Capture {0} for {1}.", ["私掠委任已受理。为{1}俘获{0}。", "Каперское поручение принято. Захватите {0} для державы «{1}». ", "Se acepta la patente de corso. Captura {0} para {1}.", "A carta de corso foi aceita. Capture {0} para {1}.", "私掠の委任を受けました。{1}のために{0}を拿捕してください。", "Der Kaperauftrag wurde angenommen. KAPERT {0} für {1}.", "La commission de course est acceptée. Capturez {0} pour {1}.", "Przyjęto zlecenie korsarskie. Zdobądź {0} dla {1}.", "私掠委任已受理。為{1}俘獲{0}。", "사략 허가 임무를 수락했습니다. {1}을 위해 {0}을 나포하세요."]],
    ["Commission accepted. Hunt the wokou near {0}.", ["私掠委任已受理。前往{0}附近剿捕倭寇。", "Каперское поручение принято. Охотьтесь на вако у берегов {0}.", "Se acepta la patente de corso. Persigue a los wako cerca de {0}.", "A carta de corso foi aceita. Persiga os wokou perto de {0}.", "私掠の委任を受けました。{0}付近で倭寇を追討してください。", "Der Kaperauftrag wurde angenommen. Jagt die Wokou nahe {0}.", "La commission de course est acceptée. Traquez les wokou près de {0}.", "Przyjęto zlecenie korsarskie. Poluj na wokou w pobliżu {0}.", "私掠委任已受理。前往{0}附近剿捕倭寇。", "사략 허가 임무를 수락했습니다. {0} 근처에서 왜구를 추적하세요."]],
    ["Commission discharged. No bounty claimed.", ["私掠委任已结案，未领取赏金。", "Каперское поручение закрыто. Награда не заявлена.", "Patente de corso cumplida; no se reclama recompensa.", "Carta de corso encerrada. Nenhuma recompensa foi reivindicada.", "私掠の任務を終了しました。賞金の請求はありません。", "Kaperauftrag abgeschlossen. Keine Prämie beansprucht.", "Commission de course clôturée. Aucune prime réclamée.", "Zlecenie korsarskie zamknięto. Nie odebrano nagrody.", "私掠委任已結案，未領取賞金。", "사략 허가 임무가 종료되었습니다. 포상금은 청구하지 않았습니다."]],
    ["community messenger", ["社区信使", "общинный посланник", "mensajero de la comunidad", "mensageiro da comunidade", "共同体の使者", "Bote der Gemeinde", "messager de la communauté", "posłaniec wspólnoty", "社區信使", "공동체 전령"]],
    ["Composite Recurve Bows", ["复合反曲弓", "Составные рекурсивные луки", "Arcos recurvos compuestos", "Arcos recurvos compostos", "複合素材の反 recurve 弓", "Zusammengesetzte Recurvebögen", "Arcs recourbés composites", "Kompozytowe łuki refleksyjne", "複合反曲弓", "복합 반곡궁"]],
    ["Complete a shore scavenging expedition.", ["完成一次海岸觅食远征。", "Завершите экспедицию по сбору припасов на берегу.", "Completa una expedición de recolección en la costa.", "Conclua uma expedição de coleta de recursos na costa.", "海岸での物資採集遠征を完了する。", "Schließt einen Sammelausflug an Land ab.", "Terminez une expédition de collecte sur le rivage.", "Ukończ wyprawę po zapasy na wybrzeżu.", "完成一次海岸覓食遠征。", "해안에서 물자를 찾는 원정을 완료하세요."]],
    ["Confirm dismissals and take {0}", ["确认遣散船员并登上{0}", "Подтвердите увольнение моряков и переход на корабль «{0}»", "Confirma los despidos y pasa a bordo de {0}", "Confirme as dispensas e embarque em {0}", "解雇を確定して{0}に乗り込む", "Entlassungen bestätigen und die {0} übernehmen", "Confirmer les renvois et embarquer sur le {0}", "Potwierdź zwolnienia i przejdź na pokład {0}", "確認遣散船員並登上{0}", "선원 해고를 확정하고 {0}에 승선"]],
    ["Court can have it. I need you fit for the next watch.", ["那东西交给宫廷吧。我还得让你养好精神，接替下一班值更。", "Пусть это достанется двору. Ты должен быть в форме к следующей вахте.", "Que se lo quede la corte. Te necesito en condiciones para la próxima guardia.", "Que a corte fique com isso. Preciso de você bem para o próximo turno de vigia.", "それは宮廷に渡そう。次の当直に備えて、君には元気でいてもらわないと。", "Das kann der Hof behalten. Für die nächste Wache brauche ich dich ausgeruht.", "Que la cour le garde. J'ai besoin que vous soyez en forme pour le prochain quart.", "Niech dwór to zatrzyma. Potrzebuję cię w formie na następną wachtę.", "那東西交給宮廷吧。我還得讓你養好精神，接替下一班值更。", "그건 궁정에 주면 되네. 다음 당직을 위해 자네가 건강해야 하니까."]],
    ["Cross-staff, compass, tables. With all these instruments, surely one can tell us where breakfast went.", ["十字测杆、罗盘、航海表。有了这些仪器，总该有人能告诉我们早餐去哪儿了吧。", "Крестовый посох, компас, навигационные таблицы. С таким набором приборов уж кто-нибудь скажет, куда делся завтрак.", "Ballestilla, brújula, tablas náuticas. Con tantos instrumentos, alguien podrá decirnos adónde fue a parar el desayuno.", "Balestilha, bússola, tabelas náuticas. Com tantos instrumentos, alguém há de nos dizer onde foi parar o café da manhã.", "十字杖、羅針盤、航海表。これだけ道具があれば、朝食がどこへ行ったかくらい分かるだろう。", "Kreuzstab, Kompass, nautische Tafeln. Mit all diesen Instrumenten kann uns doch jemand sagen, wo das Frühstück geblieben ist.", "Arbalète, boussole, tables nautiques. Avec tous ces instruments, quelqu'un saura bien nous dire où est passé le petit-déjeuner.", "Laska Jakuba, kompas, tablice nawigacyjne. Z tyloma przyrządami ktoś chyba ustali, gdzie podziało się śniadanie.", "十字測桿、羅盤、航海表。有了這些儀器，總該有人能告訴我們早餐去哪兒了吧。", "십자측량봉, 나침반, 항해표. 이 많은 도구가 있는데 누군가는 아침 식사가 어디로 갔는지 알아낼 수 있겠지요."]],
    ["Crown commission: captured {0}", ["王室私掠委任：已俘获{0}", "Королевское каперское поручение: захвачен корабль «{0}»", "Patente de corso de la Corona: capturado {0}", "Carta de corso da Coroa: capturado {0}", "王室私掠委任：{0}を拿捕", "Kaperauftrag der Krone: {0} gekapert", "Commission de course de la Couronne : {0} capturé", "Królewskie zlecenie korsarskie: zdobyto {0}", "王室私掠委任：已俘獲{0}", "왕실 사략 허가 임무: {0} 나포"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1250Overrides() {
  const entries = [
    ["CONTROLLED SPICES SURRENDERED {0}", ["受管制香料已交出 {0}", "КОНТРОЛИРУЕМЫЕ ПРЯНОСТИ СДАНЫ: {0}", "ESPECIAS CONTROLADAS ENTREGADAS: {0}", "ESPECIARIAS SOB CONTROLE ENTREGUES: {0}", "管理下の香辛料を引き渡しました {0}", "KONTROLLIERTE GEWÜRZE ABGEGEBEN: {0}", "ÉPICES SOUS CONTRÔLE REMISES : {0}", "ODDANO KONTROLOWANE PRZYPRAWY: {0}", "受管制香料已交出 {0}", "통제 대상 향신료 인도 완료: {0}"]],
    ["Cotton and tobacco occupy the promoters, but neither feeds a hungry harbor town.", ["种植园主忙着种棉花和烟草，可这两样都填不饱港镇居民的肚子。", "Землевладельцы заняты хлопком и табаком, но ни то ни другое не накормит голодный портовый город.", "Los promotores se vuelcan en el algodón y el tabaco, pero ninguno de esos cultivos alimenta a una ciudad portuaria hambrienta.", "Os investidores apostam no algodão e no tabaco, mas nenhum dos dois alimenta uma cidade portuária faminta.", "入植を進める者たちは綿花とタバコに力を注ぎますが、どちらも港町の人々の腹は満たせません。", "Die Plantagenbesitzer setzen auf Baumwolle und Tabak, doch beides stillt nicht den Hunger einer Hafenstadt.", "Les planteurs misent sur le coton et le tabac, mais ni l'un ni l'autre ne nourrit une ville portuaire affamée.", "Osadnicy stawiają na bawełnę i tytoń, ale żadna z tych upraw nie wyżywi głodnego miasta portowego.", "種植園主忙著種棉花和菸草，可這兩樣都填不飽港鎮居民的肚子。", "개척자들은 면화와 담배에 매달리지만, 어느 작물도 굶주린 항구 마을을 먹여 살리지는 못합니다."]],
    ["COVER", ["封面", "ПОКРЫТИЕ", "CUBIERTA", "COBERTURA", "覆い", "ABDECKUNG", "COUVERTURE", "OSŁONA", "封面", "덮개"]],
    ["Create a domestic matchlock industry in Japan.", ["在日本建立本土火绳枪产业。", "Создать в Японии собственное производство фитильных ружей.", "Crear en Japón una industria nacional de arcabuces de mecha.", "Criar no Japão uma indústria nacional de arcabuzes de mecha.", "日本に国産火縄銃産業を築く。", "Eine einheimische Luntenrohrproduktion in Japan aufbauen.", "Créer au Japon une industrie nationale de mousquets à mèche.", "Stwórz w Japonii krajowy przemysł rusznikarski produkujący broń lontową.", "在日本建立本土火繩槍產業。", "일본에 자국산 화승총 산업을 세우세요."]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1300Overrides() {
  const entries = [
    ["Current battery: {0}. Faster locks and longer culverins improve reload, damage, and range. Purse {1} db.", ["当前岸防炮组：{0}。更快的炮机和更长的加农炮可提升装填速度、威力与射程。费用：{1}达布隆。", "Текущая береговая батарея: {0}. Скорострельные замки и длинные кулеврины повышают темп перезарядки, урон и дальность. Цена: {1} дублонов.", "Batería costera actual: {0}. Los mecanismos de disparo más rápidos y las culebrinas más largas mejoran la recarga, el daño y el alcance. Precio: {1} doblones.", "Bateria costeira atual: {0}. Fechos mais rápidos e colubrinas mais longas melhoram a recarga, o dano e o alcance. Custo: {1} dobrões.", "現在の沿岸砲台：{0}。撃発機構の改良と長砲身のカルバリン砲で、装填速度・威力・射程が向上します。費用：{1}ダブロン。", "Aktuelle Küstenbatterie: {0}. Schnellere Zündschlösser und längere Kartaunen verbessern Nachladezeit, Schaden und Reichweite. Kosten: {1} Dublonen.", "Batterie côtière actuelle : {0}. Des mécanismes de mise à feu plus rapides et des couleuvrines plus longues améliorent le rechargement, les dégâts et la portée. Coût : {1} doublons.", "Obecna bateria nadbrzeżna: {0}. Szybsze zamki i dłuższe kolubryny poprawiają tempo przeładowania, obrażenia i zasięg. Koszt: {1} dublonów.", "目前岸防砲組：{0}。更快的砲機和更長的加農砲可提升裝填速度、威力與射程。費用：{1}達布隆。", "현재 해안 포대: {0}. 빠른 점화 장치와 긴 컬버린포는 재장전 속도, 위력, 사거리를 높입니다. 비용: {1}더블룬."]],
    ["Current gear: {0}. Other nets offered: {1}. Purse {2} db.", ["当前渔具：{0}。另有渔网可选：{1}。费用：{2}达布隆。", "Текущие снасти: {0}. В продаже другие сети: {1}. Цена: {2} дублонов.", "Equipo actual: {0}. Otras redes disponibles: {1}. Precio: {2} doblones.", "Equipamento atual: {0}. Outras redes disponíveis: {1}. Custo: {2} dobrões.", "現在の漁具：{0}。交換できる網：{1}。費用：{2}ダブロン。", "Aktuelle Ausrüstung: {0}. Weitere Netze im Angebot: {1}. Kosten: {2} Dublonen.", "Matériel actuel : {0}. Autres filets proposés : {1}. Coût : {2} doublons.", "Obecny sprzęt: {0}. Dostępne inne sieci: {1}. Koszt: {2} dublonów.", "目前漁具：{0}。另有漁網可選：{1}。費用：{2}達布隆。", "현재 어구: {0}. 다른 그물: {1}. 비용: {2}더블룬."]],
    ["Current harpoon: {0}. A stronger line and truer shaft improve the odds of holding a surfaced whale. Purse {1} db.", ["当前鱼叉：{0}。更结实的缆绳和更笔直的叉杆能提高钩住浮出水面的鲸鱼的几率。费用：{1}达布隆。", "Текущий гарпун: {0}. Более прочный линь и ровное древко повышают шанс удержать всплывшего кита. Цена: {1} дублонов.", "Arpón actual: {0}. Una línea más resistente y un asta más recta aumentan las probabilidades de retener a una ballena que ha salido a la superficie. Precio: {1} doblones.", "Arpão atual: {0}. Uma linha mais resistente e uma haste mais reta aumentam a chance de segurar uma baleia que veio à superfície. Custo: {1} dobrões.", "現在の銛：{0}。より丈夫なロープとまっすぐな柄なら、浮上したクジラをつなぎ止めやすくなります。費用：{1}ダブロン。", "Aktuelle Harpune: {0}. Eine stärkere Leine und ein geraderer Schaft erhöhen die Chance, einen aufgetauchten Wal festzuhalten. Kosten: {1} Dublonen.", "Harpon actuel : {0}. Une ligne plus solide et un manche plus droit augmentent les chances de retenir une baleine remontée à la surface. Coût : {1} doublons.", "Obecny harpun: {0}. Mocniejsza lina i prostsze drzewce zwiększają szansę utrzymania wieloryba przy powierzchni. Koszt: {1} dublonów.", "目前魚叉：{0}。更結實的繩索和更筆直的叉桿能提高鉤住浮出水面的鯨魚的機率。費用：{1}達布隆。", "현재 작살: {0}. 튼튼한 작살줄과 곧은 자루는 수면 위로 떠오른 고래를 붙잡을 가능성을 높입니다. 비용: {1}더블룬."]],
    ["CURRENT SHIP WILL BE REPLACED", ["当前船只将被替换", "ТЕКУЩИЙ КОРАБЛЬ БУДЕТ ЗАМЕНЁН", "SE REEMPLAZARÁ EL BARCO ACTUAL", "O NAVIO ATUAL SERÁ SUBSTITUÍDO", "現在の船が置き換えられます", "DAS AKTUELLE SCHIFF WIRD ERSETZT", "LE NAVIRE ACTUEL SERA REMPLACÉ", "OBECNY STATEK ZOSTANIE ZASTĄPIONY", "目前船隻將被替換", "현재 선박이 교체됩니다"]],
    ["CUSTOMS ASSIGNMENT COMPLETE: 1,200,000 DB AWAITS AT COURT", ["关税收入转让已履行：宫廷备有1,200,000达布隆", "ПЕРЕДАЧА ТАМОЖЕННЫХ ДОХОДОВ ЗАВЕРШЕНА: ПРИ ДВОРЕ ЖДУТ 1 200 000 ДУБЛОНОВ", "CESIÓN DE LOS INGRESOS ADUANEROS CUMPLIDA: LA CORTE OS ESPERA CON 1.200.000 DB", "CESSÃO DAS RECEITAS ADUANEIRAS CONCLUÍDA: 1.200.000 DB AGUARDAM NA CORTE", "関税収入の譲渡が完了。宮廷に1,200,000ダブロンが用意されています", "ABTRETUNG DER ZOLLEINNAHMEN ERFÜLLT: 1.200.000 DB WARTEN AM HOF", "CESSION DES RECETTES DOUANIÈRES EFFECTUÉE : 1 200 000 DB VOUS ATTENDENT À LA COUR", "CESJA DOCHODÓW CELNYCH WYKONANA: 1 200 000 DB CZEKA NA DWORZE", "關稅收入轉讓已履行：宮廷備有1,200,000達布隆", "관세 수입 양도 완료: 궁정에 1,200,000더블룬이 준비되어 있습니다"]],
    ["Dawn watch. The sea changes color before it changes its mind.", ["黎明值更。大海改变主意之前，先变了颜色。", "Рассветная вахта. Море меняет цвет раньше, чем меняет настроение.", "Guardia al alba. El mar cambia de color antes de cambiar de parecer.", "Vigília ao amanhecer. O mar muda de cor antes de mudar de ideia.", "夜明けの当直。海は気まぐれを起こす前に色を変える。", "Wache im Morgengrauen. Das Meer ändert seine Farbe, bevor es sich anders besinnt.", "Quart de l'aube. La mer change de couleur avant de changer d'avis.", "Wachta o świcie. Morze zmienia kolor, zanim zmieni zdanie.", "黎明值更。大海改變主意之前，先變了顏色。", "새벽 당직. 바다는 변덕을 부리기 전에 먼저 색을 바꿉니다."]],
    ["Dead Reckoning Anchorage", ["航位推算锚地", "Якорная стоянка «Счисление пути»", "Fondeadero de la estima", "Ancoradouro da Navegação Estimada", "推測航法の停泊地", "Ankerplatz der Koppelnavigation", "Mouillage de l'estime", "Kotwicowisko Zliczenia Drogi", "航位推算錨地", "추측 항법 정박지"]],
    ["Decline the warrant", ["拒绝这份委任状", "Отклонить каперское поручение", "Rechazar la patente de corso", "Recusar a carta de corso", "私掠の委任を断る", "Den Kaperauftrag ablehnen", "Refuser la commission de course", "Odrzuć zlecenie korsarskie", "拒絕這份委任狀", "사략 허가 임무를 거절합니다"]],
    ["Deep stores, light armament", ["充足补给，轻型武备", "Большой запас провианта, лёгкое вооружение", "Grandes reservas y armamento ligero", "Grandes provisões e armamento leve", "豊富な物資、軽武装", "Große Vorräte, leichte Bewaffnung", "Vastes réserves, armement léger", "Duże zapasy, lekkie uzbrojenie", "充足補給，輕型武備", "넉넉한 비축품, 가벼운 무장"]],
    ["DEFEAT {0} {1} SHIPS OFF NINGBO", ["击败宁波外海的{0}艘{1}船只", "ПОБЕДИТЕ {0} КОРАБЛЕЙ «{1}» У НИНБО", "DERROTA A {0} BARCOS DE {1} FRENTE A NINGBO", "DERROTE {0} NAVIOS DE {1} AO LARGO DE NINGBO", "寧波沖で{1}の船を{0}隻撃破", "BESIEGT {0} SCHIFFE VON {1} VOR NINGBO", "BATTEZ {0} NAVIRES DE {1} AU LARGE DE NINGBO", "POKONAJ {0} STATKÓW {1} U WYBRZEŻY NINGBO", "擊敗寧波外海的{0}艘{1}船隻", "닝보 앞바다에서 {1}의 선박 {0}척을 격파하세요"]],
    ["Defect to {0} for {1} db; attack {2}", ["以{1}达布隆投奔{0}；攻击{2}", "Перейти на сторону «{0}» за {1} дублонов и атаковать «{2}»", "Pasarse a {0} por {1} doblones y atacar a {2}", "Desertar para {0} por {1} dobrões e atacar {2}", "{1}ダブロンで{0}に寝返り、{2}を攻撃する", "Für {1} Dublonen zu {0} überlaufen und {2} angreifen", "Passer à {0} pour {1} doublons et attaquer {2}", "Przejdź na stronę {0} za {1} dublonów i zaatakuj {2}", "以{1}達布隆投奔{0}；攻擊{2}", "{1}더블룬을 받고 {0}으로 투항해 {2}을 공격합니다"]],
    ["Deliver {0}", ["运送{0}", "Доставить: {0}", "Entregar {0}", "Entregar {0}", "{0}を届ける", "{0} abliefern", "Livrer {0}", "Dostarcz {0}", "運送{0}", "{0} 전달"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1350Overrides() {
  const entries = [
    ["Deliver Testaments {0}/{1}", ["分送《圣经》 {0}/{1}", "Доставить Священное Писание {0}/{1}", "Distribuir las Escrituras {0}/{1}", "Distribuir as Escrituras {0}/{1}", "聖書を届ける {0}/{1}", "Schriften verteilen {0}/{1}", "Distribuer les Écritures {0}/{1}", "Dostarcz Pismo Święte {0}/{1}", "分送《聖經》 {0}/{1}", "성경을 전달하세요 {0}/{1}"]],
    ["Deliver your package to {0} first, Captain. Then the council can hear your petition.", ["船长，请先把货件送到{0}。之后议会才能听取您的请愿。", "Сначала доставьте посылку в {0}, капитан. Тогда совет сможет выслушать ваше прошение.", "Capitán, lleva primero el encargo a {0}. Después, el consejo podrá escuchar tu petición.", "Capitão, entregue primeiro a encomenda em {0}. Depois, o conselho poderá ouvir sua petição.", "船長、まず{0}に荷を届けてください。その後、評議会が請願を聞きます。", "Liefert Euren Auftrag zuerst nach {0}, Kapitän. Danach kann der Rat Euer Gesuch anhören.", "Capitaine, livrez d'abord le pli à {0}. Le conseil pourra ensuite entendre votre requête.", "Kapitanie, najpierw dostarcz przesyłkę do {0}. Potem rada wysłucha twojej prośby.", "船長，請先把貨件送到{0}。之後議會才能聽取您的請願。", "선장님, 먼저 {0}에 물품을 전달하세요. 그 뒤에 의회가 청원을 들을 수 있습니다."]],
    ["Delivered: {0}/{1}.", ["已送达：{0}/{1}。", "Доставлено: {0}/{1}.", "Entregados: {0}/{1}.", "Entregues: {0}/{1}.", "配達済み：{0}/{1}。", "Abgeliefert: {0}/{1}.", "Livrés : {0}/{1}.", "Dostarczono: {0}/{1}.", "已送達：{0}/{1}。", "전달 완료: {0}/{1}."]],
    ["Denali rises from low country with scarcely any warning, an immense wall of snow above rivers and dark forest. Clouds crossed its middle while the summit remained in another weather.", ["德纳利山从低地骤然拔起，宛如耸立在河流与深色森林之上的巨大雪墙。云层掠过山腰，峰顶却处在另一片天候之中。", "Денали резко поднимается над низменностями, словно огромная снежная стена над реками и тёмным лесом. Облака закрыли его середину, а на вершине стояла совсем другая погода.", "El Denali se alza de pronto sobre las tierras bajas, como una inmensa muralla de nieve sobre ríos y bosques oscuros. Las nubes cubrían sus laderas mientras en la cumbre reinaba otro tiempo.", "O Denali se ergue abruptamente acima das terras baixas, uma imensa muralha de neve sobre rios e florestas escuras. As nuvens cruzavam suas encostas, enquanto o cume tinha outro tempo.", "デナリは低地から突如そびえ、川と暗い森の上に巨大な雪壁を築いています。雲が山腹を横切る一方、頂上は別の天候に包まれていました。", "Denali erhebt sich unvermittelt aus dem Tiefland, eine gewaltige Schneewand über Flüssen und dunklen Wäldern. Wolken zogen über seine Flanken, während am Gipfel ganz anderes Wetter herrschte.", "Le Denali surgit brusquement des basses terres, immense mur de neige au-dessus des rivières et des forêts sombres. Les nuages traversaient ses flancs tandis qu'un autre temps régnait au sommet.", "Denali wyrasta nagle ponad nizinami niczym ogromna ściana śniegu nad rzekami i ciemnym lasem. Chmury przesuwały się po jego zboczach, podczas gdy na szczycie panowała zupełnie inna pogoda.", "德納利山從低地驟然拔起，宛如聳立在河流與深色森林之上的巨大雪牆。雲層掠過山腰，峰頂卻處在另一片天候之中。", "데날리는 저지대 위로 갑자기 솟아올라 강과 어두운 숲 위에 거대한 눈 장벽을 이룹니다. 구름은 산허리를 지나갔지만 정상에는 전혀 다른 날씨가 머물렀습니다."]],
    ["Delivered: {0}/{1}.", ["已送达：{0}/{1}。", "Доставлено: {0}/{1}.", "Entregados: {0}/{1}.", "Entregues: {0}/{1}.", "配達済み：{0}/{1}。", "Abgeliefert: {0}/{1}.", "Livrés : {0}/{1}.", "Dostarczono: {0}/{1}.", "已送達：{0}/{1}。", "전달 완료: {0}/{1}."]],
    ["Diet of Worms dialogue", ["沃尔姆斯帝国议会对话", "Диалог о Вормсском рейхстаге", "Diálogo sobre la Dieta de Worms", "Diálogo sobre a Dieta de Worms", "ヴォルムス帝国議会の会話", "Dialog zum Reichstag zu Worms", "Dialogue sur la diète de Worms", "Dialog o sejmie w Wormacji", "沃爾姆斯帝國議會對話", "보름스 제국의회 대화"]],
    ["Dismiss", ["遣散", "Отпустить", "Despedir", "Dispensar", "解雇", "Entlassen", "Renvoyer", "Zwolnij", "遣散", "해고"]],
    ["Dismiss {0} crew before taking this vessel.", ["接管这艘船前，请遣散{0}名船员。", "Перед тем как принять это судно, распустите {0} членов экипажа.", "Despide a {0} tripulantes antes de hacerte con este barco.", "Dispense {0} tripulantes antes de assumir este navio.", "この船を引き継ぐ前に乗組員を{0}人解雇してください。", "Entlasst {0} Besatzungsmitglieder, bevor Ihr dieses Schiff übernehmt.", "Renvoyez {0} membres d'équipage avant de prendre possession de ce navire.", "Zwolnij {0} członków załogi przed przejęciem tego statku.", "接管這艘船前，請遣散{0}名船員。", "이 선박을 인수하기 전에 선원 {0}명을 해고하세요."]],
    ["Diu kept its walls free of Portugal. Your estate was less fortunate with me.", ["第乌城墙未曾落入葡萄牙人之手。至于你的家产，在我这里可没这么幸运。", "Дию удалось не пустить португальцев за свои стены. Вашему поместью со мной повезло меньше.", "Diu mantuvo a Portugal lejos de sus murallas. Tu hacienda tuvo menos suerte conmigo.", "Diu manteve Portugal longe de suas muralhas. Seu patrimônio não teve a mesma sorte comigo.", "ディウはポルトガル勢を城壁の内に入れませんでした。だが、あなたの屋敷は私に奪われてしまいましたね。", "Diu hielt Portugal von seinen Mauern fern. Euer Besitz hatte bei mir weniger Glück.", "Diu a tenu les Portugais à l'écart de ses remparts. Votre domaine a eu moins de chance avec moi.", "Diu nie dopuściło Portugalczyków za swoje mury. Twój majątek miał ze mną mniej szczęścia.", "第烏城牆未曾落入葡萄牙人之手。至於你的家產，在我這裡可沒這麼幸運。", "디우는 포르투갈을 성벽 밖에 막아 냈지만, 당신의 영지는 나를 막아 내지 못했지요."]],
    ["Do you think the fish smell us coming, or have they gone mercifully numb?", ["你说鱼是闻到我们来了，还是已经麻木得感觉不到了？", "Как думаешь, рыбы чуют наше приближение или, к счастью, уже ничего не чувствуют?", "¿Crees que los peces nos huelen venir o que, por suerte, ya se han quedado insensibles?", "Acha que os peixes sentem nosso cheiro ou já ficaram misericordiosamente entorpecidos?", "魚は私たちの気配を嗅ぎつけているのかな。それとも、ありがたいことに感覚が鈍ってしまったのかな。", "Glaubst du, die Fische wittern uns schon, oder sind sie gnädigerweise taub geworden?", "Tu crois que les poissons nous sentent arriver, ou qu'ils sont heureusement devenus insensibles ?", "Myślisz, że ryby wyczuwają nasze nadejście, czy na szczęście już zdrętwiały?", "你說魚是聞到我們來了，還是已經麻木得感覺不到了？", "물고기들이 우리 냄새를 맡고 있을까요, 아니면 다행히 감각이 무뎌졌을까요?"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1400Overrides() {
  const entries = [
    ["Does that strange bear earn its passage, or does it merely eat the provisions?", ["那只奇怪的熊真能帮上忙、配得上船上的口粮吗？还是只会吃东西？", "Этот странный медведь приносит пользу на корабле или только ест припасы?", "¿Ese oso tan peculiar se gana el sustento a bordo o solo se come las provisiones?", "Será que esse urso esquisito faz por merecer sua comida a bordo ou só consome as provisões?", "あの妙なクマは船の食い扶持に見合う働きをするのかな。それとも食料を食べるだけ？", "Verdient dieser seltsame Bär sein Futter an Bord, oder frisst er nur die Vorräte?", "Cet étrange ours mérite-t-il sa ration à bord, ou ne fait-il que manger les provisions ?", "Czy ten osobliwy niedźwiedź zasługuje na wyżywienie na pokładzie, czy tylko zjada zapasy?", "那隻奇怪的熊真能幫上忙、配得上船上的口糧嗎？還是只會吃東西？", "저 이상한 곰은 배에서 제 몫을 하나요, 아니면 식량만 축내나요?"]],
    ["Does your small black-and-white officer always smell so strongly of fish?", ["你那位黑白相间的小军官总是这么一身鱼腥味吗？", "Ваш маленький черно-белый офицер всегда так сильно пахнет рыбой?", "¿Tu pequeño oficial blanquinegro siempre huele tanto a pescado?", "Seu pequeno oficial preto e branco sempre cheira tanto a peixe?", "その白黒の小さな士官は、いつもこんなに魚臭いのですか？", "Riecht Euer kleiner schwarz-weißer Offizier immer so stark nach Fisch?", "Votre petit officier noir et blanc sent-il toujours aussi fort le poisson ?", "Czy ten mały czarno-biały oficer zawsze tak mocno pachnie rybą?", "你那位黑白相間的小軍官總是這麼一身魚腥味嗎？", "그 작고 흑백인 장교는 늘 이렇게 생선 냄새가 심한가요?"]],
    ["Doge", ["威尼斯总督", "Дож", "Dogo", "Dogio", "ドージェ", "Doge", "Doge", "doża", "威尼斯總督", "도제"]],
    ["Doge {0}", ["威尼斯总督{0}", "Дож {0}", "Dogo {0}", "Dogio {0}", "ドージェ{0}", "Doge {0}", "doge {0}", "doża {0}", "威尼斯總督{0}", "도제 {0}"]],
    ["Dominican supporters' purse", ["多米尼加修士支持者的捐款", "Пожертвования сторонников доминиканцев", "Donativo de quienes apoyan a los dominicos", "Doação dos apoiadores dos dominicanos", "ドミニコ会士の支援者からの寄付", "Spende der Unterstützer der Dominikaner", "Don des partisans des dominicains", "Datek od stronników dominikanów", "多明尼加修士支持者的捐款", "도미니코회 지지자들의 후원금"]],
    ["Set a double watch whenever we carry precious metal. Greed travels farther than any pirate.", ["船上载有贵金属时要加派瞭望。贪婪比任何海盗都传得更远。", "Когда на борту драгоценный металл, выставляйте двойную вахту. Алчность проникает дальше любого пирата.", "Redobla la guardia cuando transportes metales preciosos. La codicia llega más lejos que cualquier pirata.", "Dobre a vigilância sempre que levarmos metais preciosos. A cobiça vai mais longe que qualquer pirata.", "貴金属を運ぶ時は見張りを倍にしよう。欲深さはどんな海賊より遠くまで届く。", "Wenn wir Edelmetalle an Bord haben, verdoppeln wir die Wache. Habgier reicht weiter als jeder Pirat.", "Doublons la garde quand nous transportons des métaux précieux. La cupidité va plus loin que n'importe quel pirate.", "Podwójmy wartę, gdy przewozimy szlachetne kruszce. Chciwość sięga dalej niż każdy pirat.", "船上載有貴金屬時要加派瞭望。貪婪比任何海盜都傳得更遠。", "귀금속을 실으면 경계를 두 배로 강화하자. 탐욕은 어떤 해적보다 멀리 퍼진다."]],
    ["Duke", ["公爵", "герцог", "duque", "duque", "公爵", "Herzog", "duc", "książę", "公爵", "공작"]],
    ["Duke {0}", ["公爵{0}", "герцог {0}", "duque {0}", "duque {0}", "{0}公爵", "Herzog {0}", "duc {0}", "książę {0}", "公爵{0}", "{0} 공작"]],
    ["EARLIER ACCOUNTS", ["往期账目", "ПРЕДЫДУЩИЕ СЧЕТА", "CUENTAS ANTERIORES", "CONTAS ANTERIORES", "過去の会計", "FRÜHERE ABRECHNUNGEN", "COMPTES PRÉCÉDENTS", "WCZEŚNIEJSZE RACHUNKI", "往期帳目", "이전 장부"]],
    ["Earlier ledger activity ({0} entries)", ["较早的账簿记录（{0}条）", "Ранние записи в журнале ({0})", "Movimientos anteriores del libro mayor ({0} asientos)", "Lançamentos anteriores no livro-razão ({0})", "過去の元帳記録（{0}件）", "Frühere Buchungen im Hauptbuch ({0} Einträge)", "Écritures antérieures du grand livre ({0})", "Wcześniejsze zapisy w księdze ({0})", "이전 원장 내역({0}건)", "較早的帳簿紀錄（{0}筆）"]],
    ["Eat bamboo, avoid all work, and remain aboard", ["吃竹子，不干活，继续留在船上", "Есть бамбук, уклоняться от работы и оставаться на борту", "Comer bambú, evitar todo trabajo y quedarse a bordo", "Comer bambu, evitar todo trabalho e ficar a bordo", "竹を食べ、仕事はせず、船に居続ける", "Bambus fressen, jede Arbeit meiden und an Bord bleiben", "Manger du bambou, éviter tout travail et rester à bord", "Jeść bambus, unikać wszelkiej pracy i pozostać na pokładzie", "吃竹子，不做事，繼續留在船上", "대나무를 먹고 일은 피하며 배에 계속 머물기"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1450Overrides() {
  const entries = [
    ["Eats as much as three people, drinks as much as one, and contributes nothing to shipboard work.", ["吃得和三个人一样多，喝得和一个人一样多，对船上的活儿却毫无贡献。", "Ест за троих, пьёт за одного и ничем не помогает на корабле.", "Come como tres personas, bebe como una y no ayuda en nada con las tareas a bordo.", "Come como três pessoas, bebe como uma e não ajuda em nada no trabalho a bordo.", "三人分の食事と一人分の水を消費するが、船の仕事は何もしない。", "Isst wie drei, trinkt wie einer und hilft an Bord überhaupt nicht mit.", "Il mange comme trois personnes, boit comme une et ne participe en rien au travail à bord.", "Je jak trzy osoby, pije jak jedna i w niczym nie pomaga przy pracy na statku.", "吃得和三個人一樣多，喝得和一個人一樣多，對船上的活兒卻毫無貢獻。", "세 사람 몫을 먹고 한 사람 몫을 마시면서 선상 일은 전혀 돕지 않습니다."]],
    ["Eats two fish rations each day and contributes nothing to shipboard work. If there is no fish aboard, he catches his own.", ["每天吃两份鱼粮，对船上的活儿毫无贡献。船上没鱼时，他会自己捕。", "Каждый день съедает две рыбные порции и ничем не помогает на корабле. Если рыбы на борту нет, он ловит её сам.", "Come dos raciones de pescado al día y no ayuda en nada a bordo. Si no hay pescado, pesca por su cuenta.", "Come duas porções de peixe por dia e não ajuda em nada a bordo. Se não houver peixe no navio, ele mesmo pesca.", "毎日魚を二人前食べるが、船の仕事は何もしない。船に魚がなければ自分で捕る。", "Isst täglich zwei Fischrationen und hilft an Bord überhaupt nicht mit. Gibt es keinen Fisch, fängt er sich selbst welchen.", "Il mange deux rations de poisson par jour et ne participe pas au travail à bord. S'il n'y a pas de poisson, il pêche lui-même.", "Codziennie zjada dwie rybne racje i nie pomaga przy pracy na statku. Gdy nie ma ryb, łowi je sam.", "每天吃兩份魚糧，對船上的活兒毫無貢獻。船上沒魚時，牠會自己捕。", "매일 생선 2인분을 먹고 선상 일은 돕지 않습니다. 배에 생선이 없으면 직접 잡습니다."]],
    ["Echigo's governor and deputy may dispute authority. Neither disputes my seal.", ["越后守与副官或许会争权，但没人敢质疑我的印信。", "Губернатор Этиго и его заместитель могут спорить о полномочиях. Но мою печать никто не оспаривает.", "El gobernador de Echigo y su adjunto pueden disputarse la autoridad. Ninguno cuestiona mi sello.", "O governador de Echigo e seu vice podem disputar autoridade. Nenhum dos dois contesta meu selo.", "越後の守護とその代官は権限を争うかもしれませんが、私の印判には誰も異を唱えません。", "Echigos Statthalter und sein Stellvertreter mögen um die Macht streiten. Mein Siegel stellt keiner infrage.", "Le gouverneur d'Echigo et son adjoint peuvent se disputer le pouvoir. Aucun ne conteste mon sceau.", "Gubernator Echigo i jego zastępca mogą spierać się o władzę. Żaden nie podważa mojego pieczęci.", "越後守與副官或許會爭權，但沒人敢質疑我的印信。", "에치고의 통치자와 대리인은 권한을 다툴 수 있지만, 내 인장은 누구도 문제 삼지 않습니다."]],
    ["Eight hundred people cannot live from a military chest. Add", ["八百人不能只靠军饷过活。再添上", "Восемьсот человек не прокормить из военной казны. Добавьте", "Ochocientas personas no pueden vivir del erario militar. Añade", "Oitocentas pessoas não vivem só do tesouro militar. Acrescente", "800人は軍資金だけでは暮らせません。さらに", "Achthundert Menschen können nicht aus der Kriegskasse leben. Ergänzt", "Huit cents personnes ne peuvent vivre sur la caisse militaire. Ajoutez", "Osiemset osób nie wyżywi się z wojskowej kasy. Dodaj", "八百人不能只靠軍餉過活。再添上", "800명은 군자금만으로 살아갈 수 없습니다. 더 보태세요"]],
    ["Elector", ["选帝侯", "курфюрст", "elector", "eleitor", "選帝侯", "Kurfürst", "électeur", "elektor", "選帝侯", "선제후"]],
    ["Elector {0}", ["选帝侯{0}", "курфюрст {0}", "elector {0}", "eleitor {0}", "選帝侯{0}", "Kurfürst {0}", "électeur {0}", "elektor {0}", "選帝侯{0}", "선제후 {0}"]],
    ["Electoral Cologne", ["科隆选侯国", "Кёльнское курфюршество", "Electorado de Colonia", "Eleitorado de Colônia", "ケルン選帝侯領", "Kurköln", "Électorat de Cologne", "Elektorat Koloński", "科隆選侯國", "쾰른 선제후령"]],
    ["Electoral Palatinate", ["普法尔茨选侯国", "Курпфальц", "Electorado del Palatinado", "Eleitorado do Palatinado", "プファルツ選帝侯領", "Kurpfalz", "Électorat palatin", "Elektorat Palatynatu", "普法爾茨選侯國", "팔츠 선제후령"]],
    ["Electoral Saxon", ["萨克森选侯国的", "курфюршеский саксонский", "sajón del Electorado", "saxão do Eleitorado", "ザクセン選帝侯領の", "kursächsisch", "de l'électorat de Saxe", "elektorski saski", "薩克森選侯國的", "작센 선제후령의"]],
    ["Electoral Saxony", ["萨克森选侯国", "Курфюршество Саксония", "Electorado de Sajonia", "Eleitorado da Saxônia", "ザクセン選帝侯領", "Kursachsen", "Électorat de Saxe", "Elektorat Saksonii", "薩克森選侯國", "작센 선제후령"]],
    ["Electorate of Cologne", ["科隆选侯国", "Кёльнское курфюршество", "Electorado de Colonia", "Eleitorado de Colônia", "ケルン選帝侯領", "Kurfürstentum Köln", "Électorat de Cologne", "Elektorat Koloński", "科隆選侯國", "쾰른 선제후령"]],
    ["Electorate of Mainz", ["美因茨选侯国", "Майнцское курфюршество", "Electorado de Maguncia", "Eleitorado de Mainz", "マインツ選帝侯領", "Kurfürstentum Mainz", "Électorat de Mayence", "Elektorat Moguncji", "美因茨選侯國", "마인츠 선제후령"]],
    ["Electorate of Saxony", ["萨克森选侯国", "Курфюршество Саксония", "Electorado de Sajonia", "Eleitorado da Saxônia", "ザクセン選帝侯領", "Kurfürstentum Sachsen", "Électorat de Saxe", "Elektorat Saksonii", "薩克森選侯國", "작센 선제후령"]],
    ["Electorate of Trier", ["特里尔选侯国", "Трирское курфюршество", "Electorado de Tréveris", "Eleitorado de Trier", "トリーア選帝侯領", "Kurfürstentum Trier", "Électorat de Trèves", "Elektorat Trewiru", "特里爾選侯國", "트리어 선제후령"]],
    ["electoral envoy", ["选侯国使节", "посланник курфюрста", "enviado del Electorado", "enviado do Eleitorado", "選帝侯領の使節", "Gesandter des Kurfürsten", "envoyé de l'électorat", "poseł elektora", "選侯國使節", "선제후국 사절"]],
    ["EMBARGO FINE {0} DB", ["禁运违规罚款 {0} DB", "ШТРАФ ЗА НАРУШЕНИЕ ЭМБАРГО: {0} DB", "MULTA POR VIOLAR EL EMBARGO: {0} DB", "MULTA POR VIOLAÇÃO DO EMBARGO: {0} DB", "禁輸違反の罰金 {0} DB", "STRAFE WEGEN EMBARGOVERSTOS: {0} DB", "AMENDE POUR VIOLATION DE L'EMBARGO : {0} DB", "GRZYWNA ZA ZŁAMANIE EMBARGA: {0} DB", "禁運違規罰款 {0} DB", "금수 조치 위반 벌금: {0} DB"]],
    ["EMBARGOED CARGO SURRENDERED {0}", ["已缴交禁运货物：{0}", "ЗАПРЕЩЁННЫЙ ГРУЗ СДАН: {0}", "CARGA EMBARGADA ENTREGADA: {0}", "CARGA SOB EMBARGO ENTREGUE: {0}", "禁輸品を引き渡しました：{0}", "EMBARGIERTE FRACHT ABGEGEBEN: {0}", "CARGAISON SOUS EMBARGO REMISE : {0}", "PRZEKAZANO TOWAR OBJĘTY EMBARGIEM: {0}", "已繳交禁運貨物：{0}", "금수 대상 화물 인도 완료: {0}"]],
    ["Embark the conquistadors", ["让征服者登船", "Погрузите конкистадоров на корабль", "Embarca a los conquistadores", "Embarque os conquistadores", "コンキスタドールたちを乗船させる", "Die Konquistadoren an Bord nehmen", "Embarquer les conquistadors", "Zaokrętuj konkwistadorów", "讓征服者登船", "정복자들을 배에 태우세요"]],
    ["embassy cleric", ["使馆随行神职人员", "священнослужитель при посольстве", "clérigo de la embajada", "clérigo da embaixada", "使節団付きの聖職者", "Geistlicher der Botschaft", "clerc de l'ambassade", "duchowny przy ambasadzie", "使館隨行神職人員", "대사관 소속 성직자"]],
    ["Engaged by a {0}", ["遭到{0}袭击", "Атакован кораблём «{0}»", "Atacado por un {0}", "Atacado por um {0}", "{0}に攻撃された", "Von einem {0} angegriffen", "Attaqué par un {0}", "Zaatakowany przez {0}", "遭到{0}襲擊", "{0}에게 공격받음"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1500Overrides() {
  const entries = [
    ["Enough. Our colors are struck. Spare my crew, and your people may take the cargo and inspect the ship.", ["够了。我们已经降旗投降。饶过我的船员，你的人就可以接管货物并检查船只。", "Хватит. Мы спустили флаг. Пощадите мою команду — тогда ваши люди смогут забрать груз и осмотреть корабль.", "Basta. Hemos arriado la bandera. Perdona a mi tripulación y tu gente podrá llevarse la carga e inspeccionar el barco.", "Chega. Arriamos a bandeira. Poupe minha tripulação, e seu pessoal poderá levar a carga e inspecionar o navio.", "もう十分です。降伏の印に旗を降ろしました。乗組員を助けてくだされば、そちらの方々が貨物を引き取り、船を調べられます。", "Genug. Wir haben die Flagge gestrichen. Verschont meine Mannschaft, dann dürfen Eure Leute die Ladung übernehmen und das Schiff untersuchen.", "Assez. Nous avons amené nos couleurs. Épargnez mon équipage ; vos hommes pourront alors prendre la cargaison et inspecter le navire.", "Dość. Opuściliśmy banderę. Oszczędź moją załogę, a twoi ludzie będą mogli zabrać ładunek i przeszukać statek.", "夠了。我們已經降旗投降。饒過我的船員，你的人就可以接管貨物並檢查船隻。", "그만하시오. 우리는 항복의 뜻으로 깃발을 내렸소. 선원들을 살려 주면 당신네가 화물을 가져가고 배를 살펴봐도 좋소."]],
    ["My book maps every known place, but only a continuous voyage proves a circumnavigation. Sail around the world without stopping, return here, and bring me your ship's log of the route west and east.", ["我的书已绘出所有已知地点，但只有连续航行才能证明真正环绕世界。请不间断地航行一周，回到这座港口，并带来记录东西航程的航海日志。", "В моей книге нанесены все известные места, но кругосветное плавание ещё нужно доказать. Обогните мир без перерыва, вернитесь в эту гавань и принесите судовой журнал с записями о пути на запад и восток.", "Mi libro ya recoge todos los lugares conocidos, pero aún hace falta probar la circunnavegación. Da la vuelta al mundo sin interrupciones, regresa a este puerto y tráeme la bitácora de tus travesías hacia el oeste y el este.", "Meu livro já registra todos os lugares conhecidos, mas ainda falta provar a circum-navegação. Dê a volta ao mundo sem interrupções, retorne a este porto e traga o diário de bordo com o percurso a oeste e a leste.", "私の本には既知の場所がすべて記されていますが、世界一周の証明はまだです。途切れることなく世界を一周してこの港に戻り、西回りと東回りの航路を記した航海日誌を持ってきてください。", "In meinem Buch sind nun alle bekannten Orte verzeichnet, doch die Weltumsegelung muss noch bewiesen werden. Umsegelt die Welt ohne Unterbrechung, kehrt in diesen Hafen zurück und bringt mir Euer Logbuch mit den West- und Ostpassagen.", "Mon livre recense désormais tous les lieux connus, mais il reste à prouver qu'on peut faire le tour du monde. Naviguez sans interruption autour du globe, revenez dans ce port et apportez-moi votre journal de bord retraçant les routes vers l'ouest et vers l'est.", "W mojej księdze opisano już wszystkie znane miejsca, ale trzeba jeszcze dowieść, że można opłynąć świat. Żegluj bez przerwy dookoła globu, wróć do tego portu i przynieś dziennik pokładowy z zapisem trasy na zachód i wschód.", "我的書已繪出所有已知地點，但只有連續航行才能證明真正環繞世界。請不間斷地航行一周，回到這座港口，並帶來記錄東西航程的航海日誌。", "내 책에는 알려진 장소가 모두 기록되어 있지만, 세계 일주는 아직 증명되지 않았습니다. 항해를 중단하지 않고 세계를 돌아 이 항구로 돌아온 뒤, 서쪽과 동쪽 항로가 기록된 항해일지를 가져오세요."]],
    ["Every quay is full of rumors from Africa and India. I intend to learn which ones deserve a place on a royal chart.", ["每座码头都流传着来自非洲和印度的消息。我想查明哪些值得标在王室海图上。", "На каждой пристани пересказывают вести из Африки и Индии. Я выясню, какие из них достойны места на королевской карте.", "En cada muelle circulan noticias de África y la India. Averiguaré cuáles merecen figurar en una carta real.", "Em cada cais circulam notícias da África e da Índia. Quero descobrir quais merecem entrar numa carta náutica real.", "どの波止場にもアフリカやインドの噂があふれています。王室の海図に載せる価値のある情報を見極めたいのです。", "An jedem Kai kursieren Gerüchte aus Afrika und Indien. Ich will herausfinden, welche davon auf eine königliche Seekarte gehören.", "Chaque quai bruisse de nouvelles d'Afrique et d'Inde. Je veux savoir lesquelles méritent de figurer sur une carte royale.", "Każdy nabrzeżny targ pełen jest wieści z Afryki i Indii. Ustalę, które zasługują na miejsce na królewskiej mapie morskiej.", "每座碼頭都流傳著來自非洲和印度的消息。我想查明哪些值得標在王室海圖上。", "부두마다 아프리카와 인도에서 온 소문이 가득합니다. 그중 어떤 소식이 왕실 해도에 오를 만한지 알아보겠습니다."]],
    ["Every sailor inherits a world half chart and half rumor. I intend to learn which half is true.", ["每个水手继承的世界，一半画在海图上，一半来自传闻。我想查明哪一半才是真的。", "Мир каждого моряка наполовину состоит из карт, наполовину — из слухов. Я выясню, что из этого правда.", "Cada marinero hereda un mundo hecho mitad de cartas náuticas y mitad de rumores. Averiguaré qué mitad es cierta.", "Todo marinheiro herda um mundo feito metade de cartas náuticas, metade de rumores. Quero descobrir qual metade é verdadeira.", "船乗りが受け継ぐ世界は、半分が海図で半分が噂です。そのどちらが真実なのか確かめたいのです。", "Jeder Seemann erbt eine Welt, die zur Hälfte aus Seekarten und zur Hälfte aus Gerüchten besteht. Ich will herausfinden, was davon stimmt.", "Chaque marin hérite d'un monde fait pour moitié de cartes marines, pour moitié de rumeurs. Je veux découvrir quelle moitié est vraie.", "Każdy żeglarz dziedziczy świat złożony w połowie z map morskich, a w połowie z pogłosek. Ustalę, która połowa jest prawdziwa.", "每個水手繼承的世界，一半畫在海圖上，一半來自傳聞。我想查明哪一半才是真的。", "모든 선원이 물려받는 세계는 절반이 해도이고 절반은 소문입니다. 어느 쪽이 진실인지 알아내겠습니다."]],
    ["Every bit of spare hold space now holds gold: {0} units.", ["船舱的每一寸空余空间都装满了黄金：{0}单位。", "Теперь всё свободное место в трюме занято золотом: {0} ед.", "Ahora cada espacio libre de la bodega guarda oro: {0} unidades.", "Agora cada espaço livre do porão está cheio de ouro: {0} unidades.", "船倉の空きスペースはすべて金で埋まりました：{0}単位。", "Jeder freie Raum im Laderaum ist nun mit Gold gefüllt: {0} Einheiten.", "Chaque espace libre de la cale contient désormais de l'or : {0} unités.", "Całe wolne miejsce w ładowni wypełnia teraz złoto: {0} jednostek.", "船艙的每一寸空餘空間都裝滿了黃金：{0}單位。", "화물창의 빈 공간마다 금을 실었습니다: {0}단위."]],
    ["ESC", ["ESC", "ESC", "ESC", "ESC", "ESC", "ESC", "Échap", "ESC", "ESC", "ESC"]],
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1550Overrides() {
  const entries = [
    ["{0} now answers to {1}. You silenced its guns and kept faith with your commission. The treasury will honor the crown's word.", ["{0}现已归{1}统治。你令其炮火哑火，也履行了受托使命。王室金库会兑现承诺。", "Теперь {0} подчиняется державе «{1}». Вы заставили её орудия замолчать и выполнили поручение. Казна сдержит слово короны.", "{0} ahora pertenece a {1}. Silenciaste sus cañones y cumpliste tu misión. La Corona honrará su palabra.", "{0} agora está sob o domínio de {1}. Você silenciou seus canhões e cumpriu sua missão. O tesouro honrará a palavra da Coroa.", "{0}は{1}の支配下に入りました。砲撃を止め、任務を果たしました。王室の財務は約束を守るでしょう。", "{0} steht nun unter der Herrschaft von {1}. Ihr habt seine Geschütze zum Schweigen gebracht und Euren Auftrag erfüllt. Die Krone hält ihr Wort.", "{0} relève désormais de {1}. Vous avez réduit ses canons au silence et rempli votre mission. Le trésor royal tiendra parole.", "{0} podlega teraz {1}. Uciszyłeś jego działa i wykonałeś powierzone zadanie. Skarbiec dotrzyma słowa Korony.", "{0}現已歸{1}統治。你令其砲火啞火，也履行了受託使命。王室金庫會兌現承諾。", "{0}은 이제 {1}의 지배를 받습니다. 포를 침묵시키고 임무를 완수했습니다. 왕실 재무부가 약속을 지킬 것입니다."]],
    ["Far south, Vinson rose from an endless waste of ice, a dark rampart beneath a sun that barely circled the horizon. There was no tree, road, or chimney smoke for scale.", ["遥远的南方，文森峰从无边冰原中拔起，像一座暗色壁垒，耸立在几乎贴着地平线运行的太阳下。四周没有树木、道路或炊烟可供比照。", "Далеко на юге массив Винсон возвышался над бескрайними льдами тёмной стеной под солнцем, едва поднимавшимся над горизонтом. Ни деревьев, ни дорог, ни дыма из труб — ничто не давало понять его размеры.", "En el lejano sur, el macizo Vinson se alzaba como un oscuro bastión sobre el hielo interminable, bajo un sol que apenas rozaba el horizonte. No había árboles, caminos ni humo de chimeneas que dieran una escala.", "No extremo sul, o maciço Vinson erguia-se como uma muralha escura sobre o gelo sem fim, sob um sol que mal se elevava no horizonte. Não havia árvores, estradas ou fumaça de chaminés que dessem a medida de sua escala.", "遥か南では、ヴィンソン山塊が果てしない氷原から暗い城壁のようにそびえ、地平線すれすれを巡る太陽の下に立っていました。大きさを測る木も道も煙突の煙もありません。", "Weit im Süden ragte das Vinson-Massiv wie ein dunkler Wall aus der endlosen Eiswüste auf, unter einer Sonne, die kaum über den Horizont stieg. Weder Bäume noch Straßen oder Schornsteinrauch boten einen Maßstab.", "Tout au sud, le massif Vinson dressait un rempart sombre au-dessus d'une mer de glace, sous un soleil qui rasait l'horizon. Ni arbres, ni routes, ni fumées de cheminée ne permettaient d'en mesurer l'échelle.", "Daleko na południu masyw Vinsona wyrastał z bezkresnej lodowej pustyni niczym ciemny wał pod słońcem ledwie wznoszącym się nad horyzontem. Nie było drzew, dróg ani dymu z kominów, które dawałyby punkt odniesienia.", "遙遠的南方，文森峰從無邊冰原中拔起，像一座暗色壁壘，聳立在幾乎貼著地平線運行的太陽下。四周沒有樹木、道路或炊煙可供比照。", "남쪽 먼 곳에서 빈슨산괴는 끝없는 얼음 황무지 위로 어두운 성벽처럼 솟아 있었습니다. 태양은 지평선 가까이를 겨우 맴돌았고, 크기를 가늠할 나무나 길, 굴뚝 연기도 없었습니다."]],
    ["Few vessels like your {0} have ever called here. The whole settlement has come down to watch the unfamiliar sail.", ["像{0}这样的船很少来此停靠。全村人都聚到岸边，观看这面陌生的船帆。", "Такие суда, как ваш {0}, редко заходят сюда. Всё поселение вышло посмотреть на незнакомый парус.", "Pocas embarcaciones como tu {0} han hecho escala aquí. Todo el asentamiento ha salido a ver esa vela desconocida.", "Poucos navios como o seu {0} já aportaram aqui. Todo o povoado veio ver aquela vela desconhecida.", "{0}のような船がここに寄港することはめったにありません。見慣れない帆を見ようと、集落中の人々が浜に出てきました。", "Nur selten läuft ein Schiff wie Eure {0} hier an. Die ganze Siedlung ist herbeigekommen, um das fremde Segel zu bestaunen.", "Il est rare qu'un navire comme votre {0} fasse escale ici. Tout le village est venu voir cette voile inconnue.", "Tak rzadko zawijają tu statki takie jak twój {0}. Cała osada wyszła zobaczyć nieznany żagiel.", "像{0}這樣的船很少來此停靠。全村人都聚到岸邊，觀看這面陌生的船帆。", "{0} 같은 배가 이곳에 들르는 일은 드뭅니다. 생소한 돛을 보려고 마을 사람들이 모두 물가로 나왔습니다."]],
    ["Few vessels like your {0} reach this isolated shore. The waterfront has emptied to see what crossed the horizon.", ["像{0}这样的船很少抵达这处偏远海岸。岸边的人们全都出来，想看看地平线那头驶来了什么。", "Такие суда, как ваш {0}, редко достигают этого уединённого берега. Все жители вышли к воде посмотреть, что появилось на горизонте.", "Pocos barcos como tu {0} llegan a esta costa aislada. La gente ha salido al muelle para ver qué apareció en el horizonte.", "Poucos navios como o seu {0} chegam a esta costa isolada. Todos foram à orla ver o que surgiu no horizonte.", "{0}のような船がこの人里離れた海岸に来ることはめったにありません。水平線の向こうから来たものを見ようと、人々は岸辺に集まりました。", "Nur wenige Schiffe wie Eure {0} erreichen diese abgelegene Küste. Die Uferpromenade hat sich geleert, denn alle wollen sehen, was am Horizont aufgetaucht ist.", "Peu de navires comme votre {0} atteignent cette côte isolée. Tout le monde a déserté le front de mer pour voir ce qui venait de l'horizon.", "Statki takie jak twój {0} rzadko docierają do tego odludnego brzegu. Mieszkańcy wyszli nad wodę zobaczyć, co pojawiło się na horyzoncie.", "像{0}這樣的船很少抵達這處偏遠海岸。岸邊的人們全都出來，想看看地平線那頭駛來了什麼。", "{0} 같은 배가 이 외딴 해안에 오는 일은 드뭅니다. 수평선 너머에서 온 것을 보려고 사람들이 모두 물가로 나왔습니다."]],
    ["Fine Lateen Sailcloth", ["优质三角帆布", "Высококачественная ткань для латинского паруса", "Tela fina para vela latina", "Lona fina para vela latina", "上質のラテンセイル用帆布", "Feines Tuch für Lateinersegel", "Toile fine pour voile latine", "Przednie płótno na żagiel łaciński", "優質三角帆布", "고급 라틴 세일용 범포"]],
    ["FISH MOVED OUT OF REACH", ["鱼群已游出捕捞范围", "РЫБА УШЛА ИЗ ЗОНЫ ДОСЯГАЕМОСТИ", "LOS PECES QUEDARON FUERA DE ALCANCE", "OS PEIXES SAÍRAM DO ALCANCE", "魚群が射程外へ移動しました", "DIE FISCHE SIND AUSSER REICHWEITE", "LES POISSONS SONT HORS DE PORTÉE", "ŁAWICA ODPŁYNĘŁA POZA ZASIĘG", "魚群已游出捕撈範圍", "물고기 떼가 잡을 수 있는 범위를 벗어났습니다"]],
    ["Fishers draw their canoes above the tide while families gather to see what your vessel carried across the sea.", ["渔民把独木舟拖到高潮线以上，家家户户聚来观看你的船从海那边带来了什么。", "Рыбаки вытаскивают каноэ выше приливной отметки, а семьи собираются посмотреть, что ваш корабль привёз из-за моря.", "Los pescadores arrastran sus canoas por encima de la línea de marea mientras las familias se reúnen para ver qué ha traído tu barco de ultramar.", "Os pescadores puxam suas canoas para além da linha da maré, enquanto as famílias se reúnem para ver o que seu navio trouxe de além-mar.", "漁師たちはカヌーを満潮線より上へ引き上げ、家族は船が海の向こうから運んできたものを見ようと集まります。", "Die Fischer ziehen ihre Kanus oberhalb der Flutlinie an Land. Die Familien versammeln sich, um zu sehen, was Euer Schiff über das Meer gebracht hat.", "Les pêcheurs tirent leurs pirogues au-dessus de la laisse de haute mer, tandis que les familles se rassemblent pour voir ce que votre navire a rapporté d'outre-mer.", "Rybacy wyciągają czółna powyżej linii przypływu, a rodziny zbierają się, by zobaczyć, co wasz statek przywiózł zza morza.", "漁民把獨木舟拖到高潮線以上，家家戶戶聚來觀看你的船從海那邊帶來了什麼。", "어부들은 카누를 만조선 위로 끌어 올리고, 가족들은 배가 바다 건너에서 무엇을 가져왔는지 보려고 모여듭니다."]],
    ["Farewell, captain. I am retiring from piracy before it ruins my retirement.", ["再见，船长。在海盗生涯毁了我的退休生活之前，我要金盆洗手。", "Прощайте, капитан. Я ухожу из пиратов, пока это занятие не испортило мне пенсию.", "Adiós, capitán. Dejo la piratería antes de que me arruine la jubilación.", "Adeus, capitão. Vou abandonar a pirataria antes que ela arruíne minha aposentadoria.", "さらばです、船長。海賊稼業に老後を台無しにされる前に、足を洗います。", "Lebt wohl, Kapitän. Ich gebe die Piraterie auf, bevor sie mir den Ruhestand ruiniert.", "Adieu, capitaine. J'abandonne la piraterie avant qu'elle ne gâche ma retraite.", "Żegnaj, kapitanie. Porzucam piractwo, zanim zrujnuje mi emeryturę.", "再見，船長。在海盜生涯毀了我的退休生活之前，我要金盆洗手。", "잘 가세요, 선장님. 해적질이 노후를 망치기 전에 그만두렵니다."]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1600Overrides() {
  const entries = [
    ["Many fishing boats work near shore. Mind their nets when you depart.", ["近岸有许多渔船作业。离港时小心别碰到他们的渔网。", "У берега много рыбацких лодок. Не повредите их сети, когда будете уходить.", "Hay muchos barcos de pesca cerca de la costa. Ten cuidado con sus redes al zarpar.", "Há muitos barcos de pesca perto da costa. Cuidado com as redes ao partir.", "岸近くでは多くの漁船が操業しています。出航の際は網に気をつけてください。", "In Küstennähe sind viele Fischerboote unterwegs. Achtet beim Auslaufen auf ihre Netze.", "De nombreux bateaux de pêche travaillent près du rivage. Prenez garde à leurs filets en partant.", "Przy brzegu łowi wiele łodzi rybackich. Uważaj na ich sieci podczas odpływania.", "近岸有許多漁船作業。離港時小心別碰到他們的漁網。", "해안 가까이에서 많은 어선이 조업합니다. 출항할 때 그물을 조심하세요."]],
    ["Fishing craft are working nearby. Keep outside their nets.", ["附近有渔船作业。请避开渔网。", "Поблизости работают рыбацкие суда. Держитесь подальше от их сетей.", "Hay barcos de pesca trabajando cerca. Mantente fuera de sus redes.", "Há barcos de pesca trabalhando por perto. Fique longe das redes.", "近くで漁船が操業しています。網に近づかないでください。", "In der Nähe sind Fischerboote unterwegs. Haltet Euch von ihren Netzen fern.", "Des bateaux de pêche travaillent à proximité. Évitez leurs filets.", "W pobliżu łowią statki rybackie. Omijaj ich sieci.", "附近有漁船作業。請避開漁網。", "근처에서 어선들이 조업 중입니다. 그물을 피해 가세요."]],
    ["Fishing odds +{0}", ["捕鱼成功率 +{0}", "Вероятность улова +{0}", "Probabilidad de pesca +{0}", "Chance de pesca +{0}", "釣果の確率 +{0}", "Fangchance +{0}", "Chance de capture +{0}", "Szansa na połów +{0}", "捕魚成功率 +{0}", "어획 확률 +{0}"]],
    ["Fishing odds x{0} / Max haul {1}", ["捕鱼成功率 ×{0} / 最大渔获 {1}", "Шанс улова ×{0} / Максимальный улов {1}", "Probabilidad de pesca ×{0} / Captura máxima {1}", "Chance de pesca ×{0} / Captura máxima {1}", "釣果の確率 ×{0} / 最大漁獲量 {1}", "Fangchance ×{0} / Höchstfang {1}", "Chance de capture ×{0} / Prise maximale {1}", "Szansa na połów ×{0} / Maks. połów {1}", "捕魚成功率 ×{0} / 最大漁獲 {1}", "어획 확률 ×{0} / 최대 어획량 {1}"]],
    ["Fishing rafts line the shore, and word of your arrival is already moving toward inland settlements.", ["渔筏沿岸停泊，你抵达的消息已传向内陆聚落。", "У берега стоят рыбацкие плоты, а весть о вашем прибытии уже разносится по поселениям в глубине материка.", "Las balsas de pesca bordean la costa, y la noticia de tu llegada ya se extiende hacia los asentamientos del interior.", "Jangadas de pesca alinham-se na costa, e a notícia de sua chegada já segue para os povoados do interior.", "海岸には漁筏が並び、到着の知らせはすでに内陸の集落へ伝わっています。", "Fischerflöße säumen das Ufer, und die Nachricht von Eurer Ankunft verbreitet sich bereits im Landesinneren.", "Des radeaux de pêche bordent le rivage, et la nouvelle de votre arrivée gagne déjà les villages de l'intérieur.", "Przy brzegu stoją tratwy rybackie, a wieść o twoim przybyciu dociera już do osad w głębi lądu.", "漁筏沿岸停泊，你抵達的消息已傳向內陸聚落。", "해안에는 어선들이 늘어서 있고, 도착 소식은 이미 내륙 마을로 퍼지고 있습니다."]],
    ["Five European captains race west with the first tea of spring. Deliver these ten sealed chests to London ahead of them for {0} db, or complete the race later for {1} db.", ["五位欧洲船长正竞相将今春首批茶叶运往西方。抢在他们之前把这十箱密封茶叶送到伦敦，可得{0}达布隆；稍后完成仍可得{1}达布隆。", "Пять европейских капитанов спешат на запад с первым весенним чаем. Доставьте десять запечатанных сундуков в Лондон раньше них и получите {0} дублонов; если закончите позже — {1}.", "Cinco capitanes europeos compiten por llevar al oeste el primer té de primavera. Entrega estos diez cofres sellados en Londres antes que ellos y gana {0} doblones; si terminas después, recibirás {1}.", "Cinco capitães europeus disputam o primeiro chá da primavera rumo ao oeste. Entregue estes dez baús lacrados em Londres antes deles e receba {0} dobrões; se chegar depois, receberá {1}.", "ヨーロッパの船長五人が、春一番の茶を西へ運ぶ競争をしています。先を越して密封箱十個をロンドンへ届ければ{0}ダブロン、後から完走しても{1}ダブロンを得られます。", "Fünf europäische Kapitäne wetteifern darum, den ersten Frühlingstee nach Westen zu bringen. Liefert diese zehn versiegelten Kisten vor ihnen nach London und erhaltet {0} Dublonen; kommt Ihr später an, gibt es {1}.", "Cinq capitaines européens rivalisent pour acheminer vers l'ouest le premier thé du printemps. Livrez ces dix coffres scellés à Londres avant eux pour {0} doublons ; terminez plus tard et vous recevrez {1}.", "Pięciu europejskich kapitanów ściga się, by dostarczyć na zachód pierwszą wiosenną herbatę. Dostarcz te dziesięć zapieczętowanych skrzyń do Londynu przed nimi, a otrzymasz {0} dublonów; za późniejsze ukończenie dostaniesz {1}.", "五位歐洲船長正競相將今春首批茶葉運往西方。搶在他們之前把這十箱密封茶葉送到倫敦，可得{0}達布隆；稍後完成仍可得{1}達布隆。", "유럽 선장 다섯 명이 봄 첫 차를 서쪽으로 나르며 경주 중입니다. 그들보다 먼저 봉인된 상자 열 개를 런던에 전하면 {0}더블룬을 받고, 늦게 완주해도 {1}더블룬을 받습니다."]],
    ["Five peaks rather than one: preserve their order. A careful sequence of silhouettes may identify the mountain from routes that never share the same view.", ["山峰有五座，不是一座；请记下它们的排列次序。不同航线看到的景色各异，依序记录轮廓或许能辨认出这座山。", "Вершин пять, а не одна: сохраните их порядок. Точная последовательность силуэтов поможет узнать гору на маршрутах, с которых она выглядит по-разному.", "Son cinco cumbres, no una: conserva su orden. Una secuencia precisa de siluetas puede ayudar a identificar la montaña desde rutas con vistas distintas.", "São cinco picos, não um: registre a ordem. A sequência cuidadosa das silhuetas pode identificar a montanha mesmo em rotas com vistas diferentes.", "峰は一つではなく五つです。並び順を記録してください。航路ごとに違う姿を見せる山も、輪郭を順に記せば見分けられるかもしれません。", "Es sind fünf Gipfel, nicht einer: Haltet ihre Reihenfolge fest. Eine genaue Folge der Silhouetten kann den Berg auch von Routen aus erkennen lassen, die ganz unterschiedliche Ansichten bieten.", "Il y a cinq sommets, pas un seul : notez leur ordre. Une série précise de silhouettes peut permettre d'identifier la montagne depuis des routes offrant des vues différentes.", "Szczytów jest pięć, nie jeden: zapamiętaj ich kolejność. Dokładna sekwencja sylwetek może pomóc rozpoznać górę z tras, z których wygląda inaczej.", "山峰有五座，不是一座；請記下它們的排列次序。不同航線看到的景色各異，依序記錄輪廓或許能辨認出這座山。", "봉우리는 하나가 아니라 다섯입니다. 순서를 기록하세요. 항로마다 모습이 달라도 실루엣을 차례로 살피면 산을 알아볼 수 있습니다."]],
    ["Flodden left Scotland short of heirs and long on unpaid accounts. Yours survived nicely.", ["弗洛登战役让苏格兰贵族损失了许多继承人，也留下了大笔未偿债务。你的家族债权倒是保留得很好。", "После Флоддена в Шотландии стало меньше наследников и больше неоплаченных долгов. А ваше требование пережило всех.", "Flodden dejó a Escocia con menos herederos y muchas deudas pendientes. Tu crédito, en cambio, sobrevivió muy bien.", "Flodden deixou a Escócia com menos herdeiros e muitas dívidas por pagar. Já o seu crédito sobreviveu muito bem.", "フロッデンの戦いでスコットランドは後継者を多く失い、未払いの借金も残しました。あなたの債権は無事に残ったようですね。", "Flodden kostete Schottland viele Erben und hinterließ unbezahlte Schulden. Eure Forderung hat sich gut gehalten.", "Flodden a privé l'Écosse de nombreux héritiers et lui a laissé des dettes impayées. Votre créance, elle, a bien survécu.", "Flodden pozbawiło Szkocję wielu dziedziców i pozostawiło niespłacone długi. Twoja wierzytelność przetrwała znakomicie.", "弗洛登之戰讓蘇格蘭貴族損失了許多繼承人，也留下了大筆未償債務。你的家族債權倒是保留得很好。", "플로든 전투로 스코틀랜드는 후계자를 많이 잃고 갚지 못한 빚을 떠안았습니다. 당신의 채권은 잘 살아남았군요."]],
    ["Food: 1 share / day", ["口粮：每日1份", "Провиант: 1 порция в день", "Víveres: 1 ración al día", "Provisões: 1 ração por dia", "食料：1日1人前", "Proviant: 1 Ration pro Tag", "Vivres : 1 ration par jour", "Proviant: 1 racja dziennie", "口糧：每日1份", "식량: 하루 1인분"]],
    ["Food: 3 shares / day", ["口粮：每日3份", "Провиант: 3 порции в день", "Víveres: 3 raciones al día", "Provisões: 3 rações por dia", "食料：1日3人前", "Proviant: 3 Rationen pro Tag", "Vivres : 3 rations par jour", "Proviant: 3 racje dziennie", "口糧：每日3份", "식량: 하루 3인분"]],
    ["Food lasts {0} longer", ["食物保鲜时间延长{0}", "Провиант хранится на {0} дольше", "Los alimentos se conservan un {0} más", "Os alimentos duram {0} a mais", "食料の保存期間が{0}延びます", "Proviant ist {0} länger haltbar", "Les vivres se conservent {0} plus longtemps", "Żywność zachowuje świeżość o {0} dłużej", "食物保鮮時間延長{0}", "식량 보존 기간이 {0} 늘어납니다"]],
    ["FOOD LOW", ["口粮不足", "МАЛО ПРОВИАНТА", "QUEDAN POCOS VÍVERES", "POUCAS PROVISÕES", "食料が不足", "PROVIANT WIRD KNAPP", "PROVISIONS BASSES", "MAŁO ŻYWNOŚCI", "口糧不足", "식량 부족"]],
    ["food and seed secured without relying on Algonquian provisions", ["自备粮食和种子，不依赖阿尔冈昆人的补给", "собственные продовольствие и семена без помощи алгонкинов", "alimentos y semillas propios, sin depender de los suministros algonquinos", "alimentos e sementes próprios, sem depender dos mantimentos algonquinos", "アルゴンキンの補給に頼らない食料と種子", "eigene Nahrung und Saat, unabhängig von den Vorräten der Algonkin", "vivres et semences autonomes, sans dépendre des provisions algonquines", "własna żywność i nasiona, bez polegania na zapasach Algonkinów", "自備糧食和種子，不依賴阿爾岡昆人的補給", "알곤킨족의 보급품에 의존하지 않는 식량과 씨앗"]],
    ["food and seed secured without relying on Powhatan provisions", ["自备粮食和种子，不依赖波瓦坦人的补给", "собственные продовольствие и семена без помощи поухатанов", "alimentos y semillas propios, sin depender de los suministros powhatan", "alimentos e sementes próprios, sem depender dos mantimentos powhatan", "ポウハタンの補給に頼らない食料と種子", "eigene Nahrung und Saat, unabhängig von den Vorräten der Powhatan", "vivres et semences autonomes, sans dépendre des provisions powhatan", "własna żywność i nasiona, bez polegania na zapasach Powhatanów", "自備糧食和種子，不依賴波瓦坦人的補給", "포와탄족의 보급품에 의존하지 않는 식량과 씨앗"]],
    ["Flemish Sailcloth", ["佛兰德优质帆布", "Фламандская парусина", "Lona flamenca para velas", "Lona flamenga para velas", "フランドル産の帆布", "Flämisches Segeltuch", "Toile à voile flamande", "Flamandzkie płótno żaglowe", "佛蘭德優質帆布", "플랑드르산 범포"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedCatalogRange1650Overrides() {
  const entries = [
    ["FOUND POLAR GAME", ["发现极地猎物", "НАЙДЕНА ПОЛЯРНАЯ ДОБЫЧА", "PIEZA DE CAZA POLAR ENCONTRADA", "CAÇA POLAR ENCONTRADA", "極地の獲物を発見", "POLARWILD GEFUNDEN", "GIBIER POLAIRE TROUVÉ", "ZNALEZIONO ZWIERZYNĘ POLARNĄ", "發現極地獵物", "극지 사냥감 발견"]],
    ["FOUND WILD GAME", ["发现猎物", "НАЙДЕНА ДОБЫЧА", "PIEZA DE CAZA ENCONTRADA", "CAÇA ENCONTRADA", "獲物を発見", "WILD GEFUNDEN", "GIBIER TROUVÉ", "ZNALEZIONO ZWIERZYNĘ", "發現獵物", "사냥감 발견"]],
    ["Fresh tracks led the party to game enough to replenish the stores.", ["循着新鲜足迹，队伍找到了足够的猎物，补充了储备。", "Свежие следы привели отряд к добыче, которой хватило для пополнения запасов.", "Las huellas recientes condujeron al grupo hasta suficiente caza para reponer las provisiones.", "Pegadas recentes levaram o grupo a caça suficiente para repor as provisões.", "新しい足跡をたどり、隊は備蓄を補えるだけの獲物を見つけました。", "Frische Spuren führten die Gruppe zu genügend Wild, um die Vorräte aufzufüllen.", "Des traces fraîches ont mené le groupe à assez de gibier pour refaire ses provisions.", "Świeże tropy doprowadziły grupę do zwierzyny, której starczyło na uzupełnienie zapasów.", "循著新鮮足跡，隊伍找到了足夠的獵物，補充了儲備。", "새 발자국을 따라간 일행은 식량을 보충할 만큼 충분한 사냥감을 찾았습니다."]],
    ["FRESH WATER REFILLED", ["淡水已补充", "ЗАПАС ПРЕСНОЙ ВОДЫ ПОПОЛНЕН", "AGUA DULCE REPUESTA", "ÁGUA DOCE REABASTECIDA", "真水を補給しました", "SÜẞWASSER AUFGEFÜLLT", "EAU DOUCE RÉAPPROVISIONNÉE", "UZUPEŁNIONO ZAPAS WODY PITNEJ", "淡水已補充", "민물을 보충했습니다"]],
    ["FISHERY DEPLETED", ["渔场资源枯竭", "РЫБНЫЕ ЗАПАСЫ ИСТОЩЕНЫ", "CALADERO AGOTADO", "PESQUEIRO ESGOTADO", "漁場が枯渇しました", "FISCHBESTAND ERSCHÖPFT", "ZONE DE PÊCHE ÉPUISÉE", "ŁOWISKO WYCZERPANE", "漁場資源枯竭", "어장이 고갈되었습니다"]],
    ["Found your first new city.", ["发现了你的第一座新城。", "Вы основали свой первый новый город.", "Has fundado tu primera ciudad nueva.", "Você fundou sua primeira cidade nova.", "初めて新しい都市を発見しました。", "Ihr habt Eure erste neue Stadt entdeckt.", "Vous avez découvert votre première nouvelle ville.", "Odkryto pierwsze nowe miasto.", "發現了你的第一座新城。", "첫 번째 새 도시를 발견했습니다."]],
    ["Found three new cities in one voyage.", ["一次航行发现了三座新城。", "За одно плавание открыты три новых города.", "Has descubierto tres ciudades nuevas en un solo viaje.", "Você descobriu três novas cidades em uma única viagem.", "一度の航海で新しい都市を三つ発見しました。", "Auf einer Reise habt Ihr drei neue Städte entdeckt.", "Vous avez découvert trois nouvelles villes en un seul voyage.", "Podczas jednego rejsu odkryto trzy nowe miasta.", "一次航行發現了三座新城。", "한 번의 항해에서 새 도시 세 곳을 발견했습니다."]],
    ["Found five new cities in a single voyage.", ["一次航行发现了五座新城。", "За одно плавание открыты пять новых городов.", "Has descubierto cinco ciudades nuevas en un solo viaje.", "Você descobriu cinco novas cidades em uma única viagem.", "一度の航海で新しい都市を五つ発見しました。", "Auf einer Reise habt Ihr fünf neue Städte entdeckt.", "Vous avez découvert cinq nouvelles villes en un seul voyage.", "Podczas jednego rejsu odkryto pięć nowych miast.", "一次航行發現了五座新城。", "한 번의 항해에서 새 도시 다섯 곳을 발견했습니다."]],
    ["Francis I is a prisoner in Madrid. Louise of Savoy sends negotiators to seek his release. Carry us to {0}; an Imperial escort will take us inland, then bring us home with Charles V's answer.", ["弗朗西斯一世被囚于马德里。萨伏依的路易丝派遣使节争取释放他。请送我们到{0}；帝国护卫将护送我们前往内陆，再带我们携查理五世的答复返航。", "Франциск I пленён в Мадриде. Луиза Савойская отправляет послов добиваться его освобождения. Доставьте нас в {0}; имперская охрана сопроводит нас вглубь страны, а затем мы вернёмся с ответом Карла V.", "Francisco I está preso en Madrid. Luisa de Saboya envía negociadores para conseguir su liberación. Llévanos a {0}; una escolta imperial nos acompañará tierra adentro y luego nos traerá de vuelta con la respuesta de Carlos V.", "Francisco I está preso em Madri. Luísa de Saboia envia negociadores para obter sua libertação. Leve-nos a {0}; uma escolta imperial nos acompanhará pelo interior e depois nos trará de volta com a resposta de Carlos V.", "フランソワ1世はマドリードに囚われています。サヴォイアのルイーズは解放を求めて使節を送ります。私たちを{0}まで運んでください。帝国の護衛が内陸まで送り届け、その後、カール5世の返答とともに帰港させてくれます。", "Franz I. ist in Madrid in Gefangenschaft. Louise von Savoyen entsendet Unterhändler, um seine Freilassung zu erwirken. Bringt uns nach {0}; eine kaiserliche Eskorte begleitet uns ins Landesinnere und anschließend mit Karls V. Antwort zurück.", "François Ier est prisonnier à Madrid. Louise de Savoie envoie des négociateurs pour obtenir sa libération. Conduisez-nous à {0} ; une escorte impériale nous accompagnera dans les terres, puis nous ramènera avec la réponse de Charles Quint.", "Franciszek I jest więziony w Madrycie. Ludwika Sabaudzka wysyła negocjatorów, by uzyskać jego uwolnienie. Zawieź nas do {0}; cesarska eskorta odprowadzi nas w głąb lądu, a potem wrócimy z odpowiedzią Karola V.", "法蘭西斯一世被囚於馬德里。薩伏依的路易絲派遣使節爭取釋放他。請送我們到{0}；帝國護衛將護送我們前往內陸，再帶我們攜查理五世的答覆返航。", "프랑수아 1세는 마드리드에 갇혀 있습니다. 사보이의 루이즈가 석방을 위해 협상단을 보냅니다. 우리를 {0}까지 데려다주세요. 제국 호위대가 내륙까지 동행한 뒤 카를 5세의 답을 가지고 돌아올 것입니다."]],
    ["Francis I remains prisoner in Madrid. Charles V sends his release articles to Louise of Savoy's council. Carry us to {0}, then bring her sealed answer back.", ["弗朗西斯一世仍被囚于马德里。查理五世将释放条款送交萨伏依的路易丝议事会。请送我们到{0}，再把她封缄的答复带回来。", "Франциск I всё ещё в плену в Мадриде. Карл V направляет Луизе Савойской условия освобождения. Доставьте нас в {0}, а затем привезите её запечатанный ответ.", "Francisco I sigue preso en Madrid. Carlos V envía las condiciones de su liberación al consejo de Luisa de Saboya. Llévanos a {0} y trae de vuelta su respuesta sellada.", "Francisco I continua preso em Madri. Carlos V envia os termos de sua libertação ao conselho de Luísa de Saboia. Leve-nos a {0} e depois traga de volta a resposta selada dela.", "フランソワ1世はまだマドリードに囚われています。カール5世は解放条件をサヴォイアのルイーズの評議会に送ります。私たちを{0}まで運び、その後、彼女の封印された返答を持ち帰ってください。", "Franz I. ist weiterhin in Madrid in Gefangenschaft. Karl V. schickt Louise von Savoyen die Bedingungen seiner Freilassung. Bringt uns nach {0} und anschließend ihre versiegelte Antwort zurück.", "François Ier est toujours prisonnier à Madrid. Charles Quint transmet les conditions de sa libération au conseil de Louise de Savoie. Conduisez-nous à {0}, puis rapportez sa réponse scellée.", "Franciszek I nadal jest więziony w Madrycie. Karol V przesyła warunki jego uwolnienia radzie Ludwiki Sabaudzkiej. Zawieź nas do {0}, a potem przywieź jej zapieczętowaną odpowiedź.", "法蘭西斯一世仍被囚於馬德里。查理五世將釋放條款送交薩伏依的路易絲議事會。請送我們到{0}，再把她封緘的答覆帶回來。", "프랑수아 1세는 여전히 마드리드에 갇혀 있습니다. 카를 5세가 석방 조건을 사보이의 루이즈 측에 보냅니다. 우리를 {0}까지 데려다준 뒤, 봉인된 답변을 가져오세요."]]
    , ["Fuji rises above the surrounding peaks as a near-perfect cone capped with snow. Its symmetry gives the mountain an almost deliberate grace above the fields, roads, and sea.", ["富士山高踞群峰之上，近乎完美的锥形山顶覆着白雪。匀称的山姿仿佛经过精心雕琢，俯瞰田野、道路与海面。", "Фудзи возвышается над соседними вершинами почти идеальным заснеженным конусом. Его симметрия придаёт горе почти рукотворную грацию над полями, дорогами и морем.", "El Fuji se alza sobre las cumbres vecinas como un cono nevado casi perfecto. Su simetría le da una gracia que parece deliberada, sobre los campos, caminos y el mar.", "O Fuji se ergue acima dos picos ao redor como um cone nevado quase perfeito. Sua simetria dá à montanha uma graça que parece intencional, sobre campos, estradas e mar.", "富士山は周囲の峰々を見下ろし、ほぼ完璧な雪化粧の円錐をなしています。その対称的な姿は、田畑や道、海を見下ろす山に、まるで意図して造られたかのような優美さを与えています。", "Der Fuji überragt die umliegenden Gipfel als nahezu perfekter, schneebedeckter Kegel. Seine Symmetrie verleiht dem Berg über Feldern, Straßen und Meer eine beinahe gewollte Anmut.", "Le Fuji domine les sommets alentour, cône enneigé presque parfait. Sa symétrie lui confère une grâce qui semble presque voulue, au-dessus des champs, des routes et de la mer.", "Fudżi góruje nad okolicznymi szczytami jako niemal idealny, ośnieżony stożek. Jego symetria nadaje górze niemal zamierzoną grację nad polami, drogami i morzem.", "富士山高踞群峰之上，近乎完美的錐形山頂覆著白雪。勻稱的山姿彷彿經過精心雕琢，俯瞰田野、道路與海面。", "후지산은 주변 봉우리 위로 거의 완벽한 눈 덮인 원뿔 모양으로 솟아 있습니다. 대칭적인 모습은 들판과 길, 바다를 굽어보는 산에 마치 의도해 빚은 듯한 우아함을 더합니다."]],
    ["French New France settlement", ["法属新法兰西定居点", "Французское поселение в Новой Франции", "Asentamiento francés en Nueva Francia", "Assentamento francês na Nova França", "フランス領ヌーベルフランスの入植地", "Französische Siedlung in Neufrankreich", "Établissement français en Nouvelle-France", "Francuska osada w Nowej Francji", "法屬新法蘭西定居點", "프랑스령 뉴프랑스 정착지"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [source, reviewedLocaleOverrides(source, translations)]));
}

function reviewedSupplyAndBriefOverrides() {
  const entries = [
    ["Captain, before you go: the outfitters have {0} ready.", ["船长，出发前：装备用品已备好，{0}。", "Капитан, перед отплытием: снаряжение готово — {0}.", "Capitán, antes de partir: el equipo {0} ya está listo.", "Capitão, antes de partir: o equipamento {0} já está pronto.", "船長、出航前にお知らせです。装備商が{0}を用意しました。", "Kapitän, bevor Ihr ablegt: Die Ausrüstung {0} ist bereit.", "Capitaine, avant votre départ, l'équipement est prêt : {0}.", "Kapitanie, przed wypłynięciem: sprzęt {0} jest już gotowy.", "船長，出發前：裝備用品已備好，{0}。", "선장님, 출항 전에 장비상에서 {0}을 준비했습니다."]],
    ["Captain, before you go: the outfitters have {0} ready. {1} I can have it fitted now for {2} doubloons.", ["船长，出发前：装备用品已备好，{0}。{1}现在花{2}达布隆就能安装。", "Капитан, перед отплытием снаряжение готово — {0}. {1} Его можно установить сейчас за {2} дублонов.", "Capitán, antes de partir, el equipo {0} ya está listo. {1} Puedo instalarlo ahora por {2} doblones.", "Capitão, antes de partir, o equipamento {0} já está pronto. {1} Posso instalá-lo agora por {2} dobrões.", "船長、出航前にお知らせです。装備商が{0}を用意しました。{1}{2}ダブロンで今すぐ取り付けられます。", "Kapitän, bevor Ihr ablegt: Die Ausrüstung {0} ist bereit. {1} Ich kann sie jetzt für {2} Dublonen einbauen lassen.", "Capitaine, avant votre départ, l'équipement {0} est prêt. {1} Je peux le faire installer dès maintenant pour {2} doublons.", "Kapitanie, przed wypłynięciem sprzęt {0} jest już gotowy. {1} Mogę go zamontować od razu za {2} dublonów.", "船長，出發前：裝備用品已備好，{0}。{1}現在花{2}達布隆就能安裝。", "선장님, 출항 전에 장비상에서 {0}을 준비했습니다. {1} 지금 {2}더블룬에 장착할 수 있습니다."]],
    ["{0} comes aboard with the briefs.{1}", [
      "{0}携密封文书登船。{1}", "{0} поднимается на борт с запечатанными бумагами.{1}",
      "{0} sube a bordo con los despachos.{1}", "{0} sobe a bordo com os despachos.{1}",
      "{0}が封印文書を携えて乗船します。{1}", "{0} kommt mit den versiegelten Schriftstücken an Bord.{1}",
      "{0} monte à bord avec les dépêches scellées.{1}", "{0} wchodzi na pokład z zapieczętowanymi pismami.{1}",
      "{0}攜密封文書登船。{1}", "{0}이 봉인된 문서를 가지고 승선합니다.{1}"
    ]],
    ["{0} accepted. Monsignor {1} comes aboard with the briefs.{2}", [
      "{0}已接受。蒙席{1}携密封文书登船。{2}", "{0} принято. Монсеньор {1} поднимается на борт с запечатанными бумагами.{2}",
      "{0} aceptado. Monseñor {1} sube a bordo con los despachos.{2}", "{0} aceito. Monsenhor {1} sobe a bordo com os despachos.{2}",
      "{0}を受諾しました。モンシニョール{1}が封印文書を携えて乗船します。{2}", "{0} angenommen. Monsignore {1} kommt mit den versiegelten Schriftstücken an Bord.{2}",
      "{0} accepté. Monseigneur {1} monte à bord avec les dépêches scellées.{2}", "{0} przyjęto. Monsignore {1} wchodzi na pokład z zapieczętowanymi pismami.{2}",
      "{0}已接受。蒙席{1}攜密封文書登船。{2}", "{0} 수락. 몬시뇰 {1}이 봉인된 문서를 가지고 승선합니다.{2}"
    ]],
    ["{0} accepted. Monsignor {1} comes aboard with the briefs.{2} Set a course for {3}.", [
      "{0}已接受。蒙席{1}携密封文书登船。{2}驶往{3}。", "{0} принято. Монсеньор {1} поднимается на борт с запечатанными бумагами.{2} Держите курс на {3}.",
      "{0} aceptado. Monseñor {1} sube a bordo con los despachos.{2} Poned rumbo a {3}.", "{0} aceito. Monsenhor {1} sobe a bordo com os despachos.{2} Traçai o rumo para {3}.",
      "{0}を受諾しました。モンシニョール{1}が封印文書を携えて乗船します。{2}{3}へ針路を取ってください。", "{0} angenommen. Monsignore {1} kommt mit den versiegelten Schriftstücken an Bord.{2} Nehmt Kurs auf {3}.",
      "{0} accepté. Monseigneur {1} monte à bord avec les dépêches scellées.{2} Mettez le cap sur {3}.", "{0} przyjęto. Monsignore {1} wchodzi na pokład z zapieczętowanymi pismami.{2} Obierzcie kurs na {3}.",
      "{0}已接受。蒙席{1}攜密封文書登船。{2}駛往{3}。", "{0} 수락. 몬시뇰 {1}이 봉인된 문서를 가지고 승선합니다.{2} {3}(으)로 항로를 잡으십시오."
    ]],
    ["{0} A timely resupply earns {1} doubloons and gives {2} the stores it needs to become a permanent city.", [
      "{0}及时补给可获得{1}达布隆，并为{2}提供成为永久城市所需的物资。", "{0}Своевременное снабжение принесёт {1} дублонов и даст {2} необходимые припасы, чтобы стать постоянным городом.",
      "{0}Un reabastecimiento a tiempo otorga {1} doblones y proporciona a {2} los suministros necesarios para convertirse en una ciudad permanente.", "{0}Um reabastecimento a tempo rende {1} dobrões e fornece a {2} os mantimentos necessários para se tornar uma cidade permanente.",
      "{0}期日どおりの補給で{1}ダブロンを得られ、{2}が恒久都市となるために必要な物資も届けられます。", "{0}Eine rechtzeitige Versorgung bringt {1} Dublonen ein und liefert {2} die Vorräte, die es für den Status einer dauerhaften Stadt benötigt.",
      "{0}Un ravitaillement effectué à temps rapporte {1} doublons et fournit à {2} les provisions nécessaires pour devenir une ville permanente.", "{0}Terminowe zaopatrzenie przynosi {1} dublonów i dostarcza {2} zapasów potrzebnych, by stało się stałym miastem.",
      "{0}及時補給可獲得{1}達布隆，並為{2}提供成為永久城市所需的物資。", "{0}제때 보급하면 더블룬 {1}닢을 얻고 {2}이 영구 도시가 되는 데 필요한 물자를 공급합니다."
    ]]
  ];
  const resupplySource = "{0} A timely resupply earns {1} doubloons and gives {2} the stores it needs to become a permanent city.";
  const resupplyTranslations = entries.find(([source]) => source === resupplySource)[1];
  for (const suffix of ["{3}", "{3}{4}"]) {
    entries.push([`${resupplySource}${suffix}`, resupplyTranslations.map((translation) => `${translation}${suffix}`)]);
  }
  entries.push(["gives {0} the stores it needs to become a permanent city.", [
    "为{0}提供成为永久城市所需的物资。", "даёт {0} необходимые припасы, чтобы стать постоянным городом.",
    "proporciona a {0} los suministros necesarios para convertirse en una ciudad permanente.", "fornece a {0} os mantimentos necessários para se tornar uma cidade permanente.",
    "{0}が恒久都市となるために必要な物資を届けます。", "liefert {0} die Vorräte, die es für den Status einer dauerhaften Stadt benötigt.",
    "fournit à {0} les provisions nécessaires pour devenir une ville permanente.", "dostarcza {0} zapasów potrzebnych, by stało się stałym miastem.",
    "為{0}提供成為永久城市所需的物資。", "{0}이 영구 도시가 되는 데 필요한 물자를 공급합니다."
  ]]);
  return Object.fromEntries(entries.map(([source, values]) => [source, reviewedLocaleOverrides(source, values)]));
}

function reviewedStandingOverrides() {
  const entries = [
    ["{0} Standing {1}/{2}.", [
      "{0} 声望 {1}/{2}。", "Репутация {0}: {1}/{2}.", "Reputación de {0}: {1}/{2}.", "Reputação de {0}: {1}/{2}.", "{0}の評判 {1}/{2}。", "{0} Ansehen {1}/{2}.", "Réputation de {0} : {1}/{2}.", "Reputacja {0}: {1}/{2}.", "{0} 聲望 {1}/{2}。", "{0} 평판 {1}/{2}."
    ]],
    ["{0} standing or better.", [
      "声望达到{0}或更高。", "Репутация не ниже {0}.", "Reputación de {0} o superior.", "Reputação de {0} ou superior.", "評判{0}以上。", "{0} Ansehen oder besser.", "Une réputation de {0} ou plus.", "Reputacja {0} lub wyższa.", "聲望達到{0}或更高。", "평판 {0} 이상."
    ]],
    ["{0} DEFENDED {1} STANDING +{2}", [
      "{0} 守住 {1}，声望 +{2}", "{0} защитил {1}. Репутация +{2}.", "{0} defendió {1}. Reputación +{2}.", "{0} defendeu {1}. Reputação +{2}.", "{0}が{1}を防衛。評判 +{2}", "{0} verteidigte {1}. Ansehen +{2}", "{0} a défendu {1}. Réputation +{2}", "{0} obronił {1}. Reputacja +{2}", "{0} 守住 {1}，聲望 +{2}", "{0}이(가) {1}을(를) 방어함. 평판 +{2}"
    ]],
    ["Standing adjustment", [
      "声望变化", "Изменение репутации", "Cambio de reputación", "Variação de reputação", "評判の変動", "Ansehensänderung", "Évolution de la réputation", "Zmiana reputacji", "聲望變化", "평판 변화"
    ]],
    ["{0} went ashore. Earned {1} db. Standing improved.", [
      "{0} 已上岸。获得 {1} DB。声望提高。", "{0} сошел на берег. Получено {1} DB. Репутация улучшилась.", "{0} desembarcó. Ganó {1} doblones. Mejoró su reputación.", "{0} desembarcou. Ganhou {1} DB. Sua reputação melhorou.", "{0}は上陸した。{1} DBを獲得。評判が上がった。", "{0} ging an Land. {1} DB verdient. Ansehen verbessert.", "{0} a débarqué. {1} DB gagnés. Réputation améliorée.", "{0} zeszedł na ląd. Zdobyto {1} DB. Reputacja wzrosła.", "{0} 已上岸。取得 {1} DB。聲望提高。", "{0}이(가) 상륙함. {1} DB 획득. 평판 상승."
    ]],
    ["Commission fulfilled. Earned {0} db. Standing greatly improved.", [
      "委托完成。获得 {0} DB。声望大幅提高。", "Поручение выполнено. Получено {0} DB. Репутация значительно улучшилась.", "Comisión cumplida. Ganó {0} doblones. Su reputación mejoró mucho.", "Comissão cumprida. Ganhou {0} DB. Sua reputação melhorou muito.", "任務完了。{0} DBを獲得。評判が大きく上がった。", "Auftrag erfüllt. {0} DB verdient. Ansehen deutlich verbessert.", "Commission remplie. {0} DB gagnés. Réputation grandement améliorée.", "Zlecenie wykonane. Zdobyto {0} DB. Reputacja znacznie wzrosła.", "委託完成。取得 {0} DB。聲望大幅提高。", "임무 완료. {0} DB 획득. 평판 크게 상승."
    ]],
    ["Delivered. Earned {0} db. Standing improved.", [
      "已送达。获得 {0} DB。声望提高。", "Доставлено. Получено {0} DB. Репутация улучшилась.", "Entrega completada. Ganó {0} doblones. Mejoró su reputación.", "Entrega concluída. Ganhou {0} DB. Sua reputação melhorou.", "配達完了。{0} DBを獲得。評判が上がった。", "Abgeliefert. {0} DB verdient. Ansehen verbessert.", "Livraison effectuée. {0} DB gagnés. Réputation améliorée.", "Dostarczono. Zdobyto {0} DB. Reputacja wzrosła.", "已送達。取得 {0} DB。聲望提高。", "배달 완료. {0} DB 획득. 평판 상승."
    ]],
    ["War-ending commission fulfilled. Earned {0} db. Standing transformed.", [
      "终战委托完成。获得 {0} DB。声望焕然一新。", "Поручение по прекращению войны выполнено. Получено {0} DB. Репутация преобразилась.", "Comisión para poner fin a la guerra cumplida. Ganó {0} doblones. Su reputación cambió por completo.", "Comissão para encerrar a guerra cumprida. Ganhou {0} DB. Sua reputação mudou por completo.", "終戦任務完了。{0} DBを獲得。評判が一変した。", "Auftrag zur Beendigung des Krieges erfüllt. {0} DB verdient. Ansehen grundlegend verändert.", "Commission de paix accomplie. {0} DB gagnés. Votre réputation a changé du tout au tout.", "Zlecenie kończące wojnę wykonane. Zdobyto {0} DB. Reputacja uległa przemianie.", "終戰委託完成。取得 {0} DB。聲望煥然一新。", "종전 임무 완료. {0} DB 획득. 평판이 완전히 달라짐."
    ]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedWatchShiftOverrides() {
  const entries = [
    ["A pinch of the tea would improve this watch beyond recognition.", [
      "一撮茶就能让这班岗轻松不少。", "Щепотка чая сделала бы эту вахту куда приятнее.", "Una pizca de té mejoraría mucho esta guardia.", "Uma pitada de chá tornaria este turno bem melhor.", "お茶をひとつまみ飲めば、この当直もずっと楽になる。", "Eine Prise Tee würde diese Wache deutlich angenehmer machen.", "Une pincée de thé rendrait ce quart bien plus agréable.", "Szczypta herbaty umiliłaby tę wachtę.", "一撮茶就能讓這班值勤輕鬆不少。", "차 한 꼬집이면 이번 당직이 훨씬 나아질 거야."
    ]],
    ["Christmas Day at last. When the watch allows it, we should say the Nativity office together.", [
      "终于到了圣诞节。等值勤允许，我们该一起诵念圣诞日课。", "Наконец-то Рождество. Когда позволит вахта, нам следует вместе прочесть рождественскую службу.", "Por fin es Navidad. Cuando lo permita la guardia, recemos juntos el oficio de la Natividad.", "Enfim, chegou o Natal. Quando o turno permitir, rezaremos juntos o ofício da Natividade.", "やっとクリスマスだ。当直が許せば、共に降誕祭の祈祷を唱えよう。", "Endlich ist Weihnachten. Wenn es die Wache erlaubt, sollten wir gemeinsam das Gebet zur Geburt Christi sprechen.", "Enfin, c'est Noël. Quand le quart le permettra, récitons ensemble l'office de la Nativité.", "Wreszcie Boże Narodzenie. Gdy pozwoli wachta, odmówmy wspólnie oficjum Narodzenia Pańskiego.", "終於到了聖誕節。等值勤允許，我們該一起誦念聖誕日課。", "드디어 성탄절이야. 당직이 허락하면 함께 성탄 기도를 드리자."
    ]],
    ["No, sleeping through the watch does not count as standing it.", [
      "不，值勤时睡觉可不算在岗。", "Нет, сон во время вахты не считается несением службы.", "No, dormir durante la guardia no cuenta como hacerla.", "Não, dormir durante o turno não conta como cumprir serviço.", "いや、当直中に眠っていては務めを果たしたことにならない。", "Nein, während der Wache zu schlafen gilt nicht als Wachdienst.", "Non, dormir pendant le quart ne compte pas comme monter la garde.", "Nie, przespanie wachty nie liczy się jako służba.", "不，值勤時睡覺可不算在崗。", "아니, 당직 중에 자는 건 근무한 게 아니야."
    ]],
    ["Then I will take your watch while you pray. If the cook finds a feast, all aboard may be glad of it.", [
      "那你祈祷时我来替你值勤。要是厨子找到好吃的，船上人人都会高兴。", "Тогда я заступлю вместо тебя на вахту, пока ты молишься. Если повар раздобудет пир, вся команда будет рада.", "Entonces te relevaré mientras rezas. Si el cocinero consigue un buen banquete, toda la tripulación se alegrará.", "Então assumirei seu turno enquanto você reza. Se o cozinheiro encontrar um banquete, todos a bordo ficarão contentes.", "では祈っている間は私が当直を代わろう。料理人がご馳走を見つければ、皆も喜ぶだろう。", "Dann übernehme ich deine Wache, während du betest. Wenn der Koch ein Festmahl auftreibt, freut sich die ganze Mannschaft.", "Je prendrai donc votre quart pendant que vous prierez. Si le cuisinier trouve un festin, tout l'équipage s'en réjouira.", "W takim razie obejmę twoją wachtę, gdy będziesz się modlić. Jeśli kucharz znajdzie ucztę, cała załoga się ucieszy.", "那你祈禱時我來替你值勤。要是廚子找到好吃的，船上人人都會高興。", "그럼 네가 기도하는 동안 내가 당직을 설게. 요리사가 잔치를 마련하면 모두 기뻐하겠지."
    ]],
    ["There they are! Sound the alarm! The watch recognizes your ship, and you barely escape. The port will remain alert for {0} day{1}.", [
      "他们在那里！快拉响警报！巡港守卫认出了你的船，你才勉强逃脱。港口还会戒备 {0} 天{1}。", "Вот они! Тревога! Портовая стража узнала ваш корабль, и вы едва успели уйти. Порт будет настороже ещё {0} день{1}.", "¡Ahí están! ¡Da la alarma! La patrulla del puerto reconoce tu barco y apenas logras escapar. El puerto seguirá alerta {0} día{1} más.", "Lá estão eles! Soe o alarme! A patrulha do porto reconhece seu navio, e você mal consegue escapar. O porto ficará alerta por mais {0} dia{1}.", "いたぞ！警報を鳴らせ！港の哨兵は君の船を見知っており、君は辛うじて逃げおおせる。港はあと{0}日{1}警戒を続ける。", "Da sind sie! Alarm! Die Hafenpatrouille erkennt Euer Schiff, und Ihr entkommt nur knapp. Der Hafen bleibt noch {0} Tag{1} in Alarmbereitschaft.", "Les voilà ! Donnez l'alarme ! La patrouille du port reconnaît votre navire et vous échappez de justesse. Le port restera en alerte encore {0} jour{1}.", "Oto oni! Alarm! Straż portowa rozpoznaje twój statek i ledwo udaje ci się uciec. Port pozostanie czujny jeszcze przez {0} dzień{1}.", "他們在那裡！快拉響警報！巡港守衛認出了你的船，你才勉強逃脫。港口還會戒備 {0} 天{1}。", "저기 있다! 경보를 울려! 항구 순찰대가 네 배를 알아보고, 너는 간신히 달아난다. 항구는 앞으로 {0}일{1} 동안 경계 태세를 유지한다."
    ]],
    ["These oar benches have outlived kingdoms. My back may not outlive the watch.", [
      "这些桨座比王国存在得还久。可我的腰未必撑得过这班岗。", "Эти гребные банки пережили царства. Не знаю, пережит ли моя спина эту вахту.", "Estos bancos de remo han sobrevivido a reinos. No sé si mi espalda aguantará esta guardia.", "Estes bancos de remo sobreviveram a reinos. Talvez minhas costas não aguentem este turno.", "この漕ぎ座は王国より長く残った。だが我が腰はこの当直を乗り切れぬかもしれぬ。", "Diese Ruderbänke haben Königreiche überdauert. Mein Rücken hält diese Wache vielleicht nicht durch.", "Ces bancs de nage ont survécu à des royaumes. Mon dos ne tiendra peut-être pas jusqu'à la fin du quart.", "Te ławy wioślarskie przetrwały królestwa. Nie wiem, czy moje plecy wytrzymają tę wachtę.", "這些槳座比王國存在得還久。可我的腰未必撐得過這班值勤。", "이 노 젓는 자리는 왕국보다 오래 버텼어. 하지만 내 허리는 이번 당직을 못 버틸지도 몰라."
    ]],
    ["We know this vessel. The harbor watch is waiting for you. This port remains closed for {0} more day{1}.", [
      "我们认得这艘船。港口巡卫正在等你。本港还要关闭 {0} 天{1}。", "Мы знаем это судно. Портовая стража ждёт вас. Порт останется закрытым ещё {0} день{1}.", "Conocemos este barco. La guardia del puerto te espera. Este puerto seguirá cerrado {0} día{1} más.", "Conhecemos este navio. A guarda portuária está à sua espera. Este porto continuará fechado por mais {0} dia{1}.", "この船は見覚えがある。港の守備隊が待ち構えている。この港はあと{0}日{1}閉鎖される。", "Wir kennen dieses Schiff. Die Hafenwache erwartet Euch. Dieser Hafen bleibt noch {0} Tag{1} geschlossen.", "Nous connaissons ce navire. La garde portuaire vous attend. Ce port restera fermé encore {0} jour{1}.", "Znamy ten statek. Straż portowa czeka na ciebie. Port pozostanie zamknięty jeszcze przez {0} dzień{1}.", "我們認得這艘船。港口巡衛正在等你。本港還要關閉 {0} 天{1}。", "우리는 이 배를 안다. 항구 경비대가 널 기다린다. 이 항구는 앞으로 {0}일{1} 동안 폐쇄된다."
    ]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedFishingYieldOverrides() {
  const entries = [
    ["A Good Haul", [
      "好收获", "Хороший улов", "Buena pesca", "Boa pescaria", "大漁", "Guter Fang", "Belle prise", "Dobry połów", "好收穫", "좋은 어획"
    ]],
    ["Catch x{0}, max haul {1}", [
      "捕获率 x{0}，最大渔获 {1}", "Улов x{0}, максимум: {1}", "Captura x{0}, captura máxima {1}", "Captura x{0}, captura máxima {1}", "捕獲 x{0}、最大漁獲量 {1}", "Fang x{0}, Höchstfang {1}", "Prise x{0}, prise maximale {1}", "Połów x{0}, maksymalny połów {1}", "捕獲率 x{0}，最大漁獲 {1}", "어획 x{0}, 최대 어획량 {1}"
    ]],
    ["Fishing haul +{0}", [
      "渔获量 +{0}", "Улов рыбы +{0}", "Rendimiento pesquero +{0}", "Rendimento da pesca +{0}", "漁獲量 +{0}", "Fangertrag +{0}", "Rendement de pêche +{0}", "Wydajność połowu +{0}", "漁獲量 +{0}", "어획량 +{0}"
    ]],
    ["Fishing odds x{0} / Max haul {1}", [
      "钓鱼概率 x{0} / 最大渔获 {1}", "Шанс улова x{0} / Макс. улов {1}", "Probabilidad de pesca x{0} / Captura máxima {1}", "Chance de pesca x{0} / Captura máxima {1}", "漁獲確率 x{0} / 最大漁獲量 {1}", "Fangchance x{0} / Höchstfang {1}", "Chance de pêche x{0} / Prise maximale {1}", "Szansa połowu x{0} / Maks. połów {1}", "釣魚機率 x{0} / 最大漁獲 {1}", "어획 확률 x{0} / 최대 어획량 {1}"
    ]],
    ["Long haul", [
      "远洋航行", "Дальний рейс", "Larga distancia", "Longo curso", "長距離航海", "Fernfahrt", "Long cours", "Daleki rejs", "遠洋航行", "장거리 항해"
    ]],
    ["ODDS x{0} MAX HAUL {1}", [
      "概率 x{0} 最大渔获 {1}", "ШАНС x{0} МАКС. УЛОВ {1}", "PROBABILIDAD x{0} CAPTURA MÁX. {1}", "CHANCE x{0} CAPTURA MÁX. {1}", "確率 x{0} 最大漁獲量 {1}", "CHANCE x{0} MAX. FANG {1}", "CHANCE x{0} PRISE MAX. {1}", "SZANSA x{0} MAKS. POŁÓW {1}", "機率 x{0} 最大漁獲 {1}", "확률 x{0} 최대 어획량 {1}"
    ]],
    ["Scavenging haul +{0}", [
      "搜集所得 +{0}", "Добыча припасов +{0}", "Rendimiento de recolección +{0}", "Rendimento da coleta +{0}", "物資採集量 +{0}", "Bergungsertrag +{0}", "Rendement de récupération +{0}", "Wydajność zbieractwa +{0}", "蒐集所得 +{0}", "채집 수확량 +{0}"
    ]],
    ["Short haul", [
      "近程航行", "Короткий рейс", "Cabotaje", "Cabotagem", "沿岸航海", "Küstenfahrt", "Cabotage", "Krótki rejs", "近程航行", "연안 항해"
    ]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedStoreSupplyOverrides() {
  const entries = [
    ["Stores", ["物资", "Запасы", "Provisiones", "Suprimentos", "物資", "Vorräte", "Réserves", "Zapasy", "物資", "비축품"]],
    ["STORES", ["物资", "ЗАПАСЫ", "PROVISIONES", "SUPRIMENTOS", "物資", "VORRÄTE", "RÉSERVES", "ZAPASY", "物資", "비축품"]],
    ["{0} receives the officers' return from {1}, restoring the chain of orders, stores, and accounts.", [
      "{0} 收到从 {1} 返航的军官，恢复命令、物资和账目之间的联系。", "{0} встречает офицеров, вернувшихся из {1}, и восстанавливает связь между приказами, снабжением и счетами.", "{0} recibe a los oficiales de vuelta de {1} y restablece la cadena de órdenes, suministros y cuentas.", "{0} recebe os oficiais de volta de {1}, restabelecendo a cadeia de ordens, suprimentos e contas.", "{0}は{1}から戻った士官を迎え、命令・物資・会計の連絡網を立て直す。", "{0} empfängt die aus {1} zurückgekehrten Offiziere und stellt die Verbindung zwischen Befehlen, Vorräten und Rechnungen wieder her.", "{0} accueille les officiers de retour de {1} et rétablit la chaîne des ordres, des approvisionnements et des comptes.", "{0} przyjmuje oficerów wracających z {1} i przywraca łączność między rozkazami, zaopatrzeniem i rachunkami.", "{0} 收到從 {1} 返航的軍官，恢復命令、物資和帳目之間的聯繫。", "{0}이(가) {1}에서 돌아온 장교들을 맞아 명령·보급품·회계의 연락망을 복구한다."
    ]],
    ["{0} x{1} moved straight to the yard stores.", [
      "{0} x{1} 已直接存入船坞仓库。", "{0} x{1} отправлены прямо на склад верфи.", "{0} x{1} se guardó directamente en el almacén del astillero.", "{0} x{1} foi direto para o depósito do estaleiro.", "{0} x{1}は造船所の倉庫へ直送された。", "{0} x{1} wurde direkt ins Werftlager gebracht.", "{0} x{1} a été envoyé directement à l'entrepôt du chantier naval.", "{0} x{1} trafiło prosto do magazynu stoczni.", "{0} x{1} 已直接存入船塢倉庫。", "{0} x{1}이(가) 조선소 창고로 바로 옮겨졌다."
    ]],
    ["A rising whiteout drove the party back before they found anything fit for the stores.", [
      "暴风雪渐浓，队伍还没找到可补充船上储备的东西便被迫折返。", "Налетевшая метель заставила отряд повернуть назад, прежде чем он нашёл что-либо для пополнения запасов.", "La ventisca obligó al grupo a regresar antes de encontrar provisiones para el barco.", "A nevasca obrigou o grupo a voltar antes que encontrasse mantimentos para o navio.", "吹雪が強まり、船の物資にできるものを見つける前に一行は引き返した。", "Ein aufziehender Schneesturm zwang die Gruppe zur Umkehr, bevor sie etwas für die Vorräte fand.", "Un blizzard grandissant força le groupe à rebrousser chemin avant qu'il ne trouve de quoi ravitailler le navire.", "Nadciągająca zawieja zmusiła grupę do odwrotu, nim znalazła zapasy dla statku.", "暴風雪漸濃，隊伍還沒找到可補充船上儲備的東西便被迫折返。", "눈보라가 거세져 배의 비축품으로 쓸 것을 찾기도 전에 일행은 돌아갈 수밖에 없었다."
    ]],
    ["Finds useful stores ashore and brings more back.", [
      "能在岸上找到有用物资并带回更多。", "Находит полезные припасы на берегу и приносит их на борт.", "Encuentra provisiones útiles en tierra y trae más a bordo.", "Encontra suprimentos úteis em terra e traz mais a bordo.", "陸で役立つ物資を見つけ、船に持ち帰る。", "Findet nützliche Vorräte an Land und bringt weitere an Bord.", "Trouve des provisions utiles à terre et en rapporte davantage à bord.", "Znajduje przydatne zapasy na lądzie i przynosi je na pokład.", "能在岸上找到有用物資並帶回更多。", "육지에서 쓸 만한 물자를 찾아 배에 더 가져온다."
    ]],
    ["The promised stores have not arrived. Still required: {0}.", [
      "承诺的物资尚未送达。仍需：{0}。", "Обещанные припасы не доставлены. Ещё требуется: {0}.", "Los suministros prometidos aún no han llegado. Faltan: {0}.", "Os suprimentos prometidos ainda não chegaram. Ainda faltam: {0}.", "約束の物資はまだ届いていない。残り：{0}。", "Die zugesagten Vorräte sind noch nicht eingetroffen. Noch benötigt: {0}.", "Les approvisionnements promis ne sont pas arrivés. Il manque encore : {0}.", "Obiecane zaopatrzenie jeszcze nie dotarło. Nadal potrzeba: {0}.", "承諾的物資尚未送達。仍需：{0}。", "약속한 보급품이 아직 도착하지 않았다. 남은 수량: {0}."
    ]],
    ["These stores are received. Still required: {0}.", [
      "物资已收到。仍需：{0}。", "Припасы получены. Ещё требуется: {0}.", "Suministros recibidos. Aún faltan: {0}.", "Suprimentos recebidos. Ainda faltam: {0}.", "物資を受領した。残り：{0}。", "Vorräte eingetroffen. Noch benötigt: {0}.", "Approvisionnements reçus. Il manque encore : {0}.", "Zaopatrzenie odebrane. Nadal potrzeba: {0}.", "物資已收到。仍需：{0}。", "보급품을 받았다. 남은 수량: {0}."
    ]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedSpanishAuditOverrides() {
  const entries = [
    ["A port for the great nao from Macau requires more than wooden sheds. Bring", "El puerto para la gran nao de Macao necesita algo más que cobertizos de madera. Trae"],
    ["A Portuguese fort and cinnamon factory stand beside the harbor under treaty with the local court.", "Un fuerte portugués y una fábrica de canela se alzan junto al puerto, amparados por un tratado con la corte local."],
    ["A post at an old meeting place must arrive ready to exchange, not merely command. Bring", "Un puesto en un antiguo lugar de reunión debe poder comerciar desde su llegada, no limitarse a dar órdenes. Trae"],
    ["a practical coastal trader whose divided lateen sail plan can be shortened by a small crew when a sudden squall comes down", "un mercante costero práctico, con velas latinas que una tripulación reducida puede rizar cuando se desata una tormenta repentina"],
    ["A provincial headquarters must secure both river and harbor. Finish it with", "Una sede provincial debe controlar tanto el río como el puerto. Complétala con"],
    ["a quick, handy two-master from a family of rigs long favored for scouting, dispatch work, coastal trade, and the occasional less lawful errand", "un velero ágil de dos mástiles, de un tipo apreciado desde hace mucho para explorar, llevar despachos, comerciar por la costa y, de vez en cuando, atender algún encargo ilícito"],
    ["A quick, watchful hunter of temperate lands.", "Un veloz cazador, siempre alerta, de las regiones templadas."],
    ["A raccoon aboard? I know its kind, captain. Count every ration again after dark.", "¿Un mapache a bordo? Conozco la especie, capitán. Vuelve a contar las raciones al anochecer."],
    ["A rack of simple bows lets free hands harry an exposed enemy deck.", "Un conjunto de arcos sencillos permite que quienes están libres hostiguen una cubierta enemiga expuesta."],
    ["A reputation is another wake: difficult to outrun once made.", "La reputación es otra estela: una vez creada, cuesta dejarla atrás."],
    ["A rising whiteout drove the party back before they found fresh water or game.", "La ventisca creciente obligó al grupo a regresar antes de que encontrara agua dulce o caza."],
    ["a riverside stockade, boats, and raised store floors", "una empalizada junto al río, botes y almacenes elevados sobre pilotes"],
    ["a roofed Joseon warship of the late sixteenth century, remembered for fighting in Admiral Yi Sun-sin's fleets among Korea's narrow tidal seas", "un buque de guerra cubierto de la dinastía Joseon, de finales del siglo XVI, célebre por servir en las flotas del almirante Yi Sun-sin entre los estrechos canales mareales de Corea"],
    ["a round-bellied descendant of the medieval North Sea cog, with high sides and a simple square rig built for cargo rather than haste", "un descendiente de casco redondeado de la coca medieval del mar del Norte, con bordas altas y aparejo de cruz pensado para la carga, no para la velocidad"],
    ["A routine harbor dispatch needs a reliable captain.", "Un encargo habitual del puerto requiere un capitán de confianza."],
    ["A royal capital cannot remain a survey camp. Finish the outfit with", "Una capital real no puede seguir siendo un campamento de exploración. Completa las obras con"],
    ["a royal license for our merchants to trade at the Crown's ports in the Indies", "una licencia real que permita a nuestros mercaderes comerciar en los puertos de la Corona en las Indias"],
    ["A sacred mountain rebuilt in stone and surrounded by water. Your description makes its plan sound like a map of the heavens. I want every court and causeway marked.", "Una montaña sagrada, reconstruida en piedra y rodeada de agua. Por tu descripción, su trazado parece un mapa celeste. Quiero que señales cada patio y calzada."],
    ["A sailor fell from a sea cliff while searching for supplies. The party returned one fewer.", "Un marinero cayó por un acantilado mientras buscaba provisiones. El grupo regresó con uno menos."],
    ["A scrap of the old captain's map is worth more than a hold of guesses. Keep watch for pirate colors.", "Un trozo del mapa del viejo capitán vale más que una bodega llena de conjeturas. Vigila las enseñas piratas."],
    ["A sealed packet needs passage to {0}, {1} away.", "Un pliego sellado debe llegar a {0}, a {1} de distancia."],
    ["A sealed packet needs passage to {0}, {1} away. Payment is {2} db on delivery.", "Un pliego sellado debe llegar a {0}, a {1} de distancia. Se pagarán {2} doblones al entregarlo."],
    ["A Separatist congregation from Leiden seeks its own covenant. Weather may force them north of their patent onto the Wampanoag coast at Patuxet.", "Una congregación separatista de Leiden busca establecer su propio pacto. El mal tiempo podría obligarla a asentarse en la costa wampanoag de Patuxet, al norte de los límites de su concesión."],
    ["A settlement founded for conscience still needs practical independence. Add", "Un asentamiento fundado por motivos de conciencia también necesita independencia práctica. Añade"],
    ["A severe mountain, then, and unmistakable from every approach. Draw that sharp profile; a navigator remembers a silhouette long after numbers fade.", "Una montaña imponente, inconfundible desde cualquier acceso. Dibuja su perfil abrupto; un navegante recuerda una silueta mucho después de olvidar las cifras."],
    ["A shipwright is waiting on these spar and sail measurements.", "El carpintero naval espera las medidas de estas vergas y velas."],
    ["A shirt of fine linked rings protects fighting hands from cuts and arrows.", "Una cota de malla fina protege de cortes y flechas a quienes combaten."],
    ["a sixteenth-century development of the carrack, with a longer hull and lower forward works that made a steadier gun platform and convoy escort", "una evolución de la carraca del siglo XVI, con casco más largo y obra de proa más baja, que ofrecía una plataforma artillera más estable y servía de escolta a los convoyes"],
    ["a small pinnace suited to coasting, scouting, and carrying messages, the kind of useful tender a larger fleet always finds work for", "una pequeña pinaza apta para navegar junto a la costa, explorar y llevar mensajes; una embarcación auxiliar a la que una gran flota siempre encuentra tarea"],
    ["A social hunter rather than a solitary emblem upon a shield. Record which animals noticed them first; fear can reveal a predator's place in the whole country.", "Es un cazador social, no el emblema solitario de un escudo. Anota qué animales lo detectan primero; el miedo puede revelar el lugar que ocupa un depredador en la región."],
    ["A sperm whale stove in your hull.", "Un cachalote te abrió una brecha en el casco."],
    ["A stand of heavy handguns punches through cover at the cost of smoke and a long reload.", "Un grupo de armas de fuego pesadas atraviesa la cobertura, aunque produce mucho humo y tarda en recargar."],
    ["A storm is working nearby. Check every line before departure.", "Se acerca una tormenta. Revisa cada cabo antes de zarpar."],
    ["A storm threw me overboard, and I woke among wreckage on this beach. My family may have reached {0}. Please take me there.", "Una tormenta me arrojó por la borda y desperté entre restos en esta playa. Puede que mi familia haya llegado a {0}. Por favor, llévame allí."],
    ["a sturdy coastal working boat whose handy lug sail and useful hold descend from the fishing craft that kept Europe's ports supplied", "un robusto barco de trabajo costero, con una práctica vela al tercio y una bodega amplia, descendiente de las embarcaciones pesqueras que abastecían los puertos europeos"],
    ["a suitable ocean-going ship", "un barco apto para navegar en alta mar"],
    ["a swift Japanese oared fighting boat whose wooden screens shelter warriors during reconnaissance, pursuit, and sudden attacks", "una veloz embarcación japonesa de combate a remo, con mamparas de madera que protegen a los guerreros durante la exploración, la persecución y los ataques por sorpresa"],
    ["a swift Malay oar-and-sail vessel whose narrow double-ended hull, tanja sail, and shallow draft suit straits, coasts, and sudden attacks", "un veloz barco malayo de vela y remo, con proa y popa simétricas, vela tanja y poco calado, apto para estrechos, costas y ataques por sorpresa"],
    ["a towering island merchant, built with a deep cargo hull, canted sails, and twin quarter rudders for the long monsoon passages of Southeast Asia", "un imponente mercante insular, con casco de gran capacidad, velas inclinadas y dos timones laterales, hecho para las largas travesías monzónicas del Sudeste Asiático"],
    ["a two-masted Malay fighting vessel built to maneuver under oars in confined straits while carrying enough sail and ordnance for longer patrols", "un buque de guerra malayo de dos mástiles, construido para maniobrar a remo por estrechos angostos y llevar velas y artillería suficientes para patrullas largas"],
    ["A venomous snake struck among the rocks. The party returned to the ship one fewer.", "Una serpiente venenosa mordió a un marinero entre las rocas. El grupo regresó al barco con uno menos."],
    ["a versatile Chinese junk, large enough for regional commerce yet handier in shoal water and river mouths than the great ocean carriers", "un junco chino versátil, lo bastante grande para el comercio regional y más maniobrable en aguas someras y desembocaduras que los grandes navíos oceánicos"],
    ["A warrant is only paper. I shall deny every word on it.", "Una comisión no es más que un papel. Negaré todo lo que diga."],
    ["A waterfall vast enough to announce itself beyond sight. Mark the portage well. Such power is a wonder to behold and a deadly fact for every navigator.", "Una cascada tan vasta que su estruendo se oye antes de verla. Marca bien la ruta de porteo. Su fuerza es maravillosa, pero también un peligro mortal para cualquier navegante."],
    ["A white mountain ruling one of the world's deepest roads. Trace the gorge beneath it; mountain and passage explain one another.", "Una montaña blanca domina una de las rutas más encajonadas del mundo. Traza el desfiladero a sus pies: la montaña y el paso se explican mutuamente."],
    ["A whole congregation and its cattle need more than a trading camp. Bring", "Toda una congregación y su ganado necesitan algo más que un campamento comercial. Trae"],
    ["a working bank of oars", "una bancada de remos en buen estado"],
    ["A year ago they called this empire untouchable. Now Cuzco answers to the Crown, and even the royal accountants have surrendered. You kept faith with me, Captain. Here is the share I promised.", "Hace un año llamaban invencible a este imperio. Ahora Cuzco responde ante la Corona e incluso se han rendido sus contadores reales. Cumpliste tu palabra, capitán. Aquí tienes la parte que te prometí."]
  ];
  return Object.fromEntries(entries.map(([source, translation]) => [
    source,
    Object.freeze({ es: translation })
  ]));
}

function reviewedWhalingLineOverrides() {
  const entries = [
    ["Accuracy {0}% / Line break {1}% / Range {2}", [
      "准确度 {0}% / 断绳率 {1}% / 射程 {2}", "Точность {0}% / обрыв линя {1}% / дальность {2}", "Precisión {0}% / rotura del cabo {1}% / alcance {2}", "Precisão {0}% / ruptura do cabo {1}% / alcance {2}", "命中精度 {0}% / 銛綱の破断率 {1}% / 射程 {2}", "Trefferquote {0}% / Leinenbruch {1}% / Reichweite {2}", "Précision {0}% / rupture du cordage {1}% / portée {2}", "Celność {0}% / zerwanie liny {1}% / zasięg {2}", "準確度 {0}% / 斷繩率 {1}% / 射程 {2}", "정확도 {0}% / 작살줄 끊김 확률 {1}% / 사거리 {2}"
    ]],
    ["ACCURACY {0}% LINE BREAK {1}% RANGE {2}", [
      "命中率 {0}% 断绳率 {1}% 射程 {2}", "ТОЧНОСТЬ {0}% ОБРЫВ ЛИНЯ {1}% ДАЛЬНОСТЬ {2}", "PRECISIÓN {0}% ROTURA DEL CABO {1}% ALCANCE {2}", "PRECISÃO {0}% RUPTURA DO CABO {1}% ALCANCE {2}", "命中精度 {0}% 銛綱の破断率 {1}% 射程 {2}", "TREFFERQUOTE {0}% LEINENBRUCH {1}% REICHWEITE {2}", "PRÉCISION {0}% RUPTURE DU CORDAGE {1}% PORTÉE {2}", "CELNOŚĆ {0}% ZERWANIE LINY {1}% ZASIĘG {2}", "命中率 {0}% 斷繩率 {1}% 射程 {2}", "정확도 {0}% 작살줄 끊김 확률 {1}% 사거리 {2}"
    ]],
    ["Accuracy {0}%, line break {1}%", [
      "准确度 {0}%，断绳率 {1}%", "Точность {0}%, обрыв линя {1}%", "Precisión {0}%, rotura del cabo {1}%", "Precisão {0}%, ruptura do cabo {1}%", "命中精度 {0}%、銛綱の破断率 {1}%", "Trefferquote {0}%, Leinenbruch {1}%", "Précision {0}%, rupture du cordage {1}%", "Celność {0}%, zerwanie liny {1}%", "準確度 {0}%，斷繩率 {1}%", "정확도 {0}%, 작살줄 끊김 확률 {1}%"
    ]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedSpanishAuditFollowUpOverrides() {
  const entries = [
    ["African traditional", "Tradición africana"],
    ["All Hands", "Toda la tripulación"],
    ["ALL HANDS RETURNED FIT FOR DUTY.", "TODA LA TRIPULACIÓN REGRESÓ EN CONDICIONES DE SERVIR."],
    ["Ainu traditional", "Tradición ainu"],
    ["ADVANCE 1,000,000 DB", "PRESTAR 1.000.000 DB"],
    ["Advance one million doubloons under seal. At victory—or at an even peace if the treasury remains answerable—it shall return twelve hundred thousand. If defeat breaks its credit, the loss is yours.", "Adelanta un millón de doblones bajo sello. Si vencemos, o si se firma una paz equitativa y el tesoro aún puede responder, devolverá un millón doscientos mil. Si la derrota lo deja insolvente, perderás el dinero."],
    ["Address the Japanese envoys", "Dirígete a los enviados japoneses"],
    ["admit our merchants under Joseon's licensed-port rules", "admitir a nuestros mercaderes en los puertos autorizados de Joseon"],
    ["Agadez sends tribute to Gao. None of it bears your family's mark.", "Agadez envía tributo a Gao. Nada lleva la marca de tu familia."],
    ["Ah, {0}. I kept the account warm while you were away. Interest added {1} doubloons, bringing the balance to {2}. The sea may ignore calendars. I do not.", "Ah, {0}. Mantuve tu cuenta al día mientras estabas fuera. Los intereses sumaron {1} doblones y elevaron el saldo a {2}. El mar podrá ignorar los calendarios; yo no."],
    ["ALL {0} DISCOVERIES ALREADY FOUND", "YA ENCONTRASTE LOS {0} DESCUBRIMIENTOS"],
    ["All {0}. There is no blank left in my book. No living captain can match what you have done.", "Has registrado los {0}. No queda una sola página en blanco en mi libro. Ningún capitán vivo puede igualar tus logros."],
    ["Along the coasts of Rapa Nui, colossal stone ancestors stand upon ahu with their backs to the sea, watching over the settlements. At Rano Raraku, others remain half-carved in the quarry.", "En las costas de Rapa Nui, colosales ancestros de piedra se alzan sobre los ahu, de espaldas al mar y vigilantes sobre los poblados. En Rano Raraku, otros siguen a medio tallar en la cantera."],
    ["An accomplished shipwright is seeking a new berth. With him at the slips, we could build finer vessels.", "Un hábil carpintero naval busca un nuevo puesto. Con él en las gradas, podríamos construir mejores navíos."],
    ["An ancient city laid out in brick, older than any chart aboard.", "Una antigua ciudad de ladrillo, más vieja que cualquier carta náutica a bordo."],
    ["An excellent contradiction. Size does not dictate diet, whatever a tidy bestiary may claim. I shall record what it ate as carefully as how it looked.", "Qué contradicción tan fascinante. El tamaño no determina la dieta, por más que diga un bestiario bien ordenado. Anotaré lo que comió con tanto cuidado como su aspecto."],
    ["An excellent warning against judging danger by height alone. I will mark your weather notes boldly; future travelers may value them more than the summit sketch.", "Una buena advertencia: la altura no basta para medir el peligro. Destacaré tus notas meteorológicas; los futuros viajeros quizá las valoren más que el dibujo de la cumbre."],
    ["an exemption from the Danish Sound Dues", "una exención de los derechos del Sund danés"],
    ["An expedition seeking the Sierra de la Plata needs a fort on the Paraguay. The Cario Guarani control these banks; survival requires their cooperation.", "La expedición en busca de la Sierra de la Plata necesita un fuerte en el Paraguay. Los carios guaraníes controlan estas riberas; sobrevivir exige su cooperación."],
    ["an Iberian ocean-going roundship of the kind called a nao, built to carry stores and cargo through the long Atlantic and Indies passages", "un barco ibérico de casco redondo, del tipo llamado nao, construido para llevar provisiones y carga por las largas rutas del Atlántico y las Indias"],
    ["an island Southeast Asian outrigger whose stabilizing float lets a narrow, swift hull carry sail safely through reef passages and open water", "una embarcación con balancín del Sudeste Asiático insular, cuyo flotador estabilizador permite a su casco estrecho y veloz navegar a vela sin riesgo entre arrecifes y en mar abierto"],
    ["An isolated peak becomes compass, calendar, and landmark. Ask the people beneath it when the snow retreats; their answer will add seasons to our chart.", "Un pico aislado sirve de brújula, calendario y referencia. Pregunta a quienes viven a sus pies cuándo se retira la nieve; su respuesta añadirá estaciones a nuestra carta."],
    ["an ocean-going caravel carrying square canvas for stronger following winds while retaining the handy hull of its lateen-rigged forebears", "una carabela oceánica con velas cuadras para aprovechar mejor los vientos de popa, que conserva el casco manejable de sus antecesoras de aparejo latino"],
    ["an ocean-going Chinese junk, joining a capacious hold with battened sails and internal bulkheads refined over centuries of maritime trade", "un junco chino de alta mar, con amplia bodega, velas con sables y mamparos perfeccionados durante siglos de comercio marítimo"],
    ["Ancestor-alliance gift", "Regalo de alianza ancestral"],
    ["anchors, cranes, locks, and warehouse fittings", "anclajes, grúas, esclusas y accesorios para almacenes"],
    ["And gather again at sunset. No one should keep the fast alone at sea.", "Y volvamos a reunirnos al atardecer. Nadie debería ayunar solo en el mar."],
    ["And share whatever feast the cook can coax from the hold. Christ is born.", "Y comparte el festín que el cocinero logre preparar con lo que haya en la bodega. Cristo ha nacido."],
    ["Andean traditional", "Tradición andina"],
    ["Austronesian traditional", "Tradición austronesia"],
    ["AWK! Fair wind! AWK!", "¡Aak! ¡Buen viento! ¡Aak!"],
    ["Aye. The chart can hang over a quiet hearth now. I have seen what lies beneath the red X, and I prefer the road home.", "Sí. La carta náutica ya puede colgar sobre un hogar tranquilo. He visto lo que hay bajo la X roja y prefiero el camino de vuelta a casa."],
    ["Ayutthaya", "Ayutthaya"],
    ["Ayutthayan", "ayutthayano"],
    ["ACCEPT THE CUSTOMS ASSIGNMENT", "ACEPTAR EL ENCARGO DE ADUANAS"],
    ["Accept the warrant: capture {0}", "Aceptar la orden de captura: {0}"],
    ["Animal encounter odds +{0}", "Probabilidad de encuentro con animales +{0}"],
    ["another full cod-curing season", "otra temporada completa de secado y salazón del bacalao"],
    ["Another racing ship has unloaded, but the first-crop buyers still offer a finishing premium.", "Otro barco ya descargó su té, pero los compradores de la primera cosecha aún pagan una prima por la entrega."],
    ["Another snowy contradiction beneath the hot sun, but broader and heavier than Kilimanjaro in your account. Comparing them will make both descriptions stronger.", "Otra montaña nevada bajo el sol abrasador, pero más extensa y voluminosa que el Kilimanjaro, según tu relato. Compararlas enriquecerá ambas descripciones."],
    ["Aristotle and Pliny never saw what sailors have. Bring me honest accounts of exotic beasts for my book; I pay 100 doubloons each.", "Aristóteles y Plinio nunca vieron lo que han visto los marineros. Tráeme relatos fidedignos de bestias exóticas para mi libro; pagaré 100 doblones por cada una."],
    ["artillery founder", "fundidor de cañones"],
    ["Ash-shaft harpoon", "Arpón de asta de fresno"],
    ["Ask about pirate havens", "Pregunta por las guaridas piratas"],
    ["Ask about work", "Pregunta por trabajo"],
    ["ASSAULT BROKEN OFF {0} DEAD / {1} WOUNDED", "ASALTO INTERRUMPIDO: {0} MUERTOS / {1} HERIDOS"],
    ["Assessors may quarrel over {0}'s levy until Candlemas. Your bond fell due at Michaelmas.", "Los tasadores pueden discutir el impuesto de {0} hasta la Candelaria. La obligación venció el día de San Miguel."],
    ["Asuncion has outgrown its first mud-and-thatch fort. It is now the upriver refuge from which new settlements can spread through the Plata basin.", "Asunción ya dejó atrás su primer fuerte de barro y paja. Ahora es el refugio río arriba desde el que pueden extenderse nuevos asentamientos por la cuenca del Plata."],
    ["Asymmetric Japanese bows can be worked above a gunwale without striking the deck.", "Los arcos japoneses asimétricos pueden usarse por encima de la borda sin golpear la cubierta."],
    ["At last, proportions from a sober witness rather than a tapestry. Its tongue and gait may be more instructive than the extraordinary neck everyone remembers.", "Al fin tenemos medidas de un testigo fiable, no de un tapiz. Su lengua y su forma de andar pueden enseñarnos más que el extraordinario cuello que todos recuerdan."],
    ["At Ningbo, order matters as much as ink. Our support ships have sailed, and so have the {0}. We must reach the shipping office first.", "En Ningbo, el orden importa tanto como la tinta. Nuestros barcos de apoyo ya zarparon, y también los {0}. Debemos llegar primero a la oficina portuaria."],
    ["At sea, good company is celebration enough. Thank you.", "En el mar, una buena compañía basta para celebrar. Gracias."],
    ["At sea, it is too late to buy a license. Pay the Crown's fine, surrender controlled spice cargo, or fight.", "En alta mar ya es tarde para comprar una licencia. Paga la multa de la Corona, entrega la carga de especias sujeta a licencia o lucha."],
    ["At Worms, Luther refused lawful recantation before Church and Emperor. The Edict has made him an outlaw, yet his pamphlets still cross every market.", "En Worms, Lutero se negó a abjurar ante la Iglesia y el Emperador. El edicto lo declaró proscrito, pero sus panfletos siguen circulando por todos los mercados."],
    ["At Worms, Luther refused to recant before Church and Emperor. The quarrel is dividing German pulpits, presses, and taverns.", "En Worms, Lutero se negó a abjurar ante la Iglesia y el Emperador. La disputa divide los púlpitos, las imprentas y las tabernas de Alemania."],
    ["At Worms, Luther would not recant what he held to Scripture and conscience. The Emperor calls him outlaw; many here call him steadfast.", "En Worms, Lutero no quiso retractarse de lo que creía conforme a las Escrituras y a su conciencia. El Emperador lo llama proscrito; muchos aquí lo consideran firme."],
    ["At Worms, Luther would not recant what he held to Scripture. The Emperor calls him outlaw, but his words keep traveling.", "En Worms, Lutero no quiso retractarse de lo que juzgaba conforme a las Escrituras. El Emperador lo llama proscrito, pero sus palabras siguen circulando."],
    ["Attack city", "Atacar la ciudad"],
    ["Attack would be lawful - {0} embargo commission", "Ataque lícito al amparo de la comisión de embargo de {0}"],
    ["Attack would be lawful - {0} letter of marque", "Ataque lícito al amparo de la patente de corso de {0}"],
    ["ATTACKERS DEFEATED - RETURN TO {0}", "ATACANTES DERROTADOS: REGRESAR A {0}"],
    ["Attend the merit dedication", "Asistir a la ceremonia de dedicación de méritos"],
    ["Audit the pilgrimage charity", "Revisar las cuentas del fondo para peregrinos"],
    ["axes, nails, farming tools, and repairs beyond easy resupply", "hachas, clavos, herramientas agrícolas y materiales de reparación difíciles de reponer"],
    ["Babur won Delhi with cannon. Your family debt survived the field without firing a shot.", "Babur tomó Delhi con cañones. Tu deuda familiar sobrevivió a la campaña sin disparar un solo tiro."]
  ];
  return Object.fromEntries(entries.map(([source, translation]) => [
    source,
    Object.freeze({ es: translation })
  ]));
}

function reviewedEarlyCatalogRangeOverrides() {
  const entries = [
    ["Able Seaman", ["熟练水手", "Старший матрос", "Marinero de primera", "Marinheiro de primeira", "一等水兵", "Vollmatrose", "Matelot breveté", "Starszy marynarz", "熟練水手", "숙련 수병"]],
    ["Aboard", ["在船上", "На борту", "a bordo", "A bordo", "船上", "An Bord", "À bord", "Na pokładzie", "船上", "승선"]],
    ["Accept capital commission: capture {0}", ["接受首都征服委托：攻占{0}", "Принять поручение на взятие столицы: захватить {0}", "Aceptar el encargo para conquistar la capital: tomar {0}", "Aceitar a missão para conquistar a capital: tomar {0}", "首都攻略の任務を受ける：{0}を攻略", "Auftrag zur Eroberung der Hauptstadt annehmen: {0} erobern", "Accepter la mission de conquête de la capitale : prendre {0}", "Przyjmij zlecenie zdobycia stolicy: zdobądź {0}", "接受首都征服委託：攻佔{0}", "수도 정복 임무 수락: {0} 점령"]],
    ["Accept commission: capture {0}", ["接受征服委托：攻占{0}", "Принять поручение на захват: захватить {0}", "Aceptar el encargo: tomar {0}", "Aceitar a missão: tomar {0}", "征服任務を受ける：{0}を攻略", "Eroberungsauftrag annehmen: {0} erobern", "Accepter la mission de conquête : prendre {0}", "Przyjmij zlecenie zdobycia: zdobądź {0}", "接受征服委託：攻佔{0}", "정복 임무 수락: {0} 점령"]],
    ["Accept surrender", ["接受投降", "Принять капитуляцию", "Aceptar la rendición", "Aceitar a rendição", "降伏を受け入れる", "Kapitulation annehmen", "Accepter la reddition", "Przyjmij kapitulację", "接受投降", "항복을 받아들이다"]],
    ["Accept the commission", ["接受委托", "Принять поручение", "Aceptar el encargo", "Aceitar a missão", "任務を受ける", "Auftrag annehmen", "Accepter la mission", "Przyjmij zlecenie", "接受委託", "임무 수락"]],
    ["Accept: hunt wokou near {0}", ["接受：在{0}附近追剿倭寇", "Принять задание: преследовать вако у {0}", "Aceptar: perseguir piratas wokou cerca de {0}", "Aceitar: perseguir piratas wokou perto de {0}", "受諾：{0}付近で倭寇を追討", "Annehmen: Wokou bei {0} verfolgen", "Accepter : poursuivre les pirates wokou près de {0}", "Przyjmij: ścigaj wokou w pobliżu {0}", "接受：在{0}附近追剿倭寇", "수락: {0} 근처에서 왜구 추격"]],
    ["Accepted passage to {0}.", ["已接下前往{0}的乘船委托。", "Перевозка пассажира в {0} принята.", "Viaje de pasajero a {0} aceptado.", "Transporte de passageiro até {0} aceito.", "{0}行きの旅客輸送を引き受けた。", "Fahrgastbeförderung nach {0} angenommen.", "Transport de passagers vers {0} accepté.", "Przyjęto zlecenie przewozu pasażera do {0}.", "已接下前往{0}的乘客航程。", "{0}행 여객 운송을 맡았다."]],
    ["Acquire one each for {0}: {1}.", ["为{0}各备一份：{1}。", "Доставьте в {0} по одной единице каждого продукта: {1}.", "Consigue una unidad de cada ingrediente para {0}: {1}.", "Consiga uma unidade de cada ingrediente para {0}: {1}.", "{0}に材料を一つずつ届ける：{1}。", "Besorge für {0} je eine Einheit: {1}.", "Procurez-vous un exemplaire de chaque ingrédient pour {0} : {1}.", "Zdobądź po jednej sztuce każdego składnika dla {0}: {1}.", "為{0}各備一份：{1}。", "{0}에 재료를 하나씩 가져오기: {1}."]],
    ["Agadez sends tribute to Gao. None of it bears your family's mark.", ["阿加德兹向加奥进贡。这些贡品上没有你家族的印记。", "Агадес платит дань Гао. Ни на одном подношении нет знака вашей семьи.", "Agadez envía tributo a Gao. Ninguna ofrenda lleva el emblema de tu familia.", "Agadez envia tributo a Gao. Nenhuma oferenda traz a marca da sua família.", "アガデスはガオに貢納している。その品々に、あなたの一族の印はない。", "Agadez entrichtet Gao Tribut. Keine der Gaben trägt das Zeichen deiner Familie.", "Agadez verse un tribut à Gao. Aucun présent ne porte la marque de votre famille.", "Agadez składa daninę Gao. Żaden dar nie nosi znaku twojej rodziny.", "阿加德茲向加奧進貢。這些貢品上沒有你家族的印記。", "아가데즈가 가오에 조공을 바칩니다. 어느 공물에도 가문의 표식은 없습니다."]],
    ["ACCEPT THE CUSTOMS ASSIGNMENT", ["接受关税收入抵债", "Принять таможенные сборы в обеспечение долга", "Aceptar los ingresos aduaneros como garantía", "Aceitar a receita alfandegária como garantia", "関税収入を担保に受け取る", "Zolleinnahmen als Sicherheit annehmen", "Accepter les recettes douanières en garantie", "Przyjąć dochody celne jako zabezpieczenie", "接受關稅收入抵債", "관세 수입을 담보로 받기"]],
    ["Adrian VI has sealed a reform brief for the northern clergy. Carry it north and return", ["教宗阿德里安六世已为北方教士封好一份改革文书。将它送往北方并带回答复", "Адриан VI запечатал послание о реформе для северного духовенства. Отвезите его на север и вернитесь", "Adriano VI ha sellado un breve de reforma para el clero del norte. Llévalo al norte y regresa", "Adriano VI selou um breve de reforma para o clero do norte. Leve-o ao norte e volte", "教皇アドリアーノ6世は北方の聖職者に向けた改革書簡に封をした。それを北へ届け、返事を持ち帰れ", "Adrian VI. hat ein versiegeltes Reformschreiben für den Klerus des Nordens aufgesetzt. Bringt es nach Norden und kehrt zurück", "Adrien VI a scellé un bref de réforme destiné au clergé du Nord. Portez-le au nord et revenez", "Adrian VI zapieczętował pismo reformacyjne dla duchowieństwa północy. Zanieś je na północ i wróć", "教宗亞德里安六世已為北方教士封好一份改革文書。將它送往北方並帶回答覆", "교황 아드리아노 6세가 북부 성직자들에게 보낼 개혁 서한을 봉인했습니다. 이를 북쪽에 전하고 돌아오세요"]],
    ["Adrian VI has sealed a reform brief for the northern clergy. Carry it north and return with their answer.", ["教宗阿德里安六世已为北方教士封好一份改革文书。将它送往北方并带回答复。", "Адриан VI запечатал послание о реформе для северного духовенства. Отвезите его на север и вернитесь с ответом.", "Adriano VI ha sellado un breve de reforma para el clero del norte. Llévalo al norte y regresa con su respuesta.", "Adriano VI selou um breve de reforma para o clero do norte. Leve-o ao norte e volte com a resposta.", "教皇アドリアーノ6世は北方の聖職者に向けた改革書簡に封をした。それを北へ届け、返事を持ち帰れ。", "Adrian VI. hat ein versiegeltes Reformschreiben für den Klerus des Nordens aufgesetzt. Bringt es nach Norden und kehrt mit ihrer Antwort zurück.", "Adrien VI a scellé un bref de réforme destiné au clergé du Nord. Portez-le au nord et revenez avec sa réponse.", "Adrian VI zapieczętował pismo reformacyjne dla duchowieństwa północy. Zanieś je na północ i wróć z odpowiedzią.", "教宗亞德里安六世已為北方教士封好一份改革文書。將它送往北方並帶回答覆。", "교황 아드리아노 6세가 북부 성직자들에게 보낼 개혁 서한을 봉인했습니다. 이를 북쪽에 전하고 답을 받아 돌아오세요."]],
    ["All Hands", ["全体船员", "Весь экипаж", "Toda la tripulación", "Toda a tripulação", "全乗組員", "Gesamte Besatzung", "Tout l'équipage", "Cała załoga", "全體船員", "전원 승무원"]],
    ["ALL HANDS RETURNED FIT FOR DUTY.", ["全体船员均健康归队，可以继续服役。", "Весь экипаж вернулся и готов к службе.", "Toda la tripulación regresó en condiciones de servir.", "Toda a tripulação voltou apta para o serviço.", "乗組員全員が無事に戻り、任務に就ける状態です。", "Die gesamte Besatzung ist diensttauglich zurückgekehrt.", "Tout l'équipage est rentré apte au service.", "Cała załoga wróciła zdolna do służby.", "全體船員均健康歸隊，可以繼續服役。", "모든 선원이 임무를 수행할 수 있는 상태로 돌아왔습니다."]],
    ["Another racing ship has unloaded, but the first-crop buyers still offer a finishing premium.", ["又一艘竞速船已卸下新茶，但头采茶的买家仍愿意为赶上交货期限支付尾程奖金。", "Ещё один участник гонки доставил груз, но покупатели первого сбора всё ещё платят премию за своевременную доставку.", "Otro barco de la carrera ya descargó su té, pero los compradores de la primera cosecha aún ofrecen una prima por entregarlo a tiempo.", "Outro navio da corrida já descarregou o chá, mas os compradores da primeira colheita ainda pagam um bônus pela entrega no prazo.", "競争相手の船はすでに茶を荷揚げしたが、初摘み茶の買い手はまだ期限内の納入に割増金を出している。", "Ein weiteres Schiff des Wettlaufs hat entladen, doch die Käufer der ersten Teeernte zahlen weiterhin einen Zuschlag für pünktliche Lieferung.", "Un autre navire de la course a déchargé son thé, mais les acheteurs de la première récolte offrent encore une prime pour une livraison dans les délais.", "Kolejny statek w wyścigu wyładował herbatę, ale nabywcy pierwszego zbioru nadal płacą premię za dostawę na czas.", "又一艘競速船已卸下新茶，但頭採茶的買家仍願意為趕上交貨期限支付尾程獎金。", "경쟁 선박 한 척이 차를 먼저 내렸지만, 첫물차 구매자들은 아직 기한 내 납품에 웃돈을 제시합니다."]],
    ["Aristotle and Pliny never saw what sailors have. Bring me honest accounts of exotic beasts for my book; I pay 100 doubloons each.", ["亚里士多德和普林尼从未见过水手们见到的异域动物。请为我的书带来真实可靠的记述；每种动物我付100达布隆。", "Аристотель и Плиний не видели диковинных зверей, встречающихся морякам. Принесите достоверные рассказы о них для моей книги; я плачу по 100 дублонов за каждый.", "Aristóteles y Plinio nunca vieron las bestias exóticas que encuentran los marineros. Tráeme relatos fidedignos para mi libro; pagaré 100 doblones por cada uno.", "Aristóteles e Plínio nunca viram as feras exóticas encontradas pelos marinheiros. Traga relatos confiáveis para o meu livro; pago 100 dobrões por cada uma.", "アリストテレスもプリニウスも、船乗りが出会う珍しい獣を見たことがありません。そうした獣の確かな記録を本のために持ってきてください。一種につき100ダブロンを払います。", "Aristoteles und Plinius sahen nie die fremdartigen Tiere, denen Seeleute begegnen. Bringen Sie mir verlässliche Berichte für mein Buch; ich zahle 100 Dublonen je Tierart.", "Aristote et Pline n'ont jamais vu les bêtes exotiques rencontrées par les marins. Apportez-moi des récits fiables pour mon livre ; je paie 100 doublons par espèce.", "Arystoteles i Pliniusz nie widzieli egzotycznych zwierząt spotykanych przez żeglarzy. Przynieś mi wiarygodne opisy do księgi; płacę 100 dublonów za każdy gatunek.", "亞里斯多德和普林尼從未見過水手們遇見的異域動物。請為我的書帶來真實可靠的記述；每種動物我付100達布隆。", "아리스토텔레스와 플리니우스는 선원들이 만나는 이국적인 짐승을 본 적이 없습니다. 책에 실을 믿을 만한 기록을 가져오면 종마다 100 더블룬을 드립니다."]],
    ["ARTILLERY CIRCUIT {0}/{1}", ["炮兵巡回路线 {0}/{1}", "АРТИЛЛЕРИЙСКИЙ МАРШРУТ {0}/{1}", "RUTA ARTILLERA {0}/{1}", "ROTA DE ARTILHARIA {0}/{1}", "砲術巡航 {0}/{1}", "ARTILLERIEROUTE {0}/{1}", "CIRCUIT D'ARTILLERIE {0}/{1}", "SZLAK ARTYLERYJSKI {0}/{1}", "砲兵巡迴路線 {0}/{1}", "포격 항로 {0}/{1}"]],
    ["Apply custom loadout", ["应用自定义装备方案", "Применить свой комплект снаряжения", "Aplicar equipamiento personalizado", "Aplicar equipamento personalizado", "カスタム装備を適用", "Benutzerdefinierte Ausrüstung anwenden", "Appliquer un équipement personnalisé", "Zastosuj własny zestaw wyposażenia", "套用自訂裝備配置", "사용자 지정 장비 구성 적용"]],
    ["Assessors may quarrel over {0}'s levy until Candlemas. Your bond fell due at Michaelmas.", ["评估员可能会为{0}的征税争执到圣烛节。你的债券已于圣米迦勒节到期。", "Сборщики могут спорить о подати с {0} вплоть до Сретения. Срок по вашей облигации истёк на Михайлов день.", "Los tasadores pueden disputar el impuesto de {0} hasta la Candelaria. Tu obligación venció el día de San Miguel.", "Os avaliadores podem discutir a cobrança de {0} até a Candelária. Sua obrigação venceu no dia de São Miguel.", "査定官たちは聖燭祭まで{0}の賦課金をめぐって争うかもしれない。あなたの債券は聖ミカエル祭に期限を迎えた。", "Die Schätzer mögen bis Mariä Lichtmess über die Abgabe von {0} streiten. Eure Anleihe wurde zu Michaelis fällig.", "Les receveurs peuvent contester le prélèvement de {0} jusqu'à la Chandeleur. Votre obligation arrivait à échéance à la Saint-Michel.", "Poborcy mogą spierać się o podatek z {0} aż do Matki Boskiej Gromnicznej. Twoja obligacja stała się wymagalna w dzień św. Michała.", "評估員可能會為{0}的徵稅爭執到聖燭節。你的債券已於聖米迦勒節到期。", "징수관들은 촛불 축일이 될 때까지 {0}의 세금을 두고 다툴 수 있습니다. 당신의 채권은 성 미카엘 축일에 만기가 되었습니다."]],
    ["Asymmetric Japanese bows can be worked above a gunwale without striking the deck.", ["不对称的日本弓可以越过船舷使用，不会撞到甲板。", "Асимметричными японскими луками можно стрелять поверх фальшборта, не задевая палубу.", "Los arcos japoneses asimétricos pueden usarse por encima de la borda sin golpear la cubierta.", "Arcos japoneses assimétricos podem ser usados por cima da amurada sem atingir o convés.", "非対称な日本の弓は、舷側の上から甲板にぶつけずに射ることができる。", "Asymmetrische japanische Bögen lassen sich über der Reling einsetzen, ohne das Deck zu berühren.", "Les arcs japonais asymétriques peuvent être utilisés au-dessus du plat-bord sans heurter le pont.", "Z asymetrycznych japońskich łuków można strzelać ponad burtą, nie uderzając o pokład.", "不對稱的日本弓可以越過船舷使用，不會撞到甲板。", "비대칭 일본식 활은 갑판에 걸리지 않게 현측 너머로 쏠 수 있습니다."]],
    ["At last, a coast whose shoals know me by name.", ["终于来到一片熟悉的海岸，连浅滩都认得我。", "Наконец берег, чьи отмели словно знают меня по имени.", "Por fin una costa cuyos bajíos parecen conocerme por mi nombre.", "Enfim, uma costa cujos baixios parecem me conhecer pelo nome.", "ついに、浅瀬までが私を知っている海岸にたどり着いた。", "Endlich eine Küste, deren Untiefen mich zu kennen scheinen.", "Enfin une côte dont les hauts-fonds semblent me connaître.", "Nareszcie wybrzeże, którego mielizny zdają się mnie znać.", "終於來到一片熟悉的海岸，連淺灘都認得我。", "마침내 얕은 여울까지 나를 알아보는 해안에 닿았습니다."]],
    ["At last, proportions from a sober witness rather than a tapestry. Its tongue and gait may be more instructive than the extraordinary neck everyone remembers.", ["总算从可靠目击者那里得到了比例数据，而不是照着挂毯猜测。它的舌头和步态，或许比人人记得的那条奇特长颈更值得研究。", "Наконец-то мы получили описание пропорций от надёжного свидетеля, а не с гобелена. Язык и походка животного могут рассказать больше, чем его необычная шея, которую помнят все.", "Al fin tenemos las proporciones descritas por un testigo fiable, no deducidas de un tapiz. Su lengua y su forma de andar pueden enseñarnos más que el extraordinario cuello que todos recuerdan.", "Enfim, temos as proporções descritas por uma testemunha confiável, não deduzidas de uma tapeçaria. A língua e o andar do animal podem ensinar mais que o pescoço extraordinário de que todos se lembram.", "ついに、タペストリーではなく信頼できる目撃者から体の比率を聞けた。その舌や歩き方は、誰もが覚えている長い首よりも多くを教えてくれるかもしれない。", "Endlich stammen die Proportionen von einem glaubwürdigen Zeugen statt von einem Wandteppich. Zunge und Gang könnten aufschlussreicher sein als der außergewöhnliche Hals, an den sich alle erinnern.", "Enfin, les proportions viennent d'un témoin digne de foi et non d'une tapisserie. Sa langue et sa démarche en apprendront peut-être davantage que son cou extraordinaire, dont tout le monde se souvient.", "Wreszcie znamy proporcje z relacji wiarygodnego świadka, a nie z gobelinu. Język i chód zwierzęcia mogą powiedzieć więcej niż niezwykła szyja, którą wszyscy pamiętają.", "總算從可靠目擊者那裡得到了比例數據，而不是照著掛毯猜測。牠的舌頭和步態，或許比人人記得的那條奇特長頸更值得研究。", "마침내 태피스트리가 아닌 믿을 만한 목격자의 설명으로 비율을 알게 됐습니다. 모두가 기억하는 특이한 목보다 혀와 걸음걸이가 더 많은 것을 알려줄지도 모릅니다."]],
    ["At Worms, Luther refused lawful recantation before Church and Emperor. The Edict has made him an outlaw, yet his pamphlets still cross every market.", ["在沃尔姆斯，路德当着教会和皇帝的面拒绝正式撤回自己的主张。敕令将他宣布为亡命之徒，但他的传单仍在各地市场流传。", "В Вормсе Лютер отказался официально отречься от своих взглядов перед церковью и императором. Эдикт объявил его вне закона, но его памфлеты по-прежнему ходят по всем рынкам.", "En Worms, Lutero se negó a retractarse formalmente ante la Iglesia y el Emperador. El edicto lo declaró proscrito, pero sus panfletos siguen circulando por todos los mercados.", "Em Worms, Lutero se recusou a se retratar formalmente perante a Igreja e o Imperador. O Edito tornou-o proscrito, mas seus panfletos continuam circulando por todos os mercados.", "ヴォルムスでルターは、教会と皇帝の前で正式な撤回を拒んだ。勅令で帝国追放となったが、彼の小冊子は今も各地の市場に広まっている。", "In Worms verweigerte Luther vor Kirche und Kaiser den formellen Widerruf. Das Edikt erklärte ihn für vogelfrei, doch seine Flugschriften verbreiten sich weiterhin auf allen Märkten.", "À Worms, Luther refusa de se rétracter officiellement devant l'Église et l'empereur. L'édit le mit au ban de l'Empire, mais ses pamphlets continuent de circuler sur tous les marchés.", "W Wormacji Luter odmówił formalnego odwołania swoich poglądów przed Kościołem i cesarzem. Edykt wyjęł go spod prawa, lecz jego pisma nadal krążą po wszystkich targach.", "在沃爾姆斯，路德當著教會和皇帝的面拒絕正式撤回自己的主張。敕令將他宣布為亡命之徒，但他的傳單仍在各地市場流傳。", "보름스에서 루터는 교회와 황제 앞에서 공식적인 철회를 거부했습니다. 칙령으로 그는 제국의 보호를 잃었지만, 그의 소책자는 여전히 모든 시장에 퍼지고 있습니다."]],
    ["Avoid battle; favor Ming", ["避免交战；支持明朝", "Избежать битвы и поддержать Мин", "Evitar la batalla y apoyar a los Ming", "Evite a batalha e apoie os Ming", "戦闘を避け、明を支持する", "Kampf vermeiden und Ming unterstützen", "Éviter le combat et soutenir les Ming", "Uniknij bitwy i poprzyj dynastię Ming", "避免交戰；支持明朝", "전투를 피하고 명나라를 돕는다"]],
    ["Aye. The chart can hang over a quiet hearth now. I have seen what lies beneath the red X, and I prefer the road home.", ["是啊。海图如今可以挂在宁静的壁炉上了。我已经见识过红色叉号下埋着什么，还是更愿意回家。", "Да. Теперь карта может висеть над тихим домашним очагом. Я видел, что скрывается под красным крестом, и предпочитаю дорогу домой.", "Sí. La carta puede colgar sobre un hogar tranquilo. Ya vi qué se esconde bajo la X roja, y prefiero volver a casa.", "Sim. A carta náutica já pode ficar sobre uma lareira tranquila. Vi o que há sob o X vermelho e prefiro voltar para casa.", "ああ。海図はもう、穏やかな炉辺に飾っておけばいい。赤いXの下に何があるかは見た。家へ帰る道のほうがいい。", "Ja. Die Seekarte kann nun über einem stillen Herd hängen. Ich habe gesehen, was unter dem roten X liegt, und ziehe den Heimweg vor.", "Oui. La carte peut désormais être accrochée au-dessus d'un âtre paisible. J'ai vu ce que cache le X rouge et je préfère rentrer chez moi.", "Tak. Mapa może teraz zawisnąć nad spokojnym domowym paleniskiem. Widziałem, co kryje się pod czerwonym X, i wolę wracać do domu.", "是啊。海圖如今可以掛在寧靜的壁爐上了。我已經見識過紅色叉號下埋著什麼，還是更願意回家。", "그래. 이제 해도는 조용한 집 난롯가에 걸어두면 되겠군. 붉은 X 아래에 무엇이 있는지 봤으니, 집으로 돌아가는 편이 낫겠어."]],
    ["Azemmour cost your family twice: once to Portugal, once to me.", ["阿泽穆尔让你家付出过两次代价：一次输给葡萄牙，一次输给我。", "Аземмур дважды обошёлся вашей семье дорого: сначала из-за Португалии, теперь из-за меня.", "Azemmour le costó caro a tu familia dos veces: primero por Portugal y ahora por mí.", "Azemmour custou caro à sua família duas vezes: primeiro por Portugal, agora por mim.", "アゼンムールはあなたの一族に二度の犠牲を強いた。最初はポルトガルに、今度は私に。", "Azemmour kam eure Familie zweimal teuer zu stehen: zuerst Portugal, dann ich.", "Azemmour a coûté cher deux fois à votre famille : d'abord le Portugal, puis moi.", "Azemmour dwukrotnie drogo kosztowało twoją rodzinę: najpierw z rąk Portugalii, teraz z moich.", "阿澤穆爾讓你家付出過兩次代價：一次輸給葡萄牙，一次輸給我。", "아젬무르는 당신 가문에 두 번 큰 대가를 안겼지. 한 번은 포르투갈 때문에, 이번엔 나 때문에."]],
    ["Back a great shipyard", ["资助一座大型造船厂", "Вложиться в крупную верфь", "Financiar un gran astillero", "Investir em um grande estaleiro", "大造船所に出資する", "Eine große Werft fördern", "Financer un grand chantier naval", "Sfinansuj wielką stocznię", "資助一座大型造船廠", "대형 조선소에 투자하기"]],
    ["BEAT THE {0} DELEGATION TO NINGBO", ["赶在{0}使团之前抵达宁波", "Опережите делегацию {0} на пути в Нинбо", "Llega a Ningbo antes que la delegación de {0}", "Chegue a Ningbo antes da delegação de {0}", "{0}使節団より先に寧波へ着け", "Erreichen Sie Ningbo vor der Delegation aus {0}", "Arrivez à Ningbo avant la délégation de {0}", "Dotrzyj do Ningbo przed delegacją z {0}", "趕在{0}使團之前抵達寧波", "{0} 사절단보다 먼저 닝보에 도착하세요"]],
    ["Before seeking leave, the emissaries must show what regular commerce can bring. Add", ["在请求通商许可前，使者必须展示常规贸易能带来什么。添置", "Прежде чем просить разрешения на торговлю, посланники должны показать выгоды регулярного обмена. Добавьте", "Antes de solicitar permiso para comerciar, los emisarios deben mostrar lo que puede aportar el intercambio regular. Añade", "Antes de pedir licença para comerciar, os emissários devem mostrar os benefícios do comércio regular. Acrescente", "通商許可を願い出る前に、使節団は定期交易の利益を示さねばならない。追加", "Bevor die Gesandten um Handelsgenehmigung bitten, müssen sie den Nutzen regelmäßigen Handels zeigen. Ergänzen Sie", "Avant de demander l'autorisation de commercer, les émissaires doivent montrer les avantages d'échanges réguliers. Ajoutez", "Zanim posłowie poproszą o zgodę na handel, muszą pokazać korzyści z regularnej wymiany. Dodaj", "在請求通商許可前，使者必須展示常規貿易能帶來什麼。添置", "무역 허가를 청하기 전에 사절단은 정기 교역이 가져올 이익을 보여야 합니다. 추가"]],
    ["Begin with {0}: {1}. A true account earns {2} doubloons. I marked its bearing.", ["先从{0}开始：{1}。经核实的记述可得{2}达布隆。我已标出它的方位。", "Начните с {0}: {1}. За достоверное описание полагается {2} дублонов. Я отметил направление.", "Empieza por {0}: {1}. Un relato verídico se paga a {2} doblones. He marcado su rumbo.", "Comece por {0}: {1}. Um relato verídico rende {2} dobrões. Marquei o rumo.", "まずは{0}から：{1}。確かな記録には{2}ダブロンを支払う。方位は記しておいた。", "Beginnen Sie mit {0}: {1}. Für einen verlässlichen Bericht gibt es {2} Dublonen. Die Peilung habe ich markiert.", "Commencez par {0} : {1}. Un témoignage véridique rapporte {2} doublons. J'en ai marqué le relèvement.", "Zacznij od {0}: {1}. Wiarygodna relacja jest warta {2} dublonów. Zaznaczyłem namiar.", "先從{0}開始：{1}。經查證的記述可得{2}達布隆。我已標出牠的方位。", "{0}부터 시작하세요: {1}. 믿을 만한 기록에는 {2} 더블룬을 드립니다. 방향은 표시해 두었습니다."]],
    ["Belgrade fell. Your quartermaster fled. My claim remained.", ["贝尔格莱德陷落了。你的军需官逃了，我的债权却还在。", "Белград пал. Ваш интендант бежал. Моё требование по долгу осталось в силе.", "Belgrado cayó. Tu intendente huyó, pero mi reclamación de la deuda sigue en pie.", "Belgrado caiu. Seu intendente fugiu, mas minha cobrança continua de pé.", "ベオグラードは陥落した。君の補給官は逃げたが、私の債権は残った。", "Belgrad fiel. Euer Quartiermeister floh. Meine Forderung blieb bestehen.", "Belgrade est tombée. Votre intendant a fui, mais ma créance demeure.", "Belgrad upadł. Twój kwatermistrz uciekł, ale moje roszczenie o spłatę długu pozostało w mocy.", "貝爾格萊德陷落了。你的軍需官逃了，我的債權卻還在。", "베오그라드는 함락됐습니다. 당신의 병참관은 달아났지만, 제 채권은 여전히 유효합니다."]],
    ["BESTIARY REPORTED {0}/{1}", ["已记录的异兽条目 {0}/{1}", "ЗАПИСИ О ЗВЕРЯХ {0}/{1}", "BESTIARIO REGISTRADO {0}/{1}", "REGISTROS DO BESTIÁRIO {0}/{1}", "記録した動物誌の項目 {0}/{1}", "BESTIARIUMSEINTRÄGE {0}/{1}", "ENTRÉES DU BESTIAIRE {0}/{1}", "WPISY BESTIARIUM {0}/{1}", "已記錄的異獸條目 {0}/{1}", "기록한 괴수 항목 {0}/{1}"]],
    ["BIBLE SMUGGLING COMPLETE", ["圣经偷运完成", "КОНТРАБАНДА БИБЛИЙ ЗАВЕРШЕНА", "CONTRABANDO DE BIBLIAS COMPLETADO", "CONTRABANDO DE BÍBLIAS CONCLUÍDO", "聖書の密輸完了", "BIBELSCHMUGGEL ABGESCHLOSSEN", "CONTREBANDE DE BIBLES TERMINÉE", "PRZEMYT BIBLII ZAKOŃCZONY", "聖經偷運完成", "성경 밀수 완료"]],
    ["BIBLES SEIZED MISSION FAILED", ["圣经被没收，任务失败", "БИБЛИИ КОНФИСКОВАНЫ, ЗАДАНИЕ ПРОВАЛЕНО", "BIBLIAS INCAUTADAS: MISIÓN FALLIDA", "BÍBLIAS APREENDIDAS: MISSÃO FALHOU", "聖書を押収されたため任務失敗", "BIBELN BESCHLAGNAHMT: AUFTRAG GESCHEITERT", "BIBLES SAISIES : MISSION ÉCHOUÉE", "BIBLIE SKONFISKOWANE: MISJA NIEUDANA", "聖經遭到沒收，任務失敗", "성경 압수: 임무 실패"]],
    ["Boatmen are sounding the channel while merchants at the landing study each new flag and cargo.", ["船夫们正在测量水道深度，登陆点的商人则仔细查看每面新旗帜和每批货物。", "Лодочники промеряют глубину в проливе, а торговцы у пристани изучают каждый новый флаг и груз.", "Los barqueros miden la profundidad del canal mientras los comerciantes del embarcadero examinan cada nueva bandera y carga.", "Os barqueiros sondam a profundidade do canal enquanto os comerciantes no cais examinam cada nova bandeira e carga.", "船頭たちが水路の水深を測る一方、船着き場の商人たちは新しい旗と積荷を一つずつ調べている。", "Die Bootsleute loten den Fahrweg aus, während die Händler am Anleger jede neue Flagge und Ladung prüfen.", "Les bateliers sondent le chenal tandis que les marchands du débarcadère examinent chaque nouveau pavillon et chaque cargaison.", "Przewoźnicy mierzą głębokość kanału, a kupcy przy przystani oglądają każdą nową banderę i ładunek.", "船夫們正在測量水道深度，登岸處的商人則仔細查看每面新旗幟和每批貨物。", "뱃사공들은 수로의 수심을 재고, 선착장에 있는 상인들은 새 깃발과 화물을 하나씩 살펴봅니다."]],
    ["Bows gain hull damage; range -28%; reload 55% slower", ["弓类武器可对船体造成伤害；射程 -28%；装填速度降低 55%", "Луки наносят урон корпусу; дальность −28%; перезарядка на 55% медленнее", "Los arcos dañan el casco; alcance −28%; recarga un 55% más lenta", "Arcos causam dano ao casco; alcance −28%; recarga 55% mais lenta", "弓で船体に損傷を与える。射程 −28%、再装填が55%遅くなる", "Bögen verursachen Rumpfschaden; Reichweite −28 %; Nachladen 55 % langsamer", "Les arcs infligent des dégâts à la coque ; portée −28 % ; rechargement 55 % plus lent", "Łuki zadają uszkodzenia kadłuba; zasięg −28%; przeładowanie trwa o 55% dłużej", "弓類武器可對船體造成傷害；射程 −28%；裝填速度降低 55%", "활이 선체에 피해를 줍니다. 사거리 −28%, 재장전 시간 55% 증가"]],
    ["Break the bargain; avoid battle; favor Ming", ["撕毁约定；避免交战；支持明朝", "Нарушить договор, избежать битвы и поддержать Мин", "Rompe el acuerdo, evita la batalla y apoya a los Ming", "Rompa o acordo, evite a batalha e apoie os Ming", "盟約を破棄し、戦闘を避け、明を支持する", "Die Vereinbarung brechen, den Kampf vermeiden und Ming unterstützen", "Rompre l'accord, éviter le combat et soutenir les Ming", "Zerwij układ, uniknij bitwy i poprzyj dynastię Ming", "撕毀約定；避免交戰；支持明朝", "협정을 깨고 전투를 피하며 명나라를 돕는다"]],
    ["BREAK OFF", ["中止", "ПРЕКРАТИТЬ", "ABORTAR", "INTERROMPER", "中止", "ABBRECHEN", "INTERROMPRE", "PRZERWIJ", "中止", "중단"]],
    ["Brazil's scattered captaincies need a royal center. Tome de Sousa plans a fortified capital above the Bay of All Saints.", ["巴西各地分散的殖民领需要一个王室中心。托梅·德索萨计划在诸圣湾北岸建造一座设防首府。", "Разрозненным капитанствам Бразилии нужен королевский центр. Томе де Соуза планирует основать укреплённую столицу у залива Всех Святых.", "Las capitanías dispersas de Brasil necesitan un centro real. Tomé de Sousa planea fundar una capital fortificada junto a la bahía de Todos los Santos.", "As capitanias dispersas do Brasil precisam de um centro real. Tomé de Sousa planeja fundar uma capital fortificada junto à Baía de Todos os Santos.", "ブラジル各地に分かれたカピタニアを統べる王権の拠点が必要だ。トメ・デ・ソウザは諸聖人湾に要塞化した首都を築こうとしている。", "Die verstreuten Kapitanate Brasiliens brauchen ein königliches Zentrum. Tomé de Sousa plant eine befestigte Hauptstadt an der Allerheiligenbucht.", "Les capitaineries dispersées du Brésil ont besoin d'un centre royal. Tomé de Sousa projette de fonder une capitale fortifiée au bord de la baie de Tous-les-Saints.", "Rozproszone kapitanie Brazylii potrzebują królewskiego ośrodka. Tomé de Sousa planuje założyć ufortyfikowaną stolicę nad Zatoką Wszystkich Świętych.", "巴西各地分散的殖民領需要一個王室中心。托梅·德索薩計劃在諸聖灣北岸建造一座設防首府。", "브라질에 흩어진 식민지 총독령을 통솔할 왕실 중심지가 필요합니다. 토메 데 소자는 만성인의 만에 요새화된 수도를 세울 계획입니다."]],
    ["Break the batteries and drive the pirates out of {0}. Then return to {1}.", ["摧毁岸炮，赶走{0}的海盗，然后返回{1}。", "Подавите береговые батареи и изгнайте пиратов из {0}. Затем вернитесь в {1}.", "Destruye las baterías costeras y expulsa a los piratas de {0}. Luego vuelve a {1}.", "Destrua as baterias costeiras e expulse os piratas de {0}. Depois, volte para {1}.", "沿岸砲台を制圧し、{0}から海賊を追い払え。その後、{1}へ戻れ。", "Zerstören Sie die Küstenbatterien und vertreiben Sie die Piraten aus {0}. Kehren Sie dann nach {1} zurück.", "Réduisez les batteries côtières et chassez les pirates de {0}. Retournez ensuite à {1}.", "Zniszcz baterie nadbrzeżne i wypędź piratów z {0}. Potem wróć do {1}.", "摧毀岸砲，趕走{0}的海盜，然後返回{1}。", "해안 포대를 제압하고 {0}에서 해적들을 몰아내세요. 그런 다음 {1}(으)로 돌아가세요."]],
    ["Bridgetown now anchors English Barbados at Carlisle Bay. Its port prospers while plantations spread and demand ever more bond labor.", ["布里奇敦如今成为英属巴巴多斯在卡莱尔湾的据点。港口日渐繁荣，种植园不断扩张，对契约劳工的需求也越来越大。", "Бриджтаун стал опорным городом английской Барбадосской колонии в заливе Карлайл. Порт процветает, плантации расширяются и требуют всё больше подневольных работников.", "Bridgetown es ahora el principal puerto de la Barbados inglesa, en Carlisle Bay. El puerto prospera mientras se extienden las plantaciones y crece la demanda de mano de obra sometida a contrato.", "Bridgetown é agora o principal porto da Barbados inglesa, na Baía de Carlisle. O porto prospera enquanto as plantações se expandem e cresce a demanda por trabalhadores contratados sob servidão.", "ブリッジタウンはカーライル湾に築かれた英領バルバドスの拠点となった。港は栄える一方、農園は広がり、年季契約労働者をますます必要としている。", "Bridgetown ist nun der Ankerpunkt des englischen Barbados an der Carlisle Bay. Der Hafen floriert, während die Plantagen wachsen und immer mehr Vertragsknechte verlangen.", "Bridgetown est désormais le principal port de la Barbade anglaise, dans la baie de Carlisle. Le port prospère tandis que les plantations s'étendent et réclament toujours plus de travailleurs sous contrat.", "Bridgetown stało się głównym portem angielskiego Barbadosu nad zatoką Carlisle. Port prosperuje, a plantacje się rozrastają i potrzebują coraz więcej robotników kontraktowych.", "布里奇敦如今成為英屬巴貝多在卡萊爾灣的據點。港口日漸繁榮，種植園不斷擴張，對契約勞工的需求也越來越大。", "브리지타운은 칼라일만에 자리한 영국령 바베이도스의 중심 항구가 되었습니다. 항구는 번성하지만 농장은 확장되며 계약 노동자를 더 많이 요구합니다."]],
    ["At Giza, the pyramid swallowed the horizon. Each stone course is taller than a person, yet the four faces rise with a precision I could scarcely find in a shipwright's rule.", ["在吉萨，金字塔高耸入天，遮住了地平线。每层石块都比人高，四面却垒砌得如此精准，连造船匠的尺规也难以企及。", "В Гизе пирамида закрывала собой весь горизонт. Каждый ряд камней выше человека, а четыре грани сложены с точностью, какой не найти даже у корабельного мастера с его мерной рейкой.", "En Giza, la pirámide ocultaba el horizonte. Cada hilada de piedra supera la altura de una persona, y sus cuatro caras se alzan con una precisión difícil de hallar incluso en la regla de un carpintero naval.", "Em Gizé, a pirâmide encobria o horizonte. Cada fiada de pedra é mais alta que uma pessoa, e suas quatro faces se erguem com uma precisão difícil de encontrar até mesmo na régua de um construtor naval.", "ギザではピラミッドが地平線を覆い隠していた。一段ごとの石組みは人の背丈より高いのに、四つの斜面は船大工の物差しにも見られないほど正確に築かれている。", "In Gizeh verschluckte die Pyramide den Horizont. Jede Steinlage ist höher als ein Mensch, und doch steigen ihre vier Seiten mit einer Präzision auf, die selbst ein Schiffszimmermann mit seinem Maßstab kaum erreicht.", "À Gizeh, la pyramide engloutissait l'horizon. Chaque assise de pierre dépasse la taille d'une personne, et pourtant ses quatre faces s'élèvent avec une précision que même la règle d'un charpentier de marine peine à égaler.", "W Gizie piramida pochłaniała horyzont. Każda warstwa kamieni jest wyższa od człowieka, a mimo to jej cztery ściany wznoszą się z precyzją trudną do osiągnięcia nawet przy użyciu miarki szkutnika.", "在吉薩，金字塔高聳入天，遮住了地平線。每層石塊都比人高，四面卻堆砌得如此精準，連造船匠的尺規也難以企及。", "기자에서는 피라미드가 지평선을 삼켰습니다. 돌 한 층의 높이가 사람 키보다 높은데도 네 면은 조선공의 자로도 재기 어려울 만큼 정밀하게 솟아 있습니다."]],
    ["Aconcagua towered above the dry Andes, bare rock and pale snow under an empty blue sky. Its height is startling because so little hides it: no forest, no gentle foothills, only ascent.", [
      "阿空加瓜高耸于干燥的安第斯山脉，裸岩与浅色积雪直插空旷的蓝天。它几乎毫无遮蔽：没有森林，没有平缓的山麓，眼前只有不断攀升的山势。", "Аконкагуа возвышалась над засушливыми Андами: голая скала и светлый снег под безоблачным синим небом. Гора поражает высотой — ничто её не скрывает: ни лес, ни пологие предгорья, лишь крутой подъём.", "El Aconcagua se alza sobre los Andes áridos, entre roca desnuda y nieve pálida bajo un cielo azul despejado. Su altura sorprende: nada la oculta, ni bosques ni suaves estribaciones; solo la ladera que asciende.", "O Aconcágua se ergue sobre os Andes secos, entre rocha nua e neve pálida sob um céu azul sem nuvens. Sua altura impressiona porque nada a esconde: nem florestas nem colinas suaves, apenas a encosta íngreme.", "乾いたアンデスにそびえるアコンカグア。むき出しの岩と淡い雪が、雲ひとつない青空の下に広がる。森もなだらかな山麓もなく、その高さを隠すものはない。ただ山頂へ続く斜面だけがある。", "Der Aconcagua ragte über den trockenen Anden auf: kahler Fels und blasser Schnee unter wolkenlosem blauem Himmel. Seine Höhe ist verblüffend, weil ihn kaum etwas verbirgt: kein Wald, kein sanftes Vorland, nur der steile Anstieg.", "L'Aconcagua dominait les Andes arides, entre roche nue et neige pâle sous un ciel bleu sans nuages. Sa hauteur frappe, car rien ne la dissimule : ni forêt, ni doux contreforts, seulement la pente qui monte.", "Aconcagua górowała nad suchymi Andami: naga skała i blady śnieg pod bezchmurnym, błękitnym niebem. Jej wysokość zdumiewa, bo niemal nic jej nie zasłania: ani las, ani łagodne podnóża, tylko strome zbocze.", "阿空加瓜高聳於乾燥的安地斯山脈，裸岩與淺色積雪直插空曠的藍天。它幾乎毫無遮蔽：沒有森林，沒有平緩的山麓，眼前只有不斷攀升的山勢。", "아콩카과는 메마른 안데스산맥 위로 우뚝 솟아 있습니다. 맨바위와 옅은 눈이 구름 한 점 없는 푸른 하늘 아래 드러나 있습니다. 숲도 완만한 산기슭도 없어 가릴 것이 거의 없습니다. 가파른 산비탈만이 이어집니다."
    ]],
    ["Across the Nazca desert, straight paths run farther than an arrow can fly. From the surrounding heights they join into birds and beasts, their pale lines untouched by the barren wind.", [
      "纳斯卡沙漠中，笔直的线条延伸得比箭飞得还远。从周围高地望去，它们连成飞鸟与野兽；苍白的线痕任荒风吹拂，依然清晰。", "По пустыне Наска тянутся прямые линии — дальше, чем долетит стрела. С окрестных высот они складываются в птиц и зверей; сухой ветер не стёр их бледные следы.", "Por el desierto de Nazca, líneas rectas se extienden más lejos de lo que vuela una flecha. Desde las alturas forman aves y bestias; el viento árido no borra sus trazos pálidos.", "Pelo deserto de Nazca, linhas retas avançam mais longe do que uma flecha alcança. Vistas das alturas, formam aves e animais; o vento seco não apaga seus traços pálidos.", "ナスカの砂漠には、矢が飛ぶよりも遠くまで直線が伸びている。周囲の高地から見ると、それらは鳥や獣の姿を形づくり、乾いた風にも淡い線は消えずに残る。", "Durch die Wüste von Nazca ziehen sich gerade Linien, weiter als ein Pfeil fliegt. Von den umliegenden Höhen formen sie Vögel und Tiere; der trockene Wind hat ihre blassen Spuren nicht verweht.", "Dans le désert de Nazca, des lignes droites s'étendent plus loin qu'une flèche ne peut voler. Vues des hauteurs, elles dessinent oiseaux et bêtes ; le vent aride n'efface pas leurs tracés pâles.", "Przez pustynię Nazca biegną proste linie, sięgające dalej niż lot strzały. Z okolicznych wzniesień układają się w ptaki i zwierzęta; suchy wiatr nie zatarł ich bladych śladów.", "納斯卡沙漠中，筆直的線條延伸得比箭飛得還遠。從周圍高地望去，它們連成飛鳥與野獸；蒼白的線痕任荒風吹拂，依然清晰。", "나스카 사막에는 화살이 날아가는 거리보다 더 멀리 곧은 선들이 이어져 있습니다. 주변 고지대에서 보면 새와 짐승의 형상을 이루며, 메마른 바람에도 희미한 선들은 지워지지 않았습니다."
    ]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedNextCatalogRangeOverrides() {
  const entries = [
    ["Captain {0}'s treasure is home and the old crew are beaten. Will you retire with the prize, or tempt the sea again?", ["{0}船长的宝藏已带回家，旧船员也已落败。你要带着战利品退休，还是再度出海冒险？", "Сокровище капитана {0} доставлено домой, а старая команда побеждена. Уйдёте на покой с добычей или снова бросите вызов морю?", "El tesoro del capitán {0} está a salvo en casa y la antigua tripulación ha sido derrotada. ¿Te retirarás con el botín o volverás a desafiar al mar?", "O tesouro do capitão {0} chegou em segurança, e a antiga tripulação foi derrotada. Você vai se aposentar com o prêmio ou desafiar o mar outra vez?", "{0}船長の財宝は故郷に戻り、かつての乗組員も打ち負かした。褒賞を手に引退するか、再び海に挑むか？", "Kapitän {0}s Schatz ist sicher heimgebracht, die alte Mannschaft ist besiegt. Wollt Ihr Euch mit der Beute zur Ruhe setzen oder erneut die See herausfordern?", "Le trésor du capitaine {0} est rentré au port et l'ancien équipage a été vaincu. Allez-vous prendre votre retraite avec le butin ou défier encore la mer ?", "Skarb kapitana {0} wrócił do domu, a stara załoga została pokonana. Przejdziesz na emeryturę z łupem czy znów rzucisz wyzwanie morzu?", "{0}船長的寶藏已帶回家，舊船員也已落敗。你要帶著戰利品退休，還是再度出海冒險？", "{0} 선장의 보물은 무사히 돌아왔고 옛 선원들은 패배했습니다. 보물을 챙겨 은퇴할까요, 아니면 다시 바다에 도전할까요?"]],
    ["Captain, I thought landfall would make this easier to say. It has not. I love you, and I do not want our voyage to end with us apart.", ["船长，我以为靠岸后会更容易说出口，但并没有。我爱你，不想让这趟航程以我们分离告终。", "Капитан, я думал, на берегу будет легче сказать это. Но нет. Я люблю вас и не хочу, чтобы наше плавание закончилось разлукой.", "Capitán, pensé que al llegar a tierra me sería más fácil decirlo, pero no. Te amo y no quiero que nuestro viaje termine separándonos.", "Capitão, achei que em terra seria mais fácil dizer isto, mas não foi. Eu te amo e não quero que nossa viagem termine com nós dois separados.", "船長、陸に着けば言いやすいと思っていました。でも違いました。あなたを愛しています。この航海が別れで終わるのは嫌です。", "Kapitän, ich dachte, an Land würde es mir leichter fallen, das zu sagen. Aber das war nicht so. Ich liebe dich und möchte nicht, dass unsere Reise mit einer Trennung endet.", "Capitaine, je pensais qu'une fois à terre, ce serait plus facile à dire. Mais non. Je t'aime et je ne veux pas que notre voyage s'achève par une séparation.", "Kapitanie, myślałem, że łatwiej będzie mi to powiedzieć po zejściu na ląd. Myliłem się. Kocham cię i nie chcę, by nasza podróż zakończyła się rozłąką.", "船長，我以為靠岸後會更容易說出口，但並沒有。我愛你，不想讓這趟航程以我們分離告終。", "선장님, 육지에 닿으면 이 말을 더 쉽게 할 수 있을 줄 알았어요. 아니었네요. 사랑합니다. 우리 항해가 헤어짐으로 끝나지 않았으면 해요."]],
    ["Captain, I was born in {0}. My last berth ended here, and I have no kin in this harbor. Carry me home and I will pay {1} db.", ["船长，我出生在{0}。我最近一次停留就在这里，但在这个港口没有亲人。请送我回家，我会付你{1}达布隆。", "Капитан, я родился в {0}. Моя последняя стоянка была здесь, но родных в этой гавани у меня нет. Отвезите меня домой, и я заплачу {1} дублонов.", "Capitán, nací en {0}. Mi última escala fue aquí, pero no tengo familia en este puerto. Llévame a casa y te pagaré {1} doblones.", "Capitão, nasci em {0}. Minha última parada foi aqui, mas não tenho parentes neste porto. Leve-me para casa e pagarei {1} dobrões.", "船長、私は{0}生まれです。最後に立ち寄ったのがこの港でしたが、ここには身寄りがありません。故郷まで送ってくれれば{1}ダブロンを払います。", "Kapitän, ich wurde in {0} geboren. Meine letzte Station war hier, aber in diesem Hafen habe ich keine Angehörigen. Bringt mich nach Hause, und ich zahle Euch {1} Dublonen.", "Capitaine, je suis né à {0}. Ma dernière escale était ici, mais je n'ai aucun parent dans ce port. Ramenez-moi chez moi et je vous paierai {1} doublons.", "Kapitanie, urodziłem się w {0}. Ostatni raz zatrzymałem się tutaj, ale nie mam krewnych w tym porcie. Odwieź mnie do domu, a zapłacę {1} dublonów.", "船長，我出生在{0}。我最近一次停留就在這裡，但在這個港口沒有親人。請送我回家，我會付你{1}達布隆。", "선장님, 저는 {0}에서 태어났습니다. 마지막으로 머문 곳이 이 항구지만, 여기에는 친척이 없습니다. 고향까지 데려다주시면 {1} 더블룬을 드리겠습니다."]],
    ["Can harvest nearby fisheries", ["可在附近渔场捕鱼", "Можно ловить рыбу в ближайших промысловых зонах", "Puede pescar en caladeros cercanos", "Pode pescar em áreas de pesca próximas", "近くの漁場で漁ができる", "Kann in nahegelegenen Fischgründen fischen", "Peut pêcher dans les zones de pêche voisines", "Może łowić ryby na pobliskich łowiskach", "可在附近漁場捕魚", "인근 어장에서 고기잡이를 할 수 있습니다"]],
    ["Can nurse even a badly battered vessel toward seaworthiness.", ["甚至能修复重创的船只，使其逐步恢复适航状态。", "Может постепенно вернуть мореходность даже сильно повреждённому судну.", "Puede ayudar a que incluso un barco muy maltrecho vuelva a ser apto para navegar.", "Pode recuperar a navegabilidade até de uma embarcação muito avariada.", "大破した船も、航海できる状態まで少しずつ修復できる。", "Kann selbst ein schwer beschädigtes Schiff wieder seetüchtig machen.", "Peut remettre en état de naviguer même un navire très endommagé.", "Potrafi przywrócić zdolność żeglugową nawet mocno uszkodzonemu statkowi.", "甚至能修復重創的船隻，使其逐步恢復適航狀態。", "심하게 손상된 배도 다시 항해할 수 있도록 조금씩 수리할 수 있습니다."]],
    ["Cannon battery", ["炮台", "Артиллерийская батарея", "Batería de cañones", "Bateria de canhões", "砲台", "Kanonenbatterie", "Batterie de canons", "Bateria dział", "砲台", "포대"]],
    ["Cannon reload {0} faster", ["火炮装填速度提高 {0}", "Перезарядка орудий быстрее на {0}", "Recarga del cañón un {0} más rápida", "Recarga dos canhões {0} mais rápida", "砲の再装填が{0}速くなる", "Kanonen laden {0} schneller nach", "Rechargement des canons accéléré de {0}", "Przeładowanie dział szybsze o {0}", "火炮裝填速度提高 {0}", "대포 재장전 속도 {0} 빨라짐"]],
    ["Cannon spread -{0}", ["火炮散布范围缩小 {0}", "Разброс снарядов уменьшен на {0}", "Dispersión de los cañones reducida en {0}", "Dispersão dos disparos reduzida em {0}", "砲弾の散布が{0}減少", "Streuung der Kanonenkugeln um {0} verringert", "Dispersion des boulets réduite de {0}", "Rozrzut pocisków zmniejszony o {0}", "火炮散布範圍縮小 {0}", "포탄 산포도 {0} 감소"]],
    ["Cap'n's log... day whichever. Wine remains. Dignity less certain.", ["船长日志……不知哪一天。酒还剩着，体面就未必了。", "Запись капитана... день не помню. Вино ещё осталось. С достоинством всё хуже.", "Diario del capitán... qué día será. Aún queda vino; la dignidad, no sé.", "Diário do capitão... sei lá que dia é. Ainda há vinho. A dignidade já é outra história.", "船長日誌……今日は何日だったか。ワインは残っている。威厳はどうだろう。", "Aus dem Logbuch des Käpt'ns ... welcher Tag auch immer. Wein ist noch da. Die Würde weniger.", "Journal du cap'taine... quel jour déjà ? Il reste du vin. La dignité, moins sûr.", "Z dziennika kapitana... nie pamiętam, który to dzień. Wina jeszcze starczy. Z godnością gorzej.", "船長日誌……不知哪一天。酒還剩著，體面就未必了。", "선장 일지… 오늘이 며칠이더라. 술은 남았다. 품위는 장담 못 하겠다."]],
    ["capital arsenal", ["首都军械库", "Столичный арсенал", "Arsenal de la capital", "Arsenal da capital", "首都の兵器庫", "Arsenal der Hauptstadt", "Arsenal de la capitale", "Arsenał stołeczny", "首都軍械庫", "수도의 병기고"]],
    ["Bring that world home to me. I reward every true account, especially rare and distant wonders. Each time you return, I will share the nearest rumor still worth chasing.", [
      "把远方的见闻带回来告诉我。每份真实可靠的记录都有奖赏，罕见而遥远的奇观尤其珍贵。每次你回来，我都会告诉你仍值得探访的最近传闻。", "Привозите мне вести о дальних землях. Я награждаю за каждое достоверное описание, особенно редких и далёких чудес. При каждом возвращении я расскажу о ближайшем месте, которое ещё стоит исследовать.", "Tráeme noticias de esas tierras. Recompenso cada relato verídico, sobre todo los de maravillas raras y lejanas. Cuando regreses, te contaré el rumor más cercano que aún merezca la pena investigar.", "Traga notícias dessas terras. Recompenso cada relato confiável, sobretudo os de maravilhas raras e distantes. Quando voltar, compartilharei o rumor mais próximo que ainda valha a pena investigar.", "遠い土地の話を持ち帰って聞かせてください。確かな記録には報奨を出します。珍しく遠い驚異ならなおさらです。戻るたびに、まだ調べる価値のある最も近い噂を教えましょう。", "Bringen Sie mir Kunde aus jenen Ländern. Für jeden verlässlichen Bericht zahle ich eine Belohnung, besonders für seltene und ferne Wunder. Bei jeder Rückkehr verrate ich Ihnen das nächste Gerücht, dem sich noch nachzugehen lohnt.", "Rapportez-moi des nouvelles de ces contrées. Je récompense tout témoignage fiable, surtout sur les merveilles rares et lointaines. À chacun de vos retours, je vous indiquerai la rumeur la plus proche qui mérite encore d'être vérifiée.", "Przynoś mi wieści z tamtych stron. Nagradzam każdą wiarygodną relację, zwłaszcza o rzadkich i odległych cudach. Przy każdym powrocie podam ci najbliższą plotkę, którą wciąż warto sprawdzić.", "把遠方的見聞帶回來告訴我。每份真實可靠的記錄都有獎賞，罕見而遙遠的奇觀尤其珍貴。每次你回來，我都會告訴你仍值得探訪的最近傳聞。", "먼 곳의 소식을 내게 가져오세요. 믿을 만한 기록마다 보상하겠습니다. 희귀하고 먼 경이일수록 더 후하게 치르지요. 돌아올 때마다 아직 찾아볼 만한 가장 가까운 소문을 알려드리겠습니다。"
    ]],
    ["Camel trains halt beside the warehouses as sailors carry manifests from the anchorage to the customs court.", ["骆驼商队停在仓库旁，水手们则把货单从锚地送往海关。", "Верблюжьи караваны останавливаются у складов, пока моряки несут манифесты с рейда в таможню.", "Las caravanas de camellos se detienen junto a los almacenes mientras los marineros llevan los manifiestos desde el fondeadero a la aduana.", "As caravanas de camelos param junto aos armazéns enquanto marinheiros levam os manifestos do ancoradouro à alfândega.", "ラクダの隊商が倉庫のそばで足を止める。水夫たちは停泊地から税関へ貨物目録を運んでいる。", "Kamelkarawanen halten neben den Lagerhäusern, während Seeleute die Frachtlisten vom Ankerplatz zum Zollhaus bringen.", "Des caravanes de chameaux s'arrêtent près des entrepôts tandis que les marins portent les manifestes du mouillage à la douane.", "Karawany wielbłądów zatrzymują się przy magazynach, gdy marynarze niosą manifesty z kotwicowiska do urzędu celnego.", "駱駝商隊停在倉庫旁，水手們則把貨單從錨地送往海關。", "낙타 대상이 창고 옆에 멈춰 서고, 선원들은 정박지에서 세관까지 화물 목록을 나릅니다."]],
    ["By the sovereign's seal, the customs of {0} are offered until twelve hundred thousand doubloons have answered your indenture.", ["奉君主之印，{0}的关税收入将交予你，直至偿清一百二十万达布隆的契约债务。", "По печати государя вам передаются таможенные доходы {0}, пока они не покроют долг по вашему контракту в миллион двести тысяч дублонов.", "Por mandato soberano, se te ceden los ingresos aduaneros de {0} hasta saldar tu contrato por un millón doscientos mil doblones.", "Por ordem do soberano, a receita alfandegária de {0} será destinada a quitar sua dívida contratual de um milhão e duzentos mil dobrões.", "君主の御璽により、契約債務の百二十万ダブロンを返済するまで、{0}の関税収入を譲渡する。", "Mit dem Siegel des Landesherrn werden Euch die Zolleinnahmen aus {0} überlassen, bis Eure Vertragsschuld von einer Million zweihunderttausend Dublonen beglichen ist.", "Par le sceau du souverain, les recettes douanières de {0} vous sont attribuées jusqu'au remboursement de votre engagement, soit un million deux cent mille doublons.", "Na mocy pieczęci władcy dochody celne z {0} zostają ci przyznane, aż pokryją zobowiązanie kontraktowe w wysokości miliona dwustu tysięcy dublonów.", "奉君主之印，{0}的關稅收入將交予你，直至償清一百二十萬達布隆的契約債務。", "군주의 인장에 따라 {0}의 관세 수입을 계약 채무인 120만 더블룬을 갚을 때까지 양도합니다."]],
    ["But our hold is full; we cannot carry its treasure.", ["但我们的货舱已经装满，无法再装下那里的宝藏。", "Но трюм уже полон, и мы не можем взять сокровища на борт.", "Pero la bodega está llena y no podemos llevarnos su tesoro.", "Mas o porão está cheio; não podemos levar o tesouro.", "しかし船倉は満杯で、宝を積み込めない。", "Doch unser Laderaum ist voll; wir können den Schatz nicht mitnehmen.", "Mais notre cale est pleine ; impossible d'emporter son trésor.", "Ładownia jest pełna, nie możemy zabrać tego skarbu.", "但我們的貨艙已經裝滿，無法再裝下那裡的寶藏。", "하지만 화물칸이 가득 차 보물을 실을 수 없습니다."]],
    ["Call it tropical tailoring and keep your watch.", ["就当是热带款式吧，继续保持警惕。", "Назовём это тропической модой, а вы не теряйте бдительности.", "Llámalo moda tropical y no bajes la guardia.", "Chame isso de moda tropical e fique atento.", "熱帯仕立てとでも呼んでおけ。見張りは怠るなよ。", "Nennen wir es tropische Mode. Bleib trotzdem wachsam.", "Appelons cela la mode tropicale, mais restez sur vos gardes.", "Nazwijmy to tropikalną modą, ale zachowaj czujność.", "就當是熱帶款式吧，繼續保持警惕。", "열대식 옷차림이라고 해두고, 계속 경계를 늦추지 마세요."]],
    ["By {0}'s authority, your commission now covers every enemy of {1}: {2}. Keep it with your papers.", ["奉{0}之命，你的私掠许可现可针对{1}的所有敌人：{2}。把它和船舶文书放在一起保管。", "По полномочию {0} ваша каперская грамота теперь действует против всех врагов {1}: {2}. Храните её вместе с судовыми документами.", "Por autoridad de {0}, tu patente de corso ahora cubre a todos los enemigos de {1}: {2}. Guárdala con los documentos del barco.", "Por autoridade de {0}, sua carta de corso agora vale contra todos os inimigos de {1}: {2}. Guarde-a com os documentos do navio.", "{0}の権限により、私掠免許は{1}のすべての敵を対象とする：{2}。船の書類と一緒に保管せよ。", "Mit Vollmacht von {0} gilt Euer Kaperbrief nun gegen alle Feinde von {1}: {2}. Verwahrt ihn bei den Schiffspapieren.", "Par autorité de {0}, votre lettre de marque vise désormais tous les ennemis de {1} : {2}. Gardez-la avec les papiers du navire.", "Z upoważnienia {0} twój list kaperski obejmuje teraz wszystkich wrogów {1}: {2}. Przechowuj go z dokumentami okrętowymi.", "奉{0}之命，你的私掠許可現可針對{1}的所有敵人：{2}。把它和船舶文書放在一起保管。", "{0}의 권한으로 사략 허가장이 이제 {1}의 모든 적을 대상으로 합니다: {2}. 선박 문서와 함께 보관하세요."]],
    ["By {0}'s warrant: capture {1} from {2}. Silence its batteries, land your company, and raise {3} colors. Keep the spoils; return for {4} doubloons. {5}", ["奉{0}之命：从{2}手中夺取{1}。压制岸炮，率部队登陆，升起{3}的旗帜。战利品归你；完成后领取{4}达布隆。{5}", "По приказу {0}: захватите {1} у {2}. Подавите береговые батареи, высадите отряд и поднимите флаг {3}. Добыча ваша; после возвращения получите {4} дублонов. {5}", "Por orden de {0}: toma {1} a {2}. Silencia sus baterías costeras, desembarca a tus tropas e iza la bandera de {3}. Quédate con el botín; al regresar recibirás {4} doblones. {5}", "Por ordem de {0}: tome {1} de {2}. Neutralize as baterias costeiras, desembarque suas tropas e ice a bandeira de {3}. Fique com o saque; ao voltar, receba {4} dobrões. {5}", "{0}の命により、{2}から{1}を奪取せよ。沿岸砲台を制圧し、部隊を上陸させ、{3}の旗を掲げよ。戦利品はお前のものだ。帰還すれば{4}ダブロンを受け取れる。{5}", "Im Auftrag von {0}: Erobert {1} von {2}. Schaltet die Küstenbatterien aus, setzt Eure Truppen an Land und hisst die Flagge von {3}. Die Beute gehört Euch; bei der Rückkehr erhaltet Ihr {4} Dublonen. {5}", "Sur ordre de {0} : prenez {1} à {2}. Réduisez ses batteries côtières au silence, débarquez vos troupes et hissez le pavillon de {3}. Gardez le butin ; vous recevrez {4} doublons à votre retour. {5}", "Na rozkaz {0}: zdobądź {1} należące do {2}. Ucisz baterie nadbrzeżne, wysadź oddział na ląd i podnieś banderę {3}. Łupy są twoje; po powrocie otrzymasz {4} dublonów. {5}", "奉{0}之命：從{2}手中奪取{1}。壓制岸砲，率部隊登陸，升起{3}的旗幟。戰利品歸你；完成後領取{4}達布隆。{5}", "{0}의 명령이다. {2}에게서 {1}을(를) 점령하라. 해안 포대를 제압하고 병력을 상륙시킨 뒤 {3}의 깃발을 올려라. 전리품은 가져도 좋다. 돌아오면 {4} 더블룬을 받는다. {5}"]],
    ["By order of {0} of {1}, your ship is barred from {2}. Turn about. No supplies will be sold to you.", ["{1}的{0}下令禁止你的船进入{2}。调头离开。不会向你出售任何补给。", "По приказу {0} из {1} вашему кораблю запрещён вход в {2}. Разворачивайтесь. Припасы вам продавать не будут.", "Por orden de {0} de {1}, se prohíbe la entrada de tu barco en {2}. Da media vuelta. No te venderán provisiones.", "Por ordem de {0} de {1}, seu navio está proibido de entrar em {2}. Dê meia-volta. Não lhe venderão suprimentos.", "{1}の{0}の命により、貴船は{2}への入港を禁じられた。引き返せ。補給品は一切売らない。", "Auf Anordnung von {0} aus {1} darf Euer Schiff {2} nicht anlaufen. Kehrt um. Man wird Euch keine Vorräte verkaufen.", "Sur ordre de {0} de {1}, votre navire n'est pas admis à {2}. Faites demi-tour. Aucun ravitaillement ne vous sera vendu.", "Na rozkaz {0} z {1} twój statek nie może zawijać do {2}. Zawróć. Nie sprzedamy ci żadnych zapasów.", "{1}的{0}下令禁止你的船進入{2}。調頭離開。不會向你出售任何補給。", "{1}의 {0} 명령에 따라 귀선은 {2}에 입항할 수 없습니다. 뱃머리를 돌리세요. 보급품은 판매하지 않습니다."]],
    ["By order of {0}, heave to. You carry {1} from {2}, contrary to the prohibition. Pay the fine, surrender the cargo, or answer to our guns.", ["奉{0}之命，立即停船！你违反禁令，从{2}运来{1}。缴纳罚金、交出货物，否则就由我们的炮火来答复。", "По приказу {0}, лечь в дрейф! Вы везёте {1} из {2} вопреки запрету. Заплатите штраф, сдайте груз или примите бой.", "Por orden de {0}, ¡detén el barco! Llevas {1} desde {2} contra la prohibición. Paga la multa, entrega la carga o enfréntate a nuestros cañones.", "Por ordem de {0}, pare o navio! Você transporta {1} de {2}, contra a proibição. Pague a multa, entregue a carga ou enfrente nossos canhões.", "{0}の命令だ、停船せよ！禁令に背いて{2}から{1}を運んでいるな。罰金を払うか、積荷を引き渡すか、砲撃を受けるか選べ。", "Auf Befehl von {0}: Beidrehen! Ihr führt verbotenerweise {1} aus {2} mit. Zahlt die Strafe, gebt die Ladung heraus oder stellt Euch unseren Kanonen.", "Sur ordre de {0}, mettez en panne ! Vous transportez {1} depuis {2}, en violation de l'interdiction. Payez l'amende, remettez la cargaison ou affrontez nos canons.", "Na rozkaz {0} zatrzymaj statek! Wbrew zakazowi wieziesz {1} z {2}. Zapłać grzywnę, oddaj ładunek albo zmierz się z naszymi działami.", "奉{0}之命，立即停船！你違反禁令，從{2}運來{1}。繳納罰金、交出貨物，否則就由我們的砲火來答覆。", "{0}의 명령이다. 즉시 정선하라! 금지령을 어기고 {2}에서 {1}을(를) 싣고 왔군. 벌금을 내거나 화물을 넘기거나 우리 포격을 감당하라."]],
    ["By order of the Estado da India, heave to. Your vessel carries no valid Portuguese cartaz.", ["奉葡属印度政府之命，停船！你的船没有有效的葡萄牙卡塔兹通行证。", "По приказу Estado da Índia, лечь в дрейф! На вашем судне нет действующего португальского картаса — разрешения на торговлю.", "Por orden del Estado da Índia, ¡detén el barco! No llevas un cartaz portugués válido, el salvoconducto comercial exigido.", "Por ordem do Estado da Índia, pare o navio! Sua embarcação não tem um cartaz português válido, a licença de comércio exigida.", "エスタード・ダ・インディアの命令だ、停船せよ！有効なポルトガルの通商許可証（カルタス）を携帯していない。", "Auf Befehl des Estado da Índia: Beidrehen! Euer Schiff führt keinen gültigen portugiesischen Cartaz, also keinen Handelspass.", "Sur ordre de l'Estado da Índia, mettez en panne ! Votre navire n'a pas de cartaz portugais valide, le permis de commerce requis.", "Na rozkaz Estado da Índia zatrzymaj statek! Nie masz ważnego portugalskiego cartazu, czyli zezwolenia na handel.", "奉葡屬印度政府之命，停船！你的船沒有有效的葡萄牙卡塔茲通行證。", "에스타두 다 인디아의 명령이다. 정선하라! 귀선에는 유효한 포르투갈 통행 허가증인 카르타즈가 없다."]],
    ["By order of the Estado da India, heave to. Your vessel carries no valid Portuguese cartaz. At sea, it is too late to buy a license. Pay the Crown's fine, surrender controlled spice cargo, or fight.", ["奉葡属印度政府之命，停船！你的船没有有效的葡萄牙卡塔兹通行证。在海上已经来不及购买许可。缴纳王室罚款、交出受管制的香料货物，或开战。", "По приказу Estado da Índia, лечь в дрейф! На вашем судне нет действующего португальского картаса — разрешения на торговлю. В море лицензию уже не купить. Заплатите штраф короне, сдайте поднадзорные пряности или сражайтесь.", "Por orden del Estado da Índia, ¡detén el barco! No llevas el cartaz portugués exigido. En alta mar ya es tarde para obtener una licencia: paga la multa de la Corona, entrega las especias sujetas a control o lucha.", "Por ordem do Estado da Índia, pare o navio! Sua embarcação não tem o cartaz português exigido. Em alto-mar, já é tarde para obter uma licença: pague a multa da Coroa, entregue as especiarias sujeitas a controle ou lute.", "エスタード・ダ・インディアの命令だ、停船せよ！有効なポルトガルの通商許可証（カルタス）がない。洋上ではもう許可証を買えない。王室の罰金を払うか、規制対象の香辛料を引き渡すか、戦うか選べ。", "Auf Befehl des Estado da Índia: Beidrehen! Euer Schiff führt keinen gültigen portugiesischen Cartaz, den vorgeschriebenen Handelspass. Auf See ist es zu spät, eine Lizenz zu kaufen. Zahlt die Strafe der Krone, gebt die kontrollierte Gewürzladung heraus oder kämpft.", "Sur ordre de l'Estado da Índia, mettez en panne ! Votre navire n'a pas le cartaz portugais requis. En mer, il est trop tard pour obtenir un permis : payez l'amende de la Couronne, remettez les épices réglementées ou combattez.", "Na rozkaz Estado da Índia zatrzymaj statek! Nie masz wymaganego portugalskiego cartazu, czyli zezwolenia na handel. Na morzu jest już za późno, by uzyskać licencję. Zapłać grzywnę Korony, oddaj przyprawy objęte kontrolą albo walcz.", "奉葡屬印度政府之命，停船！你的船沒有有效的葡萄牙卡塔茲通行證。在海上已來不及購買許可。繳納王室罰款、交出受管制的香料貨物，或開戰。", "에스타두 다 인디아의 명령이다. 정선하라! 귀선에는 유효한 포르투갈 통상 허가증인 카르타즈가 없다. 공해에서는 허가증을 살 수 없다. 왕실 벌금을 내거나 통제 대상 향신료를 넘기거나 싸워라."]],
    ["Buy cartaz {0} db", ["购买卡塔兹通行证 {0} 达布隆", "Купить картас — торговое разрешение за {0} дублонов", "Comprar cartaz (salvoconducto comercial) por {0} doblones", "Comprar cartaz (licença de comércio) por {0} dobrões", "カルタス（通商許可証）を{0}ダブロンで購入", "Cartaz (Handelspass) für {0} Dublonen kaufen", "Acheter un cartaz (permis de commerce) pour {0} doublons", "Kup cartaz (zezwolenie na handel) za {0} dublonów", "購買卡塔茲通行證 {0} 達布隆", "카르타즈(통상 허가증) {0} 더블룬에 구매"]],
    ["But our hold is full; we cannot carry its treasure.", ["但我们的货舱已经装满，无法再装下那里的宝藏。", "Но трюм уже полон, и мы не можем взять сокровища на борт.", "Pero la bodega está llena y no podemos llevarnos su tesoro.", "Mas o porão está cheio; não podemos levar o tesouro.", "しかし船倉は満杯で、宝を積み込めない。", "Doch unser Laderaum ist voll; wir können den Schatz nicht mitnehmen.", "Mais notre cale est pleine ; impossible d'emporter son trésor.", "Ładownia jest pełna, nie możemy zabrać tego skarbu.", "但我們的貨艙已經裝滿，無法再裝下那裡的寶藏。", "하지만 화물칸이 가득 차 보물을 실을 수 없습니다."]],
    ["Call it tropical tailoring and keep your watch.", ["就当是热带款式吧，继续保持警惕。", "Назовём это тропической модой, а вы не теряйте бдительности.", "Llámalo moda tropical y no bajes la guardia.", "Chame isso de moda tropical e fique atento.", "熱帯仕立てとでも呼んでおけ。見張りは怠るなよ。", "Nennen wir es tropische Mode. Bleib trotzdem wachsam.", "Appelons cela la mode tropicale, mais restez sur vos gardes.", "Nazwijmy to tropikalną modą, ale zachowaj czujność.", "就當是熱帶款式吧，繼續保持警惕。", "열대식 옷차림이라고 해두고, 계속 경계를 늦추지 마세요."]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedCatalogRange1150Overrides() {
  const entries = [
    ["Chimborazo lifts an ice-covered dome almost directly above the equatorial country. Its broad white mass seems to push higher because tropical fields lie within sight below.", ["钦博拉索山几乎就在赤道地带上空拔地而起，峰顶覆着冰雪。山下可见热带田野，更衬得它宽阔的白色山体高耸入云。", "Чимборасо возносит покрытый льдом купол почти прямо над экваториальными землями. Его широкая белая вершина кажется ещё выше на фоне тропических полей внизу.", "El Chimborazo se alza casi directamente sobre la región ecuatorial, coronado por una cúpula de hielo. Su ancha masa blanca parece aún más elevada porque abajo se ven los campos tropicales.", "O Chimborazo ergue uma cúpula coberta de gelo quase sobre a região equatorial. Sua ampla massa branca parece ainda mais alta diante dos campos tropicais visíveis lá embaixo.", "チンボラソ山は赤道地帯のほぼ真上にそびえ、頂は氷に覆われています。眼下に熱帯の畑が見えるため、広い白い山体はひときわ高く感じられます。", "Der Chimborazo erhebt sich fast unmittelbar über dem Äquatorland und trägt eine eisbedeckte Kuppel. Vor den sichtbaren Tropenfeldern wirkt seine breite weiße Masse noch höher.", "Le Chimborazo dresse son dôme glacé presque à la verticale des terres équatoriales. Sa large masse blanche paraît encore plus haute, car des champs tropicaux s'étendent à ses pieds.", "Chimborazo wznosi lodową kopułę niemal wprost nad równikową krainą. Jego rozległa, biała bryła wydaje się jeszcze wyższa na tle widocznych w dole pól tropikalnych.", "欽博拉索山幾乎就在赤道地帶上空拔地而起，峰頂覆著冰雪。山下可見熱帶田野，更襯得它寬闊的白色山體高聳入雲。", "침보라소산은 적도 지대 바로 위로 솟아 있으며 얼음 덮인 돔형 봉우리를 이룹니다. 아래로 열대 들판이 보여 넓고 흰 산체가 한층 더 높아 보입니다."]],
    ["Chip-chip-chip!", ["啾啾啾！", "Чик-чирик-чирик!", "¡Pío-pío-pío!", "Piu-piu-piu!", "チュンチュンチュン！", "Piep-piep-piep!", "Piou-piou-piou !", "Ćwir-ćwir-ćwir!", "啾啾啾！", "짹짹짹!"]],
    ["Chitter-chitter!", ["吱吱！", "Чирик-чирик!", "¡Chirr-chirr!", "Chilreio-chilreio!", "チュルチュル！", "Tschirri-tschirri!", "Tchip-tchip !", "Ćwir, ćwir!", "吱吱！", "짹짹!"]],
    ["Choose {0} crew members to leave behind before transferring to the smaller captured ship. No dismissal is permanent until you confirm.", ["转乘较小的俘获船之前，请选择要留下的{0}名船员。确认前不会解雇任何人。", "Перед пересадкой на меньший захваченный корабль выберите {0} членов команды, которых оставите на берегу. До подтверждения никого не уволят.", "Antes de pasar al barco capturado más pequeño, elige a los {0} tripulantes que dejarás en tierra. Nadie será despedido hasta que confirmes.", "Antes de passar para o navio capturado menor, escolha os {0} tripulantes que deixarão em terra. Ninguém será dispensado antes da confirmação.", "より小さな拿捕船に移る前に、残す乗組員を{0}人選んでください。確認するまで誰も解雇されません。", "Wählt {0} Besatzungsmitglieder aus, die Ihr zurücklasst, bevor Ihr auf das kleinere gekaperte Schiff wechselt. Erst nach Eurer Bestätigung wird jemand entlassen.", "Avant de passer sur le plus petit navire capturé, choisissez les {0} membres d'équipage qui resteront à terre. Personne ne sera renvoyé avant votre confirmation.", "Zanim przejdziesz na mniejszy zdobyty statek, wybierz {0} członków załogi, którzy zostaną na lądzie. Nikt nie zostanie zwolniony przed potwierdzeniem.", "轉乘較小的俘獲船之前，請選擇要留下的{0}名船員。確認前不會解僱任何人。", "더 작은 나포선으로 옮기기 전에 남겨둘 선원 {0}명을 선택하세요. 확인하기 전까지는 아무도 해고되지 않습니다."]],
    ["Choose the crew, cannon, food, and water levels your ship should restore automatically at each port.", ["选择每次靠港时船员、火炮、食物和饮水要自动恢复到的数量。", "Выберите целевые запасы команды, орудий, провианта и воды, которые корабль будет автоматически пополнять при каждом заходе в порт.", "Elige las cantidades de tripulación, cañones, víveres y agua que se repondrán automáticamente en cada puerto.", "Escolha as quantidades de tripulantes, canhões, mantimentos e água que serão repostas automaticamente a cada escala.", "各港に寄港するたび自動で補充する乗組員・大砲・食料・水の目標数を選んでください。", "Legt fest, welche Sollmengen an Besatzung, Kanonen, Proviant und Wasser Euer Schiff bei jedem Hafenaufenthalt automatisch auffüllen soll.", "Choisissez les quantités d'équipage, de canons, de vivres et d'eau que votre navire devra rétablir automatiquement à chaque escale.", "Wybierz docelowe ilości załogi, dział, żywności i wody, które statek ma automatycznie uzupełniać w każdym porcie.", "選擇每次靠港時船員、火炮、食物和飲水要自動恢復到的數量。", "항구에 들를 때마다 자동으로 보충할 선원, 대포, 식량, 물의 목표 수량을 선택하세요."]],
    ["Choose another wall. Write paid in full carefully; my family will frame the receipt where your claim once hung.", ["换一面墙吧。“已全数偿清”几个字要写仔细；我家会把收据裱起来，挂在你那张债务催单曾经挂过的地方。", "Выберите другую стену. Аккуратно напишите «долг погашен полностью» — семья вставит квитанцию в рамку и повесит там, где прежде висело ваше требование.", "Elige otra pared. Escribe con cuidado «pagado por completo»; mi familia enmarcará el recibo y lo colgará donde antes estaba tu reclamación.", "Escolha outra parede. Escreva com cuidado “pago integral”; minha família vai emoldurar o recibo e pendurá-lo onde antes estava sua cobrança.", "別の壁にしましょう。「全額返済」と丁寧に書いてください。家族がその領収書を額に入れ、あなたの請求書が掛かっていた場所に飾ります。", "Sucht Euch eine andere Wand. Schreibt sorgfältig „vollständig bezahlt“ darauf; meine Familie rahmt die Quittung ein und hängt sie dorthin, wo einst Eure Forderung hing.", "Choisissez un autre mur. Écrivez soigneusement « payé intégralement » ; ma famille encadrera le reçu et l'accrochera là où se trouvait votre créance.", "Wybierz inną ścianę. Starannie napisz „spłacono w całości”; moja rodzina oprawi pokwitowanie i powiesi je tam, gdzie wisiało twoje żądanie zapłaty.", "換一面牆吧。「已全數償清」幾個字要寫仔細；我家會把收據裱起來，掛在你那張債務催單曾經掛過的地方。", "다른 벽을 고르세요. '완납'이라고 또박또박 쓰면 우리 가족이 영수증을 액자에 넣어 당신의 청구서가 걸려 있던 자리에 걸어 두겠습니다."]],
    ["Christ be with you, captain. The times are sharp enough; let us keep doctrine from the scales.", ["愿基督与你同在，船长。世道已经够艰难了，别再拿教义互相称量。", "Христос с вами, капитан. Времена и без того суровы; не станем взвешивать наши вероучения.", "Que Cristo te acompañe, capitán. Bastante difíciles son estos tiempos; no pesemos nuestras doctrinas en la balanza.", "Que Cristo esteja com você, capitão. Estes tempos já são difíceis; não vamos pesar nossas doutrinas na balança.", "主が共におられますように、船長。今の世は十分に厳しい。教義まで秤にかけるのはやめましょう。", "Christus sei mit Euch, Kapitän. Die Zeiten sind schwierig genug; wägen wir unsere Glaubenslehren nicht gegeneinander ab.", "Que le Christ soit avec vous, capitaine. Les temps sont déjà assez durs ; ne mettons pas nos doctrines dans la balance.", "Niech Chrystus będzie z tobą, kapitanie. Czasy są dość trudne; nie ważmy naszych doktryn na szali.", "願基督與你同在，船長。世道已經夠艱難了，別再拿教義互相衡量。", "그리스도께서 함께하시길 바랍니다, 선장님. 세상살이도 충분히 힘드니 교리까지 저울질하지 맙시다."]],
    ["Christmas at sea: no church but the sky, no choir but the rigging. I will keep the Nativity as best I can.", ["海上过圣诞：天空就是教堂，桅索就是唱诗班。我会尽力守过这个圣诞节。", "Рождество в море: вместо церкви — небо, вместо хора — снасти. Я постараюсь отпраздновать его как смогу.", "Navidad en el mar: el cielo hace de iglesia y la jarcia, de coro. Celebraré el nacimiento de Cristo lo mejor que pueda.", "Natal no mar: o céu faz as vezes da igreja, e o cordame, do coro. Vou celebrar o nascimento de Cristo como puder.", "海上のクリスマス。教会の代わりは空、聖歌隊の代わりは索具。できる限り降誕祭を祝おう。", "Weihnachten auf See: Der Himmel ist meine Kirche, das Rigg mein Chor. Ich werde Christi Geburt so gut feiern, wie ich kann.", "Noël en mer : le ciel tient lieu d'église et le gréement de chœur. Je célébrerai la Nativité du mieux que je peux.", "Boże Narodzenie na morzu: niebo jest kościołem, a takielunek chórem. Będę świętować Narodzenie Pańskie najlepiej, jak potrafię.", "海上過聖誕：天空就是教堂，桅索就是唱詩班。我會盡力守過這個聖誕節。", "바다에서 맞는 성탄절. 하늘이 교회이고 돛대의 삭구가 성가대입니다. 할 수 있는 만큼 성탄을 기리겠습니다."]],
    ["Chrrrp.", ["啾。", "Чирк.", "Chirr.", "Chirr.", "キュルッ。", "Krr.", "Tchrr.", "Ćwir.", "啾。", "짹."]],
    ["Chuff!", ["噗！", "Фрр!", "¡Buf!", "Puf!", "フンッ！", "Pff!", "Pff !", "Prysk!", "噗！", "훅!"]],
    ["Claim {0} db", ["领取{0}达布隆", "Получить {0} дублонов", "Cobrar {0} doblones", "Receber {0} dobrões", "{0}ダブロンを受け取る", "{0} Dublonen einfordern", "Recevoir {0} doublons", "Odbierz {0} dublonów", "領取{0}達布隆", "{0}더블룬 받기"]],
    ["Claim defense reward - {0} db", ["领取防守奖励：{0}达布隆", "Получить награду за оборону — {0} дублонов", "Cobrar la recompensa por defenderse: {0} doblones", "Receber recompensa pela defesa: {0} dobrões", "防衛報酬を受け取る — {0}ダブロン", "Verteidigungsprämie einfordern – {0} Dublonen", "Recevoir la récompense de défense : {0} doublons", "Odbierz nagrodę za obronę — {0} dublonów", "領取防守獎勵：{0}達布隆", "방어 보상 받기 — {0}더블룬"]],
    ["Cleves-Mark", ["克莱沃-马克", "Клеве-Марк", "Cléveris-Mark", "Cleves-Mark", "クレーフェ＝マルク", "Kleve-Mark", "Clèves-Mark", "Kleve-Mark", "克萊沃-馬克", "클레베-마르크"]],
    ["clinker rivets and roves", ["搭接船板用铆钉和垫圈", "Заклёпки и шайбы для обшивки внакрой", "Remaches y arandelas para el casco a tingladillo", "Rebites e arruelas para o casco de tábuas sobrepostas", "クリンカー張りのリベットと座金", "Klinknägel und Scheiben für die Klinkerbeplankung", "Rivets et rondelles pour bordage à clin", "Nity i podkładki do poszycia zakładkowego", "搭接船板用鉚釘和墊圈", "클링커 방식 선체용 리벳과 와셔"]],
    ["Close recalled commission {0} db", ["结清已撤回的委任：{0}达布隆", "Закрыть отозванное поручение — {0} дублонов", "Cerrar el encargo revocado: {0} doblones", "Encerrar a comissão revogada: {0} dobrões", "撤回された任務を清算 — {0}ダブロン", "Zurückgezogenen Auftrag abrechnen: {0} Dublonen", "Clore la commission rappelée : {0} doublons", "Rozlicz wycofany list kaperski: {0} dublonów", "結清已撤回的委任：{0}達布隆", "철회된 위임장 정산 — {0}더블룬"]],
    ["Cloves", ["丁香", "Гвоздика", "Clavo de olor", "Cravo-da-índia", "クローブ", "Gewürznelken", "Clous de girofle", "Goździki", "丁香", "정향"]],
    ["Coastal canoe crews recognized your sail offshore. Market runners are already spreading word of your return.", ["沿海独木舟的船员在海上认出了你的船帆。集市信使已经把你归来的消息传开了。", "Экипажи прибрежных каноэ узнали ваш парус в море. Гонцы с рынка уже разносят весть о вашем возвращении.", "Las tripulaciones de las canoas costeras reconocieron tu vela mar adentro. Los mensajeros del mercado ya difunden la noticia de tu regreso.", "As tripulações das canoas costeiras reconheceram sua vela ao largo. Os mensageiros do mercado já espalham a notícia do seu retorno.", "沿岸のカヌー乗りたちは沖合であなたの帆を見つけました。市の使いが、あなたの帰還をすでに知らせています。", "Die Besatzungen der Küstenkanus erkannten Euer Segel draußen auf See. Die Marktboten verbreiten bereits die Nachricht von Eurer Rückkehr.", "Les équipages des canots côtiers ont reconnu votre voile au large. Les messagers du marché annoncent déjà votre retour.", "Załogi przybrzeżnych czółen rozpoznały twój żagiel na morzu. Gońcy z targu już roznoszą wieść o twoim powrocie.", "沿海獨木舟的船員在海上認出了你的船帆。集市信使已經把你歸來的消息傳開了。", "해안 카누 선원들이 먼바다에서 당신의 돛을 알아보았습니다. 장터의 전령들은 이미 귀환 소식을 퍼뜨리고 있습니다."]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedCatalogRange1100Overrides() {
  const entries = [
    ["Carlisle Bay is the best roadstead on the island. We will establish the town that sailors are already calling the Bridge.", ["卡莱尔湾是岛上最好的锚地。我们要在此建立一座城镇，水手们已经称它为“桥”。", "Залив Карлайл — лучший рейд на острове. Мы основаем город, который моряки уже прозвали Мостом.", "La bahía de Carlisle es el mejor fondeadero de la isla. Fundaremos el pueblo que los marineros ya llaman el Puente.", "A baía de Carlisle é o melhor ancoradouro da ilha. Vamos fundar a cidade que os marinheiros já chamam de Ponte.", "カーライル湾は島で最良の停泊地です。船乗りたちがすでに「橋」と呼ぶ町を築きます。", "Die Carlisle Bay ist der beste Ankerplatz der Insel. Wir gründen die Stadt, die Seeleute bereits die Brücke nennen.", "La baie de Carlisle est le meilleur mouillage de l'île. Nous fonderons la ville que les marins surnomment déjà le Pont.", "Zatoka Carlisle to najlepsze kotwicowisko na wyspie. Założymy miasto, które marynarze już nazywają Mostem.", "卡萊爾灣是島上最好的錨地。我們要在此建立一座城鎮，水手們已經稱它為「橋」。", "칼라일만은 섬에서 가장 좋은 정박지입니다. 선원들이 이미 '다리'라고 부르는 마을을 세우겠습니다."]],
    ["Carlisle's agents want a harbor at Carlisle Bay. Barbados grows cotton and tobacco, and its planters already search for a richer staple.", ["卡莱尔的代理人想在卡莱尔湾建港。巴巴多斯种植棉花和烟草，种植园主已在寻找利润更高的经济作物。", "Представители Карлайла хотят устроить гавань в заливе Карлайл. На Барбадосе выращивают хлопок и табак, а плантаторы уже ищут более доходную культуру.", "Los agentes de Carlisle quieren un puerto en la bahía de Carlisle. Barbados cultiva algodón y tabaco, y sus plantadores ya buscan un cultivo más rentable.", "Os agentes de Carlisle querem um porto na baía de Carlisle. Barbados cultiva algodão e tabaco, e seus plantadores já procuram uma cultura mais lucrativa.", "カーライルの代理人はカーライル湾に港を望んでいます。バルバドスでは綿花とタバコが栽培され、農園主たちはさらに収益性の高い作物を探しています。", "Carlisles Vertreter wollen einen Hafen in der Carlisle Bay. Auf Barbados wachsen Baumwolle und Tabak, und die Plantagenbesitzer suchen bereits nach einer einträglicheren Nutzpflanze.", "Les agents de Carlisle veulent un port dans la baie de Carlisle. La Barbade cultive coton et tabac, et les planteurs cherchent déjà une culture plus rentable.", "Agenci Carlisle'a chcą portu w zatoce Carlisle. Na Barbadosie uprawia się bawełnę i tytoń, a plantatorzy szukają już bardziej dochodowej uprawy.", "卡萊爾的代理人想在卡萊爾灣建港。巴貝多種植棉花和煙草，種植園主已在尋找利潤更高的經濟作物。", "칼라일 측 대리인들은 칼라일만에 항구를 원합니다. 바베이도스에서는 목화와 담배를 재배하며, 농장주들은 이미 더 수익성 높은 작물을 찾고 있습니다."]],
    ["Carrack", ["卡拉克帆船", "Каракка", "Carraca", "Carraca", "キャラック船", "Karacke", "Caraque", "Karaka", "卡拉克帆船", "카라카선"]],
    ["Carry a Papal nuncio between their courts and return with both answers.", ["护送教皇使节往返两座宫廷，并带回双方的答复。", "Сопроводите папского нунция ко дворам обоих правителей и вернитесь с ответами обеих сторон.", "Acompaña al nuncio papal entre ambas cortes y regresa con las dos respuestas.", "Acompanhe o núncio papal entre as duas cortes e volte com ambas as respostas.", "教皇使節を両者の宮廷の間で護送し、双方の返答を持ち帰ってください。", "Begleitet den päpstlichen Nuntius zwischen den beiden Höfen und bringt beide Antworten zurück.", "Accompagnez le nonce du pape d'une cour à l'autre et rapportez les deux réponses.", "Przewieź nuncjusza papieskiego między dworami obu stron i wróć z odpowiedziami od obu.", "護送教宗使節往返兩座宮廷，並帶回雙方的答覆。", "교황 사절을 두 궁정 사이로 호송하고 양측의 답변을 받아 돌아오십시오."]],
    ["Carry delegation", ["护送使团", "Сопроводить делегацию", "Acompañar a la delegación", "Acompanhar a delegação", "使節団を護送", "Die Delegation begleiten", "Accompagner la délégation", "Eskortuj delegację", "護送使團", "사절단 호송"]],
    ["Carry envoy", ["护送使者", "Сопроводить посланника", "Acompañar al enviado", "Acompanhar o enviado", "使節を護送", "Den Gesandten begleiten", "Accompagner l'émissaire", "Eskortuj wysłannika", "護送使者", "사절 호송"]],
    ["Cartaz issued for {0} days.", ["卡塔兹通行证有效期为{0}天。", "Картас действует {0} дней.", "Cartaz válido por {0} días.", "Cartaz válido por {0} dias.", "カルタスの有効期間は{0}日です。", "Cartaz ausgestellt, gültig für {0} Tage.", "Cartaz valable {0} jours.", "Cartaz ważny przez {0} dni.", "卡塔茲通行證有效期為{0}天。", "카르타즈는 {0}일 동안 유효합니다."]],
    ["CASH {0} DB", ["现金 {0} 达布隆", "НАЛИЧНЫЕ: {0} ДУБЛОНОВ", "EFECTIVO: {0} DB", "DINHEIRO: {0} DB", "現金 {0} ダブロン", "BARGELD: {0} DB", "ESPÈCES : {0} DB", "GOTÓWKA: {0} DB", "現金 {0} 達布隆", "현금 {0}더블룬"]],
    ["Castilian sails brought Sultan al-Mansur promises. Your family accepted their drafts as though promises were silver.", ["卡斯蒂利亚的船帆带来了曼苏尔苏丹的许诺。你的家人收下了他们的汇票，仿佛许诺本身就是白银。", "Кастильские паруса принесли обещания султана аль-Мансура. Ваша семья приняла их векселя, словно обещания были серебром.", "Las velas castellanas trajeron promesas del sultán al-Mansur. Tu familia aceptó sus letras de cambio como si las promesas fueran de plata.", "As velas castelhanas trouxeram promessas do sultão al-Mansur. Sua família aceitou as letras de câmbio como se promessas fossem prata.", "カスティーリャの帆がスルタン・アル＝マンスールの約束を運んできた。あなたの家族は、その約束が銀貨であるかのように為替手形を受け取った。", "Kastilische Segel brachten Versprechen von Sultan al-Mansur. Eure Familie nahm ihre Wechsel an, als wären Versprechen Silber.", "Les voiles castillanes apportèrent les promesses du sultan al-Mansur. Votre famille accepta leurs traites comme si les promesses étaient d'argent.", "Kastylijskie żagle przywiozły obietnice sułtana al-Mansura. Twoja rodzina przyjęła weksle, jakby same obietnice były srebrem.", "卡斯提亞的船帆帶來曼蘇爾蘇丹的承諾。你的家人收下了他們的匯票，彷彿承諾本身就是白銀。", "카스티야의 돛은 알만수르 술탄의 약속을 가져왔습니다. 가족은 마치 약속이 은화라도 되는 듯 그들의 환어음을 받아들였습니다."]],
    ["CASUALTY ROLL", ["伤亡名册", "СПИСОК ПОТЕРЬ", "LISTA DE BAJAS", "RELAÇÃO DE BAIXAS", "戦傷者名簿", "VERLUSTLISTE", "LISTE DES PERTES", "LISTA STRAT", "傷亡名冊", "사상자 명부"]],
    ["CAUGHT {0} {1} FOOD +{2}", ["捕获{0} {1} 食物 +{2}", "ПОЙМАН {0} {1} ПИЩА +{2}", "CAPTURADO {0} {1} COMIDA +{2}", "CAPTURADO {0} {1} COMIDA +{2}", "{0} {1} を捕獲 食料 +{2}", "GEFANGEN {0} {1} NAHRUNG +{2}", "PRIS {0} {1} NOURRITURE +{2}", "ZŁOWIONO {0} {1} ŻYWNOŚĆ +{2}", "捕獲{0} {1} 食物 +{2}", "{0} {1} 포획 식량 +{2}"]],
    ["CAUGHT {0} {1} HOLD FULL", ["捕获{0} {1} 货舱已满", "ПОЙМАН {0} {1} ТРЮМ ПОЛОН", "CAPTURADO {0} {1} BODEGA LLENA", "CAPTURADO {0} {1} PORÃO CHEIO", "{0} {1} を捕獲 船倉満杯", "GEFANGEN {0} {1} LADERAUM VOLL", "PRIS {0} {1} CALE PLEINE", "ZŁOWIONO {0} {1} ŁADOWNIA PEŁNA", "捕獲{0} {1} 貨艙已滿", "{0} {1} 포획 화물칸 가득 참"]],
    ["CAUGHT {0} x{1}{2}", ["捕获 {0} x{1}{2}", "ВЫЛОВЛЕНО {0} x{1}{2}", "PESCADO {0} x{1}{2}", "PESCADO {0} x{1}{2}", "{0}を捕獲 x{1}{2}", "GEFANGEN: {0} x{1}{2}", "PRISE : {0} x{1}{2}", "ZŁOWIONO {0} x{1}{2}", "捕獲 {0} x{1}{2}", "{0} 포획 x{1}{2}"]],
    ["Cedar canoes crowd the landing, and their crews are comparing your route with the winds and currents they know.", ["雪松木独木舟挤满了登陆处，船员们正把你的航线与他们熟悉的风向和洋流作比较。", "Кедровые каноэ заполнили пристань. Их команды сравнивают ваш маршрут с известными им ветрами и течениями.", "Las canoas de cedro se agolpan en el embarcadero. Sus tripulaciones comparan tu ruta con los vientos y las corrientes que conocen.", "As canoas de cedro lotam o desembarcadouro. Suas tripulações comparam sua rota com os ventos e as correntes que conhecem.", "杉のカヌーが浜の船着き場に集まり、乗り手たちはあなたの航路を、自分たちの知る風や潮流と照らし合わせています。", "Zedernholzkanus drängen sich an der Anlegestelle. Ihre Besatzungen vergleichen Eure Route mit den ihnen bekannten Winden und Strömungen.", "Les canots de cèdre se pressent au débarcadère. Leurs équipages comparent votre route aux vents et aux courants qu'ils connaissent.", "Czółna cedrowe tłoczą się przy przystani, a ich załogi porównują twoją trasę ze znanymi sobie wiatrami i prądami.", "雪松木獨木舟擠滿了登岸處，船員們正把你的航線與他們熟悉的風向和洋流作比較。", "삼나무 카누가 상륙장에 모여들고, 선원들은 자신들이 아는 바람과 해류에 비추어 당신의 항로를 살펴봅니다."]],
    ["Cedar-canoe crews recognized your sail beyond the headland. News of your return has already run along the shore.", ["雪松木独木舟的船员在岬角外认出了你的船帆。你归来的消息已沿着海岸传开。", "Экипажи кедровых каноэ узнали ваш парус за мысом. Весть о вашем возвращении уже разнеслась по берегу.", "Las tripulaciones de las canoas de cedro reconocieron tu vela más allá del cabo. La noticia de tu regreso ya recorrió la costa.", "As tripulações das canoas de cedro reconheceram sua vela além do cabo. A notícia do seu retorno já percorreu a costa.", "岬の向こうで杉のカヌーの乗り手たちがあなたの帆を見つけました。帰還の知らせはすでに海岸沿いに広まっています。", "Die Besatzungen der Zedernholzkanus erkannten Euer Segel hinter dem Kap. Die Nachricht Eurer Rückkehr hat sich bereits an der Küste verbreitet.", "Les équipages des canots de cèdre ont reconnu votre voile au-delà du cap. La nouvelle de votre retour a déjà parcouru la côte.", "Załogi czółen cedrowych rozpoznały twój żagiel za przylądkiem. Wieść o twoim powrocie rozeszła się już wzdłuż wybrzeża.", "雪松木獨木舟的船員在岬角外認出了你的船帆。你歸來的消息已沿著海岸傳開。", "삼나무 카누 선원들이 곶 너머에서 당신의 돛을 알아보았습니다. 귀환 소식은 이미 해안을 따라 퍼졌습니다."]],
    ["Champlain wants a permanent Habitation where the St. Lawrence narrows. The post will depend on the fur trade and on French alliances with the Innu, Algonquin, and Wendat.", ["尚普兰希望在圣劳伦斯河收窄处建立永久居住点。这个贸易站将依靠毛皮贸易，以及法国与因努、阿冈昆和温达特人的联盟。", "Шамплен хочет основать постоянное поселение в узком месте реки Святого Лаврентия. Торговый пост будет зависеть от пушной торговли и союзов Франции с инну, алгонкинами и вендатами.", "Champlain quiere fundar un asentamiento permanente donde se estrecha el San Lorenzo. El puesto dependerá del comercio de pieles y de las alianzas francesas con los innu, algonquinos y wendat.", "Champlain quer estabelecer um posto permanente onde o São Lourenço se estreita. O entreposto dependerá do comércio de peles e das alianças francesas com os Innu, Algonquin e Wendat.", "シャンプランはセントローレンス川が狭まる場所に恒久的な交易拠点を築こうとしています。この拠点は毛皮交易と、イヌ、アルゴンキン、ウェンダットとのフランスの同盟に支えられます。", "Champlain will eine dauerhafte Siedlung an der Engstelle des Sankt-Lorenz-Stroms errichten. Der Handelsposten wird vom Pelzhandel und den französischen Bündnissen mit Innu, Algonquin und Wendat abhängen.", "Champlain veut établir une Habitation permanente là où le Saint-Laurent se resserre. Le poste dépendra de la traite des fourrures et des alliances françaises avec les Innus, les Algonquins et les Wendat.", "Champlain chce założyć stałą osadę w miejscu, gdzie zwęża się Rzeka Świętego Wawrzyńca. Placówka będzie zależeć od handlu futrami i francuskich sojuszy z Innu, Algonquin i Wendat.", "尚普蘭希望在聖羅倫斯河收窄處建立永久聚落。這個商站將仰賴毛皮貿易，以及法國與因努、阿岡昆和溫達特人的同盟。", "샹플랭은 세인트로렌스강이 좁아지는 곳에 영구 교역 거점을 세우려 합니다. 이 거점은 모피 무역과 이누, 알곤킨, 웬다트와 프랑스의 동맹에 의존하게 됩니다."]],
    ["Champlain wants Laviolette to fortify the Saint-Maurice confluence. Algonquin and Innu traders already gather there for the fur trade.", ["尚普兰希望拉维奥莱特加固圣莫里斯河汇流处。阿冈昆和因努商人已经在那里进行毛皮贸易。", "Шамплен хочет, чтобы Лавьолет укрепил место слияния реки Сен-Морис. Там уже собираются торговцы алгонкины и инну для торговли пушниной.", "Champlain quiere que Laviolette fortifique la confluencia del río Saint-Maurice. Allí ya se reúnen comerciantes algonquinos e innu para comerciar pieles.", "Champlain quer que Laviolette fortifique a confluência do rio Saint-Maurice. Comerciantes Innu e Algonquin já se reúnem ali para negociar peles.", "シャンプランはラヴィオレットにサンモーリス川の合流点を要塞化させようとしています。アルゴンキンとイヌの商人はすでに毛皮交易のために集まっています。", "Champlain will, dass Laviolette den Zusammenfluss des Saint-Maurice befestigt. Innu- und Algonquin-Händler kommen dort bereits zum Pelzhandel zusammen.", "Champlain veut que Laviolette fortifie le confluent du Saint-Maurice. Des marchands innus et algonquins s'y rassemblent déjà pour la traite des fourrures.", "Champlain chce, by Laviolette ufortyfikował ujście rzeki Saint-Maurice. Handlarze Algonquin i Innu już się tam zbierają, by handlować futrami.", "尚普蘭希望拉維奧萊特加固聖莫里斯河匯流處。阿岡昆和因努商人已在那裡進行毛皮貿易。", "샹플랭은 라비올레트에게 생모리스강 합류 지점을 요새화하라고 합니다. 알곤킨과 이누 상인들은 이미 모피 무역을 위해 그곳에 모입니다."]],
    ["Charles demands Burgundy, Francis's claims in Italy, marriage to Eleanor, and the king's sons as hostages. Freedom has acquired a very long invoice.", ["查理要求勃艮第、弗朗索瓦在意大利的领地、与埃莉诺联姻，以及国王的儿子充当人质。自由的代价，是一张长得吓人的账单。", "Карл требует Бургундию, итальянские владения Франциска, брак с Элеонорой и сыновей короля в заложники. За свободу выставили длиннющий счёт.", "Carlos exige Borgoña, las posesiones de Francisco en Italia, casarse con Leonor y tomar como rehenes a los hijos del rey. La libertad viene con una factura larguísima.", "Carlos exige a Borgonha, os domínios de Francisco na Itália, casar-se com Leonor e receber os filhos do rei como reféns. A liberdade veio acompanhada de uma conta enorme.", "シャルルはブルゴーニュ、イタリアにおけるフランソワの領有権、エレオノールとの婚姻、そして王の息子たちを人質に要求した。自由を買う請求書は、ずいぶん長くなった。", "Karl fordert Burgund, Franz’ Ansprüche in Italien, die Heirat mit Eleonore und die Söhne des Königs als Geiseln. Die Freiheit kommt mit einer ellenlangen Rechnung.", "Charles réclame la Bourgogne, les prétentions de François en Italie, son mariage avec Éléonore et les fils du roi comme otages. La liberté s'accompagne d'une facture interminable.", "Karol żąda Burgundii, praw Franciszka do ziem we Włoszech, małżeństwa z Eleonorą oraz synów króla jako zakładników. Wolność ma swoją długą cenę.", "查理要求勃艮第、弗朗索瓦在意大利的領地、與埃莉諾聯姻，以及國王的兒子充當人質。自由的代價，是一張長得嚇人的帳單。", "샤를은 부르고뉴, 이탈리아에 대한 프랑수아의 영유권, 엘레오노르와의 혼인, 왕의 아들들을 인질로 요구합니다. 자유를 얻는 대가로 청구서가 한없이 길어졌군요."]],
    ["Charles Towne now anchors Carolina as a fortified port. Its prosperity is already tied to Barbados, spreading plantations, and slave labor.", ["查尔斯镇如今已成为卡罗来纳的要塞港。它的繁荣早已与巴巴多斯、不断扩张的种植园和奴隶劳动紧紧相连。", "Чарлстаун стал укреплённым портом Каролины. Его процветание уже связано с Барбадосом, расширением плантаций и рабским трудом.", "Charles Towne ya es un puerto fortificado de Carolina. Su prosperidad está ligada a Barbados, a la expansión de las plantaciones y al trabajo esclavo.", "Charles Towne agora é um porto fortificado da Carolina. Sua prosperidade já está ligada a Barbados, à expansão das plantações e ao trabalho escravizado.", "チャールズタウンは今やカロライナを支える要塞港です。その繁栄はすでにバルバドス、拡大するプランテーション、奴隷労働と結びついています。", "Charles Towne dient Carolina nun als befestigter Hafen. Sein Wohlstand hängt bereits mit Barbados, der Ausbreitung der Plantagen und Sklavenarbeit zusammen.", "Charles Towne est désormais un port fortifié de Caroline. Sa prospérité est déjà liée à la Barbade, à l'expansion des plantations et au travail des esclaves.", "Charles Towne jest teraz ufortyfikowanym portem Karoliny. Jego dobrobyt zależy już od Barbadosu, rozrastających się plantacji i pracy niewolników.", "查爾斯鎮如今已成為卡羅來納的要塞港。它的繁榮早已與巴貝多、不斷擴張的種植園和奴隸勞動緊緊相連。", "찰스타운은 이제 캐롤라이나의 요새 항구가 되었습니다. 번영은 이미 바베이도스, 확장되는 플랜테이션, 노예 노동과 얽혀 있습니다."]],
    ["Charred timbers and broken guns. The raiders have abandoned this anchorage.", ["焦黑的木梁，破损的火炮。劫掠者已经弃守这处锚地。", "Обугленные балки и разбитые пушки. Налётчики покинули эту якорную стоянку.", "Vigas carbonizadas y cañones destrozados. Los saqueadores han abandonado este fondeadero.", "Vigas queimadas e canhões destruídos. Os saqueadores abandonaram este ancoradouro.", "黒焦げの梁と壊れた大砲。襲撃者たちはこの停泊地を捨てていった。", "Verkohlte Balken und zerbrochene Kanonen. Die Plünderer haben diesen Ankerplatz verlassen.", "Poutres calcinées et canons brisés. Les pillards ont abandonné ce mouillage.", "Zwęglone belki i rozbite działa. Łupieżcy opuścili to kotwicowisko.", "焦黑的木梁，破損的火炮。劫掠者已經棄守這處錨地。", "그을린 들보와 부서진 대포. 약탈자들은 이 정박지를 버리고 떠났습니다."]],
    ["Change ship loadout", ["更换船只配置", "Изменить оснащение корабля", "Cambiar el equipamiento del barco", "Alterar o equipamento do navio", "船の装備を変更", "Schiffsausrüstung ändern", "Modifier l'équipement du navire", "Zmień wyposażenie statku", "更換船隻配置", "선박 장비 변경"]],
    ["Chart Maker", ["制图师", "Картограф", "Cartógrafo", "Cartógrafo", "地図製作者", "Kartograf", "Cartographe", "Kartograf", "製圖師", "지도 제작자"]],
    ["CASTAWAY", ["遇难漂流者", "ПОТЕРПЕВШИЙ КОРАБЛЕКРУШЕНИЕ", "NÁUFRAGO", "NÁUFRAGO", "漂流者", "SCHIFFBRÜCHIGER", "NAUFRAGÉ", "ROZBITEK", "遇難漂流者", "조난자"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedCatalogRange1050Overrides() {
  const entries = [
    ["Captain, do not attack {0} ships or ports while we travel under this protection. Our safe passage would be forfeit.", ["船长，在我们受此保护期间，不可攻击{0}的船只或港口，否则安全通行许可将被取消。", "Капитан, пока мы пользуемся этой защитой, не нападайте на корабли и порты {0}, иначе мы лишимся права на безопасный проход.", "Capitán, no ataques los barcos ni los puertos {0} mientras estemos bajo esta protección, o perderemos el salvoconducto.", "Capitão, não ataque navios nem portos {0} enquanto estivermos sob esta proteção, ou perderemos o salvo-conduto.", "船長、この庇護を受けている間は{0}の船や港を攻撃しないでください。安全な通行を認められなくなります。", "Kapitän, greift keine Schiffe oder Häfen {0} an, solange wir unter diesem Schutz stehen. Sonst verlieren wir das Geleit.", "Capitaine, n'attaquez aucun navire ni port {0} tant que nous bénéficions de cette protection, sous peine de perdre notre sauf-conduit.", "Kapitanie, nie atakuj statków ani portów {0}, póki korzystamy z tej ochrony, bo stracimy prawo do bezpiecznego przejścia.", "船長，在我們受到這項庇護期間，不可攻擊{0}的船隻或港口，否則將失去安全通行許可。", "선장님, 이 보호를 받는 동안에는 {0} 측의 선박이나 항구를 공격하지 마세요. 그러면 안전 통행 허가를 잃게 됩니다."]],
    ["Captain, I came into possession of {0}. {1} I could part with it for {2} doubloons.", ["船长，我得到了{0}。{1}我可以用{2}达布隆把它转让给你。", "Капитан, у меня появился {0}. {1} Я готов с ним расстаться за {2} дублонов.", "Capitán, conseguí {0}. {1} Podría vendértelo por {2} doblones.", "Capitão, consegui {0}. {1} Posso vendê-lo por {2} dobrões.", "船長、{0}を手に入れました。{1}{2}ダブロンでお譲りできます。", "Kapitän, ich bin an {0} gekommen. {1} Für {2} Dublonen würde ich es Euch überlassen.", "Capitaine, j'ai récupéré {0}. {1} Je pourrais vous le céder pour {2} doublons.", "Kapitanie, zdobyłem {0}. {1} Mogę ci go odstąpić za {2} dublonów.", "船長，我得到了{0}。{1}我可以用{2}達布隆把它轉讓給你。", "함장님, 제가 {0}을 손에 넣었습니다. {1} 더블룬 {2}개에 넘겨드릴 수 있습니다."]],
    ["Captain, Joseon's councillors will believe the person who carried these papers. Tell them the Sō register is sound, and Tsushima keeps its trade.", ["船长，朝鲜的重臣会相信送来这些文书的人。告诉他们宗氏名册属实，对马岛便能保住贸易。", "Капитан, советники Чосона поверят тому, кто доставил эти бумаги. Скажите им, что реестр рода Со подлинный, и Цусима сохранит торговлю.", "Capitán, los consejeros de Joseon creerán a quien llevó estos documentos. Dígales que el registro Sō es auténtico y Tsushima conservará su comercio.", "Capitão, os conselheiros de Joseon acreditarão em quem trouxe estes documentos. Diga-lhes que o registro Sō é autêntico, e Tsushima manterá seu comércio.", "船長、この書類を届けた者の言葉なら朝鮮の重臣たちも信じるでしょう。宗氏の帳簿は正当なものだと伝えてください。そうすれば対馬は交易を続けられます。", "Kapitän, Joseons Räte werden der Person glauben, die diese Papiere überbracht hat. Sagt ihnen, das Register der Sō sei echt, dann kann Tsushima seinen Handel fortsetzen.", "Capitaine, les conseillers de Joseon croiront la personne qui a apporté ces documents. Dites-leur que le registre des Sō est authentique et Tsushima pourra poursuivre son commerce.", "Kapitanie, doradcy Joseon uwierzą osobie, która dostarczyła te dokumenty. Powiedz im, że rejestr Sō jest autentyczny, a Tsushima zachowa swoje szlaki handlowe.", "船長，朝鮮的重臣會相信送來這些文書的人。告訴他們宗氏名冊屬實，對馬島便能保住貿易。", "대장님, 조선의 대신들은 이 문서를 가져온 사람의 말을 믿을 겁니다. 소씨 장부가 진본이라고 전해 주십시오. 그러면 쓰시마가 교역을 이어갈 수 있습니다."]],
    ["Captain, the rival courier reached my office first.", ["船长，对手派来的使者先到了我的衙门。", "Капитан, посланник соперника первым добрался до моей канцелярии.", "Capitán, el mensajero rival llegó primero a mi despacho.", "Capitão, o mensageiro rival chegou primeiro ao meu gabinete.", "船長、相手方の使者が先に役所へ着いた。", "Kapitän, der Bote unseres Rivalen erreichte zuerst mein Büro.", "Capitaine, le messager de notre rival est arrivé le premier à mon bureau.", "Kapitanie, posłaniec naszego rywala dotarł do mojego biura jako pierwszy.", "船長，對手派來的使者先到了我的衙門。", "대장님, 경쟁 세력이 보낸 사절이 먼저 제 관청에 도착했습니다."]],
    ["Captain, you restored our family. Please accept {0} doubloons and {1} with our everlasting gratitude.", ["船长，你让我们一家团聚了。请收下{0}达布隆和{1}，聊表我们永远的感激。", "Капитан, вы воссоединили нашу семью. Примите {0} дублонов и {1} в знак нашей вечной благодарности.", "Capitán, reuniste a nuestra familia. Acepta {0} doblones y {1} con nuestro eterno agradecimiento.", "Capitão, você reuniu nossa família. Aceite {0} dobrões e {1} como prova de nossa eterna gratidão.", "船長、家族を再び一つにしてくださいました。永遠の感謝を込めて、{0}ダブロンと{1}をお受け取りください。", "Kapitän, Ihr habt unsere Familie wieder vereint. Nehmt {0} Dublonen und {1} als Zeichen unseres ewigen Dankes an.", "Capitaine, vous avez réuni notre famille. Veuillez accepter {0} doublons et {1} en témoignage de notre éternelle gratitude.", "Kapitanie, znów połączyłeś naszą rodzinę. Przyjmij {0} dublonów i {1} na znak naszej wiecznej wdzięczności.", "船長，您讓我們一家團聚了。請收下{0}達布隆和{1}，聊表我們永遠的感激。", "함장님, 우리 가족을 다시 만나게 해 주셨습니다. 영원한 감사의 뜻으로 {0}더블룬과 {1}을 받아 주십시오."]],
    ["Captain, your courier reached my office first; the {0} db purse is yours.", ["船长，你派来的使者先到了我的衙门；这笔{0}达布隆的赏金归你了。", "Капитан, ваш посланник первым добрался до моей канцелярии; награда в {0} дублонов ваша.", "Capitán, tu mensajero llegó primero a mi despacho; te corresponden los {0} doblones del premio.", "Capitão, seu mensageiro chegou primeiro ao meu gabinete; o prêmio de {0} dobrões é seu.", "船長、そなたの使者が先に役所へ着いた。{0}ダブロンの褒賞はそなたのものだ。", "Kapitän, Euer Bote war zuerst in meinem Büro. Die Belohnung von {0} Dublonen gehört Euch.", "Capitaine, votre messager est arrivé le premier à mon bureau ; la récompense de {0} doublons vous revient.", "Kapitanie, twój posłaniec dotarł pierwszy do mojego biura; nagroda w wysokości {0} dublonów należy do ciebie.", "船長，你派來的使者先到了我的衙門；這筆{0}達布隆的賞金歸你了。", "대장님, 보내신 사절이 먼저 제 관청에 도착했습니다. {0}더블룬의 상금은 당신 몫입니다."]],
    ["Captain! My family marks the day you found me on that lonely shore every year. Come to supper.", ["船长！我的家人每年都会纪念你在那片孤寂海岸找到我的日子。今晚请来家里吃晚饭。", "Капитан! Каждый год моя семья отмечает день, когда вы нашли меня на том одиноком берегу. Приходите к нам на ужин.", "¡Capitán! Mi familia recuerda cada año el día en que me encontraste en aquella playa solitaria. Ven a cenar.", "Capitão! Minha família comemora todo ano o dia em que você me encontrou naquela praia deserta. Venha jantar conosco.", "船長！家族は毎年、あの寂しい浜辺であなたが私を見つけてくれた日を祝っています。夕食に来てください。", "Kapitän! Meine Familie erinnert sich jedes Jahr an den Tag, an dem Ihr mich an jenem einsamen Strand gefunden habt. Kommt zum Abendessen.", "Capitaine ! Ma famille célèbre chaque année le jour où vous m'avez trouvé sur cette plage isolée. Venez dîner chez nous.", "Kapitanie! Moja rodzina co roku świętuje dzień, w którym odnalazłeś mnie na tamtym pustym brzegu. Przyjdź do nas na kolację.", "船長！我的家人每年都會紀念你在那片孤寂海岸找到我的日子。今晚請來家裡吃晚飯。", "선장님! 우리 가족은 매년 그 외딴 해변에서 저를 찾아 주신 날을 기념합니다. 저녁 식사에 초대할게요."]],
    ["Captain! My family still drinks to the ship that carried me out of pirate hands. Tonight, the rescued traveler is buying supper.", ["船长！我的家人至今仍会举杯感谢那艘把我从海盗手中救出的船。今晚由获救的旅人请大家吃晚饭。", "Капитан! Моя семья до сих пор поднимает тост за корабль, который спас меня от пиратов. Сегодня спасённый путешественник угощает всех ужином.", "¡Capitán! Mi familia aún brinda por el barco que me rescató de los piratas. Esta noche, el viajero rescatado invita a cenar.", "Capitão! Minha família ainda brinda ao navio que me salvou dos piratas. Hoje à noite, o viajante resgatado paga o jantar.", "船長！家族は今も、私を海賊の手から救ってくれた船に乾杯します。今夜は、救われた旅人が夕食をごちそうします。", "Kapitän! Meine Familie bringt noch immer einen Toast auf das Schiff aus, das mich aus den Händen der Piraten gerettet hat. Heute Abend lädt der Gerettete zum Essen ein.", "Capitaine ! Ma famille porte toujours un toast au navire qui m'a arraché aux mains des pirates. Ce soir, c'est le voyageur secouru qui offre le souper.", "Kapitanie! Moja rodzina wciąż wznosi toast za statek, który wyrwał mnie z rąk piratów. Dziś kolację stawia uratowany podróżnik.", "船長！我的家人至今仍會舉杯感謝那艘把我從海盜手中救出的船。今晚由獲救的旅人請大家吃晚飯。", "선장님! 우리 가족은 저를 해적의 손에서 구해 준 배를 생각하며 지금도 축배를 듭니다. 오늘 저녁은 구조된 여행자가 대접합니다."]],
    ["Caravan brokers and coastal pilots bargain beneath the storehouses, linking distant inland markets to the sea.", ["商队经纪人与沿海领航员在仓库下方议价，把遥远的内陆市场与海路连在一起。", "Des courtiers en caravanes et des pilotes côtiers négocient sous les entrepôts, reliant les marchés lointains de l'intérieur à la mer.", "Los tratantes de caravanas y los pilotos costeros negocian junto a los almacenes, y enlazan los mercados del interior con el mar.", "Negociantes de caravanas e práticos costeiros negociam sob os armazéns, ligando os mercados distantes do interior ao mar.", "隊商の仲買人と沿岸の水先案内人が倉庫の軒下で商談し、遠い内陸の市場と海を結びます。", "Karawanenhändler und Küstenlotsen feilschen unter den Lagerhäusern und verbinden ferne Märkte im Landesinneren mit dem Meer.", "Des négociants caravaniers et des pilotes côtiers marchandent sous les entrepôts, reliant les marchés lointains de l'intérieur à la mer.", "Pośrednicy karawanowi i piloci przybrzeżni targują się pod magazynami, łącząc odległe rynki w głębi lądu z morzem.", "商隊經紀人與沿海領航員在倉庫下方議價，把遙遠的內陸市場與海路連在一起。", "대상 무역상과 해안 도선사가 창고 아래에서 흥정하며 먼 내륙 시장과 바다를 이어 줍니다."]],
    ["Captain's log: the crew is quiet because the crew is me. An efficient meeting.", ["船长日志：船员都很安静，因为船员只有我一个。会议开得真有效率。", "Журнал капитана: команда молчит, потому что вся команда — это я. Совещание прошло эффективно.", "Diario del capitán: la tripulación está callada porque soy toda la tripulación. Una reunión muy eficiente.", "Diário do capitão: a tripulação está quieta porque sou toda a tripulação. Uma reunião eficiente.", "船長日誌：乗組員が静かなのは、乗組員が私ひとりだから。なんとも効率的な会議だ。", "Logbuch des Kapitäns: Die Mannschaft ist still, denn ich bin die ganze Mannschaft. Eine effiziente Besprechung.", "Journal du capitaine : l'équipage est silencieux, puisque je suis tout l'équipage. Une réunion efficace.", "Dziennik kapitański: załoga milczy, bo cała załoga to ja. Cóż za sprawne zebranie.", "船長日誌：船員都很安靜，因為船員只有我一個。真是場有效率的會議。", "선장 일지: 선원들이 조용한 건 선원이 나 하나뿐이기 때문이다. 참 효율적인 회의였다."]],
    ["Caravans meet the boats at this quay, so news of a useful cargo travels inland quickly.", ["商队在这座码头与船只接货，有用货物的消息很快便传入内陆。", "Караваны встречают лодки у этого причала, поэтому вести о ценном грузе быстро доходят до внутренних районов.", "Las caravanas se encuentran con los barcos en este muelle, y así las noticias de una carga útil llegan pronto al interior.", "As caravanas encontram os barcos neste cais, e assim a notícia de uma carga útil chega depressa ao interior.", "この波止場で隊商が船と合流するため、役立つ積荷の知らせはすぐ内陸へ届きます。", "An diesem Kai treffen Karawanen auf die Boote. So verbreitet sich die Nachricht von nützlicher Fracht schnell im Landesinneren.", "Les caravanes retrouvent les bateaux à ce quai ; la nouvelle d'une cargaison utile se répand vite dans l'arrière-pays.", "Karawany spotykają się tu z łodziami, więc wieść o przydatnym ładunku szybko dociera w głąb lądu.", "商隊在這座碼頭與船隻接貨，有用貨物的消息很快便傳入內陸。", "이 부두에서 대상이 배와 만나므로 유용한 화물 소식이 내륙으로 빠르게 퍼집니다."]],
    ["Caravel", ["卡拉维尔帆船", "Каравелла", "Carabela", "Caravela", "カラベル船", "Karavelle", "Caravelle", "Karawela", "卡拉維爾帆船", "카라벨선"]],
    ["Cargo delivered", ["货物已送达", "Груз доставлен", "Carga entregada", "Carga entregue", "貨物を届けました", "Fracht abgeliefert", "Cargaison livrée", "Ładunek dostarczony", "貨物已送達", "화물을 전달했습니다"]],
    ["CARGO", ["货物", "ГРУЗ", "CARGA", "CARGA", "貨物", "FRACHT", "CARGAISON", "ŁADUNEK", "貨物", "화물"]]
  ];
  return Object.fromEntries(entries.map(([source, translations]) => [
    source,
    reviewedLocaleOverrides(source, translations)
  ]));
}

function reviewedSpanishScreenOverrides() {
  const entries =   [
    [
      "{0} -{1} CREW",
      "{0} -{1} TRIPULANTES"
    ],
    [
      "{0} BANS {1} MERCHANDISE",
      "{0} PROHÍBE PRODUCTOS DE {1}"
    ],
    [
      "{0} BLOCKADES {1}",
      "{0} BLOQUEA {1}"
    ],
    [
      "{0} and {1} spend Christian blood against one another.",
      "{0} y {1} derraman sangre cristiana al combatirse."
    ],
    [
      "{0} and {1} spend Christian blood against one another. Carry a Papal nuncio between their courts and return with both answers.",
      "{0} y {1} derraman sangre cristiana al combatirse. Lleva un nuncio papal entre sus cortes y vuelve con la respuesta de ambos."
    ],
    [
      "{0} crew",
      "{0} tripulantes"
    ],
    [
      "{0} crew muster",
      "Recuento de tripulación de {0}"
    ],
    [
      "{0} cheated me of my share. Take my silver cup from {1}, last seen near {2}. Bring it here for {3} doubloons.",
      "{0} me estafó mi parte. Recupera mi copa de plata de {1}, vista por última vez cerca de {2}. Tráela aquí y te pagaré {3} doblones."
    ],
    [
      "{0} CASKS CANNOT TAKE MORE",
      "{0} BARRILES LLENOS"
    ],
    [
      "{0} CONQUISTADORS / {1} DEAD / {2} WOUNDED",
      "{0} CONQUISTADORES / {1} MUERTOS / {2} HERIDOS"
    ],
    [
      "{0} DAYS TO LAUNCH",
      "{0} DÍAS PARA BOTAR"
    ],
    [
      "{0} DELEGATION ENGAGED",
      "{0} DELEGACIÓN EN COMBATE"
    ],
    [
      "{0} is hard pressed by {1}. Carry {2} and a Papal nuncio",
      "{0} está en apuros ante {1}. Lleva a {2} y a un nuncio papal"
    ],
    [
      "{0} is hard pressed by {1}. Carry {2} and a Papal nuncio to {3} before another Christian harbor is lost.",
      "{0} está en apuros ante {1}. Lleva a {2} y a un nuncio papal a {3} antes de que se pierda otro puerto cristiano."
    ],
    [
      "{0} is ready for the court at {1}.",
      "{0} está listo para presentarse ante la corte de {1}."
    ],
    [
      "{0} ISSUES A BULL IN FAVOUR OF {1}",
      "{0} PROMULGA UNA BULA A FAVOR DE {1}"
    ],
    [
      "{0} JOINED THE CREW",
      "{0} SE UNIÓ A LA TRIPULACIÓN"
    ],
    [
      "{0} joined the crew as Master Chef.",
      "{0} se unió a la tripulación como maestre cocinero."
    ],
    [
      "{0} LIFTS ITS BAN ON {1} MERCHANDISE",
      "{0} LEVANTA EL VETO COMERCIAL A {1}"
    ],
    [
      "{0} RELEASED",
      "{0} LIBERADA"
    ],
    [
      "{0} Standing {1}/{2}.",
      "{0} Reputación {1}/{2}."
    ],
    [
      "{0} standing or better.",
      "{0} de reputación o más."
    ],
    [
      "{0} TAKEN HOLD FULL",
      "{0} CAZADA: BODEGA LLENA"
    ],
    [
      "{0} TREASURE PIRATES REMAIN",
      "QUEDAN {0} PIRATAS DEL TESORO"
    ],
    [
      "{0} UNDERWAY CONCERNING {1}",
      "{0} EN CURSO CONTRA {1}"
    ],
    [
      "{0} water",
      "{0} agua"
    ],
    [
      "{0} wounded",
      "{0} heridos"
    ],
    [
      "{0} WOUNDED",
      "{0} HERIDOS"
    ],
    [
      "{0}'s court requires sufficient standing and ship strength. Standing {1}/{2}. Strength {3}/{4}.",
      "La corte de {0} exige reputación y fuerza naval suficientes. Reputación: {1}/{2}. Fuerza: {3}/{4}."
    ],
    [
      "{0}{1} is annexed and placed under the direct rule of {2}.",
      "{0}{1} queda anexionada y bajo el gobierno directo de {2}."
    ],
    [
      "{0}{1} remains independent but agrees to pay tribute to {2}.",
      "{0}{1} sigue siendo independiente, pero acepta pagar tributo a {2}."
    ],
    [
      "{0} of {1} creatures now have a place in my book. Keep watch whenever you make landfall.",
      "He registrado {0} de {1} criaturas en mi libro. Mantente alerta cada vez que desembarques."
    ],
    [
      "{0} of {1} creatures of these seas now have a place in my book. Keep watch whenever you make landfall.",
      "He registrado {0} de {1} criaturas de estos mares en mi libro. Mantente alerta cada vez que desembarques."
    ],
    [
      "{0} of Captain {1}'s old crew still block the harbor.",
      "{0} antiguos tripulantes del capitán {1} aún bloquean el puerto."
    ],
    [
      "{0} of Captain {1}'s old crew still block the harbor. They mean to have the treasure before they let us reach the quay.",
      "{0} antiguos tripulantes del capitán {1} aún bloquean el puerto. Quieren quedarse con el tesoro antes de dejarnos llegar al muelle."
    ],
    [
      "{0} offers protection to {1} in return for tribute and allegiance.",
      "{0} protege a {1} a cambio de tributo y lealtad."
    ],
    [
      "{0} offers tribute and allegiance to {1} in return for recognition and protection.",
      "{0} ofrece tributo y lealtad a {1} a cambio de reconocimiento y protección."
    ],
    [
      "{0} refits will remain after this one.",
      "Quedarán {0} reacondicionamientos después de este."
    ],
    [
      "{0} still has my silver cup aboard {1}. Look for that merchant near {2}. Bring the cup back here.",
      "{0} aún tiene mi copa de plata a bordo de {1}. Busca a ese mercader cerca de {2} y tráeme la copa."
    ],
    [
      "{0} went ashore. Earned {1} db. Standing improved.",
      "{0} desembarcó. Ganó {1} DB. Mejoró su reputación."
    ],
    [
      "{0} was remembered as the greatest explorer of the age. {1} {2}{3}{4}",
      "Se recuerda a {0} como el mayor explorador de la época. {1} {2}{3}{4}"
    ],
    [
      "{0} was secured by allied forces. The commission is recalled, but the treasury will pay {1} doubloons for your preparations.",
      "{0} cayó en manos aliadas. La comisión queda anulada, pero el tesoro pagará {1} doblones por tus preparativos."
    ],
    [
      "{0} WITHDRAWS THE BULL IN FAVOUR OF {1}",
      "{0} RETIRA LA BULA A FAVOR DE {1}"
    ],
    [
      "{0} x{1} moved straight to the yard stores.",
      "{0} x{1} se almacenó directamente en el astillero."
    ],
    [
      "{0} You are a fellow Muslim. If you are ready, come with me as a pilgrim.",
      "{0} Eres musulmán como yo. Si estás listo, acompáñame en la peregrinación."
    ],
    [
      "{0} You have made the Hajj before, captain; pray that mine is accepted.",
      "{0} Ya has hecho el hach, capitán; reza para que acepten el mío."
    ],
    [
      "{0} Your name is known in every warehouse here, and our merchants will always give you {1}% off goods you buy.",
      "{0} Tu nombre es conocido en todos nuestros almacenes; nuestros mercaderes siempre te harán un {1}% de descuento en tus compras."
    ],
    [
      "{0}, cook",
      "{0}, cocinero"
    ],
    [
      "{0}, planter",
      "{0}, agricultor"
    ],
    [
      "{0}, surrendered prize",
      "{0}, presa rendida"
    ],
    [
      "{0} joined the crew.",
      "{0} se unió a la tripulación."
    ],
    [
      "{0} Both courts have now spoken. Rome will act upon the counsel you carry home.",
      "{0} Ambas cortes ya se han pronunciado. Roma actuará según el consejo que lleves a casa."
    ],
    [
      "{0} has drawn grave notice in Rome. Carry the Pope's sealed admonition",
      "{0} ha llamado la atención en Roma. Lleva la amonestación sellada del Papa"
    ],
    [
      "{0} has fallen. The commissioners brought its court to terms, and the",
      "{0} ha caído. Los comisionados lograron que su corte aceptara las condiciones, y"
    ],
    [
      "{0} has fallen. The commissioners brought its court to terms, and the princes and envoys sealed peace. The treasury will honor",
      "{0} ha caído. Los comisionados lograron que su corte aceptara las condiciones, y los príncipes y enviados sellaron la paz. El tesoro cumplirá"
    ],
    [
      "{0} has fallen. The commissioners brought its court to terms, and the princes and envoys sealed peace. The treasury will honor {1}'s extraordinary commission.",
      "{0} ha caído. Los comisionados lograron que su corte aceptara las condiciones, y los príncipes y enviados sellaron la paz. El tesoro cumplirá la comisión extraordinaria de {1}."
    ],
    [
      "{0} has received the chancery's sealed receipt. The treasury pays {1} db for your passage.",
      "{0} ha recibido el recibo sellado de la cancillería. El tesoro te pagará {1} doblones por el viaje."
    ],
    [
      "{0} has received the court's receipt. The treasury will pay {1} db.",
      "{0} ha recibido el recibo de la corte. El tesoro pagará {1} doblones."
    ],
    [
      "{0} has sealed instructions for the election of a {1}. Carry me to {2} and home for {3} db. My prince alone chooses; your duty is only our passage.",
      "{0} ha sellado las instrucciones para elegir a un {1}. Llévame a {2} y tráeme de vuelta por {3} doblones. Solo mi príncipe decide; tu deber es llevarnos."
    ],
    [
      "{0} has submitted to the commissioners and the rulers have sealed peace. Carry the final dispatches to {1}.",
      "{0} se ha sometido a los comisionados y los gobernantes han sellado la paz. Lleva el despacho final a {1}."
    ],
    [
      "{0} has taken power in {1}. The harbor watch expects policy to follow.",
      "{0} ha tomado el poder en {1}. La guardia del puerto espera que pronto cambie la política."
    ],
    [
      "{0} has trusted readers waiting behind drawn shutters.",
      "{0} tiene lectores de confianza aguardando tras las contraventanas cerradas."
    ],
    [
      "{0} has trusted readers waiting behind drawn shutters. {1}",
      "En {0}, lectores de confianza aguardan tras las contraventanas cerradas. {1}"
    ],
    [
      "{0} have laid prohibitions upon merchandise from {1}",
      "{0} han prohibido el comercio de mercancías de {1}"
    ],
    [
      "{0} HOLD FULL",
      "{0} BODEGA LLENA"
    ],
    [
      "{0} in {1} has a stolen chest for us. Meet him by the waterfront, from eight in the evening until five in the morning. Bring it here for {2} doubloons. Quietly.",
      "{0} en {1} tiene un cofre robado para nosotros. Reúnete con él junto al puerto entre las ocho de la tarde y las cinco de la mañana. Tráelo aquí por {2} doblones. Sin hacer ruido."
    ],
    [
      "{0} is aboard on an embassy from {1} to {2}; finish that mission first.",
      "{0} va a bordo en una embajada de {1} a {2}; termina primero esa misión."
    ],
    [
      "{0} is aboard, returning from {1} to {2}; finish that embassy first.",
      "{0} va a bordo de regreso de {1} a {2}; termina primero esa embajada."
    ],
    [
      "A flightless seabird of the southern ice.",
      "Un ave marina no voladora de los hielos australes."
    ],
    [
      "A hidden bundle beneath the Sō register bears unlisted names and copied seals. The evidence remains locked in the captain's cabin.",
      "Un paquete oculto bajo el registro Sō contiene nombres no registrados y sellos copiados. Las pruebas siguen bajo llave en la cabina del capitán."
    ],
    [
      "a great broad-beamed galley enlarged into a floating gun platform, sacrificing the ordinary galley's speed for heavy artillery and a powerful fighting crew",
      "una gran galera de manga ancha convertida en plataforma artillera flotante, que sacrifica velocidad por artillería pesada y una tripulación de combate numerosa"
    ],
    [
      "A dozen pirates, a dozen scraps, and one island somewhere beyond the lamps of any harbor. It sounds like the beginning of a hanging, not a fortune.",
      "Una docena de piratas, una docena de fragmentos y una isla perdida más allá de las luces de cualquier puerto. Parece el comienzo de una horca, no de una fortuna."
    ],
    [
      "A Good Haul",
      "Una buena pesca"
    ],
    [
      "A glacier-clad beacon for the whole sound. Note the river mouths below; all that ice must send its influence far beyond the mountain.",
      "Un faro cubierto de glaciares que domina todo el estrecho. Observa las desembocaduras de los ríos; esos hielos deben influir mucho más allá de la montaña."
    ],
    [
      "A heavy horned browser of warm grasslands and forests.",
      "Un gran herbívoro de pesados cuernos que ramonea en praderas y bosques cálidos."
    ],
    [
      "A mode of travel and nurture unlike anything in our books. Draw the feet, tail, and pouch separately; readers will otherwise insist we joined three animals together.",
      "Una forma de desplazarse y criar a sus cachorros que no se parece a nada en nuestros libros. Dibuja por separado las patas, la cola y la bolsa; si no, los lectores creerán que juntamos tres animales."
    ],
    [
      "A most dexterous subject. Leave the raccoon in my care and I shall pay you {payment} doubloons. I shall begin by purchasing stronger locks.",
      "Un ejemplar de gran destreza. Déjame cuidar al mapache y te pagaré {payment} doblones. Empezaré por comprar cerraduras más resistentes."
    ],
    [
      "A mountain in a world almost emptied of everything else. Keep that page exactly as you drew it. The blankness around the massif is part of the discovery.",
      "Una montaña en un mundo casi vacío de todo lo demás. Conserva esa página tal como la dibujaste. El vacío que rodea el macizo también forma parte del hallazgo."
    ],
    [
      "A nesting colony of shore birds yielded eggs and meat enough to add to the stores.",
      "Una colonia de aves costeras proporcionó huevos y carne para las provisiones."
    ],
    [
      "A pinch of the tea would improve this watch beyond recognition.",
      "Una pizca de té mejoraría esta guardia por completo."
    ],
    [
      "A polar bear charged through the blowing snow and killed a sailor before the hunters drove it off.",
      "Un oso polar atravesó la ventisca y mató a un marinero antes de que los cazadores lo ahuyentaran."
    ],
    [
      "a light East Asian river and coastal craft, shallow enough for creeks and crowded harbors where a deeper ocean ship could never work",
      "una ligera embarcación fluvial y costera de Asia oriental, de poco calado para navegar por arroyos y puertos congestionados, inaccesibles a los buques oceánicos"
    ],
    [
      "a light lateen craft long at home on the Nile and eastern Mediterranean, fast to handle and able to trade from the smallest landing places",
      "una ligera embarcación de vela latina, habitual en el Nilo y el Mediterráneo oriental, fácil de maniobrar y capaz de comerciar desde los embarcaderos más pequeños"
    ],
    [
      "A maritime world raised into the mountains. Record how its people build with reeds where timber is scarce; ingenuity belongs in our book beside grandeur.",
      "Un mundo marítimo elevado a las montañas. Anota cómo sus gentes construyen con juncos donde escasea la madera; el ingenio merece figurar junto a la grandeza."
    ],
    [
      "A compass, cross-staff, lead line, and tables sharpen shiphandling.",
      "La brújula, la ballestilla, la sondaleza y las tablas de navegación mejoran el gobierno del buque."
    ],
    [
      "A concealed crevasse opened beneath a sailor. The party returned one fewer.",
      "Una grieta oculta se abrió bajo un marinero. El grupo regresó con uno menos."
    ],
    [
      "A king turned an isolated rock into both palace and proclamation. Sketch the gardens as well as the walls; power often reveals itself in what it chooses to make beautiful.",
      "Un rey convirtió una roca aislada en palacio y pregón. Dibuja los jardines y las murallas: el poder también se revela en aquello que embellece."
    ],
    [
      "A landing at the Pasig cannot rely on steel alone. Supply",
      "Un desembarco en el Pasig no puede depender solo del acero. Abastece"
    ],
    [
      "A new wonder was added to the chart.",
      "Se añadió una nueva maravilla al mapa."
    ],
    [
      "A pilgrim's flask filled at the Zamzam well, with a fitted cup that helps the crew ration every cask.",
      "Una cantimplora de peregrino, llenada en el pozo de Zamzam, con una taza acoplada para racionar el contenido de cada barril."
    ],
    [
      "A captain outside Christendom would require singular trust in Rome: {0} standing or better.",
      "Un capitán ajeno a la cristiandad necesita gran confianza en Roma: reputación de {0} o más."
    ],
    [
      "The broker reports you to the harbor watch. {0} standing fell.",
      "El agente te denunció ante la guardia del puerto. Tu reputación con {0} ha bajado."
    ],
    [
      "The Curia requires {0} standing before it will entrust you",
      "La Curia exige reputación de {0} antes de confiarte"
    ],
    [
      "The Curia requires {0} standing before it will entrust you with sealed Papal briefs.",
      "La Curia exige reputación de {0} antes de confiarte documentos papales sellados."
    ],
    [
      "A letter found me in {0}. My family in {1} needs me before the season turns. Please take me there; I can pay {2} db.",
      "Recibí una carta en {0}. Mi familia de {1} me necesita antes de que cambie la estación. Llévame allí, por favor; puedo pagarte {2} doblones."
    ],
    [
      "A letter of marque licenses prizes at sea; it does not grant the choice of a harbor. Name an enemy, or ask after an independent port. The council will judge the realm's need and name any target.",
      "La patente de corso autoriza a apresar barcos enemigos, pero no permite elegir el puerto. Nombra a un enemigo o pregunta por un puerto independiente. El consejo decidirá qué objetivo necesita el reino."
    ],
    [
      "A bear sustained upon grass and equipped to sort it. Aristotle would object on several grounds, which makes the observation especially valuable.",
      "Un oso que vive de la hierba y sabe digerirla. Aristóteles objetaría por varios motivos, lo que hace esta observación aún más valiosa."
    ],
    [
      "A bare fort cannot command commerce. Complete the factor's stock with",
      "Un fuerte vacío no puede controlar el comercio. Completa las existencias del factor con"
    ],
    [
      "a palisade, house, store, and raised river landing",
      "una empalizada, una casa, un almacén y un embarcadero elevado en el río"
    ],
    [
      "A full voyage around the world",
      "Una vuelta completa al mundo"
    ],
    [
      "A fur post without respectable exchange goods will destroy its own alliances. Supply",
      "Un puesto peletero sin mercancías adecuadas para el trueque destruirá sus propias alianzas. Abastece"
    ],
    [
      "A fine coincidence. We shall have to compare who has weathered the better year.",
      "Qué coincidencia. Tendremos que comparar quién ha pasado mejor el año."
    ],
    [
      "A mountain shaped as much by Atlantic weather as by stone. Your harbor approaches and cloud notes will make this a useful page as well as a handsome one.",
      "El clima atlántico ha dado forma a esta montaña tanto como la piedra. Anota los accesos al puerto y las nubes; así esta página será tan útil como hermosa."
    ],
    [
      "A city of stone in the southern interior, joined to the sea by trade. Bring me the beads, metals, and stories you found there; walls tell only half a city's life.",
      "Una ciudad de piedra en el interior austral, unida al mar por el comercio. Tráeme las cuentas, los metales y las historias que encontraste allí; las murallas solo cuentan la mitad de su historia."
    ],
    [
      "A city upon a hill still requires ordinary labor. Supply",
      "Una ciudad en lo alto de una colina también necesita mano de obra. Abastece"
    ],
    [
      "A pinch. The rest still belongs to our buyer.",
      "Una pizca. El resto sigue reservado para nuestro comprador."
    ],
    [
      "a compact junk in the old East Asian coastal tradition, with a shallow hull and easily managed battened sail suited to a modest crew",
      "un junco compacto de antigua tradición costera de Asia oriental, con poco calado y una vela de sables fácil de manejar, adecuada para una tripulación reducida"
    ],
    [
      "a lean Japanese war vessel built to carry warriors swiftly along the coast beneath a single sail and long banks of oars",
      "un ligero buque de guerra japonés, diseñado para transportar guerreros con rapidez por la costa bajo una vela y largas bancadas de remos"
    ],
    [
      "a lean Mediterranean sailing vessel whose lateen canvas and narrow hull made the type prized by traders, naval scouts, and corsairs alike",
      "un velero mediterráneo ligero y estrecho, apreciado por igual por mercaderes, exploradores navales y corsarios por su vela latina"
    ],
    [
      "a great paddled dugout like those Mesoamerican mariners used for fishing and coastal commerce long before European ships reached their shores",
      "una gran piragua de remo, como las que los navegantes mesoamericanos usaban para pescar y comerciar por la costa mucho antes de la llegada de los europeos"
    ],
    [
      "A panda? I know the animal, captain, but I never expected to see one serving aboard a ship.",
      "¿Un panda? Conozco al animal, capitán, pero nunca imaginé que uno pudiera trabajar a bordo."
    ],
    [
      "A people without a surviving name arranged stone as carefully as an astronomer arranges numbers. Record the openings in the ring; perhaps they watched the heavens through them.",
      "Un pueblo cuyo nombre no perduró dispuso las piedras con el cuidado de un astrónomo al ordenar sus cifras. Anota las aberturas del círculo; quizá observaban el cielo a través de ellas."
    ],
    [
      "A permanent station needs more than the seasonal crews leave behind. Bring",
      "Una estación permanente necesita más de lo que dejan las tripulaciones temporales. Trae"
    ],
    [
      "A pilgrimage made into an ascent, with every step teaching before the summit is reached. Preserve the order of the terraces; the path itself is part of the work.",
      "Una peregrinación convertida en ascenso, donde cada paso enseña antes de alcanzar la cima. Conserva el orden de las terrazas; el propio camino forma parte de la obra."
    ],
    [
      "a stockade, storehouses, and storm repairs",
      "una empalizada, almacenes y reparaciones para resistir las tormentas"
    ],
    [
      "{0} DEFENDED {1} STANDING +{2}",
      "{0} DEFENDIDO {1} REPUTACIÓN +{2}"
    ],
    [
      "{0} is theft from the court. Your mission will fail and your standing",
      "{0} es un robo a la corte. Tu misión fracasará y tu reputación"
    ],
    [
      "Commission fulfilled. Earned {0} db. Standing greatly improved.",
      "Comisión cumplida. Ganó {0} doblones. Su reputación mejoró mucho."
    ],
    [
      "Delivered. Earned {0} db. Standing improved.",
      "Entrega completada. Ganó {0} doblones. Su reputación mejoró."
    ],
    [
      "Standing adjustment",
      "Ajuste de reputación"
    ],
    [
      "Those {0} are sealed tribute, not your cargo. Selling {1} is theft from the court. Your mission will fail and your standing",
      "Esos {0} son tributos sellados, no tu carga. Vender {1} es un robo a la corte. Tu misión fracasará y tu reputación"
    ],
    [
      "Those {0} are sealed tribute, not your cargo. Selling {1} is theft from the court. Your mission will fail and your standing will fall {2} with {3}{4}.",
      "Esos {0} son tributos sellados, no tu carga. Vender {1} es un robo a la corte. Tu reputación con {3}{4} bajará {2} y fracasarás en la misión."
    ],
    [
      "Those {0} chests were entrusted for the new-crop race, not given to you. Selling {1} is theft. The race will fail and your standing",
      "Esos {0} cofres te fueron confiados para la carrera de la nueva cosecha, no regalados. Vender {1} es un robo. La carrera fracasará y tu reputación"
    ],
    [
      "Those {0} chests were entrusted for the new-crop race, not given to you. Selling {1} is theft. The race will fail and your standing will fall {2} with {3}.",
      "Esos {0} cofres te fueron confiados para la carrera de la nueva cosecha, no regalados. Vender {1} es un robo. Tu reputación con {3} bajará {2} y fracasarás en la carrera."
    ],
    [
      "to you. Selling {0} is theft. The race will fail and your standing",
      "a ti. Vender {0} es un robo. La carrera fracasará y tu reputación"
    ],
    [
      "War-ending commission fulfilled. Earned {0} db. Standing transformed.",
      "Comisión para poner fin a la guerra cumplida. Ganó {0} doblones. Su reputación cambió por completo."
    ],
    [
      "Your standing here remains poor, captain, but {0}'s protection opens the quay to you. Mind your conduct.",
      "Vuestra reputación aquí sigue siendo baja, capitán, pero la protección de {0} os permite atracar. Cuidad vuestra conducta."
    ],
    [
      "Your standing is poor. Conduct yourself accordingly.",
      "Tu reputación es baja. Compórtate en consecuencia."
    ],
    [
      "Your standing is satisfactory. We can do business directly.",
      "Vuestra reputación es satisfactoria. Podemos tratar directamente."
    ],
  ];
  return Object.fromEntries(entries.map(([source, translation]) => [source, Object.freeze({ es: translation })]));
}

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

function independentPolityOverrides() {
  const entries = [
    ["{0} answers to its own rulers. Turn about. No supplies will be sold to you.", [
      "{0}自有其统治者。掉头离去。此处不会卖给你任何补给。", "{0} повинуется собственным правителям. Поворачивайте. Припасов вам не продадут.", "{0} responde ante sus propios gobernantes. Dad la vuelta. No se os venderán provisiones.", "{0} responde a seus próprios governantes. Dai meia-volta. Não vos venderão provisões.", "{0}は自らの統治者に従う。引き返せ。そなたには物資を売らぬ。", "{0} gehorcht seinen eigenen Herren. Kehrt um. Man wird Euch keine Vorräte verkaufen.", "{0} obéit à ses propres gouvernants. Faites demi-tour. Aucun ravitaillement ne vous sera vendu.", "{0} podlega własnym władzom. Zawróćcie. Nie sprzedamy wam zaopatrzenia.", "{0}自有其統治者。掉頭離去。此處不會賣給你任何補給。", "{0}은 자체 통치자들에게 복종한다. 돌아가라. 그대에게는 보급품을 팔지 않겠다."
    ]],
    ["A letter of marque licenses prizes at sea; it does not grant the choice of a harbor. Name an enemy, or ask after an independent port. The council will judge the realm's need and name any target.", [
      "私掠许可证准许在海上夺取战利船，却不准持证人选择港口。说出一个敌国，或询问一处独立港口。议政会将衡量国事所需，并写明目标。", "Каперская грамота дозволяет брать призы в море, но не выбирать гавань. Назовите врага либо спросите о независимом порте. Совет рассудит нужды державы и сам назовёт цель.", "Una patente de corso autoriza presas en el mar, pero no concede elegir puerto. Nombrad a un enemigo o preguntad por un puerto independiente. El consejo juzgará las necesidades del reino y señalará el objetivo.", "Uma carta de corso autoriza presas no mar, mas não concede a escolha de um porto. Nomeai um inimigo ou perguntai por um porto independente. O conselho julgará as necessidades do reino e indicará o alvo.", "私掠免許状は海上での拿捕を許すが、港の選択までは委ねぬ。敵国を名指すか、独立港について尋ねよ。評議会が国の要を量り、目標を定める。", "Ein Kaperbrief erlaubt Prisen auf See, nicht aber die Wahl eines Hafens. Nennt einen Feind oder fragt nach einem unabhängigen Hafen. Der Rat wägt die Bedürfnisse des Landes und bestimmt das Ziel.", "Une lettre de marque autorise les prises en mer, non le choix d'un port. Nommez un ennemi ou interrogez-nous sur un port indépendant. Le conseil jugera des besoins du pays et désignera la cible.", "List kaperski pozwala brać pryzy na morzu, lecz nie wybierać portu. Wskażcie wroga albo zapytajcie o niezależny port. Rada rozważy potrzeby państwa i sama wyznaczy cel.", "私掠許可證准許在海上奪取戰利船，卻不准持證人選擇港口。說出一個敵國，或詢問一處獨立港口。議政會將衡量國事所需，並寫明目標。", "사략 허가장은 바다의 나포를 허락할 뿐 항구 선택권까지 주지는 않는다. 적국을 지목하거나 독립 항구에 관해 물으라. 회의가 나라의 필요를 헤아려 목표를 정할 것이다."
    ]],
    ["any independent harbor", ["任何独立港口", "любая независимая гавань", "cualquier puerto independiente", "qualquer porto independente", "いずれかの独立港", "irgendeinen unabhängigen Hafen", "tout port indépendant", "dowolny niezależny port", "任何獨立港口", "어느 독립 항구든"]],
    ["Ask after an independent harbor", ["询问独立港口", "Спросить о независимой гавани", "Preguntar por un puerto independiente", "Perguntar por um porto independente", "独立港について尋ねる", "Nach einem unabhängigen Hafen fragen", "S'enquérir d'un port indépendant", "Zapytać o niezależny port", "詢問獨立港口", "독립 항구에 관해 묻는다"]],
    ["Cardinal-Governor", ["枢机总督", "Кардинал-губернатор", "Cardenal gobernador", "Cardeal-governador", "枢機卿総督", "Kardinalstatthalter", "Cardinal-gouverneur", "Kardynał-gubernator", "樞機總督", "추기경 총독"]],
    ["Cardinal-Governor {0}", ["枢机总督{0}", "Кардинал-губернатор {0}", "Cardenal gobernador {0}", "Cardeal-governador {0}", "枢機卿総督{0}", "Kardinalstatthalter {0}", "Cardinal-gouverneur {0}", "Kardynał-gubernator {0}", "樞機總督{0}", "추기경 총독 {0}"]],
    ["Cardinal-Regent", ["枢机摄政", "Кардинал-регент", "Cardenal regente", "Cardeal-regente", "枢機卿摂政", "Kardinalregent", "Cardinal-régent", "Kardynał-regent", "樞機攝政", "추기경 섭정"]],
    ["Cardinal-Regent {0}", ["枢机摄政{0}", "Кардинал-регент {0}", "Cardenal regente {0}", "Cardeal-regente {0}", "枢機卿摂政{0}", "Kardinalregent {0}", "Cardinal-régent {0}", "Kardynał-regent {0}", "樞機攝政{0}", "추기경 섭정 {0}"]],
    ["Florence", ["佛罗伦萨", "Флоренция", "Florencia", "Florença", "フィレンツェ", "Florenz", "Florence", "Florencja", "佛羅倫斯", "피렌체"]],
    ["Florence may debate liberty and the Medici in every hall. This bond admits no faction.", [
      "佛罗伦萨各厅堂尽可争论自由与美第奇；这张债券却不认党派。", "Пусть во всех залах Флоренции спорят о свободе и Медичи — эта долговая запись не знает партий.", "Florencia puede disputar sobre la libertad y los Médici en cada sala. Esta obligación no reconoce facción.", "Florença pode debater a liberdade e os Médici em cada salão. Este título não reconhece facção.", "フィレンツェのどの広間でも自由とメディチを論じればよい。この証文は党派を認めぬ。", "Florenz mag in jedem Saal über Freiheit und die Medici streiten. Dieser Schuldschein kennt keine Partei.", "Florence peut débattre dans chaque salle de la liberté et des Médicis. Cette obligation ne connaît aucun parti.", "Niech w każdej sali Florencji spierają się o wolność i Medyceuszy. Ten skrypt nie uznaje stronnictw.", "佛羅倫斯各廳堂儘可爭論自由與美第奇；這張債券卻不認黨派。", "피렌체의 어느 회당에서든 자유와 메디치를 논하라. 이 채권은 어느 당파도 인정하지 않는다."
    ]],
    ["Florentine", ["佛罗伦萨", "ФЛОРЕНТИЙСКИЙ", "FLORENTINO", "FLORENTINO", "フィレンツェ", "FLORENTINISCH", "FLORENTIN", "FLORENCKI", "佛羅倫斯", "피렌체"]],
    ["Free Imperial City of Metz", ["梅斯自由帝国城市", "Вольный имперский город Мец", "Ciudad Libre Imperial de Metz", "Cidade Imperial Livre de Metz", "帝国自由都市メス", "Freie Reichsstadt Metz", "Ville libre d'Empire de Metz", "Wolne Miasto Rzeszy Metz", "梅斯自由帝國城市", "자유제국도시 메츠"]],
    ["Kazan", ["喀山", "Казань", "Kazán", "Cazã", "カザン", "Kasan", "Kazan", "Kazań", "喀山", "카잔"]],
    ["Kazan Khanate", ["喀山汗国", "Казанское ханство", "Kanato de Kazán", "Canato de Cazã", "カザン・ハン国", "Khanat Kasan", "Khanat de Kazan", "Chanat Kazański", "喀山汗國", "카잔 칸국"]],
    ["Kazan Tatar", ["喀山鞑靼", "Казанско-татарский", "Tártaro de Kazán", "Tártaro de Cazã", "カザン・タタール", "Kasan-tatarisch", "Tatar de Kazan", "Kazańsko-tatarski", "喀山韃靼", "카잔 타타르"]],
    ["Metz", ["梅斯", "Мец", "Metz", "Metz", "メス", "Metz", "Metz", "Metz", "梅斯", "메츠"]],
    ["No warrant shall issue concerning {0}. A captain may offer service, but the court chooses its objects. Return when your credit or the campaign has altered.", [
      "不会颁发涉及{0}的敕令。船长可以请命效力，但目标由朝廷选择。待你的声望或战局有变再来。", "Грамоты касательно {0} не будет. Капитан может предложить службу, но цели избирает двор. Возвращайтесь, когда изменятся ваш вес или ход кампании.", "No se expedirá comisión respecto de {0}. Un capitán puede ofrecer servicio, pero la corte escoge sus objetivos. Volved cuando cambien vuestro crédito o la campaña.", "Não será expedida comissão a respeito de {0}. Um capitão pode oferecer serviço, mas a corte escolhe seus objetivos. Voltai quando mudar vosso crédito ou a campanha.", "{0}に関する勅許は出さぬ。船長は奉仕を申し出られるが、目標を選ぶのは宮廷だ。そなたの信用か戦況が変われば戻れ。", "Für {0} wird kein Auftrag erteilt. Ein Kapitän mag Dienst anbieten, doch der Hof wählt seine Ziele. Kehrt zurück, wenn sich Euer Ansehen oder der Feldzug gewandelt hat.", "Aucune commission ne sera délivrée au sujet de {0}. Un capitaine peut offrir ses services, mais la cour choisit ses objectifs. Revenez lorsque votre crédit ou la campagne aura changé.", "Nie wydamy zlecenia dotyczącego {0}. Kapitan może zaoferować służbę, lecz cele wybiera dwór. Wróćcie, gdy zmieni się wasze znaczenie albo przebieg kampanii.", "不會頒發涉及{0}的敕令。船長可以請命效力，但目標由朝廷選擇。待你的聲望或戰局有變再來。", "{0}에 관한 위임장은 내리지 않는다. 선장은 봉사를 청할 수 있으나 목표는 조정이 고른다. 그대의 신망이나 전황이 달라지면 돌아오라."
    ]],
    ["Our house advanced silver while Cardinal Giulio's men reordered the government. The magistrates changed; the seal remained.", [
      "朱利奥枢机的人重整政府时，我家垫付了银钱。官员换了，印玺仍在。", "Наш дом ссудил серебро, пока люди кардинала Джулио перестраивали правление. Магистраты сменились; печать осталась.", "Nuestra casa adelantó plata mientras los hombres del cardenal Giulio reordenaban el gobierno. Cambiaron los magistrados; quedó el sello.", "Nossa casa adiantou prata enquanto os homens do cardeal Giulio reordenavam o governo. Mudaram os magistrados; permaneceu o selo.", "ジュリオ枢機卿の者たちが政体を組み替える間、我が家は銀を立て替えた。役人は替わっても、印章は残った。", "Unser Haus schoss Silber vor, während Kardinal Giulios Männer die Regierung neu ordneten. Die Amtsträger wechselten; das Siegel blieb.", "Notre maison avança l'argent tandis que les hommes du cardinal Giulio réordonnaient le gouvernement. Les magistrats changèrent ; le sceau demeura.", "Nasz dom wyłożył srebro, gdy ludzie kardynała Giulia układali rządy na nowo. Urzędnicy się zmienili; pieczęć pozostała.", "朱利奧樞機的人重整政府時，我家墊付了銀錢。官員換了，印璽仍在。", "줄리오 추기경의 사람들이 정부를 다시 꾸릴 때 우리 가문이 은을 댔다. 관리들은 바뀌었으나 인장은 남았다."
    ]],
    ["Republic of Florence", ["佛罗伦萨共和国", "Флорентийская республика", "República de Florencia", "República de Florença", "フィレンツェ共和国", "Republik Florenz", "République de Florence", "Republika Florencka", "佛羅倫斯共和國", "피렌체 공화국"]],
    ["Signoria", ["执政团", "Синьория", "Señoría", "Signoria", "シニョリーア", "Signoria", "Seigneurie", "Signoria", "執政團", "시뇨리아"]],
    ["Signoria {0}", ["执政团{0}", "Синьория {0}", "Señoría {0}", "Signoria {0}", "シニョリーア{0}", "Signoria {0}", "Seigneurie {0}", "Signoria {0}", "執政團{0}", "시뇨리아 {0}"]],
    ["The council has chosen the independent harbor of {0}; no foreign sovereign is named. By {1}'s sealed warrant, silence its batteries, take {2}, raise {3} colors, and return for {4} doubloons.", [
      "议政会已选定独立港口{0}，敕令不指名任何外国君主。奉{1}封印敕令：压制炮台，夺取{2}，升起{3}旗帜，返航后领赏{4}达布隆。", "Совет избрал независимую гавань {0}; ни один чужой государь не назван. По скреплённой печатью грамоте {1} подавите батареи, возьмите {2}, поднимите {3} знамя и возвращайтесь за {4} дублонами.", "El consejo ha escogido el puerto independiente de {0}; no se nombra soberano extranjero. Por la comisión sellada de {1}, silenciad sus baterías, tomad {2}, izad los colores {3} y volved por {4} doblones.", "O conselho escolheu o porto independente de {0}; nenhum soberano estrangeiro é nomeado. Pela comissão selada de {1}, calai suas baterias, tomai {2}, hasteai as cores {3} e voltai por {4} dobrões.", "評議会は独立港{0}を選んだ。外国の君主は名指しされぬ。{1}の封印ある勅許により、砲台を黙らせ、{2}を取り、{3}の旗を掲げ、戻れば{4}ダブロンを与える。", "Der Rat hat den unabhängigen Hafen {0} gewählt; kein fremder Herrscher wird genannt. Kraft {1}s versiegelten Auftrags bringt die Batterien zum Schweigen, nehmt {2}, hisst die {3} Flagge und kehrt für {4} Dublonen zurück.", "Le conseil a choisi le port indépendant de {0} ; aucun souverain étranger n'est nommé. Par la commission scellée de {1}, réduisez ses batteries, prenez {2}, hissez les couleurs {3} et revenez toucher {4} doublons.", "Rada wybrała niezależny port {0}; nie wskazano żadnego obcego władcy. Na mocy opieczętowanego zlecenia {1} uciszcie baterie, zdobądźcie {2}, wznieście {3} barwy i wróćcie po {4} dublonów.", "議政會已選定獨立港口{0}，敕令不指名任何外國君主。奉{1}封印敕令：壓制炮臺，奪取{2}，升起{3}旗幟，返航後領賞{4}達布隆。", "회의는 독립 항구 {0}을 골랐으며 외국 군주는 지목하지 않았다. {1}의 봉인된 위임에 따라 포대를 침묵시키고 {2}을 점령해 {3} 깃발을 올린 뒤 돌아오면 {4}더블룬을 받는다."
    ]],
    ["The council—not your company—has chosen {0}. No foreign sovereign is named and no war is proclaimed. {1} grants a sealed warrant: take {2}, raise {3} colors, and return for {4} doubloons.", [
      "选择{0}的是议政会，不是你的船员。敕令不指名外国君主，也不宣战。{1}颁下封印敕令：夺取{2}，升起{3}旗帜，返航后领赏{4}达布隆。", "{0} избрал совет, не ваша команда. Ни один чужой государь не назван и война не объявлена. {1} жалует скреплённую печатью грамоту: возьмите {2}, поднимите {3} знамя и возвращайтесь за {4} дублонами.", "El consejo, no vuestra compañía, ha escogido {0}. No se nombra soberano extranjero ni se declara guerra. {1} concede comisión sellada: tomad {2}, izad los colores {3} y volved por {4} doblones.", "O conselho, não vossa companhia, escolheu {0}. Nenhum soberano estrangeiro é nomeado e nenhuma guerra é proclamada. {1} concede comissão selada: tomai {2}, hasteai as cores {3} e voltai por {4} dobrões.", "{0}を選んだのはそなたの船団ではなく評議会だ。外国の君主は名指しされず、宣戦もない。{1}は封印ある勅許を与える。{2}を取り、{3}の旗を掲げ、戻れば{4}ダブロンを与える。", "Der Rat, nicht Eure Kompanie, hat {0} gewählt. Kein fremder Herrscher wird genannt und kein Krieg erklärt. {1} gewährt einen versiegelten Auftrag: Nehmt {2}, hisst die {3} Flagge und kehrt für {4} Dublonen zurück.", "Le conseil — non votre compagnie — a choisi {0}. Aucun souverain étranger n'est nommé et nulle guerre n'est proclamée. {1} accorde une commission scellée : prenez {2}, hissez les couleurs {3} et revenez toucher {4} doublons.", "To rada, nie wasza kompania, wybrała {0}. Nie wskazano obcego władcy ani nie ogłoszono wojny. {1} udziela opieczętowanego zlecenia: zdobądźcie {2}, wznieście {3} barwy i wróćcie po {4} dublonów.", "選擇{0}的是議政會，不是你的船員。敕令不指名外國君主，也不宣戰。{1}頒下封印敕令：奪取{2}，升起{3}旗幟，返航後領賞{4}達布隆。", "{0}을 고른 것은 그대의 선단이 아니라 회의다. 외국 군주는 지목하지 않으며 전쟁도 선포하지 않는다. {1}이 봉인된 위임을 내린다. {2}을 점령하고 {3} 깃발을 올린 뒤 돌아오면 {4}더블룬을 받는다."
    ]],
    ["The court will weigh your service, its claims, and the realm's need.", ["朝廷会衡量你的功劳、本国的权利主张与国事所需。", "Двор взвесит вашу службу, свои притязания и нужды державы.", "La corte sopesará vuestro servicio, sus derechos y las necesidades del reino.", "A corte pesará vosso serviço, seus direitos e as necessidades do reino.", "宮廷はそなたの奉公、己の権利、国の要を量る。", "Der Hof wird Eure Dienste, seine Ansprüche und die Bedürfnisse des Landes abwägen.", "La cour pèsera vos services, ses prétentions et les besoins du pays.", "Dwór rozważy waszą służbę, swoje roszczenia i potrzeby państwa.", "朝廷會衡量你的功勞、本國的權利主張與國事所需。", "조정은 그대의 공적과 자신의 권리, 나라의 필요를 함께 헤아릴 것이다."]],
    ["The khan rode against Moscow and returned with glory. Your family's account returned unpaid.", ["可汗征讨莫斯科，载誉而归；你家的账款却未获清偿。", "Хан ходил на Москву и вернулся со славой. Счёт вашей семьи вернулся неоплаченным.", "El kan cabalgó contra Moscú y volvió con gloria. La cuenta de vuestra familia volvió sin pagar.", "O cã marchou contra Moscou e voltou com glória. A conta de vossa família voltou sem pagamento.", "ハンはモスクワへ騎行して誉れとともに戻った。そなたの家の勘定は未払いのまま戻った。", "Der Khan zog gegen Moskau und kehrte ruhmreich zurück. Die Rechnung Eurer Familie blieb unbezahlt.", "Le khan chevaucha contre Moscou et revint couvert de gloire. Le compte de votre famille revint impayé.", "Chan ruszył na Moskwę i wrócił w chwale. Rachunek waszej rodziny wrócił niezapłacony.", "可汗征討莫斯科，載譽而歸；你家的帳款卻未獲清償。", "칸은 모스크바를 치고 영광과 함께 돌아왔다. 그대 가문의 장부는 미납으로 돌아왔다."]],
    ["The sealed warrant names {0}. It authorizes this conquest for {1}, but declares no war against a foreign sovereign. Attack the batteries, land your marines, and raise the colors named in the warrant.", [
      "封印敕令写明{0}。它授权为{1}夺取此地，却不向任何外国君主宣战。攻击炮台，令水兵登陆，并升起敕令所载旗帜。", "В скреплённой печатью грамоте назван {0}. Она дозволяет завоевать его для {1}, но не объявляет войны чужому государю. Атакуйте батареи, высадите морскую пехоту и поднимите указанное в грамоте знамя.", "La comisión sellada nombra {0}. Autoriza su conquista para {1}, pero no declara guerra a soberano extranjero. Atacad las baterías, desembarcad a los infantes e izad los colores señalados en la comisión.", "A comissão selada nomeia {0}. Autoriza sua conquista para {1}, mas não declara guerra a soberano estrangeiro. Atacai as baterias, desembarcai os fuzileiros e hasteai as cores indicadas na comissão.", "封印ある勅許は{0}を名指す。{1}のための攻略を許すが、外国君主への宣戦ではない。砲台を攻め、海兵を上陸させ、勅許に記された旗を掲げよ。", "Der versiegelte Auftrag nennt {0}. Er erlaubt diese Eroberung für {1}, erklärt jedoch keinem fremden Herrscher den Krieg. Greift die Batterien an, landet Eure Seesoldaten und hisst die im Auftrag genannten Farben.", "La commission scellée désigne {0}. Elle autorise cette conquête pour {1}, sans déclarer la guerre à un souverain étranger. Attaquez les batteries, débarquez vos soldats de marine et hissez les couleurs nommées dans la commission.", "Opieczętowane zlecenie wskazuje {0}. Zezwala zdobyć port dla {1}, lecz nie wypowiada wojny obcemu władcy. Zaatakujcie baterie, wysadźcie piechotę morską i wznieście barwy zapisane w zleceniu.", "封印敕令寫明{0}。它授權為{1}奪取此地，卻不向任何外國君主宣戰。攻擊炮臺，令水兵登陸，並升起敕令所載旗幟。", "봉인된 위임장은 {0}을 지목한다. {1}을 위한 정복을 허가하지만 외국 군주에게 전쟁을 선포하지는 않는다. 포대를 공격하고 해병을 상륙시켜 위임장에 적힌 깃발을 올려라."
    ]],
    ["The sealed warrant names {0}. The council chose the harbor; your charge is to break its batteries and take it, not to alter the terms.", ["封印敕令写明{0}。港口由议政会选定；你的职责是摧毁炮台并夺取它，不是更改条款。", "В скреплённой печатью грамоте назван {0}. Гавань избрал совет; вам поручено сокрушить батареи и взять её, а не менять условия.", "La comisión sellada nombra {0}. El consejo escogió el puerto; vuestro cometido es destruir sus baterías y tomarlo, no alterar los términos.", "A comissão selada nomeia {0}. O conselho escolheu o porto; vosso encargo é destruir as baterias e tomá-lo, não alterar os termos.", "封印ある勅許は{0}を名指す。港を選んだのは評議会だ。そなたの任は砲台を破り攻略することで、条件を変えることではない。", "Der versiegelte Auftrag nennt {0}. Der Rat wählte den Hafen; Euer Auftrag ist, seine Batterien zu brechen und ihn zu nehmen, nicht die Bedingungen zu ändern.", "La commission scellée désigne {0}. Le conseil a choisi le port ; votre charge est de briser ses batteries et de le prendre, non de changer les termes.", "Opieczętowane zlecenie wskazuje {0}. Port wybrała rada; macie rozbić jego baterie i go zdobyć, nie zmieniać warunki.", "封印敕令寫明{0}。港口由議政會選定；你的職責是摧毀炮臺並奪取它，不是更改條款。", "봉인된 위임장은 {0}을 지목한다. 항구는 회의가 골랐다. 그대의 임무는 포대를 깨뜨리고 점령하는 것이지 조건을 바꾸는 일이 아니다."]],
    ["The sealed warrant names {0}. The council chose the harbor; your charge is to take it, not to alter the terms.", ["封印敕令写明{0}。港口由议政会选定；你的职责是夺取它，不是更改条款。", "В скреплённой печатью грамоте назван {0}. Гавань избрал совет; вам поручено взять её, а не менять условия.", "La comisión sellada nombra {0}. El consejo escogió el puerto; vuestro cometido es tomarlo, no alterar los términos.", "A comissão selada nomeia {0}. O conselho escolheu o porto; vosso encargo é tomá-lo, não alterar os termos.", "封印ある勅許は{0}を名指す。港を選んだのは評議会だ。そなたの任は攻略することで、条件を変えることではない。", "Der versiegelte Auftrag nennt {0}. Der Rat wählte den Hafen; Euer Auftrag ist, ihn zu nehmen, nicht die Bedingungen zu ändern.", "La commission scellée désigne {0}. Le conseil a choisi le port ; votre charge est de le prendre, non de changer les termes.", "Opieczętowane zlecenie wskazuje {0}. Port wybrała rada; macie go zdobyć, nie zmieniać warunki.", "封印敕令寫明{0}。港口由議政會選定；你的職責是奪取它，不是更改條款。", "봉인된 위임장은 {0}을 지목한다. 항구는 회의가 골랐다. 그대의 임무는 점령하는 것이지 조건을 바꾸는 일이 아니다."]],
    ["Warrant accepted. Capture the independent harbor of {0} for {1}.", ["已接领敕令。为{1}夺取独立港口{0}。", "Грамота принята. Захватите независимую гавань {0} для {1}.", "Comisión aceptada. Tomad el puerto independiente de {0} para {1}.", "Comissão aceita. Tomai o porto independente de {0} para {1}.", "勅許を受けた。{1}のため独立港{0}を攻略せよ。", "Auftrag angenommen. Erobert den unabhängigen Hafen {0} für {1}.", "Commission acceptée. Prenez le port indépendant de {0} pour {1}.", "Zlecenie przyjęte. Zdobądźcie niezależny port {0} dla {1}.", "已接領敕令。為{1}奪取獨立港口{0}。", "위임장을 받았다. {1}을 위해 독립 항구 {0}을 점령하라."]],
    ["We supplied horses and grain for Sahib Giray's campaign. The spoils passed to greater hands before our wagons came home.", ["我们为萨希布·格莱的征战供应马匹与粮食。车队回乡前，战利品已落入权势更大者手中。", "Мы поставляли коней и зерно для похода Сахиба Гирея. Добыча попала в руки знатнее наших прежде, чем вернулись обозы.", "Suministramos caballos y grano para la campaña de Sahib Giray. El botín pasó a manos más poderosas antes de que volvieran nuestros carros.", "Fornecemos cavalos e grão para a campanha de Sahib Giray. O saque passou a mãos maiores antes que nossas carroças voltassem.", "我らはサーヒブ・ギレイの遠征に馬と穀物を供した。荷車が戻る前に、戦利品はより大きな手へ渡った。", "Wir lieferten Pferde und Korn für Sahib Girays Feldzug. Die Beute gelangte in mächtigere Hände, ehe unsere Wagen heimkehrten.", "Nous fournîmes chevaux et grain pour la campagne de Sahib Giray. Le butin passa en de plus grandes mains avant le retour de nos chariots.", "Dostarczyliśmy konie i zboże na wyprawę Sahiba Gireja. Łupy trafiły w możniejsze ręce, nim nasze wozy wróciły.", "我們為薩希布·格萊的征戰供應馬匹與糧食。車隊回鄉前，戰利品已落入權勢更大者手中。", "우리는 사히브 기라이의 원정에 말과 곡물을 댔다. 우리 수레가 돌아오기 전에 전리품은 더 큰 손으로 넘어갔다."]],
    ["Your service is well spoken of, but the council will issue no warrant concerning {0} at present. Return when the campaign has altered.", ["众人都称道你的功劳，但议政会眼下不会颁发涉及{0}的敕令。待战局有变再来。", "О вашей службе говорят с похвалой, но ныне совет не выдаст грамоты касательно {0}. Возвращайтесь, когда ход кампании изменится.", "Vuestros servicios reciben elogios, pero el consejo no expedirá ahora comisión respecto de {0}. Volved cuando cambie la campaña.", "Vossos serviços são louvados, mas o conselho não emitirá agora comissão a respeito de {0}. Voltai quando a campanha mudar.", "そなたの功績は高く評されている。だが今、評議会は{0}に関する勅許を出さぬ。戦況が変われば戻れ。", "Eure Dienste werden gerühmt, doch der Rat wird gegenwärtig keinen Auftrag für {0} erteilen. Kehrt zurück, wenn sich der Feldzug gewandelt hat.", "Vos services sont tenus en haute estime, mais le conseil ne délivrera pour l'heure aucune commission au sujet de {0}. Revenez lorsque la campagne aura changé.", "Wasza służba cieszy się dobrą opinią, lecz rada nie wyda teraz zlecenia dotyczącego {0}. Wróćcie, gdy kampania przybierze inny obrót.", "眾人都稱道你的功勞，但議政會眼下不會頒發涉及{0}的敕令。待戰局有變再來。", "그대의 공적은 높이 평가받고 있다. 그러나 지금 회의는 {0}에 관한 위임장을 내리지 않을 것이다. 전황이 달라지면 다시 오라."]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

function reviewedLocaleOverrides(source, values) {
  if (!Array.isArray(values) || values.length !== LOCALES.length) {
    throw new Error(`Reviewed locale translations are incomplete: ${source}`);
  }
  return Object.freeze(Object.fromEntries(LOCALES.map(({ id }, index) => [id, values[index]])));
}

function reviewedSoundDuesOverrides() {
  const entries = [
    ["{0} SOUND DUES EXEMPTION REVOKED", [
      "{0}：厄勒海峡通行税豁免已撤销", "{0}: ОСВОБОЖДЕНИЕ ОТ ЗУНДСКОЙ ПОШЛИНЫ ОТМЕНЕНО",
      "{0}: EXENCIÓN DEL PEAJE DEL SUND REVOCADA", "{0}: ISENÇÃO DO PEDÁGIO DO SUND REVOGADA",
      "{0}：エーレスンド海峡通行税の免除を撤回", "{0}: SUNDZOLLBEFREIUNG WIDERRUFEN",
      "{0} : EXEMPTION DES DROITS DU SUND RÉVOQUÉE", "{0}: ZWOLNIENIE Z CŁA SUNDZKIEGO COFNIĘTE",
      "{0}：厄勒海峽通行稅豁免已撤銷", "{0}: 외레순 해협 통행세 면제 철회"
    ]],
    ["a treaty privilege allowing our ships to pass the Sound and Belts without toll", [
      "一项条约特权，允许我国船只免税通过厄勒海峡和两条贝尔特海峡",
      "договорная привилегия, позволяющая нашим кораблям проходить Зунд и Бельты без пошлины",
      "un privilegio de tratado que permite a nuestros barcos atravesar el Sund y los Belts sin pagar peaje",
      "um privilégio de tratado que permite aos nossos navios passar pelo Sund e pelos Belts sem pedágio",
      "我が国の船がエーレスンド海峡と二つのベルト海峡を無税で通航できる条約上の特権",
      "ein vertragliches Privileg, das unseren Schiffen die zollfreie Durchfahrt durch den Sund und die Belte erlaubt",
      "un privilège par traité permettant à nos navires de franchir le Sund et les Belts sans péage",
      "przywilej traktatowy pozwalający naszym statkom przepływać przez Sund i Bełty bez cła",
      "一項條約特權，允許我國船隻免稅通過厄勒海峽和兩條貝爾特海峽",
      "우리 선박이 외레순 해협과 두 벨트 해협을 통행세 없이 지날 수 있게 하는 조약상의 특권"
    ]],
    ["an exemption from the Danish Sound Dues", [
      "免缴丹麦厄勒海峡通行税", "освобождение от датской зундской пошлины",
      "una exención del peaje danés del Sund", "uma isenção do pedágio dinamarquês do Sund",
      "デンマークのエーレスンド海峡通行税の免除", "eine Befreiung vom dänischen Sundzoll",
      "une exemption des droits danois du Sund", "zwolnienie z duńskiego cła sundzkiego",
      "免繳丹麥厄勒海峽通行稅", "덴마크 외레순 해협 통행세 면제"
    ]],
    ["free our nation's ships from the Sound Dues", [
      "使我国船只免缴厄勒海峡通行税", "освободить корабли нашей страны от зундской пошлины",
      "librar a los barcos de nuestra nación del peaje del Sund", "isentar os navios da nossa nação do pedágio do Sund",
      "我が国の船をエーレスンド海峡通行税から免除する", "die Schiffe unseres Landes vom Sundzoll befreien",
      "exempter les navires de notre nation des droits du Sund", "zwolnić statki naszego kraju z cła sundzkiego",
      "使我國船隻免繳厄勒海峽通行稅", "우리나라 선박의 외레순 해협 통행세를 면제하다"
    ]],
    ["Heave to! Your passage owes {0} doubloons in Sound Dues. One receipt covers the Sound and both Belts until open sea. Refusal risks Danish guns; payment does not end a war.", [
      "停船！此次通航须缴纳{0}达布隆厄勒海峡通行税。一张收据可通行厄勒海峡及两条贝尔特海峡，直至外海。拒缴将招致丹麦炮火；缴税也不会终止战争。",
      "Лечь в дрейф! За проход причитается {0} дублонов зундской пошлины. Одна квитанция действует в Зунде и обоих Бельтах до открытого моря. Отказ грозит огнём датских пушек; уплата не прекращает войну.",
      "¡Póngase al pairo! Debe {0} doblones por el peaje del Sund. Un solo recibo cubre el Sund y ambos Belts hasta mar abierto. Negarse supone afrontar los cañones daneses; pagar no pone fin a una guerra.",
      "Pare o navio! Sua passagem deve {0} dobrões de pedágio do Sund. Um recibo cobre o Sund e ambos os Belts até o mar aberto. Recusar significa enfrentar os canhões dinamarqueses; o pagamento não encerra uma guerra.",
      "停船せよ！通航にはエーレスンド海峡通行税として{0}ダブロンを納めよ。一枚の領収証で、外海までエーレスンド海峡と二つのベルト海峡を通れる。拒めばデンマークの砲火を受ける。支払っても戦争は終わらない。",
      "Beidrehen! Für die Durchfahrt sind {0} Dublonen Sundzoll fällig. Eine Quittung gilt für den Sund und beide Belte bis zur offenen See. Wer sich weigert, riskiert dänisches Geschützfeuer; die Zahlung beendet keinen Krieg.",
      "Mettez en panne ! Votre passage doit {0} doublons de droits du Sund. Un seul reçu couvre le Sund et les deux Belts jusqu'à la haute mer. Refuser, c'est risquer les canons danois ; payer ne met pas fin à une guerre.",
      "Stać! Za przejście należy się {0} dublonów cła sundzkiego. Jeden kwit obejmuje Sund i oba Bełty aż do otwartego morza. Odmowa grozi ogniem duńskich dział; zapłata nie kończy wojny.",
      "停船！此次通航須繳納{0}達布隆厄勒海峽通行稅。一張收據可通行厄勒海峽及兩條貝爾特海峽，直至外海。拒繳將招致丹麥炮火；繳稅也不會終止戰爭。",
      "정선하라! 통과하려면 외레순 해협 통행세 {0}더블룬을 내야 한다. 영수증 한 장이면 외해까지 외레순 해협과 두 벨트 해협을 모두 통과할 수 있다. 거부하면 덴마크 함포를 맞을 것이며, 납부해도 전쟁은 끝나지 않는다."
    ]],
    ["Sound Dues", [
      "厄勒海峡通行税", "Зундская пошлина", "Peaje del Sund", "Pedágio do Sund",
      "エーレスンド海峡通行税", "Sundzoll", "Droits du Sund", "Cło sundzkie",
      "厄勒海峽通行稅", "외레순 해협 통행세"
    ]],
    ["SOUND DUES", [
      "厄勒海峡通行税", "ЗУНДСКАЯ ПОШЛИНА", "PEAJE DEL SUND", "PEDÁGIO DO SUND",
      "エーレスンド海峡通行税", "SUNDZOLL", "DROITS DU SUND", "CŁO SUNDZKIE",
      "厄勒海峽通行稅", "외레순 해협 통행세"
    ]],
    ["Sound Dues exemption", [
      "厄勒海峡通行税豁免", "Освобождение от зундской пошлины", "Exención del peaje del Sund",
      "Isenção do pedágio do Sund", "エーレスンド海峡通行税の免除", "Sundzollbefreiung",
      "Exemption des droits du Sund", "Zwolnienie z cła sundzkiego", "厄勒海峽通行稅豁免",
      "외레순 해협 통행세 면제"
    ]],
    ["SOUND DUES PAID", [
      "厄勒海峡通行税已缴", "ЗУНДСКАЯ ПОШЛИНА УПЛАЧЕНА", "PEAJE DEL SUND PAGADO",
      "PEDÁGIO DO SUND PAGO", "エーレスンド海峡通行税支払済み", "SUNDZOLL BEZAHLT",
      "DROITS DU SUND PAYÉS", "CŁO SUNDZKIE OPŁACONE", "厄勒海峽通行稅已繳",
      "외레순 해협 통행세 납부"
    ]],
    ["your nation's ships are now exempt from the Sound Dues", [
      "贵国船只现已免缴厄勒海峡通行税", "корабли вашей страны теперь освобождены от зундской пошлины",
      "los barcos de vuestra nación quedan exentos del peaje del Sund", "os navios da sua nação agora estão isentos do pedágio do Sund",
      "貴国の船は今後エーレスンド海峡通行税を免除される", "die Schiffe Eures Landes sind nun vom Sundzoll befreit",
      "les navires de votre nation sont désormais exemptés des droits du Sund", "statki waszego kraju są teraz zwolnione z cła sundzkiego",
      "貴國船隻現已免繳厄勒海峽通行稅", "귀국 선박은 이제 외레순 해협 통행세가 면제된다"
    ]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

function reviewedPlaytesterPolishOverrides() {
  const entries = [
    ["{0} and {1} joined the crew.", [
      "{0}和{1}加入了船员。", "{0} и {1} присоединились к команде.",
      "{0} y {1} se unieron a la tripulación.", "{0} e {1} juntaram-se à tripulação.",
      "{0}と{1}が乗組員に加わった。", "{0} und {1} traten der Mannschaft bei.",
      "{0} et {1} ont rejoint l’équipage.", "{0} i {1} dołączyli do załogi.",
      "{0}和{1}加入了船員。", "{0}와 {1}이(가) 선원으로 합류했습니다."
    ]],
    ["{0}, and {1} joined the crew.", [
      "{0}和{1}加入了船员。", "{0} и {1} присоединились к команде.",
      "{0} y {1} se unieron a la tripulación.", "{0} e {1} juntaram-se à tripulação.",
      "{0}、そして{1}が乗組員に加わった。", "{0} und {1} traten der Mannschaft bei.",
      "{0} et {1} ont rejoint l’équipage.", "{0} i {1} dołączyli do załogi.",
      "{0}和{1}加入了船員。", "{0}와 {1}이(가) 선원으로 합류했습니다."
    ]],
    ["MATCHUP: DANGEROUS", [
      "交战评估：危险", "БОЙ: ОПАСНО", "COMBATE: PELIGROSO", "COMBATE: PERIGOSO",
      "戦力評価：危険", "KAMPF: GEFÄHRLICH", "COMBAT : DANGEREUX", "WALKA: NIEBEZPIECZNA",
      "交戰評估：危險", "교전 평가: 위험"
    ]],
    ["MATCHUP: EVEN", [
      "交战评估：势均力敌", "БОЙ: РАВНЫЕ СИЛЫ", "COMBATE: IGUALADO", "COMBATE: EQUILIBRADO",
      "戦力評価：互角", "KAMPF: AUSGEGLICHEN", "COMBAT : ÉQUILIBRÉ", "WALKA: WYRÓWNANA",
      "交戰評估：勢均力敵", "교전 평가: 대등"
    ]],
    ["MATCHUP: FAVORABLE", [
      "交战评估：有利", "БОЙ: ПРЕИМУЩЕСТВО", "COMBATE: FAVORABLE", "COMBATE: FAVORÁVEL",
      "戦力評価：有利", "KAMPF: GÜNSTIG", "COMBAT : FAVORABLE", "WALKA: KORZYSTNA",
      "交戰評估：有利", "교전 평가: 유리"
    ]],
    ["If wind pins you against a riverbank or coast, hold forward. Your crew begins to haul along the shore, very slowly.", [
      "如果风把你困在河岸或海岸边，按住前进。船员会开始沿岸缓慢拖船。",
      "Если ветер прижал вас к берегу реки или моря, удерживайте движение вперёд. Команда начнёт очень медленно тянуть судно вдоль берега.",
      "Si el viento te inmoviliza contra la ribera o la costa, mantén pulsado avanzar. La tripulación empezará a remolcar el barco muy despacio por la orilla.",
      "Se o vento prender você contra uma margem ou costa, mantenha avançar pressionado. A tripulação começará a puxar o navio bem devagar ao longo da costa.",
      "風で川岸や海岸に押し付けられたら、前進を押し続けてください。乗組員が岸沿いにゆっくり船を曳き始めます。",
      "Wenn der Wind dich an einem Flussufer oder an der Küste festsetzt, halte Vorwärts gedrückt. Deine Mannschaft beginnt, das Schiff sehr langsam am Ufer entlangzuziehen.",
      "Si le vent vous plaque contre une rive ou la côte, maintenez l’avance. Votre équipage commencera à haler très lentement le navire le long du rivage.",
      "Jeśli wiatr przyciśnie cię do brzegu rzeki lub wybrzeża, przytrzymaj ruch naprzód. Załoga zacznie bardzo powoli holować statek wzdłuż brzegu.",
      "如果風把你困在河岸或海岸邊，按住前進。船員會開始沿岸緩慢拖船。",
      "바람 때문에 강둑이나 해안에 갇히면 전진을 누르고 계십시오. 선원들이 해안을 따라 배를 아주 천천히 끌기 시작합니다."
    ]],
    ["Tilt the left stick left and right to turn port and starboard. Hold it forward to sail or row on the current heading.", [
      "左右推动左摇杆可向左舷或右舷转向。向前推住可按当前航向航行或划行。",
      "Наклоняйте левый стик влево и вправо, чтобы поворачивать на левый и правый борт. Удерживайте его вперёд, чтобы идти под парусом или на вёслах прежним курсом.",
      "Inclina el stick izquierdo a izquierda y derecha para virar a babor y estribor. Mantenlo hacia delante para navegar o remar con el rumbo actual.",
      "Incline o analógico esquerdo para a esquerda e a direita para virar a bombordo e estibordo. Mantenha-o para a frente para velejar ou remar no rumo atual.",
      "左スティックを左右に倒すと、取舵・面舵に旋回します。前に倒し続けると、現在の針路で帆走または漕走します。",
      "Bewege den linken Stick nach links und rechts, um nach Backbord und Steuerbord zu drehen. Halte ihn nach vorn, um auf dem aktuellen Kurs zu segeln oder zu rudern.",
      "Inclinez le stick gauche à gauche ou à droite pour virer à bâbord ou à tribord. Maintenez-le vers l’avant pour naviguer ou ramer sur le cap actuel.",
      "Wychylaj le lewy drążek w lewo i prawo, aby skręcać na bakburtę i sterburtę. Przytrzymaj go do przodu, aby żeglować lub wiosłować obecnym kursem.",
      "左右推動左搖桿可向左舷或右舷轉向。向前推住可按目前航向航行或划行。",
      "왼쪽 스틱을 좌우로 기울여 좌현과 우현으로 선회합니다. 앞으로 유지하면 현재 침로로 항해하거나 노를 젓습니다."
    ]],
    ["Use left and right to turn port and starboard. Hold forward to sail or row on the current heading.", [
      "使用左键和右键向左舷或右舷转向。按住前进可按当前航向航行或划行。",
      "Используйте влево и вправо, чтобы поворачивать на левый и правый борт. Удерживайте вперёд, чтобы идти под парусом или на вёслах прежним курсом.",
      "Usa izquierda y derecha para virar a babor y estribor. Mantén avanzar para navegar o remar con el rumbo actual.",
      "Use esquerda e direita para virar a bombordo e estibordo. Mantenha avançar para velejar ou remar no rumo atual.",
      "左右入力で取舵・面舵に旋回します。前進を押し続けると、現在の針路で帆走または漕走します。",
      "Steuere mit links und rechts nach Backbord und Steuerbord. Halte Vorwärts, um auf dem aktuellen Kurs zu segeln oder zu rudern.",
      "Utilisez gauche et droite pour virer à bâbord et à tribord. Maintenez l’avance pour naviguer ou ramer sur le cap actuel.",
      "Używaj lewo i prawo, aby skręcać na bakburtę i sterburtę. Przytrzymaj ruch naprzód, aby żeglować lub wiosłować obecnym kursem.",
      "使用左鍵和右鍵向左舷或右舷轉向。按住前進可按目前航向航行或划行。",
      "왼쪽과 오른쪽으로 좌현과 우현 선회를 합니다. 전진을 누르고 있으면 현재 침로로 항해하거나 노를 젓습니다."
    ]],
    ["VESSEL: {0} / {1}", [
      "船只：{0} / {1}", "СУДНО: {0} / {1}", "NAVÍO: {0} / {1}", "EMBARCAÇÃO: {0} / {1}",
      "船：{0} / {1}", "SCHIFF: {0} / {1}", "NAVIRE : {0} / {1}", "STATEK: {0} / {1}",
      "船隻：{0} / {1}", "선박: {0} / {1}"
    ]],
    ["You have done me a great service. Please accept {0}; it may serve you as well as you served me.", [
      "你为我立下大功。请收下{0}；愿它像你为我效力那样为你效力。",
      "Вы оказали мне большую услугу. Примите {0}; пусть это послужит вам так же верно, как вы послужили мне.",
      "Me habéis prestado un gran servicio. Aceptad {0}; quizá os sirva tan bien como vos me habéis servido.",
      "Prestastes-me um grande serviço. Aceitai {0}; talvez vos sirva tão bem quanto me servistes.",
      "大いに尽くしてくれた。{0}を受け取ってほしい。そなたが私に尽くしたように、これも役立つだろう。",
      "Ihr habt mir einen großen Dienst erwiesen. Nehmt {0} an; möge es Euch so gut dienen, wie Ihr mir gedient habt.",
      "Vous m’avez rendu un grand service. Acceptez {0} ; puisse cela vous servir aussi bien que vous m’avez servi.",
      "Oddaliście mi wielką przysługę. Przyjmijcie {0}; niech służy wam równie dobrze, jak wy mnie.",
      "你為我立下大功。請收下{0}；願它像你為我效力那樣為你效力。",
      "큰 도움을 주셨습니다. {0}을(를) 받아 주십시오. 선장님이 제게 힘이 되었듯 이것도 도움이 되기를 바랍니다."
    ]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

function reviewedCrewOverrides() {
  const entries = [
    ["{0} CREW EXPERIENCE {1}/3", [
      "{0} 船员经验 {1}/3", "{0} ОПЫТ КОМАНДЫ {1}/3", "{0} EXPERIENCIA DE TRIPULACIÓN {1}/3",
      "{0} EXPERIÊNCIA DA TRIPULAÇÃO {1}/3", "{0} 乗組員経験 {1}/3", "{0} MANNSCHAFTSERFAHRUNG {1}/3",
      "{0} EXPÉRIENCE D’ÉQUIPAGE {1}/3", "{0} DOŚWIADCZENIE ZAŁOGI {1}/3", "{0} 船員經驗 {1}/3",
      "{0} 선원 경험 {1}/3"
    ]],
    ["{0} crew muster", [
      "{0} 船员招募", "Набор команды: {0}", "Reclutamiento de tripulación: {0}",
      "Recrutamento de tripulação: {0}", "{0} 乗組員募集", "Mannschaftsmusterung: {0}",
      "Recrutement d’équipage : {0}", "Werbunek załogi: {0}", "{0} 船員招募", "{0} 선원 모집"
    ]],
    ["{0} crew still need to be dismissed.", [
      "仍需遣散 {0} 名船员。", "Нужно уволить ещё {0} членов команды.",
      "Aún hay que despedir a {0} tripulantes.", "Ainda é preciso dispensar {0} tripulantes.",
      "あと{0}人の乗組員を解雇する必要があります。", "Noch {0} Mannschaftsmitglieder müssen entlassen werden.",
      "Il faut encore congédier {0} membres d’équipage.", "Trzeba jeszcze zwolnić {0} członków załogi.",
      "仍需遣散 {0} 名船員。", "선원 {0}명을 더 해고해야 합니다."
    ]],
    ["{0} CREWMATES GAINED EXPERIENCE", [
      "{0} 名船员获得经验", "{0} ЧЛЕНОВ КОМАНДЫ ПОЛУЧИЛИ ОПЫТ", "{0} TRIPULANTES GANARON EXPERIENCIA",
      "{0} TRIPULANTES GANHARAM EXPERIÊNCIA", "乗組員{0}人が経験を積んだ", "{0} BESATZUNGSMITGLIEDER SAMMELTEN ERFAHRUNG",
      "{0} MARINS ONT GAGNÉ DE L’EXPÉRIENCE", "{0} CZŁONKÓW ZAŁOGI ZDOBYŁO DOŚWIADCZENIE",
      "{0} 名船員獲得經驗", "선원 {0}명이 경험을 쌓았습니다"
    ]],
    ["{0} DISMISSED", [
      "已遣散 {0}", "{0} УВОЛЕН", "{0}: DESPEDIDO", "{0} DISPENSADO", "{0}を解雇", "{0} ENTLASSEN",
      "{0} CONGÉDIÉ", "ZWOLNIONO: {0}", "已遣散 {0}", "{0} 해고됨"
    ]],
    ["{0} doubloons required.", [
      "需要 {0} 达布隆。", "Требуется {0} дублонов.", "Se necesitan {0} doblones.",
      "São necessários {0} dobrões.", "{0}ダブロン必要です。", "{0} Dublonen erforderlich.",
      "{0} doublons requis.", "Potrzeba {0} dublonów.", "需要 {0} 達布隆。", "더블룬 {0}개가 필요합니다."
    ]],
    ["{0} joined the crew.", [
      "{0} 加入了船员。", "{0} вступил в команду.", "{0} se unió a la tripulación.",
      "{0} juntou-se à tripulação.", "{0}が乗組員に加わりました。", "{0} ist der Mannschaft beigetreten.",
      "{0} a rejoint l’équipage.", "{0} dołączył do załogi.", "{0} 加入了船員。", "{0}이(가) 선원이 되었습니다."
    ]],
    ["{0} muster", [
      "{0} 招募", "Набор: {0}", "Reclutamiento: {0}", "Recrutamento: {0}", "{0} 募集",
      "Musterung: {0}", "Recrutement : {0}", "Werbunek: {0}", "{0} 招募", "{0} 모집"
    ]],
    ["{0}: {1} crew / {2} guns.", [
      "{0}：{1} 名船员 / {2} 门炮。", "{0}: команда {1} / орудия {2}.",
      "{0}: {1} tripulantes / {2} cañones.", "{0}: {1} tripulantes / {2} canhões.",
      "{0}：乗組員{1}人 / 大砲{2}門。", "{0}: {1} Mann / {2} Kanonen.",
      "{0} : {1} marins / {2} canons.", "{0}: {1} załogi / {2} dział.",
      "{0}：{1} 名船員 / {2} 門砲。", "{0}: 선원 {1}명 / 대포 {2}문."
    ]],
    ["{0}/{1} BERTHS", [
      "铺位 {0}/{1}", "КОЙКИ {0}/{1}", "LITERAS {0}/{1}", "BELICHES {0}/{1}", "寝台 {0}/{1}",
      "KOJEN {0}/{1}", "COUCHETTES {0}/{1}", "KOJE {0}/{1}", "鋪位 {0}/{1}", "침상 {0}/{1}"
    ]],
    ["A CREWMATE GAINED EXPERIENCE", [
      "一名船员获得经验", "ЧЛЕН КОМАНДЫ ПОЛУЧИЛ ОПЫТ", "UN TRIPULANTE GANÓ EXPERIENCIA",
      "UM TRIPULANTE GANHOU EXPERIÊNCIA", "乗組員が経験を積んだ", "EIN BESATZUNGSMITGLIED SAMMELTE ERFAHRUNG",
      "UN MARIN A GAGNÉ DE L’EXPÉRIENCE", "CZŁONEK ZAŁOGI ZDOBYŁ DOŚWIADCZENIE",
      "一名船員獲得經驗", "선원 한 명이 경험을 쌓았습니다"
    ]],
    ["All dismissals undone.", [
      "已撤销所有遣散。", "Все увольнения отменены.", "Se deshicieron todos los despidos.",
      "Todas as dispensas foram desfeitas.", "すべての解雇を取り消しました。", "Alle Entlassungen wurden rückgängig gemacht.",
      "Tous les congédiements ont été annulés.", "Cofnięto wszystkie zwolnienia.",
      "已撤銷所有遣散。", "모든 해고를 되돌렸습니다."
    ]],
    ["Apply loadout", [
      "应用配置", "Применить оснащение", "Aplicar configuración", "Aplicar configuração", "装備を適用",
      "Ausrüstung anwenden", "Appliquer l’équipement", "Zastosuj wyposażenie", "套用配置", "장비 적용"
    ]],
    ["BACK TO CITY", [
      "返回城市", "НАЗАД В ГОРОД", "VOLVER A LA CIUDAD", "VOLTAR À CIDADE", "街へ戻る", "ZURÜCK ZUR STADT",
      "RETOUR EN VILLE", "WRÓĆ DO MIASTA", "返回城市", "도시로 돌아가기"
    ]],
    ["Cancel", [
      "取消", "Отмена", "Cancelar", "Cancelar", "キャンセル", "Abbrechen", "Annuler", "Anuluj", "取消", "취소"
    ]],
    ["CREW DISMISSALS UNDONE", [
      "已撤销船员遣散", "УВОЛЬНЕНИЯ КОМАНДЫ ОТМЕНЕНЫ", "DESPIDOS DE TRIPULACIÓN DESHECHOS",
      "DISPENSAS DA TRIPULAÇÃO DESFEITAS", "乗組員の解雇を取り消した", "MANNSCHAFTSENTLASSUNGEN RÜCKGÄNGIG",
      "CONGÉDIEMENTS ANNULÉS", "COFNIĘTO ZWOLNIENIA ZAŁOGI", "已撤銷船員遣散", "선원 해고 취소됨"
    ]],
    ["CREW MUSTER", [
      "船员招募", "НАБОР КОМАНДЫ", "RECLUTAMIENTO", "RECRUTAMENTO", "乗組員募集", "MANNSCHAFTSMUSTERUNG",
      "RECRUTEMENT D’ÉQUIPAGE", "WERBUNEK ZAŁOGI", "船員招募", "선원 모집"
    ]],
    ["DISMISS", [
      "遣散", "УВОЛИТЬ", "DESPEDIR", "DISPENSAR", "解雇", "ENTLASSEN", "CONGÉDIER", "ZWOLNIJ", "遣散", "해고"
    ]],
    ["Dismiss {0}", [
      "遣散 {0}", "Уволить {0}", "Despedir a {0}", "Dispensar {0}", "{0}を解雇", "{0} entlassen",
      "Congédier {0}", "Zwolnij {0}", "遣散 {0}", "{0} 해고"
    ]],
    ["Dismiss {0} crew before taking this vessel.", [
      "接收此船前请遣散 {0} 名船员。", "Перед переходом на это судно увольте {0} членов команды.",
      "Despedid a {0} tripulantes antes de tomar este buque.", "Dispensai {0} tripulantes antes de assumir esta embarcação.",
      "この船に乗り換える前に乗組員を{0}人解雇してください。", "Entlasst {0} Mannschaftsmitglieder, bevor Ihr dieses Schiff übernehmt.",
      "Congédiez {0} membres d’équipage avant de prendre ce navire.", "Zwolnijcie {0} członków załogi przed przejęciem tego okrętu.",
      "接收此船前請遣散 {0} 名船員。", "이 배를 인수하기 전에 선원 {0}명을 해고하십시오."
    ]],
    ["Dismiss {0} more crewmate{1} for this loadout.", [
      "此配置还需遣散 {0} 名船员{1}。", "Для этого оснащения увольте ещё {0} членов команды{1}.",
      "Despedid a {0} tripulantes más{1} para esta configuración.", "Dispensai mais {0} tripulantes{1} para esta configuração.",
      "この装備にはあと{0}人の乗組員{1}を解雇してください。", "Entlasst für diese Ausrüstung noch {0} Mannschaftsmitglieder{1}.",
      "Congédiez encore {0} membres d’équipage{1} pour cet équipement.", "Zwolnijcie jeszcze {0} członków załogi{1} dla tego wyposażenia.",
      "此配置還需遣散 {0} 名船員{1}。", "이 장비를 위해 선원 {0}명{1}을 더 해고하십시오."
    ]],
    ["Every berth is occupied.", [
      "所有铺位都已占用。", "Все койки заняты.", "Todas las literas están ocupadas.", "Todos os beliches estão ocupados.",
      "すべての寝台が埋まっています。", "Alle Kojen sind belegt.", "Toutes les couchettes sont occupées.",
      "Wszystkie koje są zajęte.", "所有鋪位都已占用。", "모든 침상이 찼습니다."
    ]],
    ["Hire {0} — {1} db", [
      "雇用 {0} — {1} DB", "Нанять {0} — {1} DB", "Contratar a {0} — {1} DB", "Contratar {0} — {1} DB",
      "{0}を雇う — {1} DB", "{0} anheuern — {1} DB", "Engager {0} — {1} DB", "Zatrudnij {0} — {1} DB",
      "雇用 {0} — {1} DB", "{0} 고용 — {1} DB"
    ]],
    ["Hire {0} ({1})", [
      "雇用 {0}（{1}）", "Нанять {0} ({1})", "Contratar a {0} ({1})", "Contratar {0} ({1})", "{0}を雇う（{1}）",
      "{0} anheuern ({1})", "Engager {0} ({1})", "Zatrudnij {0} ({1})", "雇用 {0}（{1}）", "{0} 고용 ({1})"
    ]],
    ["HIRE {0} DB", [
      "雇用 {0} DB", "НАНЯТЬ {0} DB", "CONTRATAR {0} DB", "CONTRATAR {0} DB", "雇う {0} DB",
      "ANHEUERN {0} DB", "ENGAGER {0} DB", "ZATRUDNIJ {0} DB", "雇用 {0} DB", "고용 {0} DB"
    ]],
    ["Hire crew", [
      "雇用船员", "Нанять команду", "Contratar tripulación", "Contratar tripulação", "乗組員を雇う",
      "Mannschaft anheuern", "Engager un équipage", "Zatrudnij załogę", "雇用船員", "선원 고용"
    ]],
    ["No dismissals to undo.", [
      "没有可撤销的遣散。", "Нет увольнений для отмены.", "No hay despidos que deshacer.",
      "Não há dispensas para desfazer.", "取り消す解雇はありません。", "Keine Entlassungen rückgängig zu machen.",
      "Aucun congédiement à annuler.", "Brak zwolnień do cofnięcia.", "沒有可撤銷的遣散。", "되돌릴 해고가 없습니다."
    ]],
    ["No suitable hands are looking for a berth today.", [
      "今天没有合适的水手来找铺位。", "Сегодня подходящих моряков, ищущих койку, нет.",
      "Hoy no hay marineros aptos buscando litera.", "Hoje não há marinheiros aptos procurando beliche.",
      "今日は寝台を求める適任の船乗りはいません。", "Heute sucht kein geeigneter Seemann eine Koje.",
      "Aucun marin convenable ne cherche de couchette aujourd’hui.", "Dziś żaden odpowiedni marynarz nie szuka koi.",
      "今天沒有合適的水手來找鋪位。", "오늘은 침상을 찾는 적당한 선원이 없습니다."
    ]],
    ["REDUCE CREW", [
      "削减船员", "СОКРАТИТЬ КОМАНДУ", "REDUCIR TRIPULACIÓN", "REDUZIR TRIPULAÇÃO", "乗組員を減らす",
      "MANNSCHAFT VERKLEINERN", "RÉDUIRE L’ÉQUIPAGE", "ZMNIEJSZ ZAŁOGĘ", "削減船員", "선원 감축"
    ]],
    ["The crew target is satisfied.", [
      "船员目标已达成。", "Требуемая численность команды достигнута.", "Se alcanzó el objetivo de tripulación.",
      "A meta de tripulação foi atingida.", "乗組員の目標人数を満たしました。", "Die Sollstärke der Mannschaft ist erreicht.",
      "L’effectif visé est atteint.", "Osiągnięto docelową liczebność załogi.", "船員目標已達成。", "목표 선원 수를 채웠습니다."
    ]],
    ["The new crew complement is ready.", [
      "新的船员编制已就绪。", "Новый состав команды готов.", "La nueva dotación está lista.",
      "A nova tripulação está pronta.", "新しい乗組員編成が整いました。", "Die neue Mannschaftsstärke ist bereit.",
      "Le nouvel effectif est prêt.", "Nowy skład załogi jest gotowy.", "新的船員編制已就緒。", "새 선원 구성이 준비되었습니다."
    ]],
    ["These men have offered to join your crew.", [
      "这些人愿意加入你的船员。", "Эти люди предложили вступить в вашу команду.",
      "Estos hombres se han ofrecido a unirse a vuestra tripulación.", "Estes homens se ofereceram para integrar vossa tripulação.",
      "この者たちが乗組員への参加を申し出ています。", "Diese Männer haben angeboten, Eurer Mannschaft beizutreten.",
      "Ces hommes proposent de rejoindre votre équipage.", "Ci ludzie zaoferowali dołączyć do waszej załogi.",
      "這些人願意加入你的船員。", "이들이 선원으로 합류하겠다고 나섰습니다."
    ]],
    ["Undo all", [
      "全部撤销", "Отменить всё", "Deshacer todo", "Desfazer tudo", "すべて取り消す", "Alles rückgängig machen",
      "Tout annuler", "Cofnij wszystko", "全部撤銷", "모두 되돌리기"
    ]],
    ["UNDO ALL", [
      "全部撤销", "ОТМЕНИТЬ ВСЁ", "DESHACER TODO", "DESFAZER TUDO", "すべて取り消す", "ALLES RÜCKGÄNGIG MACHEN",
      "TOUT ANNULER", "COFNIJ WSZYSTKO", "全部撤銷", "모두 되돌리기"
    ]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

function reviewedPortCityOverrides() {
  const entries = [
    ["BIBLE SMUGGLING COMPLETE", ["圣经走私完成", "КОНТРАБАНДА БИБЛИЙ ЗАВЕРШЕНА", "CONTRABANDO DE BIBLIAS COMPLETADO", "CONTRABANDO DE BÍBLIAS CONCLUÍDO", "聖書密輸完了", "BIBELSCHMUGGEL ABGESCHLOSSEN", "CONTREBANDE DE BIBLES TERMINÉE", "PRZEMYT BIBLII ZAKOŃCZONY", "聖經走私完成", "성경 밀수 완료"]],
    ["{0} has trusted readers waiting behind drawn shutters. {1}", [
      "{0}的可靠读者正在紧闭的百叶窗后等候。{1}",
      "В {0} верные читатели ждут за закрытыми ставнями. {1}",
      "En {0}, lectores de confianza esperan tras los postigos cerrados. {1}",
      "Em {0}, leitores de confiança esperam atrás das janelas fechadas. {1}",
      "{0}では信頼できる読者が閉じた鎧戸の奥で待っています。{1}",
      "In {0} warten vertrauenswürdige Leser hinter geschlossenen Fensterläden. {1}",
      "À {0}, des lecteurs sûrs attendent derrière les volets clos. {1}",
      "W {0} zaufani czytelnicy czekają za zamkniętymi okiennicami. {1}",
      "{0}的可靠讀者正在緊閉的百葉窗後等候。{1}",
      "{0}에서는 믿을 만한 독자들이 닫힌 덧문 뒤에서 기다립니다. {1}"
    ]],
    ["These are the last Testaments. Deliver them, Captain, and our work is finished.", [
      "这是最后一批新约。船长，送达之后，我们的差事便告结束。",
      "Это последние Заветы. Доставьте их, капитан, и наш труд завершён.",
      "Estos son los últimos Testamentos. Entregadlos, capitán, y nuestra labor habrá concluido.",
      "Estes são os últimos Testamentos. Entregai-os, capitão, e nosso trabalho estará terminado.",
      "これが最後の新約聖書です。船長、届ければ我々の仕事は終わりです。",
      "Dies sind die letzten Testamente. Liefert sie ab, Kapitän, dann ist unser Werk vollbracht.",
      "Ce sont les derniers Testaments. Livrez-les, capitaine, et notre tâche sera achevée.",
      "To ostatnie Testamenty. Dostarczcie je, kapitanie, a nasza praca dobiegnie końca.",
      "這是最後一批新約。船長，送達之後，我們的差事便告結束。",
      "마지막 신약성경입니다. 선장, 이것들을 전하면 우리의 일은 끝납니다."
    ]],
    ["The last Testaments are delivered, Captain. Our work is finished; I ask no more voyages of you. Did the Bibles change your faith, or only ruin your sleep?", [
      "船长，最后一批新约已经送达。我们的差事结束了，我不再请你远航。圣经改变了你的信仰，还是只扰了你的清梦？",
      "Последние Заветы доставлены, капитан. Наш труд завершён; больше плаваний я не прошу. Библии изменили вашу веру или лишь лишили сна?",
      "Los últimos Testamentos están entregados, capitán. Nuestra labor ha concluido; no os pido más viajes. ¿Las Biblias cambiaron vuestra fe o sólo os quitaron el sueño?",
      "Os últimos Testamentos foram entregues, capitão. Nosso trabalho terminou; não vos peço mais viagens. As Bíblias mudaram vossa fé ou apenas vos tiraram o sono?",
      "船長、最後の新約聖書は届けました。我々の仕事は終わりです。もう航海は頼みません。聖書は信仰を変えましたか、それとも眠りを奪っただけですか？",
      "Die letzten Testamente sind zugestellt, Kapitän. Unser Werk ist vollbracht; ich bitte Euch um keine weiteren Fahrten. Haben die Bibeln Euren Glauben verändert oder nur Euren Schlaf geraubt?",
      "Les derniers Testaments sont livrés, capitaine. Notre tâche est achevée ; je ne vous demande plus de voyages. Les Bibles ont-elles changé votre foi ou seulement troublé votre sommeil ?",
      "Ostatnie Testamenty dostarczono, kapitanie. Nasza praca skończona; nie proszę o więcej rejsów. Biblie zmieniły waszą wiarę czy tylko odebrały sen?",
      "船長，最後一批新約已經送達。我們的差事結束了，我不再請你遠航。聖經改變了你的信仰，還是只擾了你的清夢？",
      "선장, 마지막 신약성경까지 전했습니다. 우리의 일은 끝났으니 더는 항해를 부탁하지 않겠습니다. 성경이 신앙을 바꾸었습니까, 아니면 잠만 빼앗았습니까?"
    ]],

    ["BATTLE OVER", ["战斗结束", "БОЙ ОКОНЧЕН", "BATALLA TERMINADA", "BATALHA ENCERRADA",
      "戦闘終了", "KAMPF BEENDET", "BATAILLE TERMINÉE", "KONIEC BITWY", "戰鬥結束", "전투 종료"]],
    ["Back to city", ["返回城中", "Вернуться в город", "Volver a la ciudad", "Voltar à cidade", "街へ戻る", "Zurück in die Stadt", "Retour en ville", "Wróć do miasta", "返回城中", "도시로 돌아가기"]],
    ["Captain home city", ["船长的故乡城市", "Родной город капитана", "Ciudad natal del capitán", "Cidade natal do capitão", "船長の故郷の都市", "Heimatstadt des Kapitäns", "Ville d’origine du capitaine", "Rodzinne miasto kapitana", "船長的故鄉城市", "선장의 고향 도시"]],
    ["Hold there! The merchant bolts into the crowd as the harbor watch closes around you.", [
      "站住！商人冲进人群逃走，港口守卫从四面围来。",
      "Стой! Купец скрывается в толпе, пока портовая стража смыкает кольцо.",
      "¡Alto! El mercader huye entre la multitud mientras la guardia del puerto os rodea.",
      "Alto! O mercador foge pela multidão enquanto a guarda do porto vos cerca.",
      "待て！商人は人混みへ逃げ込み、港の衛兵がそなたを取り囲む。",
      "Halt! Der Händler flieht in die Menge, während die Hafenwache Euch umstellt.",
      "Halte ! Le marchand s’enfuit dans la foule tandis que la garde du port vous encercle.",
      "Stać! Kupiec znika w tłumie, a straż portowa zaciska wokół was krąg.",
      "站住！商人衝進人群逃走，港口守衛從四面圍來。",
      "멈춰라! 상인은 군중 속으로 달아나고 항구 경비대가 선장을 에워싼다."
    ]],
    ["Inn", ["客栈", "Таверна", "Posada", "Estalagem", "酒場", "Schenke", "Auberge", "Gospoda", "客棧", "여관"]],
    ["Inn city", ["客栈所在城市", "Город таверны", "Ciudad de la posada", "Cidade da estalagem", "酒場のある都市", "Stadt der Schenke", "Ville de l’auberge", "Miasto gospody", "客棧所在城市", "여관이 있는 도시"]],
    ["Port authority", ["港务当局", "Портовые власти", "Autoridad portuaria", "Autoridade portuária", "港務当局", "Hafenbehörde", "Autorité portuaire", "Władze portowe", "港務當局", "항만 당국"]],
    ["Several people look up as you enter.", ["几个人在你进门时抬起头来。", "Несколько человек поднимают глаза, когда вы входите.", "Varias personas alzan la vista cuando entráis.", "Algumas pessoas levantam os olhos quando entrais.", "入ると、何人かが顔を上げる。", "Mehrere Leute blicken auf, als Ihr eintretet.", "Plusieurs personnes lèvent les yeux à votre entrée.", "Kilka osób podnosi wzrok, gdy wchodzicie.", "幾個人在你進門時抬起頭來。", "들어서자 몇 사람이 고개를 든다."]],
    ["Shipyard", ["船坞", "Верфь", "Astillero", "Estaleiro", "造船所", "Werft", "Chantier naval", "Stocznia", "船塢", "조선소"]],
    ["Smith", ["铁匠", "Кузнец", "Herrero", "Ferreiro", "鍛冶屋", "Schmied", "Forgeron", "Kowal", "鐵匠", "대장간"]],
    ["Suspicious merchant", ["可疑商人", "Подозрительный торговец", "Mercader sospechoso", "Mercador suspeito", "怪しい商人", "Verdächtiger Händler", "Marchand suspect", "Podejrzany kupiec", "可疑商人", "수상한 상인"]],
    ["The yard offers several kinds of business.", ["船坞可办理几种事务。", "На верфи ведут несколько видов дел.", "El astillero ofrece varios negocios.", "O estaleiro oferece vários serviços.", "造船所ではいくつかの用件を扱っている。", "Die Werft bietet mehrere Geschäfte an.", "Le chantier propose plusieurs sortes d’affaires.", "Stocznia oferuje kilka rodzajów usług.", "船塢可辦理幾種事務。", "조선소에서는 여러 일을 처리할 수 있다."]],
    ["What business will you place before the authorities?", ["你要向当局办理什么事务？", "Какое дело вы представите властям?", "¿Qué asunto presentaréis ante las autoridades?", "Que assunto apresentareis às autoridades?", "当局にどの用件を申し立てる？", "Welches Anliegen wollt Ihr den Behörden vortragen?", "Quelle affaire porterez-vous devant les autorités ?", "Jaką sprawę przedstawicie władzom?", "你要向當局辦理什麼事務？", "당국에 무슨 용건을 제시하겠는가?"]],
    ["What shall we do aboard?", ["我们在船上做什么？", "Что будем делать на борту?", "¿Qué haremos a bordo?", "O que faremos a bordo?", "船上で何をする？", "Was sollen wir an Bord tun?", "Que ferons-nous à bord ?", "Co zrobimy na pokładzie?", "我們在船上做什麼？", "배에서 무엇을 할까?"]],
    ["Your ship", ["你的船", "Ваш корабль", "Vuestro barco", "Vosso navio", "あなたの船", "Euer Schiff", "Votre navire", "Wasz statek", "你的船", "선장의 배"]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

function reviewedShipyardListingOverrides() {
  const entries = [
    ["I hear there is a pre-owned {0} for sale in {1}.", [
      "听说{1}有一艘二手{0}出售。",
      "Я слышал, что в {1} продаётся подержанный {0}.",
      "He oído que hay un {0} usado a la venta en {1}.",
      "Ouvi dizer que há um {0} usado à venda em {1}.",
      "{1}で中古の{0}が売りに出ていると聞きました。",
      "Ich habe gehört, dass in {1} ein gebrauchter {0} zum Verkauf steht.",
      "J'ai entendu dire qu'un {0} d'occasion était à vendre à {1}.",
      "Słyszałem, że w {1} jest na sprzedaż używany {0}.",
      "聽說{1}有一艘二手{0}出售。",
      "{1}에서 중고 {0}을 판매한다고 들었습니다."
    ]],
    ["I heard a rumour of a pre-owned {0} for sale at {1}.", [
      "我听说{1}有一艘二手{0}出售。",
      "До меня дошли слухи о продаже подержанного {0} в {1}.",
      "He oído el rumor de que hay un {0} usado a la venta en {1}.",
      "Ouvi um boato de que há um {0} usado à venda em {1}.",
      "{1}で中古の{0}が売りに出ているという噂を聞きました。",
      "Ich habe von einem gebrauchten {0} gehört, der in {1} zum Verkauf steht.",
      "J'ai entendu dire qu'un {0} d'occasion était à vendre à {1}.",
      "Słyszałem plotkę o używanym {0} na sprzedaż w {1}.",
      "我聽說{1}有一艘二手{0}出售。",
      "{1}에서 중고 {0}이 판매된다는 소문을 들었습니다."
    ]],
    ["Our shipyard has a pre-owned {0} for sale.", [
      "我们的造船厂有一艘二手{0}出售。",
      "На нашей верфи продаётся подержанный {0}.",
      "Nuestro astillero tiene un {0} usado a la venta.",
      "Nosso estaleiro tem um {0} usado à venda.",
      "当造船所では中古の{0}を販売しています。",
      "Unsere Werft hat einen gebrauchten {0} zum Verkauf.",
      "Notre chantier naval propose un {0} d'occasion à la vente.",
      "Nasza stocznia ma na sprzedaż używany {0}.",
      "我們的造船廠有一艘二手{0}出售。",
      "우리 조선소에서 중고 {0}을 판매하고 있습니다."
    ]],
    ["Shipyard report: a pre-owned {0} is for sale in {1}.", [
      "造船厂报告：{1}有一艘二手{0}出售。",
      "Отчёт верфи: в {1} продаётся подержанный {0}.",
      "Informe del astillero: hay un {0} usado a la venta en {1}.",
      "Relatório do estaleiro: há um {0} usado à venda em {1}.",
      "造船所報告：{1}で中古の{0}が売りに出ています。",
      "Werftbericht: In {1} steht ein gebrauchter {0} zum Verkauf.",
      "Rapport du chantier naval : un {0} d'occasion est en vente à {1}.",
      "Raport stoczni: w {1} jest na sprzedaż używany {0}.",
      "造船廠報告：{1}有一艘二手{0}出售。",
      "조선소 보고서: {1}에서 중고 {0}을 판매합니다."
    ]],
    ["There is profit in news: a pre-owned {0} is for sale in {1}.", [
      "这消息有利可图：{1}有一艘二手{0}出售。",
      "На этой вести можно заработать: в {1} продаётся подержанный {0}.",
      "Hay ganancia en la noticia: hay un {0} usado a la venta en {1}.",
      "Há lucro nessa notícia: há um {0} usado à venda em {1}.",
      "この知らせには商機があります。{1}で中古の{0}が売りに出ています。",
      "Diese Nachricht ist Geld wert: In {1} steht ein gebrauchter {0} zum Verkauf.",
      "Cette nouvelle vaut de l'or : un {0} d'occasion est en vente à {1}.",
      "Ta wieść jest coś warta: w {1} jest na sprzedaż używany {0}.",
      "這消息有利可圖：{1}有一艘二手{0}出售。",
      "돈이 될 소식입니다. {1}에서 중고 {0}을 판매합니다."
    ]],
    ["Word travels ahead of wakes. A pre-owned {0} is for sale in {1}.", [
      "风声传得比船迹还快。{1}有一艘二手{0}出售。",
      "Вести опережают корабельный след. В {1} продаётся подержанный {0}.",
      "Las noticias viajan más rápido que las estelas. Hay un {0} usado a la venta en {1}.",
      "As notícias correm à frente das esteiras. Há um {0} usado à venda em {1}.",
      "噂は船の航跡よりも早く伝わります。{1}で中古の{0}が売りに出ています。",
      "Die Kunde reist schneller als das Kielwasser. In {1} steht ein gebrauchter {0} zum Verkauf.",
      "Les nouvelles voyagent plus vite que les sillages. Un {0} d'occasion est en vente à {1}.",
      "Wieści biegną szybciej niż kilwater. W {1} jest na sprzedaż używany {0}.",
      "風聲傳得比船跡還快。{1}有一艘二手{0}出售。",
      "소식은 배의 항적보다 앞서 전해집니다. {1}에서 중고 {0}을 판매합니다."
    ]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

function reviewedWarLoanOverrides() {
  const entries = [
    ["{0} awaits your answer. Will you furnish the million?", [
      "{0}静候答复。你可愿筹足这一百万？", "{0} ожидает вашего ответа. Дадите ли вы миллион?", "{0} aguarda vuestra respuesta. ¿Entregaréis el millón?", "{0} aguarda vossa resposta. Entregareis o milhão?", "{0}はそなたの返答を待っている。百万を用立てるか？", "{0} erwartet Eure Antwort. Werdet Ihr die Million aufbringen?", "{0} attend votre réponse. Fournirez-vous le million ?", "{0} czeka na waszą odpowiedź. Wyłożycie milion?", "{0}靜候答覆。你可願籌足這一百萬？", "{0}께서 그대의 답을 기다리신다. 백만을 내놓겠는가?"
    ]],
    ["{0} commands me to lay a grave request before you. The war with {1} has pressed the treasury sorely.", [
      "{0}命我向你陈一桩要事。与{1}的战事已使国库不堪重负。", "{0} велит мне изложить вам важную просьбу. Война с державой {1} тяжко истощила казну.", "{0} me manda presentaros una petición de peso. La guerra con {1} ha apurado gravemente el tesoro.", "{0} manda-me apresentar-vos um grave pedido. A guerra com {1} afligiu duramente o tesouro.", "{0}より、そなたに大事の願いを申し渡すよう命を受けた。{1}との戦で国庫はひどく窮している。", "{0} befiehlt mir, Euch ein schwerwiegendes Ersuchen vorzutragen. Der Krieg mit {1} hat die Schatzkammer hart bedrängt.", "{0} m'ordonne de vous soumettre une grave requête. La guerre avec {1} a fort éprouvé le trésor.", "{0} każe mi przedłożyć wam ważką prośbę. Wojna z państwem {1} wielce nadwyrężyła skarb.", "{0}命我向你陳一樁要事。與{1}的戰事已使國庫不堪重負。", "{0}께서 중한 청을 그대 앞에 아뢰라 명하셨다. {1}과의 전쟁으로 국고가 몹시 궁해졌다."
    ]],
    ["{0} war-loan advance", [
      "向{0}垫付战款", "Военная ссуда державе {0}", "Anticipo de guerra a {0}", "Adiantamento de guerra a {0}", "{0}への戦費貸付", "Kriegskredit an {0}", "Avance de guerre à {0}", "Pożyczka wojenna dla państwa {0}", "向{0}墊付戰款", "{0} 전쟁 자금 선대"
    ]],
    ["{0} War-loan Indenture", [
      "{0}战款契据", "Договор военной ссуды державе {0}", "Escritura de préstamo de guerra de {0}", "Escritura de empréstimo de guerra de {0}", "{0}戦費借款証書", "Kriegskredit-Urkunde von {0}", "Acte de prêt de guerre de {0}", "Indenter pożyczki wojennej państwa {0}", "{0}戰款契據", "{0} 전쟁 차관 증서"
    ]],
    ["{0} war-loan repayment", [
      "{0}偿还战款", "Возврат военной ссуды державой {0}", "Reembolso del préstamo de guerra de {0}", "Pagamento do empréstimo de guerra de {0}", "{0}戦費借款返済", "Rückzahlung des Kriegskredits durch {0}", "Remboursement du prêt de guerre par {0}", "Spłata pożyczki wojennej przez państwo {0}", "{0}償還戰款", "{0} 전쟁 차관 상환"
    ]],
    ["{0}'s treasury can answer neither principal nor premium. The war has exhausted its customs and credit, and the bond is forfeit.", [
      "{0}的国库无力清偿本利。战事已耗尽关税与国信，此券就此作废。", "Казна {0} не может уплатить ни основную сумму, ни прибыль. Война истощила таможенные сборы и кредит державы, и обязательство утратило силу.", "El tesoro de {0} no puede responder ni del principal ni del premio. La guerra ha agotado sus aduanas y su crédito, y el título queda perdido.", "O tesouro de {0} não pode responder pelo principal nem pelo prêmio. A guerra esgotou suas alfândegas e seu crédito, e o título fica perdido.", "{0}の国庫は元金も利も支払えぬ。戦で関税収入も信用も尽き、この証文は失効した。", "{0}s Schatzkammer kann weder Kapital noch Aufgeld begleichen. Der Krieg hat Zölle und Kredit erschöpft; die Schuldverschreibung ist verfallen.", "Le trésor de {0} ne peut répondre ni du principal ni de la prime. La guerre a épuisé ses douanes et son crédit, et l'obligation est perdue.", "Skarb państwa {0} nie może uiścić ani kapitału, ani premii. Wojna wyczerpała jego cła i kredyt, przeto oblig przepada.", "{0}的國庫無力清償本利。戰事已耗盡關稅與國信，此券就此作廢。", "{0}의 국고는 원금도 이문도 갚을 수 없다. 전쟁으로 관세 수입과 신용이 다하여 채권은 몰수된다."
    ]],
    ["A sealed advance of {0} doubloons for the war with {1}. {2}", [
      "为对{1}之战封印垫付{0}达布隆。{2}", "Скреплённая печатью ссуда в {0} дублонов на войну с державой {1}. {2}", "Un anticipo sellado de {0} doblones para la guerra con {1}. {2}", "Um adiantamento selado de {0} dobrões para a guerra com {1}. {2}", "{1}との戦のため、封印のもと{0}ダブロンを貸し付けた。{2}", "Ein besiegelter Vorschuss von {0} Dublonen für den Krieg mit {1}. {2}", "Une avance scellée de {0} doublons pour la guerre avec {1}. {2}", "Opieczętowana pożyczka {0} dublonów na wojnę z państwem {1}. {2}", "為對{1}之戰封印墊付{0}達布隆。{2}", "{1}과의 전쟁을 위해 봉인 아래 {0}더블룬을 선대했다. {2}"
    ]],
    ["ADVANCE 1,000,000 DB", [
      "垫付 1,000,000 DB", "ДАТЬ 1 000 000 ДБ", "ENTREGAR 1.000.000 DB", "ADIANTAR 1.000.000 DB", "1,000,000 DBを用立てる", "1.000.000 DB VORSCHIESSEN", "AVANCER 1 000 000 DB", "WYŁOŻYĆ 1 000 000 DB", "墊付 1,000,000 DB", "1,000,000 DB를 선대한다"
    ]],
    ["Advance one million doubloons under seal. At victory—or at an even peace if the treasury remains answerable—it shall return twelve hundred thousand. If defeat breaks its credit, the loss is yours.", [
      "请在封印契据下垫付一百万达布隆。若我军赢得有利和约，或议和后国库尚能清偿此券，国库便归还一百二十万；若战败使国信破产，亏损由你承担。", "Дайте под печать миллион дублонов. Если наше оружие добьётся выгодного мира — или если после мира казна сможет отвечать по обязательству, — она возвратит миллион двести тысяч. Если поражение сокрушит её кредит, убыток будет вашим.", "Adelantad un millón de doblones bajo sello. Si nuestras armas obtienen una paz ventajosa, o si hecha la paz el tesoro aún puede responder de su obligación, devolverá un millón doscientos mil. Si la derrota quiebra su crédito, la pérdida será vuestra.", "Adiantai um milhão de dobrões sob selo. Se nossas armas obtiverem uma paz vantajosa, ou se feita a paz o tesouro ainda puder responder por sua obrigação, devolverá um milhão e duzentos mil. Se a derrota quebrar seu crédito, a perda será vossa.", "封印のもと百万ダブロンを用立てよ。我らの軍が有利な講和を得るか、講和の後も国庫が証文に応じうるなら、百二十万を返す。敗北で国の信用が潰えれば、損はそなたが負う。", "Streckt unter Siegel eine Million Dublonen vor. Erringen unsere Waffen einen vorteilhaften Frieden oder kann die Schatzkammer nach dem Frieden noch für ihre Schuld einstehen, zahlt sie eine Million zweihunderttausend zurück. Bricht die Niederlage ihren Kredit, tragt Ihr den Verlust.", "Avancez sous sceau un million de doublons. Si nos armes obtiennent une paix avantageuse, ou si la paix laisse encore au trésor de quoi répondre de son obligation, il en rendra un million deux cent mille. Si la défaite ruine son crédit, la perte sera vôtre.", "Wyłóżcie pod pieczęcią milion dublonów. Jeśli nasze wojska uzyskają korzystny pokój albo jeśli po zawarciu pokoju skarb zdoła jeszcze odpowiedzieć za swój oblig, zwróci milion dwieście tysięcy. Jeśli klęska złamie jego kredyt, strata będzie wasza.", "請在封印契據下墊付一百萬達布隆。若我軍贏得有利和約，或議和後國庫尚能清償此券，國庫便歸還一百二十萬；若戰敗使國信破產，虧損由你承擔。", "봉인 아래 백만 더블룬을 선대하라. 우리 군대가 유리한 화평을 얻거나 강화 뒤에도 국고가 채권을 감당할 수 있다면 백이십만을 돌려주겠다. 패배로 나라의 신용이 무너지면 손실은 그대의 몫이다."
    ]],
    ["By {0}'s seal, peace is made and the treasury stands answerable. Here are twelve hundred thousand doubloons, principal and premium, in full discharge of your indenture.", [
      "奉{0}之印，和议已成，国库尚能清偿。现付一百二十万达布隆，本利俱清，以全数解除契据。", "Печатью {0} удостоверено: мир заключён, и казна отвечает по долгу. Вот миллион двести тысяч дублонов — основная сумма и прибыль — в полное погашение вашего договора.", "Por el sello de {0}, la paz está hecha y el tesoro puede responder. He aquí un millón doscientos mil doblones, principal y premio, en entero descargo de vuestra escritura.", "Pelo selo de {0}, a paz está feita e o tesouro pode responder. Eis um milhão e duzentos mil dobrões, principal e prêmio, para plena quitação de vossa escritura.", "{0}の印により告げる。講和は成り、国庫は債に応じうる。元金と利を合わせた百二十万ダブロンをもって、そなたの証書を全て償還する。", "Unter {0}s Siegel: Der Frieden ist geschlossen, und die Schatzkammer steht für die Schuld ein. Hier sind eine Million zweihunderttausend Dublonen, Kapital und Aufgeld, zur vollständigen Ablösung Eurer Urkunde.", "Sous le sceau de {0}, la paix est faite et le trésor peut répondre de sa dette. Voici un million deux cent mille doublons, principal et prime, en plein acquit de votre acte.", "Pod pieczęcią {0}: pokój został zawarty, a skarb może odpowiedzieć za dług. Oto milion dwieście tysięcy dublonów, kapitał i premia, na zupełne umorzenie waszego indenteru.", "奉{0}之印，和議已成，國庫尚能清償。現付一百二十萬達布隆，本利俱清，以全數解除契據。", "{0}의 인장으로 알린다. 강화가 이루어졌고 국고는 채무를 감당할 수 있다. 원금과 이문을 합한 백이십만 더블룬으로 그대의 증서를 모두 갚는다."
    ]],
    ["I cannot furnish the whole million today. Keep the writing ready until I return.", [
      "今日我筹不齐一百万。请将契据留好，待我归来。", "Сегодня я не могу собрать весь миллион. Держите договор наготове до моего возвращения.", "Hoy no puedo reunir el millón entero. Guardad dispuesta la escritura hasta mi regreso.", "Hoje não posso reunir o milhão inteiro. Conservai a escritura pronta até meu regresso.", "今日は百万を全て用立てられぬ。戻るまで証書を整えておけ。", "Heute kann ich die ganze Million nicht aufbringen. Haltet die Urkunde bis zu meiner Rückkehr bereit.", "Je ne puis fournir le million entier aujourd'hui. Gardez l'acte prêt jusqu'à mon retour.", "Nie zdołam dziś wyłożyć całego miliona. Zachowajcie pismo gotowe do mego powrotu.", "今日我籌不齊一百萬。請將契據留好，待我歸來。", "오늘은 백만을 온전히 마련할 수 없소. 내가 돌아올 때까지 문서를 준비해 두시오."
    ]],
    ["I will not hazard my fortune upon this war.", [
      "我不愿拿家财赌这场战争。", "Я не стану рисковать состоянием ради этой войны.", "No arriesgaré mi fortuna en esta guerra.", "Não arriscarei minha fortuna nesta guerra.", "この戦に我が財を賭けるつもりはない。", "Ich werde mein Vermögen nicht an diesen Krieg wagen.", "Je ne hasarderai point ma fortune sur cette guerre.", "Nie narażę fortuny na tę wojnę.", "我不願拿家財賭這場戰爭。", "이 전쟁에 내 재산을 걸지는 않겠소."
    ]],
    ["It shall remain in my coffer while the war endures.", [
      "只要战事未休，契据便留在我的匣中。", "Договор останется в моём ларце, пока длится война.", "Permanecerá en mi cofre mientras dure la guerra.", "Permanecerá em meu cofre enquanto durar a guerra.", "戦が続く限り、証書はこの箱に納めておこう。", "Solange der Krieg währt, bleibt sie in meiner Truhe.", "Il demeurera dans mon coffre tant que durera la guerre.", "Pozostanie w mojej skrzyni, póki trwa wojna.", "只要戰事未休，契據便留在我的匣中。", "전쟁이 계속되는 동안 내 궤에 보관하겠소."
    ]],
    ["Payable at {0} doubloons upon victory, or upon an even peace if the sovereign's treasury remains answerable.", [
      "若君主获胜，应付{0}达布隆；若议和不分胜负而国库尚能清偿，亦同。", "Подлежит выплате в размере {0} дублонов при победе либо при равном мире, если государева казна ещё способна отвечать по долгу.", "Pagadero a {0} doblones en caso de victoria, o tras una paz igual si el tesoro del soberano aún puede responder.", "Pagável em {0} dobrões em caso de vitória, ou após uma paz sem vencedor se o tesouro do soberano ainda puder responder.", "勝利の時、または勝敗なき講和でも君主の国庫がなお債に応じうる時は、{0}ダブロンを支払う。", "Zahlbar mit {0} Dublonen bei Sieg oder bei einem Frieden ohne Sieger, sofern die Schatzkammer des Herrschers noch für die Schuld einstehen kann.", "Payable à hauteur de {0} doublons en cas de victoire, ou après une paix égale si le trésor du souverain peut encore répondre de sa dette.", "Płatne w kwocie {0} dublonów po zwycięstwie albo po równym pokoju, jeśli skarb władcy zdoła jeszcze odpowiedzieć za dług.", "若君主獲勝，應付{0}達布隆；若議和不分勝負而國庫尚能清償，亦同。", "승리했을 때, 또는 승패 없는 강화 뒤에도 군주의 국고가 채무를 감당할 수 있을 때 {0}더블룬을 지급한다."
    ]],
    ["REFUSE THE LOAN", [
      "拒绝借款", "ОТКАЗАТЬ В ССУДЕ", "REHUSAR EL PRÉSTAMO", "RECUSAR O EMPRÉSTIMO", "借款を断る", "DEN KREDIT VERWEIGERN", "REFUSER LE PRÊT", "ODMÓWIĆ POŻYCZKI", "拒絕借款", "차관을 거절한다"
    ]],
    ["RETURN WITH THE FULL SUM", [
      "筹齐全款再来", "ВЕРНУТЬСЯ СО ВСЕЙ СУММОЙ", "VOLVER CON LA SUMA ENTERA", "VOLTAR COM A SOMA INTEIRA", "全額を携えて戻る", "MIT DER GANZEN SUMME ZURÜCKKEHREN", "REVENIR AVEC LA SOMME ENTIÈRE", "WRÓCIĆ Z PEŁNĄ SUMĄ", "籌齊全款再來", "전액을 마련해 돌아온다"
    ]],
    ["SOVEREIGN WAR LOAN", [
      "君主战款", "ГОСУДАРЕВА ВОЕННАЯ ССУДА", "PRÉSTAMO DE GUERRA SOBERANO", "EMPRÉSTIMO DE GUERRA SOBERANO", "君主戦費借款", "HERRSCHERLICHER KRIEGSKREDIT", "PRÊT DE GUERRE SOUVERAIN", "POŻYCZKA WOJENNA WŁADCY", "君主戰款", "군주 전쟁 차관"
    ]],
    ["The named war ended with the sovereign's treasury unable to answer the bond.", [
      "契据所载之战已休，而君主国库无力清偿此券。", "Названная война окончилась, но государева казна не может отвечать по обязательству.", "La guerra nombrada terminó sin que el tesoro del soberano pueda responder del título.", "A guerra nomeada terminou sem que o tesouro do soberano possa responder pelo título.", "記載の戦は終わったが、君主の国庫は証文に応じることができない。", "Der genannte Krieg endete, doch die Schatzkammer des Herrschers kann für die Schuldverschreibung nicht einstehen.", "La guerre désignée s'est achevée sans que le trésor du souverain puisse répondre de l'obligation.", "Wymieniona wojna dobiegła końca, lecz skarb władcy nie może odpowiedzieć za oblig.", "契據所載之戰已休，而君主國庫無力清償此券。", "명시된 전쟁이 끝났으나 군주의 국고는 채권을 감당할 수 없다."
    ]],
    ["The treasury has counted your million and sealed the indenture. Hulls shall be bought where our shipwrights offer them, and the ready squadron sails against the enemy.", [
      "国库已点清你的一百万，并封印契据。我国船匠何处有船壳可售，便从何处购取；现有舰队即刻驶向敌境。", "Казна пересчитала ваш миллион и скрепила договор печатью. Корпуса будут куплены там, где их предложат наши корабелы, а готовая эскадра уже идёт на врага.", "El tesoro ha contado vuestro millón y sellado la escritura. Se comprarán cascos allí donde los ofrezcan nuestros constructores, y la escuadra dispuesta zarpa contra el enemigo.", "O tesouro contou vosso milhão e selou a escritura. Cascos serão comprados onde nossos mestres os oferecerem, e a esquadra pronta navega contra o inimigo.", "国庫はそなたの百万を数え、証書に印を押した。船殻は我らの造船所で売りに出された所から買い入れ、出撃できる艦隊は敵へ向かう。", "Die Schatzkammer hat Eure Million gezählt und die Urkunde besiegelt. Rümpfe werden gekauft, wo unsere Schiffbauer sie anbieten, und das bereite Geschwader segelt gegen den Feind.", "Le trésor a compté votre million et scellé l'acte. Des coques seront achetées là où nos charpentiers les offriront, et l'escadre prête fait voile contre l'ennemi.", "Skarb przeliczył wasz milion i opieczętował indenter. Kadłuby będą kupowane tam, gdzie wystawią je nasi szkutnicy, a gotowa eskadra rusza przeciw nieprzyjacielowi.", "國庫已點清你的一百萬，並封印契據。我國船匠何處有船殼可售，便從何處購取；現有艦隊即刻駛向敵境。", "국고가 그대의 백만을 세고 증서에 인장을 찍었다. 우리 조선공이 선체를 내놓는 곳에서 사들이고, 준비된 함대는 적을 향해 출항할 것이다."
    ]],
    ["The treasury owes {0} doubloons.", [
      "国库应付{0}达布隆。", "Казна должна {0} дублонов.", "El tesoro debe {0} doblones.", "O tesouro deve {0} dobrões.", "国庫は{0}ダブロンを支払う義務がある。", "Die Schatzkammer schuldet {0} Dublonen.", "Le trésor doit {0} doublons.", "Skarb winien jest {0} dublonów.", "國庫應付{0}達布隆。", "국고가 {0}더블룬을 빚지고 있다."
    ]],
    ["Then I shall return the unsigned indenture to the treasury.", [
      "那么，我便将未签的契据交还国库。", "Тогда я верну неподписанный договор в казну.", "Entonces devolveré al tesoro la escritura sin firmar.", "Então devolverei ao tesouro a escritura sem assinatura.", "では、署名のない証書を国庫へ戻そう。", "Dann werde ich die ununterzeichnete Urkunde der Schatzkammer zurückgeben.", "Alors je rendrai au trésor l'acte non signé.", "Zatem zwrócę skarbowi niepodpisany indenter.", "那麼，我便將未簽的契據交還國庫。", "그러면 서명하지 않은 증서를 국고에 돌려놓겠소."
    ]],
    ["WAR LOAN ADVANCED: 1,000,000 DB", [
      "已垫付战款：1,000,000 DB", "ВОЕННАЯ ССУДА ВЫДАНА: 1 000 000 ДБ", "PRÉSTAMO DE GUERRA ENTREGADO: 1.000.000 DB", "EMPRÉSTIMO DE GUERRA ENTREGUE: 1.000.000 DB", "戦費借款：1,000,000 DB", "KRIEGSKREDIT GEWÄHRT: 1.000.000 DB", "PRÊT DE GUERRE AVANCÉ : 1 000 000 DB", "UDZIELONO POŻYCZKI WOJENNEJ: 1 000 000 DB", "已墊付戰款：1,000,000 DB", "전쟁 차관 선대: 1,000,000 DB"
    ]],
    ["WAR LOAN FORFEIT", [
      "战款契据作废", "ВОЕННАЯ ССУДА УТРАЧЕНА", "PRÉSTAMO DE GUERRA PERDIDO", "EMPRÉSTIMO DE GUERRA PERDIDO", "戦費借款は失効", "KRIEGSKREDIT VERFALLEN", "PRÊT DE GUERRE PERDU", "POŻYCZKA WOJENNA PRZEPADŁA", "戰款契據作廢", "전쟁 차관 몰수"
    ]],
    ["WAR LOAN REPAID: 1,200,000 DB", [
      "战款已偿还：1,200,000 DB", "ВОЕННАЯ ССУДА ВОЗВРАЩЕНА: 1 200 000 ДБ", "PRÉSTAMO DE GUERRA PAGADO: 1.200.000 DB", "EMPRÉSTIMO DE GUERRA PAGO: 1.200.000 DB", "戦費借款返済：1,200,000 DB", "KRIEGSKREDIT GETILGT: 1.200.000 DB", "PRÊT DE GUERRE REMBOURSÉ : 1 200 000 DB", "SPŁACONO POŻYCZKĘ WOJENNĄ: 1 200 000 DB", "戰款已償還：1,200,000 DB", "전쟁 차관 상환: 1,200,000 DB"
    ]],
    ["WAR LOST: THE LOAN WILL NOT BE PAID", [
      "战败：借款不予偿还", "ВОЙНА ПРОИГРАНА: ССУДА НЕ БУДЕТ ВОЗВРАЩЕНА", "GUERRA PERDIDA: EL PRÉSTAMO NO SERÁ PAGADO", "GUERRA PERDIDA: O EMPRÉSTIMO NÃO SERÁ PAGO", "敗戦：借款は返済されない", "KRIEG VERLOREN: DER KREDIT WIRD NICHT GETILGT", "GUERRE PERDUE : LE PRÊT NE SERA PAS REMBOURSÉ", "WOJNA PRZEGRANA: POŻYCZKA NIE ZOSTANIE SPŁACONA", "戰敗：借款不予償還", "패전: 차관은 갚지 않는다"
    ]],
    ["PEACE CONCLUDED: 1,200,000 DB AWAITS AT COURT", [
      "议和告成：宫廷备有1,200,000 DB", "МИР ЗАКЛЮЧЁН: 1 200 000 ДБ ЖДУТ ПРИ ДВОРЕ", "PAZ SELLADA: 1.200.000 DB AGUARDAN EN LA CORTE", "PAZ FIRMADA: 1.200.000 DB AGUARDAM NA CORTE", "講和成立：宮廷に1,200,000 DBあり", "FRIEDEN GESCHLOSSEN: 1.200.000 DB WARTEN AM HOF", "PAIX CONCLUE : 1 200 000 DB VOUS ATTENDENT À LA COUR", "POKÓJ ZAWARTY: 1 200 000 DB CZEKA NA DWORZE", "議和告成：宮廷備有1,200,000 DB", "강화 성립: 궁정에 1,200,000 DB가 기다린다"
    ]],
    ["PEACE CONCLUDED: COURT OFFERS CUSTOMS SECURITY", [
      "议和告成：宫廷提出关税担保", "МИР ЗАКЛЮЧЁН: ДВОР ПРЕДЛАГАЕТ В ЗАЛОГ ТАМОЖЕННЫЕ СБОРЫ", "PAZ SELLADA: LA CORTE OFRECE LAS ADUANAS EN GARANTÍA", "PAZ FIRMADA: A CORTE OFERECE AS ALFÂNDEGAS EM GARANTIA", "講和成立：宮廷が関税を担保に供する", "FRIEDEN GESCHLOSSEN: DER HOF BIETET ZÖLLE ALS SICHERHEIT", "PAIX CONCLUE : LA COUR OFFRE LES DOUANES EN GARANTIE", "POKÓJ ZAWARTY: DWÓR OFERUJE CŁA JAKO ZABEZPIECZENIE", "議和告成：宮廷提出關稅擔保", "강화 성립: 궁정이 관세를 담보로 내놓는다"
    ]],
    ["War with {0}", [
      "与{0}之战", "Война с державой {0}", "Guerra con {0}", "Guerra com {0}", "{0}との戦", "Krieg mit {0}", "Guerre avec {0}", "Wojna z państwem {0}", "與{0}之戰", "{0}과의 전쟁"
    ]],
    ["WAR WON: 1,200,000 DB AWAITS AT COURT", [
      "战胜：1,200,000 DB 已在宫廷备妥", "ВОЙНА ВЫИГРАНА: 1 200 000 ДБ ЖДУТ ПРИ ДВОРЕ", "GUERRA GANADA: 1.200.000 DB AGUARDAN EN LA CORTE", "GUERRA VENCIDA: 1.200.000 DB AGUARDAM NA CORTE", "勝戦：宮廷に1,200,000 DBあり", "KRIEG GEWONNEN: 1.200.000 DB WARTEN AM HOF", "GUERRE GAGNÉE : 1 200 000 DB VOUS ATTENDENT À LA COUR", "WOJNA WYGRANA: 1 200 000 DB CZEKA NA DWORZE", "戰勝：1,200,000 DB 已在宮廷備妥", "승전: 궁정에 1,200,000 DB가 기다린다"
    ]],
    ["WITHHOLD THE MONEY", [
      "不予出资", "НЕ ДАВАТЬ ДЕНЕГ", "RETENER EL DINERO", "RETER O DINHEIRO", "金を出さない", "DAS GELD VERWEIGERN", "REFUSER L'ARGENT", "WSTRZYMAĆ PIENIĄDZE", "不予出資", "돈을 내놓지 않는다"
    ]],
    ["{0} Customs Assignment", [
      "{0}关税让渡契据", "Уступка таможенных сборов: {0}", "Cesión de aduanas de {0}", "Cessão das alfândegas de {0}", "{0}関税譲渡証書", "{0} Zollabtretung", "Cession des douanes de {0}", "Cesja ceł: {0}", "{0}關稅讓渡契據", "{0} 관세 양도 증서"
    ]],
    ["{0} customs have gathered {1} of {2} doubloons.", [
      "{0}关税已收得{2}达布隆中的{1}。", "Таможня в {0} собрала {1} из {2} дублонов.", "Las aduanas de {0} han reunido {1} de {2} doblones.", "As alfândegas de {0} arrecadaram {1} de {2} dobrões.", "{0}の関税から{2}ダブロン中{1}が集まった。", "Die Zölle von {0} haben {1} von {2} Dublonen eingebracht.", "Les douanes de {0} ont produit {1} des {2} doublons.", "Cła w {0} przyniosły {1} z {2} dublonów.", "{0}關稅已收得{2}達布隆中的{1}。", "{0} 관세에서 {2}더블룬 중 {1}을 거두었다."
    ]],
    ["{0}'s treasury cannot discharge your bond in ready coin. The war has left its chests bare, though the realm yet stands.", [
      "{0}的国库无现银清偿你的契据。战事虽未倾覆邦国，却已耗空府库。", "Казна {0} не может погасить ваше обязательство звонкой монетой. Война опустошила сундуки, хотя держава ещё стоит.", "El tesoro de {0} no puede descargar vuestro título en moneda contante. La guerra ha dejado vacíos sus cofres, aunque el reino aún se sostiene.", "O tesouro de {0} não pode quitar vosso título em moeda corrente. A guerra deixou vazios os cofres, embora o reino ainda permaneça.", "{0}の国庫には、そなたの証文を現金で償う余裕がない。国はなお立つが、戦で金庫は空となった。", "{0}s Schatzkammer kann Eure Schuldverschreibung nicht in barem Geld ablösen. Der Krieg hat ihre Truhen geleert, obgleich das Reich noch besteht.", "Le trésor de {0} ne peut acquitter votre obligation en monnaie sonnante. La guerre a vidé ses coffres, quoique le royaume demeure debout.", "Skarb państwa {0} nie zdoła wykupić waszego obligu gotową monetą. Wojna opróżniła skrzynie, choć państwo wciąż stoi.", "{0}的國庫無現銀清償你的契據。戰事雖未傾覆邦國，卻已耗空府庫。", "{0}의 국고는 그대의 채권을 현금으로 갚을 수 없소. 나라는 아직 서 있으나 전쟁으로 궤가 비었소."
    ]],
    ["ACCEPT THE CUSTOMS ASSIGNMENT", [
      "接纳关税让渡", "ПРИНЯТЬ УСТУПКУ ТАМОЖЕННЫХ СБОРОВ", "ACEPTAR LA CESIÓN DE ADUANAS", "ACEITAR A CESSÃO DAS ALFÂNDEGAS", "関税譲渡を受ける", "DIE ZOLLABTRETUNG ANNEHMEN", "ACCEPTER LA CESSION DES DOUANES", "PRZYJĄĆ CESJĘ CEŁ", "接納關稅讓渡", "관세 양도를 받는다"
    ]],
    ["By the sovereign's seal, the customs of {0} are offered until twelve hundred thousand doubloons have answered your indenture.", [
      "奉君主封印，今以{0}关税相抵，直至一百二十万达布隆足数清偿你的契据。", "Государевой печатью вам уступаются сборы таможни {0}, пока по вашему договору не будет уплачено миллион двести тысяч дублонов.", "Por el sello del soberano, se os ofrecen las aduanas de {0} hasta que un millón doscientos mil doblones hayan satisfecho vuestra escritura.", "Pelo selo do soberano, são-vos oferecidas as alfândegas de {0} até que um milhão e duzentos mil dobrões satisfaçam vossa escritura.", "君主の印により、百二十万ダブロンがそなたの証書に応じるまで、{0}の関税を差し出す。", "Unter dem Siegel des Herrschers werden Euch die Zölle von {0} abgetreten, bis eine Million zweihunderttausend Dublonen Eure Urkunde erfüllt haben.", "Sous le sceau du souverain, les douanes de {0} vous sont offertes jusqu'à ce qu'un million deux cent mille doublons aient satisfait votre acte.", "Pod pieczęcią władcy ustępuje się wam cła z {0}, aż milion dwieście tysięcy dublonów zaspokoi wasz indenter.", "奉君主封印，今以{0}關稅相抵，直至一百二十萬達布隆足數清償你的契據。", "군주의 인장 아래, 백이십만 더블룬이 그대의 증서를 모두 갚을 때까지 {0}의 관세를 내놓겠소."
    ]],
    ["CROWN FALLEN: THE WAR LOAN CANNOT BE PAID", [
      "王权倾覆：战款无法偿还", "КОРОНА ПАЛА: ВОЕННАЯ ССУДА НЕ МОЖЕТ БЫТЬ ВОЗВРАЩЕНА", "CORONA CAÍDA: EL PRÉSTAMO DE GUERRA NO PUEDE PAGARSE", "COROA CAÍDA: O EMPRÉSTIMO DE GUERRA NÃO PODE SER PAGO", "王権崩壊：戦費借款は返済不能", "KRONE GEFALLEN: DER KRIEGSKREDIT KANN NICHT GETILGT WERDEN", "COURONNE TOMBÉE : LE PRÊT DE GUERRE NE PEUT ÊTRE REMBOURSÉ", "KORONA UPADŁA: POŻYCZKA WOJENNA NIE MOŻE ZOSTAĆ SPŁACONA", "王權傾覆：戰款無法償還", "왕권 붕괴: 전쟁 차관을 갚을 수 없다"
    ]],
    ["CUSTOMS ASSIGNMENT COMPLETE: 1,200,000 DB AWAITS AT COURT", [
      "关税让渡足额：宫廷备有1,200,000 DB", "УСТУПКА СБОРОВ ИСПОЛНЕНА: 1 200 000 ДБ ЖДУТ ПРИ ДВОРЕ", "CESIÓN DE ADUANAS CUMPLIDA: 1.200.000 DB AGUARDAN EN LA CORTE", "CESSÃO DAS ALFÂNDEGAS CUMPRIDA: 1.200.000 DB AGUARDAM NA CORTE", "関税譲渡完済：宮廷に1,200,000 DBあり", "ZOLLABTRETUNG ERFÜLLT: 1.200.000 DB WARTEN AM HOF", "CESSION DES DOUANES ACQUITTÉE : 1 200 000 DB VOUS ATTENDENT À LA COUR", "CESJA CEŁ WYKONANA: 1 200 000 DB CZEKA NA DWORZE", "關稅讓渡足額：宮廷備有1,200,000 DB", "관세 양도 완납: 궁정에 1,200,000 DB가 기다린다"
    ]],
    ["CUSTOMS ASSIGNMENT RESUMED AT {0}", [
      "{0}关税让渡恢复", "УСТУПКА ТАМОЖЕННЫХ СБОРОВ В {0} ВОЗОБНОВЛЕНА", "CESIÓN DE ADUANAS REANUDADA EN {0}", "CESSÃO DAS ALFÂNDEGAS RETOMADA EM {0}", "{0}の関税譲渡が再開", "ZOLLABTRETUNG IN {0} WIEDERAUFGENOMMEN", "CESSION DES DOUANES REPRISE À {0}", "CESJA CEŁ W {0} WZNOWIONA", "{0}關稅讓渡恢復", "{0} 관세 양도 재개"
    ]],
    ["CUSTOMS ASSIGNMENT SEALED", [
      "关税让渡已封印", "УСТУПКА ТАМОЖЕННЫХ СБОРОВ СКРЕПЛЕНА ПЕЧАТЬЮ", "CESIÓN DE ADUANAS SELLADA", "CESSÃO DAS ALFÂNDEGAS SELADA", "関税譲渡を封印", "ZOLLABTRETUNG BESIEGELT", "CESSION DES DOUANES SCELLÉE", "CESJA CEŁ OPIECZĘTOWANA", "關稅讓渡已封印", "관세 양도 봉인"
    ]],
    ["CUSTOMS ASSIGNMENT SUSPENDED: {0} LOST", [
      "关税让渡中止：{0}失守", "УСТУПКА СБОРОВ ПРИОСТАНОВЛЕНА: {0} ПОТЕРЯН", "CESIÓN DE ADUANAS SUSPENDIDA: {0} PERDIDA", "CESSÃO DAS ALFÂNDEGAS SUSPENSA: {0} PERDIDA", "関税譲渡中断：{0}陥落", "ZOLLABTRETUNG AUSGESETZT: {0} VERLOREN", "CESSION DES DOUANES SUSPENDUE : {0} PERDUE", "CESJA CEŁ WSTRZYMANA: UTRACONO {0}", "關稅讓渡中止：{0}失守", "관세 양도 중단: {0} 상실"
    ]],
    ["Customs of {0}", [
      "{0}关税", "Таможенные сборы {0}", "Aduanas de {0}", "Alfândegas de {0}", "{0}の関税", "Zölle von {0}", "Douanes de {0}", "Cła z {0}", "{0}關稅", "{0} 관세"
    ]],
    ["HOLD TO THE SEALED BOND", [
      "坚持原封契据", "ДЕРЖАТЬСЯ СКРЕПЛЁННОГО ПЕЧАТЬЮ ОБЯЗАТЕЛЬСТВА", "MANTENER EL TÍTULO SELLADO", "MANTER O TÍTULO SELADO", "封印ある証文を保つ", "AN DER BESIEGELTEN SCHULDVERSCHREIBUNG FESTHALTEN", "S'EN TENIR À L'OBLIGATION SCELLÉE", "POZOSTAĆ PRZY OPIECZĘTOWANYM OBLIGU", "堅持原封契據", "봉인된 채권을 그대로 둔다"
    ]],
    ["I will hold the Crown to the bond as it was sealed.", [
      "我要王室依原封契据履约。", "Я потребую от Короны исполнить обязательство таким, каким оно было скреплено печатью.", "Exigiré a la Corona el título tal como fue sellado.", "Exigirei da Coroa o título tal como foi selado.", "王冠には、封印されたままの証文を守らせる。", "Ich halte die Krone an die Schuldverschreibung, wie sie besiegelt ward.", "Je tiendrai la Couronne à l'obligation telle qu'elle fut scellée.", "Będę trzymać Koronę przy obligu takim, jak go opieczętowano.", "我要王室依原封契據履約。", "왕실은 봉인한 그대로 채권을 이행해야 하오."
    ]],
    ["I will receive the assignment under the sovereign's seal.", [
      "我愿接纳君主封印的让渡契据。", "Я приму уступку под государевой печатью.", "Recibiré la cesión bajo el sello del soberano.", "Receberei a cessão sob o selo do soberano.", "君主の印ある譲渡を受けよう。", "Ich nehme die Abtretung unter dem Siegel des Herrschers an.", "Je recevrai la cession sous le sceau du souverain.", "Przyjmę cesję pod pieczęcią władcy.", "我願接納君主封印的讓渡契據。", "군주의 인장 아래 그 양도를 받겠소."
    ]],
    ["The court offers the customs of {0} in security for the debt.", [
      "宫廷提出以{0}关税为债务担保。", "Двор предлагает таможенные сборы {0} в обеспечение долга.", "La corte ofrece las aduanas de {0} en garantía de la deuda.", "A corte oferece as alfândegas de {0} em garantia da dívida.", "宮廷は債の担保として{0}の関税を差し出している。", "Der Hof bietet die Zölle von {0} als Sicherheit für die Schuld.", "La cour offre les douanes de {0} en garantie de la dette.", "Dwór oferuje cła z {0} jako zabezpieczenie długu.", "宮廷提出以{0}關稅為債務擔保。", "궁정이 빚의 담보로 {0}의 관세를 내놓았다."
    ]],
    ["The original bond stands in arrears until the treasury recovers.", [
      "原契据暂列逾期，静候国库复元。", "Первоначальное обязательство остаётся в просрочке, пока казна не оправится.", "El título original queda en mora hasta que el tesoro se reponga.", "O título original fica em atraso até que o tesouro se recupere.", "元の証文は国庫が立ち直るまで延滞となる。", "Die ursprüngliche Schuldverschreibung bleibt rückständig, bis sich die Schatzkammer erholt.", "L'obligation première demeure en souffrance jusqu'au rétablissement du trésor.", "Pierwotny oblig pozostaje zaległy, dopóki skarb się nie podźwignie.", "原契據暫列逾期，靜候國庫復元。", "원채권은 국고가 회복될 때까지 연체로 남는다."
    ]],
    ["Then it shall stand in arrears until the treasury can answer it.", [
      "那么，便暂列逾期，待国库有力清偿。", "Тогда оно останется в просрочке, пока казна не сможет по нему ответить.", "Entonces quedará en mora hasta que el tesoro pueda responder de él.", "Então ficará em atraso até que o tesouro possa responder por ele.", "ならば、国庫が応じうるまで延滞として残そう。", "Dann bleibt sie rückständig, bis die Schatzkammer für sie einstehen kann.", "Alors elle demeurera en souffrance jusqu'à ce que le trésor puisse en répondre.", "Zatem pozostanie zaległy, aż skarb zdoła zań odpowiedzieć.", "那麼，便暫列逾期，待國庫有力清償。", "그러면 국고가 감당할 수 있을 때까지 연체로 남겨 두겠소."
    ]],
    ["Then the collectors at {0} shall set apart the customs until your principal and premium are discharged.", [
      "那么，{0}税吏将把关税另行留存，直至你的本金与酬金尽数清偿。", "Тогда сборщики в {0} будут откладывать таможенные доходы, пока не погасят ваш капитал и прибыль.", "Entonces los recaudadores de {0} apartarán las aduanas hasta que vuestro principal y premio queden satisfechos.", "Então os coletores de {0} separarão as alfândegas até que vosso principal e prêmio sejam quitados.", "ならば{0}の徴税吏が、そなたの元金と利を償い終えるまで関税を取り分ける。", "Dann sollen die Einnehmer in {0} die Zölle beiseitelegen, bis Euer Kapital und Aufgeld getilgt sind.", "Alors les receveurs de {0} mettront les douanes à part jusqu'à l'acquittement de votre principal et de votre prime.", "Zatem poborcy w {0} będą odkładać cła, aż wasz kapitał i premia zostaną spłacone.", "那麼，{0}稅吏將把關稅另行留存，直至你的本金與酬金盡數清償。", "그러면 {0}의 징세관들이 그대의 원금과 이문을 모두 갚을 때까지 관세를 따로 떼어 둘 것이오."
    ]],
    ["TREASURY RECOVERED: 1,200,000 DB AWAITS AT COURT", [
      "国库复元：宫廷备有1,200,000 DB", "КАЗНА ОПРАВИЛАСЬ: 1 200 000 ДБ ЖДУТ ПРИ ДВОРЕ", "TESORO RESTABLECIDO: 1.200.000 DB AGUARDAN EN LA CORTE", "TESOURO RECUPERADO: 1.200.000 DB AGUARDAM NA CORTE", "国庫回復：宮廷に1,200,000 DBあり", "SCHATZKAMMER ERHOLT: 1.200.000 DB WARTEN AM HOF", "TRÉSOR RÉTABLI : 1 200 000 DB VOUS ATTENDENT À LA COUR", "SKARB ODBUDOWANY: 1 200 000 DB CZEKA NA DWORZE", "國庫復元：宮廷備有1,200,000 DB", "국고 회복: 궁정에 1,200,000 DB가 기다린다"
    ]],
    ["WAR LOAN HELD IN ARREARS", [
      "战款契据列入逾期", "ВОЕННАЯ ССУДА ОСТАВЛЕНА В ПРОСРОЧКЕ", "PRÉSTAMO DE GUERRA MANTENIDO EN MORA", "EMPRÉSTIMO DE GUERRA MANTIDO EM ATRASO", "戦費借款を延滞として保持", "KRIEGSKREDIT RÜCKSTÄNDIG GEHALTEN", "PRÊT DE GUERRE MAINTENU EN SOUFFRANCE", "POŻYCZKA WOJENNA POZOSTAJE ZALEGŁA", "戰款契據列入逾期", "전쟁 차관을 연체로 유지"
    ]],
    ["Will you receive the customs of {0} in security, or hold the treasury to its first bond?", [
      "你愿接纳{0}关税为担保，还是仍令国库依原契据清偿？", "Примете ли вы таможенные сборы {0} в обеспечение или потребуете от казны исполнить первое обязательство?", "¿Recibiréis las aduanas de {0} en garantía, o mantendréis al tesoro sujeto a su primer título?", "Recebereis as alfândegas de {0} em garantia, ou mantereis o tesouro preso ao primeiro título?", "{0}の関税を担保として受けるか、それとも国庫に元の証文を守らせるか？", "Nehmt Ihr die Zölle von {0} als Sicherheit an, oder haltet Ihr die Schatzkammer an ihre erste Schuldverschreibung?", "Recevrez-vous les douanes de {0} en garantie, ou tiendrez-vous le trésor à sa première obligation ?", "Przyjmiecie cła z {0} jako zabezpieczenie czy pozostawicie skarb przy pierwotnym obligu?", "你願接納{0}關稅為擔保，還是仍令國庫依原契據清償？", "{0}의 관세를 담보로 받겠소, 아니면 국고에 원채권을 그대로 이행하게 하겠소?"
    ]],
    ["Your purse lacks the whole million. Shall I keep the indenture ready?", [
      "你的钱袋尚不足一百万。可要我将契据留待你归来？", "В вашем кошеле нет полного миллиона. Держать ли договор наготове?", "Vuestra bolsa no alcanza el millón entero. ¿Debo guardar dispuesta la escritura?", "Vossa bolsa não contém o milhão inteiro. Devo conservar a escritura pronta?", "そなたの財布には百万の全額がない。証書を用意したまま待つか？", "Euer Beutel enthält nicht die ganze Million. Soll ich die Urkunde bereithalten?", "Votre bourse ne contient point le million entier. Dois-je garder l'acte prêt ?", "W waszej sakwie brak całego miliona. Mam zachować indenter w gotowości?", "你的錢袋尚不足一百萬。可要我將契據留待你歸來？", "그대의 돈주머니에는 백만 전액이 없소. 증서를 준비해 두겠소?"
    ]]
  ];
  const technicalEntries = [
    ["{0} war loan defaulted", ["{0}战款违约", "Дефолт по военной ссуде державы {0}", "Impago del préstamo de guerra de {0}", "Inadimplência do empréstimo de guerra de {0}", "{0}戦費借款不履行", "Ausfall des Kriegskredits von {0}", "Défaut du prêt de guerre de {0}", "Niespłacona pożyczka wojenna państwa {0}", "{0}戰款違約", "{0} 전쟁 차관 불이행"]],
    ["collected {0} war-loan repayment", ["收取{0}战款还款", "Получен возврат военной ссуды державы {0}", "Cobrado el préstamo de guerra de {0}", "Recebido o pagamento do empréstimo de guerra de {0}", "{0}戦費借款返済を受領", "Rückzahlung des Kriegskredits von {0} eingezogen", "Remboursement du prêt de guerre de {0} reçu", "Odebrano spłatę pożyczki wojennej państwa {0}", "收取{0}戰款還款", "{0} 전쟁 차관 상환금 수령"]],
    ["war-loan capital", ["战款首都", "Столица военной ссуды", "Capital del préstamo de guerra", "Capital do empréstimo de guerra", "戦費借款の首都", "Kriegskredit-Hauptstadt", "Capitale du prêt de guerre", "Stolica pożyczki wojennej", "戰款首都", "전쟁 차관 수도"]],
    ["war-loan offer", ["战款提议", "Предложение военной ссуды", "Oferta de préstamo de guerra", "Oferta de empréstimo de guerra", "戦費借款の申し出", "Kriegskredit-Angebot", "Offre de prêt de guerre", "Oferta pożyczki wojennej", "戰款提議", "전쟁 차관 제안"]],
    ["war-loan offer capital", ["战款提议首都", "Столица предложения военной ссуды", "Capital de la oferta de préstamo de guerra", "Capital da oferta de empréstimo de guerra", "戦費借款を申し出た首都", "Hauptstadt des Kriegskredit-Angebots", "Capitale de l'offre de prêt de guerre", "Stolica oferty pożyczki wojennej", "戰款提議首都", "전쟁 차관 제안 수도"]],
    ["war-loan offer reconciliation", ["核验战款提议", "Сверка предложения военной ссуды", "Revisión de la oferta de préstamo de guerra", "Revisão da oferta de empréstimo de guerra", "戦費借款申し出の照合", "Abgleich des Kriegskredit-Angebots", "Révision de l'offre de prêt de guerre", "Rozliczenie oferty pożyczki wojennej", "核驗戰款提議", "전쟁 차관 제안 조정"]],
    ["war-loan refusal", ["拒绝战款", "Отказ от военной ссуды", "Rechazo del préstamo de guerra", "Recusa do empréstimo de guerra", "戦費借款の拒否", "Ablehnung des Kriegskredits", "Refus du prêt de guerre", "Odmowa pożyczki wojennej", "拒絕戰款", "전쟁 차관 거절"]]
  ];
  return Object.fromEntries([
    ...entries.map(([source, values]) => [source, reviewedLocaleOverrides(source, values)]),
    ...technicalEntries.map(([source, values]) => [source, reviewedLocaleOverrides(source, values)]),
    ["sovereign-war-loan:{0}:{1}", reviewedLocaleOverrides(
      "sovereign-war-loan:{0}:{1}",
      LOCALES.map(() => "sovereign-war-loan:{0}:{1}")
    )]
  ]);
}

function reviewedWhaleRamOverrides() {
  const entries = [
    ["Keep the cargo aboard", [
      "把货物留在船上", "Оставить груз на борту", "Dejar la carga a bordo",
      "Manter a carga a bordo", "積荷を船に残す", "Die Ladung an Bord behalten",
      "Garder la cargaison à bord", "Zostawić ładunek na pokładzie", "把貨物留在船上",
      "화물을 배에 둔다"
    ]],
    ["SPERM WHALE RAM -{0} HULL", [
      "抹香鲸撞击 -{0} 船体", "ТАРАН КАШАЛОТА: -{0} КОРПУСА", "EMBESTIDA DE CACHALOTE -{0} CASCO",
      "ABALROAMENTO DE CACHALOTE -{0} CASCO", "マッコウクジラの体当たり 船体 -{0}", "POTTWAL-RAMMSTOSS: -{0} RUMPF",
      "COUP DE BÉLIER DU CACHALOT : -{0} COQUE", "TARAN KASZALOTA: -{0} KADŁUBA", "抹香鯨撞擊 -{0} 船體",
      "향유고래 충돌 -{0} 선체"
    ]],
    ["THE SPERM WHALE WHEELS TO RAM", [
      "抹香鲸转身冲撞", "КАШАЛОТ РАЗВОРАЧИВАЕТСЯ ДЛЯ ТАРАНА", "EL CACHALOTE VIRA PARA EMBESTIR",
      "O CACHALOTE VIRA PARA ABALROAR", "マッコウクジラが向きを変え突進してくる", "DER POTTWAL DREHT ZUM RAMMSTOSS EIN",
      "LE CACHALOT VIRE POUR ÉPERONNER", "KASZALOT ZWRACA SIĘ DO TARANOWANIA", "抹香鯨轉身衝撞",
      "향유고래가 방향을 틀어 들이받으려 한다"
    ]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

function reviewedTreasurePirateSearchOverrides() {
  const entries = [
    ["A {0} under the black flag, answering to Captain {1}, was seen {2} of {3} {4} days ago. The old crew still quarrels over Captain {5}'s map.", [
      "一艘悬挂黑旗、听命于{1}船长的{0}，于{4}日前在{3}{2}方向被人看见。旧日船员仍为{5}船长的地图争执不休。",
      "{4} дней назад к {2} от {3} видели {0} под чёрным флагом, подчинявшийся капитану {1}. Старая команда всё ещё спорит из-за карты капитана {5}.",
      "Hace {4} días se vio {2} de {3} una nave {0} bajo bandera negra, al mando del capitán {1}. La vieja tripulación aún riñe por el mapa del capitán {5}.",
      "Há {4} dias, avistaram {2} de {3} um navio {0} sob bandeira negra, às ordens do capitão {1}. A velha tripulação ainda disputa o mapa do capitão {5}.",
      "{4}日前、{3}の{2}で、{1}船長に従う{0}が黒旗を掲げて目撃された。古参の乗組員はいまだに{5}船長の海図をめぐって争っている。",
      "Vor {4} Tagen wurde {2} von {3} ein Schiff vom Typ {0} unter schwarzer Flagge gesichtet, das Kapitän {1} gehorcht. Die alte Mannschaft streitet noch immer um Kapitän {5}s Karte.",
      "Il y a {4} jours, un navire {0} battant pavillon noir et obéissant au capitaine {1} a été vu {2} de {3}. L'ancien équipage se querelle encore pour la carte du capitaine {5}.",
      "{4} dni temu na {2} od {3} widziano okręt {0} pod czarną banderą, słuchający kapitana {1}. Dawna załoga wciąż spiera się o mapę kapitana {5}.",
      "一艘懸掛黑旗、聽命於{1}船長的{0}，於{4}日前在{3}{2}方向被人看見。舊日船員仍為{5}船長的地圖爭執不休。",
      "{4}일 전 {3}의 {2}쪽에서 {1} 선장의 명을 받는 {0} 한 척이 검은 깃발을 달고 목격되었다. 옛 선원들은 아직도 {5} 선장의 지도를 두고 다툰다."
    ]],
    ["A note in the captain's log names Captain {0}'s {1}, flying the black flag and last heard of {2} of {3}. I have marked it.", [
      "船长航海日志中的一则记载提到{0}船长的{1}：它悬挂黑旗，最后有人在{3}{2}方向听闻其踪迹。我已在图上标出。",
      "Запись в капитанском журнале называет {1} капитана {0} под чёрным флагом; последние вести о нём пришли с {2} от {3}. Я отметил это место.",
      "Una nota del diario de a bordo nombra el {1} del capitán {0}, bajo bandera negra y visto por última vez {2} de {3}. Lo he señalado.",
      "Uma nota no diário de bordo menciona o {1} do capitão {0}, sob bandeira negra e visto pela última vez {2} de {3}. Marquei o lugar.",
      "船長日誌の書き付けに、黒旗を掲げる{0}船長の{1}とある。最後の知らせは{3}の{2}からだ。印を付けておいた。",
      "Ein Vermerk im Logbuch nennt Kapitän {0}s {1} unter schwarzer Flagge, zuletzt {2} von {3} gemeldet. Ich habe die Stelle markiert.",
      "Une note du journal de bord nomme le {1} du capitaine {0}, battant pavillon noir et signalé pour la dernière fois {2} de {3}. J'ai marqué l'endroit.",
      "W dzienniku kapitana zapisano {1} kapitana {0} pod czarną banderą, ostatnio widziany na {2} od {3}. Zaznaczono to miejsce.",
      "船長航海日誌中的一則記載提到{0}船長的{1}：它懸掛黑旗，最後有人在{3}{2}方向聽聞其蹤跡。我已在圖上標出。",
      "선장 일지의 기록에 {0} 선장의 {1}이 나온다. 검은 깃발을 달았으며 마지막 소식은 {3}의 {2}쪽이었다. 그곳을 표시해 두었다."
    ]],
    ["Captain {0}'s {1}", [
      "{0}船长的{1}", "{1} капитана {0}", "{1} del capitán {0}", "{1} do capitão {0}", "{0}船長の{1}",
      "Kapitän {0}s {1}", "{1} du capitaine {0}", "{1} kapitana {0}", "{0}船長的{1}", "{0} 선장의 {1}"
    ]],
    ["Captain {0}'s {1} was sighted {2} of {3} {4} days ago, flying the black flag. Dead men tell no tales, but frightened deckhands tell plenty.", [
      "{4}日前，有人在{3}{2}方向看见{0}船长的{1}悬挂黑旗。死人不会说话，受惊的水手却会说个不停。",
      "{4} дней назад {1} капитана {0} видели к {2} от {3} под чёрным флагом. Мертвецы сказок не рассказывают, зато перепуганные матросы весьма словоохотливы.",
      "Hace {4} días se avistó {2} de {3} el {1} del capitán {0}, bajo bandera negra. Los muertos no cuentan historias, pero los marineros asustados cuentan muchas.",
      "Há {4} dias, avistaram {2} de {3} o {1} do capitão {0}, sob bandeira negra. Mortos não contam histórias, mas marinheiros assustados contam muitas.",
      "{4}日前、{3}の{2}で、{0}船長の{1}が黒旗を掲げて目撃された。死人は何も語らぬが、怯えた甲板員はよくしゃべる。",
      "Vor {4} Tagen wurde Kapitän {0}s {1} {2} von {3} unter schwarzer Flagge gesichtet. Tote erzählen keine Geschichten, verängstigte Matrosen hingegen sehr viele.",
      "Il y a {4} jours, le {1} du capitaine {0} a été aperçu {2} de {3}, battant pavillon noir. Les morts ne parlent point, mais les matelots effrayés parlent beaucoup.",
      "{4} dni temu na {2} od {3} widziano {1} kapitana {0} pod czarną banderą. Umarli nie opowiadają historii, lecz wystraszeni majtkowie mówią aż nadto.",
      "{4}日前，有人在{3}{2}方向看見{0}船長的{1}懸掛黑旗。死人不會說話，受驚的水手卻會說個不停。",
      "{4}일 전 {3}의 {2}쪽에서 {0} 선장의 {1}이 검은 깃발을 달고 목격되었다. 죽은 자는 말이 없지만 겁먹은 갑판원은 말이 많다."
    ]],
    ["Put your bow {0} of {1} and watch for Captain {2}'s {3} under the black flag. She was seen there {4} days ago, carrying one scrap of a map worth twelve men's lives.", [
      "把船头转向{1}{0}方向，留神{2}船长那艘悬挂黑旗的{3}。{4}日前有人在那里看见它，船上带着一张值十二条人命的地图残片。",
      "Держите нос на {0} от {1} и высматривайте {3} капитана {2} под чёрным флагом. Его видели там {4} дней назад с клочком карты, стоившим жизни двенадцати людям.",
      "Poned la proa {0} de {1} y buscad el {3} del capitán {2} bajo bandera negra. Lo vieron allí hace {4} días con un fragmento de mapa que ha costado doce vidas.",
      "Ponde a proa {0} de {1} e vigiai o {3} do capitão {2} sob bandeira negra. Foi visto ali há {4} dias com um retalho de mapa que custou doze vidas.",
      "船首を{1}の{0}へ向け、黒旗を掲げる{2}船長の{3}を探せ。{4}日前、十二人の命に値する海図の切れ端を積んで、そこで目撃された。",
      "Haltet den Bug {0} von {1} und späht nach Kapitän {2}s {3} unter schwarzer Flagge. Vor {4} Tagen wurde es dort mit einem Kartenfetzen gesehen, der zwölf Männerleben wert ist.",
      "Mettez le cap {0} de {1} et guettez le {3} du capitaine {2} sous pavillon noir. On l'y a vu il y a {4} jours, portant un lambeau de carte qui vaut la vie de douze hommes.",
      "Skierujcie dziób na {0} od {1} i wypatrujcie {3} kapitana {2} pod czarną banderą. Widziano go tam {4} dni temu z kawałkiem mapy wartym życia dwunastu ludzi.",
      "把船頭轉向{1}{0}方向，留神{2}船長那艘懸掛黑旗的{3}。{4}日前有人在那裡看見它，船上帶著一張值十二條人命的地圖殘片。",
      "뱃머리를 {1}의 {0}쪽으로 돌리고 검은 깃발을 단 {2} 선장의 {3}을 찾아라. {4}일 전 그곳에서 열두 사람의 목숨값이나 되는 지도 조각을 싣고 있는 것이 목격되었다."
    ]],
    ["They say Captain {0} was last seen {1} of {2} {3} days ago, in a {4} flying the black flag. There is talk of a torn chart aboard, guarded closer than any purse.", [
      "听说{3}日前，有人在{2}{1}方向最后看见{0}船长；他乘着一艘悬挂黑旗的{4}。传言船上有张撕破的海图，看守得比钱袋还严。",
      "Говорят, капитана {0} в последний раз видели {3} дней назад к {1} от {2}, на {4} под чёрным флагом. Толкуют, будто на борту хранится разорванная карта, которую стерегут пуще всякого кошеля.",
      "Dicen que al capitán {0} se le vio por última vez hace {3} días, {1} de {2}, en un {4} bajo bandera negra. Se habla de una carta rota a bordo, guardada mejor que cualquier bolsa.",
      "Dizem que o capitão {0} foi visto pela última vez há {3} dias, {1} de {2}, num {4} sob bandeira negra. Fala-se de uma carta rasgada a bordo, guardada melhor que qualquer bolsa.",
      "{0}船長が最後に目撃されたのは{3}日前、{2}の{1}で、黒旗を掲げる{4}に乗っていたという。船には破れた海図があり、どんな財布より厳重に守られているらしい。",
      "Kapitän {0} wurde zuletzt vor {3} Tagen {1} von {2} auf einem {4} unter schwarzer Flagge gesehen. Man spricht von einer zerrissenen Karte an Bord, die sorgsamer als jeder Geldbeutel bewacht wird.",
      "On dit que le capitaine {0} a été vu pour la dernière fois il y a {3} jours, {1} de {2}, à bord d'un {4} battant pavillon noir. On parle d'une carte déchirée à bord, gardée de plus près qu'aucune bourse.",
      "Powiadają, że kapitana {0} widziano ostatnio {3} dni temu na {1} od {2}, na pokładzie {4} pod czarną banderą. Mówią o podartej mapie, strzeżonej pilniej niż najpełniejsza sakwa.",
      "聽說{3}日前，有人在{2}{1}方向最後看見{0}船長；他乘著一艘懸掛黑旗的{4}。傳言船上有張撕破的海圖，看守得比錢袋還嚴。",
      "{0} 선장은 {3}일 전 {2}의 {1}쪽에서 검은 깃발을 단 {4}에 탄 모습이 마지막으로 목격되었다고 한다. 배에는 어떤 돈주머니보다도 삼엄하게 지키는 찢어진 지도가 있다는 소문이다."
    ]],
    ["This is Captain {0}'s last reported position, though no man can say how old the word is. Keep every glass upon the water for a {1} flying the black flag. We search these waters until her sails show.", [
      "这里就是{0}船长最后传出的方位，虽说没人讲得清这消息已传了多久。每副望远镜都盯紧海面，寻找悬挂黑旗的{1}。我们搜索这片水域，直到看见它的帆。",
      "Это последнее известное место капитана {0}, хотя никто не скажет, насколько стары вести. Не спускайте подзорных труб с воды: ищите {1} под чёрным флагом. Прочешем эти воды, пока не покажутся его паруса.",
      "Esta es la última posición conocida del capitán {0}, aunque nadie sabe cuánto ha envejecido la noticia. Que todos los catalejos busquen en el agua un {1} bajo bandera negra. Registraremos estas aguas hasta ver sus velas.",
      "Esta é a última posição conhecida do capitão {0}, embora ninguém saiba quanto envelheceu a notícia. Que todas as lunetas procurem nas águas um {1} sob bandeira negra. Vasculharemos estas águas até surgirem suas velas.",
      "ここが{0}船長の最後に伝えられた位置だが、その知らせがどれほど古いかは誰にも分からない。すべての望遠鏡で、黒旗を掲げる{1}を海上に探せ。帆が見えるまでこの海域を捜索する。",
      "Dies ist Kapitän {0}s letzte gemeldete Position, doch niemand kann sagen, wie alt die Nachricht ist. Jedes Glas aufs Wasser: Sucht ein Schiff vom Typ {1} unter schwarzer Flagge. Wir durchsuchen diese Gewässer, bis seine Segel erscheinen.",
      "Voici la dernière position signalée du capitaine {0}, bien que nul ne sache depuis combien de temps court la nouvelle. Que toutes les longues-vues cherchent sur l'eau un {1} battant pavillon noir. Nous fouillerons ces eaux jusqu'à voir ses voiles.",
      "To ostatnia znana pozycja kapitana {0}, choć nikt nie wie, jak stara jest ta wieść. Wszystkie lunety na wodę: szukajcie {1} pod czarną banderą. Przeszukamy te wody, aż pokażą się jego żagle.",
      "這裡就是{0}船長最後傳出的方位，雖說沒人講得清這消息已傳了多久。每副望遠鏡都盯緊海面，尋找懸掛黑旗的{1}。我們搜索這片水域，直到看見它的帆。",
      "여기가 {0} 선장의 마지막 보고 위치다. 다만 그 소식이 얼마나 묵었는지는 아무도 모른다. 모든 망원경으로 검은 깃발을 단 {1}을 수면에서 찾아라. 돛이 보일 때까지 이 바다를 수색한다."
    ]],
    ["This is where Captain {0}'s {1} was seen {2} days ago, flying the black flag. Keep every glass upon the water. We search these waters until her sails show.", [
      "{2}日前，{0}船长的{1}就在这里悬挂黑旗出现过。每副望远镜都盯紧海面。我们搜索这片水域，直到看见它的帆。",
      "Здесь {2} дней назад видели {1} капитана {0} под чёрным флагом. Не спускайте подзорных труб с воды. Прочешем эти воды, пока не покажутся его паруса.",
      "Aquí se vio hace {2} días el {1} del capitán {0}, bajo bandera negra. Que todos los catalejos vigilen el agua. Registraremos estas aguas hasta ver sus velas.",
      "Aqui foi visto, há {2} dias, o {1} do capitão {0}, sob bandeira negra. Que todas as lunetas vigiem as águas. Vasculharemos esta região até surgirem suas velas.",
      "ここで{2}日前、{0}船長の{1}が黒旗を掲げて目撃された。すべての望遠鏡を海上へ向けろ。帆が見えるまでこの海域を捜索する。",
      "Hier wurde vor {2} Tagen Kapitän {0}s {1} unter schwarzer Flagge gesichtet. Jedes Glas aufs Wasser. Wir durchsuchen diese Gewässer, bis seine Segel erscheinen.",
      "C'est ici que le {1} du capitaine {0} a été vu il y a {2} jours, battant pavillon noir. Que toutes les longues-vues restent sur l'eau. Nous fouillerons ces eaux jusqu'à voir ses voiles.",
      "Tutaj {2} dni temu widziano {1} kapitana {0} pod czarną banderą. Wszystkie lunety na wodę. Przeszukamy te wody, aż pokażą się jego żagle.",
      "{2}日前，{0}船長的{1}就在這裡懸掛黑旗出現過。每副望遠鏡都盯緊海面。我們搜索這片水域，直到看見它的帆。",
      "이곳에서 {2}일 전 {0} 선장의 {1}이 검은 깃발을 달고 목격되었다. 모든 망원경을 수면으로 돌려라. 돛이 보일 때까지 이 바다를 수색한다."
    ]],
    ["You want another? Captain {0}'s {1} was last heard of {2} of {3}, under the black flag. Mark it, and may you both sink.", [
      "你还想找另一个？最后有人在{3}{2}方向听到{0}船长那艘{1}的消息，它悬挂黑旗。记下吧，愿你们一道沉海。",
      "Хотите ещё одного? Последние вести о {1} капитана {0} под чёрным флагом пришли с {2} от {3}. Отметьте место — и чтоб вы оба пошли ко дну.",
      "¿Queréis otro? Las últimas noticias del {1} del capitán {0}, bajo bandera negra, llegaron de {2} de {3}. Marcadlo, y ojalá os hundáis los dos.",
      "Quereis outro? As últimas notícias do {1} do capitão {0}, sob bandeira negra, vieram de {2} de {3}. Marcai o lugar, e que ambos afundeis.",
      "もう一人欲しいか？ 黒旗を掲げる{0}船長の{1}は、最後に{3}の{2}から知らせがあった。印を付けろ。二隻とも沈めばいい。",
      "Ihr wollt noch einen? Von Kapitän {0}s {1} unter schwarzer Flagge hörte man zuletzt {2} von {3}. Markiert die Stelle — und mögt Ihr beide sinken.",
      "Vous en voulez un autre ? Les dernières nouvelles du {1} du capitaine {0}, sous pavillon noir, venaient de {2} de {3}. Marquez l'endroit, et puissiez-vous couler tous les deux.",
      "Chcecie następnego? O {1} kapitana {0} pod czarną banderą ostatnio słyszano na {2} od {3}. Zaznaczcie to miejsce — i obyście obaj poszli na dno.",
      "你還想找另一個？最後有人在{3}{2}方向聽到{0}船長那艘{1}的消息，它懸掛黑旗。記下吧，願你們一道沉海。",
      "또 하나를 원하나? 검은 깃발을 단 {0} 선장의 {1}은 마지막으로 {3}의 {2}쪽에서 소식이 들렸다. 표시해라. 둘 다 가라앉기를 빌지."
    ]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

function reviewedPortFactorRecognitionOverrides() {
  const entries = [
    ["{0} captured ports stand in your wake. No factor mistakes you for an ordinary captain now.", [
      "你身后已有{0}座港口易主。如今没有哪位港口商人还会把你当作寻常船长。",
      "За вашей кормой осталось {0} взятых портов. Теперь ни один фактор не примет вас за обычного капитана.",
      "Habéis dejado {0} puertos conquistados a vuestra estela. Ningún factor os toma ya por un capitán cualquiera.",
      "Deixastes {0} portos conquistados em vossa esteira. Nenhum feitor vos toma agora por um capitão comum.",
      "船長の航跡には、すでに{0}もの攻略された港が並んでおります。もはや貴殿を並の船長と思う商館主はおりません。",
      "In Eurem Kielwasser liegen {0} eroberte Häfen. Kein Faktor hält Euch noch für einen gewöhnlichen Kapitän.",
      "Vous laissez {0} ports conquis dans votre sillage. Plus aucun facteur ne vous prend pour un capitaine ordinaire.",
      "W waszym kilwaterze zostało {0} zdobytych portów. Żaden faktor nie weźmie was już za zwykłego kapitana.",
      "你身後已有{0}座港口易主。如今沒有哪位港口商人還會把你當作尋常船長。",
      "선장의 항적에는 이미 점령한 항구가 {0}곳이나 남았습니다. 이제 어느 상관장도 선장을 평범한 선장으로 여기지 않습니다."
    ]],
    ["{0} discoveries are entered beside your name. Chartmakers quarrel over who may copy your bearings.", [
      "已有{0}项发现记在你的名下。制图师们正争论谁有资格抄录你的航向。",
      "Рядом с вашим именем записано {0} открытий. Картографы спорят, кому дозволено копировать ваши пеленги.",
      "Hay {0} descubrimientos asentados junto a vuestro nombre. Los cartógrafos riñen por quién podrá copiar vuestros rumbos.",
      "Há {0} descobertas lançadas junto de vosso nome. Os cartógrafos disputam quem poderá copiar vossos rumos.",
      "貴殿の名の傍らには{0}もの発見が記されております。海図師たちは、誰がその針路を写すべきかで争う始末です。",
      "Neben Eurem Namen stehen {0} Entdeckungen verzeichnet. Die Kartenmacher streiten, wer Eure Peilungen kopieren darf.",
      "{0} découvertes sont inscrites auprès de votre nom. Les cartographes se querellent pour savoir qui copiera vos relèvements.",
      "Przy waszym imieniu zapisano {0} odkryć. Kartografowie spierają się, komu wolno przepisać wasze namiary.",
      "已有{0}項發現記在你的名下。製圖師們正爭論誰有資格抄錄你的航向。",
      "선장 이름 곁에는 {0}건의 발견이 기록되어 있습니다. 지도 제작자들은 누가 선장의 방위를 베껴도 되는지를 두고 다툽니다."
    ]],
    ["{0} new harbors owe their first roofs and storehouses to your voyages. Few captains leave such marks upon the map.", [
      "有{0}座新港因你的航行才有了最初的屋舍与仓房。少有船长能在地图上留下这般痕迹。",
      "{0} новых гаваней обязаны вашим плаваниям первыми крышами и складами. Немногие капитаны оставляют такой след на карте.",
      "{0} puertos nuevos deben a vuestros viajes sus primeros tejados y almacenes. Pocos capitanes dejan tal huella en el mapa.",
      "{0} portos novos devem a vossas viagens seus primeiros telhados e armazéns. Poucos capitães deixam tal marca no mapa.",
      "{0}の新港が、最初の屋根と倉を貴殿の航海に負うております。地図にこれほどの跡を残す船長は稀です。",
      "{0} neue Häfen verdanken Euren Reisen ihre ersten Dächer und Speicher. Nur wenige Kapitäne hinterlassen solche Spuren auf der Karte.",
      "{0} nouveaux havres doivent à vos voyages leurs premiers toits et entrepôts. Peu de capitaines laissent pareille marque sur la carte.",
      "{0} nowych portów zawdzięcza waszym wyprawom pierwsze dachy i składy. Niewielu kapitanów zostawia taki ślad na mapie.",
      "有{0}座新港因你的航行才有了最初的屋舍與倉房。少有船長能在地圖上留下這般痕跡。",
      "새 항구 {0}곳이 첫 지붕과 창고를 선장의 항해에 빚지고 있습니다. 지도에 이런 자취를 남기는 선장은 드뭅니다."
    ]],
    ["Merchants bless the treaty you forced upon {0}. Open seas are better than brave speeches.", [
      "商人们都为你迫使{0}签下的条约称颂不已。海路畅通，胜过十篇豪言。",
      "Купцы благословляют мир, к которому вы принудили {0}. Открытое море лучше храбрых речей.",
      "Los mercaderes bendicen el tratado que impusisteis a {0}. Más vale mar abierto que discurso valiente.",
      "Os mercadores bendizem o tratado que impusestes a {0}. Mares abertos valem mais que discursos valentes.",
      "商人たちは、貴殿が{0}に呑ませた盟約を祝しております。勇ましい口上より、開かれた海路が勝ります。",
      "Die Kaufleute preisen den Vertrag, den Ihr {0} abgerungen habt. Offene See ist besser als kühne Reden.",
      "Les marchands bénissent le traité que vous avez imposé à {0}. Mieux vaut une mer ouverte que de vaillants discours.",
      "Kupcy błogosławią traktat, który wymogliście na {0}. Otwarte morze jest lepsze od dzielnych przemów.",
      "商人們都為你迫使{0}簽下的條約稱頌不已。海路暢通，勝過十篇豪言。",
      "상인들은 선장이 {0}에게 받아 낸 조약을 축복합니다. 호기로운 연설보다 열린 바다가 낫지요."
    ]],
    ["Pirates curse your name from here to the ocean sea. Honest masters drink to it.", [
      "从此地直到大洋，海盗都在咒骂你的名字；守法的船主却为它举杯。",
      "Пираты проклинают ваше имя отсюда до моря-океана. Честные шкиперы пьют за него.",
      "Los piratas maldicen vuestro nombre desde aquí hasta el mar océano. Los maestres honrados brindan por él.",
      "Os piratas amaldiçoam vosso nome daqui até o mar oceano. Os mestres honrados bebem em sua honra.",
      "ここから大洋の果てまで、海賊どもは貴殿の名を呪い、堅気の船主たちはその名に杯を上げております。",
      "Piraten verfluchen Euren Namen von hier bis zum Ozean. Ehrbare Schiffer trinken darauf.",
      "Les pirates maudissent votre nom d'ici jusqu'à la mer océane. Les maîtres honnêtes boivent à sa santé.",
      "Piraci przeklinają wasze imię stąd aż po ocean. Uczciwi szyprowie piją za nie.",
      "從此地直到大洋，海盜都在咒罵你的名字；守法的船主卻為它舉杯。",
      "여기서 대양 끝까지 해적들은 선장의 이름을 저주합니다. 정직한 선주들은 그 이름에 잔을 들지요."
    ]],
    ["The black flags have learned your sail, captain. They flee it sooner than the king's colors.", [
      "船长，黑旗已经认得你的帆了。他们见你便逃，比见国王的旗号还快。",
      "Чёрные флаги узнают ваши паруса, капитан. От них они бегут скорее, чем от королевских цветов.",
      "Las banderas negras ya conocen vuestra vela, capitán. Huyen de ella antes que de los colores del rey.",
      "As bandeiras negras já conhecem vossas velas, capitão. Fogem delas antes que das cores do rei.",
      "船長、黒旗どもは貴殿の帆を覚えました。王旗を見た時より早く逃げ出しますぞ。",
      "Die schwarzen Flaggen kennen Eure Segel, Kapitän. Vor ihnen fliehen sie eher als vor den Farben des Königs.",
      "Les pavillons noirs connaissent votre voile, capitaine. Ils la fuient plus vite que les couleurs du roi.",
      "Czarne bandery poznały wasze żagle, kapitanie. Uciekają przed nimi prędzej niż przed barwami króla.",
      "船長，黑旗已經認得你的帆了。他們見你便逃，比見國王的旗號還快。",
      "선장, 검은 깃발들이 선장의 돛을 알아봅니다. 왕의 깃발을 볼 때보다 먼저 달아납니다."
    ]],
    ["The counting houses speak of your credit in the same breath as Augsburg's great families. Your business shall have first hearing.", [
      "各家账房谈起你的信用，已与奥格斯堡的名门巨室相提并论。你的生意自当先议。",
      "В счётных домах о вашем кредите говорят рядом с великими семьями Аугсбурга. Ваше дело выслушают первым.",
      "Las casas de cuentas hablan de vuestro crédito junto al de las grandes familias de Augsburgo. Vuestro negocio será oído primero.",
      "As casas de contas falam de vosso crédito junto ao das grandes famílias de Augsburgo. Vossos negócios terão primeira audiência.",
      "会計商館では、貴殿の信用をアウクスブルクの大商家と同じ息で語っております。御用件は何より先に承りましょう。",
      "In den Kontoren nennt man Euren Kredit in einem Atemzug mit Augsburgs großen Familien. Euer Geschäft soll zuerst Gehör finden.",
      "Les maisons de comptes citent votre crédit avec celui des grandes familles d'Augsbourg. Votre affaire sera entendue la première.",
      "W kantorach wymieniają wasz kredyt jednym tchem z wielkimi rodami Augsburga. Wasza sprawa zostanie wysłuchana pierwsza.",
      "各家帳房談起你的信用，已與奧格斯堡的名門巨室相提並論。你的生意自當先議。",
      "회계 상관들은 선장의 신용을 아우크스부르크의 대가문들과 한데 입에 올립니다. 선장의 용무부터 듣겠습니다."
    ]],
    ["The peace you wrung from {0} has quieted more waters than ten admirals.", [
      "你从{0}手中争得的和平，平定的海域胜过十位海军统帅。",
      "Мир, который вы вырвали у {0}, успокоил больше морей, чем десять адмиралов.",
      "La paz que arrancasteis a {0} ha aquietado más aguas que diez almirantes.",
      "A paz que arrancastes de {0} aquietou mais águas que dez almirantes.",
      "貴殿が{0}からもぎ取った和平は、十人の提督より多くの海を鎮めました。",
      "Der Friede, den Ihr {0} abgerungen habt, hat mehr Gewässer beruhigt als zehn Admirale.",
      "La paix que vous avez arrachée à {0} a calmé plus d'eaux que dix amiraux.",
      "Pokój, który wydarliście {0}, uciszył więcej wód niż dziesięciu admirałów.",
      "你從{0}手中爭得的和平，平定的海域勝過十位海軍統帥。",
      "선장이 {0}에게서 받아 낸 평화는 제독 열 명보다 더 많은 바다를 잠재웠습니다."
    ]],
    ["They call you the Hero of {0}, captain. A berth is waiting for you.", [
      "船长，人们都称你为“{0}的英雄”。泊位早已为你留好。",
      "Вас зовут Героем {0}, капитан. Причал для вас уже готов.",
      "Os llaman el Héroe de {0}, capitán. Os aguarda un atraque.",
      "Chamam-vos Herói de {0}, capitão. Há um ancoradouro à vossa espera.",
      "船長、皆は貴殿を『{0}の英雄』と呼んでおります。船席を空けておきました。",
      "Man nennt Euch den Helden von {0}, Kapitän. Ein Liegeplatz wartet auf Euch.",
      "On vous nomme le Héros de {0}, capitaine. Une place à quai vous attend.",
      "Zwą was Bohaterem {0}, kapitanie. Miejsce przy nabrzeżu już czeka.",
      "船長，人們都稱你為「{0}的英雄」。泊位早已為你留好。",
      "선장, 사람들은 선장을 ‘{0}의 영웅’이라 부릅니다. 정박 자리를 비워 두었습니다."
    ]],
    ["Welcome, Hero of {0}. The tale reached our quay before your topsails.", [
      "欢迎你，{0}的英雄。你的事迹比桅顶帆更早传到我们的码头。",
      "Добро пожаловать, Герой {0}. Весть о вас пришла на нашу пристань прежде ваших марселей.",
      "Bienvenido, Héroe de {0}. La historia llegó a nuestro muelle antes que vuestras gavias.",
      "Bem-vindo, Herói de {0}. A história chegou ao nosso cais antes de vossas gáveas.",
      "ようこそ、{0}の英雄。貴殿の武勲は、トップスルより先にこの岸壁へ届きました。",
      "Willkommen, Held von {0}. Die Kunde erreichte unseren Kai vor Euren Marssegeln.",
      "Bienvenue, Héros de {0}. Le récit a atteint notre quai avant vos huniers.",
      "Witajcie, Bohaterze {0}. Opowieść dotarła na nasze nabrzeże przed waszymi marslami.",
      "歡迎你，{0}的英雄。你的事蹟比桅頂帆更早傳到我們的碼頭。",
      "어서 오십시오, {0}의 영웅이여. 선장의 무용담이 상단 돛보다 먼저 우리 부두에 닿았습니다."
    ]],
    ["Word comes from {0} settlements founded in your wake. Their factors already reckon by your name.", [
      "消息从你航迹中建立的{0}处聚落传来。那里的港口商人已用你的名字作保。",
      "Приходят вести из {0} поселений, основанных по вашему следу. Их факторы уже ведут счёт вашим именем.",
      "Llegan noticias de {0} asentamientos fundados tras vuestra estela. Sus factores ya hacen cuentas con vuestro nombre.",
      "Chegam notícias de {0} povoações fundadas em vossa esteira. Seus feitores já fazem contas por vosso nome.",
      "貴殿の航跡に築かれた{0}の入植地から便りが届いております。かの地の商館主は、早くも貴殿の名で勘定しております。",
      "Kunde kommt aus {0} Siedlungen, die in Eurem Kielwasser gegründet wurden. Ihre Faktoren rechnen bereits mit Eurem Namen.",
      "Des nouvelles viennent de {0} établissements fondés dans votre sillage. Leurs facteurs comptent déjà sur votre nom.",
      "Przychodzą wieści z {0} osad założonych w waszym kilwaterze. Ich faktorzy już rachują na wasze imię.",
      "消息從你航跡中建立的{0}處聚落傳來。那裡的港口商人已用你的名字作保。",
      "선장의 항적을 따라 세워진 정착지 {0}곳에서 소식이 옵니다. 그곳의 상관장들은 벌써 선장 이름으로 장부를 셈합니다."
    ]],
    ["You have opened {0} city gates by force. Even admirals count your victories carefully.", [
      "你已用武力打开{0}座城门。就连海军统帅也细数你的胜绩。",
      "Вы силой открыли ворота {0} городов. Даже адмиралы внимательно считают ваши победы.",
      "Habéis abierto por la fuerza las puertas de {0} ciudades. Hasta los almirantes cuentan con cuidado vuestras victorias.",
      "Abristes pela força os portões de {0} cidades. Até os almirantes contam vossas vitórias com cuidado.",
      "貴殿は力ずくで{0}の城門を開きました。提督たちでさえ、その勝利を念入りに数えております。",
      "Ihr habt {0} Stadttore mit Gewalt geöffnet. Selbst Admirale zählen Eure Siege mit Bedacht.",
      "Vous avez ouvert de force les portes de {0} villes. Même les amiraux comptent vos victoires avec soin.",
      "Siłą otworzyliście bramy {0} miast. Nawet admirałowie uważnie liczą wasze zwycięstwa.",
      "你已用武力打開{0}座城門。就連海軍統帥也細數你的勝績。",
      "선장은 무력으로 {0}곳의 성문을 열었습니다. 제독들조차 선장의 승리를 꼼꼼히 셉니다."
    ]],
    ["Your charts have made old maps look like children's guesses. Every pilot in port wants a sight of them.", [
      "你的海图使旧地图看起来如同孩童猜画。港中每位领航员都想一睹为快。",
      "Рядом с вашими картами старые выглядят детскими догадками. Каждый лоцман в порту желает на них взглянуть.",
      "Vuestras cartas hacen que los mapas viejos parezcan conjeturas de niños. Todo piloto del puerto quiere verlas.",
      "Vossas cartas fazem os mapas antigos parecerem palpites de crianças. Todo piloto do porto quer vê-las.",
      "貴殿の海図に比べれば、古地図など童の当て推量に見えます。港中の水先案内人が一目見たがっております。",
      "Eure Seekarten lassen alte Karten wie Kinderraten aussehen. Jeder Lotse im Hafen möchte sie sehen.",
      "Vos cartes font paraître les anciens plans comme des conjectures d'enfants. Chaque pilote du port veut les voir.",
      "Przy waszych mapach stare wyglądają jak dziecięce domysły. Każdy pilot w porcie pragnie je zobaczyć.",
      "你的海圖使舊地圖看起來如同孩童猜畫。港中每位領航員都想一睹為快。",
      "선장의 해도 앞에서는 옛 지도가 아이들의 짐작처럼 보입니다. 항구의 모든 도선사가 한 번 보기를 원합니다."
    ]],
    ["Your purse could fit out a royal squadron, captain. I shall not trouble you with a factor's small courtesies.", [
      "船长，你的钱袋足以装备一支王家分舰队。我便不拿港口商人的小礼数来烦你了。",
      "Ваш кошель мог бы снарядить королевскую эскадру, капитан. Не стану утруждать вас мелкими любезностями фактора.",
      "Vuestra bolsa podría armar una escuadra real, capitán. No os importunaré con las pequeñas cortesías de un factor.",
      "Vossa bolsa poderia armar uma esquadra real, capitão. Não vos importunarei com as pequenas cortesias de um feitor.",
      "船長、貴殿の財布なら王家の一戦隊を艤装できましょう。商館主のささやかな挨拶でお手を煩わせますまい。",
      "Euer Geldbeutel könnte ein königliches Geschwader ausrüsten, Kapitän. Ich will Euch nicht mit den kleinen Höflichkeiten eines Faktors bemühen.",
      "Votre bourse pourrait armer une escadre royale, capitaine. Je ne vous importunerai pas des menues courtoisies d'un facteur.",
      "Wasza sakwa mogłaby wyposażyć królewską eskadrę, kapitanie. Nie będę was trudził drobnymi grzecznościami faktora.",
      "船長，你的錢袋足以裝備一支王家分艦隊。我便不拿港口商人的小禮數來煩你了。",
      "선장, 선장의 돈주머니라면 왕실 전대를 꾸릴 수 있겠습니다. 상관장의 자잘한 인사치레로 번거롭게 하지 않겠습니다."
    ]]
  ];
  return Object.fromEntries(entries.map(([source, values]) => [
    source,
    reviewedLocaleOverrides(source, values)
  ]));
}

await mkdir(OUTPUT_ROOT, { recursive: true });
for (const locale of LOCALES) {
  const outputPath = path.join(OUTPUT_ROOT, locale.fileName);
  const existing = await readExistingCatalog(outputPath);
  const missing = PRUNE_ONLY ? [] : SCREEN_TEXT_TEMPLATES.filter((source) => (
    !REVIEWED_OVERRIDES[source]?.[locale.id] && (() => {
      const previous = existing[source] ?? existing[LEGACY_SOURCE_BY_SOURCE[source]];
      return typeof previous !== "string" ||
        (previous === source && requiresTranslatedProse(source));
    })()
  ));
  process.stdout.write(`${locale.id}: ${PRUNE_ONLY ? "pruning" : `translating ${missing.length} missing templates`}\n`);
  const translated = missing.length > 0
    ? await translateTemplates(missing, locale)
    : {};
  const catalog = Object.fromEntries(SCREEN_TEXT_TEMPLATES.map((source) => [
    source,
    REVIEWED_OVERRIDES[source]?.[locale.id] || translated[source] || existing[source] ||
      existing[LEGACY_SOURCE_BY_SOURCE[source]]
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
    const url = new URL("https://translate.google.com/translate_a/single");
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
  const url = new URL("https://translate.google.com/translate_a/single");
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
      const response = await translationHttpResponse(url);
      if (response.status === 200) return JSON.parse(response.body);
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

function translationHttpResponse(url) {
  return fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  }).then(async (response) => ({ status: response.status, body: await response.text() }));
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
