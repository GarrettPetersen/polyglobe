export function createSpatialHash({ cellSize = 32 } = {}) {
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    throw new Error(`Spatial hash requires a positive cell size: ${cellSize}`);
  }

  const entries = new Map();
  const cells = new Map();
  const kindIds = new Map();

  function set(rawEntry) {
    const entry = validatedEntry(rawEntry);
    remove(entry.id);
    const cellKeys = cellKeysForBounds(
      entry.x - entry.radius,
      entry.y - entry.radius,
      entry.x + entry.radius,
      entry.y + entry.radius,
      cellSize
    );
    const stored = Object.freeze({ ...entry, cellKeys });
    entries.set(stored.id, stored);
    let ids = kindIds.get(stored.kind);
    if (!ids) {
      ids = new Set();
      kindIds.set(stored.kind, ids);
    }
    ids.add(stored.id);
    for (const key of cellKeys) {
      let bucket = cells.get(key);
      if (!bucket) {
        bucket = new Set();
        cells.set(key, bucket);
      }
      bucket.add(stored.id);
    }
    return stored;
  }

  function remove(id) {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("Spatial hash removal requires a non-empty string id");
    }
    const entry = entries.get(id);
    if (!entry) return false;
    entries.delete(id);
    const ids = kindIds.get(entry.kind);
    ids.delete(id);
    if (ids.size === 0) kindIds.delete(entry.kind);
    for (const key of entry.cellKeys) {
      const bucket = cells.get(key);
      bucket.delete(id);
      if (bucket.size === 0) cells.delete(key);
    }
    return true;
  }

  function replaceKind(kind, replacements) {
    validateKind(kind);
    if (!Array.isArray(replacements)) {
      throw new Error(`Spatial hash replacements for ${kind} must be an array`);
    }
    const priorIds = [...(kindIds.get(kind) || [])];
    for (const id of priorIds) remove(id);
    const seen = new Set();
    for (const replacement of replacements) {
      if (replacement?.kind !== undefined && replacement.kind !== kind) {
        throw new Error(`Spatial hash replacement kind mismatch: ${replacement.kind} !== ${kind}`);
      }
      const entry = { ...replacement, kind };
      if (seen.has(entry.id)) {
        throw new Error(`Spatial hash replacement contains duplicate id: ${entry.id}`);
      }
      seen.add(entry.id);
      set(entry);
    }
  }

  function queryCircle({ x, y, radius, kinds = null }) {
    validateFinitePoint(x, y, "query");
    if (!Number.isFinite(radius) || radius < 0) {
      throw new Error(`Spatial hash query requires a non-negative radius: ${radius}`);
    }
    const allowedKinds = normalizedKinds(kinds);
    const candidateIds = idsInBounds(
      x - radius,
      y - radius,
      x + radius,
      y + radius,
      cells,
      cellSize
    );
    const matches = [];
    for (const id of candidateIds) {
      const entry = entries.get(id);
      if (!entry || (allowedKinds && !allowedKinds.has(entry.kind))) continue;
      const dx = entry.x - x;
      const dy = entry.y - y;
      const limit = radius + entry.radius;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > limit * limit) continue;
      matches.push({ entry, distanceSquared });
    }
    matches.sort((a, b) => (
      a.distanceSquared - b.distanceSquared ||
      a.entry.id.localeCompare(b.entry.id)
    ));
    return matches;
  }

  function queryAabb({ minX, minY, maxX, maxY, kinds = null }) {
    validateBounds(minX, minY, maxX, maxY);
    const allowedKinds = normalizedKinds(kinds);
    const matches = [];
    for (const id of idsInBounds(minX, minY, maxX, maxY, cells, cellSize)) {
      const entry = entries.get(id);
      if (!entry || (allowedKinds && !allowedKinds.has(entry.kind))) continue;
      if (
        entry.x + entry.radius < minX ||
        entry.x - entry.radius > maxX ||
        entry.y + entry.radius < minY ||
        entry.y - entry.radius > maxY
      ) continue;
      matches.push(entry);
    }
    matches.sort((a, b) => a.id.localeCompare(b.id));
    return matches;
  }

  function clear() {
    entries.clear();
    cells.clear();
    kindIds.clear();
  }

  return Object.freeze({
    cellSize,
    set,
    remove,
    replaceKind,
    queryCircle,
    queryAabb,
    get: (id) => entries.get(id) || null,
    entriesForKind: (kind) => {
      validateKind(kind);
      return [...(kindIds.get(kind) || [])]
        .sort((a, b) => a.localeCompare(b))
        .map((id) => entries.get(id));
    },
    clear,
    get size() {
      return entries.size;
    }
  });
}

function validatedEntry(entry) {
  if (!entry || typeof entry !== "object") {
    throw new Error("Spatial hash entry must be an object");
  }
  if (typeof entry.id !== "string" || entry.id.length === 0) {
    throw new Error("Spatial hash entry requires a non-empty string id");
  }
  validateKind(entry.kind);
  validateFinitePoint(entry.x, entry.y, `entry ${entry.id}`);
  const radius = entry.radius ?? 0;
  if (!Number.isFinite(radius) || radius < 0) {
    throw new Error(`Spatial hash entry ${entry.id} has invalid radius: ${radius}`);
  }
  return {
    id: entry.id,
    kind: entry.kind,
    x: entry.x,
    y: entry.y,
    radius,
    value: entry.value
  };
}

function validateKind(kind) {
  if (typeof kind !== "string" || kind.length === 0) {
    throw new Error("Spatial hash entry requires a non-empty string kind");
  }
}

function validateFinitePoint(x, y, label) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Spatial hash ${label} has invalid point: ${x},${y}`);
  }
}

function validateBounds(minX, minY, maxX, maxY) {
  validateFinitePoint(minX, minY, "bounds minimum");
  validateFinitePoint(maxX, maxY, "bounds maximum");
  if (maxX < minX || maxY < minY) {
    throw new Error(`Spatial hash bounds are reversed: ${minX},${minY}-${maxX},${maxY}`);
  }
}

function normalizedKinds(kinds) {
  if (kinds === null || kinds === undefined) return null;
  if (!Array.isArray(kinds) && !(kinds instanceof Set)) {
    throw new Error("Spatial hash query kinds must be an array or set");
  }
  const normalized = new Set(kinds);
  for (const kind of normalized) validateKind(kind);
  return normalized;
}

function idsInBounds(minX, minY, maxX, maxY, cells, cellSize) {
  const ids = new Set();
  for (const key of cellKeysForBounds(minX, minY, maxX, maxY, cellSize)) {
    const bucket = cells.get(key);
    if (!bucket) continue;
    for (const id of bucket) ids.add(id);
  }
  return ids;
}

function cellKeysForBounds(minX, minY, maxX, maxY, cellSize) {
  validateBounds(minX, minY, maxX, maxY);
  const minCellX = Math.floor(minX / cellSize);
  const minCellY = Math.floor(minY / cellSize);
  const maxCellX = Math.floor(maxX / cellSize);
  const maxCellY = Math.floor(maxY / cellSize);
  const keys = [];
  for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      keys.push(`${cellX},${cellY}`);
    }
  }
  return keys;
}
