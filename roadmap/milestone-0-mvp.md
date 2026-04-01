# Milestone 0 – MVP

_Goal: local 1v1 Human vs AI with the core game rules implemented. Full rule details are specified below._

## Success Criteria

- [ ] A new game can be started and plays to completion (victory screen shown).
- [ ] Turn structure: active player spends AP on actions; income is applied at turn end; turn passes to the next player.
- [ ] Attack action is functional and all attackability rules (edge-adjacency, two-neighbor, Town Hall exception) are enforced.
- [ ] Auto-annexation triggers after every attack and claims all newly surrounded sectors.
- [ ] Abandon sector action correctly returns a sector to neutral.
- [ ] Victory condition detected immediately when a player's last Town Hall is destroyed.
- [ ] Minimal AI produces a valid move each turn and never deadlocks or crashes.
- [ ] Engine unit test suite passes with 100% of tests green.

---

# Enemy Flag – Browser Reimplementation Requirements

**Enemy Flag** is a multiplayer turn-based strategy game. Players expand their territory on a shared map, build structures to generate resources, and eliminate opponents by destroying all of their Town Halls.

---

## 1. Game Objective

- A player (or team) wins by **destroying all enemy Town Halls** while keeping at least one of their own alive.
- A player is **eliminated** when their last Town Hall is destroyed.
- The game ends immediately once all Town Halls of one side (or all enemies in FFA) are gone.
- Supports **Free-For-All (FFA)** and **team** modes.

---

## 2. Map

- The map is a **20 × 20 grid of sectors** (400 sectors total).
- Each sector is either: **neutral**, owned by a player, or contains a **gold deposit** (marked visually – these boost mine efficiency when built on top of them).
- Players start with a small territory containing one Town Hall.

---

## 3. Resources

All resource values are displayed in the HUD (top-right).

### 3.1 Action Points (AP)
- Budget of actions available per turn. Every player action costs AP.
- **Cap:** `12 + 1 per 8 XP`, maximum **200 AP**. Excess AP generated beyond the cap is lost.
- **Per-turn income:**
  - Base: **8 AP**
  - +1 AP per **50 internal sectors** (sectors surrounded on all 4 sides by own territory)
  - +1 AP per **100 external (border) sectors**
  - +1 AP per **additional Town Hall** beyond the first

### 3.2 Gold
- Primary construction resource, consumed when building structures.
- **Per-turn income:**
  - Base: **2 gold**
  - +4–8 gold per **mine not on a gold deposit**
  - +16–20 gold per **mine built on a gold deposit**
- **Cap:** 20,000 gold.

### 3.3 Army
- Consumed when attacking sectors and building military structures (walls).
- **Gained passively:** +1 soldier per **2 failed enemy attacks** on your territory.
- **Gained by building Barracks** (see §5.3).
- **Cap:** 200 soldiers.

### 3.4 Experience (XP)
- Earned by performing actions. Determines the AP cap and unlocks higher-tier buildings.
- A significant XP lead over an opponent also provides a defensive bonus.
- **XP earned per action** (values apply to enemy targets; neutral targets give 25% of listed XP):

| Action | XP |
|---|---|
| Attack a sector | 1 |
| Take over a sector (auto-annex) | 1.5 |
| Construct a building | 0.5 |
| Destroy enemy Town Hall | 15 |
| Destroy enemy Barracks | 10 |
| Destroy enemy Mine | 10 |
| Destroy enemy Watchtower | 5 |
| Destroy enemy Wooden Wall | 8 |
| Destroy enemy Stone Wall | 15 |
| Eliminate a player | 20 |

### 3.5 Territory (informational)
- Displays the percentage of the map (400 sectors) controlled by the player.
- Affects AP income (see §3.1).

---

## 4. Turn Structure

- Play is **turn-based**; players take turns sequentially.
- A player spends AP on actions during their turn.
- A player can **end their turn early** before the turn timer expires to let the next player move.
- At the end of a turn, all per-turn resource income is applied.

---

## 5. Buildings

Buildings are constructed on sectors within the player's territory. Constructing any building costs a flat **6 AP** (plus any gold cost specific to the building type). XP requirements may gate higher-tier buildings.

| Building | Gold cost | Army cost | Min XP required |
|---|---|---|---|
| Town Hall | | | |
| Mine | | | |
| Barracks | | | |
| Watchtower | | | |
| Wooden Wall | | | |
| Stone Wall | | | |

### 5.1 Town Hall
- **Most important building.** Losing all Town Halls eliminates the player.
- Each additional Town Hall provides **+1 AP per turn**.
- Attacks on enemy territory **can be launched from a single-sector territory** only if that sector contains a Town Hall (special rule, see §6.2).
- Cannot be self-demolished if it is the player's **last** Town Hall.

### 5.2 Mine
- Generates gold each turn.
- **+4–8 gold/turn** normally; **+16–20 gold/turn** when built on a gold deposit tile.
- Multiple mines stack their income.

### 5.3 Barracks
- One-time purchase: adds soldiers to the army immediately upon construction.
- **Base output:** 20 soldiers.
- **Scaling:** +2 soldiers per barracks already owned; +1 soldier per damaged barracks already owned.
- Keeping barracks intact reduces the cost of future army production.

### 5.4 Watchtower
- Extends **visibility** beyond the player's own border, enabling scouting of enemy territory.
- Helps detect enemies and approach undetected.
- A **damaged** watchtower provides reduced visibility.

### 5.5 Wooden Wall
- Defensive structure placed on a sector.
- Requires **multiple attacks** to destroy; the enemy cannot take the sector until the wall is gone.

### 5.6 Stone Wall
- Same as Wooden Wall but with **higher durability** (more attacks required to destroy).

---

## 6. Territory Conquest

### 6.1 Attacking a Sector
- Select a target sector and issue the **Attack** command (right-click shortcut supported).
- Attacking costs AP and army.
- If the target contains a **building**, the building must be destroyed first before the sector can be claimed.

### 6.2 Attackability Rules (empty sectors)
An empty enemy or neutral sector can only be attacked if **both** conditions are met:
1. It is adjacent (by full edge, not diagonal) to **at least one** of the attacker's sectors.
2. It borders **at least two** of the attacker's sectors in total (edge or corner).

**Exception:** When the attack originates from a sector containing the player's **Town Hall**, condition 2 is waived — only a single edge-adjacency to the Town Hall sector is required. This prevents a player reduced to one Town Hall sector from being unable to act.

### 6.3 Auto-annexation (Territory Takeover)
- Any sector that becomes **surrounded on all 4 cardinal sides** by the player's own sectors is **automatically annexed**, without spending an attack action, provided it contains **no building**.
- Up to **3 sectors can be auto-annexed in a single turn** through careful attack sequencing.
- This is the primary high-efficiency expansion mechanic.

---

## 7. State Management Actions

The following non-combat actions are available each turn (all cost AP):

| Action | Description |
|---|---|
| **Repair** | Restore a damaged building on own territory. Fully destroyed buildings may be cheaper to demolish and rebuild. |
| **Demolish** | Destroy any own building except the player's last Town Hall. |
| **Transfer Gold** | Send **50 gold** to a teammate (team mode only). Target selected by clicking any sector of their territory. |
| **Abandon Sector** | Voluntarily release a sector back to neutral. Useful to open a corridor for an ally. Also used as an informal (non-enforced) peace signal in FFA. |
| **End Turn** | Voluntarily end the current turn before the timer expires. |

---

## 8. Technical Specification (reference)

| Parameter | Value |
|---|---|
| Max players per game | 16 |
| Map size | 20 × 20 sectors |
| Action points cap | 12 + (1 per 8 XP), max 200 |
| Army cap | 200 |
| Gold cap | 20,000 |

---

## 9. Browser Reimplementation Notes

- The original game is a **desktop client-server** application. The browser version should replace the desktop client with a web UI and the server protocol with WebSockets or HTTP polling.
- The map rendering should clearly differentiate: player territory colors, neutral sectors, enemy sectors, gold deposit tiles, and building icons.
- The HUD must show real-time values for AP (current / cap, +income), Gold (current, +income), Army, XP, and territory %.
- Turn timer should be visible and the early-end-turn action should be prominent.
- Team mode requires a lobby with team assignment before the game starts.
- Visibility/fog-of-war should be implemented: by default players see their own territory and a small border halo. Watchtowers extend this radius.
