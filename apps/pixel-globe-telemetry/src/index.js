import {
  handleDashboardRequest,
  isDashboardRequest
} from "./dashboard.js";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS_PER_REQUEST = 8;
const EVENT_TYPES = new Set(["session_start", "session_checkpoint", "voyage_end", "crash"]);
const ROUTINE_EVENT_TYPES = new Set(["session_start", "session_checkpoint", "voyage_end"]);
const FEATURE_IDS = new Set([
  "trade",
  "fish",
  "scavenge",
  "combat",
  "whale",
  "colonize",
  "piracy",
  "diplomacy",
  "side-quests",
  "animals",
  "panda",
  "penguin",
  "raccoon"
]);
const COMMON_HEADERS = Object.freeze({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff"
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: COMMON_HEADERS });
    if (request.method === "GET" && url.pathname === "/health") {
      const configured = telemetryEnvironmentIsConfigured(env);
      return jsonResponse({
        ok: configured,
        service: "marque-and-reprisal-telemetry",
        schemaVersion: 1
      }, configured ? 200 : 503);
    }
    if (isDashboardRequest(url) && url.pathname !== "/v1/events") {
      return handleDashboardRequest(request, env);
    }
    if (request.method !== "POST" || url.pathname !== "/v1/events") {
      return jsonResponse({ error: "not_found" }, 404);
    }
    if (!telemetryEnvironmentIsConfigured(env)) {
      return jsonResponse({ error: "service_unavailable" }, 503);
    }
    try {
      const events = await parseEvents(request);
      const normalizedEvents = events.map(validateEvent);
      for (const normalized of normalizedEvents) {
        const installationHash = await sha256Hex(
          `${env.INSTALL_HASH_PEPPER}:${normalized.installationId}`
        );
        const crashFingerprint = normalized.type === "crash"
          ? await sha256Hex([
              normalized.payload.errorName,
              normalized.payload.message,
              normalized.payload.stack.split("\n").slice(0, 4).join("\n")
            ].join("|"))
          : "";
        env.EVENTS.writeDataPoint(toDataPoint(normalized, installationHash, crashFingerprint));
      }
      return jsonResponse({ accepted: events.length }, 202);
    } catch (error) {
      if (error instanceof TelemetryRequestError) {
        return jsonResponse({ error: error.code }, error.status);
      }
      return jsonResponse({ error: "invalid_request" }, 400);
    }
  }
};

function telemetryEnvironmentIsConfigured(env) {
  return typeof env.INSTALL_HASH_PEPPER === "string" &&
    env.INSTALL_HASH_PEPPER.length >= 32 &&
    typeof env.EVENTS?.writeDataPoint === "function";
}

async function parseEvents(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new TelemetryRequestError("content_type", 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new TelemetryRequestError("body_too_large", 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new TelemetryRequestError("body_too_large", 413);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new TelemetryRequestError("invalid_json", 400);
  }
  if (!plainObject(body) || !Array.isArray(body.events) || body.events.length < 1 ||
      body.events.length > MAX_EVENTS_PER_REQUEST) {
    throw new TelemetryRequestError("invalid_batch", 400);
  }
  return body.events;
}

function validateEvent(event) {
  if (!plainObject(event) || event.schemaVersion !== 1) {
    throw new TelemetryRequestError("invalid_schema", 400);
  }
  const type = shortString(event.type, 40);
  if (!EVENT_TYPES.has(type)) throw new TelemetryRequestError("invalid_event_type", 400);
  const occurredAt = shortString(event.occurredAt, 40);
  if (!Number.isFinite(Date.parse(occurredAt))) throw new TelemetryRequestError("invalid_timestamp", 400);
  const metadata = validateMetadata(event.metadata);
  const payload = validatePayload(type, event.payload);
  return {
    type,
    eventId: identifier(event.eventId),
    installationId: identifier(event.installationId),
    sessionId: identifier(event.sessionId),
    occurredAt,
    metadata,
    payload
  };
}

function validateMetadata(metadata) {
  if (!plainObject(metadata)) throw new TelemetryRequestError("invalid_metadata", 400);
  return {
    edition: shortString(metadata.edition, 32),
    revision: shortString(metadata.revision, 64),
    channel: shortString(metadata.channel, 40),
    platform: shortString(metadata.platform, 40),
    locale: shortString(metadata.locale, 24),
    gameStateVersion: integerInRange(metadata.gameStateVersion, 1, 10_000)
  };
}

function validatePayload(type, payload) {
  if (!plainObject(payload)) throw new TelemetryRequestError("invalid_payload", 400);
  const samplingWeight = normalizedSamplingWeight(type, payload.samplingWeight);
  if (type === "session_start") {
    return {
      samplingWeight,
      installAgeDays: numberInRange(payload.installAgeDays, 0, 100_000),
      daysSinceLastSession: numberInRange(payload.daysSinceLastSession, -1, 100_000)
    };
  }
  if (type === "session_checkpoint") {
    return {
      samplingWeight,
      activePlaySeconds: numberInRange(payload.activePlaySeconds, 0, 86_400)
    };
  }
  if (type === "crash") {
    return {
      samplingWeight,
      errorName: shortString(payload.errorName, 80),
      message: stringAtMost(payload.message, 500),
      stack: stringAtMost(payload.stack, 6000),
      screen: shortString(payload.screen, 80),
      mainQuest: shortString(payload.mainQuest, 80),
      ship: shortString(payload.ship, 80)
    };
  }
  if (type === "voyage_end") return validateVoyagePayload(payload, samplingWeight);
  throw new TelemetryRequestError("invalid_event_type", 400);
}

function normalizedSamplingWeight(type, samplingWeight) {
  if (!ROUTINE_EVENT_TYPES.has(type)) {
    if (samplingWeight !== 1) throw new TelemetryRequestError("invalid_sampling_weight", 400);
    return 1;
  }
  // Normalize events queued by browser tabs opened before full collection launched.
  if (samplingWeight !== 1 && samplingWeight !== 100) {
    throw new TelemetryRequestError("invalid_sampling_weight", 400);
  }
  return 1;
}

function validateVoyagePayload(payload, samplingWeight) {
  if (!Array.isArray(payload.features) || payload.features.length > FEATURE_IDS.size ||
      new Set(payload.features).size !== payload.features.length ||
      payload.features.some((entry) => !FEATURE_IDS.has(entry))) {
    throw new TelemetryRequestError("invalid_features", 400);
  }
  return {
    samplingWeight,
    outcome: shortString(payload.outcome, 40),
    mainQuest: shortString(payload.mainQuest, 80),
    activePlaySeconds: numberInRange(payload.activePlaySeconds, 0, 100_000_000),
    daysAtSea: numberInRange(payload.daysAtSea, 0, 100_000),
    endingDoubloons: numberInRange(payload.endingDoubloons, -1_000_000_000, 1_000_000_000_000),
    grossDoubloonsEarned: numberInRange(payload.grossDoubloonsEarned, 0, 1_000_000_000_000),
    mappedPercent: numberInRange(payload.mappedPercent, 0, 100),
    discoveries: numberInRange(payload.discoveries, 0, 10_000),
    visitedPorts: numberInRange(payload.visitedPorts, 0, 10_000),
    completedQuests: numberInRange(payload.completedQuests, 0, 100_000),
    crewLost: numberInRange(payload.crewLost, 0, 100_000),
    ship: shortString(payload.ship, 160),
    features: payload.features,
    companionStatuses: shortString(
      payload.companionStatuses || legacyCompanionStatuses(payload.pandaStatus),
      120
    ),
    defeatedShips: numberInRange(payload.defeatedShips, 0, 1_000_000),
    whalesKilled: numberInRange(payload.whalesKilled, 0, 1_000_000),
    coloniesFounded: numberInRange(payload.coloniesFounded, 0, 100_000),
    spicesSold: numberInRange(payload.spicesSold, 0, 100_000)
  };
}

function toDataPoint(event, installationHash, crashFingerprint) {
  const payload = event.payload;
  return {
    indexes: [installationHash],
    blobs: [
      event.type,
      event.metadata.edition,
      event.metadata.revision,
      event.metadata.channel,
      event.metadata.platform,
      event.metadata.locale,
      event.sessionId,
      payload.mainQuest || "",
      payload.outcome || "",
      payload.ship || "",
      payload.features?.join(",") || "",
      payload.companionStatuses || "",
      crashFingerprint,
      payload.errorName || "",
      payload.message || "",
      payload.stack || "",
      payload.screen || "",
      String(event.metadata.gameStateVersion),
      event.eventId,
      event.occurredAt
    ],
    doubles: [
      payload.samplingWeight,
      payload.activePlaySeconds || 0,
      payload.daysAtSea || 0,
      payload.endingDoubloons || 0,
      payload.grossDoubloonsEarned || 0,
      payload.mappedPercent || 0,
      payload.discoveries || 0,
      payload.visitedPorts || 0,
      payload.completedQuests || 0,
      payload.crewLost || 0,
      payload.defeatedShips || 0,
      payload.whalesKilled || 0,
      payload.coloniesFounded || 0,
      payload.spicesSold || 0,
      payload.installAgeDays || 0,
      payload.daysSinceLastSession ?? -1
    ]
  };
}

function legacyCompanionStatuses(pandaStatus) {
  const status = typeof pandaStatus === "string" && pandaStatus !== ""
    ? pandaStatus
    : "unmet";
  return `panda:${status}`;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: COMMON_HEADERS });
}

function identifier(value) {
  const normalized = shortString(value, 96);
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new TelemetryRequestError("invalid_identifier", 400);
  }
  return normalized;
}

function shortString(value, maxLength) {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    throw new TelemetryRequestError("invalid_string", 400);
  }
  return value;
}

function stringAtMost(value, maxLength) {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new TelemetryRequestError("invalid_string", 400);
  }
  return value;
}

function integerInRange(value, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TelemetryRequestError("invalid_number", 400);
  }
  return value;
}

function numberInRange(value, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TelemetryRequestError("invalid_number", 400);
  }
  return value;
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

class TelemetryRequestError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
