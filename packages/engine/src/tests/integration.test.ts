/**
 * Integration test: scripted two-player game sequence using the real ExampleMap.
 *
 * Exercises loadMap → applyAttack → applyEndOfTurn across two players and
 * verifies that income, turn advancement, and victory detection all compose
 * correctly.
 */
import { describe, it, expect, beforeAll } from "vitest";
import ExampleMapJson from "../maps/ExampleMap.json";
import { loadMap } from "../mapLoader.js";
import { applyAttack } from "../attackActions.js";
import { applyEndOfTurn } from "../turnEngine.js";
import { checkVictory } from "../victoryCheck.js";
import { canAttack } from "../attackRules.js";
import type { GameState } from "../types.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

function sectorOwner(state: GameState, x: number, y: number) {
  return state.sectors[y]?.[x]?.owner;
}

function ap(state: GameState, id: string) {
  return state.players[id]!.resources.ap;
}

function gold(state: GameState, id: string) {
  return state.players[id]!.resources.gold;
}

// ─── initial state ────────────────────────────────────────────────────────────

describe("Integration – ExampleMap initial state", () => {
  let state: GameState;
  beforeAll(() => {
    state = loadMap(ExampleMapJson);
  });

  it("loads a valid game state", () => {
    expect(state).toBeDefined();
    expect(state.winner).toBeNull();
  });

  it("player1 starts as the active player", () => {
    expect(state.activePlayerId).toBe("player1");
  });

  it("both players start with no eliminations", () => {
    expect(state.players["player1"]!.eliminated).toBe(false);
    expect(state.players["player2"]!.eliminated).toBe(false);
  });

  it("player1 Town Hall is at (2,3)", () => {
    const sector = state.sectors[3]?.[2];
    expect(sector?.owner).toBe("player1");
    expect(sector?.building?.type).toBe("town_hall");
  });

  it("player2 Town Hall is at (17,16)", () => {
    const sector = state.sectors[16]?.[17];
    expect(sector?.owner).toBe("player2");
    expect(sector?.building?.type).toBe("town_hall");
  });

  it("turn starts at 1", () => {
    expect(state.turn).toBe(1);
  });
});

// ─── turn 1: player1 expands ──────────────────────────────────────────────────

describe("Integration – player1 attacks an adjacent neutral sector", () => {
  let state: GameState;
  beforeAll(() => {
    state = loadMap(ExampleMapJson);
  });

  // (1,2) is adjacent to player1's (2,2) and (1,3); also within 8-range of (2,3)
  it("(1,2) is a valid attack target at game start", () => {
    expect(canAttack(state, "player1", { x: 1, y: 2 })).toBe(true);
  });

  it("attacking (1,2) succeeds and claims the sector", () => {
    const result = applyAttack(state, "player1", { x: 1, y: 2 });
    expect(result.ok).toBe(true);
    expect(sectorOwner(result.newState, 1, 2)).toBe("player1");
    state = result.newState;
  });

  it("AP is reduced by ATTACK_AP_COST (2)", () => {
    // started at 8, spent 2
    expect(ap(state, "player1")).toBe(6);
  });
});

// ─── turn 1: player1 ends turn, income applied ────────────────────────────────

describe("Integration – player1 end of turn", () => {
  let stateAfterAttack: GameState;
  let stateAfterEot: GameState;

  beforeAll(() => {
    stateAfterAttack = loadMap(ExampleMapJson);
    stateAfterAttack = applyAttack(stateAfterAttack, "player1", { x: 1, y: 2 }).newState;

    const eotResult = applyEndOfTurn(stateAfterAttack, "player1");
    expect(eotResult.ok).toBe(true);
    stateAfterEot = eotResult.newState;
  });

  it("active player advances to player2", () => {
    expect(stateAfterEot.activePlayerId).toBe("player2");
  });

  it("turn counter is still 1 (not yet wrapped)", () => {
    expect(stateAfterEot.turn).toBe(1);
  });

  it("player1 AP is capped at apCap (12) after income", () => {
    // Before EOT: ap=6, income=8 → 14, capped at 12
    expect(ap(stateAfterEot, "player1")).toBe(12);
  });

  it("player1 gold increases by BASE_GOLD_INCOME (2)", () => {
    // Started at STARTING_GOLD=350, earns 2 per turn
    expect(gold(stateAfterEot, "player1")).toBe(352);
  });

  it("player1 territory is not disturbed by EOT", () => {
    expect(sectorOwner(stateAfterEot, 1, 2)).toBe("player1");
    expect(sectorOwner(stateAfterEot, 2, 3)).toBe("player1");
  });
});

// ─── turn 1: player2 ends immediately, turn counter increments ───────────────

describe("Integration – player2 ends turn (no actions)", () => {
  let state: GameState;

  beforeAll(() => {
    state = loadMap(ExampleMapJson);
    state = applyAttack(state, "player1", { x: 1, y: 2 }).newState;
    state = applyEndOfTurn(state, "player1").newState;
    state = applyEndOfTurn(state, "player2").newState;
  });

  it("active player is back to player1", () => {
    expect(state.activePlayerId).toBe("player1");
  });

  it("turn counter increments to 2 after full round", () => {
    expect(state.turn).toBe(2);
  });

  it("player2 gold increased by BASE_GOLD_INCOME", () => {
    expect(gold(state, "player2")).toBe(352);
  });

  it("player2 AP capped after idle income (8 start + 8 income = 12 cap)", () => {
    expect(ap(state, "player2")).toBe(12);
  });
});

// ─── victory: destroying the last Town Hall ends the game ────────────────────

describe("Integration – victory via destroying last Town Hall", () => {
  it("winner is declared when a player's last TH is destroyed", () => {
    // Build minimal state: player1 attacks player2's sole TH (HP=1 to finish in one hit)
    let state = loadMap(ExampleMapJson);

    // Reduce player2's TH hp to 1 so one attack is enough
    state = {
      ...state,
      sectors: state.sectors.map((row, y) =>
        y === 16
          ? row.map((s, x) =>
              x === 17 && s.building
                ? { ...s, building: { ...s.building, hp: 1 } }
                : s,
            )
          : row,
      ) as GameState["sectors"],
    };

    // Give player1 enough AP and position (teleport player1 into range by
    // directly mutating a sector adjacent to player2's TH)
    // Place a player1 sector at (16,16) and (17,15) so player1 can claim (17,16)
    state = {
      ...state,
      sectors: state.sectors.map((row, y) => {
        if (y === 16) {
          return row.map((s, x) => {
            if (x === 16) return { ...s, owner: "player1" };
            if (x === 18) return { ...s, owner: "player1" };
            return s;
          });
        }
        if (y === 15) {
          return row.map((s, x) =>
            x === 17 ? { ...s, owner: "player1" } : s,
          );
        }
        if (y === 17) {
          return row.map((s, x) =>
            x === 17 ? { ...s, owner: "player1" } : s,
          );
        }
        return row;
      }) as GameState["sectors"],
    };

    // Ensure player1 is active and has enough AP
    state = {
      ...state,
      activePlayerId: "player1",
      players: {
        ...state.players,
        player1: {
          ...state.players["player1"]!,
          resources: { ...state.players["player1"]!.resources, ap: 12 },
        },
      },
    };

    // canAttack (17,16) — should be valid; 4-neighbors include (16,16) and others owned by p1
    expect(canAttack(state, "player1", { x: 17, y: 16 })).toBe(true);

    // Attack the TH; after HP drops to 0 claim completes and victory is declared
    const result = applyAttack(state, "player1", { x: 17, y: 16 });
    expect(result.ok).toBe(true);

    // checkVictory is called inside applyAttack; verify winner
    expect(result.newState.winner).toBe("player1");
    expect(result.newState.players["player2"]!.eliminated).toBe(true);
  });
});
