export function fetchQuestRequirements({
  colonization = null,
  japaneseMatchlocks = null,
  japaneseMatchlockPort = null,
  viking = null,
  vikingPort = null
} = {}) {
  const requirements = [];

  if (colonization?.target) {
    if (colonization.stage === "fetch" && colonization.fetchStage && colonization.origin) {
      requirements.push(requirement({
        id: `colonization:fetch:${colonization.fetchStage.id}`,
        questId: "colonization",
        stageId: colonization.fetchStage.id,
        good: colonization.fetchStage,
        held: colonization.held,
        destination: colonization.origin
      }));
    } else if (colonization.stage === "outbound" && colonization.approval &&
        colonization.approvalGranted !== true) {
      for (const cargo of colonization.approvalCargo) {
        requirements.push(requirement({
          id: `colonization:approval:${cargo.goodId}`,
          questId: "colonization",
          stageId: "approval",
          good: cargo,
          held: cargo.held,
          destination: colonization.approval,
          routeReady: colonization.approvalCargoReady
        }));
      }
    } else if (colonization.stage === "awaiting-resupply" && colonization.leftSinceFounding) {
      requirements.push(requirement({
        id: `colonization:resupply:${colonization.resupply.goodId}`,
        questId: "colonization",
        stageId: "resupply",
        good: colonization.resupply,
        held: colonization.resupplyHeld,
        destination: colonization.target
      }));
    }
  }

  if (viking?.stage && vikingPort) {
    requirements.push(requirement({
      id: `viking-longship:${viking.stage.id}`,
      questId: "viking-longship",
      stageId: viking.stage.id,
      good: viking.stage,
      held: viking.held,
      destination: vikingPort
    }));
  }

  if (japaneseMatchlocks?.fetchStage && japaneseMatchlockPort) {
    requirements.push(requirement({
      id: `japanese-matchlocks:${japaneseMatchlocks.fetchStage.id}`,
      questId: "japanese-matchlocks",
      stageId: japaneseMatchlocks.fetchStage.id,
      good: japaneseMatchlocks.fetchStage,
      held: japaneseMatchlocks.held,
      destination: japaneseMatchlockPort
    }));
  }

  return Object.freeze(requirements);
}

export function readyFetchQuestDestinations(requirements) {
  if (!Array.isArray(requirements)) throw new Error("Fetch quest destinations require an array");
  const destinations = new Map();
  for (const entry of requirements) {
    if (!entry.routeReady) continue;
    const key = `${entry.questId}:${entry.destination.tileId}`;
    const existing = destinations.get(key);
    if (existing) {
      existing.requirementIds.push(entry.id);
      continue;
    }
    destinations.set(key, {
      id: key,
      questId: entry.questId,
      destination: entry.destination,
      requirementIds: [entry.id]
    });
  }
  return Object.freeze([...destinations.values()].map((entry) => Object.freeze({
    ...entry,
    requirementIds: Object.freeze(entry.requirementIds)
  })));
}

export function advanceFetchQuestReadiness(previous, requirements) {
  if (!(previous instanceof Map)) throw new Error("Fetch quest readiness requires a Map");
  if (!Array.isArray(requirements)) throw new Error("Fetch quest readiness requires an array");
  const next = new Map();
  const newlyReady = [];
  for (const entry of requirements) {
    const ready = entry.held >= entry.quantity;
    if (ready && previous.get(entry.id) !== true) newlyReady.push(entry);
    next.set(entry.id, ready);
  }
  return Object.freeze({ next, newlyReady: Object.freeze(newlyReady) });
}

function requirement({ id, questId, stageId, good, held, destination, routeReady = null }) {
  if (!good || typeof good.goodId !== "string" || typeof good.goodLabel !== "string" ||
      !Number.isInteger(good.quantity) || good.quantity <= 0) {
    throw new Error(`Invalid fetch quest good: ${id}`);
  }
  if (!Number.isFinite(held) || held < 0) throw new Error(`Invalid fetch quest cargo held: ${id}`);
  if (!destination || !Number.isInteger(destination.tileId) || typeof destination.city !== "string") {
    throw new Error(`Invalid fetch quest destination: ${id}`);
  }
  const ready = held >= good.quantity;
  return Object.freeze({
    id,
    questId,
    stageId,
    goodId: good.goodId,
    goodLabel: good.goodLabel,
    quantity: good.quantity,
    held,
    ready,
    routeReady: routeReady === null ? ready : Boolean(routeReady),
    destination: Object.freeze({ ...destination })
  });
}
