import { cloudflareEnvironment } from "./cloudflareEnvironment.mjs";

const endpoint = "https://dashboard.marque-and-reprisal.com";
await cloudflareEnvironment();

const page = await fetch(endpoint);
if (!page.ok) throw new Error(`Dashboard page failed (${page.status})`);
const html = await page.text();
if (!html.includes("<h1>Telemetry Logbook</h1>")) {
  throw new Error("Dashboard page did not contain the expected heading");
}
if (!page.headers.get("content-security-policy")?.includes("frame-ancestors 'none'")) {
  throw new Error("Dashboard page is missing its content security policy");
}

const dashboardData = await fetch(`${endpoint}/api/dashboard?days=1`);
const body = await dashboardData.json();
if (!dashboardData.ok) throw new Error(`Dashboard API failed (${dashboardData.status})`);
if (body.schemaVersion !== 3 || body.windowDays !== 1 || !body.totals ||
    typeof body.crashCursor?.activeReports !== "number" ||
    typeof body.performanceCursor?.activeReports !== "number" ||
    !Array.isArray(body.crashes) || !Array.isArray(body.fixedCrashes) ||
    !Array.isArray(body.performanceIssues) || !Array.isArray(body.fixedPerformanceIssues) ||
    !Array.isArray(body.freezeIssues) || !Array.isArray(body.fixedFreezeIssues)) {
  throw new Error("Dashboard API returned an invalid snapshot");
}

console.log(
  "Telemetry dashboard verified: assets, security headers, and live aggregate query."
);
