import { describe, it, expect } from "vitest";
import { checkVictory } from "../victoryCheck.js";
import { applyAttack } from "../attackActions.js";
import { makeState, townHall, withSector } from "./fixtures.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** player1 has a TH at (2,2); ai has a TH at (2,4). Neither eliminated. */
function twoPlayerState() {
  return withSector(
    withSector(
      makeState(
        [
          [".", ".", ".", ".", "."],
          [".", ".", ".", ".", "."],
          [".", ".", "P", "P", "."],
          [".", ".", ".", ".", "."],
          [".", ".", "A", "A", "."],
        ],
        { activePlayer: "player1", playerOrder: ["player1", "ai"] },
      ),
      { x: 2, y: 2 },
      { owner: "player1", building: townHall() },
    ),
    { x: 2, y: 4 },
    { owner: "ai", building: townHall() },
  );
}

// ─── no winner ────────────────────────────────────────────────────────────────

describe("checkVictory – no winner", () => {
  it("returns null when both players have Town Halls", () => {
    const { winner } = checkVictory(twoPlayerState());
    expect(winner).toBeNull();
  });

  it("does not mark any player as eliminated when both have TH", () => {
    const { newState } = checkVictory(twoPlayerState());
    expect(newState.players["player1"]!.eliminated).toBe(false);
    expect(newState.players["ai"]!.eliminated).toBe(false);
  });
});

// ─── elimination detection ────────────────────────────────────────────────────

describe("checkVictory – elimination", () => {
  it("marks a player eliminated when they have no Town Hall", () => {
    // Remove ai's town hall
    const state = withSector(twoPlayerState(), { x: 2, y: 4 }, {
      owner: "ai",
      building: null,
    });
    const { newState, winner } = checkVictory(state);
    expect(newState.players["ai"]!.eliminated).toBe(true);
    expect(winner).toBe("player1");
  });

  it("detects victory when last enemy TH is destroyed via applyAttack", () => {
    // ai has a TH with HP=1 and player1 can reach it.
    // Build a state where player1 can legally attack ai's TH.
    const state = withSector(
      makeState(
        [
          [".", ".", ".", ".", "."],
          [".", ".", ".", ".", "."],
          [".", ".", "P", "P", "."],
          [".", ".", "P", ".", "."],
          [".", ".", "A", "A", "."],
        ],
        { activePlayer: "player1", playerOrder: ["player1", "ai"] },
      ),
      { x: 2, y: 4 },
      { owner: "ai", building: townHall(1) },
    );
    // player1 owns (2,3) which is edge-adjacent to (2,4), plus (3,2)→(3,3) diagonal
    // Actually (2,3) is edge-adjacent AND (3,3) neighbor check:
    // 8-neighbors of (2,4): (1,3)(2,3)(3,3)(1,4)(3,4)(1,5-OOB)(2,5-OOB)(3,5-OOB)
    // Wait — grid is 5 rows (0-4), (2,5) OOB. In-bounds: (1,3),(2,3),(3,3),(1,4),(3,4)
    // player1 owns (2,3) → edge adjacent ✓; also must have ≥2 owned 8-members: only (2,3)
    // Need another neighbor. Add player1 at (3,3) too.
    // Also give player1 a Town Hall at (2,2) so checkVictory doesn't eliminate them too.
    const state2 = withSector(
      withSector(state, { x: 3, y: 3 }, { owner: "player1" }),
      { x: 2, y: 2 },
      { owner: "player1", building: townHall() },
    );

    const { ok, newState, events } = applyAttack(state2, "player1", { x: 2, y: 4 });
    expect(ok).toBe(true);
    // Building destroyed first (HP 1→0), but sector not yet claimed
    // Now the follow-up mechanics: building_destroyed event present
    expect(events.some((e) => e.kind === "building_destroyed")).toBe(true);
    // Victory: ai has no TH → eliminated → player1 wins
    expect(events.some((e) => e.kind === "victory")).toBe(true);
    expect(newState.winner).toBe("player1");
  });

  it("does not double-mark an already eliminated player", () => {
    const state = {
      ...twoPlayerState(),
      players: {
        ...twoPlayerState().players,
        ai: { ...twoPlayerState().players["ai"]!, eliminated: true },
      },
    };
    // Remove ai's TH to see if it's processed again
    const stateNoTH = withSector(state, { x: 2, y: 4 }, { owner: "ai", building: null });
    const { newState } = checkVictory(stateNoTH);
    // Should still be eliminated (only once)
    expect(newState.players["ai"]!.eliminated).toBe(true);
  });
});
