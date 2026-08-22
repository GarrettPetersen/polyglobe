export const IMPERIAL_CAPTAIN_AUTHORITY_LIMITS = Object.freeze({
  mayDeterminePolicy: false,
  mayCastEstateVote: false,
  mayIssueImperialAct: false,
  mayNegotiateForPrincipal: false
});

export const IMPERIAL_MISSION_KINDS = Object.freeze([
  mission("diet-convocation", "Bear sealed summons to the Imperial Diet", "courier", "emperor-and-estates"),
  mission("decree-delivery", "Bear the Diet's recess under seal to an Estate", "courier", "imperial-diet"),
  mission("election-instructions", "Carry an elector's sealed instructions to his envoys", "courier", "elector"),
  mission("mediation", "Give passage to envoys appointed for Imperial mediation", "escort", "appointed-envoys", true),
  mission("troop-delivery", "Land an Estate's levy at the appointed muster", "transport", "imperial-estate"),
  mission("tax-delivery", "Carry an Estate's assessed contribution and acquittance", "transport", "imperial-estate"),
  mission("imperial-defence", "Carry powder and victuals under a Diet defence mandate", "supply", "imperial-diet"),
  mission("religious-dispute", "Give passage to doctors and envoys summoned for disputation", "escort", "appointed-doctors-and-envoys", true),
  mission("ban-enforcement", "Cruise under commission against one laid under the Imperial Ban", "privateering", "imperial-diet")
]);

export function imperialMissionKind(kind) {
  const missionKind = IMPERIAL_MISSION_KINDS.find((item) => item.kind === kind);
  if (!missionKind) throw new Error(`Unknown Imperial mission kind: ${kind}`);
  return missionKind;
}

function mission(kind, title, activity, decisionAuthority, carriesEmissaries = false) {
  return Object.freeze({
    kind,
    title,
    activity,
    decisionAuthority,
    carriesEmissaries,
    captainAuthority: IMPERIAL_CAPTAIN_AUTHORITY_LIMITS
  });
}
