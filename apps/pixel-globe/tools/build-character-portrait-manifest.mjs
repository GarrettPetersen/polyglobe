import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const characterRoot = join(appRoot, "public/assets/characters");
const outputPath = join(characterRoot, "generated/character-portraits.json");
const portraitSize = 64;
const individualSequencePacks = new Set([
  "Master Chef Portrait Pack by Captainskolot",
  "Indian Ocean Portrait Pack by OpenAI",
  "Ming Chinese Portrait Pack by OpenAI",
  "Native Americain Portrait Pack by Captainskeleto",
  "Pirates Portrait Pack by Captainskeleto",
  "Polynesian Portrait Pack by OpenAI",
  "South Asian Portrait Pack by OpenAI",
  "Southeast Asian Portrait Pack by OpenAI",
  "Sub-Saharan African Portrait Pack by OpenAI",
  "Viking Men Portrait Pack by Captainskeleto",
  "Women Portrait Pack by Captainskeleto",
  "Women Pirates Portrait Pack by Captainskeleto"
]);
const numericGridPacks = new Map();

const singleSexPortraitDirectories = new Map([
  ["Blacksmith Portrait Pack by Captainskeleto", "male"],
  ["Blond Villager Portrait Pack by Captainskeleto", "male"],
  ["Blond Villager Women Portrait Pack by Captainskeleto", "female"],
  ["Curated Historical Portraits by CaptainSkolot", "male"],
  ["Knight Portrait Pack by Captainskeleto", "male"],
  ["Little Girl Portrait pack by Captainskeleto", "female"],
  ["Lumberjack Portrait by Captainskeleto", "male"],
  ["Master Chef Portrait Pack by Captainskolot", "male"],
  ["Merchant Portrait Pack by Captainskolot", "male"],
  ["Old Villager Portrait by Captainskeleto", "male"],
  ["Old Warrior Grey Beard by Captainskolot", "male"],
  ["Peasant Portrait Pack by Captainskeleto", "male"],
  ["Pirates Portrait Pack by Captainskeleto/Pirates Portrait", "male"],
  ["Ultimate Portrait Pack V1.0/Blacksmith", "male"],
  ["Ultimate Portrait Pack V1.0/Herbalist women portrait", "female"],
  ["Ultimate Portrait Pack V1.0/Knight Commander", "male"],
  ["Ultimate Portrait Pack V1.0/Man Knight", "male"],
  ["Ultimate Portrait Pack V1.0/Monk", "male"],
  ["Ultimate Portrait Pack V1.0/Noblewomen", "female"],
  ["Ultimate Portrait Pack V1.0/Seamstress Women Portrait", "female"],
  ["Ultimate Portrait Pack V1.0/Tavern Keeper", "male"],
  ["Ultimate Portrait Pack V1.0/Village Elder", "male"],
  ["Ultimate Portrait Pack V1.0/Women Baker", "female"],
  ["Ultimate Portrait Pack V1.0/Young Peasant Boy", "male"],
  ["Ultimate Portrait Pack V1.0/Young Peasant Girl", "female"],
  ["Viking Men Portrait Pack by Captainskeleto", "male"],
  ["Warrior with Beard Pack by Captainskolot", "male"],
  ["Women Black Hair Portrait by Captainskolot", "female"],
  ["Women Knight Portrait Pack by Captainskeleto", "female"],
  ["Women Peasant Pack by Captainskeleto", "female"],
  ["Women Pirates Portrait Pack by Captainskeleto", "female"],
  ["Women Portrait Pack by Captainskeleto/Women Portrait", "female"]
]);

const reviewedSexSequences = new Map([
  ["Indian Ocean Portrait Pack by OpenAI", sexSequence("mfmmmmfmfmmfmfmm")],
  ["Ming Chinese Portrait Pack by OpenAI", sexSequence("mmmmfmmmmfmmmmfm")],
  ["Native Americain Portrait Pack by Captainskeleto", sexSequence("ffffmmmmffmmffmm")],
  ["Polynesian Portrait Pack by OpenAI", sexSequence("mfmfmfmfmfmfmfmm")],
  ["South Asian Portrait Pack by OpenAI", sexSequence("mfmfmmmmfmfmmfmf")],
  ["Southeast Asian Portrait Pack by OpenAI", sexSequence("mfmfmmmmfmffmfmm")],
  ["Sub-Saharan African Portrait Pack by OpenAI", sexSequence("mfmfmfmfmfmfmfmf")]
]);

const expressionLabelOverrides = new Map([
  labels("Blacksmith Portrait Pack by Captainskeleto/Blacksmith Portrait", [
    ["neutral", "Neutral"],
    ["smile", "Smile"],
    ["concerned", "Concerned"],
    ["stern", "Stern"],
    ["weary", "Weary"],
    ["grimace", "Grimace"],
    ["pleased", "Pleased"],
    ["afraid", "Afraid"],
    ["angry", "Angry"]
  ]),
  labels("Merchant Portrait Pack by Captainskolot/Portrait Merchant", [
    ["neutral", "Neutral"],
    ["weary", "Weary"],
    ["soft-smile", "Soft Smile"],
    ["concerned", "Concerned"],
    ["angry", "Angry"],
    ["sad", "Sad"],
    ["surprised", "Surprised"],
    ["laughing", "Laughing"],
    ["pained", "Pained"],
    ["pleased", "Pleased"],
    ["shouting", "Shouting"],
    ["happy", "Happy"]
  ]),
  labels("Warrior with Beard Pack by Captainskolot/Warrior With Beard", [
    ["neutral", "Neutral"],
    ["worried", "Worried"],
    ["soft-smile", "Soft Smile"],
    ["stern", "Stern"],
    ["angry", "Angry"],
    ["sad", "Sad"],
    ["surprised", "Surprised"],
    ["laughing", "Laughing"],
    ["pained", "Pained"],
    ["pleased", "Pleased"],
    ["shouting", "Shouting"],
    ["happy", "Happy"]
  ]),
  labels("Women Black Hair Portrait by Captainskolot/Women Black Hair Portrait", [
    ["soft-smile", "Soft Smile"],
    ["neutral", "Neutral"],
    ["concerned", "Concerned"],
    ["happy", "Happy"],
    ["angry", "Angry"],
    ["wary", "Wary"],
    ["embarrassed", "Embarrassed"],
    ["laughing", "Laughing"],
    ["stern", "Stern"],
    ["pleased", "Pleased"],
    ["shouting", "Shouting"],
    ["sad", "Sad"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Blacksmith/Blacksmith Portrait", [
    ["grimace", "Grimace"],
    ["neutral", "Neutral"],
    ["hurt", "Hurt"],
    ["laughing", "Laughing"],
    ["happy", "Happy"],
    ["determined", "Determined"]
  ]),
  labels("Blond Villager Portrait Pack by Captainskeleto/Blond Villager Portrait", [
    ["concerned", "Concerned"],
    ["wary", "Wary"],
    ["surprised", "Surprised"],
    ["afraid", "Afraid"],
    ["sad", "Sad"],
    ["neutral", "Neutral"],
    ["happy", "Happy"],
    ["soft-smile", "Soft Smile"],
    ["stern", "Stern"],
    ["pleased", "Pleased"],
    ["shouting", "Shouting"],
    ["angry", "Angry"]
  ]),
  labels("Blond Villager Women Portrait Pack by Captainskeleto/Blond Villager Women", [
    ["happy", "Happy"],
    ["sad", "Sad"],
    ["wary", "Wary"],
    ["soft-smile", "Soft Smile"],
    ["worried", "Worried"],
    ["overjoyed", "Overjoyed"],
    ["attentive", "Attentive"],
    ["embarrassed", "Embarrassed"],
    ["neutral", "Neutral"],
    ["pleased", "Pleased"],
    ["angry", "Angry"],
    ["surprised", "Surprised"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Herbalist women portrait/Herbalist Women Portrait", [
    ["sad", "Sad"],
    ["stern", "Stern"],
    ["neutral", "Neutral"],
    ["knowing", "Knowing"],
    ["afraid", "Afraid"],
    ["happy", "Happy"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Knight Commander/Knight Commander", [
    ["sad", "Sad"],
    ["angry", "Angry"],
    ["neutral", "Neutral"],
    ["pleased", "Pleased"],
    ["happy", "Happy"],
    ["skeptical", "Skeptical"]
  ]),
  labels("Knight Portrait Pack by Captainskeleto/Knight Portrait", [
    ["happy", "Happy"],
    ["neutral", "Neutral"],
    ["smile", "Smile"],
    ["sad", "Sad"],
    ["pleased", "Pleased"],
    ["concerned", "Concerned"],
    ["soft-smile", "Soft Smile"],
    ["laughing", "Laughing"],
    ["worried", "Worried"],
    ["pained", "Pained"],
    ["shouting", "Shouting"],
    ["afraid", "Afraid"]
  ]),
  labels("Little Girl Portrait pack by Captainskeleto/Little Girl Portrait", [
    ["sad", "Sad"],
    ["happy", "Happy"],
    ["worried", "Worried"],
    ["concerned", "Concerned"],
    ["wary", "Wary"],
    ["surprised", "Surprised"],
    ["attentive", "Attentive"],
    ["angry", "Angry"],
    ["embarrassed", "Embarrassed"],
    ["neutral", "Neutral"],
    ["pleased", "Pleased"],
    ["afraid", "Afraid"]
  ]),
  labels("Lumberjack Portrait by Captainskeleto/Lumberjack Portrait", [
    ["sad", "Sad"],
    ["neutral", "Neutral"],
    ["stern", "Stern"],
    ["afraid", "Afraid"],
    ["concerned", "Concerned"],
    ["angry", "Angry"],
    ["pained", "Pained"],
    ["wary", "Wary"],
    ["attentive", "Attentive"],
    ["disgusted", "Disgusted"],
    ["happy", "Happy"],
    ["laughing", "Laughing"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Man Knight/Man Knight Portrait", [
    ["sad", "Sad"],
    ["angry", "Angry"],
    ["happy", "Happy"],
    ["neutral", "Neutral"],
    ["shy", "Shy"],
    ["afraid", "Afraid"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Monk/Monk Portrait", [
    ["sad", "Sad"],
    ["neutral", "Neutral"],
    ["worried", "Worried"],
    ["praying", "Praying"],
    ["afraid", "Afraid"],
    ["angry", "Angry"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Noblewomen/Noblewomen Portrait", [
    ["sad", "Sad"],
    ["worried", "Worried"],
    ["angry", "Angry"],
    ["soft-smile", "Soft Smile"],
    ["happy", "Happy"],
    ["neutral", "Neutral"]
  ]),
  labels("Old Villager Portrait by Captainskeleto/Old Villager Portrait", [
    ["worried", "Worried"],
    ["concerned", "Concerned"],
    ["stern", "Stern"],
    ["pained", "Pained"],
    ["shouting", "Shouting"],
    ["sad", "Sad"],
    ["neutral", "Neutral"],
    ["weary", "Weary"],
    ["pleased", "Pleased"],
    ["angry", "Angry"],
    ["determined", "Determined"],
    ["afraid", "Afraid"]
  ]),
  labels("Old Warrior Grey Beard by Captainskolot/Old Warrior Grey Beard", [
    ["sad", "Sad"],
    ["worried", "Worried"],
    ["neutral", "Neutral"],
    ["afraid", "Afraid"],
    ["pained", "Pained"],
    ["angry", "Angry"],
    ["shouting", "Shouting"],
    ["wary", "Wary"],
    ["concerned", "Concerned"],
    ["determined", "Determined"],
    ["disgusted", "Disgusted"],
    ["hurt", "Hurt"]
  ]),
  labels("Peasant Portrait Pack by Captainskeleto/Peasant Portrait", [
    ["soft-smile", "Soft Smile"],
    ["happy", "Happy"],
    ["pleased", "Pleased"],
    ["neutral", "Neutral"],
    ["attentive", "Attentive"],
    ["concerned", "Concerned"],
    ["sad", "Sad"],
    ["wary", "Wary"],
    ["skeptical", "Skeptical"],
    ["angry", "Angry"],
    ["afraid", "Afraid"],
    ["smile", "Smile"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Tavern Keeper/Tavern Keeper Portrait", [
    ["concerned", "Concerned"],
    ["happy", "Happy"],
    ["angry", "Angry"],
    ["neutral", "Neutral"],
    ["laughing", "Laughing"],
    ["sad", "Sad"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Village Elder/Villager Elder Portrait", [
    ["worried", "Worried"],
    ["afraid", "Afraid"],
    ["happy", "Happy"],
    ["neutral", "Neutral"],
    ["sad", "Sad"],
    ["stern", "Stern"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Young Peasant Girl/Villager Young Girl Portrait", [
    ["sad", "Sad"],
    ["soft-smile", "Soft Smile"],
    ["happy", "Happy"],
    ["neutral", "Neutral"],
    ["laughing", "Laughing"],
    ["concerned", "Concerned"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Women Baker/Women Baker Portrait", [
    ["sad", "Sad"],
    ["concerned", "Concerned"],
    ["happy", "Happy"],
    ["afraid", "Afraid"],
    ["soft-smile", "Soft Smile"],
    ["neutral", "Neutral"]
  ]),
  labels("Women Knight Portrait Pack by Captainskeleto/Women Knight Portrait", [
    ["happy", "Happy"],
    ["sad", "Sad"],
    ["shy", "Shy"],
    ["worried", "Worried"],
    ["angry", "Angry"],
    ["stern", "Stern"],
    ["wary", "Wary"],
    ["afraid", "Afraid"],
    ["soft-smile", "Soft Smile"],
    ["attentive", "Attentive"],
    ["laughing", "Laughing"],
    ["neutral", "Neutral"]
  ]),
  labels("Women Peasant Pack by Captainskeleto/Women Peasant", [
    ["happy", "Happy"],
    ["sad", "Sad"],
    ["serious", "Serious"],
    ["overjoyed", "Overjoyed"],
    ["worried", "Worried"],
    ["soft-smile", "Soft Smile"],
    ["laughing", "Laughing"],
    ["crying", "Crying"],
    ["neutral", "Neutral"],
    ["pleased", "Pleased"],
    ["angry", "Angry"],
    ["embarrassed", "Embarrassed"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Seamstress Women Portrait/Women Seamstress Portrait", [
    ["neutral", "Neutral"],
    ["happy", "Happy"],
    ["thoughtful", "Thoughtful"],
    ["afraid", "Afraid"],
    ["sad", "Sad"],
    ["serious", "Serious"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Young Peasant Boy/Young Peasant Boy Portrait", [
    ["sad", "Sad"],
    ["concerned", "Concerned"],
    ["happy", "Happy"],
    ["laughing", "Laughing"],
    ["afraid", "Afraid"],
    ["neutral", "Neutral"]
  ])
]);

const portraitAgeRanges = new Map([
  ["Blacksmith Portrait Pack by Captainskeleto/Blacksmith Portrait", ageRange(32, 48)],
  ["Curated Historical Portraits by CaptainSkolot/Armored Soldier", ageRange(24, 40)],
  ["Curated Historical Portraits by CaptainSkolot/Bald Monk", ageRange(25, 45)],
  ["Curated Historical Portraits by CaptainSkolot/Mercenary Warrior", ageRange(36, 52)],
  ["Curated Historical Portraits by CaptainSkolot/Old Scholar", ageRange(58, 78)],
  ["Curated Historical Portraits by CaptainSkolot/Young Warrior", ageRange(24, 38)],
  ["Ultimate Portrait Pack V1.0/Blacksmith/Blacksmith Portrait", ageRange(50, 70)],
  ["Blond Villager Portrait Pack by Captainskeleto/Blond Villager Portrait", ageRange(24, 36)],
  ["Blond Villager Women Portrait Pack by Captainskeleto/Blond Villager Women", ageRange(20, 34)],
  ["Ultimate Portrait Pack V1.0/Herbalist women portrait/Herbalist Women Portrait", ageRange(22, 34)],
  ["Ultimate Portrait Pack V1.0/Knight Commander/Knight Commander", ageRange(52, 68)],
  ["Knight Portrait Pack by Captainskeleto/Knight Portrait", ageRange(18, 30)],
  ["Little Girl Portrait pack by Captainskeleto/Little Girl Portrait", ageRange(8, 13)],
  ["Lumberjack Portrait by Captainskeleto/Lumberjack Portrait", ageRange(35, 52)],
  ["Merchant Portrait Pack by Captainskolot/Portrait Merchant", ageRange(32, 48)],
  ["Ultimate Portrait Pack V1.0/Man Knight/Man Knight Portrait", ageRange(18, 30)],
  ["Ultimate Portrait Pack V1.0/Monk/Monk Portrait", ageRange(35, 55)],
  ["Ultimate Portrait Pack V1.0/Noblewomen/Noblewomen Portrait", ageRange(22, 38)],
  ["Old Villager Portrait by Captainskeleto/Old Villager Portrait", ageRange(58, 78)],
  ["Old Warrior Grey Beard by Captainskolot/Old Warrior Grey Beard", ageRange(58, 75)],
  ["Peasant Portrait Pack by Captainskeleto/Peasant Portrait", ageRange(18, 32)],
  ["Ultimate Portrait Pack V1.0/Tavern Keeper/Tavern Keeper Portrait", ageRange(35, 52)],
  ["Ultimate Portrait Pack V1.0/Village Elder/Villager Elder Portrait", ageRange(60, 80)],
  ["Ultimate Portrait Pack V1.0/Young Peasant Girl/Villager Young Girl Portrait", ageRange(15, 21)],
  ["Warrior with Beard Pack by Captainskolot/Warrior With Beard", ageRange(35, 52)],
  ["Women Black Hair Portrait by Captainskolot/Women Black Hair Portrait", ageRange(20, 34)],
  ["Ultimate Portrait Pack V1.0/Women Baker/Women Baker Portrait", ageRange(22, 36)],
  ["Women Knight Portrait Pack by Captainskeleto/Women Knight Portrait", ageRange(18, 30)],
  ["Women Peasant Pack by Captainskeleto/Women Peasant", ageRange(18, 32)],
  ["Ultimate Portrait Pack V1.0/Seamstress Women Portrait/Women Seamstress Portrait", ageRange(22, 36)],
  ["Ultimate Portrait Pack V1.0/Young Peasant Boy/Young Peasant Boy Portrait", ageRange(14, 20)]
]);

const numberedPortraitAgeRanges = new Map([
  ["Master Chef Portrait Pack by Captainskolot", numberedRanges({
    1: [35, 50], 2: [25, 40], 3: [50, 68], 4: [30, 44], 5: [30, 45], 6: [50, 68],
    7: [32, 48], 8: [28, 42], 9: [30, 45], 10: [50, 65], 11: [18, 28], 12: [30, 45]
  })],
  ["Ming Chinese Portrait Pack by OpenAI", numberedRanges({
    1: [35, 52], 2: [18, 30], 3: [20, 32], 4: [58, 78],
    5: [20, 34], 6: [35, 52], 7: [18, 30], 8: [30, 45],
    9: [35, 52], 10: [20, 34], 11: [30, 45], 12: [35, 52],
    13: [18, 30], 14: [30, 45], 15: [20, 34], 16: [30, 45]
  })],
  ["South Asian Portrait Pack by OpenAI", numberedRanges({
    1: [30, 45], 2: [20, 34], 3: [30, 45], 4: [20, 34],
    5: [25, 40], 6: [55, 75], 7: [18, 30], 8: [30, 45],
    9: [20, 34], 10: [30, 45], 11: [20, 34], 12: [55, 75],
    13: [25, 40], 14: [20, 34], 15: [30, 45], 16: [18, 30]
  })],
  ["Indian Ocean Portrait Pack by OpenAI", numberedRanges({
    1: [30, 45], 2: [20, 34], 3: [35, 50], 4: [55, 75],
    5: [18, 30], 6: [30, 45], 7: [20, 34], 8: [30, 45],
    9: [20, 34], 10: [45, 62], 11: [30, 45], 12: [20, 34],
    13: [55, 75], 14: [20, 34], 15: [30, 45], 16: [18, 30]
  })],
  ["Sub-Saharan African Portrait Pack by OpenAI", numberedRanges({
    1: [30, 45], 2: [20, 34], 3: [30, 45], 4: [20, 34],
    5: [30, 45], 6: [20, 34], 7: [55, 75], 8: [18, 30],
    9: [25, 40], 10: [20, 34], 11: [30, 45], 12: [20, 34],
    13: [18, 30], 14: [20, 34], 15: [40, 58], 16: [20, 34]
  })],
  ["Southeast Asian Portrait Pack by OpenAI", numberedRanges({
    1: [25, 40], 2: [20, 34], 3: [25, 40], 4: [20, 34],
    5: [30, 45], 6: [55, 75], 7: [18, 30], 8: [35, 52],
    9: [20, 34], 10: [30, 45], 11: [20, 34], 12: [18, 30],
    13: [18, 30], 14: [20, 34], 15: [55, 75], 16: [18, 30]
  })],
  ["Polynesian Portrait Pack by OpenAI", numberedRanges({
    1: [20, 34], 2: [20, 34], 3: [25, 40], 4: [20, 34],
    5: [25, 40], 6: [20, 34], 7: [55, 75], 8: [20, 34],
    9: [30, 45], 10: [20, 34], 11: [18, 30], 12: [20, 34],
    13: [18, 30], 14: [20, 34], 15: [30, 45], 16: [18, 30]
  })],
  ["Native Americain Portrait Pack by Captainskeleto", numberedRanges({
    1: [22, 36], 2: [20, 34], 3: [20, 34], 4: [20, 34], 5: [40, 58], 6: [30, 45],
    7: [45, 62], 8: [35, 52], 9: [30, 45], 10: [55, 75], 11: [18, 30], 12: [30, 45],
    13: [20, 34], 14: [25, 40], 15: [18, 30], 16: [16, 26]
  })],
  ["Pirates Portrait Pack by Captainskeleto/Pirates Portrait", numberedRanges({
    1: [55, 72], 2: [28, 40], 3: [18, 28], 4: [30, 45], 5: [50, 68], 6: [35, 50],
    7: [30, 45], 8: [28, 45], 9: [35, 50], 10: [35, 50], 11: [60, 78], 12: [35, 50],
    13: [45, 60], 14: [35, 50], 15: [28, 42], 16: [40, 55], 17: [55, 72], 18: [35, 48],
    19: [45, 60], 20: [38, 52], 21: [35, 50], 22: [32, 45], 23: [45, 60], 24: [45, 60], 25: [35, 50]
  })],
  ["Viking Men Portrait Pack by Captainskeleto", numberedRanges({
    1: [35, 52], 2: [35, 50], 3: [35, 50], 4: [30, 45], 5: [35, 50], 6: [22, 34],
    7: [28, 42], 8: [30, 45], 9: [28, 42], 10: [30, 45], 11: [28, 42], 12: [18, 28],
    13: [45, 60], 14: [35, 52], 15: [50, 68], 16: [35, 50], 17: [20, 32], 18: [28, 42],
    19: [35, 50], 20: [40, 58], 21: [35, 50], 22: [45, 60], 23: [50, 68], 24: [18, 30], 25: [35, 50]
  })],
  ["Women Pirates Portrait Pack by Captainskeleto", numberedRanges({
    1: [22, 35], 2: [20, 34], 3: [18, 30], 4: [20, 34], 5: [18, 30], 6: [18, 30],
    7: [18, 30], 8: [20, 34], 9: [18, 30], 10: [25, 38], 11: [18, 30], 12: [20, 32],
    13: [16, 24], 14: [18, 30], 15: [20, 34], 16: [22, 36], 17: [18, 30], 18: [22, 36],
    19: [18, 30], 20: [20, 34], 21: [16, 25], 22: [20, 34], 23: [18, 30], 24: [18, 30], 25: [22, 36]
  })],
  ["Women Portrait Pack by Captainskeleto/Women Portrait", numberedRanges({
    0: [20, 35], 1: [18, 30], 2: [20, 32], 3: [22, 36], 4: [18, 30],
    10: [20, 35], 11: [18, 30], 12: [20, 34], 13: [22, 36], 14: [18, 30],
    20: [20, 35], 21: [18, 30], 22: [22, 38], 23: [24, 40], 24: [25, 42],
    30: [18, 30], 31: [20, 34], 32: [20, 34], 33: [20, 34], 34: [18, 30],
    40: [28, 44], 41: [18, 30], 42: [20, 34], 43: [22, 38], 44: [24, 42],
    50: [25, 42], 51: [20, 36], 52: [25, 42], 53: [18, 30], 54: [20, 36]
  })]
]);

function ageRange(minAge, maxAge) {
  return Object.freeze({ minAge, maxAge });
}

function numberedRanges(values) {
  return new Map(Object.entries(values).map(([number, range]) => [Number(number), ageRange(...range)]));
}


function labels(key, values) {
  return [key, values.map(([id, label]) => expressionDescriptor(id, label))];
}

function sexSequence(sequence) {
  if (!/^[mf]{16}$/.test(sequence)) {
    throw new Error(`Reviewed portrait sex sequence must contain exactly 16 m/f entries: ${sequence}`);
  }
  return Object.freeze([...sequence].map((entry) => entry === "f" ? "female" : "male"));
}

function expressionDescriptor(id, label) {
  return { id, label };
}

function walkPngFiles(root, files = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated") continue;
      walkPngFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === ".png") files.push(fullPath);
  }
  return files;
}

function pngDimensions(path) {
  const bytes = readFileSync(path);
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    throw new Error(`Not a PNG file: ${path}`);
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

function groupPortraitFiles(files) {
  const groups = new Map();
  for (const path of files) {
    if (/sheet/i.test(basename(path))) continue;
    const dimensions = pngDimensions(path);
    if (dimensions.width !== portraitSize || dimensions.height !== portraitSize) continue;

    const relPath = relative(characterRoot, path).split(sep).join("/");
    const relDir = dirname(relPath) === "." ? "" : dirname(relPath);
    const parsed = parsePortraitName(path, relDir);
    const groupKey = `${relDir}/${parsed.baseKey}`;
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        relDir,
        baseKey: parsed.baseKey,
        labelSeed: parsed.labelSeed,
        groupingMode: parsed.groupingMode,
        expressions: []
      };
      groups.set(groupKey, group);
    }
    group.expressions.push({
      expressionIndex: parsed.expressionIndex,
      relPath,
      src: `assets/characters/${relPath.split("/").map(encodeURIComponent).join("/")}`
    });
  }
  return [...groups.values()]
    .filter((group) => group.expressions.length > 0)
    .map((group) => normalizeExpressionGroup(group))
    .sort((a, b) => a.label.localeCompare(b.label) || a.sourceDirectory.localeCompare(b.sourceDirectory));
}

function parsePortraitName(path, relDir) {
  const rawBase = basename(path, extname(path));
  const parentLabel = titleCase(lastPathSegment(relDir));
  const grid = numericGridPacks.get(relDir);
  if (grid && /^\d+$/.test(rawBase)) {
    const characterIndex = Number.parseInt(rawBase[grid.characterDigit], 10);
    const expressionIndex = Number.parseInt(rawBase[grid.expressionDigit], 10);
    if (!Number.isInteger(characterIndex) || !Number.isInteger(expressionIndex)) {
      throw new Error(`Numeric portrait grid filename does not match configured digits: ${path}`);
    }
    return {
      baseKey: `numeric-${characterIndex}`,
      labelSeed: `${parentLabel} ${characterIndex + 1}`,
      expressionIndex,
      groupingMode: "expression-set"
    };
  }

  if (individualSequencePacks.has(topPathSegment(relDir))) {
    if (/^\d+$/.test(rawBase)) {
      return {
        baseKey: `${slugify(parentLabel)}-${rawBase}`,
        labelSeed: `${parentLabel} ${rawBase}`,
        expressionIndex: 0,
        groupingMode: "single-portrait"
      };
    }
    const numbered = numberedPortraitName(rawBase);
    return {
      baseKey: `${slugify(numbered.base)}-${numbered.index}`,
      labelSeed: `${titleCase(numbered.base)} ${numbered.index}`,
      expressionIndex: 0,
      groupingMode: "single-portrait"
    };
  }

  if (/^\d+$/.test(rawBase)) {
    const digits = rawBase;
    if (digits.length >= 2) {
      const characterIndex = Number.parseInt(digits.slice(0, -1), 10);
      const expressionIndex = Number.parseInt(digits.slice(-1), 10);
      return {
        baseKey: `numeric-${characterIndex}`,
        labelSeed: `${parentLabel} ${characterIndex + 1}`,
        expressionIndex,
        groupingMode: "expression-set"
      };
    }
    return {
      baseKey: "numeric",
      labelSeed: parentLabel,
      expressionIndex: Number.parseInt(digits, 10),
      groupingMode: "expression-set"
    };
  }

  const underscore = rawBase.match(/^(.*?)[ _-]+(\d+)$/);
  if (underscore) {
    return {
      baseKey: slugify(underscore[1]),
      labelSeed: titleCase(underscore[1]),
      expressionIndex: Number.parseInt(underscore[2], 10),
      groupingMode: "expression-set"
    };
  }

  const trailingNumber = rawBase.match(/^(.*?)(\d+)$/);
  if (trailingNumber) {
    return {
      baseKey: slugify(trailingNumber[1]),
      labelSeed: titleCase(trailingNumber[1]),
      expressionIndex: Number.parseInt(trailingNumber[2], 10),
      groupingMode: "expression-set"
    };
  }

  return {
    baseKey: slugify(rawBase),
    labelSeed: titleCase(rawBase),
    expressionIndex: 0,
    groupingMode: "expression-set"
  };
}

function numberedPortraitName(rawBase) {
  const underscore = rawBase.match(/^(.*?)[ _-]+(\d+)$/);
  if (underscore) {
    return {
      base: underscore[1],
      index: Number.parseInt(underscore[2], 10)
    };
  }
  const trailingNumber = rawBase.match(/^(.*?)(\d+)$/);
  if (trailingNumber) {
    return {
      base: trailingNumber[1],
      index: Number.parseInt(trailingNumber[2], 10)
    };
  }
  return {
    base: rawBase,
    index: 1
  };
}

function normalizeExpressionGroup(group) {
  const sorted = group.expressions
    .sort((a, b) => a.expressionIndex - b.expressionIndex || a.relPath.localeCompare(b.relPath));
  const usedExpressionIds = new Set();
  const semanticLabels = expressionLabelsForGroup(group, sorted.length);
  const expressions = sorted.map((expression, position) => {
    const semantic = semanticLabels[position];
    const id = uniqueExpressionId(usedExpressionIds, semantic.id);
    usedExpressionIds.add(id);
    return {
      id,
      label: semantic.label,
      index: expression.expressionIndex,
      src: expression.src,
      width: portraitSize,
      height: portraitSize
    };
  });
  const metadata = portraitMetadata(group.labelSeed, group.relDir);
  const ages = portraitAgeRange(group.labelSeed, group.relDir);
  return {
    label: group.labelSeed,
    groupingMode: group.groupingMode,
    sourceDirectory: group.relDir,
    sex: portraitSex(group.labelSeed, group.relDir),
    roles: metadata.roles,
    regions: metadata.regions,
    minAge: ages.minAge,
    maxAge: ages.maxAge,
    expressionCount: expressions.length,
    expressions
  };
}

function portraitSex(label, sourceDirectory) {
  const uniformSex = singleSexPortraitDirectories.get(sourceDirectory);
  if (uniformSex) return uniformSex;

  const sequence = reviewedSexSequences.get(sourceDirectory);
  const match = label.match(/(\d+)$/);
  const portraitNumber = match ? Number.parseInt(match[1], 10) : NaN;
  const sex = sequence?.[portraitNumber - 1];
  if (sex) return sex;
  throw new Error(`Missing reviewed sex for portrait: ${sourceDirectory}/${label}`);
}

function portraitAgeRange(label, sourceDirectory) {
  const exact = portraitAgeRanges.get(`${sourceDirectory}/${label}`);
  if (exact) return exact;
  const numbered = numberedPortraitAgeRanges.get(sourceDirectory);
  const match = label.match(/(\d+)$/);
  const range = match && numbered?.get(Number.parseInt(match[1], 10));
  if (range) return range;
  throw new Error(`Missing visual age range for portrait: ${sourceDirectory}/${label}`);
}

function expressionLabelsForGroup(group, expressionCount) {
  if (expressionCount === 1 || group.groupingMode === "single-portrait") {
    return [expressionDescriptor("neutral", "Neutral")];
  }
  const key = `${group.relDir}/${group.labelSeed}`;
  const override = expressionLabelOverrides.get(key);
  if (override) {
    if (override.length !== expressionCount) {
      throw new Error(`Expression label count mismatch for ${key}: expected ${expressionCount}, got ${override.length}`);
    }
    const neutralCount = override.filter((expression) => expression.id === "neutral").length;
    if (neutralCount !== 1) {
      throw new Error(`Expression labels for ${key} must contain exactly one neutral frame; got ${neutralCount}`);
    }
    return override;
  }
  throw new Error(`Missing semantic expression labels for ${key}`);
}

const portraitMetadataOverrides = new Map([
  ["Curated Historical Portraits by CaptainSkolot/Armored Soldier", {
    roles: ["captain", "warrior"],
    regions: ["global", "europe", "northern-europe", "mediterranean"]
  }],
  ["Curated Historical Portraits by CaptainSkolot/Bald Monk", {
    roles: ["factor", "civilian", "clergy"],
    regions: ["east-asia"]
  }],
  ["Women Black Hair Portrait by Captainskolot/Women Black Hair Portrait", {
    roles: ["factor", "civilian", "noble"],
    regions: ["east-asia"]
  }]
]);

function portraitMetadata(label, sourceDirectory) {
  const override = portraitMetadataOverrides.get(`${sourceDirectory}/${label}`);
  if (override) return override;
  const text = `${label} ${sourceDirectory}`.toLowerCase();
  if (text.includes("pirate")) {
    return { roles: ["captain", "pirate"], regions: ["global"] };
  }
  if (text.includes("native american") || text.includes("native americain")) {
    return { roles: ["captain", "factor", "civilian"], regions: ["americas"] };
  }
  if (text.includes("viking")) {
    return { roles: ["captain", "warrior", "factor"], regions: ["northern-europe"] };
  }
  if (text.includes("southeast asian")) {
    return { roles: ["captain", "factor", "civilian", "artisan"], regions: ["southeast-asia"] };
  }
  if (text.includes("south asian")) {
    return { roles: ["captain", "factor", "civilian", "artisan"], regions: ["south-asia"] };
  }
  if (text.includes("indian ocean")) {
    return { roles: ["captain", "factor", "civilian", "artisan"], regions: ["indian-ocean"] };
  }
  if (text.includes("sub-saharan african")) {
    return { roles: ["captain", "factor", "civilian", "artisan"], regions: ["africa"] };
  }
  if (text.includes("polynesian")) {
    return { roles: ["captain", "factor", "civilian", "artisan"], regions: ["polynesia"] };
  }
  if (text.includes("ming chinese")) {
    return { roles: ["captain", "factor", "civilian", "artisan"], regions: ["east-asia"] };
  }
  if (text.includes("little girl") || text.includes("young girl") || text.includes("young peasant boy")) {
    return { roles: ["civilian"], regions: ["global", "europe"] };
  }

  const roles = ["factor"];
  if (text.includes("knight") || text.includes("warrior")) roles.push("captain", "warrior");
  if (text.includes("blacksmith") || text.includes("chef") || text.includes("lumberjack") || text.includes("baker") || text.includes("seamstress")) {
    roles.push("artisan");
  }
  if (text.includes("noble")) roles.push("noble");
  if (text.includes("monk")) roles.push("clergy");
  if (roles.length === 1) roles.push("civilian");
  return {
    roles,
    regions: ["global", "europe", "northern-europe", "mediterranean"]
  };
}

function uniqueExpressionId(used, id) {
  let next = id;
  let suffix = 2;
  while (used.has(next)) {
    next = `${id}-${suffix}`;
    suffix += 1;
  }
  return next;
}

function withUniqueIds(characters) {
  const used = new Map();
  return characters.map((character) => {
    const baseSlug = slugify(`${character.sourceDirectory}-${character.label}`);
    const count = used.get(baseSlug) || 0;
    used.set(baseSlug, count + 1);
    return {
      id: count === 0 ? baseSlug : `${baseSlug}-${count + 1}`,
      ...character
    };
  });
}

function lastPathSegment(path) {
  const parts = path.split("/").filter(Boolean);
  return parts.at(-1) || "Portrait";
}

function topPathSegment(path) {
  const parts = path.split("/").filter(Boolean);
  return parts[0] || "";
}

function titleCase(value) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "portrait";
}

function main() {
  if (!statSync(characterRoot).isDirectory()) {
    throw new Error(`Missing character asset root: ${characterRoot}`);
  }
  const sourceCharacters = withUniqueIds(groupPortraitFiles(walkPngFiles(characterRoot)));
  if (sourceCharacters.length === 0) throw new Error(`No ${portraitSize}x${portraitSize} portrait expressions found in ${characterRoot}`);
  const expressionCount = sourceCharacters.reduce((total, character) => total + character.expressions.length, 0);
  const manifest = {
    version: 5,
    generatedBy: "tools/build-character-portrait-manifest.mjs",
    portraitSize,
    sourceRoot: "assets/characters",
    sourceCharacters
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
  console.log(`${sourceCharacters.length} authored characters, ${expressionCount} expression frames`);
}

main();
