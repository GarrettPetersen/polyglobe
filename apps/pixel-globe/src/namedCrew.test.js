import test from "node:test";
import assert from "node:assert/strict";
import {
  NAMED_CREW_ROLE_HISTORIAN,
  addNamedCrewMember,
  canAddNamedCrewMember,
  genericCrewCount,
  hasPermanentCrewBerth,
  permanentCrewFloor,
  permanentCrewBerthsRemaining,
  reconcileNamedCrewMember,
  removeNamedCrewMember,
  validateNamedCrew
} from "./namedCrew.js";
import {
  consumeNamedCrewDeathNotice,
  createGameState,
  loseCrew,
  pendingNamedCrewDeathNotice
} from "./gameState.js";
import { gameStatePerkTotals } from "./playerPerks.js";

function character(id = "astrid") {
  return {
    id,
    name: id === "astrid" ? "Astrid" : "Leif",
    expressions: [{ id: "neutral", src: "assets/characters/test.png", width: 64, height: 64 }],
    skillIds: ["able-seaman"]
  };
}

function state(crew = 4, crewCapacity = 8) {
  return {
    playerCharacter: character("captain"),
    namedCrew: [],
    ship: { crew, crewCapacity }
  };
}

test("captain and named crew establish the permanent crew floor", () => {
  const value = state();
  addNamedCrewMember(value, character(), NAMED_CREW_ROLE_HISTORIAN);
  assert.equal(value.ship.crew, 5);
  assert.equal(permanentCrewFloor(value), 2);
  assert.equal(genericCrewCount(value), 3);
});

test("named crew take an empty berth when no generic crew can be converted", () => {
  const value = state(1, 3);
  assert.equal(canAddNamedCrewMember(value), true);
  addNamedCrewMember(value, character(), NAMED_CREW_ROLE_HISTORIAN);
  assert.equal(value.ship.crew, 2);
  assert.equal(genericCrewCount(value), 0);
});

test("a full ship cannot silently recruit another permanent crewmate", () => {
  const value = state(1, 1);
  assert.equal(canAddNamedCrewMember(value), false);
  assert.throws(
    () => addNamedCrewMember(value, character(), NAMED_CREW_ROLE_HISTORIAN),
    /no crew berth/
  );
});

test("an explicit vessel handover may replace one generic hand at full complement", () => {
  const value = state(3, 3);
  addNamedCrewMember(value, character(), NAMED_CREW_ROLE_HISTORIAN, {
    replaceGenericWhenFull: true
  });
  assert.equal(value.ship.crew, 3);
  assert.equal(genericCrewCount(value), 1);
});

test("named crewmates consume permanent berths even when they replace generic hands", () => {
  const value = state(3, 3);
  assert.equal(permanentCrewBerthsRemaining(value), 2);
  addNamedCrewMember(value, character("astrid"), NAMED_CREW_ROLE_HISTORIAN, {
    replaceGenericWhenFull: true
  });
  assert.equal(permanentCrewBerthsRemaining(value), 1);
  addNamedCrewMember(value, character("leif"), NAMED_CREW_ROLE_HISTORIAN, {
    replaceGenericWhenFull: true
  });
  assert.equal(value.ship.crew, 3);
  assert.equal(permanentCrewFloor(value), 3);
  assert.equal(permanentCrewBerthsRemaining(value), 0);
  assert.equal(hasPermanentCrewBerth(value), false);
});

test("named crew cannot be duplicated or silently removed", () => {
  const value = state();
  addNamedCrewMember(value, character(), NAMED_CREW_ROLE_HISTORIAN);
  assert.throws(() => addNamedCrewMember(value, character()), /already a named crewmate/);
  assert.equal(removeNamedCrewMember(value, "astrid").name, "Astrid");
  assert.deepEqual(validateNamedCrew(value.namedCrew), []);
});

test("quest recruitment can reconcile the same already-aboard crewmate without adding a berth", () => {
  const value = state(3, 3);
  const recruit = character();
  addNamedCrewMember(value, recruit, undefined, { replaceGenericWhenFull: true });
  const crewBefore = value.ship.crew;

  const reconciled = reconcileNamedCrewMember(value, recruit, undefined, {
    replaceGenericWhenFull: true
  });

  assert.equal(reconciled.added, false);
  assert.equal(reconciled.member.id, recruit.id);
  assert.equal(value.namedCrew.length, 1);
  assert.equal(value.ship.crew, crewBefore);
});

test("casualties take unnamed crew, then named crew, then the captain", () => {
  const captain = { ...character("captain"), skillIds: ["skilled-chef"] };
  const stats = {
    slug: "test-ship",
    cargoCapacity: 20,
    crewCapacity: 6,
    cannons: 0,
    mass: 10,
    navalWeaponKind: null
  };
  const value = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: captain,
    shipStats: stats
  });
  value.ship.crew = 2;
  addNamedCrewMember(value, character(), NAMED_CREW_ROLE_HISTORIAN);
  assert.equal(gameStatePerkTotals(value).topSpeedMultiplier, 1.05);

  assert.equal(loseCrew(value, 1, () => 0), 1);
  assert.equal(value.ship.crew, 2);
  assert.equal(value.namedCrew.length, 1);
  assert.equal(pendingNamedCrewDeathNotice(value), null);

  assert.equal(loseCrew(value, 1, () => 0), 1);
  assert.equal(value.ship.crew, 1);
  assert.equal(value.namedCrew.length, 0);
  assert.equal(pendingNamedCrewDeathNotice(value).character.name, "Astrid");
  assert.equal(consumeNamedCrewDeathNotice(value).character.name, "Astrid");
  assert.equal(gameStatePerkTotals(value).topSpeedMultiplier, 1);

  assert.equal(loseCrew(value, 1, () => 0), 1);
  assert.equal(value.ship.crew, 0);
});
