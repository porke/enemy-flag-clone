import {
  ATTACK_AP_COST,
  ATTACK_ARMY_COST,
  ATTACK_BUILDING_DAMAGE,
  AP_CAP_MAX,
  STARTING_AP_CAP,
  XP_ATTACK_ENEMY,
  XP_ATTACK_NEUTRAL,
  XP_CLAIM_ENEMY,
  XP_CLAIM_NEUTRAL,
  XP_DESTROY_TOWN_HALL,
  XP_PER_AP_CAP,
} from "./constants.js";
import type { ActionResult, Coord, GameEvent, GameState, PlayerId } from "./types.js";
import { canAttack } from "./attackRules.js";
import { runAutoAnnex, mutateSector } from "./autoAnnex.js";
import { checkVictory } from "./victoryCheck.js";
import { getSector } from "./sectorUtils.js";

/**
 * Applies an attack action by `attackerId` against `targetCoord`.
 * Returns an ActionResult with the updated state and emitted events.
 */
export function applyAttack(
  state: GameState,
  attackerId: PlayerId,
  targetCoord: Coord,
): ActionResult {
  if (!canAttack(state, attackerId, targetCoord)) {
    return { ok: false, error: "Attack is not valid.", newState: state, events: [] };
  }

  const events: GameEvent[] = [];
  let current = state;

  // 1. Deduct AP (and army if available)
  const player = current.players[attackerId]!;
  const newArmy = player.resources.army > 0 ? player.resources.army - ATTACK_ARMY_COST : 0;
  let updatedPlayers = {
    ...current.players,
    [attackerId]: {
      ...player,
      resources: { ...player.resources, ap: player.resources.ap - ATTACK_AP_COST, army: newArmy },
    },
  };
  current = { ...current, players: updatedPlayers };

  // 2. Resolve attack
  const target = getSector(current, targetCoord)!;
  const isEnemySector = target.owner !== "neutral";

  let attackXp = isEnemySector ? XP_ATTACK_ENEMY : XP_ATTACK_NEUTRAL; // XP for the attack action itself
  let extraXp = 0; // XP for additional outcomes (claim, town hall destroy, etc.)

  if (target.building !== null && target.building.hp > 0) {
    // Attack a building: reduce HP
    const newHp = target.building.hp - ATTACK_BUILDING_DAMAGE;
    const updatedSectors = mutateSector(current, targetCoord, (s) => ({
      ...s,
      building: s.building ? { ...s.building, hp: newHp } : null,
    }));
    current = { ...current, sectors: updatedSectors };

    if (newHp <= 0) {
      events.push({ kind: "building_destroyed", coord: targetCoord, buildingType: target.building.type });

      if (target.building.type === "town_hall") {
        extraXp += isEnemySector ? XP_DESTROY_TOWN_HALL : 0;
        // Victory check happens after XP is awarded below
      }
    } else {
      events.push({ kind: "building_damaged", coord: targetCoord, remainingHp: newHp });
    }
  } else {
    // No building (or building already at 0 HP): claim the sector
    const updatedSectors = mutateSector(current, targetCoord, (s) => ({
      ...s,
      owner: attackerId,
      building: null, // clear any already-destroyed building remnant
    }));
    current = { ...current, sectors: updatedSectors };
    events.push({ kind: "sector_claimed", coord: targetCoord, byPlayer: attackerId });
    extraXp += isEnemySector ? XP_CLAIM_ENEMY : XP_CLAIM_NEUTRAL;
  }

  // 3. Award XP and recalculate AP cap
  const totalXp = attackXp + extraXp;
  const freshPlayer = current.players[attackerId]!;
  const newXp = freshPlayer.resources.xp + totalXp;
  const newApCap = Math.min(AP_CAP_MAX, STARTING_AP_CAP + Math.floor(newXp / XP_PER_AP_CAP));
  updatedPlayers = {
    ...current.players,
    [attackerId]: {
      ...freshPlayer,
      resources: { ...freshPlayer.resources, xp: newXp, apCap: newApCap },
    },
  };
  current = { ...current, players: updatedPlayers };

  // 4. Run auto-annexation after a claim
  const targetAfterAttack = getSector(current, targetCoord)!;
  if (targetAfterAttack.owner === attackerId) {
    const { newState, events: annexEvents } = runAutoAnnex(current, attackerId);
    current = newState;
    events.push(...annexEvents);
  }

  // 5. Victory check
  const { newState: stateAfterVictory, winner } = checkVictory(current);
  current = stateAfterVictory;

  if (winner) {
    // Emit player_eliminated for anyone newly marked eliminated
    for (const [id, p] of Object.entries(current.players)) {
      if (p.eliminated && !state.players[id]?.eliminated) {
        events.push({ kind: "player_eliminated", playerId: id });
      }
    }
    events.push({ kind: "victory", winnerId: winner });
    current = { ...current, winner };
  }

  return { ok: true, newState: current, events };
}
