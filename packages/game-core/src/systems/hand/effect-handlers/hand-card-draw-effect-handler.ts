import { acquireHandCardsFromSharedDeck } from "../acquire-hand-cards.ts";
import type { HandCardCatalog, HandCardId } from "../hand-card-definition.ts";
import type { HandCardEffectHandler } from "../hand-card-effect-handler.ts";
import type { HandSizeStatus } from "../player-hand-state.ts";
import { getPlayerEffectTargetIds } from "./player-effect-targets.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface HandCardDrawEffectHandlerDependencies {
  readonly catalog: HandCardCatalog;
}

/** 描述业务操作完成后返回的结果。 */
export interface HandCardDrawTargetResult {
  readonly targetPlayerId: string;
  readonly requestedAmount: number;
  readonly acquiredCardIds: readonly HandCardId[];
  readonly isComplete: boolean;
  readonly sizeStatus: HandSizeStatus;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface HandCardDrawEffectOutput {
  readonly targets: readonly HandCardDrawTargetResult[];
}

/**
 * 方法名：createHandCardDrawEffectHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @param dependencies 方法所需的 dependencies 参数。
 * @returns 本次处理得到的结果。
 */
export function createHandCardDrawEffectHandler(
  dependencies: HandCardDrawEffectHandlerDependencies,
): HandCardEffectHandler<"handCard.draw", HandCardDrawEffectOutput> {
  return {
    effectId: "handCard.draw",
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param effect 方法所需的 effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(effect, context) {
      const stateChannel = context.handCardStateChannel;

      if (stateChannel === null) {
        throw new Error("handCard.draw requires a hand card state channel");
      }

      if (context.randomStream === null) {
        throw new Error("handCard.draw requires a deck random stream");
      }

      const targetResults: HandCardDrawTargetResult[] = [];
      let totalAcquired = 0;

      for (const targetPlayerId of getPlayerEffectTargetIds(context)) {
        const playerHandState = stateChannel.getPlayerHandState(targetPlayerId);

        if (playerHandState === null) {
          continue;
        }

        const result = acquireHandCardsFromSharedDeck(
          stateChannel.getDeckState(),
          playerHandState,
          dependencies.catalog,
          context.randomStream,
          { type: "specialEffect", sourceId: context.executionId },
          effect.parameters.amount,
        );
        stateChannel.updateDeckAndPlayerHand(result.deckState, result.playerHandState);
        totalAcquired += result.acquiredCardIds.length;
        targetResults.push({
          targetPlayerId,
          requestedAmount: result.requestedAmount,
          acquiredCardIds: result.acquiredCardIds,
          isComplete: result.isComplete,
          sizeStatus: result.sizeStatus,
        });
      }

      if (targetResults.length === 0 || totalAcquired === 0) {
        return { effectId: "handCard.draw", outcome: "skipped", output: null };
      }

      return {
        effectId: "handCard.draw",
        outcome: "applied",
        output: { targets: targetResults },
      };
    },
  };
}
