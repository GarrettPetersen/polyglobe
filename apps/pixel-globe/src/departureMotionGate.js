export function createDepartureMotionGate() {
  return { active: false };
}

export function activateDepartureMotionGate(gate) {
  validateDepartureMotionGate(gate);
  gate.active = true;
  return gate;
}

export function departureMotionInputIsBlocked(gate, steeringActive) {
  validateDepartureMotionGate(gate);
  if (typeof steeringActive !== "boolean") {
    throw new Error("Departure motion gate requires a boolean steering state");
  }
  if (!gate.active) return false;
  if (!steeringActive) return true;
  gate.active = false;
  return false;
}

export function departureMotionGateIsActive(gate) {
  validateDepartureMotionGate(gate);
  return gate.active;
}

function validateDepartureMotionGate(gate) {
  if (!gate || typeof gate !== "object" || typeof gate.active !== "boolean") {
    throw new Error("Invalid departure motion gate state");
  }
}
