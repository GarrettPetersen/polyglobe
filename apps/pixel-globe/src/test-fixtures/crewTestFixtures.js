import { initializeProvisionalShipLoadout } from "../gameState.js";
import { createMigratedCrewRoster, validateCrewAggregate } from "../crewMembers.js";

export const TEST_CREW_HOME_PORT = Object.freeze({
  id: "test-home|test",
  cityId: "test-home|test",
  tileId: 1,
  city: "Test Home",
  displayCity: "Test Home",
  country: "Test",
  cityType: "northern-european",
  population: 20_000
});

export function testCrewGenerationContext(homePort = TEST_CREW_HOME_PORT) {
  const normalizedHomePort = Object.freeze({
    ...homePort,
    id: homePort.id || homePort.cityId,
    cityId: homePort.cityId || homePort.id
  });
  return Object.freeze({
    homePort: normalizedHomePort,
    appearances: Object.freeze([
      Object.freeze({ appearanceId: "mariner-light-black-hair", crewTypeId: "sailor" }),
      Object.freeze({ appearanceId: "gunner-light", crewTypeId: "gunner" })
    ]),
    nameForIdentity: (identityKey) => `Crew-${identityKey.split("|").at(-1)}`
  });
}

export function initializeTestProvisionalShipLoadout(state, stats, homePort = null) {
  const homePortCityId = state.playerCharacter?.homePortCityId || TEST_CREW_HOME_PORT.cityId;
  const resolvedHomePort = homePort || {
    ...TEST_CREW_HOME_PORT,
    id: homePortCityId,
    cityId: homePortCityId
  };
  return initializeProvisionalShipLoadout(state, stats, testCrewGenerationContext(resolvedHomePort));
}

export function testCrewMigrationOptions(homePort = TEST_CREW_HOME_PORT) {
  const context = testCrewGenerationContext(homePort);
  return {
    crewMigrationContextForHomePort: (homePortCityId) => {
      if (homePortCityId === null || homePortCityId === undefined) return context;
      if (context.homePort.cityId !== homePortCityId) {
        return testCrewGenerationContext({ ...context.homePort, id: homePortCityId, cityId: homePortCityId });
      }
      return context;
    }
  };
}

export function setTestCrewCount(state, count, homePort = null) {
  if (!state?.ship || !Number.isInteger(count) || count < 0 || count > state.ship.crewCapacity) {
    throw new Error(`Invalid test crew count: ${count}/${state?.ship?.crewCapacity}`);
  }
  const namedCount = state.namedCrew.length;
  const ordinaryCount = count === 0 ? 0 : count - 1 - namedCount;
  if (ordinaryCount < 0) throw new Error(`Test crew ${count} is below named crew commitments`);
  const homePortCityId = state.playerCharacter?.homePortCityId || TEST_CREW_HOME_PORT.cityId;
  const resolvedHomePort = homePort || {
    ...TEST_CREW_HOME_PORT,
    id: homePortCityId,
    cityId: homePortCityId
  };
  const generation = testCrewGenerationContext(resolvedHomePort);
  state.crewRoster = createMigratedCrewRoster({
    count: ordinaryCount,
    voyageSeed: `${state.voyageSeed}|test-count|${count}`,
    homePort: generation.homePort,
    currentMinute: state.survival.lastMinute,
    appearances: generation.appearances,
    nameForIdentity: generation.nameForIdentity
  });
  state.ship.crew = count;
  validateCrewAggregate(state);
  return state;
}

export function setTestCrewExperienceStars(state, stars) {
  const sailingMinutesByStars = [0, 14 * 24 * 60, 45 * 24 * 60, 120 * 24 * 60];
  if (!Number.isInteger(stars) || sailingMinutesByStars[stars] === undefined) {
    throw new Error(`Invalid test crew experience: ${stars}`);
  }
  for (const member of state.crewRoster) member.sailingMinutes = sailingMinutesByStars[stars];
  return state;
}
