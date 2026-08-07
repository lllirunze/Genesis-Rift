import type { EventDefinition } from "./event-definition.ts";
import type { EventEffectDefinition, EventEffectId } from "./event-effect-definition.ts";
import type { EventEffectExecutionResult } from "./event-effect-handler.ts";
import type { EventEffectHandlerRegistry } from "./event-effect-handler-registry.ts";
import type {
  EventInstance,
  ResolvedEventInstance,
  ResolvingEventInstance,
  RevealedEventInstance,
} from "./event-instance.ts";
import { validateEventInstance } from "./event-instance.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import { evaluateEventConditionExpression } from "./evaluate-event-condition.ts";

/** 描述玩家选择事件选项时所需的输入。 */
export interface SelectEventOptionInput {
  readonly actingPlayerId: string;
  readonly optionId: string;
  readonly selectedAtTurn: number;
  readonly conditionContext: EventConditionEvaluationContext;
}

/** 描述直接结算事件开始执行时所需的输入。 */
export interface BeginDirectEventResolutionInput {
  readonly startedAtTurn: number;
}

/** 描述事件效果序列完成结算时所需的输入。 */
export interface CompleteEventResolutionInput {
  readonly resolvedAtTurn: number;
}

/** 表示 STOP 效果执行失败后中断了整个事件效果序列。 */
export class EventEffectSequenceExecutionError extends Error {
  readonly instanceId: string;
  readonly failedEffectIndex: number;
  readonly failedEffectId: EventEffectId;
  readonly completedEffectResults: readonly EventEffectExecutionResult[];

  constructor(input: {
    readonly instanceId: string;
    readonly failedEffectIndex: number;
    readonly failedEffectId: EventEffectId;
    readonly completedEffectResults: readonly EventEffectExecutionResult[];
    readonly cause: unknown;
  }) {
    super(
      `Event effect execution failed at index ${input.failedEffectIndex}: ${input.failedEffectId}`,
      { cause: input.cause },
    );
    this.name = "EventEffectSequenceExecutionError";
    this.instanceId = input.instanceId;
    this.failedEffectIndex = input.failedEffectIndex;
    this.failedEffectId = input.failedEffectId;
    this.completedEffectResults = Object.freeze([...input.completedEffectResults]);
  }
}

/**
 * 方法名：beginDirectEventResolution
 * 作用：将已揭露的直接结算事件迁移到效果执行状态。
 * @param instance 已经揭露且尚未开始结算的事件实例。
 * @param definition 与实例对应的直接结算事件定义。
 * @param input 开始结算的回合信息。
 * @returns 未选择玩家选项的结算中事件实例。
 * @throws 实例、定义、结算类型或回合非法时抛出错误。
 */
export function beginDirectEventResolution(
  instance: RevealedEventInstance,
  definition: EventDefinition,
  input: BeginDirectEventResolutionInput,
): ResolvingEventInstance {
  validateResolutionTransition(instance, definition, input.startedAtTurn);

  if (definition.resolution.type !== "DIRECT") {
    throw new Error("Choice events require a player option selection");
  }

  return {
    ...instance,
    status: "RESOLVING",
    resolvingAtTurn: input.startedAtTurn,
    selectedOptionId: null,
  };
}

/**
 * 方法名：selectEventOption
 * 作用：校验触发玩家与选项条件，并将选项事件迁移到效果执行状态。
 * @param instance 已经揭露且尚未开始结算的事件实例。
 * @param definition 与实例对应的选项事件定义。
 * @param input 操作玩家、选项标识、回合及条件上下文。
 * @returns 保存所选选项的结算中事件实例。
 * @throws 操作玩家、选项、条件或状态不满足要求时抛出错误。
 */
export function selectEventOption(
  instance: RevealedEventInstance,
  definition: EventDefinition,
  input: SelectEventOptionInput,
): ResolvingEventInstance {
  validateResolutionTransition(instance, definition, input.selectedAtTurn);
  assertNonEmptyString(input.actingPlayerId, "actingPlayerId");
  assertNonEmptyString(input.optionId, "optionId");

  if (definition.resolution.type !== "CHOICE") {
    throw new Error("Direct events do not accept player option selections");
  }

  if (
    instance.triggeringPlayerId === null ||
    input.actingPlayerId !== instance.triggeringPlayerId
  ) {
    throw new Error("Only the triggering player can select an event option");
  }

  const option = definition.resolution.options.find((item) => item.optionId === input.optionId);

  if (option === undefined) {
    throw new Error(`Unknown event option: ${input.optionId}`);
  }

  if (
    option.availabilityCondition !== null &&
    !evaluateEventConditionExpression(option.availabilityCondition, input.conditionContext)
  ) {
    throw new Error(`Event option is not currently available: ${input.optionId}`);
  }

  return {
    ...instance,
    status: "RESOLVING",
    resolvingAtTurn: input.selectedAtTurn,
    selectedOptionId: input.optionId,
  };
}

/**
 * 方法名：completeEventResolution
 * 作用：按定义顺序执行当前结算路线的效果，并生成不可重复结算的完成实例。
 * @param instance 已经确定直接效果或玩家选项的结算中实例。
 * @param definition 与实例对应的事件静态定义。
 * @param registry 当前游戏已接入的事件效果处理器注册表。
 * @param input 完成结算的回合信息。
 * @returns 包含每项效果结果的已完成事件实例。
 * @throws 定义不匹配、处理器缺失或 STOP 效果执行失败时抛出错误。
 */
export function completeEventResolution(
  instance: ResolvingEventInstance,
  definition: EventDefinition,
  registry: EventEffectHandlerRegistry,
  input: CompleteEventResolutionInput,
): ResolvedEventInstance {
  assertEventInstanceStatus(instance, "RESOLVING");
  validateEventInstance(instance);

  if (instance.eventId !== definition.eventId) {
    throw new Error(`Event instance ${instance.instanceId} does not match definition`);
  }

  assertTransitionTurn(input.resolvedAtTurn, instance.resolvingAtTurn, "resolvedAtTurn");
  const effects = getSelectedEffects(instance, definition);

  for (const effect of effects) {
    registry.get(effect.effectId);
  }

  const effectResults: EventEffectExecutionResult[] = [];

  for (let effectIndex = 0; effectIndex < effects.length; effectIndex += 1) {
    const effect = effects[effectIndex]!;

    try {
      effectResults.push(
        registry.execute(effect, {
          instanceId: instance.instanceId,
          eventId: instance.eventId,
          triggeringPlayerId: instance.triggeringPlayerId,
          selectedOptionId: instance.selectedOptionId,
          effectIndex,
          resolvedAtTurn: input.resolvedAtTurn,
        }),
      );
    } catch (cause) {
      if (effect.failurePolicy === "CONTINUE") {
        effectResults.push({
          effectKey: effect.effectKey,
          effectId: effect.effectId,
          outcome: "FAILED",
          output: null,
          failureReason: getFailureReason(cause),
        });
        continue;
      }

      throw new EventEffectSequenceExecutionError({
        instanceId: instance.instanceId,
        failedEffectIndex: effectIndex,
        failedEffectId: effect.effectId,
        completedEffectResults: effectResults,
        cause,
      });
    }
  }

  return {
    ...instance,
    status: "RESOLVED",
    resolvedAtTurn: input.resolvedAtTurn,
    effectResults: Object.freeze([...effectResults]),
  };
}

/**
 * 方法名：getSelectedEffects
 * 作用：根据结算实例中的选项标识读取实际需要执行的效果序列。
 * @param instance 当前结算中的事件实例。
 * @param definition 与实例对应的静态定义。
 * @returns 直接效果或选中选项的效果序列。
 * @throws 结算类型与选项标识不一致时抛出错误。
 */
function getSelectedEffects(
  instance: ResolvingEventInstance,
  definition: EventDefinition,
): readonly EventEffectDefinition[] {
  if (definition.resolution.type === "DIRECT") {
    if (instance.selectedOptionId !== null) {
      throw new Error("Direct event resolution must not contain a selected option");
    }

    return definition.resolution.effects;
  }

  if (instance.selectedOptionId === null) {
    throw new Error("Choice event resolution requires a selected option");
  }

  const option = definition.resolution.options.find(
    (item) => item.optionId === instance.selectedOptionId,
  );

  if (option === undefined) {
    throw new Error(`Unknown selected event option: ${instance.selectedOptionId}`);
  }

  return option.effects;
}

/**
 * 方法名：validateResolutionTransition
 * 作用：校验揭露实例、静态定义与开始结算回合之间的一致性。
 * @param instance 已揭露事件实例。
 * @param definition 事件静态定义。
 * @param transitionTurn 开始结算的回合。
 * @returns 无返回值。
 * @throws 实例、定义或回合不一致时抛出错误。
 */
function validateResolutionTransition(
  instance: RevealedEventInstance,
  definition: EventDefinition,
  transitionTurn: number,
): void {
  assertEventInstanceStatus(instance, "REVEALED");
  validateEventInstance(instance);

  if (instance.eventId !== definition.eventId) {
    throw new Error(`Event instance ${instance.instanceId} does not match definition`);
  }

  assertTransitionTurn(transitionTurn, instance.revealedAtTurn, "resolution transition turn");
}

/**
 * 方法名：assertEventInstanceStatus
 * 作用：在运行时阻止网络输入或存档数据绕过 TypeScript 状态约束。
 * @param instance 需要检查的任意事件实例。
 * @param expectedStatus 当前操作唯一允许的事件状态。
 * @returns 无返回值。
 * @throws 实例状态与当前操作要求不一致时抛出错误。
 */
function assertEventInstanceStatus(
  instance: EventInstance,
  expectedStatus: EventInstance["status"],
): void {
  if (instance.status !== expectedStatus) {
    throw new Error(`Event instance must be ${expectedStatus}, received ${instance.status}`);
  }
}

/**
 * 方法名：assertTransitionTurn
 * 作用：校验事件结算状态迁移使用不早于上一状态的正整数回合。
 * @param value 当前状态迁移回合。
 * @param previousTurn 上一个状态产生的回合。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 回合非法或早于上一状态时抛出错误。
 */
function assertTransitionTurn(value: number, previousTurn: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value < previousTurn) {
    throw new RangeError(`${field} must not be earlier than the previous transition`);
  }
}

/**
 * 方法名：getFailureReason
 * 作用：将未知异常转换为适合记录在事件结果中的简短原因。
 * @param cause 处理器抛出的未知异常。
 * @returns 异常消息或统一的未知错误说明。
 */
function getFailureReason(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Unknown event effect failure";
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
