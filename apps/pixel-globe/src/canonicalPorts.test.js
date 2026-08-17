import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_PORTS,
  REQUIRED_CANONICAL_PORTS,
  canonicalPortDisplayName,
  canonicalPortIdentity,
  findCanonicalPort,
  portMatchesCanonicalReference,
  requireCanonicalPort,
  validateCanonicalPortCatalog
} from "./canonicalPorts.js";

test("canonical port references resolve by stable city and country rather than display text", () => {
  const ports = REQUIRED_CANONICAL_PORTS.map((reference, tileId) => ({
    ...reference,
    tileId,
    displayCity: reference === CANONICAL_PORTS.HANSEONG ? "Hanseong" : reference.city
  }));
  const resolved = validateCanonicalPortCatalog(ports);
  assert.equal(resolved.size, REQUIRED_CANONICAL_PORTS.length);
  assert.equal(
    requireCanonicalPort(ports, CANONICAL_PORTS.HANSEONG, "Cached canonical port test"),
    resolved.get("hanseong")
  );
  assert.equal(canonicalPortDisplayName(resolved.get("hanseong")), "Hanseong");
  assert.equal(
    portMatchesCanonicalReference(resolved.get("hanseong"), CANONICAL_PORTS.HANSEONG),
    true
  );
  assert.equal(canonicalPortIdentity(CANONICAL_PORTS.HANSEONG), "seoul|republic of korea");
});

test("canonical port validation rejects missing, duplicate, and unregistered references", () => {
  const ports = REQUIRED_CANONICAL_PORTS.map((reference, tileId) => ({ ...reference, tileId }));
  const portsWithoutBeijing = ports.filter((port) => port.id !== CANONICAL_PORTS.BEIJING.id);
  assert.throws(
    () => validateCanonicalPortCatalog(portsWithoutBeijing),
    /requires exactly one dockable canonical port/
  );
  assert.equal(findCanonicalPort(portsWithoutBeijing, CANONICAL_PORTS.BEIJING), null);
  assert.throws(
    () => validateCanonicalPortCatalog([...ports, { ...CANONICAL_PORTS.LONDON, tileId: 999 }]),
    /London.*found 2/
  );
  assert.throws(
    () => requireCanonicalPort(ports, { id: "imaginary", city: "Atlantis", country: "Ocean" }),
    /Unregistered canonical port reference/
  );
});
