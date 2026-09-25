import { webDeployFailureEvent } from "../src/webDeployFailure.js";

const endpoint = "https://telemetry.marque-and-reprisal.com/v1/events";
const revision = process.env.GITHUB_SHA?.slice(0, 12);
const runId = process.env.GITHUB_RUN_ID;
const server = process.env.GITHUB_SERVER_URL;
const repository = process.env.GITHUB_REPOSITORY;
if (!server || !repository) {
  throw new Error("Web deploy failure report requires the GitHub run URL");
}

const event = webDeployFailureEvent({
  revision,
  runId,
  runUrl: `${server}/${repository}/actions/runs/${runId}`,
  occurredAt: new Date().toISOString()
});
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ events: [event] })
});
const body = await response.json().catch(() => null);
if (response.status !== 202 || body?.accepted !== 1) {
  throw new Error(`Web deploy failure was not recorded (${response.status}, accepted ${body?.accepted ?? "none"})`);
}
console.log(`Recorded web deploy failure for ${revision}.`);
