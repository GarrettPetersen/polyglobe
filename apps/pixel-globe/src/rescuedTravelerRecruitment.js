import { recordCharacterHomecoming } from "./characterHomecoming.js";
import {
  reconcileNamedCrewMember,
  removeNamedCrewMember
} from "./namedCrew.js";
import { completeRescuedTravelerQuest } from "./rescuedTravelerQuest.js";

export function recruitRescuedTravelerAsNamedCrew(state, memory, quest, character, options = {}) {
  if (memory?.active !== quest) {
    throw new Error("Rescued traveler recruitment requires the active quest");
  }
  if (!state?.ship || !Array.isArray(state.namedCrew)) {
    throw new Error("Rescued traveler recruitment requires a player ship and named crew");
  }
  // Recruitment follows this traveler's completed homecoming scene.
  // Prepare the marker before mutation so invalid clock data cannot partly recruit.
  const homecoming = {};
  recordCharacterHomecoming(homecoming, character.id, state.survival.lastMinute);
  const crewBefore = state.ship.crew;
  const crewRosterBefore = [...state.crewRoster];
  const completedBefore = memory.completedCount;
  const activeBefore = memory.active;
  let reconciliation = null;
  try {
    reconciliation = reconcileNamedCrewMember(state, character, undefined, options);
    completeRescuedTravelerQuest(memory, quest.id);
    Object.assign(state.memory.decisions, homecoming);
    return reconciliation;
  } catch (error) {
    if (reconciliation?.added) {
      removeNamedCrewMember(state, reconciliation.member.id);
      state.ship.crew = crewBefore;
      state.crewRoster = crewRosterBefore;
    }
    memory.active = activeBefore;
    memory.completedCount = completedBefore;
    throw error;
  }
}
