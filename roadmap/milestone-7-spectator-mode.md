# Milestone 7 – Spectator Mode

_Goal: observers can watch a live game without participating._

## Success Criteria

- [ ] A spectator joining via a shareable link receives live state updates in real time.
- [ ] Spectator actions have no effect on game state (read-only enforcement verified server-side).
- [ ] Current spectator count is visible to the playing participants.

---

- Server streams state updates to spectator WebSocket connections (read-only channel).
- Spectators see the full board (no fog of war) or optionally follow a specific player's perspective.
- Spectator count displayed to players; spectators cannot interact with the game state.
- Spectator links shareable from the lobby screen.
