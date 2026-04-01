# Milestone 6 – Replays

_Goal: any completed game can be replayed move-by-move in the client._

## Success Criteria

- [ ] Every completed game has a shareable URL that opens the replay viewer without an account.
- [ ] Replay viewer can step forward and backward through every turn and reaches the correct final state.
- [ ] State reconstructed by `replayGame(log)` is byte-identical to the original live game state at each turn.

---

- Server records the full action log (ordered list of `(playerId, action, timestamp)`) alongside each game.
- `packages/engine` exposes `replayGame(log)` that re-executes actions to reconstruct state at any turn.
- Replay viewer UI: timeline scrubber, step-forward / step-back, playback speed control.
- Replays are shareable via URL (game ID in the path; no account required to view).
