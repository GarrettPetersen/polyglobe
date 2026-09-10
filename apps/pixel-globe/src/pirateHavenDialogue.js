import { acceptPirateHavenQuest, completePirateHavenQuest } from "./pirateHavens.js";

export function pirateHavenCommissionView(state, city, context) {
  const memory = state.memory.pirateHavens;
  const kind = city.isPirateHideout ? "revenge" : "suppression";
  const quest = memory[kind];
  const back = { label: "Back to city", action: { type: "node", nodeId: "root" } };
  if (quest) {
    const atIssuer = quest.originCityId === city.cityId;
    if (kind === "revenge" && !quest.ready && typeof context.pirateRevengeTargetPresent !== "boolean") throw new Error("Pirate audience requires the target ship's current status");
    const lostTarget = kind === "revenge" && !quest.ready && !context.pirateRevengeTargetPresent;
    return { speaker: city.isPirateHideout ? "Pirate captain" : "Harbour captain", expressionId: "stern",
      text: lostTarget ? "That ship has gone down, and my cup with it. Our bargain is finished." : quest.ready ? `The deed is done. Return to ${quest.originName} for your ${quest.reward} doubloons.`
        : kind === "revenge" ? `${quest.targetCaptainName} still has my silver cup aboard ${quest.targetShipName}. Look for that merchant near ${quest.targetPortName}. Bring the cup back here.`
        : `Break the batteries and drive the pirates out of ${quest.havenName}. Then return to ${quest.originName}.`,
      options: [...(quest.ready && atIssuer ? [{ label: kind === "revenge" ? "Return the silver cup" : "Report the haven destroyed",
        action: { type: "complete-pirate-haven-quest", kind } }] : []),
        { label: "Abandon this commission", action: { type: "abandon-pirate-haven-quest", kind } }, back] };
  }
  const offer = context.pirateHavenQuestOffer;
  if (offer === undefined) throw new Error("Pirate audience requires an evaluated commission offer");
  return { speaker: city.isPirateHideout ? "Pirate captain" : "Harbour captain", expressionId: "stern",
    text: !offer ? "I have no business for you today."
      : kind === "revenge" ? `${offer.targetCaptainName} cheated me of my share. Take my silver cup from ${offer.targetShipName}, last seen near ${offer.targetPortName}. Bring it here for ${offer.reward} doubloons.`
      : `I will mark ${offer.havenName} on your chart: ${offer.distanceKm} kilometres by sea. Silence its shore guns and storm the camp. Return for ${offer.reward} doubloons.`,
    options: [...(offer ? [{ label: "I will undertake it", action: { type: "accept-pirate-haven-quest", offer } }] : []), back] };
}
export function selectPirateHavenCommission(state, city, action, context) {
  const memory = state.memory.pirateHavens;
  if (action.type === "accept-pirate-haven-quest") {
    if (!action.offer || action.offer.originCityId !== city.cityId || !["revenge", "suppression"].includes(action.offer.kind)) {
      throw new Error("Pirate commission has the wrong issuer or kind");
    }
    const current = context.pirateHavenQuestOffer;
    if (current === undefined) throw new Error("Pirate commission acceptance requires an evaluated offer");
    if (!current || JSON.stringify(current) !== JSON.stringify(action.offer)) {
      // A pending world update may move or sink a merchant after the offer was
      // drawn. Refresh the terms openly; never accept a different contract.
      return { changed: false, feedback: "That business has changed. Hear my latest offer before you agree." };
    }
    acceptPirateHavenQuest(memory, current);
  } else if (action.type === "complete-pirate-haven-quest") {
    completePirateHavenQuest(state, city.cityId, action.kind, context.simMinute);
  } else if (action.type === "abandon-pirate-haven-quest") {
    if (!["revenge", "suppression"].includes(action.kind) || !memory[action.kind]) throw new Error("No pirate commission to abandon");
    memory[action.kind] = null;
  } else throw new Error(`Unknown pirate commission action: ${action.type}`);
  return { changed: true, feedback: null };
}

export function pirateHavenNavigationReasonText(quest, lostTarget) {
  if (lostTarget) return "Ship lost: close commission";
  if (quest.ready) return "Collect commission reward";
  return quest.kind === "revenge" ? "Recover the silver cup" : "Destroy pirate haven";
}
