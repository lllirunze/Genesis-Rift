import type { GameId, PlayerId } from "@genesis-rift/shared";

export interface GameCommand<Payload = unknown> {
  readonly commandId: string;
  readonly gameId: GameId;
  readonly playerId: PlayerId;
  readonly type: string;
  readonly payload: Payload;
}
