import {
  createHandCardEffectExecutionContext,
  type CreateHandCardEffectExecutionContextInput,
  type HandCardEffectExecutionContext,
} from "./hand-card-effect-context.ts";
import type { HandCardEffectExecutionResult } from "./hand-card-effect-handler.ts";
import type { HandCardEffectHandlerRegistry } from "./hand-card-effect-handler-registry.ts";
import { HandCardEffectStateChannel } from "./hand-card-effect-state-channel.ts";
import type { HandCardDeckState } from "./hand-card-deck-state.ts";
import {
  type HandCardCatalog,
  type HandCardDefinition,
  type HandCardDestination,
  type HandCardEffectId,
  type HandCardId,
  validateHandCardDefinition,
} from "./hand-card-definition.ts";
import type { PlayerHandState } from "./player-hand-state.ts";
import { resolveUsedHandCardDestination } from "./resolve-used-hand-card.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

export type ExecuteHandCardEffectsContextInput = Omit<
  CreateHandCardEffectExecutionContextInput,
  "effectIndex" | "handCardStateChannel"
>;

export interface ExecuteHandCardEffectsResult {
  readonly outcome: "resolved";
  readonly cardId: HandCardId;
  readonly effectResults: readonly HandCardEffectExecutionResult[];
  readonly destination: HandCardDestination;
  readonly deckState: HandCardDeckState;
  readonly playerHandState: PlayerHandState;
}

export class HandCardEffectSequenceExecutionError extends Error {
  readonly cardId: HandCardId;
  readonly failedEffectIndex: number;
  readonly failedEffectId: HandCardEffectId;
  readonly completedEffectResults: readonly HandCardEffectExecutionResult[];

  constructor(input: {
    readonly cardId: HandCardId;
    readonly failedEffectIndex: number;
    readonly failedEffectId: HandCardEffectId;
    readonly completedEffectResults: readonly HandCardEffectExecutionResult[];
    readonly cause: unknown;
  }) {
    super(
      `Hand card effect execution failed at index ${input.failedEffectIndex}: ${input.failedEffectId}`,
      { cause: input.cause },
    );
    this.name = "HandCardEffectSequenceExecutionError";
    this.cardId = input.cardId;
    this.failedEffectIndex = input.failedEffectIndex;
    this.failedEffectId = input.failedEffectId;
    this.completedEffectResults = Object.freeze([...input.completedEffectResults]);
  }
}

export function executeHandCardEffects(
  deckState: HandCardDeckState,
  playerHandState: PlayerHandState,
  catalog: HandCardCatalog,
  registry: HandCardEffectHandlerRegistry,
  contextInput: ExecuteHandCardEffectsContextInput,
): ExecuteHandCardEffectsResult {
  validateSharedHandCardZones(deckState, [playerHandState], catalog);
  const card = getOwnedHandCard(playerHandState, catalog, contextInput.cardId);
  assertSourcePlayer(playerHandState, contextInput.sourcePlayerId);
  const stateChannel = HandCardEffectStateChannel.create(
    { deckState, playerHandStates: [playerHandState] },
    catalog,
  );
  const effectContexts = preflightEffects(card, registry, contextInput, stateChannel);
  const effectResults: HandCardEffectExecutionResult[] = [];

  for (let effectIndex = 0; effectIndex < card.effects.length; effectIndex += 1) {
    const effect = card.effects[effectIndex]!;

    try {
      effectResults.push(registry.execute(effect, effectContexts[effectIndex]!));
    } catch (cause) {
      throw new HandCardEffectSequenceExecutionError({
        cardId: card.cardId,
        failedEffectIndex: effectIndex,
        failedEffectId: effect.effectId,
        completedEffectResults: effectResults,
        cause,
      });
    }
  }

  const latestPlayerHandState = stateChannel.getPlayerHandState(playerHandState.playerId);

  if (latestPlayerHandState === null) {
    throw new Error(`Hand card effect state channel lost player: ${playerHandState.playerId}`);
  }

  const destination = resolveUsedHandCardDestination(
    stateChannel.getDeckState(),
    latestPlayerHandState,
    card.cardId,
    catalog,
  );
  stateChannel.updateDeckAndPlayerHand(destination.deckState, destination.playerHandState);

  return Object.freeze({
    outcome: "resolved",
    cardId: card.cardId,
    effectResults: Object.freeze([...effectResults]),
    destination: destination.destination,
    deckState: destination.deckState,
    playerHandState: destination.playerHandState,
  });
}

function preflightEffects(
  card: HandCardDefinition,
  registry: HandCardEffectHandlerRegistry,
  contextInput: ExecuteHandCardEffectsContextInput,
  stateChannel: HandCardEffectStateChannel,
): readonly HandCardEffectExecutionContext[] {
  const contexts = card.effects.map((effect, effectIndex) => {
    registry.get(effect.effectId);

    return createHandCardEffectExecutionContext({
      ...contextInput,
      effectIndex,
      handCardStateChannel: stateChannel,
    });
  });

  return Object.freeze(contexts);
}

function getOwnedHandCard(
  playerHandState: PlayerHandState,
  catalog: HandCardCatalog,
  cardId: HandCardId,
): HandCardDefinition {
  const card = catalog[cardId];

  if (card === undefined) {
    throw new Error(`Missing hand card in catalog: ${cardId}`);
  }

  validateHandCardDefinition(card);

  if (!playerHandState.handCardIds.includes(cardId)) {
    throw new Error(`Hand card is not in hand: ${cardId}`);
  }

  return card;
}

function assertSourcePlayer(playerHandState: PlayerHandState, sourcePlayerId: string): void {
  if (playerHandState.playerId !== sourcePlayerId) {
    throw new Error(`Hand card source player does not own the hand: ${sourcePlayerId}`);
  }
}
