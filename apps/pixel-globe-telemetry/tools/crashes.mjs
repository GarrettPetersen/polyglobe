import { queryAnalyticsEngine } from "./analyticsEngine.mjs";
import { readRemoteCrashCursor } from "./cloudflareKv.mjs";
import { rememberCrashReportRead } from "./crashReadState.mjs";
import {
  crashGroupsSql,
  crashSummarySql,
  createCrashReport,
  formatCrashReport,
  parseCrashReportArguments
} from "./crashReport.mjs";

const options = parseCrashReportArguments(process.argv.slice(2));
const readAt = new Date().toISOString();
const cursor = options.sinceFixed ? await readRemoteCrashCursor() : null;
const [summaryRows, crashRows] = await Promise.all([
  queryAnalyticsEngine(crashSummarySql(options.windowHours, cursor)),
  queryAnalyticsEngine(crashGroupsSql(options.windowHours, cursor))
]);
const report = createCrashReport({
  windowHours: options.windowHours,
  summaryRows,
  crashRows,
  cursor,
  generatedAt: readAt
});
if (options.sinceFixed) {
  await rememberCrashReportRead({ readAt, previousCursor: cursor });
}
process.stdout.write(formatCrashReport(report, options.format));
