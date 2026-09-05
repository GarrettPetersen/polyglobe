import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assignRegionalCharacterIdentity } from "./characterNames.js";
import { aboardCrewMemberDetail } from "./aboardCrewPresentation.js";
import { createCrewMember, createCrewRecruitmentMemory, createCrewRecruitmentOffer,
  crewRecruitmentHireCost, hireCrewCandidate, validateCrewRoster } from "./crewMembers.js";
import { cityRecruitableCrewAppearances } from "../city-visualizer/cityPeople.js";
import { CREW_HIRE_COST } from "./shipLoadouts.js";

const { cities } = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url), "utf8"));

test("every recruitable appearance at every port can be hired, saved and inspected", () => {
  const cultures = new Set();
  for (const city of cities) {
    for (const appearance of cityRecruitableCrewAppearances(city)) {
      const state = { voyageSeed: "crew-action-audit", doubloons: 1000,
        namedCrew: [], crewRoster: [], ship: { crew: 1, crewCapacity: 2 } };
      const memory = createCrewRecruitmentMemory();
      const offer = createCrewRecruitmentOffer({
        memory, state, city, simMinute: 10, targetCrew: 2, appearances: [appearance],
        baseHireCost: CREW_HIRE_COST,
        identityForKey: (identityKey) => ({
          ...assignRegionalCharacterIdentity({ identityKey, city, character: { sex: "male" }, usedNames: new Set() }),
          nationalityId: city.factionId
        })
      });
      assert.equal(offer.candidates.length, 1);
      const candidate = offer.candidates[0];
      const before = state.doubloons;
      hireCrewCandidate(state, memory, city, candidate.member.id, 11);
      assert.equal(state.doubloons, before - candidate.cost);
      const roster = JSON.parse(JSON.stringify(state.crewRoster));
      validateCrewRoster(roster);
      const detail = aboardCrewMemberDetail(roster[0], 12);
      assert.equal(detail.memberId, candidate.member.id);
      assert.ok(detail.cultureLabel.length > 0, `${city.cityId}/${appearance.appearanceId}`);
      cultures.add(detail.nameCulture);
    }
  }
  assert.ok(cultures.has("ryukyuan"), "the reported Naha recruitment path must be exercised");
});

test("combat qualifications add a small hiring premium at every experience level", () => {
  const city = cities.find(({ cityId }) => cityId === "naha|japan");
  for (const sailingMinutes of [0, 14 * 1440, 45 * 1440, 120 * 1440]) {
    const cost = (crewTypeId) => crewRecruitmentHireCost(createCrewMember({
      id: `price:${crewTypeId}`, name: "Taro", nameCulture: "ryukyuan",
      religionId: "kami-buddhist", nationalityId: "ryukyu", homePort: city,
      appearanceId: "japanese-samurai", crewTypeId, recruitedAtMinute: 0, sailingMinutes
    }), CREW_HIRE_COST);
    assert.equal(cost("ronin"), cost("sailor") + 1);
    assert.equal(cost("samurai"), cost("ronin") + 1);
    for (const role of ["warrior", "hunter", "archer", "spearman", "gunner", "swordsman", "shieldman", "halberdier", "crossbowman"]) {
      assert.ok(cost(role) > cost("sailor"), role);
    }
    assert.throws(() => cost("unregistered-fighter"), /no salary grade/);
  }
});
