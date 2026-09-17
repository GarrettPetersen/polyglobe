const assert = require("node:assert/strict");
const test = require("node:test");
const { isDesktopQuitInput } = require("./desktopQuitShortcut.cjs");

test("Steam host recognizes OS quit chords from Electron input events", () => {
  assert.equal(isDesktopQuitInput({
    type: "keyDown",
    code: "F4",
    alt: true,
    control: false,
    meta: false
  }), true);
  assert.equal(isDesktopQuitInput({
    type: "keyDown",
    code: "KeyQ",
    alt: false,
    control: false,
    meta: true
  }), true);
  assert.equal(isDesktopQuitInput({
    type: "keyDown",
    code: "KeyQ",
    alt: false,
    control: true,
    meta: false
  }), true);
  assert.equal(isDesktopQuitInput({
    type: "keyUp",
    code: "F4",
    alt: true
  }), false);
  assert.equal(isDesktopQuitInput({
    type: "keyDown",
    code: "F4",
    alt: true,
    isAutoRepeat: true
  }), false);
  assert.equal(isDesktopQuitInput({
    type: "keyDown",
    code: "F4"
  }), false);
  assert.throws(() => isDesktopQuitInput(null), /requires a keyboard event/);
});
