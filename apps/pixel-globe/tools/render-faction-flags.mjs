import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { FACTIONS, factionHasFlag } from "../src/factions.js";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = join(appRoot, "public/assets/factions/flags");
const docsRoot = join(appRoot, "docs");
const FLAG_W = 32;
const FLAG_H = 20;
const CONTACT_SCALE = 5;
const CONTACT_COLS = 5;
const FLAG_FACTIONS = FACTIONS.filter((faction) => factionHasFlag(faction.id));

const C = Object.freeze({
  black: "2e222f",
  ink: "3e3546",
  gray: "625565",
  silver: "9babb2",
  white: "ffffff",
  cream: "c7dcd0",
  darkRed: "6e2727",
  red: "b33831",
  brightRed: "e83b3b",
  orange: "e6904e",
  gold: "f9c22b",
  paleGold: "fbb954",
  darkGreen: "165a4c",
  green: "239063",
  paleGreen: "91db69",
  teal: "0b8a8f",
  cyan: "30e1b9",
  darkBlue: "323353",
  blue: "4d65b4",
  lightBlue: "8fd3ff",
  purple: "6b3e75"
});

const RESEARCH = Object.freeze([
  research("pirate", "ui-symbol", "Black rogue pennant", "A generic black early-modern rogue pennant. It avoids the later standardized Jolly Roger iconography.", []),
  research("england", "period-banner", "Royal banner of England, 1406-1603", "The Tudor royal banner quarters the three lions of England with the three fleurs-de-lis of France.", [
    source("Royal standard of England (1406-1603)", "https://commons.wikimedia.org/wiki/File:Royal_standard_of_England_(1406%E2%80%931603).svg")
  ]),
  research("scotland", "period-banner", "Royal Banner of Scotland", "The red lion rampant within the double tressure on gold was the royal banner throughout the period.", [
    source("Royal Banner of Scotland", "https://en.wikipedia.org/wiki/Royal_Banner_of_Scotland")
  ]),
  research("france", "period-banner", "France moderne royal banner", "Blue with three gold fleurs-de-lis, the royal arms in use after Charles V.", [
    source("History of the French flag", "https://www.drapeaux-sfv.org/drapeaux-de-france/article/l-histoire-du-drapeau-francais")
  ]),
  research("spain", "period-banner", "Cross of Burgundy", "The ragged red Cross of Burgundy was introduced to Habsburg Spain in 1506 and is the clearest military and naval identifier for 1522.", [
    source("Cross of Burgundy", "https://en.wikipedia.org/wiki/Cross_of_Burgundy")
  ]),
  research("portugal", "period-heraldry", "Royal arms of John III", "A white royal banner carrying the Portuguese shield. The tiny raster simplifies the quinas and castle border.", [
    source("Historical flags of Portugal", "https://en.wikipedia.org/wiki/Flag_of_Portugal#History")
  ]),
  research("habsburg", "period-banner", "Imperial banner of Charles V", "The black double-headed imperial eagle on gold, with a small Habsburg breast shield.", [
    source("The Eagle of the Holy Roman Empire", "https://www.flagheritagefoundation.org/web/wp-content/uploads/2018/08/DoubleEagle-Final-PDF-150dpi.pdf")
  ]),
  research("hungary", "period-heraldry", "Arpad stripes", "The red and silver Arpad stripes were long-established Hungarian royal arms and are less speculative than a modern national flag.", [
    source("Historical flags of Europe", "https://commons.wikimedia.org/wiki/Historical_flags_of_Europe")
  ]),
  research("ottoman", "near-period-banner", "Three-crescent Ottoman naval standard", "A red field with three crescents, based on surviving descriptions and near-period Ottoman naval imagery. Ottoman standards varied; this is not presented as a single national flag.", [
    source("Battle of Lepanto, 1571", "https://commons.wikimedia.org/wiki/File:Battle_of_Lepanto_1571.jpg")
  ]),
  research("venice", "period-heraldry", "Lion of Saint Mark", "The winged lion of Saint Mark on red was the enduring Venetian state and naval emblem.", [
    source("Flag of the Republic of Venice", "https://commons.wikimedia.org/wiki/File:Flag_of_the_Republic_of_Venice.svg")
  ]),
  research("genoa", "period-banner", "Cross of Saint George", "The red Saint George cross on white is directly visible among Genoese naval standards in early-modern battle imagery.", [
    source("Battle of Lepanto, 1571", "https://commons.wikimedia.org/wiki/File:Battle_of_Lepanto_1571.jpg")
  ]),
  research("papal-states", "near-period-heraldry", "Crossed Keys of Saint Peter", "The crossed gold and silver keys are period papal heraldry; the dark red field is a game-facing banner reconstruction rather than the later yellow-white state flag.", [
    source("Papal States in the 16th century", "https://commons.wikimedia.org/wiki/Category:Papal_States_in_the_16th_century")
  ]),
  research("ming", "period-ceremonial-reconstruction", "Ming imperial dragon identifier", "Ming records separately enumerate dragon flags and yellow ceremonial standards. Combining them here creates a legible imperial identifier, not a documented exact flag or a national flag.", [
    source("History of Ming, Ceremonial Guards", "https://ctext.org/wiki.pl?chapter=429783&if=en&remap=gb")
  ]),
  research("inca", "documented-royal-standard", "Inca royal standard", "A rigid square royal standard with the rainbow and paired serpents, following colonial-era descriptions of Inca regalia rather than the modern rainbow flag.", [
    source("The Rainbow Flag of the Incas", "https://www.fiav.org/wp-content/uploads/2021/06/ICV23-15-Tracchia-TheRainbowFlagOfTheIncas.pdf")
  ]),
  research("safavid", "period-regional-emblem", "Lion and rising sun", "The lion-and-sun banner device is documented in Persian art by 1423. Its use here is a contemporary Persian dynastic equivalent, not the later 1576 Safavid flag.", [
    source("1423 lion-and-sun banner", "https://commons.wikimedia.org/wiki/File:Earliest_example_of_a_banner_bearing_the_lion_and_sun.png")
  ]),
  research("muscovy", "period-emblem", "Seal of Ivan III", "The double-headed eagle entered Muscovite state seals under Ivan III; the banner field is a reconstruction around that contemporary emblem.", [
    source("Russian treaty seals", "https://www.athensjournals.gr/history/2024-5981-AJHIS-ART-Ning-02.pdf")
  ]),
  research("poland-lithuania", "period-heraldry", "White Eagle and Pahonia", "A paired heraldic banner for the Jagiellonian union, combining the Polish White Eagle and Lithuanian mounted Pursuer.", [
    source("Golden Age of the Jagiellonians", "https://zlotaepoka.ossolineum.pl/en/")
  ]),
  research("denmark-norway", "period-banner", "Dannebrog", "The white Scandinavian cross on red was already the Danish royal banner in the early sixteenth century.", [
    source("Dannebrog history", "https://lex.dk/Dannebrog")
  ]),
  research("songhai", "reconstruction", "Askia cavalry standard reconstruction", "No reliable Songhai state flag or dynastic arms were found. This geometric Sahelian standard is intentionally marked as a reconstruction, using spear and river motifs rather than a fabricated modern flag.", [
    source("Songhai Empire overview", "https://openstax.org/books/world-history-volume-2/pages/3-2-the-songhai-empire")
  ]),
  research("morocco", "period-banner-tradition", "Alam al-mansur with Marinid octagram", "The Wattasids inherited Moroccan banner traditions: a white victorious standard and red unit banners. The gold octagram on red is the closest recognizable Marinid-Wattasid heraldic equivalent.", [
    source("Alam al-mansur", "https://en.wikipedia.org/wiki/%27alam_al-mans%C3%BBr"),
    source("Morocco historical flags", "https://www.crwflags.com/fotw/flags/ma_hist.html")
  ]),
  research("ethiopia", "reconstruction", "Solomonic cross and lion", "No rectangular Ethiopian national flag or exact graphic emblem is evidenced for 1522. This reconstruction uses Solomonic Christian kingship symbols while avoiding the nineteenth-century tricolor and imperial flag.", [
    source("Lion of Judah royal insignia", "https://en.wikipedia.org/wiki/Lion_of_Judah")
  ]),
  research("vijayanagara", "period-emblem", "Varaha, sun, moon, and dagger", "The royal insignia survives on Vijayanagara architecture and coins. The saffron field is a restrained banner reconstruction around those attested devices.", [
    source("Vijayanagar crest emblem", "https://govtmuseumchennai.org/museum-section/hindu-sculpture/vijayanagar-crest-emblem")
  ]),
  research("gujarat", "period-numismatic-emblem", "Muzaffar Shah II coin device", "No secure Gujarat state flag was found. The roundel and angular calligraphy are adapted from coins struck by Muzaffar Shah II in the exact period.", [
    source("Muzaffar Shah II coin", "https://www.khalilicollections.org/islamic-coin-print/?post_id=26992")
  ]),
  research("bengal", "near-period-banner", "Red lion on white", "The red lion banner appears in the Catalan Atlas and the lion remained a Bengali sultanic emblem; a 1521 account also describes guards carrying lion-painted shields.", [
    source("Bengal Sultanate flag evidence", "https://commons.wikimedia.org/wiki/File:Bengal_Sultanate_flag.svg")
  ]),
  research("delhi", "reconstruction", "Lodi black standard with coin roundel", "No secure Lodi banner was found. Black references the Abbasid standard tradition reported for Delhi, while the gold roundel is adapted from sultanic coin calligraphy.", [
    source("Delhi Sultanate flag traditions", "https://en.wikipedia.org/wiki/Delhi_Sultanate")
  ]),
  research("ayutthaya", "later-traditional-ensign", "Plain red Siamese ensign", "Ayutthaya had no documented national flag in 1522. Plain red is the earliest recorded Siamese ensign, but the evidence begins under Narai in the later seventeenth century.", [
    source("Thai Fine Arts Department flag history", "https://www.finearts.go.th/storage/contents/2024/01/file/01sb4xTcSwsVGZ2fRvQiH76sPzDyOyZmmCdFB2yG.pdf")
  ]),
  research("japan", "period-clan-heraldry", "Ashikaga futatsuhikiryo mon", "The two-bar roundel is the Ashikaga clan crest, used here as shogunal heraldry rather than a Japanese national flag.", [
    source("Ashikaga clan futatsuhikiryo", "https://www.paxhistoria.co/flags/6a77b848-9ef3-444f-b1be-7f3166b633e4")
  ]),
  research("joseon", "period-royal-standard", "Yellow Dragon Flag", "Joseon used a four-clawed dragon flag in royal processions. It represents the king's authority, not a modern Korean national flag.", [
    source("Korean dragon flag tradition", "https://smarthistory.org/korean-national-flag/"),
    source("Joseon Legendary Dragon Flag", "https://artsandculture.google.com/asset/legendary-dragon-flag/pAG5Om1riEle4g?hl=en")
  ])
]);

const RESEARCH_BY_ID = new Map(RESEARCH.map((entry) => [entry.id, entry]));
if (RESEARCH_BY_ID.size !== RESEARCH.length) throw new Error("Faction flag research contains duplicate ids");

class PixelSurface {
  constructor(width, height, background = null) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    if (background) this.rect(0, 0, width, height, background);
  }

  pixel(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const [r, g, b] = rgb(color);
    const offset = (x + y * this.width) * 4;
    this.data[offset] = r;
    this.data[offset + 1] = g;
    this.data[offset + 2] = b;
    this.data[offset + 3] = 255;
  }

  clear(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.data[(x + y * this.width) * 4 + 3] = 0;
  }

  rect(x, y, width, height, color) {
    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) this.pixel(px, py, color);
    }
  }

  line(x0, y0, x1, y1, color, thickness = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      const inset = Math.floor((thickness - 1) / 2);
      this.rect(x0 - inset, y0 - inset, thickness, thickness, color);
      if (x0 === x1 && y0 === y1) break;
      const twice = 2 * error;
      if (twice >= dy) {
        error += dy;
        x0 += sx;
      }
      if (twice <= dx) {
        error += dx;
        y0 += sy;
      }
    }
  }

  circle(cx, cy, radius, color) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radius * radius) this.pixel(cx + x, cy + y, color);
      }
    }
  }

  polygon(points, color) {
    const minX = Math.floor(Math.min(...points.map(([x]) => x)));
    const maxX = Math.ceil(Math.max(...points.map(([x]) => x)));
    const minY = Math.floor(Math.min(...points.map(([, y]) => y)));
    const maxY = Math.ceil(Math.max(...points.map(([, y]) => y)));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (pointInPolygon(x + 0.5, y + 0.5, points)) this.pixel(x, y, color);
      }
    }
  }

  toCanvas() {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(this.width, this.height);
    image.data.set(this.data);
    ctx.putImageData(image, 0, 0);
    return canvas;
  }
}

const COLOR_CACHE = new Map();

function rgb(hex) {
  let value = COLOR_CACHE.get(hex);
  if (!value) {
    if (!RESURRECT_64_HEX.includes(hex)) throw new Error(`Faction flag color is outside Resurrect 64: #${hex}`);
    value = [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16)
    ];
    COLOR_CACHE.set(hex, value);
  }
  return value;
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function research(id, evidence, representation, accuracyNote, sources) {
  return Object.freeze({ id, evidence, representation, accuracyNote, sources: Object.freeze(sources) });
}

function source(label, url) {
  return Object.freeze({ label, url });
}

function base(color) {
  return new PixelSurface(FLAG_W, FLAG_H, color);
}

function drawFactionFlag(id) {
  const draw = DRAWERS[id];
  if (!draw) throw new Error(`Missing faction flag renderer: ${id}`);
  const surface = draw();
  if (!(surface instanceof PixelSurface)) throw new Error(`Faction flag renderer returned invalid surface: ${id}`);
  return surface;
}

const DRAWERS = Object.freeze({
  pirate: () => {
    const s = base(C.black);
    swallowtail(s, C.black);
    s.line(8, 5, 22, 15, C.cream, 2);
    s.line(22, 5, 8, 15, C.cream, 2);
    s.rect(6, 4, 4, 2, C.cream);
    s.rect(21, 14, 4, 2, C.cream);
    return s;
  },
  england: () => {
    const s = base(C.red);
    s.rect(0, 0, 16, 10, C.blue);
    s.rect(16, 10, 16, 10, C.blue);
    for (const [x, y] of [[4, 3], [11, 6], [20, 13], [27, 16]]) fleur(s, x, y, C.gold);
    for (const y of [2, 5, 8, 12, 15, 18]) lionDash(s, y < 10 ? 19 : 3, y, C.gold);
    return s;
  },
  scotland: () => {
    const s = base(C.gold);
    tressure(s, C.red);
    lion(s, 15, 10, C.red, 1);
    return s;
  },
  france: () => {
    const s = base(C.blue);
    fleur(s, 16, 4, C.gold, 2);
    fleur(s, 10, 13, C.gold, 2);
    fleur(s, 22, 13, C.gold, 2);
    return s;
  },
  spain: () => {
    const s = base(C.cream);
    raggedSaltire(s, C.red);
    return s;
  },
  portugal: () => {
    const s = base(C.white);
    shield(s, 16, 10, C.red, C.cream);
    s.rect(12, 5, 8, 10, C.blue);
    for (const [x, y] of [[14, 7], [18, 7], [16, 10], [14, 13], [18, 13]]) s.pixel(x, y, C.white);
    for (const [x, y] of [[10, 5], [21, 5], [10, 14], [21, 14]]) s.rect(x, y, 2, 2, C.gold);
    return s;
  },
  habsburg: () => {
    const s = base(C.gold);
    doubleEagle(s, C.black);
    s.rect(14, 8, 4, 5, C.red);
    s.rect(14, 10, 4, 1, C.white);
    return s;
  },
  hungary: () => {
    const s = base(C.cream);
    for (let y = 0; y < FLAG_H; y += 5) s.rect(0, y, FLAG_W, 3, C.red);
    return s;
  },
  ottoman: () => {
    const s = base(C.red);
    s.circle(16, 10, 8, C.darkGreen);
    crescent(s, 16, 5, C.gold, C.darkGreen, 3);
    crescent(s, 11, 13, C.gold, C.darkGreen, 3);
    crescent(s, 21, 13, C.gold, C.darkGreen, 3);
    return s;
  },
  venice: () => {
    const s = base(C.red);
    wingedLion(s, C.gold);
    s.rect(17, 10, 6, 5, C.cream);
    s.line(20, 10, 20, 14, C.red);
    return s;
  },
  genoa: () => {
    const s = base(C.white);
    s.rect(13, 0, 6, FLAG_H, C.red);
    s.rect(0, 7, FLAG_W, 6, C.red);
    return s;
  },
  "papal-states": () => {
    const s = base(C.darkRed);
    key(s, 9, 15, 22, 4, C.gold);
    key(s, 22, 15, 9, 4, C.cream);
    s.rect(12, 3, 8, 2, C.gold);
    s.rect(14, 1, 4, 2, C.cream);
    return s;
  },
  ming: () => {
    const s = base(C.gold);
    dragon(s, C.red);
    s.circle(25, 5, 2, C.white);
    return s;
  },
  inca: () => {
    const s = base(C.red);
    squarePennant(s);
    rainbowArc(s, 16, 12);
    serpent(s, 7, C.cream);
    serpent(s, 13, C.cream);
    return s;
  },
  safavid: () => {
    const s = base(C.darkGreen);
    s.circle(21, 7, 4, C.gold);
    lion(s, 13, 12, C.gold, 0);
    return s;
  },
  muscovy: () => {
    const s = base(C.darkRed);
    doubleEagle(s, C.gold);
    s.rect(14, 8, 4, 5, C.blue);
    s.line(14, 12, 18, 8, C.cream);
    return s;
  },
  "poland-lithuania": () => {
    const s = base(C.red);
    s.rect(15, 0, 2, FLAG_H, C.cream);
    eagle(s, 8, 9, C.cream);
    horseman(s, 24, 11, C.cream);
    return s;
  },
  "denmark-norway": () => {
    const s = base(C.red);
    s.rect(9, 0, 4, FLAG_H, C.white);
    s.rect(0, 8, FLAG_W, 4, C.white);
    return s;
  },
  songhai: () => {
    const s = base(C.paleGold);
    s.rect(0, 0, FLAG_W, 3, C.darkGreen);
    s.rect(0, FLAG_H - 3, FLAG_W, 3, C.teal);
    s.line(9, 15, 22, 4, C.ink, 2);
    s.line(22, 15, 9, 4, C.ink, 2);
    s.polygon([[16, 3], [19, 8], [16, 7], [13, 8]], C.red);
    return s;
  },
  morocco: () => {
    const s = base(C.red);
    octagram(s, 16, 10, C.gold);
    return s;
  },
  ethiopia: () => {
    const s = base(C.darkRed);
    s.rect(0, 0, FLAG_W, 2, C.gold);
    ethiopianCross(s, 23, 8, C.gold);
    lion(s, 10, 13, C.paleGold, 0);
    return s;
  },
  vijayanagara: () => {
    const s = base(C.orange);
    s.circle(7, 5, 3, C.gold);
    crescent(s, 25, 5, C.cream, C.orange, 3);
    boar(s, 12, 13, C.ink);
    s.line(20, 16, 25, 9, C.cream, 2);
    return s;
  },
  gujarat: () => {
    const s = base(C.darkGreen);
    s.circle(16, 10, 7, C.gold);
    s.circle(16, 10, 5, C.ink);
    coinKnot(s, 16, 10, C.gold);
    return s;
  },
  bengal: () => {
    const s = base(C.cream);
    lion(s, 16, 11, C.red, 1);
    return s;
  },
  delhi: () => {
    const s = base(C.black);
    s.rect(0, 0, FLAG_W, 2, C.red);
    s.rect(0, FLAG_H - 2, FLAG_W, 2, C.red);
    s.circle(16, 10, 7, C.gold);
    s.circle(16, 10, 5, C.black);
    coinKnot(s, 16, 10, C.gold);
    return s;
  },
  ayutthaya: () => base(C.red),
  japan: () => {
    const s = base(C.cream);
    s.circle(16, 10, 7, C.black);
    s.circle(16, 10, 5, C.cream);
    s.rect(11, 7, 10, 2, C.black);
    s.rect(11, 11, 10, 2, C.black);
    return s;
  },
  joseon: () => {
    const s = base(C.gold);
    dragon(s, C.blue);
    s.circle(25, 5, 2, C.red);
    return s;
  }
});

function swallowtail(s, field) {
  for (let x = 26; x < FLAG_W; x++) {
    const reach = x - 25;
    for (let y = 10 - reach; y <= 9 + reach; y++) s.clear(x, y);
  }
  s.rect(0, 0, 1, FLAG_H, field);
}

function fleur(s, x, y, color, scale = 1) {
  s.rect(x - scale, y, scale * 2 + 1, scale * 3, color);
  s.rect(x - scale * 2, y + scale, scale, scale, color);
  s.rect(x + scale * 2, y + scale, scale, scale, color);
  s.rect(x - scale * 2, y + scale * 3, scale * 5, scale, color);
}

function lionDash(s, x, y, color) {
  s.rect(x, y, 6, 2, color);
  s.pixel(x + 1, y - 1, color);
  s.pixel(x + 5, y - 1, color);
}

function tressure(s, color) {
  s.rect(1, 1, FLAG_W - 2, 1, color);
  s.rect(1, FLAG_H - 2, FLAG_W - 2, 1, color);
  s.rect(1, 1, 1, FLAG_H - 2, color);
  s.rect(FLAG_W - 2, 1, 1, FLAG_H - 2, color);
  for (let x = 4; x < FLAG_W - 3; x += 5) {
    s.pixel(x, 3, color);
    s.pixel(x, FLAG_H - 4, color);
  }
}

function lion(s, cx, cy, color, rampant) {
  s.rect(cx - 4, cy - 3, 8, 5, color);
  s.rect(cx + 3, cy - 5, 3, 3, color);
  s.rect(cx - 4, cy + 1, 2, 5, color);
  s.rect(cx + 2, cy + 1, 2, 5, color);
  s.line(cx - 4, cy - 3, cx - 7, cy - 7, color, 1);
  s.pixel(cx - 8, cy - 7, color);
  if (rampant) {
    s.line(cx + 3, cy - 2, cx + 7, cy - 6, color, 2);
    s.line(cx - 2, cy - 3, cx - 5, cy - 6, color, 2);
  }
}

function raggedSaltire(s, color) {
  s.line(1, 1, FLAG_W - 2, FLAG_H - 2, color, 3);
  s.line(FLAG_W - 2, 1, 1, FLAG_H - 2, color, 3);
  for (let x = 3; x < FLAG_W - 2; x += 5) {
    const y = Math.round(x * (FLAG_H - 1) / (FLAG_W - 1));
    s.pixel(x, y - 2, color);
    s.pixel(FLAG_W - 1 - x, y + 2, color);
  }
}

function shield(s, cx, cy, border, field) {
  s.polygon([[cx - 6, cy - 7], [cx + 6, cy - 7], [cx + 5, cy + 3], [cx, cy + 7], [cx - 5, cy + 3]], border);
  s.polygon([[cx - 4, cy - 5], [cx + 4, cy - 5], [cx + 3, cy + 2], [cx, cy + 5], [cx - 3, cy + 2]], field);
}

function eagle(s, cx, cy, color) {
  s.rect(cx - 1, cy - 4, 3, 9, color);
  s.polygon([[cx - 1, cy - 2], [cx - 8, cy - 6], [cx - 6, cy], [cx - 2, cy + 2]], color);
  s.polygon([[cx + 1, cy - 2], [cx + 8, cy - 6], [cx + 6, cy], [cx + 2, cy + 2]], color);
  s.rect(cx - 4, cy + 4, 3, 2, color);
  s.rect(cx + 2, cy + 4, 3, 2, color);
}

function doubleEagle(s, color) {
  eagle(s, 16, 10, color);
  s.rect(12, 3, 3, 3, color);
  s.rect(18, 3, 3, 3, color);
  s.pixel(11, 2, color);
  s.pixel(21, 2, color);
}

function crescent(s, cx, cy, color, field, radius) {
  s.circle(cx, cy, radius, color);
  s.circle(cx + 2, cy - 1, radius, field);
}

function wingedLion(s, color) {
  lion(s, 13, 11, color, 0);
  s.polygon([[10, 9], [4, 3], [13, 6]], color);
  s.polygon([[13, 8], [18, 3], [18, 9]], color);
  s.line(7, 4, 12, 8, C.red);
}

function key(s, x0, y0, x1, y1, color) {
  s.line(x0, y0, x1, y1, color, 2);
  s.circle(x1, y1, 2, color);
  s.pixel(x0 - 1, y0, color);
  s.pixel(x0, y0 + 1, color);
}

function dragon(s, color) {
  s.line(8, 13, 12, 7, color, 3);
  s.line(12, 7, 20, 12, color, 3);
  s.line(20, 12, 24, 6, color, 2);
  s.rect(22, 4, 4, 3, color);
  s.pixel(27, 4, color);
  s.line(12, 11, 7, 16, color, 2);
  s.line(19, 12, 23, 17, color, 2);
  s.line(10, 7, 7, 4, color, 1);
}

function cactus(s, cx, cy, color) {
  s.rect(cx - 1, cy - 5, 3, 9, color);
  s.rect(cx - 5, cy - 2, 5, 2, color);
  s.rect(cx - 5, cy - 4, 2, 4, color);
  s.rect(cx + 2, cy - 3, 5, 2, color);
  s.rect(cx + 5, cy - 5, 2, 4, color);
}

function squarePennant(s) {
  for (let y = 0; y < FLAG_H; y++) {
    for (let x = 26; x < FLAG_W; x++) s.clear(x, y);
  }
  s.rect(0, 0, 26, 2, C.gold);
  s.rect(0, FLAG_H - 2, 26, 2, C.gold);
  s.rect(0, 0, 2, FLAG_H, C.gold);
  s.rect(24, 0, 2, FLAG_H, C.gold);
}

function rainbowArc(s, cx, cy) {
  for (const [radius, color] of [[9, C.gold], [7, C.paleGreen], [5, C.blue]]) {
    for (let x = -radius; x <= radius; x++) {
      const y = Math.round(Math.sqrt(radius * radius - x * x));
      s.pixel(cx + x, cy - y, color);
    }
  }
}

function serpent(s, y, color) {
  const points = [[3, y], [6, y - 1], [9, y + 1], [12, y - 1], [15, y + 1], [18, y - 1], [22, y]];
  for (let i = 1; i < points.length; i++) s.line(...points[i - 1], ...points[i], color, 1);
  s.rect(22, y - 1, 2, 2, color);
}

function horseman(s, cx, cy, color) {
  s.rect(cx - 5, cy, 9, 4, color);
  s.rect(cx + 3, cy - 2, 3, 3, color);
  s.pixel(cx - 4, cy + 5, color);
  s.pixel(cx + 3, cy + 5, color);
  s.rect(cx - 1, cy - 5, 2, 5, color);
  s.line(cx, cy - 4, cx + 5, cy - 7, color, 1);
}

function octagram(s, cx, cy, color) {
  s.line(cx - 7, cy, cx, cy - 7, color, 2);
  s.line(cx, cy - 7, cx + 7, cy, color, 2);
  s.line(cx + 7, cy, cx, cy + 7, color, 2);
  s.line(cx, cy + 7, cx - 7, cy, color, 2);
  s.rect(cx - 5, cy - 5, 11, 2, color);
  s.rect(cx - 5, cy + 4, 11, 2, color);
  s.rect(cx - 5, cy - 5, 2, 11, color);
  s.rect(cx + 4, cy - 5, 2, 11, color);
}

function ethiopianCross(s, cx, cy, color) {
  s.rect(cx - 1, cy - 6, 3, 13, color);
  s.rect(cx - 5, cy - 2, 11, 3, color);
  for (const [x, y] of [[cx - 5, cy - 4], [cx + 4, cy - 4], [cx - 5, cy + 2], [cx + 4, cy + 2]]) {
    s.rect(x, y, 2, 2, color);
  }
}

function boar(s, cx, cy, color) {
  s.rect(cx - 6, cy - 3, 9, 5, color);
  s.polygon([[cx + 3, cy - 3], [cx + 7, cy - 1], [cx + 3, cy + 2]], color);
  s.rect(cx - 4, cy + 2, 2, 4, color);
  s.rect(cx + 1, cy + 2, 2, 4, color);
  s.line(cx - 6, cy - 2, cx - 8, cy - 5, color);
  s.pixel(cx + 7, cy - 2, C.cream);
}

function coinKnot(s, cx, cy, color) {
  s.line(cx - 4, cy - 3, cx + 4, cy - 3, color, 2);
  s.line(cx - 4, cy + 3, cx + 4, cy + 3, color, 2);
  s.line(cx - 4, cy - 3, cx + 3, cy + 3, color, 1);
  s.line(cx + 4, cy - 3, cx - 3, cy + 3, color, 1);
  s.pixel(cx, cy, color);
}

function validateResearchCoverage() {
  const factionIds = FLAG_FACTIONS.map((faction) => faction.id).sort();
  const researchIds = RESEARCH.map((entry) => entry.id).sort();
  const rendererIds = Object.keys(DRAWERS).sort();
  if (JSON.stringify(factionIds) !== JSON.stringify(researchIds)) {
    throw new Error("Faction flag research does not exactly cover the faction registry");
  }
  if (JSON.stringify(factionIds) !== JSON.stringify(rendererIds)) {
    throw new Error("Faction flag renderers do not exactly cover the faction registry");
  }
}

function renderContactSheet(entries) {
  const cellW = FLAG_W * CONTACT_SCALE;
  const artH = FLAG_H * CONTACT_SCALE;
  const labelH = 20;
  const rows = Math.ceil(entries.length / CONTACT_COLS);
  const canvas = createCanvas(cellW * CONTACT_COLS, (artH + labelH) * rows);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = `#${C.black}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "9px monospace";
  ctx.textBaseline = "top";
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const x = index % CONTACT_COLS * cellW;
    const y = Math.floor(index / CONTACT_COLS) * (artH + labelH);
    ctx.drawImage(entry.canvas, x, y, cellW, artH);
    ctx.fillStyle = `#${C.cream}`;
    ctx.fillText(entry.faction.name.slice(0, 28), x + 3, y + artH + 4);
  }
  return canvas;
}

function researchMarkdown(entries) {
  const lines = [
    "# Faction Flags and Heraldry, 1522",
    "",
    "These 32x20 pixel identifiers distinguish documented contemporary banners from heraldic substitutes and explicit reconstructions. They are game assets, not claims that every polity used a modern national flag.",
    "",
    "All pixels use the Resurrect 64 palette. Regenerate with `npm run render:faction-flags` from `apps/pixel-globe/`.",
    "",
    "| Faction | Representation | Evidence | Accuracy note |",
    "|---|---|---|---|"
  ];
  for (const entry of entries) {
    const sourceLinks = entry.sources.length > 0
      ? ` Sources: ${entry.sources.map((item) => `[${item.label}](${item.url})`).join(", ")}.`
      : "";
    lines.push(`| ${entry.factionName} | ${entry.representation} | \`${entry.evidence}\` | ${entry.accuracyNote}${sourceLinks} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  validateResearchCoverage();
  mkdirSync(outputRoot, { recursive: true });
  removeObsoleteFlagFiles();
  const entries = [];
  for (const faction of FLAG_FACTIONS) {
    const researchEntry = RESEARCH_BY_ID.get(faction.id);
    const canvas = drawFactionFlag(faction.id).toCanvas();
    const file = `${faction.id}.png`;
    writeFileSync(join(outputRoot, file), canvas.toBuffer("image/png"));
    entries.push({
      faction,
      canvas,
      id: faction.id,
      factionName: faction.name,
      width: FLAG_W,
      height: FLAG_H,
      file,
      ...researchEntry
    });
  }

  const manifest = entries.map(({ faction, canvas, ...entry }) => entry);
  writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify({
    generatedBy: "tools/render-faction-flags.mjs",
    year: 1522,
    palette: "Resurrect 64",
    width: FLAG_W,
    height: FLAG_H,
    evidenceLevels: {
      "ui-symbol": "A non-historical game marker for a non-state faction.",
      "period-banner": "Documented banner in use in or spanning 1522.",
      "period-heraldry": "Contemporary arms rendered as a banner.",
      "near-period-banner": "Banner evidence from near the target date, with uncertainty stated.",
      "near-period-heraldry": "Contemporary heraldry on a reconstructed field.",
      "period-ceremonial-reconstruction": "Period ceremonial devices combined into a game identifier.",
      "period-emblem": "Contemporary state, city, or dynastic emblem rendered as a banner.",
      "documented-royal-standard": "A royal standard described in early colonial-era textual evidence.",
      "period-regional-emblem": "A period regional device used as the closest dynastic equivalent.",
      "period-banner-tradition": "A reconstruction from a documented period banner tradition.",
      "period-numismatic-emblem": "Exact-period coin imagery used where no flag survives.",
      "later-traditional-ensign": "The earliest known later ensign, clearly marked as post-1522.",
      "period-clan-heraldry": "Contemporary clan arms used in place of a national flag.",
      "period-royal-standard": "A traditional royal standard rather than a national flag.",
      reconstruction: "No secure period flag survives; the image is an explicit game reconstruction."
    },
    factions: manifest
  }, null, 2)}\n`);
  writeFileSync(join(outputRoot, "contact-sheet.png"), renderContactSheet(entries).toBuffer("image/png"));
  writeFileSync(join(docsRoot, "faction-flags.md"), `${researchMarkdown(manifest)}\n`);
  console.log(`Rendered ${entries.length} faction flags to ${outputRoot}`);
}

function removeObsoleteFlagFiles() {
  const expectedFiles = new Set(FLAG_FACTIONS.map((faction) => `${faction.id}.png`));
  for (const entry of readdirSync(outputRoot, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "contact-sheet.png" || !entry.name.endsWith(".png")) continue;
    if (!expectedFiles.has(entry.name)) unlinkSync(join(outputRoot, entry.name));
  }
}

main();
