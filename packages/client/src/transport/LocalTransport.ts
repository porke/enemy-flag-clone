import type {
  Action,
  GameEvent,
  GameState,
  PlayerId,
} from "@enemy-flag/engine";
import { applyAttack, applyAbandon, applyEndOfTurn } from "@enemy-flag/engine";
import type { computeAiTurn as ComputeAiTurn } from "@enemy-flag/ai";

type StateListener = (state: GameState, events: GameEvent[]) => void;

/**
 * Wires the pure engine + AI together for local 1v1 play.
 * No network; the AI runs synchronously after each human endTurn.
 */
export class LocalTransport {
  private state: GameState;
  private readonly aiId: PlayerId;
  private readonly computeAiTurn: typeof ComputeAiTurn;
  private readonly listeners: StateListener[] = [];

  constructor(
    initialState: GameState,
    aiId: PlayerId,
    computeAiTurnFn: typeof ComputeAiTurn,
  ) {
    this.state = initialState;
    this.aiId = aiId;
    this.computeAiTurn = computeAiTurnFn;
  }

  getState(): GameState {
    return this.state;
  }

  onStateUpdate(cb: StateListener): void {
    this.listeners.push(cb);
  }

  submitAction(action: Action): { state: GameState; events: GameEvent[] } {
    const allEvents: GameEvent[] = [];

    const result = this.applyAction(this.state, action);
    if (!result.ok) {
      console.warn("[LocalTransport] Invalid action:", action, result.error);
      return { state: this.state, events: [] };
    }

    this.state = result.newState;
    allEvents.push(...result.events);

    // If the game is over, broadcast and stop
    if (this.state.winner !== null) {
      this.broadcast(allEvents);
      return { state: this.state, events: allEvents };
    }

    // If it is now the AI's turn, run the full AI turn synchronously
    while (this.state.activePlayerId === this.aiId && this.state.winner === null) {
      const aiActions = this.computeAiTurn(this.state, this.aiId);
      for (const aiAction of aiActions) {
        console.log("[AI]", JSON.stringify(aiAction));
        const aiResult = this.applyAction(this.state, aiAction);
        if (!aiResult.ok) {
          console.warn("[LocalTransport] AI produced invalid action:", aiAction, aiResult.error);
          break;
        }
        this.state = aiResult.newState;
        allEvents.push(...aiResult.events);
        if (this.state.winner !== null) break;
      }
    }

    this.broadcast(allEvents);
    return { state: this.state, events: allEvents };
  }

  private applyAction(
    state: GameState,
    action: Action,
  ): { ok: boolean; error?: string; newState: GameState; events: GameEvent[] } {
    switch (action.type) {
      case "attack":
        return applyAttack(state, state.activePlayerId, action.coord);
      case "abandon":
        return applyAbandon(state, state.activePlayerId, action.coord);
      case "endTurn":
        return applyEndOfTurn(state, state.activePlayerId);
      default: {
        const _exhaustive: never = action;
        return { ok: false, error: "Unknown action", newState: state, events: [] };
      }
    }
  }

  private broadcast(events: GameEvent[]): void {
    for (const listener of this.listeners) {
      listener(this.state, events);
    }
  }
}
