export function openNextPortArrivalFollowup(openers) {
  if (!Array.isArray(openers) || openers.length === 0) {
    throw new Error("Port arrival follow-up queue requires at least one opener");
  }
  for (const [index, opener] of openers.entries()) {
    if (typeof opener !== "function") {
      throw new Error(`Port arrival follow-up opener ${index} is not a function`);
    }
    const opened = opener();
    if (typeof opened !== "boolean") {
      throw new Error(`Port arrival follow-up opener ${index} did not return a boolean`);
    }
    if (opened) return true;
  }
  return false;
}
