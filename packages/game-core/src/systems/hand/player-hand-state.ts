import type { PlayerId } from "@genesis-rift/shared";

import type { HandCardDefinition, HandCardDefinitionCatalog } from "./hand-card-definition.ts";
import { validateHandCardDefinition } from "./hand-card-definition.ts";
import type { HandCardInstance } from "./hand-card-instance.ts";
import { validateHandCardInstance } from "./hand-card-instance.ts";

export const DEFAULT_HAND_SIZE_LIMIT = 6;
export const DEFAULT_INITIAL_HAND_SIZE = 2;

export interface PlayerHandState {
  readonly playerId: PlayerId;
  readonly sizeLimit: number;
  readonly handCards: readonly HandCardInstance[];
}

export interface HandSizeStatus {
  readonly cardCount: number;
  readonly sizeLimit: number;
  readonly requiredDiscardCount: number;
  readonly isOverLimit: boolean;
}

export interface AddHandCardToHandResult {
  readonly state: PlayerHandState;
  readonly sizeStatus: HandSizeStatus;
}

export interface RemoveHandCardFromHandResult {
  readonly state: PlayerHandState;
  readonly card: HandCardInstance;
  readonly sizeStatus: HandSizeStatus;
}

export interface ResolveHandCardResult {
  readonly state: PlayerHandState;
  readonly card: HandCardInstance;
  readonly destination: "discard" | "hand";
  readonly sizeStatus: HandSizeStatus;
}

export function createPlayerHandState(
  playerId: PlayerId,
  sizeLimit: number = DEFAULT_HAND_SIZE_LIMIT,
): PlayerHandState {
  assertNonNegativeSafeInteger(sizeLimit, "sizeLimit");

  return {
    playerId,
    sizeLimit,
    handCards: [],
  };
}

export function validatePlayerHandState(
  state: PlayerHandState,
  definitions: HandCardDefinitionCatalog,
): void {
  assertNonNegativeSafeInteger(state.sizeLimit, "sizeLimit");
  const instanceIds = new Set<string>();

  for (const card of state.handCards) {
    if (instanceIds.has(card.instanceId)) {
      throw new Error(`Duplicate hand card instance id: ${card.instanceId}`);
    }

    const definition = getDefinition(definitions, card.definitionId);
    validateHandCardInstance(card, definition);
    instanceIds.add(card.instanceId);
  }
}

export function getHandSizeStatus(state: PlayerHandState): HandSizeStatus {
  const requiredDiscardCount = Math.max(0, state.handCards.length - state.sizeLimit);

  return {
    cardCount: state.handCards.length,
    sizeLimit: state.sizeLimit,
    requiredDiscardCount,
    isOverLimit: requiredDiscardCount > 0,
  };
}

export function setHandSizeLimit(
  state: PlayerHandState,
  definitions: HandCardDefinitionCatalog,
  sizeLimit: number,
): AddHandCardToHandResult {
  validatePlayerHandState(state, definitions);
  assertNonNegativeSafeInteger(sizeLimit, "sizeLimit");
  const nextState = { ...state, sizeLimit };

  return {
    state: nextState,
    sizeStatus: getHandSizeStatus(nextState),
  };
}

export function addHandCardToHand(
  state: PlayerHandState,
  card: HandCardInstance,
  definitions: HandCardDefinitionCatalog,
): AddHandCardToHandResult {
  validatePlayerHandState(state, definitions);
  const definition = getDefinition(definitions, card.definitionId);
  validateHandCardInstance(card, definition);

  if (containsInstance(state, card.instanceId)) {
    throw new Error(`Duplicate hand card instance id: ${card.instanceId}`);
  }

  const nextState = { ...state, handCards: [...state.handCards, card] };

  return {
    state: nextState,
    sizeStatus: getHandSizeStatus(nextState),
  };
}

export function discardHandCard(
  state: PlayerHandState,
  instanceId: string,
  definitions: HandCardDefinitionCatalog,
): RemoveHandCardFromHandResult {
  validatePlayerHandState(state, definitions);
  const card = getCardFromHand(state, instanceId);
  const nextState = {
    ...state,
    handCards: state.handCards.filter((candidate) => candidate.instanceId !== instanceId),
  };

  return {
    state: nextState,
    card,
    sizeStatus: getHandSizeStatus(nextState),
  };
}

export function resolveHandCardUse(
  state: PlayerHandState,
  instanceId: string,
  definitions: HandCardDefinitionCatalog,
): ResolveHandCardResult {
  validatePlayerHandState(state, definitions);
  const card = getCardFromHand(state, instanceId);
  const definition = getDefinition(definitions, card.definitionId);

  if (definition.destinationAfterResolution === "hand") {
    return {
      state,
      card,
      destination: "hand",
      sizeStatus: getHandSizeStatus(state),
    };
  }

  const result = discardHandCard(state, instanceId, definitions);

  return {
    state: result.state,
    card,
    destination: "discard",
    sizeStatus: result.sizeStatus,
  };
}

export function getHandCardFromHand(
  state: PlayerHandState,
  instanceId: string,
): HandCardInstance | null {
  return state.handCards.find((card) => card.instanceId === instanceId) ?? null;
}

function getCardFromHand(state: PlayerHandState, instanceId: string): HandCardInstance {
  const card = getHandCardFromHand(state, instanceId);

  if (card === null) {
    throw new Error(`Hand card is not in hand: ${instanceId}`);
  }

  return card;
}

function containsInstance(state: PlayerHandState, instanceId: string): boolean {
  return state.handCards.some((card) => card.instanceId === instanceId);
}

function getDefinition(
  definitions: HandCardDefinitionCatalog,
  definitionId: string,
): HandCardDefinition {
  const definition = definitions[definitionId];

  if (definition === undefined) {
    throw new Error(`Missing hand card definition: ${definitionId}`);
  }

  validateHandCardDefinition(definition);
  return definition;
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
