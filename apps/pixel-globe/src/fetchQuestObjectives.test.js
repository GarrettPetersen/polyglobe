import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceFetchQuestReadiness,
  fetchQuestHasDedicatedNavigationEntry,
  fetchQuestRequirements,
  readyFetchQuestDestinations
} from "./fetchQuestObjectives.js";

const LISBON = Object.freeze({ cityId: "lisbon|portugal", tileId: 10, city: "Lisbon", country: "Portugal" });
const KYOTO = Object.freeze({ cityId: "kyoto|japan", tileId: 20, city: "Kyoto", country: "Japan" });
const NAGASAKI = Object.freeze({ cityId: "nagasaki|japan", tileId: 30, city: "Nagasaki", country: "Japan" });
const HAFNARFJORDUR = Object.freeze({ cityId: "hafnarfjordur|iceland", tileId: 40, city: "Hafnarfjordur", country: "Iceland" });
const HAVANA = Object.freeze({ cityId: "havana|cuba", tileId: 50, city: "Havana", country: "Cuba" });
const CADIZ = Object.freeze({ cityId: "cadiz|spain", tileId: 60, city: "Cadiz", country: "Spain" });

test("colonization fetch cargo points back to the sponsor only when complete", () => {
  const colonization = colonizationView({
    stage: "fetch",
    fetchStage: { id: "quays", goodId: "timber", goodLabel: "Timber", quantity: 8 },
    held: 7
  });
  let requirements = fetchQuestRequirements({ colonization });
  assert.equal(requirements[0].routeReady, false);
  assert.deepEqual(readyFetchQuestDestinations(requirements), []);

  requirements = fetchQuestRequirements({ colonization: { ...colonization, held: 8 } });
  assert.equal(requirements[0].routeReady, true);
  assert.equal(readyFetchQuestDestinations(requirements)[0].destination.city, "Lisbon");
});

test("approval cargo alerts independently but only marks a route when every good is ready", () => {
  const colonization = colonizationView({
    stage: "outbound",
    approval: KYOTO,
    approvalCargoReady: false,
    approvalCargo: [
      { goodId: "matchlocks", goodLabel: "Matchlocks", quantity: 4, held: 4 },
      { goodId: "gunpowder", goodLabel: "Gunpowder", quantity: 3, held: 2 }
    ]
  });
  const requirements = fetchQuestRequirements({ colonization });
  assert.deepEqual(requirements.map((entry) => entry.ready), [true, false]);
  assert.deepEqual(requirements.map((entry) => entry.routeReady), [false, false]);
  assert.deepEqual(readyFetchQuestDestinations(requirements), []);

  const ready = fetchQuestRequirements({
    colonization: {
      ...colonization,
      approvalCargoReady: true,
      approvalCargo: colonization.approvalCargo.map((entry) => ({ ...entry, held: entry.quantity }))
    }
  });
  const destinations = readyFetchQuestDestinations(ready);
  assert.equal(destinations.length, 1);
  assert.deepEqual(destinations[0].requirementIds, [
    "colonization:approval:matchlocks",
    "colonization:approval:gunpowder"
  ]);
});

test("colonization resupply and Viking materials become independent fetch destinations", () => {
  const colonization = colonizationView({
    stage: "awaiting-resupply",
    leftSinceFounding: true,
    resupply: { goodId: "grain", goodLabel: "Grain", quantity: 12 },
    resupplyHeld: 12
  });
  const viking = {
    stage: { id: "wool-sail", goodId: "wool", goodLabel: "Wool", quantity: 8 },
    held: 8
  };
  const destinations = readyFetchQuestDestinations(fetchQuestRequirements({
    colonization,
    viking,
    vikingPort: HAFNARFJORDUR
  }));
  assert.deepEqual(destinations.map((entry) => entry.destination.city), ["Nagasaki", "Hafnarfjordur"]);
});

test("Japanese workshop materials point to Kyoto only when the current request is complete", () => {
  const japaneseMatchlocks = {
    fetchStage: {
      id: "study-portuguese-locks",
      goodId: "matchlocks",
      goodLabel: "Matchlocks",
      quantity: 2
    },
    held: 1
  };
  let requirements = fetchQuestRequirements({
    japaneseMatchlocks,
    japaneseMatchlockPort: KYOTO
  });
  assert.equal(requirements[0].routeReady, false);
  assert.deepEqual(readyFetchQuestDestinations(requirements), []);

  requirements = fetchQuestRequirements({
    japaneseMatchlocks: { ...japaneseMatchlocks, held: 2 },
    japaneseMatchlockPort: KYOTO
  });
  const destination = readyFetchQuestDestinations(requirements)[0];
  assert.equal(destination.questId, "japanese-matchlocks");
  assert.equal(destination.destination.city, "Kyoto");
});

test("ginger roots point back to the selected Caribbean cultivation port", () => {
  const requirements = fetchQuestRequirements({
    caribbeanGinger: {
      fetchStage: {
        id: "plant-ginger",
        goodId: "ginger",
        goodLabel: "Ginger",
        quantity: 6
      },
      held: 6
    },
    caribbeanGingerPort: HAVANA
  });
  const destination = readyFetchQuestDestinations(requirements)[0];
  assert.equal(destination.questId, "caribbean-ginger");
  assert.equal(destination.destination.city, "Havana");
});

test("readiness transitions announce once per threshold crossing", () => {
  const requirement = (held) => fetchQuestRequirements({
    viking: {
      stage: { id: "wool-sail", goodId: "wool", goodLabel: "Wool", quantity: 8 },
      held
    },
    vikingPort: HAFNARFJORDUR
  });
  let state = advanceFetchQuestReadiness(new Map(), requirement(7));
  assert.equal(state.newlyReady.length, 0);
  state = advanceFetchQuestReadiness(state.next, requirement(8));
  assert.equal(state.newlyReady.length, 1);
  state = advanceFetchQuestReadiness(state.next, requirement(9));
  assert.equal(state.newlyReady.length, 0);
  state = advanceFetchQuestReadiness(state.next, requirement(6));
  state = advanceFetchQuestReadiness(state.next, requirement(8));
  assert.equal(state.newlyReady.length, 1);
});

test("shipyard materials announce when the remaining order is all aboard", () => {
  const requirements = (held) => fetchQuestRequirements({
    shipyard: {
      destination: CADIZ,
      materials: [{
        goodId: "timber",
        goodLabel: "Timber",
        quantity: 20,
        delivered: 8,
        held
      }]
    }
  });
  assert.equal(requirements(11)[0].ready, false);
  assert.equal(requirements(12)[0].quantity, 12);
  assert.equal(requirements(12)[0].ready, true);
  assert.equal(readyFetchQuestDestinations(requirements(12))[0].destination.city, "Cadiz");
});

test("quest systems with their own navigation entry are never duplicated by fetch routing", () => {
  assert.equal(fetchQuestHasDedicatedNavigationEntry("colonization"), true);
  assert.equal(fetchQuestHasDedicatedNavigationEntry("conquistador"), true);
  assert.equal(fetchQuestHasDedicatedNavigationEntry("shipyard-investment"), true);
  assert.equal(fetchQuestHasDedicatedNavigationEntry("viking-longship"), false);
  assert.throws(() => fetchQuestHasDedicatedNavigationEntry(""), /requires a quest id/);
});

function colonizationView(overrides) {
  return {
    target: NAGASAKI,
    origin: LISBON,
    approval: null,
    approvalGranted: false,
    approvalCargo: [],
    approvalCargoReady: true,
    fetchStage: null,
    held: 0,
    leftSinceFounding: false,
    resupply: { goodId: "grain", goodLabel: "Grain", quantity: 12 },
    resupplyHeld: 0,
    ...overrides
  };
}
