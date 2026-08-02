import {
  addHandCardToSharedDiscardPile,
  type HandCardDeckState,
  validateHandCardDeckState,
} from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDestination, HandCardId } from "./hand-card-definition.ts";
import {
  resolveHandCardUse,
  type HandSizeStatus,
  type PlayerHandState,
} from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

/** 描述业务操作完成后返回的结果。 */
export interface ResolveUsedHandCardDestinationResult {
  readonly deckState: HandCardDeckState;
  readonly playerHandState: PlayerHandState;
  readonly cardId: HandCardId;
  readonly destination: HandCardDestination;
  readonly sizeStatus: HandSizeStatus;
}

/**
 * 方法名：resolveUsedHandCardDestination
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param deckState 方法所需的 deckState 参数。
 * @param playerHandState 方法所需的 playerHandState 参数。
 * @param cardId 方法所需的 cardId 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 本次处理得到的结果。
 */
export function resolveUsedHandCardDestination(
  deckState: HandCardDeckState,
  playerHandState: PlayerHandState,
  cardId: HandCardId,
  catalog: HandCardCatalog,
): ResolveUsedHandCardDestinationResult {
  validateHandCardDeckState(deckState, catalog);
  validateSharedHandCardZones(deckState, [playerHandState], catalog);
  const handResult = resolveHandCardUse(playerHandState, cardId, catalog);

  if (handResult.destination === "hand") {
    const result: ResolveUsedHandCardDestinationResult = {
      deckState,
      playerHandState: handResult.state,
      cardId,
      destination: "hand",
      sizeStatus: handResult.sizeStatus,
    };

    validateSharedHandCardZones(result.deckState, [result.playerHandState], catalog);
    return result;
  }

  const result: ResolveUsedHandCardDestinationResult = {
    deckState: addHandCardToSharedDiscardPile(deckState, cardId, catalog),
    playerHandState: handResult.state,
    cardId,
    destination: "discard",
    sizeStatus: handResult.sizeStatus,
  };

  validateSharedHandCardZones(result.deckState, [result.playerHandState], catalog);
  return result;
}
