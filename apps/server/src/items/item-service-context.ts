import type { GameId } from "@genesis-rift/shared";

export interface ItemServiceContext {
  readonly playerName: string;
  readonly gameId?: GameId;
}
