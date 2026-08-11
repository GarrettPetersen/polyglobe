import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  factionCapitalForId
} from "./factions.js";
import {
  diplomacyBetweenForState,
  factionReputation,
  hasPersonalTradePass,
  hasLetterOfMarqueFrom,
  recentGameDiplomacyEvents,
  recentGameCourtActions,
  recentGamePapalActions,
  sovereignAuthorityForState,
  papalAuthorityForState,
  sovereignTradeOpenToFaction
} from "./gameState.js";
import {
  papalActionNotice,
  papalMatterNotice,
  papalPendingMatter
} from "./papalPolitics.js";
import {
  courtActionNotice,
  courtMatterNotice,
  courtPendingMatter
} from "./courtPolitics.js";
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
  suzeraintyTermsForRelationship,
  suzeraintyTradePrivilege,
  suzeraintyForVassal
} from "./suzerainty.js";
import { diplomacyEventNotice } from "./worldDiplomacy.js";

export const POLITICS_RELATION_LABELS = Object.freeze({
  [DIPLOMACY_ALLY]: "Ally",
  [DIPLOMACY_FRIENDLY]: "Friendly",
  [DIPLOMACY_NEUTRAL]: "Neutral",
  [DIPLOMACY_HOSTILE]: "Hostile",
  [DIPLOMACY_WAR]: "War"
});

export const POLITICS_NEWS_HISTORY_LIMIT = 5;

export function createPoliticsView(
  gameState,
  simMinute = gameState?.survival?.lastMinute ?? 0,
  cities = null
) {
  if (!gameState || typeof gameState !== "object") throw new Error("Politics view requires game state");
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Politics view requires a valid simulation minute: ${simMinute}`);
  }
  const powers = politicalPowers(gameState);
  const powerById = new Map(powers.map((power) => [power.id, power]));
  const capitalByFactionId = politicsCapitals(powers, cities);
  const cards = powers.map((faction) => politicsCard(
    gameState,
    faction,
    powers,
    powerById,
    capitalByFactionId,
    simMinute
  ));
  const playerFactionId = gameState.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const recentEvents = recentGameDiplomacyEvents(gameState, POLITICS_NEWS_HISTORY_LIMIT);
  const recentPapalActions = recentGamePapalActions(gameState, POLITICS_NEWS_HISTORY_LIMIT);
  const recentCourtActions = recentGameCourtActions(gameState, POLITICS_NEWS_HISTORY_LIMIT);
  const pendingPapalMatter = papalPendingMatter(gameState.relations.papacy);
  const pendingCourtMatter = courtPendingMatter(gameState.relations.courts);
  const newsHistory = recentPoliticsNews({
    recentEvents,
    recentPapalActions,
    recentCourtActions,
    pendingPapalMatter,
    pendingCourtMatter
  });
  return {
    powers,
    recentEvents,
    recentPapalActions,
    recentCourtActions,
    pendingPapalMatter,
    pendingCourtMatter,
    newsHistory,
    latestNews: newsHistory[0] || null,
    cards: orderPoliticsCards(cards, playerFactionId)
  };
}

export function latestPoliticsNews(view) {
  return recentPoliticsNews(view, 1)[0] || null;
}

export function recentPoliticsNews(view, limit = POLITICS_NEWS_HISTORY_LIMIT) {
  if (!view || !Array.isArray(view.recentEvents) || !Array.isArray(view.recentPapalActions) ||
      (view.recentCourtActions !== undefined && !Array.isArray(view.recentCourtActions))) {
    throw new Error("Politics news requires diplomacy and papal histories");
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`Politics news limit must be a positive integer: ${limit}`);
  }
  const entries = [
    ...view.recentEvents.map((event) => ({
      source: "diplomacy",
      simMinute: event.simMinute,
      tone: event.kind === "peace" ? "good" : "warn",
      text: diplomacyEventNotice(event),
      tiePriority: 0
    })),
    ...view.recentPapalActions.map((action) => ({
      source: "papal",
      simMinute: action.simMinute,
      tone: "warn",
      text: papalActionNotice(action),
      tiePriority: 1
    })),
    ...(view.recentCourtActions || []).map((action) => ({
      source: "court",
      simMinute: action.simMinute,
      tone: "warn",
      text: courtActionNotice(action),
      tiePriority: 2
    }))
  ];
  const matter = view.pendingPapalMatter || null;
  if (matter) {
    entries.push({
      source: "papal-matter",
      simMinute: matter.commission?.acceptedMinute ?? matter.createdMinute,
      tone: matter.status === "commissioned" ? "good" : "warn",
      text: papalMatterNotice(matter),
      tiePriority: 3
    });
  }
  const courtMatter = view.pendingCourtMatter || null;
  if (courtMatter) {
    entries.push({
      source: "court-matter",
      simMinute: courtMatter.commission?.acceptedMinute ?? courtMatter.createdMinute,
      tone: courtMatter.status === "commissioned" ? "good" : "warn",
      text: courtMatterNotice(courtMatter),
      tiePriority: 3
    });
  }
  return Object.freeze(entries
    .sort((left, right) => right.simMinute - left.simMinute || right.tiePriority - left.tiePriority)
    .slice(0, limit)
    .map(({ tiePriority: _tiePriority, ...entry }) => Object.freeze(entry)));
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
        dependencyTerms: relationship ? suzeraintyTermsForRelationship(relationship) : null,
        dependentRelationships: suzerainties
          ? dependentsOf(suzerainties, faction.id).map((entry) => Object.freeze({
            factionId: entry.vassalFactionId,
            kind: entry.kind,
            terms: suzeraintyTermsForRelationship(entry)
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

export function politicsMarqueMarker(player) {
  if (!player || typeof player.hasLetterOfMarque !== "boolean") {
    throw new Error("Politics marque marker requires player standing");
  }
  return player.hasLetterOfMarque ? "M" : "";
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

function politicsCard(gameState, faction, powers, powerById, capitalByFactionId, simMinute) {
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
    capital: capitalByFactionId.get(faction.id) || null,
    authority: faction.id === PIRATE_FACTION_ID
      ? null
      : Object.freeze({
          sovereign: sovereignAuthorityForState(gameState, faction.id),
          papal: faction.id === "papal-states" ? papalAuthorityForState(gameState) : null
        }),
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

function politicsCapitals(powers, cities) {
  const capitalByFactionId = new Map();
  if (cities === null) {
    for (const faction of powers) {
      if (faction.id === PIRATE_FACTION_ID) continue;
      const capital = factionCapitalForId(faction.id);
      capitalByFactionId.set(faction.id, Object.freeze({
        city: capital.seatCity,
        portId: null
      }));
    }
    return capitalByFactionId;
  }
  if (!Array.isArray(cities)) throw new Error("Politics capitals require a city list");
  const activePowerIds = new Set(powers.map((power) => power.id));
  for (const city of cities) {
    if (!city || typeof city !== "object") throw new Error("Politics capital city is invalid");
    const factionId = city.capitalOfFactionId || null;
    if (!factionId || !activePowerIds.has(factionId)) continue;
    if (capitalByFactionId.has(factionId)) {
      throw new Error(`Politics view found two capitals for ${factionId}`);
    }
    const cityName = city.capitalSeatName || city.displayCity || city.city;
    if (typeof cityName !== "string" || cityName.trim() === "") {
      throw new Error(`Politics capital for ${factionId} has no city name`);
    }
    capitalByFactionId.set(factionId, Object.freeze({
      city: cityName,
      portId: city.portId || (Number.isInteger(city.tileId) ? `city-${city.tileId}` : null)
    }));
  }
  for (const faction of powers) {
    if (faction.id === PIRATE_FACTION_ID || capitalByFactionId.has(faction.id)) continue;
    throw new Error(`Politics view has no current capital for ${faction.id}`);
  }
  return capitalByFactionId;
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
      terms: faction.dependencyTerms,
      factionId: faction.suzerainFactionId
    }));
  }
  for (const dependent of faction.dependentRelationships) {
    const subject = powerById.get(dependent.factionId);
    if (!subject) throw new Error(`Politics view is missing subject ${dependent.factionId}`);
    dependencies.push(Object.freeze({
      kind: dependent.kind,
      role: dependent.kind === SUZERAINTY_KIND_PERSONAL_UNION ? "member" : "suzerain",
      terms: dependent.terms,
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
  if (faction.id === "hormuz") return "HZ";
  if (faction.id === "hospitallers") return "KH";
  if (faction.id === "hosokawa") return "HS";
  if (faction.id === "songhai") return "SG";
  if (faction.id === "shimazu") return "SZ";
  if (faction.id === "shoni") return "SN";
  if (faction.id === "wallachia") return "WL";
  if (faction.id === "moldavia") return "MD";
  if (faction.id === "ragusa") return "RG";
  if (faction.id === "hejaz") return "HJ";
  return faction.id.slice(0, 2).toUpperCase();
}
