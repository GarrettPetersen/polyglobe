import { questCargoDeliverableQuantity, questCargoDeliveryProgress } from "./questCargoDeliveries.js";

export const EXETER_CITY_ID = "exeter|united kingdom";
export const TOPSHAM_CITY_ID = "topsham|united kingdom";
export const EXETER_CANAL_STAGE_MINUTES = 30 * 24 * 60;
export const EXETER_CANAL_STAGE_COUNT = 3;
export const EXETER_CANAL_MATERIALS = Object.freeze([
  Object.freeze({ goodId: "timber", quantity: 30, requirementId: "exeter-canal.timber" }),
  Object.freeze({ goodId: "iron", quantity: 12, requirementId: "exeter-canal.iron" }),
  Object.freeze({ goodId: "grain", quantity: 20, requirementId: "exeter-canal.grain" })
]);

export function createExeterCanalMemory() {
  return { version: 1, accepted: false, startedMinute: null };
}

export function validateExeterCanalMemory(memory) {
  if (!memory || memory.version !== 1 || typeof memory.accepted !== "boolean" ||
      (memory.startedMinute !== null && (!Number.isInteger(memory.startedMinute) || memory.startedMinute < 0)) ||
      (!memory.accepted && memory.startedMinute !== null)) {
    throw new Error("Invalid Exeter canal quest memory");
  }
  return memory;
}

export function exeterCanalStage(memory, currentMinute) {
  validateExeterCanalMemory(memory);
  if (!Number.isFinite(currentMinute) || currentMinute < 0) throw new Error("Invalid Exeter canal clock");
  if (memory.startedMinute === null) return 0;
  if (currentMinute < memory.startedMinute) throw new Error("Exeter canal starts after the current clock");
  return Math.min(EXETER_CANAL_STAGE_COUNT, Math.floor((currentMinute - memory.startedMinute) / EXETER_CANAL_STAGE_MINUTES));
}

export function exeterCanalQuestView(state, city, currentMinute) {
  if (city?.cityId !== TOPSHAM_CITY_ID) return null;
  const memory = validateExeterCanalMemory(state.memory.quests.exeterCanal);
  const stage = exeterCanalStage(memory, currentMinute);
  const materials = EXETER_CANAL_MATERIALS.map((material) => ({
    ...material,
    held: state.cargo[material.goodId] || 0,
    ...questCargoDeliveryProgress(state, material.requirementId, material.quantity),
    deliverableQuantity: questCargoDeliverableQuantity(state, material.requirementId, material.quantity, state.cargo[material.goodId] || 0)
  }));
  return {
    accepted: memory.accepted,
    building: memory.startedMinute !== null && stage < EXETER_CANAL_STAGE_COUNT,
    complete: stage === EXETER_CANAL_STAGE_COUNT,
    stage,
    materials,
    canDeliver: memory.accepted && memory.startedMinute === null && materials.some((material) => material.deliverableQuantity > 0),
    daysRemaining: memory.startedMinute === null ? null : Math.max(0, Math.ceil(
      (memory.startedMinute + EXETER_CANAL_STAGE_COUNT * EXETER_CANAL_STAGE_MINUTES - currentMinute) / 1440
    ))
  };
}

export function acceptExeterCanalQuest(state, city, currentMinute) {
  const view = exeterCanalQuestView(state, city, currentMinute);
  if (!view || view.accepted) throw new Error("Exeter canal commission is not available here");
  state.memory.quests.exeterCanal.accepted = true;
}

export function startExeterCanalConstruction(state, city, currentMinute) {
  const view = exeterCanalQuestView(state, city, currentMinute);
  if (!view?.accepted || state.memory.quests.exeterCanal.startedMinute !== null ||
      !view.materials.every((material) => material.complete)) {
    throw new Error("Exeter canal construction requires all commissioned materials");
  }
  state.memory.quests.exeterCanal.startedMinute = Math.floor(currentMinute);
}

export function validateExeterCanalState(state) {
  const memory = validateExeterCanalMemory(state.memory.quests.exeterCanal);
  for (const material of EXETER_CANAL_MATERIALS) {
    const progress = questCargoDeliveryProgress(state, material.requirementId, material.quantity);
    if ((!memory.accepted && progress.deliveredQuantity > 0) ||
        (memory.startedMinute !== null && !progress.complete)) {
      throw new Error(`Exeter canal material history contradicts construction: ${material.goodId}`);
    }
  }
}
