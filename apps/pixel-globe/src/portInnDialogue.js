import { nameCultureForSubject } from "./characterNames.js";

const DRINK_BY_CITY_TYPE = Object.freeze({
  "northern-european": drink("ale", "malty and bitter"),
  mediterranean: drink("local wine", "bright and dry"),
  "islamic-desert": drink("raisin wine", "sweet with spice"),
  "east-asian": drink("rice wine", "warm and mellow"),
  "south-asian": drink("palm toddy", "tart and yeasty"),
  "southeast-asian": drink("palm arrack", "hot and fragrant"),
  "sub-saharan": drink("sorghum beer", "sour and grainy"),
  mesoamerican: drink("pulque", "cloudy and sharp"),
  andean: drink("maize chicha", "earthy and gently sour"),
  polynesian: drink("kava", "peppery and numbing", { alcoholic: false })
});

const DRINK_BY_NAME_CULTURE = Object.freeze({
  ainu: drink("millet ale", "softly sour and smoky"),
  chinese: drink("rice wine", "warm and mellow"),
  japanese: drink("sake", "clean and softly sweet"),
  korean: drink("rice wine", "warm and mellow"),
  ryukyuan: drink("awamori", "strong and earthy")
});

const SHARED_DRINK_REGION_BY_NAME_CULTURE = Object.freeze({
  chinese: "east-asian-mainland",
  korean: "east-asian-mainland"
});

const FAMILIAR_LINES = Object.freeze([
  ({ label }) => `One cup of ${label}, and I remember my first night ashore with coin in my pocket.`,
  ({ label }) => `Now that is ${label}. I knew this harbor by the taste before I saw the quay.`,
  ({ label }) => `I have missed good ${label}. The sea makes fond memories of an ordinary cup.`
]);

const FOREIGN_LINES = Object.freeze([
  ({ label, taste, homeLabel }) => `This ${label} is ${taste}. Nothing like ${homeLabel}, but the second cup argues well.`,
  ({ sentenceLabel, taste }) => `${sentenceLabel}—${taste}. Strange on the first swallow; less strange on the third.`,
  ({ label, homeLabel }) => `They drink ${label} here. I would not mistake it for ${homeLabel}, even in a rolling cabin.`
]);

const KAVA_LINES = Object.freeze([
  () => "Kava, they call it. No ale in it, yet my tongue is numb and the room has become very reasonable.",
  () => "This kava carries no wine-fire. It leaves the head clear and the mouth wondering where it went.",
  () => "A sailor expects a cup to burn or bite. Kava does neither, then quietly takes command of the tongue."
]);

export function portInnDialogue({ city, homeCity, speakerName, variantSeed = 0 }) {
  requireCity(city, "Inn city");
  requireCity(homeCity, "Captain home city");
  if (typeof speakerName !== "string" || speakerName.trim() === "") {
    throw new Error("Inn dialogue requires a speaker name");
  }
  if (!Number.isInteger(variantSeed) || variantSeed < 0) {
    throw new Error(`Invalid inn dialogue variant: ${variantSeed}`);
  }
  const local = drinkForCity(city);
  const home = drinkForCity(homeCity);
  const familiar = drinkRegion(city) === drinkRegion(homeCity);
  const lines = local.alcoholic === false
    ? KAVA_LINES
    : familiar ? FAMILIAR_LINES : FOREIGN_LINES;
  const line = lines[variantSeed % lines.length]({
    label: local.label,
    sentenceLabel: sentenceCase(local.label),
    taste: local.taste,
    homeLabel: home.label
  });
  return Object.freeze({
    speaker: speakerName.trim(),
    expressionId: familiar ? "happy" : "thoughtful",
    text: line,
    drinkLabel: local.label,
    familiar
  });
}

function sentenceCase(value) {
  if (typeof value !== "string" || value === "") throw new Error("Inn flavor requires a drink label");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function drinkForCity(city) {
  requireCity(city, "Drink city");
  const cultureId = nameCultureForSubject(city);
  const culturalDrink = DRINK_BY_NAME_CULTURE[cultureId];
  if (culturalDrink) return culturalDrink;
  const profile = DRINK_BY_CITY_TYPE[city.cityType];
  if (!profile) throw new Error(`No port drink profile for city type: ${city.cityType}`);
  return profile;
}

function drinkRegion(city) {
  const cultureId = nameCultureForSubject(city);
  if (DRINK_BY_NAME_CULTURE[cultureId]) {
    return SHARED_DRINK_REGION_BY_NAME_CULTURE[cultureId] || cultureId;
  }
  return city.cityType;
}

function drink(label, taste, { alcoholic = true } = {}) {
  return Object.freeze({ label, taste, alcoholic });
}

function requireCity(city, label) {
  if (!city || typeof city.cityType !== "string" || city.cityType === "" ||
      typeof city.cityId !== "string" || city.cityId === "") {
    throw new Error(`${label} requires a canonical city id and city type`);
  }
}
