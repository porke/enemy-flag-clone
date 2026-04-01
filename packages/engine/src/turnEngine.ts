import {
  BASE_AP_INCOME,
  BASE_GOLD_INCOME,
  GOLD_CAP,
  INTERNAL_SECTORS_PER_AP_INCOME,
  BORDER_SECTORS_PER_AP_INCOME,
} from "./constants.js";
import type { ActionResult, GameState, PlayerId } from "./types.js";
import { classifySectors } from "./sectorUtils.js";

/**
 * Applies end-of-turn resource income and advances the active player.
 * Only the current active player may call this.
 */
export function applyEndOfTurn(state: GameState, callingPlayerId: PlayerId): ActionResult {
  if (state.activePlayerId !== callingPlayerId) {
    return { ok: false, error: "Not your turn.", newState: state, events: [] };
  }
  if (state.winner !== null) {
    return { ok: false, error: "Game is over.", newState: state, events: [] };
  }

  const playerId = state.activePlayerId;
  const player = state.players[playerId]!;

  // AP income
  const { internal, border } = classifySectors(state, playerId);
  const townHallCount = countTownHalls(state, playerId);
  const apIncome =
    BASE_AP_INCOME +
    Math.floor(internal.length / INTERNAL_SECTORS_PER_AP_INCOME) +
    Math.floor(border.length / BORDER_SECTORS_PER_AP_INCOME) +
    Math.max(0, townHallCount - 1);
  const newAp = Math.min(player.resources.apCap, player.resources.ap + apIncome);

  // Gold income (MVP: no mines yet)
  const newGold = Math.min(GOLD_CAP, player.resources.gold + BASE_GOLD_INCOME);

  const updatedPlayers = {
    ...state.players,
    [playerId]: {
      ...player,
      resources: { ...player.resources, ap: newAp, gold: newGold },
    },
  };

  // Advance to next non-eliminated player
  const { nextPlayerId, newTurn } = advanceTurn(state);

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    activePlayerId: nextPlayerId,
    turn: newTurn,
  };

  return {
    ok: true,
    newState,
    events: [{ kind: "turn_end", newTurnNumber: newTurn, activePlayer: nextPlayerId }],
  };
}

function advanceTurn(state: GameState): { nextPlayerId: PlayerId; newTurn: number } {
  const order = state.playerOrder;
  const currentIndex = order.indexOf(state.activePlayerId);
  let nextIndex = (currentIndex + 1) % order.length;

  // Skip eliminated players
  let safety = 0;
  while (state.players[order[nextIndex]!]?.eliminated && safety < order.length) {
    nextIndex = (nextIndex + 1) % order.length;
    safety++;
  }

  const wrappedAround = nextIndex <= currentIndex;
  return {
    nextPlayerId: order[nextIndex]!,
    newTurn: wrappedAround ? state.turn + 1 : state.turn,
  };
}

function countTownHalls(state: GameState, playerId: PlayerId): number {
  let count = 0;
  for (const row of state.sectors) {
    for (const sector of row) {
      if (sector.owner === playerId && sector.building?.type === "town_hall") count++;
    }
  }
  return count;
}
