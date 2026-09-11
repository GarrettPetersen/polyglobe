const DAY = 1440;
function policy(spawnChance, rollDays, cooldownDays, repeatable = true) {
  return Object.freeze({ spawnChance, rollPeriodMinutes: rollDays * DAY, cooldownMinutes: cooldownDays * DAY, repeatable });
}
// Authored campaigns get one guaranteed opportunity at their designated trigger;
// their completed/offer-seen state prevents respawning. Repeatable work rolls once
// per local time window. Arrival prompts have an additional cross-port cooldown.
export const QUEST_OFFER_POLICIES = Object.freeze({
  delivery: policy(0.32, 7, 7), passenger: policy(0.12, 7, 7), envoy: policy(0.08, 7, 7),
  religious: policy(0.45, 7, 7), capture: policy(0.35, 30, 30), wokou: policy(0.28, 30, 30),
  chef: policy(0.08, 21, 21, false), colonization: policy(0.12, 14, 14),
  ginger: policy(0.35, 7, 7, false), matchlocks: policy(0.35, 7, 7, false),
  longship: policy(0.2, 30, 30, false),
  "pirate-suppression": policy(0.2, 30, 60), "pirate-contract": policy(0.5, 30, 60),
  "war-loan": policy(0.2, 30, 180), shipyard: policy(0.25, 30, 60),
  castaway: policy(1 / 750, 1, 30), "pirate-captive": policy(1 / 3, 1, 30),
  "tea-race": policy(1, 365, 365),
  exeter: policy(1, 60, 60, false), conquistador: policy(1, 60, 60, false),
  naturalist: policy(1, 60, 60, false), hospitaller: policy(1, 60, 60, false)
});
export function questOfferPolicy(kind) {
  if (!Object.hasOwn(QUEST_OFFER_POLICIES, kind)) throw new Error(`Quest offer has no spawn policy: ${kind}`);
  return QUEST_OFFER_POLICIES[kind];
}
export function questOfferRoll(seed, issuerId, simMinute, kind) {
  const { rollPeriodMinutes } = questOfferPolicy(kind);
  if (typeof seed !== "string" || !seed || typeof issuerId !== "string" || !issuerId || !Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid ${kind} quest offer seed, issuer or clock`);
  }
  let hash = 2166136261;
  const key = `${seed}|${issuerId}|${Math.floor(simMinute / rollPeriodMinutes)}|${kind}`;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) / 0x100000000;
}
export function questOfferWindowOpen(seed, issuerId, simMinute, kind) {
  return questOfferRoll(seed, issuerId, simMinute, kind) < questOfferPolicy(kind).spawnChance;
}

// Encounter offers use the same bounded journal as other decisions. Record the
// successful offer, not every failed chance roll; returning a passenger is never gated.
export function questOfferCooldownReady(decisions, kind, simMinute) {
  const { cooldownMinutes } = questOfferPolicy(kind);
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error("Invalid quest offer clock");
  const previous = decisions[`quest-offer.${kind}.last-minute`];
  if (previous === undefined) return true;
  if (!Number.isFinite(previous) || previous < 0) throw new Error(`Invalid ${kind} offer history`);
  return simMinute >= previous + cooldownMinutes;
}
export function recordQuestOffer(decisions, kind, simMinute) {
  if (!questOfferCooldownReady(decisions, kind, simMinute)) throw new Error(`Quest offer repeated too soon: ${kind}`);
  decisions[`quest-offer.${kind}.last-minute`] = simMinute;
}
