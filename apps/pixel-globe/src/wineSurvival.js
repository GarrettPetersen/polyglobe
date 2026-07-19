const DRUNKEN_WINE_DIALOGUES = Object.freeze([
  "Th' crew's in fine spirits. Very fine spirits. Possibly too many spirits.",
  "I can hold a straight course. Perfectly straight. The horizon's the one wobbling.",
  "Cap'n's log... day whichever. Wine remains. Dignity less certain.",
  "I counted every star twice. That's... very thorough navigation."
]);

export const DRUNK_PORT_ARRIVAL_MINUTES = 6 * 60;

export function wineEmergencyDialogue() {
  return "The water casks are dry. We have no choice but to issue wine to the crew.";
}

export function drunkenWineDialogue(dayNumber) {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    throw new Error(`Invalid wine-only day: ${dayNumber}`);
  }
  return DRUNKEN_WINE_DIALOGUES[(dayNumber - 1) % DRUNKEN_WINE_DIALOGUES.length];
}

export function captainIsDrunkAtPort(gameState) {
  const minutes = gameState?.survival?.wineOnlyMinutes;
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error(`Invalid wine-only time for port arrival: ${minutes}`);
  }
  return minutes >= DRUNK_PORT_ARRIVAL_MINUTES;
}
