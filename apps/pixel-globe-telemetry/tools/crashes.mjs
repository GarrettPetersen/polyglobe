import { queryAnalyticsEngine } from "./analyticsEngine.mjs";
import {
  crashGroupsSql,
  crashSummarySql,
  createCrashReport,
  formatCrashReport,
  parseCrashReportArguments
} from "./crashReport.mjs";

const options = parseCrashReportArguments(process.argv.slice(2));
const [summaryRows, crashRows] = await Promise.all([
  queryAnalyticsEngine(crashSummarySql(options.windowHours)),
  queryAnalyticsEngine(crashGroupsSql(options.windowHours))
]);
const report = createCrashReport({
  windowHours: options.windowHours,
  summaryRows,
  crashRows
});
process.stdout.write(formatCrashReport(report, options.format));
