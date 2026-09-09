import assert from "node:assert/strict";
import { tradeGoodById } from "../../src/economy.js";

export const CHECKLIST_GOALS = Object.freeze([
  "buy-cargo", "sell-cargo", "recruit", "inspect-crew", "equipment", "shipyard",
  "inn", "mission", "politics", "reload", "sail-and-dock", "teleport-and-dock", "destroyed-port"
]);
export function shuffledChecklist(random, selectedGoals = CHECKLIST_GOALS) {
  assert.ok(selectedGoals.length > 0 && new Set(selectedGoals).size === selectedGoals.length &&
    selectedGoals.every(goal => CHECKLIST_GOALS.includes(goal)), "Invalid checklist goals");
  const goals = [...selectedGoals];
  for (let i = goals.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    if (j < 0 || j > i) throw new Error("Invalid checklist random draw");
    [goals[i], goals[j]] = [goals[j], goals[i]];
  }
  return goals;
}

export function checklistTravelDestination(state, previousCityId, excludedCityIds = new Set()) {
  const candidates = state.destinations.filter(port => port.cityId !== (state.cityId || previousCityId) && !excludedCityIds.has(port.cityId));
  const target = candidates.sort((a, b) => a.distancePx - b.distancePx || a.cityId.localeCompare(b.cityId))[0];
  assert.ok(target, "No accessible alternative checklist destination");
  return target.cityId;
}

export function singleDialogueOptionCommand(state) {
  if (!state.nodeId || state.options.length !== 1 || state.options[0].disabled) return null;
  return { type: "choose", id: state.options[0].id };
}

// The planner reads actual offered actions. It never manufactures a dialogue
// action or declares success merely because a menu was requested.
export function checklistMenuCommand(state, goal) {
  const enabled = state.options.filter(option => !option.disabled);
  const choose = predicate => {
    const option = enabled.find(({ action }) => predicate(action));
    return option ? { type: "choose", id: option.id } : null;
  };
  const node = id => choose(action => action.nodeId === id);
  const location = id => state.locations.includes(id) ? { type: "location", id } : null;
  const back = () => choose(action => action.nodeId === "root" || action.type === "leave-market") ||
    choose(action => ["inn-drink", "equipment"].includes(action.nodeId));
  switch (goal) {
    case "provision": return choose(action => action.type === "select-loadout" && action.loadoutId === state.gameState.ship.loadoutId) ||
      node("loadout") || location("port-authority") || location("market") || back();
    case "buy-cargo": return choose(action => action.type === "buy") ||
      choose(action => action.type === "switch-market-mode" && action.mode === "buy") || location("market") || node("market") || back();
    case "sell-cargo":
      // Random order may ask us to sell before buying anything. Acquire a real
      // saleable lot first; provisions are deliberately excluded by the game.
      if (state.gameState && !Object.entries(state.gameState.cargo).some(([id, quantity]) =>
        quantity >= 1 && tradeGoodById(id).sellable !== false)) {
        return choose(action => action.type === "buy" && tradeGoodById(action.goodId).sellable !== false) ||
          choose(action => action.type === "switch-market-mode" && action.mode === "buy") ||
          location("market") || node("market") || back();
      }
      return choose(action => action.type === "sell") ||
      choose(action => action.type === "switch-market-mode" && action.mode === "sell") || location("market") || node("market") || back();
    case "recruit": return choose(action => action.type === "hire-crew-member") ||
      choose(action => action.type === "open-crew-recruitment") || location("inn") || node("inn-drink") || back();
    case "mission": return choose(action => ["complete-quest", "accept-quest"].includes(action.type)) ||
      node("quest") || location("inn") || node("inn-drink") || back();
    case "equipment": return choose(action => action.type === "decline-special-equipment") || location("equipment") || node("equipment") || back();
    case "shipyard": return location("shipyard") || node("shipyard") || back();
    case "inn": return location("inn") || node("inn-drink") || back();
    default: throw new Error(`No menu planner for checklist goal: ${goal}`);
  }
}

export async function runBrowserChecklist({ command, initialState, random, checkpoint, maxActions = 400, goals = CHECKLIST_GOALS }) {
  const order = shuffledChecklist(random, goals);
  const report = { order, completed: [], evidence: [], travel: [], actions: 0, actionCoverage: {},
    limitations: ["Initial naval battle remains a separate fixture", "No autonomous city-assault, colony, whale-hunt or ship-purchase strategy yet"] };
  let state = initialState;
  let destination = "lisbon|portugal";
  let sailed = false;
  const act = async input => {
    assert.ok(report.actions < maxActions, `Checklist exhausted ${maxActions} actions; pending: ${order.filter(goal => !report.completed.includes(goal)).join(", ")}`);
    const type = input.type === "choose" ? state.options.find(option => option.id === input.id)?.action.type : input.type;
    report.actionCoverage[type] = (report.actionCoverage[type] || 0) + 1;
    report.actions++;
    state = await command(input);
    checkpoint(report);
    return state;
  };
  const clearOverlay = async () => {
    const continuation = singleDialogueOptionCommand(state);
    if (continuation) { await act(continuation); return true; }
    if (state.nodeId === "loadout" && !state.options.some(option => option.action.nodeId === "root")) {
      const loadout = state.options.find(option => !option.disabled && option.action.type === "select-loadout" && option.action.loadoutId === "short-haul");
      assert.ok(loadout, "Mandatory departure loadout is unavailable");
      await act({ type: "choose", id: loadout.id }); return true;
    }
    if (state.nodeId === "crew-dismissal") {
      const option = state.options.find(option => !option.disabled && option.action.type === "confirm-crew-dismissal") ||
        state.options.find(option => !option.disabled && option.action.type === "dismiss-crew-member");
      assert.ok(option, "Loadout cannot finish its crew adjustment");
      await act({ type: "choose", id: option.id }); return true;
    }
    if (state.modal) { await act({ type: "continue" }); return true; }
    if (state.menu) { await act({ type: "close-menu" }); return true; }
    return false;
  };
  const leave = async () => {
    let provisioning = false;
    let provisioned = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (await clearOverlay()) continue;
      if (!state.nodeId && !state.options.length) return;
      if (!provisioned && (provisioning || state.locations.includes("market") && checklistNeedsProvisions(state.gameState))) {
        provisioning = true;
        const input = checklistMenuCommand(state, "provision");
        assert.ok(input, `No offered provision action at ${state.nodeId}`);
        const action = state.options.find(option => option.id === input.id)?.action;
        await act(input);
        if (action?.type === "select-loadout") {
          provisioned = true;
          assert.ok(state.gameState.ship.crew > 0 && Object.entries(state.gameState.cargo).some(([id, amount]) =>
            amount > 0 && tradeGoodById(id).category === "food"), "Pilot could not obtain crew and provisions before departure");
        }
        continue;
      }
      if (state.locations.includes("set-sail")) { await act({ type: "location", id: "set-sail" }); continue; }
      const option = state.options.find(option => !option.disabled &&
        (option.action.type === "close" || option.action.nodeId === "root" || option.action.type === "leave-market"));
      assert.ok(option, `No ordinary exit from ${state.nodeId}`);
      await act({ type: "choose", id: option.id });
    }
    throw new Error("Checklist could not leave port");
  };
  const arrive = async (cityId, teleport) => {
    await leave();
    const startMinute = state.minute;
    if (teleport) await act({ type: "teleport", cityId });
    let sailingCommands = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (await clearOverlay()) continue;
      if (state.cityId === cityId && state.nodeId) {
        report.travel.push({ cityId, teleport, sailingCommands, minutes: state.minute - startMinute });
        destination = cityId;
        return;
      }
      if (state.options.length || state.nodeId) {
        const option = state.options.find(option => !option.disabled && ["continue-campaign", "close"].includes(option.action.type));
        assert.ok(option, `Travel interrupted by ${state.nodeId}; explicit planner required`);
        await act({ type: "choose", id: option.id });
      } else if (state.ports.some(port => port.cityId === cityId && port.inRange)) {
        await act({ type: "dock", cityId });
      } else {
        await act({ type: "sail", cityId }); sailingCommands++;
      }
    }
    throw new Error(`Checklist did not dock at ${cityId}`);
  };
  for (const goal of order) {
    console.log(`Checklist objective: ${goal}`);
    while (await clearOverlay()) {}
    const before = state;
    const evidence = { goal, startAction: report.actions, startMinute: state.minute };
    if (goal === "destroyed-port") {
      const returnCityId = state.cityId || destination;
      await leave();
      const cityId = "chillicothe|united states of america";
      await act({ type: "damage-port", cityId });
      evidence.visits = [];
      for (let visit = 0; visit < 2; visit++) {
        await act({ type: "teleport", cityId });
        let arrived = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          // Inspect before the ordinary one-option fallback leaves the closed port.
          if (state.cityId === cityId && state.nodeId === "recovering") { arrived = true; break; }
          if (await clearOverlay()) continue;
          assert.ok(!state.nodeId, `Destroyed-port approach interrupted by ${state.nodeId}`);
          if (state.ports.some(port => port.cityId === cityId && port.inRange)) await act({ type: "dock", cityId });
          else await act({ type: "sail", cityId });
        }
        assert.ok(arrived, "Did not enter the destroyed port's recovery dialogue");
        assert.equal(state.scene?.cityId, cityId, "Recovery dialogue has no rendered city scene");
        assert.deepEqual(state.scene.destinationIds, [], "Unadmitted recovery scene exposed interactive services");
        const departure = singleDialogueOptionCommand(state);
        assert.ok(departure, "Recovery dialogue has no sole enabled departure");
        evidence.visits.push({ cityId, nodeId: state.nodeId, scene: state.scene });
        await act(departure);
        await leave();
        await act({ type: "save" }); await act({ type: "reload" });
      }
      await act({ type: "capture-damaged-port", cityId });
      assert.equal(state.scene?.cityId, cityId, "Post-capture arrival lost its city scene");
      assert.deepEqual(state.scene.destinationIds, ["set-sail"], "Captured burning port exposed services or lost its exit");
      evidence.postCaptureScene = state.scene;
      // Keep later randomly ordered service objectives out of this closed port.
      await arrive(returnCityId, true);
    } else if (goal === "reload") {
      await act({ type: "save" }); await act({ type: "reload" });
    } else if (goal === "inspect-crew" || goal === "politics") {
      await act({ type: goal });
      if (goal === "politics") assert.ok(state.menu, "Politics objective did not open its menu");
      if (state.menu) await act({ type: "close-menu" });
    } else if (goal === "sail-and-dock") {
      // Mandatory real first leg from the battle location, or a nearby next
      // port if another objective has already sailed that leg.
      if (!sailed && !state.cityId) { await arrive(destination, false); sailed = true; }
      else {
        await arrive(checklistTravelDestination(state, destination), false); sailed = true;
      }
      assert.ok(report.travel.at(-1).sailingCommands > 0, "Real sailing goal did not sail");
    } else if (goal === "teleport-and-dock") {
      await arrive(checklistTravelDestination(state, destination), true);
    } else {
      if (!state.cityId) { await arrive(destination, false); sailed = true; }
      let done = false;
      const recruitmentPorts = new Set();
      for (let attempt = 0; attempt < 65; attempt++) {
        // An empty muster is ordinary game state. Check before the sole-option
        // continuation leaves it, otherwise the planner reopens it forever.
        if (goal === "recruit" && state.nodeId === "crew-recruitment" &&
            !state.options.some(option => !option.disabled && option.action.type === "hire-crew-member")) {
          recruitmentPorts.add(state.cityId);
          assert.ok(recruitmentPorts.size < 8, "No hireable crew after inspecting eight ports");
          await arrive(checklistTravelDestination(state, destination, recruitmentPorts), true);
          continue;
        }
        if (await clearOverlay()) continue;
        if (goal === "mission" && state.gameState.memory.quests.active &&
            state.gameState.memory.quests.active.destinationCityId !== state.cityId) {
          const cityId = state.gameState.memory.quests.active.destinationCityId;
          assert.ok(cityId, "Mission needs a supported destination");
          await arrive(cityId, random() < 0.5);
        }
        if (["equipment", "shipyard"].includes(goal) && state.nodeId === goal ||
            goal === "inn" && state.nodeId === "inn-drink") { done = true; break; }
        const input = checklistMenuCommand(state, goal);
        assert.ok(input, `No enabled plan for ${goal} at ${state.nodeId}`);
        const option = state.options.find(option => option.id === input.id);
        const previous = state;
        await act(input);
        const type = option?.action.type;
        if ((goal === "buy-cargo" && type === "buy") || (goal === "sell-cargo" && type === "sell")) {
          assert.notDeepEqual(state.gameState.cargo, previous.gameState.cargo); done = true;
        }
        if (goal === "recruit" && type === "hire-crew-member") {
          assert.equal(state.gameState.crewRoster.length, previous.gameState.crewRoster.length + 1); done = true;
        }
        if (goal === "mission" && type === "complete-quest") {
          assert.ok(state.gameState.memory.quests.completed[previous.gameState.memory.quests.active.id]); done = true;
        }
        if (done) { evidence.actionType = type; break; }
      }
      assert.ok(done, `Checklist failed to complete ${goal}`);
    }
    evidence.endAction = report.actions; evidence.endMinute = state.minute;
    evidence.voyageSeed = state.gameState.voyageSeed;
    assert.equal(state.gameState.voyageSeed, before.gameState.voyageSeed, "Checklist replaced the voyage");
    report.completed.push(goal); report.evidence.push(evidence); checkpoint(report);
    // Cross every activity with real persistence; later objectives inherit it.
    await act({ type: "save" }); await act({ type: "reload" });
  }
  assert.equal(new Set(report.completed).size, goals.length);
  if (goals.includes("teleport-and-dock")) assert.ok(report.travel.some(leg => leg.teleport));
  if (goals.includes("sail-and-dock")) assert.ok(report.travel.some(leg => !leg.teleport && leg.sailingCommands > 0));
  return report;
}

export function checklistNeedsProvisions(state) {
  const food = Object.entries(state.cargo).reduce((total, [id, amount]) =>
    total + (tradeGoodById(id).category === "food" ? amount : 0), 0);
  return state.ship.crew < 1 || food < Math.max(1, state.ship.loadoutTargets.foodUnits / 2);
}
