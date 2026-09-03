import { PORT_CITY_STAFF_ROLE, PORT_CITY_STAFF_ROLES } from "./characterPortraits.js";
import { PORT_CITY_STAFF_GREETING_STYLE } from "./portGreetingStyle.js";

const STANDARD_TITLES = Object.freeze({
  [PORT_CITY_STAFF_ROLE.HARBOUR_MASTER]: "harbour master",
  [PORT_CITY_STAFF_ROLE.INNKEEPER]: "innkeeper",
  [PORT_CITY_STAFF_ROLE.SMITH]: "smith",
  [PORT_CITY_STAFF_ROLE.MERCHANT]: "merchant",
  [PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER]: "garrison commander"
});

const POLYNESIAN_TITLES = Object.freeze({
  [PORT_CITY_STAFF_ROLE.HARBOUR_MASTER]: "island chief",
  [PORT_CITY_STAFF_ROLE.INNKEEPER]: "village host",
  [PORT_CITY_STAFF_ROLE.SMITH]: "canoe builder",
  [PORT_CITY_STAFF_ROLE.MERCHANT]: "island trader",
  [PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER]: "war leader"
});

const VILLAGE_TITLES = Object.freeze({
  ...POLYNESIAN_TITLES,
  [PORT_CITY_STAFF_ROLE.HARBOUR_MASTER]: "village headman",
  [PORT_CITY_STAFF_ROLE.SMITH]: "craft worker",
  [PORT_CITY_STAFF_ROLE.MERCHANT]: "village trader"
});

const AINU_TITLES = Object.freeze({
  ...VILLAGE_TITLES,
  [PORT_CITY_STAFF_ROLE.HARBOUR_MASTER]: "village elder"
});

const CITY_TYPES = Object.freeze(new Set([
  "andean",
  "east-asian",
  "islamic-desert",
  "mediterranean",
  "mesoamerican",
  "northern-european",
  "polynesian",
  "south-asian",
  "southeast-asian",
  "sub-saharan"
]));

export function portCityStaffTitle(city, role) {
  if (!city || typeof city !== "object") throw new Error("Port staff title requires a city");
  if (typeof city.cityType !== "string" || city.cityType.length === 0) {
    throw new Error("Port staff title requires a city type");
  }
  if (!CITY_TYPES.has(city.cityType)) {
    throw new Error(`Unknown port staff title city type: ${city.cityType}`);
  }
  if (city.settlementType !== undefined && !["city", "village"].includes(city.settlementType)) {
    throw new Error(`Unknown port staff title settlement type: ${city.settlementType}`);
  }
  if (!PORT_CITY_STAFF_ROLES.includes(role)) {
    throw new Error(`Unknown port staff title role: ${role}`);
  }
  if (city.factionId === "ainu") return AINU_TITLES[role];
  if (city.cityType === "polynesian") return POLYNESIAN_TITLES[role];
  if (city.settlementType === "village") return VILLAGE_TITLES[role];
  return STANDARD_TITLES[role];
}

export function portCityStaffGreetingStyle(city) {
  // Reuse the title boundary validation so office and voice cannot diverge on
  // an incomplete city record.
  portCityStaffTitle(city, PORT_CITY_STAFF_ROLE.HARBOUR_MASTER);
  return city.factionId === "ainu" ||
    city.cityType === "polynesian" ||
    city.settlementType === "village"
    ? PORT_CITY_STAFF_GREETING_STYLE.COMMUNITY_LEADER
    : PORT_CITY_STAFF_GREETING_STYLE.PORT_OFFICIAL;
}
