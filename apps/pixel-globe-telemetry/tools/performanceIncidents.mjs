import { queryAnalyticsEngine } from "./analyticsEngine.mjs";
import { readRemotePerformanceCursor } from "./cloudflareKv.mjs";
import { rememberPerformanceReportRead } from "./crashReadState.mjs";
import { dashboardQueries } from "../src/dashboardData.js";

const readAt = new Date().toISOString();
const cursor = await readRemotePerformanceCursor();
const queries = dashboardQueries(90, null, cursor);
const [lowFrameRate, freezes] = await Promise.all([
  queryAnalyticsEngine(queries.performanceIssues),
  queryAnalyticsEngine(queries.freezeIssues)
]);
await rememberPerformanceReportRead({ readAt, previousCursor: cursor });

process.stdout.write(`${JSON.stringify({
  generatedAt: readAt,
  cursor,
  incidents: lowFrameRate.length + freezes.length,
  lowFrameRate,
  freezes
}, null, 2)}\n`);
