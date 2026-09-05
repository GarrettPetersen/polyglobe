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
  })]
]);
