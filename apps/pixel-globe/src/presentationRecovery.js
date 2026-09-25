import { isUnrecoverableGameDataFailure } from "./runtimeFaultRecovery.js";

export function createPresentationRecovery({ isDiagnosticMode, report }) {
  if (typeof isDiagnosticMode !== "function") {
    throw new Error("Presentation recovery requires a diagnostic-mode predicate");
  }
  if (typeof report !== "function") {
    throw new Error("Presentation recovery requires a reporter");
  }

  function present(diagnosticKey, operation) {
    if (typeof diagnosticKey !== "string" || diagnosticKey.length === 0) {
      throw new Error("Presentation recovery requires a diagnostic key");
    }
    if (typeof operation !== "function") {
      throw new Error("Presentation recovery requires an operation");
    }
    try {
      return Object.freeze({ recovered: false, value: operation() });
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      if (isDiagnosticMode() || isUnrecoverableGameDataFailure(normalized)) throw normalized;
      report(normalized, diagnosticKey);
      return Object.freeze({ recovered: true, value: undefined });
    }
  }

  return Object.freeze({ present });
}
