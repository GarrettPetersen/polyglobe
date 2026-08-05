export const TELEMETRY_CONSENT_STORAGE_KEY = "marque-and-reprisal.telemetry-consent";
export const TELEMETRY_INSTALLATION_STORAGE_KEY = "marque-and-reprisal.telemetry-installation";
export const TELEMETRY_FIRST_SEEN_STORAGE_KEY = "marque-and-reprisal.telemetry-first-seen";
export const TELEMETRY_LAST_SESSION_STORAGE_KEY = "marque-and-reprisal.telemetry-last-session";
export const TELEMETRY_QUEUE_STORAGE_KEY = "marque-and-reprisal.telemetry-queue";
export const TELEMETRY_LAST_VOYAGE_START_STORAGE_KEY =
  "marque-and-reprisal.telemetry-last-voyage-start";

export const TELEMETRY_CONSENT_UNKNOWN = "unknown";
export const TELEMETRY_CONSENT_GRANTED = "granted";
export const TELEMETRY_CONSENT_DENIED = "denied";

const TELEMETRY_SCHEMA_VERSION = 1;
const TELEMETRY_EVENT_WEIGHT = 1;
const TELEMETRY_ENDPOINT = "https://telemetry.marque-and-reprisal.com/v1/events";
const TELEMETRY_CHECKPOINT_INTERVAL_MS = 15 * 60 * 1000;
const TELEMETRY_REQUEST_TIMEOUT_MS = 2500;
const TELEMETRY_QUEUE_LIMIT = 12;
const TELEMETRY_BATCH_LIMIT = 8;
const TELEMETRY_FEATURES = Object.freeze([
  ["trade", (state, decisions) => hasDecisionPrefix(decisions, "trade.buy.") ||
    hasDecisionPrefix(decisions, "trade.sell.")],
  ["fish", (_state, decisions) => hasDecisionPrefix(decisions, "fish.catch.")],
  ["scavenge", (_state, decisions) => hasDecisionPrefix(decisions, "scavenge.")],
  ["combat", (state) => state.memory?.achievements?.defeatedShipCount > 0],
  ["whale", (state) => state.memory?.achievements?.whalesKilled > 0],
  ["colonize", (state) => state.memory?.achievements?.foundedCityIds?.length > 0],
  ["piracy", (_state, decisions) => hasDecisionPrefix(decisions, "reputation.piracy.")],
  ["diplomacy", (_state, decisions) => hasDecisionPrefix(decisions, "quest.envoy.") ||
    hasDecisionPrefix(decisions, "diplomacy.")],
  ["side-quests", (state) => Object.keys(state.memory?.quests?.completed || {}).length > 0],
  ["animals", (state) => (state.memory?.animals?.encounterOrder?.length || 0) > 0],
  ["panda", (state) => animalCompanionWasAcquired(state, "panda")],
  ["penguin", (state) => animalCompanionWasAcquired(state, "penguin")],
  ["raccoon", (state) => animalCompanionWasAcquired(state, "raccoon")]
]);

export function createGameTelemetry({
  storage,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  randomId = defaultRandomId,
  now = () => Date.now(),
  setIntervalImpl = globalThis.setInterval?.bind(globalThis),
  clearIntervalImpl = globalThis.clearInterval?.bind(globalThis),
  endpoint = TELEMETRY_ENDPOINT,
  enabled = true,
  metadata
}) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" ||
      typeof storage.removeItem !== "function") {
    throw new Error("Game telemetry requires storage");
  }
  if (!metadata || typeof metadata !== "object") throw new Error("Game telemetry requires metadata");

  let consent = readConsent(storage);
  let installationId = consent === TELEMETRY_CONSENT_GRANTED
    ? readOrCreateInstallationId(storage, randomId, now)
    : null;
  let sessionId = null;
  let started = false;
  let checkpointTimer = null;
  let activePlaySeconds = 0;
  let lastReportedActivePlaySeconds = 0;
  let requestInFlight = false;
  let keepaliveFlushPending = false;
  let queue = consent === TELEMETRY_CONSENT_GRANTED ? readQueue(storage) : [];
  const reportedCrashes = new Set();

  function start() {
    if (started) throw new Error("Game telemetry has already started");
    lastReportedActivePlaySeconds = activePlaySeconds;
    started = true;
    if (!enabled || consent !== TELEMETRY_CONSENT_GRANTED) return;
    beginSession();
  }

  function recordActivePlaySeconds(elapsedSeconds) {
    if (!started) throw new Error("Game telemetry must start before recording active play");
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new Error(`Invalid telemetry active play duration: ${elapsedSeconds}`);
    }
    activePlaySeconds += elapsedSeconds;
  }

  function beginSession() {
    if (sessionId !== null) return;
    sessionId = randomId();
    const retention = updateRetentionStorage(storage, now());
    enqueueEvent("session_start", {
      samplingWeight: TELEMETRY_EVENT_WEIGHT,
      installAgeDays: retention.installAgeDays,
      daysSinceLastSession: retention.daysSinceLastSession
    });
    void flush();
    if (setIntervalImpl) {
      checkpointTimer = setIntervalImpl(
        () => checkpoint(false),
        TELEMETRY_CHECKPOINT_INTERVAL_MS
      );
    }
  }

  function setConsent(granted) {
    const next = granted ? TELEMETRY_CONSENT_GRANTED : TELEMETRY_CONSENT_DENIED;
    writeStorage(storage, TELEMETRY_CONSENT_STORAGE_KEY, next);
    consent = next;
    if (!granted) {
      if (checkpointTimer !== null && clearIntervalImpl) clearIntervalImpl(checkpointTimer);
      checkpointTimer = null;
      installationId = null;
      sessionId = null;
      queue = [];
      keepaliveFlushPending = false;
      removeStorage(storage, TELEMETRY_INSTALLATION_STORAGE_KEY);
      removeStorage(storage, TELEMETRY_FIRST_SEEN_STORAGE_KEY);
      removeStorage(storage, TELEMETRY_LAST_SESSION_STORAGE_KEY);
      removeStorage(storage, TELEMETRY_QUEUE_STORAGE_KEY);
      removeStorage(storage, TELEMETRY_LAST_VOYAGE_START_STORAGE_KEY);
      return consent;
    }
    installationId = readOrCreateInstallationId(storage, randomId, now);
    lastReportedActivePlaySeconds = activePlaySeconds;
    if (started) beginSession();
    return consent;
  }

  function checkpoint(keepalive = false) {
    if (!enabled || consent !== TELEMETRY_CONSENT_GRANTED || sessionId === null) {
      return false;
    }
    const delta = activePlaySeconds - lastReportedActivePlaySeconds;
    lastReportedActivePlaySeconds = activePlaySeconds;
    if (delta <= 0) return false;
    enqueueEvent("session_checkpoint", {
      samplingWeight: TELEMETRY_EVENT_WEIGHT,
      activePlaySeconds: delta
    });
    void flush({ keepalive });
    return true;
  }

  function recordVoyage(record, state) {
    if (!enabled || consent !== TELEMETRY_CONSENT_GRANTED || sessionId === null) {
      return false;
    }
    let payload;
    try {
      payload = voyageTelemetryPayload(record, state);
    } catch (error) {
      console.warn("[pixel-globe] voyage telemetry was not recorded", error);
      return false;
    }
    enqueueEvent("voyage_end", {
      ...payload,
      samplingWeight: TELEMETRY_EVENT_WEIGHT
    });
    void flush({ keepalive: true });
    return true;
  }

  function recordVoyageStart(state, { force = false } = {}) {
    if (!enabled || consent !== TELEMETRY_CONSENT_GRANTED || sessionId === null) {
      return false;
    }
    let payload;
    let voyageKey;
    try {
      voyageKey = requiredShortString(state?.voyageSeed, "voyage telemetry key");
      if (!force && readStorage(storage, TELEMETRY_LAST_VOYAGE_START_STORAGE_KEY) === voyageKey) {
        return true;
      }
      payload = voyageStartTelemetryPayload(state);
    } catch (error) {
      console.warn("[pixel-globe] voyage start telemetry was not recorded", error);
      return false;
    }
    if (!enqueueEvent("voyage_start", {
      ...payload,
      samplingWeight: TELEMETRY_EVENT_WEIGHT
    })) return false;
    writeStorage(storage, TELEMETRY_LAST_VOYAGE_START_STORAGE_KEY, voyageKey);
    void flush();
    return true;
  }

  function captureCrash(error, context = {}) {
    if (!enabled || consent !== TELEMETRY_CONSENT_GRANTED || installationId === null) return false;
    const normalized = normalizeCrash(error, context);
    const dedupeKey = `${normalized.errorName}|${normalized.message}|${normalized.stack.slice(0, 200)}`;
    if (reportedCrashes.has(dedupeKey)) return false;
    reportedCrashes.add(dedupeKey);
    if (sessionId === null) sessionId = randomId();
    enqueueEvent("crash", { ...normalized, samplingWeight: TELEMETRY_EVENT_WEIGHT });
    void flush();
    return true;
  }

  function enqueueEvent(type, payload) {
    if (!installationId || !sessionId) return false;
    queue.push({
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
      eventId: randomId(),
      type,
      installationId,
      sessionId,
      occurredAt: new Date(now()).toISOString(),
      metadata: { ...metadata },
      payload
    });
    if (queue.length > TELEMETRY_QUEUE_LIMIT) queue.splice(0, queue.length - TELEMETRY_QUEUE_LIMIT);
    persistQueue();
    return true;
  }

  async function flush({ keepalive = false } = {}) {
    if (!enabled || !fetchImpl || consent !== TELEMETRY_CONSENT_GRANTED || queue.length === 0) {
      return false;
    }
    if (requestInFlight) {
      keepaliveFlushPending ||= keepalive;
      return false;
    }
    requestInFlight = true;
    const batch = queue.slice(0, TELEMETRY_BATCH_LIMIT);
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(), TELEMETRY_REQUEST_TIMEOUT_MS)
      : null;
    let accepted = false;
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: batch }),
        keepalive,
        signal: controller?.signal
      });
      if (response?.ok) {
        const result = await telemetryResponseBody(response);
        if (Number(result?.rejected) > 0) {
          console.warn(
            `[pixel-globe] telemetry discarded ${result.rejected} invalid queued event(s)`,
            result.errors || []
          );
        }
        queue.splice(0, batch.length);
        persistQueue();
        accepted = true;
      }
    } catch {
      accepted = false;
    } finally {
      if (timeout !== null) clearTimeout(timeout);
      requestInFlight = false;
    }
    const pendingKeepalive = keepaliveFlushPending;
    keepaliveFlushPending = false;
    // An urgent event can arrive during an ordinary request. Retry that event
    // immediately with navigation-safe delivery even if the older request failed.
    if (queue.length > 0 && (accepted || pendingKeepalive)) {
      void flush({ keepalive: keepalive || pendingKeepalive });
    }
    return accepted;
  }

  function persistQueue() {
    if (consent !== TELEMETRY_CONSENT_GRANTED || queue.length === 0) {
      removeStorage(storage, TELEMETRY_QUEUE_STORAGE_KEY);
      return;
    }
    writeStorage(storage, TELEMETRY_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  }

  function stop() {
    checkpoint(true);
    void flush({ keepalive: true });
    if (checkpointTimer !== null && clearIntervalImpl) clearIntervalImpl(checkpointTimer);
    checkpointTimer = null;
  }

  return Object.freeze({
    get consentStatus() {
      return consent;
    },
    start,
    stop,
    setConsent,
    recordActivePlaySeconds,
    checkpoint,
    recordVoyageStart,
    recordVoyage,
    captureCrash,
    flush
  });
}

async function telemetryResponseBody(response) {
  if (typeof response?.json !== "function") return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function telemetryRuntimeChannel({ edition, platformId = null, location = null } = {}) {
  if (platformId === "steam") return edition === "demo" ? "steam-demo" : "steam-full";
  const protocol = location?.protocol || "";
  const hostname = location?.hostname || "";
  if (edition === "demo") return protocol === "file:" ? "itch-local" : "itch-demo";
  if (protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1") return "local";
  return "web-prototype";
}

export function voyageTelemetryPayload(record, state) {
  if (!record || typeof record !== "object") throw new Error("Voyage telemetry requires a record");
  if (!state || typeof state !== "object") throw new Error("Voyage telemetry requires game state");
  const achievements = state.memory?.achievements || {};
  const decisions = state.memory?.decisions || {};
  const features = TELEMETRY_FEATURES
    .filter(([, used]) => used(state, decisions))
    .map(([id]) => id);
  return {
    outcome: requiredShortString(record.outcomeType, "voyage outcome"),
    mainQuest: requiredShortString(state.memory?.campaignGoal?.type || "none", "main quest"),
    activePlaySeconds: nonNegativeNumber(state.activePlaySeconds, "active play seconds"),
    daysAtSea: nonNegativeNumber(record.daysAtSea, "days at sea"),
    endingDoubloons: finiteNumber(record.endingDoubloons, "ending doubloons"),
    grossDoubloonsEarned: nonNegativeNumber(record.doubloonsEarned, "gross doubloons"),
    mappedPercent: nonNegativeNumber(record.mappedPercent, "mapped percent"),
    discoveries: nonNegativeNumber(record.discoveries, "discoveries"),
    visitedPorts: nonNegativeNumber(record.visitedPorts, "visited ports"),
    completedQuests: nonNegativeNumber(record.completedQuests, "completed quests"),
    crewLost: nonNegativeNumber(record.crewLost, "crew lost"),
    ship: requiredShortString(record.vessel, "vessel"),
    features,
    companionStatuses: requiredShortString(
      animalCompanionTelemetryStatuses(state),
      "animal companion statuses"
    ),
    defeatedShips: nonNegativeNumber(achievements.defeatedShipCount || 0, "defeated ships"),
    whalesKilled: nonNegativeNumber(achievements.whalesKilled || 0, "whales killed"),
    coloniesFounded: Array.isArray(achievements.foundedCityIds) ? achievements.foundedCityIds.length : 0,
    spicesSold: Array.isArray(achievements.soldSpiceGoodIds) ? achievements.soldSpiceGoodIds.length : 0
  };
}

export function voyageStartTelemetryPayload(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Voyage start telemetry requires game state");
  }
  const character = state.playerCharacter;
  if (!character || typeof character !== "object") {
    throw new Error("Voyage start telemetry requires a player character");
  }
  const ship = state.ship;
  if (!ship || typeof ship !== "object") {
    throw new Error("Voyage start telemetry requires player ship state");
  }
  const loadout = ship.loadoutTargets;
  if (!loadout || typeof loadout !== "object") {
    throw new Error("Voyage start telemetry requires an initial loadout");
  }
  if (!Array.isArray(character.skillIds) || character.skillIds.length < 1) {
    throw new Error("Voyage start telemetry requires captain skills");
  }
  return {
    mainQuest: requiredShortString(state.memory?.campaignGoal?.type || "none", "main quest"),
    faction: requiredShortString(character.nationalityId, "captain faction"),
    ship: requiredShortString(ship.slug, "starting ship"),
    homePort: requiredShortString(character.homePortName, "home port"),
    startRegion: requiredShortString(character.startRegion, "start region"),
    captainReligion: requiredShortString(character.religionId || "unknown", "captain religion"),
    captainSex: requiredShortString(character.sex, "captain sex"),
    captainSkills: requiredShortString(character.skillIds.join(","), "captain skills"),
    loadout: requiredShortString(ship.loadoutId || "provisional-short-haul", "starting loadout"),
    captainAge: nonNegativeNumber(character.age, "captain age"),
    startingCrew: nonNegativeNumber(ship.crew, "starting crew"),
    startingCannons: nonNegativeNumber(ship.cannons, "starting cannons"),
    cargoCapacity: nonNegativeNumber(state.cargoCapacity, "starting cargo capacity"),
    foodDays: nonNegativeNumber(loadout.foodDays, "starting food days"),
    waterDays: nonNegativeNumber(loadout.waterDays, "starting water days"),
    startingDoubloons: nonNegativeNumber(state.doubloons, "starting doubloons")
  };
}

function animalCompanionWasAcquired(state, companionId) {
  const status = state.memory?.animalCompanions?.byId?.[companionId]?.status;
  return status === "aboard" || status === "with-naturalist";
}

function animalCompanionTelemetryStatuses(state) {
  const byId = state.memory?.animalCompanions?.byId;
  if (!byId || typeof byId !== "object" || Array.isArray(byId)) {
    throw new Error("Voyage telemetry requires animal companion memory");
  }
  return Object.entries(byId)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, memory]) => `${id}:${memory?.status || "unmet"}`)
    .join(",");
}

function normalizeCrash(error, context) {
  const resolved = error instanceof Error ? error : new Error(String(error));
  const redactions = Array.isArray(context.redact)
    ? context.redact.filter((entry) => typeof entry === "string" && entry.length >= 2)
    : [];
  return {
    errorName: truncate(resolved.name || "Error", 80),
    message: truncate(redactCrashText(resolved.message || String(error), redactions), 500),
    stack: truncate(redactCrashText(resolved.stack || "", redactions), 6000),
    screen: truncate(context.screen || "unknown", 80),
    mainQuest: truncate(context.mainQuest || "none", 80),
    ship: truncate(context.ship || "none", 80)
  };
}

function readConsent(storage) {
  const value = readStorage(storage, TELEMETRY_CONSENT_STORAGE_KEY);
  if (value === TELEMETRY_CONSENT_GRANTED || value === TELEMETRY_CONSENT_DENIED) return value;
  return TELEMETRY_CONSENT_UNKNOWN;
}

function readOrCreateInstallationId(storage, randomId, now) {
  const existing = readStorage(storage, TELEMETRY_INSTALLATION_STORAGE_KEY);
  if (existing) return requiredShortString(existing, "stored installation id");
  const created = requiredShortString(randomId(), "generated installation id");
  writeStorage(storage, TELEMETRY_INSTALLATION_STORAGE_KEY, created);
  writeStorage(storage, TELEMETRY_FIRST_SEEN_STORAGE_KEY, String(now()));
  return created;
}

function updateRetentionStorage(storage, currentTime) {
  const firstSeen = validTimestamp(readStorage(storage, TELEMETRY_FIRST_SEEN_STORAGE_KEY)) ?? currentTime;
  const lastSession = validTimestamp(readStorage(storage, TELEMETRY_LAST_SESSION_STORAGE_KEY));
  writeStorage(storage, TELEMETRY_FIRST_SEEN_STORAGE_KEY, String(firstSeen));
  writeStorage(storage, TELEMETRY_LAST_SESSION_STORAGE_KEY, String(currentTime));
  return {
    installAgeDays: Math.max(0, Math.floor((currentTime - firstSeen) / 86_400_000)),
    daysSinceLastSession: lastSession === null
      ? -1
      : Math.max(0, Math.floor((currentTime - lastSession) / 86_400_000))
  };
}

function readQueue(storage) {
  const serialized = readStorage(storage, TELEMETRY_QUEUE_STORAGE_KEY);
  if (!serialized) return [];
  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? parsed.slice(-TELEMETRY_QUEUE_LIMIT) : [];
  } catch {
    removeStorage(storage, TELEMETRY_QUEUE_STORAGE_KEY);
    return [];
  }
}

function readStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(storage, key) {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function validTimestamp(value) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasDecisionPrefix(decisions, prefix) {
  return Object.entries(decisions).some(([key, value]) => key.startsWith(prefix) && value > 0);
}

function defaultRandomId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues !== "function") {
    throw new Error("This browser cannot create anonymous telemetry identifiers");
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function redactCrashText(value, redactions) {
  let text = String(value)
    .replace(/\/Users\/[^/\s):]+/g, "/Users/<redacted>")
    .replace(/\/home\/[^/\s):]+/g, "/home/<redacted>")
    .replace(/\\Users\\[^\\\s):]+/gi, "\\Users\\<redacted>");
  for (const redaction of redactions) {
    text = text.replaceAll(redaction, "<redacted>");
  }
  return text;
}

function requiredShortString(value, label) {
  if (typeof value !== "string" || value.trim() === "" || value.length > 160) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new Error(`Invalid ${label}: ${value}`);
  return value;
}

function nonNegativeNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
  return value;
}

function truncate(value, limit) {
  return String(value).slice(0, limit);
}
