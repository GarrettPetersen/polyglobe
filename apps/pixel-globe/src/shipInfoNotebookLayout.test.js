import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

import { shipPropulsionSummaryLines } from "./shipInfo.js";

const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const notebookRender = main.slice(
  main.indexOf("function drawNotebookShipVessel("),
  main.indexOf("function drawCompactShipVessel(")
);
const splitRowRender = main.slice(
  main.indexOf("function drawSplitShipInfoTextRow("),
  main.indexOf("function drawCompactShipLedger(")
);
const valueRowRender = main.slice(
  main.indexOf("function drawShipInfoValueRow("),
  main.indexOf("function drawShipInfoRating(")
);

const widthOf = (text) => [...text].length * 5;

test("short notebook vessel layouts do not ellipsize cargo, payroll, or propulsion", () => {
  for (const width of [300, 320, 379]) {
    for (const localizedPropulsion of [
      "OAR + SAIL / ROW TO BOOST",
      "WIOSŁA + ŻAGLE / WIOSŁUJ, BY PRZYSPIESZYĆ",
      "槳帆並用／划槳加速"
    ]) {
      const drawn = [];
      const panel = { x: 10, y: 8, w: width, h: 240 };
      const view = {
        slug: "caravel",
        hull: 9,
        maxHull: 9,
        armor: 0,
        crew: 10,
        crewCapacity: 12,
        armamentLabel: "GUNS",
        armamentSummary: "0/2",
        propulsionSummary: "OAR + SAIL / ROW TO BOOST",
        crewProtection: 12,
        seaworthiness: 4,
        cargoUsedLabel: "7",
        cargoCapacity: 150,
        monthlyCrewSalaryDoubloons: 71,
        survival: { drinkDays: 8, foodDays: 14 },
        ratings: { speed: 9, acceleration: 10, turning: 8, windward: 5 }
      };
      const context = {
        panel,
        view,
        cargoPage: { rows: [], page: 0, pageCount: 1 },
        SHIP_INFO_SIDE_VIEW_W: 192,
        SHIP_INFO_SIDE_VIEW_H: 104,
        shipInfoImages: new Map(),
        shipInfoMenu: { error: null },
        PIXEL_FONT_SMALL_8: "small",
        PIRATE_MENU_INK: "ink",
        PIRATE_MENU_INK_MUTED: "muted",
        PIRATE_MENU_CHART_LINE: "chart",
        PIRATE_MENU_DANGER: "danger",
        GAME_ICON_SIZE: 12,
        ctx: {
          fillStyle: "",
          strokeStyle: "",
          imageSmoothingEnabled: false,
          fillRect() {},
          strokeRect() {},
          drawImage() {}
        },
        localizedLineHeight: (height) => height,
        remainingSupplyDayCount: (days) => days,
        renderedUiText: (text) => text === view.propulsionSummary ? localizedPropulsion : text,
        uiText: (key, replacements = {}) => {
          if (key === "ship.cargoHold") return "CARGO HOLD";
          if (key === "crew.salaryPerMonth") return `${replacements.amount} DB / MONTH`;
          return key;
        },
        shipPropulsionSummaryLines,
        drawOptionsText: (text, x, y, options = {}) => drawn.push({ text, x, y, options }),
        drawShipInfoValueRow: () => {},
        drawShipInfoBar: () => {},
        drawResponsiveShipRating: () => {},
        drawGameIcon: () => {},
        tradeGoodIconId: () => "cargo",
        shipCargoRowTextWidth: () => 100,
        drawCompactShipPager: () => {},
        measurePixelTextWidth: widthOf,
        fitPixelText: (text, _font, maxWidth) => {
          if (widthOf(text) <= maxWidth) return text;
          const maximumCharacters = Math.max(0, Math.floor(maxWidth / 5) - 3);
          return `${[...text].slice(0, maximumCharacters).join("")}...`;
        }
      };

      runInNewContext(`${notebookRender}\n${splitRowRender}\ndrawNotebookShipVessel(panel, view, cargoPage);`, context);

      const required = drawn.filter(({ text }) => (
        text.startsWith("CARGO HOLD") || text === "71 DB / MONTH" ||
        shipPropulsionSummaryLines(localizedPropulsion).includes(text)
      ));
      assert.equal(required.length, 4, `${width}px: every summary field should be drawn`);
      assert.equal(required.some(({ text }) => text.includes("...")), false, `${width}px: ${localizedPropulsion}`);
      const cargo = required.find(({ text }) => text.startsWith("CARGO HOLD"));
      const payroll = required.find(({ text }) => text === "71 DB / MONTH");
      assert.equal(cargo.y, payroll.y, `${width}px: cargo and payroll should share the full-width header`);
      assert.ok(cargo.x + widthOf(cargo.text) + 4 < payroll.x - widthOf(payroll.text));
    }
  }
});

test("ship value rows do not truncate values that fit beside their labels", () => {
  for (const availableWidth of [190, 215, 260]) {
    const drawn = [];
    const context = {
      availableWidth,
      PIXEL_FONT_SMALL_8: "small",
      PIRATE_MENU_INK: "ink",
      measurePixelTextWidth: widthOf,
      drawOptionsText: (text, x, y, options = {}) => drawn.push({ text, x, y, options }),
      fitPixelText: (text, _font, maxWidth) => {
        if (widthOf(text) <= maxWidth) return text;
        return `${text.slice(0, Math.max(0, Math.floor(maxWidth / 5) - 3))}...`;
      }
    };
    runInNewContext(
      `${valueRowRender}\ndrawShipInfoValueRow("PROPULSION", "OAR + SAIL / ROW TO BOOST", 0, availableWidth, 12);`,
      context
    );
    assert.deepEqual(drawn.map(({ text }) => text), [
      "PROPULSION",
      "OAR + SAIL / ROW TO BOOST"
    ]);
  }
});
