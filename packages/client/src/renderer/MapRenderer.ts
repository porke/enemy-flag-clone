import type { Coord, GameState } from "@enemy-flag/engine";
import { canAttack } from "@enemy-flag/engine";

// Pixel dimensions
const SECTOR_SIZE = 28; // px per sector side

const COLOR = {
  neutral: "#b5c9a0",
  player1: "rgba(212, 168, 0, 0.55)",
  ai: "rgba(42, 91, 215, 0.55)",
  selected: "rgba(255, 255, 255, 0.85)",
  attackable: "rgba(255, 80, 80, 0.35)",
  grid: "#7a9060",
  border: "#111",
  townHall: "#e0c040",
  goldVein: "#ffd700",
  tree: "#3a7a30",
  mountain: "#888",
};

export class MapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width * SECTOR_SIZE;
    this.canvas.height = height * SECTOR_SIZE;
  }

  render(state: GameState, selectedCoord: Coord | null, humanId: string): void {
    const ctx = this.ctx;
    const height = state.sectors.length;
    const width = state.sectors[0]?.length ?? 0;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const coord: Coord = { x, y };
        const sector = state.sectors[y]![x]!;
        const px = x * SECTOR_SIZE;
        const py = y * SECTOR_SIZE;
        const s = SECTOR_SIZE;

        // Base fill
        ctx.fillStyle = COLOR.neutral;
        ctx.fillRect(px, py, s, s);

        // Owner tint
        if (sector.owner === "player1") {
          ctx.fillStyle = COLOR.player1;
          ctx.fillRect(px, py, s, s);
        } else if (sector.owner === "ai") {
          ctx.fillStyle = COLOR.ai;
          ctx.fillRect(px, py, s, s);
        }

        // Attackable highlight
        if (
          humanId === state.activePlayerId &&
          canAttack(state, humanId, coord)
        ) {
          ctx.fillStyle = COLOR.attackable;
          ctx.fillRect(px, py, s, s);
        }

        // Selected sector
        if (selectedCoord && selectedCoord.x === x && selectedCoord.y === y) {
          ctx.fillStyle = COLOR.selected;
          ctx.fillRect(px, py, s, s);
        }

        // Gold vein dot
        if (sector.goldVein) {
          ctx.beginPath();
          ctx.arc(px + s * 0.25, py + s * 0.75, 3, 0, Math.PI * 2);
          ctx.fillStyle = COLOR.goldVein;
          ctx.fill();
        }

        // Feature: tree / mountain
        if (sector.feature === "tree") {
          ctx.fillStyle = COLOR.tree;
          ctx.beginPath();
          ctx.arc(px + s / 2, py + s / 2, s * 0.22, 0, Math.PI * 2);
          ctx.fill();
        } else if (sector.feature === "mountain") {
          ctx.fillStyle = COLOR.mountain;
          ctx.beginPath();
          ctx.moveTo(px + s / 2, py + s * 0.18);
          ctx.lineTo(px + s * 0.82, py + s * 0.82);
          ctx.lineTo(px + s * 0.18, py + s * 0.82);
          ctx.closePath();
          ctx.fill();
        }

        // Building: Town Hall
        if (sector.building?.type === "town_hall") {
          this.drawTownHall(ctx, px, py, s, sector.building.hp, sector.building.maxHp);
        }

        // Grid line
        ctx.strokeStyle = COLOR.grid;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, s, s);
      }
    }

    // Draw thicker border lines between different owners
    this.drawTerritoryBorders(state, ctx, width, height);
  }

  private drawTownHall(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    s: number,
    hp: number,
    maxHp: number,
  ): void {
    const cx = px + s / 2;
    const cy = py + s / 2;
    const r = s * 0.28;

    // Roof
    ctx.fillStyle = hp < maxHp ? "#c0392b" : COLOR.townHall;
    ctx.beginPath();
    ctx.moveTo(cx, py + s * 0.18);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = hp < maxHp ? "#e07060" : "#f5e040";
    ctx.fillRect(cx - r * 0.65, cy, r * 1.3, r * 0.9);

    // HP dots
    for (let i = 0; i < maxHp; i++) {
      ctx.beginPath();
      ctx.arc(px + s * 0.22 + i * 7, py + s * 0.86, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = i < hp ? "#2ecc71" : "#666";
      ctx.fill();
    }
  }

  private drawTerritoryBorders(
    state: GameState,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    ctx.strokeStyle = COLOR.border;
    ctx.lineWidth = 1.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const owner = state.sectors[y]![x]!.owner;
        const px = x * SECTOR_SIZE;
        const py = y * SECTOR_SIZE;
        const s = SECTOR_SIZE;

        // Right edge
        if (x + 1 < width && state.sectors[y]![x + 1]!.owner !== owner) {
          ctx.beginPath();
          ctx.moveTo(px + s, py);
          ctx.lineTo(px + s, py + s);
          ctx.stroke();
        }
        // Bottom edge
        if (y + 1 < height && state.sectors[y + 1]![x]!.owner !== owner) {
          ctx.beginPath();
          ctx.moveTo(px, py + s);
          ctx.lineTo(px + s, py + s);
          ctx.stroke();
        }
      }
    }
  }
}
