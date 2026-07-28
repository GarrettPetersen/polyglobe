export function createQuestCargoDeliveryMemory() {
  return {};
}

export function validateQuestCargoDeliveryMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Quest cargo deliveries must be an object");
  }
  for (const [requirementId, quantity] of Object.entries(memory)) {
    assertRequirementId(requirementId);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid delivered quest cargo: ${requirementId}=${quantity}`);
    }
  }
  return memory;
}

export function questCargoDeliveryProgress(state, requirementId, requiredQuantity) {
  assertRequirementId(requirementId);
  assertRequiredQuantity(requiredQuantity);
  const memory = questCargoDeliveryMemory(state);
  const deliveredQuantity = memory[requirementId] || 0;
  if (deliveredQuantity > requiredQuantity) {
    throw new Error(
      `Quest cargo delivery exceeds requirement: ${requirementId} ` +
      `${deliveredQuantity}/${requiredQuantity}`
    );
  }
  const remainingQuantity = requiredQuantity - deliveredQuantity;
  return Object.freeze({
    requirementId,
    requiredQuantity,
    deliveredQuantity,
    remainingQuantity,
    complete: remainingQuantity === 0
  });
}

export function recordQuestCargoDelivery(
  state,
  requirementId,
  deliveredQuantity,
  requiredQuantity
) {
  if (!Number.isInteger(deliveredQuantity) || deliveredQuantity <= 0) {
    throw new Error(`Invalid quest cargo delivery quantity: ${deliveredQuantity}`);
  }
  const progress = questCargoDeliveryProgress(state, requirementId, requiredQuantity);
  if (deliveredQuantity > progress.remainingQuantity) {
    throw new Error(
      `Quest cargo delivery exceeds remaining requirement: ${requirementId} ` +
      `${deliveredQuantity}/${progress.remainingQuantity}`
    );
  }
  questCargoDeliveryMemory(state)[requirementId] =
    progress.deliveredQuantity + deliveredQuantity;
  return questCargoDeliveryProgress(state, requirementId, requiredQuantity);
}

export function questCargoDeliverableQuantity(state, requirementId, requiredQuantity, heldQuantity) {
  if (!Number.isFinite(heldQuantity) || heldQuantity < 0) {
    throw new Error(`Invalid held quest cargo quantity: ${heldQuantity}`);
  }
  const progress = questCargoDeliveryProgress(state, requirementId, requiredQuantity);
  return Math.min(Math.floor(heldQuantity), progress.remainingQuantity);
}

function questCargoDeliveryMemory(state) {
  return validateQuestCargoDeliveryMemory(state?.memory?.quests?.cargoDeliveries);
}

function assertRequirementId(requirementId) {
  if (typeof requirementId !== "string" || requirementId.trim() === "") {
    throw new Error(`Invalid quest cargo requirement id: ${requirementId}`);
  }
}

function assertRequiredQuantity(requiredQuantity) {
  if (!Number.isInteger(requiredQuantity) || requiredQuantity <= 0) {
    throw new Error(`Invalid required quest cargo quantity: ${requiredQuantity}`);
  }
}
