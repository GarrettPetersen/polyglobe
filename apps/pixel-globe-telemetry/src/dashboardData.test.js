import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCURATE_SESSION_PLAYTIME_SINCE,
  ACCURATE_VOYAGE_START_PROFILE,
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

test("dashboard voyage starts include only immutable opening profiles", () => {
  const queries = dashboardQueries(30);
  assert.match(queries.totals, new RegExp(ACCURATE_VOYAGE_START_PROFILE));
  assert.match(queries.daily, new RegExp(ACCURATE_VOYAGE_START_PROFILE));
  assert.match(queries.starts, new RegExp(ACCURATE_VOYAGE_START_PROFILE));
});

test("dashboard crash reports are newest first", () => {
  assert.match(
    dashboardQueries(7).crashes,
    /ORDER BY last_seen DESC, reports DESC/
  );
});

test("dashboard performance incidents are newest first and grouped by actionable context", () => {
  const queries = dashboardQueries(7);
  const query = queries.performanceIssues;
  assert.match(query, /WHERE blob1 = 'low_fps'/);
  assert.match(
    query,
    /GROUP BY revision, channel, platform, screen, main_quest, ship, dominant_stage,\s*stage_summary, scene_summary/
  );
  assert.match(query, /ORDER BY last_seen DESC, affected_installations DESC/);
  assert.match(queries.freezeIssues, /WHERE blob1 = 'freeze'/);
  assert.match(
    queries.freezeIssues,
    /GROUP BY revision, channel, platform, screen, main_quest, ship, cause,\s*recent_work, scene_summary/
  );
  assert.match(queries.freezeIssues, /ORDER BY last_seen DESC, affected_installations DESC/);
});

test("dashboard performance incidents split at their independent all-fixed cursor", () => {
  const queries = dashboardQueries(
    7,
    "2026-08-05T12:00:00.000Z",
    "2026-08-05T12:34:56.000Z"
  );
  assert.match(queries.performanceIssues, /timestamp > toDateTime\('2026-08-05 12:34:56'\)/);
  assert.match(queries.freezeIssues, /timestamp > toDateTime\('2026-08-05 12:34:56'\)/);
  assert.match(queries.fixedPerformanceIssues, /timestamp <= toDateTime\('2026-08-05 12:34:56'\)/);
  assert.match(queries.fixedFreezeIssues, /timestamp <= toDateTime\('2026-08-05 12:34:56'\)/);
  assert.match(queries.performanceStatus, /AS active_reports/);
  assert.match(queries.performanceStatus, /AS historical_reports/);
});

test("dashboard crash reports split at the all-fixed cursor", () => {
  const queries = dashboardQueries(7, "2026-08-05T12:34:56.000Z");
  assert.match(queries.crashes, /timestamp > toDateTime\('2026-08-05 12:34:56'\)/);
  assert.match(queries.fixedCrashes, /timestamp <= toDateTime\('2026-08-05 12:34:56'\)/);
  assert.match(queries.crashStatus, /AS active_reports/);
  assert.match(queries.crashStatus, /AS historical_reports/);
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
    performanceIssues: [{
      revision: "abc123",
      channel: "web-prototype",
      platform: "browser",
      screen: "sailing",
      main_quest: "explorer",
      ship: "caravel",
      dominant_stage: "render",
      stage_summary: "render:50/95,npcShips:20/35",
      scene_summary: "viewport=416x280;samples=204;density=0.3;chart=171;npc=17;draws=42",
      average_fps: 10,
      average_p95_frame_ms: 120,
      average_p95_cpu_ms: 100,
      average_long_frame_percent: 95,
      average_duration_seconds: 20.4,
      reports: 2,
      affected_installations: 2,
      first_seen: "2026-07-25 10:00:00.000",
      last_seen: "2026-07-25 11:00:00.000"
    }],
    freezeIssues: [{
      revision: "abc123",
      channel: "web-prototype",
      platform: "browser",
      screen: "sailing",
      main_quest: "explorer",
      ship: "caravel",
      cause: "save.periodic",
      recent_work: "save.periodic",
      scene_summary: "viewport=416x280;density=0.3;chart=171;npc=17;draws=42",
      average_gap_ms: 1850,
      average_cpu_ms: 15,
      average_scheduler_delay_ms: 1835,
      average_recent_work_ms: 1720,
      reports: 1,
      affected_installations: 1,
      first_seen: "2026-07-25 10:30:00.000",
      last_seen: "2026-07-25 10:30:00.000"
    }],
    fixedPerformanceIssues: [],
    fixedFreezeIssues: [],
    performanceStatus: [{ active_reports: 3, historical_reports: 4 }],
    crashStatus: [{ active_reports: 2, historical_reports: 3 }],
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
    }],
    fixedCrashes: [{
      fingerprint: "old-fingerprint",
      revision: "old123",
      channel: "web-prototype",
      platform: "browser",
      screen: "port",
      error_name: "Error",
      message: "Old boom",
      reports: 3,
      affected_installations: 2,
      first_seen: "2026-07-24 10:00:00.000",
      last_seen: "2026-07-24 11:00:00.000"
    }]
  },
  "2026-07-25T12:00:00.000Z",
  "2026-07-25T11:30:00.000Z",
  "2026-07-25T11:45:00.000Z");
  assert.equal(snapshot.totals.averageSessionMinutes, 3.8);
  assert.equal(snapshot.totals.voyageStarts, 180);
  assert.equal(snapshot.totals.crashesPerThousandSessions, 5);
  assert.deepEqual(snapshot.crashCursor, {
    allFixedAt: "2026-07-25T11:30:00.000Z",
    activeReports: 2,
    historicalReports: 3
  });
  assert.deepEqual(snapshot.performanceCursor, {
    allFixedAt: "2026-07-25T11:45:00.000Z",
    activeReports: 3,
    historicalReports: 4
  });
  assert.equal(snapshot.crashes[0].message, "Boom");
  assert.equal(snapshot.fixedCrashes[0].message, "Old boom");
  assert.deepEqual(snapshot.performanceIssues[0], {
    revision: "abc123",
    channel: "web-prototype",
    platform: "browser",
    screen: "sailing",
    mainQuest: "explorer",
    ship: "caravel",
    dominantStage: "render",
    stageSummary: "render:50/95,npcShips:20/35",
    sceneSummary: "viewport=416x280;samples=204;density=0.3;chart=171;npc=17;draws=42",
    averageFps: 10,
    averageP95FrameMs: 120,
    averageP95CpuMs: 100,
    averageLongFramePercent: 95,
    averageDurationSeconds: 20.4,
    reports: 2,
    affectedInstallations: 2,
    firstSeen: "2026-07-25 10:00:00.000",
    lastSeen: "2026-07-25 11:00:00.000"
  });
  assert.deepEqual(snapshot.freezeIssues[0], {
    revision: "abc123",
    channel: "web-prototype",
    platform: "browser",
    screen: "sailing",
    mainQuest: "explorer",
    ship: "caravel",
    cause: "save.periodic",
    recentWork: "save.periodic",
    sceneSummary: "viewport=416x280;density=0.3;chart=171;npc=17;draws=42",
    averageGapMs: 1850,
    averageCpuMs: 15,
    averageSchedulerDelayMs: 1835,
    averageRecentWorkMs: 1720,
    reports: 1,
    affectedInstallations: 1,
    firstSeen: "2026-07-25 10:30:00.000",
    lastSeen: "2026-07-25 10:30:00.000"
  });
  assert.deepEqual(snapshot.playtime, {
    measuredSince: "2026-08-05T05:38:00Z",
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
