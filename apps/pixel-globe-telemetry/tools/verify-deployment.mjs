import { randomUUID } from "node:crypto";

import { queryAnalyticsEngine } from "./analyticsEngine.mjs";

const endpoint = "https://telemetry.marque-and-reprisal.com";
const eventId = `deployment-${randomUUID()}`;

const health = await jsonFetch(`${endpoint}/health`);
if (!health.ok || health.schemaVersion !== 1) {
  throw new Error("Telemetry health check did not report a configured schema-v1 service");
}

const preflight = await fetch(`${endpoint}/v1/events`, {
  method: "OPTIONS",
  headers: { origin: "file://" }
});
if (preflight.status !== 204 ||
    preflight.headers.get("access-control-allow-origin") !== "*") {
  throw new Error("Telemetry CORS preflight failed");
}

const ingestion = await jsonFetch(`${endpoint}/v1/events`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    events: [{
      schemaVersion: 1,
      eventId,
      type: "voyage_end",
      installationId: `deployment-${randomUUID()}`,
      sessionId: `deployment-${randomUUID()}`,
      occurredAt: new Date().toISOString(),
      metadata: {
        edition: "full",
        revision: "deployment-check",
        channel: "deployment-check",
        platform: "verification",
        locale: "en",
        gameStateVersion: 1
      },
      payload: {
        samplingWeight: 1,
        outcome: "quit",
        mainQuest: "explorer",
        activePlaySeconds: 60,
        daysAtSea: 1,
        endingDoubloons: 100,
        grossDoubloonsEarned: 0,
        mappedPercent: 0,
        discoveries: 0,
        visitedPorts: 0,
        completedQuests: 0,
        crewLost: 0,
        ship: "deployment-check",
        features: ["animals", "raccoon"],
        companionStatuses: "panda:unmet,penguin:unmet,raccoon:aboard",
        defeatedShips: 0,
        whalesKilled: 0,
        coloniesFounded: 0,
        spicesSold: 0
      }
    }]
  })
});
if (ingestion.accepted !== 1) throw new Error("Telemetry ingestion check was not accepted");

const sql = `
  SELECT count() AS rows
  FROM marque_and_reprisal_game_events
  WHERE blob1 = 'voyage_end'
    AND blob4 = 'deployment-check'
    AND blob11 = 'animals,raccoon'
    AND blob12 = 'panda:unmet,penguin:unmet,raccoon:aboard'
    AND blob19 = '${eventId}'
    AND timestamp > NOW() - INTERVAL '1' DAY
`;

let storedRows = 0;
for (let attempt = 0; attempt < 24 && storedRows < 1; attempt++) {
  if (attempt > 0) await delay(5000);
  const rows = await queryAnalyticsEngine(sql);
  storedRows = Number(rows[0]?.rows || 0);
}
if (storedRows < 1) {
  throw new Error("Raccoon acquisition event was accepted but did not become queryable");
}

console.log(
  "Telemetry deployment verified: health, CORS, raccoon acquisition ingestion, and Analytics Engine query."
);

async function jsonFetch(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
