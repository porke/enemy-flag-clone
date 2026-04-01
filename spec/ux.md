# Enemy Flag – UX / Visual Design Reference

Source: screenshot from original desktop game v1.9.2.

---

## Visual Modernisation Context

The original game was released in 2005 and designed for **800×600 (4:3)** displays — a resolution that is, by current standards, antiquity. Tiles were ~24×24 px, UI chrome consumed a large fraction of the viewport, and the painted map background was the primary source of visual richness. The browser reimplementation targets **1920×1080 (16:9)** as its baseline, which provides roughly 4× more pixel area and a fundamentally different aspect ratio.

The guiding principle is: **preserve the style, not the constraints.** The stone-frame aesthetic, yellow/blue territorial colour vocabulary, painted landscape background, and pixel-art-inspired building sprites should all survive the transition. What changes is scale and clarity:

- Tiles can be made substantially larger (48–64 px is a reasonable starting point) so sector contents, ownership tints, and building sprites read clearly without zooming in.
- The wider 16:9 canvas allows the left and right side panels to be more generous without compressing the map area — the original had to cram everything into a narrow strip at 800 px wide.
- The extra vertical space freed by dropping the heavy stone border frame can be given back to the map view or used to surface more game information that was previously hidden in sub-menus.
- The painted map background can be a larger, higher-resolution artwork — or a procedurally tinted tile approach — to match the sharper display.

The goal is a game that a player of the 2005 original would immediately recognise but that does not feel dated next to a modern browser application.

---

## Overall Layout

The window (~800×600 px) is divided into four zones:

```
┌──────────────────────────────────────────────────────────────┐
│  [Left Panel]        [Map Area]           [Right Panel]      │
│  Players list        20×20 grid           Resources + HUD    │
│                                           Action buttons     │
│                                           Build buttons      │
│                                           Manage buttons     │
├──────[ Turn bar ]────────[ Map name ]────────────────────────┤
│  [Log / Event console – scrolling text]                      │
└──────────────────────────────────────────────────────────────┘
```

A heavy stone/granite-textured **border frame** wraps the entire window with circular decorative corner ornaments. The same frame style is reused on every sub-panel and button. This is the primary source of visual weight the browser version should lighten.

---

## Color Palette

| Role | Color |
|---|---|
| Own territory border | Yellow / gold (`#d4a800` approx.) |
| Enemy territory border | Blue (`#2a5bd7` approx.) |
| Panel / chrome background | Stone gray (`#8a8a7a` – `#b0afa0`) |
| Map background | Natural landscape painting (earthy greens, ochre, sky) |
| Button face | Light gray (`#c8c8b8`) |
| Button text | Dark charcoal (`#222`) |
| Log background | Near-black semi-transparent |
| Log text (normal) | White |
| Log text (highlight) | Yellow |
| Resource icons | Colored sprites (gold coin, sword, shield, globe) |

---

## Left Panel – Players

- Title banner: **"Players"** — serif/gothic style, ornate banner shape.
- Subtitle: player count (e.g. "Players: 2").
- Player list rows: small colored square (team color) + player name + online indicator dot.
  - Human player: yellow square, green dot.
  - AI player: blue square, gray/no dot.

---

## Map Area

- Grid of square sectors displayed over a **painted landscape background** (not a flat color).
- Owned sectors are overlaid with a subtle tint; unowned sectors blend with the background.
- **Territory borders** are drawn as thick colored outlines (3–4 px equivalent) following the political boundary of each player's territory — not drawn around every individual sector.
- Selected sector: white square highlight outline.
- **Sector contents** (pixel-art sprites, ~24×24 px each):
  - Trees / forest clusters (several density variants)
  - Gold deposit: small yellow dot on tile
  - Buildings: Town Hall (house + flag), Mine (pickaxe), Barracks (tent), Watchtower (tower), Wooden Wall, Stone Wall
- The map itself has no grid lines — sector boundaries are implied by the territory border color.

### Browser lightening note
The territory borders are the heaviest visual element. The browser version should reduce border thickness (1–2 px), use a slightly transparent fill tint for owned territory rather than relying on border alone, and preserve the yellow/blue color vocabulary.

---

## Top Bar

- Centered URL watermark text (can be replaced with game title / server name).
- Far right: FPS / ping counter.

---

## Bottom Status Bar

- Left segment: **Turn number** (e.g. "Turn: 49") — same stone-frame style.
- Center segment: **Map name** (e.g. "Map: jungle").
- Same decorative corner ornaments as the main frame.

---

## Log / Event Console

- Full-width strip below the status bar.
- Dark semi-transparent background.
- Scrolling fixed-width text; most lines in white, special events in yellow.
- Shows countdowns, game start messages, system events.

---

## Right Panel – HUD & Actions

### Sector info header
Shows the building type and coordinates of the selected sector (e.g. "Town Hall 10 × 12").

### Resource rows (top section)
Each row: small colored icon · value text · (for AP: "current / cap") displayed in a gray pill/bar.

| Icon | Resource | Example value |
|---|---|---|
| Lightning bolt | Action Points | 12 / 39 |
| Gold coin | Gold | 418 |
| Sword | Army | 51 |
| Shield | Experience | 223 |
| Globe / map | Territory % | 89 |

### Action buttons (mid section)
Three primary action buttons, always visible:

| Label | Icon | Action |
|---|---|---|
| Attack | Flag / arrow | Attack selected sector |
| Abandon | Arrow out | Abandon selected sector |
| End Turn | Checkmark | End turn early |

### Build buttons
Six build buttons in a vertical list with a small sprite icon left of the label:

1. Town Hall
2. Mine
3. Barracks
4. Watchtower
5. Wooden Wall
6. Stone Wall

### Management buttons
Three management buttons below the build list:

1. Repair
2. Demolish
3. Transfer Gold — visually grayed out when unavailable

### Button style
All buttons share the same stone-textured raised-bevel appearance. Unavailable buttons are desaturated/dimmed. No hover state is visible in the screenshot but a subtle highlight is expected.

---

## Typography

| Context | Style |
|---|---|
| Panel titles (Players, Town Hall) | Serif / gothic display font, medium weight |
| Button labels | Small sans-serif, ~12 px |
| Resource values | Monospaced or tabular figures, ~13 px |
| Log console | Fixed-width (monospace), ~11 px |
| Status bar | Same sans-serif as buttons |

---

## Browser Adaptation Guidelines

1. **Reduce chrome weight** — replace the thick stone-texture border frame with a thin (`1–2 px`) decorative border using a stone-gray color and subtle `box-shadow`. The corner ornaments can become simple rounded corners or small SVG decorative marks.
2. **Preserve color vocabulary** — keep yellow (own), blue (enemy), stone gray (UI chrome), and earthy greens (map) as the core palette.
3. **Territory borders** — use `1–2 px` strokes on the Canvas layer instead of 3–4 px; add a low-opacity fill tint (`rgba(player_color, 0.15)`) over owned sectors for clearer ownership without heavy lines.
4. **Buttons** — a flat or lightly beveled rectangle with the same stone-gray palette reads as faithful to the original without the heavy embossed texture.
5. **Map background** — a static illustrated/painted landscape image behind the grid preserves the aesthetic at no extra complexity.
6. **Building sprites** — can be SVG icons at 24×24 to remain crisp at any resolution, matching the original pixel-art size and style.
7. **Log panel** — a `<div>` with `overflow-y: auto` and dark background is a direct equivalent; no canvas needed.
8. **Tile size** — the original used ~24×24 px sprites; target 48–64 px tiles at 1080p. Tile size should be a configurable constant so it can be tuned without touching layout logic, and the map should support pinch/scroll zoom as a secondary navigation option.
9. **Responsive target** — design at 1920×1080 (16:9) as the baseline. The map canvas fills available horizontal space between the two fixed-width side panels (~200 px left, ~220 px right at 1080p). Below 1280 px wide, the panels collapse to icon-only mode and expand on hover/tap. The original 800×600 layout is not a target — do not artificially constrain the design to match it.
