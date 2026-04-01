# Enemy Flag – Experimental Mechanics Brainstorming

Ideas explored here are not committed to the roadmap. The goal is to stress-test the design space and identify which experiments are worth prototyping.

---

## Hex Grid

Switching to a hex grid is a **major engine expansion** — every layer of the stack (coordinate system, pathfinding, map serialisation, rendering, hit-detection) would need to be replaced or forked. It should be treated as a parallel edition rather than an in-place upgrade of the square-grid game.

### Mechanical Impact

Every sector has 6 neighbours instead of 4, so territory expands roughly 50% faster per attack action and linear walls (a single row of fortified sectors) no longer seal a front. Flanking becomes the dominant tactical threat, pushing skill expression toward multi-front coordination rather than corridor control. Fog-of-war and Watchtower radii need rebalancing because hex rings cover more area per tier (ring 1: 6 sectors, ring 2: 18, ring 3: 36 — vs. 4, 12, 20 on a square grid), so the same Watchtower count covers substantially more territory. The internal/border sector AP income formula also needs re-tuning: converting border sectors to internal ones happens more readily on hex topology, which would accelerate late-game AP snowballing. River crossing tiles become more nuanced — with 6 directions of approach, a single crossing tile can only truly block one axis, so pairs of crossings may be needed for the same chokepoint effect. The army cost per attack could remain identical, but gold and AP costs for buildings on hex may want slight upward adjustment to preserve the same economic pacing.

### Visual & UX Impact

The canvas renderer, tile sprite assets, and grid-layout logic all need to be rewritten for pointy-top or flat-top hex orientation. Click and touch hit-detection must switch from simple `Math.floor(x / tileSize)` to cube-coordinate or axial-coordinate lookups. Map serialisation in `ExampleMap.json` and any future map files would need a new coordinate schema (axial `{q, r}` is the standard choice). The HUD minimap, fog-of-war mask, and any line-drawing for Watchtower radii must all be hex-aware. Offset rendering for odd/even rows adds a persistent source of off-by-one bugs that requires disciplined coordinate abstraction from the start — a dedicated `hexUtils` module isolating all coordinate math is strongly recommended before any rendering work begins.

---

## Building Age & Diminishing Returns

Two variants are explored below. Both share the core goal of punishing inefficient gold spending by making mines a renewable but not permanent resource, which forces continued expansion and investment rather than passive turtling.

### Variant A – Gradual Decay with Deferred Regeneration

A mine's output decreases by a fixed amount (e.g. −2 gold/turn) every 10 turns, bottoming out at a minimum (e.g. 2 gold/turn). When the mine is destroyed — by the enemy or deliberately demolished — the underlying sector begins a natural regeneration countdown (e.g. 4–6 turns). Once regeneration completes, a new mine built on that sector starts at full yield again. This is specifically intended to punish holding onto exhausted mines: a player who leaves degraded mines standing wastes both the sector slot and the rebuild window, so demolishing at the right moment is a real skill decision. The deferred regeneration window creates a brief vulnerability — an unprotected sector sitting in cooldown is an inviting target — linking the economic mechanic directly to territorial pressure. A colour-coded age bar per mine (green → yellow → red) is essential UX; without it the decay is invisible and the intended decision-making never surfaces.

### Variant B – Immediate Regeneration on Rebuild

In this simpler variant, decay still occurs on the same schedule, but destroying and immediately rebuilding a mine resets it to full yield with zero cooldown. This lowers the skill floor (no timing mini-game around the cooldown window) while still punishing players who ignore aging mines. The trade-off is that a wealthy player can trivially cycle mines — demolish, rebuild next action — spending only the construction gold cost, which could trivialise the mechanic late-game when gold is abundant. To counteract this, the rebuild cost could scale with how many times the same sector has been rebuilt (e.g. +25% gold per prior rebuild on that tile), capping free cycling. Gold-vein sectors are a compelling special case for both variants: veins could decay more slowly or offer a larger output floor, keeping them contested objectives throughout the game.

---

## Additional Skill-Expression Mechanics

### 1. Action Sequencing & Combo Chains

AP is currently a flat integer budget with no ordering incentive. Two sequencing ideas are explored below.

#### Progressive Percentage Discount

Rather than a flat −1 AP discount, each consecutive action of the same type yields a small cumulative percentage reduction — e.g. the 2nd attack in a row costs 2% less, the 3rd costs 4% less, capping at perhaps 15–20% after ~8 consecutive same-type actions. Because the discount compounds as a percentage, AP would need to become a float internally (e.g. `number` rather than `integer`), which is a minor engine change with no player-visible complexity — the HUD can still display rounded values. The percentage framing avoids discrete "cliffs" (where a flat −1 discount suddenly makes an action free) and scales naturally with the varying AP costs of different building types. Resetting the chain by switching action types or ending the turn means players must weigh whether the discount is worth telegraphing their strategy for the remainder of the turn.

#### Economy / Military Mode

A player can declare a mode at any point during their turn: **Economy Mode** (favours building mines, Town Halls, Watchtowers, and expanding into neutral territory) or **Military Mode** (favours attacks and building Barracks/Walls). While in a mode, all matching actions receive a flat % AP cost reduction (e.g. −10%); mismatched actions optionally receive a small penalty (e.g. +5%). Switching modes mid-turn costs a fixed AP fee (e.g. 2 AP), making it a deliberate commitment rather than a free toggle. The mode is visible to both players, which adds a light information layer — spotting that an opponent just switched to Military Mode is an early warning of an incoming push. New games start in a neutral mode (no bonus, no penalty) and the mechanic can be introduced as an optional rule to keep the base experience simple.

### 2. Terrain Features & Leverage Tiles

Adding a small number of special terrain types per map creates explicit tactical objectives separate from economic ones. Skilled players identify and contest these early; less experienced players may ignore them. Three specific tile types are explored below.

#### Fortress Tile

A sector tagged as a fortress grants +1 max HP to all 4 (or 6, on hex) immediately adjacent sectors as long as it remains under the same owner's control. This effectively creates a mini-stronghold cluster without requiring each sector to have its own building, making fortresses disproportionately valuable as chokepoints near the front line. The bonus is passive and positional — it rewards _where_ you expand, not just _that_ you expand — and creates a clear target for attackers: neutralise the fortress first to soften the ring before pushing through. Balance concern: fortress tiles near a starting position could make early defence trivially easy; map generation should place them at roughly equal distances from each player.

#### Hill Tile

A hill provides permanent, indestructible Watchtower-equivalent vision at a shorter radius than a built Watchtower (e.g. 1-tile radius vs. 2-tile for a regular Watchtower). Because it cannot be demolished, controlling a hill guarantees persistent scouting of the surrounding area regardless of whether the owner has the gold or XP to build real Watchtowers. Hills are most impactful in the early game when vision is scarce; their relative value decreases as both players build out Watchtower networks. Contested hills in central map positions create natural early skirmishes before either player has a strong economy — a useful "opening hook" for the mid-game narrative.

#### River Crossing Tile

Sectors positioned at natural chokepoints (map edges, narrow corridors) can be tagged as river crossings; attacking into a crossing costs double the normal AP. Crucially, the cost applies to the attacker only — the defender captures the tile normally if they later counter-push. This asymmetry makes crossings powerful defensive terrain without making them impassable, so an opponent with a large AP surplus can still force through. River crossings are a direct counter to early rush strategies: a player who scoutes them can build an economy behind a crossing and only need to defend a narrow front. The main balance risk is creating impassable maps if crossings are clustered; generation rules should cap their density and ensure at least one unblocked route exists between starting positions.

### 3. Covert Actions

A dedicated covert action category produces no territory change and uses a separate high-AP budget, making them high-commitment decisions rather than filler actions. Two specific covert actions are explored below.

#### Set Trap

The player places an invisible trap on one of their own sectors. When an enemy attacks that sector, the trap triggers and inflicts drastically amplified casualties — 5× to 10× the normal army cost to the attacker and triple the AP cost is charged retroactively (or more precisely, the attack action is allowed to resolve but the attacker's next-turn AP is reduced as a penalty). The trap is consumed on trigger and is invisible to the opponent; no indication should appear in the UI until it fires. Traps are only placeable on own territory and grant no defensive HP bonus — they reward reading enemy attack routes rather than static fortification. The primary balance concern is trap spam on key chokepoints making certain routes permanently deterring; a cap of 1–2 active traps per player (or per region) would prevent that.

#### Sabotage Building

The player targets a visible enemy building (within scouted range — no direct territory adjacency required) and disables it for N turns (baseline: 5 turns, subject to tuning). During the disabled window: a mine produces zero gold, a Town Hall contributes zero AP income, a Watchtower provides no vision, and a Barracks generates no soldiers. The action has a high AP cost and requires that the sector be visible — which means investing in Watchtowers or controlling adjacent territory is a prerequisite. This gives trailing players a meaningful tempo tool beyond frontal assault: disabling a key mine for 5 turns can close an economic gap without requiring a successful attack on a defended sector. Counter-play for the defender is to build redundancy (multiple mines, overlapping Watchtower coverage) so no single sabotage is crippling.

---

## Isometric High-Fidelity Rendering Engine

This is a **speculative visual edition** of the game — the game logic, rules, and map data model remain identical. The entire engine and AI layer are untouched; only the `packages/client` rendering layer is replaced. Think Stronghold (2001) or Age of Empires II in visual register: an isometric projection with hand-crafted environmental detail, all still contained on a single screen to preserve the one-glance strategic readability that defines the game's UX.

> **Scope caveat:** this is a complete rewrite of the renderer. It is not an incremental upgrade to the Canvas 2D tile renderer — it is a parallel visual edition, most likely built on WebGL or WebGPU via a thin abstraction (e.g. Three.js for scene graph / camera management, or a custom WebGPU pipeline for full control). The game engine, AI, and transport layers require zero changes.

### Isometric Projection & Screen Layout

The 20×20 grid is rendered in a classic 2:1 isometric projection (tile width = 2 × tile height). At 1080p, a tile footprint of ~128×64 px keeps the full map visible without scrolling — the entire 20×20 grid fits in roughly 1400×800 px of screen space, leaving room for the side panels in the remaining horizontal extent. Camera is fixed (no rotation); pan and zoom are supported as secondary navigation but the default view shows the whole map. Diamond orientation (grid rotated 45°) is preferred over staggered rows for cleaner territory border tracing.

UX consistency rule: **the map must never require scrolling to see in full at the default zoom level.** All strategic information should be readable at a glance, exactly as in the top-down version. Zooming in is a luxury for detail, not a necessity for play.

### Lighting

#### Ambient & Directional Light

A single directional light (sun) casts soft shadows across terrain and buildings. Ambient light fills shadowed faces so detail is never lost. The sun angle shifts slowly across the game session — or can be tied to turn number — producing a **time-of-day visual effect**: dawn (low warm angle, long shadows) at the start of a game, midday (high cool light, short shadows) in the mid-game, and a late-afternoon golden tone by the endgame. This is purely cosmetic and has zero mechanical impact, but gives each game session a distinct visual rhythm.

#### Territory Ownership Glow

Owned territory emits a faint pulsing ground glow in the player's colour (yellow / blue), applied as a post-process screen-space effect over the terrain layer. The glow intensity scales with proximity to the front line — deep interior tiles glow softly, border tiles glow more vividly — visually reinforcing the internal/border sector distinction that drives AP income.

### Particle & Glow Effects

| Trigger | Effect |
|---|---|
| Attack action | Spark burst + brief red flash on target tile; projectile arc particle from source |
| Sector captured | Ownership glow swells and pulses, then settles to new player colour |
| Building constructed | Dust cloud + scaffolding shimmer during construction animation |
| Building destroyed | Debris explosion, smoke column, rubble pieces that persist on the tile |
| Mine active | Slow rising dust particles from shaft entrance each turn |
| Watchtower active | Subtle rotating light beam / beacon at the tower top |
| Trap triggered | Sharp spark burst, ground crack decal, brief red screen vignette |
| End of turn income | Gentle golden coin particle rain on Mine tiles; AP lightning arc on Town Hall |

Particles are implemented as a dedicated Canvas 2D overlay (or WebGL instanced quads) above the isometric scene to keep them decoupled from the 3D geometry pass.

### Construction & Destruction Animations

Buildings do not appear or vanish instantly. Construction plays a 2–4 turn staged animation (foundation → walls → roof → complete) driven by a `constructionProgress` field on the `Building` type (0.0–1.0, advanced each turn end). Destruction plays a single-turn collapse animation (roof falls inward, walls crumble) followed by a persistent rubble sprite on the tile. Rubble is a visual-only state — it does not affect gameplay — and clears automatically when a new building is constructed on the same sector.

All animations are driven by elapsed wall-clock time interpolated between game turns so they never block input or affect game state.

### Natural Terrain Features

Unlike the current sprite-on-tile approach, terrain features are **embedded geometry** rendered as part of the isometric scene rather than 2D icons placed on tiles.

- **Trees:** procedurally placed clusters of 2–5 low-poly conifers or deciduous trees per tile, seeded from the sector's `feature: "tree"` flag. Tree density and species vary by map region. Trees sway gently via a vertex shader wind animation.
- **Water:** river and lake tiles use a scrolling normal-mapped water shader (WebGL) with specular highlights from the directional light. Water tiles are impassable (mechanical water/mountain designation is a separate boolean flag — visual water does not automatically imply impassability).
- **Mountains / rocks:** rocky outcrops generated from a small set of modular rock meshes, placed procedurally per tile. High-elevation tiles on a heightmap automatically receive rock caps above a threshold.
- **Grass & ground texture:** base terrain uses a tiling albedo texture blended by a noise mask to avoid visible repetition. Owned territory transitions blend the ground texture toward a subtle coloured dirt/stone look in the player's palette.

### Heightmap-Based Maps

The map data model gains an optional `elevation` field per sector (integer 0–8, default 0 = flat). The renderer interprets elevation as vertical offset in the isometric projection, creating rolling hills and valleys. Rules for mechanical impact:

- Elevation differences are **purely visual by default** — they have no effect on attack cost, visibility, or any other mechanic unless the sector also carries an explicit `terrain: "mountain" | "water"` flag.
- A `mountain` flag on a sector makes it impassable (cannot be attacked, owned, or built on). It is rendered as a high-elevation rocky peak.
- A `water` flag makes a sector impassable in the same way, rendered at elevation 0 with the water shader.
- Map generation can optionally use a smoothed Perlin/simplex noise heightmap as its elevation source, producing organic-looking terrain rather than procedurally flat maps.
- The `ExampleMap.json` schema gains an optional `elevation` array; maps without it default to fully flat, preserving full backward compatibility.

### Implementation Stack

| Concern | Approach |
|---|---|
| Scene graph & camera | Three.js (WebGL) or raw WebGPU |
| Isometric tile geometry | Instanced `PlaneGeometry` rotated to iso angle, one draw call per terrain layer |
| Building models | glTF 2.0 assets, loaded via `GLTFLoader`; swapped per `BuildingType` |
| Lighting | Three.js `DirectionalLight` + `AmbientLight`; shadow map on terrain only |
| Particles | Custom `InstancedMesh` or `Points` system; decoupled from scene graph update loop |
| Water shader | GLSL scrolling normal-map + Fresnel reflectance, applied to water-flagged tiles |
| Post-processing | `EffectComposer` with bloom pass for glow effects |
| Hit detection | Raycaster against a flat invisible hit-mesh grid (iso-projected tile positions); bypasses complex 3D geometry intersection |
| HUD & panels | Unchanged React/HTML layer composited over the WebGL canvas |

### Risks & Constraints

- **Performance:** a 20×20 grid with instanced buildings, particles, and a bloom pass should comfortably hit 60 fps on a mid-range GPU. The hard constraint is that the renderer must degrade gracefully on integrated graphics — a low-quality mode (flat colours, no particles, no shadows) should always be available.
- **Asset pipeline:** low-poly glTF building models and terrain textures need to be produced or sourced under a permissive licence. This is the single largest non-code effort.
- **Territory border rendering:** in the top-down version, political borders are thin coloured strokes on the canvas. In isometric view this becomes a decal or projected texture pass along the border edges of tiles — more complex but achievable with a stencil-buffer approach.
- **Accessibility:** the time-of-day lighting shift must never reduce contrast on territory ownership colours below WCAG AA levels. The ownership glow must remain distinguishable in both the dawn and midday lighting conditions.

---

## Notes

- Hex grid and building age are self-contained enough to prototype independently on a fork without touching the core rule surface.
- Building age Variant A (deferred regeneration) adds more tactical depth; Variant B (immediate rebuild) is a safer first implementation to validate the decay concept before adding the cooldown.
- AP as float (required by progressive discount) is a low-risk engine change — no rule surface changes, only the resolution type.
- Mode mechanic and progressive discount are complementary and could ship together; mode provides the strategic frame, discount provides the micro reward.
- Terrain tiles (fortress, hill, river crossing) require map-generation rules and new sector metadata fields, but no new action types — relatively low implementation cost post-M1.
- Covert actions (traps, sabotage) require new action types, visibility checks, and status-effect tracking on `GameState`; best scoped after M1 feature parity is stable.
- Isometric rendering is a full client-layer replacement with zero impact on engine/AI; it can be prototyped as a separate `packages/client-iso` package reusing all existing engine and AI packages unchanged.
