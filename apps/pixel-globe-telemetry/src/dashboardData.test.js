import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCURATE_SESSION_PLAYTIME_SINCE,
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

test("session playtime is aggregated without returning session identifiers", () => {
  const queries = dashboardQueries(30);
  assert.match(queries.playtimeStats, /GROUP BY session_id/);
  assert.match(queries.playtimeStats, /quantileExactWeighted\(0\.5\)/);
  assert.match(queries.playtimeStats, new RegExp(ACCURATE_SESSION_PLAYTIME_SINCE));
  assert.match(queries.playtimeStats, /double17 >= 2/);
  assert.match(queries.totals, new RegExp(ACCURATE_SESSION_PLAYTIME_SINCE));
  assert.match(queries.playtimeDistribution, /GROUP BY duration_bucket/);
});

test("dashboard snapshots normalize aggregate query rows", () => {
  const snapshot = buildDashboardSnapshot(30, {
    totals: [{ sessions: 400, active_hours: 25, voyage_starts: 180, voyages: 100, crashes: 2 }],
    players: [{ players: 200 }],
    daily: [{
      day: "2026-07-25",
      sessions: 40,
      active_hours: 2.5,
      voyage_starts: 18,
      voyages: 10,
      crashes: 1
    }],
    playtimeStats: [{
      sessions: 400,
      mean_seconds: 225,
      median_seconds: 90,
      max_seconds: 3600
    }],
    playtimeDistribution: [{
      duration_bucket: 0,
      sessions: 100,
      average_seconds: 0
    }, {
      duration_bucket: 17,
      sessions: 300,
      average_seconds: 300
    }],
    channels: [{ channel: "web-prototype", players: 100, sessions: 300 }],
    retention: [{ channel: "web-prototype", return_window: "next-day", sessions: 25 }],
    outcomes: [{
      main_quest: "explorer",
      outcome: "victory",
      voyages: 20,
      average_active_seconds: 3600,
      average_mapped_percent: 12.5
    }],
    starts: [{
      main_quest: "explorer",
      faction: "portugal",
      ship: "caravel",
      home_port: "Lisbon",
      start_region: "europe",
      religion: "roman-catholic",
      captain_sex: "female",
      captain_skills: "master-navigator",
      loadout: "provisional-short-haul",
      voyage_starts: 12,
      average_age: 31.5,
      average_crew: 12,
      average_cannons: 4,
      average_cargo: 90,
      average_food_days: 20,
      average_water_days: 20,
      average_doubloons: 500
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
      penguin: 1,
      raccoon: 3
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
  assert.equal(snapshot.totals.voyageStarts, 180);
  assert.equal(snapshot.totals.crashesPerThousandSessions, 5);
  assert.deepEqual(snapshot.playtime, {
    measuredSince: "2026-08-05T05:45:00Z",
    sessions: 400,
    meanSeconds: 225,
    medianSeconds: 90,
    maxSeconds: 3600,
    buckets: [{ id: 0, sessions: 100, averageSeconds: 0 }, {
      id: 17,
      sessions: 300,
      averageSeconds: 300
    }]
  });
  assert.equal(JSON.stringify(snapshot).includes("session_id"), false);
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
  assert.deepEqual(snapshot.features.find((entry) => entry.id === "raccoon"), {
    id: "raccoon",
    voyages: 3,
    percent: 3
  });
  assert.deepEqual(snapshot.starts[0], {
    mainQuest: "explorer",
    faction: "portugal",
    ship: "caravel",
    homePort: "Lisbon",
    startRegion: "europe",
    religion: "roman-catholic",
    captainSex: "female",
    captainSkills: "master-navigator",
    loadout: "provisional-short-haul",
    starts: 12,
    averageAge: 31.5,
    averageCrew: 12,
    averageCannons: 4,
    averageCargo: 90,
    averageFoodDays: 20,
    averageWaterDays: 20,
    averageDoubloons: 500
  });
});
