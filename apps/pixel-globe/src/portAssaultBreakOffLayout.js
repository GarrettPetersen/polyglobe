import { wrapAllMeasuredText } from "./measuredTextLayout.js";

const MODAL_MAX_WIDTH_PX = 232;
const MODAL_SCREEN_GUTTER_PX = 6;
const MODAL_TEXT_INSET_PX = 16;
const TITLE_TOP_PX = 18;
const MESSAGE_TOP_PX = 36;
const MESSAGE_BUTTON_GAP_PX = 12;
const BUTTON_WIDTH_PX = 92;
const BUTTON_HEIGHT_PX = 22;
const BUTTON_GAP_PX = 10;
const MODAL_BOTTOM_INSET_PX = 12;

export function portAssaultBreakOffLayout({
  screenWidth,
  screenHeight,
  message,
  measureText,
  lineHeight
}) {
  if (!Number.isInteger(screenWidth) || !Number.isInteger(screenHeight) ||
      screenWidth <= MODAL_SCREEN_GUTTER_PX * 2 || screenHeight <= 0) {
    throw new Error(`Invalid port-assault break-off viewport: ${screenWidth}x${screenHeight}`);
  }
  if (typeof message !== "string" || message.length === 0) {
    throw new Error("Port-assault break-off layout requires a message");
  }
  if (typeof measureText !== "function") {
    throw new Error("Port-assault break-off layout requires text measurement");
  }
  if (!Number.isInteger(lineHeight) || lineHeight <= 0) {
    throw new Error(`Invalid port-assault break-off line height: ${lineHeight}`);
  }

  const modalWidth = Math.min(MODAL_MAX_WIDTH_PX, screenWidth - MODAL_SCREEN_GUTTER_PX * 2);
  const messageWidth = modalWidth - MODAL_TEXT_INSET_PX * 2;
  const messageLines = wrapAllMeasuredText(message, messageWidth, measureText);
  const buttonY = MESSAGE_TOP_PX + messageLines.length * lineHeight + MESSAGE_BUTTON_GAP_PX;
  const modalHeight = buttonY + BUTTON_HEIGHT_PX + MODAL_BOTTOM_INSET_PX;
  if (modalHeight > screenHeight - MODAL_SCREEN_GUTTER_PX * 2) {
    throw new Error(
      `Port-assault break-off content needs ${modalHeight}px in a ${screenHeight}px viewport`
    );
  }
  const modal = Object.freeze({
    x: Math.floor((screenWidth - modalWidth) / 2),
    y: Math.floor((screenHeight - modalHeight) / 2),
    w: modalWidth,
    h: modalHeight
  });
  const buttonRowWidth = BUTTON_WIDTH_PX * 2 + BUTTON_GAP_PX;
  if (buttonRowWidth > modal.w - MODAL_TEXT_INSET_PX * 2) {
    throw new Error(`Port-assault break-off buttons do not fit ${modal.w}px`);
  }
  const buttonX = modal.x + Math.floor((modal.w - buttonRowWidth) / 2);

  return Object.freeze({
    modal,
    title: Object.freeze({
      x: modal.x + modal.w / 2,
      y: modal.y + TITLE_TOP_PX
    }),
    message: Object.freeze({
      x: modal.x + modal.w / 2,
      y: modal.y + MESSAGE_TOP_PX,
      width: messageWidth,
      lineHeight,
      lines: Object.freeze(messageLines)
    }),
    buttons: Object.freeze([
      Object.freeze({ x: buttonX, y: modal.y + buttonY, w: BUTTON_WIDTH_PX, h: BUTTON_HEIGHT_PX }),
      Object.freeze({
        x: buttonX + BUTTON_WIDTH_PX + BUTTON_GAP_PX,
        y: modal.y + buttonY,
        w: BUTTON_WIDTH_PX,
        h: BUTTON_HEIGHT_PX
      })
    ])
  });
}
