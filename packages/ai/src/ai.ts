import type { Action, Coord, GameState, PlayerId } from "@enemy-flag/engine";
import { applyAttack, canAttack } from "@enemy-flag/engine";

/**
 * Minimal AI strategy: repeatedly attacks the closest reachable sector toward
 * the human's Town Hall until AP is exhausted.
 *
 * Stateless pure function — (state, aiId) → Action[].
 */
export function computeAiTurn(state: GameState, aiId: PlayerId): Action[] {
  const actions: Action[] = [];
  let current = state;

  const humanId = state.playerOrder.find((id: PlayerId) => id !== aiId) ?? null;
  const targetCoord = humanId ? findTownHall(state, humanId) : null;

  while (true) {
    const attackCoord = pickBestAttack(current, aiId, targetCoord);
    if (!attackCoord) break;

    actions.push({ type: "attack", coord: attackCoord });

    const result = applyAttack(current, aiId, attackCoord);
    if (!result.ok) break;
    current = result.newState;
    if (current.winner !== null) break;
  }

  actions.push({ type: "endTurn" });
  return actions;
}

/** Picks the highest-priority attackable sector (closest to `priorityTarget`). */
function pickBestAttack(
  state: GameState,
  aiId: PlayerId,
  priorityTarget: Coord | null,
): Coord | null {
  const height = state.sectors.length;
  const width = state.sectors[0]?.length ?? 0;

  let best: Coord | null = null;
  let bestDist = Infinity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const coord: Coord = { x, y };
      if (!canAttack(state, aiId, coord)) continue;
      const dist = priorityTarget ? manhattanDist(coord, priorityTarget) : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = coord;
      }
    }
  }

  return best;
}

function manhattanDist(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findTownHall(state: GameState, playerId: PlayerId): Coord | null {
  for (const row of state.sectors) {
    for (const sector of row) {
      if (sector.owner === playerId && sector.building?.type === "town_hall") {
        return sector.coord;
      }
    }
  }
  return null;
}
