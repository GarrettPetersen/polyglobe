import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_PORTS,
  REQUIRED_CANONICAL_PORTS,
  canonicalPortDisplayName,
  findCanonicalPort,
  portMatchesCanonicalReference,
  requireCanonicalPort,
  validateCanonicalPortCatalog
} from "./canonicalPorts.js";

test("canonical port references survive display-name and country-label changes", () => {
  const ports = REQUIRED_CANONICAL_PORTS.map((reference, tileId) => ({
    ...reference,
    tileId,
    displayCity: reference === CANONICAL_PORTS.HANSEONG ? "Entirely Renamed" : reference.city,
    country: reference === CANONICAL_PORTS.HANSEONG ? "Renamed Realm" : reference.country
  }));
  const resolved = validateCanonicalPortCatalog(ports);
  assert.equal(resolved.size, REQUIRED_CANONICAL_PORTS.length);
  assert.equal(
    requireCanonicalPort(ports, CANONICAL_PORTS.HANSEONG, "Cached canonical port test"),
    resolved.get("hanseong")
  );
  assert.equal(canonicalPortDisplayName(resolved.get("hanseong")), "Entirely Renamed");
  assert.equal(
    portMatchesCanonicalReference(resolved.get("hanseong"), CANONICAL_PORTS.HANSEONG),
    true
  );
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
    () => requireCanonicalPort(ports, { cityId: "atlantis|ocean", id: "imaginary", city: "Atlantis", country: "Ocean" }),
    /Unregistered canonical port reference/
  );
});
