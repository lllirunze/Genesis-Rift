import type { GameCommand } from "../command/game-command.ts";
import type { GameEvent } from "../event/game-event.ts";
import type { GameState } from "./game-state.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface GameEngine {
  getState(): Readonly<GameState>;
  dispatch(command: GameCommand): readonly GameEvent[];
}
