import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPITAL_PEACE_TERM_ANNEXATION,
  CAPITAL_PEACE_TERM_CONCESSIONS,
  CAPITAL_PEACE_TERM_PAPAL_FAVOUR,
  CAPITAL_PEACE_TERM_VASSALAGE,
  PORT_CONQUEST_MIN_CREW,
  applyPortConquestOwnership,
  capitalPeaceTreatyOptions,
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
  settleCapitalPeaceTreaty,
  validatePortConquestMemory
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
  const evora = city({ tileId: 14, portId: undefined, city: "Evora" });
  const cities = [capital, porto, evora];
  const event = recordPortCapture(memory, capital, "england", 400, "player");
  assert.equal(event.capitalCapturedFactionId, "portugal");
  assert.equal(event.collapsedFactionId, null);
  assert.equal(
    chooseCapitalPeaceTerm(memory, [capital, porto], event, 0.5, { cities }),
    CAPITAL_PEACE_TERM_ANNEXATION
  );
  const treaty = settleCapitalPeaceTreaty(
    memory,
    [capital, porto],
    event,
    CAPITAL_PEACE_TERM_ANNEXATION,
    400,
    { cities }
  );
  assert.equal(treaty.annexedFactionId, "portugal");
  assert.equal(effectivePortFactionId(memory, capital), "england");
  assert.equal(effectivePortFactionId(memory, porto), "england");
  assert.equal(effectivePortFactionId(memory, evora), "england");
  applyPortConquestOwnership(memory, cities);
  assert.equal(capital.factionId, "england");
  assert.equal(porto.factionId, "england");
  assert.equal(evora.factionId, "england");
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

test("inland cities count against annexation even when the defeated power has few ports", () => {
  const memory = createPortConquestMemory();
  const capital = city({ isFactionCapital: true, capitalOfFactionId: "portugal" });
  const porto = city({ tileId: 13, portId: "porto", city: "Porto" });
  const inlandCities = [
    city({ tileId: 14, portId: undefined, city: "Evora" }),
    city({ tileId: 15, portId: undefined, city: "Viseu" }),
    city({ tileId: 16, portId: undefined, city: "Braganca" })
  ];
  const event = recordPortCapture(memory, capital, "england", 400, "player");
  const options = capitalPeaceTreatyOptions(memory, [capital, porto], event, {
    cities: [capital, porto, ...inlandCities]
  });

  assert.equal(options.losingPortCount, 2);
  assert.equal(options.losingCityCount, 5);
  assert.equal(options.annexationAllowed, false);
  assert.equal(
    chooseCapitalPeaceTerm(
      memory,
      [capital, porto],
      event,
      0.5,
      { cities: [capital, porto, ...inlandCities] }
    ),
    CAPITAL_PEACE_TERM_VASSALAGE
  );
});

test("territorial peace deterministically cedes the city nearest the winner's frontier", () => {
  const memory = createPortConquestMemory();
  const capital = city({
    isFactionCapital: true,
    capitalOfFactionId: "portugal",
    lat: 10,
    lon: 10
  });
  const winnerFrontier = city({
    tileId: 20,
    portId: undefined,
    city: "English Frontier",
    factionId: "england",
    lat: 0,
    lon: 0
  });
  const nearInland = city({
    tileId: 21,
    portId: undefined,
    city: "Near Inland City",
    lat: 1,
    lon: 1
  });
  const farInland = city({
    tileId: 22,
    portId: undefined,
    city: "Far Inland City",
    lat: 8,
    lon: 8
  });
  const cities = [capital, winnerFrontier, nearInland, farInland];
  const event = recordPortCapture(memory, capital, "england", 400, "player");
  const treaty = settleCapitalPeaceTreaty(
    memory,
    [capital],
    event,
    CAPITAL_PEACE_TERM_CONCESSIONS,
    400,
    { cities }
  );

  assert.deepEqual(treaty.concessionCityIds, ["city-21"]);
  assert.deepEqual(treaty.concessionCityNames, ["Near Inland City"]);
  assert.deepEqual(treaty.concessionPortIds, []);
  assert.equal(effectivePortFactionId(memory, nearInland), "england");
  assert.equal(effectivePortFactionId(memory, farInland), "portugal");
  assert.equal(effectivePortFactionId(memory, capital), "portugal");
});

test("territorial peace can prefer a valuable overseas port to a minor nearby city", () => {
  const memory = createPortConquestMemory();
  const capital = city({
    isFactionCapital: true,
    capitalOfFactionId: "portugal",
    country: "Portugal",
    lat: 38.72,
    lon: -9.14,
    population: 80000
  });
  const englishPort = city({
    tileId: 30,
    portId: "plymouth",
    city: "Plymouth",
    country: "United Kingdom",
    factionId: "england",
    lat: 50.38,
    lon: -4.14,
    population: 10000
  });
  const localInland = city({
    tileId: 31,
    portId: undefined,
    city: "Evora",
    country: "Portugal",
    lat: 38.57,
    lon: -7.91,
    population: 12000
  });
  const goa = city({
    tileId: 32,
    portId: "goa",
    city: "Goa",
    country: "India",
    lat: 15.49,
    lon: 73.82,
    population: 50000
  });
  const cities = [capital, englishPort, localInland, goa];
  const event = recordPortCapture(memory, capital, "england", 400, "player");
  const treaty = settleCapitalPeaceTreaty(
    memory,
    [capital, englishPort, goa],
    event,
    CAPITAL_PEACE_TERM_CONCESSIONS,
    400,
    { cities }
  );

  assert.deepEqual(treaty.concessionCityIds, ["goa"]);
  assert.deepEqual(treaty.concessionCityNames, ["Goa"]);
  assert.deepEqual(treaty.concessionPortIds, ["goa"]);
  assert.equal(effectivePortFactionId(memory, goa), "england");
  assert.equal(effectivePortFactionId(memory, localInland), "portugal");
});

test("a Christian conqueror can dictate papal policy but cannot annex Rome", () => {
  const memory = createPortConquestMemory();
  const rome = city({
    tileId: 40,
    portId: "rome",
    city: "Rome",
    factionId: "papal-states",
    isFactionCapital: true,
    capitalOfFactionId: "papal-states"
  });
  const event = recordPortCapture(memory, rome, "england", 400, "player");
  assert.equal(
    chooseCapitalPeaceTerm(memory, [rome], event),
    CAPITAL_PEACE_TERM_PAPAL_FAVOUR
  );
  assert.throws(
    () => settleCapitalPeaceTreaty(
      memory,
      [rome],
      event,
      CAPITAL_PEACE_TERM_ANNEXATION,
      400
    ),
    /unavailable/
  );
  const treaty = settleCapitalPeaceTreaty(
    memory,
    [rome],
    event,
    CAPITAL_PEACE_TERM_PAPAL_FAVOUR,
    400
  );
  assert.equal(treaty.papalActionTargetFactionId, "england");
  assert.equal(effectivePortFactionId(memory, rome), "papal-states");
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

test("saved port-only treaties remain valid without generalized city fields", () => {
  const memory = createPortConquestMemory();
  memory.treaties.push({
    id: "legacy-port-treaty",
    capitalPortId: "lisbon",
    loserFactionId: "portugal",
    winnerFactionId: "england",
    term: CAPITAL_PEACE_TERM_VASSALAGE,
    annexedFactionId: null,
    concessionPortIds: ["porto"],
    papalActionTargetFactionId: null,
    simMinute: 400,
    source: "player"
  });

  assert.equal(validatePortConquestMemory(memory), memory);
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
