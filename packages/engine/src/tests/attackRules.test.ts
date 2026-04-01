import { describe, it, expect } from "vitest";
import { canAttack } from "../attackRules.js";
import { makeState, townHall, withResources, withSector } from "./fixtures.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

// A minimal 5×5 state where player1 owns (2,2) and ai owns (2,4).
// player1 is the active player.
function baseState() {
  return makeState(
    [
      //  0    1    2    3    4
      [".", ".", ".", ".", "."], // y=0
      [".", ".", ".", ".", "."], // y=1
      [".", ".", "P", ".", "."], // y=2  player1 at (2,2)
      [".", ".", ".", ".", "."], // y=3
      [".", ".", "A", ".", "."], // y=4  ai at (2,4)
    ],
    { activePlayer: "player1", playerOrder: ["player1", "ai"] },
  );
}

// ─── basic rejections ─────────────────────────────────────────────────────────

describe("canAttack – basic rejections", () => {
  it("rejects when attacker is not the active player", () => {
    const state = baseState();
    expect(canAttack(state, "ai", { x: 2, y: 3 })).toBe(false);
  });

  it("rejects when attacker is eliminated", () => {
    let state = baseState();
    state = {
      ...state,
      players: {
        ...state.players,
        player1: { ...state.players["player1"]!, eliminated: true },
      },
    };
    expect(canAttack(state, "player1", { x: 2, y: 1 })).toBe(false);
  });

  it("rejects an out-of-bounds target", () => {
    const state = baseState();
    expect(canAttack(state, "player1", { x: -1, y: 0 })).toBe(false);
    expect(canAttack(state, "player1", { x: 99, y: 0 })).toBe(false);
  });

  it("rejects attacking own sector", () => {
    const state = baseState();
    expect(canAttack(state, "player1", { x: 2, y: 2 })).toBe(false);
  });

  it("rejects when attacker has insufficient AP", () => {
    const state = withResources(baseState(), "player1", { ap: 1 });
    expect(canAttack(state, "player1", { x: 2, y: 1 })).toBe(false);
  });

  it("rejects a target that is not edge-adjacent to any own sector", () => {
    const state = baseState();
    // (0,0) is nowhere near (2,2)
    expect(canAttack(state, "player1", { x: 0, y: 0 })).toBe(false);
  });

  it("rejects when target has a building with 0 HP (already destroyed)", () => {
    const state = withSector(baseState(), { x: 2, y: 1 }, {
      owner: "ai",
      building: { type: "town_hall", hp: 0, maxHp: 3 },
    });
    // The sector still belongs to AI but building hp=0 — follow-up claim attack
    // is valid only because hp=0 means "no building blocks anymore".
    // Wait — per spec, if building.hp <= 0 the attack is invalid (that check
    // fires). Let me re-read attackRules.ts:
    //   "if (target.building !== null && target.building.hp <= 0) return false;"
    // So attacking a sector whose building hp=0 is REJECTED here. The follow-up
    // claim is handled by first doing a normal attack (which finds building null
    // after destruction). This test verifies the guard fires.
    expect(canAttack(state, "player1", { x: 2, y: 1 })).toBe(false);
  });
});

// ─── adjacency rules ──────────────────────────────────────────────────────────

describe("canAttack – adjacency rules (§6.2)", () => {
  it("allows attack on an empty sector that is edge-adjacent AND has 2nd 8-neighbor", () => {
    // player1 owns (2,2) and (3,2). Target (2,1) has 2 owned neighbors:
    // (2,2) is edge-adjacent, (3,2) is diagonal-adjacent.
    const state = makeState(
      [
        [".", ".", ".", ".", "."],
        [".", ".", ".", ".", "."], // (2,1) is target
        [".", ".", "P", "P", "."], // player1 at (2,2) and (3,2)
        [".", ".", ".", ".", "."],
        [".", ".", ".", ".", "."],
      ],
      { activePlayer: "player1", playerOrder: ["player1", "ai"] },
    );
    expect(canAttack(state, "player1", { x: 2, y: 1 })).toBe(true);
  });

  it("rejects when edge-adjacent but only 1 owned 8-neighbor (needs ≥ 2)", () => {
    // player1 owns only (2,2). Target (2,1) has exactly 1 owned 8-neighbor.
    const state = baseState();
    expect(canAttack(state, "player1", { x: 2, y: 1 })).toBe(false);
  });

  it("rejects when 2 owned 8-neighbors exist but none are edge-adjacent", () => {
    // player1 owns (1,1) and (3,1). Target (2,2) has both as diagonal neighbors,
    // but neither shares an edge with target (2,2).
    const state = makeState(
      [
        [".", ".", ".", ".", "."],
        [".", "P", ".", "P", "."],
        [".", ".", ".", ".", "."],
        [".", ".", ".", ".", "."],
        [".", ".", ".", ".", "."],
      ],
      { activePlayer: "player1", playerOrder: ["player1", "ai"] },
    );
    expect(canAttack(state, "player1", { x: 2, y: 2 })).toBe(false);
  });

  it("allows attack on a sector with a live building using same adjacency rules", () => {
    // player1 owns (2,2) and (3,2). Target (2,1) has ai town hall (hp=3).
    const state = withSector(
      makeState(
        [
          [".", ".", ".", ".", "."],
          [".", ".", ".", ".", "."],
          [".", ".", "P", "P", "."],
          [".", ".", ".", ".", "."],
          [".", ".", ".", ".", "."],
        ],
        { activePlayer: "player1", playerOrder: ["player1", "ai"] },
      ),
      { x: 2, y: 1 },
      { owner: "ai", building: townHall(3) },
    );
    expect(canAttack(state, "player1", { x: 2, y: 1 })).toBe(true);
  });
});

// ─── Town Hall exception ──────────────────────────────────────────────────────

describe("canAttack – Town Hall exception (§6.2 rule 7)", () => {
  it("waives the two-neighbor requirement when attacker has 1 sector with Town Hall", () => {
    // player1 has exactly 1 sector at (2,2) with a Town Hall.
    // Target (2,1) is edge-adjacent but has only 1 owned 8-neighbor (normally rejected).
    const state = withSector(
      makeState(
        [
          [".", ".", ".", ".", "."],
          [".", ".", ".", ".", "."],
          [".", ".", "P", ".", "."],
          [".", ".", ".", ".", "."],
          [".", ".", ".", ".", "."],
        ],
        { activePlayer: "player1", playerOrder: ["player1", "ai"] },
      ),
      { x: 2, y: 2 },
      { owner: "player1", building: townHall() },
    );
    expect(canAttack(state, "player1", { x: 2, y: 1 })).toBe(true);
  });

  it("does NOT waive two-neighbor requirement when 1-sector player has no Town Hall", () => {
    // player1 has exactly 1 sector at (2,2) but no Town Hall.
    const state = baseState();
    expect(canAttack(state, "player1", { x: 2, y: 1 })).toBe(false);
  });

  it("does NOT apply Town Hall exception when attacker has > 1 sector", () => {
    // player1 owns (2,2) with Town Hall AND (3,2) — 2 sectors total.
    // Target (2,1) still only has 1 owned 8-neighbor (2,2), so should fail.
    const state = withSector(
      makeState(
        [
          [".", ".", ".", ".", "."],
          [".", ".", ".", ".", "."],
          [".", ".", "P", "P", "."],
          [".", ".", ".", ".", "."],
          [".", ".", ".", ".", "."],
        ],
        { activePlayer: "player1", playerOrder: ["player1", "ai"] },
      ),
      { x: 2, y: 2 },
      { owner: "player1", building: townHall() },
    );
    // (2,1): edge-adjacent via (2,2), diagonal via (3,2) → 2 owned 8-neighbors → actually VALID
    // Change target to (1,2) instead: edge-adjacent to (2,2), but only 1 owned 8-neighbor
    // because player1 has TWO sectors so exception doesn't apply.
    // (1,2) neighbors: (0,2),(2,2),(1,1),(1,3) as edge; (0,1),(2,1),(0,3),(2,3) as diag
    // only (2,2) is owned → 1 owned 8-neighbor, exception doesn't apply → false
    expect(canAttack(state, "player1", { x: 1, y: 2 })).toBe(false);
  });
});
