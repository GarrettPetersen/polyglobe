#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const APP_ID = "1130064";
const ABOUT = "app[content][about]";
const SHORT_DESCRIPTION = "app[content][short_description]";
const WINDOWS_OS = "app[content][sysreqs][windows][min][osversion]";
const WINDOWS_PROCESSOR = "app[content][sysreqs][windows][min][processor]";
const WINDOWS_GRAPHICS = "app[content][sysreqs][windows][min][graphics]";
const WINDOWS_NOTES = "app[content][sysreqs][windows][min][notes]";
const FEATURE_ORDER = Object.freeze([
  "explore",
  "trade",
  "fish",
  "whale",
  "colonize",
  "fight",
  "pillage",
  "survive"
]);
const SUPPORTED_STEAM_LANGUAGES = Object.freeze([
  "english",
  "schinese",
  "russian",
  "spanish",
  "brazilian",
  "japanese",
  "german",
  "french",
  "polish",
  "tchinese",
  "koreana"
]);

const LOCALIZATIONS = Object.freeze({
  french: storeLocalization({
    shortDescription:
      "Explorez. Commercez. Pêchez. Chassez la baleine. Colonisez. Combattez. Pillez. Survivez. Vous êtes capitaine en 1522, et le monde entier s'offre à vous dans ce simulateur historique de navigation en bac à sable aux accents roguelike.",
    intro:
      "Explorez. Commercez. Pêchez. Chassez la baleine. Colonisez. Combattez. Pillez. Survivez. Vous êtes capitaine en 1522, et le monde entier s'offre à vous dans ce simulateur historique de navigation en bac à sable aux accents roguelike.",
    explore:
      "Le monde de Marque &amp; Représailles est une représentation complète de la Terre composée de 164 000 hexagones, avec une géographie fidèle, des rivières et des lacs navigables, des montagnes, une simulation météorologique détaillée et de nombreuses merveilles anciennes et naturelles à découvrir.",
    trade:
      "Les villes et villages du monde achètent et vendent diverses marchandises à des prix différents. L'offre et la demande de biens et de numéraire réagissent de façon dynamique aux actions du joueur et aux centaines de navires PNJ qui sillonnent les routes commerciales en quête de fortune.",
    fish:
      "Pêchez de nombreuses espèces de poissons ! Améliorez votre navire et vos filets pour augmenter vos prises, puis vendez-les sur les marchés les plus avantageux.",
    whale:
      "L'océan abrite des créatures immenses et mystérieuses ! Le jeu comprend plusieurs espèces de baleines aux aires de répartition et aux comportements écologiquement fidèles. Elles se reproduisent, ont des petits, et l'on voit souvent un baleineau suivre sa mère à travers l'océan. Abattez une baleine au harpon et récupérez sa précieuse graisse pour la vendre !",
    colonize:
      "Au cours de votre voyage, vous rencontrerez peut-être des colons cherchant un passage vers le Nouveau Monde. Aidez-les, et vous pourrez fonder de nouvelles villes ensemble.",
    fight:
      "Affrontez des pirates et des nations hostiles ! Ou devenez vous-même pirate et partez à la recherche de riches navires marchands à capturer.",
    pillage:
      "Avec un navire de guerre suffisamment imposant, vous pouvez bombarder une ville ennemie pour réduire ses batteries côtières au silence, puis débarquer des troupes de marine afin de prendre le port !",
    survive:
      "Si vous mourez dans Marque &amp; Représailles, aucun retour en arrière n'est possible. Vous devrez commencer un nouveau voyage avec un autre capitaine. La mort peut venir de bien des façons : faim, soif, tempêtes ou attaques de pirates.",
    systemNotes:
      "Écran 1280 × 720 ; clavier et souris ou manette"
  }),
  german: storeLocalization({
    shortDescription:
      "Erkunde. Handle. Fische. Jage Wale. Gründe Kolonien. Kämpfe. Plündere. Überlebe. Du bist ein Kapitän im Jahr 1522, und in diesem historischen Roguelike-Sandbox-Seefahrtssimulator wartet die ganze Welt darauf, entdeckt zu werden.",
    intro:
      "Erkunde. Handle. Fische. Jage Wale. Gründe Kolonien. Kämpfe. Plündere. Überlebe. Du bist ein Kapitän im Jahr 1522, und in diesem historischen Roguelike-Sandbox-Seefahrtssimulator wartet die ganze Welt darauf, entdeckt zu werden.",
    explore:
      "Die Welt von Kaperbrief &amp; Vergeltung ist eine vollständig ausgearbeitete Karte der gesamten Erde aus 164.000 Hexfeldern: mit genauer Geografie, schiffbaren Flüssen und Seen, Gebirgen, einer detaillierten Wettersimulation und zahlreichen antiken wie natürlichen Wundern, die es zu entdecken gilt.",
    trade:
      "Die Städte und Dörfer der Welt kaufen und verkaufen unterschiedliche Waren zu verschiedenen Preisen. Angebot und Nachfrage nach Gütern und Münzgeld reagieren dynamisch auf die Handlungen des Spielers und auf Hunderte von NSC-Schiffen, die auf der Suche nach Reichtum die Handelsrouten befahren.",
    fish:
      "Fange viele verschiedene Fischarten! Verbessere dein Schiff und deine Netze, um größere Fänge einzuholen, und verkaufe sie auf den besten Märkten mit Gewinn.",
    whale:
      "Im Ozean leben gewaltige und geheimnisvolle Tiere! Im Spiel gibt es mehrere Walarten mit ökologisch stimmigen Verbreitungsgebieten und Verhaltensweisen. Wale paaren sich und bekommen Kälber, die man oft ihren Müttern durch den Ozean folgen sieht. Erlege einen Wal mit der Harpune und verkaufe seinen wertvollen Tran!",
    colonize:
      "Auf deiner Reise triffst du vielleicht Siedler, die eine Überfahrt in die Neue Welt suchen. Hilf ihnen, und womöglich gründet ihr gemeinsam neue Städte.",
    fight:
      "Kämpfe gegen Piraten und feindliche Nationen! Oder werde selbst zum Piraten und mache Jagd auf reiche Handelsschiffe, die du als Prise nehmen kannst.",
    pillage:
      "Mit einem ausreichend großen Kriegsschiff kannst du eine feindliche Stadt bombardieren, ihre Küstenbatterien zum Schweigen bringen und anschließend Marinesoldaten anlanden, um den Hafen einzunehmen!",
    survive:
      "Wenn du in Kaperbrief &amp; Vergeltung stirbst, gibt es kein Zurück. Du musst eine neue Reise mit einem neuen Kapitän beginnen. Der Tod hat viele Gesichter: Hunger, Durst, stürmische See und Piratenangriffe.",
    systemNotes:
      "Bildschirm mit 1280 × 720; Tastatur und Maus oder Controller"
  }),
  spanish: storeLocalization({
    shortDescription:
      "Explora. Comercia. Pesca. Caza ballenas. Coloniza. Lucha. Saquea. Sobrevive. Eres capitán en el año 1522, y el mundo entero está por descubrir en este simulador histórico de navegación, tipo roguelike y de mundo abierto.",
    intro:
      "Explora. Comercia. Pesca. Caza ballenas. Coloniza. Lucha. Saquea. Sobrevive. Eres capitán en el año 1522, y el mundo entero está por descubrir en este simulador histórico de navegación, tipo roguelike y de mundo abierto.",
    explore:
      "El mundo de Corso &amp; Represalia es un mapa completo de toda la Tierra formado por 164 000 hexágonos, con geografía fiel, ríos y lagos navegables, montañas, una simulación meteorológica detallada y numerosas maravillas naturales y de la Antigüedad por descubrir.",
    trade:
      "Las ciudades y aldeas del mundo compran y venden distintas mercancías a precios diferentes. La oferta y la demanda de bienes y moneda reaccionan dinámicamente a las acciones del jugador y a los cientos de barcos PNJ que recorren las rutas comerciales en busca de fortuna.",
    fish:
      "¡Pesca muchas especies diferentes! Mejora tu barco y tus redes para aumentar tus capturas y véndelas en los mejores mercados para obtener beneficios.",
    whale:
      "¡El océano alberga criaturas enormes y misteriosas! El juego incluye varias especies de ballenas con distribuciones y comportamientos ecológicamente fieles. Las ballenas se reproducen y tienen crías, y a menudo verás a un ballenato siguiendo a su madre por el océano. ¡Mata una ballena con tu arpón y recoge su valiosa grasa para venderla!",
    colonize:
      "Quizá durante tu viaje encuentres colonos que buscan pasaje al Nuevo Mundo. Ayúdalos y puede que fundéis nuevas ciudades juntos.",
    fight:
      "¡Combate contra piratas y naciones hostiles! O conviértete tú en pirata y parte en busca de ricos mercantes que capturar.",
    pillage:
      "Con un navío de guerra lo bastante grande, puedes bombardear una ciudad enemiga para silenciar sus baterías costeras y después desembarcar infantes de marina para capturar el puerto.",
    survive:
      "Si mueres en Corso &amp; Represalia, no hay vuelta atrás. Tendrás que iniciar un nuevo viaje con otro capitán. La muerte puede llegar de muchas formas: hambre, sed, mares embravecidos o ataques piratas.",
    systemNotes:
      "Pantalla de 1280 × 720; teclado y ratón o mando"
  }),
  brazilian: storeLocalization({
    shortDescription:
      "Explore. Negocie. Pesque. Cace baleias. Colonize. Lute. Saqueie. Sobreviva. Você é capitão no ano de 1522, e o mundo inteiro está à sua espera neste simulador histórico de navegação em mundo aberto com elementos roguelike.",
    intro:
      "Explore. Negocie. Pesque. Cace baleias. Colonize. Lute. Saqueie. Sobreviva. Você é capitão no ano de 1522, e o mundo inteiro está à sua espera neste simulador histórico de navegação em mundo aberto com elementos roguelike.",
    explore:
      "O mundo de Corso &amp; Represália é um mapa completo de toda a Terra com 164 mil hexágonos, geografia fiel, rios e lagos navegáveis, montanhas, uma simulação climática detalhada e muitas maravilhas naturais e da Antiguidade para descobrir.",
    trade:
      "As cidades e aldeias do mundo compram e vendem mercadorias diferentes por preços variados. A oferta e a demanda de bens e moeda reagem dinamicamente às ações do jogador e às centenas de navios PNJ que percorrem as rotas comerciais em busca de riqueza.",
    fish:
      "Pesque muitas espécies diferentes! Melhore seu navio e suas redes para aumentar a pesca e venda o que capturar nos melhores mercados para lucrar.",
    whale:
      "O oceano abriga criaturas enormes e misteriosas! Há várias espécies de baleia no jogo, com áreas de ocorrência e comportamentos ecologicamente fiéis. Elas se reproduzem e têm filhotes, e muitas vezes você verá um filhote acompanhando a mãe pelo oceano. Mate uma baleia com seu arpão e recolha a valiosa gordura para vender!",
    colonize:
      "Talvez você encontre colonos procurando passagem para o Novo Mundo durante sua viagem. Ajude-os e vocês poderão fundar novas cidades juntos.",
    fight:
      "Enfrente piratas e nações hostis! Ou torne-se um pirata e saia em busca de ricos navios mercantes para capturar.",
    pillage:
      "Com um navio de guerra grande o bastante, você pode bombardear uma cidade inimiga para silenciar suas baterias costeiras e depois desembarcar fuzileiros para tomar o porto!",
    survive:
      "Se você morrer em Corso &amp; Represália, não há volta. Será preciso começar uma nova viagem com outro capitão. A morte pode chegar de muitas formas: fome, sede, mares tempestuosos ou ataques de piratas.",
    systemNotes:
      "Tela de 1280 × 720; teclado e mouse ou controle"
  }),
  russian: storeLocalization({
    shortDescription:
      "Исследуйте. Торгуйте. Рыбачьте. Охотьтесь на китов. Основывайте колонии. Сражайтесь. Грабьте. Выживайте. Вы — капитан корабля в 1522 году, и в этом историческом морском roguelike-симуляторе с открытым миром вам предстоит открыть всю Землю.",
    intro:
      "Исследуйте. Торгуйте. Рыбачьте. Охотьтесь на китов. Основывайте колонии. Сражайтесь. Грабьте. Выживайте. Вы — капитан корабля в 1522 году, и в этом историческом морском roguelike-симуляторе с открытым миром вам предстоит открыть всю Землю.",
    explore:
      "Мир игры «Каперство &amp; Возмездие» — это детально воссозданная карта всей Земли из 164 тысяч шестиугольников: с достоверной географией, судоходными реками и озёрами, горами, подробной симуляцией погоды и множеством древних и природных чудес, ожидающих своего первооткрывателя.",
    trade:
      "Города и деревни мира покупают и продают разные товары по разным ценам. Спрос и предложение товаров и звонкой монеты динамически меняются под влиянием игрока и сотен кораблей под управлением ИИ, которые ходят по торговым путям в погоне за богатством.",
    fish:
      "Ловите множество видов рыб! Улучшайте корабль и сети, чтобы увеличить улов, а затем продавайте рыбу с прибылью на лучших рынках.",
    whale:
      "В океане обитают огромные и таинственные существа! В игре представлены разные виды китов с экологически достоверными ареалами и поведением. Киты размножаются и рожают детёнышей, и нередко можно увидеть, как китёнок следует за матерью через океан. Поразите кита гарпуном и соберите ценный ворвань для продажи!",
    colonize:
      "В пути вам могут встретиться колонисты, ищущие корабль до Нового Света. Помогите им — и, возможно, вы вместе основаете новые города.",
    fight:
      "Сражайтесь с пиратами и враждебными державами! Или сами станьте пиратом и отправляйтесь на охоту за богатыми торговыми судами.",
    pillage:
      "На достаточно крупном военном корабле можно обстрелять вражеский город, подавить его береговые батареи, а затем высадить морскую пехоту и захватить порт!",
    survive:
      "Смерть в игре «Каперство &amp; Возмездие» необратима. Придётся начать новое плавание с новым капитаном. Погибнуть можно от голода и жажды, в штормовом море или при нападении пиратов.",
    systemNotes:
      "Экран 1280 × 720; клавиатура и мышь или контроллер"
  }),
  polish: storeLocalization({
    shortDescription:
      "Eksploruj. Handluj. Łów ryby. Poluj na wieloryby. Zakładaj kolonie. Walcz. Plądruj. Przetrwaj. Jesteś kapitanem w roku 1522, a cały świat czeka na odkrycie w tym historycznym, roguelike'owym symulatorze żeglugi z otwartą piaskownicą.",
    intro:
      "Eksploruj. Handluj. Łów ryby. Poluj na wieloryby. Zakładaj kolonie. Walcz. Plądruj. Przetrwaj. Jesteś kapitanem w roku 1522, a cały świat czeka na odkrycie w tym historycznym, roguelike'owym symulatorze żeglugi z otwartą piaskownicą.",
    explore:
      "Świat Kaperstwa &amp; Odwetu to w pełni odwzorowana mapa całej Ziemi złożona ze 164 tysięcy heksów. Znajdziesz na niej wierną geografię, żeglowne rzeki i jeziora, góry, szczegółową symulację pogody oraz liczne starożytne i naturalne cuda do odkrycia.",
    trade:
      "Miasta i wioski świata kupują i sprzedają różne towary po odmiennych cenach. Podaż i popyt na dobra oraz kruszec dynamicznie reagują na działania gracza i setek statków NPC przemierzających szlaki handlowe w poszukiwaniu bogactwa.",
    fish:
      "Łów wiele różnych gatunków ryb! Ulepszaj statek i sieci, by zwiększać połowy, a następnie sprzedawaj zdobycz z zyskiem na najlepszych targach.",
    whale:
      "Ocean zamieszkują wielkie i tajemnicze stworzenia! W grze występuje kilka gatunków wielorybów o zgodnych z ekologią zasięgach i zachowaniach. Wieloryby rozmnażają się i rodzą młode, a cielę często podąża przez ocean za matką. Zabij wieloryba harpunem i zbierz cenny tran na sprzedaż!",
    colonize:
      "Podczas podróży możesz spotkać osadników szukających przeprawy do Nowego Świata. Pomóż im, a być może wspólnie założycie nowe miasta.",
    fight:
      "Walcz z piratami i wrogimi państwami! Albo sam zostań piratem i wyrusz na poszukiwanie bogatych statków handlowych, które można zdobyć.",
    pillage:
      "Dostatecznie duży okręt wojenny pozwoli ci ostrzelać wrogie miasto, uciszyć jego baterie nadbrzeżne, a następnie wysadzić piechotę morską i zdobyć port!",
    survive:
      "Jeśli zginiesz w Kaperstwie &amp; Odwecie, nie ma odwrotu. Musisz rozpocząć nową podróż z nowym kapitanem. Śmierć ma wiele postaci: głód, pragnienie, sztormowe morze i ataki piratów.",
    systemNotes:
      "Ekran 1280 × 720; klawiatura i mysz lub kontroler"
  }),
  japanese: storeLocalization({
    shortDescription:
      "探索、交易、漁、捕鯨、植民、戦闘、略奪、そして生存。時は1522年。船長となり、世界全土を舞台にしたローグライク要素のある歴史航海サンドボックスで、未知の海へ漕ぎ出そう。",
    intro:
      "探索、交易、漁、捕鯨、植民、戦闘、略奪、そして生存。時は1522年。船長となり、世界全土を舞台にしたローグライク要素のある歴史航海サンドボックスで、未知の海へ漕ぎ出そう。",
    explore:
      "『私掠 &amp; 報復』の世界は、16万4千のヘックスで地球全土を再現したマップ。史実に基づく地理、航行可能な河川と湖、山々、緻密な気象シミュレーション、そして発見を待つ数々の古代遺産や自然の驚異が広がっている。",
    trade:
      "世界各地の都市や村では、さまざまな商品が異なる価格で取引される。物資と正貨の需要と供給は、プレイヤーの行動や、富を求めて交易路を行き交う数百隻ものNPC船によって刻々と変化する。",
    fish:
      "多種多様な魚を釣ろう！ 船と網を強化して漁獲量を増やし、最も高く売れる市場へ運んで利益を得よう。",
    whale:
      "大海には巨大で神秘的な生き物が潜んでいる！ ゲームには、生態に即した分布域と行動を持つ複数種のクジラが登場する。クジラは繁殖して子を産み、母クジラの後を泳ぐ子クジラの姿も見られる。銛でクジラを仕留め、価値ある鯨脂を持ち帰って売却しよう！",
    colonize:
      "航海の途中で、新世界への渡航を望む入植者に出会うこともある。彼らを助ければ、共に新たな都市を築けるかもしれない。",
    fight:
      "海賊や敵対国と戦え！ あるいは自ら海賊となり、財宝を積んだ商船を探して拿捕することもできる。",
    pillage:
      "十分に大きな軍船があれば、敵都市を砲撃して沿岸砲台を沈黙させ、海兵隊を上陸させて港を占領できる！",
    survive:
      "『私掠 &amp; 報復』で死ねば、やり直しは利かない。新たな船長で、次の航海を始めることになる。飢えや渇き、荒れる海、海賊の襲撃など、死はさまざまな形で訪れる。",
    systemNotes:
      "1280×720ディスプレイ、キーボード＆マウスまたはコントローラー"
  }),
  schinese: storeLocalization({
    shortDescription:
      "探索、贸易、捕鱼、捕鲸、殖民、战斗、劫掠、生存。你是一名生活在1522年的船长，在这款带有Roguelike元素的历史航海沙盒模拟游戏中，整个世界都等待你去发现。",
    intro:
      "探索、贸易、捕鱼、捕鲸、殖民、战斗、劫掠、生存。你是一名生活在1522年的船长，在这款带有Roguelike元素的历史航海沙盒模拟游戏中，整个世界都等待你去发现。",
    explore:
      "《私掠 &amp; 报复》的世界是一张由16.4万个六边形构成的完整地球地图，拥有准确的地理环境、可航行的河流与湖泊、连绵山脉、细致的天气模拟，以及众多等待发现的古代奇观与自然奇观。",
    trade:
      "世界各地的城市与村庄会以不同价格买卖不同货物。商品与硬币的供需会根据玩家的行动，以及数百艘为追逐财富而穿梭于贸易航线的NPC船只，实时发生变化。",
    fish:
      "捕捞多种不同的鱼类！升级船只与渔网来提高渔获量，再把鱼带到最合适的市场出售获利。",
    whale:
      "海洋中生活着庞大而神秘的生灵！游戏包含多种鲸类，每种都有符合生态规律的分布范围与行为。鲸会交配并产下幼鲸，你常能看到幼鲸跟随母鲸游过大洋。用鱼叉猎杀鲸鱼，收集价值不菲的鲸脂并出售！",
    colonize:
      "旅途中，你也许会遇到寻找船只前往新世界的殖民者。帮助他们，你们或许能共同建立新的城市。",
    fight:
      "与海盗及敌对国家交战！你也可以亲自成为海盗，出海搜寻并夺取满载财富的商船。",
    pillage:
      "拥有足够庞大的军舰后，你可以炮击敌对城市、摧毁岸防炮台，再派海军陆战队登陆并占领港口！",
    survive:
      "在《私掠 &amp; 报复》中一旦死亡，就无法回头。你必须换一名新船长，重新开始航行。死亡可能来自饥饿、干渴、惊涛骇浪或海盗袭击。",
    systemNotes:
      "1280×720 显示器；键盘鼠标或控制器"
  }),
  tchinese: storeLocalization({
    shortDescription:
      "探索、貿易、捕魚、捕鯨、殖民、戰鬥、劫掠、生存。你是一名身處1522年的船長，在這款帶有Roguelike元素的歷史航海沙盒模擬遊戲中，整個世界都等著你去發現。",
    intro:
      "探索、貿易、捕魚、捕鯨、殖民、戰鬥、劫掠、生存。你是一名身處1522年的船長，在這款帶有Roguelike元素的歷史航海沙盒模擬遊戲中，整個世界都等著你去發現。",
    explore:
      "《私掠 &amp; 報復》的世界是一張由16.4萬個六角格構成的完整地球地圖，擁有準確的地理環境、可航行的河川與湖泊、連綿山脈、細緻的天氣模擬，以及眾多等待發現的古代奇觀與自然奇觀。",
    trade:
      "世界各地的城市與村莊會以不同價格買賣各種貨物。商品與硬幣的供需會依照玩家的行動，以及數百艘為追逐財富而穿梭於貿易航線的NPC船隻，即時發生變化。",
    fish:
      "捕撈多種不同的魚類！升級船隻與漁網來提高漁獲量，再把魚帶到最合適的市場出售獲利。",
    whale:
      "海洋中生活著龐大而神祕的生靈！遊戲包含多種鯨類，每種都有符合生態規律的分布範圍與行為。鯨會交配並產下幼鯨，你常能看見幼鯨跟隨母鯨游過大洋。用魚叉獵殺鯨魚，收集價值不菲的鯨脂並出售！",
    colonize:
      "旅途中，你也許會遇到尋找船隻前往新世界的殖民者。幫助他們，你們或許能共同建立新的城市。",
    fight:
      "與海盜及敵對國家交戰！你也可以親自成為海盜，出海搜尋並奪取滿載財富的商船。",
    pillage:
      "擁有足夠龐大的軍艦後，你可以砲擊敵對城市、摧毀岸防砲台，再派海軍陸戰隊登陸並占領港口！",
    survive:
      "在《私掠 &amp; 報復》中一旦死亡，就無法回頭。你必須換一名新船長，重新開始航行。死亡可能來自飢餓、乾渴、驚濤駭浪或海盜襲擊。",
    systemNotes:
      "1280×720 顯示器；鍵盤滑鼠或控制器"
  }),
  koreana: storeLocalization({
    shortDescription:
      "탐험하고, 교역하고, 낚시하고, 고래를 사냥하고, 식민지를 세우고, 싸우고, 약탈하고, 살아남으세요. 1522년의 선장이 되어 전 세계를 무대로 한 로그라이크 역사 항해 샌드박스에서 미지의 바다를 누비세요.",
    intro:
      "탐험하고, 교역하고, 낚시하고, 고래를 사냥하고, 식민지를 세우고, 싸우고, 약탈하고, 살아남으세요. 1522년의 선장이 되어 전 세계를 무대로 한 로그라이크 역사 항해 샌드박스에서 미지의 바다를 누비세요.",
    explore:
      "『사략 &amp; 보복』의 세계는 16만 4천 개의 육각형으로 지구 전체를 구현한 지도입니다. 정확한 지리, 항해 가능한 강과 호수, 산맥, 세밀한 날씨 시뮬레이션, 그리고 발견을 기다리는 수많은 고대 및 자연의 경이로움이 펼쳐집니다.",
    trade:
      "세계 곳곳의 도시와 마을은 서로 다른 상품을 각기 다른 가격에 사고팝니다. 상품과 화폐의 수요와 공급은 플레이어의 행동, 그리고 부를 찾아 교역로를 오가는 수백 척의 NPC 선박에 따라 역동적으로 변화합니다.",
    fish:
      "다양한 어종을 낚아 보세요! 배와 그물을 개량해 어획량을 늘리고, 가장 좋은 시장에서 팔아 이익을 올리세요.",
    whale:
      "대양에는 거대하고 신비로운 생명체가 살고 있습니다! 게임에는 생태적으로 정확한 서식 범위와 행동을 지닌 여러 종의 고래가 등장합니다. 고래는 짝을 짓고 새끼를 낳으며, 어미를 따라 대양을 헤엄치는 새끼 고래도 자주 볼 수 있습니다. 작살로 고래를 잡고 값비싼 고래기름을 모아 판매하세요!",
    colonize:
      "항해 중 신세계로 데려다줄 배를 찾는 이주민을 만날 수도 있습니다. 그들을 도우면 함께 새로운 도시를 세우게 될지도 모릅니다.",
    fight:
      "해적과 적대국에 맞서 싸우세요! 혹은 직접 해적이 되어 부유한 상선을 찾아 나포할 수도 있습니다.",
    pillage:
      "충분히 큰 군함이 있다면 적대 도시를 포격해 해안 포대를 무력화한 뒤, 해병대를 상륙시켜 항구를 점령할 수 있습니다!",
    survive:
      "『사략 &amp; 보복』에서 죽으면 되돌릴 수 없습니다. 새로운 선장으로 새로운 항해를 시작해야 합니다. 굶주림과 갈증, 폭풍우 치는 바다, 해적의 습격 등 죽음은 여러 모습으로 찾아옵니다.",
    systemNotes:
      "1280×720 디스플레이, 키보드 및 마우스 또는 컨트롤러"
  })
});

function storeLocalization(values) {
  for (const key of ["shortDescription", "intro", ...FEATURE_ORDER, "systemNotes"]) {
    if (typeof values[key] !== "string" || values[key].trim() === "") {
      throw new Error(`Steam store localization is missing ${key}`);
    }
  }
  return Object.freeze(values);
}

function localizedAbout(localization) {
  const parts = [`[p]${localization.intro}[/p]`];
  for (const feature of FEATURE_ORDER) {
    parts.push(
      `[p][img src=&quot;{STEAM_APP_IMAGE}/extras/${feature}&quot;][/img][/p]`,
      `[p]${localization[feature]}[/p]`
    );
  }
  return parts.join("");
}

function assertImportReady(document) {
  if (document.itemid !== APP_ID) {
    throw new Error(`Steam store localization has wrong app id: ${document.itemid}`);
  }
  if (document.languages === null || typeof document.languages !== "object") {
    throw new Error("Steam store localization has no languages object");
  }
  for (const language of SUPPORTED_STEAM_LANGUAGES) {
    const entry = document.languages[language];
    if (entry === null || typeof entry !== "object") {
      throw new Error(`Steam export is missing supported language: ${language}`);
    }
    for (const field of [
      ABOUT,
      SHORT_DESCRIPTION,
      WINDOWS_OS,
      WINDOWS_PROCESSOR,
      WINDOWS_GRAPHICS,
      WINDOWS_NOTES
    ]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        throw new Error(`${language} is missing Steam field ${field}`);
      }
    }
    if (Array.from(entry[SHORT_DESCRIPTION]).length > 300) {
      throw new Error(`${language} short description exceeds Steam's 300-character limit`);
    }
    for (const feature of FEATURE_ORDER) {
      const marker = `{STEAM_APP_IMAGE}/extras/${feature}`;
      if (entry[ABOUT].split(marker).length !== 2) {
        throw new Error(`${language} About section must contain ${marker} exactly once`);
      }
    }
  }
}

async function main() {
  const sourcePath = resolve(process.argv[2] ?? "");
  const outputPath = resolve(process.argv[3] ?? "");
  if (process.argv.length !== 4) {
    throw new Error(
      "Usage: node tools/build-steam-store-localization.mjs <Steam export JSON> <output JSON>"
    );
  }

  const document = JSON.parse(await readFile(sourcePath, "utf8"));
  if (document.itemid !== APP_ID) {
    throw new Error(`Expected Steam app ${APP_ID}, received ${document.itemid}`);
  }
  const english = document.languages?.english;
  if (english === null || typeof english !== "object") {
    throw new Error("Steam export has no English fallback");
  }

  for (const [language, localization] of Object.entries(LOCALIZATIONS)) {
    const entry = document.languages[language];
    if (entry === null || typeof entry !== "object") {
      throw new Error(`Steam export has no ${language} entry`);
    }
    entry[ABOUT] = localizedAbout(localization);
    entry[SHORT_DESCRIPTION] = localization.shortDescription;
    entry[WINDOWS_OS] = english[WINDOWS_OS];
    entry[WINDOWS_PROCESSOR] = english[WINDOWS_PROCESSOR];
    entry[WINDOWS_GRAPHICS] = english[WINDOWS_GRAPHICS];
    entry[WINDOWS_NOTES] = localization.systemNotes;
  }

  assertImportReady(document);
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  console.log(`Generated Steam store localization for app ${APP_ID}: ${outputPath}`);
}

await main();
