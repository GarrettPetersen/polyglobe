import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const characterRoot = join(appRoot, "public/assets/characters");
const outputPath = join(characterRoot, "generated/character-portraits.json");
const portraitSize = 64;
const individualSequencePacks = new Set([
  "Master Chef Portrait Pack by Captainskolot",
  "Native Americain Portrait Pack by Captainskeleto",
  "Pirates Portrait Pack by Captainskeleto",
  "Viking Men Portrait Pack by Captainskeleto",
  "Women Pirates Portrait Pack by Captainskeleto"
]);
const numericGridPacks = new Map([
  [
    "Women Portrait Pack by Captainskeleto/Women Portrait",
    { characterDigit: 1, expressionDigit: 0 }
  ]
]);

const paletteVariants = Object.freeze([
  portraitPalette("harbour-ochre", "Harbour Ochre", ["#5a2f26", "#a15d45", "#d69b72", "#f0d0aa"], ["#241716", "#58372b", "#966345"], ["#1e2a33", "#3c5964", "#7e9aa1"], ["#7a4b20", "#bf7e36", "#e3b85f"]),
  portraitPalette("atlantic-wool", "Atlantic Wool", ["#4a2924", "#905740", "#c8885d", "#e5b98c"], ["#171a1a", "#3b332d", "#735945"], ["#252936", "#4d5368", "#8993a7"], ["#6a2f2b", "#a95545", "#d98a68"]),
  portraitPalette("linen-and-tar", "Linen and Tar", ["#65382b", "#a9684a", "#d59b6d", "#efd0a2"], ["#1b1514", "#46312a", "#7a553d"], ["#2b2520", "#6b5640", "#bba678"], ["#22384a", "#476f89", "#89aebc"]),
  portraitPalette("spice-red", "Spice Red", ["#633127", "#a45d42", "#d69263", "#efc597"], ["#1d1610", "#4c3120", "#87562c"], ["#3b2026", "#822f3b", "#c35e54"], ["#8b611e", "#c09232", "#e0c15e"]),
  portraitPalette("bay-green", "Bay Green", ["#583124", "#96593b", "#c9865b", "#e5b88d"], ["#151914", "#313d27", "#596e38"], ["#1f3a32", "#3f755f", "#78a98b"], ["#845d24", "#b98d39", "#d7bf68"]),
  portraitPalette("storm-indigo", "Storm Indigo", ["#4c2b2b", "#8a5045", "#c38368", "#dfaf8f"], ["#181823", "#303045", "#595a70"], ["#222542", "#454b7a", "#7980ad"], ["#6c4b72", "#9d6fa4", "#c7a0c1"]),
  portraitPalette("sun-bleached", "Sun Bleached", ["#6b3a2a", "#b16c47", "#d99a62", "#efc38f"], ["#44301d", "#80602f", "#b28b45"], ["#776342", "#b69b62", "#decf91"], ["#3b6573", "#6a9aa3", "#aad0c7"]),
  portraitPalette("copper-sash", "Copper Sash", ["#5e322a", "#9f5d42", "#d18c5f", "#edbe90"], ["#211610", "#55311c", "#97572a"], ["#2b3342", "#556277", "#8b9aa8"], ["#8a3f25", "#c26b38", "#e5a159"]),
  portraitPalette("pearl-grey", "Pearl Grey", ["#4e2b2b", "#875345", "#be8064", "#e0ae8d"], ["#212022", "#4d4b4b", "#807a72"], ["#44413d", "#817b70", "#b9b2a0"], ["#2d5360", "#5c8790", "#94bdba"]),
  portraitPalette("dusk-purple", "Dusk Purple", ["#54302e", "#945349", "#cb8068", "#e6ad8e"], ["#17131d", "#3a294b", "#6c4d78"], ["#32233c", "#624778", "#9777a6"], ["#72512a", "#b6813f", "#deb760"]),
  portraitPalette("olive-canvas", "Olive Canvas", ["#613528", "#a15d43", "#d08a5e", "#e9b98f"], ["#1d1c13", "#45401f", "#766d34"], ["#3d4328", "#727a42", "#aeb36d"], ["#81462e", "#ba7443", "#e0a35d"]),
  portraitPalette("white-sail", "White Sail", ["#563029", "#945944", "#c98868", "#e4b494"], ["#201815", "#4f3728", "#846142"], ["#6e6658", "#b0a78f", "#ded6bd"], ["#2e4a63", "#557b9b", "#90b4c2"]),
  portraitPalette("mulberry-coat", "Mulberry Coat", ["#59302d", "#965349", "#cb7f67", "#e6ac8c"], ["#1e151a", "#4b2e36", "#805861"], ["#3d2131", "#7b3e58", "#bb6e80"], ["#8d6726", "#c1953d", "#e4c763"]),
  portraitPalette("teal-brocade", "Teal Brocade", ["#5d3428", "#a05f43", "#d18d61", "#e9ba90"], ["#151a19", "#31413d", "#5b7067"], ["#173943", "#347481", "#72aab0"], ["#87512e", "#c07d41", "#dfa75e"]),
  portraitPalette("wine-and-cream", "Wine and Cream", ["#633729", "#a76546", "#d89766", "#efc192"], ["#241512", "#5a3224", "#995a36"], ["#572632", "#994550", "#cf7b73"], ["#877044", "#bda66c", "#e3d49c"]),
  portraitPalette("night-watch", "Night Watch", ["#4b2a27", "#895044", "#c17c64", "#dfa98a"], ["#11161a", "#283844", "#536676"], ["#1b2433", "#344e67", "#6888a0"], ["#73592e", "#ad8945", "#d8bc67"]),
  portraitPalette("saffron-port", "Saffron Port", ["#67392a", "#aa6645", "#d99561", "#f0c18d"], ["#2f2117", "#6b4524", "#a87332"], ["#6a4521", "#aa7932", "#d9ad4f"], ["#364e63", "#667f96", "#a4bac1"]),
  portraitPalette("reef-blue", "Reef Blue", ["#5a3128", "#9b5942", "#cc865e", "#e7b589"], ["#151719", "#2e3a3e", "#5d6c69"], ["#1a4658", "#367f9b", "#75b5c5"], ["#7e5e2a", "#b99543", "#dec766"]),
  portraitPalette("mahogany-gold", "Mahogany Gold", ["#603328", "#a05d43", "#d28b60", "#edbc8f"], ["#21140e", "#5a2d1a", "#924d25"], ["#4b2c22", "#8d5b39", "#c89155"], ["#8c6c22", "#c59b34", "#e2c961"]),
  portraitPalette("pilgrim-black", "Pilgrim Black", ["#54302a", "#935843", "#c98764", "#e5b591"], ["#151516", "#363437", "#66616a"], ["#1b1c21", "#373b45", "#747985"], ["#7a602c", "#b68f3f", "#dcc169"]),
  portraitPalette("moss-and-rust", "Moss and Rust", ["#613427", "#a25e42", "#d08b60", "#e9ba8f"], ["#1e1b13", "#443b21", "#766637"], ["#2f482e", "#617c48", "#9dad70"], ["#8e3f26", "#c46a38", "#e39e58"]),
  portraitPalette("royal-navy", "Royal Navy", ["#583126", "#965941", "#ca8860", "#e6b78c"], ["#17191d", "#30384b", "#5b667b"], ["#202d4c", "#415b90", "#748fc0"], ["#8b6425", "#bd9340", "#e1c367"]),
  portraitPalette("rose-market", "Rose Market", ["#5d3329", "#9d5e45", "#cf8d64", "#e9ba91"], ["#201515", "#51312d", "#87584c"], ["#5a2c36", "#a35462", "#d9878b"], ["#576c35", "#899951", "#bec879"]),
  portraitPalette("smoke-blue", "Smoke Blue", ["#52302c", "#8f5848", "#c78568", "#e2b293"], ["#1b1e21", "#41474d", "#70777c"], ["#38485a", "#6a7e92", "#a4b5c0"], ["#81602d", "#b88d43", "#dbc067"]),
  portraitPalette("coral-trader", "Coral Trader", ["#66382b", "#aa6747", "#d99866", "#efc292"], ["#2a1a17", "#65372b", "#9e6040"], ["#7b332f", "#bc5d52", "#e28f75"], ["#2d5961", "#5b8b91", "#99beb8"]),
  portraitPalette("cedar-green", "Cedar Green", ["#5d3429", "#9b5e45", "#cb8a65", "#e7b893"], ["#1a1812", "#3c331e", "#6d5730"], ["#253f35", "#52725d", "#86a484"], ["#8d5429", "#c27f3d", "#e2ad5e"]),
  portraitPalette("violet-harbour", "Violet Harbour", ["#56302c", "#935549", "#c87f68", "#e4ad8d"], ["#19151d", "#3f314a", "#725d7e"], ["#3b2f55", "#6b5d91", "#9d8cbc"], ["#775e28", "#b0903f", "#dac369"]),
  portraitPalette("terra-sail", "Terra Sail", ["#67372a", "#aa6245", "#d58f62", "#efbd8f"], ["#271813", "#5e321f", "#9a5930"], ["#6c3d2b", "#a96c47", "#d69e66"], ["#31556c", "#62839b", "#9fb9c1"]),
  portraitPalette("jade-thread", "Jade Thread", ["#5e3428", "#9f5e43", "#d08d62", "#eaba91"], ["#181814", "#383a24", "#666c3d"], ["#23483e", "#4c826e", "#86b59a"], ["#95672a", "#c79a3e", "#e5c864"]),
  portraitPalette("ash-and-amber", "Ash and Amber", ["#57302b", "#955848", "#ca8467", "#e6b28f"], ["#1d1b1a", "#48423c", "#7b6f5e"], ["#49423d", "#817264", "#b7a68d"], ["#925328", "#c5833d", "#e4b05e"]),
  portraitPalette("crimson-bay", "Crimson Bay", ["#613429", "#a05d44", "#d18b62", "#eaba91"], ["#201414", "#503028", "#895341"], ["#4d1f27", "#91343e", "#d0625c"], ["#7d642b", "#b99743", "#dec566"]),
  portraitPalette("deep-water", "Deep Water", ["#54302a", "#915744", "#c68265", "#e2b08e"], ["#12191d", "#263f4b", "#4c6b79"], ["#173247", "#315f80", "#6695ad"], ["#7f5a2b", "#b98a42", "#dcc068"])
]);

function portraitPalette(id, label, skinRamp, hairRamp, clothRamp, accentRamp) {
  return { id, label, skinRamp, hairRamp, clothRamp, accentRamp };
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
  const expressions = sorted.map((expression, position) => {
    const id = position === 0 ? "neutral" : uniqueExpressionId(usedExpressionIds, `expression-${String(position + 1).padStart(2, "0")}`);
    usedExpressionIds.add(id);
    return {
      id,
      label: position === 0 ? "Neutral" : `Expression ${position + 1}`,
      index: expression.expressionIndex,
      src: expression.src,
      width: portraitSize,
      height: portraitSize
    };
  });
  return {
    label: group.labelSeed,
    groupingMode: group.groupingMode,
    sourceDirectory: group.relDir,
    expressionCount: expressions.length,
    expressions
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
    version: 1,
    generatedBy: "tools/build-character-portrait-manifest.mjs",
    portraitSize,
    sourceRoot: "/assets/characters",
    sourceCharacters,
    paletteVariants
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
  console.log(`${sourceCharacters.length} source characters, ${expressionCount} expression frames, ${paletteVariants.length} palette variants`);
  console.log(`${sourceCharacters.length * paletteVariants.length} deterministic palette-swapped character variants available`);
}

main();
