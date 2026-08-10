import {
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  factionById
} from "./factions.js";
import { religionById } from "./characterReligion.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const RULER_START_YEAR = 1522;
export const RULER_GOSSIP_DAYS = 180;
export const RULER_GOSSIP_MENTION_LIMIT = 2;

const RULER_GOSSIP_DECISION_PREFIX = "ruler-gossip-mentions";

const MONTH_LENGTHS = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
export const ENGLISH_REFORMATION_MINUTE = gameMinuteForDate(1534, 11, 3);

const RAW_RULER_TIMELINES = Object.freeze({
  england: [
    ruler(1522, 1, 1, "Henry VIII", "King"),
    ruler(1534, 11, 3, "Henry VIII", "King"),
    ruler(1547, 1, 28, "Edward VI", "King")
  ],
  scotland: [ruler(1522, 1, 1, "James V", "King"), ruler(1542, 12, 14, "Mary", "Queen")],
  france: [ruler(1522, 1, 1, "Francis I", "King"), ruler(1547, 3, 31, "Henry II", "King")],
  spain: [ruler(1522, 1, 1, "Charles I", "King"), ruler(1556, 1, 16, "Philip II", "King")],
  portugal: [ruler(1522, 1, 1, "John III", "King"), ruler(1557, 6, 11, "Sebastian I", "King")],
  hormuz: [ruler(1522, 1, 1, "Turanshah IV", "King")],
  habsburg: [ruler(1522, 1, 1, "Charles V", "Emperor"), ruler(1556, 8, 27, "Ferdinand I", "Emperor")],
  hungary: [ruler(1522, 1, 1, "Louis II", "King"), ruler(1526, 8, 29, "Ferdinand I", "King")],
  ottoman: [ruler(1522, 1, 1, "Suleiman I", "Sultan"), ruler(1566, 9, 7, "Selim II", "Sultan")],
  venice: [
    ruler(1522, 1, 1, "Antonio Grimani", "Doge"),
    ruler(1523, 5, 20, "Andrea Gritti", "Doge"),
    ruler(1538, 12, 28, "Pietro Lando", "Doge"),
    ruler(1545, 1, 19, "Francesco Donato", "Doge")
  ],
  genoa: [
    ruler(1522, 1, 1, "Ottaviano Fregoso", "Governor"),
    ruler(1522, 5, 31, "Antoniotto II Adorno", "Doge")
  ],
  "papal-states": [
    ruler(1522, 1, 1, "Adrian VI", "Pope"),
    ruler(1523, 11, 19, "Clement VII", "Pope"),
    ruler(1534, 10, 13, "Paul III", "Pope"),
    ruler(1550, 2, 7, "Julius III", "Pope")
  ],
  hospitallers: [
    ruler(1522, 1, 1, "Philippe Villiers de L'Isle-Adam", "Grand Master")
  ],
  ming: [ruler(1522, 1, 1, "Jiajing", "Emperor"), ruler(1567, 2, 4, "Longqing", "Emperor")],
  inca: [
    ruler(1522, 1, 1, "Huayna Capac", "Sapa Inca"),
    yearRuler(1527, "Huascar", "Sapa Inca"),
    yearRuler(1532, "Atahualpa", "Sapa Inca"),
    yearRuler(1533, "Manco Inca Yupanqui", "Sapa Inca")
  ],
  safavid: [ruler(1522, 1, 1, "Ismail I", "Shah"), ruler(1524, 5, 23, "Tahmasp I", "Shah")],
  muscovy: [ruler(1522, 1, 1, "Vasili III", "Grand Prince"), ruler(1533, 12, 3, "Ivan IV", "Grand Prince")],
  crimea: [
    ruler(1522, 1, 1, "Mehmed I Giray", "Khan"),
    ruler(1523, 1, 1, "Ghazi I Giray", "Khan"),
    ruler(1524, 1, 1, "Saadet I Giray", "Khan")
  ],
  wallachia: [ruler(1522, 1, 1, "Radu of Afumati", "Prince")],
  moldavia: [
    ruler(1522, 1, 1, "Stephen IV", "Prince"),
    ruler(1527, 1, 14, "Peter IV Rares", "Prince")
  ],
  ragusa: [ruler(1522, 1, 1, "Ragusan Senate", "Council")],
  hejaz: [
    ruler(1522, 1, 1, "Barakat II", "Sharif"),
    yearRuler(1525, "Abu Numayy II", "Sharif")
  ],
  "poland-lithuania": [
    ruler(1522, 1, 1, "Sigismund I", "King"),
    ruler(1548, 4, 1, "Sigismund II Augustus", "King")
  ],
  sweden: [
    ruler(1522, 1, 1, "Gustav Eriksson", "Regent"),
    ruler(1523, 6, 6, "Gustav I", "King"),
    ruler(1527, 6, 18, "Gustav I", "King"),
    ruler(1560, 9, 29, "Eric XIV", "King")
  ],
  "denmark-norway": [
    ruler(1522, 1, 1, "Christian II", "King"),
    ruler(1523, 1, 20, "Frederick I", "King"),
    ruler(1534, 7, 4, "Christian III", "King")
  ],
  songhai: [
    ruler(1522, 1, 1, "Askia Muhammad I", "Askia"),
    yearRuler(1528, "Askia Musa", "Askia"),
    yearRuler(1531, "Askia Benkan", "Askia"),
    yearRuler(1537, "Askia Ismail", "Askia"),
    yearRuler(1539, "Askia Ishaq I", "Askia"),
    yearRuler(1549, "Askia Dawud", "Askia")
  ],
  morocco: [
    ruler(1522, 1, 1, "Muhammad al-Burtuqali", "Sultan"),
    yearRuler(1526, "Ahmad al-Wattasi", "Sultan"),
    yearRuler(1545, "Nasir al-Qasri", "Sultan"),
    yearRuler(1547, "Ahmad al-Wattasi", "Sultan")
  ],
  ethiopia: [ruler(1522, 1, 1, "Dawit II", "Emperor"), ruler(1540, 9, 2, "Gelawdewos", "Emperor")],
  vijayanagara: [
    ruler(1522, 1, 1, "Krishnadevaraya", "Emperor"),
    yearRuler(1529, "Achyuta Deva Raya", "Emperor"),
    yearRuler(1542, "Sadasiva Raya", "Emperor")
  ],
  gujarat: [
    ruler(1522, 1, 1, "Muzaffar Shah II", "Sultan"),
    yearRuler(1526, "Bahadur Shah", "Sultan"),
    yearRuler(1537, "Mahmud Shah III", "Sultan")
  ],
  bengal: [
    ruler(1522, 1, 1, "Nasiruddin Nasrat Shah", "Sultan"),
    yearRuler(1533, "Ghiyasuddin Mahmud Shah", "Sultan")
  ],
  delhi: [
    ruler(1522, 1, 1, "Ibrahim Lodi", "Sultan"),
    ruler(1526, 4, 21, "Babur", "Emperor"),
    ruler(1530, 12, 26, "Humayun", "Emperor"),
    ruler(1540, 5, 17, "Sher Shah Suri", "Sultan"),
    ruler(1545, 5, 22, "Islam Shah Suri", "Sultan")
  ],
  ayutthaya: [
    ruler(1522, 1, 1, "Ramathibodi II", "King"),
    yearRuler(1529, "Borommarachathirat IV", "King"),
    yearRuler(1533, "Ratsada", "King"),
    yearRuler(1534, "Chairacha", "King"),
    yearRuler(1546, "Yot Fa", "King"),
    yearRuler(1548, "Maha Chakkraphat", "King")
  ],
  ternate: [
    ruler(1522, 1, 1, "Abu Hayat", "Sultan"),
    yearRuler(1529, "Dayal", "Sultan"),
    yearRuler(1533, "Tabariji", "Sultan"),
    yearRuler(1535, "Hairun Jamil", "Sultan")
  ],
  tidore: [
    ruler(1522, 1, 1, "Al-Mansur", "Sultan"),
    yearRuler(1526, "Mir", "Sultan")
  ],
  japan: [
    ruler(1522, 1, 1, "Ashikaga Yoshiharu", "Shogun"),
    yearRuler(1546, "Ashikaga Yoshiteru", "Shogun")
  ],
  hosokawa: [
    ruler(1522, 1, 1, "Hosokawa Takakuni", "Kanrei"),
    yearRuler(1531, "Hosokawa Harumoto", "Lord")
  ],
  ouchi: [
    ruler(1522, 1, 1, "Ouchi Yoshioki", "Lord"),
    yearRuler(1529, "Ouchi Yoshitaka", "Lord")
  ],
  shimazu: [ruler(1522, 1, 1, "Shimazu Katsuhisa", "Lord")],
  so: [ruler(1522, 1, 1, "So Morinaga", "Lord")],
  shoni: [
    ruler(1522, 1, 1, "Shoni Sukemoto", "Lord"),
    yearRuler(1532, "Shoni Tokinao", "Lord")
  ],
  nagao: [
    ruler(1522, 1, 1, "Nagao Tamekage", "Deputy Governor"),
    yearRuler(1536, "Nagao Harukage", "Lord")
  ],
  ando: [ruler(1522, 1, 1, "Ando Kiyosue", "Lord")],
  kakizaki: [ruler(1522, 1, 1, "Kakizaki Yoshihiro", "Lord")],
  ryukyu: [
    ruler(1522, 1, 1, "Sho Shin", "King"),
    yearRuler(1527, "Sho Sei", "King")
  ],
  ainu: [ruler(1522, 1, 1, "Kotan Elders", "Council")],
  joseon: [
    ruler(1522, 1, 1, "Jungjong", "King"),
    ruler(1544, 11, 29, "Injong", "King"),
    ruler(1545, 8, 8, "Myeongjong", "King")
  ]
});

const RULER_FAITH_DEFAULTS = Object.freeze({
  england: faith("roman-catholic", 0.82),
  scotland: faith("roman-catholic", 0.86),
  france: faith("roman-catholic", 0.82),
  spain: faith("roman-catholic", 0.94),
  portugal: faith("roman-catholic", 0.91),
  hormuz: faith("sunni-islam", 0.66),
  habsburg: faith("roman-catholic", 0.92),
  hungary: faith("roman-catholic", 0.82),
  ottoman: faith("sunni-islam", 0.9),
  venice: faith("roman-catholic", 0.67),
  genoa: faith("roman-catholic", 0.62),
  "papal-states": faith("roman-catholic", 1),
  hospitallers: faith("roman-catholic", 0.98),
  ming: faith("chinese-traditional", 0.74),
  inca: faith("andean-traditional", 0.94),
  safavid: faith("shia-islam", 1),
  muscovy: faith("eastern-orthodox", 0.94),
  crimea: faith("sunni-islam", 0.78),
  wallachia: faith("eastern-orthodox", 0.9),
  moldavia: faith("eastern-orthodox", 0.91),
  ragusa: faith("roman-catholic", 0.78),
  hejaz: faith("sunni-islam", 0.96),
  "poland-lithuania": faith("roman-catholic", 0.79),
  sweden: faith("roman-catholic", 0.72),
  "denmark-norway": faith("roman-catholic", 0.68),
  songhai: faith("sunni-islam", 0.86),
  morocco: faith("sunni-islam", 0.83),
  ethiopia: faith("ethiopian-orthodox", 0.95),
  vijayanagara: faith("hinduism", 0.9),
  gujarat: faith("sunni-islam", 0.78),
  bengal: faith("sunni-islam", 0.78),
  delhi: faith("sunni-islam", 0.82),
  ayutthaya: faith("theravada-buddhism", 0.89),
  ternate: faith("sunni-islam", 0.82),
  tidore: faith("sunni-islam", 0.82),
  japan: faith("kami-buddhist", 0.73),
  hosokawa: faith("kami-buddhist", 0.72),
  ouchi: faith("kami-buddhist", 0.78),
  shimazu: faith("kami-buddhist", 0.8),
  so: faith("kami-buddhist", 0.7),
  shoni: faith("kami-buddhist", 0.74),
  nagao: faith("kami-buddhist", 0.76),
  ando: faith("kami-buddhist", 0.69),
  kakizaki: faith("kami-buddhist", 0.67),
  ryukyu: faith("kami-buddhist", 0.82),
  ainu: faith("ainu-traditional", 0.9),
  joseon: faith("korean-traditional", 0.84)
});

const RULER_FAITH_OVERRIDES = Object.freeze({
  "england|Henry VIII|1534-11-3": faith("anglican", 0.72),
  "england|Edward VI|1547-1-28": faith("anglican", 0.9),
  "sweden|Gustav I|1527-6-18": faith("lutheran", 0.62),
  "denmark-norway|Christian III|1534-7-4": faith("lutheran", 0.88)
});

const REGIONAL_GROUPS = Object.freeze([
  ["england", "scotland", "france", "spain", "portugal", "habsburg", "sweden", "denmark-norway"],
  ["habsburg", "hungary", "venice", "genoa", "papal-states", "hospitallers", "ottoman", "poland-lithuania", "wallachia", "moldavia", "ragusa"],
  ["ottoman", "venice", "genoa", "papal-states", "hospitallers", "morocco", "safavid", "hormuz", "hejaz", "ragusa"],
  ["muscovy", "crimea", "poland-lithuania", "sweden", "denmark-norway", "habsburg", "hungary", "ottoman"],
  ["songhai", "morocco", "portugal"],
  ["ethiopia", "ottoman", "portugal", "safavid"],
  ["vijayanagara", "gujarat", "bengal", "delhi", "portugal", "safavid"],
  ["ayutthaya", "ming", "bengal", "portugal", "spain", "ternate", "tidore"],
  [
    "ming", "japan", "hosokawa", "ouchi", "shimazu", "so", "shoni", "nagao",
    "ando", "kakizaki", "ryukyu", "ainu", "joseon", "ayutthaya"
  ],
  ["inca", "spain", "portugal"]
]);

export const RULER_TIMELINES = freezeTimelines(RAW_RULER_TIMELINES);
const ALL_RULER_CHANGES = Object.freeze(buildRulerChanges(RULER_TIMELINES));
const REGIONAL_FACTION_IDS = buildRegionalFactionIds();

validateRulerRegistry();

export function rulerAtMinute(factionId, simMinute) {
  assertSimMinute(simMinute);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) return null;
  const timeline = RULER_TIMELINES[factionById(factionId).id];
  if (!timeline) throw new Error(`Missing ruler timeline for ${factionId}`);
  let current = timeline[0];
  for (let index = 1; index < timeline.length && timeline[index].fromMinute <= simMinute; index += 1) {
    current = timeline[index];
  }
  return current;
}

export function rulerChangesBetween(fromMinute, toMinute) {
  assertSimMinute(fromMinute);
  assertSimMinute(toMinute);
  if (toMinute < fromMinute) throw new Error(`Ruler change range runs backward: ${fromMinute}..${toMinute}`);
  return ALL_RULER_CHANGES.filter((event) => event.fromMinute > fromMinute && event.fromMinute <= toMinute);
}

export function recentRegionalRulerChange(
  factionId,
  simMinute,
  {
    maxAgeDays = RULER_GOSSIP_DAYS,
    excludedFactionIds = []
  } = {}
) {
  assertSimMinute(simMinute);
  if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) throw new Error(`Invalid ruler gossip age: ${maxAgeDays}`);
  if (!Array.isArray(excludedFactionIds)) throw new Error("Excluded ruler-news factions must be an array");
  const excluded = new Set(excludedFactionIds.map((id) => factionById(id).id));
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) return null;
  factionById(factionId);
  const regionalIds = REGIONAL_FACTION_IDS.get(factionId);
  if (!regionalIds) throw new Error(`Missing ruler-news region for ${factionId}`);
  const earliestMinute = simMinute - maxAgeDays * WEATHER_MINUTES_PER_DAY;
  for (let index = ALL_RULER_CHANGES.length - 1; index >= 0; index -= 1) {
    const event = ALL_RULER_CHANGES[index];
    if (event.fromMinute > simMinute) continue;
    if (event.fromMinute < earliestMinute) break;
    if (!regionalIds.has(event.factionId)) continue;
    if (excluded.has(event.factionId)) continue;
    return Object.freeze({
      ...event,
      daysAgo: Math.floor((simMinute - event.fromMinute) / WEATHER_MINUTES_PER_DAY)
    });
  }
  return null;
}

export function unheardRegionalRulerChange(decisions, factionId, simMinute, options = {}) {
  assertRulerGossipDecisions(decisions);
  const event = recentRegionalRulerChange(factionId, simMinute, options);
  if (!event) return null;
  return rulerGossipMentionCount(decisions, event) < RULER_GOSSIP_MENTION_LIMIT
    ? event
    : null;
}

export function recordRulerGossipMention(decisions, event) {
  assertRulerGossipDecisions(decisions);
  const key = rulerGossipDecisionKey(event);
  const count = rulerGossipMentionCount(decisions, event);
  if (count >= RULER_GOSSIP_MENTION_LIMIT) {
    throw new Error(`Ruler gossip mention limit exceeded: ${key}`);
  }
  decisions[key] = count + 1;
  return decisions[key];
}

export function gameMinuteForDate(year, month, day) {
  if (!Number.isInteger(year) || year < RULER_START_YEAR) throw new Error(`Invalid game year: ${year}`);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error(`Invalid game month: ${month}`);
  const monthLength = MONTH_LENGTHS[month - 1];
  if (!Number.isInteger(day) || day < 1 || day > monthLength) throw new Error(`Invalid game day: ${year}-${month}-${day}`);
  const priorMonthDays = MONTH_LENGTHS.slice(0, month - 1).reduce((sum, length) => sum + length, 0);
  return ((year - RULER_START_YEAR) * 365 + priorMonthDays + day - 1) * WEATHER_MINUTES_PER_DAY;
}

function rulerGossipMentionCount(decisions, event) {
  const key = rulerGossipDecisionKey(event);
  const count = decisions[key] ?? 0;
  if (!Number.isInteger(count) || count < 0 || count > RULER_GOSSIP_MENTION_LIMIT) {
    throw new Error(`Invalid ruler gossip mention count for ${key}: ${count}`);
  }
  return count;
}

function rulerGossipDecisionKey(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("Ruler gossip requires a ruler-change event");
  }
  factionById(event.factionId);
  assertSimMinute(event.fromMinute);
  if (typeof event.displayName !== "string" || event.displayName.trim() === "") {
    throw new Error("Ruler gossip event requires the succeeding ruler's name");
  }
  return `${RULER_GOSSIP_DECISION_PREFIX}.${event.factionId}.${event.fromMinute}.${event.displayName}`;
}

function assertRulerGossipDecisions(decisions) {
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    throw new Error("Ruler gossip requires voyage decision memory");
  }
}

function ruler(year, month, day, name, title) {
  if (typeof name !== "string" || name.trim() === "" || typeof title !== "string" || title.trim() === "") {
    throw new Error("Ruler entries require a name and title");
  }
  return { year, month, day, name, title };
}

function yearRuler(year, name, title) {
  return { ...ruler(year, 1, 1, name, title), datePrecision: "year" };
}

function freezeTimelines(rawTimelines) {
  return Object.freeze(Object.fromEntries(Object.entries(rawTimelines).map(([factionId, timeline]) => [
    factionId,
    Object.freeze(timeline.map((entry) => {
      const rulerFaith = faithForRuler(factionId, entry);
      return Object.freeze({
        ...entry,
        ...rulerFaith,
        factionId,
        factionName: factionById(factionId).name,
        displayName: `${entry.title} ${entry.name}`,
        fromMinute: gameMinuteForDate(entry.year, entry.month, entry.day)
      });
    }))
  ])));
}

function buildRulerChanges(timelines) {
  return Object.values(timelines)
    .flatMap((timeline) => timeline.slice(1).flatMap((next, index) => {
      const previousRuler = timeline[index];
      if (next.name === previousRuler.name && next.title === previousRuler.title) return [];
      return [Object.freeze({ ...next, previousRuler })];
    }))
    .sort((left, right) => (
      left.fromMinute - right.fromMinute ||
      (left.factionId < right.factionId ? -1 : left.factionId > right.factionId ? 1 : 0)
    ));
}

function buildRegionalFactionIds() {
  const result = new Map();
  for (const faction of FACTIONS) {
    if (faction.id === NEUTRAL_FACTION_ID || faction.id === PIRATE_FACTION_ID) continue;
    result.set(faction.id, new Set([faction.id]));
  }
  for (const group of REGIONAL_GROUPS) {
    for (const factionId of group) {
      factionById(factionId);
      const relevant = result.get(factionId);
      for (const neighborId of group) relevant.add(neighborId);
    }
  }
  return result;
}

function validateRulerRegistry() {
  const expectedIds = FACTIONS
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID && faction.id !== PIRATE_FACTION_ID)
    .map((faction) => faction.id)
    .sort();
  const actualIds = Object.keys(RULER_TIMELINES).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error("Ruler registry must cover every sovereign faction exactly once");
  }
  for (const [factionId, timeline] of Object.entries(RULER_TIMELINES)) {
    if (timeline.length === 0 || timeline[0].fromMinute !== 0) {
      throw new Error(`Ruler timeline for ${factionId} must begin on 1 Jan ${RULER_START_YEAR}`);
    }
    for (let index = 1; index < timeline.length; index += 1) {
      if (timeline[index].fromMinute <= timeline[index - 1].fromMinute) {
        throw new Error(`Ruler timeline for ${factionId} is not strictly chronological`);
      }
    }
    for (const entry of timeline) {
      religionById(entry.religionId);
      if (!Number.isFinite(entry.piety) || entry.piety < 0 || entry.piety > 1) {
        throw new Error(`Invalid ruler piety for ${entry.displayName}: ${entry.piety}`);
      }
    }
  }
}

function faithForRuler(factionId, entry) {
  const overrideKey = `${factionId}|${entry.name}|${entry.year}-${entry.month}-${entry.day}`;
  const profile = RULER_FAITH_OVERRIDES[overrideKey] || RULER_FAITH_DEFAULTS[factionId];
  if (!profile) throw new Error(`Missing ruler faith for ${factionId}`);
  return profile;
}

function faith(religionId, piety) {
  religionById(religionId);
  if (!Number.isFinite(piety) || piety < 0 || piety > 1) {
    throw new Error(`Invalid ruler faith piety: ${religionId}=${piety}`);
  }
  return Object.freeze({ religionId, piety });
}

function assertSimMinute(simMinute) {
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error(`Invalid ruler simulation minute: ${simMinute}`);
}
