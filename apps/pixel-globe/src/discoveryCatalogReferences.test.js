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
    legacyIds: Object.freeze(["mountain-161118-mont-blanc"]),
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

test("pre-canonical Mount Olympus saves reconcile to its stable coordinate id", () => {
  const legacyId = "mountain-24808-mount-olympus";
  const canonicalId = "mountain-mount-olympus-n40p08325-e22p35012";
  const catalog = [{
    id: canonicalId,
    legacyIds: ["mountain-98887-mount-olympus", legacyId],
    kind: "mountain",
    displayName: "Mount Olympus",
    detail: "2,917 m"
  }];
  const state = savedState({
    discoveries: {
      [legacyId]: {
        id: legacyId,
        kind: "mountain",
        displayName: "Mount Olympus",
        detail: "2,917 m"
      }
    },
    discoveryOrder: [legacyId],
    pendingDiscoveryPortDialogueIds: [],
    campaignGoal: {
      type: "explorer",
      reportedDiscoveryIds: [legacyId],
      currentLeadDiscoveryId: legacyId
    }
  });

  assert.equal(reconcileSavedDiscoveryReferences(state, catalog), 4);
  assert.deepEqual(state.memory.discoveryOrder, [canonicalId]);
  assert.deepEqual(state.memory.campaignGoal.reportedDiscoveryIds, [canonicalId]);
  assert.equal(state.memory.campaignGoal.currentLeadDiscoveryId, canonicalId);
  assert.equal(state.memory.discoveries[canonicalId].id, canonicalId);
});

test("tile-derived mountain ids survive historical peak-tile changes", () => {
  const storedId = "mountain-161762-mount-etna";
  const canonicalId = "mountain-mount-etna";
  const catalog = [{
    id: canonicalId,
    legacyIds: ["mountain-161763-mount-etna"],
    kind: "mountain",
    displayName: "Mount Etna",
    detail: "3,322 m"
  }];
  const state = savedState({
    discoveries: {
      [storedId]: {
        id: storedId,
        kind: "mountain",
        displayName: "Mount Etna",
        detail: "3,322 m"
      }
    },
    discoveryOrder: [storedId],
    pendingDiscoveryPortDialogueIds: [],
    campaignGoal: {
      type: "explorer",
      reportedDiscoveryIds: [storedId],
      currentLeadDiscoveryId: storedId
    }
  });

  assert.equal(reconcileSavedDiscoveryReferences(state, catalog), 4);
  assert.deepEqual(state.memory.discoveryOrder, [canonicalId]);
  assert.deepEqual(state.memory.campaignGoal.reportedDiscoveryIds, [canonicalId]);
  assert.equal(state.memory.campaignGoal.currentLeadDiscoveryId, canonicalId);
  assert.equal(state.memory.discoveries[canonicalId].id, canonicalId);
});

test("ambiguous tile-derived mountain slugs require an explicit legacy id", () => {
  const storedId = "mountain-999999-mount-olympus";
  const catalog = [
    {
      id: "mountain-mount-olympus-n40p08325-e22p35012",
      legacyIds: ["mountain-24808-mount-olympus"],
      kind: "mountain",
      displayName: "Mount Olympus",
      detail: "2,917 m"
    },
    {
      id: "mountain-mount-olympus-n48p12345-w123p45678",
      legacyIds: ["mountain-12345-mount-olympus"],
      kind: "mountain",
      displayName: "Mount Olympus",
      detail: "2,429 m"
    }
  ];
  const state = savedState({
    discoveries: {
      [storedId]: {
        id: storedId,
        kind: "mountain",
        displayName: "Mount Olympus",
        detail: "2,917 m"
      }
    },
    discoveryOrder: [storedId],
    pendingDiscoveryPortDialogueIds: [],
    campaignGoal: null
  });

  assert.throws(
    () => reconcileSavedDiscoveryReferences(state, catalog),
    /ambiguous tile-derived mountain id/
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

test("discovery catalogs use ids rather than presentation text as identity", () => {
  assert.doesNotThrow(
    () => validateDiscoveryCatalog([...CATALOG, {
      ...CATALOG[0],
      id: "mountain-other-id",
      legacyIds: ["mountain-other-legacy-id"]
    }])
  );
  assert.throws(
    () => validateDiscoveryCatalog([...CATALOG, {
      ...CATALOG[0],
      id: "mountain-other-id",
      legacyIds: ["mountain-161118-mont-blanc"]
    }]),
    /duplicate reference id/
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

test("tile-derived ids are legacy migration input, never catalog identity", () => {
  assert.throws(
    () => validateDiscoveryCatalog([{
      id: "mountain-161762-mount-etna",
      kind: "mountain",
      displayName: "Mount Etna",
      detail: "3,322 m"
    }]),
    /canonical discovery id, not tile-derived legacy id/
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
