export const KEY_BINDINGS_STORAGE_KEY = "marque-and-reprisal.key-bindings";
export const KEY_BINDINGS_VERSION = 1;
export const KEY_BINDING_SLOT_COUNT = 2;

const MODIFIER_ORDER = Object.freeze(["Ctrl", "Alt", "Shift", "Meta"]);

export const KEY_ACTION = Object.freeze({
  STEER_LEFT: "steer-left",
  STEER_RIGHT: "steer-right",
  STEER_UP: "steer-up",
  STEER_DOWN: "steer-down",
  FIRE_PORT: "fire-port",
  FIRE_STARBOARD: "fire-starboard",
  INTERACT: "interact",
  CAPTAIN_MENU: "captain-menu",
  SHIP_INFO: "ship-info",
  POLITICS: "politics",
  SCREENSHOT: "screenshot"
});

export const KEY_ACTION_DEFINITIONS = Object.freeze([
  action(KEY_ACTION.STEER_LEFT, "STEER LEFT", ["ArrowLeft", "KeyA"]),
  action(KEY_ACTION.STEER_RIGHT, "STEER RIGHT", ["ArrowRight", "KeyD"]),
  action(KEY_ACTION.STEER_UP, "STEER UP", ["ArrowUp", "KeyW"]),
  action(KEY_ACTION.STEER_DOWN, "STEER DOWN", ["ArrowDown", "KeyS"]),
  action(KEY_ACTION.FIRE_PORT, "FIRE PORT", ["KeyQ", null]),
  action(KEY_ACTION.FIRE_STARBOARD, "FIRE STARBOARD", ["KeyE", null]),
  action(KEY_ACTION.INTERACT, "INTERACT", ["Enter", "Space"]),
  action(KEY_ACTION.CAPTAIN_MENU, "CAPTAIN MENU", ["Escape", null]),
  action(KEY_ACTION.SHIP_INFO, "SHIP & LEDGER", ["KeyI", null]),
  action(KEY_ACTION.POLITICS, "POLITICS", ["KeyP", null]),
  action(KEY_ACTION.SCREENSHOT, "SCREENSHOT", ["Shift+Meta+KeyS", "Ctrl+Shift+KeyS"])
]);

const KEY_ACTION_BY_ID = new Map(KEY_ACTION_DEFINITIONS.map((definition) => [definition.id, definition]));
const MODIFIER_CODES = Object.freeze({
  AltLeft: "Alt",
  AltRight: "Alt",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl",
  MetaLeft: "Meta",
  MetaRight: "Meta",
  ShiftLeft: "Shift",
  ShiftRight: "Shift"
});

const CODE_LABELS = Object.freeze({
  AltLeft: "L ALT",
  AltRight: "R ALT",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  ArrowUp: "UP",
  Backquote: "`",
  Backslash: "\\",
  Backspace: "BACKSPACE",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  ControlLeft: "L CTRL",
  ControlRight: "R CTRL",
  Delete: "DELETE",
  End: "END",
  Enter: "ENTER",
  Equal: "=",
  Escape: "ESC",
  Home: "HOME",
  Insert: "INSERT",
  MetaLeft: "L META",
  MetaRight: "R META",
  Minus: "-",
  PageDown: "PAGE DOWN",
  PageUp: "PAGE UP",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  ShiftLeft: "L SHIFT",
  ShiftRight: "R SHIFT",
  Slash: "/",
  Space: "SPACE",
  Tab: "TAB"
});

export function createDefaultKeyBindings() {
  return validateKeyBindings({
    version: KEY_BINDINGS_VERSION,
    actions: Object.fromEntries(KEY_ACTION_DEFINITIONS.map((definition) => [
      definition.id,
      [...definition.defaults]
    ]))
  });
}

export function loadKeyBindings(storage) {
  assertStorage(storage);
  const serialized = storage.getItem(KEY_BINDINGS_STORAGE_KEY);
  return serialized === null ? createDefaultKeyBindings() : deserializeKeyBindings(serialized);
}

export function saveKeyBindings(storage, bindings) {
  assertStorage(storage);
  const serialized = serializeKeyBindings(bindings);
  storage.setItem(KEY_BINDINGS_STORAGE_KEY, serialized);
  if (storage.getItem(KEY_BINDINGS_STORAGE_KEY) !== serialized) {
    throw new Error("Key bindings could not be persisted");
  }
}

export function serializeKeyBindings(bindings) {
  return JSON.stringify(validateKeyBindings(bindings));
}

export function deserializeKeyBindings(serialized) {
  if (typeof serialized !== "string" || serialized.length === 0) {
    throw new Error("Stored key bindings must be a non-empty string");
  }
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new Error("Stored key bindings are not valid JSON", { cause: error });
  }
  return validateKeyBindings(parsed);
}

export function validateKeyBindings(bindings) {
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) {
    throw new Error("Key bindings must be an object");
  }
  if (bindings.version !== KEY_BINDINGS_VERSION) {
    throw new Error(`Unsupported key bindings version: ${bindings.version}`);
  }
  if (!bindings.actions || typeof bindings.actions !== "object" || Array.isArray(bindings.actions)) {
    throw new Error("Key bindings require an actions object");
  }
  const actionIds = Object.keys(bindings.actions);
  if (actionIds.length !== KEY_ACTION_DEFINITIONS.length || actionIds.some((id) => !KEY_ACTION_BY_ID.has(id))) {
    throw new Error("Key bindings do not match the current action catalog");
  }
  const claimedTokens = new Map();
  const actions = {};
  for (const definition of KEY_ACTION_DEFINITIONS) {
    const slots = bindings.actions[definition.id];
    if (!Array.isArray(slots) || slots.length !== KEY_BINDING_SLOT_COUNT) {
      throw new Error(`${definition.label} requires ${KEY_BINDING_SLOT_COUNT} binding slots`);
    }
    actions[definition.id] = slots.map((token, slotIndex) => {
      if (token === null) return null;
      validateBindingToken(token);
      const claimed = claimedTokens.get(token);
      if (claimed) {
        throw new Error(`Key ${token} is assigned to both ${claimed.actionId} and ${definition.id}`);
      }
      claimedTokens.set(token, { actionId: definition.id, slotIndex });
      return token;
    });
  }
  return Object.freeze({ version: KEY_BINDINGS_VERSION, actions: freezeActions(actions) });
}

export function rebindKey(bindings, actionId, slotIndex, token) {
  const current = validateKeyBindings(bindings);
  assertActionSlot(actionId, slotIndex);
  validateBindingToken(token);
  const actions = cloneActions(current.actions);
  let displaced = null;
  for (const definition of KEY_ACTION_DEFINITIONS) {
    for (let index = 0; index < KEY_BINDING_SLOT_COUNT; index += 1) {
      if (actions[definition.id][index] !== token) continue;
      if (definition.id !== actionId || index !== slotIndex) {
        displaced = Object.freeze({ actionId: definition.id, slotIndex: index });
      }
      actions[definition.id][index] = null;
    }
  }
  actions[actionId][slotIndex] = token;
  return Object.freeze({ bindings: validateKeyBindings({ version: KEY_BINDINGS_VERSION, actions }), displaced });
}

export function clearKeyBinding(bindings, actionId, slotIndex) {
  const current = validateKeyBindings(bindings);
  assertActionSlot(actionId, slotIndex);
  const actions = cloneActions(current.actions);
  actions[actionId][slotIndex] = null;
  return validateKeyBindings({ version: KEY_BINDINGS_VERSION, actions });
}

export function keyboardBindingToken(event) {
  if (!event || typeof event !== "object") throw new Error("Keyboard binding requires an event");
  if (typeof event.code !== "string" || event.code.length === 0) {
    throw new Error("Keyboard binding event requires a physical key code");
  }
  const ownModifier = MODIFIER_CODES[event.code] || null;
  const modifiers = [];
  if (event.ctrlKey && ownModifier !== "Ctrl") modifiers.push("Ctrl");
  if (event.altKey && ownModifier !== "Alt") modifiers.push("Alt");
  if (event.shiftKey && ownModifier !== "Shift") modifiers.push("Shift");
  if (event.metaKey && ownModifier !== "Meta") modifiers.push("Meta");
  return [...modifiers, event.code].join("+");
}

export function keyActionForEvent(bindings, event) {
  const current = validateKeyBindings(bindings);
  const token = keyboardBindingToken(event);
  const exact = keyActionForToken(current, token);
  if (exact) return exact;
  return token === event.code ? null : keyActionForToken(current, event.code);
}

export function keyActionForToken(bindings, token) {
  const current = validateKeyBindings(bindings);
  validateBindingToken(token);
  for (const definition of KEY_ACTION_DEFINITIONS) {
    if (current.actions[definition.id].includes(token)) return definition.id;
  }
  return null;
}

export function keyBindingLabel(token, platform = "") {
  if (token === null) return "UNBOUND";
  validateBindingToken(token);
  const parts = token.split("+");
  const code = parts.pop();
  const modifierLabels = parts.map((part) => (
    part === "Meta" && /^mac/i.test(platform) ? "CMD" : part.toUpperCase()
  ));
  return [...modifierLabels, codeLabel(code, platform)].join("+");
}

export function keyActionDefinition(actionId) {
  const definition = KEY_ACTION_BY_ID.get(actionId);
  if (!definition) throw new Error(`Unknown key action: ${actionId}`);
  return definition;
}

export function isSteeringKeyAction(actionId) {
  return actionId === KEY_ACTION.STEER_LEFT ||
    actionId === KEY_ACTION.STEER_RIGHT ||
    actionId === KEY_ACTION.STEER_UP ||
    actionId === KEY_ACTION.STEER_DOWN;
}

export function createHeldKeyActions() {
  const actionByCode = new Map();
  return Object.freeze({
    press(code, actionId) {
      if (typeof code !== "string" || code.length === 0) throw new Error(`Invalid held key code: ${code}`);
      keyActionDefinition(actionId);
      actionByCode.set(code, actionId);
    },
    release(code) {
      if (typeof code !== "string" || code.length === 0) throw new Error(`Invalid released key code: ${code}`);
      const actionId = actionByCode.get(code) || null;
      actionByCode.delete(code);
      return actionId;
    },
    has(actionId) {
      keyActionDefinition(actionId);
      return [...actionByCode.values()].includes(actionId);
    },
    clear() {
      actionByCode.clear();
    },
    get size() {
      return actionByCode.size;
    }
  });
}

function action(id, label, defaults) {
  if (typeof id !== "string" || id.length === 0 || typeof label !== "string" || label.length === 0) {
    throw new Error("Key action requires an id and label");
  }
  if (!Array.isArray(defaults) || defaults.length !== KEY_BINDING_SLOT_COUNT) {
    throw new Error(`Key action ${id} requires ${KEY_BINDING_SLOT_COUNT} defaults`);
  }
  for (const token of defaults) {
    if (token !== null) validateBindingToken(token);
  }
  return Object.freeze({ id, label, defaults: Object.freeze([...defaults]) });
}

function assertActionSlot(actionId, slotIndex) {
  keyActionDefinition(actionId);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= KEY_BINDING_SLOT_COUNT) {
    throw new Error(`Invalid key binding slot: ${slotIndex}`);
  }
}

function validateBindingToken(token) {
  if (typeof token !== "string" || token.length === 0) throw new Error(`Invalid key binding: ${token}`);
  const parts = token.split("+");
  const code = parts.pop();
  if (!code || parts.some((part) => !MODIFIER_ORDER.includes(part))) {
    throw new Error(`Invalid key binding token: ${token}`);
  }
  const orderedModifiers = MODIFIER_ORDER.filter((modifier) => parts.includes(modifier));
  if (new Set(parts).size !== parts.length || orderedModifiers.join("+") !== parts.join("+")) {
    throw new Error(`Key binding modifiers are not canonical: ${token}`);
  }
  return token;
}

function freezeActions(actions) {
  return Object.freeze(Object.fromEntries(Object.entries(actions).map(([id, slots]) => [
    id,
    Object.freeze([...slots])
  ])));
}

function cloneActions(actions) {
  return Object.fromEntries(Object.entries(actions).map(([id, slots]) => [id, [...slots]]));
}

function codeLabel(code, platform) {
  if (CODE_LABELS[code]) {
    const label = CODE_LABELS[code];
    return /^mac/i.test(platform) ? label.replace("META", "CMD") : label;
  }
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  if (/^Numpad/.test(code)) return `NUM ${code.slice(6).toUpperCase()}`;
  return code.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
}

function assertStorage(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new Error("Key bindings require Web Storage");
  }
}
