import { factionById } from "./factions.js";
import {
  PAPAL_COMMISSION_ADMONITION,
  PAPAL_COMMISSION_COMMENDATION,
  PAPAL_COMMISSION_PEACE,
  PAPAL_COMMISSION_REFORM,
  PAPAL_COMMISSION_RELIEF,
  papalActionNotice,
  papalCommissionLabel
} from "./papalPolitics.js";
import { rulerAtMinute } from "./rulers.js";

export function papalCommissionOfferText(matter, simMinute, { rhodesStillHospitaller = false } = {}) {
  validateMatterView(matter);
  const target = factionById(matter.targetFactionId);
  const ruler = rulerAtMinute(matter.targetFactionId, simMinute);
  if (!ruler) throw new Error(`Papal commission target has no ruler: ${matter.targetFactionId}`);
  if (matter.commissionKind === PAPAL_COMMISSION_RELIEF) {
    return rhodesStillHospitaller
      ? `Rhodes still stands before the Ottoman sea, but its defenders cannot live on courage alone. ` +
        "His Holiness requires a trusted captain to carry sealed pleas for relief."
      : `The eastern sea is hard pressed by ${target.name}. His Holiness requires a trusted captain ` +
        "to carry sealed pleas for relief before another Christian harbor is lost.";
  }
  if (matter.commissionKind === PAPAL_COMMISSION_PEACE) {
    const partner = factionById(matter.partnerFactionId);
    return `${target.name} and ${partner.name} spend Christian blood against one another. ` +
      "His Holiness would send a nuncio under your protection to seek an honorable peace.";
  }
  if (matter.commissionKind === PAPAL_COMMISSION_ADMONITION) {
    return `${ruler.displayName} has drawn grave notice in Rome. A nuncio must deliver ` +
      "the Pope's admonition, hear the answer, and return before judgment is entered.";
  }
  if (matter.commissionKind === PAPAL_COMMISSION_REFORM) {
    return "Adrian VI means to acknowledge abuses within the Church without yielding its authority. " +
      "His reform brief must be carried north, answered, and returned intact.";
  }
  return `${ruler.displayName} may receive a public mark of Papal favor. ` +
    "His Holiness first wants a captain whose eyes are not those of a courtier.";
}

export function papalCommissionDenialText(eligibility) {
  if (!eligibility || eligibility.eligible) throw new Error("Papal denial requires an ineligible captain");
  if (eligibility.reason === "papal-enemy") {
    return "The Curia entrusts no sealed legation to a captain whose sovereign stands against Rome.";
  }
  if (eligibility.reason === "outlaw-or-stateless") {
    return "The Holy See may bargain with many captains, but it does not commission an outlaw as its legate.";
  }
  if (eligibility.reason === "doctrinal-office-reserved") {
    return "This charge concerns the discipline of the Latin Church. It cannot be entrusted beyond it.";
  }
  if (eligibility.reason === "exceptional-trust-required") {
    return `A captain outside Christendom would require singular trust in Rome: ` +
      `${eligibility.requiredReputation} standing or better.`;
  }
  return `The Curia requires ${eligibility.requiredReputation} standing before it will entrust you ` +
    "with sealed Papal briefs.";
}

export function papalCommissionAudienceText(matter, destination, { finalAudience = false } = {}) {
  validateMatterView(matter);
  if (!destination || typeof destination.portName !== "string") {
    throw new Error("Papal audience requires its destination");
  }
  const target = factionById(destination.factionId);
  const opening = `The nuncio presents his sealed brief at ${destination.portName}. ` +
    `${target.adjective} officials receive it under the law of embassies.`;
  if (!finalAudience) return opening + " Their written answer is placed beneath the Papal seal.";
  if (matter.commissionKind === PAPAL_COMMISSION_PEACE) {
    return opening + " Both courts have now spoken. Rome will act upon the counsel you carry home.";
  }
  if (matter.commissionKind === PAPAL_COMMISSION_RELIEF) {
    return opening + " The answer makes plain both the danger and the price of relief.";
  }
  if (matter.commissionKind === PAPAL_COMMISSION_REFORM) {
    return opening + " The reply admits much, denies more, and leaves the final counsel to you.";
  }
  return opening + " What judgment should your report urge upon the Pope?";
}

export function papalCommissionRecommendationChoices(matter) {
  validateMatterView(matter);
  const partner = matter.partnerFactionId ? factionById(matter.partnerFactionId) : null;
  const choices = {
    [PAPAL_COMMISSION_ADMONITION]: [
      ["Demand obedience", "firm"],
      ["Counsel mercy", "moderate"]
    ],
    [PAPAL_COMMISSION_COMMENDATION]: [
      ["Commend the ruler", "firm"],
      ["Report grave concerns", "moderate"]
    ],
    [PAPAL_COMMISSION_PEACE]: [
      ["Broker a settlement", "firm"],
      [`Lay blame on ${partner.shortName}`, "moderate"]
    ],
    [PAPAL_COMMISSION_REFORM]: [
      ["Urge reform", "firm"],
      ["Demand discipline", "moderate"]
    ],
    [PAPAL_COMMISSION_RELIEF]: [
      ["Call Christendom to arms", "firm"],
      ["Seek a truce", "moderate"]
    ]
  }[matter.commissionKind];
  if (!choices) throw new Error(`Missing Papal recommendation choices: ${matter.commissionKind}`);
  return Object.freeze(choices.map(([label, recommendation]) => Object.freeze({
    label,
    recommendation
  })));
}

export function papalCommissionAcceptedText(matter, destinationName) {
  validateMatterView(matter);
  return `${papalCommissionLabel(matter.commissionKind)} accepted. Monsignor ` +
    `${matter.commission.nuncio.name} comes aboard with the briefs. Set a course for ${destinationName}.`;
}

export function papalCommissionCompletionText(completion) {
  if (!completion?.action || !Number.isInteger(completion.rewardDoubloons)) {
    throw new Error("Papal commission completion requires an action and reward");
  }
  return `${papalActionNotice(completion.action)}. The Apostolic Camera pays ` +
    `${completion.rewardDoubloons.toLocaleString("en-US")} doubloons for the completed legation.`;
}

function validateMatterView(matter) {
  if (!matter || typeof matter !== "object" || typeof matter.commissionKind !== "string" ||
      typeof matter.targetFactionId !== "string") {
    throw new Error("Papal commission dialogue requires a pending matter");
  }
}
