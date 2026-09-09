import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import * as colony from "./colonizationQuest.js";
import { colonizationTargetForCity } from "./colonialCities.js";

const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const start = source.indexOf("function bindColonizationQuestSelection(");
const end = source.indexOf("function ensureColonizationOrganizer(", start);
assert.ok(start >= 0 && end > start);
const origin = { cityId: "exeter|united kingdom", city: "Exeter", country: "United Kingdom",
  factionId: "england", tileId: 10, lat: 50.72, lon: -3.53 };
const replacement = { ...origin, cityId: "london|united kingdom", city: "London", tileId: 11 };
const target = { ...colonizationTargetForCity({ cityId: "roanoke|united states of america" }), tileId: 123 };

function bind({ departed = true, archived = false, missing = false } = {}) {
  const memory = colony.createColonizationQuestMemory();
  colony.assignColonizationQuest(memory, { target, origin });
  for (const stage of colony.colonizationQuestView({ memory: { colonization: memory, quests: { cargoDeliveries: {} } }, cargo: {} }).history.fetchStages) colony.completeColonizationFetchStage(memory, stage.id);
  if (departed) colony.beginColonizationExpedition(memory);
  const state = { memory: { colonization: archived ? colony.createColonizationQuestMemory() : memory,
    quests: { cargoDeliveries: {} } }, cargo: {} };
  const context = vm.createContext({ ...colony, state, memory, weatherClockMinutes: 0,
    portCities: [replacement], colonizationTargetPlacements: [target],
    cityById: new Map((missing ? [replacement] : [origin, replacement]).map(city => [city.cityId, city])) });
  return vm.runInContext(`${source.slice(start, end)}\nbindColonizationQuestSelection(state, memory)`, context);
}

test("departed and archived colonies retain an origin whose harbor is now closed", () => {
  assert.equal(bind().origin.cityId, origin.cityId);
  assert.equal(bind({ archived: true }).origin.cityId, origin.cityId);
});
test("pre-departure colonies still relocate to a dockable sponsor", () => {
  assert.equal(bind({ departed: false }).origin.cityId, replacement.cityId);
});
test("unresolved historical colony origins still fail loudly", () => {
  assert.throws(() => bind({ missing: true }), /missing from the city catalog: exeter/);
});
