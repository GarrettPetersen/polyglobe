import { colonizationSiteIsRuined } from "./colonialCities.js";
export function citySiteIsRuined(city) {
  return city?.pirateHavenRuined === true || colonizationSiteIsRuined(city);
}
