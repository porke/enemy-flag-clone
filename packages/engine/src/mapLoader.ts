import {
  STARTING_AP,
  STARTING_AP_CAP,
  STARTING_ARMY,
  STARTING_GOLD,
  TOWN_HALL_MAX_HP,
} from "./constants.js";
import type { Building, BuildingType, Feature, GameState, Player, PlayerId, Sector } from "./types.js";

// JSON shape of ExampleMap.json
interface MapTile {
  x: number;
  y: number;
  owner: string;       // "neutral" | player id
  feature: string | null; // "tree" | "mountain" | "town_hall" | null
  gold_vein: boolean;
}

interface MapDefinition {
  meta: {
    name: string;
    width: number;
    height: number;
  };
  tiles: MapTile[];
}

/**
 * Parses a map JSON file and constructs the initial GameState.
 *
 * Player order: the human player (isHuman = true inferred by appearing first
 * in owner list, or "player1") is placed at index 0; the AI player at index 1.
 * For the 1v1 MVP this is always ["player1", "ai"].
 */
export function loadMap(json: unknown): GameState {
  const definition = json as MapDefinition;
  const { width, height } = definition.meta;

  // Build empty grid
  const sectors: Sector[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      coord: { x, y },
      owner: "neutral" as const,
      building: null,
      feature: null,
      goldVein: false,
    })),
  );

  // Collect all unique non-neutral owners
  const ownerSet = new Set<string>();
  for (const tile of definition.tiles) {
    if (tile.owner !== "neutral") ownerSet.add(tile.owner);
  }

  // Populate sectors from tile list
  for (const tile of definition.tiles) {
    const row = sectors[tile.y];
    if (!row) continue;
    const sector = row[tile.x];
    if (!sector) continue;

    const rawFeature = tile.feature;
    let feature: Feature = null;
    let building: Building | null = null;

    if (rawFeature === "town_hall") {
      building = { type: "town_hall" as BuildingType, hp: TOWN_HALL_MAX_HP, maxHp: TOWN_HALL_MAX_HP };
    } else if (rawFeature === "tree" || rawFeature === "mountain") {
      feature = rawFeature as Feature;
    }

    sector.owner = tile.owner as PlayerId | "neutral";
    sector.building = building;
    sector.feature = feature;
    sector.goldVein = tile.gold_vein;
  }

  // Build player map — human player first, AI second (MVP convention)
  const ownerIds = Array.from(ownerSet);
  // Ensure "player1" is first if present
  ownerIds.sort((a, b) => {
    if (a === "player1") return -1;
    if (b === "player1") return 1;
    return a.localeCompare(b);
  });

  const PLAYER_COLORS: Record<string, string> = {
    player1: "#d4a800",
    ai: "#2a5bd7",
  };
  const PLAYER_NAMES: Record<string, string> = {
    player1: "Player 1",
    ai: "AI",
  };

  const players: Record<PlayerId, Player> = {};
  for (const id of ownerIds) {
    players[id] = {
      id,
      name: PLAYER_NAMES[id] ?? id,
      color: PLAYER_COLORS[id] ?? "#888888",
      isHuman: id === "player1",
      eliminated: false,
      resources: {
        ap: STARTING_AP,
        apCap: STARTING_AP_CAP,
        gold: STARTING_GOLD,
        army: STARTING_ARMY,
        xp: 0,
      },
    };
  }

  return {
    turn: 1,
    activePlayerId: ownerIds[0] ?? "player1",
    playerOrder: ownerIds,
    players,
    sectors: sectors as GameState["sectors"],
    winner: null,
  };
}
