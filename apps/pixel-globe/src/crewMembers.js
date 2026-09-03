import { requireCityId } from "./entityIds.js";
import { factionById } from "./factions.js";
import { assertNameCultureId } from "./characterNames.js";
import { religionById } from "./characterReligion.js";

export const CREW_EXPERIENCE_MAX_STARS = 3;
export const CREW_RECRUITMENT_MEMORY_VERSION = 1;

const MINUTES_PER_DAY = 24 * 60;
const EXPERIENCE_THRESHOLDS_MINUTES = Object.freeze([
  0,
  14 * MINUTES_PER_DAY,
  45 * MINUTES_PER_DAY,
  120 * MINUTES_PER_DAY
]);
const EXPERIENCE_CREW_CONTRIBUTION = Object.freeze([0.2, 0.47, 0.75, 1.1]);
const CASUALTY_WEIGHTS = Object.freeze([1.3, 1.1, 0.9, 0.7]);
const RECRUIT_COST_MULTIPLIERS = Object.freeze([1, 2, 4, 7]);
const CREW_OFFER_ID_COMPONENT = "crew-offer";
const CREW_CANDIDATE_ID_COMPONENT = "candidate";

export function createCrewRoster() {
  return [];
}

export function createCrewRecruitmentMemory() {
  return {
    version: CREW_RECRUITMENT_MEMORY_VERSION,
    nextOfferSerial: 1,
    offersByCityId: {}
  };
}

export function crewRosterMembers(state) {
  if (!Array.isArray(state?.crewRoster)) throw new Error("Game state requires an individual crew roster");
  return state.crewRoster;
}

export function validateCrewRoster(roster) {
  if (!Array.isArray(roster)) throw new Error("Crew roster must be an array");
  const ids = new Set();
  for (const member of roster) {
    validateCrewMember(member);
    if (ids.has(member.id)) throw new Error(`Duplicate crew member ID: ${member.id}`);
    ids.add(member.id);
  }
  return roster;
}

export function validateCrewRecruitmentMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Crew recruitment memory must be an object");
  }
  if (memory.version !== CREW_RECRUITMENT_MEMORY_VERSION) {
    throw new Error(`Unsupported crew recruitment memory version: ${memory.version}`);
  }
  if (!Number.isInteger(memory.nextOfferSerial) || memory.nextOfferSerial <= 0) {
    throw new Error(`Invalid next crew offer serial: ${memory.nextOfferSerial}`);
  }
  if (!memory.offersByCityId || typeof memory.offersByCityId !== "object" ||
      Array.isArray(memory.offersByCityId)) {
    throw new Error("Crew recruitment offers must be indexed by city ID");
  }
  for (const [cityId, offer] of Object.entries(memory.offersByCityId)) {
    if (cityId.trim() === "") throw new Error("Crew recruitment offer has an empty city ID");
    validateCrewRecruitmentOffer(offer, cityId);
  }
  return memory;
}

export function crewMemberExperienceStars(member) {
  validateCrewMember(member);
  let stars = 0;
  for (let index = 1; index < EXPERIENCE_THRESHOLDS_MINUTES.length; index += 1) {
    if (member.sailingMinutes < EXPERIENCE_THRESHOLDS_MINUTES[index]) break;
    stars = index;
  }
  return stars;
}

export function crewExperienceSummary(state, activeCrew = state?.ship?.crew ?? 0) {
  const roster = crewRosterMembers(state);
  if (!Number.isInteger(activeCrew) || activeCrew < 0) {
    throw new Error(`Invalid active crew for experience: ${activeCrew}`);
  }
  if (activeCrew > (state?.ship?.crew ?? 0)) {
    throw new Error(`Active crew exceeds the aboard roster: ${activeCrew}/${state?.ship?.crew ?? 0}`);
  }
  const starTotal = roster.reduce((sum, member) => sum + crewMemberExperienceStars(member), 0);
  const averageStars = roster.length === 0 ? 0 : starTotal / roster.length;
  const ordinaryContribution = roster.reduce(
    (sum, member) => sum + interpolatedCrewContribution(crewMemberExperienceStars(member)),
    0
  );
  const namedCount = state.namedCrew.length;
  const experiencedHands = namedCount + ordinaryContribution;
  const handsBeyondCaptain = namedCount + roster.length;
  const contribution = handsBeyondCaptain === 0 ? 0 : experiencedHands / handsBeyondCaptain;
  const effectiveCrew = activeCrew === 0
    ? 0
    : 1 + Math.max(0, activeCrew - 1) * contribution;
  return Object.freeze({
    memberCount: roster.length,
    averageStars,
    overallStars: Math.round(averageStars),
    effectiveCrew,
    contribution
  });
}

export function projectedCrewExperienceSummary(state, targetCrew) {
  if (!state?.ship) throw new Error("Projected crew experience requires a player ship");
  if (!Number.isInteger(targetCrew) || targetCrew < 1 || targetCrew > state.ship.crewCapacity) {
    throw new Error(`Invalid projected crew complement: ${targetCrew}/${state.ship.crewCapacity}`);
  }
  const permanentCrew = 1 + state.namedCrew.length;
  if (targetCrew < permanentCrew) {
    throw new Error(`Projected crew ${targetCrew} is below permanent crew ${permanentCrew}`);
  }
  if (targetCrew <= state.ship.crew) return crewExperienceSummary(state, targetCrew);
  if (state.ship.crew === 0) {
    const noviceCount = targetCrew - 1;
    return Object.freeze({
      memberCount: noviceCount,
      averageStars: 0,
      overallStars: 0,
      effectiveCrew: 1 + noviceCount * EXPERIENCE_CREW_CONTRIBUTION[0],
      contribution: targetCrew === 1 ? 0 : EXPERIENCE_CREW_CONTRIBUTION[0]
    });
  }
  const current = crewExperienceSummary(state);
  const noviceCount = targetCrew - state.ship.crew;
  const projectedMemberCount = current.memberCount + noviceCount;
  return Object.freeze({
    memberCount: projectedMemberCount,
    averageStars: projectedMemberCount === 0
      ? 0
      : current.averageStars * current.memberCount / projectedMemberCount,
    overallStars: projectedMemberCount === 0
      ? 0
      : Math.round(current.averageStars * current.memberCount / projectedMemberCount),
    effectiveCrew: current.effectiveCrew + noviceCount * EXPERIENCE_CREW_CONTRIBUTION[0],
    contribution: targetCrew === 1
      ? 0
      : (current.effectiveCrew - 1 + noviceCount * EXPERIENCE_CREW_CONTRIBUTION[0]) /
        (targetCrew - 1)
  });
}

export function advanceCrewSailingExperience(state, elapsedMinutes) {
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 0) {
    throw new Error(`Invalid crew sailing experience interval: ${elapsedMinutes}`);
  }
  if (elapsedMinutes === 0) return Object.freeze([]);
  const levelUps = [];
  for (const member of crewRosterMembers(state)) {
    const before = crewMemberExperienceStars(member);
    member.sailingMinutes += elapsedMinutes;
    const after = crewMemberExperienceStars(member);
    if (after > before) levelUps.push(Object.freeze({ memberId: member.id, before, after }));
  }
  return Object.freeze(levelUps);
}

export function createCrewMember({
  id,
  name,
  nameCulture,
  religionId,
  nationalityId,
  homePort,
  appearanceId,
  crewTypeId,
  recruitedAtMinute,
  sailingMinutes = 0
}) {
  const member = {
    id,
    name,
    nameCulture,
    religionId,
    nationalityId,
    homePortCityId: requireCityId(homePort, "Crew home port"),
    homePortTileId: homePort.tileId,
    homePortName: crewPortLabel(homePort),
    appearanceId,
    crewTypeId,
    recruitedAtMinute,
    sailingMinutes
  };
  validateCrewMember(member);
  return member;
}

export function createMigratedCrewRoster({
  count,
  voyageSeed,
  homePort,
  currentMinute,
  appearances,
  identityForKey
}) {
  requireCrewGenerationContext({ count, voyageSeed, homePort, currentMinute, appearances, identityForKey });
  const currentWholeMinute = Math.floor(currentMinute);
  const roster = [];
  for (let index = 0; index < count; index += 1) {
    const identityKey = `${voyageSeed}|legacy-crew|${homePort.cityId}|${index + 1}`;
    const seed = hashString32(identityKey);
    const appearance = appearances[seed % appearances.length];
    const stars = migratedExperienceStars(seed >>> 5);
    const identity = requireCrewIdentity(identityForKey(identityKey), identityKey);
    roster.push(createCrewMember({
      id: crewMemberId(identityKey),
      ...identity,
      homePort,
      appearanceId: appearance.appearanceId,
      crewTypeId: appearance.crewTypeId,
      recruitedAtMinute: Math.max(0, currentWholeMinute - migratedRecruitmentAgeMinutes(seed >>> 9, stars)),
      sailingMinutes: migratedSailingMinutes(seed >>> 13, stars)
    }));
  }
  return roster;
}

export function createCrewRecruitmentOffer({
  memory,
  state,
  city,
  simMinute,
  targetCrew,
  appearances,
  identityForKey,
  baseHireCost,
  allowEmpty = false,
  includeReplacementCandidates = false
}) {
  validateCrewRecruitmentMemory(memory);
  if (!state?.ship) throw new Error("Crew recruitment requires a player ship");
  if (!Number.isInteger(simMinute) || simMinute < 0) {
    throw new Error(`Invalid crew recruitment minute: ${simMinute}`);
  }
  if (!Number.isInteger(targetCrew) || targetCrew < 1 || targetCrew > state.ship.crewCapacity) {
    throw new Error(`Invalid crew recruitment target: ${targetCrew}`);
  }
  if (!Number.isInteger(baseHireCost) || baseHireCost <= 0) {
    throw new Error(`Invalid base crew hire cost: ${baseHireCost}`);
  }
  if (!Array.isArray(appearances) || appearances.length === 0) {
    throw new Error("Crew recruitment requires at least one recruitable appearance");
  }
  if (typeof identityForKey !== "function") throw new Error("Crew recruitment requires an identity factory");
  const cityId = requireCityId(city, "Crew recruitment city");
  const existing = memory.offersByCityId[cityId];
  if (existing) return existing;
  if (typeof includeReplacementCandidates !== "boolean") {
    throw new Error("Crew replacement-candidate policy must be boolean");
  }
  const shortfall = Math.max(0, Math.min(targetCrew, state.ship.crewCapacity) - state.ship.crew);
  const maximum = includeReplacementCandidates
    ? recruitmentMaximumForCity(city)
    : Math.min(shortfall, state.ship.crewCapacity - state.ship.crew, recruitmentMaximumForCity(city));
  const serial = memory.nextOfferSerial++;
  const seedKey = [state.voyageSeed, cityId, CREW_OFFER_ID_COMPONENT, serial, simMinute].join("|");
  let seed = hashString32(seedKey);
  const minimum = allowEmpty ? 0 : Math.min(1, maximum);
  const count = maximum <= 0 ? 0 : minimum + seed % (maximum - minimum + 1);
  const candidates = [];
  for (let index = 0; index < count; index += 1) {
    seed = xorshift32(seed);
    const appearance = appearances[seed % appearances.length];
    const identityKey = [seedKey, CREW_CANDIDATE_ID_COMPONENT, index + 1].join("|");
    const stars = recruitExperienceStars(seed >>> 8, city);
    const identity = requireCrewIdentity(identityForKey(identityKey), identityKey);
    const member = createCrewMember({
      id: crewMemberId(identityKey),
      ...identity,
      homePort: city,
      appearanceId: appearance.appearanceId,
      crewTypeId: appearance.crewTypeId,
      recruitedAtMinute: 0,
      sailingMinutes: initialSailingMinutes(seed >>> 13, stars)
    });
    candidates.push(Object.freeze({
      member,
      cost: baseHireCost * RECRUIT_COST_MULTIPLIERS[stars]
    }));
  }
  const offer = {
    id: `${cityId}:crew-offer:${serial}`,
    cityId,
    generatedAtMinute: simMinute,
    candidates
  };
  validateCrewRecruitmentOffer(offer, cityId);
  memory.offersByCityId[cityId] = offer;
  return offer;
}

export function crewRecruitmentOfferAt(memory, city) {
  validateCrewRecruitmentMemory(memory);
  return memory.offersByCityId[requireCityId(city, "Crew recruitment city")] || null;
}

export function clearCrewRecruitmentOffer(memory, city) {
  validateCrewRecruitmentMemory(memory);
  const cityId = requireCityId(city, "Crew recruitment city");
  const offer = memory.offersByCityId[cityId] || null;
  delete memory.offersByCityId[cityId];
  return offer;
}

export function hireCrewCandidate(state, memory, city, memberId, recruitedAtMinute) {
  validateCrewRecruitmentMemory(memory);
  const offer = crewRecruitmentOfferAt(memory, city);
  if (!offer) throw new Error(`No crew recruitment offer at ${requireCityId(city, "Crew recruitment city")}`);
  if (!Number.isInteger(recruitedAtMinute) || recruitedAtMinute < offer.generatedAtMinute) {
    throw new Error(`Invalid crew recruitment minute: ${recruitedAtMinute}`);
  }
  const index = offer.candidates.findIndex(({ member }) => member.id === memberId);
  if (index < 0) throw new Error(`Crew recruitment offer does not contain ${memberId}`);
  if (state.ship.crew >= state.ship.crewCapacity) throw new Error("No crew berth is available");
  const [candidate] = offer.candidates.splice(index, 1);
  if (state.doubloons < candidate.cost) {
    offer.candidates.splice(index, 0, candidate);
    throw new Error(`${candidate.member.name} costs ${candidate.cost} doubloons`);
  }
  if (crewRosterMembers(state).some(({ id }) => id === memberId)) {
    offer.candidates.splice(index, 0, candidate);
    throw new Error(`Crew member is already aboard: ${memberId}`);
  }
  state.doubloons -= candidate.cost;
  const member = { ...candidate.member, recruitedAtMinute };
  validateCrewMember(member);
  state.crewRoster.push(member);
  state.ship.crew += 1;
  validateCrewAggregate(state);
  return Object.freeze({ ...candidate, member });
}

export function dismissCrewMember(state, memberId) {
  const roster = crewRosterMembers(state);
  const index = roster.findIndex(({ id }) => id === memberId);
  if (index < 0) throw new Error(`Cannot dismiss missing crew member: ${memberId}`);
  const previousMemberId = roster[index - 1]?.id || null;
  const nextMemberId = roster[index + 1]?.id || null;
  const [member] = roster.splice(index, 1);
  state.ship.crew -= 1;
  validateCrewAggregate(state);
  return Object.freeze({ member, previousMemberId, nextMemberId });
}

export function restoreDismissedCrew(state, dismissals) {
  if (!Array.isArray(dismissals)) throw new Error("Dismissal undo requires a dismissal list");
  if (state.ship.crew + dismissals.length > state.ship.crewCapacity) {
    throw new Error("Dismissed crew no longer fit aboard");
  }
  const restoredById = new Map(crewRosterMembers(state).map((member) => [member.id, member]));
  for (const dismissal of dismissals) {
    if (!dismissal || typeof dismissal !== "object" || Array.isArray(dismissal)) {
      throw new Error("Dismissal undo requires dismissal records");
    }
    const { member, previousMemberId, nextMemberId } = dismissal;
    validateCrewMember(member);
    for (const [label, neighborId] of [["previous", previousMemberId], ["next", nextMemberId]]) {
      if (neighborId !== null && (typeof neighborId !== "string" || neighborId === "")) {
        throw new Error(`Dismissed crew member ${member.id} has an invalid ${label} roster neighbor`);
      }
    }
    if (restoredById.has(member.id)) {
      throw new Error(`Dismissed crew member is already aboard: ${member.id}`);
    }
    restoredById.set(member.id, member);
  }
  const followingIds = new Map([...restoredById.keys()].map((id) => [id, new Set()]));
  const precedingCount = new Map([...restoredById.keys()].map((id) => [id, 0]));
  const addOrderConstraint = (beforeId, afterId) => {
    if (beforeId === null || afterId === null) return;
    if (!restoredById.has(beforeId) || !restoredById.has(afterId)) {
      throw new Error(`Dismissal undo lost roster neighbor: ${beforeId}/${afterId}`);
    }
    const following = followingIds.get(beforeId);
    if (following.has(afterId)) return;
    following.add(afterId);
    precedingCount.set(afterId, precedingCount.get(afterId) + 1);
  };
  for (let index = 1; index < state.crewRoster.length; index += 1) {
    addOrderConstraint(state.crewRoster[index - 1].id, state.crewRoster[index].id);
  }
  for (const { member, previousMemberId, nextMemberId } of dismissals) {
    addOrderConstraint(previousMemberId, member.id);
    addOrderConstraint(member.id, nextMemberId);
  }
  const restoredOrder = [];
  const ready = [...restoredById.keys()].filter((id) => precedingCount.get(id) === 0);
  while (ready.length > 0) {
    if (ready.length !== 1) {
      throw new Error(`Dismissal undo cannot determine a unique roster order: ${ready.join(", ")}`);
    }
    const id = ready.pop();
    restoredOrder.push(restoredById.get(id));
    for (const followingId of followingIds.get(id)) {
      const remaining = precedingCount.get(followingId) - 1;
      precedingCount.set(followingId, remaining);
      if (remaining === 0) ready.push(followingId);
    }
  }
  if (restoredOrder.length !== restoredById.size) {
    throw new Error("Dismissal undo contains contradictory roster-order records");
  }
  state.crewRoster = restoredOrder;
  state.ship.crew += dismissals.length;
  validateCrewAggregate(state);
  return dismissals.length;
}

export function restoreCrewMember(state, member) {
  validateCrewMember(member);
  if (state.ship.crew >= state.ship.crewCapacity) return false;
  if (crewRosterMembers(state).some(({ id }) => id === member.id)) {
    throw new Error(`Crew member is already aboard: ${member.id}`);
  }
  state.crewRoster.push(member);
  state.ship.crew += 1;
  validateCrewAggregate(state);
  return true;
}

export function removeCrewCasualties(state, requestedLoss, random = Math.random) {
  if (!Number.isInteger(requestedLoss) || requestedLoss < 0) {
    throw new Error(`Invalid individual crew loss: ${requestedLoss}`);
  }
  if (typeof random !== "function") throw new Error("Crew casualty selection requires a random source");
  const casualties = [];
  const ordinaryLoss = Math.min(requestedLoss, crewRosterMembers(state).length);
  for (let index = 0; index < ordinaryLoss; index += 1) {
    const rosterIndex = weightedCasualtyIndex(state.crewRoster, random());
    const [member] = state.crewRoster.splice(rosterIndex, 1);
    state.ship.crew -= 1;
    casualties.push(Object.freeze({ kind: "crew", member }));
  }
  validateCrewAggregate(state);
  return Object.freeze(casualties);
}

export function removeCrewMembersById(state, memberIds) {
  if (!Array.isArray(memberIds) || memberIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Exact crew casualties require member IDs");
  }
  const uniqueIds = new Set(memberIds);
  if (uniqueIds.size !== memberIds.length) throw new Error("Exact crew casualties contain duplicate IDs");
  const roster = crewRosterMembers(state);
  const rosterById = new Map(roster.map((member) => [member.id, member]));
  for (const memberId of uniqueIds) {
    if (!rosterById.has(memberId)) throw new Error(`Cannot remove missing crew casualty: ${memberId}`);
  }
  if (uniqueIds.size === 0) return Object.freeze([]);
  const casualties = roster
    .filter((member) => uniqueIds.has(member.id))
    .map((member) => Object.freeze({ kind: "crew", member }));
  state.crewRoster = roster.filter((member) => !uniqueIds.has(member.id));
  state.ship.crew -= casualties.length;
  validateCrewAggregate(state);
  return Object.freeze(casualties);
}

export function validateCrewAggregate(state) {
  if (!state?.ship) {
    if (crewRosterMembers(state).length > 0) throw new Error("Crew roster exists without a player ship");
    return 0;
  }
  if (!Array.isArray(state.namedCrew)) throw new Error("Crew aggregate requires named crew");
  if (state.ship.crew === 0 && (state.namedCrew.length > 0 || crewRosterMembers(state).length > 0)) {
    throw new Error("A shipless captain cannot retain aboard crew members");
  }
  const expected = state.ship.crew === 0
    ? 0
    : 1 + state.namedCrew.length + crewRosterMembers(state).length;
  if (state.ship.crew !== expected) {
    throw new Error(
      `Player crew aggregate ${state.ship.crew} does not match captain, named crew, and roster ${expected}`
    );
  }
  if (expected > state.ship.crewCapacity) {
    throw new Error(`Player crew exceeds ship capacity: ${expected}/${state.ship.crewCapacity}`);
  }
  return expected;
}

export function migrateCrewRosterOriginTraits(roster, contextForHomePort) {
  if (!Array.isArray(roster)) throw new Error("Crew origin migration requires a roster");
  if (roster.length === 0) return [];
  if (typeof contextForHomePort !== "function") {
    throw new Error("Crew origin migration requires canonical home-port contexts");
  }
  const contextsByCityId = new Map();
  const migrated = roster.map((member) => {
    validateCrewMemberCore(member);
    let context = contextsByCityId.get(member.homePortCityId);
    if (!context) {
      context = contextForHomePort(member.homePortCityId);
      requireCrewIdentityContext(context, member.homePortCityId);
      contextsByCityId.set(member.homePortCityId, context);
    }
    const identity = requireCrewIdentity(context.identityForKey(member.id), member.id);
    const migratedMember = { ...member, ...identity, name: member.name };
    validateCrewMember(migratedMember);
    return migratedMember;
  });
  validateCrewRoster(migrated);
  return migrated;
}

function validateCrewMember(member) {
  validateCrewMemberCore(member);
  assertNameCultureId(member.nameCulture);
  religionById(member.religionId);
  factionById(member.nationalityId);
}

function validateCrewMemberCore(member) {
  if (!member || typeof member !== "object" || Array.isArray(member)) {
    throw new Error("Crew member must be an object");
  }
  for (const key of ["id", "name", "homePortCityId", "homePortName", "appearanceId", "crewTypeId"]) {
    if (typeof member[key] !== "string" || member[key].trim() === "") {
      throw new Error(`Crew member requires ${key}`);
    }
  }
  if (!Number.isInteger(member.homePortTileId) || member.homePortTileId < 0) {
    throw new Error(`Crew member ${member.id} has invalid home port tile: ${member.homePortTileId}`);
  }
  if (!Number.isInteger(member.recruitedAtMinute) || member.recruitedAtMinute < 0) {
    throw new Error(`Crew member ${member.id} has invalid recruitment minute: ${member.recruitedAtMinute}`);
  }
  if (!Number.isFinite(member.sailingMinutes) || member.sailingMinutes < 0) {
    throw new Error(`Crew member ${member.id} has invalid sailing experience: ${member.sailingMinutes}`);
  }
}

function validateCrewRecruitmentOffer(offer, expectedCityId) {
  if (!offer || typeof offer !== "object" || Array.isArray(offer)) {
    throw new Error(`Crew recruitment offer for ${expectedCityId} must be an object`);
  }
  if (typeof offer.id !== "string" || offer.id === "") throw new Error("Crew recruitment offer requires an ID");
  if (offer.cityId !== expectedCityId) {
    throw new Error(`Crew recruitment offer city changed: ${offer.cityId}/${expectedCityId}`);
  }
  if (!Number.isInteger(offer.generatedAtMinute) || offer.generatedAtMinute < 0) {
    throw new Error(`Invalid crew recruitment offer minute: ${offer.generatedAtMinute}`);
  }
  if (!Array.isArray(offer.candidates)) throw new Error("Crew recruitment offer requires candidates");
  const ids = new Set();
  for (const candidate of offer.candidates) {
    validateCrewMember(candidate?.member);
    if (!Number.isInteger(candidate.cost) || candidate.cost <= 0) {
      throw new Error(`Invalid crew recruitment cost: ${candidate?.cost}`);
    }
    if (ids.has(candidate.member.id)) throw new Error(`Duplicate crew recruitment candidate: ${candidate.member.id}`);
    ids.add(candidate.member.id);
  }
}

function recruitmentMaximumForCity(city) {
  if (!Number.isInteger(city.population) || city.population < 0) {
    throw new Error(`Crew recruitment city has invalid population: ${city.population}`);
  }
  if (city.population >= 100_000) return 6;
  if (city.population >= 30_000) return 5;
  if (city.population >= 8_000) return 4;
  if (city.population >= 2_000) return 3;
  return 2;
}

function recruitExperienceStars(seed, city) {
  const prosperityBonus = city.population >= 100_000 || city.isFactionCapital === true ? 8 : 0;
  const roll = seed % 100;
  if (roll < 3 + prosperityBonus / 4) return 2;
  if (roll < 24 + prosperityBonus) return 1;
  return 0;
}

function migratedExperienceStars(seed) {
  const roll = seed % 100;
  if (roll < 7) return 3;
  if (roll < 25) return 2;
  if (roll < 55) return 1;
  return 0;
}

function migratedSailingMinutes(seed, stars) {
  const lower = EXPERIENCE_THRESHOLDS_MINUTES[stars];
  const upper = stars === CREW_EXPERIENCE_MAX_STARS
    ? lower + 90 * MINUTES_PER_DAY
    : EXPERIENCE_THRESHOLDS_MINUTES[stars + 1] - 1;
  return lower + seed % Math.max(1, upper - lower + 1);
}

function initialSailingMinutes(seed, stars) {
  const lower = EXPERIENCE_THRESHOLDS_MINUTES[stars];
  const upper = stars === CREW_EXPERIENCE_MAX_STARS
    ? lower + 30 * MINUTES_PER_DAY
    : stars === 0
    ? Math.min(EXPERIENCE_THRESHOLDS_MINUTES[1] - 1, 6 * MINUTES_PER_DAY)
    : EXPERIENCE_THRESHOLDS_MINUTES[stars + 1] - 1;
  return lower + seed % Math.max(1, upper - lower + 1);
}

function migratedRecruitmentAgeMinutes(seed, stars) {
  return migratedSailingMinutes(seed, stars) + seed % (10 * MINUTES_PER_DAY);
}

function weightedCasualtyIndex(roster, roll) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Crew casualty roll must be in [0, 1): ${roll}`);
  }
  const weights = roster.map((member) => CASUALTY_WEIGHTS[crewMemberExperienceStars(member)]);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let target = roll * total;
  for (let index = 0; index < weights.length; index += 1) {
    if (target < weights[index]) return index;
    target -= weights[index];
  }
  return roster.length - 1;
}

function interpolatedCrewContribution(averageStars) {
  if (!Number.isFinite(averageStars) || averageStars < 0 || averageStars > CREW_EXPERIENCE_MAX_STARS) {
    throw new Error(`Invalid average crew experience: ${averageStars}`);
  }
  const lower = Math.floor(averageStars);
  const upper = Math.ceil(averageStars);
  if (lower === upper) return EXPERIENCE_CREW_CONTRIBUTION[lower];
  const t = averageStars - lower;
  return EXPERIENCE_CREW_CONTRIBUTION[lower] * (1 - t) + EXPERIENCE_CREW_CONTRIBUTION[upper] * t;
}

function crewMemberId(identityKey) {
  const first = hashString32(identityKey).toString(16).padStart(8, "0");
  const second = hashString32(`crew-identity|${identityKey}`).toString(16).padStart(8, "0");
  return `crew-${first}${second}`;
}

function requireCrewGenerationContext({ count, voyageSeed, homePort, currentMinute, appearances, identityForKey }) {
  if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid generated crew count: ${count}`);
  if (typeof voyageSeed !== "string" || voyageSeed === "") throw new Error("Generated crew requires a voyage seed");
  requireCityId(homePort, "Generated crew home port");
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid generated crew minute: ${currentMinute}`);
  }
  if (!Array.isArray(appearances) || appearances.length === 0) {
    throw new Error("Generated crew requires recruitable appearances");
  }
  for (const appearance of appearances) {
    if (typeof appearance?.appearanceId !== "string" || appearance.appearanceId === "" ||
        typeof appearance?.crewTypeId !== "string" || appearance.crewTypeId === "") {
      throw new Error("Generated crew appearance requires appearance and type IDs");
    }
  }
  if (typeof identityForKey !== "function") throw new Error("Generated crew requires an identity factory");
}

function requireCrewIdentityContext(context, homePortCityId) {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw new Error(`Crew identity migration requires the canonical home port ${homePortCityId}`);
  }
  if (requireCityId(context.homePort, "Crew identity home port") !== homePortCityId) {
    throw new Error(`Crew identity home port changed: ${context.homePort.cityId}/${homePortCityId}`);
  }
  if (typeof context.identityForKey !== "function") {
    throw new Error(`Crew identity migration requires an identity factory for ${homePortCityId}`);
  }
}

function requireCrewIdentity(identity, identityKey) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw new Error(`Crew identity factory returned no identity for ${identityKey}`);
  }
  for (const key of ["name", "nameCulture", "religionId", "nationalityId"]) {
    if (typeof identity[key] !== "string" || identity[key].trim() === "") {
      throw new Error(`Crew identity ${identityKey} requires ${key}`);
    }
  }
  assertNameCultureId(identity.nameCulture);
  religionById(identity.religionId);
  factionById(identity.nationalityId);
  return Object.freeze({
    name: identity.name,
    nameCulture: identity.nameCulture,
    religionId: identity.religionId,
    nationalityId: identity.nationalityId
  });
}

function crewPortLabel(city) {
  const label = city.portAlias || city.displayCity || city.city;
  if (typeof label !== "string" || label.trim() === "") throw new Error("Crew home port requires a name");
  return label;
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function xorshift32(value) {
  let result = value || 0x9e3779b9;
  result ^= result << 13;
  result ^= result >>> 17;
  result ^= result << 5;
  return result >>> 0;
}
