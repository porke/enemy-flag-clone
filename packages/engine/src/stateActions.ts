import { ABANDON_AP_COST } from "./constants.js";
import type { ActionResult, Coord, GameState, PlayerId } from "./types.js";
import { getSector } from "./sectorUtils.js";
import { mutateSector } from "./autoAnnex.js";

/**
 * Voluntarily releases a player's sector back to neutral.
 * Any building on the sector is destroyed.
 * Cannot abandon the player's last Town Hall.
 */
export function applyAbandon(
  state: GameState,
  playerId: PlayerId,
  coord: Coord,
): ActionResult {
  if (state.activePlayerId !== playerId) {
    return { ok: false, error: "Not your turn.", newState: state, events: [] };
  }

  const player = state.players[playerId];
  if (!player || player.eliminated) {
    return { ok: false, error: "Player not found or eliminated.", newState: state, events: [] };
  }

  const sector = getSector(state, coord);
  if (!sector || sector.owner !== playerId) {
    return { ok: false, error: "Sector not owned by you.", newState: state, events: [] };
  }

  // Cannot abandon the last Town Hall
  if (sector.building?.type === "town_hall") {
    const townHallCount = countTownHalls(state, playerId);
    if (townHallCount <= 1) {
      return { ok: false, error: "Cannot abandon your last Town Hall.", newState: state, events: [] };
    }
  }

  if (player.resources.ap < ABANDON_AP_COST) {
    return { ok: false, error: "Not enough AP.", newState: state, events: [] };
  }

  // Deduct AP
  const updatedPlayers = {
    ...state.players,
    [playerId]: {
      ...player,
      resources: { ...player.resources, ap: player.resources.ap - ABANDON_AP_COST },
    },
  };

  // Release sector to neutral (building destroyed)
  const updatedSectors = mutateSector(state, coord, (s) => ({
    ...s,
    owner: "neutral" as const,
    building: null,
  }));

  const newState: GameState = { ...state, sectors: updatedSectors, players: updatedPlayers };
  return { ok: true, newState, events: [] };
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
