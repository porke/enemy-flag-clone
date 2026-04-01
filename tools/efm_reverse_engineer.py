#!/usr/bin/env python3
"""
EFM Reverse Engineering Script
================================
Converts and documents the .efm binary map format used by Enemy Flag.

Usage (from anywhere):
    python3 tools/efm_reverse_engineer.py <file.efm> [--json out.json] [--png out.png]

All relative paths are resolved from the repository root (the folder that
contains tools/), regardless of the working directory the script is called from.

Produces:
  - JSON conversion of the map (mechanical + visual data)
  - A human-readable format documentation report
  - Optionally saves a background image PNG (requires Pillow in tools/.venv)

----- FORMAT DOCUMENTATION ---------------------------------------------------

File: (2) Jungle.efm  (2523 bytes)
Map:  20 × 20 tiles  (400 tiles total)

Layer 1 — Tile Grid  (bytes 0 – 1199, 400 × 3 = 1200 bytes)
  Column-major order: tile(x, y) at offset (x * 20 + y) * 3
  (x is the slow axis; within each column, y increments fastest)
  Each tile is 3 bytes:

    Byte 0  — Owner / player affiliation
        0x00  neutral  (unowned territory)
        0x01  player1
        0x02  player2

    Byte 1  — Tile type / visual sprite ID
        0x00  plain / grass   (no visual marker)
        0x01  town_hall       (only when byte 0 ≠ 0x00)
        0x40  plain_variant   (visually distinct grass/terrain, mechanically plain)
        0x42  tree_light      (light forest)
        0x43  tree_medium     (medium forest)
        0x44  tree_dense      (dense forest)
        0x46  mountain / rock (impassable heavy terrain)

        Classification heuristic (confirmed against anchor points):
          byte1 == 0x46                → mountain
          byte1 in {0x42, 0x43, 0x44}  → tree / forest
          byte1 == 0x40                → light terrain / grass variant
          byte1 == 0x01                → town_hall (requires byte0 ≠ 0)
          byte1 == 0x00                → plain

    Byte 2  — Special resource flag
        0x00  none
        0x01  gold_vein  (present whether tile is owned or neutral)

Confidence levels:
    Owner encoding       – HIGH  (all 13 player1 + 13 player2 tiles match)
    Town_hall encoding   – HIGH  (both TH tiles confirmed: (4,4) and (15,15))
    Gold_vein encoding   – HIGH  (all 4 anchored gold tiles confirmed)
    Mountain (0x46)      – HIGH  (12/14 JSON mountain tiles = 0x46; 2 anomalies
                                    suggest JSON over-estimates mountain extent)
    Tree variants        – MEDIUM (some JSON-labelled trees map to 0x00 in EFM,
                                    indicating JSON is an approximation)

Layer 2 — Background Image  (bytes 1200 – 2522, 1323 bytes)
    Size:  1323 = 21 × 21 × 3  =  441 pixels × 3 bytes (R, G, B)
    Interpretation: 21 × 21 raw RGB background image, stored column-major.
    The grid is 1-indexed: row 0 and column 0 are padding; the effective area
    is the inner 20 × 20 pixels, which aligns 1-to-1 with the tile grid.
    Cross-validated across two maps:
      Jungle.efm  → mean R=86,  G=128, B=42  (green jungle)
      Sahara.efm  → mean R=190, G=140, B=82  (orange desert)
    Confidence: HIGH

-------------------------------------------------------------------------------
"""

import argparse
import json
import struct
import sys
from pathlib import Path
from collections import Counter

# ---------------------------------------------------------------------------
# Anchor the working directory to the repository root (parent of tools/)
# so all relative paths work regardless of where this script is invoked from.
# ---------------------------------------------------------------------------
import os
os.chdir(Path(__file__).resolve().parent.parent)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAP_WIDTH  = 20
MAP_HEIGHT = 20
TILE_BYTES = 3
TILE_LAYER_SIZE = MAP_WIDTH * MAP_HEIGHT * TILE_BYTES   # 1200
VISUAL_LAYER_SIZE = 21 * 21 * 3                          # 1323

# Byte-0 owner codes
OWNER_CODES = {
    0x00: "neutral",
    0x01: "player1",
    0x02: "player2",
}

# Byte-1 sprite/feature codes
SPRITE_CODES = {
    0x00: "plain",
    0x01: "town_hall",  # Only meaningful when owner != neutral
    0x40: "plain_variant",
    0x42: "tree_light",
    0x43: "tree_medium",
    0x44: "tree_dense",
    0x46: "mountain",
}

TREE_SPRITES    = {0x42, 0x43, 0x44}   # 0x40 is a plain/terrain variant, NOT a tree
PLAIN_VARIANTS  = {0x00, 0x40}
MOUNTAIN_SPRITE = 0x46

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_efm(path: Path) -> dict:
    """Parse an .efm file, return a dict with tiles and meta."""
    data = path.read_bytes()
    total = len(data)

    result = {
        "source_file":   str(path),
        "file_size":     total,
        "map_width":     MAP_WIDTH,
        "map_height":    MAP_HEIGHT,
        "tile_bytes":    TILE_BYTES,
        "tile_layer_size":   TILE_LAYER_SIZE,
        "visual_layer_size": VISUAL_LAYER_SIZE,
        "tiles":         [],
        "visual_layer":  None,
        "warnings":      [],
    }

    if total < TILE_LAYER_SIZE:
        result["warnings"].append(
            f"File too small ({total} bytes) for full tile grid ({TILE_LAYER_SIZE} bytes)."
        )

    # ---- tile layer ----
    # Storage is column-major: x is the slow axis, y is the fast axis.
    # offset = (x * MAP_HEIGHT + y) * TILE_BYTES
    tiles = []
    for y in range(MAP_HEIGHT):
        for x in range(MAP_WIDTH):
            idx = x * MAP_HEIGHT + y
            off = idx * TILE_BYTES
            if off + 2 >= total:
                result["warnings"].append(f"Tile ({x},{y}) truncated at offset {off}.")
                break

            b0, b1, b2 = data[off], data[off + 1], data[off + 2]

            owner = OWNER_CODES.get(b0, f"unknown_0x{b0:02x}")

            # Decode feature / visual
            if b1 == 0x01 and b0 != 0x00:
                feature   = "town_hall"
                visual_id = 0x01
            elif b1 == MOUNTAIN_SPRITE:
                feature   = "mountain"
                visual_id = b1
            elif b1 in TREE_SPRITES:
                feature   = "tree"
                visual_id = b1
            elif b1 in PLAIN_VARIANTS:
                feature   = None
                visual_id = b1
            else:
                feature   = f"unknown_0x{b1:02x}"
                visual_id = b1
                result["warnings"].append(
                    f"Unknown byte1=0x{b1:02x} at tile ({x},{y})"
                )

            gold_vein = bool(b2 & 0x01)

            tiles.append({
                "x":          x,
                "y":          y,
                "owner":      owner,
                "feature":    feature,
                "gold_vein":  gold_vein,
                "raw_bytes":  [b0, b1, b2],
                "visual_id":  visual_id,
            })

    result["tiles"] = tiles

    # ---- visual / thumbnail layer ----
    if total >= TILE_LAYER_SIZE + VISUAL_LAYER_SIZE:
        raw_visual = data[TILE_LAYER_SIZE : TILE_LAYER_SIZE + VISUAL_LAYER_SIZE]
        # Interpret as 21×21 RGB pixels
        pixels = []
        for i in range(0, len(raw_visual), 3):
            r, g, b = raw_visual[i], raw_visual[i + 1], raw_visual[i + 2]
            pixels.append({"r": r, "g": g, "b": b})
        result["visual_layer"] = {
            "offset":        TILE_LAYER_SIZE,
            "size":          VISUAL_LAYER_SIZE,
            "width":         21,
            "height":        21,
            "encoding":      "raw_rgb_21x21",
            "pixel_count":   len(pixels),
            "pixel_sample":  pixels[:5],   # first 5 pixels for inspection
            "mean_r": sum(p["r"] for p in pixels) / len(pixels),
            "mean_g": sum(p["g"] for p in pixels) / len(pixels),
            "mean_b": sum(p["b"] for p in pixels) / len(pixels),
        }
    elif total > TILE_LAYER_SIZE:
        result["visual_layer"] = {
            "offset": TILE_LAYER_SIZE,
            "size":   total - TILE_LAYER_SIZE,
            "note":   "Partial or differently-sized visual section; raw bytes preserved.",
            "raw_hex": data[TILE_LAYER_SIZE:].hex(),
        }

    return result


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def to_game_json(parsed: dict) -> dict:
    """Strip raw bytes, return a clean game-compatible JSON dict."""
    clean_tiles = []
    for t in parsed["tiles"]:
        clean_tiles.append({
            "x":         t["x"],
            "y":         t["y"],
            "owner":     t["owner"],
            "feature":   t["feature"],
            "gold_vein": t["gold_vein"],
        })
    return {
        "meta": {
            "source":    parsed["source_file"],
            "width":     parsed["map_width"],
            "height":    parsed["map_height"],
            "note":      "Converted from .efm by efm_reverse_engineer.py",
        },
        "tiles": clean_tiles,
    }


def print_report(parsed: dict, json_ref_path: Path | None = None):
    """Pretty-print a format analysis report to stdout."""
    sep = "=" * 70

    print(sep)
    print("EFM REVERSE ENGINEERING REPORT")
    print(sep)
    print(f"  File  : {parsed['source_file']}")
    print(f"  Size  : {parsed['file_size']} bytes")
    print(f"  Map   : {parsed['map_width']} × {parsed['map_height']} tiles")
    print()

    # ---- tile stats ----
    tiles = parsed["tiles"]
    owner_counts  = Counter(t["owner"]   for t in tiles)
    feat_counts   = Counter(str(t["feature"]) for t in tiles)
    gold_count    = sum(1 for t in tiles if t["gold_vein"])
    sprite_counts = Counter(f"0x{t['visual_id']:02x}" for t in tiles)

    print("TILE STATISTICS")
    print("-" * 40)
    print("  Owner distribution:")
    for owner, cnt in sorted(owner_counts.items()):
        pct = cnt / len(tiles) * 100
        print(f"    {owner:<12} {cnt:3d} tiles  ({pct:.1f}%)")
    print()
    print("  Feature distribution:")
    for feat, cnt in sorted(feat_counts.items()):
        pct = cnt / len(tiles) * 100
        print(f"    {feat:<16} {cnt:3d} tiles  ({pct:.1f}%)")
    print()
    print(f"  Gold veins: {gold_count} tiles")
    print()
    print("  Sprite ID distribution (byte 1):")
    for sid, cnt in sorted(sprite_counts.items(), key=lambda x: -x[1]):
        pct = cnt / len(tiles) * 100
        print(f"    {sid}  {cnt:3d}  ({pct:.1f}%)")
    print()

    # ---- visual layer ----
    if parsed["visual_layer"]:
        vl = parsed["visual_layer"]
        print("VISUAL LAYER")
        print("-" * 40)
        print(f"  Offset : {vl['offset']}")
        print(f"  Size   : {vl['size']} bytes")
        if "width" in vl:
            print(f"  Dims   : {vl['width']} × {vl['height']} pixels (RGB)")
            print(f"  Mean   : R={vl['mean_r']:.1f}  G={vl['mean_g']:.1f}  B={vl['mean_b']:.1f}")
            print(f"  Note   : Likely a map preview thumbnail embedded in the file.")
        if "note" in vl:
            print(f"  Note   : {vl['note']}")
        print()

    # ---- warnings ----
    if parsed["warnings"]:
        print("WARNINGS")
        print("-" * 40)
        for w in parsed["warnings"]:
            print(f"  ⚠  {w}")
        print()

    # ---- anchor verification ----
    if json_ref_path and json_ref_path.exists():
        print("ANCHOR POINT VERIFICATION (vs reference JSON)")
        print("-" * 40)
        verify_against_json(tiles, json_ref_path)
        print()

    # ---- mini ASCII map ----
    print("ASCII MAP (O=owner, .=plain, M=mountain, T=tree, H=town_hall, G=gold)")
    print("-" * 40)
    tile_map = {(t["x"], t["y"]): t for t in tiles}
    for y in range(MAP_HEIGHT):
        row = ""
        for x in range(MAP_WIDTH):
            t = tile_map[(x, y)]
            if t["feature"] == "town_hall":
                ch = "H"
            elif t["gold_vein"]:
                ch = "G"
            elif t["feature"] == "mountain":
                ch = "M"
            elif t["feature"] == "tree":
                ch = "T"
            elif t["owner"] == "player1":
                ch = "1"
            elif t["owner"] == "player2":
                ch = "2"
            else:
                ch = "."
            row += ch
        print(f"  {row}")
    print()

    print(sep)
    print("FORMAT SUMMARY")
    print(sep)
    print("""
  Encoding: H=0 (no header), 3 bytes/tile, column-major (y fastest within each column)
  Tile offset: (x * height + y) * 3

  Byte layout per tile:
    [0]  Owner     : 0x00=neutral  0x01=player1  0x02=player2
    [1]  Feature   : 0x00=plain    0x01=town_hall
                     0x40=terrain_A  0x42=terrain_B
                     0x43=terrain_C  0x44=terrain_D
                     0x46=mountain
    [2]  Flags     : bit0 = gold_vein (0=none, 1=present)

    After tile layer (byte 1200):
    1323 bytes = 21×21×3 raw RGB pixel background image (confidence: HIGH)
    - Jungle (map 2): mean R=86,  G=128, B=42  → green tones confirmed
    - Sahara (map 6): mean R=190, G=140, B=82  → orange/desert tones confirmed
    Use --png to extract as a scaled PNG (requires Pillow).
""")


def verify_against_json(tiles: list, json_path: Path):
    """Check known anchor points from the reference JSON."""
    with open(json_path) as f:
        ref = json.load(f)

    ref_map = {(t["x"], t["y"]): t for t in ref["tiles"]}
    efm_map = {(t["x"], t["y"]): t for t in tiles}

    # Anchors explicitly described by the user
    anchors = [
        # (x, y, expected_owner, expected_feature, expected_gold)
        (4,  4,  "player1", "town_hall", False),
        (15, 15, "player2", "town_hall", False),
        (4,  2,  "player1", None,        True),
        (2,  4,  "player1", None,        True),
        (17, 15, "player2", None,        True),
        (15, 17, "player2", None,        True),
        (18,  0, "neutral", "mountain",  False),
        (19,  0, "neutral", "mountain",  False),
        (0,  19, "neutral", "mountain",  False),
        (1,  19, "neutral", "mountain",  False),
        (18, 19, "neutral", "mountain",  False),
        (19, 19, "neutral", "mountain",  False),
    ]

    all_ok = True
    for (x, y, exp_owner, exp_feat, exp_gold) in anchors:
        t = efm_map.get((x, y))
        if t is None:
            print(f"  MISSING tile ({x},{y})")
            all_ok = False
            continue
        errs = []
        if t["owner"] != exp_owner:
            errs.append(f"owner {t['owner']!r} ≠ expected {exp_owner!r}")
        if exp_feat is not None and t["feature"] != exp_feat:
            errs.append(f"feature {t['feature']!r} ≠ expected {exp_feat!r}")
        if t["gold_vein"] != exp_gold:
            errs.append(f"gold_vein {t['gold_vein']} ≠ expected {exp_gold}")
        if errs:
            print(f"  FAIL ({x:2},{y:2}): " + "; ".join(errs))
            all_ok = False
        else:
            print(f"  OK   ({x:2},{y:2}): owner={t['owner']} feat={t['feature']} gold={t['gold_vein']}")

    if all_ok:
        print("\n  ✓ ALL anchors verified successfully.")
    else:
        print("\n  ✗ Some anchors did not match.")


def save_minimap_png(parsed: dict, out_path: Path):
    """Save the visual layer as two PNGs (requires Pillow):
      - <stem>_raw.png    — pixel-exact 20×20 (inner crop) upscaled nearest-neighbour
      - <out_path>        — 400×400 bicubic-smoothed gradient image
    The 21×21 stored grid is 1-indexed; row 0 and column 0 are discarded.
    """
    try:
        from PIL import Image
    except ImportError:
        print("Pillow not installed; skipping PNG export. Install with: pip install Pillow")
        return

    vl = parsed.get("visual_layer")
    if not vl or "width" not in vl:
        print("No interpretable visual layer found; skipping PNG.")
        return

    w, h = vl["width"], vl["height"]
    raw_path = Path(parsed["source_file"])
    raw_bytes = raw_path.read_bytes()[TILE_LAYER_SIZE : TILE_LAYER_SIZE + VISUAL_LAYER_SIZE]

    pixels = []
    for i in range(0, len(raw_bytes), 3):
        r, g, b = raw_bytes[i], raw_bytes[i + 1], raw_bytes[i + 2]
        pixels.append((r, g, b))

    img = Image.new("RGB", (w, h))
    img.putdata(pixels)
    # The visual layer is stored column-major (x is slow axis, y is fast axis),
    # so transpose to convert to standard row-major (x=col, y=row) orientation.
    img = img.transpose(Image.TRANSPOSE)
    # The 21×21 grid is 1-indexed: row 0 and column 0 are unused padding.
    # Crop to the inner 20×20 region that aligns with the tile grid.
    img = img.crop((1, 1, w, h))  # left, top, right, bottom → 20×20

    # --- raw pixelated version (20×20 → 320×320 nearest-neighbour) ---
    raw_out = out_path.with_stem(out_path.stem + "_raw")
    img.resize((20 * 16, 20 * 16), Image.NEAREST).save(raw_out)
    print(f"Background image (raw)    saved to: {raw_out}")

    # --- smoothed gradient version ---
    # Each of the 21×21 pixel values is a gradient stop; bicubic interpolation
    # produces smooth transitions between them across the 400×400 output.
    img.resize((400, 400), Image.BICUBIC).save(out_path)
    print(f"Background image (smooth) saved to: {out_path}")



# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Reverse-engineer and convert an .efm Enemy Flag map file."
    )
    parser.add_argument("efm_file", help="Path to the .efm file")
    parser.add_argument(
        "--json", metavar="OUT.json",
        help="Save decoded map as JSON to this path",
    )
    parser.add_argument(
        "--full-json", metavar="FULL_OUT.json",
        help="Save full analysis JSON (includes raw bytes and visual layer info)",
    )
    parser.add_argument(
        "--ref-json", metavar="REF.json",
        help="Reference JSON to verify anchor points against",
    )
    parser.add_argument(
        "--png", metavar="MINIMAP.png",
        help="Save the 21×21 visual layer as a PNG (requires Pillow)",
    )
    parser.add_argument(
        "--no-report", action="store_true",
        help="Skip the human-readable report",
    )
    args = parser.parse_args()

    efm_path = Path(args.efm_file)
    if not efm_path.exists():
        print(f"Error: file not found: {efm_path}", file=sys.stderr)
        sys.exit(1)

    parsed = parse_efm(efm_path)

    if not args.no_report:
        ref_path = Path(args.ref_json) if args.ref_json else None
        print_report(parsed, ref_path)

    if args.json:
        out = to_game_json(parsed)
        Path(args.json).write_text(json.dumps(out, indent=2))
        print(f"Game JSON saved to: {args.json}")

    if args.full_json:
        Path(args.full_json).write_text(json.dumps(parsed, indent=2))
        print(f"Full analysis JSON saved to: {args.full_json}")

    if args.png:
        save_minimap_png(parsed, Path(args.png))


if __name__ == "__main__":
    main()
