import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID
} from "./factions.js";
import {
  diplomacyBetweenForState,
  factionReputation,
  hasPersonalTradePass,
  hasLetterOfMarqueFrom,
  recentGameDiplomacyEvents,
  recentGamePapalActions,
  sovereignTradeOpenToFaction
} from "./gameState.js";
import { rulerAtMinute } from "./rulers.js";
import { religionById } from "./characterReligion.js";
import { formatSignedReputation } from "./reputationDisplay.js";
import { sovereignTradePoliciesForHostFaction } from "./sovereignTradeAccess.js";
import { customsTerms } from "./tradePolicy.js";
import {
  SUZERAINTY_KIND_PERSONAL_UNION,
  SUZERAINTY_KIND_TRIBUTARY,
  SUZERAINTY_KIND_VASSAL,
  dependentsOf,
  suzeraintyTradePrivilege,
  suzeraintyForVassal
} from "./suzerainty.js";

export const POLITICS_RELATION_LABELS = Object.freeze({
  [DIPLOMACY_ALLY]: "Ally",
  [DIPLOMACY_FRIENDLY]: "Friendly",
  [DIPLOMACY_NEUTRAL]: "Neutral",
  [DIPLOMACY_HOSTILE]: "Hostile",
  [DIPLOMACY_WAR]: "War"
});

export function createPoliticsView(gameState, simMinute = gameState?.survival?.lastMinute ?? 0) {
  if (!gameState || typeof gameState !== "object") throw new Error("Politics view requires game state");
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Politics view requires a valid simulation minute: ${simMinute}`);
  }
  const powers = politicalPowers(gameState);
  const powerById = new Map(powers.map((power) => [power.id, power]));
  const cards = powers.map((faction) => politicsCard(gameState, faction, powers, powerById, simMinute));
  const playerFactionId = gameState.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  return {
    powers,
    recentEvents: recentGameDiplomacyEvents(gameState, 3),
    recentPapalActions: recentGamePapalActions(gameState, 3),
    cards: orderPoliticsCards(cards, playerFactionId)
  };
}

export function politicalPowers(gameState = null) {
  const collapsed = new Set(gameState?.memory?.conquest?.collapsedFactionIds || []);
  const suzerainties = gameState?.relations?.diplomacy?.suzerainties || null;
  return FACTIONS
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID && !collapsed.has(faction.id))
    .map((faction) => {
      const relationship = suzerainties
        ? suzeraintyForVassal(suzerainties, faction.id)
        : null;
      return {
        ...faction,
        code: factionCode(faction),
        suzerainFactionId: relationship?.suzerainFactionId || null,
        suzeraintyKind: relationship?.kind || null,
        dependentRelationships: suzerainties
          ? dependentsOf(suzerainties, faction.id).map((entry) => Object.freeze({
            factionId: entry.vassalFactionId,
            kind: entry.kind
          }))
          : []
      };
    });
}

export function politicsTradeCode(trade) {
  if (!trade || !Number.isInteger(trade.dutyPercent) ||
      trade.dutyPercent < 0 || trade.dutyPercent > 25) {
    throw new Error("Invalid politics trade standing");
  }
  const marker = {
    ordinary: "",
    open: "O",
    pass: "P",
    closed: "X",
    war: "W"
  }[trade.access];
  if (marker === undefined) throw new Error(`Unknown politics trade access: ${trade.access}`);
  return `${trade.dutyPercent}%${marker}`;
}

export function playerStandingForReputation(reputation) {
  if (!Number.isFinite(reputation)) throw new Error(`Invalid player reputation: ${reputation}`);
  if (reputation <= -75) return standing(reputation, "Hostile");
  if (reputation <= -25) return standing(reputation, "Angry");
  if (reputation < 0) return standing(reputation, "Cold");
  if (reputation === 0) return standing(reputation, "Neutral");
  if (reputation < 15) return standing(reputation, "Warm");
  if (reputation < 50) return standing(reputation, "Favored");
  return standing(reputation, "Trusted");
}

function standing(reputation, label) {
  return {
    reputation,
    label,
    scoreLabel: formatSignedReputation(reputation)
  };
}

function politicsCard(gameState, faction, powers, powerById, simMinute) {
  const ruler = rulerAtMinute(faction.id, simMinute);
  const dependencies = politicsDependencies(faction, powerById);
  const dependencyFactionIds = new Set(dependencies.map((dependency) => dependency.factionId));
  const relationships = [
    DIPLOMACY_WAR,
    DIPLOMACY_HOSTILE,
    DIPLOMACY_ALLY,
    DIPLOMACY_FRIENDLY
  ].map((relation) => Object.freeze({
    relation,
    label: POLITICS_RELATION_LABELS[relation],
    factionIds: powers
      .filter((other) => other.id !== faction.id && !dependencyFactionIds.has(other.id))
      .filter((other) => diplomacyBetweenForState(gameState, faction.id, other.id) === relation)
      .map((other) => other.id)
  })).filter((group) => group.factionIds.length > 0);
  return Object.freeze({
    faction,
    ruler: ruler === null
      ? null
      : Object.freeze({
          ...ruler,
          faithLabel: religionById(ruler.religionId).label,
          pietyPercent: Math.round(ruler.piety * 100)
        }),
    player: Object.freeze({
      ...playerStandingForReputation(factionReputation(gameState, faction.id)),
      hasLetterOfMarque: hasLetterOfMarqueFrom(gameState, faction.id),
      trade: playerTradeStanding(gameState, faction, simMinute)
    }),
    dependencies: Object.freeze(dependencies),
    relationships: Object.freeze(relationships)
  });
}

function politicsDependencies(faction, powerById) {
  const dependencies = [];
  if (faction.suzerainFactionId) {
    if (!powerById.has(faction.suzerainFactionId)) {
      throw new Error(`Politics view is missing suzerain ${faction.suzerainFactionId}`);
    }
    dependencies.push(Object.freeze({
      kind: faction.suzeraintyKind,
      role: faction.suzeraintyKind === SUZERAINTY_KIND_PERSONAL_UNION ? "member" : "subject",
      factionId: faction.suzerainFactionId
    }));
  }
  for (const dependent of faction.dependentRelationships) {
    const subject = powerById.get(dependent.factionId);
    if (!subject) throw new Error(`Politics view is missing subject ${dependent.factionId}`);
    dependencies.push(Object.freeze({
      kind: dependent.kind,
      role: dependent.kind === SUZERAINTY_KIND_PERSONAL_UNION ? "member" : "suzerain",
      factionId: dependent.factionId
    }));
  }
  return dependencies;
}

function orderPoliticsCards(cards, playerFactionId) {
  return Object.freeze([...cards].sort((left, right) => {
    if (left.faction.id === playerFactionId) return right.faction.id === playerFactionId ? 0 : -1;
    if (right.faction.id === playerFactionId) return 1;
    if (left.faction.id === "pirate") return right.faction.id === "pirate" ? 0 : 1;
    if (right.faction.id === "pirate") return -1;
    return left.faction.shortName.localeCompare(right.faction.shortName);
  }));
}

function playerTradeStanding(gameState, faction, simMinute) {
  const traderFactionId = gameState.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const relation = diplomacyBetweenForState(gameState, traderFactionId, faction.id);
  const suzeraintyPrivilege = suzeraintyTradePrivilege(
    gameState.relations.diplomacy.suzerainties,
    traderFactionId,
    faction.id
  );
  const customs = customsTerms({
    port: {
      city: faction.shortName,
      country: faction.shortName,
      factionId: faction.id
    },
    traderFactionId,
    relation,
    reputation: factionReputation(gameState, faction.id),
    suzeraintyPrivilege
  });
  const policies = sovereignTradePoliciesForHostFaction(faction.id, simMinute)
    .map((policy) => {
      const nationalAccess = sovereignTradeOpenToFaction(gameState, policy.id, traderFactionId);
      const personalPass = hasPersonalTradePass(gameState, policy.id);
      return Object.freeze({
        id: policy.id,
        label: policy.label,
        nationalAccess,
        personalPass,
        allowed: nationalAccess || personalPass
      });
    });
  const access = relation === DIPLOMACY_WAR
    ? "war"
    : policies.some((policy) => !policy.allowed)
      ? "closed"
      : policies.some((policy) => policy.personalPass && !policy.nationalAccess)
        ? "pass"
        : policies.length > 0
          ? "open"
          : "ordinary";
  return Object.freeze({
    dutyPercent: Math.round(customs.customsRate * 100),
    access,
    policies,
    suzeraintyPrivilege
  });
}

function factionCode(faction) {
  if (faction.id === "poland-lithuania") return "PL";
  if (faction.id === "denmark-norway") return "DN";
  if (faction.id === "papal-states") return "PA";
  if (faction.id === "pirate") return "PX";
  if (faction.id === "habsburg") return "HB";
  if (faction.id === "ottoman") return "OT";
  return faction.id.slice(0, 2).toUpperCase();
}
