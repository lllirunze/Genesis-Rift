import {
  CONSUMABLE_EFFECT_EXECUTION_OUTCOMES,
  CONSUMABLE_EFFECT_IDS,
} from "./consumable-effect-config.ts";
import {
  validateConsumableEffectDefinition,
  type ConsumableEffectDefinition,
  type ConsumableEffectId,
} from "./consumable-definition.ts";
import type {
  ConsumableEffectExecutionContext,
  ConsumableEffectExecutionResult,
  ConsumableEffectHandler,
} from "./consumable-effect-handler.ts";

export class ConsumableEffectHandlerRegistry {
  readonly #handlers = new Map<ConsumableEffectId, unknown>();

  register<EffectId extends ConsumableEffectId, Output>(
    handler: ConsumableEffectHandler<EffectId, Output>,
  ): void {
    assertSupportedEffectId(handler.effectId);

    if (this.#handlers.has(handler.effectId)) {
      throw new Error(`Duplicate consumable effect handler: ${handler.effectId}`);
    }

    this.#handlers.set(handler.effectId, handler);
  }

  get<EffectId extends ConsumableEffectId>(
    effectId: EffectId,
  ): ConsumableEffectHandler<EffectId, unknown> {
    assertSupportedEffectId(effectId);
    const handler = this.#handlers.get(effectId);

    if (handler === undefined) {
      throw new Error(`Missing consumable effect handler: ${effectId}`);
    }

    return handler as ConsumableEffectHandler<EffectId, unknown>;
  }

  execute(
    effect: ConsumableEffectDefinition,
    context: ConsumableEffectExecutionContext,
  ): ConsumableEffectExecutionResult {
    validateConsumableEffectDefinition(effect);
    validateContext(context);
    const result = this.get(effect.effectId).execute(effect, context);

    if (result.effectId !== effect.effectId) {
      throw new Error(
        `Consumable effect handler returned mismatched effect id: expected ${effect.effectId}, received ${result.effectId}`,
      );
    }

    if (!CONSUMABLE_EFFECT_EXECUTION_OUTCOMES.includes(result.outcome)) {
      throw new RangeError(`Unsupported consumable effect outcome: ${result.outcome}`);
    }

    return result;
  }
}

function validateContext(context: ConsumableEffectExecutionContext): void {
  assertNonEmptyString(context.playerId, "playerId");
  assertNonEmptyString(context.itemDefinitionId, "itemDefinitionId");

  if (!Number.isSafeInteger(context.effectIndex) || context.effectIndex < 0) {
    throw new RangeError("effectIndex must be a non-negative safe integer");
  }

  if (!Number.isSafeInteger(context.createdAtSequence) || context.createdAtSequence < 0) {
    throw new RangeError("createdAtSequence must be a non-negative safe integer");
  }
}

function assertSupportedEffectId(effectId: ConsumableEffectId): void {
  if (!(CONSUMABLE_EFFECT_IDS as readonly string[]).includes(effectId)) {
    throw new RangeError(`Unsupported consumable effect handler id: ${effectId}`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
