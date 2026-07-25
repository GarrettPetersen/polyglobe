import { randomUUID } from "node:crypto";

import { cloudflareEnvironment } from "./cloudflareEnvironment.mjs";

const endpoint = "https://telemetry.marque-and-reprisal.com";
const eventId = `deployment-${randomUUID()}`;
const environment = await cloudflareEnvironment();

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
      type: "session_start",
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
        installAgeDays: 0,
        daysSinceLastSession: -1
      }
    }]
  })
});
if (ingestion.accepted !== 1) throw new Error("Telemetry ingestion check was not accepted");

const accountId = environment.CLOUDFLARE_ACCOUNT_ID;
const apiToken = environment.CLOUDFLARE_API_TOKEN;
const sqlEndpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;
const sql = `
  SELECT count() AS rows
  FROM marque_and_reprisal_game_events
  WHERE blob4 = 'deployment-check' AND blob19 = '${eventId}'
    AND timestamp > NOW() - INTERVAL '1' DAY
`;

let storedRows = 0;
for (let attempt = 0; attempt < 12 && storedRows < 1; attempt++) {
  if (attempt > 0) await delay(5000);
  const response = await fetch(sqlEndpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "text/plain"
    },
    body: sql.trim()
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(`Analytics Engine verification query failed (${response.status}): ${
      body.errors?.map((entry) => entry.message).join("; ") || "unknown error"
    }`);
  }
  const rows = Array.isArray(body.data) ? body.data : Array.isArray(body.result) ? body.result : [];
  storedRows = Number(rows[0]?.rows || 0);
}
if (storedRows < 1) throw new Error("Telemetry event was accepted but did not become queryable");

console.log("Telemetry deployment verified: health, CORS, ingestion, and Analytics Engine query.");

async function jsonFetch(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
