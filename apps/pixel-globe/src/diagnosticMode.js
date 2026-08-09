export const DIAGNOSTIC_MODE_STORAGE_KEY = "pixel_globe_diagnostic_mode";
export const RUNTIME_ASSERTION_DIAGNOSTIC_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export class RuntimeDiagnosticAssertionError extends Error {
  constructor(message, diagnosticKey) {
    if (typeof message !== "string" || message.length === 0) {
      throw new Error("Runtime diagnostic assertion requires a message");
    }
    if (typeof diagnosticKey !== "string" || diagnosticKey.length === 0) {
      throw new Error("Runtime diagnostic assertion requires a key");
    }
    super(message);
    this.diagnosticKey = diagnosticKey;
  }
}

export function loadDiagnosticMode(storage) {
  requireStorage(storage);
  return storage.getItem(DIAGNOSTIC_MODE_STORAGE_KEY) === "true";
}

export function persistDiagnosticMode(storage, enabled) {
  requireStorage(storage);
  storage.setItem(DIAGNOSTIC_MODE_STORAGE_KEY, String(Boolean(enabled)));
  return Boolean(enabled);
}

export function handleRuntimeDiagnosticAssertion({
  message,
  diagnosticKey,
  diagnosticMode,
  report
}) {
  if (typeof report !== "function") {
    throw new Error("Runtime diagnostic assertion requires a reporter");
  }
  const error = new RuntimeDiagnosticAssertionError(message, diagnosticKey);
  report(error, {
    key: diagnosticKey,
    cooldownMs: RUNTIME_ASSERTION_DIAGNOSTIC_COOLDOWN_MS
  });
  if (diagnosticMode) throw error;
  return false;
}

export function isRuntimeDiagnosticAssertionError(error) {
  return error instanceof RuntimeDiagnosticAssertionError;
}

function requireStorage(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new Error("Diagnostic mode requires storage");
  }
}
