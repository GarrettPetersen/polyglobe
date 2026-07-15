import test from "node:test";
import assert from "node:assert/strict";
import {
  PORT_CONQUEST_MIN_CREW,
  applyPortConquestOwnership,
  createPortConquestMemory,
  effectivePortFactionId,
  clearPlayerPortAssault,
  markPlayerPortAssault,
  npcPortConquestChance,
  portConquestPrize,
  playerPortAssaultIsActive,
  portConquestStatus,
  recordPortCapture,
  resolvePortConquest
} from "./portConquest.js";

function city(overrides = {}) {
  return {
    tileId: 12,
    portId: "lisbon",
    city: "Lisbon",
    factionId: "portugal",
    ...overrides
  };
}

test("landing marines requires a large hull and at least 36 active crew", () => {
  const base = { city: city(), batteryDisabled: true, attackerFactionId: "england" };
  assert.equal(portConquestStatus({ ...base, crew: 35, crewCapacity: 54 }).canAttempt, false);
  assert.equal(portConquestStatus({ ...base, crew: 35, crewCapacity: 35 }).canAttempt, false);
  assert.equal(portConquestStatus({ ...base, crew: 36, crewCapacity: 36 }).canAttempt, true);
  assert.equal(PORT_CONQUEST_MIN_CREW, 36);
});

test("capitals resist conquest more strongly and inflict heavier losses", () => {
  const ordinary = portConquestStatus({
    city: city(), batteryDisabled: true, crew: 54, crewCapacity: 54, attackerFactionId: "england"
  });
  const capital = portConquestStatus({
    city: city({ isFactionCapital: true, capitalOfFactionId: "portugal" }),
    batteryDisabled: true,
    crew: 54,
    crewCapacity: 54,
    attackerFactionId: "england"
  });
  assert.ok(capital.successChance < ordinary.successChance);
  assert.ok(capital.failureCrewLossMin > ordinary.failureCrewLossMin);
  assert.deepEqual(resolvePortConquest(ordinary, 0, 0), { success: true, crewLost: 0 });
  assert.equal(resolvePortConquest(capital, 0.99, 0.99).crewLost, capital.failureCrewLossMax);
  assert.ok(npcPortConquestChance(city({ isFactionCapital: true })) < npcPortConquestChance(city()));
});

test("conquest pays a large population-scaled prize with a capital treasury bonus", () => {
  const villagePrize = portConquestPrize(city({ population: 3000 }));
  const richPortPrize = portConquestPrize(city({ population: 90000 }));
  const capitalPrize = portConquestPrize(city({ population: 90000, isFactionCapital: true }));
  assert.equal(villagePrize, 650);
  assert.equal(richPortPrize, 1800);
  assert.equal(capitalPrize, 4300);
});

test("capturing a capital collapses its empire while preserving the conquered capital", () => {
  const memory = createPortConquestMemory();
  const capital = city({ isFactionCapital: true, capitalOfFactionId: "portugal" });
  const porto = city({ tileId: 13, portId: "porto", city: "Porto" });
  const event = recordPortCapture(memory, capital, "england", 400, "player");
  assert.equal(event.collapsedFactionId, "portugal");
  assert.equal(effectivePortFactionId(memory, capital), "england");
  assert.equal(effectivePortFactionId(memory, porto), "neutral");
  applyPortConquestOwnership(memory, [capital, porto]);
  assert.equal(capital.factionId, "england");
  assert.equal(porto.factionId, "neutral");
});

test("capturing an ordinary port changes only that port", () => {
  const memory = createPortConquestMemory();
  const target = city();
  const other = city({ tileId: 13, portId: "porto", city: "Porto" });
  const event = recordPortCapture(memory, target, "england", 400, "npc:warship-1");
  assert.equal(event.collapsedFactionId, null);
  applyPortConquestOwnership(memory, [target, other]);
  assert.equal(target.factionId, "england");
  assert.equal(other.factionId, "portugal");
});

test("a disabled harbor remembers the player assault until defenses recover or ownership changes", () => {
  const flags = {};
  const target = city();
  markPlayerPortAssault(flags, target, 500);
  assert.equal(playerPortAssaultIsActive(flags, target, 499), true);
  assert.equal(playerPortAssaultIsActive(flags, target, 500), false);
  markPlayerPortAssault(flags, target, 700);
  clearPlayerPortAssault(flags, target);
  assert.equal(playerPortAssaultIsActive(flags, target, 600), false);
});
