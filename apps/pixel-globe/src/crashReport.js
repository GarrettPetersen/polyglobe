export function formatCrashReport({
  error,
  heading,
  occurredAt,
  metadata,
  context,
  language,
  viewport,
  userAgent
}) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  const fields = [
    "MARQUE & REPRISAL CRASH REPORT",
    `Time: ${requiredText(occurredAt, "crash report time")}`,
    `Heading: ${requiredText(heading, "crash report heading")}`,
    `Message: ${normalizedError.message || normalizedError.name}`,
    `Build: ${requiredText(metadata?.revision, "crash report build")}`,
    `Edition: ${requiredText(metadata?.edition, "crash report edition")}`,
    `Channel: ${requiredText(metadata?.channel, "crash report channel")}`,
    `Platform: ${requiredText(metadata?.platform, "crash report platform")}`,
    `Language: ${requiredText(language, "crash report language")}`,
    `Screen: ${requiredText(context?.screen, "crash report screen")}`,
    `Main quest: ${requiredText(context?.mainQuest, "crash report main quest")}`,
    `Ship: ${requiredText(context?.ship, "crash report ship")}`,
    `Viewport: ${positiveInteger(viewport?.width, "crash report viewport width")}x` +
      `${positiveInteger(viewport?.height, "crash report viewport height")}`,
    `User agent: ${requiredText(userAgent, "crash report user agent")}`
  ];
  if (normalizedError.stack) fields.push("", "Stack:", normalizedError.stack);
  return fields.join("\n");
}

export async function copyCrashReport(text, {
  clipboard = globalThis.navigator?.clipboard,
  documentObject = globalThis.document
} = {}) {
  const normalized = requiredText(text, "crash report text");
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(normalized);
      return true;
    } catch {
      // Local Electron and file builds may not expose the async Clipboard API.
    }
  }
  if (!documentObject?.body || typeof documentObject.execCommand !== "function") {
    throw new Error("Clipboard access is unavailable");
  }
  const field = documentObject.createElement("textarea");
  field.value = normalized;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  documentObject.body.appendChild(field);
  field.select();
  const copied = documentObject.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Browser rejected clipboard copy");
  return true;
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is required`);
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be positive`);
  return value;
}
