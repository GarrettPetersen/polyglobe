const DISCOVERY_KINDS = new Set(["mountain", "landmark", "legend", "achievement"]);
const LEGACY_TILE_MOUNTAIN_ID = /^mountain-\d+-(.+)$/;

export function validateDiscoveryCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new Error("Discovery catalog must be a non-empty array");
  }
  const ids = new Set();
  const identities = new Set();
  for (const discovery of catalog) {
    validateCatalogDiscovery(discovery);
    if (ids.has(discovery.id)) throw new Error(`Discovery catalog contains duplicate id: ${discovery.id}`);
    ids.add(discovery.id);
    const identity = discoveryIdentity(discovery.kind, discovery.displayName);
    if (identities.has(identity)) {
      throw new Error(`Discovery catalog contains duplicate identity: ${identity}`);
    }
    identities.add(identity);
  }
  return catalog;
}

export function reconcileSavedDiscoveryReferences(state, catalog) {
  const resolver = discoveryReferenceResolver(catalog);
  const memory = requiredDiscoveryMemory(state);
  let migratedReferenceCount = 0;
  const migratedEntries = {};

  for (const [storedId, storedEntry] of Object.entries(memory.discoveries)) {
    const canonical = resolveStoredDiscovery(storedId, storedEntry, resolver);
    const canonicalId = canonical.id;
    if (migratedEntries[canonicalId]) {
      throw new Error(`Saved discoveries resolve more than once to ${canonicalId}`);
    }
    migratedEntries[canonicalId] = {
      ...storedEntry,
      id: canonicalId,
      displayName: canonical.displayName,
      kind: canonical.kind,
      detail: canonical.detail || ""
    };
    if (storedId !== canonicalId || storedEntry.id !== canonicalId) migratedReferenceCount += 1;
  }
  memory.discoveries = migratedEntries;

  const migrateIdArray = (values, label, requireStoredEntry) => {
    if (!Array.isArray(values)) throw new Error(`${label} must be an array`);
    const result = [];
    const seen = new Set();
    for (const storedId of values) {
      const canonicalId = resolveSavedDiscoveryId(storedId, resolver, label).id;
      if (requireStoredEntry && !memory.discoveries[canonicalId]) {
        throw new Error(`${label} references an undiscovered entry: ${canonicalId}`);
      }
      if (storedId !== canonicalId) migratedReferenceCount += 1;
      if (seen.has(canonicalId)) continue;
      seen.add(canonicalId);
      result.push(canonicalId);
    }
    return result;
  };

  memory.discoveryOrder = migrateIdArray(memory.discoveryOrder, "Discovery order", true);
  memory.pendingDiscoveryPortDialogueIds = migrateIdArray(
    memory.pendingDiscoveryPortDialogueIds,
    "Pending discovery dialogue",
    true
  );

  const goal = memory.campaignGoal;
  if (goal?.type === "explorer") {
    goal.reportedDiscoveryIds = migrateIdArray(
      goal.reportedDiscoveryIds,
      "Explorer reported discoveries",
      true
    );
    if (goal.currentLeadDiscoveryId !== null) {
      const canonicalId = resolveSavedDiscoveryId(
        goal.currentLeadDiscoveryId,
        resolver,
        "Explorer current lead"
      ).id;
      if (canonicalId !== goal.currentLeadDiscoveryId) migratedReferenceCount += 1;
      goal.currentLeadDiscoveryId = canonicalId;
    }
  }

  validateSavedDiscoveryReferences(state, catalog);
  return migratedReferenceCount;
}

export function validateSavedDiscoveryReferences(state, catalog) {
  validateDiscoveryCatalog(catalog);
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
  const memory = requiredDiscoveryMemory(state);
  if (!Array.isArray(memory.discoveryOrder)) throw new Error("Discovery order must be an array");
  if (new Set(memory.discoveryOrder).size !== memory.discoveryOrder.length) {
    throw new Error("Discovery order contains duplicate ids");
  }
  if (!Array.isArray(memory.pendingDiscoveryPortDialogueIds)) {
    throw new Error("Pending discovery dialogue ids must be an array");
  }
  if (new Set(memory.pendingDiscoveryPortDialogueIds).size !== memory.pendingDiscoveryPortDialogueIds.length) {
    throw new Error("Pending discovery dialogue contains duplicate ids");
  }

  const orderedIds = new Set(memory.discoveryOrder);
  for (const id of memory.discoveryOrder) {
    const entry = memory.discoveries[id];
    const canonical = catalogById.get(id);
    if (!entry) throw new Error(`Discovery order references missing saved entry: ${id}`);
    if (!canonical) throw new Error(`Saved discovery is missing from the runtime catalog: ${id}`);
    validateSavedEntry(id, entry, canonical);
  }
  for (const [id, entry] of Object.entries(memory.discoveries)) {
    if (!orderedIds.has(id)) throw new Error(`Saved discovery is absent from discovery order: ${id}`);
    const canonical = catalogById.get(id);
    if (!canonical) throw new Error(`Saved discovery is missing from the runtime catalog: ${id}`);
    validateSavedEntry(id, entry, canonical);
  }
  for (const id of memory.pendingDiscoveryPortDialogueIds) {
    const entry = memory.discoveries[id];
    if (!entry) throw new Error(`Pending discovery dialogue references an undiscovered entry: ${id}`);
    if (typeof entry.portArrivalDialogue !== "string" || entry.portArrivalDialogue.trim() === "") {
      throw new Error(`Pending discovery dialogue has no dialogue text: ${id}`);
    }
  }

  const goal = memory.campaignGoal;
  if (goal?.type === "explorer") {
    if (!Array.isArray(goal.reportedDiscoveryIds) ||
        new Set(goal.reportedDiscoveryIds).size !== goal.reportedDiscoveryIds.length) {
      throw new Error("Explorer reported discoveries must be a unique array");
    }
    for (const id of goal.reportedDiscoveryIds) {
      if (!catalogById.has(id)) throw new Error(`Explorer report is missing from the runtime catalog: ${id}`);
      if (!memory.discoveries[id]) throw new Error(`Explorer report references an undiscovered entry: ${id}`);
    }
    if (goal.currentLeadDiscoveryId !== null && !catalogById.has(goal.currentLeadDiscoveryId)) {
      throw new Error(`Explorer lead is missing from the runtime catalog: ${goal.currentLeadDiscoveryId}`);
    }
  }
  return state;
}

function discoveryReferenceResolver(catalog) {
  validateDiscoveryCatalog(catalog);
  const byId = new Map(catalog.map((entry) => [entry.id, entry]));
  const byIdentity = new Map(catalog.map((entry) => [
    discoveryIdentity(entry.kind, entry.displayName),
    entry
  ]));
  const mountainBySlug = new Map();
  for (const entry of catalog) {
    if (entry.kind !== "mountain") continue;
    const slug = slugify(entry.displayName);
    if (mountainBySlug.has(slug)) {
      throw new Error(`Mountain discovery slug is ambiguous: ${slug}`);
    }
    mountainBySlug.set(slug, entry);
  }
  return { byId, byIdentity, mountainBySlug };
}

function resolveStoredDiscovery(storedId, storedEntry, resolver) {
  if (!storedEntry || typeof storedEntry !== "object" || Array.isArray(storedEntry)) {
    throw new Error(`Saved discovery entry is malformed: ${storedId}`);
  }
  const byId = resolveSavedDiscoveryId(storedId, resolver, "Saved discovery", false);
  if (byId) return byId;
  if (!DISCOVERY_KINDS.has(storedEntry.kind) ||
      typeof storedEntry.displayName !== "string" || storedEntry.displayName.trim() === "") {
    throw new Error(`Saved discovery cannot be identified: ${storedId}`);
  }
  const byIdentity = resolver.byIdentity.get(discoveryIdentity(storedEntry.kind, storedEntry.displayName));
  if (!byIdentity) throw new Error(`Saved discovery is missing from the runtime catalog: ${storedId}`);
  return byIdentity;
}

function resolveSavedDiscoveryId(storedId, resolver, label, required = true) {
  if (typeof storedId !== "string" || storedId === "") {
    throw new Error(`${label} contains an invalid discovery id: ${storedId}`);
  }
  const exact = resolver.byId.get(storedId);
  if (exact) return exact;
  const legacyMountainMatch = storedId.match(LEGACY_TILE_MOUNTAIN_ID);
  const migratedMountain = legacyMountainMatch
    ? resolver.mountainBySlug.get(legacyMountainMatch[1])
    : null;
  if (migratedMountain) return migratedMountain;
  if (!required) return null;
  throw new Error(`${label} is missing from the runtime discovery catalog: ${storedId}`);
}

function requiredDiscoveryMemory(state) {
  const memory = state?.memory;
  if (!memory || typeof memory !== "object") throw new Error("Saved state has no memory");
  if (!memory.discoveries || typeof memory.discoveries !== "object" ||
      Array.isArray(memory.discoveries)) {
    throw new Error("Saved discovery entries must be an object");
  }
  return memory;
}

function validateCatalogDiscovery(discovery) {
  if (!discovery || typeof discovery !== "object") throw new Error("Discovery catalog entry is malformed");
  if (typeof discovery.id !== "string" || discovery.id === "") {
    throw new Error("Discovery catalog entry has no id");
  }
  if (typeof discovery.displayName !== "string" || discovery.displayName.trim() === "") {
    throw new Error(`Discovery catalog entry has no display name: ${discovery.id}`);
  }
  if (!DISCOVERY_KINDS.has(discovery.kind)) {
    throw new Error(`Discovery catalog entry has invalid kind: ${discovery.id}`);
  }
}

function validateSavedEntry(id, entry, canonical) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`Saved discovery entry is malformed: ${id}`);
  }
  if (entry.id !== id) throw new Error(`Saved discovery key and id disagree: ${id} / ${entry.id}`);
  if (entry.kind !== canonical.kind || entry.displayName !== canonical.displayName) {
    throw new Error(`Saved discovery identity disagrees with the runtime catalog: ${id}`);
  }
}

function discoveryIdentity(kind, displayName) {
  return `${kind}:${displayName.trim().toLocaleLowerCase("en-US")}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "peak";
}
