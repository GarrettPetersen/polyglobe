export function restoreOrRecreateDerivedSaveState({ label, current, recreate, restore }) {
  if (typeof label !== "string" || label.trim() === "") {
    throw new Error("Derived save recovery requires a label");
  }
  if (!current || typeof current !== "object") {
    throw new Error(`${label} save recovery requires current state`);
  }
  if (typeof recreate !== "function" || typeof restore !== "function") {
    throw new Error(`${label} save recovery requires recreate and restore functions`);
  }

  try {
    restore(current);
    return Object.freeze({ value: current, recovered: false, error: null });
  } catch (value) {
    const error = value instanceof Error ? value : new Error(String(value));
    return Object.freeze({ value: recreate(), recovered: true, error });
  }
}
