export const HISTORICAL_BATTLE_DIALOGUE_KIND = "historical-battle";
export const HISTORICAL_BATTLE_DIALOGUE_OPENING = "opening";
export const HISTORICAL_BATTLE_DIALOGUE_CLOSING = "closing";

const OUTCOMES = Object.freeze(["victory", "defeat", "draw"]);

// The three quoted lines are short renderings of contemporary accounts. Ali's
// promise is addressed to an unnamed Christian oarsman, while Barbarigo's reply
// remains a single portrait because it addressed unnamed officers aboard. The
// remaining orders are conservative reconstructions of documented maneuvers.
const OPENING_STEPS = deepFreeze({
  "john-of-austria": [
    step("giovanni-andrea-doria", "john-of-austria", "historical.dialogue.opening.john.1"),
    step("john-of-austria", "giovanni-andrea-doria", "historical.dialogue.opening.john.2"),
    step("john-of-austria", "giovanni-andrea-doria", "historical.dialogue.opening.john.3")
  ],
  "agostino-barbarigo": [
    step("agostino-barbarigo", null, "historical.dialogue.opening.barbarigo.1"),
    step("agostino-barbarigo", null, "historical.dialogue.opening.barbarigo.2"),
    step("agostino-barbarigo", null, "historical.dialogue.opening.barbarigo.3")
  ],
  "giovanni-andrea-doria": [
    step("john-of-austria", "giovanni-andrea-doria", "historical.dialogue.opening.doria.1"),
    step("giovanni-andrea-doria", "john-of-austria", "historical.dialogue.opening.doria.2")
  ],
  "ali-pasha": [
    step("christian-oarsman", "ali-pasha", "historical.dialogue.opening.ali.rower"),
    step("ali-pasha", "christian-oarsman", "historical.dialogue.opening.ali.2"),
    step("mahomet-sirocco", "ali-pasha", "historical.dialogue.opening.ali.1"),
    step("ali-pasha", "mahomet-sirocco", "historical.dialogue.opening.ali.3")
  ],
  "mahomet-sirocco": [
    step("ali-pasha", "mahomet-sirocco", "historical.dialogue.opening.sirocco.1"),
    step("mahomet-sirocco", "ali-pasha", "historical.dialogue.opening.sirocco.2")
  ],
  "uluc-ali": [
    step("ali-pasha", "uluc-ali", "historical.dialogue.opening.uluc.1"),
    step("uluc-ali", "ali-pasha", "historical.dialogue.opening.uluc.2")
  ]
});

const CLOSING_COUNTERPART = Object.freeze({
  "john-of-austria": "giovanni-andrea-doria",
  "agostino-barbarigo": "john-of-austria",
  "giovanni-andrea-doria": "john-of-austria",
  "ali-pasha": "mahomet-sirocco",
  "mahomet-sirocco": "ali-pasha",
  "uluc-ali": "ali-pasha"
});

const CLOSING_TEXT_KEYS = deepFreeze({
  "john-of-austria": {
    victory: ["historical.dialogue.closing.john.victory", "historical.dialogue.closing.league.victory"],
    defeat: ["historical.dialogue.closing.john.defeat", "historical.dialogue.closing.league.defeat"],
    draw: ["historical.dialogue.closing.john.draw", "historical.dialogue.closing.league.draw"]
  },
  "agostino-barbarigo": {
    victory: ["historical.dialogue.closing.barbarigo.victory", "historical.dialogue.closing.league.victory"],
    defeat: ["historical.dialogue.closing.barbarigo.defeat", "historical.dialogue.closing.league.defeat"],
    draw: ["historical.dialogue.closing.barbarigo.draw", "historical.dialogue.closing.league.draw"]
  },
  "giovanni-andrea-doria": {
    victory: ["historical.dialogue.closing.doria.victory", "historical.dialogue.closing.league.victory"],
    defeat: ["historical.dialogue.closing.doria.defeat", "historical.dialogue.closing.league.defeat"],
    draw: ["historical.dialogue.closing.doria.draw", "historical.dialogue.closing.league.draw"]
  },
  "ali-pasha": {
    victory: ["historical.dialogue.closing.ali.victory", "historical.dialogue.closing.ottoman.victory"],
    defeat: ["historical.dialogue.closing.ali.defeat", "historical.dialogue.closing.ottoman.defeat"],
    draw: ["historical.dialogue.closing.ali.draw", "historical.dialogue.closing.ottoman.draw"]
  },
  "mahomet-sirocco": {
    victory: ["historical.dialogue.closing.sirocco.victory", "historical.dialogue.closing.ottoman.victory"],
    defeat: ["historical.dialogue.closing.sirocco.defeat", "historical.dialogue.closing.ottoman.defeat"],
    draw: ["historical.dialogue.closing.sirocco.draw", "historical.dialogue.closing.ottoman.draw"]
  },
  "uluc-ali": {
    victory: ["historical.dialogue.closing.uluc.victory", "historical.dialogue.closing.ottoman.victory"],
    defeat: ["historical.dialogue.closing.uluc.defeat", "historical.dialogue.closing.ottoman.defeat"],
    draw: ["historical.dialogue.closing.uluc.draw", "historical.dialogue.closing.ottoman.draw"]
  }
});

export function createHistoricalBattleDialogueSession({
  scenario,
  commanderId,
  phase,
  outcome = null
}) {
  assertScenario(scenario);
  const commander = commanderById(scenario, commanderId);
  let steps;
  if (phase === HISTORICAL_BATTLE_DIALOGUE_OPENING) {
    if (outcome !== null) throw new Error("Historical battle opening cannot have an outcome");
    steps = OPENING_STEPS[commanderId];
    if (!steps) throw new Error(`Historical battle commander has no opening dialogue: ${commanderId}`);
  } else if (phase === HISTORICAL_BATTLE_DIALOGUE_CLOSING) {
    if (!OUTCOMES.includes(outcome)) throw new Error(`Invalid historical battle outcome: ${outcome}`);
    const counterpartId = CLOSING_COUNTERPART[commanderId];
    const textKeys = CLOSING_TEXT_KEYS[commanderId]?.[outcome];
    if (!counterpartId || !textKeys) {
      throw new Error(`Historical battle commander has no closing dialogue: ${commanderId}`);
    }
    steps = [
      step(commanderId, counterpartId, textKeys[0]),
      step(counterpartId, commanderId, textKeys[1])
    ];
  } else {
    throw new Error(`Unknown historical battle dialogue phase: ${phase}`);
  }
  validateSteps(scenario, commander, steps);
  return {
    kind: HISTORICAL_BATTLE_DIALOGUE_KIND,
    scenarioId: scenario.id,
    commanderId,
    phase,
    outcome,
    steps,
    stepIndex: 0,
    selectedIndex: 0
  };
}

export function historicalBattleDialogueView(session, scenario, translate) {
  assertSession(session, scenario);
  if (typeof translate !== "function") throw new Error("Historical battle dialogue needs translation");
  const entry = session.steps[session.stepIndex];
  const speaker = historicalBattleDialogueCharacter(scenario, entry.speakerId, translate);
  const lastStep = session.stepIndex === session.steps.length - 1;
  return {
    speaker: `${speaker.name}, ${speaker.historicalRole}`,
    expressionId: "neutral",
    topic: translate(scenario.titleKey),
    text: translate(entry.textKey),
    feedback: null,
    options: [{
      label: lastStep
        ? translate(session.phase === HISTORICAL_BATTLE_DIALOGUE_OPENING
          ? "historical.dialogue.beginBattle"
          : "historical.dialogue.seeResult")
        : translate("common.continue"),
      action: { type: "continue-historical-battle-dialogue" },
      iconId: lastStep
        ? (session.phase === HISTORICAL_BATTLE_DIALOGUE_OPENING
          ? "action:attack"
          : "action:quest")
        : "action:talk"
    }]
  };
}

export function historicalBattleDialogueParticipants(session, scenario, translate) {
  assertSession(session, scenario);
  if (typeof translate !== "function") throw new Error("Historical battle dialogue needs translation");
  const entry = session.steps[session.stepIndex];
  const counterpartId = entry.speakerId === session.commanderId
    ? entry.listenerId
    : entry.speakerId;
  return {
    leftCharacter: historicalBattleDialogueCharacter(scenario, session.commanderId, translate),
    rightCharacter: counterpartId
      ? historicalBattleDialogueCharacter(scenario, counterpartId, translate)
      : null,
    speakerCharacter: historicalBattleDialogueCharacter(scenario, entry.speakerId, translate)
  };
}

export function historicalBattleDialogueCharacter(scenario, participantId, translate) {
  const participant = participantById(scenario, participantId);
  return Object.freeze({
    id: `historical:${scenario.id}:${participant.id}`,
    name: translate(participant.nameKey || `historical.commander.${participant.id}`),
    role: "historical-character",
    historicalPortraitId: participant.id,
    historicalPortraitFacing: participant.portraitFacing,
    historicalRole: translate(participant.roleKey || "historical.dialogue.commanderRole")
  });
}

export function selectHistoricalBattleDialogueOption(
  session,
  optionIndex = session.selectedIndex
) {
  if (!session || session.kind !== HISTORICAL_BATTLE_DIALOGUE_KIND) {
    throw new Error("Historical battle dialogue session is invalid");
  }
  if (optionIndex !== 0) throw new Error(`Invalid historical dialogue option: ${optionIndex}`);
  if (session.stepIndex < session.steps.length - 1) {
    session.stepIndex += 1;
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  return {
    closed: true,
    action: {
      type: session.phase === HISTORICAL_BATTLE_DIALOGUE_OPENING
        ? "begin-historical-battle"
        : "show-historical-battle-result"
    }
  };
}

export function historicalBattleDialogueLocalizationKeys() {
  const keys = [
    "historical.dialogue.commanderRole",
    "historical.dialogue.oarsmanRole",
    "historical.character.christian-oarsman",
    "historical.dialogue.beginBattle",
    "historical.dialogue.seeResult"
  ];
  for (const steps of Object.values(OPENING_STEPS)) {
    for (const entry of steps) keys.push(entry.textKey);
  }
  for (const outcomeMap of Object.values(CLOSING_TEXT_KEYS)) {
    for (const outcome of OUTCOMES) keys.push(...outcomeMap[outcome]);
  }
  return Object.freeze([...new Set(keys)].sort());
}

function step(speakerId, listenerId, textKey) {
  return Object.freeze({ speakerId, listenerId, textKey });
}

function commanderById(scenario, commanderId) {
  assertScenario(scenario);
  const commander = scenario.selection.commanders.find((entry) => entry.id === commanderId);
  if (!commander) throw new Error(`Historical battle commander is missing: ${commanderId}`);
  return commander;
}

function participantById(scenario, participantId) {
  const participant = scenario.selection.commanders.find((entry) => entry.id === participantId) ||
    scenario.selection.supportingCharacters?.find((entry) => entry.id === participantId);
  if (!participant) throw new Error(`Historical battle participant is missing: ${participantId}`);
  return participant;
}

function validateSteps(scenario, selectedCommander, steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(`Historical battle dialogue is empty: ${selectedCommander.id}`);
  }
  for (const entry of steps) {
    const speaker = participantById(scenario, entry.speakerId);
    const listener = entry.listenerId ? participantById(scenario, entry.listenerId) : null;
    if (speaker.sideId !== selectedCommander.sideId ||
        (listener && listener.sideId !== selectedCommander.sideId)) {
      throw new Error(`Historical battle dialogue crosses enemy lines: ${entry.textKey}`);
    }
    if (listener && speaker.id === listener.id) {
      throw new Error(`Historical battle dialogue repeats one participant: ${entry.textKey}`);
    }
    if (!listener && speaker.id !== selectedCommander.id) {
      throw new Error(`Unpaired historical dialogue does not belong to the player: ${entry.textKey}`);
    }
  }
}

function assertSession(session, scenario) {
  assertScenario(scenario);
  if (!session || session.kind !== HISTORICAL_BATTLE_DIALOGUE_KIND ||
      session.scenarioId !== scenario.id || !Number.isInteger(session.stepIndex) ||
      session.stepIndex < 0 || session.stepIndex >= session.steps.length) {
    throw new Error("Historical battle dialogue session is invalid");
  }
}

function assertScenario(scenario) {
  if (!scenario?.id || typeof scenario.titleKey !== "string" ||
      !Array.isArray(scenario.selection?.commanders)) {
    throw new Error("Historical battle dialogue requires a scenario");
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const entry of Object.values(value)) deepFreeze(entry);
  return value;
}
