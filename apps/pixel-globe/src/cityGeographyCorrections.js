// Corrections to imported geography retain the released canonical ID: changing
// a city's name or country must not orphan saves, characters, or quest history.
// Chandler's "Dienne" row has the alias "Jenne", but was geocoded in Senegal.
// Djenné belongs in Mali's Bani/Niger floodplain (UNESCO property 116).
export const CITY_GEOGRAPHY_CORRECTIONS = new Map([
  ["dienne|senegal", Object.freeze({
    // Use the ASCII transliteration consistently across all pixel fonts.
    city: "Djenne",
    country: "Mali",
    territoryId: "mali",
    lat: 13.90556,
    lon: -4.555,
    requiredTradePort: true
  })],
  ["ohrid|bulgaria", Object.freeze({
    // The source row accidentally used coordinates near Oryahovo, Bulgaria.
    // Preserve the released canonical ID, but put Ohrid at Lake Ohrid. The
    // lake has no navigable outlet to the sea, so this is an inland city.
    country: "North Macedonia",
    territoryId: "north macedonia",
    lat: 41.1231,
    lon: 20.8016,
    coastalIntent: false,
    lakeIntent: false
  })]
]);

export const CITY_PORT_APPROACH_OVERRIDES = new Map([
  ["newcastle upon tyne|united kingdom", "river"],
  ["seoul|republic of korea", "river"],
  ["kaesong|dem. people's republic of korea", "river"]
]);

export function cityPortApproachOverride(city) {
  return CITY_PORT_APPROACH_OVERRIDES.get(city?.cityId) || null;
}
