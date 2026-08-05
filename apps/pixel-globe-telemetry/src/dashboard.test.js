import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_CACHE_SECONDS,
  dashboardApiResponse,
  isDashboardRequest
} from "./dashboard.js";

test("dashboard routing is isolated to its domain and local development", () => {
  assert.equal(isDashboardRequest(new URL("https://dashboard.marque-and-reprisal.com/")), true);
  assert.equal(isDashboardRequest(new URL("http://127.0.0.1:8787/")), true);
  assert.equal(isDashboardRequest(new URL("https://telemetry.marque-and-reprisal.com/")), false);
});

test("dashboard requests return normalized public snapshots", async () => {
  const response = await dashboardApiResponse(
    new Request("https://dashboard.marque-and-reprisal.com/api/dashboard?days=7"),
    {},
    {
      fetchSnapshot: async (_env, days) => ({
        schemaVersion: 1,
        generatedAt: "2026-07-25T12:00:00.000Z",
        windowDays: days,
        totals: { players: 0 }
      })
    }
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), `public, max-age=${DASHBOARD_CACHE_SECONDS}`);
  assert.equal(DASHBOARD_CACHE_SECONDS, 15);
  assert.equal((await response.json()).windowDays, 7);
});
