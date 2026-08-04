import { createDistantWorldEventQueue } from "./distantWorldEvents.js";
import { createDistantWorldSimulation } from "./distantWorldSimulation.js";

const queue = createDistantWorldEventQueue();
let simulation = null;

self.addEventListener("message", (event) => {
  const message = event.data;
  try {
    if (!message || typeof message !== "object") {
      throw new Error("Distant-world worker received a malformed message");
    }
    if (message.type === "reset") {
      simulation = createDistantWorldSimulation(message.simulation);
      self.postMessage({
        type: "ready",
        generation: message.generation,
        nextMinute: queue.reset(message.schedule)
      });
      return;
    }
    if (message.type === "advance") {
      if (!simulation) throw new Error("Distant-world worker advanced before reset");
      const due = queue.advance(message.clockMinute);
      let simulationResult = null;
      let nextMinute = due.nextMinute;
      if (due.due) {
        simulationResult = simulation.advance(due, message.clockMinute, message.runtime);
        nextMinute = queue.reset(simulationResult.schedule);
      }
      self.postMessage({
        type: "due",
        generation: message.generation,
        requestId: message.requestId,
        result: {
          ...due,
          nextMinute,
          simulation: simulationResult
        }
      });
      return;
    }
    throw new Error(`Distant-world worker received an unknown message: ${message.type}`);
  } catch (error) {
    self.postMessage({
      type: "error",
      generation: message?.generation ?? null,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    });
  }
});
