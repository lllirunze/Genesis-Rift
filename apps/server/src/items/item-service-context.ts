import type { GameId } from "@genesis-rift/shared";

/** 描述一次业务结算所需的上下文与外部依赖。 */
export interface ItemServiceContext {
  readonly playerName: string;
  readonly gameId?: GameId;
}
