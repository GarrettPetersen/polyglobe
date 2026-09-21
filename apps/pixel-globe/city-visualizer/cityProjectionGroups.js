function requireProjectionCoordinate(value, name, entryIndex) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`City projection entry ${entryIndex} has invalid ${name}`);
  }
  return value;
}

export function contiguousCityProjectionGroups(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("City projection entries must be an array");
  }
  const groups = [];
  entries.forEach((entry, entryIndex) => {
    if (!entry || typeof entry !== "object") {
      throw new TypeError(`City projection entry ${entryIndex} must be an object`);
    }
    const depth = requireProjectionCoordinate(entry.depth, "depth", entryIndex);
    const parallaxAnchor = requireProjectionCoordinate(
      entry.parallaxAnchor,
      "parallaxAnchor",
      entryIndex
    );
    let group = groups.at(-1);
    if (!group || group.depth !== depth || group.parallaxAnchor !== parallaxAnchor) {
      group = { depth, parallaxAnchor, entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  });
  return Object.freeze(groups.map((group) => Object.freeze({
    depth: group.depth,
    parallaxAnchor: group.parallaxAnchor,
    entries: Object.freeze(group.entries)
  })));
}

export function citySceneCacheBounds(rectangles) {
  if (!Array.isArray(rectangles) || rectangles.length === 0) {
    throw new TypeError("City scene cache bounds require at least one rectangle");
  }
  const coordinates = rectangles.map((rectangle, index) => {
    if (!rectangle || typeof rectangle !== "object") {
      throw new TypeError(`City scene cache rectangle ${index} must be an object`);
    }
    const { x, y, width, height } = rectangle;
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new TypeError(`City scene cache rectangle ${index} must have finite positive bounds`);
    }
    return Object.freeze({ x, y, right: x + width, bottom: y + height });
  });
  const x = Math.floor(Math.min(...coordinates.map((rectangle) => rectangle.x)));
  const y = Math.floor(Math.min(...coordinates.map((rectangle) => rectangle.y)));
  const right = Math.ceil(Math.max(...coordinates.map((rectangle) => rectangle.right)));
  const bottom = Math.ceil(Math.max(...coordinates.map((rectangle) => rectangle.bottom)));
  return Object.freeze({ x, y, width: right - x, height: bottom - y });
}
