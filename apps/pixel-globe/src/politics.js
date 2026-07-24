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
  hasLetterOfMarqueFrom,
  recentGameDiplomacyEvents
} from "./gameState.js";
import { clampMenuIndex } from "./menuNavigation.js";
import { formatSignedReputation } from "./reputationDisplay.js";
import { diplomaticContactBetween } from "./worldDiplomacy.js";

export const POLITICS_RELATION_LABELS = Object.freeze({
  [DIPLOMACY_ALLY]: "Ally",
  [DIPLOMACY_FRIENDLY]: "Friendly",
  [DIPLOMACY_NEUTRAL]: "Neutral",
  [DIPLOMACY_HOSTILE]: "Hostile",
  [DIPLOMACY_WAR]: "War"
});

export function createPoliticsView(gameState) {
  if (!gameState || typeof gameState !== "object") throw new Error("Politics view requires game state");
  const powers = politicalPowers(gameState);
  return {
    powers,
    recentEvents: recentGameDiplomacyEvents(gameState, 3),
    rows: powers.map((faction) => ({
      faction,
      player: {
        ...playerStandingForReputation(factionReputation(gameState, faction.id)),
        hasLetterOfMarque: hasLetterOfMarqueFrom(gameState, faction.id)
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
  return FACTIONS
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID && !collapsed.has(faction.id))
    .map((faction) => ({
      ...faction,
      code: factionCode(faction)
    }));
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

function factionCode(faction) {
  if (faction.id === "poland-lithuania") return "PL";
  if (faction.id === "denmark-norway") return "DN";
  if (faction.id === "papal-states") return "PA";
  if (faction.id === "pirate") return "PX";
  if (faction.id === "habsburg") return "HB";
  if (faction.id === "ottoman") return "OT";
  return faction.id.slice(0, 2).toUpperCase();
}
