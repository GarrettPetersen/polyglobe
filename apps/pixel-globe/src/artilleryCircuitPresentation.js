export function artilleryCircuitLegCompletionText({
  destinationName,
  remainingDestinationNamesText,
  remainingDestinationCount,
  batteryUpgrade
}) {
  if (typeof destinationName !== "string" || destinationName === "") {
    throw new Error("Artillery-circuit completion requires a destination name");
  }
  if (typeof remainingDestinationNamesText !== "string" || remainingDestinationNamesText === "") {
    throw new Error("Artillery-circuit completion requires remaining destination text");
  }
  if (!Number.isInteger(remainingDestinationCount) || remainingDestinationCount <= 0) {
    throw new Error("Artillery-circuit completion requires a remaining destination count");
  }
  if (typeof batteryUpgrade !== "boolean") {
    throw new Error("Artillery-circuit completion requires a battery-upgrade state");
  }
  if (batteryUpgrade) {
    return remainingDestinationCount === 1
      ? `${destinationName}'s battery has its new guns. ` +
        `The final plans must go to ${remainingDestinationNamesText}.`
      : `${destinationName}'s battery has its new guns. ` +
        `The remaining plans may go to ${remainingDestinationNamesText} in any order.`;
  }
  return remainingDestinationCount === 1
    ? `Nanjing has copied the Portuguese patterns. ` +
      `The final refit is at ${remainingDestinationNamesText}.`
    : `Nanjing has copied the Portuguese patterns. ` +
      `We may now refit ${remainingDestinationNamesText} in any order.`;
}
