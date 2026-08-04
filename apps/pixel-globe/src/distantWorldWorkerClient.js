export function createDistantWorldWorkerClient({
  workerUrl,
  onDue,
  onError,
  WorkerClass = globalThis.Worker
}) {
  if (!(workerUrl instanceof URL)) throw new Error("Distant-world worker client requires a URL");
  if (typeof onDue !== "function" || typeof onError !== "function") {
    throw new Error("Distant-world worker client requires due and error handlers");
  }
  if (typeof WorkerClass !== "function") {
    throw new Error("This browser does not support the required distant-world Web Worker");
  }
  const worker = new WorkerClass(workerUrl, { type: "module", name: "distant-world" });
  let generation = 0;
  let requestId = 0;
  let ready = false;
  let inFlight = false;
  let nextMinute = Infinity;
  let latestClockMinute = 0;
  let disposed = false;

  worker.addEventListener("message", (event) => {
    const message = event.data;
    if (disposed || !message || message.generation !== generation) return;
    if (message.type === "error") {
      inFlight = false;
      onError(workerError(message));
      return;
    }
    if (message.type === "ready") {
      ready = true;
      inFlight = false;
      nextMinute = validatedNextMinute(message.nextMinute);
      return;
    }
    if (message.type === "due") {
      inFlight = false;
      const result = validateDueResult(message.result);
      nextMinute = result.nextMinute === null ? Infinity : result.nextMinute;
      if (result.due) onDue(result);
      return;
    }
    onError(new Error(`Distant-world worker returned an unknown message: ${message.type}`));
  });
  worker.addEventListener("error", (event) => {
    onError(new Error(`Distant-world worker failed: ${event.message || "unknown worker error"}`));
  });
  worker.addEventListener("messageerror", () => {
    onError(new Error("Distant-world worker could not deserialize a message"));
  });

  function reset(schedule, clockMinute, simulation) {
    if (disposed) throw new Error("Cannot reset a disposed distant-world worker");
    if (!Number.isFinite(clockMinute) || clockMinute < 0) {
      throw new Error(`Invalid distant-world reset minute: ${clockMinute}`);
    }
    if (!simulation || typeof simulation !== "object") {
      throw new Error("Distant-world reset requires a portable simulation state");
    }
    generation += 1;
    ready = false;
    inFlight = true;
    nextMinute = Infinity;
    latestClockMinute = clockMinute;
    worker.postMessage({ type: "reset", generation, schedule, simulation });
  }

  function requestAdvance(clockMinute, runtimeFactory) {
    if (disposed) return false;
    if (!Number.isFinite(clockMinute) || clockMinute < 0) {
      throw new Error(`Invalid distant-world advance minute: ${clockMinute}`);
    }
    latestClockMinute = Math.max(latestClockMinute, clockMinute);
    if (!ready || inFlight || latestClockMinute + 1e-9 < nextMinute) return false;
    if (typeof runtimeFactory !== "function") {
      throw new Error("Distant-world advance requires a runtime-state factory");
    }
    inFlight = true;
    requestId += 1;
    worker.postMessage({
      type: "advance",
      generation,
      requestId,
      clockMinute: latestClockMinute,
      runtime: runtimeFactory()
    });
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    worker.terminate();
  }

  return Object.freeze({
    reset,
    requestAdvance,
    dispose,
    state: () => Object.freeze({ ready, inFlight, nextMinute, generation })
  });
}

function validatedNextMinute(value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Distant-world worker returned an invalid next minute: ${value}`);
  }
  return value;
}

function validateDueResult(result) {
  if (!result || typeof result !== "object" ||
      typeof result.due !== "boolean" ||
      typeof result.economy !== "boolean" ||
      typeof result.maintenance !== "boolean" ||
      !Array.isArray(result.shipIds) ||
      !Array.isArray(result.cartIds)) {
    throw new Error("Distant-world worker returned a malformed due result");
  }
  if (result.due && (!result.simulation || typeof result.simulation !== "object")) {
    throw new Error("Distant-world worker omitted a due simulation result");
  }
  if (!result.due || result.nextMinute !== null) {
    validatedNextMinute(result.nextMinute);
  }
  return Object.freeze({
    due: result.due,
    economy: result.economy,
    maintenance: result.maintenance,
    shipIds: Object.freeze([...result.shipIds]),
    cartIds: Object.freeze([...result.cartIds]),
    nextMinute: result.nextMinute,
    simulation: result.simulation || null
  });
}

function workerError(message) {
  const error = new Error(`Distant-world worker error: ${message.message || "unknown error"}`);
  if (typeof message.stack === "string" && message.stack.length > 0) error.stack = message.stack;
  return error;
}
