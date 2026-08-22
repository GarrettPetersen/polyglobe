export const IMPERIAL_MISSION_KINDS = Object.freeze([
  mission("diet-convocation", "Carry summons to the Imperial Diet", "courier"),
  mission("decree-delivery", "Deliver an Imperial decree to an Estate", "courier"),
  mission("election-instructions", "Carry sealed electoral instructions", "courier"),
  mission("mediation", "Escort envoys to an Imperial mediation", "escort"),
  mission("troop-delivery", "Deliver an Estate's troop contribution", "transport"),
  mission("tax-delivery", "Carry matricular tax receipts", "transport"),
  mission("imperial-defence", "Supply an authorized Imperial defence", "supply"),
  mission("religious-dispute", "Convey parties to a religious disputation", "escort"),
  mission("ban-enforcement", "Support enforcement of an Imperial Ban", "privateering")
]);

export function imperialMissionKind(kind) {
  const missionKind = IMPERIAL_MISSION_KINDS.find((item) => item.kind === kind);
  if (!missionKind) throw new Error(`Unknown Imperial mission kind: ${kind}`);
  return missionKind;
}

function mission(kind, title, activity) {
  return Object.freeze({ kind, title, activity });
}
