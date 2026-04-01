// Public API surface for the engine package.

export type {
  Action,
  ActionResult,
  Building,
  BuildingType,
  Coord,
  Feature,
  GameEvent,
  GameState,
  Player,
  PlayerId,
  Resources,
  Sector,
} from "./types.js";

export * from "./constants.js";
export { loadMap } from "./mapLoader.js";
export { canAttack } from "./attackRules.js";
export { applyAttack } from "./attackActions.js";
export { applyAbandon } from "./stateActions.js";
export { applyEndOfTurn } from "./turnEngine.js";
export { checkVictory } from "./victoryCheck.js";
export { runAutoAnnex } from "./autoAnnex.js";
export {
  classifySectors,
  getNeighbors4,
  getNeighbors8,
  getSector,
  isOwnedBy,
} from "./sectorUtils.js";
