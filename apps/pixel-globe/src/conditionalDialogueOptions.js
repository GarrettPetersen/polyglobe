export function dialogueOption({ label, onSelect, iconId = null }) {
  if (typeof label !== "string" || label.trim() === "") {
    throw new Error("Dialogue option requires a label");
  }
  if (typeof onSelect !== "function") {
    throw new Error(`Dialogue option requires an action: ${label}`);
  }
  if (iconId !== null && (typeof iconId !== "string" || iconId.trim() === "")) {
    throw new Error(`Dialogue option has an invalid icon: ${label}`);
  }
  return Object.freeze({ label, onSelect, iconId });
}

export function conditionalDialogueOption(condition, details) {
  if (typeof condition !== "boolean") {
    throw new Error(`Conditional dialogue option requires a boolean condition: ${condition}`);
  }
  return condition ? dialogueOption(details) : null;
}

export function availableDialogueOptions(options) {
  if (!Array.isArray(options)) throw new Error("Available dialogue options require an array");
  const available = options.filter((entry) => entry !== null);
  if (available.length < 2 || available.length > 3) {
    throw new Error(`Choice dialogue requires two or three available options: ${available.length}`);
  }
  return Object.freeze(available);
}
