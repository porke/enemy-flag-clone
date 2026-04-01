# Enemy Flag – Post-MVP Roadmap

This document tracks planned features beyond the MVP (local 1v1 Human vs AI with minimal rules).
Each milestone builds on the previous one. Items within a milestone are roughly ordered by dependency.

---

## Milestone 1 – Local Feature Parity

_Goal: fully implement the spec (`rules.md`) in local/offline mode so the game matches the original._

### 1.1 Economy
- **Gold income** – base 2 gold/turn + mine bonuses (4–8 on normal, 16–20 on gold-vein sector).
- **Gold cap** – enforce 20,000 ceiling, display gold in HUD.
- **AP cap progression** – `12 + 1 per 8 XP`, max 200; recalculate at end of each turn.
- **AP income formula** – internal/border sector bonuses, +1 per extra Town Hall.

### 1.2 XP System
- Track XP per player and apply the full XP table from the spec (attacks, constructions, destructions, eliminations).
- XP difference defensive bonus.
- Display XP and derived AP cap in HUD.

### 1.3 Army (Soldiers)
- Soldier resource: passive gain from failed enemy attacks (+1 per 2 failed attacks).
- Army cap 200; display in HUD.

### 1.4 Buildings
- **Mines** – build on any owned sector; higher gold income on gold-vein sectors; HP 2; grant XP on destroy.
- **Barracks** – build on any owned sector; generate soldiers each turn; HP 2.
- **Watchtowers** – build on any owned sector; extend visibility radius.
- **Wooden Walls / Stone Walls** – defensive structures; cost soldiers + gold; appropriate HP values.
- Building XP progression gates (use XP threshold from spec to unlock tiers).
- Repair action for damaged buildings (AP + gold cost).

### 1.5 Fog of War
- Each player can only see sectors revealed by their territory footprint and Watchtower radii.
- Hidden sectors render as "unexplored" in the client.
- Engine exposes a `visibleSectors(state, playerId)` pure function; client masks unrevealed data before render.

### 1.6 Misc Rule Completeness
- **Abandon sector** action (already scoped in MVP – verify correctness against spec).
- Turn timer option (configurable, off by default for local play).
- FFA + team mode data model stubs (not yet playable, just type-safe).

---

## Milestone 2 – Improved Local AI

_Goal: an AI that plays a coherent economic strategy and never deadlocks._

### 2.1 Economic Priority
- AI evaluates gold reserves each turn; if below a configurable threshold, prioritise building Mines over expanding.
- AI prevents soldier starvation: builds Barracks when soldier count drops below attack needs.
- AP/gold budgeting: reserve a portion of AP for economy before committing to aggression.

### 2.2 Tactical Improvements
- Breadth-first territory expansion toward enemy rather than pure shortest-path.
- Basic threat detection: reinforce (build walls/watchtowers) if enemy is adjacent.
- AI never issues an attack command it cannot afford (AP + soldiers check before queuing).

### 2.3 Difficulty Levels
- `easy` / `medium` / `hard` presets adjust economic thresholds, aggression timing, and mistake rate.
- Expose difficulty choice on the new-game screen.

---

## Milestone 3 – Basic Online Mode (Human-Only)

_Goal: two browser tabs / two users on the same or different machines can play each other with no accounts required._

### 3.1 Server Package
- Add `packages/server` – Node.js + WebSocket server (e.g. `ws` or `uWebSockets.js`).
- In-memory game registry: `Map<gameId, GameState>`.
- Authoritative engine runs server-side; clients send intent messages, server validates and broadcasts state diffs.

### 3.2 Lobby
- **Create game** – host chooses map, settings (turn timer, fog of war on/off); receives a shareable game code.
- **Join game** – enter game code + a nickname / user ID (no account required); two distinct IDs required.
- **Start game** – host can start once minimum players have joined.
- Lobby screen shows connected players and ready status.

### 3.3 Transport Layer
- `packages/client` gains a `RemoteTransport` (WebSocket) alongside the existing `LocalTransport`.
- Shared `@enemy-flag/protocol` package (or `packages/protocol`) defines message types for lobby, game actions, and state sync.
- Reconnect / rejoin: a player who disconnects can re-enter with the same ID and resume from current state.

### 3.4 Deployment
- Docker-compose file: `server` container + static file host for the built client.
- Basic rate-limiting and input validation on the server (prevent malformed action payloads).

---

## Milestone 4 – Online Mode with Mixed Human / AI

_Goal: lobbies can include AI-controlled slots alongside human players._

- Host can set any slot to "AI" with a chosen difficulty when creating a game.
- `packages/ai` runs server-side; AI turns are executed automatically by the server after each human turn.
- AI thinking is non-blocking (runs in a worker or with a yield point) so it does not stall the event loop.
- Client renders AI turns with a short "thinking" animation before applying the state diff.

---

## Out of Scope (for now)

- Mobile / native client
- Ranked matchmaking / ELO
- In-game chat
- Map editor
- Tournament brackets
