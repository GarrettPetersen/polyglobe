export const PLATFORM_CLOUD_FILE = "marque-profile-v1.json";
export const PLATFORM_CLOUD_VERSION = 1;
export const PLATFORM_CLOUD_STORAGE_KEYS = Object.freeze([
  "marque-and-reprisal.save",
  "marque-and-reprisal.achievements",
  "marque-and-reprisal.voyage-history",
  "marque-and-reprisal.key-bindings",
  "pixel_globe_language",
  "pixel_globe_controller_glyphs",
  "pixel_globe_music_volume",
  "pixel_globe_sfx_volume",
  "pixel_globe_audio_muted"
]);

const PLATFORM_METHODS = Object.freeze([
  "getCapabilities",
  "readCloudFile",
  "writeCloudFile",
  "setRichPresence",
  "setTimelineState",
  "addTimelineEvent",
  "triggerScreenshot",
  "updateStats"
]);

export const PLATFORM_TIMELINE_MODE = Object.freeze({
  LOADING: "loading",
  MENUS: "menus",
  PLAYING: "playing",
  STAGING: "staging"
});

export const PLATFORM_CLIP_PRIORITY = Object.freeze({
  NONE: "none",
  STANDARD: "standard",
  FEATURED: "featured"
});

export function platformServicesAdapter(root = globalThis) {
  const bridge = root?.marqueSteamPlatform;
  if (bridge === undefined || bridge === null) return null;
  if (typeof bridge !== "object" || bridge.platformId !== "steam") {
    throw new Error("Installed Steam platform bridge is invalid");
  }
  for (const method of PLATFORM_METHODS) {
    if (typeof bridge[method] !== "function") {
      throw new Error(`Steam platform bridge has no ${method} function`);
    }
  }
  return bridge;
}

export async function validatePlatformCapabilities(bridge) {
  if (!bridge) return null;
  const capabilities = await bridge.getCapabilities();
  if (!capabilities || typeof capabilities !== "object") {
    throw new Error("Steam platform bridge returned invalid capabilities");
  }
  for (const capability of ["achievements", "cloud", "input", "richPresence", "screenshots", "stats", "timeline"]) {
    if (capabilities[capability] !== true) {
      throw new Error(`Steam platform capability is unavailable: ${capability}`);
    }
  }
  return Object.freeze({ ...capabilities });
}

export async function hydratePlatformCloudStorage(storage, bridge) {
  assertStorage(storage);
  if (!bridge) return Object.freeze({ loaded: false, source: "local" });
  const serialized = await bridge.readCloudFile(PLATFORM_CLOUD_FILE);
  if (serialized === null) return Object.freeze({ loaded: false, source: "local" });
  const envelope = parseCloudEnvelope(serialized);
  for (const key of PLATFORM_CLOUD_STORAGE_KEYS) {
    const value = envelope.values[key];
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  }
  return Object.freeze({ loaded: true, source: "steam-cloud", savedAt: envelope.savedAt });
}

export function createPlatformCloudSync(storage, bridge, { now = Date.now } = {}) {
  assertStorage(storage);
  if (!bridge) return null;
  if (typeof now !== "function") throw new Error("Platform cloud sync requires a clock");
  let requestedRevision = 0;
  let writtenRevision = 0;
  let activeWrite = null;

  function request(key) {
    if (!PLATFORM_CLOUD_STORAGE_KEYS.includes(key)) return Promise.resolve(false);
    requestedRevision += 1;
    if (!activeWrite) {
      activeWrite = writeLatest().finally(() => {
        activeWrite = null;
      });
    }
    return activeWrite.then(() => true);
  }

  async function writeLatest() {
    while (writtenRevision < requestedRevision) {
      const revision = requestedRevision;
      const serialized = serializeCloudEnvelope(storage, now());
      await bridge.writeCloudFile(PLATFORM_CLOUD_FILE, serialized);
      writtenRevision = revision;
    }
  }

  async function flush() {
    if (activeWrite) await activeWrite;
  }

  return Object.freeze({ request, flush });
}

export function createPlatformActivityPublisher(bridge) {
  let lastPresenceKey = null;
  let lastTimelineKey = null;
  let queuedActivity = null;
  let activePublish = null;

  async function publish({ presence, timeline }) {
    if (!bridge) return false;
    validatePresence(presence);
    validateTimelineState(timeline);
    const presenceKey = JSON.stringify(presence);
    const timelineKey = JSON.stringify(timeline);
    if (!activePublish && presenceKey === lastPresenceKey && timelineKey === lastTimelineKey) return false;
    queuedActivity = { presence, timeline, presenceKey, timelineKey };
    if (!activePublish) {
      activePublish = publishLatest().finally(() => {
        activePublish = null;
      });
    }
    await activePublish;
    return true;
  }

  async function publishLatest() {
    while (queuedActivity) {
      const activity = queuedActivity;
      queuedActivity = null;
      const operations = [];
      if (activity.presenceKey !== lastPresenceKey) {
        operations.push(bridge.setRichPresence(activity.presence));
      }
      if (activity.timelineKey !== lastTimelineKey) {
        operations.push(bridge.setTimelineState(activity.timeline));
      }
      if (operations.length === 0) continue;
      await Promise.all(operations);
      lastPresenceKey = activity.presenceKey;
      lastTimelineKey = activity.timelineKey;
    }
  }

  return Object.freeze({ publish });
}

export async function addPlatformTimelineEvent(bridge, event) {
  if (!bridge) return false;
  validateTimelineEvent(event);
  await bridge.addTimelineEvent(event);
  return true;
}

export async function triggerPlatformScreenshot(bridge) {
  if (!bridge) return false;
  await bridge.triggerScreenshot();
  return true;
}

export async function updatePlatformStats(bridge, values) {
  if (!bridge) return false;
  if (!values || typeof values !== "object" || Array.isArray(values) ||
      Object.keys(values).length === 0) {
    throw new Error("Steam stat values must be a non-empty object");
  }
  for (const [name, value] of Object.entries(values)) {
    if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(name) ||
        !Number.isInteger(value) || value < 0 || value > 2_147_483_647) {
      throw new Error(`Invalid Steam stat entry: ${name}=${value}`);
    }
  }
  await bridge.updateStats(values);
  return true;
}

export function serializeCloudEnvelope(storage, savedAt) {
  assertStorage(storage);
  if (!Number.isFinite(savedAt) || savedAt <= 0) {
    throw new Error(`Invalid platform cloud timestamp: ${savedAt}`);
  }
  return JSON.stringify({
    version: PLATFORM_CLOUD_VERSION,
    savedAt: Math.floor(savedAt),
    values: Object.fromEntries(PLATFORM_CLOUD_STORAGE_KEYS.map((key) => [key, storage.getItem(key)]))
  });
}

export function parseCloudEnvelope(serialized) {
  if (typeof serialized !== "string" || serialized.length === 0) {
    throw new Error("Steam Cloud profile is empty");
  }
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch (error) {
    throw new Error("Steam Cloud profile is not valid JSON", { cause: error });
  }
  if (!envelope || envelope.version !== PLATFORM_CLOUD_VERSION ||
      !Number.isFinite(envelope.savedAt) || envelope.savedAt <= 0 ||
      !envelope.values || typeof envelope.values !== "object" || Array.isArray(envelope.values)) {
    throw new Error(`Unsupported Steam Cloud profile version: ${envelope?.version ?? "missing"}`);
  }
  for (const key of PLATFORM_CLOUD_STORAGE_KEYS) {
    if (!Object.hasOwn(envelope.values, key)) throw new Error(`Steam Cloud profile is missing ${key}`);
    const value = envelope.values[key];
    if (value !== null && typeof value !== "string") {
      throw new Error(`Steam Cloud profile has invalid value for ${key}`);
    }
  }
  return envelope;
}

function validatePresence(presence) {
  if (!presence || typeof presence !== "object" || Array.isArray(presence)) {
    throw new Error("Steam Rich Presence payload is required");
  }
  for (const [key, value] of Object.entries(presence)) {
    if (key.trim() === "" || typeof value !== "string") {
      throw new Error(`Invalid Steam Rich Presence entry: ${key}`);
    }
  }
}

function validateTimelineState(timeline) {
  if (!timeline || typeof timeline.description !== "string" || timeline.description.trim() === "" ||
      !Object.values(PLATFORM_TIMELINE_MODE).includes(timeline.mode)) {
    throw new Error("Steam Timeline state is invalid");
  }
}

function validateTimelineEvent(event) {
  if (!event || typeof event.title !== "string" || event.title.trim() === "" ||
      typeof event.description !== "string" || typeof event.icon !== "string" || event.icon.trim() === "" ||
      !Number.isInteger(event.priority) || event.priority < 0 || event.priority > 1000 ||
      !Number.isFinite(event.durationSeconds) || event.durationSeconds < 0 || event.durationSeconds > 600 ||
      !Object.values(PLATFORM_CLIP_PRIORITY).includes(event.clipPriority)) {
    throw new Error("Steam Timeline event is invalid");
  }
}

function assertStorage(storage) {
  for (const method of ["getItem", "setItem", "removeItem"]) {
    if (typeof storage?.[method] !== "function") throw new Error(`Platform storage has no ${method} function`);
  }
}
