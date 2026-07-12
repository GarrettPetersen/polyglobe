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
