import type { Coord, GameState, PlayerId } from "./types.js";

/** Returns the 4 cardinal (N/S/E/W) neighbors of `coord` that are within map bounds. */
export function getNeighbors4(state: GameState, coord: Coord): Coord[] {
  const { x, y } = coord;
  const height = state.sectors.length;
  const width = state.sectors[0]?.length ?? 0;
  const candidates: Coord[] = [
    { x, y: y - 1 },
    { x, y: y + 1 },
    { x: x - 1, y },
    { x: x + 1, y },
  ];
  return candidates.filter((c) => c.x >= 0 && c.x < width && c.y >= 0 && c.y < height);
}

/** Returns all 8 neighbors (including diagonals) of `coord` that are within map bounds. */
export function getNeighbors8(state: GameState, coord: Coord): Coord[] {
  const { x, y } = coord;
  const height = state.sectors.length;
  const width = state.sectors[0]?.length ?? 0;
  const neighbors: Coord[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  return neighbors;
}

export function getSector(state: GameState, coord: Coord) {
  return state.sectors[coord.y]?.[coord.x];
}

export function isOwnedBy(state: GameState, coord: Coord, playerId: PlayerId): boolean {
  return getSector(state, coord)?.owner === playerId;
}

export interface SectorClassification {
  internal: Coord[];
  border: Coord[];
}

/**
 * Classifies a player's sectors as internal or border.
 *
 * Internal: owned by `playerId` AND all 4 cardinal neighbors within bounds are
 * also owned by `playerId`. Map-edge "missing" neighbors count as not owned —
 * a sector touching the map boundary is never classified as internal.
 *
 * Border: owned by `playerId` but not internal.
 */
export function classifySectors(state: GameState, playerId: PlayerId): SectorClassification {
  const height = state.sectors.length;
  const width = state.sectors[0]?.length ?? 0;
  const internal: Coord[] = [];
  const border: Coord[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const coord: Coord = { x, y };
      if (!isOwnedBy(state, coord, playerId)) continue;

      // A sector on the map edge can never be internal.
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        border.push(coord);
        continue;
      }

      const neighbors = getNeighbors4(state, coord);
      // getNeighbors4 only returns in-bounds neighbors; for an interior cell all
      // 4 directions are in-bounds — if fewer than 4 come back it's on the edge
      // (already handled above), so this check is a safety guard.
      const allOwned = neighbors.length === 4 && neighbors.every((n) => isOwnedBy(state, n, playerId));

      if (allOwned) {
        internal.push(coord);
      } else {
        border.push(coord);
      }
    }
  }

  return { internal, border };
}
