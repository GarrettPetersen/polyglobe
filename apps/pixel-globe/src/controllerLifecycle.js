export const CONTROLLER_DISCONNECT_PAUSE_DELAY_MS = 750;

export function createControllerConnectionMonitor() {
  return {
    connectedBefore: false,
    missingSinceMs: null,
    disconnectReported: false
  };
}

export function observeControllerConnection(monitor, {
  connected,
  nowMs,
  disconnectDelayMs = CONTROLLER_DISCONNECT_PAUSE_DELAY_MS
}) {
  validateMonitor(monitor);
  if (typeof connected !== "boolean" || !Number.isFinite(nowMs) || nowMs < 0 ||
      !Number.isFinite(disconnectDelayMs) || disconnectDelayMs < 0) {
    throw new Error("Invalid controller connection observation");
  }
  if (connected) {
    const newlyConnected = !monitor.connectedBefore;
    monitor.connectedBefore = true;
    monitor.missingSinceMs = null;
    monitor.disconnectReported = false;
    return newlyConnected ? "connected" : null;
  }
  if (!monitor.connectedBefore || monitor.disconnectReported) return null;
  if (monitor.missingSinceMs === null) monitor.missingSinceMs = nowMs;
  if (nowMs - monitor.missingSinceMs < disconnectDelayMs) return null;
  monitor.disconnectReported = true;
  monitor.connectedBefore = false;
  return "disconnected";
}

function validateMonitor(monitor) {
  if (!monitor || typeof monitor.connectedBefore !== "boolean" ||
      (monitor.missingSinceMs !== null && !Number.isFinite(monitor.missingSinceMs)) ||
      typeof monitor.disconnectReported !== "boolean") {
    throw new Error("Invalid controller connection monitor");
  }
}
