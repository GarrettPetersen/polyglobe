import assert from "node:assert/strict";
import test from "node:test";

import {
  politicsCardGridLayout,
  politicsCardSegments,
  politicsCardSegmentsPage
} from "./politicsCardLayout.js";

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
  assert.equal(layout.tokensPerLine, 6);
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

function card({ dependencies = [], relationships = [] }) {
  return { dependencies, relationships };
}

function relationship(relation, factionIds) {
  return { relation, factionIds };
}

function ids(prefix, count) {
  return Array.from({ length: count }, (_unused, index) => `${prefix}${index}`);
}
