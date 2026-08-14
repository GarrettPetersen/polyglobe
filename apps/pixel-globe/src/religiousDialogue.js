import { religionById } from "./characterReligion.js";

const CHRISTIAN_RELIGIONS = new Set([
  "roman-catholic",
  "eastern-orthodox",
  "ethiopian-orthodox",
  "lutheran",
  "reformed-protestant",
  "anglican",
  "quaker"
]);
const PROTESTANT_RELIGIONS = new Set([
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

const SHARED_GREETING_LINES = Object.freeze({
  "roman-catholic": "Christ be with you, captain. It is good to meet another child of the old Church so far from home.",
  lutheran: "God's grace and a fair wind to you. It is good to meet another who trusts the Word above distant decrees.",
  "reformed-protestant": "God's peace to you. A shared confession is welcome company in a foreign harbor.",
  anglican: "God's peace attend you, captain. It is good to meet another subject of the English Church.",
  quaker: "Peace be with you, friend. It is a rare comfort to meet another who listens for the Inner Light.",
  "eastern-orthodox": "Christ be with you, captain. It is good to hear the old prayers spoken beneath another sky.",
  "ethiopian-orthodox": "Christ be with you, captain. It is good to meet another keeper of the ancient faith.",
  judaism: "Peace upon you, captain. It is good to meet another of our people across this counter.",
  hinduism: "May your voyage be auspicious. It is good to meet another who honors the same sacred ways.",
  jainism: "Peace to every living soul in your wake. I am glad to meet another who understands that duty.",
  sikhism: "May the One preserve your voyage. It is good to meet another of the Guru's path so far from Punjab.",
  zoroastrianism: "Hamazor bem, captain. It is not often I greet another of our faith across this counter.",
  daoism: "May the Way remain clear before you. It is good to meet another who knows its teaching.",
  "chinese-traditional": "May order attend your voyage. It is good to meet one formed by the same rites and teachings.",
  "korean-traditional": "May order attend your voyage. It is good to meet one formed by the same rites and teachings.",
  "kami-buddhist": "May the kami guard your wake. It is good to meet another who knows the same shrines.",
  "andean-traditional": "May the powers of mountain and sun watch your road. You honor the same world I do.",
  "mesoamerican-traditional": "May sun and rain favor your road. It is good to meet another who knows the old rites.",
  "north-american-traditional": "May the waters bear you kindly, and every shore receive you in peace.",
  "american-traditional": "May the waters bear you kindly, and every shore receive you in peace.",
  "african-traditional": "May the ancestors keep your road. It is good to meet one who remembers as I do.",
  "polynesian-traditional": "May sea and ancestors carry you safely. It is good to meet another who knows their guidance.",
  "austronesian-traditional": "May sea and ancestors carry you safely. It is good to meet another who knows their guidance."
});

const SPEAKER_BLESSINGS = Object.freeze({
  "roman-catholic": "Christ and the saints keep your ship, captain.",
  lutheran: "God's grace and a fair wind to you, captain.",
  "reformed-protestant": "God's peace attend your voyage, captain.",
  anglican: "God's peace attend your voyage, captain.",
  quaker: "Peace be with you, friend.",
  "eastern-orthodox": "Christ keep you upon the waters, captain.",
  "ethiopian-orthodox": "May God guard your road upon the sea, captain.",
  "sunni-islam": "Peace be upon you, captain, and may God grant you a safe passage.",
  "shia-islam": "Peace be upon you, captain, and may God grant you a safe passage.",
  "ibadi-islam": "Peace be upon you, captain, and may God grant you a safe passage.",
  judaism: "Peace upon you, captain. May your voyage end safely.",
  hinduism: "May your voyage be auspicious, captain.",
  jainism: "Peace to every living soul in your wake, captain.",
  sikhism: "May the One preserve your voyage, captain.",
  zoroastrianism: "May your course be taken with good thoughts, good words, and good deeds.",
  "theravada-buddhism": "May your road be free of suffering, captain.",
  "mahayana-buddhism": "May compassion guide your voyage, captain.",
  "tibetan-buddhism": "May wisdom and compassion guide your voyage, captain.",
  daoism: "May the Way remain open and your course keep its balance, captain.",
  "chinese-traditional": "May order and good judgment attend your voyage, captain.",
  "korean-traditional": "May order and good judgment attend your voyage, captain.",
  "kami-buddhist": "May the kami guard your wake, captain.",
  "andean-traditional": "May mountain and sun watch your road, captain.",
  "mesoamerican-traditional": "May sun and rain favor your road, captain.",
  "north-american-traditional": "Travel well with the waters and shores, captain.",
  "american-traditional": "Travel well with the waters and shores, captain.",
  "african-traditional": "May the ancestors keep your road, captain.",
  "polynesian-traditional": "May sea and ancestors carry you safely, captain.",
  "austronesian-traditional": "May sea and ancestors carry you safely, captain."
});

export function occasionalReligiousGreeting({
  speakerReligionId,
  listenerReligionId,
  key
}) {
  assertReligionPair(speakerReligionId, listenerReligionId, "Religious greeting");
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("Religious greeting requires a stable key");
  }
  if (speakerReligionId === "zoroastrianism" && listenerReligionId === "zoroastrianism") {
    return SHARED_GREETING_LINES.zoroastrianism;
  }
  const sameReligion = speakerReligionId === listenerReligionId;
  const sameFamily = religionFamily(speakerReligionId) === religionFamily(listenerReligionId);
  const divisor = sameReligion ? 3 : sameFamily ? 4 : 8;
  if (hashString32(`${key}|religious-greeting`) % divisor !== 0) return null;
  return religiousGreetingLine(speakerReligionId, listenerReligionId);
}

export function dietOfWormsGossip({
  speakerReligionId,
  listenerReligionId
}) {
  assertReligionPair(speakerReligionId, listenerReligionId, "Diet of Worms dialogue");
  if (speakerReligionId === "roman-catholic") {
    return listenerReligionId === "roman-catholic"
      ? "At Worms, Luther refused lawful recantation before Church and Emperor. The Edict has made him an outlaw, yet his pamphlets still cross every market."
      : PROTESTANT_RELIGIONS.has(listenerReligionId)
        ? "You may judge Luther more kindly than I do. At Worms he defied Church and Emperor, and the Edict now names him an outlaw."
        : "At Worms, Luther refused to recant before Church and Emperor. The quarrel is dividing German pulpits, presses, and taverns.";
  }
  if (PROTESTANT_RELIGIONS.has(speakerReligionId)) {
    return PROTESTANT_RELIGIONS.has(listenerReligionId)
      ? "At Worms, Luther would not recant what he held to Scripture and conscience. The Emperor calls him outlaw; many here call him steadfast."
      : listenerReligionId === "roman-catholic"
        ? "We may not agree on Luther. At Worms he would not recant what he held to Scripture; the Emperor answered by outlawing him."
        : "At Worms, Luther would not recant what he held to Scripture. The Emperor calls him outlaw, but his words keep traveling.";
  }
  return "Martin Luther refused to recant before Emperor Charles V at the Diet of Worms, and the argument has split every tavern in Germany.";
}

export function dietOfWormsGossipPerspective(religionId) {
  religionById(religionId);
  if (religionId === "roman-catholic") return "catholic";
  if (PROTESTANT_RELIGIONS.has(religionId)) return "protestant";
  return "other";
}

export function occasionalReligiousBirthdayWish({
  speakerReligionId,
  listenerReligionId,
  listenerName,
  key
}) {
  assertReligionPair(speakerReligionId, listenerReligionId, "Birthday blessing");
  if (typeof listenerName !== "string" || listenerName.trim() === "") {
    throw new Error("Birthday blessing requires the celebrant's name");
  }
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("Birthday blessing requires a stable key");
  }
  if (hashString32(`${key}|birthday-faith`) % 4 !== 0) return null;
  if (speakerReligionId === "zoroastrianism" && listenerReligionId === "zoroastrianism") {
    return `Hamazor bem, ${listenerName}. On your birthday, may we remain one in strength through the year ahead.`;
  }
  if (speakerReligionId === listenerReligionId) {
    return sharedBirthdayWish(speakerReligionId, listenerName);
  }
  if (religionFamily(speakerReligionId) === religionFamily(listenerReligionId)) {
    return familyBirthdayWish(speakerReligionId, listenerName);
  }
  return `Our prayers differ, ${listenerName}, but I am glad this day brought you aboard. A happy birthday and a safe year ahead.`;
}

export function protestantColonistReception({
  organizerReligionId,
  captainReligionId
}) {
  assertReligionPair(organizerReligionId, captainReligionId, "Colonist reception");
  if (!PROTESTANT_RELIGIONS.has(organizerReligionId)) return null;
  if (organizerReligionId === captainReligionId) {
    return "You know why these families seek room to order their worship by conscience. That shared trust makes them readier to place themselves in your care.";
  }
  if (PROTESTANT_RELIGIONS.has(captainReligionId)) {
    return "Your confession is not precisely theirs, but you know what it is to have worship weighed by princes. They will trust you more readily for that.";
  }
  if (captainReligionId === "roman-catholic") {
    return "You keep the old faith. They will still trust your seamanship, though some will listen carefully to how you speak of their worship.";
  }
  if (CHRISTIAN_RELIGIONS.has(captainReligionId)) {
    return "Your Church is not their covenant, but you understand the danger of carrying a disputed faith beneath a ruler's eye.";
  }
  return "Their quarrels with bishops and princes may be strange to you. They ask safe passage and liberty of worship, not agreement.";
}

export function isProtestantReligion(religionId) {
  religionById(religionId);
  return PROTESTANT_RELIGIONS.has(religionId);
}

function religiousGreetingLine(speakerReligionId, listenerReligionId) {
  if (speakerReligionId === listenerReligionId) {
    return SHARED_GREETING_LINES[speakerReligionId] ||
      sharedFamilyGreeting(speakerReligionId);
  }
  if (speakerReligionId === "roman-catholic" && PROTESTANT_RELIGIONS.has(listenerReligionId)) {
    return "Christ be with you, captain. The times are sharp enough; let us keep doctrine from the scales.";
  }
  if (PROTESTANT_RELIGIONS.has(speakerReligionId) && listenerReligionId === "roman-catholic") {
    return "God's peace to you. We may differ on Rome, but a sound ledger needs no confession.";
  }
  if (religionFamily(speakerReligionId) === religionFamily(listenerReligionId)) {
    return sharedFamilyGreeting(speakerReligionId);
  }
  return SPEAKER_BLESSINGS[speakerReligionId];
}

function sharedFamilyGreeting(religionId) {
  const family = religionFamily(religionId);
  if (family === "christian") return "Christ be with you, captain. Our churches differ, but the same sea lies beneath us.";
  if (family === "muslim") return "Peace be upon you, captain. Our schools may differ; a safe voyage is a blessing to us both.";
  if (family === "buddhist") return "May compassion and clear judgment guide your voyage, captain.";
  return SPEAKER_BLESSINGS[religionId];
}

function sharedBirthdayWish(religionId, name) {
  const family = religionFamily(religionId);
  if (family === "christian") return `God keep you through the year ahead, ${name}. A blessed and happy birthday.`;
  if (family === "muslim") return `May God grant you a long life and a fortunate year, ${name}. A happy birthday to you.`;
  if (family === "buddhist") return `May the year ahead bring wisdom and freedom from suffering, ${name}. Happy birthday.`;
  if (religionId === "judaism") return `Peace and many good years to you, ${name}. Happy birthday.`;
  if (religionId === "hinduism") return `May this new year of your life be auspicious, ${name}. Happy birthday.`;
  if (religionId === "jainism") return `May the year ahead bring peace to you and every life in your care, ${name}. Happy birthday.`;
  if (religionId === "sikhism") return `May the One keep you in courage and service this year, ${name}. Happy birthday.`;
  return `${SPEAKER_BLESSINGS[religionId]} Happy birthday, ${name}.`;
}

function familyBirthdayWish(speakerReligionId, name) {
  const family = religionFamily(speakerReligionId);
  if (family === "christian") return `Our churches differ, ${name}, but I gladly ask God to keep you through the year ahead. Happy birthday.`;
  if (family === "muslim") return `Our schools differ, ${name}, but I gladly pray God grants you a fortunate year. Happy birthday.`;
  if (family === "buddhist") return `Our teachings differ in their forms, ${name}, but I wish you wisdom and peace in the year ahead.`;
  return `A happy birthday and a fortunate year to you, ${name}.`;
}

function religionFamily(religionId) {
  religionById(religionId);
  if (CHRISTIAN_RELIGIONS.has(religionId)) return "christian";
  if (MUSLIM_RELIGIONS.has(religionId)) return "muslim";
  if (BUDDHIST_RELIGIONS.has(religionId)) return "buddhist";
  return religionId;
}

function assertReligionPair(speakerReligionId, listenerReligionId, label) {
  if (typeof speakerReligionId !== "string" || typeof listenerReligionId !== "string") {
    throw new Error(`${label} requires speaker and listener religions`);
  }
  religionById(speakerReligionId);
  religionById(listenerReligionId);
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
