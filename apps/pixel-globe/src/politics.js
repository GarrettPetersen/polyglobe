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
  sovereignTradeOpenToFaction
} from "./gameState.js";
import { clampMenuIndex } from "./menuNavigation.js";
import { formatSignedReputation } from "./reputationDisplay.js";
import { sovereignTradePoliciesForHostFaction } from "./sovereignTradeAccess.js";
import { customsTerms } from "./tradePolicy.js";
import { diplomaticContactBetween } from "./worldDiplomacy.js";
import {
  SUZERAINTY_KIND_PERSONAL_UNION,
  SUZERAINTY_KIND_TRIBUTARY,
  SUZERAINTY_KIND_VASSAL,
  suzeraintyTradePrivilege,
  suzeraintyForVassal,
  vassalsOf
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
  return {
    powers,
    recentEvents: recentGameDiplomacyEvents(gameState, 3),
    rows: powers.map((faction) => ({
      faction,
      player: {
        ...playerStandingForReputation(factionReputation(gameState, faction.id)),
        hasLetterOfMarque: hasLetterOfMarqueFrom(gameState, faction.id),
        trade: playerTradeStanding(gameState, faction, simMinute)
      },
      stances: powers.map((other) => {
        const relation = diplomacyBetweenForState(gameState, faction.id, other.id);
        const contact = faction.id === other.id
          ? null
          : diplomaticContactBetween(gameState.relations.diplomacy, faction.id, other.id);
        return {
          factionId: other.id,
          relation,
          label: POLITICS_RELATION_LABELS[relation],
          contact
        };
      })
    }))
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
        vassalFactionIds: suzerainties ? vassalsOf(suzerainties, faction.id) : []
      };
    });
}

export function politicsPowerLabel(faction, powers) {
  if (!faction || !Array.isArray(powers)) throw new Error("Politics power label requires a faction list");
  if (!faction.suzerainFactionId) return faction.shortName.toUpperCase();
  const suzerain = powers.find((entry) => entry.id === faction.suzerainFactionId);
  if (!suzerain) throw new Error(`Politics view is missing suzerain ${faction.suzerainFactionId}`);
  const separator = politicsDependencyGlyph(faction.suzeraintyKind);
  return `${faction.shortName.toUpperCase()} ${separator}${suzerain.code}`;
}

export function politicsDependencyGlyph(kind) {
  if (kind === SUZERAINTY_KIND_VASSAL) return ">";
  if (kind === SUZERAINTY_KIND_TRIBUTARY) return "~";
  if (kind === SUZERAINTY_KIND_PERSONAL_UNION) return "=";
  throw new Error(`Unknown politics dependency kind: ${kind}`);
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

export function politicsRowsPage(view, page, rowsPerPage) {
  if (!view || !Array.isArray(view.rows)) throw new Error("Invalid politics view");
  if (!Number.isInteger(page)) throw new Error(`Invalid politics page: ${page}`);
  if (!Number.isInteger(rowsPerPage) || rowsPerPage <= 0) throw new Error(`Invalid politics rows per page: ${rowsPerPage}`);
  const pageCount = Math.max(1, Math.ceil(view.rows.length / rowsPerPage));
  const normalizedPage = clampMenuIndex(page, pageCount);
  const start = normalizedPage * rowsPerPage;
  return {
    page: normalizedPage,
    pageCount,
    rows: view.rows.slice(start, start + rowsPerPage)
  };
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
