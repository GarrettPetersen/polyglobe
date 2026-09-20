export const ARRIVAL_RECRUITMENT_ACTIVATION_GUARD_MS = 400;

export function createArrivalRecruitmentActivationGuard(session, nowMs) {
  if (!session || typeof session !== "object") {
    throw new Error("Arrival recruitment activation guard requires a dialogue session");
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Arrival recruitment activation guard requires a valid time: ${nowMs}`);
  }
  return Object.freeze({
    kind: "arrival-recruitment",
    session,
    notBeforeMs: nowMs + ARRIVAL_RECRUITMENT_ACTIVATION_GUARD_MS
  });
}

export function dialogueActionBlockedByActivationGuard(guard, session, action, nowMs) {
  if (guard === null) return false;
  if (!guard || guard.kind !== "arrival-recruitment" || !guard.session ||
      !Number.isFinite(guard.notBeforeMs)) {
    throw new Error("Invalid dialogue activation guard");
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Dialogue activation guard requires a valid time: ${nowMs}`);
  }
  return guard.session === session &&
    action?.type === "hire-crew-member" &&
    nowMs < guard.notBeforeMs;
}

export function displayedDialogueOptionAt(options, selectedIndex) {
  if (!Array.isArray(options)) throw new Error("Dialogue selection requires displayed options");
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
    throw new Error(`Invalid dialogue selection index: ${selectedIndex}`);
  }
  return options[selectedIndex] || null;
}
