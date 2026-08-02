import { acquireHandCardsFromSharedDeck } from "../acquire-hand-cards.ts";
import type { HandCardCatalog, HandCardId } from "../hand-card-definition.ts";
import type { HandCardEffectHandler } from "../hand-card-effect-handler.ts";
import type { HandSizeStatus } from "../player-hand-state.ts";
import { getPlayerEffectTargetIds } from "./player-effect-targets.ts";

export interface HandCardDrawEffectHandlerDependencies {
  readonly catalog: HandCardCatalog;
}

export interface HandCardDrawTargetResult {
  readonly targetPlayerId: string;
  readonly requestedAmount: number;
  readonly acquiredCardIds: readonly HandCardId[];
  readonly isComplete: boolean;
  readonly sizeStatus: HandSizeStatus;
}

export interface HandCardDrawEffectOutput {
  readonly targets: readonly HandCardDrawTargetResult[];
}

export function createHandCardDrawEffectHandler(
  dependencies: HandCardDrawEffectHandlerDependencies,
): HandCardEffectHandler<"handCard.draw", HandCardDrawEffectOutput> {
  return {
    effectId: "handCard.draw",
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
