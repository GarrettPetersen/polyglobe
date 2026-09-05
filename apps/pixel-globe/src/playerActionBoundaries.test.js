import { readFileSync } from "node:fs";
import test from "node:test";
import { auditDialogueChoices, auditInnQuestScenario, crewRecruitmentBoundaryScenarios,
  innQuestBoundaryScenarios } from "../tools/reachability/port-dialogue-reachability.mjs";

const { cities } = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url), "utf8"));

for (const scenario of innQuestBoundaryScenarios(cities)) {
  test(`[player action boundary] ${scenario.auditId}`, () => {
    auditInnQuestScenario(scenario);
  });
}

for (const scenario of crewRecruitmentBoundaryScenarios(cities)) {
  test(`[player action boundary] ${scenario.auditId}`, () => {
    auditDialogueChoices(scenario);
  });
}
