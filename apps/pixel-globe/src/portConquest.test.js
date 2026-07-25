import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPITAL_PEACE_TERM_ANNEXATION,
  CAPITAL_PEACE_TERM_VASSALAGE,
  PORT_CONQUEST_MIN_CREW,
  applyPortConquestOwnership,
  createPortConquestMemory,
  effectivePortFactionId,
  clearPlayerPortAssault,
  chooseCapitalPeaceTerm,
  markPlayerPortAssault,
  npcPortConquestChance,
  portConquestPrize,
  playerPortAssaultIsActive,
  portConquestStatus,
  recordPortCapture,
  resolvePortConquest,
  settleCapitalPeaceTreaty
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

test("assault success falls logarithmically with population but keeps a viable floor", () => {
  const statusForPopulation = (population, capital = false) => portConquestStatus({
    city: city({ population, isFactionCapital: capital, capitalOfFactionId: capital ? "portugal" : undefined }),
    batteryDisabled: true,
    crew: 54,
    crewCapacity: 54,
    attackerFactionId: "england"
  });
  const village = statusForPopulation(2500);
  const cityPort = statusForPopulation(12500);
  const metropolis = statusForPopulation(62500);
  assert.ok(village.successChance > cityPort.successChance);
  assert.ok(cityPort.successChance > metropolis.successChance);
  assert.ok(Math.abs(
    (village.successChance - cityPort.successChance) -
    (cityPort.successChance - metropolis.successChance)
  ) < 0.000001);
  assert.ok(Math.abs(statusForPopulation(100000000).successChance - 0.41) < 0.000001);
  assert.equal(statusForPopulation(100000000, true).successChance, 0.15);
});

test("conquest pays a large population-scaled prize with a capital treasury bonus", () => {
  const villagePrize = portConquestPrize(city({ population: 3000 }));
  const richPortPrize = portConquestPrize(city({ population: 90000 }));
  const capitalPrize = portConquestPrize(city({ population: 90000, isFactionCapital: true }));
  assert.equal(villagePrize, 650);
  assert.equal(richPortPrize, 1800);
  assert.equal(capitalPrize, 4300);
});

test("capturing a small-state capital permits annexation through a peace treaty", () => {
  const memory = createPortConquestMemory();
  const capital = city({ isFactionCapital: true, capitalOfFactionId: "portugal" });
  const porto = city({ tileId: 13, portId: "porto", city: "Porto" });
  const event = recordPortCapture(memory, capital, "england", 400, "player");
  assert.equal(event.capitalCapturedFactionId, "portugal");
  assert.equal(event.collapsedFactionId, null);
  assert.equal(chooseCapitalPeaceTerm(memory, [capital, porto], event), CAPITAL_PEACE_TERM_ANNEXATION);
  const treaty = settleCapitalPeaceTreaty(
    memory,
    [capital, porto],
    event,
    CAPITAL_PEACE_TERM_ANNEXATION,
    400
  );
  assert.equal(treaty.annexedFactionId, "portugal");
  assert.equal(effectivePortFactionId(memory, capital), "england");
  assert.equal(effectivePortFactionId(memory, porto), "england");
  applyPortConquestOwnership(memory, [capital, porto]);
  assert.equal(capital.factionId, "england");
  assert.equal(porto.factionId, "england");
});

test("capturing a large-state capital restores it under a vassalage settlement", () => {
  const memory = createPortConquestMemory();
  const capital = city({ isFactionCapital: true, capitalOfFactionId: "portugal" });
  const ports = [
    capital,
    city({ tileId: 13, portId: "porto", city: "Porto" }),
    city({ tileId: 14, portId: "coimbra", city: "Coimbra" }),
    city({ tileId: 15, portId: "faro", city: "Faro" })
  ];
  const event = recordPortCapture(memory, capital, "england", 400, "player");
  assert.equal(chooseCapitalPeaceTerm(memory, ports, event), CAPITAL_PEACE_TERM_VASSALAGE);
  const treaty = settleCapitalPeaceTreaty(
    memory,
    ports,
    event,
    CAPITAL_PEACE_TERM_VASSALAGE,
    400
  );
  assert.equal(treaty.annexedFactionId, null);
  assert.equal(effectivePortFactionId(memory, capital), "portugal");
  assert.equal(memory.collapsedFactionIds.includes("portugal"), false);
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
