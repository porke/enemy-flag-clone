import React from "react";
import { useGame } from "../context/GameContext.js";
import { classifySectors } from "@enemy-flag/engine";

export function ResourceHUD() {
  const { state, humanId } = useGame();
  const player = state.players[humanId];
  if (!player) return null;

  const { ap, apCap, gold, army, xp } = player.resources;
  const { internal, border } = classifySectors(state, humanId);

  // Compute income preview
  const townHallCount = countTownHalls(state, humanId);
  const apIncome =
    8 +
    Math.floor(internal.length / 50) +
    Math.floor(border.length / 100) +
    Math.max(0, townHallCount - 1);
  const goldIncome = 2;

  // Territory %
  const total = state.sectors.length * (state.sectors[0]?.length ?? 0);
  const owned = countOwned(state, humanId);
  const territoryPct = total > 0 ? ((owned / total) * 100).toFixed(1) : "0.0";

  return (
    <div style={styles.hud}>
      <HUDRow label="AP" value={`${ap} / ${apCap}`} income={`+${apIncome}`} />
      <HUDRow label="Gold" value={String(gold)} income={`+${goldIncome}`} />
      <HUDRow label="Army" value={String(army)} />
      <HUDRow label="XP" value={xp.toFixed(1)} />
      <HUDRow label="Territory" value={`${territoryPct}%`} />
    </div>
  );
}

function HUDRow({
  label,
  value,
  income,
}: {
  label: string;
  value: string;
  income?: string;
}) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
      {income && <span style={styles.income}>{income}</span>}
    </div>
  );
}

function countTownHalls(state: ReturnType<typeof useGame>["state"], playerId: string): number {
  let n = 0;
  for (const row of state.sectors)
    for (const s of row)
      if (s.owner === playerId && s.building?.type === "town_hall") n++;
  return n;
}

function countOwned(state: ReturnType<typeof useGame>["state"], playerId: string): number {
  let n = 0;
  for (const row of state.sectors) for (const s of row) if (s.owner === playerId) n++;
  return n;
}

const styles: Record<string, React.CSSProperties> = {
  hud: {
    background: "#1a1a2e",
    color: "#eee",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    minWidth: 160,
  },
  row: {
    display: "flex",
    gap: 4,
    marginBottom: 4,
    alignItems: "baseline",
  },
  label: { color: "#aaa", width: 68, flexShrink: 0 },
  value: { fontWeight: "bold", flex: 1 },
  income: { color: "#4caf50", fontSize: 11 },
};
