import {
  ANALYTICS_ENGINE_DATASET,
  queryAnalyticsEngine
} from "./analyticsEngine.mjs";

const dataset = ANALYTICS_ENGINE_DATASET;
const windowDays = integerArgument(process.argv.slice(2), "--days", 30);

const sections = [
  ["ACTIVITY", `
    SELECT blob4 AS channel, blob1 AS event_type,
      round(SUM(_sample_interval * double1)) AS estimated_events,
      count() AS stored_rows
    FROM ${dataset}
    WHERE timestamp > NOW() - INTERVAL '${windowDays}' DAY
      AND blob4 != 'deployment-check'
    GROUP BY channel, event_type
    ORDER BY channel, event_type
  `],
  ["ACTIVE PLAYTIME", `
    SELECT blob4 AS channel,
      round(SUM(_sample_interval * double1 * double2) / 3600, 1) AS estimated_hours
    FROM ${dataset}
    WHERE blob1 = 'session_checkpoint'
      AND blob4 != 'deployment-check'
      AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
    GROUP BY channel
    ORDER BY estimated_hours DESC
  `],
  ["UNIQUE PLAYERS", `
    SELECT blob4 AS channel,
      count(DISTINCT index1) * 100 AS estimated_unique_installations,
      round(SUM(_sample_interval * double1)) AS estimated_sessions
    FROM ${dataset}
    WHERE blob1 = 'session_start'
      AND blob4 != 'deployment-check'
      AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
    GROUP BY channel
    ORDER BY estimated_unique_installations DESC
  `],
  ["RETENTION SIGNAL", `
    SELECT blob4 AS channel,
      if(double16 < 0, 'first session',
        if(double16 = 0, 'same day',
          if(double16 = 1, 'next day',
            if(double16 <= 7, '2-7 days', '8+ days')))) AS return_window,
      round(SUM(_sample_interval * double1)) AS estimated_sessions
    FROM ${dataset}
    WHERE blob1 = 'session_start'
      AND blob4 != 'deployment-check'
      AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
    GROUP BY channel, return_window
    ORDER BY channel, return_window
  `],
  ["VOYAGE OUTCOMES", `
    SELECT blob8 AS main_quest, blob9 AS outcome,
      round(SUM(_sample_interval * double1)) AS estimated_voyages,
      round(SUM(_sample_interval * double1 * double2) /
        SUM(_sample_interval * double1)) AS average_active_seconds,
      round(SUM(_sample_interval * double1 * double6) /
        SUM(_sample_interval * double1), 2) AS average_mapped_percent
    FROM ${dataset}
    WHERE blob1 = 'voyage_end'
      AND blob4 != 'deployment-check'
      AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
    GROUP BY main_quest, outcome
    ORDER BY main_quest, outcome
  `],
  ["FEATURE ENGAGEMENT", `
    SELECT
      round(SUM(_sample_interval * double1)) AS estimated_voyages,
      round(SUM(_sample_interval * double1 * if(position('trade' IN blob11) > 0, 1, 0))) AS traded,
      round(SUM(_sample_interval * double1 * if(position('fish' IN blob11) > 0, 1, 0))) AS fished,
      round(SUM(_sample_interval * double1 * if(position('whale' IN blob11) > 0, 1, 0))) AS whaled,
      round(SUM(_sample_interval * double1 * if(position('combat' IN blob11) > 0, 1, 0))) AS fought,
      round(SUM(_sample_interval * double1 * if(position('colonize' IN blob11) > 0, 1, 0))) AS colonized,
      round(SUM(_sample_interval * double1 * if(position('side-quests' IN blob11) > 0, 1, 0))) AS side_quests,
      round(SUM(_sample_interval * double1 * if(position('animals' IN blob11) > 0, 1, 0))) AS animals,
      round(SUM(_sample_interval * double1 * if(position('panda' IN blob11) > 0, 1, 0))) AS panda
    FROM ${dataset}
    WHERE blob1 = 'voyage_end'
      AND blob4 != 'deployment-check'
      AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
    HAVING estimated_voyages > 0
  `],
  ["CRASH GROUPS", `
    SELECT blob13 AS fingerprint, blob3 AS revision, blob17 AS screen,
      blob14 AS error_name, blob15 AS message,
      round(SUM(_sample_interval)) AS reports
    FROM ${dataset}
    WHERE blob1 = 'crash'
      AND blob4 != 'deployment-check'
      AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
    GROUP BY fingerprint, revision, screen, error_name, message
    ORDER BY reports DESC
    LIMIT 30
  `]
];

console.log(`Marque & Reprisal telemetry, last ${windowDays} days`);
for (const [title, sql] of sections) {
  const rows = await queryAnalyticsEngine(sql);
  console.log(`\n${title}`);
  if (rows.length === 0) console.log("(no data)");
  else console.table(rows);
}

function integerArgument(args, name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 90) {
    throw new Error(`${name} must be an integer from 1 to 90`);
  }
  return value;
}
