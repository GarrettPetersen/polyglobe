import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDashboardSnapshot,
  dashboardQueries,
  validateDashboardWindow
} from "./dashboardData.js";

test("dashboard windows are deliberately bounded", () => {
  assert.equal(validateDashboardWindow("30"), 30);
  assert.throws(() => validateDashboardWindow(14), /must be one of/);
  assert.match(dashboardQueries(7).daily, /INTERVAL '7' DAY/);
});

test("dashboard queries count every consenting event without cohort estimates", () => {
  const sql = Object.values(dashboardQueries(7)).join("\n");
  assert.doesNotMatch(sql, /\bdouble1\b/);
  assert.doesNotMatch(sql, /DISTINCT index1\) \* 100/);
});

test("dashboard crash reports are newest first", () => {
  assert.match(
    dashboardQueries(7).crashes,
    /ORDER BY last_seen DESC, reports DESC/
  );
});

test("dashboard snapshots normalize aggregate query rows", () => {
  const snapshot = buildDashboardSnapshot(30, {
    totals: [{ sessions: 400, active_hours: 25, voyages: 100, crashes: 2 }],
    players: [{ players: 200 }],
    daily: [{ day: "2026-07-25", sessions: 40, active_hours: 2.5, voyages: 10, crashes: 1 }],
    channels: [{ channel: "web-prototype", players: 100, sessions: 300 }],
    retention: [{ channel: "web-prototype", return_window: "next-day", sessions: 25 }],
    outcomes: [{
      main_quest: "explorer",
      outcome: "victory",
      voyages: 20,
      average_active_seconds: 3600,
      average_mapped_percent: 12.5
    }],
    features: [{
      voyages: 100,
      trade: 80,
      fish: 60,
      scavenge: 40,
      combat: 50,
      whale: 20,
      colonize: 10,
      piracy: 30,
      diplomacy: 40,
      side_quests: 70,
      animals: 15,
      panda: 2,
      penguin: 1
    }],
    environments: [{
      platform: "browser",
      locale: "en",
      revision: "abc123",
      sessions: 300
    }],
    crashes: [{
      fingerprint: "fingerprint",
      revision: "abc123",
      channel: "web-prototype",
      platform: "browser",
      screen: "sailing",
      error_name: "Error",
      message: "Boom",
      reports: 2,
      affected_installations: 1,
      first_seen: "2026-07-25 10:00:00.000",
      last_seen: "2026-07-25 11:00:00.000"
    }]
  }, "2026-07-25T12:00:00.000Z");
  assert.equal(snapshot.totals.averageSessionMinutes, 3.8);
  assert.equal(snapshot.totals.crashesPerThousandSessions, 5);
  assert.deepEqual(snapshot.features.find((entry) => entry.id === "trade"), {
    id: "trade",
    voyages: 80,
    percent: 80
  });
  assert.deepEqual(snapshot.features.find((entry) => entry.id === "penguin"), {
    id: "penguin",
    voyages: 1,
    percent: 1
  });
});
