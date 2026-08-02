import type { PlayerId } from "@genesis-rift/shared";

import { type HandCardDeckState, validateHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardId } from "./hand-card-definition.ts";
import { type PlayerHandState, validatePlayerHandState } from "./player-hand-state.ts";

/**
 * 方法名：validateSharedHandCardZones
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param deckState 方法所需的 deckState 参数。
 * @param playerHandStates 方法所需的 playerHandStates 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateSharedHandCardZones(
  deckState: HandCardDeckState,
  playerHandStates: readonly PlayerHandState[],
  catalog: HandCardCatalog,
): void {
  validateHandCardDeckState(deckState, catalog);

  const playerIds = new Set<PlayerId>();
  const cardLocations = new Map<HandCardId, string>();

  for (const cardId of deckState.drawPile) {
    registerCardLocation(cardLocations, cardId, "shared draw pile");
  }

  for (const cardId of deckState.discardPile) {
    registerCardLocation(cardLocations, cardId, "shared discard pile");
  }

  for (const playerHandState of playerHandStates) {
    validatePlayerHandState(playerHandState, catalog);

    if (playerIds.has(playerHandState.playerId)) {
      throw new Error(`Duplicate player hand state: ${playerHandState.playerId}`);
    }

    playerIds.add(playerHandState.playerId);

    for (const cardId of playerHandState.handCardIds) {
      registerCardLocation(cardLocations, cardId, `player hand ${playerHandState.playerId}`);
    }
  }
}

/**
 * 方法名：registerCardLocation
 * 作用：执行该方法负责的单一业务操作。
 * @param cardLocations 方法所需的 cardLocations 参数。
 * @param cardId 方法所需的 cardId 参数。
 * @param location 方法所需的 location 参数。
 * @returns 无返回值。
 */
function registerCardLocation(
  cardLocations: Map<HandCardId, string>,
  cardId: HandCardId,
  location: string,
): void {
  const existingLocation = cardLocations.get(cardId);

  if (existingLocation !== undefined) {
    throw new Error(
      `Hand card ${cardId} exists in multiple zones: ${existingLocation}, ${location}`,
    );
  }

  cardLocations.set(cardId, location);
}
