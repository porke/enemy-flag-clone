import React, { useState } from "react";
import { useGame } from "../context/GameContext.js";
import { GameCanvas } from "./GameCanvas.js";
import { ResourceHUD } from "./ResourceHUD.js";
import { ActionPanel } from "./ActionPanel.js";
import { EventLog } from "./EventLog.js";
import { PlayerList } from "./PlayerList.js";
import type { Coord } from "@enemy-flag/engine";

export function App() {
  const { state } = useGame();
  const [selectedCoord, setSelectedCoord] = useState<Coord | null>(null);

  return (
    <div style={styles.root}>
      {/* Victory overlay */}
      {state.winner !== null && (
        <div style={styles.victoryOverlay}>
          <div style={styles.victoryBox}>
            <div style={styles.victoryTitle}>🏆 Victory!</div>
            <div style={styles.victoryMsg}>{state.winner} wins the game!</div>
            <button style={styles.reloadBtn} onClick={() => window.location.reload()}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.logo}>Enemy Flag</span>
        <span style={styles.turn}>Turn {state.turn}</span>
        <span style={styles.activePlayer}>
          {state.activePlayerId}'s turn
        </span>
      </div>

      {/* Main layout */}
      <div style={styles.main}>
        {/* Left panel */}
        <div style={styles.leftPanel}>
          <PlayerList />
        </div>

        {/* Map canvas */}
        <div style={styles.canvasArea}>
          <GameCanvas onSectorClick={setSelectedCoord} selectedCoord={selectedCoord} />
        </div>

        {/* Right panel */}
        <div style={styles.rightPanel}>
          <ResourceHUD />
          <div style={{ height: 12 }} />
          <ActionPanel selectedCoord={selectedCoord} />
        </div>
      </div>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <EventLog />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#10101e",
    color: "#eee",
    fontFamily: "system-ui, sans-serif",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "6px 16px",
    background: "#1a1a2e",
    borderBottom: "1px solid #333",
    flexShrink: 0,
  },
  logo: { fontWeight: "bold", fontSize: 16, color: "#d4a800" },
  turn: { fontSize: 13, color: "#aaa" },
  activePlayer: { fontSize: 13, color: "#7ec8e3" },
  main: {
    display: "flex",
    flex: 1,
    gap: 12,
    padding: 12,
    overflow: "auto",
    alignItems: "flex-start",
  },
  leftPanel: { display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 },
  canvasArea: { overflow: "auto", flex: "0 0 auto" },
  rightPanel: { display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 },
  bottomBar: { padding: "0 12px 12px", flexShrink: 0 },
  victoryOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  victoryBox: {
    background: "#1a1a2e",
    border: "2px solid #d4a800",
    borderRadius: 12,
    padding: "32px 40px",
    textAlign: "center",
  },
  victoryTitle: { fontSize: 36, marginBottom: 8 },
  victoryMsg: { fontSize: 18, color: "#ccc", marginBottom: 24 },
  reloadBtn: {
    padding: "10px 24px",
    background: "#d4a800",
    color: "#000",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    cursor: "pointer",
    fontWeight: "bold",
  },
};
