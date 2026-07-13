const HUD_MARGIN_PX = 4;
const HUD_PANEL_HEIGHT_PX = 24;
const HUD_PANEL_GAP_PX = 4;
const HUD_INNER_PADDING_PX = 4;
const HUD_MINIMUM_PANEL_WIDTH_PX = 136;
const HUD_SPLIT_CENTER_GAP_PX = 24;
const HUD_PAUSE_BUTTON_SIZE_PX = 22;

export function lakeBattleHudLayout({ screenWidth, labelWidths }) {
  if (!Number.isInteger(screenWidth) || screenWidth <= 0) {
    throw new Error(`Invalid lake battle HUD width: ${screenWidth}`);
  }
  if (!Array.isArray(labelWidths) || labelWidths.length !== 2) {
    throw new Error("Lake battle HUD requires exactly two label widths");
  }
  for (const width of labelWidths) {
    if (!Number.isFinite(width) || width < 0) {
      throw new Error(`Invalid lake battle HUD label width: ${width}`);
    }
  }

  const requiredPanelWidth = Math.max(
    HUD_MINIMUM_PANEL_WIDTH_PX,
    Math.ceil(Math.max(...labelWidths)) + HUD_INNER_PADDING_PX * 2
  );
  const maximumSplitPanelWidth = Math.floor(
    (screenWidth - HUD_MARGIN_PX * 2 - HUD_SPLIT_CENTER_GAP_PX) / 2
  );
  const stacked = requiredPanelWidth > maximumSplitPanelWidth;
  const panelWidth = stacked
    ? screenWidth - HUD_MARGIN_PX * 2
    : requiredPanelWidth;
  if (panelWidth <= HUD_INNER_PADDING_PX * 2) {
    throw new Error(`Lake battle HUD has no usable inner width: ${screenWidth}`);
  }

  const player = {
    x: HUD_MARGIN_PX,
    y: HUD_MARGIN_PX,
    w: panelWidth,
    h: HUD_PANEL_HEIGHT_PX,
    alignRight: false
  };
  const enemy = {
    x: stacked ? HUD_MARGIN_PX : screenWidth - HUD_MARGIN_PX - panelWidth,
    y: stacked
      ? HUD_MARGIN_PX + HUD_PANEL_HEIGHT_PX + HUD_PANEL_GAP_PX
      : HUD_MARGIN_PX,
    w: panelWidth,
    h: HUD_PANEL_HEIGHT_PX,
    alignRight: true
  };
  const hudBottom = enemy.y + enemy.h;
  const pauseButton = {
    x: screenWidth - HUD_MARGIN_PX - HUD_PAUSE_BUTTON_SIZE_PX,
    y: hudBottom + HUD_PANEL_GAP_PX,
    w: HUD_PAUSE_BUTTON_SIZE_PX,
    h: HUD_PAUSE_BUTTON_SIZE_PX
  };

  return { stacked, player, enemy, pauseButton };
}
