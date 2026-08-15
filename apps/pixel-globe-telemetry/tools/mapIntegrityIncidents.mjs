import { dashboardQueries } from "../src/dashboardData.js";
import { queryAnalyticsEngine } from "./analyticsEngine.mjs";

const rows = await queryAnalyticsEngine(dashboardQueries(90).mapIntegrityIssues);
process.stdout.write(`${JSON.stringify({
  generatedAt: new Date().toISOString(),
  incidents: rows.length,
  mapIntegrity: rows
}, null, 2)}\n`);
