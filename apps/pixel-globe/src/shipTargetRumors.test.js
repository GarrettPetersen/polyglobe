import test from "node:test";
import assert from "node:assert/strict";
import { shipTargetRumorEligible, recordShipTargetRumor, shipTargetRumorText, SHIP_TARGET_RUMOR_INTERVAL_MINUTES } from "./shipTargetRumors.js";
test("ship-target sightings recur across different speakers and survive save reload without spam", () => {
  const decisions = {};
  assert.equal(shipTargetRumorEligible(decisions, "wokou", 100, 0.9), false);
  assert.equal(shipTargetRumorEligible(decisions, "wokou", 100, 0.2), true);
  recordShipTargetRumor(decisions, "wokou", 100);
  const restored = JSON.parse(JSON.stringify(decisions));
  assert.equal(shipTargetRumorEligible(restored, "wokou", 101, 0.2), false);
  assert.equal(shipTargetRumorEligible(restored, "wokou", 100 + SHIP_TARGET_RUMOR_INTERVAL_MINUTES, 0.2), true);
  assert.equal(shipTargetRumorEligible(restored, "revenge", 101, 0.2), true);
  assert.throws(() => recordShipTargetRumor(restored, "wokou", 101), /too soon/);
  assert.throws(() => shipTargetRumorEligible(restored, "invented", 101, 0.2), /Unknown/);
});
test("sightings describe the supplied current position in leagues and a named port", () => {
  const reference = { city: "Ningbo", lat: 30, lon: 121 };
  assert.match(shipTargetRumorText("the wokou junk", { lat: 30, lon: 121.01 }, reference), /off Ningbo/);
  assert.match(shipTargetRumorText("the wokou junk", { lat: 31, lon: 121 }, reference), /leagues north of Ningbo/);
  assert.match(shipTargetRumorText("the wokou junk", { lat: 29, lon: 121 }, reference), /leagues south of Ningbo/);
});
