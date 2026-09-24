export const OPTIONS_MENU_ROW = Object.freeze({
  QUIT: "quit",
  WISHLIST: "wishlist",
  FULLSCREEN: "fullscreen",
  MUSIC: "music",
  SFX: "sfx",
  MUTE: "mute",
  LANGUAGE: "language",
  CONTROL_SCHEME: "control-scheme",
  AUTO_ROW: "auto-row",
  CONTROLLER_ICONS: "controller-icons",
  CONTROLS: "controls",
  DIAGNOSTIC_MODE: "diagnostic-mode",
  TELEMETRY: "telemetry",
  START_MENU: "start-menu"
});

export function optionsMenuRowOrder({ showWishlist, desktop }) {
  if (typeof showWishlist !== "boolean" || typeof desktop !== "boolean") {
    throw new Error("Options menu ordering requires boolean platform features");
  }
  return Object.freeze([
    ...(desktop ? [OPTIONS_MENU_ROW.QUIT] : []),
    ...(showWishlist ? [OPTIONS_MENU_ROW.WISHLIST] : []),
    OPTIONS_MENU_ROW.FULLSCREEN,
    OPTIONS_MENU_ROW.MUSIC,
    OPTIONS_MENU_ROW.SFX,
    OPTIONS_MENU_ROW.MUTE,
    OPTIONS_MENU_ROW.LANGUAGE,
    OPTIONS_MENU_ROW.CONTROL_SCHEME,
    OPTIONS_MENU_ROW.AUTO_ROW,
    OPTIONS_MENU_ROW.CONTROLLER_ICONS,
    OPTIONS_MENU_ROW.CONTROLS,
    OPTIONS_MENU_ROW.DIAGNOSTIC_MODE,
    OPTIONS_MENU_ROW.TELEMETRY,
    OPTIONS_MENU_ROW.START_MENU
  ]);
}

export function optionsMenuRowIndex(order, rowId, { optional = false } = {}) {
  if (!Array.isArray(order) || order.length === 0) {
    throw new Error("Options menu row lookup requires a non-empty order");
  }
  const index = order.indexOf(rowId);
  if (index < 0 && !optional) throw new Error(`Options menu row is unavailable: ${rowId}`);
  return index;
}
