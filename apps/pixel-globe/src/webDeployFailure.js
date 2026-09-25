// A failed production web deploy must be visible in the telemetry report.
// Player diagnostics use the same event shape, with a stable non-voyage identity.
export function webDeployFailureEvent({
  revision,
  runUrl,
  runId,
  occurredAt
}) {
  if (typeof revision !== "string" || !/^[0-9a-f]{12}$/.test(revision)) {
    throw new Error(`Web deploy failure requires a 12-character revision: ${revision}`);
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(runUrl);
  } catch {
    throw new Error(`Web deploy failure requires a run URL: ${runUrl}`);
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error(`Web deploy failure run URL must be https: ${runUrl}`);
  }
  if (typeof runId !== "string" || !/^[0-9]+$/.test(runId)) {
    throw new Error(`Web deploy failure requires a numeric run id: ${runId}`);
  }
  if (typeof occurredAt !== "string" || !Number.isFinite(Date.parse(occurredAt))) {
    throw new Error(`Web deploy failure requires an ISO timestamp: ${occurredAt}`);
  }
  const message = `Web deploy failed for ${revision} before the live site updated: ${parsedUrl.href}`;
  if (message.length > 500) {
    throw new Error("Web deploy failure message does not fit the telemetry limit");
  }
  return Object.freeze({
    schemaVersion: 1,
    eventId: `web-deploy-${revision}-${runId}`,
    type: "diagnostic",
    installationId: "web-deploy",
    sessionId: `web-deploy-${runId}`,
    occurredAt,
    metadata: Object.freeze({
      edition: "full",
      revision,
      channel: "web-deploy",
      platform: "github-actions",
      locale: "en",
      gameStateVersion: 1
    }),
    payload: Object.freeze({
      samplingWeight: 1,
      errorName: "WebDeployFailed",
      message,
      stack: "The production browser gate or the Cloudflare upload failed. The live site was left unchanged.",
      screen: "web-deploy",
      mainQuest: "none",
      ship: "none"
    })
  });
}
