import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  classifyPortraitRoles,
  encodePortraitRoleMap
} from "../src/characterPortraits.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const characterRoot = join(appRoot, "public/assets/characters");
const outputPath = join(characterRoot, "generated/character-portraits.json");
const portraitSize = 64;
const individualSequencePacks = new Set([
  "Master Chef Portrait Pack by Captainskolot",
  "Native Americain Portrait Pack by Captainskeleto",
  "Pirates Portrait Pack by Captainskeleto",
  "Viking Men Portrait Pack by Captainskeleto",
  "Women Portrait Pack by Captainskeleto",
  "Women Pirates Portrait Pack by Captainskeleto"
]);
const numericGridPacks = new Map();

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
  labels("Ultimate Portrait Pack V1.0/Blacksmith/Blacksmith Portrait", [
    ["neutral", "Neutral"],
    ["stern", "Stern"],
    ["hurt", "Hurt"],
    ["afraid", "Afraid"],
    ["happy", "Happy"],
    ["determined", "Determined"]
  ]),
  labels("Blond Villager Portrait Pack by Captainskeleto/Blond Villager Portrait", commonTwelveLabels()),
  labels("Blond Villager Women Portrait Pack by Captainskeleto/Blond Villager Women", commonTwelveLabels()),
  labels("Ultimate Portrait Pack V1.0/Herbalist women portrait/Herbalist Women Portrait", [
    ["neutral", "Neutral"],
    ["stern", "Stern"],
    ["soft-smile", "Soft Smile"],
    ["knowing", "Knowing"],
    ["afraid", "Afraid"],
    ["happy", "Happy"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Knight Commander/Knight Commander", [
    ["neutral", "Neutral"],
    ["angry", "Angry"],
    ["stern", "Stern"],
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
    ["neutral", "Neutral"],
    ["happy", "Happy"],
    ["concerned", "Concerned"],
    ["afraid", "Afraid"],
    ["attentive", "Attentive"],
    ["sad", "Sad"],
    ["wary", "Wary"],
    ["angry", "Angry"],
    ["embarrassed", "Embarrassed"],
    ["serious", "Serious"],
    ["pleased", "Pleased"],
    ["laughing", "Laughing"]
  ]),
  labels("Lumberjack Portrait by Captainskeleto/Lumberjack Portrait", [
    ["neutral", "Neutral"],
    ["serious", "Serious"],
    ["stern", "Stern"],
    ["afraid", "Afraid"],
    ["concerned", "Concerned"],
    ["angry", "Angry"],
    ["sad", "Sad"],
    ["wary", "Wary"],
    ["pleased", "Pleased"],
    ["disgusted", "Disgusted"],
    ["happy", "Happy"],
    ["laughing", "Laughing"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Man Knight/Man Knight Portrait", [
    ["neutral", "Neutral"],
    ["angry", "Angry"],
    ["happy", "Happy"],
    ["serious", "Serious"],
    ["shy", "Shy"],
    ["afraid", "Afraid"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Monk/Monk Portrait", [
    ["neutral", "Neutral"],
    ["skeptical", "Skeptical"],
    ["worried", "Worried"],
    ["praying", "Praying"],
    ["afraid", "Afraid"],
    ["angry", "Angry"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Noblewomen/Noblewomen Portrait", [
    ["neutral", "Neutral"],
    ["wary", "Wary"],
    ["happy", "Happy"],
    ["soft-smile", "Soft Smile"],
    ["afraid", "Afraid"],
    ["sad", "Sad"]
  ]),
  labels("Old Villager Portrait by Captainskeleto/Old Villager Portrait", [
    ["neutral", "Neutral"],
    ["concerned", "Concerned"],
    ["stern", "Stern"],
    ["weary", "Weary"],
    ["attentive", "Attentive"],
    ["sad", "Sad"],
    ["skeptical", "Skeptical"],
    ["wary", "Wary"],
    ["pleased", "Pleased"],
    ["angry", "Angry"],
    ["thoughtful", "Thoughtful"],
    ["afraid", "Afraid"]
  ]),
  labels("Old Warrior Grey Beard by Captainskolot/Old Warrior Grey Beard", [
    ["neutral", "Neutral"],
    ["worried", "Worried"],
    ["stern", "Stern"],
    ["afraid", "Afraid"],
    ["sad", "Sad"],
    ["angry", "Angry"],
    ["shouting", "Shouting"],
    ["wary", "Wary"],
    ["concerned", "Concerned"],
    ["determined", "Determined"],
    ["disgusted", "Disgusted"],
    ["pained", "Pained"]
  ]),
  labels("Peasant Portrait Pack by Captainskeleto/Peasant Portrait", [
    ["neutral", "Neutral"],
    ["happy", "Happy"],
    ["soft-smile", "Soft Smile"],
    ["serious", "Serious"],
    ["attentive", "Attentive"],
    ["concerned", "Concerned"],
    ["sad", "Sad"],
    ["wary", "Wary"],
    ["skeptical", "Skeptical"],
    ["angry", "Angry"],
    ["afraid", "Afraid"],
    ["pleased", "Pleased"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Tavern Keeper/Tavern Keeper Portrait", [
    ["neutral", "Neutral"],
    ["happy", "Happy"],
    ["angry", "Angry"],
    ["stern", "Stern"],
    ["laughing", "Laughing"],
    ["sad", "Sad"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Village Elder/Villager Elder Portrait", [
    ["neutral", "Neutral"],
    ["afraid", "Afraid"],
    ["happy", "Happy"],
    ["thoughtful", "Thoughtful"],
    ["sad", "Sad"],
    ["stern", "Stern"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Young Peasant Girl/Villager Young Girl Portrait", [
    ["neutral", "Neutral"],
    ["soft-smile", "Soft Smile"],
    ["happy", "Happy"],
    ["afraid", "Afraid"],
    ["laughing", "Laughing"],
    ["sad", "Sad"]
  ]),
  labels("Ultimate Portrait Pack V1.0/Women Baker/Women Baker Portrait", [
    ["neutral", "Neutral"],
    ["concerned", "Concerned"],
    ["happy", "Happy"],
    ["afraid", "Afraid"],
    ["soft-smile", "Soft Smile"],
    ["wary", "Wary"]
  ]),
  labels("Women Knight Portrait Pack by Captainskeleto/Women Knight Portrait", [
    ["neutral", "Neutral"],
    ["sad", "Sad"],
    ["serious", "Serious"],
    ["worried", "Worried"],
    ["angry", "Angry"],
    ["stern", "Stern"],
    ["wary", "Wary"],
    ["afraid", "Afraid"],
    ["attentive", "Attentive"],
    ["concerned", "Concerned"],
    ["pained", "Pained"],
    ["grimace", "Grimace"]
  ]),
  labels("Women Peasant Pack by Captainskeleto/Women Peasant", [
    ["neutral", "Neutral"],
    ["happy", "Happy"],
    ["concerned", "Concerned"],
    ["afraid", "Afraid"],
    ["attentive", "Attentive"],
    ["pleased", "Pleased"],
    ["sad", "Sad"],
    ["wary", "Wary"],
    ["skeptical", "Skeptical"],
    ["laughing", "Laughing"],
    ["angry", "Angry"],
    ["serious", "Serious"]
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
    ["neutral", "Neutral"],
    ["concerned", "Concerned"],
    ["happy", "Happy"],
    ["soft-smile", "Soft Smile"],
    ["afraid", "Afraid"],
    ["sad", "Sad"]
  ])
]);

const skinTones = Object.freeze([
  tone("porcelain", "Porcelain", ["#4a2d2d", "#92584d", "#d99078", "#ffd6b5"]),
  tone("fair", "Fair", ["#452923", "#8b4e3d", "#d18462", "#f5bd91"]),
  tone("golden", "Golden", ["#42281f", "#86513a", "#c47d54", "#eab078"]),
  tone("olive", "Olive", ["#33271f", "#6d5137", "#a98055", "#d1b080"]),
  tone("tan", "Tan", ["#2b201b", "#624231", "#9b6748", "#c99168"]),
  tone("brown", "Brown", ["#211817", "#4b3028", "#79503c", "#a87957"]),
  tone("deep-brown", "Deep Brown", ["#171315", "#352326", "#593a34", "#805747"]),
  tone("ebony", "Ebony", ["#101013", "#282026", "#453037", "#6a4846"])
]);

const hairTones = Object.freeze([
  tone("black", "Black", ["#111216", "#292b30", "#4b4d52"]),
  tone("dark-brown", "Dark Brown", ["#1b1412", "#442b22", "#72503a"]),
  tone("chestnut", "Chestnut", ["#241511", "#603324", "#9a5c3b"]),
  tone("auburn", "Auburn", ["#281412", "#713128", "#b25f43"]),
  tone("copper", "Copper", ["#321810", "#85401f", "#cd7a3d"]),
  tone("golden-blond", "Golden Blond", ["#403019", "#92703a", "#d8b96a"]),
  tone("ash-blond", "Ash Blond", ["#37332c", "#777064", "#b8ad93"]),
  tone("silver", "Silver", ["#292a2d", "#707278", "#c1c3c5"])
]);

const eyeTones = Object.freeze([
  tone("dark-brown", "Dark Brown", ["#151214", "#30211d", "#5a4030"]),
  tone("brown", "Brown", ["#1d1716", "#493229", "#795744"]),
  tone("hazel", "Hazel", ["#202019", "#4f5433", "#8a8a4d"]),
  tone("green", "Green", ["#16201c", "#315b45", "#6e9a70"]),
  tone("gray", "Gray", ["#1d2228", "#465764", "#8799a1"]),
  tone("blue", "Blue", ["#172334", "#2f5777", "#6594b0"])
]);

const portraitAgeRanges = new Map([
  ["Blacksmith Portrait Pack by Captainskeleto/Blacksmith Portrait", ageRange(32, 48)],
  ["Ultimate Portrait Pack V1.0/Blacksmith/Blacksmith Portrait", ageRange(50, 70)],
  ["Blond Villager Portrait Pack by Captainskeleto/Blond Villager Portrait", ageRange(28, 42)],
  ["Blond Villager Women Portrait Pack by Captainskeleto/Blond Villager Women", ageRange(20, 34)],
  ["Ultimate Portrait Pack V1.0/Herbalist women portrait/Herbalist Women Portrait", ageRange(35, 52)],
  ["Ultimate Portrait Pack V1.0/Knight Commander/Knight Commander", ageRange(52, 68)],
  ["Knight Portrait Pack by Captainskeleto/Knight Portrait", ageRange(18, 30)],
  ["Little Girl Portrait pack by Captainskeleto/Little Girl Portrait", ageRange(8, 13)],
  ["Lumberjack Portrait by Captainskeleto/Lumberjack Portrait", ageRange(35, 52)],
  ["Ultimate Portrait Pack V1.0/Man Knight/Man Knight Portrait", ageRange(18, 30)],
  ["Ultimate Portrait Pack V1.0/Monk/Monk Portrait", ageRange(35, 55)],
  ["Ultimate Portrait Pack V1.0/Noblewomen/Noblewomen Portrait", ageRange(22, 38)],
  ["Old Villager Portrait by Captainskeleto/Old Villager Portrait", ageRange(58, 78)],
  ["Old Warrior Grey Beard by Captainskolot/Old Warrior Grey Beard", ageRange(58, 75)],
  ["Peasant Portrait Pack by Captainskeleto/Peasant Portrait", ageRange(18, 32)],
  ["Ultimate Portrait Pack V1.0/Tavern Keeper/Tavern Keeper Portrait", ageRange(35, 52)],
  ["Ultimate Portrait Pack V1.0/Village Elder/Villager Elder Portrait", ageRange(60, 80)],
  ["Ultimate Portrait Pack V1.0/Young Peasant Girl/Villager Young Girl Portrait", ageRange(15, 21)],
  ["Ultimate Portrait Pack V1.0/Women Baker/Women Baker Portrait", ageRange(28, 44)],
  ["Women Knight Portrait Pack by Captainskeleto/Women Knight Portrait", ageRange(18, 30)],
  ["Women Peasant Pack by Captainskeleto/Women Peasant", ageRange(18, 32)],
  ["Ultimate Portrait Pack V1.0/Seamstress Women Portrait/Women Seamstress Portrait", ageRange(25, 42)],
  ["Ultimate Portrait Pack V1.0/Young Peasant Boy/Young Peasant Boy Portrait", ageRange(14, 20)]
]);

const numberedPortraitAgeRanges = new Map([
  ["Master Chef Portrait Pack by Captainskolot", numberedRanges({
    1: [35, 50], 2: [25, 40], 3: [50, 68], 4: [30, 44], 5: [30, 45], 6: [50, 68],
    7: [32, 48], 8: [28, 42], 9: [30, 45], 10: [50, 65], 11: [18, 28], 12: [30, 45]
  })],
  ["Native Americain Portrait Pack by Captainskeleto", numberedRanges({
    1: [22, 36], 2: [20, 34], 3: [20, 34], 4: [20, 34], 5: [40, 58], 6: [30, 45],
    7: [25, 42], 8: [35, 52], 9: [20, 35], 10: [55, 75], 11: [18, 30], 12: [30, 45],
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

const outfitPalettes = Object.freeze([
  outfit("harbour-ochre", "Harbour Ochre", ["#1e2a33", "#3c5964", "#7e9aa1"], ["#7a4b20", "#bf7e36", "#e3b85f"]),
  outfit("atlantic-wool", "Atlantic Wool", ["#252936", "#4d5368", "#8993a7"], ["#6a2f2b", "#a95545", "#d98a68"]),
  outfit("linen-and-tar", "Linen and Tar", ["#2b2520", "#6b5640", "#bba678"], ["#22384a", "#476f89", "#89aebc"]),
  outfit("spice-red", "Spice Red", ["#3b2026", "#822f3b", "#c35e54"], ["#8b611e", "#c09232", "#e0c15e"]),
  outfit("bay-green", "Bay Green", ["#1f3a32", "#3f755f", "#78a98b"], ["#845d24", "#b98d39", "#d7bf68"]),
  outfit("storm-indigo", "Storm Indigo", ["#222542", "#454b7a", "#7980ad"], ["#6c4b72", "#9d6fa4", "#c7a0c1"]),
  outfit("sun-bleached", "Sun Bleached", ["#776342", "#b69b62", "#decf91"], ["#3b6573", "#6a9aa3", "#aad0c7"]),
  outfit("copper-sash", "Copper Sash", ["#2b3342", "#556277", "#8b9aa8"], ["#8a3f25", "#c26b38", "#e5a159"]),
  outfit("pearl-grey", "Pearl Grey", ["#44413d", "#817b70", "#b9b2a0"], ["#2d5360", "#5c8790", "#94bdba"]),
  outfit("dusk-purple", "Dusk Purple", ["#32233c", "#624778", "#9777a6"], ["#72512a", "#b6813f", "#deb760"]),
  outfit("olive-canvas", "Olive Canvas", ["#3d4328", "#727a42", "#aeb36d"], ["#81462e", "#ba7443", "#e0a35d"]),
  outfit("white-sail", "White Sail", ["#6e6658", "#b0a78f", "#ded6bd"], ["#2e4a63", "#557b9b", "#90b4c2"]),
  outfit("mulberry-coat", "Mulberry Coat", ["#3d2131", "#7b3e58", "#bb6e80"], ["#8d6726", "#c1953d", "#e4c763"]),
  outfit("teal-brocade", "Teal Brocade", ["#173943", "#347481", "#72aab0"], ["#87512e", "#c07d41", "#dfa75e"]),
  outfit("wine-and-cream", "Wine and Cream", ["#572632", "#994550", "#cf7b73"], ["#877044", "#bda66c", "#e3d49c"]),
  outfit("night-watch", "Night Watch", ["#1b2433", "#344e67", "#6888a0"], ["#73592e", "#ad8945", "#d8bc67"]),
  outfit("saffron-port", "Saffron Port", ["#6a4521", "#aa7932", "#d9ad4f"], ["#364e63", "#667f96", "#a4bac1"]),
  outfit("reef-blue", "Reef Blue", ["#1a4658", "#367f9b", "#75b5c5"], ["#7e5e2a", "#b99543", "#dec766"]),
  outfit("mahogany-gold", "Mahogany Gold", ["#4b2c22", "#8d5b39", "#c89155"], ["#8c6c22", "#c59b34", "#e2c961"]),
  outfit("pilgrim-black", "Pilgrim Black", ["#1b1c21", "#373b45", "#747985"], ["#7a602c", "#b68f3f", "#dcc169"]),
  outfit("moss-and-rust", "Moss and Rust", ["#2f482e", "#617c48", "#9dad70"], ["#8e3f26", "#c46a38", "#e39e58"]),
  outfit("royal-navy", "Royal Navy", ["#202d4c", "#415b90", "#748fc0"], ["#8b6425", "#bd9340", "#e1c367"]),
  outfit("rose-market", "Rose Market", ["#5a2c36", "#a35462", "#d9878b"], ["#576c35", "#899951", "#bec879"]),
  outfit("smoke-blue", "Smoke Blue", ["#38485a", "#6a7e92", "#a4b5c0"], ["#81602d", "#b88d43", "#dbc067"]),
  outfit("coral-trader", "Coral Trader", ["#7b332f", "#bc5d52", "#e28f75"], ["#2d5961", "#5b8b91", "#99beb8"]),
  outfit("cedar-green", "Cedar Green", ["#253f35", "#52725d", "#86a484"], ["#8d5429", "#c27f3d", "#e2ad5e"]),
  outfit("violet-harbour", "Violet Harbour", ["#3b2f55", "#6b5d91", "#9d8cbc"], ["#775e28", "#b0903f", "#dac369"]),
  outfit("terra-sail", "Terra Sail", ["#6c3d2b", "#a96c47", "#d69e66"], ["#31556c", "#62839b", "#9fb9c1"]),
  outfit("jade-thread", "Jade Thread", ["#23483e", "#4c826e", "#86b59a"], ["#95672a", "#c79a3e", "#e5c864"]),
  outfit("ash-and-amber", "Ash and Amber", ["#49423d", "#817264", "#b7a68d"], ["#925328", "#c5833d", "#e4b05e"]),
  outfit("crimson-bay", "Crimson Bay", ["#4d1f27", "#91343e", "#d0625c"], ["#7d642b", "#b99743", "#dec566"]),
  outfit("deep-water", "Deep Water", ["#173247", "#315f80", "#6695ad"], ["#7f5a2b", "#b98a42", "#dcc068"])
]);

function tone(id, label, ramp) {
  return { id, label, ramp };
}

function ageRange(minAge, maxAge) {
  return Object.freeze({ minAge, maxAge });
}

function numberedRanges(values) {
  return new Map(Object.entries(values).map(([number, range]) => [Number(number), ageRange(...range)]));
}

function outfit(id, label, clothRamp, accentRamp) {
  return { id, label, clothRamp, accentRamp };
}

function labels(key, values) {
  return [key, values.map(([id, label]) => expressionDescriptor(id, label))];
}

function expressionDescriptor(id, label) {
  return { id, label };
}

function commonTwelveLabels() {
  return [
    ["neutral", "Neutral"],
    ["happy", "Happy"],
    ["concerned", "Concerned"],
    ["afraid", "Afraid"],
    ["attentive", "Attentive"],
    ["stern", "Stern"],
    ["pleased", "Pleased"],
    ["surprised", "Surprised"],
    ["skeptical", "Skeptical"],
    ["sad", "Sad"],
    ["shouting", "Shouting"],
    ["angry", "Angry"]
  ];
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
      src: `/assets/characters/${relPath.split("/").map(encodeURIComponent).join("/")}`
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
    roles: metadata.roles,
    regions: metadata.regions,
    minAge: ages.minAge,
    maxAge: ages.maxAge,
    expressionCount: expressions.length,
    expressions
  };
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

function portraitMetadata(label, sourceDirectory) {
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

async function bakeExpressionRoleMaps(sourceCharacters) {
  const sourcePrefix = "/assets/characters/";
  for (const character of sourceCharacters) {
    for (const expression of character.expressions) {
      if (!expression.src.startsWith(sourcePrefix)) {
        throw new Error(`Cannot resolve portrait source: ${expression.src}`);
      }
      const relPath = decodeURIComponent(expression.src.slice(sourcePrefix.length));
      const image = await loadImage(join(characterRoot, relPath));
      const canvas = createCanvas(expression.width, expression.height);
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, expression.width, expression.height);
      expression.roleMap = encodePortraitRoleMap(
        classifyPortraitRoles(pixels.data, expression.width, expression.height)
      );
    }
  }
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

async function main() {
  if (!statSync(characterRoot).isDirectory()) {
    throw new Error(`Missing character asset root: ${characterRoot}`);
  }
  const sourceCharacters = withUniqueIds(groupPortraitFiles(walkPngFiles(characterRoot)));
  if (sourceCharacters.length === 0) throw new Error(`No ${portraitSize}x${portraitSize} portrait expressions found in ${characterRoot}`);
  await bakeExpressionRoleMaps(sourceCharacters);
  const expressionCount = sourceCharacters.reduce((total, character) => total + character.expressions.length, 0);
  const manifest = {
    version: 3,
    generatedBy: "tools/build-character-portrait-manifest.mjs",
    portraitSize,
    sourceRoot: "/assets/characters",
    sourceCharacters,
    skinTones,
    hairTones,
    eyeTones,
    outfitPalettes
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
  console.log(
    `${sourceCharacters.length} source characters, ${expressionCount} expression frames, ` +
    `${skinTones.length} skin tones, ${hairTones.length} hair tones, ${eyeTones.length} eye tones, ` +
    `${outfitPalettes.length} outfit palettes`
  );
  console.log(
    `${sourceCharacters.length * skinTones.length * hairTones.length * eyeTones.length * outfitPalettes.length} ` +
    "deterministic palette-swapped character variants available"
  );
}

await main();
