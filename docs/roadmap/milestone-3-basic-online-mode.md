# Milestone 3 – Basic Online Mode (Human-Only)

_Goal: two browser tabs / two users on the same or different machines can play each other with no accounts required._

## Success Criteria

- [ ] Two players on separate machines can start and complete a full game via WebSocket.
- [ ] A game code is generated on create and allows a second player to join without an account.
- [ ] A disconnected player can rejoin with the same ID and resume from the current state.
- [ ] Server rejects malformed or invalid action payloads with a clear error; game state remains uncorrupted.
- [ ] `docker-compose up` brings up server and client with no manual steps beyond providing configuration.

---

## 3.1 Server Package
- Add `packages/server` – Node.js + WebSocket server (e.g. `ws` or `uWebSockets.js`).
- In-memory game registry: `Map<gameId, GameState>`.
- Authoritative engine runs server-side; clients send intent messages, server validates and broadcasts state diffs.

## 3.2 Lobby
- **Create game** – host chooses map, settings (turn timer, fog of war on/off); receives a shareable game code.
- **Join game** – enter game code + a nickname / user ID (no account required); two distinct IDs required.
- **Start game** – host can start once minimum players have joined.
- Lobby screen shows connected players and ready status.

## 3.3 Transport Layer
- `packages/client` gains a `RemoteTransport` (WebSocket) alongside the existing `LocalTransport`.
- Shared `@enemy-flag/protocol` package (or `packages/protocol`) defines message types for lobby, game actions, and state sync.
- Reconnect / rejoin: a player who disconnects can re-enter with the same ID and resume from current state.

## 3.4 Deployment
- Docker-compose file: `server` container + static file host for the built client.
- Basic rate-limiting and input validation on the server (prevent malformed action payloads).
