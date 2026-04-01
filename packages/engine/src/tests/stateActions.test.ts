import { describe, it, expect } from "vitest";
import { applyAbandon } from "../stateActions.js";
import { ABANDON_AP_COST } from "../constants.js";
import { makeState, townHall, withResources, withSector } from "./fixtures.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** 3×3 state: player1 owns (1,1) and (1,2). ai owns (1,0). */
function baseState() {
  return makeState(
    [
      [".", "A", "."],
      [".", "P", "."],
      [".", "P", "."],
    ],
    { activePlayer: "player1", playerOrder: ["player1", "ai"] },
  );
}

// ─── rejection guards ─────────────────────────────────────────────────────────

describe("applyAbandon – rejection", () => {
  it("rejects when caller is not the active player", () => {
    const state = baseState();
    const result = applyAbandon(state, "ai", { x: 1, y: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects when target sector is not owned by player", () => {
    const state = baseState();
    // (1,0) is owned by ai
    const result = applyAbandon(state, "player1", { x: 1, y: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects when player has insufficient AP", () => {
    const state = withResources(baseState(), "player1", { ap: 0 });
    const result = applyAbandon(state, "player1", { x: 1, y: 1 });
    expect(result.ok).toBe(false);
  });

  it("rejects abandoning the last Town Hall", () => {
    // player1 has only (1,1) with a Town Hall (and (1,2) without)
    const state = withSector(baseState(), { x: 1, y: 1 }, {
      owner: "player1",
      building: townHall(),
    });
    // Only 1 TH → cannot abandon
    const result = applyAbandon(state, "player1", { x: 1, y: 1 });
    expect(result.ok).toBe(false);
  });

  it("allows abandoning a Town Hall when more than one exists", () => {
    // player1 has TH at (1,1) AND (1,2)
    const state = withSector(
      withSector(baseState(), { x: 1, y: 1 }, { owner: "player1", building: townHall() }),
      { x: 1, y: 2 },
      { owner: "player1", building: townHall() },
    );
    const result = applyAbandon(state, "player1", { x: 1, y: 1 });
    expect(result.ok).toBe(true);
  });
});

// ─── successful abandon ───────────────────────────────────────────────────────

describe("applyAbandon – success", () => {
  it("sets sector owner to neutral", () => {
    const state = baseState();
    const { newState } = applyAbandon(state, "player1", { x: 1, y: 1 });
    expect(newState.sectors[1]![1]!.owner).toBe("neutral");
  });

  it("destroys any building on the abandoned sector", () => {
    const state = withSector(baseState(), { x: 1, y: 1 }, {
      owner: "player1",
      building: townHall(),
    });
    // Give player1 a second TH so abandoning is allowed
    const state2 = withSector(state, { x: 1, y: 2 }, {
      owner: "player1",
      building: townHall(),
    });
    const { newState } = applyAbandon(state2, "player1", { x: 1, y: 1 });
    expect(newState.sectors[1]![1]!.building).toBeNull();
  });

  it("deducts ABANDON_AP_COST from player AP", () => {
    const state = baseState();
    const apBefore = state.players["player1"]!.resources.ap;
    const { newState } = applyAbandon(state, "player1", { x: 1, y: 1 });
    expect(newState.players["player1"]!.resources.ap).toBe(apBefore - ABANDON_AP_COST);
  });
});
