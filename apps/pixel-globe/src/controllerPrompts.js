export const CONTROLLER_FAMILY = Object.freeze({
  XBOX: "xbox",
  PLAYSTATION: "playstation",
  NINTENDO: "nintendo",
  GENERIC: "generic"
});

export const CONTROLLER_GLYPH_PREFERENCE = Object.freeze({
  AUTOMATIC: "automatic",
  XBOX: CONTROLLER_FAMILY.XBOX,
  PLAYSTATION: CONTROLLER_FAMILY.PLAYSTATION,
  NINTENDO: CONTROLLER_FAMILY.NINTENDO,
  GENERIC: CONTROLLER_FAMILY.GENERIC
});

const CONTROLLER_GLYPH_PREFERENCES = Object.freeze(Object.values(CONTROLLER_GLYPH_PREFERENCE));

const STEAM_INPUT_TYPE_FAMILY = Object.freeze({
  1: CONTROLLER_FAMILY.GENERIC,
  2: CONTROLLER_FAMILY.XBOX,
  3: CONTROLLER_FAMILY.XBOX,
  4: CONTROLLER_FAMILY.XBOX,
  5: CONTROLLER_FAMILY.PLAYSTATION,
  8: CONTROLLER_FAMILY.NINTENDO,
  9: CONTROLLER_FAMILY.NINTENDO,
  10: CONTROLLER_FAMILY.NINTENDO,
  12: CONTROLLER_FAMILY.PLAYSTATION,
  13: CONTROLLER_FAMILY.PLAYSTATION,
  14: CONTROLLER_FAMILY.XBOX
});

const STEAM_INPUT_NAME_FAMILY = Object.freeze({
  steamcontroller: CONTROLLER_FAMILY.GENERIC,
  xbox360controller: CONTROLLER_FAMILY.XBOX,
  xboxonecontroller: CONTROLLER_FAMILY.XBOX,
  genericxinput: CONTROLLER_FAMILY.XBOX,
  ps3controller: CONTROLLER_FAMILY.PLAYSTATION,
  ps4controller: CONTROLLER_FAMILY.PLAYSTATION,
  ps5controller: CONTROLLER_FAMILY.PLAYSTATION,
  switchjoyconpair: CONTROLLER_FAMILY.NINTENDO,
  switchjoyconsingle: CONTROLLER_FAMILY.NINTENDO,
  switchprocontroller: CONTROLLER_FAMILY.NINTENDO,
  steamdeckcontroller: CONTROLLER_FAMILY.XBOX
});

const ACTION_GLYPHS = Object.freeze({
  [CONTROLLER_FAMILY.XBOX]: Object.freeze({
    confirm: "input:xbox:a",
    back: "input:xbox:b",
    anchor: "input:xbox:x",
    secondary: "input:xbox:y",
    firePort: "input:xbox:lt",
    fireStarboard: "input:xbox:rt",
    cycleTarget: "input:common:view",
    menu: "input:common:menu",
    navigate: "input:common:left-stick",
    scroll: "input:common:right-stick"
  }),
  [CONTROLLER_FAMILY.PLAYSTATION]: Object.freeze({
    confirm: "input:playstation:cross",
    back: "input:playstation:circle",
    anchor: "input:playstation:square",
    secondary: "input:playstation:triangle",
    firePort: "input:playstation:l2",
    fireStarboard: "input:playstation:r2",
    cycleTarget: "input:common:view",
    menu: "input:common:menu",
    navigate: "input:common:left-stick",
    scroll: "input:common:right-stick"
  }),
  [CONTROLLER_FAMILY.NINTENDO]: Object.freeze({
    confirm: "input:nintendo:b",
    back: "input:nintendo:a",
    anchor: "input:nintendo:y",
    secondary: "input:nintendo:x",
    firePort: "input:nintendo:zl",
    fireStarboard: "input:nintendo:zr",
    cycleTarget: "input:common:view",
    menu: "input:common:menu",
    navigate: "input:common:left-stick",
    scroll: "input:common:right-stick"
  }),
  [CONTROLLER_FAMILY.GENERIC]: Object.freeze({
    confirm: "input:generic:south",
    back: "input:generic:east",
    anchor: "input:generic:west",
    secondary: "input:generic:north",
    firePort: "input:generic:left-trigger",
    fireStarboard: "input:generic:right-trigger",
    cycleTarget: "input:common:view",
    menu: "input:common:menu",
    navigate: "input:common:left-stick",
    scroll: "input:common:right-stick"
  })
});

export function normalizeControllerGlyphPreference(value) {
  return CONTROLLER_GLYPH_PREFERENCES.includes(value)
    ? value
    : CONTROLLER_GLYPH_PREFERENCE.AUTOMATIC;
}

export function nextControllerGlyphPreference(value, direction = 1) {
  const normalized = normalizeControllerGlyphPreference(value);
  const index = CONTROLLER_GLYPH_PREFERENCES.indexOf(normalized);
  const step = Math.sign(direction) || 1;
  return CONTROLLER_GLYPH_PREFERENCES[
    (index + step + CONTROLLER_GLYPH_PREFERENCES.length) % CONTROLLER_GLYPH_PREFERENCES.length
  ];
}

export function controllerGlyphPreferenceLocalizationKey(value) {
  const normalized = normalizeControllerGlyphPreference(value);
  if (normalized === CONTROLLER_GLYPH_PREFERENCE.AUTOMATIC) return "options.controllerIcons.automatic";
  if (normalized === CONTROLLER_GLYPH_PREFERENCE.XBOX) return "options.controllerIcons.xbox";
  if (normalized === CONTROLLER_GLYPH_PREFERENCE.PLAYSTATION) return "options.controllerIcons.playstation";
  if (normalized === CONTROLLER_GLYPH_PREFERENCE.NINTENDO) return "options.controllerIcons.nintendo";
  if (normalized === CONTROLLER_GLYPH_PREFERENCE.GENERIC) return "options.controllerIcons.generic";
  throw new Error(`Unknown controller glyph preference: ${normalized}`);
}

export function controllerFamilyForGamepad(gamepad, preference = CONTROLLER_GLYPH_PREFERENCE.AUTOMATIC, steamInputType = null) {
  const normalized = normalizeControllerGlyphPreference(preference);
  if (normalized !== CONTROLLER_GLYPH_PREFERENCE.AUTOMATIC) return normalized;
  const steamFamily = controllerFamilyForSteamInputType(steamInputType);
  if (steamFamily) return steamFamily;
  return controllerFamilyForId(gamepad?.id || "");
}

export function controllerFamilyForSteamInputType(inputType) {
  if (inputType === null || inputType === undefined || inputType === "") return null;
  if (Number.isInteger(inputType)) return STEAM_INPUT_TYPE_FAMILY[inputType] || CONTROLLER_FAMILY.GENERIC;
  if (typeof inputType !== "string") throw new Error(`Invalid Steam Input controller type: ${inputType}`);
  const key = inputType.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^kesteaminputtype/, "");
  return STEAM_INPUT_NAME_FAMILY[key] || CONTROLLER_FAMILY.GENERIC;
}

export function controllerFamilyForId(gamepadId) {
  if (typeof gamepadId !== "string") throw new Error(`Invalid gamepad id: ${gamepadId}`);
  const id = gamepadId.toLowerCase();
  if (/playstation|dualshock|dualsense|sony|054c|ps[345]/.test(id)) return CONTROLLER_FAMILY.PLAYSTATION;
  if (/nintendo|switch|joy-?con|057e/.test(id)) return CONTROLLER_FAMILY.NINTENDO;
  if (/xbox|xinput|microsoft|045e|steam deck/.test(id)) return CONTROLLER_FAMILY.XBOX;
  return CONTROLLER_FAMILY.GENERIC;
}

export function controllerGlyphIconId(action, family) {
  const glyphs = ACTION_GLYPHS[family];
  if (!glyphs) throw new Error(`Unknown controller family: ${family}`);
  const iconId = glyphs[action];
  if (!iconId) throw new Error(`Controller action has no glyph: ${action}`);
  return iconId;
}

export function steamInputTypeFromBridge(bridge, gamepadIndex) {
  if (bridge === null || bridge === undefined) return null;
  if (typeof bridge !== "object" || typeof bridge.getInputType !== "function") {
    throw new Error("Steam Input bridge must provide getInputType(gamepadIndex)");
  }
  if (!Number.isInteger(gamepadIndex) || gamepadIndex < 0) {
    throw new Error(`Invalid gamepad index for Steam Input: ${gamepadIndex}`);
  }
  return bridge.getInputType(gamepadIndex);
}
