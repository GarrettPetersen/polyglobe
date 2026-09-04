const EXPLICIT_DEFERRAL_LABELS = new Set([
  "decline",
  "not now",
  "not yet"
]);

const DISMISSAL_LABELS = new Set([
  ...EXPLICIT_DEFERRAL_LABELS,
  "back",
  "leave",
  "refuse",
  "turn away"
]);

const DIALOGUE_TEXT_TONES = new Set([
  "danger",
  "ink",
  "muted",
  "success"
]);

export function validateDialogueDecision(view, contextLabel) {
  if (!view || !Array.isArray(view.options) || view.options.length === 0) {
    throw new Error(`${contextLabel} requires at least one dialogue option`);
  }
  validateTextTone(view.bodyTone, "body", contextLabel);
  validateTextTone(view.feedbackTone, "feedback", contextLabel);
  const options = view.options.map((entry, index) => validateOption(entry, index, contextLabel));
  if (!options.some((entry) => EXPLICIT_DEFERRAL_LABELS.has(entry.normalizedLabel))) {
    return view;
  }

  const progressOptions = options.filter((entry) => !DISMISSAL_LABELS.has(entry.normalizedLabel));
  if (progressOptions.length === 0) {
    throw new Error(
      `${contextLabel} offers only a deferral; add an enabled quest action or a disabled action with its unmet requirements`
    );
  }
  for (const entry of progressOptions) {
    if (entry.option.disabled === true &&
        (typeof entry.option.disabledReason !== "string" || entry.option.disabledReason.trim() === "")) {
      throw new Error(`${contextLabel} disables "${entry.option.label}" without explaining its unmet requirements`);
    }
  }
  return view;
}

function validateOption(option, index, contextLabel) {
  if (!option || typeof option.label !== "string" || option.label.trim() === "") {
    throw new Error(`${contextLabel} has an invalid dialogue option at index ${index}`);
  }
  if (!option.action || typeof option.action.type !== "string" || option.action.type === "") {
    throw new Error(`${contextLabel} option "${option.label}" requires an action`);
  }
  validateTextTone(option.detailTone, `option "${option.label}" detail`, contextLabel);
  return {
    option,
    normalizedLabel: option.label.trim().toLowerCase()
  };
}

function validateTextTone(tone, fieldLabel, contextLabel) {
  if (tone === undefined || tone === null) return;
  if (!DIALOGUE_TEXT_TONES.has(tone)) {
    throw new Error(`${contextLabel} has an unknown ${fieldLabel} text tone: ${tone}`);
  }
}
