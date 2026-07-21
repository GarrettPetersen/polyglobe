import { campaignGoalPresentation } from "./campaignGoals.js";
import {
  NAMED_CREW_ROLE_CHEF,
  NAMED_CREW_ROLE_CREWMATE,
  NAMED_CREW_ROLE_HISTORIAN
} from "./namedCrew.js";

export function captainCharacterGoal(campaignGoal) {
  const presentation = campaignGoalPresentation(campaignGoal);
  return characterGoal(`campaign:${presentation.type}`, presentation.objective);
}

export function travelerCharacterGoal(quest) {
  if (!quest || typeof quest !== "object") throw new Error("Traveler goal requires an active quest");
  const destination = quest.destinationName;
  if (typeof destination !== "string" || destination.trim() === "") {
    throw new Error("Traveler goal requires a destination");
  }
  return characterGoal(`travel:${quest.id || destination}`, `Reach ${destination.trim()}`);
}

export function colonyLeaderCharacterGoal(colonyName) {
  if (typeof colonyName !== "string" || colonyName.trim() === "") {
    throw new Error("Colony leader goal requires a colony name");
  }
  return characterGoal(`colony:${colonyName.trim()}`, `Found ${colonyName.trim()}`);
}

export function namedCrewCharacterGoal(character) {
  if (!character || typeof character !== "object") throw new Error("Crewmate goal requires a character");
  if (typeof character.goal === "string" && character.goal.trim() !== "") {
    return characterGoal(`character:${character.id}`, character.goal.trim());
  }
  const text = {
    [NAMED_CREW_ROLE_CHEF]: "Keep the crew well fed",
    [NAMED_CREW_ROLE_HISTORIAN]: "Study the reconstructed longship at sea",
    [NAMED_CREW_ROLE_CREWMATE]: "Help the voyage succeed"
  }[character.role || NAMED_CREW_ROLE_CREWMATE];
  if (!text) throw new Error(`Unknown named crewmate role: ${character.role}`);
  return characterGoal(`crew:${character.id}`, text);
}

export function validateCharacterGoal(goal) {
  if (!goal || typeof goal !== "object" || Array.isArray(goal)) {
    throw new Error("Character goal must be an object");
  }
  if (typeof goal.id !== "string" || goal.id.trim() === "") {
    throw new Error("Character goal requires an id");
  }
  if (typeof goal.text !== "string" || goal.text.trim() === "") {
    throw new Error(`Character goal ${goal.id} requires text`);
  }
  return goal;
}

function characterGoal(id, text) {
  return Object.freeze(validateCharacterGoal({ id, text }));
}
