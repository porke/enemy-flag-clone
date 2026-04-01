// Core type definitions for the Enemy Flag game engine.

export type PlayerId = string; // e.g. "player1", "ai"

export interface Coord {
  x: number;
  y: number;
}

export type Feature = "tree" | "mountain" | null;

export type BuildingType = "town_hall"; // MVP: only Town Hall

export interface Building {
  type: BuildingType;
  hp: number;    // current hit points
  maxHp: number; // Town Hall = 3
}

export interface Sector {
  coord: Coord;
  owner: PlayerId | "neutral";
  building: Building | null;
  feature: Feature;
  goldVein: boolean;
}

export interface Resources {
  ap: number;
  apCap: number;
  gold: number;
  army: number;
  xp: number; // stored as float; 1.5 XP increments are possible
}

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  resources: Resources;
  isHuman: boolean;
  eliminated: boolean;
}

// Actions available in the MVP
export type Action =
  | { type: "attack"; coord: Coord }
  | { type: "abandon"; coord: Coord }
  | { type: "endTurn" };

export interface ActionResult {
  ok: boolean;
  error?: string;        // human-readable rejection reason
  newState: GameState;
  events: GameEvent[];   // for the event log
}

export type GameEvent =
  | { kind: "sector_claimed";     coord: Coord; byPlayer: PlayerId }
  | { kind: "sector_annexed";     coord: Coord; byPlayer: PlayerId }
  | { kind: "building_damaged";   coord: Coord; remainingHp: number }
  | { kind: "building_destroyed"; coord: Coord; buildingType: BuildingType }
  | { kind: "player_eliminated";  playerId: PlayerId }
  | { kind: "victory";            winnerId: PlayerId }
  | { kind: "turn_end";           newTurnNumber: number; activePlayer: PlayerId };

export interface GameState {
  readonly turn: number;
  readonly activePlayerId: PlayerId;
  readonly playerOrder: PlayerId[];     // turn rotation order
  readonly players: Readonly<Record<PlayerId, Player>>;
  readonly sectors: readonly (readonly Sector[])[]; // [y][x] indexed
  readonly winner: PlayerId | null;
}
