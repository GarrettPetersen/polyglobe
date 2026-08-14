import assert from "node:assert/strict";
import test from "node:test";

import {
  POLITICS_DEPENDENCY_TEXT_COLOR,
  politicsCardEntries,
  politicsCardEntriesPage,
  politicsCardGridLayout,
  politicsRelationTextColor
} from "./politicsCardLayout.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

test("politics cards form a two-by-two desktop grid without crowding the footer", () => {
  const layout = politicsCardGridLayout({
    panelWidth: 439,
    panelHeight: 240,
    lineHeight: 11,
    pagerHeight: 24,
    newsHeight: 12
  });

  assert.equal(layout.columns, 2);
  assert.equal(layout.rows, 2);
  assert.equal(layout.slotsPerPage, 4);
  assert.equal(layout.cardWidth, 206);
  assert.equal(layout.cardHeight, 74);
  assert.equal(layout.headerHeight, 26);
  assert.equal(layout.maxRelationLines, 4);
  assert.equal(layout.tokensPerLine, 5);
  assert.equal(layout.relationTokenWidth, 24);
});

test("politics cards become a single compact column and respect taller localized fonts", () => {
  const compact = politicsCardGridLayout({
    panelWidth: 340,
    panelHeight: 240,
    lineHeight: 11,
    pagerHeight: 24,
    newsHeight: 12
  });
  const localized = politicsCardGridLayout({
    panelWidth: 439,
    panelHeight: 240,
    lineHeight: 14,
    pagerHeight: 24,
    newsHeight: 12
  });

  assert.equal(compact.columns, 1);
  assert.equal(compact.rows, 2);
  assert.equal(compact.slotsPerPage, 2);
  assert.equal(localized.columns, 2);
  assert.equal(localized.rows, 1);
  assert.equal(localized.slotsPerPage, 2);
  assert.equal(localized.maxRelationLines, 8);
  assert.equal(localized.cardHeight, 148);
});

test("politics card entries preserve every relationship and compress universal pirate wars", () => {
  const portugal = card({
    dependencies: [{ kind: "vassal", role: "suzerain", factionId: "hormuz" }],
    relationships: [
      relationship("war", ids("w", 7)),
      relationship("hostile", ["tidore"]),
      relationship("friendly", ids("f", 9))
    ]
  });
  const pirates = card({
    relationships: [relationship("war", ids("p", 31))]
  });
  const entries = politicsCardEntries([portugal, pirates], {
    tokensPerLine: 7,
    maxRelationLines: 5,
    maxRowSpan: 2,
    powerCount: 32
  });

  assert.equal(entries.length, 2);
  assert.equal(entries[0].lines.length, 5);
  assert.deepEqual(
    entries[0].lines.flatMap((line) => line.factionIds),
    ["hormuz", ...ids("w", 7), "tidore", ...ids("f", 9)]
  );
  assert.equal(entries[1].lines.length, 1);
  assert.equal(entries[1].lines[0].allPowers, true);
});

test("politics cards keep tribute-paying and non-paying protected subjects distinct", () => {
  const ottoman = card({
    dependencies: [
      dependency("autonomous-vassal", "suzerain", "wallachia", { tribute: true }),
      dependency("autonomous-vassal", "suzerain", "crimea", { tribute: false })
    ]
  });
  const [entry] = politicsCardEntries([ottoman], {
    tokensPerLine: 4,
    maxRelationLines: 4,
    maxRowSpan: 2,
    powerCount: 8
  });

  assert.equal(entry.lines.length, 2);
  assert.deepEqual(entry.lines.map((line) => line.factionIds), [["wallachia"], ["crimea"]]);
  assert.deepEqual(entry.lines.map((line) => line.terms.tribute), [true, false]);
});

test("an unusually entangled country grows into one double-height card", () => {
  const tangled = card({
    relationships: [
      relationship("war", ids("w", 8)),
      relationship("hostile", ids("h", 8)),
      relationship("ally", ids("a", 8)),
      relationship("friendly", ids("f", 8))
    ]
  });
  const entries = politicsCardEntries([tangled], {
    tokensPerLine: 4,
    maxRelationLines: 5,
    maxRowSpan: 2,
    powerCount: 40
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].rowSpan, 2);
  assert.deepEqual(
    entries[0].lines.flatMap((line) => line.factionIds),
    [...ids("w", 8), ...ids("h", 8), ...ids("a", 8), ...ids("f", 8)]
  );
});

test("politics card pagination packs tall cards and clamps to its final page", () => {
  const entries = [
    { card: { faction: { id: "tall" } }, rowSpan: 2, lines: [] },
    ...Array.from({ length: 4 }, (_unused, index) => ({
      card: { faction: { id: `short-${index}` } },
      rowSpan: 1,
      lines: []
    }))
  ];
  const firstPage = politicsCardEntriesPage(entries, 0, { columns: 2, rows: 2 });
  const page = politicsCardEntriesPage(entries, 8, { columns: 2, rows: 2 });

  assert.equal(firstPage.entries.length, 3);
  assert.deepEqual(
    firstPage.entries.map(({ row, column, rowSpan }) => ({ row, column, rowSpan })),
    [
      { row: 0, column: 0, rowSpan: 2 },
      { row: 0, column: 1, rowSpan: 1 },
      { row: 1, column: 1, rowSpan: 1 }
    ]
  );
  assert.equal(page.page, 1);
  assert.equal(page.pageCount, 2);
  assert.equal(page.entries.length, 2);
});

test("politics relationship labels use distinct dark Resurrect inks", () => {
  const colors = ["ally", "friendly", "hostile", "war", "neutral"]
    .map(politicsRelationTextColor);
  const palette = new Set(RESURRECT_64_HEX.map((hex) => `#${hex}`));

  assert.equal(new Set(colors).size, colors.length);
  for (const color of [...colors, POLITICS_DEPENDENCY_TEXT_COLOR]) {
    assert.equal(palette.has(color), true, color);
    assert.ok(contrastRatio(color, "#d6bd8f") >= 3.9, color);
  }
});

function card({ dependencies = [], relationships = [] }) {
  return { dependencies, relationships };
}

function relationship(relation, factionIds) {
  return { relation, factionIds };
}

function dependency(kind, role, factionId, overrides = {}) {
  return {
    kind,
    role,
    factionId,
    terms: {
      foreignPolicy: "independent",
      tribute: false,
      mutualDefense: true,
      offensiveWarObligation: false,
      ...overrides
    }
  };
}

function ids(prefix, count) {
  return Array.from({ length: count }, (_unused, index) => `${prefix}${index}`);
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/../g).map((pair) => {
    const value = Number.parseInt(pair, 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
