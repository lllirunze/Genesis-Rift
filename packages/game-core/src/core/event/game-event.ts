import type { GameId } from "@genesis-rift/shared";

/** 描述模块之间传递的业务事件。 */
export interface GameEvent<Payload = unknown> {
  readonly eventId: string;
  readonly gameId: GameId;
  readonly type: string;
  readonly payload: Payload;
}
