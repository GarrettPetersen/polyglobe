import { playerShipReplacementEligibility } from "./gameState.js";
import { vikingLongshipTradeInPlan } from "./vikingLongshipQuest.js";
import { shipStatsForSlug } from "./shipStats.js";
import { permanentCrewFloor } from "./namedCrew.js";

// Escape / back from port dialogue returns to the city scene only while that
// scene is live. Ship dialogue at sea has no portCityView; callers must not
// assume it exists.
export function dialogueEscapeReturnsToPortCity(dialogueState, portCityView) {
  return dialogueState?.kind === "port" && portCityView?.active === true;
}

// Prize capture must use the same hull-transfer eligibility as shipyard trades.
// A naive cargoUsed vs capacity check misses crew berths and destination loadout.
export function surrenderedPrizeCaptureDisabledReason(gameState, candidateShipSlug) {
  if (!gameState) throw new Error("Surrendered prize capture requires player game state");
  if (typeof candidateShipSlug !== "string" || candidateShipSlug.trim() === "") {
    throw new Error("Surrendered prize capture requires a candidate ship slug");
  }
  const vikingTradeIn = vikingLongshipTradeInPlan(gameState);
  const replacement = playerShipReplacementEligibility(
    gameState,
    shipStatsForSlug(candidateShipSlug),
    { departingNamedCrewIds: vikingTradeIn?.departingNamedCrewIds || [] }
  );
  return replacement.eligible ? null : replacement.disabledReason;
}

export function surrenderedPrizeCrewDismissalPlan(gameState, candidateShipSlug) {
  if (!gameState?.ship) throw new Error("Surrendered prize crew plan requires player ship state");
  const candidateStats = shipStatsForSlug(candidateShipSlug);
  const capacity = candidateStats.crewCapacity;
  const vikingTradeIn = vikingLongshipTradeInPlan(gameState);
  const departingIds = new Set(vikingTradeIn?.departingNamedCrewIds || []);
  const departingNamedCrewCount = gameState.namedCrew.filter((member) => departingIds.has(member.id)).length;
  const committedCrew = permanentCrewFloor(gameState) - departingNamedCrewCount;
  if (committedCrew > capacity) return null;
  const crewAfterDepartures = gameState.ship.crew - departingNamedCrewCount;
  const dismissalsRequired = Math.max(0, crewAfterDepartures - capacity);
  if (dismissalsRequired > gameState.crewRoster.length) return null;
  if (dismissalsRequired > 0) {
    const previewState = {
      ...gameState,
      ship: { ...gameState.ship, crew: gameState.ship.crew - dismissalsRequired },
      crewRoster: gameState.crewRoster.slice(0, gameState.crewRoster.length - dismissalsRequired)
    };
    const replacement = playerShipReplacementEligibility(previewState, candidateStats, {
      departingNamedCrewIds: [...departingIds]
    });
    if (!replacement.eligible) return null;
  }
  return Object.freeze({
    targetCrew: capacity,
    dismissalsRequired
  });
}

export function assertSurrenderedNpcPrizeReadyForCapture(strategic, candidateSlug, npcShipId) {
  if (!strategic || strategic.slug !== candidateSlug) {
    throw new RecoverableSurrenderedShipCaptureError(
      `Surrendered prize is no longer available: ${npcShipId}`,
      "The prize is no longer alongside for transfer."
    );
  }
  if (
    strategic.specie !== 0 ||
    Object.values(strategic.cargo).some((quantity) => quantity !== 0) ||
    strategic.graceUntilPortVisit <= strategic.portVisits
  ) {
    throw new RecoverableSurrenderedShipCaptureError(
      `Surrendered prize is not ready for transfer: ${npcShipId}`,
      "The prize is no longer ready for transfer."
    );
  }
}

export function assertSurrenderedPrizeCaptureEligible(gameState, candidateShipSlug) {
  const disabledReason = surrenderedPrizeCaptureDisabledReason(gameState, candidateShipSlug);
  if (disabledReason) {
    throw new RecoverableSurrenderedShipCaptureError(
      `Surrendered prize cannot replace the current hull: ${candidateShipSlug}`,
      disabledReason
    );
  }
}

export class RecoverableSurrenderedShipCaptureError extends Error {
  constructor(message, playerFacingMessage) {
    super(message);
    this.name = this.constructor.name;
    if (typeof playerFacingMessage !== "string" || playerFacingMessage.trim() === "") {
      throw new Error("Recoverable capture failure requires player-facing feedback");
    }
    this.playerFacingMessage = playerFacingMessage;
  }
}

export function isRecoverableSurrenderedShipCaptureError(error) {
  return error instanceof RecoverableSurrenderedShipCaptureError ||
    error?.name === RecoverableSurrenderedShipCaptureError.name;
}

export function playerFacingSurrenderedShipCaptureFailure(error) {
  if (isRecoverableSurrenderedShipCaptureError(error)) return error.playerFacingMessage;
  const message = error?.message || "";
  if (/no longer available/i.test(message) || /not ready for transfer/i.test(message)) {
    return "The prize is no longer ready for transfer.";
  }
  if (/will not fit|berths|dismiss .* crew/i.test(message)) {
    return message;
  }
  if (/load|asset|fetch|network/i.test(message)) {
    return "Could not ready the prize vessel. Try again when the hold is prepared.";
  }
  return "The prize crew could not complete the transfer. The vessel remains alongside.";
}

// Anticipated capture failures restore the confirmation screen so the player can
// keep their current hull or dismiss the prize. Programmer errors after a
// validated commit still fail loudly.
export function restoreFailedSurrenderedShipCapture(session, error) {
  if (
    !session ||
    session.kind !== "ship" ||
    session.nodeId !== "capture-loading" ||
    !session.prize?.candidateShipSlug
  ) {
    return false;
  }
  session.nodeId = "capture-confirm";
  session.selectedIndex = 0;
  session.feedback = playerFacingSurrenderedShipCaptureFailure(error);
  return true;
}
