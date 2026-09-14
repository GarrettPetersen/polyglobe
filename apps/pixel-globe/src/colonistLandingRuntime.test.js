import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { requireEntityById, requireEntityId } from "./entityIds.js";
import { COLONIZATION_SETTLER_COUNT } from "./colonizationParty.js";
import { colonistSexes, createColonistTravelerPeople } from "./expeditionTravelers.js";
import { cityCivilianAppearanceIds } from "../city-visualizer/cityPeople.js";
import { createCityColonistRoster, cityColonistLandingFrame } from "../city-visualizer/cityColonistLanding.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const catalog = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url), "utf8"));

for (const sex of ["male", "female"]) {
  test(`landing receives the aboard settlers and ${sex} organizer through the runtime`, () => {
    const origin = { ...catalog.cities[0], cityId: catalog.cities[0].id };
    const cityId = "test-colony";
    const leader = { id: "test-organizer", sex };
    let rendered;
    const context = {
      gameState: { memory: { colonization: { originCityId: origin.cityId, targetCityId: cityId },
        quests: { conquistador: { stage: "inactive" } } } },
      cityById: new Map([[origin.cityId, origin]]),
      requireEntityById, requireEntityId, colonistSexes, createColonistTravelerPeople,
      cityCivilianAppearanceIds, COLONIZATION_SETTLER_COUNT,
      TRAVELER_KIND_SETTLER: "settler", CONQUISTADOR_STAGE_CAPTURE: "capture",
      activeNamedTravelMissions: () => [], currentCaptureCommissionTravelerPeople: () => [],
      expeditionIdentityFactory: () => ({ id }) => ({ givenName: id }),
      ensureColonizationOrganizer: () => leader,
      portCityView: { cityId, colonistLanding: null, sceneReady: true },
      dialogueState: { cityId }, portCitySceneSyncKey: "ready", portCityTransition: null,
      invalidateDialogueOptionGeometry() {},
      portCityRuntime: {
        setColonistLandingElapsedMs(elapsedMs, { originCityId, settlers, leader }) {
          assert.equal(originCityId, origin.cityId);
          rendered = cityColonistLandingFrame(createCityColonistRoster(origin, { settlers, leader }), elapsedMs);
          return rendered.complete;
        }
      }
    };
    const names = ["currentColonistTravelerPeople", "currentExpeditionTravelerPeople",
      "beginColonistLanding", "colonistLandingInProgress", "updateColonistLanding"];
    runInNewContext(names.map(name => source.statements.find(node =>
      ts.isFunctionDeclaration(node) && node.name?.text === name).getText(source)).join("\n"), context);
    const aboard = context.currentExpeditionTravelerPeople({
      travelerGroups: [{ kind: "settler", count: COLONIZATION_SETTLER_COUNT }], colonyLeader: leader
    });
    context.beginColonistLanding({ cityId, originCityId: origin.cityId });
    context.portCitySceneSyncKey = "ready";
    context.updateColonistLanding(1000);
    assert.deepEqual(rendered.units.slice(0, -1).map(({ id, appearanceId }) => ({ id, appearanceId })),
      Array.from(aboard, ({ id, appearanceId }) => ({ id, appearanceId })));
    assert.equal(rendered.units.at(-1).id, leader.id);
  });
}
