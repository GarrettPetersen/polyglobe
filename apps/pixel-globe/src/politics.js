import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  isJapanesePolityFaction,
  factionSeaCapitalForId,
  factionExistsIn1522
} from "./factions.js";
import { requireCityId } from "./entityIds.js";
import {
  activeGameTradeEmbargoes,
  diplomacyBetweenForState,
  factionReputation,
  hasPersonalTradePass,
  hasLetterOfMarqueFrom,
  recentGameDiplomacyEvents,
  recentGameAuthorityHeadlines,
  recentGameCourtActions,
  recentGamePapalActions,
  recentGameTradeEmbargoEvents,
  sovereignAuthorityForState,
  papalAuthorityForState,
  sovereignTradeOpenToFaction
} from "./gameState.js";
import {
  PAPAL_ACTION_REVOCATION,
  papalActionNotice,
  papalMatterNotice,
  papalPendingMatter
} from "./papalPolitics.js";
import { tradeEmbargoEventNotice } from "./tradeEmbargoes.js";
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
import { sovereignAuthorityHeadlineNotice } from "./sovereignAuthority.js";
import {
  imperialEventNotice,
  imperialPoliticsView,
  recentImperialEvents
} from "./imperialConstitution.js";
import { imperialEstateForFaction } from "./imperialEstates.js";
import { foreignSettlementExpulsionNotice } from "./foreignSettlements.js";
import {
  CONQUISTADOR_STAGE_COMPLETE,
  CONQUISTADOR_STAGE_REWARD_READY
} from "./conquistadorQuest.js";
import { POLITICS_GROUP_HOLY_ROMAN_EMPIRE_FLAG_ID } from "./politicsGroupAssets.js";

export const POLITICS_RELATION_LABELS = Object.freeze({
  [DIPLOMACY_ALLY]: "Ally",
  [DIPLOMACY_FRIENDLY]: "Friendly",
  [DIPLOMACY_NEUTRAL]: "Neutral",
  [DIPLOMACY_HOSTILE]: "Hostile",
  [DIPLOMACY_WAR]: "War"
});

export const POLITICS_NEWS_HISTORY_LIMIT = 10;
export const POLITICS_GROUP_HOLY_ROMAN_EMPIRE_ID = "political-group:holy-roman-empire";
export const POLITICS_GROUP_JAPAN_ID = "political-group:japan";

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
  const capitalByFactionId = politicsCapitals(gameState, powers, cities);
  const activeEmbargoes = activeGameTradeEmbargoes(gameState);
  const cards = powers.map((faction) => politicsCard(
    gameState,
    faction,
    powers,
    powerById,
    capitalByFactionId,
    simMinute,
    activeEmbargoes
  ));
  const playerFactionId = gameState.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const recentEvents = recentGameDiplomacyEvents(gameState, POLITICS_NEWS_HISTORY_LIMIT);
  const recentPapalActions = recentGamePapalActions(gameState, POLITICS_NEWS_HISTORY_LIMIT);
  const recentEmbargoEvents = recentGameTradeEmbargoEvents(
    gameState,
    POLITICS_NEWS_HISTORY_LIMIT
  );
  const recentCourtActions = recentGameCourtActions(gameState, POLITICS_NEWS_HISTORY_LIMIT);
  const recentAuthorityHeadlines = recentGameAuthorityHeadlines(
    gameState,
    POLITICS_NEWS_HISTORY_LIMIT
  );
  const recentImperialActions = recentImperialEvents(
    gameState.relations.imperial,
    POLITICS_NEWS_HISTORY_LIMIT
  );
  const recentScriptedEvents = recentScriptedPoliticsEvents(
    gameState,
    POLITICS_NEWS_HISTORY_LIMIT
  );
  const pendingPapalMatter = papalPendingMatter(gameState.relations.papacy);
  const pendingCourtMatter = courtPendingMatter(gameState.relations.courts);
  const imperial = imperialPoliticsView(gameState.relations.imperial, simMinute);
  const currentEmperorFactionRuler = rulerAtMinute(imperial.emperorFactionId, simMinute);
  const emperorRuler = currentEmperorFactionRuler === null ? null : {
    ...currentEmperorFactionRuler,
    name: imperial.emperorRulerName,
    displayName: imperial.emperorRulerName
  };
  const kingOfRomansRuler = imperial.kingOfRomans === null
    ? null
    : {
        ...rulerAtMinute(imperial.kingOfRomans.factionId, simMinute),
        name: imperial.kingOfRomans.rulerName,
        displayName: imperial.kingOfRomans.rulerName
      };
  const newsHistory = recentPoliticsNews({
    recentEvents,
    recentPapalActions,
    recentEmbargoEvents,
    recentCourtActions,
    recentAuthorityHeadlines,
    recentImperialActions,
    recentScriptedEvents,
    pendingPapalMatter,
    pendingCourtMatter
  });
  const imperialSummary = Object.freeze({
    ...imperial,
    imperialFavor: factionReputation(gameState, imperial.emperorFactionId),
    emperorRuler: emperorRuler === null ? null : Object.freeze({
      ...emperorRuler,
      imperialDisplayName: `Emperor ${emperorRuler.name}`
    }),
    kingOfRomansRuler: kingOfRomansRuler === null ? null : Object.freeze(kingOfRomansRuler)
  });
  const orderedCards = orderPoliticsCards(cards, playerFactionId);
  const groups = politicsGroups(orderedCards, imperialSummary);
  return {
    powers,
    activeEmbargoes,
    recentEvents,
    recentPapalActions,
    recentEmbargoEvents,
    recentCourtActions,
    recentAuthorityHeadlines,
    recentImperialActions,
    recentScriptedEvents,
    pendingPapalMatter,
    pendingCourtMatter,
    imperial: imperialSummary,
    newsHistory,
    latestNews: newsHistory[0] || null,
    cards: orderedCards,
    groups,
    overviewCards: politicsOverviewCards(orderedCards, groups)
  };
}

export function politicsGroupForFaction(view, factionId) {
  if (typeof factionId !== "string" || factionId === "") {
    throw new Error(`Politics group lookup requires a faction id: ${factionId}`);
  }
  return requirePoliticsGroups(view)
    .find((group) => group.memberFactionIds.includes(factionId)) || null;
}

export function politicsGroupById(view, groupId) {
  if (typeof groupId !== "string" || groupId === "") {
    throw new Error(`Politics group requires a canonical id: ${groupId}`);
  }
  const group = requirePoliticsGroups(view).find(({ id }) => id === groupId) || null;
  if (!group) throw new Error(`Politics view has no group: ${groupId}`);
  return group;
}

function requirePoliticsGroups(view) {
  if (!view || !Array.isArray(view.groups)) throw new Error("Politics group lookup requires a view");
  return view.groups;
}

function politicsGroups(cards, imperial) {
  if (!Array.isArray(cards)) throw new Error("Politics groups require faction cards");
  if (!imperial || typeof imperial !== "object") {
    throw new Error("Politics groups require Imperial politics");
  }
  const holyRomanEmpireCards = cards.filter((card) => card.imperialMembership !== null);
  const japaneseCards = cards.filter((card) => isJapanesePolityFaction(card.faction.id));
  const japanShogunate = japaneseCards.find((card) => card.faction.id === "japan") || null;
  const groups = [
    politicalGroup({
      id: POLITICS_GROUP_HOLY_ROMAN_EMPIRE_ID,
      titleKey: "politics.group.holyRomanEmpire",
      flagId: POLITICS_GROUP_HOLY_ROMAN_EMPIRE_FLAG_ID,
      headOfficeKey: "politics.emperor",
      headFactionId: imperial.emperorOfficeVacant ? null : imperial.emperorFactionId,
      headRuler: imperial.emperorOfficeVacant ? null : imperial.emperorRuler,
      memberCountKey: "politics.group.memberEstates",
      memberCards: holyRomanEmpireCards
    }),
    politicalGroup({
      id: POLITICS_GROUP_JAPAN_ID,
      titleKey: "politics.group.japan",
      flagId: "japan",
      headOfficeKey: "politics.shogun",
      headFactionId: japanShogunate?.faction.id || null,
      headRuler: japanShogunate?.ruler || null,
      memberCountKey: "politics.group.japanesePolities",
      memberCards: japaneseCards
    })
  ].filter((group) => group.memberCards.length > 0);
  const assignedFactionIds = new Set();
  for (const group of groups) {
    for (const factionId of group.memberFactionIds) {
      if (assignedFactionIds.has(factionId)) {
        throw new Error(`Politics faction belongs to two overview groups: ${factionId}`);
      }
      assignedFactionIds.add(factionId);
    }
  }
  return Object.freeze(groups);
}

function politicalGroup({
  id,
  titleKey,
  flagId,
  headOfficeKey,
  headFactionId,
  headRuler,
  memberCountKey,
  memberCards
}) {
  if (typeof id !== "string" || id === "" || !id.startsWith("political-group:")) {
    throw new Error(`Invalid politics group id: ${id}`);
  }
  if (!Array.isArray(memberCards)) throw new Error(`Politics group ${id} requires member cards`);
  return Object.freeze({
    kind: "political-group",
    id,
    titleKey,
    flagId,
    headOfficeKey,
    headFactionId,
    headRuler,
    memberCountKey,
    memberCards: Object.freeze([...memberCards]),
    memberFactionIds: Object.freeze(memberCards.map((card) => card.faction.id))
  });
}

function politicsOverviewCards(cards, groups) {
  const groupByFactionId = new Map(groups.flatMap((group) => (
    group.memberFactionIds.map((factionId) => [factionId, group])
  )));
  const emittedGroupIds = new Set();
  const overviewCards = [];
  for (const card of cards) {
    const group = groupByFactionId.get(card.faction.id) || null;
    if (!group) {
      overviewCards.push(card);
      continue;
    }
    if (emittedGroupIds.has(group.id)) continue;
    emittedGroupIds.add(group.id);
    overviewCards.push(group);
  }
  return Object.freeze(overviewCards);
}

export function latestPoliticsNews(view) {
  return recentPoliticsNews(view, 1)[0] || null;
}

export function recentPoliticsNews(view, limit = POLITICS_NEWS_HISTORY_LIMIT) {
  if (!view || !Array.isArray(view.recentEvents) || !Array.isArray(view.recentPapalActions) ||
      (view.recentCourtActions !== undefined && !Array.isArray(view.recentCourtActions)) ||
      (view.recentEmbargoEvents !== undefined && !Array.isArray(view.recentEmbargoEvents))) {
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
      tone: action.kind === PAPAL_ACTION_REVOCATION ? "good" : "warn",
      text: papalActionNotice(action),
      tiePriority: 1
    })),
    ...(view.recentEmbargoEvents || []).map((event) => ({
      source: "trade-embargo",
      simMinute: event.simMinute,
      tone: event.kind === "lifted" ? "good" : "warn",
      text: tradeEmbargoEventNotice(event),
      tiePriority: 2
    })),
    ...(view.recentCourtActions || []).map((action) => ({
      source: "court",
      simMinute: action.simMinute,
      tone: "warn",
      text: courtActionNotice(action),
      tiePriority: 2
    })),
    ...(view.recentAuthorityHeadlines || []).map((event) => ({
      source: "authority",
      simMinute: event.simMinute,
      tone: "warn",
      text: sovereignAuthorityHeadlineNotice(event),
      tiePriority: 4
    })),
    ...(view.recentImperialActions || []).map((event) => ({
      source: "imperial",
      simMinute: event.simMinute,
      tone: event.kind === "imperial-vacancy" || event.kind === "king-of-romans-vacancy"
        ? "warn"
        : "good",
      text: imperialEventNotice(event),
      tiePriority: 5
    })),
    ...(view.recentScriptedEvents || []).map((event) => ({
      ...event,
      tiePriority: 6
    }))
  ];
  const matter = view.pendingPapalMatter || null;
  if (matter) {
    entries.push({
      source: "papal-matter",
      simMinute: matter.revocation?.simMinute ??
        matter.commission?.acceptedMinute ?? matter.createdMinute,
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

function recentScriptedPoliticsEvents(gameState, limit) {
  const entries = [];
  for (const event of gameState.memory.conquest.events) {
    if (event.source !== "conquistador-campaign" || event.kind !== "port-capture") continue;
    entries.push({
      source: "conquistador",
      simMinute: event.simMinute,
      tone: "warn",
      text: `${event.cityName.toUpperCase()} FALLS TO THE SPANISH COLUMNS`
    });
  }
  const conquistador = gameState.memory.quests.conquistador;
  if ([CONQUISTADOR_STAGE_REWARD_READY, CONQUISTADOR_STAGE_COMPLETE]
    .includes(conquistador.stage)) {
    entries.push({
      source: "conquistador",
      simMinute: conquistador.rewardReadyMinute,
      tone: "warn",
      text: "THE CONQUEST'S SPOILS AWAIT AT TRUJILLO"
    });
  }

  const expulsionsByMinute = new Map();
  for (const event of Object.values(gameState.relations.foreignSettlementExpulsions.byId)) {
    const group = expulsionsByMinute.get(event.simMinute) || [];
    group.push(event);
    expulsionsByMinute.set(event.simMinute, group);
  }
  for (const [simMinute, events] of expulsionsByMinute) {
    entries.push({
      source: "settlement-expulsion",
      simMinute,
      tone: "warn",
      text: foreignSettlementExpulsionNotice(events)
    });
  }

  return Object.freeze(entries
    .sort((left, right) => right.simMinute - left.simMinute || left.text.localeCompare(right.text))
    .slice(0, limit)
    .map((entry) => Object.freeze(entry)));
}

export function politicalPowers(gameState = null) {
  const collapsed = new Set(gameState?.memory?.conquest?.collapsedFactionIds || []);
  const suzerainties = gameState?.relations?.diplomacy?.suzerainties || null;
  return FACTIONS
    .filter((faction) => (
      faction.id !== NEUTRAL_FACTION_ID &&
      !collapsed.has(faction.id) &&
      (gameState !== null || faction.emergent !== true)
    ))
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

function politicsCard(
  gameState,
  faction,
  powers,
  powerById,
  capitalByFactionId,
  simMinute,
  activeEmbargoes
) {
  const ruler = rulerAtMinute(faction.id, simMinute);
  const imperialEstate = imperialEstateForFaction(faction.id);
  const dependencies = politicsDependencies(faction, powerById);
  const constitutionalConnections = politicsConstitutionalConnections(
    gameState,
    faction,
    powers,
    powerById
  );
  const embargoConnections = politicsEmbargoConnections(faction, activeEmbargoes, powerById);
  const separatelyDisplayedFactionIds = new Set([
    ...dependencies,
    ...constitutionalConnections
  ].map((connection) => connection.factionId));
  const relationships = [
    DIPLOMACY_WAR,
    DIPLOMACY_HOSTILE,
    DIPLOMACY_ALLY,
    DIPLOMACY_FRIENDLY
  ].map((relation) => Object.freeze({
    relation,
    label: POLITICS_RELATION_LABELS[relation],
    factionIds: powers
      .filter((other) => other.id !== faction.id && !separatelyDisplayedFactionIds.has(other.id))
      .filter((other) => diplomacyBetweenForState(gameState, faction.id, other.id) === relation)
      .map((other) => other.id)
  })).filter((group) => group.factionIds.length > 0);
  return Object.freeze({
    kind: "faction",
    faction,
    imperialMembership: imperialEstate === null ? null : Object.freeze({
      ...imperialEstate,
      badge: imperialEstate.electorId === null ? "I" : "E",
      isEmperor: gameState.relations.imperial.emperorOfficeVacant !== true &&
        gameState.relations.imperial.emperorFactionId === faction.id
    }),
    constitutionalConnections: Object.freeze(constitutionalConnections),
    embargoConnections: Object.freeze(embargoConnections),
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

function politicsEmbargoConnections(faction, activeEmbargoes, powerById) {
  if (!Array.isArray(activeEmbargoes)) throw new Error("Politics embargoes must be an array");
  const connections = [];
  for (const order of activeEmbargoes) {
    let role = null;
    let factionId = null;
    if (order.issuerFactionId === faction.id) {
      role = "issuer";
      factionId = order.targetFactionId;
    } else if (order.targetFactionId === faction.id) {
      role = "target";
      factionId = order.issuerFactionId;
    } else if (order.followerFactionIds.includes(faction.id)) {
      role = "follower";
      factionId = order.targetFactionId;
    }
    if (!role) continue;
    // A realm can collapse between the event that ended it and the next
    // scheduled embargo review. Its retired order remains in the historical
    // ledger, but there is no longer a living power to put on a politics card.
    if (!powerById.has(factionId)) continue;
    if (connections.some((connection) => (
      connection.role === role && connection.factionId === factionId &&
      connection.authorityKind === order.authorityKind &&
      connection.restrictionKind === order.restrictionKind && connection.scope === order.scope
    ))) continue;
    connections.push(Object.freeze({
      kind: "trade-embargo",
      role,
      factionId,
      authorityKind: order.authorityKind,
      restrictionKind: order.restrictionKind,
      scope: order.scope
    }));
  }
  return connections;
}

function politicsConstitutionalConnections(gameState, faction, powers, powerById) {
  const emperorFactionId = gameState.relations.imperial.emperorFactionId;
  if (gameState.relations.imperial.emperorOfficeVacant === true) return [];
  const isEstate = imperialEstateForFaction(faction.id) !== null;
  const isEmperor = faction.id === emperorFactionId;
  if (!isEstate && !isEmperor) return [];
  if (!powerById.has(emperorFactionId)) {
    throw new Error(`Politics view is missing Emperor faction ${emperorFactionId}`);
  }
  if (isEstate && !isEmperor) {
    return [Object.freeze({
      kind: "imperial-constitution",
      role: "estate",
      factionId: emperorFactionId
    })];
  }
  if (!isEmperor) return [];
  return powers
    .filter((power) => power.id !== faction.id && imperialEstateForFaction(power.id) !== null)
    .map((power) => Object.freeze({
      kind: "imperial-constitution",
      role: "emperor",
      factionId: power.id
    }));
}

function politicsCapitals(gameState, powers, cities) {
  const capitalByFactionId = new Map();
  if (cities === null) {
    for (const faction of powers) {
      if (faction.id === PIRATE_FACTION_ID) continue;
      const capital = politicsHistoricalCapital(gameState, faction.id);
      capitalByFactionId.set(faction.id, Object.freeze({
        city: capital.city,
        portId: capital.portId
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
    const cityName = city.displayCity || city.city;
    if (typeof cityName !== "string" || cityName.trim() === "") {
      throw new Error(`Politics capital for ${factionId} has no city name`);
    }
    capitalByFactionId.set(factionId, Object.freeze({
      city: cityName,
      portId: requireCityId(city, "Politics capital")
    }));
  }
  for (const faction of powers) {
    if (faction.id === PIRATE_FACTION_ID || capitalByFactionId.has(faction.id)) continue;
    throw new Error(`Politics view has no current capital for ${faction.id}`);
  }
  return capitalByFactionId;
}

function politicsHistoricalCapital(gameState, factionId) {
  if (factionExistsIn1522(factionId)) {
    return Object.freeze({ city: factionSeaCapitalForId(factionId).city, portId: null });
  }
  const predecessors = Object.entries(gameState.memory.conquest.factionSuccessors)
    .filter(([, successorFactionId]) => successorFactionId === factionId)
    .map(([predecessorFactionId]) => predecessorFactionId);
  if (predecessors.length !== 1) {
    throw new Error(`Politics view cannot resolve the historical capital for ${factionId}`);
  }
  const capital = factionSeaCapitalForId(predecessors[0]);
  return Object.freeze({
    city: capital.city,
    portId: gameState.memory.conquest.factionCapitalOverrides[factionId] || null
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
      cityId: `politics-trade-subject:${faction.id}`,
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

const POLITICS_CODE_OVERRIDES = Object.freeze({
  "poland-lithuania": "PL", "denmark-norway": "DN", "papal-states": "PA",
  pirate: "PX", "burgundian-netherlands": "BN", habsburg: "AT", ottoman: "OT", hormuz: "HZ", hospitallers: "KH",
  hosokawa: "HS", songhai: "SG", shimazu: "SZ", shoni: "SN", wallachia: "WL",
  moldavia: "MD", ragusa: "RG", hejaz: "HJ", mughal: "MG", muscovy: "MU"
});

const POLITICS_CODES_BY_FACTION_ID = buildPoliticsCodes();

function factionCode(faction) {
  const code = POLITICS_CODES_BY_FACTION_ID.get(faction.id);
  if (!code) throw new Error(`Politics has no compact code for ${faction.id}`);
  return code;
}

function buildPoliticsCodes() {
  const codes = new Map();
  const used = new Set();
  for (const [factionId, code] of Object.entries(POLITICS_CODE_OVERRIDES)) {
    if (used.has(code)) throw new Error(`Duplicate politics code override: ${code}`);
    codes.set(factionId, code);
    used.add(code);
  }
  for (const faction of FACTIONS) {
    if (codes.has(faction.id)) continue;
    const compact = faction.id.toUpperCase().replace(/[^A-Z]/g, "");
    const candidates = [
      compact.slice(0, 2),
      ...[...compact.slice(1)].map((letter) => `${compact[0]}${letter}`),
      ...[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter) => `${compact[0]}${letter}`)
    ];
    const code = candidates.find((candidate) => candidate.length === 2 && !used.has(candidate));
    if (!code) throw new Error(`No two-letter politics code remains for ${faction.id}`);
    codes.set(faction.id, code);
    used.add(code);
  }
  return codes;
}
