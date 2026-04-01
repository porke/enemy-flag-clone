import { describe, it, expect } from "vitest";
import { applyEndOfTurn } from "../turnEngine.js";
import {
  BASE_AP_INCOME,
  BASE_GOLD_INCOME,
  GOLD_CAP,
  STARTING_AP,
  STARTING_AP_CAP,
  STARTING_GOLD,
} from "../constants.js";
import { makeState, townHall, withResources, withSector } from "./fixtures.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Simple 3×3 state; player1 owns (1,1), ai owns (1,2). */
function simpleState() {
  return makeState(
    [
      [".", ".", "."],
      [".", "P", "."],
      [".", "A", "."],
    ],
    { activePlayer: "player1", playerOrder: ["player1", "ai"] },
  );
}

// ─── rejection guards ─────────────────────────────────────────────────────────

describe("applyEndOfTurn – rejection", () => {
  it("rejects when caller is not the active player", () => {
    const state = simpleState();
    const result = applyEndOfTurn(state, "ai");
    expect(result.ok).toBe(false);
  });

  it("rejects when the game is already won", () => {
    const state = { ...simpleState(), winner: "player1" };
    const result = applyEndOfTurn(state, "player1");
    expect(result.ok).toBe(false);
  });
});

// ─── AP income ───────────────────────────────────────────────────────────────

describe("applyEndOfTurn – AP income", () => {
  it("applies base AP income (8) when player has only border sectors", () => {
    const state = simpleState();
    const apBefore = state.players["player1"]!.resources.ap;
    const { newState } = applyEndOfTurn(state, "player1");
    // player1 has 1 border sector (1,1), 0 internal, 1 town hall = 0 (first TH gives no bonus)
    // income = 8 + 0 + 0 + 0 = 8; but capped at apCap = 12
    expect(newState.players["player1"]!.resources.ap).toBe(
      Math.min(STARTING_AP_CAP, apBefore + BASE_AP_INCOME),
    );
  });

  it("awards +1 AP per 50 internal sectors", () => {
    // Build a state with 50 internal sectors for player1.
    // Easiest: use a very large grid. Instead we'll verify the +1 at threshold.
    // We construct a state where classifySectors returns exactly 50 internal sectors by
    // testing via formula directly.  For a unit integration approach, build a 12×12 grid
    // all owned by player1 — interior count = 10×10 = 100 → income = 8 + 2 = 10.
    const grid: string[][] = [];
    for (let y = 0; y < 12; y++) {
      const row: string[] = [];
      for (let x = 0; x < 12; x++) row.push("P");
      grid.push(row);
    }
    const state = makeState(grid, {
      activePlayer: "player1",
      playerOrder: ["player1", "ai"],
      // Give player1 full AP cap so we don't hit it
      playerResources: { player1: { ap: 0, apCap: 200 } },
    });
    const { newState } = applyEndOfTurn(state, "player1");
    const income = newState.players["player1"]!.resources.ap;
    // interior = 10×10 = 100; border = 12*4-4 = 44
    // AP income = 8 + floor(100/50) + floor(44/100) + 0 = 8 + 2 + 0 = 10
    expect(income).toBe(10);
  });

  it("awards +1 AP per additional Town Hall beyond the first", () => {
    // player1 has 2 Town Halls → +1 AP bonus
    const state = withSector(
      withSector(simpleState(), { x: 1, y: 1 }, { building: townHall() }),
      { x: 2, y: 1 },
      { owner: "player1", building: townHall() },
    );
    const { newState } = applyEndOfTurn(state, "player1");
    // income = 8 + 0 + 0 + 1 (extra TH) = 9; ap before = STARTING_AP=8 → min(12, 8+9)=12
    expect(newState.players["player1"]!.resources.ap).toBe(12);
  });

  it("caps AP at apCap", () => {
    const state = withResources(simpleState(), "player1", { ap: 12, apCap: 12 });
    const { newState } = applyEndOfTurn(state, "player1");
    expect(newState.players["player1"]!.resources.ap).toBe(12);
  });
});

// ─── gold income ──────────────────────────────────────────────────────────────

describe("applyEndOfTurn – gold income", () => {
  it("applies base gold income (+2) each turn", () => {
    const state = simpleState();
    const goldBefore = state.players["player1"]!.resources.gold;
    const { newState } = applyEndOfTurn(state, "player1");
    expect(newState.players["player1"]!.resources.gold).toBe(goldBefore + BASE_GOLD_INCOME);
  });

  it("caps gold at GOLD_CAP", () => {
    const state = withResources(simpleState(), "player1", { gold: GOLD_CAP });
    const { newState } = applyEndOfTurn(state, "player1");
    expect(newState.players["player1"]!.resources.gold).toBe(GOLD_CAP);
  });
});

// ─── army ─────────────────────────────────────────────────────────────────────

describe("applyEndOfTurn – army", () => {
  it("does NOT regenerate army (MVP: no passive income)", () => {
    const state = withResources(simpleState(), "player1", { army: 5 });
    const { newState } = applyEndOfTurn(state, "player1");
    expect(newState.players["player1"]!.resources.army).toBe(5);
  });
});

// ─── turn advancement ─────────────────────────────────────────────────────────

describe("applyEndOfTurn – turn advancement", () => {
  it("advances activePlayerId to the next player", () => {
    const state = simpleState();
    const { newState } = applyEndOfTurn(state, "player1");
    expect(newState.activePlayerId).toBe("ai");
  });

  it("does NOT increment turn counter when rotation has not wrapped", () => {
    const state = simpleState(); // player1 → ai (no wrap yet)
    const { newState } = applyEndOfTurn(state, "player1");
    expect(newState.turn).toBe(1);
  });

  it("increments turn counter when rotation wraps back to first player", () => {
    // Advance to ai's turn, then ai ends turn → wraps to player1 → turn 2
    const state1 = applyEndOfTurn(simpleState(), "player1").newState;
    // Manually set ap for ai so endTurn is valid
    const state2 = applyEndOfTurn(state1, "ai").newState;
    expect(state2.turn).toBe(2);
    expect(state2.activePlayerId).toBe("player1");
  });

  it("skips eliminated players in rotation", () => {
    const state = {
      ...simpleState(),
      players: {
        ...simpleState().players,
        ai: { ...simpleState().players["ai"]!, eliminated: true },
      },
    };
    const { newState } = applyEndOfTurn(state, "player1");
    // ai is eliminated → wraps back to player1
    expect(newState.activePlayerId).toBe("player1");
  });

  it("emits turn_end event", () => {
    const state = simpleState();
    const { events } = applyEndOfTurn(state, "player1");
    expect(events.some((e) => e.kind === "turn_end")).toBe(true);
  });
});
