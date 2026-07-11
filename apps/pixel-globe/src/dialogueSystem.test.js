import assert from "node:assert/strict";
import test from "node:test";

import {
  createPortDialogueSession,
  createShipDialogueSession,
  portDialogueView,
  selectPortDialogueOption,
  selectShipDialogueOption,
  shipDialogueView
} from "./dialogueSystem.js";
import { createWorldEconomy } from "./economy.js";
import { createGameState } from "./gameState.js";

test("hailing an NPC ship opens a minimal captain dialogue", () => {
  const ship = { id: "mediterranean-4", label: "Xebec" };
  const session = createShipDialogueSession(ship);
  const view = shipDialogueView(session, ship);

  assert.equal(session.kind, "ship");
  assert.equal(view.speaker, "Xebec captain");
  assert.equal(view.text, "Ahoy matey. Running in ballast.");
  assert.deepEqual(view.options.map((option) => option.label), ["Leave"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), { closed: true });
});

test("merchant captains report their destination and visible cargo", () => {
  const ship = {
    id: "indian-ocean-7",
    label: "Dhow",
    destinationName: "Hormuz",
    cargo: { pepper: 18, cotton: 9 }
  };
  const view = shipDialogueView(createShipDialogueSession(ship), ship);
  assert.equal(view.text, "Ahoy matey. Bound for Hormuz. We carry Pepper x18 and Cotton x9.");
});

test("ship dialogue rejects a different NPC ship", () => {
  const session = createShipDialogueSession({ id: "ship-a" });
  assert.throws(
    () => shipDialogueView(session, { id: "ship-b", label: "Caravel" }),
    /does not match/
  );
});

test("port dialogue exposes live market specie, stock, and prices", () => {
  const city = {
    tileId: 1,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city);

  const root = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(root.text, /Market specie: \d+ db/);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0);
  const market = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(market.options.some((option) => /\d+ db  x\d+/.test(option.label)));
});
