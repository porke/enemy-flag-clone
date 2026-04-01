import React from "react";
import type { Coord } from "@enemy-flag/engine";
import { canAttack } from "@enemy-flag/engine";
import { useGame } from "../context/GameContext.js";

interface Props {
  selectedCoord: Coord | null;
}

export function ActionPanel({ selectedCoord }: Props) {
  const { state, transport, humanId } = useGame();

  const isMyTurn = state.activePlayerId === humanId;
  const disabled = !isMyTurn || state.winner !== null;

  const attackable =
    selectedCoord !== null && isMyTurn
      ? canAttack(state, humanId, selectedCoord)
      : false;

  const selectedSector =
    selectedCoord !== null
      ? state.sectors[selectedCoord.y]?.[selectedCoord.x]
      : null;

  const canAbandon =
    selectedCoord !== null &&
    selectedSector?.owner === humanId &&
    isMyTurn &&
    state.winner === null;

  return (
    <div style={styles.panel}>
      {selectedCoord && (
        <div style={styles.coordLabel}>
          Sector ({selectedCoord.x}, {selectedCoord.y})
          {selectedSector?.building
            ? ` — ${selectedSector.building.type.replace("_", " ")} HP:${selectedSector.building.hp}`
            : ""}
        </div>
      )}
      <button
        style={styles.btn}
        disabled={disabled || !attackable}
        onClick={() => selectedCoord && transport.submitAction({ type: "attack", coord: selectedCoord })}
      >
        ⚔ Attack
      </button>
      <button
        style={styles.btn}
        disabled={disabled || !canAbandon}
        onClick={() => selectedCoord && transport.submitAction({ type: "abandon", coord: selectedCoord })}
      >
        ✕ Abandon
      </button>
      <button
        style={{ ...styles.btn, ...styles.endTurnBtn }}
        disabled={disabled}
        onClick={() => transport.submitAction({ type: "endTurn" })}
      >
        ▶ End Turn
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "8px 12px",
    background: "#1a1a2e",
    borderRadius: 6,
    minWidth: 140,
  },
  coordLabel: {
    color: "#ccc",
    fontSize: 11,
    marginBottom: 4,
  },
  btn: {
    padding: "6px 10px",
    borderRadius: 4,
    border: "1px solid #444",
    background: "#2a2a4a",
    color: "#eee",
    cursor: "pointer",
    fontSize: 13,
    textAlign: "left",
  },
  endTurnBtn: {
    background: "#2a4a2a",
    marginTop: 8,
  },
};
