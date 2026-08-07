import {
  activateEventDuration,
  type ActivateEventDurationInput,
  type ActivateEventDurationOutcome,
} from "./activate-event-duration.ts";
import {
  advanceEventDurations,
  type AdvanceEventDurationsInput,
} from "./advance-event-durations.ts";
import type { EventDefinition, EventDefinitionCatalog } from "./event-definition.ts";
import type {
  ActiveEventDurationInstance,
  EndedEventDurationInstance,
  EventDurationEndInstruction,
} from "./event-duration-instance.ts";
import type { EventInstance, ResolvedEventInstance } from "./event-instance.ts";
import { validateEventInstance } from "./event-instance.ts";
import { EVENT_INSTANCE_ALLOWED_TRANSITIONS } from "./event-runtime-config.ts";

/** 描述事件模块需要持久化、回放和同步的统一运行时状态。 */
export interface EventRuntimeState {
  readonly instances: readonly EventInstance[];
  readonly activeDurations: readonly ActiveEventDurationInstance[];
  readonly endedDurations: readonly EndedEventDurationInstance[];
  readonly durationActivatedEventInstanceIds: readonly string[];
  readonly lastDurationUpdateSequence: number;
}

/** 描述事件实例状态迁移完成后的统一容器结果。 */
export interface TransitionEventInstanceResult {
  readonly state: EventRuntimeState;
  readonly instance: EventInstance;
}

/** 描述在统一容器中激活持续事件后的结果。 */
export interface ActivateEventDurationInStateResult {
  readonly state: EventRuntimeState;
  readonly outcome: ActivateEventDurationOutcome;
  readonly activatedInstance: ActiveEventDurationInstance | null;
  readonly endInstructions: readonly EventDurationEndInstruction[];
}

/** 描述统一容器完成一次持续时间推进后的结果。 */
export interface AdvanceEventRuntimeStateResult {
  readonly state: EventRuntimeState;
  readonly updatedInstances: readonly ActiveEventDurationInstance[];
  readonly endedInstances: readonly EndedEventDurationInstance[];
  readonly endInstructions: readonly EventDurationEndInstruction[];
}

/**
 * 方法名：createEventRuntimeState
 * 作用：创建不包含任何事件实例和持续效果的初始运行时容器。
 * @returns 冻结后的空事件运行时状态。
 */
export function createEventRuntimeState(): EventRuntimeState {
  return Object.freeze({
    instances: Object.freeze([]),
    activeDurations: Object.freeze([]),
    endedDurations: Object.freeze([]),
    durationActivatedEventInstanceIds: Object.freeze([]),
    lastDurationUpdateSequence: 0,
  });
}

/**
 * 方法名：addEventInstance
 * 作用：向统一运行时容器加入一个新创建的事件实例。
 * @param state 当前事件运行时状态。
 * @param instance 需要加入容器的新事件实例。
 * @returns 包含新实例的不可变事件运行时状态。
 * @throws 事件实例非法或实例标识重复时抛出错误。
 */
export function addEventInstance(
  state: EventRuntimeState,
  instance: EventInstance,
): EventRuntimeState {
  validateEventInstance(instance);

  if (state.instances.some((item) => item.instanceId === instance.instanceId)) {
    throw new Error(`Duplicate event instance id: ${instance.instanceId}`);
  }

  return freezeState({ ...state, instances: [...state.instances, instance] });
}

/**
 * 方法名：transitionEventInstance
 * 作用：以符合状态机规则的新事件实例替换容器中的旧实例。
 * @param state 当前事件运行时状态。
 * @param nextInstance 已完成单步状态迁移的新事件实例。
 * @returns 最新容器状态与完成迁移的事件实例。
 * @throws 实例不存在、身份字段变化或状态迁移不合法时抛出错误。
 */
export function transitionEventInstance(
  state: EventRuntimeState,
  nextInstance: EventInstance,
): TransitionEventInstanceResult {
  validateEventInstance(nextInstance);
  const currentIndex = state.instances.findIndex(
    (instance) => instance.instanceId === nextInstance.instanceId,
  );

  if (currentIndex < 0) {
    throw new Error(`Unknown event instance: ${nextInstance.instanceId}`);
  }

  const current = state.instances[currentIndex]!;
  assertStableEventIdentity(current, nextInstance);

  if (
    !(EVENT_INSTANCE_ALLOWED_TRANSITIONS[current.status] as readonly string[]).includes(
      nextInstance.status,
    )
  ) {
    throw new Error(`Invalid event state transition: ${current.status} -> ${nextInstance.status}`);
  }

  const instances = [...state.instances];
  instances[currentIndex] = nextInstance;

  return Object.freeze({
    state: freezeState({ ...state, instances }),
    instance: nextInstance,
  });
}

/**
 * 方法名：activateEventDurationInState
 * 作用：为容器中已完成结算的事件应用持续规则与重复策略。
 * @param state 当前事件运行时状态。
 * @param resolvedEvent 已完成初次效果结算的事件实例。
 * @param definition 与实例对应的事件静态定义。
 * @param input 持续实例标识与激活时序。
 * @returns 最新容器、激活结果及外部清理指令。
 * @throws 已结算实例不在容器中或持续激活输入非法时抛出错误。
 */
export function activateEventDurationInState(
  state: EventRuntimeState,
  resolvedEvent: ResolvedEventInstance,
  definition: EventDefinition,
  input: ActivateEventDurationInput,
): ActivateEventDurationInStateResult {
  const stored = state.instances.find(
    (instance) => instance.instanceId === resolvedEvent.instanceId,
  );

  if (stored === undefined || stored.status !== "RESOLVED") {
    throw new Error(`Resolved event is not recorded in runtime state: ${resolvedEvent.instanceId}`);
  }

  if (state.durationActivatedEventInstanceIds.includes(resolvedEvent.instanceId)) {
    throw new Error(`Event duration was already activated: ${resolvedEvent.instanceId}`);
  }

  if (input.activatedAtSequence < state.lastDurationUpdateSequence) {
    throw new Error("Duration activation sequence must not precede runtime state updates");
  }

  const result = activateEventDuration(state.activeDurations, stored, definition, input);
  const nextState = freezeState({
    ...state,
    activeDurations: result.activeInstances,
    endedDurations: [...state.endedDurations, ...result.endedInstances],
    durationActivatedEventInstanceIds: [
      ...state.durationActivatedEventInstanceIds,
      stored.instanceId,
    ],
  });

  return Object.freeze({
    state: nextState,
    outcome: result.outcome,
    activatedInstance: result.activatedInstance,
    endInstructions: result.endInstructions,
  });
}

/**
 * 方法名：advanceEventRuntimeState
 * 作用：通过统一容器推进持续事件，并记录全局顺序值和结束历史。
 * @param state 当前事件运行时状态。
 * @param definitions 事件静态定义注册表。
 * @param input 本次持续时间推进上下文。
 * @returns 最新容器、更新实例、结束实例及外部清理指令。
 * @throws 顺序值重复、倒退或底层持续实例推进失败时抛出错误。
 */
export function advanceEventRuntimeState(
  state: EventRuntimeState,
  definitions: EventDefinitionCatalog,
  input: AdvanceEventDurationsInput,
): AdvanceEventRuntimeStateResult {
  if (input.updateSequence <= state.lastDurationUpdateSequence) {
    throw new Error(`Duration update sequence must increase: ${input.updateSequence}`);
  }

  const result = advanceEventDurations(state.activeDurations, definitions, input);
  const nextState = freezeState({
    ...state,
    activeDurations: result.activeInstances,
    endedDurations: [...state.endedDurations, ...result.endedInstances],
    lastDurationUpdateSequence: input.updateSequence,
  });

  return Object.freeze({
    state: nextState,
    updatedInstances: result.updatedInstances,
    endedInstances: result.endedInstances,
    endInstructions: result.endInstructions,
  });
}

/**
 * 方法名：assertStableEventIdentity
 * 作用：保证状态迁移前后事件实例的不可变身份字段没有变化。
 * @param current 容器中现有的事件实例。
 * @param next 完成状态迁移后的事件实例。
 * @returns 无返回值。
 * @throws 任意身份字段在迁移中发生变化时抛出错误。
 */
function assertStableEventIdentity(current: EventInstance, next: EventInstance): void {
  if (
    current.eventId !== next.eventId ||
    current.triggeringPlayerId !== next.triggeringPlayerId ||
    current.triggeredAtTurn !== next.triggeredAtTurn ||
    current.sourcePoolIds.length !== next.sourcePoolIds.length ||
    current.sourcePoolIds.some((poolId, index) => poolId !== next.sourcePoolIds[index])
  ) {
    throw new Error(`Event instance identity changed during transition: ${current.instanceId}`);
  }
}

/**
 * 方法名：freezeState
 * 作用：复制并冻结事件运行时容器中的数组，避免外部修改内部状态。
 * @param state 需要冻结的事件运行时状态。
 * @returns 具有只读数组的新事件运行时状态。
 */
function freezeState(state: EventRuntimeState): EventRuntimeState {
  return Object.freeze({
    instances: Object.freeze([...state.instances]),
    activeDurations: Object.freeze([...state.activeDurations]),
    endedDurations: Object.freeze([...state.endedDurations]),
    durationActivatedEventInstanceIds: Object.freeze([...state.durationActivatedEventInstanceIds]),
    lastDurationUpdateSequence: state.lastDurationUpdateSequence,
  });
}
