import type { GameState, PlayerId } from "./types.js";

/**
 * Returns the winner's PlayerId if exactly one non-eliminated player remains,
 * or null if the game is still in progress.
 *
 * Also marks players who have lost all Town Halls as eliminated (if not already).
 */
export function checkVictory(state: GameState): { newState: GameState; winner: PlayerId | null } {
  // Find players who own no Town Hall and are not yet eliminated
  const toEliminate: PlayerId[] = [];
  for (const player of Object.values(state.players)) {
    if (player.eliminated) continue;
    const hasTownHall = hasTownHallOnMap(state, player.id);
    if (!hasTownHall) {
      toEliminate.push(player.id);
    }
  }

  let newState = state;
  if (toEliminate.length > 0) {
    const updatedPlayers = { ...state.players };
    for (const id of toEliminate) {
      updatedPlayers[id] = { ...updatedPlayers[id]!, eliminated: true };
    }
    newState = { ...state, players: updatedPlayers };
  }

  const survivors = Object.values(newState.players).filter((p) => !p.eliminated);
  if (survivors.length === 1) {
    return { newState, winner: survivors[0]!.id };
  }
  return { newState, winner: null };
}

function hasTownHallOnMap(state: GameState, playerId: PlayerId): boolean {
  for (const row of state.sectors) {
    for (const sector of row) {
      if (
        sector.owner === playerId &&
        sector.building?.type === "town_hall" &&
        sector.building.hp > 0
      ) {
        return true;
      }
    }
  }
  return false;
}
