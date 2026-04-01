import React, { createContext, useContext, useRef, useState } from "react";
import type { GameEvent, GameState } from "@enemy-flag/engine";
import type { LocalTransport } from "../transport/LocalTransport.js";

interface GameContextValue {
  state: GameState;
  events: GameEvent[];
  transport: LocalTransport;
  humanId: string;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  initialState,
  transport,
  humanId,
  children,
}: {
  initialState: GameState;
  transport: LocalTransport;
  humanId: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<GameState>(initialState);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const registeredRef = useRef(false);

  if (!registeredRef.current) {
    transport.onStateUpdate((newState, newEvents) => {
      setState(newState);
      setEvents((prev) => [...prev, ...newEvents]);
    });
    registeredRef.current = true;
  }

  return (
    <GameContext.Provider value={{ state, events, transport, humanId }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}
