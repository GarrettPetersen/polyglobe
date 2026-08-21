import { wrapAllMeasuredText } from "./measuredTextLayout.js";

export function dialogueOverlayIsVisible({ dialogueActive, characterAlertActive }) {
  if (typeof dialogueActive !== "boolean" || typeof characterAlertActive !== "boolean") {
    throw new Error("Dialogue overlay visibility requires boolean modal states");
  }
  return dialogueActive && !characterAlertActive;
}

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
  const left = Object.freeze({
    x: x + portraitInset,
    y: y - portraitSize + portraitOverlap
  });
  const right = Object.freeze({
    x: x + w - portraitInset - portraitSize,
    y: left.y
  });
  return Object.freeze({
    panel: Object.freeze({ x, y, w, h }),
    portraits: Object.freeze({ left, right })
  });
}

export function characterAlertChoiceTextLayout({
  choices,
  panelWidth,
  measureText,
  iconSize = 16,
  gap = 6,
  horizontalPadding = 11,
  buttonTextPadding = 4,
  minimumButtonHeight = 28,
  lineHeight = 8
}) {
  if (!Array.isArray(choices) || choices.length < 2 || choices.length > 3) {
    throw new Error(`Character alert choices must number two or three: ${choices?.length}`);
  }
  if (typeof measureText !== "function") {
    throw new Error("Character alert choice layout requires a text measurement function");
  }
  for (const [label, value] of Object.entries({
    panelWidth,
    iconSize,
    gap,
    horizontalPadding,
    buttonTextPadding,
    minimumButtonHeight,
    lineHeight
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid character alert choice ${label}: ${value}`);
    }
  }
  if (panelWidth <= 0 || minimumButtonHeight <= 0 || lineHeight <= 0) {
    throw new Error("Character alert choice dimensions must be positive");
  }

  const availableWidth = Math.floor(
    panelWidth - horizontalPadding * 2 - gap * (choices.length - 1)
  );
  const minimumButtonWidth = 36;
  if (availableWidth < minimumButtonWidth * choices.length) {
    throw new Error("Character alert choices do not fit the panel width");
  }
  const desiredWidths = choices.map((choice, index) => {
    if (!choice || typeof choice.label !== "string" || choice.label.trim() === "") {
      throw new Error(`Character alert choice ${index} requires a label`);
    }
    const iconReserve = choice.iconId ? iconSize + buttonTextPadding : 0;
    return Math.max(
      minimumButtonWidth,
      Math.ceil(measureText(choice.label.toUpperCase())) + buttonTextPadding * 2 + iconReserve
    );
  });
  const buttonWidths = distributeChoiceWidths({
    desiredWidths,
    availableWidth,
    minimumWidth: minimumButtonWidth
  });
  const textLayouts = choices.map((choice, index) => {
    const iconReserve = choice.iconId ? iconSize + buttonTextPadding : 0;
    const textWidth = buttonWidths[index] - buttonTextPadding * 2 - iconReserve;
    if (textWidth <= 0) throw new Error(`Character alert choice ${index} has no room for text`);
    const labelLines = wrapAllMeasuredText(choice.label.toUpperCase(), textWidth, measureText);
    return Object.freeze({
      labelLines: Object.freeze(labelLines),
      textWidth,
      iconReserve
    });
  });
  const requiredButtonHeight = Math.max(
    minimumButtonHeight,
    ...textLayouts.map(({ labelLines }) => labelLines.length * lineHeight + 8)
  );
  return Object.freeze({
    buttonWidths: Object.freeze(buttonWidths),
    buttonHeight: Math.ceil(requiredButtonHeight / 2) * 2,
    lineHeight,
    textLayouts: Object.freeze(textLayouts)
  });
}

function distributeChoiceWidths({ desiredWidths, availableWidth, minimumWidth }) {
  const widths = desiredWidths.map(() => minimumWidth);
  let remaining = availableWidth - minimumWidth * desiredWidths.length;
  const desiredExtras = desiredWidths.map((width) => Math.max(0, width - minimumWidth));
  const totalDesiredExtra = desiredExtras.reduce((sum, width) => sum + width, 0);
  if (totalDesiredExtra > 0 && remaining > 0) {
    const distributable = Math.min(remaining, totalDesiredExtra);
    const exactShares = desiredExtras.map((extra) => distributable * extra / totalDesiredExtra);
    const allocated = exactShares.map(Math.floor);
    let roundingRemainder = distributable - allocated.reduce((sum, width) => sum + width, 0);
    const fractionalOrder = exactShares
      .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
      .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
    for (let index = 0; index < roundingRemainder; index += 1) {
      allocated[fractionalOrder[index].index] += 1;
    }
    allocated.forEach((width, index) => { widths[index] += width; });
    remaining -= distributable;
  }
  for (let index = 0; remaining > 0; index = (index + 1) % widths.length) {
    widths[index] += 1;
    remaining -= 1;
  }
  if (widths.reduce((sum, width) => sum + width, 0) !== availableWidth) {
    throw new Error("Character alert choice widths do not fill their row");
  }
  return widths;
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

export function dialogueFeedbackTextLines({ text, maxWidth, measureText }) {
  if (text === null || text === undefined || text === "") return Object.freeze([]);
  return Object.freeze(wrapAllMeasuredText(text, maxWidth, measureText));
}

export function dialogueOptionTextLayout({
  label,
  detail = "",
  labelWidth,
  detailWidth = labelWidth,
  measureLabel,
  measureDetail = measureLabel,
  minimumHeight = 24,
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
    labelLineHeight,
    detailLineHeight
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid dialogue option text ${name}`);
  }

  const labelLines = wrapAllMeasuredText(label, labelWidth, measureLabel);
  const detailLines = detail
    ? wrapAllMeasuredText(detail, detailWidth, measureDetail)
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

export function dialogueOptionMeasurementWidths({
  options,
  width,
  optionColumns = 1,
  regularWidthReserve = 0,
  gap = 4
}) {
  for (const [label, value] of Object.entries({ width, optionColumns, regularWidthReserve, gap })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid dialogue option measurement ${label}`);
  }
  if (width <= 0) throw new Error("Dialogue option measurement width must be positive");
  if (!Number.isInteger(optionColumns) || optionColumns < 1 || optionColumns > 3) {
    throw new Error(`Unsupported dialogue option measurement column count: ${optionColumns}`);
  }
  if (regularWidthReserve < 0 || regularWidthReserve >= width) {
    throw new Error("Dialogue option measurement reserve must fit its width");
  }
  if (gap < 0 || gap >= width) throw new Error("Dialogue option measurement gap must fit its width");

  const groups = dialogueOptionGroups(options);
  const widths = Array(options.length).fill(null);
  const regularWidth = width - regularWidthReserve;
  const rowCounts = new Map();
  for (const entry of groups.regular) {
    if (!entry.option.rowId) continue;
    rowCounts.set(entry.option.rowId, (rowCounts.get(entry.option.rowId) || 0) + 1);
  }
  for (const entry of groups.regular) {
    const columnCount = entry.option.rowId ? rowCounts.get(entry.option.rowId) : 1;
    if (columnCount > optionColumns) {
      throw new Error(`Dialogue option row exceeds its column count: ${entry.option.rowId}`);
    }
    widths[entry.index] = columnCount > 1
      ? Math.floor((regularWidth - gap * (columnCount - 1)) / columnCount)
      : regularWidth;
  }
  const exitWidth = groups.exits.length === 2
    ? Math.floor((width - gap) / 2)
    : width;
  for (const entry of groups.exits) widths[entry.index] = exitWidth;
  if (widths.some((entry) => !Number.isFinite(entry) || entry <= 0)) {
    throw new Error("Dialogue option measurement produced an invalid button width");
  }
  return Object.freeze(widths);
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
