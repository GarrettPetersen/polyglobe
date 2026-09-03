import assert from "node:assert/strict";
import test from "node:test";

import { PORT_CITY_STAFF_ROLE } from "./characterPortraits.js";
import { PORT_CITY_LOCATION } from "./portCityNavigation.js";
import {
  harbourMasterForPlacedCity,
  portCityStaffMembers,
  portCityStaffRoleForDialogueSession,
  requirePortCityStaffMember
} from "./portCityStaff.js";

test("port dialogue routes each service to its owning staff member", () => {
  const roleForNode = (nodeId) => portCityStaffRoleForDialogueSession({ kind: "port", nodeId });

  assert.equal(roleForNode("greeting"), PORT_CITY_STAFF_ROLE.HARBOUR_MASTER);
  assert.equal(roleForNode("shipyard"), PORT_CITY_STAFF_ROLE.HARBOUR_MASTER);
  assert.equal(roleForNode("quest"), PORT_CITY_STAFF_ROLE.INNKEEPER);
  assert.equal(roleForNode("crew-recruitment"), PORT_CITY_STAFF_ROLE.INNKEEPER);
  assert.equal(roleForNode("equipment"), PORT_CITY_STAFF_ROLE.SMITH);
  assert.equal(roleForNode("equipment-factor-offer"), PORT_CITY_STAFF_ROLE.SMITH);
  assert.equal(roleForNode("market"), PORT_CITY_STAFF_ROLE.MERCHANT);
  assert.equal(roleForNode("trade-embargo-warning"), PORT_CITY_STAFF_ROLE.MERCHANT);
  assert.equal(roleForNode("marque"), PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER);
  assert.equal(roleForNode("garrison"), PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER);
  assert.equal(roleForNode("city-attack"), PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER);
});

test("city conversations route arrivals to the harbour master and officials to the commander", () => {
  assert.equal(
    portCityStaffRoleForDialogueSession({ kind: "campaign-goal" }),
    PORT_CITY_STAFF_ROLE.HARBOUR_MASTER
  );
  assert.equal(
    portCityStaffRoleForDialogueSession({ kind: "rescued-traveler" }),
    PORT_CITY_STAFF_ROLE.HARBOUR_MASTER
  );
  assert.equal(
    portCityStaffRoleForDialogueSession({ kind: "passenger" }),
    PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER
  );
  assert.equal(
    portCityStaffRoleForDialogueSession({ kind: "shore-battery" }),
    PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER
  );
  assert.throws(
    () => portCityStaffRoleForDialogueSession({ kind: "unknown" }),
    /City dialogue session has no staff role: unknown/
  );
});

test("port submenus inherit the staff member for their city location", () => {
  const session = (cityMenuLocationId) => ({
    kind: "port",
    nodeId: "city-menu",
    cityMenuLocationId
  });

  assert.equal(
    portCityStaffRoleForDialogueSession(session(PORT_CITY_LOCATION.MARKET)),
    PORT_CITY_STAFF_ROLE.MERCHANT
  );
  assert.equal(
    portCityStaffRoleForDialogueSession(session(PORT_CITY_LOCATION.INN)),
    PORT_CITY_STAFF_ROLE.INNKEEPER
  );
  assert.equal(
    portCityStaffRoleForDialogueSession(session(PORT_CITY_LOCATION.EQUIPMENT)),
    PORT_CITY_STAFF_ROLE.SMITH
  );
  assert.equal(
    portCityStaffRoleForDialogueSession(session(PORT_CITY_LOCATION.AUTHORITY)),
    PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER
  );
});

test("loadout crew reductions belong to the harbour master", () => {
  assert.equal(
    portCityStaffRoleForDialogueSession({
      kind: "port",
      nodeId: "crew-dismissal",
      crewDismissal: { kind: "preset" }
    }),
    PORT_CITY_STAFF_ROLE.HARBOUR_MASTER
  );
});

test("port staff lookup rejects incomplete rosters and unmapped dialogue nodes", () => {
  const cityId = "cadiz|spain";
  const harbourMaster = { id: "cadiz-harbour-master", role: PORT_CITY_STAFF_ROLE.HARBOUR_MASTER };
  const staffByCityId = new Map([[cityId, {
    [PORT_CITY_STAFF_ROLE.HARBOUR_MASTER]: harbourMaster
  }]]);

  assert.equal(
    requirePortCityStaffMember(staffByCityId, cityId, PORT_CITY_STAFF_ROLE.HARBOUR_MASTER),
    harbourMaster
  );
  assert.throws(
    () => requirePortCityStaffMember(staffByCityId, cityId, PORT_CITY_STAFF_ROLE.MERCHANT),
    /has no merchant/
  );
  assert.throws(
    () => portCityStaffMembers(staffByCityId, cityId),
    /has no innkeeper/
  );
  assert.throws(
    () => portCityStaffRoleForDialogueSession({ kind: "port", nodeId: "unknown" }),
    /has no staff role/
  );
});

test("placed inland cities do not require port staff while dockable cities do", () => {
  const reims = { cityId: "reims|france", tileId: 17 };
  const rouen = { cityId: "rouen|france", tileId: 18 };
  const harbourMaster = {
    id: "rouen-harbour-master",
    role: PORT_CITY_STAFF_ROLE.HARBOUR_MASTER
  };
  const staffByCityId = new Map([[rouen.cityId, {
    [PORT_CITY_STAFF_ROLE.HARBOUR_MASTER]: harbourMaster
  }]]);
  const dockablePortsByTileId = new Map([[rouen.tileId, rouen]]);

  assert.equal(
    harbourMasterForPlacedCity(staffByCityId, dockablePortsByTileId, reims),
    null
  );
  assert.equal(
    harbourMasterForPlacedCity(staffByCityId, dockablePortsByTileId, rouen),
    harbourMaster
  );
  assert.throws(
    () => harbourMasterForPlacedCity(
      new Map(),
      dockablePortsByTileId,
      rouen
    ),
    /Port has no staff roster: rouen\|france/
  );
  assert.throws(
    () => harbourMasterForPlacedCity(
      staffByCityId,
      new Map([[rouen.tileId, { cityId: "honfleur|france", tileId: rouen.tileId }]]),
      rouen
    ),
    /belongs to honfleur\|france, not rouen\|france/
  );
});
