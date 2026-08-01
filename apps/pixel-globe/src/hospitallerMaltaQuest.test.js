import assert from "node:assert/strict";
import test from "node:test";

import {
  HOSPITALLER_MALTA_STAGE_COMPLETED,
  HOSPITALLER_MALTA_STAGE_PETITION,
  HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME,
  HOSPITALLER_MALTA_STAGE_SEEK_ROME,
  acceptHospitallerMaltaPetition,
  completeHospitallerMaltaQuest,
  createHospitallerMaltaQuestMemory,
  hospitallerMaltaQuestObjective,
  maybeActivateHospitallerMaltaQuest,
  recordHospitallerMaltaGrant,
  relocateHospitallerCaptainHome
} from "./hospitallerMaltaQuest.js";

const RHODES = Object.freeze({ tileId: 1, city: "Rhodes", country: "Greece", factionId: "ottoman" });
const ROME = Object.freeze({ tileId: 2, city: "Rome", country: "Italy", factionId: "papal-states" });
const MALTA = Object.freeze({ tileId: 3, city: "Birgu", country: "Malta", factionId: "spain" });
const SEVILLE = Object.freeze({ tileId: 4, city: "Seville", country: "Spain", factionId: "spain" });
const TRIPOLI = Object.freeze({ tileId: 5, city: "Tripoli", country: "Libya", factionId: "spain" });
const ENVOY = Object.freeze({ id: "malta-envoy", name: "Giulio Carafa" });

test("the Malta restoration remains locked until a Hospitaller captain loses Rhodes", () => {
  const memory = createHospitallerMaltaQuestMemory();
  assert.equal(maybeActivateHospitallerMaltaQuest(memory, {
    playerFactionId: "hospitallers",
    collapsedFactionIds: [],
    rhodes: RHODES,
    rome: ROME,
    malta: MALTA,
    simMinute: 100
  }), false);
  assert.equal(maybeActivateHospitallerMaltaQuest(memory, {
    playerFactionId: "spain",
    collapsedFactionIds: ["hospitallers"],
    rhodes: RHODES,
    rome: ROME,
    malta: MALTA,
    simMinute: 100
  }), false);
});

test("a dispossessed Hospitaller captain can secure Malta and report the grant to Rome", () => {
  const memory = createHospitallerMaltaQuestMemory();
  assert.equal(maybeActivateHospitallerMaltaQuest(memory, {
    playerFactionId: "hospitallers",
    collapsedFactionIds: ["hospitallers"],
    rhodes: RHODES,
    rome: ROME,
    malta: MALTA,
    simMinute: 100
  }), true);
  assert.equal(memory.stage, HOSPITALLER_MALTA_STAGE_SEEK_ROME);
  assert.equal(hospitallerMaltaQuestObjective(memory).destination.city, "Rome");

  acceptHospitallerMaltaPetition(memory, {
    grantorFactionId: "spain",
    grantorCapital: SEVILLE,
    envoy: ENVOY,
    simMinute: 200
  });
  assert.equal(memory.stage, HOSPITALLER_MALTA_STAGE_PETITION);
  assert.equal(hospitallerMaltaQuestObjective(memory).destination.city, "Seville");

  recordHospitallerMaltaGrant(memory, {
    grantedCities: [MALTA, TRIPOLI],
    simMinute: 300
  });
  assert.equal(memory.stage, HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME);
  assert.equal(hospitallerMaltaQuestObjective(memory).destination.city, "Rome");

  const completion = completeHospitallerMaltaQuest(memory, 400);
  assert.equal(memory.stage, HOSPITALLER_MALTA_STAGE_COMPLETED);
  assert.deepEqual(completion.grantedCities.map((city) => city.city), ["Birgu", "Tripoli"]);
  assert.equal(memory.envoy, null);
});

test("restoration moves a Hospitaller captain's home without changing nationality", () => {
  const state = {
    playerCharacter: {
      nationalityId: "hospitallers",
      homePortTileId: RHODES.tileId,
      homePortName: RHODES.city,
      homePortCountry: RHODES.country
    },
    memory: { campaignGoal: { homePortTileId: RHODES.tileId } }
  };
  assert.equal(relocateHospitallerCaptainHome(state, MALTA), true);
  assert.equal(state.playerCharacter.nationalityId, "hospitallers");
  assert.equal(state.playerCharacter.homePortName, "Birgu");
  assert.equal(state.memory.campaignGoal.homePortTileId, MALTA.tileId);
});
