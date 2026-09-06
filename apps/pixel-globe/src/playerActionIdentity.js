export function playerActionId(action) {
  const canonical = (value, nested = false) => {
    if (value === null || typeof value !== "object") return value;
    if (nested && typeof value.id === "string") return { id: value.id };
    if (Array.isArray(value)) return value.map((entry) => canonical(entry, true));
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .filter(([key]) => !/^(name|label|text|country)$|(?:Name|Label|Text|Country)$/.test(key))
      .map(([key, entry]) => [key, canonical(entry, true)]));
  };
  return `choose:${JSON.stringify(canonical(action))}`;
}
