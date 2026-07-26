import type { GameId, PlayerId } from "@genesis-rift/shared";

import type { TurnPhase } from "../turn/turn-phase.ts";

export type GameStatus = "lobby" | "running" | "finished";

export interface GameState {
  readonly gameId: GameId;
  readonly status: GameStatus;
  readonly round: number;
  readonly turnPhase: TurnPhase;
  readonly playerOrder: readonly PlayerId[];
}
