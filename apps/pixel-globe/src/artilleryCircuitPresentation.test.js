import assert from "node:assert/strict";
import test from "node:test";

import { artilleryCircuitLegCompletionText } from "./artilleryCircuitPresentation.js";

test("the artillery circuit does not claim one remaining destination can be visited in any order", () => {
  assert.equal(artilleryCircuitLegCompletionText({
    destinationName: "Ningbo",
    remainingDestinationNamesText: "Guangzhou",
    remainingDestinationCount: 1,
    batteryUpgrade: true
  }), "Ningbo's battery has its new guns. The final plans must go to Guangzhou.");
  assert.equal(artilleryCircuitLegCompletionText({
    destinationName: "Nanjing",
    remainingDestinationNamesText: "Ningbo",
    remainingDestinationCount: 1,
    batteryUpgrade: false
  }), "Nanjing has copied the Portuguese patterns. The final refit is at Ningbo.");
});

test("the artillery circuit keeps free ordering while several ports remain", () => {
  assert.equal(artilleryCircuitLegCompletionText({
    destinationName: "Ningbo",
    remainingDestinationNamesText: "Fuzhou and Guangzhou",
    remainingDestinationCount: 2,
    batteryUpgrade: true
  }), "Ningbo's battery has its new guns. The remaining plans may go to Fuzhou and Guangzhou in any order.");
});
