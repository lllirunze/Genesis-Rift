import type { RandomStream } from "../random/core/random-stream.ts";
import type { HandCardDrawSource } from "./hand-card-acquisition-definition.ts";
import { HAND_CARD_DRAW_SOURCE_TYPES } from "./hand-card-config.ts";
import { drawHandCardFromDeck, type HandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardId } from "./hand-card-definition.ts";
import { prepareSharedHandCardDeckForDraw } from "./hand-card-flow.ts";
import {
  addHandCardToHand,
  getHandSizeStatus,
  type HandSizeStatus,
  type PlayerHandState,
} from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

/** 描述业务操作完成后返回的结果。 */
export interface AcquireHandCardsResult {
  readonly deckState: HandCardDeckState;
  readonly playerHandState: PlayerHandState;
  readonly source: HandCardDrawSource;
  readonly requestedAmount: number;
  readonly acquiredCardIds: readonly HandCardId[];
  readonly isComplete: boolean;
  readonly sizeStatus: HandSizeStatus;
}

/**
 * 方法名：acquireHandCardsFromSharedDeck
 * 作用：执行该方法负责的单一业务操作。
 * @param deckState 方法所需的 deckState 参数。
 * @param playerHandState 方法所需的 playerHandState 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @param randomStream 方法所需的 randomStream 参数。
 * @param source 方法所需的 source 参数。
 * @param amount 本次操作涉及的数量。
 * @returns 本次处理得到的结果。
 */
export function acquireHandCardsFromSharedDeck(
  deckState: HandCardDeckState,
  playerHandState: PlayerHandState,
  catalog: HandCardCatalog,
  randomStream: RandomStream,
  source: HandCardDrawSource,
  amount: number,
): AcquireHandCardsResult {
  validateDrawSource(source);
  assertPositiveSafeInteger(amount, "amount");
  validateSharedHandCardZones(deckState, [playerHandState], catalog);

  let nextDeckState = prepareSharedHandCardDeckForDraw(deckState, amount, catalog, randomStream);
  let nextPlayerHandState = playerHandState;
  const acquiredCardIds: HandCardId[] = [];

  for (let index = 0; index < amount; index += 1) {
    const drawResult = drawHandCardFromDeck(nextDeckState, catalog);

    if (drawResult.cardId === null) {
      break;
    }

    nextDeckState = drawResult.state;
    nextPlayerHandState = addHandCardToHand(nextPlayerHandState, drawResult.cardId, catalog).state;
    acquiredCardIds.push(drawResult.cardId);
  }

  const result = {
    deckState: nextDeckState,
    playerHandState: nextPlayerHandState,
    source,
    requestedAmount: amount,
    acquiredCardIds,
    isComplete: acquiredCardIds.length === amount,
    sizeStatus: getHandSizeStatus(nextPlayerHandState),
  };

  validateSharedHandCardZones(result.deckState, [result.playerHandState], catalog);
  return result;
}

/**
 * 方法名：validateDrawSource
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param source 方法所需的 source 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateDrawSource(source: HandCardDrawSource): void {
  if (!HAND_CARD_DRAW_SOURCE_TYPES.includes(source.type)) {
    throw new RangeError(`Unsupported hand card draw source: ${source.type}`);
  }

  if (source.sourceId.trim().length === 0) {
    throw new TypeError("Hand card draw source id must not be empty");
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
