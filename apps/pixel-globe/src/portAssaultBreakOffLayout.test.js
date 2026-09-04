import assert from "node:assert/strict";
import test from "node:test";

import { SUPPORTED_LANGUAGES, languageFontProfile } from "./localization.js";
import { portAssaultBreakOffLayout } from "./portAssaultBreakOffLayout.js";
import { localizeGameplayScreenText } from "./screenTextLocalization.js";

const MESSAGE = "The fighting stops. Fallen hands stay lost.";
const VIEWPORTS = Object.freeze([
  Object.freeze({ width: 256, height: 495 }),
  Object.freeze({ width: 435, height: 268 }),
  Object.freeze({ width: 455, height: 256 })
]);

test("port-assault break-off copy wraps inside its modal in every language and target viewport", () => {
  for (const { id: language } of SUPPORTED_LANGUAGES) {
    const localized = localizeGameplayScreenText(language, MESSAGE, (capture) => capture);
    const profile = languageFontProfile(language);
    const measureText = conservativePixelMeasure(profile.fontSize, language);
    for (const viewport of VIEWPORTS) {
      const layout = portAssaultBreakOffLayout({
        screenWidth: viewport.width,
        screenHeight: viewport.height,
        message: localized,
        measureText,
        lineHeight: profile.detailLineHeight
      });

      if (language === "en") {
        assert.ok(layout.message.lines.length >= 2, "English break-off copy should clear the border");
      }
      assert.equal(
        layout.message.lines.join("").replace(/\s+/g, ""),
        localized.replace(/\s+/g, ""),
        `${language} break-off copy was truncated`
      );
      assert.ok(
        layout.message.lines.every((line) => measureText(line) <= layout.message.width),
        `${language} break-off copy escaped its measured width`
      );
      assert.ok(layout.modal.x >= 6 && layout.modal.x + layout.modal.w <= viewport.width - 6);
      assert.ok(layout.modal.y >= 6 && layout.modal.y + layout.modal.h <= viewport.height - 6);
      assert.ok(layout.buttons.every((button) => (
        button.x >= layout.modal.x + 16 && button.x + button.w <= layout.modal.x + layout.modal.w - 16
      )));
    }
  }
});

function conservativePixelMeasure(fontSize, language) {
  const cjkOrKorean = /^(?:zh-Hans|zh-Hant|ja|ko)$/.test(language);
  const glyphWidth = cjkOrKorean ? fontSize : Math.ceil(fontSize * 0.625);
  return (text) => Array.from(text).length * glyphWidth;
}
