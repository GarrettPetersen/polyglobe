// Hiring and wages share the same broad combat qualifications. Experience is
// priced separately; these small premiums distinguish equally seasoned hands.
const CREW_ROLE_PAY_GRADES = Object.freeze({
  sailor: 0,
  hunter: 1,
  archer: 1,
  spearman: 1,
  warrior: 2,
  swordsman: 2,
  crossbowman: 2,
  shieldman: 2,
  halberdier: 2,
  gunner: 2,
  ronin: 2,
  samurai: 3
});

export function crewRolePayGrade(crewTypeId) {
  if (!Object.hasOwn(CREW_ROLE_PAY_GRADES, crewTypeId)) {
    throw new Error(`Crew type has no salary grade: ${crewTypeId}`);
  }
  return CREW_ROLE_PAY_GRADES[crewTypeId];
}
