// Only adapt the browser worker transport. The simulation and message handler
// are exactly the ones shipped to players.
import { parentPort } from "node:worker_threads";
globalThis.self = {
  addEventListener(type, callback) {
    if (type !== "message") throw new Error(`Unexpected worker listener: ${type}`);
    parentPort.on("message", data => callback({ data }));
  },
  postMessage: message => parentPort.postMessage(message)
};
await import("../../src/distantWorldWorker.js");
