import { dashboardQueries } from "../src/dashboardData.js";
import { queryAnalyticsEngine } from "./analyticsEngine.mjs";
import { readRemoteTextLayoutCursor } from "./cloudflareKv.mjs";
import { rememberTextLayoutReportRead } from "./crashReadState.mjs";

const readAt = new Date().toISOString();
const cursor = await readRemoteTextLayoutCursor();
const rows = await queryAnalyticsEngine(
  dashboardQueries(90, null, null, null, cursor).textLayoutIssues
);
await rememberTextLayoutReportRead({ readAt, previousCursor: cursor });
process.stdout.write(`${JSON.stringify({
  generatedAt: readAt,
  cursor,
  incidents: rows.length,
  textLayout: rows
}, null, 2)}\n`);
