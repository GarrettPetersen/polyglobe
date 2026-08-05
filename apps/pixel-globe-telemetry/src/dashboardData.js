const DATASET = "marque_and_reprisal_game_events";
export const ACCURATE_SESSION_PLAYTIME_SINCE = "2026-08-05 05:45:00";
export const DASHBOARD_WINDOWS = Object.freeze([1, 7, 30, 90]);

export async function fetchDashboardSnapshot(env, windowDays, {
  fetchImpl = globalThis.fetch?.bind(globalThis),
  generatedAt = new Date().toISOString()
} = {}) {
  const days = validateDashboardWindow(windowDays);
  if (typeof fetchImpl !== "function") throw new Error("Dashboard analytics requires fetch");
  const accountId = requiredSecret(env.ANALYTICS_ACCOUNT_ID, "ANALYTICS_ACCOUNT_ID");
  const apiToken = requiredSecret(env.ANALYTICS_API_TOKEN, "ANALYTICS_API_TOKEN");
  const queries = dashboardQueries(days);
  const entries = await Promise.all(Object.entries(queries).map(async ([name, sql]) => {
    const rows = await queryAnalyticsEngine({ accountId, apiToken, sql, fetchImpl });
    return [name, rows];
  }));
  return buildDashboardSnapshot(days, Object.fromEntries(entries), generatedAt);
}

export function dashboardQueries(windowDays) {
  const days = validateDashboardWindow(windowDays);
  const where = `
    blob4 != 'deployment-check'
    AND timestamp > NOW() - INTERVAL '${days}' DAY
  `;
  const sessionsByDuration = `
    SELECT blob7 AS session_id,
      SUM(if(blob1 = 'session_checkpoint', _sample_interval * double2, 0.0)) AS active_seconds
    FROM ${DATASET}
    WHERE blob1 IN ('session_start', 'session_checkpoint')
      AND double17 >= 2
      AND timestamp >= toDateTime('${ACCURATE_SESSION_PLAYTIME_SINCE}') AND ${where}
    GROUP BY session_id
  `;
  return Object.freeze({
    totals: `
      SELECT
        round(SUM(_sample_interval * if(blob1 = 'session_start', 1, 0))) AS sessions,
        round(SUM(_sample_interval * if(
          blob1 = 'session_checkpoint' AND double17 >= 2
            AND timestamp >= toDateTime('${ACCURATE_SESSION_PLAYTIME_SINCE}'),
          double2, 0.0
        )) / 3600, 1) AS active_hours,
        round(SUM(_sample_interval * if(blob1 = 'voyage_start', 1, 0))) AS voyage_starts,
        round(SUM(_sample_interval * if(blob1 = 'voyage_end', 1, 0))) AS voyages,
        round(SUM(_sample_interval * if(blob1 = 'crash', 1, 0))) AS crashes
      FROM ${DATASET}
      WHERE ${where}
    `,
    players: `
      SELECT count(DISTINCT index1) AS players
      FROM ${DATASET}
      WHERE blob1 = 'session_start' AND ${where}
    `,
    daily: `
      SELECT toDate(timestamp) AS day,
        round(SUM(_sample_interval * if(blob1 = 'session_start', 1, 0))) AS sessions,
        round(SUM(_sample_interval * if(
          blob1 = 'session_checkpoint' AND double17 >= 2
            AND timestamp >= toDateTime('${ACCURATE_SESSION_PLAYTIME_SINCE}'),
          double2, 0.0
        )) / 3600, 1) AS active_hours,
        round(SUM(_sample_interval * if(blob1 = 'voyage_start', 1, 0))) AS voyage_starts,
        round(SUM(_sample_interval * if(blob1 = 'voyage_end', 1, 0))) AS voyages,
        round(SUM(_sample_interval * if(blob1 = 'crash', 1, 0))) AS crashes
      FROM ${DATASET}
      WHERE ${where}
      GROUP BY day
      ORDER BY day
    `,
    playtimeStats: `
      SELECT count() AS sessions,
        round(avg(active_seconds), 1) AS mean_seconds,
        round(quantileExactWeighted(0.5)(active_seconds, 1), 1) AS median_seconds,
        round(max(active_seconds), 1) AS max_seconds
      FROM (${sessionsByDuration})
    `,
    playtimeDistribution: `
      SELECT floor(log(1 + active_seconds / 30.0) * 8) AS duration_bucket,
        count() AS sessions,
        round(avg(active_seconds), 1) AS average_seconds
      FROM (${sessionsByDuration})
      GROUP BY duration_bucket
      ORDER BY duration_bucket
    `,
    channels: `
      SELECT blob4 AS channel,
        count(DISTINCT index1) AS players,
        round(SUM(_sample_interval)) AS sessions
      FROM ${DATASET}
      WHERE blob1 = 'session_start' AND ${where}
      GROUP BY channel
      ORDER BY sessions DESC
    `,
    retention: `
      SELECT blob4 AS channel,
        if(double16 < 0, 'first',
          if(double16 = 0, 'same-day',
            if(double16 = 1, 'next-day',
              if(double16 <= 7, '2-7-days', '8+-days')))) AS return_window,
        round(SUM(_sample_interval)) AS sessions
      FROM ${DATASET}
      WHERE blob1 = 'session_start' AND ${where}
      GROUP BY channel, return_window
      ORDER BY channel, return_window
    `,
    outcomes: `
      SELECT blob8 AS main_quest, blob9 AS outcome,
        round(SUM(_sample_interval)) AS voyages,
        round(SUM(_sample_interval * double2) /
          SUM(_sample_interval)) AS average_active_seconds,
        round(SUM(_sample_interval * double6) /
          SUM(_sample_interval), 2) AS average_mapped_percent
      FROM ${DATASET}
      WHERE blob1 = 'voyage_end' AND ${where}
      GROUP BY main_quest, outcome
      ORDER BY voyages DESC
    `,
    starts: `
      SELECT blob8 AS main_quest, blob9 AS faction, blob10 AS ship,
        blob11 AS home_port, blob12 AS start_region, blob13 AS religion,
        blob14 AS captain_sex, blob15 AS captain_skills, blob16 AS loadout,
        round(SUM(_sample_interval)) AS voyage_starts,
        round(SUM(_sample_interval * double2) / SUM(_sample_interval), 1) AS average_age,
        round(SUM(_sample_interval * double3) / SUM(_sample_interval), 1) AS average_crew,
        round(SUM(_sample_interval * double4) / SUM(_sample_interval), 1) AS average_cannons,
        round(SUM(_sample_interval * double5) / SUM(_sample_interval), 1) AS average_cargo,
        round(SUM(_sample_interval * double6) / SUM(_sample_interval), 1) AS average_food_days,
        round(SUM(_sample_interval * double7) / SUM(_sample_interval), 1) AS average_water_days,
        round(SUM(_sample_interval * double8) / SUM(_sample_interval), 1) AS average_doubloons
      FROM ${DATASET}
      WHERE blob1 = 'voyage_start' AND ${where}
      GROUP BY main_quest, faction, ship, home_port, start_region, religion,
        captain_sex, captain_skills, loadout
      ORDER BY voyage_starts DESC, main_quest, faction, home_port
      LIMIT 100
    `,
    features: `
      SELECT
        round(SUM(_sample_interval)) AS voyages,
        round(SUM(_sample_interval * if(position('trade' IN blob11) > 0, 1, 0))) AS trade,
        round(SUM(_sample_interval * if(position('fish' IN blob11) > 0, 1, 0))) AS fish,
        round(SUM(_sample_interval * if(position('scavenge' IN blob11) > 0, 1, 0))) AS scavenge,
        round(SUM(_sample_interval * if(position('combat' IN blob11) > 0, 1, 0))) AS combat,
        round(SUM(_sample_interval * if(position('whale' IN blob11) > 0, 1, 0))) AS whale,
        round(SUM(_sample_interval * if(position('colonize' IN blob11) > 0, 1, 0))) AS colonize,
        round(SUM(_sample_interval * if(position('piracy' IN blob11) > 0, 1, 0))) AS piracy,
        round(SUM(_sample_interval * if(position('diplomacy' IN blob11) > 0, 1, 0))) AS diplomacy,
        round(SUM(_sample_interval * if(position('side-quests' IN blob11) > 0, 1, 0))) AS side_quests,
        round(SUM(_sample_interval * if(position('animals' IN blob11) > 0, 1, 0))) AS animals,
        round(SUM(_sample_interval * if(position('panda' IN blob11) > 0, 1, 0))) AS panda,
        round(SUM(_sample_interval * if(position('penguin' IN blob11) > 0, 1, 0))) AS penguin,
        round(SUM(_sample_interval * if(position('raccoon' IN blob11) > 0, 1, 0))) AS raccoon
      FROM ${DATASET}
      WHERE blob1 = 'voyage_end' AND ${where}
    `,
    environments: `
      SELECT blob5 AS platform, blob6 AS locale, blob3 AS revision,
        round(SUM(_sample_interval)) AS sessions
      FROM ${DATASET}
      WHERE blob1 = 'session_start' AND ${where}
      GROUP BY platform, locale, revision
      ORDER BY sessions DESC
      LIMIT 40
    `,
    crashes: `
      SELECT blob13 AS fingerprint, blob3 AS revision, blob4 AS channel,
        blob5 AS platform, blob17 AS screen, blob14 AS error_name,
        blob15 AS message, count() AS reports,
        count(DISTINCT index1) AS affected_installations,
        min(timestamp) AS first_seen, max(timestamp) AS last_seen
      FROM ${DATASET}
      WHERE blob1 = 'crash' AND ${where}
      GROUP BY fingerprint, revision, channel, platform, screen, error_name, message
      ORDER BY last_seen DESC, reports DESC
      LIMIT 40
    `
  });
}

export function buildDashboardSnapshot(windowDays, results, generatedAt = new Date().toISOString()) {
  const days = validateDashboardWindow(windowDays);
  for (const name of Object.keys(dashboardQueries(days))) {
    if (!Array.isArray(results?.[name])) throw new Error(`Missing dashboard query result: ${name}`);
  }
  const totalsRow = results.totals[0] || {};
  const playerRow = results.players[0] || {};
  const totals = {
    players: nonnegativeNumber(playerRow.players),
    sessions: nonnegativeNumber(totalsRow.sessions),
    activeHours: nonnegativeNumber(totalsRow.active_hours),
    voyageStarts: nonnegativeNumber(totalsRow.voyage_starts),
    voyages: nonnegativeNumber(totalsRow.voyages),
    crashes: nonnegativeNumber(totalsRow.crashes)
  };
  totals.crashesPerThousandSessions = totals.sessions > 0
    ? round((totals.crashes * 1000) / totals.sessions, 1)
    : 0;
  const playtimeStatsRow = results.playtimeStats[0] || {};
  const playtime = {
    measuredSince: `${ACCURATE_SESSION_PLAYTIME_SINCE.replace(" ", "T")}Z`,
    sessions: nonnegativeNumber(playtimeStatsRow.sessions),
    meanSeconds: nonnegativeNumber(playtimeStatsRow.mean_seconds),
    medianSeconds: nonnegativeNumber(playtimeStatsRow.median_seconds),
    maxSeconds: nonnegativeNumber(playtimeStatsRow.max_seconds),
    buckets: results.playtimeDistribution.map((row) => ({
      id: nonnegativeInteger(row.duration_bucket, "playtime bucket"),
      sessions: nonnegativeNumber(row.sessions),
      averageSeconds: nonnegativeNumber(row.average_seconds)
    }))
  };
  totals.averageSessionMinutes = playtime.sessions > 0
    ? round(playtime.meanSeconds / 60, 1)
    : 0;
  const featureRow = results.features[0] || {};
  const featureVoyages = nonnegativeNumber(featureRow.voyages);
  const featureNames = [
    "trade", "fish", "scavenge", "combat", "whale", "colonize",
    "piracy", "diplomacy", "side_quests", "animals", "panda", "penguin", "raccoon"
  ];
  return {
    schemaVersion: 1,
    generatedAt: requiredString(generatedAt, "generatedAt"),
    windowDays: days,
    totals,
    playtime,
    daily: results.daily.map((row) => ({
      day: requiredString(row.day, "daily day"),
      sessions: nonnegativeNumber(row.sessions),
      activeHours: nonnegativeNumber(row.active_hours),
      voyageStarts: nonnegativeNumber(row.voyage_starts),
      voyages: nonnegativeNumber(row.voyages),
      crashes: nonnegativeNumber(row.crashes)
    })),
    channels: results.channels.map((row) => ({
      channel: requiredString(row.channel, "channel"),
      players: nonnegativeNumber(row.players),
      sessions: nonnegativeNumber(row.sessions)
    })),
    retention: results.retention.map((row) => ({
      channel: requiredString(row.channel, "retention channel"),
      window: requiredString(row.return_window, "retention window"),
      sessions: nonnegativeNumber(row.sessions)
    })),
    outcomes: results.outcomes.map((row) => ({
      mainQuest: optionalString(row.main_quest) || "unknown",
      outcome: optionalString(row.outcome) || "unknown",
      voyages: nonnegativeNumber(row.voyages),
      averageActiveSeconds: nonnegativeNumber(row.average_active_seconds),
      averageMappedPercent: nonnegativeNumber(row.average_mapped_percent)
    })),
    starts: results.starts.map((row) => ({
      mainQuest: requiredString(row.main_quest, "start main quest"),
      faction: requiredString(row.faction, "start faction"),
      ship: requiredString(row.ship, "start ship"),
      homePort: requiredString(row.home_port, "start home port"),
      startRegion: requiredString(row.start_region, "start region"),
      religion: requiredString(row.religion, "start religion"),
      captainSex: requiredString(row.captain_sex, "start captain sex"),
      captainSkills: requiredString(row.captain_skills, "start captain skills"),
      loadout: requiredString(row.loadout, "start loadout"),
      starts: nonnegativeNumber(row.voyage_starts),
      averageAge: nonnegativeNumber(row.average_age),
      averageCrew: nonnegativeNumber(row.average_crew),
      averageCannons: nonnegativeNumber(row.average_cannons),
      averageCargo: nonnegativeNumber(row.average_cargo),
      averageFoodDays: nonnegativeNumber(row.average_food_days),
      averageWaterDays: nonnegativeNumber(row.average_water_days),
      averageDoubloons: nonnegativeNumber(row.average_doubloons)
    })),
    features: featureNames.map((id) => {
      const voyages = nonnegativeNumber(featureRow[id]);
      return {
        id: id.replace("_", "-"),
        voyages,
        percent: featureVoyages > 0 ? round((voyages / featureVoyages) * 100, 1) : 0
      };
    }),
    environments: results.environments.map((row) => ({
      platform: requiredString(row.platform, "platform"),
      locale: requiredString(row.locale, "locale"),
      revision: requiredString(row.revision, "revision"),
      sessions: nonnegativeNumber(row.sessions)
    })),
    crashes: results.crashes.map((row) => ({
      fingerprint: requiredString(row.fingerprint, "crash fingerprint"),
      revision: requiredString(row.revision, "crash revision"),
      channel: requiredString(row.channel, "crash channel"),
      platform: requiredString(row.platform, "crash platform"),
      screen: requiredString(row.screen, "crash screen"),
      errorName: requiredString(row.error_name, "crash error"),
      message: optionalString(row.message),
      reports: nonnegativeNumber(row.reports),
      affectedInstallations: nonnegativeNumber(row.affected_installations),
      firstSeen: requiredString(row.first_seen, "crash first seen"),
      lastSeen: requiredString(row.last_seen, "crash last seen")
    }))
  };
}

export function validateDashboardWindow(value) {
  const parsed = Number(value);
  if (!DASHBOARD_WINDOWS.includes(parsed)) {
    throw new Error(`Dashboard window must be one of ${DASHBOARD_WINDOWS.join(", ")}`);
  }
  return parsed;
}

async function queryAnalyticsEngine({ accountId, apiToken, sql, fetchImpl }) {
  const response = await fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "text/plain"
      },
      body: sql.trim()
    }
  );
  const responseText = await response.text();
  let body;
  try {
    body = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Analytics query returned invalid JSON (${response.status}): ` +
      `${responseText.slice(0, 500) || "empty response"}`
    );
  }
  if (!response.ok || body.success === false) {
    const reason = body.errors?.map((entry) => entry.message).join("; ") || "unknown error";
    throw new Error(`Analytics query failed (${response.status}): ${reason}`);
  }
  return Array.isArray(body.data) ? body.data : Array.isArray(body.result) ? body.result : [];
}

function requiredSecret(value, name) {
  if (typeof value !== "string" || value.length < 1) throw new Error(`Missing ${name}`);
  return value;
}

function nonnegativeNumber(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid dashboard number: ${value}`);
  return parsed;
}

function nonnegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid ${label}: ${value}`);
  return parsed;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Invalid ${label}`);
  return value;
}

function optionalString(value) {
  return typeof value === "string" && value !== "" ? value : null;
}

function round(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
