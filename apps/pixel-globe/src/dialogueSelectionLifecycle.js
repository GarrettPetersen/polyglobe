export const DIALOGUE_SELECTION_ACTIVE = "active";
export const DIALOGUE_SELECTION_ALREADY_CLOSED = "already-closed";
export const DIALOGUE_SELECTION_HANDED_OFF = "handed-off";

export function dialogueSelectionCompletion(selectedSession, currentSession, result) {
  if (!selectedSession || typeof selectedSession.kind !== "string" || selectedSession.kind === "") {
    throw new Error("Dialogue selection requires its original session");
  }
  if (!result || typeof result.closed !== "boolean") {
    throw new Error("Dialogue selection requires an explicit completion result");
  }
  if (currentSession === selectedSession) return DIALOGUE_SELECTION_ACTIVE;
  if (currentSession === null && result.closed) return DIALOGUE_SELECTION_ALREADY_CLOSED;
  if (currentSession === null) {
    throw new Error("Dialogue session closed before its option completed");
  }
  throw new Error("Dialogue session was replaced before its option completed");
}

export function dialogueSelectionHandoff(selectedSession, currentSession, {
  overlayOpened = false
} = {}) {
  if (!selectedSession || typeof selectedSession.kind !== "string" || selectedSession.kind === "") {
    throw new Error("Dialogue handoff requires its original session");
  }
  if (typeof overlayOpened !== "boolean") {
    throw new Error("Dialogue handoff overlay state must be boolean");
  }
  if (currentSession !== selectedSession || overlayOpened) {
    return DIALOGUE_SELECTION_HANDED_OFF;
  }
  throw new Error("Dialogue handoff completed without a replacement session or overlay");
}
