# Enemy Flag – System Architecture

## Core Principle: Shared Game Engine + Swappable Transport

All game rules live in a **pure, framework-agnostic game engine** (a plain TypeScript module with no I/O). This module is the single source of truth and can run in a browser, a Node.js server, or a Web Worker unchanged.

```
┌─────────────────────────────────────────────────┐
│               Game Engine (pure TS)             │
│  - Map state, sector ownership                  │
│  - Resource income calculations                 │
│  - Attack / annexation rules                    │
│  - Win condition checks                         │
│  - Action validation                            │
└─────────────────────────────────────────────────┘
         ↑ used by both modes below
```

---

## Mode A – Local vs AI (no server)

```
Browser
├── UI (React / Canvas)
├── Game Engine  ← runs in-browser (or Web Worker)
└── AI Module    ← implements the same Action interface as a human
```

The AI is a pure function `(gameState) => Action`. No network is involved. Turn resolution happens synchronously (or in a Web Worker to keep the UI responsive).

---

## Mode B – Remote Multiplayer

```
Browser (Client)                    Server (Node.js)
├── UI                              ├── Lobby & matchmaking
├── Client-side state mirror        ├── Game Engine (same package)
└── Transport layer ──WebSocket──→  ├── Session manager (N concurrent games)
                                    └── Auth / persistence (DB)
```

- The server owns authoritative game state and runs the engine.
- The client sends **action messages** (e.g. `{ type: "attack", sector: [3, 7] }`); the server validates them and broadcasts a state delta to all players in that session.
- WebSockets provide real-time turn notifications. A REST + SSE fallback is viable for simpler deployments.

---

## Transport Abstraction

The UI never calls the game engine directly — it always goes through a `GameTransport` interface. Swapping local for remote requires changing only the transport implementation at startup; all UI code is identical.

```ts
interface GameTransport {
  submitAction(action: Action): Promise<GameState>;
  onStateUpdate(callback: (state: GameState) => void): void;
}

class LocalTransport implements GameTransport {
  // Runs the engine in-browser; resolves AI moves locally
}

class RemoteTransport implements GameTransport {
  // Sends actions over WebSocket; receives server state deltas
}
```

---

## Technology Choices

| Concern | Choice | Rationale |
|---|---|---|
| Game engine | TypeScript (plain module, no deps) | Isomorphic — same code in browser and Node |
| UI rendering | Canvas 2D or PixiJS | Grid map benefits from canvas over DOM |
| Local AI | Web Worker | Keeps UI thread responsive during AI computation |
| Remote transport | WebSockets (`ws` / Socket.IO) | Low latency for turn delivery |
| Server runtime | Node.js + Fastify | Reuses the TS engine directly, minimal overhead |
| State persistence | SQLite (dev) / PostgreSQL (prod) | One row per game session |
| Authentication | JWT + bcrypt | Stateless tokens, straightforward to implement |

---

## Project Structure

A monorepo (npm workspaces or pnpm) lets `client` and `server` import `engine` without code duplication.

```
/
├── packages/
│   ├── engine/        ← pure game logic, zero runtime dependencies
│   ├── ai/            ← AI strategies; depends only on engine
│   ├── client/        ← browser app (Vite + React/Canvas)
│   └── server/        ← Node.js server; depends on engine
├── package.json       ← workspace root
└── tsconfig.base.json
```

---

## Development Sequence

1. **Build `engine`** — implement and unit-test all game rules in isolation.
2. **Build `client` + `LocalTransport` + `ai`** — playable single-player game in the browser with no server dependency.
3. **Build `server` + `RemoteTransport`** — add multiplayer by wiring the same engine to WebSocket sessions.

Starting with Mode A forces a clean engine design; Mode B then requires no rewrite, only a new transport and a server shell around the existing logic.
