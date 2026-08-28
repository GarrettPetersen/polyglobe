import { mkdir, readFile, writeFile } from "node:fs/promises";
import { get } from "node:https";
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
  ...reviewedPortFactorRecognitionOverrides(),
  ...reviewedTreasurePirateSearchOverrides(),
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
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      response.setEncoding("utf8");
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => resolve({
        status: response.statusCode || 0,
        body
      }));
    });
    request.on("error", reject);
    request.setTimeout(30_000, () => {
      request.destroy(new Error("Translation request timed out"));
    });
  });
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
