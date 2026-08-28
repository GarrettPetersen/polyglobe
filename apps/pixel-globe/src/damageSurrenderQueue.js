const DAMAGE_SURRENDER_CAUSES = new Set(["accidental", "self-defense", "deliberate"]);

export function enqueueDamageSurrenderDecision(queue, decision) {
  assertQueue(queue);
  assertDecision(decision);
  const existing = queue.find((entry) => entry.npcShipId === decision.npcShipId);
  if (existing) {
    if (existing.cause !== decision.cause) {
      throw new Error(
        `Queued damage surrender changed cause for ${decision.npcShipId}: ` +
          `${existing.cause}/${decision.cause}`
      );
    }
    return false;
  }
  queue.push(Object.freeze({ ...decision }));
  return true;
}

export function pendingDamageSurrenderDecision(queue) {
  assertQueue(queue);
  return queue[0] || null;
}

export function consumeDamageSurrenderDecision(queue, npcShipId) {
  assertQueue(queue);
  if (typeof npcShipId !== "string" || npcShipId.length === 0) {
    throw new Error(`Damage surrender consumption requires a ship id: ${npcShipId}`);
  }
  const decision = queue[0];
  if (!decision || decision.npcShipId !== npcShipId) {
    throw new Error(`Damage surrender queue is not headed by ${npcShipId}`);
  }
  queue.shift();
  return decision;
}

export function clearDamageSurrenderDecisions(queue) {
  assertQueue(queue);
  queue.length = 0;
}

function assertQueue(queue) {
  if (!Array.isArray(queue)) throw new Error("Damage surrender decisions require an array queue");
  for (const decision of queue) assertDecision(decision);
}

function assertDecision(decision) {
  if (!decision || typeof decision.npcShipId !== "string" || decision.npcShipId.length === 0) {
    throw new Error("Damage surrender decision requires an NPC ship id");
  }
  if (!DAMAGE_SURRENDER_CAUSES.has(decision.cause)) {
    throw new Error(`Invalid queued damage surrender cause: ${decision.cause}`);
  }
}
