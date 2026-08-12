import { factionById } from "./factions.js";
import {
  PAPAL_COMMISSION_ALMS,
  PAPAL_COMMISSION_ADMONITION,
  PAPAL_COMMISSION_COMMENDATION,
  PAPAL_COMMISSION_PEACE,
  PAPAL_COMMISSION_REFORM,
  PAPAL_COMMISSION_RELIEF,
  papalActionNotice,
  papalCommissionLabel
} from "./papalPolitics.js";
import { rulerAtMinute } from "./rulers.js";
import { QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER } from "./questJourneyDialogue.js";

export const PAPAL_COMMISSION_JOURNEY_EVENT_ID = "papal-sealed-brief";

export function papalCommissionOfferText(matter, simMinute, {
  destinationName = null,
  rhodesStillHospitaller = false
} = {}) {
  validateMatterView(matter);
  const target = factionById(matter.targetFactionId);
  const ruler = rulerAtMinute(matter.targetFactionId, simMinute);
  if (!ruler) throw new Error(`Papal commission target has no ruler: ${matter.targetFactionId}`);
  if (matter.commissionKind === PAPAL_COMMISSION_RELIEF) {
    if (!matter.beneficiaryFactionId) throw new Error("Papal war relief has no beneficiary");
    const beneficiary = factionById(matter.beneficiaryFactionId);
    const cargo = cargoBrief(matter);
    return rhodesStillHospitaller && matter.beneficiaryFactionId === "hospitallers"
      ? `Rhodes still stands before the Ottoman sea, but courage cannot feed its defenders. ` +
        `Carry ${cargo} and a Papal nuncio to ${requiredDestinationName(destinationName)}.`
      : `${beneficiary.name} is hard pressed by ${target.name}. Carry ${cargo} and a Papal nuncio ` +
        `to ${requiredDestinationName(destinationName)} before another Christian harbor is lost.`;
  }
  if (matter.commissionKind === PAPAL_COMMISSION_ALMS) {
    return `Rome's almoners have gathered ${cargoBrief(matter)} for the poor at ` +
      `${requiredDestinationName(destinationName)}. Carry the grain and a nuncio to oversee its distribution.`;
  }
  if (matter.commissionKind === PAPAL_COMMISSION_PEACE) {
    const partner = factionById(matter.partnerFactionId);
    return `${target.name} and ${partner.name} spend Christian blood against one another. ` +
      "Carry a Papal nuncio between their courts and return with both answers.";
  }
  if (matter.commissionKind === PAPAL_COMMISSION_ADMONITION) {
    return `${ruler.displayName} has drawn grave notice in Rome. Carry the Pope's sealed admonition ` +
      "and return with the ruler's answer.";
  }
  if (matter.commissionKind === PAPAL_COMMISSION_REFORM) {
    return "Adrian VI has sealed a reform brief for the northern clergy. Carry it north and return " +
      "with their answer.";
  }
  return `${ruler.displayName} may receive a public mark of Papal favor. ` +
    "His Holiness first wants a captain whose eyes are not those of a courtier.";
}

export function papalCommissionJourneyDialogueEvent(matter, simMinute) {
  validateMatterView(matter);
  const ruler = rulerAtMinute(matter.targetFactionId, simMinute);
  if (!ruler) throw new Error(`Papal journey target has no ruler: ${matter.targetFactionId}`);
  let text = null;
  if (matter.commissionKind === PAPAL_COMMISSION_ADMONITION) {
    text = `The brief begins with warning, not sentence. ${ruler.displayName} may answer before ` +
      "Rome decides whether to condemn, forgive, or demand obedience.";
  } else if (matter.commissionKind === PAPAL_COMMISSION_PEACE) {
    const target = factionById(matter.targetFactionId);
    const partner = factionById(matter.partnerFactionId);
    text = `The brief offers ${target.shortName} and ${partner.shortName} an honorable retreat from ` +
      "their quarrel. We must hear both courts before Rome chooses where to press hardest.";
  } else if (matter.commissionKind === PAPAL_COMMISSION_REFORM) {
    text = "Adrian's brief admits abuses within the Church without yielding its authority. The reply " +
      "will show whether reform can quiet the northern clergy or only sharpen the dispute.";
  }
  if (text === null) return null;
  return Object.freeze({
    id: PAPAL_COMMISSION_JOURNEY_EVENT_ID,
    trigger: QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER,
    expressionId: matter.commissionKind === PAPAL_COMMISSION_ADMONITION ? "stern" : "thoughtful",
    text
  });
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
    return opening + " The grain is counted into the granaries and the gunpowder into the magazines. " +
      "The answer makes plain both the danger and the price of further relief.";
  }
  if (matter.commissionKind === PAPAL_COMMISSION_ALMS) {
    return opening + " The grain is weighed beneath the nuncio's seal and passed to local almoners.";
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
    ],
    [PAPAL_COMMISSION_ALMS]: [
      ["Praise the local stewards", "firm"],
      ["Ask Rome for further alms", "moderate"]
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
  const cargoInstruction = matter.cargoRequirements.length > 0
    ? ` Procure ${cargoBrief(matter)} for the mission.`
    : "";
  return `${papalCommissionLabel(matter.commissionKind)} accepted. Monsignor ` +
    `${matter.commission.nuncio.name} comes aboard with the briefs.${cargoInstruction} ` +
    `Set a course for ${destinationName}.`;
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
  if (!Array.isArray(matter.cargoRequirements)) {
    throw new Error("Papal commission dialogue requires cargo requirements");
  }
}

function cargoBrief(matter) {
  if (matter.cargoRequirements.length === 0) return "no cargo";
  return matter.cargoRequirements.map((requirement) => {
    const label = requirement.goodId === "grain"
      ? "grain"
      : requirement.goodId === "gunpowder"
        ? "gunpowder"
        : null;
    if (!label || !Number.isInteger(requirement.quantity) || requirement.quantity <= 0) {
      throw new Error("Papal commission has invalid cargo for dialogue");
    }
    return `${requirement.quantity} cargoes of ${label}`;
  }).join(" and ");
}

function requiredDestinationName(destinationName) {
  if (typeof destinationName !== "string" || destinationName.trim() === "") {
    throw new Error("Papal transport commission requires a destination name");
  }
  return destinationName;
}
