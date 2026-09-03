import { PORT_CITY_STAFF_ROLE, PORT_CITY_STAFF_ROLES } from "./characterPortraits.js";
import { PORT_CITY_LOCATION } from "./portCityNavigation.js";

const HARBOUR_MASTER_NODES = new Set([
  "barred",
  "cargo",
  "disguise-failed",
  "disguise-success",
  "drunk-captain",
  "drunk-factor",
  "greeting",
  "loadout",
  "custom-loadout",
  "recovering",
  "root",
  "ship-handover",
  "shipyard",
  "shipyard-arrival",
  "shipyard-arrival-review",
  "shipyard-investment",
  "shipyard-investment-offer",
  "shipyard-purchase",
  "shipyard-purchase-confirm"
]);

const INNKEEPER_NODES = new Set([
  "crew-recruitment",
  "inn-drink",
  "quest"
]);

const SMITH_NODES = new Set([
  "equipment",
  "equipment-cannons",
  "equipment-factor-followup",
  "equipment-factor-offer",
  "equipment-harpoons",
  "equipment-nets",
  "equipment-special-offer"
]);

const MERCHANT_NODES = new Set([
  "market",
  "market-undo-confirm",
  "portuguese-cartaz-market-declined",
  "portuguese-cartaz-market-offer",
  "quest-cargo-sale-warning",
  "quest-cargo-tip",
  "trade-embargo-sale-warning",
  "trade-embargo-warning",
  "trade-tip",
  "tribute-theft-warning"
]);

const GARRISON_COMMANDER_NODES = new Set([
  "capture-petition",
  "capture-petition-result",
  "city-attack",
  "illicit-caught",
  "marque",
  "marque-factor-followup",
  "marque-factor-offer",
  "portuguese-cartaz",
  "trade-pass"
]);

const STAFF_ROLE_BY_LOCATION = Object.freeze({
  [PORT_CITY_LOCATION.SET_SAIL]: PORT_CITY_STAFF_ROLE.HARBOUR_MASTER,
  [PORT_CITY_LOCATION.SHIP]: PORT_CITY_STAFF_ROLE.HARBOUR_MASTER,
  [PORT_CITY_LOCATION.SHIPYARD]: PORT_CITY_STAFF_ROLE.HARBOUR_MASTER,
  [PORT_CITY_LOCATION.INN]: PORT_CITY_STAFF_ROLE.INNKEEPER,
  [PORT_CITY_LOCATION.EQUIPMENT]: PORT_CITY_STAFF_ROLE.SMITH,
  [PORT_CITY_LOCATION.MARKET]: PORT_CITY_STAFF_ROLE.MERCHANT,
  [PORT_CITY_LOCATION.ILLICIT_MERCHANT]: PORT_CITY_STAFF_ROLE.MERCHANT,
  [PORT_CITY_LOCATION.AUTHORITY]: PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER
});

export function portCityStaffRoleForDialogueSession(session) {
  if (!session || session.kind !== "port") {
    throw new Error("Port staff selection requires a port dialogue session");
  }
  if (typeof session.nodeId !== "string" || session.nodeId === "") {
    throw new Error("Port staff selection requires a dialogue node");
  }
  if (session.nodeId === "city-menu") {
    const role = STAFF_ROLE_BY_LOCATION[session.cityMenuLocationId];
    if (!role) {
      throw new Error(`Port city submenu has no staff role: ${session.cityMenuLocationId}`);
    }
    return role;
  }
  if (session.nodeId === "crew-dismissal") {
    return session.crewDismissal?.kind === "voluntary"
      ? PORT_CITY_STAFF_ROLE.INNKEEPER
      : PORT_CITY_STAFF_ROLE.HARBOUR_MASTER;
  }
  if (HARBOUR_MASTER_NODES.has(session.nodeId)) return PORT_CITY_STAFF_ROLE.HARBOUR_MASTER;
  if (INNKEEPER_NODES.has(session.nodeId)) return PORT_CITY_STAFF_ROLE.INNKEEPER;
  if (SMITH_NODES.has(session.nodeId)) return PORT_CITY_STAFF_ROLE.SMITH;
  if (MERCHANT_NODES.has(session.nodeId)) return PORT_CITY_STAFF_ROLE.MERCHANT;
  if (GARRISON_COMMANDER_NODES.has(session.nodeId)) return PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER;
  throw new Error(`Port dialogue node has no staff role: ${session.nodeId}`);
}

export function requirePortCityStaffMember(staffByCityId, cityId, role) {
  if (!(staffByCityId instanceof Map)) throw new Error("Port staff lookup requires a city index");
  if (typeof cityId !== "string" || cityId === "") throw new Error("Port staff lookup requires a city ID");
  if (!PORT_CITY_STAFF_ROLES.includes(role)) throw new Error(`Unknown port staff role: ${role}`);
  const staff = staffByCityId.get(cityId);
  if (!staff) throw new Error(`Port has no staff roster: ${cityId}`);
  const character = staff[role];
  if (!character || character.role !== role) {
    throw new Error(`Port ${cityId} has no ${role}`);
  }
  return character;
}

export function portCityStaffMembers(staffByCityId, cityId) {
  return Object.freeze(PORT_CITY_STAFF_ROLES.map((role) => (
    requirePortCityStaffMember(staffByCityId, cityId, role)
  )));
}
