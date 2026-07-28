import { createDistantWorldEventQueue } from "./distantWorldEvents.js";

const queue = createDistantWorldEventQueue();

self.addEventListener("message", (event) => {
  const message = event.data;
  try {
    if (!message || typeof message !== "object") {
      throw new Error("Distant-world worker received a malformed message");
    }
    if (message.type === "reset") {
      self.postMessage({
        type: "ready",
        generation: message.generation,
        nextMinute: queue.reset(message.schedule)
      });
      return;
    }
    if (message.type === "advance") {
      self.postMessage({
        type: "due",
        generation: message.generation,
        requestId: message.requestId,
        result: queue.advance(message.clockMinute)
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
