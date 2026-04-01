/**
 * Minimal synthetic GameState factory for unit tests.
 * Every test builds exactly the grid it needs — no dependency on ExampleMap.json.
 */
import type {
  Building,
  Coord,
  Feature,
  GameState,
  Player,
  PlayerId,
  Resources,
  Sector,
} from "../types.js";
import {
  STARTING_AP,
  STARTING_AP_CAP,
  STARTING_ARMY,
  STARTING_GOLD,
  TOWN_HALL_MAX_HP,
} from "../constants.js";

export type OwnerMark = "P" | "A" | "." | "N"; // Player, AI, empty/neutral, Neutral alias

interface SectorSpec {
  owner?: PlayerId | "neutral";
  building?: Building | null;
  feature?: Feature;
  goldVein?: boolean;
}

export function makeResources(overrides: Partial<Resources> = {}): Resources {
  return {
    ap: STARTING_AP,
    apCap: STARTING_AP_CAP,
    gold: STARTING_GOLD,
    army: STARTING_ARMY,
    xp: 0,
    ...overrides,
  };
}

export function makePlayer(
  id: PlayerId,
  overrides: Partial<Player> = {},
): Player {
  return {
    id,
    name: id,
    color: "#fff",
    isHuman: id === "player1",
    eliminated: false,
    resources: makeResources(),
    ...overrides,
  };
}

export function townHall(hp = TOWN_HALL_MAX_HP): Building {
  return { type: "town_hall", hp, maxHp: TOWN_HALL_MAX_HP };
}

/**
 * Build a GameState from a 2-D array of SectorSpec (or shorthand strings).
 *
 * grid[y][x] — rows top-to-bottom.
 *
 * Shorthand row entries:
 *   "P"  → owned by "player1", no building
 *   "A"  → owned by "ai", no building
 *   "."  → neutral, no building
 *   "N"  → neutral (alias)
 *   SectorSpec object for full control.
 */
export function makeState(
  grid: (string | SectorSpec)[][],
  options: {
    activePlayer?: PlayerId;
    playerResources?: Record<PlayerId, Partial<Resources>>;
    playerOrder?: PlayerId[];
    turn?: number;
  } = {},
): GameState {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  const ownerIds = new Set<PlayerId>();

  const sectors: Sector[][] = grid.map((row, y) =>
    row.map((cell, x) => {
      const spec = typeof cell === "string" ? shorthandToSpec(cell) : cell;
      const owner =
        spec.owner ??
        (typeof cell === "string" ? shorthandOwner(cell) : "neutral");
      if (owner !== "neutral") ownerIds.add(owner);
      return {
        coord: { x, y },
        owner,
        building: spec.building ?? null,
        feature: spec.feature ?? null,
        goldVein: spec.goldVein ?? false,
      };
    }),
  );

  const playerOrder =
    options.playerOrder ??
    (ownerIds.size > 0 ? Array.from(ownerIds) : ["player1", "ai"]);

  const players: Record<PlayerId, Player> = {};
  for (const id of playerOrder) {
    const res = options.playerResources?.[id] ?? {};
    players[id] = makePlayer(id, { resources: makeResources(res) });
  }

  return {
    turn: options.turn ?? 1,
    activePlayerId: options.activePlayer ?? playerOrder[0]!,
    playerOrder,
    players,
    sectors: sectors as GameState["sectors"],
    winner: null,
  };
}

// ── helpers ────────────────────────────────────────────────────────────────

function shorthandOwner(cell: string): PlayerId | "neutral" {
  if (cell === "P") return "player1";
  if (cell === "A") return "ai";
  return "neutral";
}

function shorthandToSpec(cell: string): SectorSpec {
  return { owner: shorthandOwner(cell) };
}

/** Mutate a state's player resources (returns new state). */
export function withResources(
  state: GameState,
  playerId: PlayerId,
  overrides: Partial<Resources>,
): GameState {
  const player = state.players[playerId]!;
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        resources: { ...player.resources, ...overrides },
      },
    },
  };
}

/** Replace a sector in a state (returns new state). */
export function withSector(
  state: GameState,
  coord: Coord,
  spec: Partial<Sector>,
): GameState {
  return {
    ...state,
    sectors: state.sectors.map((row, y) =>
      y === coord.y
        ? row.map((s, x) => (x === coord.x ? { ...s, ...spec } : s))
        : row,
    ) as GameState["sectors"],
  };
}
