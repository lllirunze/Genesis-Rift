import { EVENT_EFFECT_IDS } from "./event-effect-config.ts";
import {
  validateEventEffectDefinition,
  type EventEffectDefinition,
  type EventEffectId,
} from "./event-effect-definition.ts";
import type {
  EventEffectExecutionContext,
  EventEffectExecutionResult,
  EventEffectHandler,
} from "./event-effect-handler.ts";
import { EVENT_EFFECT_EXECUTION_OUTCOMES } from "./event-runtime-config.ts";

/** 统一注册并调用各业务模块提供的事件效果处理器。 */
export class EventEffectHandlerRegistry {
  readonly #handlers = new Map<EventEffectId, unknown>();

  /**
   * 方法名：register
   * 作用：注册一种事件效果处理器，并禁止相同效果重复注册。
   * @param handler 需要加入注册表的类型安全效果处理器。
   * @returns 无返回值。
   * @throws 效果标识不受支持或已经注册时抛出错误。
   */
  register<EffectId extends EventEffectId, Output>(
    handler: EventEffectHandler<EffectId, Output>,
  ): void {
    assertSupportedEffectId(handler.effectId);

    if (this.#handlers.has(handler.effectId)) {
      throw new Error(`Duplicate event effect handler: ${handler.effectId}`);
    }

    this.#handlers.set(handler.effectId, handler);
  }

  /**
   * 方法名：get
   * 作用：读取指定标识对应的事件效果处理器。
   * @param effectId 需要查询的标准事件效果标识。
   * @returns 已注册的类型安全效果处理器。
   * @throws 效果标识不受支持或尚未注册时抛出错误。
   */
  get<EffectId extends EventEffectId>(effectId: EffectId): EventEffectHandler<EffectId, unknown> {
    assertSupportedEffectId(effectId);
    const handler = this.#handlers.get(effectId);

    if (handler === undefined) {
      throw new Error(`Missing event effect handler: ${effectId}`);
    }

    return handler as EventEffectHandler<EffectId, unknown>;
  }

  /**
   * 方法名：execute
   * 作用：通过注册表执行单项事件效果并校验处理器返回结果。
   * @param effect 需要执行的标准事件效果定义。
   * @param context 当前事件实例与效果位置组成的执行上下文。
   * @returns 经过校验并冻结的事件效果执行结果。
   * @throws 效果、上下文或处理器返回值非法时抛出错误。
   */
  execute(
    effect: EventEffectDefinition,
    context: EventEffectExecutionContext,
  ): EventEffectExecutionResult {
    validateEventEffectDefinition(effect);
    validateContext(context);
    const result = this.get(effect.effectId).execute(effect, context);

    if (result.effectKey !== effect.effectKey || result.effectId !== effect.effectId) {
      throw new Error(`Event effect handler returned mismatched identity: ${effect.effectKey}`);
    }

    if (!EVENT_EFFECT_EXECUTION_OUTCOMES.includes(result.outcome)) {
      throw new RangeError(`Unsupported event effect execution outcome: ${result.outcome}`);
    }

    return Object.freeze({ ...result });
  }
}

/**
 * 方法名：validateContext
 * 作用：校验事件效果执行上下文中的标识与回合字段。
 * @param context 需要校验的事件效果执行上下文。
 * @returns 无返回值。
 * @throws 上下文字段非法时抛出错误。
 */
function validateContext(context: EventEffectExecutionContext): void {
  assertNonEmptyString(context.instanceId, "instanceId");
  assertNonEmptyString(context.eventId, "eventId");

  if (context.triggeringPlayerId !== null) {
    assertNonEmptyString(context.triggeringPlayerId, "triggeringPlayerId");
  }

  if (context.selectedOptionId !== null) {
    assertNonEmptyString(context.selectedOptionId, "selectedOptionId");
  }

  if (!Number.isSafeInteger(context.effectIndex) || context.effectIndex < 0) {
    throw new RangeError("effectIndex must be a non-negative safe integer");
  }

  if (!Number.isSafeInteger(context.resolvedAtTurn) || context.resolvedAtTurn <= 0) {
    throw new RangeError("resolvedAtTurn must be a positive safe integer");
  }
}

/**
 * 方法名：assertSupportedEffectId
 * 作用：校验处理器使用项目已声明的标准事件效果标识。
 * @param effectId 需要校验的事件效果标识。
 * @returns 无返回值。
 * @throws 效果标识不受支持时抛出错误。
 */
function assertSupportedEffectId(effectId: EventEffectId): void {
  if (!(EVENT_EFFECT_IDS as readonly string[]).includes(effectId)) {
    throw new RangeError(`Unsupported event effect handler id: ${effectId}`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验字符串包含有效内容。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
