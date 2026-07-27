import {
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId
} from "./factions.js";

const CAPITAL_TARGET_STAKES = Object.freeze({
  england: "The English court still commands the Channel fleet and the realm's purse.",
  scotland: "The Scottish court still holds the northern levies together through the Auld Alliance.",
  france: "The French court still binds rich provinces, veteran armies, and Atlantic ports to the war.",
  spain: "The Spanish court still directs the Mediterranean fleet and the wealth of its Atlantic dominions.",
  portugal: "The Portuguese court still commands an ocean empire through its royal trading houses.",
  hormuz: "The Hormuzi court still controls the customs and pilots of the narrow sea.",
  habsburg: "The Habsburg court still joins its scattered crowns, armies, and imperial credit.",
  hungary: "The Hungarian court still rallies the Danube fortresses and the kingdom's remaining levies.",
  ottoman: "The Ottoman court still commands the Bosporus, the imperial arsenal, and armies on three frontiers.",
  venice: "The Venetian councils still command the Arsenal, the lagoon, and a web of island strongholds.",
  genoa: "The Genoese councils still draw ships, bankers, and western Mediterranean ports into the struggle.",
  "papal-states": "Rome cannot be annexed, but control of the city can compel a settlement from the Holy See.",
  hospitallers: "The Grand Master still commands Rhodes, its fortified harbor, and the Order's war galleys.",
  ming: "The Ming court still directs the empire's granaries, armies, and guarded maritime trade.",
  inca: "The Inca court still binds the imperial roads, storehouses, and provincial armies together.",
  safavid: "The Safavid court still commands Persia's royal roads and the loyalty of its warrior households.",
  muscovy: "The Muscovite court still gathers the northern rivers and frontier garrisons beneath one authority.",
  crimea: "The Crimean court still commands the steppe roads and the northern shores of the Black Sea.",
  "poland-lithuania": "The union's court still joins Baltic trade, broad riverlands, and powerful frontier hosts.",
  sweden: "The Swedish regency still binds the rebel ports, mining country, and a fleet bought on Lubeck credit.",
  "denmark-norway": "The Dano-Norwegian court still commands the Sound dues and the sea roads of the north.",
  songhai: "The Songhai court still commands the Niger traffic and the gold roads crossing the Sahel.",
  morocco: "The Moroccan court still draws Atlantic ports and the approaches to the Strait into the war.",
  ethiopia: "The Ethiopian court still commands the highland levies and the approaches to the Red Sea.",
  vijayanagara: "The Vijayanagaran court still commands rich southern ports, horse markets, and inland armies.",
  gujarat: "The Gujarati court still draws wealth and shipping through Cambay and the western Indian Ocean.",
  bengal: "The Bengali court still commands the Ganges delta, its textile towns, and a crowded river fleet.",
  delhi: "The Delhi court still claims the tribute and military roads of northern India.",
  ayutthaya: "The Ayutthayan court still commands the river capital, rice country, and Gulf trade.",
  ternate: "The Ternatan court still commands clove islands whose harvest can finance another fleet.",
  tidore: "The Tidorese court still commands clove islands and alliances across the eastern archipelago.",
  japan: "The Japanese court still lends legitimacy to the lords, ports, and sea roads of the archipelago.",
  joseon: "The Joseon court still commands the royal granaries, coastal defenses, and the peninsula's officials."
});

const PAIR_GRIEVANCES = Object.freeze({
  "england>france": "France shelters Scotland behind the Auld Alliance and contests England's old claims across the Channel.",
  "france>england": "England has revived its claims in France and joined the Habsburg design to encircle the crown.",
  "france>habsburg": "Habsburg power hems France between imperial lands and contests the duchy of Milan.",
  "france>spain": "Spain joins the Habsburg encirclement and carries the Italian war from Milan to the Pyrenees.",
  "habsburg>france": "France contests imperial authority in Italy and threatens the Emperor's Burgundian inheritance.",
  "spain>france": "France contests Milan and breaks the peace of Italy against the crowns of Charles V.",
  "ottoman>hungary": "Hungary's Danube fortresses bar the road beyond Belgrade and shelter raids across the frontier.",
  "hungary>ottoman": "The Sultan has taken Belgrade and opened the Danube frontier to deeper invasion.",
  "ottoman>hospitallers": "The Knights raid Ottoman shipping from Rhodes and bar the sea road between Anatolia and Egypt.",
  "hospitallers>ottoman": "Suleiman has gathered a great armada to extinguish the Order's island stronghold.",
  "japan>joseon": "Joseon closed the Three Ports after the rising and sharply curtailed Tsushima's licensed trade.",
  "joseon>japan": "Japanese residents rose in the Three Ports, while raiders continue to trouble Joseon's coast.",
  "portugal>ming": "Ming officials expelled the Portuguese from Tunmen and closed the China coast to their fleet.",
  "ming>portugal": "Portuguese captains fortified Tunmen without leave and resisted the lawful order to depart.",
  "muscovy>poland-lithuania": "Poland-Lithuania holds Smolensk and contests the borderlands claimed by Muscovy.",
  "poland-lithuania>muscovy": "Muscovy presses westward and refuses the settlement of the Smolensk frontier.",
  "sweden>denmark-norway": "Christian's garrisons still hold Stockholm and Kalmar against the Swedish rising.",
  "denmark-norway>sweden": "Gustav Eriksson has cast off the Union and drawn Lubeck's ships into rebellion.",
  "portugal>gujarat": "Gujarat resists the cartaz and shelters fleets that contest Portuguese mastery near Diu.",
  "gujarat>portugal": "Portugal imposes its cartaz by cannon and seeks to command Gujarat's own sea trade.",
  "ternate>tidore": "Tidore contests the clove islands and welcomes foreign allies against Ternatan power.",
  "tidore>ternate": "Ternate contests the clove islands and invites Portuguese arms into an old rivalry.",
  "ottoman>safavid": "Safavid power contests eastern Anatolia and divides the frontier by dynasty and confession.",
  "safavid>ottoman": "Ottoman armies press the western marches and deny Safavid claims across eastern Anatolia.",
  "habsburg>venice": "Venice holds mainland and Adriatic possessions claimed within the Emperor's Italian sphere.",
  "venice>habsburg": "Habsburg armies threaten the Republic's mainland ports and the balance of northern Italy."
});

for (const faction of FACTIONS) {
  if (faction.id === NEUTRAL_FACTION_ID || faction.id === PIRATE_FACTION_ID) continue;
  if (!CAPITAL_TARGET_STAKES[faction.id]) {
    throw new Error(`Capture-capital dialogue has no target stakes for ${faction.id}`);
  }
}

export function captureCapitalPoliticalContext(originFactionId, targetFactionId) {
  assertFactionId(originFactionId);
  assertFactionId(targetFactionId);
  const grievance = PAIR_GRIEVANCES[`${originFactionId}>${targetFactionId}`];
  const stakes = CAPITAL_TARGET_STAKES[targetFactionId];
  if (!stakes) throw new Error(`Capture-capital dialogue has no target stakes for ${targetFactionId}`);
  return grievance ? `${grievance} ${stakes}` : stakes;
}
