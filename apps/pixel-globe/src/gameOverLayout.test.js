import assert from "node:assert/strict";
import test from "node:test";

import { gameOverMemorialLayout, gameOverStatsLayout } from "./gameOverLayout.js";

const measure = (text) => text.length * 4;
const rows = [
  ["BORN", "JULY 14, 1482"],
  ["DIED", "MAR 1522"],
  ["DAYS AT SEA", "10"],
  ["LAST POSITION", "31.2N 29.9E"],
  ["DISCOVERIES", "0"],
  ["PORTS VISITED", "0"],
  ["QUESTS COMPLETED", "0"],
  ["DOUBLOONS EARNED", "0"],
  ["LETTERS", "0"],
  ["CARGO", "22/28"],
  ["DOUBLOONS", "380"]
];

test("portrait game-over rows keep labels and values from colliding", () => {
  const layout = gameOverStatsLayout({
    screenWidth: 256,
    screenHeight: 455,
    epitaph: "GOVINDA GUPTA WAS NEVER SEEN AGAIN.",
    causeLabel: "CAUSE OF DEATH",
    cause: "STRUCK BY LIGHTNING IN A STORM",
    rows,
    measureText: measure
  });

  for (const row of layout.rows) {
    if (!row.inline) continue;
    assert.ok(row.labelX + measure(row.label) + 8 <= row.valueX - measure(row.value));
  }
  assert.ok(layout.rows.at(-1).valueY < layout.promptY);
});

test("long causes wrap in full above the statistics", () => {
  const cause = "LOST AFTER THE CREW RAN OUT OF DRINKING WATER";
  const layout = gameOverStatsLayout({
    screenWidth: 256,
    screenHeight: 455,
    epitaph: "THE CAPTAIN WAS NEVER SEEN AGAIN.",
    causeLabel: "CAUSE OF DEATH",
    cause,
    rows,
    measureText: measure
  });

  assert.ok(layout.causeLines.length > 1);
  assert.equal(layout.causeLines.join(" "), `CAUSE OF DEATH: ${cause}`);
  assert.ok(layout.rows[0].labelY > layout.causeY);
});

test("very long causes never become ellipses on the final statistics", () => {
  const cause = "THE LAST SURVIVOR DIED OF THIRST AFTER THE SHIP WAS DRIVEN FAR FROM EVERY KNOWN PORT BY A MONTH OF CONTRARY WINDS";
  const layout = gameOverStatsLayout({
    screenWidth: 256,
    screenHeight: 455,
    epitaph: "THE CAPTAIN WAS NEVER SEEN AGAIN.",
    causeLabel: "CAUSE OF DEATH",
    cause,
    rows,
    measureText: measure
  });

  assert.equal(layout.causeLines.join(" "), `CAUSE OF DEATH: ${cause}`);
  assert.ok(layout.causeLines.every((line) => !line.endsWith("...")));
});

test("portrait memorial grows to show a complete cause of death", () => {
  const cause = "THE LAST SURVIVOR DIED OF THIRST AFTER THE SHIP WAS DRIVEN FAR FROM EVERY KNOWN PORT BY A MONTH OF CONTRARY WINDS";
  const layout = gameOverMemorialLayout({
    screenWidth: 256,
    screenHeight: 455,
    preferredPanelWidth: 350,
    cause,
    measureText: measure
  });

  assert.ok(layout.panel.h > 178);
  assert.equal(layout.causeLines.join(" "), cause);
  assert.ok(layout.causeLines.every((line) => !line.endsWith("...")));
});

test("base landscape viewport retains a compact readable memorial", () => {
  const layout = gameOverStatsLayout({
    screenWidth: 455,
    screenHeight: 256,
    epitaph: "THE CAPTAIN WAS NEVER SEEN AGAIN.",
    causeLabel: "CAUSE OF DEATH",
    cause: "LOST AT SEA",
    rows,
    measureText: measure
  });

  assert.ok(layout.rows.every((row) => row.inline));
  assert.ok(layout.rows.at(-1).valueY < layout.promptY - 4);
});

test("landscape layout tightens row spacing for a long name and cause", () => {
  const layout = gameOverStatsLayout({
    screenWidth: 455,
    screenHeight: 256,
    epitaph: "ALEXANDER CHRISTOPHERSON WAS NEVER SEEN AGAIN.",
    causeLabel: "CAUSE OF DEATH",
    cause: "THE LAST OF THE CREW DIED WHILE SCAVENGING ASHORE",
    rows,
    measureText: (text) => text.length * 8
  });

  assert.equal(layout.epitaphLines.length, 1);
  assert.ok(layout.causeLines.length > 1);
  assert.ok(layout.rowHeight >= 10);
  assert.ok(layout.rows.at(-1).valueY < layout.promptY - 4);
});
