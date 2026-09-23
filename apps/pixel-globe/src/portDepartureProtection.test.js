import assert from "node:assert/strict";
import test from "node:test";
import {
  PORT_DEPARTURE_INVULNERABILITY_SECONDS,
  activatePortDepartureProtection,
  advancePortDepartureProtection,
  createPortDepartureProtection,
  portDepartureProtectionIsActive
} from "./portDepartureProtection.js";

test("port departure protection lasts for three active sailing seconds", () => {
  const protection = createPortDepartureProtection();
  assert.equal(portDepartureProtectionIsActive(protection), false);

  activatePortDepartureProtection(protection);
  assert.equal(protection.remainingSeconds, PORT_DEPARTURE_INVULNERABILITY_SECONDS);
  assert.equal(advancePortDepartureProtection(protection, 2.999), true);
  assert.equal(portDepartureProtectionIsActive(protection), true);
  assert.equal(advancePortDepartureProtection(protection, 0.001), false);
  assert.equal(protection.remainingSeconds, 0);
});

test("a fresh port departure restarts the full protection window", () => {
  const protection = createPortDepartureProtection();
  activatePortDepartureProtection(protection);
  advancePortDepartureProtection(protection, 2);
  activatePortDepartureProtection(protection);
  assert.equal(protection.remainingSeconds, PORT_DEPARTURE_INVULNERABILITY_SECONDS);
});

test("port departure protection rejects invalid elapsed time and state", () => {
  const protection = createPortDepartureProtection();
  assert.throws(() => advancePortDepartureProtection(protection, -1), /Invalid port departure/);
  assert.throws(() => portDepartureProtectionIsActive({ remainingSeconds: NaN }), /Invalid port departure/);
});
