import { SHIP_STATS, shipLabelForSlug, shipStatsForSlug } from "./shipStats.js";

const SHIP_HANDOVER_HISTORIES = Object.freeze({
  "fishing-lugger":
    "a sturdy coastal working boat whose handy lug sail and useful hold descend from the fishing craft that kept Europe's ports supplied",
  "small-cog":
    "a round-bellied descendant of the medieval North Sea cog, with high sides and a simple square rig built for cargo rather than haste",
  dhow:
    "a lateen-rigged Indian Ocean trader, shaped by generations of mariners who timed their voyages to the reversing monsoon winds",
  sampan:
    "a light East Asian river and coastal craft, shallow enough for creeks and crowded harbors where a deeper ocean ship could never work",
  "large-junk":
    "an ocean-going Chinese junk, joining a capacious hold with battened sails and internal bulkheads refined over centuries of maritime trade",
  "pirate-brig":
    "a caravel strengthened into a fighting ship, keeping the Iberian type's nimble hull while carrying more iron and ordnance",
  galleon:
    "a sixteenth-century development of the carrack, with a longer hull and lower forward works that made a steadier gun platform and convoy escort",
  fluyt:
    "a broad northern European cargo carrier known to Iberian sailors as an urca, built to move an exceptional hold with a relatively small crew",
  carrack:
    "the great ocean carrier of the early Age of Discovery, combining high castles, heavy stores, and the endurance needed for the route around Africa",
  "ship-of-the-line":
    "a carrack built on flagship scale, the sort of towering royal roundship used to carry soldiers, cannon, and prestige across an ocean",
  "medium-junk":
    "a versatile Chinese junk, large enough for regional commerce yet handier in shoal water and river mouths than the great ocean carriers",
  xebec:
    "a lean Mediterranean sailing vessel whose lateen canvas and narrow hull made the type prized by traders, naval scouts, and corsairs alike",
  caravel:
    "the small, weatherly Iberian explorer whose shallow draft and lateen rig opened unfamiliar coasts to Portuguese and Spanish mariners",
  "square-rigged-caravel":
    "an ocean-going caravel carrying square canvas for stronger following winds while retaining the handy hull of its lateen-rigged forebears",
  brigantine:
    "a quick, handy two-master from a family of rigs long favored for scouting, dispatch work, coastal trade, and the occasional less lawful errand",
  "small-junk":
    "a compact junk in the old East Asian coastal tradition, with a shallow hull and easily managed battened sail suited to a modest crew",
  felucca:
    "a light lateen craft long at home on the Nile and eastern Mediterranean, fast to handle and able to trade from the smallest landing places",
  cutter:
    "a small pinnace suited to coasting, scouting, and carrying messages, the kind of useful tender a larger fleet always finds work for",
  ketch:
    "a practical coastal trader whose divided lateen sail plan can be shortened by a small crew when a sudden squall comes down",
  "mediterranean-galley":
    "the oared warship that still ruled much of the sixteenth-century Mediterranean, able to advance in a calm or drive straight into the wind",
  "joseon-turtle-ship":
    "a roofed Joseon warship of the late sixteenth century, remembered for fighting in Admiral Yi Sun-sin's fleets among Korea's narrow tidal seas",
  "joseon-panokseon":
    "a broad-decked Joseon warship whose sturdy hull and elevated fighting platform were well matched to Korea's shallow, strongly tidal coasts",
  "japanese-atakebune":
    "one of the great late-sixteenth-century Japanese warships, carrying castle-like fighting works for soldiers and missile troops",
  "spanish-nao":
    "an Iberian ocean-going roundship of the kind called a nao, built to carry stores and cargo through the long Atlantic and Indies passages",
  "portuguese-carrack":
    "a great Portuguese nau of the India run, built to survive the Cape route and return with a hold rich in Asian spices and wares",
  "viking-longship":
    "a clinker-built reconstruction of a much older Norse design, shallow-drafted and equally at home under its striped sail or a bank of oars",
  "polynesian-voyaging-canoe":
    "a double-hulled ocean canoe descended from the vessels that carried Polynesian navigators, families, and provisions between distant islands",
  "mesoamerican-dugout-canoe":
    "a great paddled dugout like those Mesoamerican mariners used for fishing and coastal commerce long before European ships reached their shores",
  "nusantaran-outrigger":
    "an island Southeast Asian outrigger whose stabilizing float lets a narrow, swift hull carry sail safely through reef passages and open water",
  "ottoman-coastal-trader":
    "a workmanlike Ottoman coaster built for the busy short-haul trade linking the Aegean, the Levant, and the Black Sea"
});

export function shipHandoverHistoryForSlug(shipSlug) {
  shipStatsForSlug(shipSlug);
  const history = SHIP_HANDOVER_HISTORIES[shipSlug];
  if (!history) throw new Error(`Missing ship handover history for ship type: ${shipSlug}`);
  return `The ${shipLabelForSlug(shipSlug)} is ${history}.`;
}

export function validateShipHandoverHistoryCoverage() {
  const roster = SHIP_STATS.map((entry) => entry.slug).sort();
  const covered = Object.keys(SHIP_HANDOVER_HISTORIES).sort();
  const missing = roster.filter((slug) => !covered.includes(slug));
  const unknown = covered.filter((slug) => !roster.includes(slug));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `Ship handover history mismatch; missing: ${missing.join(", ") || "none"}; ` +
      `unknown: ${unknown.join(", ") || "none"}`
    );
  }
  return true;
}

validateShipHandoverHistoryCoverage();
