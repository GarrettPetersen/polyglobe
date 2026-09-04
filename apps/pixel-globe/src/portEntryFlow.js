export function recoveringPortBlocksArrival({
  entryStatus,
  recoveryStatus,
  attackStatus,
  conquestStatus
}) {
  if (!recoveryStatus) return false;
  if (!entryStatus || typeof entryStatus.hostile !== "boolean") {
    throw new Error("Recovering-port entry requires a diplomatic entry status");
  }
  if (!attackStatus || typeof attackStatus.commissioned !== "boolean") {
    throw new Error("Recovering-port entry requires a port attack status");
  }
  if (!conquestStatus || typeof conquestStatus.playerAssaultActive !== "boolean") {
    throw new Error("Recovering-port entry requires a conquest status");
  }
  return !entryStatus.hostile &&
    !attackStatus.commissioned &&
    !conquestStatus.playerAssaultActive;
}

export function resolvePortDialogueContinuation({
  requestedNodeId,
  admittedToPort,
  arrivalGreetingPresented = false,
  entryStatus,
  recoveryStatus,
  attackStatus,
  conquestStatus
}) {
  if (typeof requestedNodeId !== "string" || requestedNodeId === "") {
    throw new Error("Port continuation requires a dialogue node");
  }
  if (typeof admittedToPort !== "boolean") {
    throw new Error("Port continuation requires an admitted state");
  }
  if (typeof arrivalGreetingPresented !== "boolean") {
    throw new Error("Port continuation requires an arrival-greeting state");
  }
  const continuationNodeId = resolvePortArrivalDialogueNode({
    requestedNodeId,
    arrivalGreetingPresented
  });
  if (continuationNodeId !== "barred") return continuationNodeId;
  if (!entryStatus || typeof entryStatus.hostile !== "boolean") {
    throw new Error("Barred-port continuation requires a diplomatic entry status");
  }
  if (!attackStatus || typeof attackStatus.commissioned !== "boolean") {
    throw new Error("Barred-port continuation requires a port attack status");
  }
  if (!conquestStatus || typeof conquestStatus.canAttempt !== "boolean" ||
      typeof conquestStatus.playerAssaultActive !== "boolean") {
    throw new Error("Barred-port continuation requires a conquest status");
  }
  if (recoveringPortBlocksArrival({
    entryStatus,
    recoveryStatus,
    attackStatus,
    conquestStatus
  })) {
    return "recovering";
  }
  if (entryStatus.hostile || attackStatus.commissioned || conquestStatus.canAttempt ||
      conquestStatus.playerAssaultActive) {
    return "barred";
  }
  return admittedToPort
    ? "root"
    : resolvePortArrivalDialogueNode({
        requestedNodeId: "greeting",
        arrivalGreetingPresented
      });
}

export function resolvePortArrivalDialogueNode({
  requestedNodeId,
  arrivalGreetingPresented = false
}) {
  if (typeof requestedNodeId !== "string" || requestedNodeId === "") {
    throw new Error("Port arrival node resolution requires a dialogue node");
  }
  if (typeof arrivalGreetingPresented !== "boolean") {
    throw new Error("Port arrival node resolution requires a greeting state");
  }
  return requestedNodeId === "greeting" && arrivalGreetingPresented
    ? "root"
    : requestedNodeId;
}
