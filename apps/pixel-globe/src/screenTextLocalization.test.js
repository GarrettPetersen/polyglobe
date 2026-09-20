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

test("validation argument labels do not enter the player-facing translation catalog", () => {
  const sourceCatalog = extractScreenTextSourceCatalog(SOURCE_ROOT);
  for (const internalLabel of [
    "campaign reminder doubloons", "campaign reminder home port", "campaign reminder contact",
    "buyPrice", "capitalContributions", "constructionExpenses", "effectDetail", "foodUnits",
    "itemId", "LocalSaveWriteError", "playerPayouts", "salesPitch", "salesRevenue", "sellPrice",
    "tradeImpact", "waterUnits"
  ]) {
    assert.ok(!sourceCatalog.includes(internalLabel), internalLabel);
  }
});

test("historical maritime and trade language keeps its intended meaning", () => {
  assertReviewedTranslations([
    ["Camel trains halt beside the warehouses as sailors carry manifests from the anchorage to the customs court.", [
      "骆驼商队停在仓库旁，水手们则把货单从锚地送往海关。",
      "Верблюжьи караваны останавливаются у складов, пока моряки несут манифесты с рейда в таможню.",
      "Las caravanas de camellos se detienen junto a los almacenes mientras los marineros llevan los manifiestos desde el fondeadero a la aduana.",
      "As caravanas de camelos param junto aos armazéns enquanto marinheiros levam os manifestos do ancoradouro à alfândega.",
      "ラクダの隊商が倉庫のそばで足を止める。水夫たちは停泊地から税関へ貨物目録を運んでいる。",
      "Kamelkarawanen halten neben den Lagerhäusern, während Seeleute die Frachtlisten vom Ankerplatz zum Zollhaus bringen.",
      "Des caravanes de chameaux s'arrêtent près des entrepôts tandis que les marins portent les manifestes du mouillage à la douane.",
      "Karawany wielbłądów zatrzymują się przy magazynach, gdy marynarze niosą manifesty z kotwicowiska do urzędu celnego.",
      "駱駝商隊停在倉庫旁，水手們則把貨單從錨地送往海關。",
      "낙타 대상이 창고 옆에 멈춰 서고, 선원들은 정박지에서 세관까지 화물 목록을 나릅니다."
    ]],
    ["By the sovereign's seal, the customs of {0} are offered until twelve hundred thousand doubloons have answered your indenture.", [
      "奉君主之印，{0}的关税收入将交予你，直至偿清一百二十万达布隆的契约债务。",
      "По печати государя вам передаются таможенные доходы {0}, пока они не покроют долг по вашему контракту в миллион двести тысяч дублонов.",
      "Por mandato soberano, se te ceden los ingresos aduaneros de {0} hasta saldar tu contrato por un millón doscientos mil doblones.",
      "Por ordem do soberano, a receita alfandegária de {0} será destinada a quitar sua dívida contratual de um milhão e duzentos mil dobrões.",
      "君主の御璽により、契約債務の百二十万ダブロンを返済するまで、{0}の関税収入を譲渡する。",
      "Mit dem Siegel des Landesherrn werden Euch die Zolleinnahmen aus {0} überlassen, bis Eure Vertragsschuld von einer Million zweihunderttausend Dublonen beglichen ist.",
      "Par le sceau du souverain, les recettes douanières de {0} vous sont attribuées jusqu'au remboursement de votre engagement, soit un million deux cent mille doublons.",
      "Na mocy pieczęci władcy dochody celne z {0} zostają ci przyznane, aż pokryją zobowiązanie kontraktowe w wysokości miliona dwustu tysięcy dublonów.",
      "奉君主之印，{0}的關稅收入將交予你，直至償清一百二十萬達布隆的契約債務。",
      "군주의 인장에 따라 {0}의 관세 수입을 계약 채무인 120만 더블룬을 갚을 때까지 양도합니다."
    ]]
  ], "historical maritime and trade language");
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

test("reviewed Spanish screen copy avoids nautical and historical false friends", () => {
  const reviewed = new Map([
    ["A raccoon aboard? I know its kind, captain. Count every ration again after dark.", "¿Un mapache a bordo? Conozco la especie, capitán. Vuelve a contar las raciones al anochecer."],
    ["A sperm whale stove in your hull.", "Un cachalote te abrió una brecha en el casco."],
    ["A settlement founded for conscience still needs practical independence. Add", "Un asentamiento fundado por motivos de conciencia también necesita independencia práctica. Añade"],
    ["A storm is working nearby. Check every line before departure.", "Se acerca una tormenta. Revisa cada cabo antes de zarpar."],
    ["A shirt of fine linked rings protects fighting hands from cuts and arrows.", "Una cota de malla fina protege de cortes y flechas a quienes combaten."],
    ["A venomous snake struck among the rocks. The party returned to the ship one fewer.", "Una serpiente venenosa mordió a un marinero entre las rocas. El grupo regresó al barco con uno menos."]
  ]);
  for (const [source, expected] of reviewed) {
    assert.equal(localizeText("es", source), expected, source);
  }
});

test("harpoon line break rates are translated as a broken line, not a text wrap", () => {
  const reviewed = new Map([
    ["Accuracy {0}%, line break {1}%", [
      "准确度 {0}%，断绳率 {1}%", "Точность {0}%, обрыв линя {1}%", "Precisión {0}%, rotura del cabo {1}%", "Precisão {0}%, ruptura do cabo {1}%", "命中精度 {0}%、銛綱の破断率 {1}%", "Trefferquote {0}%, Leinenbruch {1}%", "Précision {0}%, rupture du cordage {1}%", "Celność {0}%, zerwanie liny {1}%", "準確度 {0}%，斷繩率 {1}%", "정확도 {0}%, 작살줄 끊김 확률 {1}%"
    ]]
  ]);
  assertReviewedTranslations(reviewed, "harpoon line break");
});

test("historical commissions, tribute, and provisioning instructions keep their context", () => {
  const reviewed = new Map([
    ["Acquire one each for {0}: {1}.", ["为{0}各备一份：{1}。", "Доставьте в {0} по одной единице каждого продукта: {1}.", "Consigue una unidad de cada ingrediente para {0}: {1}.", "Consiga uma unidade de cada ingrediente para {0}: {1}.", "{0}に材料を一つずつ届ける：{1}。", "Besorge für {0} je eine Einheit: {1}.", "Procurez-vous un exemplaire de chaque ingrédient pour {0} : {1}.", "Zdobądź po jednej sztuce każdego składnika dla {0}: {1}.", "為{0}各備一份：{1}。", "{0}에 재료를 하나씩 가져오기: {1}."]],
    ["Agadez sends tribute to Gao. None of it bears your family's mark.", ["阿加德兹向加奥进贡。这些贡品上没有你家族的印记。", "Агадес платит дань Гао. Ни на одном подношении нет знака вашей семьи.", "Agadez envía tributo a Gao. Ninguna ofrenda lleva el emblema de tu familia.", "Agadez envia tributo a Gao. Nenhuma oferenda traz a marca da sua família.", "アガデスはガオに貢納している。その品々に、あなたの一族の印はない。", "Agadez entrichtet Gao Tribut. Keine der Gaben trägt das Zeichen deiner Familie.", "Agadez verse un tribut à Gao. Aucun présent ne porte la marque de votre famille.", "Agadez składa daninę Gao. Żaden dar nie nosi znaku twojej rodziny.", "阿加德茲向加奧進貢。這些貢品上沒有你家族的印記。", "아가데즈가 가오에 조공을 바칩니다. 어느 공물에도 가문의 표식은 없습니다."]],
    ["Adrian VI has sealed a reform brief for the northern clergy. Carry it north and return with their answer.", ["教宗阿德里安六世已为北方教士封好一份改革文书。将它送往北方并带回答复。", "Адриан VI запечатал послание о реформе для северного духовенства. Отвезите его на север и вернитесь с ответом.", "Adriano VI ha sellado un breve de reforma para el clero del norte. Llévalo al norte y regresa con su respuesta.", "Adriano VI selou um breve de reforma para o clero do norte. Leve-o ao norte e volte com a resposta.", "教皇アドリアーノ6世は北方の聖職者に向けた改革書簡に封をした。それを北へ届け、返事を持ち帰れ。", "Adrian VI. hat ein versiegeltes Reformschreiben für den Klerus des Nordens aufgesetzt. Bringt es nach Norden und kehrt mit ihrer Antwort zurück.", "Adrien VI a scellé un bref de réforme destiné au clergé du Nord. Portez-le au nord et revenez avec sa réponse.", "Adrian VI zapieczętował pismo reformacyjne dla duchowieństwa północy. Zanieś je na północ i wróć z odpowiedzią.", "教宗亞德里安六世已為北方教士封好一份改革文書。將它送往北方並帶回答覆。", "교황 아드리아노 6세가 북부 성직자들에게 보낼 개혁 서한을 봉인했습니다. 이를 북쪽에 전하고 답을 받아 돌아오세요."]]
  ]);
  assertReviewedTranslations(reviewed, "historical commission wording");
});

test("tea-race, artillery-route, and landmark wording avoids literal machine translations", () => {
  const reviewed = new Map([
    ["Another racing ship has unloaded, but the first-crop buyers still offer a finishing premium.", ["又一艘竞速船已卸下新茶，但头采茶的买家仍愿意为赶上交货期限支付尾程奖金。", "Ещё один участник гонки доставил груз, но покупатели первого сбора всё ещё платят премию за своевременную доставку.", "Otro barco de la carrera ya descargó su té, pero los compradores de la primera cosecha aún ofrecen una prima por entregarlo a tiempo.", "Outro navio da corrida já descarregou o chá, mas os compradores da primeira colheita ainda pagam um bônus pela entrega no prazo.", "競争相手の船はすでに茶を荷揚げしたが、初摘み茶の買い手はまだ期限内の納入に割増金を出している。", "Ein weiteres Schiff des Wettlaufs hat entladen, doch die Käufer der ersten Teeernte zahlen weiterhin einen Zuschlag für pünktliche Lieferung.", "Un autre navire de la course a déchargé son thé, mais les acheteurs de la première récolte offrent encore une prime pour une livraison dans les délais.", "Kolejny statek w wyścigu wyładował herbatę, ale nabywcy pierwszego zbioru nadal płacą premię za dostawę na czas.", "又一艘競速船已卸下新茶，但頭採茶的買家仍願意為趕上交貨期限支付尾程獎金。", "경쟁 선박 한 척이 차를 먼저 내렸지만, 첫물차 구매자들은 아직 기한 내 납품에 웃돈을 제시합니다."]],
    ["ARTILLERY CIRCUIT {0}/{1}", ["炮兵巡回路线 {0}/{1}", "АРТИЛЛЕРИЙСКИЙ МАРШРУТ {0}/{1}", "RUTA ARTILLERA {0}/{1}", "ROTA DE ARTILHARIA {0}/{1}", "砲術巡航 {0}/{1}", "ARTILLERIEROUTE {0}/{1}", "CIRCUIT D'ARTILLERIE {0}/{1}", "SZLAK ARTYLERYJSKI {0}/{1}", "砲兵巡迴路線 {0}/{1}", "포격 항로 {0}/{1}"]],
    ["At Giza, the pyramid swallowed the horizon. Each stone course is taller than a person, yet the four faces rise with a precision I could scarcely find in a shipwright's rule.", ["在吉萨，金字塔高耸入天，遮住了地平线。每层石块都比人高，四面却垒砌得如此精准，连造船匠的尺规也难以企及。", "В Гизе пирамида закрывала собой весь горизонт. Каждый ряд камней выше человека, а четыре грани сложены с точностью, какой не найти даже у корабельного мастера с его мерной рейкой.", "En Giza, la pirámide ocultaba el horizonte. Cada hilada de piedra supera la altura de una persona, y sus cuatro caras se alzan con una precisión difícil de hallar incluso en la regla de un carpintero naval.", "Em Gizé, a pirâmide encobria o horizonte. Cada fiada de pedra é mais alta que uma pessoa, e suas quatro faces se erguem com uma precisão difícil de encontrar até mesmo na régua de um construtor naval.", "ギザではピラミッドが地平線を覆い隠していた。一段ごとの石組みは人の背丈より高いのに、四つの斜面は船大工の物差しにも見られないほど正確に築かれている。", "In Gizeh verschluckte die Pyramide den Horizont. Jede Steinlage ist höher als ein Mensch, und doch steigen ihre vier Seiten mit einer Präzision auf, die selbst ein Schiffszimmermann mit seinem Maßstab kaum erreicht.", "À Gizeh, la pyramide engloutissait l'horizon. Chaque assise de pierre dépasse la taille d'une personne, et pourtant ses quatre faces s'élèvent avec une précision que même la règle d'un charpentier de marine peine à égaler.", "W Gizie piramida pochłaniała horyzont. Każda warstwa kamieni jest wyższa od człowieka, a mimo to jej cztery ściany wznoszą się z precyzją trudną do osiągnięcia nawet przy użyciu miarki szkutnika.", "在吉薩，金字塔高聳入天，遮住了地平線。每層石塊都比人高，四面卻堆砌得如此精準，連造船匠的尺規也難以企及。", "기자에서는 피라미드가 지평선을 삼켰습니다. 돌 한 층의 높이가 사람 키보다 높은데도 네 면은 조선공의 자로도 재기 어려울 만큼 정밀하게 솟아 있습니다."]]
  ]);
  assertReviewedTranslations(reviewed, "tea race and landmark wording");
});

test("landmark discovery and Reformation dialogue preserve their intended meaning", () => {
  const reviewed = new Map([
    ["At last, proportions from a sober witness rather than a tapestry. Its tongue and gait may be more instructive than the extraordinary neck everyone remembers.", ["总算从可靠目击者那里得到了比例数据，而不是照着挂毯猜测。它的舌头和步态，或许比人人记得的那条奇特长颈更值得研究。", "Наконец-то мы получили описание пропорций от надёжного свидетеля, а не с гобелена. Язык и походка животного могут рассказать больше, чем его необычная шея, которую помнят все.", "Al fin tenemos las proporciones descritas por un testigo fiable, no deducidas de un tapiz. Su lengua y su forma de andar pueden enseñarnos más que el extraordinario cuello que todos recuerdan.", "Enfim, temos as proporções descritas por uma testemunha confiável, não deduzidas de uma tapeçaria. A língua e o andar do animal podem ensinar mais que o pescoço extraordinário de que todos se lembram.", "ついに、タペストリーではなく信頼できる目撃者から体の比率を聞けた。その舌や歩き方は、誰もが覚えている長い首よりも多くを教えてくれるかもしれない。", "Endlich stammen die Proportionen von einem glaubwürdigen Zeugen statt von einem Wandteppich. Zunge und Gang könnten aufschlussreicher sein als der außergewöhnliche Hals, an den sich alle erinnern.", "Enfin, les proportions viennent d'un témoin digne de foi et non d'une tapisserie. Sa langue et sa démarche en apprendront peut-être davantage que son cou extraordinaire, dont tout le monde se souvient.", "Wreszcie znamy proporcje z relacji wiarygodnego świadka, a nie z gobelinu. Język i chód zwierzęcia mogą powiedzieć więcej niż niezwykła szyja, którą wszyscy pamiętają.", "總算從可靠目擊者那裡得到了比例數據，而不是照著掛毯猜測。牠的舌頭和步態，或許比人人記得的那條奇特長頸更值得研究。", "마침내 태피스트리가 아닌 믿을 만한 목격자의 설명으로 비율을 알게 됐습니다. 모두가 기억하는 특이한 목보다 혀와 걸음걸이가 더 많은 것을 알려줄지도 모릅니다."]],
    ["At Worms, Luther refused lawful recantation before Church and Emperor. The Edict has made him an outlaw, yet his pamphlets still cross every market.", ["在沃尔姆斯，路德当着教会和皇帝的面拒绝正式撤回自己的主张。敕令将他宣布为亡命之徒，但他的传单仍在各地市场流传。", "В Вормсе Лютер отказался официально отречься от своих взглядов перед церковью и императором. Эдикт объявил его вне закона, но его памфлеты по-прежнему ходят по всем рынкам.", "En Worms, Lutero se negó a retractarse formalmente ante la Iglesia y el Emperador. El edicto lo declaró proscrito, pero sus panfletos siguen circulando por todos los mercados.", "Em Worms, Lutero se recusou a se retratar formalmente perante a Igreja e o Imperador. O Edito tornou-o proscrito, mas seus panfletos continuam circulando por todos os mercados.", "ヴォルムスでルターは、教会と皇帝の前で正式な撤回を拒んだ。勅令で帝国追放となったが、彼の小冊子は今も各地の市場に広まっている。", "In Worms verweigerte Luther vor Kirche und Kaiser den formellen Widerruf. Das Edikt erklärte ihn für vogelfrei, doch seine Flugschriften verbreiten sich weiterhin auf allen Märkten.", "À Worms, Luther refusa de se rétracter officiellement devant l'Église et l'empereur. L'édit le mit au ban de l'Empire, mais ses pamphlets continuent de circuler sur tous les marchés.", "W Wormacji Luter odmówił formalnego odwołania swoich poglądów przed Kościołem i cesarzem. Edykt wyjęł go spod prawa, lecz jego pisma nadal krążą po wszystkich targach.", "在沃爾姆斯，路德當著教會和皇帝的面拒絕正式撤回自己的主張。敕令將他宣布為亡命之徒，但他的傳單仍在各地市場流傳。", "보름스에서 루터는 교회와 황제 앞에서 공식적인 철회를 거부했습니다. 칙령으로 그는 제국의 보호를 잃었지만, 그의 소책자는 여전히 모든 시장에 퍼지고 있습니다."]],
    ["Aye. The chart can hang over a quiet hearth now. I have seen what lies beneath the red X, and I prefer the road home.", ["是啊。海图如今可以挂在宁静的壁炉上了。我已经见识过红色叉号下埋着什么，还是更愿意回家。", "Да. Теперь карта может висеть над тихим домашним очагом. Я видел, что скрывается под красным крестом, и предпочитаю дорогу домой.", "Sí. La carta puede colgar sobre un hogar tranquilo. Ya vi qué se esconde bajo la X roja, y prefiero volver a casa.", "Sim. A carta náutica já pode ficar sobre uma lareira tranquila. Vi o que há sob o X vermelho e prefiro voltar para casa.", "ああ。海図はもう、穏やかな炉辺に飾っておけばいい。赤いXの下に何があるかは見た。家へ帰る道のほうがいい。", "Ja. Die Seekarte kann nun über einem stillen Herd hängen. Ich habe gesehen, was unter dem roten X liegt, und ziehe den Heimweg vor.", "Oui. La carte peut désormais être accrochée au-dessus d'un âtre paisible. J'ai vu ce que cache le X rouge et je préfère rentrer chez moi.", "Tak. Mapa może teraz zawisnąć nad spokojnym domowym paleniskiem. Widziałem, co kryje się pod czerwonym X, i wolę wracać do domu.", "是啊。海圖如今可以掛在寧靜的壁爐上了。我已經見識過紅色叉號下埋著什麼，還是更願意回家。", "그래. 이제 해도는 조용한 집 난롯가에 걸어두면 되겠군. 붉은 X 아래에 무엇이 있는지 봤으니, 집으로 돌아가는 편이 낫겠어."]]
  ]);
  assertReviewedTranslations(reviewed, "historical dialogue and discovery prose");
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
