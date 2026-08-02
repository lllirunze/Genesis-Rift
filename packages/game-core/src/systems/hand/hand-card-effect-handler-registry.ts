import { HAND_CARD_EFFECT_EXECUTION_OUTCOMES, HAND_CARD_EFFECT_IDS } from "./hand-card-config.ts";
import {
  type HandCardEffectExecutionContext,
  validateHandCardEffectExecutionContext,
} from "./hand-card-effect-context.ts";
import {
  type HandCardEffectExecutionResult,
  type HandCardEffectHandler,
} from "./hand-card-effect-handler.ts";
import {
  type HandCardEffectDefinition,
  type HandCardEffectId,
  validateHandCardEffectDefinition,
} from "./hand-card-definition.ts";

export class HandCardEffectHandlerRegistry {
  private readonly handlers = new Map<HandCardEffectId, unknown>();

  register<EffectId extends HandCardEffectId, Output>(
    handler: HandCardEffectHandler<EffectId, Output>,
  ): void {
    assertSupportedEffectId(handler.effectId);

    if (this.handlers.has(handler.effectId)) {
      throw new Error(`Duplicate hand card effect handler: ${handler.effectId}`);
    }

    this.handlers.set(handler.effectId, handler);
  }

  has(effectId: HandCardEffectId): boolean {
    assertSupportedEffectId(effectId);
    return this.handlers.has(effectId);
  }

  get<EffectId extends HandCardEffectId>(
    effectId: EffectId,
  ): HandCardEffectHandler<EffectId, unknown> {
    assertSupportedEffectId(effectId);
    const handler = this.handlers.get(effectId);

    if (handler === undefined) {
      throw new Error(`Missing hand card effect handler: ${effectId}`);
    }

    return handler as HandCardEffectHandler<EffectId, unknown>;
  }

  execute(
    effect: HandCardEffectDefinition,
    context: HandCardEffectExecutionContext,
  ): HandCardEffectExecutionResult {
    validateHandCardEffectDefinition(effect);
    validateHandCardEffectExecutionContext(context);
    const handler = this.get(effect.effectId);
    const result = handler.execute(effect, context);

    validateExecutionResult(effect.effectId, result);

    return Object.freeze({ ...result });
  }
}

function validateExecutionResult(
  expectedEffectId: HandCardEffectId,
  result: HandCardEffectExecutionResult,
): void {
  if (result.effectId !== expectedEffectId) {
    throw new Error(
      `Hand card effect handler returned mismatched effect id: expected ${expectedEffectId}, received ${result.effectId}`,
    );
  }

  if (!HAND_CARD_EFFECT_EXECUTION_OUTCOMES.includes(result.outcome)) {
    throw new RangeError(`Unsupported hand card effect execution outcome: ${result.outcome}`);
  }
}

function assertSupportedEffectId(effectId: HandCardEffectId): void {
  if (!(HAND_CARD_EFFECT_IDS as readonly string[]).includes(effectId)) {
    throw new RangeError(`Unsupported hand card effect handler id: ${effectId}`);
  }
}
