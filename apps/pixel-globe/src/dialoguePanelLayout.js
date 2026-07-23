import { wrapMeasuredText } from "./measuredTextLayout.js";

export function characterAlertGeometry({
  screenWidth,
  screenHeight,
  panelWidth,
  panelHeight,
  portraitSize,
  portraitOverlap = 8,
  margin = 6,
  portraitInset = 14
}) {
  for (const [label, value] of Object.entries({
    screenWidth,
    screenHeight,
    panelWidth,
    panelHeight,
    portraitSize,
    portraitOverlap,
    margin,
    portraitInset
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid character alert ${label}: ${value}`);
    }
  }
  if (screenWidth <= 0 || screenHeight <= 0 || panelWidth <= 0 || panelHeight <= 0 || portraitSize <= 0) {
    throw new Error("Character alert dimensions must be positive");
  }
  if (portraitOverlap >= portraitSize) {
    throw new Error("Character alert portrait overlap must leave the portrait above the panel");
  }

  const w = Math.min(panelWidth, screenWidth - margin * 2);
  const h = Math.min(panelHeight, screenHeight - margin * 2);
  const x = Math.floor((screenWidth - w) / 2);
  const minimumPanelY = margin + portraitSize - portraitOverlap;
  const maximumPanelY = screenHeight - margin - h;
  if (maximumPanelY < minimumPanelY) {
    throw new Error("Character alert viewport cannot fit a standing portrait above its panel");
  }
  const y = Math.min(maximumPanelY, Math.max(minimumPanelY, Math.floor((screenHeight - h) / 2)));
  if (portraitInset + portraitSize > w) {
    throw new Error("Character alert portrait does not fit its panel width");
  }
  return Object.freeze({
    panel: Object.freeze({ x, y, w, h }),
    portrait: Object.freeze({
      x: x + portraitInset,
      y: y - portraitSize + portraitOverlap
    })
  });
}

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
  const portraitY = Math.max(minimumY, y - 56);
  const portraitInset = 16;
  const portraitSize = 64;
  return Object.freeze({
    panel: Object.freeze({ x, y, w, h }),
    portraits: Object.freeze({
      left: Object.freeze({ x: x + portraitInset, y: portraitY }),
      right: Object.freeze({ x: x + w - portraitInset - portraitSize, y: portraitY })
    })
  });
}

export function dialogueFeedbackSlotCount({ visibleLineCount, reservedLineCount = 0 }) {
  for (const [label, value] of Object.entries({ visibleLineCount, reservedLineCount })) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid dialogue feedback ${label}: ${value}`);
    }
  }
  return Math.max(visibleLineCount, reservedLineCount);
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
  maximumDetailLines = 2,
  labelLineHeight = 12,
  detailLineHeight = 10
}) {
  if (typeof measureLabel !== "function" || typeof measureDetail !== "function") {
    throw new Error("Dialogue option text layout requires text measurement functions");
  }
  for (const [name, value] of Object.entries({
    labelWidth,
    detailWidth,
    minimumHeight,
    maximumLabelLines,
    maximumDetailLines,
    labelLineHeight,
    detailLineHeight
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid dialogue option text ${name}`);
  }

  const labelLines = wrapMeasuredText(label, labelWidth, maximumLabelLines, measureLabel);
  const detailLines = detail
    ? wrapMeasuredText(detail, detailWidth, maximumDetailLines, measureDetail)
    : [];
  const requiredHeight = 3 + labelLines.length * labelLineHeight + (detailLines.length > 0
    ? 1 + detailLines.length * detailLineHeight
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

export function dialogueOptionGroups(options) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error("Dialogue option grouping requires at least one option");
  }
  const regular = [];
  const exits = [];
  options.forEach((option, index) => {
    if (!option || typeof option !== "object") throw new Error(`Invalid dialogue option at index ${index}`);
    if (option.placement !== undefined && option.placement !== "port-exit") {
      throw new Error(`Unknown dialogue option placement: ${option.placement}`);
    }
    const entry = Object.freeze({ index, option });
    (option.placement === "port-exit" ? exits : regular).push(entry);
  });
  if (exits.length > 2) {
    throw new Error(`Dialogue exit footer supports at most two actions, received ${exits.length}`);
  }
  return Object.freeze({
    regular: Object.freeze(regular),
    exits: Object.freeze(exits)
  });
}

export function dialogueOptionStackLayout({
  desiredY,
  bottom,
  optionHeight,
  regularCount,
  exitCount,
  footerGap = 4
}) {
  for (const [label, value] of Object.entries({
    desiredY,
    bottom,
    optionHeight,
    regularCount,
    exitCount,
    footerGap
  })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid dialogue option stack ${label}`);
  }
  if (optionHeight <= 0) throw new Error("Dialogue option stack height must be positive");
  if (!Number.isInteger(regularCount) || regularCount < 0) {
    throw new Error("Dialogue option stack requires a non-negative regular option count");
  }
  if (!Number.isInteger(exitCount) || exitCount < 0 || exitCount > 2) {
    throw new Error("Dialogue option stack requires zero, one, or two exit options");
  }
  if (regularCount + exitCount === 0) throw new Error("Dialogue option stack cannot be empty");
  if (footerGap < 0) throw new Error("Dialogue option footer gap cannot be negative");

  const footerY = exitCount > 0 ? bottom - optionHeight : bottom;
  const regularBottom = exitCount > 0 ? footerY - footerGap : bottom;
  if (regularCount === 0) {
    return Object.freeze({
      y: footerY,
      footerY,
      regularBottom,
      visibleRegularCount: 0,
      needsScroll: false
    });
  }
  const regularLayout = dialogueOptionLayout({
    desiredY,
    bottom: regularBottom,
    optionHeight,
    optionCount: regularCount
  });
  return Object.freeze({
    y: regularLayout.y,
    footerY,
    regularBottom,
    visibleRegularCount: regularLayout.visibleCount,
    needsScroll: regularLayout.needsScroll
  });
}

export function dialogueExitFooterRects({ x, y, width, optionHeight, exitCount, gap = 4 }) {
  for (const [label, value] of Object.entries({ x, y, width, optionHeight, exitCount, gap })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid dialogue exit footer ${label}`);
  }
  if (width <= 0 || optionHeight <= 0) throw new Error("Dialogue exit footer dimensions must be positive");
  if (!Number.isInteger(exitCount) || exitCount < 1 || exitCount > 2) {
    throw new Error("Dialogue exit footer requires one or two actions");
  }
  if (gap < 0 || (exitCount === 2 && width <= gap)) {
    throw new Error("Dialogue exit footer gap does not fit its width");
  }
  if (exitCount === 1) {
    return Object.freeze([Object.freeze({ x, y, w: width, h: optionHeight - 2 })]);
  }
  const leftWidth = Math.floor((width - gap) / 2);
  return Object.freeze([
    Object.freeze({ x, y, w: leftWidth, h: optionHeight - 2 }),
    Object.freeze({ x: x + leftWidth + gap, y, w: width - leftWidth - gap, h: optionHeight - 2 })
  ]);
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
    end: safeScrollOffset + safeVisibleCount,
    canScrollUp: safeScrollOffset > 0,
    canScrollDown: safeScrollOffset + safeVisibleCount < optionCount
  });
}

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}
