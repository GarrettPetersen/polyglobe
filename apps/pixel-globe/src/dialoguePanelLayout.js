export function dialoguePanelGeometry({
  screenWidth,
  screenHeight,
  contentHeight
}) {
  if (!Number.isFinite(screenWidth) || screenWidth <= 0) throw new Error("Invalid dialogue screen width");
  if (!Number.isFinite(screenHeight) || screenHeight <= 0) throw new Error("Invalid dialogue screen height");
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) {
    throw new Error("Invalid dialogue content height");
  }

  const x = 6;
  const preferredY = screenHeight > screenWidth ? 96 : 78;
  const minimumY = 6;
  const w = screenWidth - x * 2;
  const requiredHeight = Math.max(108, contentHeight);
  const y = Math.min(preferredY, Math.max(minimumY, screenHeight - 7 - requiredHeight));
  const maximumHeight = screenHeight - y - 7;
  const h = Math.min(maximumHeight, requiredHeight);
  return Object.freeze({
    panel: Object.freeze({ x, y, w, h }),
    portrait: Object.freeze({ x: x + 16, y: Math.max(minimumY, y - 56) })
  });
}

export function dialogueOptionTextLayout({
  label,
  detail = "",
  labelWidth,
  detailWidth = labelWidth,
  measureLabel,
  measureDetail = measureLabel,
  minimumHeight = 24,
  maximumLabelLines = 2,
  maximumDetailLines = 2
}) {
  if (typeof measureLabel !== "function" || typeof measureDetail !== "function") {
    throw new Error("Dialogue option text layout requires text measurement functions");
  }
  for (const [name, value] of Object.entries({
    labelWidth,
    detailWidth,
    minimumHeight,
    maximumLabelLines,
    maximumDetailLines
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid dialogue option text ${name}`);
  }

  const labelLines = wrapMeasuredText(label, labelWidth, maximumLabelLines, measureLabel);
  const detailLines = detail
    ? wrapMeasuredText(detail, detailWidth, maximumDetailLines, measureDetail)
    : [];
  const requiredHeight = 3 + labelLines.length * 12 + (detailLines.length > 0
    ? 1 + detailLines.length * 10
    : 0) + 4;
  const height = Math.max(minimumHeight, Math.ceil(requiredHeight / 2) * 2);
  return Object.freeze({
    height,
    labelLines: Object.freeze(labelLines),
    detailLines: Object.freeze(detailLines)
  });
}

export function dialogueOptionLayout({
  desiredY,
  bottom,
  optionHeight,
  optionCount
}) {
  for (const [label, value] of Object.entries({ desiredY, bottom, optionHeight, optionCount })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid dialogue option ${label}`);
  }
  if (optionHeight <= 0) throw new Error("Dialogue option height must be positive");
  if (!Number.isInteger(optionCount) || optionCount <= 0) {
    throw new Error("Dialogue requires at least one option");
  }

  const y = Math.min(desiredY, bottom - optionHeight);
  const availableHeight = Math.max(optionHeight, bottom - y);
  const visibleCount = Math.max(1, Math.min(optionCount, Math.floor(availableHeight / optionHeight)));
  return Object.freeze({
    y,
    bottom,
    visibleCount,
    needsScroll: optionCount > visibleCount
  });
}

export function dialogueOptionNavigationLayout({
  x,
  y,
  width,
  visibleCount,
  optionHeight,
  buttonWidth,
  buttonHeight,
  gap = 5
}) {
  for (const [label, value] of Object.entries({
    x,
    y,
    width,
    visibleCount,
    optionHeight,
    buttonWidth,
    buttonHeight,
    gap
  })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid dialogue navigation ${label}`);
  }
  if (!Number.isInteger(visibleCount) || visibleCount <= 0) {
    throw new Error("Dialogue navigation requires a visible option");
  }

  if (visibleCount === 1) {
    const navWidth = buttonWidth * 2 + gap;
    const navX = x + width - navWidth;
    return Object.freeze({
      optionWidth: width - navWidth - gap,
      direction: "horizontal",
      previousRect: Object.freeze({ x: navX, y, w: buttonWidth, h: buttonHeight }),
      nextRect: Object.freeze({ x: navX + buttonWidth + gap, y, w: buttonWidth, h: buttonHeight })
    });
  }

  const navX = x + width - buttonWidth;
  return Object.freeze({
    optionWidth: width - buttonWidth - gap,
    direction: "vertical",
    previousRect: Object.freeze({ x: navX, y, w: buttonWidth, h: buttonHeight }),
    nextRect: Object.freeze({
      x: navX,
      y: y + visibleCount * optionHeight - buttonHeight,
      w: buttonWidth,
      h: buttonHeight
    })
  });
}

export function dialogueOptionWindow({
  optionCount,
  visibleCount,
  selectedIndex,
  scrollOffset
}) {
  for (const [label, value] of Object.entries({ optionCount, visibleCount, selectedIndex, scrollOffset })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid dialogue option window ${label}`);
  }
  if (!Number.isInteger(optionCount) || optionCount <= 0) {
    throw new Error("Dialogue option window requires at least one option");
  }
  if (!Number.isInteger(visibleCount) || visibleCount <= 0) {
    throw new Error("Dialogue option window requires a visible option");
  }

  const safeVisibleCount = Math.min(optionCount, visibleCount);
  const safeSelectedIndex = clampInteger(selectedIndex, 0, optionCount - 1);
  const maximumOffset = Math.max(0, optionCount - safeVisibleCount);
  let safeScrollOffset = clampInteger(scrollOffset, 0, maximumOffset);
  if (safeSelectedIndex < safeScrollOffset) safeScrollOffset = safeSelectedIndex;
  if (safeSelectedIndex >= safeScrollOffset + safeVisibleCount) {
    safeScrollOffset = safeSelectedIndex - safeVisibleCount + 1;
  }
  safeScrollOffset = clampInteger(safeScrollOffset, 0, maximumOffset);

  return Object.freeze({
    selectedIndex: safeSelectedIndex,
    scrollOffset: safeScrollOffset,
    start: safeScrollOffset,
    end: safeScrollOffset + safeVisibleCount
  });
}

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}

function wrapMeasuredText(text, maxWidth, maxLines, measureText) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const wrapped = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measureText(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) wrapped.push(line);
    line = word;
  }
  if (line) wrapped.push(line);

  const lines = wrapped.slice(0, maxLines).map((entry) => fitMeasuredText(entry, maxWidth, measureText));
  if (wrapped.length > maxLines && lines.length > 0) {
    lines[lines.length - 1] = fitMeasuredText(`${lines[lines.length - 1]} ...`, maxWidth, measureText);
  }
  return lines.length > 0 ? lines : [""];
}

function fitMeasuredText(text, maxWidth, measureText) {
  if (measureText(text) <= maxWidth) return text;
  const suffix = "...";
  let kept = "";
  for (const character of text) {
    if (measureText(kept + character + suffix) > maxWidth) break;
    kept += character;
  }
  return kept ? `${kept}${suffix}` : suffix;
}
