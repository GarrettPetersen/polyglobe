import assert from "node:assert/strict";
import test from "node:test";

import {
  aboardCrewExperienceLevelKey,
  aboardCrewMemberDetail,
  crewWoundNoticeText
} from "./aboardCrewPresentation.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

const CREW_MEMBER = Object.freeze({
  id: "crew-member:lisbon:1",
  name: "Mateus",
  nameCulture: "portuguese",
  religionId: "roman-catholic",
  nationalityId: "portugal",
  homePortCityId: "lisbon|portugal",
  homePortTileId: 42,
  homePortName: "Lisbon",
  appearanceId: "european-sailor",
  crewTypeId: "sailor",
  recruitedAtMinute: 10 * WEATHER_MINUTES_PER_DAY,
  sailingMinutes: 46 * WEATHER_MINUTES_PER_DAY,
  wound: null
});

test("aboard crew detail presents the durable crew facts", () => {
  assert.deepEqual(
    aboardCrewMemberDetail(CREW_MEMBER, 27 * WEATHER_MINUTES_PER_DAY + 90),
    {
      memberId: "crew-member:lisbon:1",
      name: "Mateus",
      homePortCityId: "lisbon|portugal",
      homePortName: "Lisbon",
      nameCulture: "portuguese",
      religionId: "roman-catholic",
      nationalityId: "portugal",
      typeLabel: "SAILOR",
      timeAboardDays: 17,
      monthlySalaryDoubloons: 5,
      wounded: false,
      woundRecoveryDays: 0,
      experienceStars: 2,
      experienceLevelKey: "aboard.experience.seasoned"
    }
  );
});

test("each experience tier has one thematic crew label", () => {
  assert.deepEqual(
    [0, 1, 2, 3].map(aboardCrewExperienceLevelKey),
    [
      "aboard.experience.novice",
      "aboard.experience.steady",
      "aboard.experience.seasoned",
      "aboard.experience.master"
    ]
  );
  assert.throws(() => aboardCrewExperienceLevelKey(4), /Invalid aboard crew experience level/);
});

test("aboard crew detail reports an individual's remaining wound recovery", () => {
  const detail = aboardCrewMemberDetail({
    ...CREW_MEMBER,
    wound: { cause: "port-assault", recoveryMinutesRemaining: WEATHER_MINUTES_PER_DAY + 1 }
  }, 27 * WEATHER_MINUTES_PER_DAY);
  assert.equal(detail.wounded, true);
  assert.equal(detail.woundRecoveryDays, 2);
});

test("combat wound notices identify at least the first injured crewmate", () => {
  assert.equal(crewWoundNoticeText([{ member: CREW_MEMBER }]), "MATEUS WOUNDED");
  assert.equal(crewWoundNoticeText([
    { member: CREW_MEMBER },
    { member: { ...CREW_MEMBER, id: "crew-member:lisbon:2", name: "Joao" } }
  ]), "MATEUS + 1 WOUNDED");
  assert.throws(() => crewWoundNoticeText([]), /requires wounded crewmates/);
});

test("aboard crew detail rejects a recruitment date in the future", () => {
  assert.throws(
    () => aboardCrewMemberDetail(CREW_MEMBER, CREW_MEMBER.recruitedAtMinute - 1),
    /recruited after the current minute/
  );
});
