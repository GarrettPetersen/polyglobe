import {
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  factionById
} from "./factions.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const RULER_START_YEAR = 1522;
export const RULER_GOSSIP_DAYS = 180;

const MONTH_LENGTHS = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);

const RAW_RULER_TIMELINES = Object.freeze({
  england: [ruler(1522, 1, 1, "Henry VIII", "King"), ruler(1547, 1, 28, "Edward VI", "King")],
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
  "poland-lithuania": [
    ruler(1522, 1, 1, "Sigismund I", "King"),
    ruler(1548, 4, 1, "Sigismund II Augustus", "King")
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
  joseon: [
    ruler(1522, 1, 1, "Jungjong", "King"),
    ruler(1544, 11, 29, "Injong", "King"),
    ruler(1545, 8, 8, "Myeongjong", "King")
  ]
});

const REGIONAL_GROUPS = Object.freeze([
  ["england", "scotland", "france", "spain", "portugal", "habsburg", "denmark-norway"],
  ["habsburg", "hungary", "venice", "genoa", "papal-states", "ottoman", "poland-lithuania"],
  ["ottoman", "venice", "genoa", "papal-states", "morocco", "safavid", "hormuz"],
  ["muscovy", "crimea", "poland-lithuania", "denmark-norway", "habsburg", "hungary", "ottoman"],
  ["songhai", "morocco", "portugal"],
  ["ethiopia", "ottoman", "portugal", "safavid"],
  ["vijayanagara", "gujarat", "bengal", "delhi", "portugal", "safavid"],
  ["ayutthaya", "ming", "bengal", "portugal", "spain", "ternate", "tidore"],
  ["ming", "japan", "joseon", "ayutthaya"],
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

export function recentRegionalRulerChange(factionId, simMinute, maxAgeDays = RULER_GOSSIP_DAYS) {
  assertSimMinute(simMinute);
  if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) throw new Error(`Invalid ruler gossip age: ${maxAgeDays}`);
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
    return Object.freeze({
      ...event,
      daysAgo: Math.floor((simMinute - event.fromMinute) / WEATHER_MINUTES_PER_DAY)
    });
  }
  return null;
}

export function gameMinuteForDate(year, month, day) {
  if (!Number.isInteger(year) || year < RULER_START_YEAR) throw new Error(`Invalid game year: ${year}`);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error(`Invalid game month: ${month}`);
  const monthLength = MONTH_LENGTHS[month - 1];
  if (!Number.isInteger(day) || day < 1 || day > monthLength) throw new Error(`Invalid game day: ${year}-${month}-${day}`);
  const priorMonthDays = MONTH_LENGTHS.slice(0, month - 1).reduce((sum, length) => sum + length, 0);
  return ((year - RULER_START_YEAR) * 365 + priorMonthDays + day - 1) * WEATHER_MINUTES_PER_DAY;
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
    Object.freeze(timeline.map((entry) => Object.freeze({
      ...entry,
      factionId,
      factionName: factionById(factionId).name,
      displayName: `${entry.title} ${entry.name}`,
      fromMinute: gameMinuteForDate(entry.year, entry.month, entry.day)
    })))
  ])));
}

function buildRulerChanges(timelines) {
  return Object.values(timelines)
    .flatMap((timeline) => timeline.slice(1).map((next, index) => Object.freeze({
      ...next,
      previousRuler: timeline[index]
    })))
    .sort((left, right) => left.fromMinute - right.fromMinute || left.factionId.localeCompare(right.factionId));
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
  }
}

function assertSimMinute(simMinute) {
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error(`Invalid ruler simulation minute: ${simMinute}`);
}
