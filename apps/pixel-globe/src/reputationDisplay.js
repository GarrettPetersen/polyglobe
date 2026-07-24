export function formatSignedReputation(value) {
  if (!Number.isFinite(value)) throw new Error(`Cannot display invalid reputation: ${value}`);
  const normalized = Object.is(value, -0) ? 0 : value;
  const magnitude = Math.abs(normalized).toLocaleString("en-US", {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
  return `${normalized < 0 ? "-" : "+"}${magnitude}`;
}
