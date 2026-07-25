import {
  DASHBOARD_WINDOWS,
  fetchDashboardSnapshot,
  validateDashboardWindow
} from "./dashboardData.js";

const DASHBOARD_HOST = "dashboard.marque-and-reprisal.com";
const JSON_HEADERS = Object.freeze({
  "cache-control": "public, max-age=300",
  "content-type": "application/json; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
});

export function isDashboardRequest(url) {
  return url.hostname === DASHBOARD_HOST ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1";
}

export async function handleDashboardRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/dashboard") return dashboardApiResponse(request, env);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (typeof env.DASHBOARD_ASSETS?.fetch !== "function") {
    return new Response("Dashboard assets are not configured", { status: 503 });
  }
  return secureAssetResponse(await env.DASHBOARD_ASSETS.fetch(request));
}

export async function dashboardApiResponse(request, env, {
  fetchSnapshot = fetchDashboardSnapshot
} = {}) {
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  let windowDays;
  try {
    windowDays = validateDashboardWindow(new URL(request.url).searchParams.get("days") || 30);
  } catch {
    return jsonResponse({
      error: "invalid_window",
      allowedDays: DASHBOARD_WINDOWS
    }, 400);
  }
  try {
    const snapshot = await cachedDashboardSnapshot(env, windowDays, fetchSnapshot);
    return jsonResponse(snapshot);
  } catch (error) {
    console.error("Dashboard query failed", error);
    return jsonResponse({ error: "query_failed" }, 502);
  }
}

async function cachedDashboardSnapshot(env, windowDays, fetchSnapshot) {
  const cache = globalThis.caches?.default;
  if (!cache) return fetchSnapshot(env, windowDays);
  const cacheKey = new Request(`https://${DASHBOARD_HOST}/_cache/dashboard-${windowDays}.json`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();
  const snapshot = await fetchSnapshot(env, windowDays);
  const response = jsonResponse(snapshot, 200, {
    "cache-control": "public, max-age=300"
  });
  await cache.put(cacheKey, response);
  return snapshot;
}

function secureAssetResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("content-security-policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; "));
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonResponse(body, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...additionalHeaders
    }
  });
}
