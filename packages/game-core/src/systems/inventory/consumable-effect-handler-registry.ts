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

/** 封装该模块的状态与操作入口。 */
export class ConsumableEffectHandlerRegistry {
  readonly #handlers = new Map<ConsumableEffectId, unknown>();

  /**
   * 方法名：register
   * 作用：执行该方法负责的单一业务操作。
   * @param handler 方法所需的 handler 参数。
   * @returns 无返回值。
   */
  register<EffectId extends ConsumableEffectId, Output>(
    handler: ConsumableEffectHandler<EffectId, Output>,
  ): void {
    assertSupportedEffectId(handler.effectId);

    if (this.#handlers.has(handler.effectId)) {
      throw new Error(`Duplicate consumable effect handler: ${handler.effectId}`);
    }

    this.#handlers.set(handler.effectId, handler);
  }

  /**
   * 方法名：get
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @param effectId 方法所需的 effectId 参数。
   * @returns 本次处理得到的结果。
   */
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

  /**
   * 方法名：execute
   * 作用：执行该方法负责的业务规则并返回结算结果。
   * @param effect 方法所需的 effect 参数。
   * @param context 本次操作所需的上下文。
   * @returns 本次处理得到的结果。
   */
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

/**
 * 方法名：validateContext
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param context 本次操作所需的上下文。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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

/**
 * 方法名：assertSupportedEffectId
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param effectId 方法所需的 effectId 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertSupportedEffectId(effectId: ConsumableEffectId): void {
  if (!(CONSUMABLE_EFFECT_IDS as readonly string[]).includes(effectId)) {
    throw new RangeError(`Unsupported consumable effect handler id: ${effectId}`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
