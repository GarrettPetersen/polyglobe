import assert from "node:assert/strict";
import test from "node:test";

import { fullNoticeTextLayout } from "./noticeTextLayout.js";
import {
  SUPPORTED_LANGUAGES,
  languageFontProfile,
  localizeText,
  translate
} from "./localization.js";

test("short full notices retain the compact single-line height", () => {
  const layout = fullNoticeTextLayout("PEACE: ENGLAND / FRANCE", {
    screenWidth: 455,
    maximumWidth: 360,
    lineHeight: 9,
    measureText: monospaceMeasure
  });

  assert.equal(layout.lines.length, 1);
  assert.equal(layout.height, 13);
  assert.equal(layout.width, monospaceMeasure("PEACE: ENGLAND / FRANCE") + 10);
});

test("long political notices wrap without losing any words", () => {
  const text = "POPE ADRIAN VI PROCLAIMS A CRUSADE AGAINST THE OTTOMAN EMPIRE";
  const layout = fullNoticeTextLayout(text, {
    screenWidth: 180,
    maximumWidth: 160,
    lineHeight: 9,
    measureText: monospaceMeasure
  });

  assert.ok(layout.lines.length > 1);
  assert.equal(layout.lines.join(" "), text);
  assert.ok(layout.lines.every((line) => !line.endsWith("...")));
  assert.ok(layout.width <= 160);
  assert.equal(layout.height, layout.lines.length * 9 + 4);
});

test("notifications use additional lines instead of adding an ellipsis", () => {
  const text = "DIE LEINE HÄLT — MACHT EUCH AUF DEN SCHLEPPZUG GEFASST";
  const layout = fullNoticeTextLayout(text, {
    screenWidth: 120,
    maximumWidth: 100,
    lineHeight: 9,
    measureText: monospaceMeasure
  });

  assert.ok(layout.lines.length >= 2);
  assert.equal(layout.lines.join(" "), text);
  assert.ok(layout.lines.every((line) => !line.endsWith("...")));
});

test("localized notification banners fit without truncation in every supported language", () => {
  const englishSamples = [
    "THE LINE HOLDS - PREPARE FOR THE TOW",
    "Humpback whale, adult female",
    "POPE ADRIAN VI PROCLAIMS A CRUSADE AGAINST THE OTTOMAN EMPIRE",
    "WAITING SAFELY IN HAFNARFJORDUR",
    "STORM DAMAGE -12 HULL",
    "ACHIEVEMENT UNLOCKED"
  ];

  for (const { id } of SUPPORTED_LANGUAGES) {
    const profile = languageFontProfile(id);
    const samples = [
      ...englishSamples.map((text) => localizeText(id, text)),
      translate(id, "status.drinkableWaterLow"),
      translate(id, "discovery.greatBarrierReef.notice")
    ];
    const measureText = localizedMonospaceMeasure(profile.fontSize);
    const lineHeight = profile.lineHeight;
    for (const text of samples) {
      const layout = fullNoticeTextLayout(text, {
        screenWidth: 120,
        maximumWidth: 100,
        lineHeight,
        measureText
      });
      assert.ok(
        layout.lines.every((line) => measureText(line) <= layout.width - 10),
        `${id} notice escaped its container: ${text}`
      );
      assert.equal(
        layout.lines.join("").replace(/\s+/g, ""),
        text.replace(/\s+/g, ""),
        `${id} notice was truncated: ${text}`
      );
      assert.ok(
        layout.lines.every((line) => !line.endsWith("...") && !line.endsWith("…")),
        `${id} notice gained an ellipsis: ${text}`
      );
      assert.equal(layout.height, Math.max(13, layout.lines.length * lineHeight + 4));
    }
  }
});

function monospaceMeasure(text) {
  return text.length * 4;
}

function localizedMonospaceMeasure(fontSize) {
  const glyphWidth = Math.ceil(fontSize / 2);
  return (text) => [...text].length * glyphWidth;
}
