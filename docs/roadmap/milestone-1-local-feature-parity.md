# Milestone 1 – Local Feature Parity

_Goal: fully implement the spec (`milestone-0-mvp.md`) in local/offline mode so the game matches the original._

## Success Criteria

- [ ] All 6 building types (Town Hall, Mine, Barracks, Watchtower, Wooden Wall, Stone Wall) are buildable and functional.
- [ ] Full economy pipeline: gold, AP (with internal/border/Town Hall bonuses), army (passive gain from failed attacks), and XP are all calculated correctly each turn.
- [ ] AP cap and XP-gated building tiers enforced; HUD displays all five resources (AP current/cap, Gold, Army, XP, Territory %).
- [ ] Repair and Demolish actions work; last Town Hall cannot be demolished.
- [ ] Fog of war hides unvisited sectors; Watchtowers extend visibility radius; damaged Watchtowers show reduced radius.
- [ ] XP defensive bonus applied when attacker has a significant XP lead.
- [ ] Turn timer option is configurable and defaults to off for local play.
- [ ] FFA and team mode data model compiles type-safely (not yet playable).

---

## 1.1 Economy
- **Gold income** – base 2 gold/turn + mine bonuses (4–8 on normal, 16–20 on gold-vein sector).
- **Gold cap** – enforce 20,000 ceiling, display gold in HUD.
- **AP cap progression** – `12 + 1 per 8 XP`, max 200; recalculate at end of each turn.
- **AP income formula** – internal/border sector bonuses, +1 per extra Town Hall.

## 1.2 XP System
- Track XP per player and apply the full XP table from the spec (attacks, constructions, destructions, eliminations).
- XP difference defensive bonus.
- Display XP and derived AP cap in HUD.

## 1.3 Army (Soldiers)
- Soldier resource: passive gain from failed enemy attacks (+1 per 2 failed attacks).
- Army cap 200; display in HUD.

## 1.4 Buildings
- **Mines** – build on any owned sector; higher gold income on gold-vein sectors; HP 2; grant XP on destroy.
- **Barracks** – build on any owned sector; generate soldiers each turn; HP 2.
- **Watchtowers** – build on any owned sector; extend visibility radius.
- **Wooden Walls / Stone Walls** – defensive structures; cost soldiers + gold; appropriate HP values.
- Building XP progression gates (use XP threshold from spec to unlock tiers).
- Repair action for damaged buildings (AP + gold cost).

## 1.5 Fog of War
- Each player can only see sectors revealed by their territory footprint and Watchtower radii.
- Hidden sectors render as "unexplored" in the client.
- Engine exposes a `visibleSectors(state, playerId)` pure function; client masks unrevealed data before render.

## 1.6 Misc Rule Completeness
- **Abandon sector** action (already scoped in MVP – verify correctness against spec).
- Turn timer option (configurable, off by default for local play).
- FFA + team mode data model stubs (not yet playable, just type-safe).
