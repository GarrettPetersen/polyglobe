import { translate } from "./localization.js";
import { BUILD_EDITION_ID, BUILD_REVISION } from "./buildEdition.js";

export const STARTUP_DIAGNOSTIC_KEY = "marque-and-reprisal.last-startup-failure";
const MAX_DIAGNOSTIC_CHARACTERS = 8192;

export function startupDiagnostic(error, { occurredAt, edition, url, revision = BUILD_REVISION }) {
  const detail = error instanceof Error ? error.stack || error.message : String(error);
  return ["MARQUE & REPRISAL STARTUP FAILURE", `Time: ${occurredAt}`,
    `Edition: ${edition}`, `Build: ${revision}`, `Entry: ${url}`, detail].join("\n").slice(0, MAX_DIAGNOSTIC_CHARACTERS);
}

export function reportStartupFailure(error, {
  root = globalThis,
  now = () => new Date().toISOString()
} = {}) {
  const document = root.document;
  const report = startupDiagnostic(error, {
    occurredAt: now(), edition: BUILD_EDITION_ID, url: document.location.pathname
  });
  let language = "en";
  try {
    language = root.localStorage.getItem("pixel_globe_language") || "en";
    // One bounded, local-only record. Never synchronized or sent as telemetry.
    root.localStorage.setItem(STARTUP_DIAGNOSTIC_KEY, report);
  } catch (storageError) {
    root.console.warn("Startup diagnostic could not be persisted", storageError);
  }
  root.console.error(report);
  const loading = document.getElementById("loading-screen");
  loading.hidden = false;
  loading.dataset.state = "failed";
  loading.dataset.phase = "bootstrap";
  loading.setAttribute("role", "alert");
  document.querySelector(".shell").setAttribute("aria-busy", "false");
  document.getElementById("loading-status-text").textContent = translate(language, "recovery.startupFailed");
  const button = document.getElementById("crash-copy-button");
  button.hidden = false;
  button.textContent = translate(language, "connection.retry");
  button.onclick = () => root.location.reload();
  button.focus({ preventScroll: true });
  return report;
}

export function consumeStartupDiagnostic(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.removeItem !== "function") {
    throw new Error("Startup diagnostic consumption requires storage");
  }
  const report = storage.getItem(STARTUP_DIAGNOSTIC_KEY);
  if (report !== null) storage.removeItem(STARTUP_DIAGNOSTIC_KEY);
  return report;
}
