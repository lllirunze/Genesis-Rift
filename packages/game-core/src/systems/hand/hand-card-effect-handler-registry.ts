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

/** 封装该模块的状态与操作入口。 */
export class HandCardEffectHandlerRegistry {
  private readonly handlers = new Map<HandCardEffectId, unknown>();

  /**
   * 方法名：register
   * 作用：执行该方法负责的单一业务操作。
   * @param handler 方法所需的 handler 参数。
   * @returns 无返回值。
   */
  register<EffectId extends HandCardEffectId, Output>(
    handler: HandCardEffectHandler<EffectId, Output>,
  ): void {
    assertSupportedEffectId(handler.effectId);

    if (this.handlers.has(handler.effectId)) {
      throw new Error(`Duplicate hand card effect handler: ${handler.effectId}`);
    }

    this.handlers.set(handler.effectId, handler);
  }

  /**
   * 方法名：has
   * 作用：判断输入是否满足当前业务条件。
   * @param effectId 方法所需的 effectId 参数。
   * @returns 本次处理得到的结果。
   */
  has(effectId: HandCardEffectId): boolean {
    assertSupportedEffectId(effectId);
    return this.handlers.has(effectId);
  }

  /**
   * 方法名：get
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @param effectId 方法所需的 effectId 参数。
   * @returns 本次处理得到的结果。
   */
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

  /**
   * 方法名：execute
   * 作用：执行该方法负责的业务规则并返回结算结果。
   * @param effect 方法所需的 effect 参数。
   * @param context 本次操作所需的上下文。
   * @returns 本次处理得到的结果。
   */
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

/**
 * 方法名：validateExecutionResult
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param expectedEffectId 方法所需的 expectedEffectId 参数。
 * @param result 方法所需的 result 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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

/**
 * 方法名：assertSupportedEffectId
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param effectId 方法所需的 effectId 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertSupportedEffectId(effectId: HandCardEffectId): void {
  if (!(HAND_CARD_EFFECT_IDS as readonly string[]).includes(effectId)) {
    throw new RangeError(`Unsupported hand card effect handler id: ${effectId}`);
  }
}
