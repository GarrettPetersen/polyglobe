import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolRoot = dirname(fileURLToPath(import.meta.url));
const defaultFontPath = resolve(toolRoot, "../public/assets/fonts/pixel_pirate.ttf");
const expectedDesignPixelsPerEm = 8;
const rKerningPixels = -3;
const rKerningFollowers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const sfntChecksumMagic = 0xb1b0afba;

export function ensurePixelPirateKerning(fontBuffer) {
  const sfnt = parseSfnt(fontBuffer);
  const unitsPerEm = readU16(fontBuffer, requiredTable(sfnt, "head").offset + 18);
  if (unitsPerEm % expectedDesignPixelsPerEm !== 0) {
    throw new Error(
      `Pixel Pirate units per em ${unitsPerEm} are not divisible by ${expectedDesignPixelsPerEm} design pixels`
    );
  }
  const unitsPerPixel = unitsPerEm / expectedDesignPixelsPerEm;
  const rGlyph = glyphForCodePoint(fontBuffer, sfnt, "R".codePointAt(0));
  const pairs = readKernPairs(fontBuffer, sfnt);
  let changed = false;
  for (const follower of rKerningFollowers) {
    const rightGlyph = glyphForCodePoint(fontBuffer, sfnt, follower.codePointAt(0));
    const key = kernPairKey(rGlyph, rightGlyph);
    const value = rKerningPixels * unitsPerPixel;
    if (pairs.get(key) === value) continue;
    pairs.set(key, value);
    changed = true;
  }
  if (!changed) return { buffer: Buffer.from(fontBuffer), changed: false };

  const tables = new Map(
    sfnt.tables.map((table) => [
      table.tag,
      table.tag === "kern"
        ? makeKernTable(pairs)
        : Buffer.from(fontBuffer.subarray(table.offset, table.offset + table.length))
    ])
  );
  if (!tables.has("kern")) tables.set("kern", makeKernTable(pairs));
  return { buffer: buildSfnt(sfnt.scalerType, tables), changed: true };
}

export function auditPixelPirateKerning(fontBuffer) {
  const sfnt = parseSfnt(fontBuffer);
  const head = requiredTable(sfnt, "head");
  const hhea = requiredTable(sfnt, "hhea");
  const hmtx = requiredTable(sfnt, "hmtx");
  const unitsPerEm = readU16(fontBuffer, head.offset + 18);
  if (unitsPerEm % expectedDesignPixelsPerEm !== 0) {
    throw new Error(
      `Pixel Pirate units per em ${unitsPerEm} are not divisible by ${expectedDesignPixelsPerEm} design pixels`
    );
  }
  const unitsPerPixel = unitsPerEm / expectedDesignPixelsPerEm;
  const numberOfHMetrics = readU16(fontBuffer, hhea.offset + 34);
  const rGlyph = glyphForCodePoint(fontBuffer, sfnt, "R".codePointAt(0));
  if (rGlyph >= numberOfHMetrics) {
    throw new Error(`Pixel Pirate R glyph ${rGlyph} has no dedicated horizontal metric`);
  }
  const rAdvanceUnits = readU16(fontBuffer, hmtx.offset + rGlyph * 4);
  const pairs = readKernPairs(fontBuffer, sfnt);
  const kerningPixels = Object.fromEntries(
    [...rKerningFollowers].map((follower) => {
      const rightGlyph = glyphForCodePoint(fontBuffer, sfnt, follower.codePointAt(0));
      const units = pairs.get(kernPairKey(rGlyph, rightGlyph));
      if (!Number.isInteger(units)) {
        throw new Error(`Pixel Pirate has no R${follower} kerning pair`);
      }
      if (units % unitsPerPixel !== 0) {
        throw new Error(`Pixel Pirate R${follower} kerning ${units} is not aligned to its design pixel grid`);
      }
      return [follower, units / unitsPerPixel];
    })
  );
  return Object.freeze({
    unitsPerEm,
    unitsPerPixel,
    rAdvancePixels: rAdvanceUnits / unitsPerPixel,
    kerningPixels: Object.freeze(kerningPixels),
    checksum: fontChecksum(fontBuffer)
  });
}

function parseSfnt(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new Error("TrueType font is missing its SFNT header");
  }
  const scalerType = readU32(buffer, 0);
  const tableCount = readU16(buffer, 4);
  const directoryEnd = 12 + tableCount * 16;
  if (directoryEnd > buffer.length) {
    throw new Error(`TrueType table directory exceeds the file: ${directoryEnd} > ${buffer.length}`);
  }
  const tags = new Set();
  const tables = [];
  for (let index = 0; index < tableCount; index++) {
    const recordOffset = 12 + index * 16;
    const tag = buffer.toString("ascii", recordOffset, recordOffset + 4);
    const offset = readU32(buffer, recordOffset + 8);
    const length = readU32(buffer, recordOffset + 12);
    if (tags.has(tag)) throw new Error(`TrueType font has a duplicate ${tag} table`);
    if (offset + length > buffer.length) {
      throw new Error(`TrueType ${tag} table exceeds the file: ${offset} + ${length} > ${buffer.length}`);
    }
    tags.add(tag);
    tables.push({ tag, offset, length });
  }
  return { scalerType, tables };
}

function requiredTable(sfnt, tag) {
  const table = sfnt.tables.find((candidate) => candidate.tag === tag);
  if (!table) throw new Error(`TrueType font is missing its ${tag} table`);
  return table;
}

function glyphForCodePoint(buffer, sfnt, codePoint) {
  const cmap = requiredTable(sfnt, "cmap");
  const tableCount = readU16(buffer, cmap.offset + 2);
  const candidates = [];
  for (let index = 0; index < tableCount; index++) {
    const recordOffset = cmap.offset + 4 + index * 8;
    const platform = readU16(buffer, recordOffset);
    const encoding = readU16(buffer, recordOffset + 2);
    const offset = cmap.offset + readU32(buffer, recordOffset + 4);
    const format = readU16(buffer, offset);
    const priority = platform === 3 && encoding === 10
      ? 0
      : platform === 3 && encoding === 1
        ? 1
        : platform === 0
          ? 2
          : 3;
    candidates.push({ format, offset, priority });
  }
  candidates.sort((a, b) => a.priority - b.priority);
  for (const candidate of candidates) {
    const glyph = candidate.format === 4
      ? glyphFromCmapFormat4(buffer, candidate.offset, codePoint)
      : candidate.format === 12
        ? glyphFromCmapFormat12(buffer, candidate.offset, codePoint)
        : null;
    if (glyph != null) return glyph;
  }
  throw new Error(`TrueType font has no supported cmap for U+${codePoint.toString(16).toUpperCase()}`);
}

function glyphFromCmapFormat4(buffer, offset, codePoint) {
  if (codePoint > 0xffff) return null;
  const segmentCount = readU16(buffer, offset + 6) / 2;
  const endCodeOffset = offset + 14;
  const startCodeOffset = endCodeOffset + segmentCount * 2 + 2;
  const deltaOffset = startCodeOffset + segmentCount * 2;
  const rangeOffset = deltaOffset + segmentCount * 2;
  for (let segment = 0; segment < segmentCount; segment++) {
    const end = readU16(buffer, endCodeOffset + segment * 2);
    const start = readU16(buffer, startCodeOffset + segment * 2);
    if (codePoint < start || codePoint > end) continue;
    const delta = readI16(buffer, deltaOffset + segment * 2);
    const range = readU16(buffer, rangeOffset + segment * 2);
    if (range === 0) return (codePoint + delta) & 0xffff;
    const glyphOffset = rangeOffset + segment * 2 + range + (codePoint - start) * 2;
    const glyph = readU16(buffer, glyphOffset);
    return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
  }
  return null;
}

function glyphFromCmapFormat12(buffer, offset, codePoint) {
  const groupCount = readU32(buffer, offset + 12);
  let low = 0;
  let high = groupCount - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const groupOffset = offset + 16 + middle * 12;
    const start = readU32(buffer, groupOffset);
    const end = readU32(buffer, groupOffset + 4);
    if (codePoint < start) {
      high = middle - 1;
    } else if (codePoint > end) {
      low = middle + 1;
    } else {
      return readU32(buffer, groupOffset + 8) + codePoint - start;
    }
  }
  return null;
}

function readKernPairs(buffer, sfnt) {
  const kern = sfnt.tables.find((table) => table.tag === "kern");
  if (!kern) return new Map();
  if (readU16(buffer, kern.offset) !== 0) {
    throw new Error("Pixel Pirate uses an unsupported legacy kern table version");
  }
  const subtableCount = readU16(buffer, kern.offset + 2);
  const pairs = new Map();
  let offset = kern.offset + 4;
  for (let index = 0; index < subtableCount; index++) {
    const length = readU16(buffer, offset + 2);
    const coverage = readU16(buffer, offset + 4);
    const format = coverage >> 8;
    const horizontal = (coverage & 1) !== 0;
    if (length < 6 || offset + length > kern.offset + kern.length) {
      throw new Error(`Pixel Pirate kern subtable ${index} has invalid length ${length}`);
    }
    if (format !== 0 || !horizontal) {
      throw new Error(`Pixel Pirate kern subtable ${index} has unsupported format ${format}`);
    }
    const pairCount = readU16(buffer, offset + 6);
    const pairsOffset = offset + 14;
    if (pairsOffset + pairCount * 6 > offset + length) {
      throw new Error(`Pixel Pirate kern subtable ${index} has truncated pairs`);
    }
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
      const pairOffset = pairsOffset + pairIndex * 6;
      const left = readU16(buffer, pairOffset);
      const right = readU16(buffer, pairOffset + 2);
      pairs.set(kernPairKey(left, right), readI16(buffer, pairOffset + 4));
    }
    offset += length;
  }
  return pairs;
}

function makeKernTable(pairs) {
  const entries = [...pairs.entries()]
    .map(([key, value]) => ({
      left: Math.floor(key / 0x10000),
      right: key & 0xffff,
      value
    }))
    .sort((a, b) => a.left - b.left || a.right - b.right);
  if (entries.length > 0xffff) throw new Error(`Too many TrueType kerning pairs: ${entries.length}`);
  const pairBytes = entries.length * 6;
  const subtableLength = 14 + pairBytes;
  const buffer = Buffer.alloc(4 + subtableLength);
  buffer.writeUInt16BE(0, 0);
  buffer.writeUInt16BE(1, 2);
  buffer.writeUInt16BE(0, 4);
  buffer.writeUInt16BE(subtableLength, 6);
  buffer.writeUInt16BE(1, 8);
  buffer.writeUInt16BE(entries.length, 10);
  const power = greatestPowerOfTwoAtMost(entries.length);
  buffer.writeUInt16BE(power * 6, 12);
  buffer.writeUInt16BE(power === 0 ? 0 : Math.log2(power), 14);
  buffer.writeUInt16BE(pairBytes - power * 6, 16);
  for (let index = 0; index < entries.length; index++) {
    const offset = 18 + index * 6;
    const entry = entries[index];
    buffer.writeUInt16BE(entry.left, offset);
    buffer.writeUInt16BE(entry.right, offset + 2);
    buffer.writeInt16BE(entry.value, offset + 4);
  }
  return buffer;
}

function buildSfnt(scalerType, tableData) {
  const entries = [...tableData.entries()]
    .map(([tag, data]) => ({ tag, data: Buffer.from(data) }))
    .sort((a, b) => Buffer.from(a.tag, "ascii").compare(Buffer.from(b.tag, "ascii")));
  const tableCount = entries.length;
  const power = greatestPowerOfTwoAtMost(tableCount);
  const directoryLength = 12 + tableCount * 16;
  let fileLength = align4(directoryLength);
  for (const entry of entries) fileLength += align4(entry.data.length);
  const output = Buffer.alloc(fileLength);
  output.writeUInt32BE(scalerType, 0);
  output.writeUInt16BE(tableCount, 4);
  output.writeUInt16BE(power * 16, 6);
  output.writeUInt16BE(Math.log2(power), 8);
  output.writeUInt16BE(tableCount * 16 - power * 16, 10);

  let dataOffset = align4(directoryLength);
  let headOffset = null;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const recordOffset = 12 + index * 16;
    if (entry.tag === "head") {
      entry.data.writeUInt32BE(0, 8);
      headOffset = dataOffset;
    }
    output.write(entry.tag, recordOffset, 4, "ascii");
    output.writeUInt32BE(fontChecksum(entry.data), recordOffset + 4);
    output.writeUInt32BE(dataOffset, recordOffset + 8);
    output.writeUInt32BE(entry.data.length, recordOffset + 12);
    entry.data.copy(output, dataOffset);
    dataOffset += align4(entry.data.length);
  }
  if (headOffset == null) throw new Error("TrueType font is missing its head table");
  const adjustment = (sfntChecksumMagic - fontChecksum(output)) >>> 0;
  output.writeUInt32BE(adjustment, headOffset + 8);
  if (fontChecksum(output) !== sfntChecksumMagic) {
    throw new Error("TrueType checksum adjustment failed");
  }
  return output;
}

function kernPairKey(left, right) {
  return left * 0x10000 + right;
}

function greatestPowerOfTwoAtMost(value) {
  if (!Number.isInteger(value) || value <= 0) return 0;
  return 2 ** Math.floor(Math.log2(value));
}

function align4(value) {
  return (value + 3) & ~3;
}

function fontChecksum(buffer) {
  let sum = 0;
  for (let offset = 0; offset < align4(buffer.length); offset += 4) {
    const value = offset + 4 <= buffer.length
      ? buffer.readUInt32BE(offset)
      : paddedU32(buffer, offset);
    sum = (sum + value) >>> 0;
  }
  return sum;
}

function paddedU32(buffer, offset) {
  let value = 0;
  for (let index = 0; index < 4; index++) {
    value = (value << 8) | (buffer[offset + index] ?? 0);
  }
  return value >>> 0;
}

function readU16(buffer, offset) {
  requireBytes(buffer, offset, 2);
  return buffer.readUInt16BE(offset);
}

function readI16(buffer, offset) {
  requireBytes(buffer, offset, 2);
  return buffer.readInt16BE(offset);
}

function readU32(buffer, offset) {
  requireBytes(buffer, offset, 4);
  return buffer.readUInt32BE(offset);
}

function requireBytes(buffer, offset, length) {
  if (!Number.isInteger(offset) || offset < 0 || offset + length > buffer.length) {
    throw new Error(`TrueType read exceeds the file: ${offset} + ${length} > ${buffer.length}`);
  }
}

function main() {
  const fontPath = resolve(process.argv[2] || defaultFontPath);
  const current = readFileSync(fontPath);
  const result = ensurePixelPirateKerning(current);
  if (result.changed) writeFileSync(fontPath, result.buffer);
  const audit = auditPixelPirateKerning(result.buffer);
  console.log(
    `${result.changed ? "Updated" : "Verified"} ${fontPath}: ` +
    `R advance ${audit.rAdvancePixels}px, R-to-letter kerning ${rKerningPixels}px`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
