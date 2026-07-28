export function createFixedRateScheduler(systemSpecs) {
  if (!Array.isArray(systemSpecs) || systemSpecs.length === 0) {
    throw new Error("Fixed-rate scheduler requires at least one system");
  }
  const systems = new Map();
  for (const spec of systemSpecs) {
    const system = validatedSystem(spec);
    if (systems.has(system.id)) {
      throw new Error(`Fixed-rate scheduler has duplicate system: ${system.id}`);
    }
    systems.set(system.id, system);
  }

  function advance(dt, context = null) {
    if (!Number.isFinite(dt) || dt < 0) {
      throw new Error(`Fixed-rate scheduler received invalid delta: ${dt}`);
    }
    const results = new Map();
    for (const system of systems.values()) {
      system.accumulator = Math.min(
        system.intervalSeconds * system.maxAccumulatedSteps,
        system.accumulator + dt
      );
      let steps = 0;
      let changed = false;
      while (system.accumulator + 1e-12 >= system.intervalSeconds &&
             steps < system.maxStepsPerAdvance) {
        system.accumulator -= system.intervalSeconds;
        changed = Boolean(system.update(system.intervalSeconds, context)) || changed;
        steps += 1;
      }
      results.set(system.id, Object.freeze({ steps, changed }));
    }
    return results;
  }

  function reset(id = null) {
    if (id !== null) {
      const system = systems.get(id);
      if (!system) throw new Error(`Cannot reset unknown scheduled system: ${id}`);
      system.accumulator = -system.phaseSeconds;
      return;
    }
    for (const system of systems.values()) system.accumulator = -system.phaseSeconds;
  }

  return Object.freeze({
    advance,
    reset,
    intervalSeconds: (id) => {
      const system = systems.get(id);
      if (!system) throw new Error(`Unknown scheduled system: ${id}`);
      return system.intervalSeconds;
    }
  });
}

function validatedSystem(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("Scheduled system must be an object");
  }
  if (typeof spec.id !== "string" || spec.id.length === 0) {
    throw new Error("Scheduled system requires a non-empty string id");
  }
  if (typeof spec.update !== "function") {
    throw new Error(`Scheduled system ${spec.id} requires an update function`);
  }
  const intervalSeconds = spec.intervalSeconds ??
    (Number.isFinite(spec.hz) && spec.hz > 0 ? 1 / spec.hz : Number.NaN);
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    throw new Error(`Scheduled system ${spec.id} has invalid interval: ${intervalSeconds}`);
  }
  const maxStepsPerAdvance = spec.maxStepsPerAdvance ?? 1;
  const maxAccumulatedSteps = spec.maxAccumulatedSteps ?? maxStepsPerAdvance;
  const phaseSeconds = spec.phaseSeconds ?? 0;
  if (!Number.isInteger(maxStepsPerAdvance) || maxStepsPerAdvance <= 0) {
    throw new Error(`Scheduled system ${spec.id} has invalid step limit: ${maxStepsPerAdvance}`);
  }
  if (!Number.isInteger(maxAccumulatedSteps) || maxAccumulatedSteps < maxStepsPerAdvance) {
    throw new Error(
      `Scheduled system ${spec.id} has invalid accumulated-step limit: ${maxAccumulatedSteps}`
    );
  }
  if (!Number.isFinite(phaseSeconds) || phaseSeconds < 0 || phaseSeconds >= intervalSeconds) {
    throw new Error(`Scheduled system ${spec.id} has invalid phase: ${phaseSeconds}`);
  }
  return {
    id: spec.id,
    intervalSeconds,
    maxStepsPerAdvance,
    maxAccumulatedSteps,
    phaseSeconds,
    update: spec.update,
    accumulator: -phaseSeconds
  };
}
