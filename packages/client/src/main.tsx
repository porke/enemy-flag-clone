import React from "react";
import { createRoot } from "react-dom/client";
import { loadMap } from "@enemy-flag/engine";
import { computeAiTurn } from "@enemy-flag/ai";
import { LocalTransport } from "./transport/LocalTransport.js";
import { GameProvider } from "./context/GameContext.js";
import { App } from "./components/App.js";
import ExampleMap from "../../engine/src/maps/ExampleMap.json";

const HUMAN_ID = "player1";
const AI_ID = "ai";

const initialState = loadMap(ExampleMap);
const transport = new LocalTransport(initialState, AI_ID, computeAiTurn);

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <GameProvider initialState={initialState} transport={transport} humanId={HUMAN_ID}>
      <App />
    </GameProvider>
  </React.StrictMode>,
);
