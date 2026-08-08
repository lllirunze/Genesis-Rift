import type { RandomStream } from "../random/core/random-stream.ts";
import type { EventDefinitionCatalog } from "./event-definition.ts";
import type { EventFlowInstruction } from "./event-flow-instruction.ts";
import { createPendingEventInstance, type EventInstance } from "./event-instance.ts";
import type { EventPoolDefinitionCatalog } from "./event-pool-definition.ts";
import { revealForcedEvent } from "./event-reveal.ts";
import {
  addEventInstance,
  transitionEventInstance,
  type EventRuntimeState,
} from "./event-runtime-state.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import { selectEventFromPools, type RevealedEventOccurrence } from "./select-event-candidate.ts";

/** 描述一次统一事件触发所需的候选来源、运行时上下文与实例标识。 */
export interface TriggerEventInput {
  readonly instanceId: string;
  readonly poolIds: readonly string[];
  readonly triggeringPlayerId: string | null;
  readonly currentTurn: number;
  readonly conditionContext: EventConditionEvaluationContext;
}

/** 描述一次事件触发完成后的运行时状态与下一步流程指令。 */
export interface TriggerEventResult {
  readonly state: EventRuntimeState;
  readonly instruction: EventFlowInstruction;
}

/**
 * 方法名：triggerEvent
 * 作用：完成候选事件池读取、条件筛选、随机抽取、实例创建及强制揭露。
 * @param state 当前事件运行时状态。
 * @param randomStream 本次抽取使用的事件随机流。
 * @param eventCatalog 事件静态定义注册表。
 * @param poolCatalog 事件池静态定义注册表。
 * @param input 事件实例标识、候选池、触发玩家、回合及条件事实。
 * @returns 更新后的运行时状态与调用方下一步需要执行的流程指令。
 * @throws 事件池标识重复、事件池不存在或底层事件配置非法时抛出错误。
 */
export function triggerEvent(
  state: EventRuntimeState,
  randomStream: RandomStream,
  eventCatalog: EventDefinitionCatalog,
  poolCatalog: EventPoolDefinitionCatalog,
  input: TriggerEventInput,
): TriggerEventResult {
  const pools = resolveEventPools(input.poolIds, poolCatalog);
  const candidate = selectEventFromPools(randomStream, pools, eventCatalog, {
    triggeringPlayerId: input.triggeringPlayerId,
    currentTurn: input.currentTurn,
    conditionContext: input.conditionContext,
    revealedOccurrences: collectRevealedEventOccurrences(state.instances),
  });

  if (candidate === null) {
    return Object.freeze({ state, instruction: Object.freeze({ type: "NO_EVENT" }) });
  }

  const pending = createPendingEventInstance({
    instanceId: input.instanceId,
    candidate,
    triggeringPlayerId: input.triggeringPlayerId,
    triggeredAtTurn: input.currentTurn,
  });
  let nextState = addEventInstance(state, pending);

  if (candidate.event.revealMode === "OPTIONAL") {
    return createTriggerResult(nextState, {
      type: "WAIT_REVEAL_DECISION",
      instance: pending,
    });
  }

  const revealed = revealForcedEvent(pending, candidate.event, input.currentTurn);
  nextState = transitionEventInstance(nextState, revealed).state;

  return createTriggerResult(nextState, {
    type:
      candidate.event.resolution.type === "CHOICE" ? "WAIT_OPTION_SELECTION" : "READY_TO_RESOLVE",
    instance: revealed,
  });
}

/**
 * 方法名：collectRevealedEventOccurrences
 * 作用：从事件实例历史中提取已经完成揭露的冷却与唯一性记录。
 * @param instances 当前运行时状态保存的全部事件实例。
 * @returns 可用于事件候选筛选的揭露历史。
 */
export function collectRevealedEventOccurrences(
  instances: readonly EventInstance[],
): readonly RevealedEventOccurrence[] {
  return Object.freeze(
    instances.flatMap((instance) =>
      "revealedAtTurn" in instance
        ? [
            Object.freeze({
              eventId: instance.eventId,
              triggeringPlayerId: instance.triggeringPlayerId,
              revealedAtTurn: instance.revealedAtTurn,
            }),
          ]
        : [],
    ),
  );
}

/**
 * 方法名：resolveEventPools
 * 作用：根据调用方确定的事件池标识读取并去重候选事件池。
 * @param poolIds 本次触发需要参与抽取的事件池标识。
 * @param poolCatalog 事件池静态定义注册表。
 * @returns 保持输入顺序的候选事件池。
 * @throws 事件池列表为空、标识重复或事件池不存在时抛出错误。
 */
function resolveEventPools(poolIds: readonly string[], poolCatalog: EventPoolDefinitionCatalog) {
  if (poolIds.length === 0) {
    throw new Error("Event trigger requires at least one event pool");
  }

  const uniquePoolIds = new Set<string>();

  return poolIds.map((poolId) => {
    if (poolId.trim().length === 0) {
      throw new TypeError("poolIds must not contain empty values");
    }

    if (uniquePoolIds.has(poolId)) {
      throw new Error(`Duplicate event pool id: ${poolId}`);
    }

    uniquePoolIds.add(poolId);
    const pool = poolCatalog[poolId];

    if (pool === undefined) {
      throw new Error(`Unknown event pool: ${poolId}`);
    }

    return pool;
  });
}

/**
 * 方法名：createTriggerResult
 * 作用：冻结统一事件触发结果，防止调用方修改流程指令。
 * @param state 事件触发后的运行时状态。
 * @param instruction 事件流程下一步指令。
 * @returns 冻结后的事件触发结果。
 */
function createTriggerResult(
  state: EventRuntimeState,
  instruction: Exclude<
    EventFlowInstruction,
    { readonly type: "NO_EVENT" | "DECLINED" | "COMPLETED" }
  >,
): TriggerEventResult {
  return Object.freeze({ state, instruction: Object.freeze(instruction) });
}
