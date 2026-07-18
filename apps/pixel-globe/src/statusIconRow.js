export function statusIconRowLayout({ count, x, y, width, iconWidth, gap = 1 }) {
  for (const [label, value] of Object.entries({ count, x, y, width, iconWidth, gap })) {
    if (!Number.isInteger(value)) throw new Error(`Status icon row ${label} must be an integer: ${value}`);
  }
  if (count < 0) throw new Error(`Status icon row count cannot be negative: ${count}`);
  if (iconWidth < 1) throw new Error(`Status icon row icon width must be positive: ${iconWidth}`);
  if (gap < 0) throw new Error(`Status icon row gap cannot be negative: ${gap}`);
  if (width < iconWidth) throw new Error(`Status icon row is too narrow: ${width}`);

  const normalPitch = iconWidth + gap;
  if (count === 0) {
    return Object.freeze({
      entries: Object.freeze([]),
      pitch: normalPitch,
      representedCount: 0
    });
  }

  const maximumDistinctPositions = width - iconWidth + 1;
  const representedCount = Math.min(count, maximumDistinctPositions);
  const pitch = representedCount === 1
    ? normalPitch
    : Math.min(normalPitch, Math.floor((width - iconWidth) / (representedCount - 1)));
  const entries = Array.from({ length: representedCount }, (_entry, index) => Object.freeze({
    x: x + index * pitch,
    y
  }));

  return Object.freeze({
    entries: Object.freeze(entries),
    pitch,
    representedCount
  });
}

export function specialStatusIconCount(totalIcons, specialAmount, totalAmount) {
  if (!Number.isInteger(totalIcons) || totalIcons < 0) {
    throw new Error(`Status icon total must be a non-negative integer: ${totalIcons}`);
  }
  for (const [label, value] of Object.entries({ specialAmount, totalAmount })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Status icon ${label} must be non-negative: ${value}`);
    }
  }
  if (specialAmount > totalAmount + 1e-8) {
    throw new Error(`Status icon special amount exceeds total: ${specialAmount}/${totalAmount}`);
  }
  if (totalIcons === 0 || specialAmount <= 1e-8 || totalAmount <= 1e-8) return 0;
  if (specialAmount >= totalAmount - 1e-8) return totalIcons;
  if (totalIcons === 1) return 1;
  return Math.max(1, Math.min(
    totalIcons - 1,
    Math.round(totalIcons * specialAmount / totalAmount)
  ));
}
