const CONNECTED_POLL_MS = 16;
const DISCONNECTED_POLL_MS = 250;

function createSteamInputPump({
  snapshot,
  publish,
  schedule = setTimeout,
  cancel = clearTimeout
}) {
  if (typeof snapshot !== "function") throw new Error("Steam Input pump requires snapshot()");
  if (typeof publish !== "function") throw new Error("Steam Input pump requires publish(frame)");
  if (typeof schedule !== "function") throw new Error("Steam Input pump requires a scheduler");
  if (typeof cancel !== "function") throw new Error("Steam Input pump requires scheduler cancellation");

  let active = false;
  let timer = null;
  let lastPublishedFrame;

  function poll() {
    timer = null;
    if (!active) return;
    const frame = snapshot();
    if (lastPublishedFrame !== undefined && !inputFramesEqual(frame, lastPublishedFrame)) {
      publish(frame);
      lastPublishedFrame = frame;
    } else if (lastPublishedFrame === undefined && frame !== null) {
      publish(frame);
      lastPublishedFrame = frame;
    }
    timer = schedule(poll, frame === null ? DISCONNECTED_POLL_MS : CONNECTED_POLL_MS);
  }

  function requestPoll() {
    if (!active) return;
    if (timer !== null) cancel(timer);
    timer = schedule(poll, 0);
  }

  function start() {
    if (active) return;
    active = true;
    requestPoll();
  }

  function stop() {
    active = false;
    if (timer !== null) cancel(timer);
    timer = null;
  }

  return Object.freeze({ requestPoll, start, stop });
}

function inputFramesEqual(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.connected === right.connected &&
    left.id === right.id &&
    left.index === right.index &&
    left.inputType === right.inputType &&
    numberArraysEqual(left.axes, right.axes) &&
    numberArraysEqual(left.buttons, right.buttons);
}

function numberArraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

module.exports = {
  CONNECTED_POLL_MS,
  DISCONNECTED_POLL_MS,
  createSteamInputPump,
  inputFramesEqual
};
