import { describe, it, expect } from "vitest";
import { runAutoAnnex } from "../autoAnnex.js";
import { makeState, townHall, withSector } from "./fixtures.js";

// ─── helpers ─────────────────────────────────────────────────────────────────
//
// "Surrounded" means all 4 cardinal neighbors within bounds are owned by player1.
// Sectors on the map edge can never be surrounded (missing neighbor ≠ owned).

// ─── single annex ─────────────────────────────────────────────────────────────

describe("runAutoAnnex – single sector", () => {
  it("annexes a neutral sector surrounded on all 4 sides", () => {
    // 3×3 grid: player1 owns N/S/E/W of center; center is neutral.
    const state = makeState(
      [
        [".", "P", "."],
        ["P", ".", "P"],
        [".", "P", "."],
      ],
      { activePlayer: "player1", playerOrder: ["player1", "ai"] },
    );
    const { newState, events } = runAutoAnnex(state, "player1");
    expect(newState.sectors[1]![1]!.owner).toBe("player1");
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("sector_annexed");
    expect((events[0] as { coord: { x: number; y: number } }).coord).toEqual({ x: 1, y: 1 });
  });

  it("does nothing when no sector is surrounded", () => {
    const state = makeState(
      [
        [".", ".", "."],
        [".", "P", "."],
        [".", ".", "."],
      ],
      { activePlayer: "player1", playerOrder: ["player1", "ai"] },
    );
    const { newState, events } = runAutoAnnex(state, "player1");
    expect(events).toHaveLength(0);
    expect(newState.sectors[1]![1]!.owner).toBe("player1");
    expect(newState.sectors[0]![1]!.owner).toBe("neutral");
  });

  it("annexes an enemy-owned (non-building) sector that is fully surrounded", () => {
    const state = withSector(
      makeState(
        [
          [".", "P", "."],
          ["P", ".", "P"],
          [".", "P", "."],
        ],
        { activePlayer: "player1", playerOrder: ["player1", "ai"] },
      ),
      { x: 1, y: 1 },
      { owner: "ai" },
    );
    const { newState, events } = runAutoAnnex(state, "player1");
    expect(newState.sectors[1]![1]!.owner).toBe("player1");
    expect(events[0]!.kind).toBe("sector_annexed");
  });
});

// ─── building blocks annexation ───────────────────────────────────────────────

describe("runAutoAnnex – buildings block annexation", () => {
  it("does NOT annex a surrounded sector that contains a building", () => {
    const state = withSector(
      makeState(
        [
          [".", "P", "."],
          ["P", ".", "P"],
          [".", "P", "."],
        ],
        { activePlayer: "player1", playerOrder: ["player1", "ai"] },
      ),
      { x: 1, y: 1 },
      { owner: "ai", building: townHall(1) },
    );
    const { newState, events } = runAutoAnnex(state, "player1");
    // Building present → NOT annexed
    expect(newState.sectors[1]![1]!.owner).toBe("ai");
    expect(events).toHaveLength(0);
  });
});

// ─── map-edge cannot satisfy surrounded ───────────────────────────────────────

describe("runAutoAnnex – map-edge sectors", () => {
  it("does not annex a sector on the map boundary even if reachable from 3 sides", () => {
    // 3×3: player1 owns row y=1: (0,1),(1,1),(2,1) — tries to surround (1,0)
    // but (1,0) is on the top edge: missing north neighbor counts as non-owned → skip
    const state = makeState(
      [
        [".", ".", "."],
        ["P", "P", "P"],
        [".", ".", "."],
      ],
      { activePlayer: "player1", playerOrder: ["player1", "ai"] },
    );
    const { events } = runAutoAnnex(state, "player1");
    expect(events).toHaveLength(0);
  });
});

// ─── chain of annexations ─────────────────────────────────────────────────────

describe("runAutoAnnex – chain", () => {
  it("annexes two sectors in sequence when each becomes surrounded after the previous claim", () => {
    // 5×5 grid: player1 has a ring that simultaneously creates 2 surrounded pockets.
    //   row 0: . P P P .
    //   row 1: P . . . P
    //   row 2: P . P . P   ← (1,2) already owned, (3,2) already owned; (2,2) not surrounded yet
    //   row 3: P . . . P
    //   row 4: . P P P .
    //
    // With this layout (2,2) is surrounded: N=(2,1) neutral, S=(2,3) neutral, etc.
    // Actually for a clean double-annex we need two independent pockets.
    //
    // Simple approach: two separate 3×3 pockets in a bigger grid.
    // 7×3:
    //   . P . . . P .
    //   P . P . P . P
    //   . P . . . P .
    //
    // Pocket A at (1,1); pocket B at (5,1).
    const state = makeState(
      [
        [".", "P", ".", ".", ".", "P", "."],
        ["P", ".", "P", ".", "P", ".", "P"],
        [".", "P", ".", ".", ".", "P", "."],
      ],
      { activePlayer: "player1", playerOrder: ["player1", "ai"] },
    );
    const { newState, events } = runAutoAnnex(state, "player1");
    expect(events).toHaveLength(2);
    expect(newState.sectors[1]![1]!.owner).toBe("player1");
    expect(newState.sectors[1]![5]!.owner).toBe("player1");
  });

  it("awards XP for each annexed sector", () => {
    const state = makeState(
      [
        [".", "P", "."],
        ["P", ".", "P"],
        [".", "P", "."],
      ],
      { activePlayer: "player1", playerOrder: ["player1", "ai"] },
    );
    const xpBefore = state.players["player1"]!.resources.xp;
    const { newState } = runAutoAnnex(state, "player1");
    const xpAfter = newState.players["player1"]!.resources.xp;
    // Neutral annex XP = 0.375
    expect(xpAfter).toBeCloseTo(xpBefore + 0.375, 5);
  });
});
