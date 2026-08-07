import type { EventDefinitionCatalog } from "./event-definition.ts";
import { getEventDefinition } from "./event-definition.ts";
import type { EventDurationUpdateTiming } from "./event-duration-definition.ts";
import type {
  ActiveEventDurationInstance,
  EndedEventDurationInstance,
  EventDurationEndInstruction,
  EventDurationEndReason,
} from "./event-duration-instance.ts";
import { validateActiveEventDurationInstance } from "./event-duration-instance.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import { evaluateEventConditionExpression } from "./evaluate-event-condition.ts";

/** 描述一次持续事件时间推进所需的统一上下文。 */
export interface AdvanceEventDurationsInput {
  readonly timing: EventDurationUpdateTiming;
  readonly currentTurn: number;
  readonly currentPlayerId: string | null;
  readonly updateSequence: number;
  readonly endedWorldEventIds: ReadonlySet<string>;
  readonly getConditionContext: (
    instance: ActiveEventDurationInstance,
  ) => EventConditionEvaluationContext;
}

/** 描述持续事件集合在一个更新时间点后的完整变化。 */
export interface AdvanceEventDurationsResult {
  readonly activeInstances: readonly ActiveEventDurationInstance[];
  readonly updatedInstances: readonly ActiveEventDurationInstance[];
  readonly endedInstances: readonly EndedEventDurationInstance[];
  readonly endInstructions: readonly EventDurationEndInstruction[];
}

/**
 * 方法名：advanceEventDurations
 * 作用：在指定更新时间点推进所有匹配的持续事件并结束满足条件的实例。
 * @param activeInstances 当前全部生效中的持续事件实例。
 * @param definitions 以事件标识索引的静态事件定义注册表。
 * @param input 更新时间、玩家、世界事件及条件求值上下文。
 * @returns 推进后的活动实例、更新记录、结束记录与外部清理指令。
 * @throws 定义缺失、时序重复或运行时实例与静态持续类型不匹配时抛出错误。
 */
export function advanceEventDurations(
  activeInstances: readonly ActiveEventDurationInstance[],
  definitions: EventDefinitionCatalog,
  input: AdvanceEventDurationsInput,
): AdvanceEventDurationsResult {
  validateAdvanceInput(input);
  const nextActive: ActiveEventDurationInstance[] = [];
  const updated: ActiveEventDurationInstance[] = [];
  const ended: EndedEventDurationInstance[] = [];

  for (const instance of activeInstances) {
    validateActiveEventDurationInstance(instance);
    const definition = getEventDefinition(definitions, instance.eventId);
    assertDurationTypeMatches(instance, definition.duration.type);

    if (!shouldUpdate(instance, definition, input)) {
      nextActive.push(instance);
      continue;
    }

    if (input.currentTurn < instance.startedAtTurn) {
      throw new Error("Event duration cannot update before its starting turn");
    }

    if (input.updateSequence <= instance.lastUpdateSequence) {
      throw new Error(
        `Event duration update sequence was already processed: ${input.updateSequence}`,
      );
    }

    const result = advanceSingleDuration(instance, definition, input);

    if (result.endedReason === null) {
      nextActive.push(result.instance);
      updated.push(result.instance);
      continue;
    }

    ended.push(
      createEndedInstance(instance, input.currentTurn, input.updateSequence, result.endedReason),
    );
  }

  return Object.freeze({
    activeInstances: Object.freeze(nextActive),
    updatedInstances: Object.freeze(updated),
    endedInstances: Object.freeze(ended),
    endInstructions: Object.freeze(
      ended.map((instance) => ({
        durationInstanceId: instance.durationInstanceId,
        eventId: instance.eventId,
        reason: instance.reason,
      })),
    ),
  });
}

/** 描述单个持续实例推进后继续生效或结束的内部结果。 */
interface AdvanceSingleDurationResult {
  readonly instance: ActiveEventDurationInstance;
  readonly endedReason: EventDurationEndReason | null;
}

/**
 * 方法名：advanceSingleDuration
 * 作用：按照静态持续类型推进一个已经确认需要更新的活动实例。
 * @param instance 当前活动持续实例。
 * @param definition 与实例对应的事件静态定义。
 * @param input 本次统一推进上下文。
 * @returns 更新后的实例以及可选结束原因。
 */
function advanceSingleDuration(
  instance: ActiveEventDurationInstance,
  definition: ReturnType<typeof getEventDefinition>,
  input: AdvanceEventDurationsInput,
): AdvanceSingleDurationResult {
  if (instance.durationType === "FIXED_ROUNDS" && definition.duration.type === "FIXED_ROUNDS") {
    if (instance.remainingRounds === 1) {
      return { instance, endedReason: "EXPIRED" };
    }

    return {
      instance: {
        ...instance,
        remainingRounds: instance.remainingRounds - 1,
        lastUpdateSequence: input.updateSequence,
      },
      endedReason: null,
    };
  }

  if (
    instance.durationType === "UNTIL_CONDITION" &&
    definition.duration.type === "UNTIL_CONDITION"
  ) {
    const conditionMet = evaluateEventConditionExpression(
      definition.duration.endCondition,
      input.getConditionContext(instance),
    );

    if (conditionMet) {
      return { instance, endedReason: "CONDITION_MET" };
    }

    return {
      instance: { ...instance, lastUpdateSequence: input.updateSequence },
      endedReason: null,
    };
  }

  if (
    instance.durationType === "UNTIL_WORLD_EVENT_END" &&
    definition.duration.type === "UNTIL_WORLD_EVENT_END"
  ) {
    if (input.endedWorldEventIds.has(definition.duration.worldEventId)) {
      return { instance, endedReason: "WORLD_EVENT_ENDED" };
    }

    return {
      instance: { ...instance, lastUpdateSequence: input.updateSequence },
      endedReason: null,
    };
  }

  return { instance, endedReason: null };
}

/**
 * 方法名：shouldUpdate
 * 作用：判断持续实例是否应在当前时间点和玩家回合进行推进。
 * @param instance 当前活动持续实例。
 * @param definition 与实例对应的事件静态定义。
 * @param input 本次统一推进上下文。
 * @returns 当前调用应处理该实例时返回 true。
 */
function shouldUpdate(
  instance: ActiveEventDurationInstance,
  definition: ReturnType<typeof getEventDefinition>,
  input: AdvanceEventDurationsInput,
): boolean {
  if (instance.durationType === "PERMANENT") {
    return false;
  }

  if (instance.durationType === "UNTIL_WORLD_EVENT_END") {
    return (
      definition.duration.type === "UNTIL_WORLD_EVENT_END" &&
      input.endedWorldEventIds.has(definition.duration.worldEventId)
    );
  }

  if (
    definition.duration.type !== "FIXED_ROUNDS" &&
    definition.duration.type !== "UNTIL_CONDITION"
  ) {
    return false;
  }

  if (definition.duration.updateTiming !== input.timing) {
    return false;
  }

  if (input.timing === "TRIGGER_PLAYER_TURN_START" || input.timing === "TRIGGER_PLAYER_TURN_END") {
    return (
      instance.triggeringPlayerId !== null && instance.triggeringPlayerId === input.currentPlayerId
    );
  }

  return true;
}

/**
 * 方法名：createEndedInstance
 * 作用：将结束的活动实例转换为可持久化的结束记录。
 * @param instance 本次结束的活动实例。
 * @param endedAtTurn 结束发生的游戏回合。
 * @param endedAtSequence 结束发生的全局顺序值。
 * @param reason 结束原因。
 * @returns 完整的持续事件结束记录。
 */
function createEndedInstance(
  instance: ActiveEventDurationInstance,
  endedAtTurn: number,
  endedAtSequence: number,
  reason: EventDurationEndReason,
): EndedEventDurationInstance {
  return {
    durationInstanceId: instance.durationInstanceId,
    eventId: instance.eventId,
    sourceEventInstanceId: instance.sourceEventInstanceId,
    latestSourceEventInstanceId: instance.latestSourceEventInstanceId,
    triggeringPlayerId: instance.triggeringPlayerId,
    durationType: instance.durationType,
    startedAtTurn: instance.startedAtTurn,
    endedAtTurn,
    endedAtSequence,
    reason,
  };
}

/**
 * 方法名：assertDurationTypeMatches
 * 作用：校验运行时持续实例与事件静态定义采用相同持续类型。
 * @param instance 当前活动持续实例。
 * @param definitionType 静态定义中的持续类型。
 * @returns 无返回值。
 * @throws 静态定义为即时事件或与运行时实例类型不一致时抛出错误。
 */
function assertDurationTypeMatches(
  instance: ActiveEventDurationInstance,
  definitionType: ReturnType<typeof getEventDefinition>["duration"]["type"],
): void {
  if (definitionType === "IMMEDIATE" || definitionType !== instance.durationType) {
    throw new Error(
      `Event duration type mismatch: expected ${definitionType}, received ${instance.durationType}`,
    );
  }
}

/**
 * 方法名：validateAdvanceInput
 * 作用：校验持续事件统一推进时使用的回合、玩家和顺序值。
 * @param input 需要校验的推进上下文。
 * @returns 无返回值。
 * @throws 回合、玩家标识或顺序值非法时抛出错误。
 */
function validateAdvanceInput(input: AdvanceEventDurationsInput): void {
  if (!Number.isSafeInteger(input.currentTurn) || input.currentTurn <= 0) {
    throw new RangeError("currentTurn must be a positive safe integer");
  }

  if (!Number.isSafeInteger(input.updateSequence) || input.updateSequence < 0) {
    throw new RangeError("updateSequence must be a non-negative safe integer");
  }

  if (input.currentPlayerId !== null && input.currentPlayerId.trim().length === 0) {
    throw new TypeError("currentPlayerId must not be empty");
  }
}
