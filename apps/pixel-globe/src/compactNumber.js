const COMPACT_SUFFIXES = Object.freeze(["k", "m", "b", "t"]);

export function formatCompactNumber(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Compact number must be a non-negative safe integer: ${value}`);
  }
  if (value < 1000) return String(value);

  let unitIndex = 0;
  let divisor = 1000;
  while (unitIndex < COMPACT_SUFFIXES.length - 1 && value >= divisor * 1000) {
    unitIndex++;
    divisor *= 1000;
  }

  let scaled = value / divisor;
  let rounded = roundedCompactValue(scaled);
  if (rounded >= 1000 && unitIndex < COMPACT_SUFFIXES.length - 1) {
    unitIndex++;
    divisor *= 1000;
    scaled = value / divisor;
    rounded = roundedCompactValue(scaled);
  }
  return `${rounded}${COMPACT_SUFFIXES[unitIndex]}`;
}

function roundedCompactValue(value) {
  return Number(value.toFixed(value < 10 ? 1 : 0));
}
