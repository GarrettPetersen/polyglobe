import assert from "node:assert/strict";
import test from "node:test";
import { COLONIZATION_TARGETS } from "./colonialCities.js";
import { colonizationCitySceneOptions, colonizationSiteSpeakerRole } from "./colonizationCityPresentation.js";
import { questSiteArrivalCandidate } from "./questSiteArrival.js";

test("every colony renders its quest stage without retaining the catalog city's amenities", () => {
  for (const target of COLONIZATION_TARGETS) {
    for (const [questStage, expected] of [
      ["outbound", "uninhabited"], ["awaiting-resupply", "colony"],
      ["failed", "ruins"], ["defend-colony", "city"],
      ["report-defense", "city"], ["established", "city"]
    ]) {
      const city = colony(target, questStage);
      const before = structuredClone(city);
      const options = colonizationCitySceneOptions(city);
      assert.equal(options.featureOverrides.settlementStage,
        target.preexistingSettlement ? "city" : expected, `${target.cityId}:${questStage}`);
      assert.equal(options.population, city.population);
      assert.equal(options.settlementType, city.settlementType);
      assert.deepEqual(city, before, "presentation must not mutate quest/world history");
    }
  }
});

test("founding visit stays empty, while revisits and restored awaiting-resupply colonies have homes", () => {
  const target = COLONIZATION_TARGETS.find(({ preexistingSettlement }) => !preexistingSettlement);
  const city = colony(target, "awaiting-resupply");
  assert.equal(colonizationCitySceneOptions(city, { landingVisit: true })
    .featureOverrides.settlementStage, "uninhabited");
  assert.equal(colonizationCitySceneOptions(structuredClone(city)).featureOverrides.settlementStage, "colony");
  assert.equal(colonizationCitySceneOptions(colony(target, "established"), { landingVisit: true })
    .featureOverrides.settlementStage, "city", "full resupply upgrades even during the founding visit");
});

test("ordinary ports retain their presentation and invalid colony states fail loudly", () => {
  assert.deepEqual(colonizationCitySceneOptions({ cityId: "london|united kingdom" }), {});
  const city = colony(COLONIZATION_TARGETS[0], "established");
  assert.throws(() => colonizationCitySceneOptions({ ...city, cityId: "missing" }), /no target/);
  assert.throws(() => colonizationCitySceneOptions({ ...city, population: NaN }), /population/);
  assert.throws(() => colonizationCitySceneOptions({ ...city, colonizationQuestStage: "unexpected" }), /quest stage/);
});

test("failed and abandoned colonies retain ruins without resurrecting inhabitants or town services", () => {
  const target = COLONIZATION_TARGETS.find(({ preexistingSettlement }) => !preexistingSettlement);
  const failed = colonizationCitySceneOptions({ ...colony(target, "failed"), colonyBurning: true });
  assert.equal(failed.featureOverrides.npcs, 0);
  assert.equal(failed.featureOverrides.settlementStage, "ruins");
  assert.equal(failed.bombardmentEventId, null);
  const abandoned = colonizationCitySceneOptions({ ...colony(target, "established"), colonyAbandoned: true });
  assert.equal(abandoned.featureOverrides.npcs, 0);
  assert.equal(abandoned.featureOverrides.settlementStage, "ruins");
  assert.equal(abandoned.colonyClueId, "croatoan");
  assert.equal(abandoned.bombardmentEventId, null);
});

test("uninhabited quest sites can trigger arrival without a harbour master or port economy", () => {
  for (const target of COLONIZATION_TARGETS.filter(({ preexistingSettlement }) => !preexistingSettlement)) {
    const city = colony(target, "outbound");
    assert.equal(colonizationSiteSpeakerRole(city, city.cityId), "organizer");
    const call = { ...city, tileId: 99, requiredTradePort: false,
      character: { id: "colonial-organizer" }, interactionX: 10, interactionY: 10 };
    const arrival = questSiteArrivalCandidate({
      colonizationObjective: { kind: "found-colony", tileId: 99 },
      cityCalls: [call], playerInteractionPoint: { x: 10, y: 10 }
    });
    assert.equal(arrival.call, call);
    assert.equal(colonizationSiteSpeakerRole(colony(target, "failed"), target.cityId), "captain");
    assert.equal(colonizationSiteSpeakerRole(colony(target, "established"), target.cityId), null);
    assert.equal(colonizationSiteSpeakerRole(city, "another-expedition"), null);
  }
});

function colony(target, stage) {
  const upgraded = ["defend-colony", "report-defense", "established"].includes(stage);
  return { cityId: target.cityId, colonizationQuestSite: true, colonizationQuestStage: stage,
    population: upgraded ? 2400 : 120, settlementType: upgraded ? "city" : "village" };
}
