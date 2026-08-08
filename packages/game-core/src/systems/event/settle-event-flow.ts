import type { EventDefinitionCatalog } from "./event-definition.ts";
import type { EventEffectHandlerRegistry } from "./event-effect-handler-registry.ts";
import type { EventFlowInstruction } from "./event-flow-instruction.ts";
import type { EventInstance } from "./event-instance.ts";
import { decideOptionalEventReveal, type DecideOptionalEventRevealInput } from "./event-reveal.ts";
import {
  activateEventDurationInState,
  transitionEventInstance,
  type EventRuntimeState,
} from "./event-runtime-state.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import {
  beginDirectEventResolution,
  completeEventResolution,
  selectEventOption,
} from "./resolve-event.ts";

/** 描述可选择揭露事件的玩家决定。 */
export interface SettleEventRevealInput extends DecideOptionalEventRevealInput {
  readonly instanceId: string;
}

/** 描述选项事件开始结算时所需的玩家选择。 */
export interface SettleEventOptionInput {
  readonly instanceId: string;
  readonly actingPlayerId: string;
  readonly optionId: string;
  readonly selectedAtTurn: number;
  readonly conditionContext: EventConditionEvaluationContext;
}

/** 描述直接事件或已经选定路线的事件完成效果结算与持续激活所需的输入。 */
export interface SettleEventResolutionInput {
  readonly instanceId: string;
  readonly currentTurn: number;
  readonly durationInstanceId: string;
  readonly updateSequence: number;
}

/** 描述统一事件流程完成一步迁移后的状态与下一步指令。 */
export interface SettleEventFlowResult {
  readonly state: EventRuntimeState;
  readonly instruction: EventFlowInstruction;
}

/**
 * 方法名：settleEventReveal
 * 作用：处理可选择揭露事件的揭露或放弃决定，并返回下一步流程指令。
 * @param state 当前事件运行时状态。
 * @param definitions 事件静态定义注册表。
 * @param input 事件实例、操作玩家、决定与回合信息。
 * @returns 更新后的运行时状态以及等待选项、准备结算或完成指令。
 */
export function settleEventReveal(
  state: EventRuntimeState,
  definitions: EventDefinitionCatalog,
  input: SettleEventRevealInput,
): SettleEventFlowResult {
  const instance = requireInstance(state, input.instanceId, "PENDING_REVEAL");
  const definition = requireDefinition(definitions, instance.eventId);
  const nextInstance = decideOptionalEventReveal(instance, definition, input);
  const nextState = transitionEventInstance(state, nextInstance).state;

  if (nextInstance.status === "DECLINED") {
    return createFlowResult(nextState, {
      type: "DECLINED",
      instanceId: nextInstance.instanceId,
    });
  }

  return createFlowResult(nextState, {
    type: definition.resolution.type === "CHOICE" ? "WAIT_OPTION_SELECTION" : "READY_TO_RESOLVE",
    instance: nextInstance,
  });
}

/**
 * 方法名：settleEventOption
 * 作用：校验玩家事件选项并将已揭露事件推进至待执行效果状态。
 * @param state 当前事件运行时状态。
 * @param definitions 事件静态定义注册表。
 * @param input 事件实例、选项、玩家及条件上下文。
 * @returns 已进入结算状态的运行时状态与准备结算指令。
 */
export function settleEventOption(
  state: EventRuntimeState,
  definitions: EventDefinitionCatalog,
  input: SettleEventOptionInput,
): SettleEventFlowResult {
  const instance = requireInstance(state, input.instanceId, "REVEALED");
  const definition = requireDefinition(definitions, instance.eventId);
  const resolving = selectEventOption(instance, definition, input);
  const nextState = transitionEventInstance(state, resolving).state;

  return Object.freeze({
    state: nextState,
    instruction: Object.freeze({ type: "READY_TO_RESOLVE", instance: resolving }),
  });
}

/**
 * 方法名：settleEventResolution
 * 作用：执行事件选定路线的效果，并在成功后统一激活持续事件状态。
 * @param state 当前事件运行时状态。
 * @param definitions 事件静态定义注册表。
 * @param registry 事件效果处理器注册表。
 * @param input 事件实例、结算回合、持续实例标识与全局顺序值。
 * @returns 包含已完成实例、持续效果结果及最新运行时状态的完成指令。
 */
export function settleEventResolution(
  state: EventRuntimeState,
  definitions: EventDefinitionCatalog,
  registry: EventEffectHandlerRegistry,
  input: SettleEventResolutionInput,
): SettleEventFlowResult {
  const stored = requireAnyInstance(state, input.instanceId);
  const definition = requireDefinition(definitions, stored.eventId);
  const resolving =
    stored.status === "REVEALED"
      ? beginDirectEventResolution(stored, definition, { startedAtTurn: input.currentTurn })
      : requireResolvingInstance(stored);
  let nextState =
    stored.status === "REVEALED" ? transitionEventInstance(state, resolving).state : state;
  const resolved = completeEventResolution(resolving, definition, registry, {
    resolvedAtTurn: input.currentTurn,
  });
  nextState = transitionEventInstance(nextState, resolved).state;
  const activation = activateEventDurationInState(nextState, resolved, definition, {
    durationInstanceId: input.durationInstanceId,
    activatedAtTurn: input.currentTurn,
    activatedAtSequence: input.updateSequence,
  });

  return createFlowResult(activation.state, {
    type: "COMPLETED",
    instance: resolved,
    durationOutcome: activation.outcome,
    durationEndInstructions: activation.endInstructions,
  });
}

/**
 * 方法名：requireAnyInstance
 * 作用：读取运行时容器中的指定事件实例。
 * @param state 当前事件运行时状态。
 * @param instanceId 需要读取的事件实例标识。
 * @returns 找到的事件实例。
 * @throws 事件实例不存在时抛出错误。
 */
function requireAnyInstance(state: EventRuntimeState, instanceId: string): EventInstance {
  const instance = state.instances.find((item) => item.instanceId === instanceId);

  if (instance === undefined) {
    throw new Error(`Unknown event instance: ${instanceId}`);
  }

  return instance;
}

/**
 * 方法名：requireInstance
 * 作用：读取并收窄到调用方要求状态的事件实例。
 * @param state 当前事件运行时状态。
 * @param instanceId 需要读取的事件实例标识。
 * @param status 当前流程要求的事件状态。
 * @returns 状态符合要求的事件实例。
 * @throws 实例不存在或状态不匹配时抛出错误。
 */
function requireInstance<Status extends EventInstance["status"]>(
  state: EventRuntimeState,
  instanceId: string,
  status: Status,
): Extract<EventInstance, { readonly status: Status }> {
  const instance = requireAnyInstance(state, instanceId);

  if (instance.status !== status) {
    throw new Error(`Event instance must be ${status}, received ${instance.status}`);
  }

  return instance as Extract<EventInstance, { readonly status: Status }>;
}

/**
 * 方法名：requireResolvingInstance
 * 作用：确认事件已经通过玩家选项进入效果结算状态。
 * @param instance 需要检查的事件实例。
 * @returns 结算中的事件实例。
 * @throws 实例尚未进入结算状态时抛出错误。
 */
function requireResolvingInstance(
  instance: EventInstance,
): Extract<EventInstance, { readonly status: "RESOLVING" }> {
  if (instance.status !== "RESOLVING") {
    throw new Error(`Event instance is not ready to resolve: ${instance.status}`);
  }

  return instance;
}

/**
 * 方法名：requireDefinition
 * 作用：读取事件实例对应的静态定义。
 * @param definitions 事件静态定义注册表。
 * @param eventId 事件资源标识。
 * @returns 对应的事件静态定义。
 * @throws 定义不存在时抛出错误。
 */
function requireDefinition(definitions: EventDefinitionCatalog, eventId: string) {
  const definition = definitions[eventId];

  if (definition === undefined) {
    throw new Error(`Unknown event definition: ${eventId}`);
  }

  return definition;
}

/**
 * 方法名：createFlowResult
 * 作用：冻结事件流程单步执行结果。
 * @param state 更新后的事件运行时状态。
 * @param instruction 下一步流程指令。
 * @returns 冻结后的统一流程结果。
 */
function createFlowResult(
  state: EventRuntimeState,
  instruction: Exclude<EventFlowInstruction, { readonly type: "NO_EVENT" }>,
): SettleEventFlowResult {
  return Object.freeze({ state, instruction: Object.freeze(instruction) });
}
