export const PORT_CITY_LOCATION = Object.freeze({
  MARKET: "market",
  EQUIPMENT: "equipment",
  SHIPYARD: "shipyard",
  AUTHORITY: "authority",
  INN: "inn",
  SHIP: "ship",
  ILLICIT_MERCHANT: "illicit-merchant"
});

const LOCATION_ORDER = Object.freeze([
  PORT_CITY_LOCATION.SHIP,
  PORT_CITY_LOCATION.MARKET,
  PORT_CITY_LOCATION.INN,
  PORT_CITY_LOCATION.EQUIPMENT,
  PORT_CITY_LOCATION.SHIPYARD,
  PORT_CITY_LOCATION.AUTHORITY,
  PORT_CITY_LOCATION.ILLICIT_MERCHANT
]);

const LOCATION_LABELS = Object.freeze({
  [PORT_CITY_LOCATION.MARKET]: "Market",
  [PORT_CITY_LOCATION.EQUIPMENT]: "Smith",
  [PORT_CITY_LOCATION.SHIPYARD]: "Shipyard",
  [PORT_CITY_LOCATION.AUTHORITY]: "Port authority",
  [PORT_CITY_LOCATION.INN]: "Inn",
  [PORT_CITY_LOCATION.SHIP]: "Your ship",
  [PORT_CITY_LOCATION.ILLICIT_MERCHANT]: "Suspicious merchant"
});

const SHIP_NODE_IDS = new Set(["loadout", "cargo"]);
const SHIPYARD_NODE_IDS = new Set([
  "shipyard",
  "shipyard-investment",
  "shipyard-investment-offer"
]);
const AUTHORITY_NODE_IDS = new Set([
  "capture-petition",
  "city-attack",
  "marque",
  "portuguese-cartaz",
  "trade-pass"
]);
const INN_NODE_IDS = new Set([
  "caribbean-ginger",
  "chef-quest",
  "colonization",
  "conquistador",
  "japanese-matchlocks",
  "quest",
  "viking-longship"
]);

export function portCityNavigationModel(rootView, services) {
  if (!rootView || !Array.isArray(rootView.options)) {
    throw new Error("Port city navigation requires the current root options");
  }
  validateServices(services);
  const actionsByLocation = new Map(LOCATION_ORDER.map((locationId) => [locationId, []]));
  for (const [rootOptionIndex, option] of rootView.options.entries()) {
    const locationId = portCityLocationForRootAction(option?.action);
    if (locationId === PORT_CITY_LOCATION.EQUIPMENT && !services.smith) continue;
    actionsByLocation.get(locationId).push(Object.freeze({
      id: portCityRootActionId(option.action),
      label: option.label,
      detail: option.detail || null,
      disabled: option.disabled === true,
      disabledReason: option.disabledReason || null,
      action: option.action,
      rootOptionIndex
    }));
  }
  const locations = LOCATION_ORDER.map((id) => Object.freeze({
    id,
    label: LOCATION_LABELS[id],
    actions: Object.freeze(actionsByLocation.get(id))
  })).filter(({ actions }) => actions.length > 0);
  return Object.freeze({
    statusText: rootView.text,
    feedback: rootView.feedback || null,
    locations: Object.freeze(locations)
  });
}

export function portCityLocationForRootAction(action) {
  if (!action || typeof action.type !== "string" || action.type === "") {
    throw new Error("Port root option has no action type");
  }
  if (action.type === "attempt-restricted-illicit-trade") {
    return PORT_CITY_LOCATION.ILLICIT_MERCHANT;
  }
  if (action.type === "open-passenger") return PORT_CITY_LOCATION.INN;
  if (action.type === "open-trade-pass") return PORT_CITY_LOCATION.AUTHORITY;
  if (action.type === "wait-in-port" || action.type === "close") {
    return PORT_CITY_LOCATION.SHIP;
  }
  if (action.type !== "node") {
    throw new Error(`Unmapped port root action type: ${action.type}`);
  }
  if (action.nodeId === "market") return PORT_CITY_LOCATION.MARKET;
  if (action.nodeId === "equipment") return PORT_CITY_LOCATION.EQUIPMENT;
  if (SHIP_NODE_IDS.has(action.nodeId)) return PORT_CITY_LOCATION.SHIP;
  if (SHIPYARD_NODE_IDS.has(action.nodeId)) return PORT_CITY_LOCATION.SHIPYARD;
  if (AUTHORITY_NODE_IDS.has(action.nodeId)) return PORT_CITY_LOCATION.AUTHORITY;
  if (INN_NODE_IDS.has(action.nodeId)) return PORT_CITY_LOCATION.INN;
  throw new Error(`Unmapped port root node: ${action.nodeId}`);
}

export function portCityRootActionId(action) {
  const locationId = portCityLocationForRootAction(action);
  if (action.type === "node") return `${locationId}:node:${action.nodeId}`;
  if (action.type === "open-passenger") {
    if (typeof action.quest?.id !== "string" || action.quest.id === "") {
      throw new Error("Port passenger action requires a quest ID");
    }
    return `${locationId}:passenger:${action.quest.id}`;
  }
  if (["open-trade-pass", "attempt-restricted-illicit-trade"].includes(action.type)) {
    if (typeof action.policyId !== "string" || action.policyId === "") {
      throw new Error(`Port ${action.type} action requires a policy ID`);
    }
    return `${locationId}:${action.type}:${action.policyId}`;
  }
  return `${locationId}:${action.type}`;
}

export function portCityLocation(model, locationId) {
  if (!model || !Array.isArray(model.locations)) {
    throw new Error("Port city location lookup requires a navigation model");
  }
  const location = model.locations.find(({ id }) => id === locationId);
  if (!location) throw new Error(`Port city location is unavailable: ${locationId}`);
  return location;
}

function validateServices(services) {
  if (!services || typeof services !== "object") {
    throw new Error("Port city navigation requires a service profile");
  }
  for (const key of ["inn", "smith", "market", "shipyard"]) {
    if (typeof services[key] !== "boolean") {
      throw new Error(`Port city service must be boolean: ${key}`);
    }
  }
}
