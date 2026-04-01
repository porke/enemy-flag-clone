import React, { useEffect, useRef, useState } from "react";
import type { Coord } from "@enemy-flag/engine";
import { MapRenderer } from "../renderer/MapRenderer.js";
import { useGame } from "../context/GameContext.js";

interface Props {
  onSectorClick: (coord: Coord) => void;
  selectedCoord: Coord | null;
}

export function GameCanvas({ onSectorClick, selectedCoord }: Props) {
  const { state, humanId } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  // Initialise renderer once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new MapRenderer(canvas);
    const height = state.sectors.length;
    const width = state.sectors[0]?.length ?? 0;
    renderer.resize(width, height);
    rendererRef.current = renderer;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render on every state / selection change
  useEffect(() => {
    rendererRef.current?.render(state, selectedCoord, humanId);
  }, [state, selectedCoord, humanId]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const SECTOR_SIZE = 28;
    const x = Math.floor((e.clientX - rect.left) / SECTOR_SIZE);
    const y = Math.floor((e.clientY - rect.top) / SECTOR_SIZE);
    const height = state.sectors.length;
    const width = state.sectors[0]?.length ?? 0;
    if (x >= 0 && x < width && y >= 0 && y < height) {
      onSectorClick({ x, y });
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ cursor: "crosshair", display: "block" }}
    />
  );
}
