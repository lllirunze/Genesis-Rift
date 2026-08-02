import type { GameId, PlayerId } from "@genesis-rift/shared";

import type { TurnPhase } from "../turn/turn-phase.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type GameStatus = "lobby" | "running" | "finished";

/** 描述业务对象在运行时保存的状态。 */
export interface GameState {
  readonly gameId: GameId;
  readonly status: GameStatus;
  readonly round: number;
  readonly turnPhase: TurnPhase;
  readonly playerOrder: readonly PlayerId[];
}
