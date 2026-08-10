export function optionsVolumeRowLayout({
  rowX,
  rowWidth,
  labelWidth,
  valueWidth,
  padding = 8,
  gap = 5,
  minimumSliderWidth = 24,
  preferredSliderWidth = 70,
  preferredSliderInset = 66
}) {
  for (const [label, value] of Object.entries({
    rowX,
    rowWidth,
    labelWidth,
    valueWidth,
    padding,
    gap,
    minimumSliderWidth,
    preferredSliderWidth,
    preferredSliderInset
  })) {
    if (!Number.isFinite(value)) throw new Error(`Volume row layout has invalid ${label}: ${value}`);
  }
  if (rowWidth <= 0 || labelWidth < 0 || valueWidth < 0 || padding < 0 || gap < 0 ||
      minimumSliderWidth <= 0 || preferredSliderWidth < minimumSliderWidth) {
    throw new Error("Volume row layout requires positive geometry");
  }

  const valueRight = rowX + rowWidth - padding;
  const valueLeft = valueRight - valueWidth;
  const labelMaxWidth = valueLeft - rowX - padding - gap * 2 - minimumSliderWidth;
  if (labelMaxWidth <= 0) {
    throw new Error(`Volume row is too narrow for its controls: ${rowWidth}px`);
  }
  const fittedLabelWidth = Math.min(labelWidth, labelMaxWidth);
  const minimumSliderX = rowX + padding + fittedLabelWidth + gap;
  const maximumSliderRight = valueLeft - gap;
  const sliderX = Math.min(
    Math.max(rowX + preferredSliderInset, minimumSliderX),
    maximumSliderRight - minimumSliderWidth
  );
  const sliderWidth = Math.min(preferredSliderWidth, maximumSliderRight - sliderX);
  if (sliderWidth < minimumSliderWidth) {
    throw new Error(`Volume row slider cannot fit: ${sliderWidth}px`);
  }
  return Object.freeze({
    labelMaxWidth,
    sliderX,
    sliderWidth,
    valueRight,
    valueLeft
  });
}
