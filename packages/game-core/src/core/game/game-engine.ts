import type { GameCommand } from "../command/game-command.ts";
import type { GameEvent } from "../event/game-event.ts";
import type { GameState } from "./game-state.ts";

export interface GameEngine {
  getState(): Readonly<GameState>;
  dispatch(command: GameCommand): readonly GameEvent[];
}
