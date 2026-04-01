# Enemy Flag MVP – Implementation Plan

## Scope

| In | Out |
|---|---|
| Local 1v1 human vs AI | Remote multiplayer / server |
| Game loop (turns, AP + gold income) | All buildings except Town Hall |
| Attack + auto-annexation (core mechanic) | Mines, Barracks, Watchtowers, Walls |
| Victory condition (destroy enemy Town Hall) | Team / FFA modes |
| Abandon sector | Repair / Demolish / Transfer Gold |
| Minimal AI (shortest-path aggression) | Watchtower visibility / fog of war |
| Heavy engine unit tests | Turn timer |

---

## Architecture Overview

Follows the monorepo structure from `architecture.md`.

```
/
├── packages/
│   ├── engine/    ← pure game logic, zero runtime deps; heavily unit tested
│   ├── ai/        ← AI module; depends only on engine types
│   └── client/    ← browser app (Vite + React + Canvas 2D)
├── package.json   ← pnpm workspace root
└── tsconfig.base.json
```

`LocalTransport` lives inside `client/` and wires the engine + AI together without a server.

---

## Phase 0 – Project Bootstrap

**Goal:** Runnable skeleton with linting, testing, and build pipelines.

1. Initialise pnpm workspace root (`package.json`, `pnpm-workspace.yaml`).
2. Create `tsconfig.base.json` (strict, ESNext, path aliases).
3. Scaffold `packages/engine` – TypeScript library, Vitest.
4. Scaffold `packages/ai` – TypeScript library, depends on `engine`.
5. Scaffold `packages/client` – Vite + React + TypeScript, depends on `engine` and `ai`.
6. Add a root `test` script that runs Vitest across all packages.
7. Commit `ExampleMap.json` reference map into `packages/engine/src/maps/`.

---

## Phase 1 – Engine (`packages/engine`)

All functions are **pure** (no side effects). `GameState` is immutable; every mutating function returns a new `GameState`.

### 1.1 Type Definitions (`types.ts`)

```ts
type PlayerId = string;          // e.g. "player1", "ai"
type Coord = { x: number; y: number };

type Feature = "tree" | null;

type BuildingType = "town_hall"; // MVP: only town hall

interface Building {
  type: BuildingType;
  hp: number;       // current hit points
  maxHp: number;    // Town Hall = 3, other buildings = 2 (see §1.10 constants)
}

interface Sector {
  coord: Coord;
  owner: PlayerId | "neutral";
  building: Building | null;
  feature: Feature;
  goldVein: boolean;
}

interface Resources {
  ap: number;
  apCap: number;
  gold: number;
  army: number;
  xp: number;       // stored as float; 1.5 XP actions are possible
}

interface Player {
  id: PlayerId;
  name: string;
  color: string;
  resources: Resources;
  isHuman: boolean;
  eliminated: boolean;
}

// Actions available in MVP
type Action =
  | { type: "attack";  coord: Coord }
  | { type: "abandon"; coord: Coord }
  | { type: "endTurn" };

interface ActionResult {
  ok: boolean;
  error?: string;         // human-readable rejection reason
  newState: GameState;
  events: GameEvent[];    // for the event log
}

type GameEvent =
  | { kind: "sector_claimed";    coord: Coord; byPlayer: PlayerId }
  | { kind: "sector_annexed";    coord: Coord; byPlayer: PlayerId }
  | { kind: "building_damaged";  coord: Coord; remainingHp: number }
  | { kind: "building_destroyed";coord: Coord; buildingType: BuildingType }
  | { kind: "player_eliminated"; playerId: PlayerId }
  | { kind: "victory";           winnerId: PlayerId }
  | { kind: "turn_end";          newTurnNumber: number; activePlayer: PlayerId };

interface GameState {
  readonly turn: number;
  readonly activePlayerId: PlayerId;
  readonly playerOrder: PlayerId[];   // turn rotation order
  readonly players: Record<PlayerId, Player>;
  readonly sectors: Sector[][];       // [y][x] indexed
  readonly winner: PlayerId | null;
}
```

### 1.2 Map Loading (`mapLoader.ts`)

- `loadMap(json: MapDefinition): GameState`
  - Parse the JSON format used in `ExampleMap.json`.
  - Build the `sectors[y][x]` grid.
  - Derive initial `Resources` for each player found in the map: `ap = 8`, `gold = 350`, `army = 20`, `xp = 0`, `apCap = 12`.
  - Initialise AP cap from starting XP = 0 → cap = 12.
  - `playerOrder`: the human player is always placed first (`playerOrder[0]`), the AI second. This is fixed for the 1v1 MVP and does not depend on JSON insertion order.
  - `turn = 1`, `activePlayerId = playerOrder[0]`.

### 1.3 Sector Helpers (`sectorUtils.ts`)

- `getNeighbors4(state, coord): Coord[]` – cardinal (N/S/E/W) neighbors within bounds.
- `getNeighbors8(state, coord): Coord[]` – all 8 neighbors within bounds.
- `isOwnedBy(state, coord, playerId): boolean`
- `classifySectors(state, playerId): { internal: Coord[]; border: Coord[] }`
  - **Internal:** sector is owned by `playerId` AND all 4 cardinal neighbors within bounds are also owned by `playerId`. Map-edge "missing" neighbors count as **not owned** — a sector touching the map boundary is never classified as internal.
  - **Border:** owned but not internal.

### 1.4 Attackability Validation (`attackRules.ts`)

- `canAttack(state, attackerId, targetCoord): boolean`

Rules (§6.2):
1. Attacker must be the active player and not eliminated.
2. Target must not be owned by the attacker.
3. Target must be within map bounds.
4. If target has a building:
   - The building must not already be destroyed (HP > 0).
   - Sector still cannot be *claimed* until HP = 0 (attack is still valid).
5. **Edge-adjacency condition:** at least one 4-neighbor of target is owned by attacker.
6. **Two-neighbor condition:** the target must have ≥ 2 sectors owned by the attacker within its 8-neighbors (diagonals included). The edge-neighbor from condition 5 counts toward this total; one diagonal-only neighbor is sufficient to complete the count of 2.
7. **Town Hall exception:** if the attacker has exactly one sector and that sector contains their Town Hall, condition 6 is waived as long as condition 5 is met.
8. Attacker must have AP ≥ 2 (`ATTACK_AP_COST`). **Army is not required to be > 0** — when army reaches 0 the cost is simply not deducted (army cannot go below 0). This waiver is a temporary MVP stand-in until the XP-disparity fail mechanic is added.

### 1.5 Attack Resolution (`attackActions.ts`)

- `applyAttack(state, attackerId, targetCoord): ActionResult`

Steps:
1. Run `canAttack`; reject if invalid.
2. Deduct `ATTACK_AP_COST` AP from attacker. Deduct `ATTACK_ARMY_COST` army **only if `army > 0`** (army floor is 0; it never goes negative).
3. Determine result:
   - **Target has a building (HP > 0):** Reduce building HP by 1.
     - If HP reaches 0: building is destroyed; emit `building_destroyed` event.
       - If building was a Town Hall: check if owner now has zero Town Halls → `player_eliminated` event + `checkVictory`.
       - Sector remains enemy-owned after building destruction. One further attack on the now-empty sector is required to claim it (Option B confirmed).
     - If HP > 0 after hit: emit `building_damaged`. Attacker earns 1 XP for the attack.
   - **Target has no building:** Claim the sector for attacker. Emit `sector_claimed`.
4. Award XP to attacker:
   - +1 XP for attacking an enemy sector.
   - +1.5 XP for claiming an enemy sector (taking over, on top of attack XP).
   - Neutral targets give 25% of the above XP values.
   - +15 XP for destroying an enemy Town Hall.
5. Recalculate attacker's AP cap: `Math.min(200, 12 + Math.floor(xp / 8))`.
6. If sector was claimed, run auto-annexation check.
7. Check victory.

### 1.6 Auto-Annexation (`autoAnnex.ts`)

- `runAutoAnnex(state, triggeringPlayerId): { newState: GameState; events: GameEvent[] }`

Algorithm:
1. Scan every sector not owned by `triggeringPlayerId`.
2. A sector qualifies for auto-annexation if:
   - It is not owned by `triggeringPlayerId`.
   - It has **no building** (buildings block annexation).
   - All 4 cardinal neighbors **within map bounds** are owned by `triggeringPlayerId`. Missing edge-of-map neighbors count as **not owned** — a sector touching the map edge cannot be auto-annexed from that side.
3. For each qualifying sector (take first found, re-scan after each annexation):
   - Claim sector for `triggeringPlayerId`.
   - Emit `sector_annexed`.
   - Award 1.5 XP (enemy) or 0.375 XP (neutral) — same XP rate as attack claim.
4. Repeat scan until no more qualifying sectors exist.

> There is no engine-enforced cap on auto-annexations per turn. The "up to 3" note in §6.3 of the rules is a geometric observation about what is achievable in one move sequence, not a programmatic limit.

### 1.7 Abandon Sector (`stateActions.ts`)

- `applyAbandon(state, playerId, coord): ActionResult`
  - Target must be owned by player and contain no Town Hall that is the player's last one.
  - Costs `ABANDON_AP_COST` AP.
  - Sector becomes neutral; any building on it is **destroyed** (not left as a neutral structure).

### 1.8 End of Turn / Resource Income (`turnEngine.ts`)

- `applyEndOfTurn(state): ActionResult`
  - Only the active player may call this.
  - **AP income:**
    - `const { internal, border } = classifySectors(state, playerId)`
    - `income = 8 + Math.floor(internal.length / 50) + Math.floor(border.length / 100) + (townHallCount - 1)`
    - `newAp = Math.min(resources.apCap, resources.ap + income)`
  - **Gold income (MVP, no mines):**
    - `income = 2`
    - `newGold = Math.min(20000, resources.gold + income)`
  - **Army income (MVP):** No passive army regeneration. Army decreases by 1 per attack (floored at 0). When army reaches 0 the army cost is waived entirely and AP alone gates attacks — preventing a game deadlock until the real XP-disparity fail mechanic is built. The full mechanic is deferred post-MVP.
  - Advance `activePlayerId` to next non-eliminated player in `playerOrder`.
  - Increment `turn` when rotation wraps back to `playerOrder[0]`.

### 1.9 Victory Check (`victoryCheck.ts`)

- `checkVictory(state): PlayerId | null`
  - Iterate over all players; if any non-eliminated player has 0 sectors containing a Town Hall and is not already marked `eliminated`, mark them eliminated.
  - If exactly one player remains non-eliminated, return their ID.
  - Returns `null` if the game continues.

### 1.10 Action Costs (Constants)

Defined in `constants.ts` — single source of truth, easy to tune.

```ts
export const ATTACK_AP_COST    = 2;
export const ATTACK_ARMY_COST  = 1;  // deducted only when army > 0; no floor below 0
export const ABANDON_AP_COST   = 1;

// Building hit points (attacks to destroy; sector unclaimable while HP > 0)
export const TOWN_HALL_MAX_HP   = 3;
export const OTHER_BUILDING_HP  = 2;  // placeholder for future buildings

// Starting resources (applied by mapLoader for every player)
export const STARTING_AP      = 8;
export const STARTING_GOLD    = 350;
export const STARTING_ARMY    = 20;
export const STARTING_AP_CAP  = 12;   // XP = 0 → cap = 12 + floor(0/8) = 12
```

---

## Phase 2 – Engine Unit Tests (`packages/engine`)

Test framework: **Vitest**. All tests use synthetic minimal `GameState` fixtures, not the full example map, to keep tests fast and isolated.

### Test modules

| File | What it covers |
|---|---|
| `mapLoader.test.ts` | JSON → GameState, player resource initialisation, sector grid layout |
| `sectorUtils.test.ts` | `classifySectors` (interior/border), edge-of-map handling, various territory shapes |
| `attackRules.test.ts` | All branches of `canAttack`: valid attacks, edge/corner conditions, Town Hall exception, insufficient resources |
| `attackActions.test.ts` | Attack with no building (claim), attack onto building (HP reduction), building destruction, XP awards, auto-annex trigger |
| `autoAnnex.test.ts` | Single annex, chain of 2, multi-annex from one attack (no hard cap), building blocks annex, edge-of-map does not satisfy surrounded |
| `turnEngine.test.ts` | AP income formula (internal + border + town hall bonus), gold income, no army regeneration, turn rotation, AP cap update from XP |
| `victoryCheck.test.ts` | Last-Town-Hall elimination, winner detection, multi-turn game reaching terminal state |
| `stateActions.test.ts` | Abandon valid sector, abandon blocked by last Town Hall, AP deduction |
| `integration.test.ts` | A scripted 5-turn game sequence: human attacks in, AI attacks in, end-of-turn income applied correctly, victory eventually reached |

Test coverage target: **≥ 90%** of engine source lines.

---

## Phase 3 – AI Module (`packages/ai`)

### 3.1 AI Strategy

The MVP AI is stateless: `computeAiTurn(state: GameState, aiId: PlayerId): Action[]`.

Algorithm:
1. **Pathfinding:** BFS from every AI-owned sector outward across the grid, treating non-AI sectors as traversable, to find the shortest path to any human-owned sector or the human's Town Hall sector specifically.
2. **Priority queue:** Rank all sectors attackable by the AI (using `canAttack`) by their BFS distance to the target. Ties broken by proximity to human's Town Hall.
3. **Action generation:** Repeatedly pick the highest-priority attackable sector, emit an `attack` action, simulate the resulting state, and repeat until the AI runs out of AP (or army).
4. Emit `endTurn` as the final action.

> No randomness, no lookahead beyond the current action's state update. This is intentionally the simplest viable strategy.

### 3.2 Edge Cases

- If no attackable sector exists on the path (territory is isolated), attack any legally attackable sector (fallback: first found in BFS order).
- If AI has 0 AP, emit `endTurn` immediately. (Zero army does not block the AI — army cost is waived at 0, consistent with the human player rule.)

---

## Phase 4 – Client (`packages/client`)

Technology: **Vite + React + TypeScript + Canvas 2D**.

### 4.1 LocalTransport (`src/transport/LocalTransport.ts`)

```ts
class LocalTransport implements GameTransport {
  private state: GameState;
  private ai: (state: GameState, aiId: PlayerId) => Action[];
  private listeners: ((state: GameState, events: GameEvent[]) => void)[] = [];

  submitAction(action: Action): Promise<{ state: GameState; events: GameEvent[] }> {
    // 1. Apply action to engine (returns ActionResult with new state + events).
    // 2. If new active player is AI, run AI turn immediately (loop until AI endTurn).
    // 3. Broadcast final state to listeners.
    // 4. Resolve promise.
  }

  onStateUpdate(cb) { this.listeners.push(cb); }
}
```

AI actions execute synchronously in the same microtask for MVP (no animation delay between AI moves). Each AI action is:
- Printed to the browser developer console (`console.log`) for development inspection.
- Appended to the in-game `<EventLog />` panel, matching how human-player actions are displayed, so the human can follow what the AI did on its turn.

### 4.2 Canvas Renderer (`src/renderer/MapRenderer.ts`)

- Draws a 20×20 grid scaled to fill the canvas area.
- Per-sector rendering:
  - Base: earthy green / landscape tint.
  - Owned by human: yellow tint overlay (`rgba(212, 168, 0, 0.25)`).
  - Owned by AI: blue tint overlay (`rgba(42, 91, 215, 0.25)`).
  - Selected sector: white outline.
  - Gold vein marker: small golden dot.
  - Tree feature: simplified green cluster.
  - Building icon: SVG sprite composited onto sector (Town Hall: house + flag).
- Territory borders: 1–2 px strokes following political boundary edges between players.
- No fog of war in MVP — full map is always visible.

### 4.3 React Component Tree

```
<App>
  ├── <GameCanvas />          ← Canvas renderer + click handler for sector selection
  ├── <LeftPanel />           ← Player list (human + AI name, color indicator)
  ├── <RightPanel>
  │   ├── <SectorInfo />      ← Selected sector coords + building type
  │   ├── <ResourceHUD />     ← AP (cur/cap +income), Gold, Army, XP, Territory %
  │   └── <ActionPanel />     ← Attack, Abandon, End Turn buttons
  └── <BottomBar>
       ├── <TurnDisplay />    ← "Turn: N"
       └── <EventLog />       ← Scrolling text log of GameEvents (all players, including AI)
```

### 4.4 Interaction Flow

1. User clicks a sector → `setSelectedSector(coord)`.
2. `ActionPanel` derives available actions from `canAttack(state, humanId, coord)` and sector ownership.
3. User clicks **Attack** / **Abandon** / **End Turn** → `transport.submitAction(action)`.
4. Transport resolves → React state updated → canvas and HUD re-render.
5. If result contains `victory` event, show a modal overlay.

### 4.5 HUD Income Preview

Resource rows show income projection: `+N per turn` derived from current state, recalculated on every state change.

---

## Phase 5 – Integration & Playable Game

1. On app load, call `loadMap(ExampleMapJson)` to produce initial `GameState`.
2. Instantiate `LocalTransport(initialState, computeAiTurn)`.
3. Mount React app with transport reference in context.
4. Verify end-to-end: human attacks, events logged, AI responds, income applied on turn end, game ends when a Town Hall is destroyed.
5. Smoke test with the `ExampleMap.json` starting positions (player1 at ~(2,3), AI at the rotationally symmetric opposite corner).

---

## Delivery Sequence

```
Phase 0  ──→  Phase 1  ──→  Phase 2  ──→  Phase 3  ──→  Phase 4  ──→  Phase 5
Bootstrap     Engine core    Tests          AI             Client         Integration
```

Phases 1 and 2 should be developed together (TDD): write tests first, then implement functions to pass them. Phases 3 and 4 can proceed partly in parallel once Phase 1 is stable.

---

## Open Ambiguities

All A1–A12 ambiguities have been resolved and incorporated into the spec above. The following new questions arose during planning iteration.

---

### [RESOLVED] B1 – Claiming a sector after building destruction

Answer: **Option B** — sector remains enemy-owned after the building is destroyed. A separate follow-up attack (2 AP, army floored at 0) is required to claim it.

### [RESOLVED] B2 – Army depletion in MVP

Answer: **Option A** — when army reaches 0, the army cost is waived and AP alone gates attacks. This prevents game deadlock. The workaround will be revisited when the XP-disparity fail mechanic is implemented.

### [RESOLVED] B3 – Player turn order

Answer: **Human always goes first** in the 1v1 MVP. `playerOrder[0]` is always the human player; this is hardcoded in the map loader, not derived from JSON insertion order.

### [RESOLVED] B4 – AI action visibility in the event log

Answer: **Both** — each AI action is logged to the browser developer console (`console.log`) and appended to the in-game `<EventLog />` panel.

---

### [RESOLVED] A1 – AP cost of a single attack

Answer: **2 AP** per attack (`ATTACK_AP_COST = 2`).

### [RESOLVED] A2 – Army cost of a single attack

Answer: **1 soldier** per attack (`ATTACK_ARMY_COST = 1`).

### [RESOLVED] A3 – Town Hall durability

Answer: **Town Hall = 3 HP**, Wooden Wall = 4 HP, Stone Wall = 6 HP, all other buildings = 2 HP.

### [RESOLVED] A4 – Auto-annexation cap

Answer: Geometric observation only — no engine-enforced cap. `autoAnnexedThisTurn` field and hard-cap check removed.

### [RESOLVED] A5 – Starting resources

Answer: `ap = 8`, `gold = 350`, `army = 20`, `xp = 0`, `apCap = 12`.

### [RESOLVED] A6 – Abandoned sector building

Answer: Building is destroyed when the sector is abandoned.

### [RESOLVED] A7 – Failed attack / passive army income

Answer: The XP-disparity attack-fail mechanic (which determines what counts as a "failed attack") is deferred post-MVP. No passive army income in MVP.

### [RESOLVED] A8 – XP precision

Answer: Store XP as a float.

### [RESOLVED] A9 – Two-neighbor condition

Answer: 1 edge-adjacent + 1 diagonal-only neighbor is sufficient to satisfy the two-neighbor condition.

### [RESOLVED] A10 – Fog of war in MVP

Answer: Full map visibility in MVP; no fog of war.

### [RESOLVED] A11 – AI move presentation

Answer: Apply AI moves instantly; log each action to the browser developer console.

### [RESOLVED] A12 – Map-edge treatment

Answer: Map boundary counts as **not owned** (Option B). Edge sectors cannot be auto-annexed from the boundary side and are never classified as internal.

