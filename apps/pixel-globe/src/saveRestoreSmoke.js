const SAVE_RESTORE_SMOKE_PARAMETER = "saveRestoreSmoke";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function saveRestoreSmokeEnabled(location) {
  if (!location || typeof location.search !== "string" || typeof location.hostname !== "string") {
    throw new Error("Save-restore smoke mode requires a browser location");
  }
  const value = new URLSearchParams(location.search).get(SAVE_RESTORE_SMOKE_PARAMETER);
  if (value === null) return false;
  if (value !== "1") throw new Error(`Invalid save-restore smoke mode: ${value}`);
  if (!LOCAL_HOSTNAMES.has(location.hostname)) {
    throw new Error("Save-restore smoke mode is restricted to the local test host");
  }
  return true;
}
