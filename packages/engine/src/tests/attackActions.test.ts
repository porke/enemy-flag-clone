import { describe, it, expect } from "vitest";
import { applyAttack } from "../attackActions.js";
import { ATTACK_AP_COST, ATTACK_ARMY_COST, TOWN_HALL_MAX_HP } from "../constants.js";
import { makeState, townHall, withResources, withSector } from "./fixtures.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * A 5×5 state where player1 owns (2,2)+(3,2).
 * Target candidates:
 *   (2,1) — neutral empty, edge+diagonal from (2,2)+(3,2)
 *   (4,2) — neutral empty, edge from (3,2), diagonal from (2,2)
 */
function twoSectorState() {
  return makeState(
    [
      [".", ".", ".", ".", "."],
      [".", ".", ".", ".", "."],
      [".", ".", "P", "P", "."],
      [".", ".", ".", ".", "."],
      [".", ".", ".", ".", "."],
    ],
    { activePlayer: "player1", playerOrder: ["player1", "ai"] },
  );
}

// ─── rejection ───────────────────────────────────────────────────────────────

describe("applyAttack – rejection", () => {
  it("returns ok=false for an invalid attack", () => {
    const state = twoSectorState();
    const result = applyAttack(state, "player1", { x: 0, y: 0 });
    expect(result.ok).toBe(false);
    expect(result.newState).toBe(state); // state unchanged
    expect(result.events).toHaveLength(0);
  });
});

// ─── resource deduction ──────────────────────────────────────────────────────

describe("applyAttack – resource deduction", () => {
  it("deducts AP cost on a valid attack", () => {
    const state = twoSectorState();
    const { newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(newState.players["player1"]!.resources.ap).toBe(
      state.players["player1"]!.resources.ap - ATTACK_AP_COST,
    );
  });

  it("deducts army when army > 0", () => {
    const state = twoSectorState();
    const initialArmy = state.players["player1"]!.resources.army;
    const { newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(newState.players["player1"]!.resources.army).toBe(
      initialArmy - ATTACK_ARMY_COST,
    );
  });

  it("does NOT deduct army when army is 0 (floor rule)", () => {
    const state = withResources(twoSectorState(), "player1", { army: 0 });
    const { ok, newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(ok).toBe(true);
    expect(newState.players["player1"]!.resources.army).toBe(0);
  });
});

// ─── attacking an empty sector (claim) ───────────────────────────────────────

describe("applyAttack – claim empty sector", () => {
  it("transfers ownership to attacker", () => {
    const state = twoSectorState();
    const { newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(newState.sectors[1]![2]!.owner).toBe("player1");
  });

  it("emits sector_claimed event", () => {
    const state = twoSectorState();
    const { events } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(events.some((e) => e.kind === "sector_claimed")).toBe(true);
  });

  it("awards XP for attacking+claiming an enemy sector", () => {
    // enemy (ai) neutral -- actually (2,1) is neutral, so XP = 0.25 + 0.375 = 0.625
    const state = twoSectorState();
    const { newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    const xpBefore = state.players["player1"]!.resources.xp;
    const xpAfter = newState.players["player1"]!.resources.xp;
    expect(xpAfter).toBeCloseTo(xpBefore + 0.625, 5);
  });

  it("awards higher XP for claiming an enemy-owned sector", () => {
    // Make (2,1) owned by ai
    const state = withSector(twoSectorState(), { x: 2, y: 1 }, { owner: "ai" });
    const { newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    const xpBefore = state.players["player1"]!.resources.xp;
    const xpAfter = newState.players["player1"]!.resources.xp;
    // Enemy: attack XP = 1.0, claim XP = 1.5 → total 2.5
    expect(xpAfter).toBeCloseTo(xpBefore + 2.5, 5);
  });
});

// ─── attacking a building ────────────────────────────────────────────────────

describe("applyAttack – attack building", () => {
  it("reduces building HP by 1", () => {
    const state = withSector(twoSectorState(), { x: 2, y: 1 }, {
      owner: "ai",
      building: townHall(3),
    });
    const { newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(newState.sectors[1]![2]!.building?.hp).toBe(2);
  });

  it("emits building_damaged when HP > 0 after hit", () => {
    const state = withSector(twoSectorState(), { x: 2, y: 1 }, {
      owner: "ai",
      building: townHall(3),
    });
    const { events } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(events.some((e) => e.kind === "building_damaged")).toBe(true);
    expect(events.some((e) => e.kind === "building_destroyed")).toBe(false);
  });

  it("emits building_destroyed when HP reaches 0", () => {
    const state = withSector(twoSectorState(), { x: 2, y: 1 }, {
      owner: "ai",
      building: townHall(1),
    });
    const { events } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(events.some((e) => e.kind === "building_destroyed")).toBe(true);
    expect(events.some((e) => e.kind === "building_damaged")).toBe(false);
  });

  it("sector remains enemy-owned after building is destroyed (Option B)", () => {
    const state = withSector(twoSectorState(), { x: 2, y: 1 }, {
      owner: "ai",
      building: townHall(1),
    });
    const { newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    // Still ai-owned — a separate follow-up attack is needed to claim it
    expect(newState.sectors[1]![2]!.owner).toBe("ai");
  });
});

// ─── XP cap update ───────────────────────────────────────────────────────────

describe("applyAttack – AP cap update from XP", () => {
  it("recalculates AP cap when XP crosses a threshold", () => {
    // Need 8 XP to gain 1 AP cap. Start at xp=7 so attacking (using ~1 XP) tips it over.
    // Enemy claim: 1.0 + 1.5 = 2.5 XP. Start xp=7 → new xp=9.5 → cap = 12+1 = 13.
    const state = withResources(
      withSector(twoSectorState(), { x: 2, y: 1 }, { owner: "ai" }),
      "player1",
      { xp: 7 },
    );
    const { newState } = applyAttack(state, "player1", { x: 2, y: 1 });
    expect(newState.players["player1"]!.resources.apCap).toBe(13);
  });
});

// ─── auto-annex triggered ─────────────────────────────────────────────────────

describe("applyAttack – triggers auto-annex", () => {
  it("annexes a surrounded neutral sector after a claim", () => {
    // Layout on a 5×5 grid:
    //   . . . . .
    //   . P P P .    y=1  player owns (1,1),(2,1),(3,1)
    //   . P . P .    y=2  player owns (1,2),(3,2); neutral at (2,2)
    //   . P P P .    y=3  player owns (1,3),(2,3),(3,3)
    //   . . . . .
    //
    // Attack (2,1) which is already owned — wrong. Let me rebuild:
    // We need to claim a sector such that (2,2) – which is neutral – becomes
    // surrounded. We can almost have it surrounded and then claim the last piece.
    //
    // player1 owns: (1,2),(3,2),(2,1),(2,3). After claiming (2,0)... no that's edge.
    // Better: claim (2,1) from being neutral.
    // player1 already owns (1,1),(3,1),(2,3),(1,2),(3,2). Target: (2,1).
    // After claiming (2,1): neighbors of (2,2) are (1,2)(3,2)(2,1)(2,3) — all player1 → annex.
    const state = makeState(
      [
        [".", ".", ".", ".", "."],
        [".", "P", ".", "P", "."], // (2,1) is neutral target
        [".", "P", ".", "P", "."], // (2,2) is neutral — will be annexed
        [".", "P", "P", "P", "."], // (2,3) is player1
        [".", ".", ".", ".", "."],
      ],
      { activePlayer: "player1", playerOrder: ["player1", "ai"] },
    );
    // Verify initial conditions
    expect(state.sectors[2]![2]!.owner).toBe("neutral");

    const { newState, events } = applyAttack(state, "player1", { x: 2, y: 1 });

    // (2,2) should now be auto-annexed
    expect(newState.sectors[2]![2]!.owner).toBe("player1");
    expect(events.some((e) => e.kind === "sector_annexed")).toBe(true);
  });
});
