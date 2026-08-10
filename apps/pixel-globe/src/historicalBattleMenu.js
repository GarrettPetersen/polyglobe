export const HISTORICAL_BATTLE_SCREEN_MAP = "historical-map";
export const HISTORICAL_BATTLE_SCREEN_COMMANDERS = "historical-commanders";

const PANEL_MARGIN = 6;
const PANEL_MAX_WIDTH = 440;
const PANEL_MAX_HEIGHT = 244;
const MAP_ASPECT_RATIO = 80 / 29;
const COMMANDER_COLUMN_GAP = 5;
const COMMANDER_ROW_GAP = 3;

export function historicalBattleMenuPanelRect(screenWidth, screenHeight) {
  assertPositiveInteger(screenWidth, "Historical battle screen width");
  assertPositiveInteger(screenHeight, "Historical battle screen height");
  const width = Math.min(PANEL_MAX_WIDTH, screenWidth - PANEL_MARGIN * 2);
  const height = Math.min(PANEL_MAX_HEIGHT, screenHeight - PANEL_MARGIN * 2);
  if (width < 120 || height < 120) {
    throw new Error(`Historical battle menu viewport is too small: ${screenWidth}x${screenHeight}`);
  }
  return {
    x: Math.floor((screenWidth - width) / 2),
    y: Math.floor((screenHeight - height) / 2),
    w: width,
    h: height
  };
}

export function historicalBattleMapMenuLayout(panel) {
  assertRect(panel, "Historical battle map panel");
  const mapWidth = panel.w - 20;
  const mapHeight = Math.min(
    Math.floor(mapWidth / MAP_ASPECT_RATIO),
    panel.h - 61
  );
  const backY = panel.y + panel.h - 28;
  const mapTop = panel.y + 25;
  const mapBottom = backY - 6;
  const mapRect = {
    x: panel.x + 10,
    y: mapTop + Math.floor((mapBottom - mapTop - mapHeight) / 2),
    w: mapWidth,
    h: mapHeight
  };
  const backRect = {
    x: panel.x + Math.floor((panel.w - Math.min(132, panel.w - 20)) / 2),
    y: backY,
    w: Math.min(132, panel.w - 20),
    h: 22
  };
  return { mapRect, backRect };
}

export function historicalBattleMarkerPoint(marker, mapRect, maximumLatitudeDeg = 72) {
  if (!Number.isFinite(marker?.longitudeDeg) || !Number.isFinite(marker?.latitudeDeg)) {
    throw new Error("Historical battle map marker needs finite coordinates");
  }
  assertRect(mapRect, "Historical battle map marker bounds");
  if (!Number.isFinite(maximumLatitudeDeg) || maximumLatitudeDeg <= 0 || maximumLatitudeDeg > 90) {
    throw new Error(`Invalid historical battle map latitude limit: ${maximumLatitudeDeg}`);
  }
  const longitude = wrapLongitude(marker.longitudeDeg);
  const latitude = Math.max(-maximumLatitudeDeg, Math.min(maximumLatitudeDeg, marker.latitudeDeg));
  return {
    x: mapRect.x + (longitude + 180) / 360 * mapRect.w,
    y: mapRect.y + (maximumLatitudeDeg - latitude) / (maximumLatitudeDeg * 2) * mapRect.h
  };
}

export function historicalBattleCommanderMenuLayout(panel, commanderCount) {
  assertRect(panel, "Historical battle commander panel");
  if (!Number.isInteger(commanderCount) || commanderCount <= 0 || commanderCount % 2 !== 0) {
    throw new Error(`Historical battle commander count must split evenly: ${commanderCount}`);
  }
  const rows = commanderCount / 2;
  const contentX = panel.x + 8;
  const contentY = panel.y + 51;
  const contentWidth = panel.w - 16;
  const contentBottom = panel.y + panel.h - 31;
  const contentHeight = contentBottom - contentY;
  const cardWidth = Math.floor((contentWidth - COMMANDER_COLUMN_GAP) / 2);
  const cardHeight = Math.floor(
    (contentHeight - COMMANDER_ROW_GAP * (rows - 1)) / rows
  );
  if (cardWidth < 50 || cardHeight < 34) {
    throw new Error(`Historical commander cards cannot fit ${commanderCount} entries`);
  }
  const cardRects = Array.from({ length: commanderCount }, (_, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    return {
      x: contentX + column * (cardWidth + COMMANDER_COLUMN_GAP),
      y: contentY + row * (cardHeight + COMMANDER_ROW_GAP),
      w: cardWidth,
      h: cardHeight
    };
  });
  const backWidth = Math.min(132, panel.w - 20);
  return {
    cardRects,
    sideHeadingRects: [
      {
        x: cardRects[0].x,
        y: panel.y + 29,
        w: cardWidth,
        h: contentY - panel.y - 31
      },
      {
        x: cardRects[rows].x,
        y: panel.y + 29,
        w: cardWidth,
        h: contentY - panel.y - 31
      }
    ],
    sideHeadingCenters: [
      cardRects[0].x + cardWidth / 2,
      cardRects[rows].x + cardWidth / 2
    ],
    backRect: {
      x: panel.x + Math.floor((panel.w - backWidth) / 2),
      y: panel.y + panel.h - 26,
      w: backWidth,
      h: 21
    }
  };
}

export function stepHistoricalBattleCommanderIndex(currentIndex, key, commanderCount) {
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex > commanderCount) {
    throw new Error(`Invalid historical commander selection: ${currentIndex}`);
  }
  if (!Number.isInteger(commanderCount) || commanderCount <= 0 || commanderCount % 2 !== 0) {
    throw new Error(`Historical battle commander count must split evenly: ${commanderCount}`);
  }
  const backIndex = commanderCount;
  const rows = commanderCount / 2;
  if (currentIndex === backIndex) {
    if (key === "ArrowUp") return rows - 1;
    if (key === "ArrowDown") return 0;
    return backIndex;
  }
  const column = Math.floor(currentIndex / rows);
  const row = currentIndex % rows;
  if (key === "ArrowLeft" || key === "ArrowRight") {
    return (column === 0 ? 1 : 0) * rows + row;
  }
  if (key === "ArrowUp") return row === 0 ? backIndex : currentIndex - 1;
  if (key === "ArrowDown") return row === rows - 1 ? backIndex : currentIndex + 1;
  return currentIndex;
}

function wrapLongitude(longitudeDeg) {
  return ((longitudeDeg + 180) % 360 + 360) % 360 - 180;
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
}

function assertRect(rect, label) {
  if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
      !Number.isFinite(rect.w) || !Number.isFinite(rect.h) || rect.w <= 0 || rect.h <= 0) {
    throw new Error(`${label} is invalid`);
  }
}
