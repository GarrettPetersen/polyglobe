export const DIALOGUE_SELECTION_ACTIVE = "active";
export const DIALOGUE_SELECTION_ALREADY_CLOSED = "already-closed";

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
