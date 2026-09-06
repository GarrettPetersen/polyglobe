// Permission to enter a quay (including purchased passage or a disguise) does
// not imply that the local government can receive the captain publicly.
export function portGovernmentAudienceAvailable(session, city, entryStatus) {
  if (!entryStatus || typeof entryStatus.allowed !== "boolean" ||
      typeof entryStatus.hostile !== "boolean") {
    throw new Error("Government audience requires current port-entry status");
  }
  return session?.kind === "port" && session.cityId === city.cityId &&
    session.admittedToPort === true && session.disguisedEntry !== true &&
    entryStatus.allowed && !entryStatus.hostile &&
    !entryStatus.hostileByWar && !entryStatus.hostileLocalStanding &&
    !entryStatus.hostileByStanding;
}
