import assert from "node:assert/strict";
import test from "node:test";

import {
  reconcileSavedDiscoveryReferences,
  validateDiscoveryCatalog,
  validateSavedDiscoveryReferences
} from "./discoveryCatalogReferences.js";

const CATALOG = Object.freeze([
  Object.freeze({
    id: "mountain-mont-blanc",
    kind: "mountain",
    displayName: "Mont Blanc",
    detail: "4,808 m"
  }),
  Object.freeze({
    id: "landmark-great-pyramid",
    kind: "landmark",
    displayName: "The Great Pyramid",
    detail: "Giza"
  })
]);

test("tile-derived mountain ids reconcile across every persisted discovery reference", () => {
  const legacyMountainId = "mountain-161118-mont-blanc";
  const state = savedState({
    discoveries: {
      [legacyMountainId]: {
        id: legacyMountainId,
        kind: "mountain",
        displayName: "Mont Blanc",
        detail: "4,808 m",
        portArrivalDialogue: "We shall bring the account ashore."
      }
    },
    discoveryOrder: [legacyMountainId],
    pendingDiscoveryPortDialogueIds: [legacyMountainId],
    campaignGoal: {
      type: "explorer",
      reportedDiscoveryIds: [legacyMountainId],
      currentLeadDiscoveryId: legacyMountainId
    }
  });

  assert.equal(reconcileSavedDiscoveryReferences(state, CATALOG), 5);
  assert.deepEqual(state.memory.discoveryOrder, ["mountain-mont-blanc"]);
  assert.deepEqual(state.memory.pendingDiscoveryPortDialogueIds, ["mountain-mont-blanc"]);
  assert.deepEqual(state.memory.campaignGoal.reportedDiscoveryIds, ["mountain-mont-blanc"]);
  assert.equal(state.memory.campaignGoal.currentLeadDiscoveryId, "mountain-mont-blanc");
  assert.equal(state.memory.discoveries["mountain-mont-blanc"].id, "mountain-mont-blanc");
  assert.equal(
    state.memory.discoveries["mountain-mont-blanc"].portArrivalDialogue,
    "We shall bring the account ashore."
  );
});

test("restore validation covers every saved discovery reference surface", () => {
  const valid = () => savedState({
    discoveries: {
      "mountain-mont-blanc": {
        ...CATALOG[0],
        portArrivalDialogue: "We shall bring the account ashore."
      }
    },
    discoveryOrder: ["mountain-mont-blanc"],
    pendingDiscoveryPortDialogueIds: ["mountain-mont-blanc"],
    campaignGoal: {
      type: "explorer",
      reportedDiscoveryIds: ["mountain-mont-blanc"],
      currentLeadDiscoveryId: "landmark-great-pyramid"
    }
  });
  assert.doesNotThrow(() => validateSavedDiscoveryReferences(valid(), CATALOG));

  const mutations = [
    (state) => { state.memory.discoveryOrder[0] = "mountain-missing"; },
    (state) => { state.memory.discoveries["mountain-mont-blanc"].id = "mountain-missing"; },
    (state) => { state.memory.pendingDiscoveryPortDialogueIds[0] = "mountain-missing"; },
    (state) => { state.memory.campaignGoal.reportedDiscoveryIds[0] = "mountain-missing"; },
    (state) => { state.memory.campaignGoal.currentLeadDiscoveryId = "mountain-missing"; }
  ];
  for (const mutate of mutations) {
    const state = valid();
    mutate(state);
    assert.throws(() => validateSavedDiscoveryReferences(state, CATALOG));
  }
});

test("discovery catalogs reject identities that cannot be reconciled unambiguously", () => {
  assert.throws(
    () => validateDiscoveryCatalog([...CATALOG, { ...CATALOG[0], id: "mountain-other-id" }]),
    /duplicate identity/
  );
  const state = savedState({
    discoveries: {
      "mountain-999999-unknown-peak": {
        id: "mountain-999999-unknown-peak",
        kind: "mountain",
        displayName: "Unknown Peak",
        detail: ""
      }
    },
    discoveryOrder: ["mountain-999999-unknown-peak"],
    pendingDiscoveryPortDialogueIds: [],
    campaignGoal: null
  });
  assert.throws(
    () => reconcileSavedDiscoveryReferences(state, CATALOG),
    /missing from the runtime catalog/
  );
});

function savedState({ discoveries, discoveryOrder, pendingDiscoveryPortDialogueIds, campaignGoal }) {
  return {
    memory: {
      discoveries,
      discoveryOrder,
      pendingDiscoveryPortDialogueIds,
      campaignGoal
    }
  };
}
