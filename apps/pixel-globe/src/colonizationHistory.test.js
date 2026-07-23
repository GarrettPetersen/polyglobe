import assert from "node:assert/strict";
import test from "node:test";

import { COLONIZATION_TARGETS, colonizationTargetForCity } from "./colonialCities.js";
import { colonizationHistoryEntries, colonizationHistoryForTarget } from "./colonizationHistory.js";
import {
  advanceColonizationQuest,
  assertColonizationResupplyDelivery,
  assignColonizationQuest,
  beginColonizationExpedition,
  completeColonizationFetchStage,
  createColonizationQuestMemory,
  landColonists
} from "./colonizationQuest.js";
import { tradeGoodById } from "./economy.js";

const HISTORICAL_MARKERS = Object.freeze({
  Lima: /City of Kings|Taulichusco|Rimac/,
  Recife: /reef|Olinda|sugar/,
  Asuncion: /Sierra de la Plata|Cario Guarani|Casa Fuerte/,
  Salvador: /governor-general|Bay of All Saints|capital/,
  Concepcion: /Penco|Mapuche|frontier/,
  "Rio de Janeiro": /France Antarctique|Guanabara|Sao Sebastiao/,
  "St. Augustine": /Menendez|Fort Caroline|San Agustin/,
  Caracas: /Diego de Losada|Caracas valley|Santiago de Leon/,
  Manila: /Maynila|Tagalog|Chinese merchants/,
  Nagasaki: /Omura Sumitada|six streets|China ship/,
  Luanda: /Paulo Dias de Novais|Mbundu|enslaved/,
  "Buenos Aires": /Juan de Garay|Asuncion|refound/,
  "St. John's": /Humphrey Gilbert|seasonal fishery|cod/,
  "Port Royal": /Saint Croix|Mi'kmaq|Order of Good Cheer/,
  Jamestown: /Virginia Company|Powhatan|brackish/,
  Quebec: /Champlain|St. Lawrence|Innu/,
  "St. George's": /Sea Venture|Deliverance|Patience/,
  "Fort Orange": /Fort Nassau|Mahican|Mohawk/,
  Plymouth: /Patuxet|Wampanoag|epidemic/,
  "New Amsterdam": /West India Company|Lenape|Hudson/,
  Bridgetown: /Carlisle Bay|cotton|sugar/,
  Boston: /Winthrop|Blackstone|Shawmut/,
  "Trois-Rivieres": /Laviolette|Saint-Maurice|rendezvous/,
  Hartford: /Thomas Hooker|Saukiog|Dutch fort/,
  Providence: /Roger Williams|Canonicus|Miantonomi/,
  "New Haven": /Davenport|Eaton|Quinnipiac/,
  "Ville-Marie": /Maisonneuve|Jeanne Mance|Hotel-Dieu/,
  Charleston: /Lords Proprietors|Kayawah|Cusabo/,
  Philadelphia: /William Penn|Lenape|Holy Experiment/
});

test("every sailing colony target has a distinct complete historical quest profile", () => {
  const sailingTargets = COLONIZATION_TARGETS.filter((target) => target.waterAccess !== "inland");

  assert.equal(sailingTargets.length, 29);
  assert.equal(colonizationHistoryEntries().length, sailingTargets.length);
  assert.equal(Object.keys(HISTORICAL_MARKERS).length, sailingTargets.length);

  const pitches = new Set();
  const landings = new Set();
  const outcomes = new Set();
  for (const target of sailingTargets) {
    const history = colonizationHistoryForTarget(target);
    assert.equal(history.city, target.city);
    assert.equal(history.country, target.country);
    assert.equal(history.fetchStages.length, 3, target.city);
    assert.match(
      [history.basis, history.pitch, history.ready, history.landing, history.established].join(" "),
      HISTORICAL_MARKERS[target.city],
      target.city
    );
    for (const stage of history.fetchStages) {
      assert.equal(tradeGoodById(stage.goodId).label, stage.goodLabel, `${target.city}: ${stage.goodId}`);
      assert.ok(stage.quantity > 0 && stage.reward > 0, `${target.city}: ${stage.id}`);
      assert.ok(stage.lead.length > 20 && stage.purpose.length > 15, `${target.city}: ${stage.id}`);
    }
    assert.equal(tradeGoodById(history.resupply.goodId).label, history.resupply.goodLabel, target.city);
    pitches.add(history.pitch);
    landings.add(history.landing);
    outcomes.add(history.established);
  }
  assert.equal(pitches.size, sailingTargets.length);
  assert.equal(landings.size, sailingTargets.length);
  assert.equal(outcomes.size, sailingTargets.length);
});

test("inland historical sites remain excluded from sailing colony quests", () => {
  for (const target of COLONIZATION_TARGETS.filter((entry) => entry.waterAccess === "inland")) {
    assert.equal(colonizationHistoryForTarget(target), null, target.city);
  }
});

test("only documented waterborne colony attacks receive specific canoe-defense profiles", () => {
  const defenses = colonizationHistoryEntries()
    .filter((history) => history.defense)
    .map((history) => [history.city, history.defense.objectiveName, history.defense.minCanoes, history.defense.maxCanoes]);

  assert.deepEqual(defenses, [
    ["Rio de Janeiro", "Tamoio", 3, 4],
    ["Jamestown", "Powhatan", 2, 4],
    ["Ville-Marie", "Haudenosaunee", 2, 3]
  ]);
});

test("religious refuge colonies give their organizers explicit historical affiliations", () => {
  const organizerReligions = new Map(
    colonizationHistoryEntries()
      .filter(({ organizerReligionId }) => organizerReligionId)
      .map(({ city, organizerReligionId }) => [city, organizerReligionId])
  );
  assert.deepEqual(Object.fromEntries(organizerReligions), {
    "Fort Orange": "reformed-protestant",
    Plymouth: "reformed-protestant",
    "New Amsterdam": "reformed-protestant",
    Boston: "reformed-protestant",
    Hartford: "reformed-protestant",
    Providence: "reformed-protestant",
    "New Haven": "reformed-protestant",
    Philadelphia: "quaker"
  });
});

test("Nagasaki is a Japanese port sponsored from Portugal and Fort Orange starts in 1624", () => {
  const nagasaki = colonizationTargetForCity({ city: "Nagasaki", country: "Japan" });
  const fortOrange = colonizationTargetForCity({ city: "Fort Orange", country: "United States of America" });

  assert.equal(nagasaki.factionId, "japan");
  assert.equal(nagasaki.originFactionId, "portugal");
  assert.equal(nagasaki.originCountry, "Portugal");
  assert.equal(nagasaki.approvalFactionId, "japan");
  assert.equal(fortOrange.year, 1624);
});

test("target-specific fetch and resupply cargo drive the shared quest state", () => {
  const target = {
    ...colonizationTargetForCity({ city: "St. John's", country: "Canada" }),
    tileId: 901
  };
  const history = colonizationHistoryForTarget(target);
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, {
    target,
    origin: {
      tileId: 902,
      city: "Bristol",
      country: "England",
      factionId: "england",
      lat: 51.45,
      lon: -2.58
    }
  });

  assert.deepEqual(history.fetchStages.map((stage) => stage.goodId), ["timber", "salt", "wool-cloth"]);
  for (const stage of history.fetchStages) completeColonizationFetchStage(memory, stage.id);
  beginColonizationExpedition(memory);
  landColonists(memory, 1000);
  advanceColonizationQuest(memory, 1001, { awayFromColony: true });
  assert.equal(assertColonizationResupplyDelivery(memory, 1001).goodId, "salt");
});
