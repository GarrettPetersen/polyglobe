import { tradeGoodById } from "./economy.js";
import { religionById } from "./characterReligion.js";

const FETCH_REWARDS = Object.freeze([300, 220, 240]);
const DEFAULT_RESUPPLY_REWARD = 1500;

const HISTORIES = Object.freeze([
  history("Lima", "Peru", {
    sponsorRole: "royal surveyor",
    settlementLeaderRole: "governor of the City of Kings",
    basis: "Pizarro founded the City of Kings in 1535 on Taulichusco's lands in the Rimac valley.",
    pitch: "Pizarro chose the cultivated Rimac valley, ruled by curaca Taulichusco, for his City of Kings. This is conquest, not an empty shore.",
    fetch: [
      stage("survey-camp", "linen-cloth", 6, "field tents, map cases, and the first chapel", "The survey party must work between the river and the old roads. Bring"),
      stage("city-grid", "timber", 8, "stakes, bridgework, and frames around the new plaza", "The plaza has been measured over the existing settlement. Its grid now needs"),
      stage("capital-tools", "iron", 6, "locks, tools, and fittings for a permanent capital", "A royal capital cannot remain a survey camp. Finish the outfit with")
    ],
    ready: "The plans name it Ciudad de los Reyes, the City of Kings, with a plaza beside the Rimac and a road down to its harbor.",
    departed: "The surveyors guard the royal plans while the families watch the Pacific coast for the Rimac valley.",
    landing: "This is Taulichusco's cultivated valley. The expedition will impose the City of Kings here as Spain's Pacific capital.",
    landingAction: "Lay out the City of Kings",
    resupply: resupply("grain", 12, "food reserves while the new capital draws farmers and officials", "The City of Kings needs grain before its first dry season ends.", "The Rimac irrigates the fields, but the new population is growing faster than its harvest.", "Your grain has arrived before the storehouses failed."),
    established: "The City of Kings now governs Spain's Pacific conquests from the Rimac valley. Its warehouses face the road to the harbor, while the older landscape remains beneath the new grid."
  }),
  history("Recife", "Brazil", {
    sponsorRole: "Pernambuco harbor factor",
    settlementLeaderRole: "harbor factor of Recife",
    basis: "Recife grew around the arrecife dos navios as the reef-sheltered warehouse port for Olinda and Pernambuco sugar.",
    pitch: "Olinda has poor anchorage. Behind the reef, fishers and stores gather at the arrecife dos navios. Pernambuco needs a harbor for sugar and mill gear.",
    fetch: [
      stage("reef-wharves", "timber", 8, "wharves and warehouses behind the sheltering reef", "The reef breaks the Atlantic swell, but cargo still needs dry footing. Bring"),
      stage("warehouse-fittings", "iron", 5, "cranes, locks, hoops, and sugar-mill repairs", "The first warehouses stand between the Capibaribe and Beberibe. Fit them with"),
      stage("fish-and-cane-stores", "salt", 8, "curing fish and preserving provisions for port laborers", "Ships and mills cannot run on promises. Complete the harbor stores with")
    ],
    ready: "The harbor plan follows the reef rather than a grand city grid: quays, inns, sheds, and a road inland to Olinda's cane fields.",
    departed: "Carpenters and factors are aboard, arguing over where the reef leaves the safest channel.",
    landing: "The arrecife shelters us exactly as promised. We will build Pernambuco's working port here, low by the water while Olinda keeps the heights.",
    landingAction: "Build Recife harbor",
    resupply: resupply("sugar", 10, "the first export cargo from Pernambuco's mills", "Recife needs a full sugar cargo to prove the new harbor can pay.", "The wharves are ready, but a port without an export cargo is only a row of sheds.", "The first Pernambuco sugar is under lock in Recife's warehouse."),
    established: "Recife has become the reef-sheltered warehouse port of Pernambuco. Sugar comes down from the mills, and Atlantic hulls crowd the channel."
  }),
  history("Asuncion", "Paraguay", {
    sponsorRole: "Rio de la Plata adelantado",
    settlementLeaderRole: "commander of the Asuncion fort",
    basis: "Asuncion began as a 1537 fort during the search up the Paraguay River and became a refuge and base for later river settlements.",
    pitch: "An expedition seeking the Sierra de la Plata needs a fort on the Paraguay. The Cario Guarani control these banks; survival requires their cooperation.",
    fetch: [
      stage("river-fort", "timber", 8, "a riverside stockade, boats, and raised store floors", "Floodwater and distance will punish a careless camp. Bring"),
      stage("expedition-arms", "arms", 4, "the garrison and the expeditions sent farther upriver", "The fort is also a base for a dangerous inland search. Supply"),
      stage("river-seed", "grain", 10, "seed and food while river gardens are established", "The Cario fields cannot be treated as an endless Spanish storehouse. Bring our own")
    ],
    ready: "The plan is modest: a Casa Fuerte on the river, part refuge and part launch point for expeditions into the continent.",
    departed: "The company is aboard with shallow boats nested among the fort timbers.",
    landing: "The Paraguay River bends under a high bank here. We will raise the fort of Nuestra Senora de la Asuncion and negotiate, trade, or fight for every season that follows.",
    landingAction: "Raise the Asuncion fort",
    resupply: resupply("grain", 12, "food and seed for a garrison far upriver", "Asuncion needs grain before the river isolates it again.", "The fort has become a refuge, but too many mouths now depend on a small harvest.", "The grain boats are unloaded; the river fort will endure."),
    established: "Asuncion has outgrown its first mud-and-thatch fort. It is now the upriver refuge from which new settlements can spread through the Plata basin."
  }),
  history("Salvador", "Brazil", {
    sponsorRole: "agent of the governor-general",
    settlementLeaderRole: "governor-general at Salvador",
    basis: "Tome de Sousa founded fortified Salvador in 1549 as the planned seat of Brazil's first governor-general.",
    pitch: "Brazil's scattered captaincies need a royal center. Tome de Sousa plans a fortified capital above the Bay of All Saints.",
    fetch: [
      stage("governor-buildings", "timber", 10, "the governor's house, storehouses, and the first defenses", "A capital must rise quickly above the bay. Bring"),
      stage("royal-fittings", "iron", 6, "gates, tools, artillery fittings, and government chests", "The street plan and palisade are marked. The royal buildings require"),
      stage("church-and-hospital", "linen-cloth", 6, "sails, vestments, bedding, and a hospital", "Officials and Jesuits sail together. Complete their outfit with")
    ],
    ready: "The plans already divide the upper city of government from the lower city of docks and warehouses.",
    departed: "The governor's officials carry more seals and ordinances than any ship should reasonably float.",
    landing: "The high ground commands the Bay of All Saints. We will build Sao Salvador da Bahia here as the first capital of Portuguese America.",
    landingAction: "Found Salvador da Bahia",
    resupply: resupply("grain", 12, "the planned capital's first crowded year", "Salvador needs grain while officials, soldiers, builders, and clergy continue to arrive.", "The upper city's walls rise quickly; its fields do not.", "The royal granary is full enough to carry Salvador through another season."),
    established: "Salvador now stands as Brazil's fortified capital, with government on the heights and Atlantic commerce below."
  }),
  history("Concepcion", "Chile", {
    sponsorRole: "captain of the Chilean frontier",
    settlementLeaderRole: "commandant of Concepcion",
    basis: "Valdivia founded Concepcion at Penco Bay in 1550 as a strategic base in Mapuche territory during the conquest of Chile.",
    pitch: "Valdivia wants a southern base at Penco Bay. This is Mapuche country; the proposed town is a frontier fort in an active war.",
    fetch: [
      stage("penco-stockade", "timber", 10, "a strong stockade and protected storehouses at Penco", "The bay is excellent, but the position must be defended from the first night. Bring"),
      stage("frontier-arms", "arms", 5, "the garrison posted south of the settled valleys", "A frontier town without a trained garrison will not last. Supply"),
      stage("frontier-powder", "gunpowder", 5, "its arquebuses and warning guns", "The palisade only buys time. The final military store is")
    ],
    ready: "The expedition knows this may become the hard frontier between Spanish Chile and an unconquered Mapuche world.",
    departed: "Soldiers sharpen stakes on deck while the settlers study the dark coast beyond Penco Bay.",
    landing: "Penco offers the harbor Valdivia wanted, but the land is neither empty nor pacified. We will establish Concepcion as a fortified Spanish foothold.",
    landingAction: "Fortify Concepcion",
    resupply: resupply("gunpowder", 6, "a garrison exposed on the Mapuche frontier", "Concepcion is asking for powder, not ceremony.", "The stockade still stands, but every watch reports movement beyond the fields.", "The powder is dry and the garrison can hold its walls."),
    established: "Concepcion endures at Penco as a military and administrative center, sustained from Peru on a frontier Spain has not subdued."
  }),
  history("Rio de Janeiro", "Brazil", {
    sponsorRole: "captain against France Antarctique",
    settlementLeaderRole: "captain of Sao Sebastiao",
    basis: "Estacio de Sa founded Sao Sebastiao do Rio de Janeiro in 1565 as a military base against France Antarctique in Guanabara Bay.",
    pitch: "French settlers and Tamoio allies hold Guanabara Bay. Estacio de Sa needs a Portuguese fort at the harbor mouth to contest it.",
    fetch: [
      stage("guanabara-fort", "timber", 10, "a stockade beneath Sugarloaf and boats for the bay", "The first settlement will be a military camp at the harbor mouth. Bring"),
      stage("saint-sebastian-arms", "arms", 5, "soldiers facing French guns and Tamoio canoes", "Guanabara is already defended. The expedition requires"),
      stage("guanabara-powder", "gunpowder", 5, "arquebuses and shore batteries", "To challenge France Antarctique, the fort must also carry")
    ],
    ready: "The settlement will bear the name Sao Sebastiao do Rio de Janeiro and begin as a redoubt, not a peaceful plantation.",
    departed: "The soldiers keep their armor close as the fleet turns toward occupied Guanabara Bay.",
    landing: "Sugarloaf guards the entrance and French sails lie deeper in the bay. We will plant Sao Sebastiao here as Portugal's base for the coming fight.",
    landingAction: "Fortify Sao Sebastiao",
    resupply: resupply("gunpowder", 6, "the campaign to remove France Antarctique", "Sao Sebastiao cannot secure Guanabara without more powder.", "The redoubt holds the entrance, but the struggle for the bay is not finished.", "The batteries are supplied; Portugal can press its claim to Guanabara."),
    defense: defense({
      attackerName: "Tamoio Confederation",
      objectiveName: "Tamoio",
      minCanoes: 3,
      maxCanoes: 4,
      reward: 1200,
      alert: "Tamoio war canoes and their French allies are crossing Guanabara Bay. Defeat them before they destroy the new Portuguese redoubt.",
      challenge: "Guanabara is Tamoio country. Your fort will not close this bay. Turn back, or we will drive you from these waters!",
      report: "The Tamoio canoes withdrew. Sao Sebastiao holds the harbor mouth, though the war for the bay will deepen. The council pays your reward."
    }),
    established: "Sao Sebastiao has secured Guanabara Bay for Portugal. Around the old redoubt, Rio de Janeiro is becoming a true port."
  }),
  history("St. Augustine", "United States of America", {
    sponsorRole: "captain-general of Florida",
    settlementLeaderRole: "governor of St. Augustine",
    basis: "Pedro Menendez de Aviles founded St. Augustine in 1565 as a planned Spanish base and moved against French Fort Caroline.",
    pitch: "Philip II has ordered Pedro Menendez de Aviles to secure Florida and remove the French at Fort Caroline. St. Augustine must be a town, mission, and naval base all at once.",
    fetch: [
      stage("florida-palisade", "timber", 10, "a stockade, storehouses, and storm repairs", "Florida's storms and rival fleets demand defenses before comfort. Bring"),
      stage("florida-arms", "arms", 5, "the soldiers sent against Fort Caroline", "The French position lies to the north. Equip the landing force with"),
      stage("florida-grain", "grain", 12, "colonists, sailors, and the first planting season", "Eight hundred people cannot live from a military chest. Add")
    ],
    ready: "Menendez calls the plan San Agustin, a permanent Spanish town where earlier Florida ventures failed.",
    departed: "Families, soldiers, clergy, free Africans, and enslaved Africans crowd the decks of the Florida expedition.",
    landing: "Matanzas Bay gives us a defensible harbor. We will lay out San Agustin here while the army turns north toward Fort Caroline.",
    landingAction: "Found San Agustin",
    resupply: resupply("grain", 12, "a large garrison and town in an uncertain food landscape", "San Agustin needs grain before storms or war cut off the harbor.", "The planned town survives, but its soldiers and families have consumed the first stores.", "The granary is secure; San Agustin can remain a town rather than another abandoned camp."),
    established: "St. Augustine has survived where earlier Spanish ventures did not, a permanent planned town and naval base in Florida."
  }),
  history("Caracas", "Venezuela", {
    sponsorRole: "captain of the Venezuela expedition",
    settlementLeaderRole: "alcalde of Santiago de Leon",
    basis: "Diego de Losada founded Santiago de Leon de Caracas in 1567 after earlier settlements failed amid Indigenous resistance.",
    pitch: "Earlier Spanish footholds in Caracas failed. Losada proposes a new city, though Caracas and allied peoples have shown that a charter cannot secure the valley.",
    fetch: [
      stage("caracas-frames", "timber", 8, "houses, a stockade, and the road from the coast", "The valley settlement must be defensible and connected to its landing place. Bring"),
      stage("caracas-tools", "iron", 6, "tools, gates, and farming implements", "The street grid is easy to draw and hard to build. It requires"),
      stage("caracas-provisions", "grain", 10, "seed and provisions that do not depend on seizure from local fields", "The valley's inhabitants owe this expedition nothing. Carry our own")
    ],
    ready: "The charter says Santiago de Leon; the valley keeps the Indigenous name Caracas.",
    departed: "The expedition sails knowing two earlier attempts did not hold this valley.",
    landing: "The coast road climbs toward the Caracas valley. We will establish Santiago de Leon there, under the same resistance that defeated earlier foundations.",
    landingAction: "Establish Santiago de Leon",
    resupply: resupply("grain", 12, "a settlement still unable to feed itself securely", "Caracas needs grain before another lean season isolates the valley.", "The town grid holds, but farms beyond it remain exposed and uncertain.", "The grain has arrived; Santiago de Leon has survived another year."),
    established: "Santiago de Leon de Caracas now holds the valley, though its Indigenous name has already proved stronger than the one in the charter."
  }),
  history("Manila", "Philippines", {
    sponsorRole: "agent of Legazpi",
    settlementLeaderRole: "governor of Manila",
    basis: "Legazpi made Manila the Spanish capital in 1571 after the conquest of the existing Tagalog polity of Maynila.",
    pitch: "Maynila is already a fortified Tagalog and Muslim port beside Tondo. Legazpi means to conquer and rebuild it as his capital, not discover it.",
    fetch: [
      stage("manila-arms", "arms", 6, "the force sent to occupy Maynila", "The rulers of Maynila have ships, cannon, and allies. The expedition first demands"),
      stage("manila-powder", "gunpowder", 6, "arquebuses and artillery for the Pasig River approach", "A landing at the Pasig cannot rely on steel alone. Supply"),
      stage("intramuros-frames", "timber", 10, "a palisade, warehouses, and the first Spanish quarter", "If the port is taken, it must immediately be held and rebuilt. Bring")
    ],
    ready: "The objective is the existing port of Maynila, gateway to Luzon and to the Chinese merchants who already trade there.",
    departed: "Soldiers and officials are aboard; no one pretends the Pasig River will be an uncontested landing.",
    landing: "Maynila's settlement and palisades already line the Pasig. Spain will occupy this port and build its Philippine capital over and beside the existing city.",
    landingAction: "Establish Spanish Manila",
    resupply: resupply("silk-cloth", 6, "the first cargo linking Manila to the China trade", "Manila needs a Chinese silk cargo to justify the new trans-Pacific capital.", "The walls stand, but the sponsors promised a trade entrepot, not merely a garrison.", "The silk warehouses are open; Manila now has the commerce its conquest promised."),
    established: "Spanish Manila now commands the bay from beside the old Tagalog port, drawing Chinese junks and Pacific shipping into a new imperial capital."
  }),
  history("Nagasaki", "Japan", {
    sponsorRole: "Portuguese Japan-trade factor",
    settlementLeaderRole: "port steward of Nagasaki",
    basis: "Omura Sumitada and Jesuit planners opened Nagasaki to the Portuguese China ship in 1571 and laid out six streets by the anchorage.",
    pitch: "After Yokoseura and Fukuda failed, Omura Sumitada and the Jesuits proposed six streets at Nagasaki for the China ship, under Japanese law.",
    fetch: [
      stage("nagasaki-quays", "timber", 8, "quays, warehouses, and houses around the new anchorage", "The sheltered inlet is excellent, but the projected six streets need"),
      stage("nagasaki-fittings", "iron", 5, "anchors, cranes, locks, and warehouse fittings", "A port for the great nao from Macau requires more than wooden sheds. Bring"),
      stage("nagasaki-gifts", "silk-cloth", 4, "formal gifts and samples of the China trade the port will attract", "Before seeking leave, the emissaries must show what regular commerce can bring. Add")
    ],
    ready: "The builders, factors, and Jesuit emissaries are ready. Nagasaki is intended as a Japanese port for the Macau trade, not a Portuguese conquest.",
    departed: "The expedition carries builders and factors for Nagasaki, but Kyoto and the Omura house must still accept the terms.",
    landing: "Nagasaki's fishing village stands beside a sheltered Omura anchorage. With six streets marked, it can grow into the lawful harbor promised to the China ship.",
    landingAction: "Open Nagasaki harbor",
    approval: {
      speakerRole: "envoy of the court and Omura house",
      openingText: "Under Portuguese seal, we request a trading harbor at Nagasaki, not Japanese territory. Omura Sumitada's envoys offer six streets under Japanese law.",
      responseText: "The court accepts Omura's site in principle. Present the portable matchlock so our armorers may judge it, and we can seal the harbor terms.",
      closingText: "Then Nagasaki shall remain a Japanese port, and the annual China ship will have a lawful harbor. Captain, our course now lies to the Omura anchorage.",
      actionLabel: "Present arms and negotiate terms",
      grantedFeedback: "The court and Omura envoys have accepted terms for a Japanese trading port at Nagasaki."
    },
    resupply: resupply("silk-cloth", 6, "the Macau-Japan trade on which the new port depends", "Nagasaki needs a China-trade cargo, not another load of European promises.", "The six streets are filling, but no port built for the great ship can prosper while its warehouses are empty.", "Macau silk is in the warehouses; Nagasaki's reason for being is now visible on its quays."),
    established: "Nagasaki is a Japanese port transformed by the annual Portuguese ship, its six streets shared by local officials, Jesuits, and foreign factors."
  }),
  history("Luanda", "Angola", {
    sponsorRole: "agent of Paulo Dias de Novais",
    settlementLeaderRole: "governor of Sao Paulo de Luanda",
    basis: "Paulo Dias de Novais founded Luanda in 1576 with settlers and soldiers; it became a fortified bridgehead tied to war and the Atlantic slave trade.",
    pitch: "Paulo Dias de Novais brings settlers and soldiers to Luanda: a fortified bridgehead into Mbundu lands built for war, captives, and slave trading.",
    fetch: [
      stage("luanda-fort", "timber", 10, "the first fortress above Luanda Bay", "The expedition begins with a fort, because its charter anticipates coercion. Bring"),
      stage("luanda-arms", "arms", 6, "soldiers campaigning inland from the coast", "Novais carries more soldiers than families. Equip them with"),
      stage("luanda-powder", "gunpowder", 6, "the shore guns and inland campaigns", "The final request makes the sponsors' intentions plain:")
    ],
    ready: "No honest captain can mistake this for an innocent town-building venture; Luanda's charter is bound to conquest and human captivity.",
    departed: "One hundred families and hundreds of soldiers sail together, an imbalance that says more than the charter does.",
    landing: "The bay offers a strong anchorage and the heights a fortress site. Sao Paulo de Luanda will begin here, with all the violence its sponsors intend.",
    landingAction: "Establish Sao Paulo de Luanda",
    resupply: resupply("grain", 12, "families and soldiers before local harvests are secured", "Luanda needs grain for a population built around a garrison rather than farms.", "The fort dominates the bay, but its crowded settlement cannot yet feed itself.", "The grain has arrived; the bridgehead will not collapse from its own poor planning."),
    established: "Sao Paulo de Luanda has become Portugal's fortified Angolan port. Its Atlantic wealth is inseparable from warfare and the traffic in enslaved people."
  }),
  history("Buenos Aires", "Argentina", {
    sponsorRole: "agent of Juan de Garay",
    settlementLeaderRole: "alcalde of Buenos Aires",
    basis: "Juan de Garay led the successful 1580 refoundation from Asuncion to give the Paraguay settlements an Atlantic outlet.",
    pitch: "The first Buenos Aires starved. Garay will refound it from Asuncion as an Atlantic outlet led by people who know the Plata basin.",
    fetch: [
      stage("plata-houses", "timber", 8, "houses, corrals, and boats at the muddy river landing", "The broad Plata offers little stone and much weather. Bring"),
      stage("plata-tools", "iron", 6, "ploughs, axes, nails, and cattle gear", "This second foundation must farm instead of waiting for treasure. Supply"),
      stage("plata-seed", "grain", 12, "seed and a first-year reserve", "The old colony's hunger is warning enough. Finish the stores with")
    ],
    ready: "This is a river-born expedition from Asuncion, not a blind repeat of the failed settlement sent directly from Spain.",
    departed: "Settlers from Asuncion are aboard with seed, tools, and cattle gear for the long voyage downriver.",
    landing: "The old site still commands the Atlantic road into the Plata. We will refound Buenos Aires here and make it the seaward door of the river colonies.",
    landingAction: "Refound Buenos Aires",
    resupply: resupply("grain", 12, "the second foundation's first uncertain harvest", "Buenos Aires must not repeat the hunger that destroyed the first settlement.", "The river town is holding, but its first harvest cannot yet support every arrival.", "The reserve grain is dry in the storehouse; this Buenos Aires will not be abandoned so easily."),
    established: "The second Buenos Aires now links Asuncion and the interior river towns to the Atlantic, succeeding where the first foundation failed."
  }),
  history("St. John's", "Canada", {
    sponsorRole: "Newfoundland fishing promoter",
    settlementLeaderRole: "fishing admiral at St. John's",
    basis: "Gilbert asserted an English claim at St. John's in 1583, but the harbor was already an international seasonal fishery and his colony plan failed.",
    pitch: "St. John's already hosts Basque, Portuguese, French, and English fishers each season. Gilbert's colony died with him at sea; we mean to revive it.",
    fetch: [
      stage("fishing-stages", "timber", 10, "stages, flakes, boats, and winter houses", "A permanent station needs more than the seasonal crews leave behind. Bring"),
      stage("cod-salt", "salt", 12, "curing cod for the voyage back across the Atlantic", "The fishery has no value if the catch spoils. Stock"),
      stage("winter-clothing", "wool-cloth", 8, "blankets, sea-cloaks, and clothing for an attempted winter", "The real test is not the summer fishery but the Newfoundland winter. Bring")
    ],
    ready: "The plan is a permanent service and curing station inside an old international fishing harbor, not the discovery of a vacant bay.",
    departed: "Fishers are aboard with enough timber and salt to remain after the seasonal fleets sail home.",
    landing: "The harbor is full of fishing stages and foreign sails. We will add a permanent English station without pretending we were first to use St. John's.",
    landingAction: "Build the St. John's station",
    resupply: resupply("salt", 12, "another full cod-curing season", "St. John's needs salt before the cod fleets arrive.", "The winter crew survived, but the spring fishery will overwhelm the salt store.", "The curing sheds are supplied; this season's cod can cross the Atlantic."),
    established: "St. John's now has permanent stores and winter residents serving a fishery that was international long before England claimed it."
  }),
  history("Port Royal", "Canada", {
    sponsorRole: "Acadian colonial organizer",
    settlementLeaderRole: "governor of Port Royal",
    basis: "De Monts, Poutrincourt, and Champlain moved to sheltered Port Royal after the disastrous Saint Croix winter and maintained relations with the Mi'kmaq.",
    pitch: "Cold, isolation, and scurvy destroyed Saint Croix. De Monts and Poutrincourt will try again in sheltered Annapolis, relying on nearby Mi'kmaq knowledge.",
    fetch: [
      stage("canvas-and-clothing", "wool-cloth", 6, "tents, spare clothes, and winter sea-cloaks", "Saint Croix taught us to fear cold more than distance. Bring"),
      stage("house-frames", "timber", 10, "the enclosed Habitation, palisade, and boats", "Champlain has sketched a fortified farm courtyard for the new site. It needs"),
      stage("tools-and-nails", "iron", 6, "axes, nails, hoes, and tools that cannot be replaced across the ocean", "The frames are laid out in the yard. Complete them with")
    ],
    ready: "The Habitation is planned around a sheltered courtyard, with better ground and better neighbors than the island at Saint Croix.",
    departed: "The Acadians sail with Champlain's plans and a solemn promise not to repeat the Saint Croix winter.",
    landing: "The Annapolis Basin is broad, fertile, and sheltered. With Mi'kmaq friendship, we will build the Port Royal Habitation here.",
    landingAction: "Build the Port Royal Habitation",
    resupply: resupply("grain", 12, "seed and food insurance after the first northern winter", "Port Royal needs grain before its second winter.", "The Habitation stands, and the Order of Good Cheer keeps spirits up, but fellowship cannot fill an empty granary.", "The grain has arrived in time for planting and winter stores."),
    established: "Port Royal has survived its first year in the sheltered basin. The Habitation, Mi'kmaq trade, and Champlain's Order of Good Cheer give Acadia a durable beginning."
  }),
  history("Jamestown", "United States of America", {
    sponsorRole: "Virginia Company adventurer",
    settlementLeaderRole: "president of the Jamestown council",
    basis: "The Virginia Company founded Jamestown in 1607 for profit; disease, brackish water, drought, and conflict with Powhatan brought catastrophic mortality.",
    pitch: "The Virginia Company promises gold and a western passage. Its James River island is defensible but marshy, short of water, and inside Powhatan country.",
    fetch: [
      stage("james-fort", "timber", 10, "the triangular fort, storehouse, and river landing", "The company values defense before health. Its island fort needs"),
      stage("virginia-tools", "iron", 6, "axes, farming tools, nails, and experimental industries", "Gentlemen searching for treasure will still need to cut wood and plant. Bring"),
      stage("virginia-grain", "grain", 14, "food and seed that do not depend on Powhatan stores", "The company has packed too many mouths and too little food. Correct that with")
    ],
    ready: "The investors call the passengers adventurers, but most have never farmed and the company expects the colony to find profit immediately.",
    departed: "Company gentlemen, laborers, and soldiers are aboard, still debating whether gold or a passage lies beyond the James.",
    landing: "The island is hidden from enemy ships and dangerously close to brackish marsh. We can raise James Fort here, but Powhatan controls the country around it.",
    landingAction: "Raise James Fort",
    resupply: resupply("grain", 16, "the colony's survival through drought and the coming winter", "Jamestown needs an exceptional grain cargo; the company sent ambition where it should have sent farmers.", "Disease and hunger have emptied the fort. Relations with Powhatan have worsened as the English demand food the drought has made scarce for everyone.", "The grain has broken the worst of the hunger, though Jamestown has paid terribly for the company's haste."),
    defense: defense({
      attackerName: "Powhatan Confederacy",
      objectiveName: "Powhatan",
      minCanoes: 2,
      maxCanoes: 4,
      reward: 1000,
      alert: "Opechancanough has united Powhatan forces against the spreading settlements. Defeat the war canoes coming down the James, or Jamestown may fall.",
      challenge: "The English take more fields with every season. Opechancanough has ordered your settlements struck. Leave the James, or we attack!",
      report: "The Powhatan attack broke off. Jamestown survives, but English expansion has made a wider war inevitable. The Virginia Company pays the bounty."
    }),
    established: "Jamestown has survived disease, hunger, and conflict long enough to become permanent. The Virginia Company has its foothold, at a human cost its pamphlets will not advertise."
  }),
  history("Quebec", "Canada", {
    sponsorRole: "agent of de Monts and Champlain",
    settlementLeaderRole: "commandant of Quebec",
    basis: "Champlain founded Quebec in 1608 as a fortified fur-trade post where the St. Lawrence narrows, within alliances with Innu, Algonquin, and Wendat peoples.",
    pitch: "Champlain wants a permanent Habitation where the St. Lawrence narrows. The post will depend on the fur trade and on French alliances with Innu, Algonquin, and Wendat partners.",
    fetch: [
      stage("quebec-habitation", "timber", 10, "the Habitation, palisade, storehouse, and river wharf", "The narrow river can be watched from a compact fortified post. Bring"),
      stage("fur-trade-goods", "wool-cloth", 8, "trade with Indigenous partners and winter clothing", "A fur post without respectable exchange goods will destroy its own alliances. Supply"),
      stage("quebec-tools", "iron", 6, "axes, nails, farming tools, and ship repairs", "The Habitation must repair itself through a northern winter. Finish with")
    ],
    ready: "The post is both warehouse and alliance: French survival upriver will rest on Indigenous trade, diplomacy, and geographic knowledge.",
    departed: "Champlain's workers and factors sail for the place where the great river narrows.",
    landing: "The high ground commands the narrows called Quebec. We will build the Habitation here and enter an alliance system far older than this fort.",
    landingAction: "Build the Quebec Habitation",
    resupply: resupply("grain", 12, "the Habitation after its deadly first winter", "Quebec needs grain before ice closes the St. Lawrence.", "The post survived, but scurvy and cold have left too few hands for a confident harvest.", "The grain is inside the Habitation before freeze-up."),
    established: "Quebec now anchors New France at the river narrows, sustained by shipping, fur trade, and its Indigenous alliances."
  }),
  history("St. George's", "Bermuda", {
    sponsorRole: "Virginia Company island promoter",
    settlementLeaderRole: "governor of St. George's",
    basis: "St. George's followed the 1609 wreck of the Sea Venture; survivors built Deliverance and Patience, and a deliberate town was settled in 1612.",
    pitch: "Sea Venture survivors built Deliverance and Patience from Bermuda cedar before reaching Jamestown. Their account now inspires a town at St. George's.",
    fetch: [
      stage("bermuda-houses", "timber", 8, "houses and storm-braced store sheds", "The wreckers praised Bermuda cedar, but the first company must arrive ready to build. Bring"),
      stage("bermuda-tools", "iron", 6, "axes, nails, boat fittings, and salvaging gear", "An island that saved one shipwreck may demand the same ingenuity again. Supply"),
      stage("bermuda-seed", "grain", 10, "seed and provisions for the first deliberate planting", "The castaways ate well; a permanent town must still plan its crops. Add")
    ],
    ready: "This is a colony born from a shipwreck report, on islands the Sea Venture's company once feared would be their grave.",
    departed: "The settlers trade nervous jokes about reefs as Bermuda rises ahead.",
    landing: "The enclosed harbor and high islands match the Sea Venture accounts. We will establish St. George's where accidental refuge becomes a permanent town.",
    landingAction: "Settle St. George's",
    resupply: resupply("iron", 6, "tools and ship fittings on an isolated island", "St. George's needs iron; cedar is plentiful, but the island cannot grow nails or axes.", "The houses hold and new boats take shape, but every broken tool has become precious.", "The smithy has iron again, and the island fleet can keep working."),
    established: "St. George's has turned the Sea Venture's emergency refuge into England's permanent Bermuda capital."
  }),
  history("Fort Orange", "United States of America", {
    organizerReligionId: "reformed-protestant",
    sponsorRole: "Dutch West India Company factor",
    settlementLeaderRole: "chief factor of Fort Orange",
    basis: "The Dutch West India Company built Fort Orange in 1624 at the head of Hudson navigation as a fur-trade post near Mahican and Mohawk exchange routes.",
    pitch: "The old Fort Nassau was damaged by floods. The West India Company wants a stronger post at the head of Hudson navigation, where Mahican and Mohawk trade routes meet the river.",
    fetch: [
      stage("orange-stockade", "timber", 10, "a flood-conscious stockade, warehouse, and river dock", "The first Dutch fort sat too low and the river punished it. Bring"),
      stage("orange-trade", "wool-cloth", 8, "honest exchange in the beaver trade", "The Company's whole calculation rests on Indigenous trade. Its factors need"),
      stage("orange-goods", "glassware", 4, "durable, visible trade goods for the upriver market", "A bare fort cannot command commerce. Complete the factor's stock with")
    ],
    ready: "Fort Orange is a company warehouse before it is a town, built to gather beaver pelts at the river's inland terminus.",
    departed: "Walloon families, soldiers, and Company factors sail together, though the factors have counted every chest twice.",
    landing: "This bank sits above the worst floods and below the great carrying routes. We will build Fort Orange as a place of contact and commerce with Mahican and Mohawk traders.",
    landingAction: "Build Fort Orange",
    resupply: resupply("wool-cloth", 8, "the exchange stock needed for the fur trade", "Fort Orange needs trade cloth before the next upriver rendezvous.", "The fort is sound, but its warehouse is nearly empty and Indigenous traders will not accept Company promises.", "The trade cloth is shelved; Fort Orange can meet its partners with goods in hand."),
    established: "Fort Orange now gathers pelts at the head of Hudson navigation, a Dutch company post whose survival depends on Indigenous trade networks."
  }),
  history("Plymouth", "United States of America", {
    organizerReligionId: "reformed-protestant",
    sponsorRole: "representative of the Leiden congregation",
    settlementLeaderRole: "governor of Plymouth",
    basis: "The Mayflower passengers settled at Patuxet in 1620 after epidemic had devastated the Wampanoag village; survival depended on Wampanoag assistance.",
    pitch: "A Separatist congregation from Leiden seeks its own covenant. Weather may force them north of their patent onto the Wampanoag coast at Patuxet.",
    fetch: [
      stage("plymouth-houses", "timber", 8, "common houses, roofs, and a defensive platform", "The congregation can write a compact aboard ship; it cannot sleep under parchment. Bring"),
      stage("plymouth-clothing", "wool-cloth", 8, "blankets and clothes for a New England winter", "The first winter will begin before proper houses are ready. Supply"),
      stage("plymouth-seed", "grain", 12, "food and seed while unfamiliar crops are learned", "No colony should presume that local people will feed it. Carry")
    ],
    ready: "These are families and religious dissenters rather than a company garrison, though hunger will judge their ideals as sternly as any soldier.",
    departed: "The congregation is aboard, drafting rules for a community whose landing place they have not yet seen.",
    landing: "This is Patuxet, a Wampanoag town emptied by epidemic, not untouched wilderness. If Plymouth survives here, it will owe much to Wampanoag knowledge and political choices.",
    landingAction: "Settle at Patuxet",
    resupply: resupply("grain", 14, "survivors of the first winter and the next planting", "Plymouth needs grain after a winter that spared very few households.", "The settlement stands among the cleared fields of Patuxet, but illness and hunger have taken a terrible share.", "The grain has arrived; the survivors can plant without immediately consuming their seed."),
    established: "Plymouth has endured at Patuxet through Wampanoag assistance and an uneasy alliance, not through providence or English preparation alone."
  }),
  history("New Amsterdam", "United States of America", {
    organizerReligionId: "reformed-protestant",
    sponsorRole: "Dutch West India Company director",
    settlementLeaderRole: "director of New Amsterdam",
    basis: "The Dutch West India Company formed New Amsterdam at Manhattan's southern tip to govern New Netherland and protect the Hudson fur trade.",
    pitch: "The West India Company wants a fort at Manhattan's tip to guard the Hudson fur trade on Lenape land and gather New Netherland into one harbor.",
    fetch: [
      stage("fort-amsterdam", "timber", 10, "Fort Amsterdam, warehouses, and the first quay", "The river mouth needs a company fort before it needs elegant streets. Bring"),
      stage("manhattan-trade", "wool-cloth", 8, "trade with Lenape suppliers and visiting merchants", "The settlement exists for commerce and must arrive with useful exchange goods. Supply"),
      stage("manhattan-fittings", "iron", 6, "guns, gates, cranes, and ship repairs", "A provincial headquarters must secure both river and harbor. Finish it with")
    ],
    ready: "The passengers include Walloon and Dutch families, Company servants, soldiers, and sailors: a commercial colony more mixed than its flag suggests.",
    departed: "The Company director studies ledgers while the settlers study the low point of Manhattan ahead.",
    landing: "The southern tip controls both the harbor and the Hudson. We will build Fort Amsterdam here, but any lasting town must negotiate its presence with the Lenape.",
    landingAction: "Build Fort Amsterdam",
    resupply: resupply("wool-cloth", 8, "the fur trade and the new harbor market", "New Amsterdam needs trade cloth before its factors lose the upriver business.", "The fort commands the harbor, but commerce is slowing as its exchange stock empties.", "The cloth is in the Company warehouse; ships and pelts are moving again."),
    established: "New Amsterdam now governs New Netherland from Manhattan, a company fort growing into a diverse Atlantic trading town."
  }),
  history("Bridgetown", "Barbados", {
    sponsorRole: "agent of the Earl of Carlisle",
    settlementLeaderRole: "governor at Bridgetown",
    basis: "English settlement at Bridgetown began in 1628 at Carlisle Bay; its early organic street plan preceded the later sugar-slavery economy.",
    pitch: "Carlisle's agents want a harbor at Carlisle Bay. Barbados now grows cotton and tobacco; its sugar economy and brutal expansion of slavery lie ahead.",
    fetch: [
      stage("carlisle-wharf", "timber", 8, "a wharf, houses, and storm-secured warehouses", "The natural bay needs a working town behind it. Bring"),
      stage("barbados-tools", "iron", 6, "farming tools, cranes, and boat repairs", "An island colony must repair what it cannot quickly import. Supply"),
      stage("barbados-cotton", "cotton", 8, "seed stock and the colony's early export experiments", "Before sugar dominates Barbados, its promoters are betting on cotton. Add")
    ],
    ready: "The town will grow around the landing and the old bridge remembered by the settlers, with practical lanes rather than a rigid royal grid.",
    departed: "The Carlisle settlers sail with cotton seed and very large promises about a small island.",
    landing: "Carlisle Bay is the best roadstead on the island. We will establish the town that sailors are already calling the Bridge.",
    landingAction: "Settle Bridgetown",
    resupply: resupply("grain", 12, "the island's first crowded planting seasons", "Bridgetown needs food while planters gamble on export crops.", "Cotton and tobacco occupy the promoters, but neither feeds a hungry harbor town.", "The grain is unloaded; Bridgetown has time to learn what this island can sustain."),
    established: "Bridgetown now anchors English Barbados at Carlisle Bay. Its port is prospering, while the plantation system around it is becoming harsher and more dependent on coerced labor."
  }),
  history("Boston", "United States of America", {
    organizerReligionId: "reformed-protestant",
    sponsorRole: "Massachusetts Bay organizer",
    settlementLeaderRole: "governor of Boston",
    basis: "Winthrop's fleet moved from water-poor Charlestown to Shawmut in 1630 after William Blackstone pointed out its spring.",
    pitch: "Sickness and poor water threaten Winthrop's crowded Charlestown camp. Blackstone points them across the river to Shawmut's spring.",
    fetch: [
      stage("shawmut-houses", "timber", 10, "meetinghouses, homes, and a wharf on the peninsula", "Shawmut has good water but little ready shelter for a fleet of families. Bring"),
      stage("massachusetts-tools", "iron", 6, "axes, nails, mills, and farming tools", "A city upon a hill still requires ordinary labor. Supply"),
      stage("massachusetts-grain", "grain", 14, "the Winthrop fleet's first winter and planting", "Too many settlers have arrived together for local stores to absorb. Add")
    ],
    ready: "The Puritans mean Boston to be both a working harbor and a visible godly commonwealth, watched by the world and by one another.",
    departed: "The fleet carries whole congregations, livestock, tools, and very firm opinions about the society they intend to build.",
    landing: "Shawmut's spring solves the water crisis that plagued Charlestown. We will establish Boston on this narrow peninsula, within the homeland of Massachusett people.",
    landingAction: "Settle Boston at Shawmut",
    resupply: resupply("grain", 14, "a large migration through its first New England winter", "Boston needs grain; the Winthrop fleet arrived faster than its farms could grow.", "The spring is sound and the meetinghouse is busy, but too many new households share too small a harvest.", "The grain is ashore; Boston's first winter need not empty the town."),
    established: "Boston now occupies the Shawmut peninsula, a Puritan harbor and government center built around the spring that drew the fleet across the river."
  }),
  history("Trois-Rivieres", "Canada", {
    sponsorRole: "agent of Champlain",
    settlementLeaderRole: "commandant of Trois-Rivieres",
    basis: "Champlain sent Laviolette in 1634 to build a fortified post at the Saint-Maurice confluence, already a longstanding Indigenous fur-trade rendezvous.",
    pitch: "Champlain wants Laviolette to fortify the Saint-Maurice confluence. Indigenous traders already use it for the fur rendezvous.",
    fetch: [
      stage("three-rivers-fort", "timber", 10, "a palisade, house, store, and raised river landing", "The elevated Platon overlooks both river approaches. Build it with"),
      stage("three-rivers-trade", "wool-cloth", 8, "the annual Indigenous fur rendezvous", "A post at an old meeting place must arrive ready to exchange, not merely command. Bring"),
      stage("three-rivers-tools", "iron", 5, "fort fittings, axes, and repairs", "The small garrison and its artisans will be far from Quebec's workshops. Supply")
    ],
    ready: "The expedition includes artisans, soldiers, and Jesuits, but the post's economic life will come from the annual Indigenous trade gathering.",
    departed: "Laviolette's small company sails upriver with a warehouse packed more carefully than its chapel.",
    landing: "The Saint-Maurice appears as three rivers among the islands. We will raise the fortified trading post above this established rendezvous.",
    landingAction: "Build Fort Trois-Rivieres",
    resupply: resupply("wool-cloth", 8, "the next annual fur-trade rendezvous", "Trois-Rivieres needs trade cloth before the spring gathering.", "The fort survived fire and rebuilding, but its exchange stock is nearly gone.", "The warehouse is ready for the rendezvous at the three rivers."),
    established: "Trois-Rivieres has become a permanent fortified fur post at the Saint-Maurice confluence, linking French shipping to Indigenous trade routes."
  }),
  history("Hartford", "United States of America", {
    organizerReligionId: "reformed-protestant",
    sponsorRole: "Connecticut congregation organizer",
    settlementLeaderRole: "magistrate at Hartford",
    basis: "Thomas Hooker's congregation moved from crowded Massachusetts to Saukiog on the Connecticut River, near an earlier Dutch trading fort.",
    pitch: "Hooker's congregation finds Massachusetts too restrictive. They plan Saukiog on the Connecticut, amid Saukiog and Wangunk communities.",
    fetch: [
      stage("connecticut-houses", "timber", 8, "homes, meetinghouse, barns, and river boats", "A whole congregation and its cattle need more than a trading camp. Bring"),
      stage("connecticut-tools", "iron", 6, "ploughs, axes, nails, and mill parts", "The river meadows can feed a town if settlers arrive prepared to work them. Supply"),
      stage("connecticut-seed", "grain", 12, "seed and food during the overland migration", "The migration must not consume its spring planting. Add")
    ],
    ready: "The settlers expect to walk much of the way with their cattle while the heaviest stores travel by water.",
    departed: "Families and livestock move toward the Connecticut while your ship carries the cargo no muddy trail can bear.",
    landing: "This is Saukiog, already part of Native and Dutch geographies. We will establish the English river town nearby rather than pretend the valley begins with us.",
    landingAction: "Settle Hartford at Saukiog",
    resupply: resupply("grain", 12, "the congregation until its river farms mature", "Hartford needs grain while its new meadows are fenced and planted.", "The cattle have pasture and the houses have roofs, but the first crop remains thin.", "The grain is stored; the river congregation can survive to its own harvest."),
    established: "Hartford has become an English farming town on the Connecticut, beside older Native routes and just beyond the Dutch post."
  }),
  history("Providence", "United States of America", {
    organizerReligionId: "reformed-protestant",
    sponsorRole: "friend of Roger Williams",
    settlementLeaderRole: "steward of Providence",
    basis: "Roger Williams founded Providence in 1636 after banishment, negotiating land use with Narragansett sachems Canonicus and Miantonomi.",
    pitch: "Banished for defending liberty of conscience and Native land rights, Roger Williams seeks a settlement beyond Massachusetts.",
    fetch: [
      stage("providence-houses", "timber", 8, "simple houses along the Moshassuck and a common landing", "The refuge begins with only a few companions beside a freshwater spring. Bring"),
      stage("narragansett-trade", "wool-cloth", 8, "the continuing exchange promised to Narragansett sachems", "Williams's relationship with Canonicus and Miantonomi must be sustained with useful goods. Supply"),
      stage("providence-tools", "iron", 5, "axes, hoes, nails, and a shared mill", "A settlement founded for conscience still needs practical independence. Add")
    ],
    ready: "The proposed town has no established church and promises civil peace without forcing one conscience to govern another.",
    departed: "The little company carries few luxuries, several disputed books, and a stubborn belief that civil authority should leave souls alone.",
    landing: "Williams has negotiated with the Narragansett sachems at the Moshassuck. We will establish Providence by that agreement, beside the spring and salt cove.",
    landingAction: "Settle Providence",
    resupply: resupply("wool-cloth", 8, "trade obligations and the settlement's first households", "Providence needs trade cloth to honor its agreements and outfit new arrivals.", "The spring is good and dissenters keep arriving, but the settlement's exchange stores are exhausted.", "The promised goods are available again, preserving both trade and trust."),
    established: "Providence now offers a refuge for conscience under civil government, founded through negotiation with Narragansett leaders rather than a Massachusetts patent."
  }),
  history("New Haven", "United States of America", {
    organizerReligionId: "reformed-protestant",
    sponsorRole: "agent of Davenport and Eaton",
    settlementLeaderRole: "magistrate of New Haven",
    basis: "Davenport and Eaton's Puritan merchant company settled at Quinnipiac in 1638, seeking a strict biblical commonwealth and Atlantic trading port.",
    pitch: "John Davenport and Theophilus Eaton want a Puritan merchant commonwealth at Quinnipiac: a carefully planned harbor town governed by scripture and financed by Atlantic trade.",
    fetch: [
      stage("quinnipiac-grid", "timber", 10, "houses, wharves, and the settlement's nine-square plan", "The leaders have already divided the imagined town into ordered squares. Build them with"),
      stage("new-haven-trade", "glassware", 4, "merchant stock and exchange with neighboring communities", "Eaton promises a commercial port and must arrive with something worth trading. Supply"),
      stage("new-haven-tools", "iron", 6, "wharf fittings, mills, farming tools, and nails", "The harbor and farms will both depend on imported metal. Add")
    ],
    ready: "The company expects godly order and profitable shipping to reinforce one another, an assumption the shallow harbor may test.",
    departed: "Merchants, ministers, and families sail with a town grid and a church covenant packed beside the cargo manifests.",
    landing: "This is Quinnipiac land and harbor. The company will establish New Haven here under its agreement with local leaders and its own unusually strict covenant.",
    landingAction: "Lay out New Haven",
    resupply: resupply("grain", 12, "the planned town while its farms and trade develop", "New Haven needs grain; its ordered squares do not yet produce an ordered harvest.", "The meetinghouse and wharf stand, but the merchant venture has not fed the settlement.", "The grain is stored; New Haven has another year to make its port succeed."),
    established: "New Haven now stands at Quinnipiac as a rigorously planned Puritan merchant colony, its nine-square order clearer than its commercial future."
  }),
  history("Ville-Marie", "Canada", {
    sponsorRole: "agent of the Societe Notre-Dame",
    settlementLeaderRole: "governor of Ville-Marie",
    basis: "Maisonneuve and Jeanne Mance founded Ville-Marie in 1642 as a missionary settlement; Mance established the Hotel-Dieu hospital.",
    pitch: "The Societe Notre-Dame plans a missionary settlement on Montreal Island. Maisonneuve will command it, and Jeanne Mance intends a hospital as central to Ville-Marie as its fort.",
    fetch: [
      stage("ville-marie-fort", "timber", 10, "the riverside fort, chapel, houses, and hospital frame", "The island mission begins in a fortified enclosure near the old meeting place. Bring"),
      stage("hotel-dieu", "linen-cloth", 8, "bandages, bedding, and the first Hotel-Dieu", "Jeanne Mance will not let the hospital be an afterthought. Supply"),
      stage("ville-marie-tools", "iron", 6, "fort fittings, farming tools, and hospital instruments", "The mission's piety will be tested by practical shortages. Add")
    ],
    ready: "The company is small and its aim openly missionary, at a strategic place already important to Indigenous travel and trade.",
    departed: "Maisonneuve guards the arms while Jeanne Mance guards the hospital chests; neither trusts the other's cargo to stay dry.",
    landing: "Montreal Island commands the meeting of river routes. We will raise Ville-Marie here as mission, fort, and hospital, within a contested Indigenous world.",
    landingAction: "Found Ville-Marie",
    resupply: resupply("linen-cloth", 8, "the Hotel-Dieu and the settlement's wounded and sick", "Ville-Marie needs linen for Jeanne Mance's hospital.", "The fort remains exposed and the hospital has used every clean length of cloth.", "The linen is in the Hotel-Dieu; Mance can keep treating the settlement."),
    defense: defense({
      attackerName: "Haudenosaunee",
      objectiveName: "Haudenosaunee",
      minCanoes: 2,
      maxCanoes: 3,
      reward: 900,
      alert: "A Haudenosaunee war party is approaching Ville-Marie, an armed foothold in the struggle over St. Lawrence trade. Stop the canoes before they land.",
      challenge: "Your new fort reaches into our river road and your wars. Keep away from Ville-Marie, or our arrows will answer you!",
      report: "The Haudenosaunee withdrew beyond the island channels. The palisade and hospital are safe for now; Maisonneuve pays the defense reward."
    }),
    established: "Ville-Marie endures on Montreal Island, with Maisonneuve's fort and Jeanne Mance's Hotel-Dieu defining the mission settlement together."
  }),
  history("Charleston", "United States of America", {
    sponsorRole: "agent of the Lords Proprietors",
    settlementLeaderRole: "governor of Charles Towne",
    basis: "The Lords Proprietors planted Charles Towne at Albemarle Point in 1670; settlers fortified it against Spain and relied on Cusabo support before moving in 1680.",
    pitch: "The Lords Proprietors want a colony south of Virginia. Settlers will land at Kayawah in Cusabo country, within reach of Spanish Florida.",
    fetch: [
      stage("charles-towne-palisade", "timber", 10, "a palisade, storehouse, and houses at Albemarle Point", "Spanish attack is a real possibility from the first season. Bring"),
      stage("carolina-arms", "arms", 6, "the southernmost English garrison", "The Proprietors' grand port begins as a small exposed camp. Equip it with"),
      stage("carolina-seed", "grain", 14, "food and seed while unfamiliar Carolina crops are tested", "Local Cusabo assistance may save the settlement, but it must carry its own provisions. Add")
    ],
    ready: "The expedition includes free settlers, indentured servants, and enslaved people; Barbados has already shaped the social order the Proprietors mean to transplant.",
    departed: "After losing ships to storms, the surviving Carolina company approaches the coast with fewer stores than its charter imagined.",
    landing: "This is Kayawah, where Cusabo people already live and travel. We will fortify Albemarle Point as Charles Towne, with Spanish Florida close enough to keep watchmen awake.",
    landingAction: "Fortify Charles Towne",
    resupply: resupply("grain", 14, "settlers whose first crops have failed", "Charles Towne needs grain after poor first harvests.", "Cusabo food and support have kept the settlement alive, but the Proprietors' own crops have disappointed them.", "The grain is secure; Charles Towne has survived its weakest season."),
    established: "Charles Towne now anchors Carolina as a fortified port. Its prosperity is already tied to Barbados, plantation expansion, and enslaved labor."
  }),
  history("Philadelphia", "United States of America", {
    organizerReligionId: "quaker",
    sponsorRole: "agent of William Penn",
    settlementLeaderRole: "steward of Philadelphia",
    basis: "William Penn planned Philadelphia in 1682 between the Delaware and Schuylkill as a Quaker capital and commercial port, negotiating land with Lenape leaders.",
    pitch: "Penn's Holy Experiment promises Quaker refuge and a green city on the Delaware. His charter still requires negotiation with the Lenape.",
    fetch: [
      stage("penn-grid", "timber", 10, "wharves, houses, and the first streets of Penn's spacious grid", "Penn wants a green country town rather than another crowded London. Build it with"),
      stage("delaware-trade", "wool-cloth", 8, "trade and the obligations of Lenape land agreements", "Peaceful language must be matched by useful and fairly delivered goods. Supply"),
      stage("philadelphia-tools", "iron", 6, "survey chains, mills, wharf fittings, and farm tools", "The plan between the Delaware and Schuylkill is ambitious. Finish the outfit with")
    ],
    ready: "The city plan reserves broad streets, open squares, and garden lots while promising freedom of worship under Quaker government.",
    departed: "Quaker families and merchants sail with Penn's concessions, street plan, and instructions to treat with the Lenape rather than simply seize land.",
    landing: "The ground between the Delaware and Schuylkill suits Penn's grid. We will lay out Philadelphia here, subject to agreements that recognize Lenape ownership and presence.",
    landingAction: "Lay out Philadelphia",
    resupply: resupply("wool-cloth", 8, "trade obligations and the city's rapidly arriving settlers", "Philadelphia needs trade cloth as new land agreements and households multiply.", "The grid fills faster than expected, and every new survey creates another obligation to neighbors already here.", "The trade goods are accounted for; Philadelphia can grow without beginning by defaulting on its promises."),
    established: "Philadelphia has become Penn's planned Quaker capital and Delaware port, its early peace resting on toleration and negotiated relations with the Lenape."
  })
]);

const HISTORIES_BY_KEY = new Map(HISTORIES.map((entry) => [targetKey(entry), entry]));

if (HISTORIES_BY_KEY.size !== HISTORIES.length) {
  throw new Error("Colonization histories contain duplicate target keys");
}

export function colonizationHistoryForTarget(target) {
  if (!target || typeof target !== "object") return null;
  const entry = HISTORIES_BY_KEY.get(targetKey(target)) || null;
  if (!entry && target.waterAccess !== "inland") {
    throw new Error(`Missing colonization history: ${target.city}, ${target.country}`);
  }
  return entry;
}

export function colonizationHistoryEntries() {
  return HISTORIES;
}

function history(city, country, details) {
  if (!nonEmpty(city) || !nonEmpty(country)) throw new Error("Colonization history requires a target identity");
  if (!nonEmpty(details.sponsorRole) || !nonEmpty(details.settlementLeaderRole) ||
      !nonEmpty(details.basis) || !nonEmpty(details.pitch) || !nonEmpty(details.ready) ||
      !nonEmpty(details.departed) || !nonEmpty(details.landing) ||
      !nonEmpty(details.landingAction) || !nonEmpty(details.established)) {
    throw new Error(`Incomplete colonization history: ${city}`);
  }
  if (!Array.isArray(details.fetch) || details.fetch.length !== 3) {
    throw new Error(`Colonization history requires three fetch stages: ${city}`);
  }
  const organizerReligionId = details.organizerReligionId ?? null;
  if (organizerReligionId !== null) religionById(organizerReligionId);
  return Object.freeze({
    city,
    country,
    organizerReligionId,
    sponsorRole: details.sponsorRole,
    settlementLeaderRole: details.settlementLeaderRole,
    basis: details.basis,
    pitch: details.pitch,
    fetchStages: Object.freeze(details.fetch.map((entry, index) => fetchStage(entry, FETCH_REWARDS[index]))),
    ready: details.ready,
    departed: details.departed,
    landing: details.landing,
    landingAction: details.landingAction,
    approval: approval(details.approval),
    resupply: resupplyStage(details.resupply),
    defense: defenseStage(details.defense),
    established: details.established
  });
}

function stage(id, goodId, quantity, purpose, lead) {
  return { id, goodId, quantity, purpose, lead };
}

function fetchStage(entry, reward) {
  if (!entry || !/^[a-z0-9][a-z0-9-]*$/.test(entry.id) ||
      !Number.isInteger(entry.quantity) || entry.quantity <= 0 ||
      !nonEmpty(entry.purpose) || !nonEmpty(entry.lead)) {
    throw new Error(`Invalid colonization fetch stage: ${entry?.id || "missing"}`);
  }
  const good = tradeGoodById(entry.goodId);
  return Object.freeze({
    id: entry.id,
    goodId: good.id,
    goodLabel: good.label,
    quantity: entry.quantity,
    reward,
    purpose: entry.purpose,
    lead: entry.lead
  });
}

function resupply(goodId, quantity, purpose, originReminder, waiting, returned) {
  return { goodId, quantity, purpose, originReminder, waiting, returned };
}

function defense(details) {
  return details;
}

function resupplyStage(entry) {
  if (!entry || !Number.isInteger(entry.quantity) || entry.quantity <= 0 ||
      !nonEmpty(entry.purpose) || !nonEmpty(entry.originReminder) ||
      !nonEmpty(entry.waiting) || !nonEmpty(entry.returned)) {
    throw new Error("Invalid colonization resupply history");
  }
  const good = tradeGoodById(entry.goodId);
  return Object.freeze({
    goodId: good.id,
    goodLabel: good.label,
    quantity: entry.quantity,
    reward: DEFAULT_RESUPPLY_REWARD,
    purpose: entry.purpose,
    originReminder: entry.originReminder,
    waiting: entry.waiting,
    returned: entry.returned
  });
}

function defenseStage(entry) {
  if (entry === undefined) return null;
  if (!entry || !nonEmpty(entry.attackerName) || !nonEmpty(entry.objectiveName) ||
      !Number.isInteger(entry.minCanoes) || !Number.isInteger(entry.maxCanoes) ||
      entry.minCanoes < 2 || entry.maxCanoes > 4 || entry.minCanoes > entry.maxCanoes ||
      !Number.isInteger(entry.reward) || entry.reward <= 0 ||
      !nonEmpty(entry.alert) || !nonEmpty(entry.challenge) || !nonEmpty(entry.report)) {
    throw new Error("Invalid colonization defense history");
  }
  return Object.freeze({ ...entry });
}

function approval(entry) {
  if (entry === undefined) return null;
  if (!entry || !nonEmpty(entry.speakerRole) || !nonEmpty(entry.openingText) ||
      !nonEmpty(entry.responseText) || !nonEmpty(entry.closingText) ||
      !nonEmpty(entry.actionLabel) || !nonEmpty(entry.grantedFeedback)) {
    throw new Error("Invalid colonization approval history");
  }
  return Object.freeze({ ...entry });
}

function targetKey(value) {
  return `${value.city}\u0000${value.country}`;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
