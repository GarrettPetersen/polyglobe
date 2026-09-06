import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const render = main.slice(main.indexOf("function drawShipPaperDetail("), main.indexOf("function formatSignedLedgerMoney("));

test("inventory details clear the notebook heading and retain scrolling on short and tall panels", () => {
  for (const [width, height] of [[320, 190], [320, 256], [520, 240]]) {
    for (const lineHeight of [9, 14]) {
      const drawn = [];
      const clips = [];
      const menu = { paperDetailIndex: 0, paperDetailScrollY: 0 };
      const panel = { x: 100, y: 5, w: width, h: height };
      const view = { papers: [{ title: "PASSENGER: YUSUF QURESHI", kind: "Passenger", issuer: "Yusuf Qureshi",
        route: "Wuchang to Gauda", detail: "Fare 354 db", simMinute: null }] };
      const context = { panel, view, shipInfoMenu: menu, UI_ICON_BUTTON_SIZE: 16, UI_PAGER_BUTTON_H: 24,
        PIXEL_FONT_SMALL_8: "small", PIXEL_FONT_DIALOGUE_8: "dialogue", PIRATE_MENU_INK: "ink",
        PIRATE_MENU_INK_MUTED: "muted", PIRATE_MENU_CHART_LINE: "green", optionsMenu: { hoverPoint: null },
        localizedLineHeight: () => lineHeight,
        wrapPixelTextAll: (text) => [text, "WRAPPED CONTINUATION", "FINAL LINE"], shipLedgerDateLabel: () => "--",
        clamp: (n, min, max) => Math.max(min, Math.min(max, n)), pointInRect: () => false,
        drawShipInfoArrowButton: () => {}, drawOptionsText: (text, x, y) => drawn.push({ text, x, y }),
        ctx: { save() {}, restore() {}, beginPath() {}, clip() {}, fillRect() {}, rect: (x, y, w, h) => clips.push({ x, y, w, h }) }
      };
      runInNewContext(`${render}\ndrawShipPaperDetail(panel, view);`, context);
      const title = drawn.find(({ text }) => text.startsWith("PASSENGER:"));
      const headingBottom = panel.y + (width < 400 ? 35 : 8) + lineHeight;
      assert.ok(title.y >= headingBottom + 4, `${width}x${height}: titles must not overlap`);
      assert.ok(drawn.find(({ text }) => text === "TYPE").y > title.y + 2 * lineHeight);
      assert.ok(clips[0].y + clips[0].h < menu.paperDetailBackRect.y);
      assert.ok(menu.paperDetailMaxScrollY > 0, "wrapped fields must remain reachable by scrolling");
      menu.paperDetailScrollY = menu.paperDetailMaxScrollY;
      drawn.length = 0;
      runInNewContext(`${render}\ndrawShipPaperDetail(panel, view);`, context);
      const date = drawn.find(({ text }) => text === "DATE");
      assert.ok(date.y >= clips[0].y && date.y + 3 * lineHeight <= clips[0].y + clips[0].h);
    }
  }
});

test("the shared inn and notebook crew footer shows occupied and maximum berths", () => {
  const start = main.indexOf("    const experience = crewExperienceSummary(gameState);", main.indexOf("function drawAboardMenu("));
  const end = main.indexOf("\n  }\n  if (portInnSource)", start);
  assert.ok(start > 0 && end > start);
  for (const [crew, crewCapacity] of [[0, 20], [17, 20], [20, 20], [130, 200]]) {
    let text;
    runInNewContext(main.slice(start, end), {
      gameState: { ship: { crew, crewCapacity } },
      crewExperienceSummary: () => ({ overallStars: 2 }),
      aboardCrewExperienceLevelKey: () => "trained", uiText: (key) => key,
      fitPixelText: (value) => value, drawOptionsText: (value) => { text = value; },
      panel: { x: 0, w: 320 }, rosterFooterY: 200, PIXEL_FONT_SMALL_8: "small", PIRATE_MENU_INK_MUTED: "muted"
    });
    assert.ok(text.startsWith(`${crew}/${crewCapacity} CREW`));
  }
});
