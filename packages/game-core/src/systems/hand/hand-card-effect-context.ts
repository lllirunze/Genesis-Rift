import type { GameId, PlayerId, TileId } from "@genesis-rift/shared";

import type { RandomStream } from "../random/core/random-stream.ts";
import { HAND_CARD_RESPONSE_TYPES, HAND_CARD_TARGET_TYPES } from "./hand-card-config.ts";
import type {
  HandCardId,
  HandCardResponseType,
  HandCardTargetType,
  HandCardUsageTiming,
} from "./hand-card-definition.ts";
import type { HandCardEffectStateChannel } from "./hand-card-effect-state-channel.ts";

export interface HandCardEffectTargetReference {
  readonly type: HandCardTargetType;
  readonly targetId: string;
}

export interface HandCardEffectExecutionScope {
  readonly eventId: string | null;
  readonly battleId: string | null;
  readonly mapId: string | null;
  readonly tileId: TileId | null;
}

export interface HandCardEffectExecutionContext {
  readonly executionId: string;
  readonly gameId: GameId;
  readonly cardId: HandCardId;
  readonly effectIndex: number;
  readonly sourcePlayerId: PlayerId;
  readonly timing: HandCardUsageTiming;
  readonly responseType: HandCardResponseType | null;
  readonly triggerId: string | null;
  readonly targets: readonly HandCardEffectTargetReference[];
  readonly scope: HandCardEffectExecutionScope;
  readonly randomStream: RandomStream | null;
  readonly handCardStateChannel: HandCardEffectStateChannel | null;
}

export interface CreateHandCardEffectExecutionContextInput {
  readonly executionId: string;
  readonly gameId: GameId;
  readonly cardId: HandCardId;
  readonly effectIndex: number;
  readonly sourcePlayerId: PlayerId;
  readonly timing: HandCardUsageTiming;
  readonly responseType?: HandCardResponseType | null;
  readonly triggerId?: string | null;
  readonly targets?: readonly HandCardEffectTargetReference[];
  readonly scope?: Partial<HandCardEffectExecutionScope>;
  readonly randomStream?: RandomStream | null;
  readonly handCardStateChannel?: HandCardEffectStateChannel | null;
}

export function createHandCardEffectExecutionContext(
  input: CreateHandCardEffectExecutionContextInput,
): HandCardEffectExecutionContext {
  const context: HandCardEffectExecutionContext = {
    executionId: input.executionId,
    gameId: input.gameId,
    cardId: input.cardId,
    effectIndex: input.effectIndex,
    sourcePlayerId: input.sourcePlayerId,
    timing: input.timing,
    responseType: input.responseType ?? null,
    triggerId: input.triggerId ?? null,
    targets: input.targets ?? [],
    scope: {
      eventId: input.scope?.eventId ?? null,
      battleId: input.scope?.battleId ?? null,
      mapId: input.scope?.mapId ?? null,
      tileId: input.scope?.tileId ?? null,
    },
    randomStream: input.randomStream ?? null,
    handCardStateChannel: input.handCardStateChannel ?? null,
  };

  validateHandCardEffectExecutionContext(context);

  return Object.freeze({
    ...context,
    targets: Object.freeze(context.targets.map((target) => Object.freeze({ ...target }))),
    scope: Object.freeze({ ...context.scope }),
  });
}

export function validateHandCardEffectExecutionContext(
  context: HandCardEffectExecutionContext,
): void {
  assertNonEmptyString(context.executionId, "executionId");
  assertNonEmptyString(context.gameId, "gameId");
  assertPositiveSafeInteger(context.cardId, "cardId");
  assertNonNegativeSafeInteger(context.effectIndex, "effectIndex");
  assertNonEmptyString(context.sourcePlayerId, "sourcePlayerId");
  validateResponseContext(context);
  validateTargets(context.targets);
  validateScope(context.scope);
}

function validateResponseContext(context: HandCardEffectExecutionContext): void {
  if (context.timing === "active") {
    if (context.responseType !== null || context.triggerId !== null) {
      throw new Error("Active hand card effects must not declare response context");
    }

    return;
  }

  if (context.timing !== "response") {
    throw new RangeError(`Unsupported hand card usage timing: ${context.timing as string}`);
  }

  if (
    context.responseType === null ||
    !(HAND_CARD_RESPONSE_TYPES as readonly string[]).includes(context.responseType)
  ) {
    throw new Error("Response hand card effects must declare a supported response type");
  }

  if (context.triggerId === null) {
    throw new Error("Response hand card effects must declare a trigger id");
  }

  assertNonEmptyString(context.triggerId, "triggerId");
}

function validateTargets(targets: readonly HandCardEffectTargetReference[]): void {
  const targetKeys = new Set<string>();

  for (const target of targets) {
    if (!(HAND_CARD_TARGET_TYPES as readonly string[]).includes(target.type)) {
      throw new RangeError(`Unsupported hand card effect target type: ${target.type}`);
    }

    assertNonEmptyString(target.targetId, "targetId");
    const targetKey = `${target.type.length}:${target.type}|${target.targetId}`;

    if (targetKeys.has(targetKey)) {
      throw new Error(`Duplicate hand card effect target: ${target.type}:${target.targetId}`);
    }

    targetKeys.add(targetKey);
  }
}

function validateScope(scope: HandCardEffectExecutionScope): void {
  assertOptionalNonEmptyString(scope.eventId, "eventId");
  assertOptionalNonEmptyString(scope.battleId, "battleId");
  assertOptionalNonEmptyString(scope.mapId, "mapId");
  assertOptionalNonEmptyString(scope.tileId, "tileId");

  if (scope.tileId !== null && scope.mapId === null) {
    throw new Error("Hand card effect tile scope requires a map id");
  }
}

function assertOptionalNonEmptyString(value: string | null, field: string): void {
  if (value !== null) {
    assertNonEmptyString(value, field);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
