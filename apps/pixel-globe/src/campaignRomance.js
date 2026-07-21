import { characterAgeAtMinute } from "./characterBiography.js";

const MINIMUM_ROMANCE_AGE = 19;
const ROMANCE_VARIANT_COUNT = 4;

const MALE_CAPTAIN_DIALOGUE = Object.freeze([
  Object.freeze([
    "Captain, now that we are home, I cannot bear for this homecoming to be our farewell. Somewhere beyond the last horizon, I fell in love with you.",
    "Then it will not be a farewell. I have loved you too, and every course home led me back to you."
  ]),
  Object.freeze([
    "I faced storms more easily than I can say this: I love you. If you sail again, I want my place to remain beside you.",
    "You need not fear the answer. I love you, and there is no place aboard or ashore I would rather have you."
  ]),
  Object.freeze([
    "We have shared hunger, danger, and more horizons than I can count. I hoped we might share the quieter years too. I love you.",
    "So did I. The voyage would never have meant half as much without you, and I want every year that follows to be ours."
  ]),
  Object.freeze([
    "Before the crew scatters, there is one truth I kept through every watch: I love you, captain.",
    "And I love you. I thought command required silence, but not now, and never again between us."
  ])
]);

const FEMALE_CAPTAIN_DIALOGUE = Object.freeze([
  Object.freeze([
    "Captain, I thought landfall would make this easier to say. It has not. I love you, and I do not want our voyage to end with us apart.",
    "Then stay with me. I love you too, and coming home would have meant nothing if I had to leave you behind."
  ]),
  Object.freeze([
    "I would face another storm before this moment, but here it is: I love you. I have for longer than I dared admit.",
    "You hid it no better than I did. I love you, and I want the life after this voyage to be one we choose together."
  ]),
  Object.freeze([
    "Every time you ordered us toward another horizon, I followed gladly. Not only for the voyage. I love you.",
    "And I kept looking for you whenever the sea turned hard. I love you too. Whatever comes next, we meet it together."
  ]),
  Object.freeze([
    "Before we go ashore, let me speak plainly once: you have my heart, captain. I love you.",
    "Then let me answer just as plainly: I love you. This is not the end of our story."
  ])
]);

export function createCampaignVictoryRomance({
  captain,
  namedCrew,
  currentMinute,
  homeLongitudeDeg = 0
}) {
  const captainSex = characterSex(captain, "captain");
  if (!Array.isArray(namedCrew)) throw new Error("Campaign romance requires named crew");
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid campaign romance minute: ${currentMinute}`);
  }
  if (!Number.isFinite(homeLongitudeDeg) || homeLongitudeDeg < -180 || homeLongitudeDeg > 180) {
    throw new Error(`Invalid campaign romance longitude: ${homeLongitudeDeg}`);
  }
  const eligible = namedCrew
    .filter((character) => characterSex(character, "named crewmate") !== captainSex)
    .filter((character) => characterAgeAtMinute(character, currentMinute, homeLongitudeDeg) >= MINIMUM_ROMANCE_AGE)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  if (eligible.length === 0) return null;

  const selectionSeed = `${captain.id}|${currentMinute}|campaign-romance`;
  const companion = eligible[hashString32(`${selectionSeed}|companion`) % eligible.length];
  const companionSex = characterSex(companion, "named crewmate");
  const romance = Object.freeze({
    captainId: captain.id,
    captainSex,
    companion,
    companionId: companion.id,
    companionSex,
    variantIndex: hashString32(`${selectionSeed}|${companion.id}|dialogue`) % ROMANCE_VARIANT_COUNT,
    childCount: 2 + hashString32(`${selectionSeed}|${companion.id}|children`) % 9
  });
  return validateCampaignVictoryRomance(romance);
}

export function campaignRomanceDialogueSteps(romance) {
  validateCampaignVictoryRomance(romance);
  const variants = romance.captainSex === "male" ? MALE_CAPTAIN_DIALOGUE : FEMALE_CAPTAIN_DIALOGUE;
  const [confession, answer] = variants[romance.variantIndex];
  return Object.freeze([
    Object.freeze({ speaker: "companion", expressionId: "thoughtful", text: confession }),
    Object.freeze({ speaker: "player", expressionId: "happy", text: answer })
  ]);
}

export function campaignRomanceEpilogue(romance, captain) {
  validateCampaignVictoryRomance(romance);
  if (captain?.id !== romance.captainId || typeof captain.name !== "string" || captain.name.trim() === "") {
    throw new Error("Campaign romance epilogue requires its captain");
  }
  return `${captain.name} and ${romance.companion.name} married and had ${romance.childCount} children.`;
}

export function validateCampaignVictoryRomance(romance) {
  if (!romance || typeof romance !== "object") throw new Error("Campaign romance must be an object");
  if (typeof romance.captainId !== "string" || romance.captainId === "") {
    throw new Error("Campaign romance requires a captain id");
  }
  if (typeof romance.companionId !== "string" || romance.companionId === "" ||
      romance.companion?.id !== romance.companionId) {
    throw new Error("Campaign romance requires a matching crewmate");
  }
  if (!romance.companion?.joinedCrew) throw new Error("Campaign romance companion is not named crew");
  if (!["male", "female"].includes(romance.captainSex) || !["male", "female"].includes(romance.companionSex) ||
      romance.captainSex === romance.companionSex) {
    throw new Error("Campaign romance requires an opposite-sex couple");
  }
  if (!Number.isInteger(romance.variantIndex) || romance.variantIndex < 0 ||
      romance.variantIndex >= ROMANCE_VARIANT_COUNT) {
    throw new Error(`Invalid campaign romance variant: ${romance.variantIndex}`);
  }
  if (!Number.isInteger(romance.childCount) || romance.childCount < 2 || romance.childCount > 10) {
    throw new Error(`Invalid campaign romance child count: ${romance.childCount}`);
  }
  return romance;
}

function characterSex(character, label) {
  const sex = character?.sex || character?.gender;
  if (sex !== "male" && sex !== "female") {
    throw new Error(`Campaign romance ${label} requires an explicit sex: ${sex}`);
  }
  if (typeof character.id !== "string" || character.id === "") {
    throw new Error(`Campaign romance ${label} requires an id`);
  }
  return sex;
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
