import type { GameId } from "@genesis-rift/shared";

export interface GameEvent<Payload = unknown> {
  readonly eventId: string;
  readonly gameId: GameId;
  readonly type: string;
  readonly payload: Payload;
}
