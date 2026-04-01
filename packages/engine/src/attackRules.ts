import { ATTACK_AP_COST, MIN_ATTACK_OWNED_NEIGHBORS } from "./constants.js";
import type { Coord, GameState, PlayerId } from "./types.js";
import { getNeighbors4, getNeighbors8, getSector, isOwnedBy } from "./sectorUtils.js";

/**
 * Returns true if `attackerId` is legally allowed to attack `targetCoord`.
 * Implements all rules from §6.2 plus army/AP gating.
 */
export function canAttack(state: GameState, attackerId: PlayerId, targetCoord: Coord): boolean {
  const attacker = state.players[attackerId];
  if (!attacker || attacker.eliminated) return false;
  if (state.activePlayerId !== attackerId) return false;

  const target = getSector(state, targetCoord);
  if (!target) return false; // out of bounds

  // Cannot attack own sector
  if (target.owner === attackerId) return false;

  // If target has a building it must still have HP > 0 (already destroyed means
  // HP = 0 but sector could still be enemy-owned – that follow-up attack is valid)
  if (target.building !== null && target.building.hp <= 0) return false;

  // Must have enough AP
  if (attacker.resources.ap < ATTACK_AP_COST) return false;

  // ----- Adjacency rules -----

  // Condition 5: at least one 4-neighbor of target must be owned by attacker
  const edgeNeighbors = getNeighbors4(state, targetCoord);
  const hasEdgeAdjacency = edgeNeighbors.some((n) => isOwnedBy(state, n, attackerId));
  if (!hasEdgeAdjacency) return false;

  // Town Hall exception (§6.2 rule 7): if attacker has exactly 1 sector and
  // that sector contains their Town Hall, condition 6 is waived.
  const attackerSectors = countSectors(state, attackerId);
  if (attackerSectors === 1) {
    const soloCoord = findFirstSector(state, attackerId);
    if (soloCoord) {
      const soloSector = getSector(state, soloCoord);
      if (soloSector?.building?.type === "town_hall") {
        // Condition 5 already satisfied above; condition 6 is waived.
        return true;
      }
    }
  }

  // Condition 6: target must have ≥ 2 sectors owned by attacker within 8-neighbors
  const allNeighbors = getNeighbors8(state, targetCoord);
  const ownedNeighborCount = allNeighbors.filter((n) => isOwnedBy(state, n, attackerId)).length;
  return ownedNeighborCount >= MIN_ATTACK_OWNED_NEIGHBORS;
}

function countSectors(state: GameState, playerId: PlayerId): number {
  let count = 0;
  for (const row of state.sectors) {
    for (const sector of row) {
      if (sector.owner === playerId) count++;
    }
  }
  return count;
}

function findFirstSector(state: GameState, playerId: PlayerId): Coord | null {
  for (const row of state.sectors) {
    for (const sector of row) {
      if (sector.owner === playerId) return sector.coord;
    }
  }
  return null;
}
