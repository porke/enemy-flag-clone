# Milestone 4 – Online Mode with Mixed Human / AI

_Goal: lobbies can include AI-controlled slots alongside human players._

## Success Criteria

- [ ] Host can mark any lobby slot as AI and choose a difficulty before starting.
- [ ] AI turns execute server-side without blocking the event loop (verified by UI remaining responsive during AI computation).
- [ ] Client displays a "thinking" animation for the AI's turn before the state diff is applied.
- [ ] A mixed human + AI game plays to completion without errors or desync.

---

- Host can set any slot to "AI" with a chosen difficulty when creating a game.
- `packages/ai` runs server-side; AI turns are executed automatically by the server after each human turn.
- AI thinking is non-blocking (runs in a worker or with a yield point) so it does not stall the event loop.
- Client renders AI turns with a short "thinking" animation before applying the state diff.
