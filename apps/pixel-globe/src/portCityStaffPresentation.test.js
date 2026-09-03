import assert from "node:assert/strict";
import test from "node:test";
import { PORT_CITY_STAFF_ROLE } from "./characterPortraits.js";
import { portCityStaffTitle } from "./portCityStaffPresentation.js";

test("Polynesian port staff use community offices without changing their stable roles", () => {
  const city = { cityType: "polynesian", settlementType: "village", factionId: "neutral" };
  assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.HARBOUR_MASTER), "island chief");
  assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.INNKEEPER), "village host");
  assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.SMITH), "canoe builder");
  assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.MERCHANT), "island trader");
  assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER), "war leader");
});

test("every non-Polynesian village uses community offices", () => {
  for (const cityType of [
    "andean",
    "east-asian",
    "islamic-desert",
    "mediterranean",
    "mesoamerican",
    "northern-european",
    "south-asian",
    "southeast-asian",
    "sub-saharan"
  ]) {
    const city = { cityType, settlementType: "village", factionId: "neutral" };
    assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.HARBOUR_MASTER), "village headman");
    assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.INNKEEPER), "village host");
    assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.SMITH), "craft worker");
    assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.MERCHANT), "village trader");
    assert.equal(portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER), "war leader");
  }
});

test("regional village offices can be more specific than the shared village titles", () => {
  assert.equal(portCityStaffTitle(
    { cityType: "east-asian", settlementType: "village", factionId: "ainu" },
    PORT_CITY_STAFF_ROLE.HARBOUR_MASTER
  ), "village elder");
});

test("urban offices keep their established names", () => {
  assert.equal(portCityStaffTitle(
    { cityType: "mediterranean", settlementType: "city", factionId: "spain" },
    PORT_CITY_STAFF_ROLE.HARBOUR_MASTER
  ), "harbour master");
  assert.equal(portCityStaffTitle(
    { cityType: "east-asian", settlementType: "city", factionId: "japan" },
    PORT_CITY_STAFF_ROLE.HARBOUR_MASTER
  ), "harbour master");
});

test("port staff titles fail loudly on incomplete or unknown identity", () => {
  assert.throws(
    () => portCityStaffTitle({}, PORT_CITY_STAFF_ROLE.MERCHANT),
    /requires a city type/
  );
  assert.throws(
    () => portCityStaffTitle({ cityType: "polynesian" }, "factor"),
    /Unknown port staff title role/
  );
  assert.throws(
    () => portCityStaffTitle(
      { cityType: "orbital", settlementType: "city" },
      PORT_CITY_STAFF_ROLE.MERCHANT
    ),
    /Unknown port staff title city type/
  );
  assert.throws(
    () => portCityStaffTitle(
      { cityType: "polynesian", settlementType: "camp" },
      PORT_CITY_STAFF_ROLE.MERCHANT
    ),
    /Unknown port staff title settlement type/
  );
});
