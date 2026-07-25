import { cloudflareEnvironment } from "./cloudflareEnvironment.mjs";

export const ANALYTICS_ENGINE_DATASET = "marque_and_reprisal_game_events";

export async function queryAnalyticsEngine(sql, {
  environment = null,
  fetchImpl = globalThis.fetch?.bind(globalThis)
} = {}) {
  if (typeof sql !== "string" || sql.trim() === "") {
    throw new Error("Analytics Engine query requires SQL");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("Analytics Engine query requires fetch");
  }
  const resolvedEnvironment = environment || await cloudflareEnvironment();
  const accountId = requiredValue(resolvedEnvironment.CLOUDFLARE_ACCOUNT_ID, "Cloudflare account ID");
  const apiToken = requiredValue(resolvedEnvironment.CLOUDFLARE_API_TOKEN, "Cloudflare API token");
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "text/plain"
    },
    body: sql.trim()
  });
  const responseText = await response.text();
  let body;
  try {
    body = JSON.parse(responseText);
  } catch {
    throw new Error(`Cloudflare Analytics Engine query failed (${response.status}): ${
      responseText.slice(0, 500) || "unknown error"
    }`);
  }
  if (!response.ok || body.success === false) {
    throw new Error(`Cloudflare Analytics Engine query failed (${response.status}): ${
      body.errors?.map((entry) => entry.message).join("; ") || "unknown error"
    }`);
  }
  return Array.isArray(body.data) ? body.data : Array.isArray(body.result) ? body.result : [];
}

function requiredValue(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing ${label}`);
  return value.trim();
}
