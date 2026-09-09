export const ACTIVE_QUEST_SLOTS = Object.freeze(["active", "passengerActive", "envoyActive", "captureActive"]);

export function activeQuests(quests) {
  return ACTIVE_QUEST_SLOTS.map(slot => quests?.[slot]).filter(Boolean);
}

export function activeQuestById(quests, questId) {
  return activeQuests(quests).find(quest => quest.id === questId) || null;
}
