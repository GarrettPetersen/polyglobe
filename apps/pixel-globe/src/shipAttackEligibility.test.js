import assert from "node:assert/strict";
import test from "node:test";

import { SHIP_ATTACK_BASIS, shipAttackEligibility } from "./shipAttackEligibility.js";

test("ship attack eligibility recognizes every lawful authority", () => {
  const cases = [
    [{ targetIsPirate: true }, SHIP_ATTACK_BASIS.PIRATE],
    [{ encounterAuthorized: true }, SHIP_ATTACK_BASIS.ENCOUNTER],
    [{ ownNationAtWar: true }, SHIP_ATTACK_BASIS.WAR],
    [{ privateeringIssuerAdjective: "Spanish" }, SHIP_ATTACK_BASIS.LETTER_OF_MARQUE],
    [{ tradeRestrictionViolation: { id: "embargo-1", issuerAdjective: "Hospitaller" } },
      SHIP_ATTACK_BASIS.EMBARGO],
    [{ selfDefense: true }, SHIP_ATTACK_BASIS.SELF_DEFENSE]
  ];
  for (const [input, basis] of cases) {
    const eligibility = shipAttackEligibility({ shipId: `ship-${basis}`, ...input });
    assert.equal(eligibility.available, true);
    assert.equal(eligibility.legal, true);
    assert.equal(eligibility.piracy, false);
    assert.equal(eligibility.basis, basis);
  }
});

test("an unauthorized attack remains piracy and a surrendered ship is unavailable", () => {
  const piracy = shipAttackEligibility({ shipId: "merchant-1" });
  assert.equal(piracy.legal, false);
  assert.equal(piracy.piracy, true);
  assert.equal(piracy.basis, null);

  const protectedShip = shipAttackEligibility({ shipId: "merchant-2", combatGrace: true });
  assert.equal(protectedShip.available, false);
  assert.equal(protectedShip.reason, "surrendered");
});

test("a cited embargo takes precedence over a general letter of marque", () => {
  const eligibility = shipAttackEligibility({
    shipId: "merchant-3",
    privateeringIssuerAdjective: "Spanish",
    tradeRestrictionViolation: { id: "embargo-3", issuerAdjective: "Hospitaller" }
  });
  assert.equal(eligibility.basis, SHIP_ATTACK_BASIS.EMBARGO);
  assert.equal(eligibility.issuerAdjective, "Hospitaller");
  assert.equal(eligibility.tradeRestrictionViolationId, "embargo-3");
});
