import assert from "node:assert/strict";
import test from "node:test";

import { createCrewMember } from "./crewMembers.js";
import {
  PORT_ASSAULT_CASUALTY_FATE,
  createPortAssaultCasualtyReport
} from "./portAssaultCasualtyReport.js";

const PORT = Object.freeze({
  cityId: "lisbon|portugal",
  tileId: 42,
  city: "Lisbon"
});

test("assault casualty reports preserve each sailor's identity and presentation", () => {
  const dead = member("crew:dead", "Joao", "swordsman-light", 45 * 24 * 60);
  const hurt = member("crew:wounded", "Tomas", "gunner-light", 14 * 24 * 60);
  hurt.wound = { cause: "port-assault", recoveryMinutesRemaining: 5 * 24 * 60 };

  const report = createPortAssaultCasualtyReport({
    deaths: [{ kind: "crew", member: dead }],
    wounded: [{ member: hurt, recoveryMinutes: 5 * 24 * 60 }]
  });

  assert.equal(report.deaths, 1);
  assert.equal(report.wounded, 1);
  assert.deepEqual(report.entries, [
    {
      memberId: dead.id,
      name: dead.name,
      appearanceId: dead.appearanceId,
      crewTypeId: dead.crewTypeId,
      experienceStars: 2,
      fate: PORT_ASSAULT_CASUALTY_FATE.DEAD,
      recoveryDays: 0
    },
    {
      memberId: hurt.id,
      name: hurt.name,
      appearanceId: hurt.appearanceId,
      crewTypeId: hurt.crewTypeId,
      experienceStars: 1,
      fate: PORT_ASSAULT_CASUALTY_FATE.WOUNDED,
      recoveryDays: 5
    }
  ]);
});

test("assault casualty reports reject duplicate or inconsistent identities", () => {
  const sailor = member("crew:duplicate", "Luis", "sailor-light", 0);
  sailor.wound = { cause: "port-assault", recoveryMinutesRemaining: 60 };
  assert.throws(() => createPortAssaultCasualtyReport({
    deaths: [{ kind: "crew", member: sailor }],
    wounded: [{ member: sailor, recoveryMinutes: 60 }]
  }), /repeats a crew member/);
  assert.throws(() => createPortAssaultCasualtyReport({
    deaths: [],
    wounded: [{ member: sailor, recoveryMinutes: 30 }]
  }), /does not match/);
});

function member(id, name, appearanceId, sailingMinutes) {
  return createCrewMember({
    id,
    name,
    nameCulture: "portuguese",
    religionId: "roman-catholic",
    nationalityId: "portugal",
    homePort: PORT,
    appearanceId,
    crewTypeId: "swordsman",
    recruitedAtMinute: 0,
    sailingMinutes
  });
}
