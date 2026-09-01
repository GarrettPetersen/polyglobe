import { requireEntityId } from "./entityIds.js";

// These settlements remain part of the land economy but are not docks. A ship
// may approach their named maritime gateway where one exists; the inland city
// itself must never be moved onto the coast merely to satisfy a sailing system.
export const INLAND_CITY_IDS_1522 = Object.freeze([
  "aleppo|syria",
  "bursa|turkey",
  "chillicothe|united states of america",
  "dienne|senegal",
  "granada|spain",
  "jerusalem|israel",
  "mecca|saudi arabia",
  "merida|mexico",
  "nimes|france"
]);

// Canonical replacements for sailing references created before the inland
// distinction was enforced. Most are the settlement's historic seaward gate.
// Dienne and Chillicothe retain the regional successors used by the released
// subdivision-seven migration because those saves may already contain active
// passengers and commissions which must remain completable.
export const INLAND_CITY_SAILING_GATEWAYS_1522 = Object.freeze([
  gateway("aleppo|syria", "antioch|syria/turkey"),
  gateway("bursa|turkey", "mudanya|turkey"),
  gateway("chillicothe|united states of america", "wendat village|canada"),
  gateway("dienne|senegal", "tombouctou|mali"),
  gateway("granada|spain", "almeria|spain"),
  gateway("jerusalem|israel", "jaffa|israel"),
  gateway("mecca|saudi arabia", "jeddah|saudi arabia"),
  gateway("merida|mexico", "chakan putum|mexico"),
  gateway("nimes|france", "arles|france")
]);

const INLAND_CITY_ID_SET = new Set(INLAND_CITY_IDS_1522);
const SAILING_GATEWAY_BY_INLAND_CITY_ID = new Map(
  INLAND_CITY_SAILING_GATEWAYS_1522.map(({ inlandCityId, gatewayCityId }) => (
    [inlandCityId, gatewayCityId]
  ))
);

if (INLAND_CITY_ID_SET.size !== INLAND_CITY_IDS_1522.length) {
  throw new Error("Inland city registry contains duplicate canonical ids");
}
if (SAILING_GATEWAY_BY_INLAND_CITY_ID.size !== INLAND_CITY_SAILING_GATEWAYS_1522.length) {
  throw new Error("Inland sailing gateway registry contains duplicate canonical ids");
}
for (const { inlandCityId, gatewayCityId } of INLAND_CITY_SAILING_GATEWAYS_1522) {
  if (!INLAND_CITY_ID_SET.has(inlandCityId)) {
    throw new Error(`Sailing gateway source is not registered inland: ${inlandCityId}`);
  }
  if (INLAND_CITY_ID_SET.has(gatewayCityId)) {
    throw new Error(`Sailing gateway is itself registered inland: ${gatewayCityId}`);
  }
}

export function cityMustRemainInland(city) {
  return INLAND_CITY_ID_SET.has(requireEntityId(city?.cityId, "Inland city"));
}

export function sailingGatewayCityIdForInlandCity(cityId) {
  return SAILING_GATEWAY_BY_INLAND_CITY_ID.get(
    requireEntityId(cityId, "Inland sailing gateway source")
  ) || null;
}

function gateway(inlandCityId, gatewayCityId) {
  return Object.freeze({
    inlandCityId: requireEntityId(inlandCityId, "Inland city gateway source"),
    gatewayCityId: requireEntityId(gatewayCityId, "Inland city gateway destination")
  });
}
