import type { GameId, PlayerId } from "@genesis-rift/shared";

/** 描述一次业务请求所需的输入数据。 */
export interface GameCommand<Payload = unknown> {
  readonly commandId: string;
  readonly gameId: GameId;
  readonly playerId: PlayerId;
  readonly type: string;
  readonly payload: Payload;
}
