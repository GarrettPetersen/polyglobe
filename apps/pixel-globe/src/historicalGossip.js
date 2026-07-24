import { factionById } from "./factions.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

const START_YEAR = 1522;
const MONTH_LENGTHS = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);

export const HISTORICAL_GOSSIP_EVENTS = Object.freeze([
  historicalEvent({
    id: "battle-of-raichur",
    date: [1520, 5, 19],
    gossipUntil: [1522, 12, 31],
    countries: ["India"],
    factionIds: ["vijayanagara", "gujarat", "bengal", "delhi"],
    place: "the Deccan",
    report: "Krishnadevaraya's victory at Raichur is still praised in every southern court",
    tradeImpact: "Horse dealers and armorers are following the victors.",
    reflection: "A fortress can change masters faster than the songs about it fade."
  }),
  historicalEvent({
    id: "diet-of-worms",
    date: [1521, 4, 18],
    gossipUntil: [1523, 1, 1],
    countries: ["Germany", "Austria", "Switzerland", "Belgium", "Netherlands"],
    place: "Worms",
    report: "Martin Luther refused to recant before Emperor Charles V at the Diet of Worms, and the argument has split every tavern in Germany",
    tradeImpact: "Printers and pamphlet sellers have never been busier.",
    reflection: "A few spoken words can travel farther than an army."
  }),
  historicalEvent({
    id: "crimean-campaign-against-moscow",
    date: [1521, 7, 1],
    gossipUntil: [1523, 1, 1],
    countries: ["Russian Federation", "Poland", "Ukraine"],
    factionIds: ["muscovy", "poland-lithuania"],
    place: "Moscow",
    report: "the Crimean Khan's riders reached the approaches to Moscow, and Muscovy is still repairing defenses and reputations",
    tradeImpact: "Fur caravans are hiring more guards before taking the southern roads.",
    reflection: "A swift campaign has begun a rivalry likely to outlive those who fought it."
  }),
  historicalEvent({
    id: "jiajing-expels-portuguese",
    date: [1522, 1, 1],
    gossipUntil: [1523, 7, 1],
    countries: ["China", "Republic of Korea", "Japan"],
    factionIds: ["ming", "joseon", "japan"],
    place: "the Chinese coast",
    report: "the Jiajing court has driven the Portuguese from lawful Chinese trade, though smugglers still test the southern coast",
    tradeImpact: "Silk now changes hands through quieter and dearer channels.",
    reflection: "A closed harbor often creates a hundred hidden anchorages."
  }),
  historicalEvent({
    id: "moluccan-rival-alliances",
    date: [1521, 11, 8],
    gossipUntil: [1524, 1, 1],
    countries: ["Indonesia"],
    factionIds: ["ternate", "tidore", "spain", "portugal"],
    place: "the Moluccas",
    report: "Castilian survivors have sworn friendship with Sultan al-Mansur of Tidore while Portugal fortifies its position beside rival Ternate",
    tradeImpact: "Clove merchants now weigh every cargo against two sultans and two foreign crowns.",
    reflection: "On small islands, distant empires have found an old rivalry large enough to enter."
  }),
  historicalEvent({
    id: "elcano-returns",
    date: [1522, 9, 6],
    gossipUntil: [1524, 1, 1],
    countries: ["Spain", "Portugal"],
    factionIds: ["spain", "portugal"],
    place: "Sanlucar de Barrameda",
    report: "Juan Sebastian Elcano has returned aboard Victoria after sailing all the way around the world",
    tradeImpact: "Every spice merchant now has a fresh opinion about routes to the Moluccas.",
    reflection: "The ocean has proved both larger and more connected than old charts allowed."
  }),
  historicalEvent({
    id: "fall-of-rhodes",
    date: [1522, 12, 22],
    gossipUntil: [1524, 1, 1],
    countries: ["Turkey", "Greece", "Italy", "Cyprus"],
    factionIds: ["ottoman", "venice", "genoa", "papal-states", "hungary"],
    place: "Rhodes",
    report: "the Knights of Saint John have surrendered Rhodes after Suleiman's long siege",
    tradeImpact: "Captains are recalculating every passage through the eastern Mediterranean.",
    reflection: "Even an island fortress must bargain when food and powder run low."
  }),
  historicalEvent({
    id: "battle-of-pavia",
    date: [1525, 2, 24],
    gossipUntil: [1526, 3, 1],
    countries: ["France", "Italy", "Belgium", "Netherlands", "Germany", "Austria", "Spain"],
    factionIds: ["france", "habsburg", "spain", "venice", "genoa", "papal-states"],
    place: "Pavia",
    report: "King Francis I has been captured after the French defeat at Pavia",
    tradeImpact: "Couriers, lenders, and armorers are all charging wartime prices.",
    reflection: "A king in chains can move borders without taking a single step."
  }),
  historicalEvent({
    id: "first-battle-of-panipat",
    date: [1526, 4, 21],
    gossipUntil: [1527, 5, 1],
    countries: ["India", "Pakistan", "Bangladesh"],
    factionIds: ["delhi", "gujarat", "bengal", "vijayanagara"],
    place: "Panipat",
    report: "Babur's smaller army has broken the Lodi host at Panipat with field guns and disciplined ranks",
    tradeImpact: "North Indian caravans are waiting to learn whose coin and customs will prevail.",
    reflection: "New weapons can overturn an old dynasty in a morning."
  }),
  historicalEvent({
    id: "battle-of-mohacs",
    date: [1526, 8, 29],
    gossipUntil: [1527, 9, 1],
    countries: ["Hungary", "Austria", "Germany", "Poland", "Turkey", "Croatia", "Romania"],
    factionIds: ["hungary", "habsburg", "ottoman", "poland-lithuania"],
    place: "Mohacs",
    report: "the Hungarian army has been shattered at Mohacs and King Louis II is dead",
    tradeImpact: "Danube traffic is nervous, and every border fortress wants provisions.",
    reflection: "One rain-soaked field has left several crowns disputing a kingdom."
  }),
  historicalEvent({
    id: "iwami-silver",
    date: [1526, 1, 1],
    gossipUntil: [1528, 1, 1],
    countries: ["Japan", "China", "Republic of Korea"],
    factionIds: ["japan", "ming", "joseon"],
    place: "Iwami",
    report: "rich silver has been found in the mountains of Iwami, and rival lords are already watching the roads",
    tradeImpact: "Merchants expect Japanese silver to draw silk and porcelain eastward.",
    reflection: "A seam of metal can redirect ships before the first mine is deep."
  }),
  historicalEvent({
    id: "sack-of-rome",
    date: [1527, 5, 6],
    gossipUntil: [1528, 6, 1],
    countries: ["Italy", "France", "Spain", "Germany", "Austria"],
    factionIds: ["papal-states", "habsburg", "spain", "france", "venice", "genoa"],
    place: "Rome",
    report: "mutinous imperial troops have stormed and sacked Rome while the Pope shelters in Castel Sant'Angelo",
    tradeImpact: "Bankers and church agents are moving valuables out of exposed cities.",
    reflection: "The capital of Christendom has learned that sacred walls are still walls."
  }),
  historicalEvent({
    id: "adal-ethiopian-war",
    date: [1529, 1, 1],
    gossipUntil: [1531, 1, 1],
    countries: ["Ethiopia", "Somalia", "Yemen", "Oman", "Mozambique"],
    factionIds: ["ethiopia", "ottoman", "portugal"],
    place: "the Horn of Africa",
    report: "Imam Ahmad's armies are pressing into Ethiopia, and both Red Sea shores expect a longer war",
    tradeImpact: "Weapons, horses, and grain are commanding dangerous prices along the Red Sea.",
    reflection: "Mountain kingdoms and sea powers are being drawn into the same struggle."
  }),
  historicalEvent({
    id: "siege-of-vienna",
    date: [1529, 9, 27],
    gossipUntil: [1531, 1, 1],
    countries: ["Austria", "Germany", "Hungary", "Turkey", "Poland", "Italy"],
    factionIds: ["habsburg", "hungary", "ottoman", "poland-lithuania", "venice"],
    place: "Vienna",
    report: "Suleiman's army has besieged Vienna but withdrawn without taking the city",
    tradeImpact: "The Danube ports are rebuilding walls and buying powder before anything else.",
    reflection: "The Ottoman advance reached Vienna, but autumn and stone had their own vote."
  }),
  historicalEvent({
    id: "act-of-supremacy",
    date: [1534, 11, 3],
    gossipUntil: [1536, 1, 1],
    countries: ["United Kingdom", "Ireland", "France", "Belgium", "Netherlands", "Italy"],
    factionIds: ["england", "scotland", "france", "habsburg", "papal-states"],
    place: "England",
    report: "Parliament has declared King Henry VIII supreme head of the English church, rejecting papal authority",
    tradeImpact: "Church lands, loyalties, and contracts are all being reconsidered.",
    reflection: "A quarrel over succession has become a quarrel over who commands souls."
  }),
  historicalEvent({
    id: "portuguese-reach-japan",
    date: [1543, 1, 1],
    gossipUntil: [1545, 1, 1],
    countries: ["Japan", "China", "Republic of Korea", "Portugal"],
    factionIds: ["japan", "ming", "joseon", "portugal"],
    place: "Tanegashima",
    report: "Portuguese merchants have landed at Tanegashima carrying unfamiliar matchlock guns",
    tradeImpact: "Smiths and warlords are bidding against one another for a weapon they mean to copy.",
    reflection: "A storm-blown ship may have changed warfare across the islands."
  }),
  historicalEvent({
    id: "council-of-trent",
    date: [1545, 12, 13],
    gossipUntil: [1547, 1, 1],
    countries: ["Italy", "Germany", "Austria", "France", "Spain", "Portugal", "Poland"],
    factionIds: ["papal-states", "habsburg", "france", "spain", "portugal", "poland-lithuania"],
    place: "Trent",
    report: "bishops have assembled at Trent to answer the Reformation and settle Catholic doctrine",
    tradeImpact: "Printers, scholars, and church envoys are crowding the Alpine roads.",
    reflection: "Arguments begun in pulpits are now being measured against councils and crowns."
  }),
  historicalEvent({
    id: "first-burmese-siamese-war",
    date: [1548, 1, 1],
    gossipUntil: [1550, 1, 1],
    countries: ["Thailand", "Myanmar", "Malaysia"],
    factionIds: ["ayutthaya"],
    place: "Ayutthaya",
    report: "the Toungoo invasion has failed to take Ayutthaya, though Queen Suriyothai was killed defending the royal army",
    tradeImpact: "The northern roads want elephants, rice, weapons, and guards in equal measure.",
    reflection: "The capital endured, but victory and mourning entered it together."
  })
].sort((left, right) => left.fromMinute - right.fromMinute || left.id.localeCompare(right.id)));

validateHistoricalGossipEvents();

export function recentHistoricalGossipForPort(city, simMinute) {
  if (!city || typeof city !== "object") throw new Error("Historical gossip requires a port city");
  if (typeof city.country !== "string" || city.country.trim() === "") {
    throw new Error("Historical gossip requires the port's country");
  }
  if (typeof city.factionId !== "string" || city.factionId.trim() === "") {
    throw new Error("Historical gossip requires the port's faction");
  }
  factionById(city.factionId);
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid historical gossip minute: ${simMinute}`);
  }
  for (let index = HISTORICAL_GOSSIP_EVENTS.length - 1; index >= 0; index -= 1) {
    const event = HISTORICAL_GOSSIP_EVENTS[index];
    if (simMinute < event.fromMinute || simMinute >= event.untilMinute) continue;
    if (event.countries.includes(city.country) || event.factionIds.includes(city.factionId)) return event;
  }
  return null;
}

function historicalEvent({
  id,
  date,
  gossipUntil,
  countries = [],
  factionIds = [],
  place,
  report,
  tradeImpact,
  reflection
}) {
  if (typeof id !== "string" || id.trim() === "") throw new Error("Historical gossip event requires an id");
  if (countries.length === 0 && factionIds.length === 0) {
    throw new Error(`Historical gossip event ${id} has no regional audience`);
  }
  for (const factionId of factionIds) factionById(factionId);
  for (const [label, value] of Object.entries({ place, report, tradeImpact, reflection })) {
    if (typeof value !== "string" || value.trim() === "") throw new Error(`Historical gossip event ${id} has no ${label}`);
  }
  const fromMinute = Math.max(0, historicalMinuteForDate(date, `${id} date`));
  const untilMinute = historicalMinuteForDate(gossipUntil, `${id} gossip expiry`);
  if (untilMinute <= fromMinute) throw new Error(`Historical gossip event ${id} expires before it begins`);
  return Object.freeze({
    id,
    year: date[0],
    fromMinute,
    untilMinute,
    countries: Object.freeze([...new Set(countries)]),
    factionIds: Object.freeze([...new Set(factionIds)]),
    place,
    report,
    tradeImpact,
    reflection
  });
}

function historicalMinuteForDate(date, label) {
  if (!Array.isArray(date) || date.length !== 3) throw new Error(`Invalid ${label}`);
  const [year, month, day] = date;
  if (!Number.isInteger(year)) throw new Error(`Invalid ${label} year: ${year}`);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error(`Invalid ${label} month: ${month}`);
  const monthLength = MONTH_LENGTHS[month - 1];
  if (!Number.isInteger(day) || day < 1 || day > monthLength) throw new Error(`Invalid ${label} day: ${day}`);
  const priorMonthDays = MONTH_LENGTHS.slice(0, month - 1).reduce((sum, length) => sum + length, 0);
  return ((year - START_YEAR) * 365 + priorMonthDays + day - 1) * WEATHER_MINUTES_PER_DAY;
}

function validateHistoricalGossipEvents() {
  const ids = new Set();
  for (const event of HISTORICAL_GOSSIP_EVENTS) {
    if (ids.has(event.id)) throw new Error(`Duplicate historical gossip event: ${event.id}`);
    ids.add(event.id);
  }
}
