import assert from "node:assert/strict";
import test from "node:test";

import {
  POLITICS_DEPENDENCY_TEXT_COLOR,
  POLITICS_PAGE_JUMP,
  politicsCardEntries,
  politicsCardEntriesPage,
  politicsCardGridLayout,
  politicsEmbargoLabelKey,
  politicsPagerButtonLayout,
  politicsRelationTextColor
} from "./politicsCardLayout.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";
import { createGameState } from "./gameState.js";
import { IMPERIAL_ESTATES_1522 } from "./imperialEstates.js";
import { createPoliticsView } from "./politics.js";

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
  assert.deepEqual(layout.relationLineCapacities, [4, 11]);
  assert.equal(layout.tokensPerLine, 4);
  assert.equal(layout.fullWidthTokensPerLine, 13);
  assert.equal(layout.relationLabelWidth, 84);
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
  assert.deepEqual(localized.relationLineCapacities, [8]);
  assert.equal(localized.cardHeight, 148);
});

test("political group cards occupy one overview slot without faction relationship rows", () => {
  const layout = politicsCardGridLayout({
    panelWidth: 439,
    panelHeight: 240,
    lineHeight: 11,
    pagerHeight: 24,
    newsHeight: 12,
    contentTop: 26
  });
  const group = {
    kind: "political-group",
    id: "political-group:holy-roman-empire"
  };
  const [entry] = politicsCardEntries([group], {
    tokensPerLine: layout.tokensPerLine,
    fullWidthTokensPerLine: layout.fullWidthTokensPerLine,
    maxColumnSpan: layout.columns,
    relationLineCapacities: layout.relationLineCapacities,
    powerCount: 2
  });

  assert.equal(layout.contentTop, 26);
  assert.equal(entry.card, group);
  assert.equal(entry.rowSpan, 1);
  assert.equal(entry.columnSpan, 1);
  assert.deepEqual(entry.lines, []);
  assert.throws(
    () => politicsCardEntries([{ kind: "unknown" }], {
      tokensPerLine: layout.tokensPerLine,
      fullWidthTokensPerLine: layout.fullWidthTokensPerLine,
      maxColumnSpan: layout.columns,
      relationLineCapacities: layout.relationLineCapacities,
      powerCount: 2
    }),
    /Unknown politics card kind/
  );
});

test("politics pager provides first, five-page, and single-page controls on compact panels", () => {
  const layout = politicsPagerButtonLayout({
    panelX: 10,
    panelWidth: 340,
    pagerY: 220,
    buttonWidth: 30,
    buttonHeight: 24
  });

  assert.equal(POLITICS_PAGE_JUMP, 5);
  assert.deepEqual(
    Object.values(layout).map((rect) => rect.x),
    [22, 54, 86, 244, 276, 308]
  );
  assert.ok(layout.previous.x + layout.previous.w < layout.next.x);
  assert.equal(layout.first.y, 220);
  assert.equal(layout.last.w, 30);
  assert.equal(layout.last.h, 24);

  const narrow = politicsPagerButtonLayout({
    panelX: 8,
    panelWidth: 240,
    pagerY: 420,
    buttonWidth: 24,
    buttonHeight: 24
  });
  assert.deepEqual(
    Object.values(narrow).map((rect) => rect.x),
    [20, 46, 72, 160, 186, 212]
  );
  assert.equal(narrow.next.x - (narrow.previous.x + narrow.previous.w), 64);
});

test("the elected Emperor's Estate connections fit the live politics layouts", () => {
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      id: "player:joan-alden",
      name: "Joan Alden",
      nationalityId: "england",
      homePortCityId: "london|united kingdom",
      homePortTileId: 1,
      homePortName: "London",
      homePortCountry: "United Kingdom",
      expressions: ["neutral", "happy"]
    }
  });
  const view = createPoliticsView(state);

  for (const lineHeight of [11, 14]) {
    const layout = politicsCardGridLayout({
      panelWidth: 464,
      panelHeight: 254,
      lineHeight,
      pagerHeight: 24,
      newsHeight: 12
    });
    const entries = politicsCardEntries(view.cards, {
      tokensPerLine: layout.tokensPerLine,
      fullWidthTokensPerLine: layout.fullWidthTokensPerLine,
      maxColumnSpan: layout.columns,
      relationLineCapacities: layout.relationLineCapacities,
      powerCount: view.powers.length
    });
    const emperor = entries.find((entry) => (
      entry.card.faction.id === "burgundian-netherlands"
    ));

    assert.ok(emperor);
    assert.equal(
      emperor.card.constitutionalConnections.length,
      IMPERIAL_ESTATES_1522.length - 1
    );
    assert.ok(emperor.rowSpan <= layout.rows);
    assert.ok(emperor.columnSpan <= layout.columns);
  }
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
    fullWidthTokensPerLine: 15,
    maxColumnSpan: 2,
    relationLineCapacities: [5, 12],
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
    fullWidthTokensPerLine: 10,
    maxColumnSpan: 2,
    relationLineCapacities: [4, 11],
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
    fullWidthTokensPerLine: 10,
    maxColumnSpan: 2,
    relationLineCapacities: [5, 12],
    powerCount: 40
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].rowSpan, 2);
  assert.deepEqual(
    entries[0].lines.flatMap((line) => line.factionIds),
    [...ids("w", 8), ...ids("h", 8), ...ids("a", 8), ...ids("f", 8)]
  );
});

test("a dense country uses the header space freed by a double-height card", () => {
  const ottoman = card({
    dependencies: Array.from({ length: 6 }, (_unused, index) =>
      dependency("autonomous-vassal", "suzerain", `subject-${index}`, {
        tribute: index % 2 === 0,
        mutualDefense: index % 3 !== 0
      })),
    relationships: [
      relationship("war", ["war-0"]),
      relationship("hostile", ["hostile-0"]),
      relationship("ally", ["ally-0"])
    ]
  });
  const [entry] = politicsCardEntries([ottoman], {
    tokensPerLine: 4,
    fullWidthTokensPerLine: 10,
    maxColumnSpan: 2,
    relationLineCapacities: [4, 11],
    powerCount: 20
  });

  assert.equal(entry.lines.length, 7);
  assert.equal(entry.rowSpan, 2);
});

test("an exceptionally connected country expands across the full page", () => {
  const connected = card({
    relationships: [
      relationship("war", ids("w", 15)),
      relationship("hostile", ids("h", 15)),
      relationship("ally", ids("a", 15)),
      relationship("friendly", ids("f", 15))
    ]
  });
  const [entry] = politicsCardEntries([connected], {
    tokensPerLine: 4,
    fullWidthTokensPerLine: 10,
    maxColumnSpan: 2,
    relationLineCapacities: [4, 11],
    powerCount: 80
  });

  assert.equal(entry.lines.length, 8);
  assert.equal(entry.columnSpan, 2);
  assert.equal(entry.rowSpan, 2);
  const pages = politicsCardEntriesPage([
    entry,
    { card: { faction: { id: "next" } }, rowSpan: 1, columnSpan: 1, lines: [] }
  ], 0, { columns: 2, rows: 2 });
  assert.equal(pages.pageCount, 2);
  assert.equal(pages.entries.length, 1);
  assert.equal(pages.entries[0].columnSpan, 2);
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

function card({ dependencies = [], embargoConnections = [], relationships = [] }) {
  return {
    kind: "faction",
    dependencies,
    constitutionalConnections: [],
    embargoConnections,
    relationships
  };
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

test("politics cards retain separate arms, import and naval restrictions against the same realm", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const memory = state.relations.tradeEmbargoes;
  const papal = memory.orders.find((order) => order.authorityKind === "papal");
  assert.ok(papal);
  memory.orders.push({ ...papal, id: `${papal.id}-national`, authorityKind: "national",
    restrictionKind: "enemy-imports", scope: "all-goods", followerFactionIds: ["papal-states"] });
  memory.orders.push({ ...papal, id: `${papal.id}-blockade`, authorityKind: "national",
    restrictionKind: "naval-blockade", scope: "all-goods", followerFactionIds: ["papal-states"] });
  const view = createPoliticsView(state);
  const papalCard = view.cards.find((entry) => entry.faction?.id === "papal-states");
  const targetCard = view.cards.find((entry) => entry.faction?.id === papal.targetFactionId);
  for (const [country, role] of [[papalCard, "issuer"], [targetCard, "target"]]) {
    const connections = country.embargoConnections.filter((entry) => entry.role === role &&
      entry.factionId === (role === "issuer" ? papal.targetFactionId : "papal-states"));
    assert.equal(connections.length, 3);
    const entries = politicsCardEntries([country], {
      tokensPerLine: 4, fullWidthTokensPerLine: 13, maxColumnSpan: 2, relationLineCapacities: [8], powerCount: view.powers.length
    });
    const lines = entries.flatMap((entry) => entry.lines).filter((line) => line.type === "embargo" && line.role === role);
    assert.equal(lines.length, 3);
    assert.deepEqual(new Set(lines.map(politicsEmbargoLabelKey)), new Set(role === "issuer"
      ? ["politics.armsBan", "politics.importBan", "politics.blockade"]
      : ["politics.armsBanBy", "politics.importBanBy", "politics.blockadeBy"]));
  }
});

test("restriction labels distinguish role and commodity scope, rejecting unknown contracts", () => {
  for (const [restrictionKind, scope, label] of [
    ["strategic-exports", "war-materiel", "armsBan"], ["strategic-exports", "all-goods", "exportBan"],
    ["enemy-imports", "all-goods", "importBan"], ["naval-blockade", "all-goods", "blockade"]
  ]) for (const [role, suffix] of [["issuer", ""], ["target", "By"], ["follower", "Enforced"]]) {
    assert.equal(politicsEmbargoLabelKey({ kind: "trade-embargo", role, restrictionKind, scope }), `politics.${label}${suffix}`);
  }
  const line = { kind: "trade-embargo", role: "issuer", restrictionKind: "strategic-exports", scope: "war-materiel" };
  for (const key of ["kind", "role", "restrictionKind", "scope"]) {
    assert.throws(() => politicsEmbargoLabelKey({ ...line, [key]: "unknown" }), /Unknown politics embargo/);
  }
});

test("crowded politics cards continue across numbered pages without losing or duplicating any tie", () => {
  const country = card({
    relationships: [relationship("friendly", ids("friend", 48)), relationship("hostile", ids("foe", 42))],
    embargoConnections: Array.from({ length: 48 }, (_unused, index) => ({
      kind: "trade-embargo", authorityKind: "national", role: ["issuer", "target", "follower"][index % 3],
      restrictionKind: index % 2 ? "enemy-imports" : "strategic-exports",
      scope: index % 2 ? "all-goods" : "war-materiel", factionId: `embargo${index}`
    }))
  });
  for (const [panelWidth, lineHeight] of [[439, 11], [439, 14], [340, 14]]) {
    const layout = politicsCardGridLayout({ panelWidth, panelHeight: 240, lineHeight, pagerHeight: 24, newsHeight: 12 });
    const entries = politicsCardEntries([country], { ...layout, maxColumnSpan: layout.columns, powerCount: 150 });
    assert.ok(entries.length > 1);
    assert.ok(entries.every((entry, index) => entry.card === country && entry.partIndex === index &&
      entry.partCount === entries.length && entry.lines.length <= layout.relationLineCapacities.at(-1)));
    const firstPage = politicsCardEntriesPage(entries, 0, layout);
    const seen = [];
    for (let page = 0; page < firstPage.pageCount; page++) {
      const current = politicsCardEntriesPage(entries, page, layout);
      seen.push(...current.entries.flatMap((entry) => entry.lines).flatMap((line) => line.factionIds));
    }
    assert.deepEqual([...seen].sort(), [...ids("friend", 48), ...ids("foe", 42), ...ids("embargo", 48)].sort());
    assert.equal(new Set(seen).size, seen.length);
  }
});
