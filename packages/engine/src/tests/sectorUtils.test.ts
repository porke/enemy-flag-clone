import { describe, it, expect } from "vitest";
import { classifySectors, getNeighbors4, getNeighbors8 } from "../sectorUtils.js";
import { makeState } from "./fixtures.js";

// ─── getNeighbors4 ────────────────────────────────────────────────────────────

describe("getNeighbors4", () => {
  it("returns 4 neighbors for an interior cell", () => {
    const state = makeState([
      [".", ".", "."],
      [".", ".", "."],
      [".", ".", "."],
    ]);
    const neighbors = getNeighbors4(state, { x: 1, y: 1 });
    expect(neighbors).toHaveLength(4);
  });

  it("returns 2 neighbors for a corner cell", () => {
    const state = makeState([
      [".", "."],
      [".", "."],
    ]);
    const neighbors = getNeighbors4(state, { x: 0, y: 0 });
    expect(neighbors).toHaveLength(2);
    // should include right and below
    expect(neighbors).toContainEqual({ x: 1, y: 0 });
    expect(neighbors).toContainEqual({ x: 0, y: 1 });
  });

  it("returns 3 neighbors for an edge (non-corner) cell", () => {
    const state = makeState([
      [".", ".", "."],
      [".", ".", "."],
    ]);
    // top-center
    const neighbors = getNeighbors4(state, { x: 1, y: 0 });
    expect(neighbors).toHaveLength(3);
  });

  it("does not include diagonal neighbors", () => {
    const state = makeState([
      [".", ".", "."],
      [".", ".", "."],
      [".", ".", "."],
    ]);
    const neighbors = getNeighbors4(state, { x: 1, y: 1 });
    for (const n of neighbors) {
      const isDiagonal = Math.abs(n.x - 1) === 1 && Math.abs(n.y - 1) === 1;
      expect(isDiagonal).toBe(false);
    }
  });
});

// ─── getNeighbors8 ────────────────────────────────────────────────────────────

describe("getNeighbors8", () => {
  it("returns 8 neighbors for an interior cell in a 3×3 grid", () => {
    const state = makeState([
      [".", ".", "."],
      [".", ".", "."],
      [".", ".", "."],
    ]);
    expect(getNeighbors8(state, { x: 1, y: 1 })).toHaveLength(8);
  });

  it("returns 3 neighbors for a corner cell", () => {
    const state = makeState([
      [".", ".", "."],
      [".", ".", "."],
      [".", ".", "."],
    ]);
    expect(getNeighbors8(state, { x: 0, y: 0 })).toHaveLength(3);
  });

  it("returns 5 neighbors for an edge cell", () => {
    const state = makeState([
      [".", ".", "."],
      [".", ".", "."],
      [".", ".", "."],
    ]);
    expect(getNeighbors8(state, { x: 1, y: 0 })).toHaveLength(5);
  });
});

// ─── classifySectors ─────────────────────────────────────────────────────────

describe("classifySectors", () => {
  it("classifies an isolated single owned sector as border", () => {
    const state = makeState([
      [".", ".", "."],
      [".", "P", "."],
      [".", ".", "."],
    ]);
    const { internal, border } = classifySectors(state, "player1");
    expect(internal).toHaveLength(0);
    expect(border).toHaveLength(1);
  });

  it("classifies a sector completely surrounded by own sectors as internal", () => {
    // 5×5: player owns the center 3×3 block
    const row5 = ["P", "P", "P", "P", "P"];
    const state = makeState([
      [".",".",".",".","."],
      [".","P","P","P","."],
      [".","P","P","P","."],
      [".","P","P","P","."],
      [".",".",".",".","."  ],
    ], { playerOrder: ["player1", "ai"] });
    const { internal, border } = classifySectors(state, "player1");
    // Only (2,2) – the very center of the 3×3 – has all 4 cardinal neighbors owned
    expect(internal).toHaveLength(1);
    expect(internal[0]).toEqual({ x: 2, y: 2 });
    expect(border).toHaveLength(8);
  });

  it("map-edge sectors are always border, never internal", () => {
    // Entire 3×3 grid owned by player1
    const state = makeState([
      ["P", "P", "P"],
      ["P", "P", "P"],
      ["P", "P", "P"],
    ]);
    const { internal, border } = classifySectors(state, "player1");
    // Center (1,1) would normally be internal BUT every cell is on the edge of a 3×3
    // (1,1) in a 3×3 grid: x=1 is not 0 or 2, y=1 is not 0 or 2 — not edge, so it IS internal
    // All 8 surrounding are owned – so (1,1) should be internal
    expect(internal).toHaveLength(1);
    expect(internal[0]).toEqual({ x: 1, y: 1 });
    expect(border).toHaveLength(8);
  });

  it("returns empty arrays for a player who owns no sectors", () => {
    const state = makeState([
      [".", "."],
      [".", "."],
    ], { playerOrder: ["player1", "ai"] });
    const { internal, border } = classifySectors(state, "player1");
    expect(internal).toHaveLength(0);
    expect(border).toHaveLength(0);
  });

  it("correctly counts internal vs border for an L-shaped territory", () => {
    // 5×5 grid: player owns first 2 columns + bottom row
    //  P P . . .
    //  P P . . .
    //  P P . . .
    //  P P P P P
    //  P P P P P   ← last 2 rows for a clean internal check
    // Simpler: 3×3 where player owns a row of 3 in the middle
    const state = makeState([
      [".",".","."],
      ["P","P","P"],
      [".",".","."],
    ], { playerOrder: ["player1", "ai"] });
    // None of the owned cells can be internal — all are on map edge (y=1 is not edge in a 3-row
    // grid since height=3, y=1 is interior). But none have all 4 cardinal neighbors owned.
    const { internal, border } = classifySectors(state, "player1");
    expect(internal).toHaveLength(0);
    expect(border).toHaveLength(3);
  });
});
