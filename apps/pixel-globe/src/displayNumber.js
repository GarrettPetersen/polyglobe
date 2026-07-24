const DEFAULT_MAXIMUM_FRACTION_DIGITS = 2;

export function formatDisplayQuantity(
  value,
  { maximumFractionDigits = DEFAULT_MAXIMUM_FRACTION_DIGITS } = {}
) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Display quantity must be a finite non-negative number: ${value}`);
  }
  if (!Number.isInteger(maximumFractionDigits) ||
      maximumFractionDigits < 0 ||
      maximumFractionDigits > 12) {
    throw new Error(`Invalid display quantity precision: ${maximumFractionDigits}`);
  }
  if (value === 0) return "0";

  const minimumDisplayedValue = 10 ** -maximumFractionDigits;
  if (maximumFractionDigits > 0 && value < minimumDisplayedValue) {
    return `<${decimalString(minimumDisplayedValue, maximumFractionDigits)}`;
  }
  return value.toLocaleString("en-US", {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}

function decimalString(value, fractionDigits) {
  return value.toLocaleString("en-US", {
    useGrouping: false,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}
