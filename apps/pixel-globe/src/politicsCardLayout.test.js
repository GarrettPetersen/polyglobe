import assert from "node:assert/strict";
import test from "node:test";

import {
  POLITICS_DEPENDENCY_TEXT_COLOR,
  politicsCardGridLayout,
  politicsRelationTextColor,
  politicsCardSegments,
  politicsCardSegmentsPage
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
  assert.equal(layout.cardsPerPage, 4);
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
  assert.equal(compact.cardsPerPage, 2);
  assert.equal(localized.columns, 2);
  assert.equal(localized.rows, 1);
  assert.equal(localized.cardsPerPage, 2);
});

test("politics card segments preserve every relationship and compress universal pirate wars", () => {
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
  const segments = politicsCardSegments([portugal, pirates], {
    tokensPerLine: 7,
    maxRelationLines: 5,
    powerCount: 32
  });

  assert.equal(segments.length, 2);
  assert.equal(segments[0].lines.length, 5);
  assert.deepEqual(
    segments[0].lines.flatMap((line) => line.factionIds),
    ["hormuz", ...ids("w", 7), "tidore", ...ids("f", 9)]
  );
  assert.equal(segments[1].lines.length, 1);
  assert.equal(segments[1].lines[0].allPowers, true);
});

test("an unusually entangled country continues onto another card without dropping ties", () => {
  const tangled = card({
    relationships: [
      relationship("war", ids("w", 8)),
      relationship("hostile", ids("h", 8)),
      relationship("ally", ids("a", 8)),
      relationship("friendly", ids("f", 8))
    ]
  });
  const segments = politicsCardSegments([tangled], {
    tokensPerLine: 4,
    maxRelationLines: 5,
    powerCount: 40
  });

  assert.equal(segments.length, 2);
  assert.equal(segments[0].segmentCount, 2);
  assert.equal(segments[1].segmentIndex, 1);
  assert.deepEqual(
    segments.flatMap((segment) => segment.lines).flatMap((line) => line.factionIds),
    [...ids("w", 8), ...ids("h", 8), ...ids("a", 8), ...ids("f", 8)]
  );
});

test("politics card pagination clamps to its final page", () => {
  const segments = Array.from({ length: 9 }, (_unused, index) => ({ index }));
  const page = politicsCardSegmentsPage(segments, 8, 4);

  assert.equal(page.page, 2);
  assert.equal(page.pageCount, 3);
  assert.deepEqual(page.segments, [{ index: 8 }]);
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
