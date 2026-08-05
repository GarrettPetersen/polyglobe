import { readFileSync } from "node:fs";
import { CAPSULE_TITLE_LOCALES } from "../../pixel-globe/tools/capsule-title-locales.mjs";
import { STEAM_SCREENSHOT_LANGUAGES } from "../../pixel-globe/tools/steam-screenshot-catalog.mjs";

const FEATURE_IDS = Object.freeze([
  "explore", "trade", "fish", "whale", "colonize", "fight", "pillage", "survive"
]);

const UI_KEYS = Object.freeze([
  "navAbout", "navShips", "navPress", "navQaEnglish", "navDemo", "language",
  "heroKicker", "wishlist", "playDemo", "platform",
  "galleryHeading", "openPressKit", "finalTitle", "finalBody",
  "downloadPressKit", "factSheet", "release", "platforms", "genre", "textLanguages",
  "aboutGame", "screenshotsHeading", "screenshotsBody", "downloadScreenshots",
  "capsulesHeading", "capsulesBody", "downloadCapsules",
  "englishResources", "qaEnglish", "readQaEnglish", "completeEnglishPressKit",
  "assetUse", "assetUseBody", "downloadPng", "downloadZip",
  "developedPublished", "privacy", "pandaShot",
  "greatBarrierReefShot", "spiceIslandsShot", "setoInlandSeaShot",
  "bosporusShot", "lakeVictoriaShot"
]);

const SLUGS = Object.freeze({
  en: "",
  "zh-Hans": "zh-hans",
  ru: "ru",
  es: "es",
  "pt-BR": "pt-br",
  ja: "ja",
  de: "de",
  fr: "fr",
  pl: "pl",
  "zh-Hant": "zh-hant",
  ko: "ko"
});

const UI = Object.freeze({
  en: ui(`
About|Ships|Press kit|Q&A|Demo|Language
A globe-spanning sailing roguelike · 1522|Wishlist on Steam|Play browser demo|Coming soon on Steam for Windows, macOS, and Linux.
From the captain's log|Open the press kit|Catch a good wind.|Make your fortune before the sea takes it back.
Download English press kit|Fact sheet|Release|Platforms|Genre|Text languages
About the game|English screenshots|14 full-resolution gameplay screenshots with the English interface.|Download English screenshots
English capsule art|Full-resolution storefront, library, event, social, itch.io, and press artwork.|Download English capsule art
English resources|Developer Q&A (English)|Read the Q&A|Download complete multilingual press kit
Asset use|These assets may be used for editorial coverage, reviews, videos, streams, and event listings concerning Marque & Reprisal. Preserve their aspect ratio and crisp pixel edges.|Download PNG|Download ZIP
Developed & published by Iron Pagoda.|Privacy|Meet a panda in Sichuan|Sail the Great Barrier Reef|Sail the Spice Islands|Sail the Seto Inland Sea|Sail the Bosporus|Sail Lake Victoria
`),
  "zh-Hans": ui(`
游戏介绍|舰船|媒体资料|开发者问答（英文）|试玩版|语言
纵贯全球的航海 Roguelike · 1522|在 Steam 加入愿望单|在线试玩|即将在 Steam 同步登陆 Windows、macOS 与 Linux。
船长日志|打开媒体资料|乘风启航。|在大海夺回一切之前赚取你的财富。
下载简体中文媒体包|资料一览|发行日期|平台|类型|文本语言
游戏介绍|简体中文截图|14张采用简体中文界面的全分辨率游戏截图。|下载简体中文截图
简体中文商店美术|适用于商店、库、活动、社交媒体、itch.io 与媒体报道的全分辨率美术。|下载简体中文美术
英文资料|开发者问答（英文）|阅读问答|下载完整多语言媒体包
素材使用|这些素材可用于与《私掠 & 报复》有关的新闻报道、评测、视频、直播和活动页面。请保持宽高比与清晰的像素边缘。|下载 PNG|下载 ZIP
由 Iron Pagoda 开发并发行。|隐私|在四川遇见熊猫|航行大堡礁|航行香料群岛|航行濑户内海|航行博斯普鲁斯海峡|航行维多利亚湖
`),
  ru: ui(`
Об игре|Корабли|Пресс-кит|Вопросы и ответы (англ.)|Демо|Язык
Морской roguelike на всей Земле · 1522|Добавить в желаемое Steam|Играть в браузере|Скоро в Steam одновременно для Windows, macOS и Linux.
Из журнала капитана|Открыть пресс-кит|Поймайте попутный ветер.|Сколотите состояние, пока море не забрало его обратно.
Скачать русский пресс-кит|Краткие сведения|Выход|Платформы|Жанр|Языки текста
Об игре|Русские скриншоты|14 полноразмерных игровых скриншотов с русским интерфейсом.|Скачать русские скриншоты
Русские капсулы|Полноразмерная графика для магазина, библиотеки, событий, соцсетей, itch.io и прессы.|Скачать русскую графику
Материалы на английском|Вопросы разработчику (англ.)|Читать интервью|Скачать полный многоязычный пресс-кит
Использование материалов|Материалы можно использовать в публикациях, обзорах, видео, трансляциях и списках событий о «Каперстве & Возмездии». Сохраняйте пропорции и чёткие пиксельные края.|Скачать PNG|Скачать ZIP
Разработчик и издатель — Iron Pagoda.|Конфиденциальность|Встретить панду в Сычуани|Плавание вдоль Большого Барьерного рифа|Плавание среди Островов пряностей|Плавание по Внутреннему Японскому морю|Плавание по Босфору|Плавание по озеру Виктория
`),
  es: ui(`
Acerca del juego|Navíos|Kit de prensa|Preguntas (inglés)|Demo|Idioma
Un roguelike naval por todo el globo · 1522|Añadir a deseados en Steam|Jugar la demo web|Próximamente en Steam para Windows, macOS y Linux simultáneamente.
Del cuaderno del capitán|Abrir el kit de prensa|Atrapa un buen viento.|Haz fortuna antes de que el mar se la lleve.
Descargar kit de prensa en español|Ficha técnica|Lanzamiento|Plataformas|Género|Idiomas de texto
Acerca del juego|Capturas en español|14 capturas de juego a resolución completa con la interfaz en español.|Descargar capturas en español
Arte de cápsulas en español|Arte a resolución completa para tienda, biblioteca, eventos, redes, itch.io y prensa.|Descargar arte en español
Recursos en inglés|Preguntas al desarrollador (inglés)|Leer preguntas|Descargar kit de prensa multilingüe
Uso de recursos|Estos recursos pueden usarse en cobertura editorial, reseñas, vídeos, directos y eventos sobre Corso & Represalia. Conserva la proporción y los bordes de píxel nítidos.|Descargar PNG|Descargar ZIP
Desarrollado y publicado por Iron Pagoda.|Privacidad|Conoce a un panda en Sichuan|Navega por la Gran Barrera de Coral|Navega por las Islas de las Especias|Navega por el mar Interior de Seto|Navega por el Bósforo|Navega por el lago Victoria
`),
  "pt-BR": ui(`
Sobre o jogo|Navios|Kit de imprensa|Perguntas (inglês)|Demo|Idioma
Um roguelike de navegação pelo globo · 1522|Adicionar à lista da Steam|Jogar demo no navegador|Em breve na Steam para Windows, macOS e Linux simultaneamente.
Do diário do capitão|Abrir o kit de imprensa|Pegue um bom vento.|Faça fortuna antes que o mar a tome de volta.
Baixar kit de imprensa em português|Ficha técnica|Lançamento|Plataformas|Gênero|Idiomas do texto
Sobre o jogo|Capturas em português|14 capturas em resolução completa com a interface em português do Brasil.|Baixar capturas em português
Arte de cápsulas em português|Arte em resolução completa para loja, biblioteca, eventos, redes, itch.io e imprensa.|Baixar arte em português
Recursos em inglês|Perguntas ao desenvolvedor (inglês)|Ler perguntas|Baixar kit de imprensa multilíngue
Uso dos materiais|Estes materiais podem ser usados em matérias, análises, vídeos, transmissões e eventos sobre Corso & Represália. Preserve a proporção e as bordas nítidas dos pixels.|Baixar PNG|Baixar ZIP
Desenvolvido e publicado por Iron Pagoda.|Privacidade|Encontre um panda em Sichuan|Navegue pela Grande Barreira de Corais|Navegue pelas Ilhas das Especiarias|Navegue pelo Mar Interior de Seto|Navegue pelo Bósforo|Navegue pelo Lago Vitória
`),
  ja: ui(`
ゲーム紹介|船|プレスキット|開発者Q&A（英語）|体験版|言語
地球規模の航海ローグライク · 1522年|Steamでウィッシュリストに追加|ブラウザ体験版|Windows・macOS・Linux版をSteamで同時発売予定。
船長の航海日誌|プレスキットを開く|良い風をつかめ。|海に奪い返される前に、富を築け。
日本語プレスキットをダウンロード|基本情報|発売日|対応OS|ジャンル|対応言語
ゲーム紹介|日本語スクリーンショット|日本語インターフェイスのフル解像度ゲーム画面14点。|日本語スクリーンショットをダウンロード
日本語カプセルアート|Steam、ライブラリ、イベント、SNS、itch.io、報道向けのフル解像度素材。|日本語アートをダウンロード
英語資料|開発者Q&A（英語）|Q&Aを読む|多言語完全版プレスキット
素材の使用|『私掠 & 報復』に関する記事、レビュー、動画、配信、イベント告知に使用できます。縦横比と鮮明なピクセル輪郭を保ってください。|PNGをダウンロード|ZIPをダウンロード
Iron Pagoda 開発・販売。|プライバシー|四川でパンダに出会う|グレート・バリア・リーフを航海|香料諸島を航海|瀬戸内海を航海|ボスポラス海峡を航海|ヴィクトリア湖を航海
`),
  de: ui(`
Über das Spiel|Schiffe|Pressekit|Fragen (Englisch)|Demo|Sprache
Ein weltumspannendes Seefahrt-Roguelike · 1522|Auf Steam wünschen|Browser-Demo spielen|Demnächst gleichzeitig auf Steam für Windows, macOS und Linux.
Aus dem Logbuch|Pressekit öffnen|Fang einen guten Wind.|Mach dein Glück, bevor das Meer es zurückholt.
Deutsches Pressekit herunterladen|Steckbrief|Veröffentlichung|Plattformen|Genre|Textsprachen
Über das Spiel|Deutsche Screenshots|14 hochauflösende Spielszenen mit deutscher Oberfläche.|Deutsche Screenshots herunterladen
Deutsche Kapselgrafik|Hochauflösende Grafiken für Shop, Bibliothek, Events, soziale Medien, itch.io und Presse.|Deutsche Grafik herunterladen
Englische Materialien|Entwickler-Q&A (Englisch)|Q&A lesen|Komplettes mehrsprachiges Pressekit
Nutzung der Assets|Diese Assets dürfen für Berichte, Rezensionen, Videos, Streams und Veranstaltungen zu Kaperbrief & Vergeltung verwendet werden. Seitenverhältnis und klare Pixelkanten bitte erhalten.|PNG herunterladen|ZIP herunterladen
Entwickelt und veröffentlicht von Iron Pagoda.|Datenschutz|Einen Panda in Sichuan treffen|Am Great Barrier Reef segeln|Durch die Gewürzinseln segeln|Durch die Seto-Inlandsee segeln|Durch den Bosporus segeln|Auf dem Viktoriasee segeln
`),
  fr: ui(`
À propos|Navires|Dossier de presse|Questions (anglais)|Démo|Langue
Un roguelike de navigation à l'échelle du globe · 1522|Ajouter aux souhaits Steam|Jouer à la démo web|Bientôt sur Steam, simultanément sur Windows, macOS et Linux.
Extrait du journal de bord|Ouvrir le dossier de presse|Trouvez un vent favorable.|Faites fortune avant que la mer ne la reprenne.
Télécharger le dossier de presse français|Fiche technique|Sortie|Plateformes|Genre|Langues du texte
À propos du jeu|Captures françaises|14 captures de jeu en pleine résolution avec l'interface française.|Télécharger les captures françaises
Illustrations françaises|Illustrations haute résolution pour boutique, bibliothèque, événements, réseaux, itch.io et presse.|Télécharger les illustrations françaises
Ressources anglaises|Questions au développeur (anglais)|Lire les questions|Dossier multilingue complet
Utilisation des ressources|Ces ressources peuvent servir aux articles, critiques, vidéos, streams et événements concernant Marque & Représailles. Conservez les proportions et les bords nets des pixels.|Télécharger le PNG|Télécharger le ZIP
Développé et publié par Iron Pagoda.|Confidentialité|Rencontrer un panda au Sichuan|Naviguez sur la Grande Barrière de corail|Naviguez dans les îles aux Épices|Naviguez sur la mer intérieure de Seto|Naviguez sur le Bosphore|Naviguez sur le lac Victoria
`),
  pl: ui(`
O grze|Statki|Materiały prasowe|Pytania (angielski)|Demo|Język
Żeglarski roguelike na całym globie · 1522|Dodaj do listy życzeń Steam|Zagraj w demo|Wkrótce jednocześnie na Steam dla Windows, macOS i Linux.
Z dziennika kapitana|Otwórz materiały prasowe|Złap dobry wiatr.|Zdobądź fortunę, zanim morze ją odbierze.
Pobierz polski pakiet prasowy|Informacje|Premiera|Platformy|Gatunek|Języki tekstu
O grze|Polskie zrzuty ekranu|14 pełnowymiarowych zrzutów z polskim interfejsem.|Pobierz polskie zrzuty
Polskie grafiki kapsuł|Pełnowymiarowe grafiki do sklepu, biblioteki, wydarzeń, mediów, itch.io i prasy.|Pobierz polskie grafiki
Materiały angielskie|Pytania do twórcy (angielski)|Czytaj pytania|Pełny wielojęzyczny pakiet prasowy
Wykorzystanie materiałów|Materiały mogą być używane w artykułach, recenzjach, filmach, transmisjach i wydarzeniach o Kaperstwie & Odwecie. Zachowaj proporcje i ostre krawędzie pikseli.|Pobierz PNG|Pobierz ZIP
Gra opracowana i wydana przez Iron Pagoda.|Prywatność|Spotkaj pandę w Syczuanie|Żegluj wzdłuż Wielkiej Rafy Koralowej|Żegluj po Wyspach Korzennych|Żegluj po Morzu Wewnętrznym Seto|Żegluj przez Bosfor|Żegluj po Jeziorze Wiktorii
`),
  "zh-Hant": ui(`
遊戲介紹|船艦|媒體資料|開發者問答（英文）|試玩版|語言
縱貫全球的航海 Roguelike · 1522|在 Steam 加入願望清單|線上試玩|即將在 Steam 同步登上 Windows、macOS 與 Linux。
船長日誌|開啟媒體資料|乘風啟航。|在大海奪回一切之前賺取你的財富。
下載繁體中文媒體包|資料一覽|發售日期|平台|類型|文字語言
遊戲介紹|繁體中文截圖|14張採用繁體中文介面的完整解析度遊戲截圖。|下載繁體中文截圖
繁體中文商店美術|適用於商店、收藏庫、活動、社群、itch.io 與媒體報導的完整解析度美術。|下載繁體中文美術
英文資料|開發者問答（英文）|閱讀問答|下載完整多語言媒體包
素材使用|這些素材可用於與《私掠 & 報復》相關的新聞、評論、影片、直播及活動頁面。請保持長寬比與清晰的像素邊緣。|下載 PNG|下載 ZIP
由 Iron Pagoda 開發並發行。|隱私|在四川遇見熊貓|航行大堡礁|航行香料群島|航行瀨戶內海|航行博斯普魯斯海峽|航行維多利亞湖
`),
  ko: ui(`
게임 소개|선박|프레스 키트|개발자 문답(영어)|데모|언어
전 세계를 누비는 항해 로그라이크 · 1522년|Steam 찜 목록에 추가|브라우저 데모 플레이|Windows, macOS, Linux용으로 Steam에서 동시 출시 예정.
선장의 항해일지|프레스 키트 열기|좋은 바람을 잡으세요.|바다가 되찾기 전에 부를 이루세요.
한국어 프레스 키트 다운로드|기본 정보|출시|플랫폼|장르|지원 언어
게임 소개|한국어 스크린샷|한국어 인터페이스의 전체 해상도 게임 스크린샷 14장.|한국어 스크린샷 다운로드
한국어 캡슐 아트|상점, 라이브러리, 이벤트, 소셜, itch.io 및 언론용 전체 해상도 아트.|한국어 아트 다운로드
영문 자료|개발자 문답(영어)|문답 읽기|전체 다국어 프레스 키트
자료 사용|『사략 & 보복』 관련 기사, 리뷰, 영상, 방송 및 이벤트에 사용할 수 있습니다. 화면 비율과 선명한 픽셀 가장자리를 유지해 주세요.|PNG 다운로드|ZIP 다운로드
Iron Pagoda 개발 및 배급.|개인정보 보호|쓰촨에서 판다 만나기|그레이트배리어리프 항해|향신료 제도 항해|세토 내해 항해|보스포루스 해협 항해|빅토리아호 항해
`)
});

const ACTION_TITLES = Object.freeze({
  en: ["Explore", "Trade", "Fish", "Whale", "Colonize", "Fight", "Pillage", "Survive"],
  "zh-Hans": ["探索", "贸易", "捕鱼", "捕鲸", "殖民", "战斗", "劫掠", "生存"],
  ru: ["Исследуйте", "Торгуйте", "Рыбачьте", "Охотьтесь на китов", "Основывайте колонии", "Сражайтесь", "Грабьте", "Выживайте"],
  es: ["Explora", "Comercia", "Pesca", "Caza ballenas", "Coloniza", "Lucha", "Saquea", "Sobrevive"],
  "pt-BR": ["Explore", "Negocie", "Pesque", "Cace baleias", "Colonize", "Lute", "Saqueie", "Sobreviva"],
  ja: ["探索", "交易", "漁", "捕鯨", "植民", "戦闘", "略奪", "生存"],
  de: ["Erkunde", "Handle", "Fische", "Jage Wale", "Gründe Kolonien", "Kämpfe", "Plündere", "Überlebe"],
  fr: ["Explorez", "Commercez", "Pêchez", "Chassez la baleine", "Colonisez", "Combattez", "Pillez", "Survivez"],
  pl: ["Eksploruj", "Handluj", "Łów ryby", "Poluj na wieloryby", "Zakładaj kolonie", "Walcz", "Plądruj", "Przetrwaj"],
  "zh-Hant": ["探索", "貿易", "捕魚", "捕鯨", "殖民", "戰鬥", "劫掠", "生存"],
  ko: ["탐험", "교역", "낚시", "고래 사냥", "식민지", "전투", "약탈", "생존"]
});

const MAP_COUNT_REPLACEMENTS = Object.freeze({
  english: ["164k-hex", "163,842-cell"],
  schinese: ["16.4万个六边形", "163,842个六边形"],
  russian: ["164 тысяч шестиугольников", "163 842 шестиугольников"],
  spanish: ["164 000 hexágonos", "163 842 hexágonos"],
  brazilian: ["164 mil hexágonos", "163.842 hexágonos"],
  japanese: ["16万4千のヘックス", "163,842個のヘックス"],
  german: ["164.000 Hexfeldern", "163.842 Hexfeldern"],
  french: ["164 000 hexagones", "163 842 hexagones"],
  polish: ["164 tysięcy heksów", "163 842 heksów"],
  tchinese: ["16.4萬個六角格", "163,842個六角格"],
  koreana: ["16만 4천 개의 육각형", "163,842개의 육각형"]
});

const storePage = JSON.parse(readFileSync(new URL(
  "../../pixel-globe/steam/store-page/storepage_1266799_all_localized.json",
  import.meta.url
), "utf8"));

export const websiteLocales = Object.freeze(STEAM_SCREENSHOT_LANGUAGES.map((language) => {
  const capsule = CAPSULE_TITLE_LOCALES.find(({ appLocale }) => appLocale === language.id);
  const copy = UI[language.id];
  const slug = SLUGS[language.id];
  const actions = ACTION_TITLES[language.id];
  const steam = storePage.languages[language.steamCode];
  if (!capsule || !copy || slug === undefined || !actions || !steam) {
    throw new Error(`Website locale is incomplete: ${language.id}`);
  }
  const paragraphs = steamParagraphs(steam["app[content][about]"], language.steamCode);
  return Object.freeze({
    appLocale: language.id,
    steamCode: language.steamCode,
    label: language.label,
    nativeLabel: language.nativeLabel,
    slug,
    title: `${capsule.upperWord} & ${capsule.lowerWord}`,
    previewFile: `capsule_main_${language.steamCode}.png`,
    archiveFile: `marque-and-reprisal-capsules-${language.steamCode}.zip`,
    ui: copy,
    actions: Object.freeze(actions),
    intro: paragraphs[0],
    demoCopy: paragraphs[1],
    featureCopy: Object.freeze(Object.fromEntries(FEATURE_IDS.map((id, index) => [id, paragraphs[index + 2]]))),
    pressKitArchive: `marque-and-reprisal-press-kit-${language.steamCode}.zip`
  });
}));

export const defaultWebsiteLocale = websiteLocales[0];

export function websiteLocale(value = "en") {
  const normalized = String(value).trim().toLocaleLowerCase("en-US");
  const match = websiteLocales.find((locale) => [
    locale.appLocale,
    locale.steamCode,
    locale.label,
    locale.nativeLabel,
    locale.slug || "english"
  ].some((alias) => alias.toLocaleLowerCase("en-US") === normalized));
  if (!match) throw new Error(`Unknown website locale: ${value}`);
  return match;
}

export function localizedPagePath(locale, page = "home") {
  if (!websiteLocales.includes(locale)) throw new Error("Localized page path requires a website locale");
  if (page !== "home" && page !== "press") throw new Error(`Unknown localized page kind: ${page}`);
  const prefix = locale.slug ? `/${locale.slug}` : "";
  return page === "home" ? `${prefix}/` : `${prefix}/press/`;
}

function ui(block) {
  const values = block.trim().split(/\s*\n\s*/).flatMap((line) => line.split("|"));
  if (values.length !== UI_KEYS.length || values.some((value) => value.length === 0)) {
    throw new Error(`Website UI translation has ${values.length}/${UI_KEYS.length} entries`);
  }
  return Object.freeze(Object.fromEntries(UI_KEYS.map((key, index) => [key, values[index]])));
}

function steamParagraphs(about, steamCode) {
  if (typeof about !== "string") throw new Error(`Missing Steam about copy: ${steamCode}`);
  const paragraphs = [...about.matchAll(/\[p\]([\s\S]*?)\[\/p\]/g)]
    .map((match) => decodeSteamText(match[1].replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/g, "")))
    .filter(Boolean);
  if (paragraphs.length !== 10) {
    throw new Error(`Steam website copy needs 10 paragraphs for ${steamCode}; found ${paragraphs.length}`);
  }
  const replacement = MAP_COUNT_REPLACEMENTS[steamCode];
  if (!replacement || !paragraphs[2].includes(replacement[0])) {
    throw new Error(`Steam map count copy is unrecognized for ${steamCode}`);
  }
  paragraphs[2] = paragraphs[2].replace(replacement[0], replacement[1]);
  return paragraphs;
}

function decodeSteamText(value) {
  return value
    .replace(/\r?\n/g, " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
}
