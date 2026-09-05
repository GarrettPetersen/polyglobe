import {
  awardPlayerShip,
  futurePermanentCrewFloor,
  grantGuaranteedMissionPerkItem,
  playerCrewBoardingEligibility,
  playerShipReplacementEligibility,
  purchasePlayerShip
} from "./gameState.js";
import { addNamedCrewMember, NAMED_CREW_ROLE_CHEF, NAMED_CREW_ROLE_HISTORIAN } from "./namedCrew.js";
import { chefQuestState, CHEF_QUEST_STAGE_RECRUITMENT, recruitChef } from "./chefQuest.js";
import {
  acceptVikingLongshipReward,
  markVikingLongshipPurchased,
  vikingLongshipQuestState,
  VIKING_LONGSHIP_PRICE,
  VIKING_LONGSHIP_REWARD_PENDING,
  VIKING_LONGSHIP_REWARD_DECLINED,
  VIKING_LONGSHIP_SLUG
} from "./vikingLongshipQuest.js";
import { VIKING_BOWS_ITEM_ID } from "./portableWeapons.js";
import { shipStatsForSlug } from "./shipStats.js";
import { shipReplacementTermsWithoutTradeIn } from "./shipyards.js";
import { crewHoldSpace } from "./shipLoadouts.js";

export function vikingLongshipAcquisitionEligibility(state, city) {
  const quest = vikingLongshipQuestState(state, city);
  if (!quest?.unlocked || ![VIKING_LONGSHIP_REWARD_PENDING, VIKING_LONGSHIP_REWARD_DECLINED].includes(quest.rewardDisposition)) {
    throw new Error("Longship acquisition requires an unclaimed, completed reconstruction");
  }
  const stats = shipStatsForSlug(VIKING_LONGSHIP_SLUG);
  const replacement = playerShipReplacementEligibility(state, stats);
  const extraCrewSpace = crewHoldSpace(Math.min(state.ship.crew + 1, stats.crewCapacity)) - crewHoldSpace(state.ship.crew);
  const price = quest.rewardDisposition === VIKING_LONGSHIP_REWARD_PENDING ? 0 : VIKING_LONGSHIP_PRICE;
  const disabledReason = state.ship.slug === VIKING_LONGSHIP_SLUG
    ? "You already command the reconstructed longship."
    : !replacement.eligible ? replacement.disabledReason
    : futurePermanentCrewFloor(state) >= stats.crewCapacity
      ? "The historical enthusiast needs a permanent berth aboard the longship."
    : replacement.transferredCargoUsed + extraCrewSpace > replacement.cargoCapacity
      ? "Make room in the hold for the historical enthusiast before taking the longship."
    : state.doubloons < price
      ? `You need ${price - state.doubloons} more doubloons.`
    : null;
  return { eligible: disabledReason === null, disabledReason };
}

// The browser and action audit execute the same domain transaction. Asset
// loading, sound, and handover animation remain owned by the browser.
export function completeVikingLongshipAcquisition(state, city, action, context) {
  const expectedAction = vikingLongshipQuestState(state, city)?.rewardDisposition === VIKING_LONGSHIP_REWARD_PENDING
    ? "accept-viking-longship-reward" : "purchase-viking-longship";
  if (action.type !== expectedAction || action.shipSlug !== VIKING_LONGSHIP_SLUG) {
    throw new Error(`Invalid longship acquisition action: ${action.type}/${action.shipSlug}`);
  }
  const eligibility = vikingLongshipAcquisitionEligibility(state, city);
  if (!eligibility.eligible) throw new Error(`Cannot acquire longship: ${eligibility.disabledReason}`);
  const stats = shipStatsForSlug(VIKING_LONGSHIP_SLUG);
  if (action.type === "accept-viking-longship-reward") {
    awardPlayerShip(state, city, stats,
      "Longship awarded for completing the historical reconstruction", context);
    acceptVikingLongshipReward(state);
  } else if (action.type === "purchase-viking-longship") {
    purchasePlayerShip(state, city, stats,
      shipReplacementTermsWithoutTradeIn(VIKING_LONGSHIP_PRICE), context);
    markVikingLongshipPurchased(state);
  } else {
    throw new Error(`Unknown longship acquisition action: ${action.type}`);
  }
  addNamedCrewMember(state, city.character, NAMED_CREW_ROLE_HISTORIAN, {
    replaceGenericWhenFull: true
  });
  grantGuaranteedMissionPerkItem(state, city, {
    missionId: "viking-longship-armament",
    itemId: VIKING_BOWS_ITEM_ID,
    description: "Longship armament: Viking Bows",
    context
  });
  return stats;
}

export function completeChefRecruitment(state, city, character) {
  if (chefQuestState(state, city)?.stage !== CHEF_QUEST_STAGE_RECRUITMENT) {
    throw new Error("Chef is not ready to join the crew");
  }
  const eligibility = playerCrewBoardingEligibility(state);
  if (!eligibility.eligible) throw new Error(`Cannot recruit chef: ${eligibility.disabledReason}`);
  addNamedCrewMember(state, character, NAMED_CREW_ROLE_CHEF);
  recruitChef(state, city);
}
