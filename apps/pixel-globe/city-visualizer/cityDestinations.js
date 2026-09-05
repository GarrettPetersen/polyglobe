import { PORT_CITY_LOCATION } from "../src/portCityNavigation.js";

export const CITY_DESTINATIONS = Object.freeze([
  cityDestination({
    id: PORT_CITY_LOCATION.SET_SAIL,
    label: "Set Sail",
    layers: []
  }),
  cityDestination({
    id: PORT_CITY_LOCATION.SHIPYARD,
    label: "Shipyard",
    layers: ["Shipyard"],
    requiredFeature: "shipyard"
  }),
  cityDestination({
    id: PORT_CITY_LOCATION.MARKET,
    label: "Market",
    layers: ["Market Stall", "Market Stall Copy", "Market Stall Copy Copy"],
    requiredFeature: "market"
  }),
  cityDestination({
    id: PORT_CITY_LOCATION.EQUIPMENT,
    label: "Smith",
    layers: ["Smith"],
    requiredFeature: "store"
  }),
  cityDestination({
    id: PORT_CITY_LOCATION.INN,
    label: "Inn",
    layers: ["Inn", "Home 2"],
    requiredFeature: "inn"
  }),
  cityDestination({
    id: PORT_CITY_LOCATION.AUTHORITY,
    label: "Port authority",
    layers: ["Far Castle", "Gate", "Near Castle"]
  }),
  cityDestination({
    id: PORT_CITY_LOCATION.SHIP,
    label: "Your ship",
    layers: []
  }),
  cityDestination({
    id: PORT_CITY_LOCATION.ILLICIT_MERCHANT,
    label: "Suspicious merchant",
    layers: []
  })
]);

const CITY_DESTINATION_BY_ID = new Map(
  CITY_DESTINATIONS.map((destination) => [destination.id, destination])
);

export function activeCityDestinations({
  availableDestinationIds,
  features,
  assaultActive
}) {
  requireCityFeatures(features);
  if (availableDestinationIds !== null && !(availableDestinationIds instanceof Set)) {
    throw new Error("City destination availability must be a Set or null");
  }
  if (typeof assaultActive !== "boolean") {
    throw new Error("City destination assault state must be boolean");
  }
  if (assaultActive) return Object.freeze([cityDestinationById(PORT_CITY_LOCATION.SET_SAIL)]);

  return Object.freeze(CITY_DESTINATIONS.filter((destination) => {
    if (availableDestinationIds && !availableDestinationIds.has(destination.id)) return false;
    if (features.settlementStage !== "city" && destination.id !== PORT_CITY_LOCATION.SHIP &&
        destination.id !== PORT_CITY_LOCATION.SET_SAIL) return false;
    if (!availableDestinationIds && destination.id === PORT_CITY_LOCATION.ILLICIT_MERCHANT) {
      return false;
    }
    return !destination.requiredFeature || features[destination.requiredFeature] === true;
  }));
}

export function cityDestinationById(destinationId) {
  const destination = CITY_DESTINATION_BY_ID.get(destinationId);
  if (!destination) throw new Error(`Unknown city destination: ${destinationId}`);
  return destination;
}

export function validateCityDestinationIds(destinationIds) {
  if (!Array.isArray(destinationIds)) {
    throw new Error("City scene destination IDs must be an array");
  }
  const validated = new Set();
  for (const destinationId of destinationIds) {
    cityDestinationById(destinationId);
    if (validated.has(destinationId)) throw new Error(`Duplicate city destination: ${destinationId}`);
    validated.add(destinationId);
  }
  return validated;
}

function cityDestination({ id, label, layers, requiredFeature = null }) {
  if (typeof id !== "string" || id === "" || typeof label !== "string" || label === "") {
    throw new Error("City destination requires an id and label");
  }
  if (!Array.isArray(layers) || layers.some((layer) => typeof layer !== "string" || layer === "")) {
    throw new Error(`City destination ${id} requires valid scene layers`);
  }
  if (requiredFeature !== null && typeof requiredFeature !== "string") {
    throw new Error(`City destination ${id} has an invalid required feature`);
  }
  return Object.freeze({
    id,
    label,
    layers: Object.freeze([...layers]),
    ...(requiredFeature === null ? {} : { requiredFeature })
  });
}

function requireCityFeatures(features) {
  if (!features || typeof features !== "object") {
    throw new Error("Active city destinations require scene features");
  }
  if (!["uninhabited", "colony", "city"].includes(features.settlementStage)) {
    throw new Error(`Invalid city destination settlement stage: ${features.settlementStage}`);
  }
  for (const feature of ["shipyard", "market", "store", "inn"]) {
    if (typeof features[feature] !== "boolean") {
      throw new Error(`City destination feature must be boolean: ${feature}`);
    }
  }
}
