import { colonizationTargetForCity } from "./colonialCities.js";
import {
  COLONIZATION_STAGE_OUTBOUND,
  COLONIZATION_STAGE_AWAITING_RESUPPLY,
  COLONIZATION_STAGE_DEFEND,
  COLONIZATION_STAGE_REPORT_DEFENSE,
  COLONIZATION_STAGE_ESTABLISHED,
  COLONIZATION_STAGE_FAILED
} from "./colonizationQuest.js";

export function colonizationSiteSpeakerRole(city, activeTargetCityId) {
  if (city?.colonizationQuestSite !== true) return null;
  if (city.colonyAbandoned === true) return "captain";
  if (city.cityId !== activeTargetCityId) return null;
  switch (city.colonizationQuestStage) {
    case COLONIZATION_STAGE_OUTBOUND:
    case COLONIZATION_STAGE_AWAITING_RESUPPLY:
    case COLONIZATION_STAGE_DEFEND:
    case COLONIZATION_STAGE_REPORT_DEFENSE:
      return "organizer";
    case COLONIZATION_STAGE_FAILED:
      return "captain";
    case COLONIZATION_STAGE_ESTABLISHED:
      return null;
    default:
      throw new Error(`Colony site speaker has invalid quest stage: ${city.colonizationQuestStage}`);
  }
}

// Quest history is authoritative. This presentation is rebuilt on every visit;
// it must not become a second persisted record of a colony's development.
export function colonizationCitySceneOptions(city, { landingVisit = false } = {}) {
  if (!city || typeof city.cityId !== "string" || !city.cityId) {
    throw new Error("Colony scene requires a canonical city ID");
  }
  if (typeof landingVisit !== "boolean") throw new Error("Invalid colony landing visit");
  if (city.colonizationQuestSite !== true) return Object.freeze({});
  const target = colonizationTargetForCity(city);
  if (!target) throw new Error(`Colony scene has no target: ${city.cityId}`);
  if (!Number.isInteger(city.population) || city.population < 1) {
    throw new Error(`Colony scene has invalid population: ${city.cityId}`);
  }
  let settlementStage;
  switch (city.colonizationQuestStage) {
    case COLONIZATION_STAGE_OUTBOUND:
      settlementStage = "uninhabited";
      break;
    case COLONIZATION_STAGE_AWAITING_RESUPPLY:
      settlementStage = landingVisit ? "uninhabited" : "colony";
      break;
    case COLONIZATION_STAGE_FAILED:
      settlementStage = "colony";
      break;
    case COLONIZATION_STAGE_DEFEND:
    case COLONIZATION_STAGE_REPORT_DEFENSE:
    case COLONIZATION_STAGE_ESTABLISHED:
      settlementStage = "city";
      break;
    default:
      throw new Error(`Colony scene has invalid quest stage: ${city.colonizationQuestStage}`);
  }
  // Trading missions develop inhabited ports; their existing homes and services
  // must not disappear when the visiting delegation disembarks.
  if (target.preexistingSettlement) settlementStage = "city";
  if (city.colonyAbandoned) settlementStage = "colony";
  const deserted = city.colonizationQuestStage === COLONIZATION_STAGE_FAILED || city.colonyAbandoned === true;
  return Object.freeze({
    population: city.population,
    settlementType: city.settlementType,
    ...(city.colonyBurning ? { bombardmentEventId: `failed-colony:${city.cityId}` } : {}),
    featureOverrides: Object.freeze({
      settlementStage,
      ...(target.preexistingSettlement ? {} : {
        fortified: false,
        leftBankCity: false,
        npcs: deserted ? 0 : settlementStage === "city" ? 4 : 3
      })
    })
  });
}
