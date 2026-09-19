export const SHIP_ATTACK_BASIS = Object.freeze({
  EMBARGO: "embargo",
  ENCOUNTER: "encounter",
  LETTER_OF_MARQUE: "letter-of-marque",
  PIRATE: "pirate",
  SELF_DEFENSE: "self-defense",
  WAR: "war"
});

export function shipAttackEligibility({
  shipId,
  combatGrace = false,
  targetIsPirate = false,
  encounterAuthorized = false,
  ownNationAtWar = false,
  privateeringIssuerAdjective = null,
  tradeRestrictionViolation = null,
  selfDefense = false
}) {
  if (typeof shipId !== "string" || shipId.length === 0) {
    throw new Error("Ship attack eligibility requires a stable ship id");
  }
  for (const [label, value] of Object.entries({
    combatGrace,
    targetIsPirate,
    encounterAuthorized,
    ownNationAtWar,
    selfDefense
  })) {
    if (typeof value !== "boolean") throw new Error(`Invalid ship attack ${label}: ${value}`);
  }
  if (privateeringIssuerAdjective !== null &&
      (typeof privateeringIssuerAdjective !== "string" || privateeringIssuerAdjective.trim() === "")) {
    throw new Error(`Invalid privateering authority for ${shipId}`);
  }
  if (tradeRestrictionViolation !== null && (
    typeof tradeRestrictionViolation !== "object" ||
    typeof tradeRestrictionViolation.id !== "string" ||
    tradeRestrictionViolation.id.length === 0 ||
    typeof tradeRestrictionViolation.issuerAdjective !== "string" ||
    tradeRestrictionViolation.issuerAdjective.length === 0
  )) {
    throw new Error(`Invalid trade-restriction authority for ${shipId}`);
  }

  const basis = selfDefense
    ? SHIP_ATTACK_BASIS.SELF_DEFENSE
    : tradeRestrictionViolation
      ? SHIP_ATTACK_BASIS.EMBARGO
      : privateeringIssuerAdjective
        ? SHIP_ATTACK_BASIS.LETTER_OF_MARQUE
        : ownNationAtWar
          ? SHIP_ATTACK_BASIS.WAR
          : targetIsPirate
            ? SHIP_ATTACK_BASIS.PIRATE
            : encounterAuthorized
              ? SHIP_ATTACK_BASIS.ENCOUNTER
              : null;
  return Object.freeze({
    available: !combatGrace,
    reason: combatGrace ? "surrendered" : null,
    legal: basis !== null,
    piracy: basis === null,
    basis,
    issuerAdjective: basis === SHIP_ATTACK_BASIS.EMBARGO
      ? tradeRestrictionViolation.issuerAdjective
      : basis === SHIP_ATTACK_BASIS.LETTER_OF_MARQUE
        ? privateeringIssuerAdjective
        : null,
    tradeRestrictionViolationId: basis === SHIP_ATTACK_BASIS.EMBARGO
      ? tradeRestrictionViolation.id
      : null
  });
}
