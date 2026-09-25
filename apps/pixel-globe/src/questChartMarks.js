export const QUEST_CHART_SHAPES = Object.freeze([
  "diamond",
  "square",
  "plus",
  "circle",
  "cross"
]);

export const QUEST_CHART_MARK_SIZE = 5;
export const QUEST_CHART_LINK_COLOR = "#ffe566";
export const QUEST_CHART_LINK_SHADOW = "#211814";

const QUEST_CHART_MARK_ROWS = Object.freeze({
  diamond: Object.freeze(["  #  ", " ### ", "#####", " ### ", "  #  "]),
  square: Object.freeze(["#####", "#   #", "#   #", "#   #", "#####"]),
  plus: Object.freeze(["  #  ", "  #  ", "#####", "  #  ", "  #  "]),
  circle: Object.freeze([" ### ", "#   #", "#   #", "#   #", " ### "]),
  cross: Object.freeze(["#   #", " # # ", "  #  ", " # # ", "#   #"])
});

const QUEST_CHART_SHAPE_BY_ROLE = Object.freeze({
  quest: "diamond",
  campaign: "square",
  colonization: "plus",
  optional: "circle",
  naturalist: "cross"
});

export function questChartShapeForRole(role) {
  const shape = QUEST_CHART_SHAPE_BY_ROLE[role];
  if (!shape) throw new Error(`Unknown quest chart role: ${role}`);
  return shape;
}

export function questChartMarkPixels(shape) {
  const rows = QUEST_CHART_MARK_ROWS[shape];
  if (!rows) throw new Error(`Unknown quest chart mark: ${shape}`);
  const pixels = [];
  rows.forEach((row, y) => {
    if (row.length !== QUEST_CHART_MARK_SIZE) {
      throw new Error(`Quest chart mark ${shape} must be ${QUEST_CHART_MARK_SIZE} pixels wide`);
    }
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === " ") continue;
      if (row[x] !== "#") throw new Error(`Quest chart mark ${shape} has an invalid pixel`);
      pixels.push(Object.freeze({ x, y, tone: y < 2 ? "light" : "dark" }));
    }
  });
  if (pixels.length === 0) throw new Error(`Quest chart mark ${shape} is empty`);
  return Object.freeze(pixels);
}

export function normalizeQuestChartId(entryId) {
  if (typeof entryId !== "string" || entryId.length === 0) {
    throw new Error("Quest chart entry id must be a non-empty string");
  }
  let id = entryId;
  if (id.startsWith("fetch:")) id = id.slice("fetch:".length);
  if (id.startsWith("travel:")) id = `quest:${id.slice("travel:".length)}`;
  return id;
}

export function questChartIdsAssociate(leftId, rightId) {
  return normalizedIdsAssociate(normalizeQuestChartId(leftId), normalizeQuestChartId(rightId));
}

export function questChartSelectableKeys(journalIds, navigationIds) {
  if (!Array.isArray(journalIds) || !Array.isArray(navigationIds)) {
    throw new Error("Quest chart selection requires journal and navigation ids");
  }
  const navigationKeys = navigationIds.map(normalizeQuestChartId);
  const keys = [];
  for (const journalId of journalIds) {
    const key = normalizeQuestChartId(journalId);
    if (keys.includes(key)) continue;
    if (navigationKeys.some((markerKey) => normalizedIdsAssociate(key, markerKey))) keys.push(key);
  }
  return keys;
}

export function stepQuestChartSelection(keys, currentKey, direction) {
  if (!Array.isArray(keys)) throw new Error("Quest chart selection requires a key list");
  if (direction !== 1 && direction !== -1) {
    throw new Error(`Quest chart selection direction must be -1 or 1: ${direction}`);
  }
  if (keys.length === 0) return null;
  const index = keys.indexOf(currentKey);
  const nextIndex = index < 0
    ? (direction > 0 ? 0 : keys.length - 1)
    : (index + direction + keys.length) % keys.length;
  return keys[nextIndex];
}

export function questChartHighlight(hoverKey, selectionKey) {
  return hoverKey || selectionKey || null;
}

export function questChartHoverKey(point, rows, marks) {
  if (!point) return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Quest chart hover point must be finite");
  }
  if (!Array.isArray(rows) || !Array.isArray(marks)) {
    throw new Error("Quest chart hover requires journal rows and map marks");
  }
  for (const row of rows) {
    if (!rectContainsPoint(row, point)) continue;
    if (marks.some((mark) => normalizedIdsAssociate(row.key, mark.key))) return row.key;
  }
  for (let index = marks.length - 1; index >= 0; index -= 1) {
    const mark = marks[index];
    if (Math.abs(point.x - mark.x) <= 5 && Math.abs(point.y - mark.y) <= 5) return mark.key;
  }
  return null;
}

export function questChartTextRect(rows, highlightKey) {
  if (!highlightKey) return null;
  if (!Array.isArray(rows)) throw new Error("Quest chart text rows must be an array");
  const matched = rows.filter((row) => normalizedIdsAssociate(row.key, highlightKey));
  if (matched.length === 0) return null;
  const left = Math.min(...matched.map((row) => row.x));
  const top = Math.min(...matched.map((row) => row.y));
  const right = Math.max(...matched.map((row) => row.x + row.w));
  const bottom = Math.max(...matched.map((row) => row.y + row.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export function questChartLinkSegments(textRect, marks, highlightKey) {
  if (!textRect || !highlightKey) return [];
  if (!Array.isArray(marks)) throw new Error("Quest chart link marks must be an array");
  const originX = textRect.x + textRect.w / 2;
  const originY = textRect.y;
  return marks
    .filter((mark) => normalizedIdsAssociate(mark.key, highlightKey))
    .map((mark) => ({
      x0: originX,
      y0: originY,
      x1: mark.x,
      y1: mark.y
    }))
    .filter((segment) => Math.hypot(segment.x1 - segment.x0, segment.y1 - segment.y0) >= 8);
}

function normalizedIdsAssociate(left, right) {
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = shorter === left ? right : left;
  if (!longer.startsWith(shorter) || longer.length === shorter.length) return false;
  const boundary = longer[shorter.length];
  return boundary === ":" || boundary === ".";
}

function rectContainsPoint(rect, point) {
  return point.x >= rect.x &&
    point.y >= rect.y &&
    point.x < rect.x + rect.w &&
    point.y < rect.y + rect.h;
}
