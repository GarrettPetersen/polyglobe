import {
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId
} from "./factions.js";

export const HOSPITALLER_MALTA_QUEST_VERSION = 1;
export const HOSPITALLER_MALTA_STAGE_LOCKED = "locked";
export const HOSPITALLER_MALTA_STAGE_SEEK_ROME = "seek-rome";
export const HOSPITALLER_MALTA_STAGE_PETITION = "petition";
export const HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME = "return-to-rome";
export const HOSPITALLER_MALTA_STAGE_COMPLETED = "completed";

export const HOSPITALLER_FACTION_ID = "hospitallers";
export const HOSPITALLER_MALTA_GRANTOR_FACTION_ID = "spain";
export const HOSPITALLER_MALTA_REWARD = 1800;

const PAPAL_FACTION_ID = "papal-states";
const STAGES = new Set([
  HOSPITALLER_MALTA_STAGE_LOCKED,
  HOSPITALLER_MALTA_STAGE_SEEK_ROME,
  HOSPITALLER_MALTA_STAGE_PETITION,
  HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME,
  HOSPITALLER_MALTA_STAGE_COMPLETED
]);

export function createHospitallerMaltaQuestMemory() {
  return {
    version: HOSPITALLER_MALTA_QUEST_VERSION,
    stage: HOSPITALLER_MALTA_STAGE_LOCKED,
    activatedMinute: null,
    acceptedMinute: null,
    grantedMinute: null,
    completedMinute: null,
    rome: null,
    malta: null,
    grantorFactionId: null,
    grantorCapital: null,
    grantedCities: [],
    envoy: null
  };
}

export function migrateHospitallerMaltaQuestMemory(memory) {
  return memory == null
    ? createHospitallerMaltaQuestMemory()
    : validateHospitallerMaltaQuestMemory(memory);
}

export function validateHospitallerMaltaQuestMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory) ||
      memory.version !== HOSPITALLER_MALTA_QUEST_VERSION) {
    throw new Error(`Unsupported Hospitaller Malta quest memory: ${memory?.version ?? "missing"}`);
  }
  if (!STAGES.has(memory.stage)) {
    throw new Error(`Invalid Hospitaller Malta quest stage: ${memory.stage}`);
  }
  if (!Array.isArray(memory.grantedCities)) {
    throw new Error("Hospitaller Malta quest granted cities must be an array");
  }
  memory.grantedCities.forEach(validatePortReference);

  if (memory.stage === HOSPITALLER_MALTA_STAGE_LOCKED) {
    assertEmptyProgress(memory);
    return memory;
  }

  assertMinute(memory.activatedMinute, "Hospitaller Malta activation");
  validatePortReference(memory.rome);
  validatePortReference(memory.malta);

  if (memory.stage === HOSPITALLER_MALTA_STAGE_SEEK_ROME) {
    if (memory.acceptedMinute !== null || memory.grantedMinute !== null ||
        memory.completedMinute !== null || memory.grantorFactionId !== null ||
        memory.grantorCapital !== null || memory.grantedCities.length !== 0) {
      throw new Error("Hospitaller Malta quest awaiting Rome retains later progress");
    }
    if (memory.envoy !== null) validateEnvoy(memory.envoy);
    return memory;
  }

  assertMinute(memory.acceptedMinute, "Hospitaller Malta acceptance");
  if (memory.acceptedMinute < memory.activatedMinute) {
    throw new Error("Hospitaller Malta petition predates the fall of Rhodes");
  }
  assertFactionId(memory.grantorFactionId);
  if ([NEUTRAL_FACTION_ID, PIRATE_FACTION_ID, HOSPITALLER_FACTION_ID].includes(
    memory.grantorFactionId
  )) {
    throw new Error(`Invalid Hospitaller Malta grantor: ${memory.grantorFactionId}`);
  }
  validatePortReference(memory.grantorCapital);

  if (memory.stage === HOSPITALLER_MALTA_STAGE_PETITION) {
    validateEnvoy(memory.envoy);
    if (memory.grantedMinute !== null || memory.completedMinute !== null ||
        memory.grantedCities.length !== 0) {
      throw new Error("Unheard Hospitaller Malta petition contains a territorial grant");
    }
    return memory;
  }

  assertMinute(memory.grantedMinute, "Hospitaller Malta grant");
  if (memory.grantedMinute < memory.acceptedMinute || memory.grantedCities.length < 1 ||
      !memory.grantedCities.some((city) => city.tileId === memory.malta.tileId)) {
    throw new Error("Hospitaller Malta grant does not include Malta");
  }
  if (memory.stage === HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME) {
    validateEnvoy(memory.envoy);
    if (memory.completedMinute !== null) {
      throw new Error("Unreported Hospitaller Malta grant has a completion minute");
    }
    return memory;
  }

  assertMinute(memory.completedMinute, "Hospitaller Malta completion");
  if (memory.completedMinute < memory.grantedMinute || memory.envoy !== null) {
    throw new Error("Completed Hospitaller Malta quest retains an envoy or invalid chronology");
  }
  return memory;
}

export function maybeActivateHospitallerMaltaQuest(memory, {
  playerFactionId,
  collapsedFactionIds,
  rhodes,
  rome,
  malta,
  simMinute
}) {
  validateHospitallerMaltaQuestMemory(memory);
  if (memory.stage !== HOSPITALLER_MALTA_STAGE_LOCKED) return false;
  if (!Array.isArray(collapsedFactionIds)) {
    throw new Error("Hospitaller Malta activation requires collapsed factions");
  }
  if (playerFactionId !== HOSPITALLER_FACTION_ID ||
      !collapsedFactionIds.includes(HOSPITALLER_FACTION_ID) ||
      rhodes?.factionId === HOSPITALLER_FACTION_ID ||
      rome?.factionId !== PAPAL_FACTION_ID ||
      malta?.factionId !== HOSPITALLER_MALTA_GRANTOR_FACTION_ID) {
    return false;
  }
  assertMinute(simMinute, "Hospitaller Malta activation");
  memory.stage = HOSPITALLER_MALTA_STAGE_SEEK_ROME;
  memory.activatedMinute = simMinute;
  memory.rome = portReference(rome);
  memory.malta = portReference(malta);
  validateHospitallerMaltaQuestMemory(memory);
  return true;
}

export function acceptHospitallerMaltaPetition(memory, {
  grantorFactionId,
  grantorCapital,
  envoy,
  simMinute
}) {
  validateHospitallerMaltaQuestMemory(memory);
  if (memory.stage !== HOSPITALLER_MALTA_STAGE_SEEK_ROME) {
    throw new Error(`Cannot accept Hospitaller Malta petition from stage: ${memory.stage}`);
  }
  assertMinute(simMinute, "Hospitaller Malta petition acceptance");
  assertFactionId(grantorFactionId);
  if (grantorFactionId !== HOSPITALLER_MALTA_GRANTOR_FACTION_ID) {
    throw new Error(`Historical Malta grant requires Spanish control: ${grantorFactionId}`);
  }
  validatePortReference(grantorCapital);
  validateEnvoy(envoy);
  memory.stage = HOSPITALLER_MALTA_STAGE_PETITION;
  memory.acceptedMinute = simMinute;
  memory.grantorFactionId = grantorFactionId;
  memory.grantorCapital = portReference(grantorCapital);
  memory.envoy = envoy;
  validateHospitallerMaltaQuestMemory(memory);
  return hospitallerMaltaQuestState(memory);
}

export function resetHospitallerMaltaPetition(memory) {
  validateHospitallerMaltaQuestMemory(memory);
  if (memory.stage !== HOSPITALLER_MALTA_STAGE_PETITION) return false;
  memory.stage = HOSPITALLER_MALTA_STAGE_SEEK_ROME;
  memory.acceptedMinute = null;
  memory.grantorFactionId = null;
  memory.grantorCapital = null;
  validateHospitallerMaltaQuestMemory(memory);
  return true;
}

export function recordHospitallerMaltaGrant(memory, { grantedCities, simMinute }) {
  validateHospitallerMaltaQuestMemory(memory);
  if (memory.stage !== HOSPITALLER_MALTA_STAGE_PETITION) {
    throw new Error(`Cannot grant Malta from Hospitaller quest stage: ${memory.stage}`);
  }
  if (!Array.isArray(grantedCities) || grantedCities.length < 1) {
    throw new Error("Hospitaller Malta grant requires at least one city");
  }
  assertMinute(simMinute, "Hospitaller Malta territorial grant");
  memory.stage = HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME;
  memory.grantedMinute = simMinute;
  memory.grantedCities = grantedCities.map(portReference);
  validateHospitallerMaltaQuestMemory(memory);
  return hospitallerMaltaQuestState(memory);
}

export function completeHospitallerMaltaQuest(memory, simMinute) {
  validateHospitallerMaltaQuestMemory(memory);
  if (memory.stage !== HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME) {
    throw new Error(`Cannot complete Hospitaller Malta quest from stage: ${memory.stage}`);
  }
  assertMinute(simMinute, "Hospitaller Malta quest completion");
  const result = Object.freeze({
    grantedCities: Object.freeze(memory.grantedCities.map((city) => Object.freeze({ ...city }))),
    envoy: Object.freeze({ ...memory.envoy }),
    rewardDoubloons: HOSPITALLER_MALTA_REWARD
  });
  memory.stage = HOSPITALLER_MALTA_STAGE_COMPLETED;
  memory.completedMinute = simMinute;
  memory.envoy = null;
  validateHospitallerMaltaQuestMemory(memory);
  return result;
}

export function hospitallerMaltaQuestState(memory) {
  validateHospitallerMaltaQuestMemory(memory);
  return Object.freeze({
    ...memory,
    rome: memory.rome ? Object.freeze({ ...memory.rome }) : null,
    malta: memory.malta ? Object.freeze({ ...memory.malta }) : null,
    grantorCapital: memory.grantorCapital ? Object.freeze({ ...memory.grantorCapital }) : null,
    grantedCities: Object.freeze(memory.grantedCities.map((city) => Object.freeze({ ...city }))),
    envoy: memory.envoy ? Object.freeze({ ...memory.envoy }) : null,
    objective: hospitallerMaltaQuestObjective(memory)
  });
}

export function hospitallerMaltaQuestObjective(memory) {
  validateHospitallerMaltaQuestMemory(memory);
  if (memory.stage === HOSPITALLER_MALTA_STAGE_SEEK_ROME ||
      memory.stage === HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME) {
    return Object.freeze({
      kind: memory.stage,
      destination: Object.freeze({ ...memory.rome })
    });
  }
  if (memory.stage === HOSPITALLER_MALTA_STAGE_PETITION) {
    return Object.freeze({
      kind: memory.stage,
      destination: Object.freeze({ ...memory.grantorCapital })
    });
  }
  return null;
}

export function relocateHospitallerCaptainHome(state, malta) {
  if (state?.playerCharacter?.nationalityId !== HOSPITALLER_FACTION_ID) return false;
  validatePortReference(malta);
  state.playerCharacter.homePortTileId = malta.tileId;
  state.playerCharacter.homePortName = malta.city;
  state.playerCharacter.homePortCountry = malta.country;
  if (state.memory?.campaignGoal) state.memory.campaignGoal.homePortTileId = malta.tileId;
  return true;
}

function assertEmptyProgress(memory) {
  for (const key of [
    "activatedMinute",
    "acceptedMinute",
    "grantedMinute",
    "completedMinute",
    "rome",
    "malta",
    "grantorFactionId",
    "grantorCapital",
    "envoy"
  ]) {
    if (memory[key] !== null) throw new Error(`Locked Hospitaller Malta quest retains ${key}`);
  }
  if (memory.grantedCities.length !== 0) {
    throw new Error("Locked Hospitaller Malta quest retains granted cities");
  }
}

function portReference(port) {
  validatePortReference(port);
  return {
    tileId: port.tileId,
    city: port.city,
    country: port.country
  };
}

function validatePortReference(port) {
  if (!port || typeof port !== "object" || Array.isArray(port) ||
      !Number.isInteger(port.tileId) || port.tileId < 0 ||
      typeof port.city !== "string" || port.city.trim() === "" ||
      typeof port.country !== "string" || port.country.trim() === "") {
    throw new Error("Hospitaller Malta quest contains an invalid port reference");
  }
  return port;
}

function validateEnvoy(envoy) {
  if (!envoy || typeof envoy !== "object" || Array.isArray(envoy) ||
      typeof envoy.id !== "string" || envoy.id.trim() === "" ||
      typeof envoy.name !== "string" || envoy.name.trim() === "") {
    throw new Error("Hospitaller Malta quest requires a named Papal envoy");
  }
  return envoy;
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}
