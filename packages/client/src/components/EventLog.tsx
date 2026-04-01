import React, { useEffect, useRef } from "react";
import type { GameEvent } from "@enemy-flag/engine";
import { useGame } from "../context/GameContext.js";

function eventToText(e: GameEvent): string {
  switch (e.kind) {
    case "sector_claimed":
      return `${e.byPlayer} claimed (${e.coord.x},${e.coord.y})`;
    case "sector_annexed":
      return `${e.byPlayer} annexed (${e.coord.x},${e.coord.y})`;
    case "building_damaged":
      return `Building at (${e.coord.x},${e.coord.y}) damaged — ${e.remainingHp} HP left`;
    case "building_destroyed":
      return `${e.buildingType.replace("_", " ")} at (${e.coord.x},${e.coord.y}) destroyed!`;
    case "player_eliminated":
      return `${e.playerId} eliminated!`;
    case "victory":
      return `🏆 ${e.winnerId} wins!`;
    case "turn_end":
      return `--- Turn ${e.newTurnNumber} — ${e.activePlayer}'s move ---`;
    default:
      return JSON.stringify(e);
  }
}

export function EventLog() {
  const { events } = useGame();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div style={styles.log}>
      {events.map((e, i) => (
        <div key={i} style={styles.entry}>
          {eventToText(e)}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  log: {
    background: "#0d0d1a",
    color: "#ccc",
    fontSize: 11,
    padding: "6px 8px",
    height: 120,
    overflowY: "auto",
    borderRadius: 4,
    fontFamily: "monospace",
  },
  entry: {
    marginBottom: 2,
    lineHeight: 1.4,
  },
};
