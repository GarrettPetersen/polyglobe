import test from "node:test";
import assert from "node:assert/strict";
import {
  CHEF_QUEST_STAGE_GATHERING,
  CHEF_QUEST_STAGE_RECRUITED,
  CHEF_QUEST_STAGE_RECRUITMENT,
  chefEventProfileForPort,
  chefQuestJournalText,
  chefQuestPortEligible,
  chefQuestState,
  completeChefBanquet,
  maybeSpawnChefQuest,
  recruitChef
} from "./chefQuest.js";
import { createGameState, deliverQuestCargoRequirement } from "./gameState.js";
import { NAMED_CREW_ROLE_CHEF, addNamedCrewMember } from "./namedCrew.js";

const stats = { slug: "test", cargoCapacity: 40, crewCapacity: 8, cannons: 0, mass: 10, navalWeaponKind: null };
const city = { tileId: 44, city: "Istanbul", country: "Ottoman Empire", cityType: "islamic-desert" };

function game() {
  return createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
}

test("a regional chef requests one complete edible ingredient list", () => {
  const state = game();
  const quest = maybeSpawnChefQuest(state, city, { simMinute: 0, spawnChance: 1 });
  assert.equal(quest.stage, CHEF_QUEST_STAGE_GATHERING);
  assert.equal(quest.ingredients.length, 4);
  assert.match(quest.event.eventLabel, /Sultan/);
  assert.equal(new Set(quest.ingredients.map((entry) => entry.goodId)).size, 4);
  assert.match(chefQuestJournalText(quest), /for Istanbul:/);
});

test("demo chefs request only ingredients sold inside the accessible region", () => {
  const availableIngredientGoodIds = new Set(["fish", "pepper", "wine", "olive-oil"]);
  const state = game();
  const quest = maybeSpawnChefQuest(state, city, {
    simMinute: 0,
    spawnChance: 1,
    availableIngredientGoodIds
  });

  assert.deepEqual(
    quest.ingredients.map((ingredient) => ingredient.goodId),
    ["fish", "pepper", "wine", "olive-oil"]
  );

  const incompleteMarketState = game();
  assert.equal(maybeSpawnChefQuest(incompleteMarketState, city, {
    simMinute: 0,
    spawnChance: 1,
    availableIngredientGoodIds: new Set(["fish", "pepper", "wine"])
  }), null);
});

test("rice can satisfy the chef quest's staple course", () => {
  const state = game();
  const quest = maybeSpawnChefQuest(state, city, {
    simMinute: 0,
    spawnChance: 1,
    availableIngredientGoodIds: new Set(["rice", "pepper", "wine", "olive-oil"])
  });

  assert.deepEqual(
    quest.ingredients.map((ingredient) => ingredient.goodId),
    ["rice", "pepper", "wine", "olive-oil"]
  );
});

test("delivering every ingredient advances to a persistent recruitment", () => {
  const state = game();
  const quest = maybeSpawnChefQuest(state, city, { simMinute: 0, spawnChance: 1 });
  for (const [index, ingredient] of quest.ingredients.entries()) {
    state.cargo[ingredient.goodId] = 1;
    deliverQuestCargoRequirement(
      state,
      city,
      ingredient.goodId,
      1,
      ingredient.requirementId
    );
    const progress = chefQuestState(state, city);
    assert.equal(progress.ingredients[index].ready, true);
    assert.equal(progress.complete, index === quest.ingredients.length - 1);
  }
  assert.equal(chefQuestState(state, city).complete, true);
  assert.equal(chefQuestJournalText(chefQuestState(state, city)), "Bring all ingredients to Istanbul.");
  const recruitment = completeChefBanquet(state, city, 100);
  assert.equal(recruitment.stage, CHEF_QUEST_STAGE_RECRUITMENT);
  assert.equal(chefQuestJournalText(recruitment), "Offer the cook a berth at Istanbul.");
  assert.deepEqual(state.cargo, {});
  assert.equal(recruitChef(state, city).stage, CHEF_QUEST_STAGE_RECRUITED);
});

test("chef event copy follows the host region", () => {
  assert.match(chefEventProfileForPort(city).eventLabel, /Sultan/);
  assert.match(chefEventProfileForPort({ country: "Japan", cityType: "east-asian" }).eventLabel, /governor/);
  assert.match(chefEventProfileForPort({ country: "England", cityType: "northern-european" }).eventLabel, /midsummer/);
  const wendat = {
    tileId: 45,
    city: "Wendat Village",
    country: "Canada",
    cityType: "mesoamerican",
    manualRegion: "great-lakes",
    settlementType: "village"
  };
  assert.equal(chefQuestPortEligible(wendat), true);
  assert.match(chefEventProfileForPort(wendat).eventLabel, /longhouses/);
  assert.doesNotMatch(chefEventProfileForPort(wendat).eventLabel, /merchant|guild/i);
  assert.match(chefEventProfileForPort({
    ...wendat,
    city: "Tahiti Village",
    country: "French Polynesia",
    cityType: "polynesian",
    manualRegion: "pacific-islands"
  }).eventLabel, /voyagers/);
});

test("active village chef quests migrate away from the urban guild banquet", () => {
  const state = game();
  const legacyVillage = {
    tileId: 45,
    city: "Wendat Village",
    country: "Canada"
  };
  assert.equal(
    maybeSpawnChefQuest(state, legacyVillage, { simMinute: 0, spawnChance: 1 }).event.id,
    "guild-banquet"
  );
  const restoredVillage = {
    ...legacyVillage,
    cityType: "mesoamerican",
    manualRegion: "great-lakes",
    settlementType: "village"
  };
  const restoredQuest = chefQuestState(state, restoredVillage);
  assert.equal(restoredQuest.event.id, "great-lakes-council-feast");
  assert.match(restoredQuest.event.eventLabel, /longhouses/);
});

test("a renamed or conquered host port keeps its chef quest", () => {
  const state = game();
  maybeSpawnChefQuest(state, city, { simMinute: 0, spawnChance: 1 });
  const changedCity = {
    ...city,
    displayCity: "Constantinople",
    country: "Rumelia",
    factionId: "venice"
  };

  const quest = chefQuestState(state, changedCity);
  assert.equal(quest.port.city, "Constantinople");
  assert.equal(quest.port.country, "Rumelia");
  assert.match(chefQuestJournalText(quest), /Constantinople/);
});

test("chef missions do not spawn without a permanent berth, while active missions continue", () => {
  const oneBerthStats = { ...stats, slug: "one-berth-test", crewCapacity: 1 };
  const fullState = createGameState({ cargoCapacity: oneBerthStats.cargoCapacity, shipStats: oneBerthStats });
  assert.equal(maybeSpawnChefQuest(fullState, city, { simMinute: 0, spawnChance: 1 }), null);

  const activeState = game();
  const activeQuest = maybeSpawnChefQuest(activeState, city, { simMinute: 0, spawnChance: 1 });
  activeState.ship.crew = activeState.ship.crewCapacity;
  for (let index = 0; index < stats.crewCapacity - 1; index += 1) {
    addNamedCrewMember(activeState, {
      id: `chef-berth-${index}`,
      name: `Crew ${index}`,
      expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }],
      skillIds: ["able-seaman"]
    }, NAMED_CREW_ROLE_CHEF, { replaceGenericWhenFull: true });
  }
  assert.deepEqual(maybeSpawnChefQuest(activeState, city, { simMinute: 1, spawnChance: 0 }), activeQuest);
});
