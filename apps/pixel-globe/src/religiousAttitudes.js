import { RELIGION_CATALOG, religionById } from "./characterReligion.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  diplomacyBetween,
  factionById
} from "./factions.js";
import { rulerAtMinute } from "./rulers.js";

export const RELIGIOUS_ATTITUDE_SAME_FAITH = 6;
export const RELIGIOUS_ATTITUDE_MIN = -6;
export const RELIGIOUS_ATTITUDE_MAX = 6;

const CHRISTIAN_RELIGIONS = new Set([
  "roman-catholic",
  "eastern-orthodox",
  "ethiopian-orthodox",
  "lutheran",
  "reformed-protestant",
  "anglican",
  "quaker"
]);
const MUSLIM_RELIGIONS = new Set([
  "sunni-islam",
  "shia-islam",
  "ibadi-islam"
]);
const BUDDHIST_RELIGIONS = new Set([
  "theravada-buddhism",
  "mahayana-buddhism",
  "tibetan-buddhism"
]);
const EAST_ASIAN_RELIGIONS = new Set([
  ...BUDDHIST_RELIGIONS,
  "daoism",
  "chinese-traditional",
  "korean-traditional",
  "kami-buddhist"
]);
const DHARMIC_RELIGIONS = new Set([
  "hinduism",
  "jainism",
  "sikhism"
]);
const AMERICAN_TRADITIONAL_RELIGIONS = new Set([
  "north-american-traditional",
  "american-traditional"
]);
const OCEANIC_TRADITIONAL_RELIGIONS = new Set([
  "polynesian-traditional",
  "austronesian-traditional"
]);

const EXPLICIT_PAIR_ATTITUDES = new Map([
  pair("roman-catholic", "lutheran", -6),
  pair("roman-catholic", "reformed-protestant", -6),
  pair("roman-catholic", "anglican", -6),
  pair("roman-catholic", "quaker", -4),
  pair("roman-catholic", "eastern-orthodox", -1),
  pair("roman-catholic", "ethiopian-orthodox", 0),
  pair("eastern-orthodox", "ethiopian-orthodox", 3),
  pair("eastern-orthodox", "lutheran", -2),
  pair("eastern-orthodox", "reformed-protestant", -2),
  pair("eastern-orthodox", "anglican", -1),
  pair("ethiopian-orthodox", "lutheran", -2),
  pair("ethiopian-orthodox", "reformed-protestant", -2),
  pair("ethiopian-orthodox", "anglican", -1),
  pair("lutheran", "reformed-protestant", 2),
  pair("lutheran", "anglican", 2),
  pair("lutheran", "quaker", 1),
  pair("reformed-protestant", "anglican", 2),
  pair("reformed-protestant", "quaker", 2),
  pair("anglican", "quaker", 1),
  pair("sunni-islam", "shia-islam", -6),
  pair("sunni-islam", "ibadi-islam", -4),
  pair("shia-islam", "ibadi-islam", -5),
  pair("judaism", "roman-catholic", -2),
  pair("judaism", "lutheran", -2),
  pair("judaism", "reformed-protestant", -2),
  pair("judaism", "anglican", -2),
  pair("judaism", "sunni-islam", -1),
  pair("judaism", "shia-islam", -1),
  pair("judaism", "ibadi-islam", -1)
]);

export const RELIGIOUS_ATTITUDE_MATRIX = buildReligiousAttitudeMatrix();

export function religiousAttitude(fromReligionId, towardReligionId) {
  religionById(fromReligionId);
  religionById(towardReligionId);
  return RELIGIOUS_ATTITUDE_MATRIX[fromReligionId][towardReligionId];
}

export function religionFamilyId(religionId) {
  religionById(religionId);
  if (CHRISTIAN_RELIGIONS.has(religionId)) return "christian";
  if (MUSLIM_RELIGIONS.has(religionId)) return "muslim";
  if (BUDDHIST_RELIGIONS.has(religionId)) return "buddhist";
  if (DHARMIC_RELIGIONS.has(religionId)) return "dharmic";
  if (EAST_ASIAN_RELIGIONS.has(religionId)) return "east-asian";
  if (AMERICAN_TRADITIONAL_RELIGIONS.has(religionId)) return "american-traditional";
  if (OCEANIC_TRADITIONAL_RELIGIONS.has(religionId)) return "oceanic-traditional";
  return religionId;
}

export function isChristianReligion(religionId) {
  religionById(religionId);
  return CHRISTIAN_RELIGIONS.has(religionId);
}

export function isRomanCatholicReligion(religionId) {
  religionById(religionId);
  return religionId === "roman-catholic";
}

export function isMuslimReligion(religionId) {
  religionById(religionId);
  return MUSLIM_RELIGIONS.has(religionId);
}

export function initialReligiousFactionReputation({
  playerFactionId,
  playerReligionId,
  targetFactionId,
  simMinute,
  seedKey
}) {
  factionById(playerFactionId);
  factionById(targetFactionId);
  religionById(playerReligionId);
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid initial religious reputation minute: ${simMinute}`);
  }
  if (typeof seedKey !== "string" || seedKey.trim() === "") {
    throw new Error("Initial religious reputation requires a seed key");
  }
  if (playerFactionId === targetFactionId) return 8;
  const ruler = rulerAtMinute(targetFactionId, simMinute);
  if (!ruler) return 0;
  const national = nationalStartingReputation(diplomacyBetween(playerFactionId, targetFactionId));
  const religious = Math.round(
    religiousAttitude(ruler.religionId, playerReligionId) * ruler.piety
  );
  const personal = hashString32(
    `${seedKey}|initial-reputation|${playerFactionId}|${targetFactionId}|${playerReligionId}`
  ) % 5 - 2;
  return Math.max(-100, Math.min(100, national + religious + personal));
}

function buildReligiousAttitudeMatrix() {
  const ids = RELIGION_CATALOG.map(({ id }) => id);
  const matrix = Object.fromEntries(ids.map((fromId) => [
    fromId,
    Object.fromEntries(ids.map((towardId) => [
      towardId,
      pairAttitude(fromId, towardId)
    ]))
  ]));
  return Object.freeze(Object.fromEntries(Object.entries(matrix).map(([id, row]) => [
    id,
    Object.freeze(row)
  ])));
}

function pairAttitude(leftId, rightId) {
  if (leftId === rightId) return RELIGIOUS_ATTITUDE_SAME_FAITH;
  const explicit = EXPLICIT_PAIR_ATTITUDES.get(pairKey(leftId, rightId));
  if (explicit !== undefined) return explicit;
  if ((CHRISTIAN_RELIGIONS.has(leftId) && MUSLIM_RELIGIONS.has(rightId)) ||
      (MUSLIM_RELIGIONS.has(leftId) && CHRISTIAN_RELIGIONS.has(rightId))) {
    return -4;
  }
  if (BUDDHIST_RELIGIONS.has(leftId) && BUDDHIST_RELIGIONS.has(rightId)) return 3;
  if (EAST_ASIAN_RELIGIONS.has(leftId) && EAST_ASIAN_RELIGIONS.has(rightId)) return 2;
  if (DHARMIC_RELIGIONS.has(leftId) && DHARMIC_RELIGIONS.has(rightId)) return 2;
  if (AMERICAN_TRADITIONAL_RELIGIONS.has(leftId) &&
      AMERICAN_TRADITIONAL_RELIGIONS.has(rightId)) {
    return 3;
  }
  if (OCEANIC_TRADITIONAL_RELIGIONS.has(leftId) &&
      OCEANIC_TRADITIONAL_RELIGIONS.has(rightId)) {
    return 2;
  }
  return 0;
}

function pair(leftId, rightId, attitude) {
  religionById(leftId);
  religionById(rightId);
  if (!Number.isInteger(attitude) ||
      attitude < RELIGIOUS_ATTITUDE_MIN ||
      attitude > RELIGIOUS_ATTITUDE_MAX) {
    throw new Error(`Invalid religious attitude: ${leftId}/${rightId}=${attitude}`);
  }
  return [pairKey(leftId, rightId), attitude];
}

function pairKey(leftId, rightId) {
  return leftId < rightId ? `${leftId}|${rightId}` : `${rightId}|${leftId}`;
}

function nationalStartingReputation(relation) {
  if (relation === DIPLOMACY_WAR) return -8;
  if (relation === DIPLOMACY_HOSTILE) return -4;
  if (relation === DIPLOMACY_NEUTRAL) return 0;
  if (relation === DIPLOMACY_FRIENDLY) return 2;
  if (relation === DIPLOMACY_ALLY) return 5;
  throw new Error(`Invalid starting diplomatic relation: ${relation}`);
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
