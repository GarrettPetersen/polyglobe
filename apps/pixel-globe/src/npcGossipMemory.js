import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const NPC_GOSSIP_REPEAT_DAYS = 60;

const NPC_GOSSIP_DECISION_PREFIX = "npc-gossip-heard";

export function unheardNpcGossip(decisions, gossip, simMinute, perspectiveId = null) {
  if (gossip === null) return null;
  const key = npcGossipDecisionKey(gossip, perspectiveId);
  assertNpcGossipMemory(decisions, simMinute);
  if (!Object.prototype.hasOwnProperty.call(decisions, key)) return gossip;
  const lastHeardMinute = decisions[key];
  if (!Number.isFinite(lastHeardMinute) || lastHeardMinute < 0) {
    throw new Error(`Invalid NPC gossip memory for ${key}: ${lastHeardMinute}`);
  }
  if (lastHeardMinute > simMinute) {
    throw new Error(`NPC gossip memory is ahead of the voyage clock: ${lastHeardMinute} > ${simMinute}`);
  }
  const repeatAfterMinutes = NPC_GOSSIP_REPEAT_DAYS * WEATHER_MINUTES_PER_DAY;
  return simMinute - lastHeardMinute >= repeatAfterMinutes ? gossip : null;
}

export function recordNpcGossipHeard(decisions, gossip, simMinute, perspectiveId = null) {
  const key = npcGossipDecisionKey(gossip, perspectiveId);
  assertNpcGossipMemory(decisions, simMinute);
  if (unheardNpcGossip(decisions, gossip, simMinute, perspectiveId) === null) {
    throw new Error(`NPC gossip was repeated before its cooldown elapsed: ${key}`);
  }
  decisions[key] = simMinute;
  return key;
}

export function npcGossipId(gossip) {
  if (!gossip || typeof gossip !== "object" || Array.isArray(gossip)) {
    throw new Error("NPC gossip requires a gossip record");
  }
  if (typeof gossip.id === "string" && gossip.id.trim() !== "") return gossip.id.trim();
  if (typeof gossip.factionId === "string" && gossip.factionId.trim() !== "" &&
      Number.isFinite(gossip.fromMinute) && gossip.fromMinute >= 0 &&
      typeof gossip.displayName === "string" && gossip.displayName.trim() !== "") {
    return `ruler-change:${gossip.factionId}:${gossip.fromMinute}:${gossip.displayName.trim()}`;
  }
  throw new Error("NPC gossip requires an id or a complete ruler-change identity");
}

function npcGossipDecisionKey(gossip, perspectiveId) {
  if (perspectiveId !== null &&
      (typeof perspectiveId !== "string" || perspectiveId.trim() === "")) {
    throw new Error("NPC gossip perspective must be null or a non-empty string");
  }
  const identity = perspectiveId === null
    ? npcGossipId(gossip)
    : `${npcGossipId(gossip)}|perspective:${perspectiveId.trim()}`;
  return `${NPC_GOSSIP_DECISION_PREFIX}.${encodeURIComponent(identity)}`;
}

function assertNpcGossipMemory(decisions, simMinute) {
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    throw new Error("NPC gossip requires voyage decision memory");
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid NPC gossip minute: ${simMinute}`);
  }
}
