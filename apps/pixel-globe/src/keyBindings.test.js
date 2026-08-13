import assert from "node:assert/strict";
import test from "node:test";

import {
  KEY_ACTION,
  KEY_ACTION_DEFINITIONS,
  KEY_BINDINGS_VERSION,
  KEY_BINDINGS_STORAGE_KEY,
  clearKeyBinding,
  createDefaultKeyBindings,
  createHeldKeyActions,
  deserializeKeyBindings,
  keyActionForEvent,
  keyBindingLabel,
  keyboardBindingToken,
  isFullscreenToggleKey,
  loadKeyBindings,
  rebindKey,
  saveKeyBindings,
  serializeKeyBindings,
  validateKeyBindings
} from "./keyBindings.js";

test("default bindings support arrows, WASD, broadsides, menus, and screenshots", () => {
  const bindings = createDefaultKeyBindings();

  assert.equal(keyActionForEvent(bindings, event("ArrowLeft")), KEY_ACTION.STEER_LEFT);
  assert.equal(keyActionForEvent(bindings, event("KeyA")), KEY_ACTION.STEER_LEFT);
  assert.equal(keyActionForEvent(bindings, event("KeyQ")), KEY_ACTION.FIRE_PORT);
  assert.equal(keyActionForEvent(bindings, event("Space")), KEY_ACTION.INTERACT);
  assert.equal(keyActionForEvent(bindings, event("Escape")), KEY_ACTION.CAPTAIN_MENU);
  assert.equal(
    keyActionForEvent(bindings, event("KeyS", { shiftKey: true, metaKey: true })),
    KEY_ACTION.SCREENSHOT
  );
  assert.equal(KEY_ACTION_DEFINITIONS.length, 11);
});

test("plain movement bindings keep working while an unrelated modifier is held", () => {
  const bindings = createDefaultKeyBindings();
  assert.equal(keyActionForEvent(bindings, event("KeyW", { shiftKey: true })), KEY_ACTION.STEER_UP);
});

test("browser keyboard events without a physical code do not enter the binding system", () => {
  const bindings = createDefaultKeyBindings();
  assert.equal(keyActionForEvent(bindings, event("")), null);
  assert.equal(keyActionForEvent(bindings, { key: "Unidentified" }), null);
  assert.throws(() => keyboardBindingToken(event("")), /physical key code/);
});

test("rebinding moves a key away from its previous action", () => {
  const original = createDefaultKeyBindings();
  const result = rebindKey(original, KEY_ACTION.FIRE_PORT, 1, "KeyA");

  assert.deepEqual(result.displaced, { actionId: KEY_ACTION.STEER_LEFT, slotIndex: 1 });
  assert.deepEqual(result.bindings.actions[KEY_ACTION.STEER_LEFT], ["ArrowLeft", null]);
  assert.deepEqual(result.bindings.actions[KEY_ACTION.FIRE_PORT], ["KeyQ", "KeyA"]);
  assert.equal(keyActionForEvent(result.bindings, event("KeyA")), KEY_ACTION.FIRE_PORT);
});

test("individual slots can be cleared and reset through a fresh default map", () => {
  const cleared = clearKeyBinding(createDefaultKeyBindings(), KEY_ACTION.INTERACT, 1);
  assert.deepEqual(cleared.actions[KEY_ACTION.INTERACT], ["Enter", null]);
  assert.deepEqual(createDefaultKeyBindings().actions[KEY_ACTION.INTERACT], ["Enter", "Space"]);
});

test("bindings serialize strictly and persist through Web Storage", () => {
  const storage = memoryStorage();
  const rebound = rebindKey(createDefaultKeyBindings(), KEY_ACTION.POLITICS, 0, "F7").bindings;
  saveKeyBindings(storage, rebound);

  assert.equal(storage.getItem(KEY_BINDINGS_STORAGE_KEY), serializeKeyBindings(rebound));
  assert.deepEqual(loadKeyBindings(storage), rebound);
  assert.deepEqual(deserializeKeyBindings(serializeKeyBindings(rebound)), rebound);
  assert.throws(() => deserializeKeyBindings("not-json"), /not valid JSON/);
  assert.throws(() => validateKeyBindings({ version: 999, actions: {} }), /Unsupported/);
});

test("F11 is reserved for fullscreen and removed from legacy custom bindings", () => {
  assert.equal(isFullscreenToggleKey(event("F11")), true);
  assert.equal(isFullscreenToggleKey({ key: "F11", code: "" }), true);
  assert.equal(isFullscreenToggleKey(event("F10")), false);
  assert.throws(
    () => rebindKey(createDefaultKeyBindings(), KEY_ACTION.POLITICS, 0, "F11"),
    /reserved for fullscreen/
  );

  const legacy = createDefaultKeyBindings();
  const actions = Object.fromEntries(Object.entries(legacy.actions).map(([id, slots]) => [id, [...slots]]));
  actions[KEY_ACTION.POLITICS][0] = "F11";
  const migrated = deserializeKeyBindings(JSON.stringify({ version: 1, actions }));
  assert.equal(migrated.version, KEY_BINDINGS_VERSION);
  assert.deepEqual(migrated.actions[KEY_ACTION.POLITICS], [null, null]);
});

test("physical key chords and labels are canonical", () => {
  assert.equal(
    keyboardBindingToken(event("KeyS", { ctrlKey: true, shiftKey: true })),
    "Ctrl+Shift+KeyS"
  );
  assert.equal(keyboardBindingToken(event("ShiftLeft", { shiftKey: true })), "ShiftLeft");
  assert.equal(keyBindingLabel("Shift+Meta+KeyS", "MacIntel"), "SHIFT+CMD+S");
  assert.equal(keyBindingLabel("ArrowDown"), "DOWN");
  assert.equal(keyBindingLabel(null), "UNBOUND");
});

test("held actions remain active until every physical key for them is released", () => {
  const held = createHeldKeyActions();
  held.press("ArrowLeft", KEY_ACTION.STEER_LEFT);
  held.press("KeyA", KEY_ACTION.STEER_LEFT);
  held.release("ArrowLeft");
  assert.equal(held.has(KEY_ACTION.STEER_LEFT), true);
  held.release("KeyA");
  assert.equal(held.has(KEY_ACTION.STEER_LEFT), false);
});

function event(code, modifiers = {}) {
  return { code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...modifiers };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}
