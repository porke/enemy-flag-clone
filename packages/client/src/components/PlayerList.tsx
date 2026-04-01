import React from "react";
import { useGame } from "../context/GameContext.js";

export function PlayerList() {
  const { state } = useGame();

  return (
    <div style={styles.list}>
      <div style={styles.title}>Players</div>
      {state.playerOrder.map((id) => {
        const player = state.players[id]!;
        const isActive = state.activePlayerId === id;
        return (
          <div key={id} style={{ ...styles.player, opacity: player.eliminated ? 0.4 : 1 }}>
            <span
              style={{
                ...styles.dot,
                background: player.color,
                boxShadow: isActive ? `0 0 6px ${player.color}` : "none",
              }}
            />
            <span style={{ fontWeight: isActive ? "bold" : "normal" }}>{player.name}</span>
            {player.eliminated && <span style={styles.elim}> (out)</span>}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    background: "#1a1a2e",
    color: "#eee",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    minWidth: 140,
  },
  title: { color: "#aaa", marginBottom: 8, fontSize: 11, textTransform: "uppercase" },
  player: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  elim: { color: "#e74c3c", fontSize: 11 },
};
