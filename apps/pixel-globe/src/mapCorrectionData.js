export function requiredSubdivisionMapData(table, subdivisions, label) {
  if (!table || typeof table !== "object" || !Number.isInteger(subdivisions) || subdivisions < 0) {
    throw new Error(`Invalid ${label} subdivision lookup: ${subdivisions}`);
  }
  const value = table[subdivisions];
  if (value === undefined) {
    throw new Error(`${label} has no authored data for subdivision ${subdivisions}`);
  }
  return value;
}
