export function requireEntityId(value, label = "Entity") {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} requires a canonical id`);
  }
  if (value !== value.trim()) throw new Error(`${label} canonical id has surrounding whitespace: ${value}`);
  return value;
}

export function requireCityId(city, label = "City") {
  if (!city || typeof city !== "object") throw new Error(`${label} requires a city record`);
  return requireEntityId(city.cityId, label);
}

export function cityTerritoryId(city, label = "City") {
  const cityId = requireCityId(city, label);
  const separator = cityId.lastIndexOf("|");
  if (separator <= 0 || separator === cityId.length - 1) {
    throw new Error(`${label} canonical id has no territory component: ${cityId}`);
  }
  return cityId.slice(separator + 1);
}

export function indexEntitiesById(entities, {
  idField = "id",
  label = "Entity"
} = {}) {
  if (!entities || typeof entities[Symbol.iterator] !== "function") {
    throw new Error(`${label} catalog must be iterable`);
  }
  const index = new Map();
  for (const entity of entities) {
    const id = requireEntityId(entity?.[idField], label);
    if (index.has(id)) throw new Error(`${label} catalog contains duplicate id: ${id}`);
    index.set(id, entity);
  }
  return index;
}

export function requireEntityById(index, id, label = "Entity") {
  if (!(index instanceof Map)) throw new Error(`${label} lookup requires a canonical-id index`);
  const canonicalId = requireEntityId(id, label);
  const entity = index.get(canonicalId);
  if (!entity) throw new Error(`${label} is missing from the canonical catalog: ${canonicalId}`);
  return entity;
}
