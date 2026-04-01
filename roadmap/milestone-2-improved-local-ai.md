# Milestone 2 – Improved Local AI

_Goal: an AI that plays a coherent economic strategy and never deadlocks._

## Success Criteria

- [ ] AI maintains a positive gold balance across a full game at all three difficulty levels.
- [ ] AI builds Barracks before its soldier count reaches 0.
- [ ] AI expands toward the enemy rather than random or away directions.
- [ ] AI never issues an action it cannot afford (AP and army checked before queuing).
- [ ] All three difficulty presets (`easy` / `medium` / `hard`) are selectable on the new-game screen.
- [ ] No deadlock or infinite loop observed across 20 consecutive AI vs AI test games.

---

## 2.1 Economic Priority
- AI evaluates gold reserves each turn; if below a configurable threshold, prioritise building Mines over expanding.
- AI prevents soldier starvation: builds Barracks when soldier count drops below attack needs.
- AP/gold budgeting: reserve a portion of AP for economy before committing to aggression.

## 2.2 Tactical Improvements
- Breadth-first territory expansion toward enemy rather than pure shortest-path.
- Basic threat detection: reinforce (build walls/watchtowers) if enemy is adjacent.
- AI never issues an attack command it cannot afford (AP + soldiers check before queuing).

## 2.3 Difficulty Levels
- `easy` / `medium` / `hard` presets adjust economic thresholds, aggression timing, and mistake rate.
- Expose difficulty choice on the new-game screen.
