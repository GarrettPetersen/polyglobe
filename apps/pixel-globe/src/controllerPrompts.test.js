import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTROLLER_FAMILY,
  CONTROLLER_GLYPH_PREFERENCE,
  controllerFamilyForGamepad,
  controllerFamilyForId,
  controllerFamilyForSteamInputType,
  controllerGlyphIconId,
  controllerGlyphPreferenceLabel,
  nextControllerGlyphPreference,
  normalizeControllerGlyphPreference,
  steamInputTypeFromBridge
} from "./controllerPrompts.js";

test("controller ids detect the three major prompt families", () => {
  assert.equal(controllerFamilyForId("Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)"), CONTROLLER_FAMILY.XBOX);
  assert.equal(controllerFamilyForId("DualSense Wireless Controller (Vendor: 054c)"), CONTROLLER_FAMILY.PLAYSTATION);
  assert.equal(controllerFamilyForId("Nintendo Switch Pro Controller (Vendor: 057e)"), CONTROLLER_FAMILY.NINTENDO);
  assert.equal(controllerFamilyForId("Mystery USB Gamepad"), CONTROLLER_FAMILY.GENERIC);
});

test("Steam Input types override browser gamepad identification", () => {
  assert.equal(controllerFamilyForSteamInputType(13), CONTROLLER_FAMILY.PLAYSTATION);
  assert.equal(controllerFamilyForSteamInputType("k_ESteamInputType_SwitchProController"), CONTROLLER_FAMILY.NINTENDO);
  assert.equal(controllerFamilyForSteamInputType("SteamDeckController"), CONTROLLER_FAMILY.XBOX);
  assert.equal(
    controllerFamilyForGamepad({ id: "Xbox 360 Controller" }, CONTROLLER_GLYPH_PREFERENCE.AUTOMATIC, 13),
    CONTROLLER_FAMILY.PLAYSTATION
  );
});

test("manual controller glyph preferences always win", () => {
  assert.equal(
    controllerFamilyForGamepad({ id: "DualSense" }, CONTROLLER_GLYPH_PREFERENCE.NINTENDO, 13),
    CONTROLLER_FAMILY.NINTENDO
  );
  assert.equal(normalizeControllerGlyphPreference("bad-save-value"), CONTROLLER_GLYPH_PREFERENCE.AUTOMATIC);
  assert.equal(nextControllerGlyphPreference(CONTROLLER_GLYPH_PREFERENCE.AUTOMATIC), CONTROLLER_GLYPH_PREFERENCE.XBOX);
  assert.equal(nextControllerGlyphPreference(CONTROLLER_GLYPH_PREFERENCE.AUTOMATIC, -1), CONTROLLER_GLYPH_PREFERENCE.GENERIC);
  assert.equal(controllerGlyphPreferenceLabel(CONTROLLER_GLYPH_PREFERENCE.PLAYSTATION), "PLAYSTATION");
});

test("semantic actions resolve to family-correct glyphs", () => {
  assert.equal(controllerGlyphIconId("confirm", CONTROLLER_FAMILY.XBOX), "input:xbox:a");
  assert.equal(controllerGlyphIconId("confirm", CONTROLLER_FAMILY.PLAYSTATION), "input:playstation:cross");
  assert.equal(controllerGlyphIconId("confirm", CONTROLLER_FAMILY.NINTENDO), "input:nintendo:b");
  assert.equal(controllerGlyphIconId("firePort", CONTROLLER_FAMILY.NINTENDO), "input:nintendo:zl");
  assert.throws(() => controllerGlyphIconId("dance", CONTROLLER_FAMILY.XBOX), /has no glyph/);
});

test("Steam Input bridge is explicit and validated", () => {
  const calls = [];
  const value = steamInputTypeFromBridge({
    getInputType(index) {
      calls.push(index);
      return "PS5Controller";
    }
  }, 2);
  assert.equal(value, "PS5Controller");
  assert.deepEqual(calls, [2]);
  assert.equal(steamInputTypeFromBridge(null, 0), null);
  assert.throws(() => steamInputTypeFromBridge({}, 0), /must provide getInputType/);
});
