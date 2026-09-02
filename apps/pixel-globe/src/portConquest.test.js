import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPITAL_PEACE_TERM_ANNEXATION,
  CAPITAL_PEACE_TERM_AUTONOMOUS_VASSALAGE,
  CAPITAL_PEACE_TERM_CONCESSIONS,
  CAPITAL_PEACE_TERM_PAPAL_FAVOUR,
  CAPITAL_PEACE_TERM_TRIBUTARY,
  CAPITAL_PEACE_TERM_VASSALAGE,
  PORT_CONQUEST_MIN_CREW,
  applyPortConquestOwnership,
  capitalPeaceTreatyOptions,
  createPortConquestMemory,
  effectivePortFactionId,
  clearPlayerPortAssault,
  clearPlayerPortRaid,
  chooseCapitalPeaceSettlement,
  markPlayerPortAssault,
  markPlayerPortRaided,
  npcPortConquestChance,
  portConquestPrize,
  portRaidPrize,
  playerPortAssaultIsActive,
  playerPortRaidIsActive,
  portConquestStatus,
  recordPortCapture,
  resolvePortConquest,
  restoreCollapsedFactionAtCities,
  settleCapitalPeaceTreaty,
  validatePortConquestMemory
} from "./portConquest.js";

function city(overrides = {}) {
  const result = {
    tileId: 12,
    portId: "lisbon",
    city: "Lisbon",
    factionId: "portugal",
    ...overrides
  };
  return {
    ...result,
    cityId: overrides.cityId || `${result.portId || result.city.toLowerCase()}|${result.factionId}`
  };
}

test("landing marines requires a large hull and at least 36 fighting hands", () => {
  const base = { city: city(), batteryDisabled: true, attackerFactionId: "england" };
  assert.equal(portConquestStatus({ ...base, crew: 35, crewCapacity: 54 }).canAttempt, false);
  assert.equal(portConquestStatus({ ...base, crew: 35, crewCapacity: 35 }).canAttempt, false);
  assert.equal(portConquestStatus({ ...base, crew: 36, crewCapacity: 36 }).canAttempt, true);
  assert.equal(portConquestStatus({
    ...base,
    crew: 12,
    crewCapacity: 36,
    auxiliaryTroops: 24
  }).canAttempt, true);
  assert.equal(PORT_CONQUEST_MIN_CREW, 36);
});

test("experience changes assault odds without replacing the minimum headcount", () => {
  const base = {
    city: city({ population: 25000 }),
    batteryDisabled: true,
    crew: 36,
    crewCapacity: 54,
    attackerFactionId: "england"
  };
  const novices = portConquestStatus({ ...base, effectiveCrew: 8 });
  const seasoned = portConquestStatus({ ...base, effectiveCrew: 34 });
  const veterans = portConquestStatus({ ...base, effectiveCrew: 39.5 });
  assert.equal(novices.canAttempt, true);
  assert.equal(seasoned.canAttempt, true);
  assert.equal(veterans.canAttempt, true);
  assert.ok(novices.successChance < seasoned.successChance);
  assert.ok(seasoned.successChance < veterans.successChance);
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
  assert.deepEqual(resolvePortConquest(ordinary, 0, 0), {
    success: true,
    crewLost: 0,
    auxiliaryLost: 0,
    totalLost: 0
  });
  assert.equal(resolvePortConquest(capital, 0.99, 0.99).crewLost, capital.failureCrewLossMax);
  assert.ok(npcPortConquestChance(city({ isFactionCapital: true })) < npcPortConquestChance(city()));
});

test("auxiliary troops improve assault odds and absorb the first casualties", () => {
  const ordinary = portConquestStatus({
    city: city({ population: 25000 }),
    batteryDisabled: true,
    crew: 36,
    crewCapacity: 54,
    attackerFactionId: "spain"
  });
  const supported = portConquestStatus({
    city: city({ population: 25000 }),
    batteryDisabled: true,
    crew: 36,
    crewCapacity: 54,
    attackerFactionId: "spain",
    auxiliaryTroops: 24,
    assaultChanceBonus: 0.3
  });
  assert.ok(supported.successChance > 0.8);
  assert.ok(supported.successChance > ordinary.successChance);
  const defeat = resolvePortConquest(supported, 0.99, 0);
  assert.equal(defeat.success, false);
  assert.equal(defeat.totalLost, supported.failureCrewLossMin);
  assert.equal(defeat.auxiliaryLost, Math.min(24, defeat.totalLost));
  assert.equal(defeat.crewLost, Math.max(0, defeat.totalLost - 24));
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

test("conquest takes a major share of finite port specie and capitals yield more", () => {
  const ordinaryPrize = portConquestPrize(city(), 60000);
  const capitalPrize = portConquestPrize(city({ isFactionCapital: true }), 60000);
  assert.equal(ordinaryPrize, 24000);
  assert.equal(capitalPrize, 33000);
  assert.equal(portConquestPrize(city(), 4000), 4000);
  assert.equal(portConquestPrize(city(), 0), 0);
  assert.throws(() => portConquestPrize(city(), 60000.5), /Invalid port specie/);
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
    chooseCapitalPeaceSettlement(memory, [capital, porto], event, 0.1, { cities }).term,
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

test("sovereigns use the same peace logic after player and NPC capital captures", () => {
  const ports = [
    city({ isFactionCapital: true, capitalOfFactionId: "portugal" }),
    city({ tileId: 13, portId: "porto", city: "Porto" }),
    city({ tileId: 14, portId: "coimbra", city: "Coimbra" }),
    city({ tileId: 15, portId: "faro", city: "Faro" })
  ];
  const decide = (source) => {
    const memory = createPortConquestMemory();
    const event = recordPortCapture(memory, ports[0], "england", 400, source);
    return chooseCapitalPeaceSettlement(memory, ports, event, 0.6);
  };

  assert.deepEqual(decide("player"), decide("npc:warship-1"));
});

test("a collapsed faction can be restored at a new capital", () => {
  const memory = createPortConquestMemory();
  memory.collapsedFactionIds.push("hospitallers");
  const rhodes = city({
    tileId: 30,
    portId: "rhodes",
    city: "Rhodes",
    factionId: "ottoman",
    foundingFactionId: "hospitallers",
    isFactionCapital: true,
    capitalOfFactionId: "hospitallers"
  });
  const birgu = city({
    tileId: 31,
    portId: "birgu",
    city: "Birgu",
    factionId: "spain"
  });
  const tripoli = city({
    tileId: 32,
    portId: "tripoli",
    city: "Tripoli",
    factionId: "spain"
  });

  restoreCollapsedFactionAtCities(memory, [birgu, tripoli], {
    factionId: "hospitallers",
    capitalCity: birgu,
    simMinute: 600,
    source: "papal-malta-grant"
  });
  applyPortConquestOwnership(memory, [rhodes, birgu, tripoli]);

  assert.equal(memory.collapsedFactionIds.includes("hospitallers"), false);
  assert.equal(birgu.factionId, "hospitallers");
  assert.equal(birgu.isFactionCapital, true);
  assert.equal(birgu.capitalOfFactionId, "hospitallers");
  assert.equal(tripoli.factionId, "hospitallers");
  assert.equal(rhodes.isFactionCapital, false);
  assert.equal(rhodes.capitalOfFactionId, null);
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
  assert.equal(
    chooseCapitalPeaceSettlement(memory, ports, event, 0.2).term,
    CAPITAL_PEACE_TERM_VASSALAGE
  );
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

test("vassalage recognizes an earlier occupation without transferring the city again", () => {
  const memory = createPortConquestMemory();
  const hormuz = city({
    tileId: 50,
    portId: "hormuz",
    city: "Hormuz",
    factionId: "hormuz",
    isFactionCapital: true,
    capitalOfFactionId: "hormuz"
  });
  const muscat = city({
    tileId: 51,
    portId: "muscat",
    city: "Muscat",
    factionId: "hormuz"
  });
  recordPortCapture(memory, muscat, "ottoman", 300, "player");
  const capitalEvent = recordPortCapture(memory, hormuz, "ottoman", 400, "player");

  const treaty = settleCapitalPeaceTreaty(
    memory,
    [hormuz, muscat],
    capitalEvent,
    CAPITAL_PEACE_TERM_VASSALAGE,
    400
  );

  assert.deepEqual(treaty.concessionCityNames, ["Muscat"]);
  assert.equal(effectivePortFactionId(memory, muscat), "ottoman");
  assert.equal(effectivePortFactionId(memory, hormuz), "hormuz");
  assert.equal(memory.events.length, 2, "the treaty must not record a second capture of Muscat");
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
    chooseCapitalPeaceSettlement(
      memory,
      [capital, porto],
      event,
      0.2,
      { cities: [capital, porto, ...inlandCities] }
    ).term,
    CAPITAL_PEACE_TERM_AUTONOMOUS_VASSALAGE
  );
});

test("capital peace can impose graded dependency terms", () => {
  const memory = createPortConquestMemory();
  const capital = city({ isFactionCapital: true, capitalOfFactionId: "portugal" });
  const event = recordPortCapture(memory, capital, "england", 400, "npc");
  const options = capitalPeaceTreatyOptions(memory, [capital], event);
  assert.equal(options.terms.includes(CAPITAL_PEACE_TERM_VASSALAGE), true);
  assert.equal(options.terms.includes(CAPITAL_PEACE_TERM_AUTONOMOUS_VASSALAGE), true);
  assert.equal(options.terms.includes(CAPITAL_PEACE_TERM_TRIBUTARY), true);
});

test("decisive occupations can demand several coherent territorial concessions", () => {
  const memory = createPortConquestMemory();
  const capital = city({ isFactionCapital: true, capitalOfFactionId: "portugal" });
  const losingCities = Array.from({ length: 5 }, (_, index) => city({
    tileId: 20 + index,
    portId: `portugal-${index}`,
    city: `Portuguese City ${index}`
  }));
  const winnerCities = Array.from({ length: 12 }, (_, index) => city({
    tileId: 40 + index,
    portId: `england-${index}`,
    city: `English City ${index}`,
    factionId: "england"
  }));
  for (const occupied of losingCities.slice(0, 1)) {
    recordPortCapture(memory, occupied, "england", 300 + occupied.tileId, "npc:warship-1");
  }
  const event = recordPortCapture(memory, capital, "england", 400, "player");
  const cities = [capital, ...losingCities, ...winnerCities];
  const settlement = chooseCapitalPeaceSettlement(memory, cities, event, 0.8, { cities });

  assert.equal(settlement.term, CAPITAL_PEACE_TERM_CONCESSIONS);
  assert.equal(settlement.additionalConcessionCount, 2);
  const treaty = settleCapitalPeaceTreaty(
    memory,
    cities,
    event,
    settlement.term,
    400,
    { cities, additionalConcessionCount: settlement.additionalConcessionCount }
  );
  assert.equal(treaty.concessionCityIds.length, 3);
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

  assert.deepEqual(treaty.concessionCityIds, ["near inland city|portugal"]);
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
    cityId: "plymouth|united kingdom",
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
    cityId: "evora|portugal",
    city: "Evora",
    country: "Portugal",
    lat: 38.57,
    lon: -7.91,
    population: 12000
  });
  const goa = city({
    tileId: 32,
    portId: "goa",
    cityId: "goa|india",
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

  assert.deepEqual(treaty.concessionCityIds, ["goa|india"]);
  assert.deepEqual(treaty.concessionCityNames, ["Goa"]);
  assert.deepEqual(treaty.concessionPortIds, ["goa|india"]);
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
    chooseCapitalPeaceSettlement(memory, [rome], event).term,
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

test("a port raid pays reduced spoils and cannot repeat before the battery recovers", () => {
  const flags = {};
  const target = city();
  assert.equal(portRaidPrize(target, 60000), 15000);
  assert.equal(portRaidPrize(target, 750), 750);
  markPlayerPortRaided(flags, target, 500);
  assert.equal(playerPortRaidIsActive(flags, target, 499), true);
  assert.equal(playerPortRaidIsActive(flags, target, 500), false);
  markPlayerPortRaided(flags, target, 700);
  clearPlayerPortRaid(flags, target);
  assert.equal(playerPortRaidIsActive(flags, target, 600), false);
});
