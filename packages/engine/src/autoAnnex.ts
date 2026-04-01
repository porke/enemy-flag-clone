import type { Coord, GameEvent, GameState, PlayerId } from "./types.js";
import { getSector, isOwnedBy, getNeighbors4 } from "./sectorUtils.js";
import {
  AP_CAP_MAX,
  STARTING_AP_CAP,
  XP_CLAIM_ENEMY,
  XP_CLAIM_NEUTRAL,
  XP_PER_AP_CAP,
} from "./constants.js";

/**
 * Scans for newly surrounded sectors and claims them for `triggeringPlayerId`.
 * A sector qualifies if it is not owned by the player, has no building, and
 * all 4 cardinal neighbors within map bounds are owned by the player.
 * Map-edge sectors can never be auto-annexed (a missing off-map neighbor is
 * treated as not owned).
 *
 * Repeats until no more qualifying sectors remain.
 */
export function runAutoAnnex(
  state: GameState,
  triggeringPlayerId: PlayerId,
): { newState: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let current = state;

  while (true) {
    const candidate = findAnnexCandidate(current, triggeringPlayerId);
    if (!candidate) break;

    const sector = getSector(current, candidate)!;
    const isEnemy = sector.owner !== "neutral";
    const xpGain = isEnemy ? XP_CLAIM_ENEMY : XP_CLAIM_NEUTRAL;

    // Claim the sector
    const updatedSectors = mutateSector(current, candidate, (s) => ({
      ...s,
      owner: triggeringPlayerId,
    }));

    // Award XP and recalculate AP cap
    const player = current.players[triggeringPlayerId]!;
    const newXp = player.resources.xp + xpGain;
    const newApCap = Math.min(AP_CAP_MAX, STARTING_AP_CAP + Math.floor(newXp / XP_PER_AP_CAP));
    const updatedPlayers = {
      ...current.players,
      [triggeringPlayerId]: {
        ...player,
        resources: { ...player.resources, xp: newXp, apCap: newApCap },
      },
    };

    current = { ...current, sectors: updatedSectors, players: updatedPlayers };
    events.push({ kind: "sector_annexed", coord: candidate, byPlayer: triggeringPlayerId });
  }

  return { newState: current, events };
}

function findAnnexCandidate(state: GameState, playerId: PlayerId): Coord | null {
  const height = state.sectors.length;
  const width = state.sectors[0]?.length ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const coord: Coord = { x, y };
      const sector = getSector(state, coord)!;

      if (sector.owner === playerId) continue;
      if (sector.building !== null) continue;

      // Map-edge sectors cannot be annexed
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) continue;

      const neighbors4 = getNeighbors4(state, coord);
      // An interior sector always has exactly 4 in-bounds cardinal neighbors
      if (neighbors4.length < 4) continue;
      if (neighbors4.every((n) => isOwnedBy(state, n, playerId))) {
        return coord;
      }
    }
  }
  return null;
}

/** Returns a new sectors grid with the sector at `coord` replaced by `transform(sector)`. */
export function mutateSector(
  state: GameState,
  coord: Coord,
  transform: (sector: import("./types.js").Sector) => import("./types.js").Sector,
): GameState["sectors"] {
  return state.sectors.map((row, rowY) =>
    rowY === coord.y
      ? row.map((s, colX) => (colX === coord.x ? transform(s) : s))
      : row,
  );
}
