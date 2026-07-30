import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  EQUIPMENT_FACTOR_KIND_FISHING_NET,
  EQUIPMENT_FACTOR_PITCH_COOLDOWN_MINUTES,
  prepareEquipmentFactorPitch
} from "./equipmentFactorOffers.js";
import { PERK_ITEMS } from "./perkItems.js";
import { createSpecialEquipmentOfferMemory } from "./specialEquipmentOffers.js";

const CITY = Object.freeze({
  tileId: 17,
  portId: "lubeck",
  city: "Lubeck",
  country: "Hanseatic League",
  cityType: "northern-european",
  factionId: "hanseatic",
  population: 40000
});

function pitchInputs(overrides = {}) {
  const inventory = {
    fishingNetId: "weighted-cast-net",
    cannonEquipmentId: "standard-ordnance",
    whaleHarpoonId: "masterwork-harpoon",
    items: Object.fromEntries(PERK_ITEMS.map((item) => [item.id, 1]))
  };
  return {
    memory: {
      decisions: {},
      specialEquipmentOffers: createSpecialEquipmentOfferMemory()
    },
    economy: createWorldEconomy({ ports: [CITY], startMinute: 0 }),
    city: CITY,
    simMinute: 100,
    doubloons: 5000,
    voyageSeed: "factor-pitch-test",
    ship: { cannonCapacity: 0 },
    inventory,
    ...overrides
  };
}

test("the factor pitches the strongest affordable stocked upgrade", () => {
  const pitch = prepareEquipmentFactorPitch(pitchInputs());

  assert.equal(pitch.kind, EQUIPMENT_FACTOR_KIND_FISHING_NET);
  assert.equal(pitch.itemId, "drift-net");
  assert.equal(pitch.price, 4000);
  assert.match(pitch.salesPitch, /pay for itself/i);
});

test("a declined item is not pitched again at the same port for one month", () => {
  const inputs = pitchInputs();
  const first = prepareEquipmentFactorPitch(inputs);
  const duringCooldown = prepareEquipmentFactorPitch({
    ...inputs,
    simMinute: inputs.simMinute + EQUIPMENT_FACTOR_PITCH_COOLDOWN_MINUTES - 1
  });
  const afterCooldown = prepareEquipmentFactorPitch({
    ...inputs,
    simMinute: inputs.simMinute + EQUIPMENT_FACTOR_PITCH_COOLDOWN_MINUTES
  });

  assert.equal(first.itemId, "drift-net");
  assert.equal(duringCooldown, null);
  assert.equal(afterCooldown.itemId, "drift-net");
});

test("the factor stays quiet when no affordable improvement exists", () => {
  const inputs = pitchInputs({
    doubloons: 899,
    inventory: {
      ...pitchInputs().inventory,
      fishingNetId: "basic-cast-net"
    }
  });

  assert.equal(prepareEquipmentFactorPitch(inputs), null);
});
