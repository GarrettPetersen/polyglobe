import { clampMenuIndex } from "./menuNavigation.js";

const PANEL_PAD_X = 10;
const CARD_GAP = 6;
const CONTENT_TOP = 39;
const CARD_MIN_WIDTH = 188;
const CARD_MAX_COLUMNS = 4;
const CARD_LABEL_WIDTH = 70;
const CARD_TOKEN_WIDTH = 24;
const CARD_RELATION_LINES = 4;
const RELATION_TEXT_COLORS = Object.freeze({
  ally: "#165a4c",
  friendly: "#4c3e24",
  hostile: "#7a3045",
  war: "#6e2727",
  neutral: "#3e3546"
});

export const POLITICS_DEPENDENCY_TEXT_COLOR = "#2e222f";

export function politicsRelationTextColor(relation) {
  const color = RELATION_TEXT_COLORS[relation];
  if (!color) throw new Error(`Unknown political relation: ${relation}`);
  return color;
}

export function politicsCardGridLayout({
  panelWidth,
  panelHeight,
  lineHeight,
  pagerHeight,
  newsHeight = 0
}) {
  for (const [label, value] of Object.entries({
    panelWidth,
    panelHeight,
    lineHeight,
    pagerHeight,
    newsHeight
  })) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Politics card ${label} must be a non-negative integer: ${value}`);
    }
  }
  if (panelWidth === 0 || panelHeight === 0 || lineHeight === 0 || pagerHeight === 0) {
    throw new Error("Politics card dimensions must be positive");
  }

  const contentWidth = panelWidth - PANEL_PAD_X * 2;
  const columns = Math.max(1, Math.min(
    CARD_MAX_COLUMNS,
    Math.floor((contentWidth + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP))
  ));
  const cardWidth = Math.floor((contentWidth - CARD_GAP * (columns - 1)) / columns);
  const tokensPerLine = Math.max(
    1,
    Math.floor((cardWidth - 8 - CARD_LABEL_WIDTH) / CARD_TOKEN_WIDTH)
  );
  const headerHeight = Math.max(26, lineHeight * 2 + 4);
  let maxRelationLines = CARD_RELATION_LINES;
  let cardHeight = headerHeight + maxRelationLines * lineHeight + 4;
  const contentHeight = panelHeight - CONTENT_TOP - pagerHeight - 8 - newsHeight;
  const rows = Math.max(1, Math.floor((contentHeight + CARD_GAP) / (cardHeight + CARD_GAP)));
  if (cardHeight > contentHeight) {
    throw new Error(`Politics country card does not fit panel: ${cardHeight} > ${contentHeight}`);
  }
  if (rows === 1) {
    maxRelationLines = Math.max(
      CARD_RELATION_LINES,
      Math.floor((contentHeight - headerHeight - 4) / lineHeight)
    );
    cardHeight = headerHeight + maxRelationLines * lineHeight + 4;
  }

  return Object.freeze({
    panelPadX: PANEL_PAD_X,
    cardGap: CARD_GAP,
    contentTop: CONTENT_TOP,
    columns,
    rows,
    slotsPerPage: columns * rows,
    cardWidth,
    cardHeight,
    headerHeight,
    relationLineHeight: lineHeight,
    relationLabelWidth: CARD_LABEL_WIDTH,
    relationTokenWidth: CARD_TOKEN_WIDTH,
    tokensPerLine,
    maxRelationLines
  });
}

export function politicsCardEntries(cards, {
  tokensPerLine,
  maxRelationLines,
  maxRowSpan,
  powerCount
}) {
  if (!Array.isArray(cards)) throw new Error("Politics card entries require cards");
  if (!Number.isInteger(tokensPerLine) || tokensPerLine <= 0) {
    throw new Error(`Politics card tokens per line must be positive: ${tokensPerLine}`);
  }
  if (!Number.isInteger(maxRelationLines) || maxRelationLines <= 0) {
    throw new Error(`Politics card relation lines must be positive: ${maxRelationLines}`);
  }
  if (!Number.isInteger(powerCount) || powerCount <= 0) {
    throw new Error(`Politics card power count must be positive: ${powerCount}`);
  }
  if (!Number.isInteger(maxRowSpan) || maxRowSpan <= 0) {
    throw new Error(`Politics card row span must be positive: ${maxRowSpan}`);
  }

  return Object.freeze(cards.map((card) => {
    const lines = relationshipLines(card, tokensPerLine, powerCount);
    const rowSpan = Math.max(1, Math.ceil(lines.length / maxRelationLines));
    if (rowSpan > maxRowSpan) {
      throw new Error(
        `Politics country card needs ${rowSpan} rows but only ${maxRowSpan} fit: ${card.faction?.id || "unknown"}`
      );
    }
    return Object.freeze({
      card,
      rowSpan,
      lines: Object.freeze(lines)
    });
  }));
}

export function politicsCardEntriesPage(entries, page, { columns, rows }) {
  if (!Array.isArray(entries)) throw new Error("Invalid politics card entries");
  if (!Number.isInteger(page)) throw new Error(`Invalid politics page: ${page}`);
  if (!Number.isInteger(columns) || columns <= 0 || !Number.isInteger(rows) || rows <= 0) {
    throw new Error(`Invalid politics card grid: ${columns}x${rows}`);
  }
  const packedPages = packPoliticsCardPages(entries, columns, rows);
  const pageCount = packedPages.length;
  const normalizedPage = clampMenuIndex(page, pageCount);
  return Object.freeze({
    page: normalizedPage,
    pageCount,
    entries: packedPages[normalizedPage]
  });
}

function packPoliticsCardPages(entries, columns, rows) {
  if (entries.length === 0) return Object.freeze([Object.freeze([])]);
  const pages = [];
  let occupancy = emptyGrid(columns, rows);
  let pageEntries = [];

  for (const entry of entries) {
    if (!Number.isInteger(entry.rowSpan) || entry.rowSpan <= 0 || entry.rowSpan > rows) {
      throw new Error(`Politics card cannot fit grid row span: ${entry.rowSpan}`);
    }
    let slot = firstPoliticsCardSlot(occupancy, columns, rows, entry.rowSpan);
    if (!slot) {
      pages.push(Object.freeze(pageEntries));
      occupancy = emptyGrid(columns, rows);
      pageEntries = [];
      slot = firstPoliticsCardSlot(occupancy, columns, rows, entry.rowSpan);
    }
    if (!slot) throw new Error(`Politics card could not be packed: ${entry.card?.faction?.id || "unknown"}`);
    for (let row = slot.row; row < slot.row + entry.rowSpan; row += 1) {
      occupancy[row][slot.column] = true;
    }
    pageEntries.push(Object.freeze({ ...entry, ...slot }));
  }
  if (pageEntries.length > 0) pages.push(Object.freeze(pageEntries));
  return Object.freeze(pages);
}

function emptyGrid(columns, rows) {
  return Array.from({ length: rows }, () => Array(columns).fill(false));
}

function firstPoliticsCardSlot(occupancy, columns, rows, rowSpan) {
  for (let row = 0; row <= rows - rowSpan; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let free = true;
      for (let occupiedRow = row; occupiedRow < row + rowSpan; occupiedRow += 1) {
        if (occupancy[occupiedRow][column]) {
          free = false;
          break;
        }
      }
      if (free) return Object.freeze({ row, column });
    }
  }
  return null;
}

function relationshipLines(card, tokensPerLine, powerCount) {
  if (!card || !Array.isArray(card.dependencies) || !Array.isArray(card.relationships)) {
    throw new Error("Invalid politics country card");
  }
  const lines = [];
  const dependencyGroups = new Map();
  for (const dependency of card.dependencies) {
    const termsKey = dependency.terms
      ? `${dependency.terms.foreignPolicy}:${Number(dependency.terms.tribute)}:${Number(dependency.terms.mutualDefense)}:${Number(dependency.terms.offensiveWarObligation)}`
      : "legacy";
    const key = `${dependency.kind}:${dependency.role}:${termsKey}`;
    if (!dependencyGroups.has(key)) {
      dependencyGroups.set(key, {
        type: "dependency",
        kind: dependency.kind,
        role: dependency.role,
        terms: dependency.terms || null,
        factionIds: []
      });
    }
    dependencyGroups.get(key).factionIds.push(dependency.factionId);
  }
  for (const group of dependencyGroups.values()) {
    pushFactionLines(lines, group, tokensPerLine);
  }
  for (const relationship of card.relationships) {
    const allPowers = relationship.relation === "war" &&
      relationship.factionIds.length === powerCount - 1;
    if (allPowers) {
      lines.push(Object.freeze({
        type: "relationship",
        relation: relationship.relation,
        factionIds: Object.freeze([]),
        allPowers: true
      }));
      continue;
    }
    pushFactionLines(lines, {
      type: "relationship",
      relation: relationship.relation,
      factionIds: relationship.factionIds
    }, tokensPerLine);
  }
  return lines;
}

function pushFactionLines(lines, group, tokensPerLine) {
  for (let start = 0; start < group.factionIds.length; start += tokensPerLine) {
    lines.push(Object.freeze({
      ...group,
      factionIds: Object.freeze(group.factionIds.slice(start, start + tokensPerLine))
    }));
  }
}
