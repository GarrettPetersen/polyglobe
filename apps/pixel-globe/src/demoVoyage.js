export const DEMO_SHIP_LOCK_MESSAGE = "NOT AVAILABLE IN DEMO";
export const DEMO_SHIP_LOCK_ICON_ID = "status:achievement-locked";

export function startMenuEditionLabel(buildEditionId) {
  if (buildEditionId === "full") return null;
  if (buildEditionId === "demo") return "DEMO";
  throw new Error(`Unknown build edition for start menu: ${buildEditionId}`);
}

export function demoShipAcquisitionRestriction(
  buildEditionId,
  message = DEMO_SHIP_LOCK_MESSAGE
) {
  if (buildEditionId === "full") return null;
  if (buildEditionId !== "demo") {
    throw new Error(`Unknown build edition for ship acquisition: ${buildEditionId}`);
  }
  if (typeof message !== "string" || message.trim() === "") {
    throw new Error("Demo ship acquisition restriction requires a message");
  }
  return Object.freeze({
    detail: message,
    disabled: true,
    disabledReason: message,
    iconId: DEMO_SHIP_LOCK_ICON_ID
  });
}

export function assertShipAcquisitionAvailable(buildEditionId) {
  const restriction = demoShipAcquisitionRestriction(buildEditionId);
  if (restriction) throw new Error(restriction.disabledReason);
}
