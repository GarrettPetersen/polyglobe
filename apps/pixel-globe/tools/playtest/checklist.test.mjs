import assert from "node:assert/strict";
import test from "node:test";
import { arrivalOfferCommand, CHECKLIST_GOALS, checklistNeedsProvisions, checklistTravelDestination, shuffledChecklist, checklistMenuCommand, singleDialogueOptionCommand, runBrowserChecklist } from "./checklist.mjs";
import { randomForSeed } from "./journey.mjs";

test("every seeded checklist includes every objective once, in reproducible varied orders", () => {
  const orders = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const order = shuffledChecklist(randomForSeed(seed));
    assert.deepEqual([...order].sort(), [...CHECKLIST_GOALS].sort());
    assert.deepEqual(order, shuffledChecklist(randomForSeed(seed)));
    orders.add(order.join());
  }
  assert.equal(orders.size, 30);
});

test("planner chooses offered enabled actions and routes around disabled purchases", () => {
  const state = { locations: [], options: [
    { id: "disabled", disabled: true, action: { type: "buy" } },
    { id: "buy", disabled: false, action: { type: "buy", goodId: "rice" } }
  ] };
  assert.deepEqual(checklistMenuCommand(state, "buy-cargo"), { type: "choose", id: "buy" });
  state.options[1].disabled = true;
  assert.equal(checklistMenuCommand(state, "buy-cargo"), null);
  state.options.push({ id: "root", disabled: false, action: { type: "node", nodeId: "root" } });
  assert.deepEqual(checklistMenuCommand(state, "buy-cargo"), { type: "choose", id: "root" });
});

test("mission planning follows a colony arrival continuation into the port", () => {
  const state = { locations: [], options: [
    { id: "greeting", disabled: false, action: { type: "node", nodeId: "greeting" } },
    { id: "deliver", disabled: true, action: { type: "deliver-colonization-material" } }
  ] };

  assert.deepEqual(checklistMenuCommand(state, "mission"), { type: "choose", id: "greeting" });
});

test("sale plan selects the actual market mode and refuses unknown goals", () => {
  const state = { locations: [], options: [{ id: "sell-mode", action: { type: "switch-market-mode", mode: "sell" } }] };
  assert.deepEqual(checklistMenuCommand(state, "sell-cargo"), { type: "choose", id: "sell-mode" });
  assert.throws(() => checklistMenuCommand(state, "invented-goal"), /No menu planner/);
});


test("single-option dialogue continuation uses the offered action and never chooses disabled or ambiguous options", () => {
  const state = { nodeId: "acknowledgement", options: [{ id: "continue", action: { type: "close" } }] };
  assert.deepEqual(singleDialogueOptionCommand(state), { type: "choose", id: "continue" });
  assert.equal(singleDialogueOptionCommand({ ...state, nodeId: null }), null);
  assert.equal(singleDialogueOptionCommand({ ...state, options: [] }), null);
  assert.equal(singleDialogueOptionCommand({ ...state, options: [{ ...state.options[0], disabled: true }] }), null);
  assert.equal(singleDialogueOptionCommand({ ...state, options: [...state.options, { id: "buy", disabled: true }] }), null);
});

test("selling before buying first acquires a saleable lot through the market", () => {
  const state = { gameState: { cargo: { hardtack: 25 } }, locations: [], options: [
    { id: "buy", action: { type: "switch-market-mode", mode: "buy" } },
    { id: "sell", action: { type: "switch-market-mode", mode: "sell" } }
  ] };
  assert.deepEqual(checklistMenuCommand(state, "sell-cargo"), { type: "choose", id: "buy" });
  state.options.push({ id: "rice", action: { type: "buy", goodId: "rice" } });
  assert.deepEqual(checklistMenuCommand(state, "sell-cargo"), { type: "choose", id: "rice" });
  state.gameState.cargo.rice = 1;
  assert.deepEqual(checklistMenuCommand(state, "sell-cargo"), { type: "choose", id: "sell" });
});


test("automatic acknowledgements are traced and a stuck single-option dialogue fails its budget", async () => {
  const state = { nodeId: "acknowledgement", options: [{ id: "continue", action: { type: "close" } }] };
  const clicks = [];
  let report;
  await assert.rejects(runBrowserChecklist({
    initialState: state, random: randomForSeed(1), maxActions: 3,
    command: async input => { clicks.push(input); return state; },
    checkpoint: value => { report = value; }
  }), /Checklist exhausted 3 actions/);
  assert.deepEqual(clicks, Array.from({ length: 3 }, () => ({ type: "choose", id: "continue" })));
  assert.equal(report.actionCoverage.close, 3);
  assert.deepEqual(report.completed, []);
});

test("destroyed-port objective requires rendered recovery and revisits after persistence", async () => {
  async function exercise(destinationIds) {
    let state = { gameState: { voyageSeed: "same-voyage" }, minute: 1, options: [], locations: [], ports: [] };
    const commands = [];
    const command = async input => {
      commands.push(input.type);
      if (input.type === "teleport") state = { ...state, cityId: null, nodeId: null,
        ports: [{ cityId: input.cityId, inRange: true }] };
      if (input.type === "dock") state = { ...state, cityId: input.cityId, nodeId: "recovering",
        scene: { cityId: input.cityId, destinationIds: [] },
        options: [{ id: "leave", action: { type: "close" }, disabled: false }] };
      if (input.type === "capture-damaged-port") state = { ...state, cityId: input.cityId, nodeId: "root",
        scene: { cityId: input.cityId, destinationIds }, options: [{ id: "leave", action: { type: "close" } }] };
      if (input.type === "dock" && input.cityId !== "chillicothe|united states of america") {
        state = { ...state, cityId: input.cityId, nodeId: "root", options: [] };
      }
      if (input.type === "choose") state = { ...state, cityId: null, nodeId: null, scene: null, options: [] };
      return state;
    };
    const report = await runBrowserChecklist({ command, initialState: state, random: randomForSeed(1),
      checkpoint() {}, goals: ["destroyed-port"] });
    assert.deepEqual(report.completed, ["destroyed-port"]);
    assert.equal(report.evidence[0].visits.length, 2);
    assert.equal(commands.filter(type => type === "dock").length, 3);
    assert.equal(commands.filter(type => type === "reload").length, 3);
    assert.ok(commands.indexOf("reload") < commands.lastIndexOf("dock"));
  }
  await exercise(["set-sail"]);
  await assert.rejects(exercise([]), /exposed services or lost its exit/);
  await assert.rejects(exercise(["market", "set-sail"]), /exposed services or lost its exit/);
});


test("travel goals select current canonical destinations instead of inventing port IDs", () => {
  const destinations = [
    { cityId: "lisbon|portugal", distancePx: 0 },
    { cityId: "oporto|portugal", distancePx: 10 },
    { cityId: "cadiz|spain", distancePx: 20 }
  ];
  assert.equal(checklistTravelDestination({ cityId: "lisbon|portugal", destinations }), "oporto|portugal");
  assert.equal(checklistTravelDestination({ cityId: null, destinations }, "lisbon|portugal"), "oporto|portugal");
  assert.equal(checklistTravelDestination({ cityId: "lisbon|portugal", destinations: destinations.filter(p => p.cityId !== "oporto|portugal") }), "cadiz|spain");
  assert.throws(() => checklistTravelDestination({ cityId: "lisbon|portugal", destinations: destinations.slice(0, 1) }), /No accessible alternative/);
  assert.deepEqual(destinations.map(p => p.cityId), ["lisbon|portugal", "oporto|portugal", "cadiz|spain"]);
});

test("departure maintenance requests real loadout service before stores or crew are exhausted", () => {
  const gameState = { ship: { crew: 4, loadoutId: "short-haul", loadoutTargets: { foodUnits: 20 } }, cargo: { hardtack: 20 } };
  assert.equal(checklistNeedsProvisions(gameState), false);
  gameState.cargo.hardtack = 3;
  assert.equal(checklistNeedsProvisions(gameState), true);
  const state = { gameState, locations: [], options: [{ id: "refill", action: { type: "select-loadout", loadoutId: "short-haul" } }] };
  assert.deepEqual(checklistMenuCommand(state, "provision"), { type: "choose", id: "refill" });
  gameState.cargo.hardtack = 20; gameState.ship.crew = 0;
  assert.equal(checklistNeedsProvisions(gameState), true);
});

test("recruitment leaves an empty muster and hires at another port in the same voyage", async () => {
  const destinations = [{ cityId: "coimbra|portugal", distancePx: 0 }, { cityId: "lisbon|portugal", distancePx: 10 }];
  let state = { cityId: destinations[0].cityId, nodeId: "root", locations: ["inn", "set-sail"], options: [],
    gameState: { voyageSeed: "persistent", ship: { crew: 1, crewCapacity: 4 }, crewRoster: [{ id: "original" }] },
    destinations, ports: [], minute: 1 };
  const trace = [];
  const command = async input => {
    trace.push(input);
    if (input.type === "location" && input.id === "inn") state = { ...state, nodeId: "crew-recruitment", locations: [], options: [
      ...(state.cityId === "lisbon|portugal" ? [{ id: "hire", action: { type: "hire-crew-member", memberId: "new" } }] : []),
      { id: "exit", action: { type: "node", nodeId: "inn-drink" } }
    ] };
    if (input.type === "choose" && input.id === "exit") state = { ...state, nodeId: "inn-drink", locations: [], options: [
      { id: "back-to-city", action: { type: "node", nodeId: "root" } }
    ] };
    if (input.type === "choose" && input.id === "back-to-city") {
      state = { ...state, nodeId: "root", locations: ["inn", "set-sail"], options: [] };
    }
    if (input.type === "location" && input.id === "set-sail") state = { ...state, cityId: null, nodeId: null, locations: [], options: [] };
    if (input.type === "teleport") state = { ...state, ports: [{ cityId: input.cityId, inRange: true }] };
    if (input.type === "dock") state = { ...state, cityId: input.cityId, nodeId: "root", locations: ["inn", "set-sail"], options: [] };
    if (input.type === "choose" && input.id === "hire") state = { ...state, gameState: { ...state.gameState,
      ship: { ...state.gameState.ship, crew: 2 }, crewRoster: [...state.gameState.crewRoster, { id: "new" }] } };
    return state;
  };
  const report = await runBrowserChecklist({ command, initialState: state, random: randomForSeed(13), checkpoint() {}, goals: ["recruit"] });
  assert.deepEqual(report.completed, ["recruit"]);
  assert.equal(report.actionCoverage["hire-crew-member"], 1);
  assert.equal(trace.filter(input => input.type === "location" && input.id === "inn").length, 2);
  assert.equal(state.gameState.voyageSeed, "persistent");
  assert.throws(() => checklistTravelDestination(state, null, new Set(destinations.map(port => port.cityId))), /No accessible alternative/);
});


test("teleport then reload cannot satisfy the real sailing goal by redocking", async () => {
  const destinations = [{ cityId: "lisbon|portugal", distancePx: 20 },
    { cityId: "coimbra|portugal", distancePx: 10 }, { cityId: "oporto|portugal", distancePx: 30 }];
  let state = { cityId: null, nodeId: null, locations: [], options: [], minute: 1,
    gameState: { voyageSeed: "same-voyage" }, destinations, ports: [] };
  const trace = [];
  const command = async input => {
    trace.push(input);
    if (["teleport", "sail"].includes(input.type)) state = { ...state,
      ports: [{ cityId: input.cityId, inRange: true }], minute: state.minute + (input.type === "sail" ? 1 : 0) };
    if (input.type === "dock") state = { ...state, cityId: input.cityId, nodeId: "root", locations: ["set-sail"] };
    if (input.type === "reload" || input.type === "location") state = { ...state, cityId: null, nodeId: null, locations: [] };
    return state;
  };
  const report = await runBrowserChecklist({ command, initialState: state, random: () => 0.99,
    checkpoint() {}, goals: ["teleport-and-dock", "sail-and-dock"] });
  assert.equal(report.travel[0].cityId, "coimbra|portugal");
  assert.equal(report.travel[0].sailingCommands, 0);
  assert.notEqual(report.travel[1].cityId, "coimbra|portugal");
  assert.equal(report.travel[1].sailingCommands, 1);
  assert.equal(trace.filter(input => input.type === "sail").length, 1);
});


test("arrival equipment pitches have an explicit enabled decline independent of the current objective", async () => {
  const state = { nodeId: "equipment-factor-offer", locations: [], options: [
    { id: "buy", disabled: false, action: { type: "buy-equipment-factor-pitch" } },
    { id: "decline", disabled: false, action: { type: "decline-equipment-factor-pitch" } }
  ] };
  assert.deepEqual(arrivalOfferCommand(state), { type: "choose", id: "decline" });
  assert.equal(arrivalOfferCommand({ ...state, nodeId: "other" }), null);
  assert.equal(arrivalOfferCommand({ ...state, options: [state.options[0]] }), null);
  assert.equal(arrivalOfferCommand({ ...state, options: [state.options[0], { ...state.options[1], disabled: true }] }), null);
  const clicks = [];
  await assert.rejects(runBrowserChecklist({ initialState: state, random: randomForSeed(17),
    goals: ["recruit"], maxActions: 2, checkpoint() {},
    command: async input => { clicks.push(input); return state; }
  }), /Checklist exhausted 2 actions/);
  assert.deepEqual(clicks, [{ type: "choose", id: "decline" }, { type: "choose", id: "decline" }]);
});
