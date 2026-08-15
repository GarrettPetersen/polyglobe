import { dashboardQueries } from "../src/dashboardData.js";
import { queryAnalyticsEngine } from "./analyticsEngine.mjs";
import { readRemoteMapIntegrityCursor } from "./cloudflareKv.mjs";
import { rememberMapIntegrityReportRead } from "./crashReadState.mjs";

const readAt = new Date().toISOString();
const cursor = await readRemoteMapIntegrityCursor();
const rows = await queryAnalyticsEngine(
  dashboardQueries(90, null, null, cursor).mapIntegrityIssues
);
await rememberMapIntegrityReportRead({ readAt, previousCursor: cursor });
process.stdout.write(`${JSON.stringify({
  generatedAt: readAt,
  cursor,
  incidents: rows.length,
  mapIntegrity: rows
}, null, 2)}\n`);
