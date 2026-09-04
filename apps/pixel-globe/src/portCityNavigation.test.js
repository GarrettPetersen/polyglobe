import assert from "node:assert/strict";
import test from "node:test";

import {
  PORT_CITY_LOCATION,
  portCityNavigationModel
} from "./portCityNavigation.js";
import { dialogueBackOptionIndex } from "./dialogueSystem.js";
import { portCityServiceProfile } from "./portCityServices.js";

const ROOT_VIEW = Object.freeze({
  text: "What business brings you to port?",
  feedback: null,
  options: Object.freeze([
    option("Market", { type: "node", nodeId: "market" }),
    option("Equipment", { type: "node", nodeId: "equipment" }),
    option("Ship loadout", { type: "node", nodeId: "loadout" }),
    option("Visit shipyard", { type: "node", nodeId: "shipyard" }),
    option("Ask about work", { type: "node", nodeId: "quest" }),
    option("Ask about the garrison", { type: "node", nodeId: "garrison" }),
    option("Letter of marque", { type: "node", nodeId: "marque" }),
    option("Attack city", { type: "node", nodeId: "city-attack" }),
    option("Cargo ledger", { type: "node", nodeId: "cargo" }),
    option("Wait safely in port", { type: "wait-in-port" }),
    option("Leave port", { type: "close" })
  ])
});

test("port city navigation classifies every root action without using labels", () => {
  const model = portCityNavigationModel(ROOT_VIEW, serviceProfile(true));
  assert.deepEqual(model.locations.map(({ id }) => id), [
    PORT_CITY_LOCATION.SET_SAIL,
    PORT_CITY_LOCATION.SHIP,
    PORT_CITY_LOCATION.MARKET,
    PORT_CITY_LOCATION.INN,
    PORT_CITY_LOCATION.EQUIPMENT,
    PORT_CITY_LOCATION.SHIPYARD,
    PORT_CITY_LOCATION.AUTHORITY
  ]);
  assert.deepEqual(
    model.locations.find(({ id }) => id === PORT_CITY_LOCATION.SHIP).actions.map(({ label }) => label),
    ["Ship loadout", "Attack city", "Cargo ledger", "Wait safely in port"]
  );
  assert.deepEqual(
    model.locations.find(({ id }) => id === PORT_CITY_LOCATION.SET_SAIL).actions.map(({ label }) => label),
    ["Leave port"]
  );
});

test("city attacks live aboard the player's ship instead of requiring a fortification", () => {
  const model = portCityNavigationModel(ROOT_VIEW, serviceProfile(true));
  const ship = model.locations.find(({ id }) => id === PORT_CITY_LOCATION.SHIP);
  const authority = model.locations.find(({ id }) => id === PORT_CITY_LOCATION.AUTHORITY);

  assert.ok(ship.actions.some(({ action }) => action.nodeId === "city-attack"));
  assert.equal(authority.actions.some(({ action }) => action.nodeId === "city-attack"), false);
  assert.ok(authority.actions.some(({ action }) => action.nodeId === "garrison"));
});

test("a covert port-authority warning remains attached to the authority destination", () => {
  const model = portCityNavigationModel({
    text: "Keep your disguise intact.",
    options: [option("Port authority", { type: "node", nodeId: "covert-authority" })]
  }, serviceProfile(true));
  assert.deepEqual(model.locations.map(({ id }) => id), [PORT_CITY_LOCATION.AUTHORITY]);
});

test("villages without a smith cannot expose equipment upgrades", () => {
  const services = portCityServiceProfile({ settlementType: "village", population: 3000 });
  const model = portCityNavigationModel(ROOT_VIEW, services);
  assert.equal(model.locations.some(({ id }) => id === PORT_CITY_LOCATION.EQUIPMENT), false);
  assert.equal(model.locations.some(({ id }) => id === PORT_CITY_LOCATION.SHIPYARD), true);
});

test("unmapped root actions fail instead of silently disappearing", () => {
  assert.throws(
    () => portCityNavigationModel({ text: "", options: [option("Mystery", { type: "mystery" })] }, serviceProfile(true)),
    /Unmapped port root action type/
  );
});

test("Back to city is the Escape target for city submenus", () => {
  const view = {
    options: [
      { label: "Inspect", action: { type: "node", nodeId: "cargo" } },
      { label: "Back to city", action: { type: "node", nodeId: "root" } }
    ]
  };
  assert.equal(dialogueBackOptionIndex(view), 1);
});

function option(label, action) {
  return Object.freeze({ label, action });
}

function serviceProfile(smith) {
  return Object.freeze({ inn: true, smith, market: true, shipyard: true });
}
