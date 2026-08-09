import assert from "node:assert/strict";
import test from "node:test";

import { copyCrashReport, formatCrashReport } from "./crashReport.js";

test("crash reports include actionable runtime context without save contents", () => {
  const error = new Error("Visible tile moved");
  const report = formatCrashReport({
    error,
    heading: "Prototype runtime failure",
    occurredAt: "2026-08-09T18:00:00.000Z",
    metadata: {
      revision: "abc123",
      edition: "full",
      channel: "web-prototype",
      platform: "browser"
    },
    context: { screen: "sailing", mainQuest: "explorer", ship: "caravel" },
    language: "en",
    viewport: { width: 455, height: 256 },
    userAgent: "Test Browser"
  });

  assert.match(report, /Visible tile moved/);
  assert.match(report, /Build: abc123/);
  assert.match(report, /Screen: sailing/);
  assert.match(report, /Main quest: explorer/);
  assert.match(report, /Ship: caravel/);
  assert.match(report, /Viewport: 455x256/);
  assert.doesNotMatch(report, /save/i);
});

test("crash reports use the async clipboard when available", async () => {
  let copied = null;
  assert.equal(await copyCrashReport("report", {
    clipboard: { writeText: async (text) => { copied = text; } },
    documentObject: null
  }), true);
  assert.equal(copied, "report");
});
