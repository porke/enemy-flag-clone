# Milestone 5 – User Accounts & Persistent Stats

_Goal: optional login so players can track their history across sessions._

## Success Criteria

- [ ] Players can register, log in, and log out; passwords are hashed with bcrypt.
- [ ] Guest play continues to work without an account.
- [ ] Player profile page shows win/loss record and games played.
- [ ] Logged-in players can see and re-join their active games.

---

## 5.1 Auth
- Username + password registration / login (bcrypt hashing, JWT sessions).
- Persistent `userId` attached to lobby slots; guest play (no account) remains supported.

## 5.2 Game History
- Server persists finished games (outcome, players, duration, final turn count) to a database (e.g. SQLite → Postgres).
- Player profile page: win/loss record, games played, favourite map.

## 5.3 In-Progress Games
- Logged-in users can see their active games and jump back in.
- Turn notifications (in-app; no email required for this milestone).
