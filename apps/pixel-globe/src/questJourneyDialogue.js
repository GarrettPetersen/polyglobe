const DEFAULT_MINIMUM_LEG_FRACTION = 0.3;
export const QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER = "destination-closer";

export function pendingQuestJourneyDialogue(quest, context = {}) {
  const events = quest?.dialogue?.journeyEvents;
  if (events === undefined) return null;
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error(`Quest journey dialogue requires a non-empty event list: ${quest?.id}`);
  }
  const seenIds = new Set(quest.journeyDialogueSeenIds || []);
  const event = events.find((candidate) => !seenIds.has(candidate.id)) || null;
  if (!event) return null;
  assertJourneyDialogueEvent(event, quest.id);
  if (context.arrived === true) return event;

  const { originDistance, destinationDistance, directDistance } = context;
  if (
    !Number.isFinite(originDistance) ||
    !Number.isFinite(destinationDistance) ||
    !Number.isFinite(directDistance) ||
    directDistance <= 0
  ) {
    throw new Error(`Quest journey dialogue requires route distances: ${quest.id}`);
  }
  if (event.trigger === QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER) {
    return destinationDistance < originDistance ? event : null;
  }
  const originFraction = event.minimumOriginFraction ?? DEFAULT_MINIMUM_LEG_FRACTION;
  const destinationFraction = event.minimumDestinationFraction ?? DEFAULT_MINIMUM_LEG_FRACTION;
  return originDistance >= directDistance * originFraction &&
    destinationDistance >= directDistance * destinationFraction
    ? event
    : null;
}

export function markQuestJourneyDialogueSeen(quest, eventId) {
  const events = quest?.dialogue?.journeyEvents;
  const event = Array.isArray(events)
    ? events.find((candidate) => candidate.id === eventId)
    : null;
  if (!event) throw new Error(`Cannot mark unknown quest journey dialogue: ${eventId}`);
  const seenIds = new Set(quest.journeyDialogueSeenIds || []);
  seenIds.add(eventId);
  quest.journeyDialogueSeenIds = [...seenIds];
  return quest;
}

function assertJourneyDialogueEvent(event, questId) {
  if (
    !event ||
    typeof event.id !== "string" ||
    event.id === "" ||
    typeof event.text !== "string" ||
    event.text === "" ||
    typeof event.expressionId !== "string" ||
    event.expressionId === ""
  ) {
    throw new Error(`Invalid quest journey dialogue event: ${questId}`);
  }
  if (
    event.trigger !== undefined &&
    event.trigger !== QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER
  ) {
    throw new Error(`Invalid quest journey dialogue trigger: ${questId}`);
  }
  if (event.choices !== undefined) {
    if (!Array.isArray(event.choices) || event.choices.length !== 2 || event.choices.some((choice) => (
      !choice ||
      typeof choice.id !== "string" || choice.id === "" ||
      typeof choice.label !== "string" || choice.label === ""
    ))) {
      throw new Error(`Quest journey dialogue choices must be a binary decision: ${questId}`);
    }
    if (new Set(event.choices.map((choice) => choice.id)).size !== event.choices.length) {
      throw new Error(`Quest journey dialogue choice ids must be unique: ${questId}`);
    }
  }
  for (const [label, value] of [
    ["minimumOriginFraction", event.minimumOriginFraction],
    ["minimumDestinationFraction", event.minimumDestinationFraction]
  ]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)) {
      throw new Error(`Invalid ${label} for quest journey dialogue: ${questId}`);
    }
  }
}
